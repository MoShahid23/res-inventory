const AWS = require("aws-sdk");
const axios = require("axios");

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async () => {
    try {
        const tableName = process.env.TABLE_NAME;
        const huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY;
        const testInvoiceID = "56f03479-f3b1-4884-9738-f862daa045aa";

        // Fetch the invoice from DynamoDB
        const { Item: newImage } = await dynamodb
            .get({
                TableName: tableName,
                Key: { InvoiceID: testInvoiceID },
            })
            .promise();

        if (!newImage) {
            console.log(`InvoiceID ${testInvoiceID} not found in DynamoDB.`);
            return;
        }

        if (Number(newImage.ProcessingStatus) < 2) {
            console.log("Item not ready for processing");
            return;
        }

        console.log(`Processing InvoiceID: ${testInvoiceID}`);

        const textractData = newImage.TextractData;
        const invoiceItems = [];
        const lineItems = textractData.ExpenseDocuments[0].LineItemGroups[0].LineItems;

        for (const item of lineItems) {
            const text = item.LineItemExpenseFields[0].ValueDetection.Text;
            invoiceItems.push(text);
        }

        console.log("Extracted Invoice Items:", invoiceItems);

        const inventoryList = [
            "chicken fillets",
            "chicken tenderloin",
            "prime wings",
            "mid wings",
            "9 cut chicken",
            "whole chicken",
            "quarter pounder chicken",
            "buns",
            "french fries",
            "pepsi",
            "mayonaise tub",
            "blue tissue roll",
            "water bottle",
        ];

        const matchedResults = [];

        for (const description of invoiceItems) {
            if (description) {
                console.log(`Matching description: ${description}`);

                const scores = await getSimilarityScores(description, inventoryList, huggingFaceApiKey);

                const bestMatchIndex = scores.indexOf(Math.max(...scores));
                matchedResults.push({
                    description,
                    match: inventoryList[bestMatchIndex],
                    score: scores[bestMatchIndex],
                });
            }
        }

        console.log("Matched Results:", matchedResults);

        await dynamodb
            .update({
                TableName: tableName,
                Key: { InvoiceID: testInvoiceID },
                UpdateExpression: "SET MatchedItems = :matchedItems, ProcessingStatus = :status",
                ExpressionAttributeValues: {
                    ":matchedItems": matchedResults,
                    ":status": "3",
                },
            })
            .promise();

        console.log(`Successfully processed and updated InvoiceID: ${testInvoiceID}`);
    } catch (error) {
        console.error("Error processing invoice:", error);
    }
};

// Utility function for similarity scores
async function getSimilarityScores(description, inventoryList, apiKey) {
    try {
        const response = await axios.post(
            "https://api-inference.huggingface.co/models/sentence-transformers/multi-qa-mpnet-base-dot-v1",
            {
                inputs: {
                    source_sentence: description,
                    sentences: inventoryList,
                },
            },
            {
                headers: { Authorization: `Bearer ${apiKey}` },
            }
        );

        return response.data; // Array of similarity scores
    } catch (error) {
        if (error.response) {
            console.error("Error Response from Hugging Face API:", {
                status: error.response.status,
                statusText: error.response.statusText,
                data: error.response.data,
            });
        } else {
            console.error("Error connecting to Hugging Face API:", error.message);
        }

        throw new Error("Failed to fetch similarity scores from Hugging Face API.");
    }
}
