const AWS = require("aws-sdk");
const axios = require("axios");

const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();
const s3 = new AWS.S3();

const TABLE_NAME = process.env.INVOICE_TABLE_NAME;
const PRODUCT_FUNCTION_NAME = process.env.PRODUCT_FUNCTION_NAME;
const BUCKET_NAME = "dallas-ims-invoices";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
    "Access-Control-Allow-Methods": "OPTIONS,GET,POST",
};

exports.handler = async (event) => {
    try {
        // handle CORS preflight
        if (event.httpMethod === "OPTIONS") {
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: "Preflight OK" }),
            };
        }

        const invoiceId = event.queryStringParameters?.id;

        // fetch single invoice if id is passed
        if (invoiceId) {
            const result = await dynamodb
                .get({
                    TableName: TABLE_NAME,
                    Key: { InvoiceID: invoiceId },
                })
                .promise();

            if (!result.Item) {
                return {
                    statusCode: 404,
                    headers: corsHeaders,
                    body: JSON.stringify({ message: "Invoice not found" }),
                };
            }

            const presignedUrl = await s3.getSignedUrlPromise("getObject", {
                Bucket: BUCKET_NAME,
                Key: result.Item.S3Key,
                Expires: 300,
            });

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({
                    ...result.Item,
                    ImageURL: presignedUrl,
                }),
            };
        }

        // no id → return all completed invoices + product list
        const invoiceResult = await dynamodb
            .scan({
                TableName: TABLE_NAME,
                ProjectionExpression:
                    "InvoiceID, S3Key, MatchedData, SubmissionDate, PaymentStatus",
                FilterExpression: "attribute_exists(SubmissionDate)",
            })
            .promise();

        const enrichedInvoices = await Promise.all(
            (invoiceResult.Items || []).map(async (invoice) => {
                try {
                    const url = await s3.getSignedUrlPromise("getObject", {
                        Bucket: BUCKET_NAME,
                        Key: invoice.S3Key,
                        Expires: 300,
                    });
                    return { ...invoice, ImageURL: url };
                } catch (err) {
                    console.warn(
                        `Failed to generate URL for ${invoice.InvoiceID}:`,
                        err.message
                    );
                    return { ...invoice, ImageURL: null };
                }
            })
        );

        // call product Lambda for full product list
        const lambdaResult = await lambda
            .invoke({
                FunctionName: PRODUCT_FUNCTION_NAME,
                Payload: JSON.stringify({ action: "list" }),
            })
            .promise();

        const parsed = JSON.parse(lambdaResult.Payload);
        const products = JSON.parse(parsed.body);

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                invoices: enrichedInvoices,
                products: products || [],
            }),
        };
    } catch (error) {
        console.error("Invoice History Error:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ message: "Internal server error" }),
        };
    }
};
