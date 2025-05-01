import React, { useEffect, useState } from "react";
import Select from "react-select";
import "../styles/InvoiceReviewForm.css";

function InvoiceReviewForm({
    matchedItems,
    inventoryList,
    onSubmit,
    readOnly = false,
}) {
    const [formData, setFormData] = useState([]);

    useEffect(() => {
        if (matchedItems) {
            setFormData(matchedItems); // prefill table with invoice items
        }
    }, [matchedItems]);

    if (!formData || formData.length === 0) {
        return <p>Loading items...</p>;
    }

    const handleItemChange = (index, selectedItem) => {
        if (readOnly) return;
        const updatedData = [...formData];
        updatedData[index].matchedId = selectedItem.value;
        setFormData(updatedData);
    };

    const handleQuantityChange = (index, newQuantity) => {
        if (readOnly || newQuantity < 0) return;
        const updatedData = [...formData];
        updatedData[index].quantity = newQuantity;
        setFormData(updatedData);
    };

    // basic select style override
    const customSelectStyles = {
        control: (provided) => ({
            ...provided,
            backgroundColor: readOnly ? "#f0f0f0" : "white",
            color: "black",
            border: "2px solid black",
            fontSize: "1.5rem",
            padding: "5px",
            pointerEvents: readOnly ? "none" : "auto",
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

    return (
        <div>
            <table className="invoice-review-table">
                <thead>
                    <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                    </tr>
                </thead>
                <tbody>
                    {formData.map((item, index) => {
                        const options = inventoryList.map((product) => ({
                            value: product.id,
                            label: product.name,
                        }));

                        const selectedOption = options.find(
                            (option) =>
                                String(option.value) === String(item.matchedId)
                        );

                        return (
                            <tr key={index}>
                                <td>
                                    <Select
                                        styles={customSelectStyles}
                                        options={options}
                                        value={
                                            selectedOption || {
                                                value: "",
                                                label: "Select...",
                                            }
                                        }
                                        onChange={(selected) =>
                                            handleItemChange(index, selected)
                                        }
                                        isSearchable
                                        isDisabled={readOnly}
                                    />
                                </td>
                                <td>
                                    <div className="quantity-control">
                                        <button
                                            onClick={() =>
                                                handleQuantityChange(
                                                    index,
                                                    item.quantity - 1
                                                )
                                            }
                                            disabled={readOnly}
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) =>
                                                handleQuantityChange(
                                                    index,
                                                    parseInt(e.target.value)
                                                )
                                            }
                                            disabled={readOnly}
                                        />
                                        <button
                                            onClick={() =>
                                                handleQuantityChange(
                                                    index,
                                                    item.quantity + 1
                                                )
                                            }
                                            disabled={readOnly}
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

            {!readOnly && (
                <button
                    className="invoice-submit-button"
                    onClick={() => onSubmit(formData)}
                >
                    Submit
                </button>
            )}
        </div>
    );
}

export default InvoiceReviewForm;
