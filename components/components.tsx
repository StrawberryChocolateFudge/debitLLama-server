import { ComponentChildren } from "preact";
import { DynamicPaymentRequestJobsStatus, PaymentIntentStatus } from "../lib/enums.ts";

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

export function Tooltip(props: TooltipProps) {
    return <div class="tooltip">
        ?
        <span aria-label="Tooltip helptext" class="tooltiptext">{props.message}</span>
    </div>
}

export function getSubscriptionTooltipMessage(pricing: string) {
    if (pricing === "Fixed") {
        return "Fixed priced subscriptions will always debit the approved amount."
    } else {
        return "Metered subscriptions have dynamic pricing where the approved amount represents a maximum";
    }
}

export function getDebitIntervalText(debitInterval: number, debitTimes: number) {
    if (debitTimes === 1) {
        return "Unspecified";
    }
    if (debitInterval === 0) {
        return "Unspecified"
    }

    if (debitInterval === 1) {
        return "The payment can be withdrawn every day"
    }

    return `The payment can be withdrawn only every ${debitInterval} days`

}


export function formatTxHash(tx: string) {
    return `${tx.substring(0, 5)}...${tx.substring(tx.length - 5, tx.length)}`
}

export function RenderIdentifier(id: string) {
    // /?TODO: Copy icon and copy the text
    return <span>{`${id.substring(0, 5)}...${id.substring(id.length - 5, id.length)}`}</span>
}

export function getPaymentIntentStatusLogo(status: PaymentIntentStatus | string) {
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
            return <div class="inline-flex items-center py-1 text-gray-500 rounded-full gap-x-2 bg-gray-100/60 dark:bg-gray-800">
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
        case PaymentIntentStatus.BALANCETOOLOWTORELAY:
            return <div class="inline-flex items-center py-1 rounded-full gap-x-2 text-emerald-500 bg-emerald-100/60 dark:bg-gray-800">
                <svg xmlns="http://www.w3.org/2000/svg" height="12" viewBox="0 -960 960 960" width="12"><path d="M600-160q-134 0-227-93t-93-227q0-134 93-227t227-93q134 0 227 93t93 227q0 134-93 227t-227 93Zm-320-10q-106-28-173-114T40-480q0-110 67-196t173-114v84q-72 25-116 87t-44 139q0 77 44 139t116 87v84Zm320-310Zm0 240q100 0 170-70t70-170q0-100-70-170t-170-70q-100 0-170 70t-70 170q0 100 70 170t170 70Z" /></svg>

                <h2 class="text-sm font-normal">Relayer balance too low</h2>
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