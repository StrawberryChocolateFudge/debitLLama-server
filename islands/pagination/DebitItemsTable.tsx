import { useEffect, useState } from "preact/hooks";
import DebitItemTableRow from "../DebitItemTableRow.tsx";
import { DebitItemTableColNames, FilterFor } from "../../lib/enums.ts";
import { fetchPaginatedDebitItems } from "../../lib/frontend/fetch.ts";
import TableSearch from "../../components/TableSearch.tsx";
import { PaginationButtons } from "../../components/Pagination.tsx";

interface DebitItemsDataProps {
    debitItems: Array<any>,
    totalPages: number

}


export default function DebitItemsTable(props: DebitItemsDataProps) {
    const [currentDebitItems, setCurrentDebitItems] = useState<Array<any>>(props.debitItems);
    const [pageData, setPageData] = useState({
        currentPage: 0,
        totalPages: props.totalPages
    })

    //Search should be triggered by a button! 
    const [searchTerm, setSearchTerm] = useState("");

    const [sortBy, setSortBy] = useState<DebitItemTableColNames>(DebitItemTableColNames.CreatedAt);

    // When the currently selected orderBy is clicked twice I change the order by!
    const [sortDirection, setSortDirection] = useState<"ASC" | "DESC">("DESC");


    const fetchData = async (currentPage: number, searchTerm: string) => {
        const res = await fetchPaginatedDebitItems({
            currentPage,
            searchTerm,
            sortBy,
            sortDirection
        })
        if (res.status === 200) {
            const json = await res.json();
            setCurrentDebitItems(json.debitItemsData)
            setPageData({
                currentPage: json.currentPage,
                totalPages: json.totalPages
            })
        }
    }
    const previousClicked = async () => {
        if (pageData.currentPage !== 0) {
            await fetchData(pageData.currentPage - 1, "");
        }
    }

    const nextClicked = async () => {
        if (pageData.currentPage !== pageData.totalPages - 1) {
            await fetchData(pageData.currentPage + 1, "");
        }
    }

    useEffect(() => {
        fetchData(pageData.currentPage, "");
    }, [sortBy, sortDirection])


    async function triggerSearch() {
        await fetchData(0, searchTerm);
    }
    async function onEnterSearch(term: string) {
        setSearchTerm(term);
        await fetchData(0, term);
    }

    function headerClicked(clickedOn: DebitItemTableColNames) {
        return () => {
            if (clickedOn === sortBy) {
                if (sortDirection === "ASC") {
                    setSortDirection("DESC")
                } else {
                    setSortDirection("ASC")
                }
            } else {
                setSortBy(clickedOn);
            }
        }
    }


    if (props.debitItems.length === 0 || props.debitItems === null) {
        return <div></div>
    } else {
        return <div class="flex flex-col">
            <h1 class="text-2xl font-bold mb-5 text-center text-gray-500">Debit Items</h1>
            <TableSearch
                tableType={FilterFor.DebitItems}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                triggerSearch={triggerSearch}
                onEnterSearch={onEnterSearch}
            ></TableSearch>
            <div class="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                <div class="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                    <div class="overflow-hidden border border-gray-200 dark:border-gray-700 md:rounded-lg">
                        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead class="bg-gray-50 dark:bg-gray-800 select-none">
                                <tr>
                                    <th scope="col" class="relative py-3.5 px-4">
                                        <span class="sr-only">View</span>
                                    </th>
                                    <th onClick={headerClicked(DebitItemTableColNames.PaymentIntentsCount)} tabIndex={1} scope="col" class="cursor-pointer w-1/6 px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400 hover:bg-gray-200">
                                        Payment Intents
                                    </th>

                                    <th onClick={headerClicked(DebitItemTableColNames.Name)} tabIndex={2} scope="col" class="cursor-pointer w-1/6 px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400 hover:bg-gray-200">
                                        Name
                                    </th>

                                    <th onClick={headerClicked(DebitItemTableColNames.Network)} tabIndex={3} scope="col" class="cursor-pointer w-1/6 px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400 hover:bg-gray-200">
                                        Network
                                    </th>
                                    <th onClick={headerClicked(DebitItemTableColNames.Pricing)} tabIndex={4} scope="col" class="cursor-pointer w-1/6 px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400 hover:bg-gray-200">
                                        Pricing
                                    </th>

                                    <th tabIndex={5} scope="col" class="cursor-pointer w-1/6 px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400 hover:bg-gray-200">
                                        Amount
                                    </th>

                                    <th onClick={headerClicked(DebitItemTableColNames.DebitInterval)} tabIndex={6} scope="col" class="cursor-pointer w-1/6 px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400 hover:bg-gray-200">
                                        Debit interval (Days)
                                    </th>

                                    <th onClick={headerClicked(DebitItemTableColNames.DebitTimes)} tabIndex={7} scope="col" class="cursor-pointer w-1/6 px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400 hover:bg-gray-200">
                                        Debit Times
                                    </th>
                                    <th onClick={headerClicked(DebitItemTableColNames.CreatedAt)} tabIndex={8} scope="col" class="cursor-pointer w-1/6 px-4 py-3.5 text-sm font-normal text-left rtl:text-right text-gray-500 dark:text-gray-400 hover:bg-gray-200">
                                        Created Date
                                    </th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200 dark:divide-gray-700 dark:bg-gray-900">
                                {currentDebitItems.map((d: any) => <DebitItemTableRow
                                    debitTimes={d.debit_times}
                                    debitInterval={d.debit_interval}
                                    currency={JSON.parse(d.currency).name}
                                    maxDebitAmount={d.max_price}
                                    network={d.network}
                                    pricing={d.pricing}
                                    name={d.name}
                                    button_id={d.button_id}
                                    payment_intents_count={d.payment_intents_count}
                                    deleted={d.deleted}
                                    created_at={d.created_at}
                                    index={currentDebitItems.indexOf(d) + 9}
                                ></DebitItemTableRow>)}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <PaginationButtons
                currentPage={pageData.currentPage}
                totalPages={pageData.totalPages}
                nextClicked={nextClicked}
                nextDisabled={pageData.currentPage === pageData.totalPages - 1}
                previousClicked={previousClicked}
                previousDisabled={pageData.currentPage === 0}
            ></PaginationButtons>
        </div>;
    }
}