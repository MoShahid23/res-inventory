const AWS = require("aws-sdk");

const dynamodb = new AWS.DynamoDB.DocumentClient();
const TABLE_NAME = process.env.TABLE_NAME;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
};

exports.handler = async (event) => {
    try {
        const { invoiceID } = event.queryStringParameters;

        const params = {
            TableName: TABLE_NAME,
            Key: { InvoiceID: invoiceID },
            ProjectionExpression: "ProcessingStatus, MatchedData",
        };

        const result = await dynamodb.get(params).promise();

        if (!result.Item) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: "Invoice not found" }),
            };
        }

        const responseData = {
            status: result.Item.ProcessingStatus,
        };

        // if processing is complete, attach matched data and inventory
        if (result.Item.ProcessingStatus === 4) {
            responseData.matchedItems = result.Item.MatchedData || [];
            responseData.inventoryList = await getInventoryData();
        }

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify(responseData),
        };
    } catch (error) {
        console.error("error retrieving invoice status:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: "error retrieving invoice status",
            }),
        };
    }
};

// fetch product list from master table
async function getInventoryData() {
    try {
        const result = await dynamodb
            .scan({
                TableName: process.env.MASTER_PRODUCTS_TABLE,
            })
            .promise();

        return (
            result.Items.map((item) => ({
                id: item.id,
                name: item.name,
                internal_uom: item.takeUnit || "",
            })) || []
        );
    } catch (error) {
        console.error("error fetching inventory:", error);
        return [];
    }
}
