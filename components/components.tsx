import { ComponentChildren } from "preact";
import { AccountAccess, DynamicPaymentRequestJobsStatus, PaymentIntentStatus, Pricing } from "../lib/enums.ts";
import { formatEther, parseEther } from "../lib/frontend/web3.ts";
import { ChainIds, explorerUrl, explorerUrlAddressPath } from "../lib/shared/web3.ts";

export interface UnderlinedTdProps {
    children: ComponentChildren
    extraStyles: string
}

export function UnderlinedTd(props: UnderlinedTdProps) {
    return <td class={`${props.extraStyles} border-b border-slate-100 dark:border-slate-700 p-4 text-slate-500 dark:text-slate-400`}>{props.children}</td>
}


export interface TooltipProps {
    message: string
}

export interface TopptipWithTitleProps extends TooltipProps {
    title: string;
    extraStyle: string;
}

export function Tooltip(props: TooltipProps) {
    return <div class="tooltip select-none">
        ?
        <span aria-label={"Tooltip: " + props.message} class="tooltiptext">{props.message}</span>
    </div>
}

export function TooltipWithTitle(props: TopptipWithTitleProps) {
    return <div class="tooltip">
        {props.title}
        <span style={props.extraStyle} aria-label={"Tooltip: " + props.message} class="tooltiptext_noalign">{props.message}</span>
    </div>
}

export function getMaxDebitColTitleFromPricing(pricing: string) {
    if (pricing === Pricing.Fixed) {
        return "Debit limit:"
    } else {
        return "Debit limit:"
    }
}

export function getSubscriptionTooltipMessage(pricing: string) {
    if (pricing === Pricing.Fixed) {
        return "Fixed priced subscriptions will automatically debit the full amount per payment!"
    } else {
        return "Dynamic pricing means the merchant will manually request a payment, the approved amount is the maximum that can be debited, per payment!";
    }
}

export function getDebitTimesText(debitTimes: number) {
    if (debitTimes === 1) {
        return "Single Payment"
    } else {
        return `${debitTimes} Payments`
    }
}

export function getDebitIntervalText(debitInterval: number, debitTimes: number) {
    if (debitTimes === 1) {
        return "Single payment";
    }
    if (debitInterval === 0) {
        return "Unspecified. The merchant can pull payments any time!"
    }
    if (debitInterval === 1) {
        return "The payment can be withdrawn every day"
    }
    return `The payment can be withdrawn every ${debitInterval} days`
}

export function getDebitIntervalTooltipText(debitInterval: number, debitTimes: number) {
    if (debitTimes === 1) {
        return "You will only pay once and then the subscription agreement is finished!";
    }
    if (debitInterval === 0) {
        return "Caution! The subscription agreement doesn't enforce any limit on withdrawal times."
    }
    if (debitInterval === 1) {
        return "The payment can be debited every 24 hours after the last payment date! Consider this."
    }
    return `Counted from the last payment date, ${debitInterval} days will needs to pass before the account can be debited again!`
}

export function getTotalPaymentField(
    maxPrice: string,
    currName: string,
    pricing: string,
    debitInterval: number,
    debitTimes: number) {

    const maxPriceToWei = parseEther(maxPrice);
    const totalPaidWithMaxprice = maxPriceToWei * BigInt(debitTimes);
    const totalPaidETH = formatEther(totalPaidWithMaxprice);
    if (pricing === Pricing.Fixed) {
        return `${totalPaidETH} ${currName}`;
    } else {
        return `Max ${totalPaidETH} ${currName}`
    }
}

export function getTotalPaymentFieldTooltip(
    maxPrice: string,
    currName: string,
    pricing: string,
    debitInterval: number,
    debitTimes: number) {

    if (pricing === Pricing.Fixed) {
        const dividedInto = debitInterval <= 1 ? "automatically every day!" : `automatically every ${debitInterval} days!`;
        const times = debitTimes === 1 ? "debited in a single transaction." : `divided into ${debitTimes} transactions, processed ${dividedInto}`;
        return `The amount will be ${times}`
    } else {
        const dividedInto = debitInterval <= 1 ? "withdraw is allowed every day!" : `withdraw is allowed every ${debitInterval} days, after the last payment date!`;
        const times = debitTimes === 1 ? "debited in a single transaction." : `debited with ${debitTimes} transactions, ${dividedInto}`;
        return `The maximum amount that can be ${times} The actual amount will be requested by the merchant per payment!`
    }
}

export function formatTxHash(tx: string) {
    return `${tx.substring(0, 5)}...${tx.substring(tx.length - 5, tx.length)}`
}

