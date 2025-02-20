const AWS = require("aws-sdk");

const s3 = new AWS.S3();
const textract = new AWS.Textract();
const dynamodb = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
    try {
        const tableName = process.env.TABLE_NAME;

        // Extract S3 details from the event
        const record = event.Records[0];
        const bucketName = record.s3.bucket.name;
        const s3Key = decodeURIComponent(record.s3.object.key);

        // Run AnalyzeExpense on the uploaded image
        const textractResult = await textract.analyzeExpense({
            Document: {
                S3Object: {
                    Bucket: bucketName,
                    Name: s3Key,
                },
            },
        }).promise();

        // Extract InvoiceID from S3 key (assuming it's in the file path)
        const invoiceID = s3Key.split("/")[1].split(".")[0];

        // Store the full Textract response in DynamoDB
        await dynamodb.put({
            TableName: tableName,
            Item: {
                InvoiceID: invoiceID,
                S3Key: s3Key,
                TextractData: textractResult, // Store full response
                ProcessingStatus: "Processed",
                Timestamp: new Date().toISOString(),
            },
        }).promise();

        console.log(`Processed and stored data for InvoiceID: ${invoiceID}`);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Invoice processed successfully.", InvoiceID: invoiceID }),
        };
    } catch (error) {
        console.error("Error processing invoice:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Error processing invoice.", error: error.message }),
        };
    }
};
