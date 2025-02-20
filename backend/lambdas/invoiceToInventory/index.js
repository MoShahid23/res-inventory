const AWS = require("aws-sdk");
const axios = require("axios");

const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async () => {
    try {
        const tableName = process.env.TABLE_NAME;
        const huggingFaceApiKey = process.env.HUGGINGFACE_API_KEY;
        const testInvoiceID = "56f03479-f3b1-4884-9738-f862daa045aa"; // Specific InvoiceID for testing

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

        if (newImage.ProcessingStatus !== "2") {
            console.log("Item not ready for processing");
            return;
        }

        console.log(`Processing InvoiceID: ${testInvoiceID}`);

        const textractData = newImage.TextractData;

        // Extract relevant data for matching
        const extractedItems = textractData.ExpenseDocuments[0]?.LineItemGroups[0]?.LineItems || [];
        const descriptions = extractedItems.map((item) => item.LineItemExpenseFields.find(field => field.Type.Text === "DESCRIPTION")?.ValueDetection?.Text);

        console.log("Extracted Invoice Items:", descriptions);

        // Inventory list for matching
        const inventoryList = [
            "FILLET BURGER, 10 KG/BOX",
            "CHICKEN STRIPS, 10 KG/BOX",
            "PRIME WINGS, 10 KG/BOX",
            "BURGER BUNS, 48 BUNS/BOX",
            "PEPSI, 24 CAN/PACK"
        ];

        const matchedResults = [];

        for (const description of descriptions) {
            if (description) {
                console.log(`Matching description: ${description}`);

                const response = await axios.post(
                    "https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2",
                    {
                        inputs: {
                            source_sentence: description,
                            sentences: inventoryList,
                        },
                    },
                    {
                        headers: { Authorization: `Bearer ${huggingFaceApiKey}` },
                    }
                );

                const scores = response.data;
                const bestMatchIndex = scores.indexOf(Math.max(...scores));
                matchedResults.push({
                    description,
                    match: inventoryList[bestMatchIndex],
                    score: scores[bestMatchIndex],
                });
            }
        }

        console.log("Matched Results:", matchedResults);

        // Update DynamoDB with matched results and status
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
