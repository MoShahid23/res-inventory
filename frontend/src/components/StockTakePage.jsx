import React, { useEffect, useState } from "react";
import StockTakeForm from "./StockTakeForm";
import { usePageHeading } from "./PageHeadingContext";
import "../styles/InvoiceReviewForm.css"; // reused for layout
import "../styles/MainMenu.css";
import { fetchStockData, submitStockTake } from "../utils/api";

function StockTakePage() {
    const [products, setProducts] = useState([]);
    const [stockData, setStockData] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const { setPageHeading } = usePageHeading();

    useEffect(() => {
        setPageHeading("Perform Stock Take:");
        fetchStockTakeList();
    }, []);

    // fetch current stock and product info
    const fetchStockTakeList = async () => {
        setIsLoading(true);
        try {
            const { stockData, productData } = await fetchStockData();

            const productMap = {};
            productData.forEach((p) => {
                productMap[p.id] = p.name;
            });

            // merge stock + product data into row format
            const merged = stockData.map((entry) => ({
                id: entry.id,
                expected: entry.currentStock,
                actual: "",
                name: productMap[entry.id] || "Unknown",
            }));

            setProducts(productData || []);
            setStockData(merged);
        } catch (err) {
            console.error("failed to load stock data:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (finalData) => {
        setIsLoading(true);
        try {
            // calculate adjustment per row
            const updates = finalData
                .filter((row) => row.actual !== "" && row.actual !== null)
                .map((row) => ({
                    id: row.id,
                    adjusted:
                        parseInt(row.actual, 10) - parseInt(row.expected, 10),
                }));

            await submitStockTake(updates);
            await fetchStockTakeList(); // refresh values
        } catch (err) {
            console.error("submission failed:", err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <main className="invoice-history-container">
            {isLoading ? (
                <div className="loading-overlay">
                    <div className="spinner" />
                </div>
            ) : (
                <StockTakeForm
                    stockData={stockData}
                    productOptions={products.map((p) => ({
                        id: p.id,
                        name: p.name,
                    }))}
                    onSubmit={handleSubmit}
                />
            )}
        </main>
    );
}

export default StockTakePage;
