import { HandlerContext } from "$fresh/server.ts";
import {
  AccountResponseBuilder,
  parseFilter,
  v1Error,
  v1Success,
} from "../../../../lib/api_v1/responseBuilders.ts";
import {
  checksPaymentIntents_filterKeys,
  EndpointNames_ApiV1,
  Filter,
  getPaymentIntentsSortBy,
  getSortableColumns,
  mapPaymentIntentSortByKeysToDBColNames,
  PaymentIntents_filterKeys,
  PaymentIntents_sortyBy,
  validate_PaymentIntents_filterKeys,
} from "../../../../lib/api_v1/types.ts";
import {
  getPagination,
  getTotalPages,
  refreshDBBalance,
} from "../../../../lib/backend/businessLogic.ts";
import QueryBuilder from "../../../../lib/backend/db/queryBuilder.ts";
import {
  selectAccountsByCommitmentAPiV1,
  selectAllPaymentIntentsByCreatorIdApiV1FilterCommitment,
  selectPaymentIntentsForAccountbyAccountBalanceTooLowAPIV1,
} from "../../../../lib/backend/db/v1.ts";
import { formatEther, parseEther } from "../../../../lib/backend/web3.ts";
import { State } from "../../../_middleware.ts";

export const handler = {
  async GET(_req: Request, ctx: HandlerContext<any, State>) {
    const { slug } = ctx.params;
    const url = new URL(_req.url);

    const current_pageQ = url.searchParams.get("current_page") || "0";
    const page_sizeQ = url.searchParams.get("page_size") || "10";
    const sort_by = url.searchParams.get("sort_by") || "created_at";
    const sort_direction = url.searchParams.get("sort_direction") || "DESC";
    const filterQ = url.searchParams.get("filter") || "{}";
    try {
      if (slug.length === 0) {
        throw new Error("Missing commitment parameter");
      }
      const current_page = parseInt(current_pageQ);
      if (isNaN(current_page)) {
        // Return an error! validation failed!
        throw new Error("Invalid current_page parameter. Must be integer");
      }
      const page_size = parseInt(page_sizeQ);
      if (isNaN(page_size)) {
        throw new Error("Invalid page_size parameter. Must be integer");
      }
      if (sort_direction !== "DESC" && sort_direction !== "ASC") {
        throw new Error("Invalid sort_direction. Must be ASC or DESC");
      }
      const getSortBy =
        getPaymentIntentsSortBy[sort_by as PaymentIntents_sortyBy];
      if (!getSortBy) {
        throw new Error("Invalid SortBy parameter! Column not found");
      }

      const filter = parseFilter(filterQ);

      const filterParameters = Object.entries(filter).map((a) => {
        if (
          checksPaymentIntents_filterKeys[a[0] as PaymentIntents_filterKeys]
        ) {
          validate_PaymentIntents_filterKeys[a[0] as PaymentIntents_filterKeys](
            a[1],
          );
          return {
            parameter: a[0],
            value: a[1],
          };
        }
      });

      const mappedFilterParameters = filterParameters.map((fil) => {
        //I need to map the filter keys parameters to database column compatible names!!
        // Using a mapping I made for sortBy, which is compatible with filterKeys, just contains more things
        return {
          parameter: mapPaymentIntentSortByKeysToDBColNames[
            fil?.parameter as PaymentIntents_sortyBy
          ],
          value: fil?.value,
        };
      });

      const { from, to } = getPagination(
        current_page,
        page_size,
      );

      const queryBuilder = new QueryBuilder(ctx);

      const { data } = await selectAccountsByCommitmentAPiV1(ctx, {
        commitment: slug,
      });

      if (data.length === 0) {
        throw new Error("Account not found!");
      }

      let updatedBalance = data[0].balance;
      let updatedClosed = data[0].closed;

      // For now, only update balance if the caller is authenticated and he is the account owner
      if (!data[0].closed && data[0].user_id === ctx.state.userid) {
        //TODO: RATE LIMITER! REFRESH BALANCE MAX ONLY ONCE VERY few minutes!
        // If the data in the db is not closed this will refresh the database
        const onChainAccount = await refreshDBBalance(data, slug, queryBuilder);
        // Now the account could be closed for all I know, if it refreshed!

        if (parseEther(data[0].balance) !== onChainAccount.account[3]) {
          updatedBalance = formatEther(onChainAccount.account[3]);
          // Update the closed parameter too if it changed
          updatedClosed = !onChainAccount.account[0];
        }
      }

      // I don't update the balance if it's closed..
      // I just return the account

      const allPaymentIntents =
        await selectAllPaymentIntentsByCreatorIdApiV1FilterCommitment(ctx, {
          commitment: slug,
          order: sort_by,
          ascending: sort_direction === "ASC",
          rangeFrom: from,
          rangeTo: to,
          filter: mappedFilterParameters as Array<
            { parameter: string; value: string }
          >,
        });

      if (allPaymentIntents.error) {
        throw new Error(
          allPaymentIntents.error.message + ". " +
            allPaymentIntents.error.details,
        );
      }

      const total_pages = getTotalPages(allPaymentIntents.count, page_size);
      const { data: missedPayments } =
        await selectPaymentIntentsForAccountbyAccountBalanceTooLowAPIV1(ctx, {
          account_id: data[0].id,
        });

      return v1Success(AccountResponseBuilder({
        commitment: slug,
        updatedBalance, // If the balance was updated, we return teh updated result
        updatedClosed, // the the account was closed we return the updated result
        data: data[0],
        returnError: false,
        error: {
          message: "",
          status: 0,
          timestamp: "",
        },
        missingPayments: missedPayments,
        allPaymentIntents: allPaymentIntents.data, //TODO:
        pagination: {
          current_page,
          total_pages,
          page_size,
          sort_by,
          sort_direction,
          sortable_columns:
            getSortableColumns[EndpointNames_ApiV1.accountsSlug],
        },
        filters: filterParameters as Array<Filter>,
      }));
    } catch (err) {
      const error = {
        message: err.message,
        status: 400,
        timestamp: new Date().toUTCString(),
      };
      return v1Error(
        AccountResponseBuilder({
          commitment: slug,
          updatedBalance: "",
          updatedClosed: false,
          data: {},
          returnError: true,
          error,
          missingPayments: [],
          allPaymentIntents: [],
          pagination: {},
          filters: [],
        }),
        error.status,
      );
    }
  },
};