export function RenderIdentifier(id: string) {
    // /?TODO: Copy icon and copy the text
    return <span>{`${id.substring(0, 5)}...${id.substring(id.length - 5, id.length)}`}</span>
}

export function getPaymentIntentStatusLogo(status: PaymentIntentStatus | string, forPage: "payee" | "account") {
    switch (status) {
        case PaymentIntentStatus.CREATED:
            return <div class="inline-flex items-center py-1 rounded-full gap-x-2 text-emerald-500 bg-emerald-100/60 dark:bg-gray-800">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>

                <h2 class="text-sm font-normal">Created</h2>
            </div>

        case PaymentIntentStatus.CANCELLED:
            return <div class="inline-flex items-center py-1 text-red-500 rounded-full gap-x-2 bg-red-100/60 dark:bg-gray-800">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>

                <h2 class="text-sm font-normal">Cancelled</h2>
            </div>
        case PaymentIntentStatus.RECURRING:
            return <div class="inline-flex items-center py-1 rounded-full gap-x-2 bg-gray-100/60 dark:bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" height="12" viewBox="0 -960 960 960" width="12"><path d="M280-80 120-240l160-160 56 58-62 62h406v-160h80v240H274l62 62-56 58Zm-80-440v-240h486l-62-62 56-58 160 160-160 160-56-58 62-62H280v160h-80Z" /></svg>

                <h2 class="text-sm font-normal">Recurring</h2>
            </div>

        case PaymentIntentStatus.PAID:
            return <div class="inline-flex items-center py-1 rounded-full gap-x-2 text-emerald-500 bg-emerald-100/60 dark:bg-gray-800">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>

                <h2 class="text-sm font-normal">Paid</h2>
            </div>
        case PaymentIntentStatus.ACCOUNTBALANCETOOLOW:
            return <div class="inline-flex items-center py-1 rounded-full gap-x-2 text-emerald-500 bg-emerald-100/60 dark:bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" height="12" viewBox="0 -960 960 960" width="12"><path d="M480-120q-33 0-56.5-23.5T400-200q0-33 23.5-56.5T480-280q33 0 56.5 23.5T560-200q0 33-23.5 56.5T480-120Zm-80-240v-480h160v480H400Z" /></svg>
                <h2 class="text-sm font-normal">Account balance too low</h2>
            </div>
        default:
            return <div></div>
    }
}

export function getPaymentIntentStatusTooltip(status: PaymentIntentStatus | string, forPage: "payee" | "account") {
    const getName = forPage === "account" ? "subscription" : "payment intent"
    switch (status) {
        case PaymentIntentStatus.CREATED:
            return `The ${getName} is active! The first payment will be soon debited from the account and transferred to ${forPage === "account" ? "the payee!" : "to the address specified when creating the item!"}`
        case PaymentIntentStatus.CANCELLED:
            return `The ${getName} was cancelled. The payments cannot continue. It was either manually cancelled or the account was deleted.`
        case PaymentIntentStatus.RECURRING:
            return `The ${getName} is active! The account can be debited again when we have reached the next payment date!`
        case PaymentIntentStatus.PAID:
            return `The payment period has finished. The ${getName} can be only renewed by creating a new one.`
        case PaymentIntentStatus.ACCOUNTBALANCETOOLOW:
            return `The account balance is too low to pay for this ${getName}. ${forPage === "account" ? "Please top up your balance to continue!" : "Contact the customer if they don't resolve this else the payment can't continue."}`
        default:
            return "The subscription status"
    }
}

export function getPaymentRequestStatusLogo(status: DynamicPaymentRequestJobsStatus | string) {
    switch (status) {
        case DynamicPaymentRequestJobsStatus.CREATED:
            return <div class="inline-flex items-center py-1 rounded-full gap-x-2 text-emerald-500 bg-emerald-100/60 dark:bg-gray-800">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>

                <h2 class="text-sm font-normal">Created</h2>
            </div>

        case DynamicPaymentRequestJobsStatus.REJECETED:
            return <div class="inline-flex items-center py-1 text-red-500 rounded-full gap-x-2 bg-red-100/60 dark:bg-gray-800">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                </svg>

                <h2 class="text-sm font-normal">Rejected</h2>
            </div>
        case DynamicPaymentRequestJobsStatus.COMPLETED:
            return <div class="inline-flex items-center py-1 text-gray-500 rounded-full gap-x-2 bg-gray-100/60 dark:bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" height="12" viewBox="0 -960 960 960" width="12"><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" /></svg>
                <h2 class="text-sm font-normal">Completed</h2>
            </div>

        case DynamicPaymentRequestJobsStatus.LOCKED:
            return <div class="inline-flex items-center py-1 rounded-full gap-x-2 text-emerald-500 bg-emerald-100/60 dark:bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" height="12" viewBox="0 -960 960 960" width="12"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z" /></svg>

                <h2 class="text-sm font-normal">Locked</h2>
            </div>
        default:
            return <div></div>
    }
}

