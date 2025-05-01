import React, { useEffect, useState } from "react";
import { usePageHeading } from "./PageHeadingContext";
import InvoiceReviewForm from "./InvoiceReviewForm";
import "../styles/InvoiceReviewForm.css";
import "../styles/MainMenu.css";
import "../styles/InvoiceHistory.css";
import { fetchInvoiceHistory, togglePaymentStatus } from "../utils/api";

function InvoiceHistory() {
    const { setPageHeading } = usePageHeading();
    const [invoices, setInvoices] = useState([]);
    const [products, setProducts] = useState([]);
    const [idToName, setIdToName] = useState({}); // id to product name map
    const [selectedInvoice, setSelectedInvoice] = useState(null); // full view state
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setPageHeading("Invoice History:");
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        setIsLoading(true);
        try {
            const data = await fetchInvoiceHistory();
            setInvoices(data.invoices || []);
            setProducts(data.products || []);

            // cache id → name for faster lookup
            const idNameMap = {};
            (data.products || []).forEach((prod) => {
                idNameMap[String(prod.id)] = prod.name;
            });
            setIdToName(idNameMap);
        } catch (err) {
            console.error("failed to fetch invoices", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInvoiceSelect = (invoice) => {
        setSelectedInvoice(invoice);
    };

    const handlePaymentToggle = async () => {
        if (!selectedInvoice) return;
        setIsLoading(true);
        try {
            await togglePaymentStatus(selectedInvoice.InvoiceID);

            const updatedStatus = !selectedInvoice.PaymentStatus;

            // update both local states
            setSelectedInvoice((prev) => ({
                ...prev,
                PaymentStatus: updatedStatus,
            }));

            setInvoices((prev) =>
                prev.map((inv) =>
                    inv.InvoiceID === selectedInvoice.InvoiceID
                        ? { ...inv, PaymentStatus: updatedStatus }
                        : inv
                )
            );
        } catch (err) {
            console.error("toggle failed", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="invoice-history-container">
            {!selectedInvoice ? (
                <div className="invoice-list">
                    {invoices.map((inv) => (
                        <div
                            key={inv.InvoiceID}
                            className="invoice-thumbnail"
                            onClick={() => handleInvoiceSelect(inv)}
                        >
                            <img src={inv.ImageURL} alt="Invoice Preview" />
                            <div>
                                {new Date(inv.SubmissionDate).toLocaleString()}
                            </div>
                            <div className="paid-status">
                                {inv.PaymentStatus ? "Paid" : "Unpaid"}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="invoice-history-details">
                    <button
                        className="invoice-back-button"
                        onClick={() => setSelectedInvoice(null)}
                    >
                        &lt;- Back to all invoices
                    </button>

                    <div className="invoice-meta">
                        <h3>
                            {new Date(
                                selectedInvoice.SubmissionDate
                            ).toLocaleString()}
                        </h3>
                        <button
                            className="invoice-submit-button"
                            onClick={handlePaymentToggle}
                        >
                            {selectedInvoice.PaymentStatus
                                ? "Mark as Unpaid"
                                : "Mark as Paid"}
                        </button>
                    </div>

                    <InvoiceReviewForm
                        matchedItems={(selectedInvoice.MatchedData || []).map(
                            (i) => ({
                                ...i,
                                match:
                                    idToName[String(i.matchedId)] || "Unknown",
                            })
                        )}
                        inventoryList={products.map((p) => ({
                            id: p.id,
                            name: p.name,
                        }))}
                        readOnly
                    />
                    <div>* this list is read only</div>

                    <img
                        src={selectedInvoice.ImageURL}
                        alt="Invoice Full View"
                        className="invoice-history-image-full"
                    />
                </div>
            )}

            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner" />
                </div>
            )}
        </main>
    );
}

export default InvoiceHistory;
