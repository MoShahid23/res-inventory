const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
};

exports.handler = async (event) => {
    try {
        const bucketName = process.env.BUCKET_NAME;
        const tableName = process.env.TABLE_NAME;

        console.log(`Bucket: ${bucketName}, Table: ${tableName}`);

        // Parse the uploaded file
        const body = JSON.parse(event.body);
        if (!body.image || typeof body.image !== "string") {
            return {
                statusCode: 400,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: "Invalid request. 'image' is required and must be a Base64 string.",
                }),
            };
        }

        const base64Image = body.image;
        const fileName = `${uuidv4()}.jpg`;
        const invoiceID = uuidv4();

        // Decode the Base64 image
        const buffer = Buffer.from(base64Image, "base64");
        const s3Key = `invoices/${fileName}`;

        // Upload the image to S3
        console.log(`Uploading to S3: ${s3Key}`);
        await s3
            .putObject({
                Bucket: bucketName,
                Key: s3Key,
                Body: buffer,
                ContentType: "image/jpeg",
            })
            .promise();

        // Store metadata in DynamoDB
        const timestamp = new Date().toISOString();
        console.log(`Storing in DynamoDB with InvoiceID: ${invoiceID}`);
        await dynamodb
        .put({
            TableName: tableName,
            Item: {
                InvoiceID: invoiceID,  // Primary Key
                FileName: fileName,    // File Name
                S3Key: s3Key,          // S3 Key
                ProcessingStatus: "1", // Status
                Timestamp: timestamp,  // Timestamp
            },
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
        console.error("Error during operation:", error);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({
                message: "Error uploading invoice.",
                error: error.message,
            }),
        };
    }
};