export function getPaymentRequestJobStatusTooltipMessage(status: DynamicPaymentRequestJobsStatus) {
    switch (status) {
        case DynamicPaymentRequestJobsStatus.CREATED:
            return "Payment request you created. You can update it before it's locked for processing!"
        case DynamicPaymentRequestJobsStatus.COMPLETED:
            return "Payment completed. You can create a new one after next payment date."
        case DynamicPaymentRequestJobsStatus.LOCKED:
            return "Payment is locked for processing. You can't change it anymore!"
        case DynamicPaymentRequestJobsStatus.REJECETED:
            return "Unable to process payment request. Update it to create a new one!"
        default:
            return "";
    }
}

export function CarouselButtons(props: { backClicked: () => void, forwardClicked: () => void }) {
    return <div class="flex flex-row justify-center">

        <label onClick={props.backClicked}
            class="cursor-pointer bg-white rounded-full shadow-md active:translate-y-0.5"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clip-rule="evenodd" />
            </svg>
        </label>

        <label onClick={props.forwardClicked}
            class="cursor-pointer bg-white rounded-full shadow-md active:translate-y-0.5"
        >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
            </svg>
        </label>
    </div>
}


export function CarouselButtonWrapper(props: { backClicked: () => void, forwardClicked: () => void, children: ComponentChildren, showArrows: boolean }) {
    if (!props.showArrows) {
        <div class="flex flex-row justify-center">
            {props.children}
        </div>
    }

    return <div class="flex flex-row justify-center">
        <div class="flex flex-col justify-center">
            <label onClick={props.backClicked}
                class="cursor-pointer bg-white rounded-full shadow-md active:translate-y-0.5"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.707-10.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L9.414 11H13a1 1 0 100-2H9.414l1.293-1.293z" clip-rule="evenodd" />
                </svg>
            </label>
        </div>
        {props.children}
        <div class="flex flex-col justify-center">
            <label onClick={props.forwardClicked}
                class="cursor-pointer bg-white rounded-full shadow-md active:translate-y-0.5"
            >
                <svg xmlns="http://www.w3.org/2000/svg" class="h-14 w-14" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
                </svg>
            </label>
        </div>
    </div>
}

export function ExplorerLinkForAddress(props: {
    chainId: ChainIds,
    address: string
}) {
    const explorerURLLink = explorerUrl[props.chainId] + explorerUrlAddressPath[props.chainId] + props.address;
    return <a
        class={"text-indigo-600"}
        href={explorerURLLink}
        target="_blank"
    >Link</a>
}

export function NotFound(props: { title: string, children: ComponentChildren }) {
    return <div class="w-full max-w-sm mx-auto bg-white p-8 rounded-md shadow-md">
        <h1 class="text-2xl font-bold mb-6 text-center">{props.title}</h1>
        {props.children}
    </div>
}

export function PasskeysAddedNotification(props: { addedPasskeys: number }) {
    return props.addedPasskeys === 0
        ? <div class="flex flex-row justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" height="50" viewBox="0 -960 960 960" width="50"><path d="M440-400v-360h80v360h-80Zm0 200v-80h80v80h-80Z" /></svg>
            <div class="flex flex-col justify-center">
                <p class="text-lg text-red-500">There are no passkeys added!</p>
            </div>
        </div>
        : <div class="flex flex-row justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" height="50" viewBox="0 -960 960 960" width="50">
                <path d="M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q104-33 172-132t68-220v-189l-240-90-240 90v189q0 121 68 220t172 132Zm0-316Zm-80 160h160q17 0 28.5-11.5T600-360v-120q0-17-11.5-28.5T560-520v-40q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560v40q-17 0-28.5 11.5T360-480v120q0 17 11.5 28.5T400-320Zm40-200v-40q0-17 11.5-28.5T480-600q17 0 28.5 11.5T520-560v40h-80Z" />
            </svg>
            <div class="flex flex-col justify-center">
                <p class="text-lg text-green-500">
                    {props.addedPasskeys} Passkey{props.addedPasskeys > 1 ? "s" : ""} added. 2FA is on.
                </p>
            </div>
        </div >
}

export function ShowLogo() {
    return <svg
        xmlns="http://www.w3.org/2000/svg"
        height="24"
        viewBox="0 -960 960 960"
        width="24">
        <path d="M480-320q75 0 127.5-52.5T660-500q0-75-52.5-127.5T480-680q-75 0-127.5 52.5T300-500q0 75 52.5 127.5T480-320Zm0-72q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm0 192q-146 0-266-81.5T40-500q54-137 174-218.5T480-800q146 0 266 81.5T920-500q-54 137-174 218.5T480-200Zm0-300Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z" />
    </svg>;
}

