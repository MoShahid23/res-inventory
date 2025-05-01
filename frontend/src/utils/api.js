import { getToken } from "./auth";

const BASE_URL = "https://ovq83rc7jb.execute-api.eu-west-2.amazonaws.com/Prod";

// attach jwt to all requests
export const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
});

// upload scanned invoice image
export async function uploadInvoice(imageBase64) {
    const response = await fetch(`${BASE_URL}/upload-invoice`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ image: imageBase64 }),
    });
    return await response.json();
}

// check processing status of invoice by id
export async function getInvoiceStatus(invoiceID) {
    const response = await fetch(
        `${BASE_URL}/invoice-processor-polling?invoiceID=${invoiceID}`,
        {
            headers: getAuthHeaders(),
        }
    );

    if (!response.ok) {
        throw new Error("Failed to fetch invoice status");
    }

    return await response.json();
}

// product actions (crud and sync)
export const listProducts = async () => {
    const response = await fetch(`${BASE_URL}/manage-products`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "list" }),
    });
    return await response.json();
};

export const createProducts = async (products) => {
    const response = await fetch(`${BASE_URL}/manage-products`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "create", products }),
    });
    return await response.json();
};

export const updateProducts = async (products) => {
    const response = await fetch(`${BASE_URL}/manage-products`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "update", products }),
    });
    return await response.json();
};

export const deleteProducts = async (ids) => {
    const response = await fetch(`${BASE_URL}/manage-products`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "delete", ids }),
    });
    return await response.json();
};

export const syncProducts = async () => {
    const response = await fetch(`${BASE_URL}/manage-products`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "sync" }),
    });
    return await response.json();
};

// send reviewed invoice match result to backend
export const recordDelivery = async ({
    invoiceId,
    matchedItems,
    locationId = 3387,
}) => {
    const response = await fetch(`${BASE_URL}/record-delivery`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ invoiceId, matchedItems, locationId }),
    });

    if (!response.ok) throw new Error("Failed to record delivery");
    return await response.json();
};

// list all past invoices
export const fetchInvoiceHistory = async () => {
    const response = await fetch(`${BASE_URL}/invoice-history`, {
        headers: getAuthHeaders(),
    });
    return await response.json();
};

// toggle paid/unpaid for an invoice
export const togglePaymentStatus = async (invoiceId) => {
    const response = await fetch(`${BASE_URL}/record-delivery`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ invoiceId, action: "payment_status" }),
    });
    if (!response.ok) throw new Error("Failed to toggle payment status");
    return await response.json();
};

// get stock levels + product names
export const fetchStockData = async () => {
    const [stockRes, productRes] = await Promise.all([
        fetch(`${BASE_URL}/stock-take`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ action: "list" }),
        }),
        fetch(`${BASE_URL}/manage-products`, {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify({ action: "list" }),
        }),
    ]);

    const stockData = await stockRes.json();
    const productData = await productRes.json();
    return { stockData, productData };
};

// submit manual stock take updates
export const submitStockTake = async (updates) => {
    const response = await fetch(`${BASE_URL}/stock-take`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "update", updates }),
    });
    return await response.json();
};
