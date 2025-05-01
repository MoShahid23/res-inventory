import React, { useState } from "react";
import Select from "react-select";
import toast from "react-hot-toast";
import "../styles/InvoiceReviewForm.css";

function StockTakeForm({ stockData, productOptions, onSubmit }) {
    const [formRows, setFormRows] = useState([
        { id: "", expected: "", actual: "" },
    ]);

    // style config for react-select
    const customSelectStyles = {
        control: (provided) => ({
            ...provided,
            backgroundColor: "white",
            color: "black",
            border: "2px solid black",
            fontSize: "1.5rem",
            padding: "5px",
        }),
        menu: (provided) => ({
            ...provided,
            backgroundColor: "white",
            color: "black",
        }),
        singleValue: (provided) => ({
            ...provided,
            color: "black",
        }),
        option: (provided, state) => ({
            ...provided,
            backgroundColor: state.isSelected ? "black" : "white",
            color: state.isSelected ? "white" : "black",
            padding: "10px",
            fontSize: "1.5rem",
        }),
    };

    const handleProductChange = (index, selected) => {
        const updated = [...formRows];
        const matched = stockData.find(
            (p) => String(p.id) === String(selected.value)
        );
        updated[index].id = selected.value;
        updated[index].expected = matched?.expected ?? 0; // fill expected based on selected product
        setFormRows(updated);
    };

    const handleActualChange = (index, newValue) => {
        if (newValue < 0) return;
        const updated = [...formRows];
        updated[index].actual = newValue;
        setFormRows(updated);
    };

    const addNewRow = () => {
        if (formRows.length < productOptions.length) {
            setFormRows((prev) => [
                ...prev,
                { id: "", expected: "", actual: "" },
            ]);
        }
    };

    const removeLastRow = () => {
        if (formRows.length > 1) {
            setFormRows((prev) => prev.slice(0, -1));
        } else {
            toast.error("At least one row is required.");
        }
    };

    const handleSubmit = () => {
        const incomplete = formRows.some((r) => !r.id || r.actual === "");
        if (incomplete) {
            toast.error("Please fill all fields.");
            return;
        }

        onSubmit(formRows);
        toast.success("Stock take submitted!");
    };

    const usedIds = new Set(formRows.map((r) => r.id).filter(Boolean)); // avoid product duplicates

    return (
        <div>
            <table className="invoice-review-table stock-take-form">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th>Exp</th>
                        <th>Actual</th>
                    </tr>
                </thead>
                <tbody>
                    {formRows.map((row, index) => {
                        const selectedOption = productOptions.find(
                            (p) => String(p.id) === String(row.id)
                        );

                        const availableOptions = productOptions
                            .filter(
                                (p) =>
                                    !usedIds.has(p.id) ||
                                    String(p.id) === String(row.id)
                            )
                            .map((p) => ({ value: p.id, label: p.name }));

                        return (
                            <tr key={index}>
                                <td className="stocktake-product-cell">
                                    <Select
                                        styles={customSelectStyles}
                                        options={availableOptions}
                                        value={
                                            selectedOption
                                                ? {
                                                      value: selectedOption.id,
                                                      label: selectedOption.name,
                                                  }
                                                : {
                                                      value: "",
                                                      label: "Select...",
                                                  }
                                        }
                                        onChange={(selected) =>
                                            handleProductChange(index, selected)
                                        }
                                        isSearchable
                                    />
                                </td>
                                <td className="stocktake-expected-cell">
                                    <input
                                        type="text"
                                        readOnly
                                        value={row.expected}
                                    />
                                </td>
                                <td className="stocktake-actual-cell">
                                    <div className="quantity-control">
                                        <button
                                            onClick={() =>
                                                handleActualChange(
                                                    index,
                                                    (parseInt(row.actual) ||
                                                        0) - 1
                                                )
                                            }
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            value={row.actual}
                                            onChange={(e) =>
                                                handleActualChange(
                                                    index,
                                                    parseInt(e.target.value)
                                                )
                                            }
                                        />
                                        <button
                                            onClick={() =>
                                                handleActualChange(
                                                    index,
                                                    (parseInt(row.actual) ||
                                                        0) + 1
                                                )
                                            }
                                        >
                                            +
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
                <button
                    className="invoice-submit-button"
                    onClick={addNewRow}
                    disabled={formRows.length >= productOptions.length}
                >
                    Add Row
                </button>

                <button
                    className="invoice-submit-button"
                    onClick={removeLastRow}
                    disabled={formRows.length === 1}
                >
                    Remove Row
                </button>
            </div>

            <button
                className="invoice-submit-button"
                style={{ marginTop: "20px" }}
                onClick={handleSubmit}
            >
                Submit Stock Take
            </button>
        </div>
    );
}

export default StockTakeForm;
