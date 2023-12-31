import {
  AccountAccess,
  AccountTypes,
  DynamicPaymentRequestJobsStatus,
  PaymentIntentRow,
  PaymentIntentStatus,
} from "../../enums.ts";
import { ChainIds } from "../../shared/web3.ts";
import { formatEther } from "../web3.ts";
import { AddMinutesToDate } from "./utils.ts";

export type SupabaseQueryResult = {
  error: any;
  data: any;
  count: any;
  status: number;
  statusText: string;
};

//TODO: THIS QUERYBUILDER IS BEING REFACTORED TO INIDIVIDUAL FUNCTIONS STORED IN THE ./tables DIRECTORY
//WHY? ALLOCATING A NEW OBJECT FOR EACH QUERY IS NOT MEMORY EFFICIENT AND SO THE CLASS WILL BE REMOVED COMPLETELY

export default class QueryBuilder {
  client: any;
  userid: any;

  constructor(ctx: { state: { supabaseClient: any; userid: string | null } }) {
    this.client = ctx.state.supabaseClient;
    this.userid = ctx.state.userid;
  }

  select() {
    return {
      Items: {
        //selectItemByButtonId
        byButtonId: async (buttonId: string) => {
          const res = await this.client.from("Items").select(
            "*",
          ).eq(
            "button_id",
            buttonId,
          );
          return this.responseHandler(res);
        },
        byButtonIdForPayeeOnly: async (buttonId: string) => {
          const res = await this.client.from("Items").select(
            "*",
          ).eq(
            "button_id",
            buttonId,
          ).eq("payee_id", this.userid);
          return this.responseHandler(res);
        },
        //selectItemsByPayeeIdDesc
        byUserIdForPayeeDesc: async () => {
          const res = await this.client.from("Items").select().eq(
            "payee_id",
            this.userid,
          )
            .order("created_at", { ascending: false });
          return this.responseHandler(res);
        },
      },
      Accounts: {
        // selectOpenAccountsFromUserByNetworkAndCurrency
        whereOpenByNetworkAndCurrencyAndUserId: async (
          networkId: string,
          currency: string,
        ) => {
          const res = await this.client
            .from("Accounts")
            .select()
            .eq("closed", false)
            .eq("user_id", this.userid)
            .eq("network_id", networkId)
            .eq("currency", currency)
            .order("last_modified", { ascending: false });
          return this.responseHandler(res);
        },
        //selectAccountByCommitment
        byCommitment: async (commitment: string) => {
          const res = await this.client.from("Accounts").select().eq(
            "commitment",
            commitment,
          ).eq("user_id", this.userid);
          return this.responseHandler(res);
        },
        //selectOpenAccountsByIdDESC
        whereOpenByUserIdOrderDesc: async () => {
          const res = await this.client
            .from("Accounts")
            .select()
            .eq("user_id", this.userid)
            .eq("closed", false)
            .order("last_modified", { ascending: false });
          return this.responseHandler(res);
        },
        whereClosedByUserIdOrderDesc: async () => {
          const res = await this.client
            .from("Accounts")
            .select()
            .eq("user_id", this.userid)
            .eq("closed", true)
            .order("last_modified", { ascending: false });
          return this.responseHandler(res);
        },
        allByUserIdOrderDesc: async () => {
          const res = await this.client
            .from("Accounts")
            .select()
            .eq("user_id", this.userid)
            .order("last_modified", { ascending: false });
          return this.responseHandler(res);
        },
      },
      Profiles: {
        //selectProfileByUserId
        byUserId: async () => {
          const res = await this.client.from("Profiles").select("*", {
            count: "exact",
          }).eq(
            "id",
            this.userid,
          );
          return this.responseHandler(res);
        },
      },
      //selectPaymentIntentsByUserIdDESC
      PaymentIntents: {
        byUserIdForCreatorDesc: async () => {
          const res = await this.client.from("PaymentIntents").select(
            "*,debit_item_id(*)",
          ).eq(
            "creator_user_id",
            this.userid,
          ).order(
            "created_at",
            { ascending: false },
          );
          return this.responseHandler(res);
        },
        //selectPaymentIntentsByAccountBalanceTooLow
        byAccountBalanceTooLowByUserIdForCreatorDesc: async () => {
          const res = await this.client.from("PaymentIntents").select(
            "*,debit_item_id(*)",
          ).eq(
            "creator_user_id",
            this.userid,
          ).eq("statusText", PaymentIntentStatus.ACCOUNTBALANCETOOLOW).order(
            "created_at",
            { ascending: false },
          );
          return this.responseHandler(res);
        },
        forAccountbyAccountBalanceTooLow: async (account_id: number) => {
          const res = await this.client.from("PaymentIntents")
            .select("*,debit_item_id(*)")
            .eq("creator_user_id", this.userid)
            .eq("account_id", account_id)
            .eq("statusText", PaymentIntentStatus.ACCOUNTBALANCETOOLOW);
          return this.responseHandler(res);
        },

        //selectPaymentIntentByPaymentIntentAndCreatorUserId
        byPaymentIntentAndUserIdForCreator: async (paymentIntent: string) => {
          const res = await this.client.from("PaymentIntents")
            .select("*,debit_item_id(*),account_id(*)")
            .eq("paymentIntent", paymentIntent)
            .eq("creator_user_id", this.userid);
          return this.responseHandler(res);
        },
        //selectPaymentIntentByPaymentIntentAndPayeeUserId
        byPaymentIntentAndUserIdForPayee: async (paymentIntent: string) => {
          const res = await this.client.from("PaymentIntents").select(
            "*,debit_item_id(*),account_id(*)",
          ).eq(
            "paymentIntent",
            paymentIntent,
          ).eq("payee_user_id", this.userid);
          return this.responseHandler(res);
        },
        //selectPaymentIntentsByPayeeAndItem
        byItemIdAndUserIdForPayeeOrderDesc: async (debit_item_id: string) => {
          const res = await this.client.from("PaymentIntents")
            .select("*,account_id(balance,currency)").eq(
              "payee_user_id",
              this.userid,
            ).eq(
              "debit_item_id",
              debit_item_id,
            ).order("created_at", { ascending: false });
          return this.responseHandler(res);
        },
      },

      RelayerHistory: {
        //selectRelayerHistoryById
        byPaymentIntentId: async (paymentIntentId: number) => {
          const res = await this.client.from("RelayerHistory")
            .select("*")
            .eq("paymentIntent_id", paymentIntentId);
          return this.responseHandler(res);
        },
        //selectRelayerHistoryByUserId
        byUserIdForPayee: async () => {
          const res = await this.client.from("RelayerHistory")
            .select("*")
            .eq("payee_user_id", this.userid);
          return this.responseHandler(res);
        },
      },
      DynamicPaymentRequestJobs: {
        //selectDynamicPaymentRequestJobByPaymentIntentIdAndUserId
        byPaymentIntentIdAndUserId: async (paymentIntent_id: number) => {
          const res = await this.client.from("DynamicPaymentRequestJobs")
            .select("*,paymentIntent_id(*)")
            .eq("paymentIntent_id", paymentIntent_id)
            .eq("request_creator_id", this.userid);
          return this.responseHandler(res);
        },
        //selectDynamicPaymentRequestJobById
        byJobId: async (jobId: number) => {
          const res = await this.client.from("DynamicPaymentRequestJobs")
            .select("*,paymentIntent_id(*)").eq(
              "id",
              jobId,
            );
          return this.responseHandler(res);
        },
        byPaymentIntentId: async (paymentIntent_id: string) => {
          const res = await this.client.from("DynamicPaymentRequestJobs")
            .select("*,paymentIntent_id(*)")
            .eq("paymentIntent_id", paymentIntent_id);

          return this.responseHandler(res);
        },
      },

      RPC: {
        emailByUserId: async (user_id: string) => {
          const res = await this.client.rpc("get_email_by_user_uuid2", {
            user_id,
          });
          return this.responseHandler(res);
        },
      },
    };
  }

