const axios = require("axios");
const AWS = require("aws-sdk");

const secretsManager = new AWS.SecretsManager();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const EPOSNOW_SECRET_NAME = process.env.EPOSNOW_SECRET_NAME;
const DYNAMO_TABLE = process.env.INVOICE_TABLE_NAME;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
};

exports.handler = async (event) => {
    try {
        if (event.httpMethod === "OPTIONS") {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Preflight OK" }),
            };
        }

        let body = {};
        body = event.body ? JSON.parse(event.body) : event;

        const { invoiceId, matchedItems, locationId, action } = body;

        // toggle paid/unpaid
        if (action === "payment_status") {
            const current = await dynamodb
                .get({
                    TableName: DYNAMO_TABLE,
                    Key: { InvoiceID: invoiceId },
                })
                .promise();

            const currentStatus = current?.Item?.PaymentStatus === true;

            await dynamodb
                .update({
                    TableName: DYNAMO_TABLE,
                    Key: { InvoiceID: invoiceId },
                    UpdateExpression: "SET PaymentStatus = :newStatus",
                    ExpressionAttributeValues: {
                        ":newStatus": !currentStatus,
                    },
                })
                .promise();

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Payment status updated." }),
            };
        }

        // validate required delivery fields
        if (!invoiceId || !matchedItems || !locationId) {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: "Missing required parameters.",
                }),
            };
        }

        // fetch eposnow token
        const secretData = await secretsManager
            .getSecretValue({ SecretId: EPOSNOW_SECRET_NAME })
            .promise();
        const EPOSNOW_TOKEN = secretData.SecretString;

        // push matched items to eposnow stock
        for (const item of matchedItems) {
            const addStockBody = {
                ProductId: item.matchedId,
                LocationId: locationId,
                ChangeInStock: item.quantity,
                CostPrice: item.costPrice || 0,
            };

            await axios.post(
                "https://api.eposnowhq.com/api/v4/ProductStock/Add",
                addStockBody,
                {
                    headers: {
                        Authorization: `Basic ${EPOSNOW_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                }
            );
        }

        // update invoice with delivery data
        await dynamodb
            .update({
                TableName: DYNAMO_TABLE,
                Key: { InvoiceID: invoiceId },
                UpdateExpression:
                    "SET MatchedData = :items, SubmissionDate = :date",
                ExpressionAttributeValues: {
                    ":items": matchedItems,
                    ":date": new Date().toISOString(),
                },
            })
            .promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: "Delivery recorded successfully.",
            }),
        };
    } catch (error) {
        console.error("Error:", error.response?.data || error.message || error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Internal server error" }),
        };
    }
};
