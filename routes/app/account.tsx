// deno-lint-ignore-file no-explicit-any

import Layout from "../../components/Layout.tsx";
import { Handlers, PageProps } from "$fresh/server.ts";
import { State } from "../_middleware.ts";
import { ChainIds, getDirectDebitContractAddress, networkNameFromId, rpcUrl } from "../../lib/shared/web3.ts";
import { getAccount } from "../../lib/backend/web3.ts";
import { ZeroAddress, formatEther } from "../../ethers.min.js";
import AccountTopupOrClose from "../../islands/AccountTopupOrClose.tsx";

export const handler: Handlers<any, State> = {
    async GET(req: any, ctx: any) {
        const url = new URL(req.url);
        const query = url.searchParams.get("q") || "";
        try {
            const { networkId, commitment, name, currency } = JSON.parse(query);

            const networkExists = rpcUrl[networkId as ChainIds]
            if (!networkExists) {
                //   render a not found page
                return ctx.render({ ...ctx.state, notfound: true })
            }
            const accountData = await getAccount(commitment, networkId);
            if (accountData.exists) {
                const { data, error } = await ctx.state.supabaseClient.from("Accounts").select().eq("commitment", commitment);

                if (data.length === 0) {

                    const { data: savedAccountData, error: accountError } = await ctx.state.supabaseClient.from("Accounts").insert({
                        created_at: new Date().toISOString(),
                        user_id: ctx.state.userid,
                        network_id: networkId,
                        commitment: commitment,
                        name: name,
                        closed: false,
                        currency,
                        balance: formatEther(accountData.account[3])
                    })
                    // Here I return the data from the query string because that is what was saved!
                    return ctx.render({ notfound: false, ...ctx.state, currency, name, commitment, closed: false, networkId, accountData });
                } else {

                    if (data[0].balance !== formatEther(accountData.account[3])) {
                        const res = await ctx.state.supabaseClient
                            .from("Accounts")
                            .update({ balance: formatEther(accountData.account[3]), closed: !accountData.account[0] }).eq("id", data[0].id)
                    }

                    // Here I return the data from the database because the account was saved
                    return ctx.render({ notfound: false, ...ctx.state, currency, name, commitment, closed: data[0].closed, networkId: networkId, accountData });
                }

            } else {
                // render a context not found page
                return ctx.render({ ...ctx.state, notfound: true })
            }

        } catch (err) {
            return new Response(null, { status: 500 })
        }
    }
}

export default function Account(props: PageProps) {
    const balance = props.data.accountData.account[3];
    const tokenAddress = props.data.accountData.account[2];
    return <Layout isLoggedIn={props.data.token}>
        {!props.data.notfound ?
            <div class="container mx-auto py-8">
                <div class="flex items-center justify-center h-full">
                    <div class="bg-white shadow-2xl p-6 rounded-2xl border-2 border-gray-50 w-96">
                        <div class="flex flex-col">
                            <div>
                                <h2 class="font-bold text-gray-600 text-center">{props.data.name}</h2>
                            </div>
                            <div class="my-6">
                                <div class="flex flex-col justify-items-center">
                                    <div class="mx-auto">
                                        <h4 class="text-xl">{formatEther(balance)} {props.data.currency}</h4>
                                    </div>
                                    <div class="mx-auto">
                                        <p class="text-xs text-gray-500">{networkNameFromId[props.data.networkId as ChainIds]}</p>
                                    </div>
                                </div>
                            </div>
                            <AccountTopupOrClose
                                currencyName={props.data.currency}
                                accountName={props.data.name}
                                debitContractAddress={getDirectDebitContractAddress[props.data.networkId as ChainIds]}
                                erc20ContractAddress={tokenAddress}
                                commitment={props.data.commitment}
                                chainId={props.data.networkId}
                                isERC20={tokenAddress !== ZeroAddress}
                                accountClosed={props.data.closed}
                            ></AccountTopupOrClose>
                        </div>
                    </div>
                </div>
            </div>
            : <div class="container mx-auto py-8">
                <div class="w-full max-w-sm mx-auto bg-white p-8 rounded-md shadow-md">
                    <h1 class="text-2xl font-bold mb-6 text-center">Account Not Found</h1>
                </div>
            </div>
        }
    </Layout>
}