  insert() {
    return {
      Accounts: {
        //insertNewAccount
        newAccount: async (
          network_id: string,
          commitment: string,
          name: string,
          currency: string,
          balance: string,
          accountType: AccountTypes,
          creator_address: string,
          accountAccess: AccountAccess,
        ) => {
          const res = await this.client.from("Accounts").insert({
            created_at: new Date().toUTCString(),
            user_id: this.userid,
            network_id,
            commitment,
            name,
            closed: false,
            currency,
            balance: formatEther(balance),
            last_modified: new Date().toUTCString(),
            accountType,
            creator_address,
            account_access: accountAccess,
          });

          return this.responseHandler(res);
        },
      },
      Items: {
        //insertNewItem
        newItem: async (
          payee_address: string,
          currency: string,
          max_price: string,
          debit_times: string,
          debit_interval: string,
          redirect_url: string,
          pricing: string,
          network: string,
          name: string,
        ) => {
          const res = await this.client.from("Items").insert({
            created_at: new Date().toUTCString(),
            payee_id: this.userid,
            payee_address,
            currency,
            max_price,
            debit_times,
            debit_interval,
            redirect_url,
            pricing,
            network,
            name,
          }).select();
          return this.responseHandler(res);
        },
      },
      Profiles: {
        //insertProfile
        newProfile: async (
          firstname: string,
          lastname: string,
          addressline1: string,
          addressline2: string,
          city: string,
          postcode: string,
          country: string,
        ) => {
          const res = await this.client.from("Profiles").insert({
            userid: this.userid,
            firstname,
            lastname,
            addressline1,
            addressline2,
            city,
            postcode,
            country,
          });
          return this.responseHandler(res);
        },
      },
      Feedback: {
        //insertFeedback
        newFeedback: async (
          subject: string,
          message: string,
          email: string,
        ) => {
          const res = await this.client.from("Feedback").insert(
            {
              creator_id: this.userid,
              subject,
              message,
              creator_email_address: email,
            },
          ).select();
          return this.responseHandler(res);
        },
      },
      //insertPaymentIntent
      PaymentIntent: {
        newPaymentIntent: async (
          payee_user_id: string,
          account_id: string,
          payee_address: string,
          maxDebitAmount: string,
          debitTimes: string,
          debitInterval: string,
          paymentIntent: string,
          commitment: string,
          estimatedGas: string,
          statusText: string,
          pricing: string,
          currency: string,
          network: string,
          debit_item_id: string,
          proof: string,
          publicSignals: string,
        ) => {
          const res = await this.client.from(
            "PaymentIntents",
          ).insert({
            created_at: new Date().toUTCString(),
            creator_user_id: this.userid,
            payee_user_id,
            account_id,
            payee_address,
            maxDebitAmount,
            debitTimes,
            debitInterval,
            paymentIntent,
            commitment,
            estimatedGas,
            statusText,
            lastPaymentDate: null,
            nextPaymentDate: new Date().toUTCString(),
            pricing,
            currency,
            network,
            debit_item_id,
            proof,
            publicSignals,
          });

          return this.responseHandler(res);
        },
      },
      //insertDynamicPaymentRequestJob
      DynamicPaymentRequestJobs: {
        newJob: async (
          paymentIntent_id: number,
          requestedAmount: string,
        ) => {
          const res = await this.client.from("DynamicPaymentRequestJobs")
            .insert({
              created_at: new Date().toUTCString(),
              paymentIntent_id,
              requestedAmount,
              status: DynamicPaymentRequestJobsStatus.CREATED,
              request_creator_id: this.userid,
            }).select();
          return this.responseHandler(res);
        },
      },
      Webhooks: {
        newUrl: async (
          webhook_url: string,
        ) => {
          const res = await this.client.from("Webhooks").insert({
            created_at: new Date().toUTCString(),
            webhook_url,
            creator_id: this.userid,
          });
          return this.responseHandler(res);
        },
      },
    };
  }

