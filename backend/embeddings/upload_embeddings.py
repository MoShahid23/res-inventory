import boto3
import requests
import json
from requests_aws4auth import AWS4Auth

# OpenSearch configuration
region = "ee-west-2"
domain_endpoint = "https://vpc-ims-domain-hsbf3tbgqnjylevxsqlhyhmhaa.eu-west-2.es.amazonaws.com"

# Load embeddings
with open("inventory_embeddings.json", "r") as f:
    inventory_data = json.load(f)

# AWS credentials and SigV4 authentication
credentials = boto3.Session().get_credentials()
auth = AWS4Auth(credentials.access_key, credentials.secret_key, region, "es", session_token=credentials.token)

# Upload embeddings to OpenSearch
headers = {"Content-Type": "application/json"}
for idx, record in enumerate(inventory_data):
    # Prepare document payload
    doc = {
        "index": {"_index": "inventory", "_id": idx}
    }
    payload = json.dumps(doc) + "\n" + json.dumps(record) + "\n"

    # Send request to OpenSearch
    response = requests.post(
        f"{domain_endpoint}/_bulk",
        auth=auth,
        headers=headers,
        data=payload
    )

    if response.status_code == 200:
        print(f"Record {idx} uploaded successfully.")
    else:
        print(f"Failed to upload record {idx}: {response.status_code}, {response.text}")
