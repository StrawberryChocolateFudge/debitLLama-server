// Api endpoints for the pagination API
import { Handlers } from "$fresh/server.ts";
import { getPagination, getTotalPages } from "../../../lib/backend/businessLogic.ts";
import QueryBuilder from "../../../lib/backend/queryBuilder.ts";
import { errorResponseBuilder } from "../../../lib/backend/responseBuilders.ts";
import { DEBITITEMSTABLEPAGESIZE, DebitItemTableColNames, MapDebitItemsTableColNamesToDbColNames } from "../../../lib/enums.ts";
import { State } from "../../_middleware.ts";


export const handler: Handlers<any, State> = {
    async POST(_req, ctx) {
        const json = await _req.json();
        const currentPage = json.currentPage;
        const searchTerm = json.searchTerm;
        const sortBy = json.sortBy; // The name of the field
        const sortDirection = json.sortDirection;// ASC or DESC
        if (isNaN(currentPage)) {
            return errorResponseBuilder("Missing Current Page");
        }
        if (!sortBy) {
            return errorResponseBuilder("Missing Sort By")
        }

        if (sortDirection !== "ASC" && sortDirection !== "DESC") {
            return errorResponseBuilder("Invalid SortDirection!")
        }
        const order = MapDebitItemsTableColNamesToDbColNames[sortBy as DebitItemTableColNames];
        if (!order) {
            return errorResponseBuilder("Invalid column name!")
        }
        const queryBuilder = new QueryBuilder(ctx);
        const select = queryBuilder.select();
        const { from, to } = getPagination(currentPage, DEBITITEMSTABLEPAGESIZE)

        let debitItemsData = [];
        let rowCount = 0;
        if (searchTerm === "") {
            const { data: itemRows, count } = await select.Items.byUserIdForPayeePaginated(
                order,
                sortDirection === "ASC",
                from,
                to
            )
            debitItemsData = itemRows;
            rowCount = count;
        } else {
            const { data: itemRows, count } = await select.Items.byUserIdForPayeePaginatedWithSearchName(
                order,
                sortDirection === "ASC",
                from,
                to,
                searchTerm
            );
            debitItemsData = itemRows;
            rowCount = count;
        }

        const totalPages = getTotalPages(rowCount, DEBITITEMSTABLEPAGESIZE);
        return new Response(JSON.stringify({
            currentPage,
            debitItemsData,
            totalPages
        }), { status: 200 })
    }
}