  update() {
    return {
      Accounts: {
        //updateAccount
        balanceAndClosedById:
          (async (balance: string, closed: boolean, id: number) => {
            const res = await this.client.from("Accounts")
              .update({
                balance: formatEther(balance),
                closed,
                last_modified: new Date().toUTCString(),
              }).eq("id", id);
            return this.responseHandler(res);
          }),
      },
      Items: {
        //updateItem
        deletedByButtonIdForPayee: async (
          deleted: boolean,
          button_id: string,
        ) => {
          const res = await this.client.from("Items")
            .update({ deleted }).eq("payee_id", this.userid).eq(
              "button_id",
              button_id,
            );
          return this.responseHandler(res);
        },
        //updateItemPaymentIntentsCount
        paymentIntentsCountByButtonId: async (
          payment_intents_count: number,
          button_id: string,
        ) => {
          const res = await this.client.from("Items").update({
            payment_intents_count,
          }).eq("button_id", button_id);

          return this.responseHandler(res);
        },
      },
      PaymentIntents: {
        //updatePaymentItemStatus
        statusByPaymentIntent: async (
          status: PaymentIntentStatus,
          paymentIntent: string,
        ) => {
          const res = await this.client.from("PaymentIntents").update({
            statusText: status,
          }).eq("paymentIntent", paymentIntent);

          return this.responseHandler(res);
        },
        //updatePaymentIntentAccountBalanceTooLowDynamicPayment
        statusTextToAccountBalanceTooLowById: async (
          paymentIntentRow: PaymentIntentRow,
        ) => {
          const res = await this.client.from("PaymentIntents").update({
            statusText: PaymentIntentStatus.ACCOUNTBALANCETOOLOW,
          }).eq("id", paymentIntentRow.id);

          return this.responseHandler(res);
        },
        //This will set the failedDynamicPaymentAmount to zero, it's only used after account balance was added
        updateForAccountBalanceNotLowAnymore: async (
          statusText: string,
          paymentIntentRow: PaymentIntentRow,
        ) => {
          const res = await this.client.from("PaymentIntents").update({
            failedDynamicPaymentAmount: "0",
            statusText,
          }).eq("id", paymentIntentRow.id);
          return this.responseHandler(res);
        },
        toCancelledByAccountIdForCreator: async (
          accountId: number,
        ) => {
          const res = await this.client.from("PaymentIntents")
            .update({
              statusText: PaymentIntentStatus.CANCELLED,
            }).eq("creator_user_id", this.userid)
            .eq("account_id", accountId)
            .neq("statusText", PaymentIntentStatus.PAID)
            .neq("statusText", PaymentIntentStatus.CANCELLED);

          return this.responseHandler(res);
        },
      },
      Webhooks: {
        byUserId: async (webhook_url: string) => {
          const res = await this.client.from("Webhooks")
            .update({ webhook_url })
            .eq("creator_id", this.userid);
          return this.responseHandler(res);
        },
      },
      DynamicPaymentRequestJobs: {
        //updateDynamicPaymentRequestJob
        ByPaymentIntentIdAndRequestCreator: async (
          paymentIntent_id: number,
          requestedAmount: string,
        ) => {
          const res = await this.client.from("DynamicPaymentRequestJobs")
            .update({
              created_at: new Date().toUTCString(),
              requestedAmount,
              status: DynamicPaymentRequestJobsStatus.CREATED,
              last_modified: new Date().toUTCString(),
            }).eq("paymentIntent_id", paymentIntent_id)
            .eq("request_creator_id", this.userid).select();

          return this.responseHandler(res);
        },
      },
    };
  }

