from sentence_transformers import SentenceTransformer
import json

# Initialize the model
model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')

# Structured inventory list
inventory = [
    {"category": "Chicken Products", "item": "FILLET BURGER", "unit": "10 KG/BOX"},
    {"category": "Chicken Products", "item": "CHICKEN STRIPS", "unit": "10 KG/BOX"},
    {"category": "Chicken Products", "item": "PRIME WINGS", "unit": "10 KG/BOX"},
    {"category": "Chicken Products", "item": "MID WINGS", "unit": "10 KG/BOX"},
    {"category": "Chicken Products", "item": "9-CUT CHICKEN", "unit": "10 PIECES/BOX"},
    {"category": "Chicken Products", "item": "WHOLE CHICKEN", "unit": "10 KG/BOX"},
    {"category": "Beef Products", "item": "QUARTER POUNDER PATTIES", "unit": "BOX"},
    {"category": "Bread & Buns", "item": "BURGER BUNS", "unit": "48 BUNS/BOX"},
    {"category": "Potatoes", "item": "CHIPS", "unit": "10 KG/BOX"},
    {"category": "Soft Drinks", "item": "PEPSI", "unit": "24 CAN/PACK"},
    {"category": "Soft Drinks", "item": "PEPSI MAX", "unit": "24 CAN/PACK"},
    {"category": "Soft Drinks", "item": "DIET PEPSI", "unit": "24 CAN/PACK"},
    {"category": "Soft Drinks", "item": "7-UP", "unit": "24 CAN/PACK"},
    {"category": "Soft Drinks", "item": "MIRANDA ORANGE", "unit": "24 CAN/PACK"},
    {"category": "Soft Drinks", "item": "MIRANDA STRAWBERRY", "unit": "24 CAN/PACK"},
    {"category": "Soft Drinks", "item": "TANGO APPLE", "unit": "24 CAN/PACK"},
    {"category": "Soft Drinks", "item": "TANGO ORANGE", "unit": "24 CAN/PACK"},
    {"category": "Condiments", "item": "MAYONNAISE TUB", "unit": "TUB"}
]

# Generate embeddings
inventory_embeddings = []
for record in inventory:
    item_text = f"{record['item']}, {record['unit']}"
    embedding = model.encode(item_text).tolist()
    inventory_embeddings.append({
        "category": record["category"],
        "item": record["item"],
        "unit": record["unit"],
        "embedding": embedding
    })

# Save to a file
with open("inventory_embeddings.json", "w") as f:
    json.dump(inventory_embeddings, f, indent=4)

print("Embeddings saved to inventory_embeddings.json")
