import React, { useState, useEffect } from "react";
import {
    listProducts,
    createProducts,
    updateProducts,
    deleteProducts,
    syncProducts,
} from "../utils/api";
import "../styles/ProductManagement.css";
import toast from "react-hot-toast";
import { usePageHeading } from "./PageHeadingContext";

import trashIcon from "/assets/trash_icon.svg";
import saveIcon from "/assets/save_icon.svg";
import syncIcon from "/assets/sync_icon.svg";

const UNIT_LOOKUP = [
    "ml",
    "pint",
    "kg",
    "g",
    "Each",
    "Half Pint",
    "l",
    "oz",
    "cm",
    "sq m",
    "cl",
    "Units",
    "Cards",
    "ft",
    "m",
];

export default function ProductManagement() {
    const [products, setProducts] = useState([]); // full product list
    const [selectedIds, setSelectedIds] = useState([]); // checkbox selection
    const [editedProducts, setEditedProducts] = useState([]); // tracks changes
    const [view, setView] = useState("list"); // list or create mode
    const [newProduct, setNewProduct] = useState({
        name: "",
        uos: "",
        vouos: "",
        internal_uom: "",
    });
    const [isLoading, setIsLoading] = useState(false);

    const { setPageHeading } = usePageHeading();

    useEffect(() => {
        setPageHeading("Manage products:");
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        const data = await listProducts();
        setProducts(data);
    };

    // update field values and track edited product
    const handleFieldChange = (id, field, value) => {
        setProducts((prev) =>
            prev.map((prod) =>
                prod.id === id ? { ...prod, [field]: value } : prod
            )
        );
        setEditedProducts((prev) => {
            const exists = prev.find((p) => p.id === id);
            if (exists) {
                return prev.map((p) =>
                    p.id === id ? { ...p, [field]: value } : p
                );
            } else {
                const product = products.find((p) => p.id === id);
                return [...prev, { ...product, [field]: value }];
            }
        });
    };

    const handleCheckbox = (id) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]
        );
    };

    const handleCreate = async () => {
        if (!newProduct.name || !newProduct.uos || !newProduct.vouos) {
            toast.error("Please fill all fields.");
            return;
        }
        setIsLoading(true);
        try {
            await createProducts([newProduct]);
            setNewProduct({ name: "", uos: "", vouos: "", internal_uom: "" });
            setView("list");
            fetchProducts();
        } finally {
            setIsLoading(false);
        }
    };

    const handleUpdate = async () => {
        if (editedProducts.length === 0) {
            toast.error("No changes to update.");
            return;
        }
        setIsLoading(true);
        try {
            await updateProducts(editedProducts);
            setEditedProducts([]);
            fetchProducts();
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (selectedIds.length === 0) {
            toast.error("No products selected.");
            return;
        }
        if (
            window.confirm("Are you sure you want to delete selected products?")
        ) {
            setIsLoading(true);
            try {
                await deleteProducts(selectedIds);
                setSelectedIds([]);
                fetchProducts();
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSync = async () => {
        if (window.confirm("Sync will refresh all products. Continue?")) {
            setIsLoading(true);
            try {
                await syncProducts();
                fetchProducts();
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <div className="product-management-container">
            <div className="view-switch">
                <button
                    onClick={() => setView("list")}
                    className={`view-button ${view === "list" ? "active" : ""}`}
                >
                    Products List
                </button>
                <button
                    onClick={() => setView("create")}
                    className={`view-button ${
                        view === "create" ? "active" : ""
                    }`}
                >
                    Create Product
                </button>
            </div>

            {view === "list" && (
                <div className="product-list">
                    <div className="product-list-actions">
                        <button
                            onClick={handleUpdate}
                            disabled={editedProducts.length === 0}
                            className={
                                editedProducts.length === 0
                                    ? "disabled-button"
                                    : ""
                            }
                        >
                            <span className="button-image">
                                <img src={saveIcon} alt="" />
                                &nbsp;Save Changes
                                {editedProducts.length > 0
                                    ? ` (${editedProducts.length})`
                                    : ""}
                            </span>
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={selectedIds.length === 0}
                            className={
                                selectedIds.length === 0
                                    ? "disabled-button"
                                    : ""
                            }
                        >
                            <span className="button-image">
                                <img src={trashIcon} alt="" />
                                &nbsp;Delete Selected
                                {selectedIds.length > 0
                                    ? ` (${selectedIds.length})`
                                    : ""}
                            </span>
                        </button>
                        <button onClick={handleSync}>
                            <span className="button-image">
                                <img src={syncIcon} alt="" />
                                &nbsp;Sync Products
                            </span>
                        </button>
                    </div>

                    <table className="product-table">
                        <thead>
                            <tr>
                                <th>Select</th>
                                <th>Name</th>
                                <th>UOS</th>
                                <th>Volume of UOS</th>
                                <th>Internal UOM</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product) => {
                                const isEdited = editedProducts.find(
                                    (p) => p.id === product.id
                                );
                                return (
                                    <tr key={product.id}>
                                        <td>
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.includes(
                                                    product.id
                                                )}
                                                onChange={() =>
                                                    handleCheckbox(product.id)
                                                }
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={product.name}
                                                onChange={(e) =>
                                                    handleFieldChange(
                                                        product.id,
                                                        "name",
                                                        e.target.value
                                                    )
                                                }
                                                className={
                                                    isEdited
                                                        ? "edited-input"
                                                        : ""
                                                }
                                            />
                                        </td>
                                        <td>
                                            <select
                                                value={product.uos || ""}
                                                onChange={(e) =>
                                                    handleFieldChange(
                                                        product.id,
                                                        "uos",
                                                        e.target.value
                                                    )
                                                }
                                                className={
                                                    isEdited
                                                        ? "edited-input"
                                                        : ""
                                                }
                                            >
                                                {UNIT_LOOKUP.map((unit) => (
                                                    <option
                                                        key={unit}
                                                        value={unit}
                                                    >
                                                        {unit}
                                                    </option>
                                                ))}
                                            </select>
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={product.vouos}
                                                onChange={(e) =>
                                                    handleFieldChange(
                                                        product.id,
                                                        "vouos",
                                                        e.target.value
                                                    )
                                                }
                                                className={
                                                    isEdited
                                                        ? "edited-input"
                                                        : ""
                                                }
                                            />
                                        </td>
                                        <td>
                                            <input
                                                type="text"
                                                value={product.internal_uom}
                                                onChange={(e) =>
                                                    handleFieldChange(
                                                        product.id,
                                                        "internal_uom",
                                                        e.target.value
                                                    )
                                                }
                                                className={
                                                    isEdited
                                                        ? "edited-input"
                                                        : ""
                                                }
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {view === "create" && (
                <div className="create-product-form">
                    <label>Name:</label>
                    <input
                        type="text"
                        placeholder=" enter product name"
                        value={newProduct.name}
                        onChange={(e) =>
                            setNewProduct({
                                ...newProduct,
                                name: e.target.value,
                            })
                        }
                    />
                    <label>Unit of Sale (UOS):</label>
                    <select
                        value={newProduct.uos}
                        onChange={(e) =>
                            setNewProduct({
                                ...newProduct,
                                uos: e.target.value,
                            })
                        }
                    >
                        <option value="">Select UOS</option>
                        {UNIT_LOOKUP.map((unit) => (
                            <option key={unit} value={unit}>
                                {unit}
                            </option>
                        ))}
                    </select>
                    <label>Volume of Unit of Sale:</label>
                    <input
                        type="text"
                        placeholder=" enter numeric volume of a single batch"
                        value={newProduct.vouos}
                        onChange={(e) =>
                            setNewProduct({
                                ...newProduct,
                                vouos: e.target.value,
                            })
                        }
                    />
                    <label>Internal Unit of Measurement:</label>
                    <input
                        type="text"
                        placeholder=" e.g. 1 box contains 500g"
                        value={newProduct.internal_uom}
                        onChange={(e) =>
                            setNewProduct({
                                ...newProduct,
                                internal_uom: e.target.value,
                            })
                        }
                    />
                    <button onClick={handleCreate}>Create Product</button>
                </div>
            )}

            {isLoading && (
                <div className="loading-overlay">
                    <div className="spinner" />
                </div>
            )}
        </div>
    );
}