  upsert() {
    return {
      Profiles: {
        //upsertProfile
        all: async (
          firstname: string,
          lastname: string,
          addressline1: string,
          addressline2: string,
          city: string,
          postcode: string,
          country: string,
        ) => {
          const res = await this.client.from("Profiles").upsert(
            {
              id: this.userid,
              firstname,
              lastname,
              addressline1,
              addressline2,
              city,
              postcode,
              country,
            },
            { ignoreDuplicates: false },
          ).select();

          return this.responseHandler(res);
        },
      },
    };
  }

  delete() {
    return {
      DynamicPaymentRequestJobs: {
        // deleteDynamicPaymentRequestJobById
        byIdForRequestCreator: async (id: number) => {
          const res = await this.client.from("DynamicPaymentRequestJobs")
            .delete()
            .eq("request_creator_id", this.userid)
            .eq("id", id)
            .neq(
              "status",
              DynamicPaymentRequestJobsStatus.LOCKED,
            );
          return this.responseHandler(res);
        },
      },
      ApiAuthTokens: {
        ByAccessToken: async (accessToken: string) => {
          const res = await this.client.from("ApiAuthTokens")
            .delete()
            .eq("access_token", accessToken)
            .eq("creator_id", this.userid);
          return this.responseHandler(res);
        },
      },
    };
  }

  responseHandler(res: SupabaseQueryResult) {
    if (res.error !== null) {
      console.log("QUERY ERROR!");
      console.log(res);
      console.log(res.error);
    }
    return { ...res };
  }
}
