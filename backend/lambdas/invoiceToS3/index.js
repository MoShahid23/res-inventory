const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();
const lambda = new AWS.Lambda();

const BUCKET_NAME = process.env.BUCKET_NAME;
const TABLE_NAME = process.env.TABLE_NAME;
const PROCESSOR_LAMBDA_NAME = process.env.PROCESSOR_LAMBDA_NAME;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
};

exports.handler = async (event) => {
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ message: "CORS Preflight OK" }),
        };
    }

    try {
        const body = JSON.parse(event.body);
        if (!body.image || typeof body.image !== "string") {
            return errorResponse(
                400,
                "Invalid request. 'image' must be a Base64 string."
            );
        }

        const base64Image = body.image;
        const fileName = `${uuidv4()}.jpg`;
        const invoiceID = uuidv4();
        const buffer = Buffer.from(base64Image, "base64");

        if (buffer.length > 5 * 1024 * 1024) {
            return errorResponse(400, "File is too large. Max size: 5MB.");
        }

        const s3Key = `invoices/${fileName}`;

        // store file in s3
        await s3
            .putObject({
                Bucket: BUCKET_NAME,
                Key: s3Key,
                Body: buffer,
                ContentType: "image/jpeg",
            })
            .promise();

        // create entry in dynamodb
        await dynamodb
            .put({
                TableName: TABLE_NAME,
                Item: {
                    InvoiceID: invoiceID,
                    FileName: fileName,
                    S3Key: s3Key,
                    ProcessingStatus: 0,
                    RawTextractData: null,
                    MatchedData: null,
                    Timestamp: new Date().toISOString(),
                },
            })
            .promise();

        // trigger processor lambda asynchronously
        await lambda
            .invoke({
                FunctionName: PROCESSOR_LAMBDA_NAME,
                InvocationType: "Event",
                Payload: JSON.stringify({ InvoiceID: invoiceID, S3Key: s3Key }),
            })
            .promise();

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({
                message: "Invoice uploaded successfully.",
                InvoiceID: invoiceID,
            }),
        };
    } catch (error) {
        return errorResponse(500, "Error uploading invoice.", error);
    }
};

// return standardized error response
function errorResponse(statusCode, message, error = null) {
    return {
        statusCode,
        headers: corsHeaders,
        body: JSON.stringify({
            message,
            error: error ? error.message : null,
        }),
    };
}
