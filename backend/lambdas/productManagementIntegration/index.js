const axios = require("axios");
const AWS = require("aws-sdk");

const secretsManager = new AWS.SecretsManager();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const secretName = process.env.EPOSNOW_SECRET_NAME;
const TABLE_NAME = process.env.MASTER_PRODUCTS_TABLE;

const UNIT_LOOKUP = [
    "None",
    "ml",
    "pint",
    "kg",
    "g",
    "Each",
    "Half Pint",
    "l",
    "oz",
    "cm",
    "sq m",
    "cl",
    "Units",
    "Cards",
    "ft",
    "m",
];

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET",
};

exports.handler = async (event) => {
    let parsedBody = {};
    try {
        parsedBody = event.body ? JSON.parse(event.body) : event;
    } catch (err) {
        console.error("error parsing event body:", err);
        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "invalid json body" }),
        };
    }

    const action = parsedBody.action || "list";

    try {
        const secretData = await secretsManager
            .getSecretValue({ SecretId: secretName })
            .promise();
        const EPOSNOW_TOKEN = secretData.SecretString;

        // create new products in ePOS Now + save to dynamo
        if (action === "create") {
            const { products } = parsedBody;

            if (!Array.isArray(products)) {
                return {
                    statusCode: 500,
                    headers: corsHeaders,
                    body: JSON.stringify({ error: "products must be a list" }),
                };
            }

            const newProducts = products.map(({ name, uos, vouos }) => ({
                Name: name,
                CategoryId: 587596,
                UnitOfSale: UNIT_LOOKUP.indexOf(uos),
                VolumeOfSale: vouos,
                SalePrice: 0,
                IsSalePriceIncTax: true,
                EatOutPrice: 0,
                IsEatOutPriceIncTax: true,
                CostPrice: 0,
                IsCostPriceIncTax: false,
                SellOnWeb: false,
                SellOnTill: true,
                ProductType: 0,
            }));

            const createResponse = await axios.post(
                "https://api.eposnowhq.com/api/v4/Product",
                newProducts,
                {
                    headers: {
                        Authorization: `Basic ${EPOSNOW_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const createdProducts = createResponse.data || [];

            for (let i = 0; i < createdProducts.length; i++) {
                const p = createdProducts[i];
                const clientProduct = products[i];
                const parsed = {
                    id: p.Id,
                    name: p.Name,
                    uos: UNIT_LOOKUP[p.UnitOfSale] || "Unknown",
                    vouos: p.VolumeOfSale || 1,
                    internal_uom: clientProduct.internal_uom || "",
                };
                await dynamodb
                    .put({ TableName: TABLE_NAME, Item: parsed })
                    .promise();
            }

            return {
                statusCode: 201,
                headers: corsHeaders,
                body: JSON.stringify({
                    message: "products created",
                    products: createdProducts,
                }),
            };
        }

        // update existing products in ePOS Now + overwrite in dynamo
        if (action === "update") {
            const { products } = parsedBody;

            const updatePayload = products.map(({ id, name, uos, vouos }) => ({
                Id: Number(id),
                Name: name,
                CategoryId: 587596,
                UnitOfSale: UNIT_LOOKUP.indexOf(uos),
                VolumeOfSale: vouos,
                SalePrice: 0,
                IsSalePriceIncTax: true,
                EatOutPrice: 0,
                IsEatOutPriceIncTax: true,
                CostPrice: 0,
                IsCostPriceIncTax: false,
                SellOnWeb: false,
                SellOnTill: true,
                ProductType: 0,
            }));

            await axios.put(
                "https://api.eposnowhq.com/api/v4/Product",
                updatePayload,
                {
                    headers: {
                        Authorization: `Basic ${EPOSNOW_TOKEN}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            for (let p of products) {
                await dynamodb
                    .put({
                        TableName: TABLE_NAME,
                        Item: {
                            id: p.id,
                            name: p.name,
                            uos: p.uos || "Unknown",
                            vouos: p.vouos || 1,
                            internal_uom: p.internal_uom || "",
                        },
                    })
                    .promise();
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: "products updated" }),
            };
        }

        // delete products in both ePOS Now and dynamo
        if (action === "delete") {
            const { ids } = parsedBody;

            for (const id of ids) {
                await axios.delete(
                    `https://api.eposnowhq.com/api/v4/Product/${id}`,
                    {
                        headers: {
                            Authorization: `Basic ${EPOSNOW_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                await dynamodb
                    .delete({ TableName: TABLE_NAME, Key: { id: Number(id) } })
                    .promise();
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: "products deleted" }),
            };
        }

        // pull products from ePOS Now and sync into dynamo
        if (action === "sync") {
            let allProducts = [];
            let page = 1;

            while (true) {
                const response = await axios.get(
                    `https://api.eposnowhq.com/api/v4/Product/?page=${page}`,
                    {
                        headers: {
                            Authorization: `Basic ${EPOSNOW_TOKEN}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                const currentPage = response.data;
                if (!Array.isArray(currentPage) || currentPage.length === 0)
                    break;
                allProducts = allProducts.concat(currentPage);
                page++;
            }

            const masterProducts = allProducts.filter(
                (p) => p.CategoryId === 587596
            );

            for (const p of masterProducts) {
                const existingItem = await dynamodb
                    .get({
                        TableName: TABLE_NAME,
                        Key: { id: p.Id },
                    })
                    .promise();

                const currentInternalUOM =
                    existingItem.Item?.internal_uom || "";

                const parsed = {
                    id: p.Id,
                    name: p.Name,
                    uos: UNIT_LOOKUP[p.UnitOfSale] || "Unknown",
                    vouos: p.VolumeOfSale || 1,
                    internal_uom: currentInternalUOM,
                };

                await dynamodb
                    .put({ TableName: TABLE_NAME, Item: parsed })
                    .promise();
            }

            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify({ message: "sync complete" }),
            };
        }

        // return all products from dynamo
        if (action === "list") {
            const result = await dynamodb
                .scan({ TableName: TABLE_NAME })
                .promise();
            return {
                statusCode: 200,
                headers: corsHeaders,
                body: JSON.stringify(result.Items || []),
            };
        }

        return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: "invalid action" }),
        };
    } catch (err) {
        console.error("Error:", err);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: "internal server error" }),
        };
    }
};
