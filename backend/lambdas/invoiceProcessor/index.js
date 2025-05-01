const AWS = require("aws-sdk");
const { OpenAI } = require("openai");

const textract = new AWS.Textract();
const dynamodb = new AWS.DynamoDB.DocumentClient();
const s3 = new AWS.S3();
const secretsManager = new AWS.SecretsManager();

const TABLE_NAME = process.env.TABLE_NAME;
const BUCKET_NAME = process.env.BUCKET_NAME;
const MASTER_PRODUCTS_TABLE = process.env.MASTER_PRODUCTS_TABLE;
const SECRET_NAME = process.env.SECRET_NAME;

let openaiClient = null;

exports.handler = async (event) => {
    try {
        console.log("Running Invoice Processor");

        const { InvoiceID, S3Key } = event;

        await updateProcessingStatus(InvoiceID, 1);

        const textractResult = await textract
            .analyzeExpense({
                Document: { S3Object: { Bucket: BUCKET_NAME, Name: S3Key } },
            })
            .promise();

        const invoiceItems = extractInvoiceItems(textractResult);
        await updateProcessingStatus(InvoiceID, 2, textractResult);

        const inventoryItems = await getInventoryData();

        const matchedResults = await matchUsingLLM(
            invoiceItems,
            inventoryItems
        );

        await updateProcessingStatus(
            InvoiceID,
            4,
            textractResult,
            matchedResults
        );
        console.log("Processing Completed for Invoice:", InvoiceID);
    } catch (error) {
        console.error("Error processing invoice:", error);
    }
};

// pull line items out of textract structure
function extractInvoiceItems(textractData) {
    try {
        if (!textractData?.ExpenseDocuments?.length) {
            console.warn("No ExpenseDocuments found");
            return [];
        }

        const extractedItems = [];

        textractData.ExpenseDocuments.forEach((document) => {
            document.LineItemGroups?.forEach((group) => {
                group.LineItems?.forEach((item) => {
                    const description =
                        item.LineItemExpenseFields.find(
                            (f) => f.Type.Text === "ITEM"
                        )?.ValueDetection?.Text || "UNKNOWN ITEM";

                    const quantity =
                        item.LineItemExpenseFields.find(
                            (f) => f.Type.Text === "QUANTITY"
                        )?.ValueDetection?.Text || "N/A";

                    const unitPrice =
                        item.LineItemExpenseFields.find(
                            (f) => f.Type.Text === "UNIT_PRICE"
                        )?.ValueDetection?.Text || "N/A";

                    extractedItems.push({ description, quantity, unitPrice });
                });
            });
        });

        return extractedItems;
    } catch (error) {
        console.error("Error extracting invoice items:", error);
        return [];
    }
}

// fetch list of known inventory products
async function getInventoryData() {
    try {
        const result = await dynamodb
            .scan({
                TableName: MASTER_PRODUCTS_TABLE,
            })
            .promise();

        return (
            result.Items.map((item) => ({
                id: item.id,
                name: item.name,
                internal_uom: item.internal_uom || "",
            })) || []
        );
    } catch (error) {
        console.error("Error fetching inventory from DynamoDB:", error);
        return [];
    }
}

// lazy-load OpenAI client from secret manager
async function getOpenAIClient() {
    if (openaiClient) return openaiClient;

    const secret = await secretsManager
        .getSecretValue({ SecretId: SECRET_NAME })
        .promise();
    openaiClient = new OpenAI({ apiKey: secret.SecretString });

    return openaiClient;
}

// update invoice record with current status and optional textract/matched data
async function updateProcessingStatus(
    InvoiceID,
    status,
    textractData = null,
    matchedData = null
) {
    try {
        await dynamodb
            .update({
                TableName: TABLE_NAME,
                Key: { InvoiceID },
                UpdateExpression:
                    "SET ProcessingStatus = :status, RawTextractData = :extracted, MatchedData = :matched",
                ExpressionAttributeValues: {
                    ":status": status,
                    ":extracted": textractData || null,
                    ":matched": matchedData || null,
                },
            })
            .promise();
    } catch (error) {
        console.error("Error updating processing status:", error);
    }
}

// use gpt-4 to map invoice items to known inventory
async function matchUsingLLM(invoiceItems, inventoryItems) {
    try {
        const SYSTEM_PROMPT = `
You are a data analyzing system.
You must respond ONLY with a raw JSON object. No text before or after. No markdown formatting.

You are provided two lists:

Inventory Items:
- "id", (integer)
- "name", (product name)
- "internal_uom" (unit of measurement and description used by staff)

Invoice Items:
- "description", (name on invoice)
- "quantity", (manufacturer defined)
- "unitPrice", (price per unit)

Your task:
For each invoice item:
1. Match it to one inventory item, use your knowledge and make a guess when things get vague.
2. Determine the quantity (nearest integer) in terms of internal_uom by considering:
- Invoice quantity,
- Invoice description will sometimes also contain its own quantifiers,
- internal_uom will have a helpful description.

Return exactly in JSON format:
{
  "items": [
    {
      "item": "Original invoice description",
      "matchedId": "Matched inventory id or null",
      "quantity": nearest integer
    }
  ]
}
        `.trim();

        const client = await getOpenAIClient();

        const response = await client.responses.create({
            model: "gpt-4.1",
            input: [
                {
                    role: "system",
                    content: [{ type: "input_text", text: SYSTEM_PROMPT }],
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: `Inventory Items:\n${JSON.stringify(
                                inventoryItems,
                                null,
                                2
                            )}`,
                        },
                    ],
                },
                {
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text: `Invoice Items:\n${JSON.stringify(
                                invoiceItems,
                                null,
                                2
                            )}`,
                        },
                    ],
                },
            ],
            text: {
                format: { type: "json_object" },
            },
            reasoning: {},
            tools: [],
            temperature: 1,
            max_output_tokens: 32768,
            top_p: 1,
            store: true,
        });

        const rawText = response.output[0].content[0].text;
        const parsed = JSON.parse(rawText);

        return parsed.items;
    } catch (error) {
        console.error(
            "Error matching invoice items:",
            error.response?.data || error.message
        );
        return [];
    }
}
