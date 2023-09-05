import { Handlers, PageProps } from "$fresh/server.ts";
import BuyButtonPage, { ItemProps } from "../islands/buyButtonPage.tsx";
import { State } from "./_middleware.ts";
import { setCookie } from "$std/http/cookie.ts";
import { selectItemByButtonId, selectOpenAccountsFromUserByNetworkAndCurrency, selectProfileByUserId, signInWithPassword } from "../lib/backend/supabaseQueries.ts";

function doesProfileExists(profileData: any) {
    if (profileData === null || profileData.length === 0) {
        return false;
    }
    return true;
}
const ethEncryptPublicKey = Deno.env.get("ETHENCRYPTPUBLICKEY") || "";

export const handler: Handlers<any, State> = {
    async GET(req, ctx) {
        const url = new URL(req.url);
        const query = url.searchParams.get("q") || "";

        const { data: itemData, error: itemError } = await selectItemByButtonId(ctx.state.supabaseClient, query);

        if (itemData === null || itemData.length === 0) {
            return ctx.render({ ...ctx.state, notfound: true, itemData: [] });
        }

        // I need to fetch the accounts for this user and then display the ones on the same network and currency

        const currency = JSON.parse(itemData[0].currency);

        const { data: accountData, error: accountError } = await selectOpenAccountsFromUserByNetworkAndCurrency(
            ctx.state.supabaseClient,
            ctx.state.userid,
            itemData[0].network,
            currency.name);

        const { data: profileData, error: profileError } = await selectProfileByUserId(ctx.state.supabaseClient, ctx.state.userid);

        return ctx.render({ ...ctx.state, notfound: false, itemData, accountData, profileExists: doesProfileExists(profileData), ethEncryptPublicKey })

    },
    async POST(req, ctx) {
        //THIS POST IS USED FOR LOGGING IN!
        const form = await req.formData();
        const buttonId = form.get("buttonId") as string;
        const email = form.get("email") as string;
        const password = form.get("password") as string;

        const { data, error } = await signInWithPassword(ctx.state.supabaseClient, email, password);

        const headers = new Headers();

        if (data.session) {
            setCookie(headers, {
                name: 'supaLogin',
                value: data.session?.access_token,
                maxAge: data.session.expires_in
            })
        }

        let redirect = "buyitnow?q=" + buttonId;

        if (error) {
            redirect = `${redirect}&error=${error.message}`
        }

        headers.set("location", redirect);
        return new Response(null, {
            status: 303,
            headers,
        });
    }

}

export function getItemProps(item: any): ItemProps {
    return {
        payeeAddress: item.payee_address,
        currency: JSON.parse(item.currency),
        maxPrice: item.max_price,
        debitTimes: item.debit_times,
        debitInterval: item.debit_interval,
        buttonId: item.button_id,
        redirectUrl: item.redirect_url,
        pricing: item.pricing,
        network: item.network,
        name: item.name,

    };
}

export default function BuyItNow(props: PageProps) {
    const notfound = props.data.notfound;
    const item = props.data.itemData[0];
    return <>
        {!notfound ? <BuyButtonPage
            ethEncryptPublicKey={props.data.ethEncryptPublicKey}
            profileExists={props.data.profileExists}
            accounts={props.data.accountData}
            url={props.url}
            item={getItemProps(item)}
            isLoggedIn={props.data.token}></BuyButtonPage> : <div class="w-full max-w-sm mx-auto bg-white p-8 rounded-md shadow-md">
            <h1 class="text-2xl font-bold mb-6 text-center">Not Found</h1>
        </div>} </>
}