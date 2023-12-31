import Overlay from "../components/Overlay.tsx";
import { AccountTypes, PaymentIntentRow, PaymentIntentStatus } from "../lib/enums.ts";
import { packToSolidityProof, toNoteHex } from "../lib/frontend/directdebitlib.ts";
import { updatePaymentIntentToClosed } from "../lib/frontend/fetch.ts";
import { cancelPaymentIntent, getContract, handleNetworkSelect } from "../lib/frontend/web3.ts";
import { ChainIds, getConnectedWalletsContractAddress, getVirtualAccountsContractAddress } from "../lib/shared/web3.ts";
import { useState } from 'preact/hooks';

export interface CancelPaymentIntentButtonProps {
    chainId: ChainIds;
    paymentIntent: PaymentIntentRow;
    transactionsLeft: number;
    accountType: AccountTypes
}

export default function CancelPaymentIntentButton(props: CancelPaymentIntentButtonProps) {
    const [showError, setShowError] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [showOvelay, setShowOverlay] = useState(false);
    const [showOverlayError, setShowOverlayError] = useState({
        showError: false,
        message: "",
        action: () => setShowOverlay(false)
    })

    const handleError = (msg: string) => {
        setShowError(true);
        setErrorMessage(msg)
    }

    async function cancelClicked() {
        setShowError(false);
        if (props.transactionsLeft === 0) {
            setErrorMessage("Payment Intent already completed!")
            setShowError(true);
            return;
        }

        if (props.paymentIntent.statusText === PaymentIntentStatus.CANCELLED) {
            setErrorMessage("Payment Intent Already Cancelled");
            return;
        }

        const provider = await handleNetworkSelect(props.chainId, handleError)
        if (!provider) {
            return;
        }
        const contractAddress = props.accountType === AccountTypes.VIRTUALACCOUNT
            ? getVirtualAccountsContractAddress[props.chainId]
            : getConnectedWalletsContractAddress[props.chainId];
        const contract = await getContract(provider, contractAddress,
            props.accountType === AccountTypes.VIRTUALACCOUNT ? "/VirtualAccounts.json" : "/ConnectedWallets.json");

        const proof = JSON.parse(props.paymentIntent.proof);
        const publicSignals = JSON.parse(props.paymentIntent.publicSignals);

        const hashes = [toNoteHex(publicSignals[0]), toNoteHex(publicSignals[1])];
        setShowOverlayError({ ...showOverlayError, showError: false, message: "" })
        setShowOverlay(true)
        const tx = await cancelPaymentIntent(
            contract,
            packToSolidityProof(proof),
            hashes,
            props.paymentIntent.payee_address,
            {
                maxDebitAmount: props.paymentIntent.maxDebitAmount,
                debitTimes: props.paymentIntent.debitTimes,
                debitInterval: props.paymentIntent.debitInterval,
                payment: props.paymentIntent.maxDebitAmount
            }).catch((err) => {
                setShowOverlayError({ ...showOverlayError, showError: true, message: "Unable to create transaction" })
            })

        await tx.wait().then(async (receipt: any) => {
            if (receipt.status === 1) {
                // Should send a request to the backend to update this payment intent status to Cancelled!
                const res = await updatePaymentIntentToClosed(
                    {
                        accountType: props.accountType,
                        chainId: props.chainId,
                        paymentIntent: props.paymentIntent.paymentIntent
                    })
                if (res === 200) {
                    location.reload();
                } else {
                    handleError("An error occured while updating the database")
                    setShowOverlayError({ ...showOverlayError, showError: true, message: "Updating database failed!" })
                }
            } else {
                setShowOverlayError({ ...showOverlayError, showError: true, message: "Transaction failed!" })
            }
        }).catch((err: any) => {
            setShowOverlayError({ ...showOverlayError, showError: true, message: "Transaction failed!" })

        })
    }


    return <div class={"flex flex-col justify-center"}>
        <Overlay show={showOvelay} error={showOverlayError}></Overlay>
        {props.paymentIntent.statusText === PaymentIntentStatus.CANCELLED ? <p class="text-sm text-red-500">Payment Intent Cancelled!</p> :
            <button
                aria-label={"Cancel all subsciptions"}
                disabled={props.paymentIntent.statusText === PaymentIntentStatus.CANCELLED}
                class="bg-gradient-to-b w-max text-red-500 font-semibold from-slate-50 to-red-100 px-10 py-3 rounded-2xl shadow-red-400 shadow-md border-b-4 hover border-b border-red-200 hover:shadow-sm transition-all duration-500"
                onClick={cancelClicked}
            >Cancel All</button>}
        <p class="text-sm text-red-500">{showError ? errorMessage : ""}</p>
    </div>
}