export function HideLogo() {
    return <svg
        xmlns="http://www.w3.org/2000/svg"
        height="24"
        viewBox="0 -960 960 960"
        width="24">
        <path d="m644-428-58-58q9-47-27-88t-93-32l-58-58q17-8 34.5-12t37.5-4q75 0 127.5 52.5T660-500q0 20-4 37.5T644-428Zm128 126-58-56q38-29 67.5-63.5T832-500q-50-101-143.5-160.5T480-720q-29 0-57 4t-55 12l-62-62q41-17 84-25.5t90-8.5q151 0 269 83.5T920-500q-23 59-60.5 109.5T772-302Zm20 246L624-222q-35 11-70.5 16.5T480-200q-151 0-269-83.5T40-500q21-53 53-98.5t73-81.5L56-792l56-56 736 736-56 56ZM222-624q-29 26-53 57t-41 67q50 101 143.5 160.5T480-280q20 0 39-2.5t39-5.5l-36-38q-11 3-21 4.5t-21 1.5q-75 0-127.5-52.5T300-500q0-11 1.5-21t4.5-21l-84-82Zm319 93Zm-151 75Z" />
    </svg>
}

export function RadioButtonUnchecked() {
    return <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" /></svg>;
}
export function RadioButtonChecked() {
    return <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M480-280q83 0 141.5-58.5T680-480q0-83-58.5-141.5T480-680q-83 0-141.5 58.5T280-480q0 83 58.5 141.5T480-280Zm0 200q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z" /></svg>
}

export function EmailLogo() {
    return <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z" /></svg>;
}

export function DynamicFeedLogo() {
    return <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24"><path d="M160-120q-33 0-56.5-23.5T80-200v-280h80v280h360v80H160Zm160-160q-33 0-56.5-23.5T240-360v-280h80v280h360v80H320Zm160-160q-33 0-56.5-23.5T400-520v-240q0-33 23.5-56.5T480-840h320q33 0 56.5 23.5T880-760v240q0 33-23.5 56.5T800-440H480Zm0-80h320v-160H480v160Z" /></svg>;
}

export function PasswordLogo() {
    return <svg class="mx-auto" xmlns="http://www.w3.org/2000/svg" height="45" viewBox="0 -960 960 960" width="45"><path d="M80-200v-80h800v80H80Zm46-242-52-30 34-60H40v-60h68l-34-58 52-30 34 58 34-58 52 30-34 58h68v60h-68l34 60-52 30-34-60-34 60Zm320 0-52-30 34-60h-68v-60h68l-34-58 52-30 34 58 34-58 52 30-34 58h68v60h-68l34 60-52 30-34-60-34 60Zm320 0-52-30 34-60h-68v-60h68l-34-58 52-30 34 58 34-58 52 30-34 58h68v60h-68l34 60-52 30-34-60-34 60Z" /></svg>
}

export function KeyLogo() {
    return <svg class="mx-auto" xmlns="http://www.w3.org/2000/svg" height="45" viewBox="0 -960 960 960" width="45"><path d="M280-400q-33 0-56.5-23.5T200-480q0-33 23.5-56.5T280-560q33 0 56.5 23.5T360-480q0 33-23.5 56.5T280-400Zm0 160q-100 0-170-70T40-480q0-100 70-170t170-70q67 0 121.5 33t86.5 87h352l120 120-180 180-80-60-80 60-85-60h-47q-32 54-86.5 87T280-240Zm0-80q56 0 98.5-34t56.5-86h125l58 41 82-61 71 55 75-75-40-40H435q-14-52-56.5-86T280-640q-66 0-113 47t-47 113q0 66 47 113t113 47Z" /></svg>
}

export function getGoodToKnowMessage(accountAccessSelected: AccountAccess) {
    switch (accountAccessSelected) {
        case AccountAccess.metamask:
            return "Your account is encrypted using your wallet's public key. This feature relies on Metamask for decryption and might not work with other wallets!";
        case AccountAccess.password:
            return "Wallet abstraction with double encryption. The password is used for securing your account and it's needed for spending. Do not reuse your login password. The accounts are non-custodial and if you loose your password we can't recover it for you. You can always disconnect your wallet if you don't want to continue using it! ";
        case AccountAccess.passkey:
            return "Your account is stored inside a hardware authenticator device like a Yubi key or IPhone. This feature is experimental and not all authenticator devices are supported. IOS 17 and Safari 17 is Required! You can connect a device to see if it's supported!";
        default:
            return "";
    }
}