import Layout from "../../components/Layout.tsx";
import { State } from "../_middleware.ts";
import { Handlers, PageProps } from "$fresh/server.ts";
import RelayerDetailsCard from "../../islands/RelayerDetailsCard.tsx";
import { fetchTopUpEvent, getRelayerTopUpContract } from "../../lib/backend/web3.ts";
import { insertNewRelayerBalance, selectProfileByUserId, selectRelayerBalanceByUserId, selectRelayerTopUpHistoryDataByTransactionHash, selectRelayerTopUpHistoryDataByUserId, updateRelayerBalanceAndHistorySwitchNetwork } from "../../lib/backend/supabaseQueries.ts";
import RelayerTopupHistory from "../../islands/RelayerTopupHistory.tsx";

export const handler: Handlers<any, State> = {
    async GET(_req, ctx) {
        const userid = ctx.state.userid;

        const { data: relayerBalanceData, error: relayerBalanceDataError } = await selectRelayerBalanceByUserId(ctx.state.supabaseClient, userid);

        if (relayerBalanceData === null || relayerBalanceData.length === 0) {
            // If it doesn't exist I create a new one!
            const res = await insertNewRelayerBalance(ctx.state.supabaseClient, userid)
            const { data: relayerBalanceData, error: relayerBalanceDataError } = await selectRelayerBalanceByUserId(ctx.state.supabaseClient, userid);
            return ctx.render({ ...ctx.state, relayerBalanceData })
        }

        const { data: profileData, error: profileError } = await selectProfileByUserId(ctx.state.supabaseClient, userid);

        if (profileData === null || profileData.length === 0) {
            // Redirect to the profile page instead so the user needs to fill it out!
            const headers = new Headers();
            headers.set("location", "/app/profile");
            return new Response(null, { status: 303, headers })
        }

        const { data: relayerTopUpHistoryData, error: relayerTopUpHistoryDataError } = await selectRelayerTopUpHistoryDataByUserId(ctx.state.supabaseClient, userid);

        return ctx.render({ ...ctx.state, relayerBalanceData, profileData, relayerTopUpHistoryData });
    },
    async POST(_req, ctx) {
        const userid = ctx.state.userid;
        const json = await _req.json();
        const chainId = json.chainId;
        const blockNumber = json.blockNumber;
        const transactionHash = json.transactionHash;
        const from = json.from;
        const amount = json.amount;
        // I need to decode the json sent to the server, 

        const { data: profileData, error: profileError } = await selectProfileByUserId(ctx.state.supabaseClient, userid);
        if (profileData === null || profileData.length === 0) {
            return new Response("Invalid user Profile!", { status: 500 })
        }

        if (profileData[0].walletaddress.toLowerCase() !== from.toLowerCase()) {
            return new Response("From address doesn't match profile!", { status: 500 })
        }
        //Check if the tx is already saved into supabase I can't add it to relayer balance

        const { data: relayerTopUpHistoryData, error: relayerTopUpHistoryDataError } = await selectRelayerTopUpHistoryDataByTransactionHash(
            ctx.state.supabaseClient, transactionHash);

        // I need the opposite of this to occur for an error hence the !
        if (!(relayerTopUpHistoryData === null || relayerTopUpHistoryData.length === 0)) {
            return new Response("Transaction is already processed!", { status: 500, })
        }
        //fetch the event related to the transaction
        const relayerTopupContract = getRelayerTopUpContract(chainId);
        const topUpEvents = await fetchTopUpEvent(relayerTopupContract, from, amount, blockNumber);

        if (topUpEvents.length === 0) {
            //If I found no top up event, then the transaction never happened in that block!
            return new Response(null, { status: 500 })
        }

        // Check that the transaction hash from the event matches the transactionHash sent by the API
        if (topUpEvents[0].transactionHash.toLowerCase() !== transactionHash.toLowerCase()) {
            return new Response(null, { status: 500 })
        }

        await updateRelayerBalanceAndHistorySwitchNetwork(
            chainId,
            ctx.state.supabaseClient,
            userid,
            amount,
            transactionHash

        )

        return new Response(null, { status: 200 })
    }
}



export default function Relayer(props: PageProps) {
    return <Layout isLoggedIn={props.data.token}>
        <div class="container mx-auto py-8">
            <div class="flex items-center justify-center h-full">
                <div class="bg-white shadow-2xl p-6 rounded-2xl border-2 border-gray-50 w-96">
                    <div class="flex flex-col">
                        <div class={"flex flex-row justify-start"}>
                            <img src="/blockchain.png" width="40px" />
                            <p class={"text-xl font-extrabold leading-10 pl-6"}>Relayer</p>
                        </div>
                        <RelayerDetailsCard
                            walletAddress={props.data.profileData[0].walletaddress}
                            relayerData={props.data.relayerBalanceData[0]}></RelayerDetailsCard>
                    </div>
                </div>
            </div>

            <div class="flex flex-col items-center justify-center h-full w-full">
                <h4>Top Up History</h4>
                <RelayerTopupHistory topUpHistoryData={props.data.relayerTopUpHistoryData}></RelayerTopupHistory>
            </div>
        </div>
    </Layout>
}