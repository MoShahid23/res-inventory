const axios = require("axios");
const AWS = require("aws-sdk");

const secretsManager = new AWS.SecretsManager();
const secretName = process.env.EPOSNOW_SECRET_NAME;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
};

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Preflight OK" }),
        };
    }

    let body = {};
    try {
        body = event.body ? JSON.parse(event.body) : event;
    } catch (err) {
        console.error("invalid json:", err);
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: "invalid request body" }),
        };
    }

    const action = body.action;

    try {
        const secretData = await secretsManager
            .getSecretValue({ SecretId: secretName })
            .promise();
        const EPOSNOW_TOKEN = secretData.SecretString;

        // fetch stock data from eposnow
        if (action === "list") {
            let page = 1;
            let allStock = [];

            while (true) {
                const res = await axios.get(
                    `https://api.eposnowhq.com/api/v4/ProductStock?page=${page}`,
                    {
                        headers: {
                            Authorization: `Basic ${EPOSNOW_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                const items = res.data;
                if (!items || items.length === 0) break;
                allStock = allStock.concat(items);
                page++;
            }

            const seen = new Map();

            for (const entry of allStock) {
                const productId = entry.ProductId;
                let totalStock = "Unavailable";

                if (Array.isArray(entry.ProductStockBatches)) {
                    totalStock = entry.ProductStockBatches.reduce(
                        (acc, batch) => {
                            return acc + (batch.CurrentStock || 0);
                        },
                        0
                    );
                }

                seen.set(productId, {
                    id: productId,
                    currentStock: totalStock,
                });
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(Array.from(seen.values())),
            };
        }

        // apply stock level updates via eposnow api
        if (action === "update") {
            const { updates, locationId = 3387 } = body;

            if (!Array.isArray(updates) || updates.length === 0) {
                return {
                    statusCode: 400,
                    headers: corsHeaders,
                    body: JSON.stringify({
                        message: "missing or invalid 'updates' array",
                    }),
                };
            }

            const formatted = updates.map((u) => ({
                ProductId: u.id,
                LocationId: locationId,
                ChangeInStock: u.adjusted,
            }));

            await axios.post(
                "https://api.eposnowhq.com/api/v4/ProductStock/Update",
                formatted,
                {
                    headers: {
                        Authorization: `Basic ${EPOSNOW_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: "stock updated via ProductStock.Update",
                }),
            };
        }

        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ message: "invalid action" }),
        };
    } catch (err) {
        console.error("stock take error:", err.message || err);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: "internal server error" }),
        };
    }
};
