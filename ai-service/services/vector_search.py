"""
In-memory vector search service.
Fetches all product vectors from MongoDB, computes cosine similarity, returns top-K.
"""
import numpy as np
from pymongo import MongoClient
from config import MONGODB_URI, MONGODB_DB_NAME
from services.embeddings import generate_embedding

# MongoDB connection
_client = MongoClient(MONGODB_URI)
_db = _client[MONGODB_DB_NAME]
_products_collection = _db["products"]


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    """Compute cosine similarity between two vectors using NumPy."""
    a_arr = np.array(a)
    b_arr = np.array(b)
    dot_product = np.dot(a_arr, b_arr)
    norm_a = np.linalg.norm(a_arr)
    norm_b = np.linalg.norm(b_arr)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot_product / (norm_a * norm_b))


async def search_products(query: str, top_k: int = 4) -> list[dict]:
    """
    Search products by semantic similarity.
    1. Generate embedding for the query
    2. Fetch all products with vectors from MongoDB
    3. Compute cosine similarity
    4. Return top-K results (without the vector field)
    """
    try:
        # Step 1: Generate query embedding
        query_vector = await generate_embedding(query)

        # Step 2: Fetch all products with vectors
        all_products = list(_products_collection.find(
            {"product_vector": {"$exists": True}},
            {
                "_id": 0,
                "id": 1,
                "name": 1,
                "slug": 1,
                "description": 1,
                "price": 1,
                "originalPrice": 1,
                "image": 1,
                "category": 1,
                "brand": 1,
                "rating": 1,
                "product_vector": 1,
            }
        ))

        if not all_products:
            return []

        # Step 3: Compute similarities
        scored = []
        for product in all_products:
            vector = product.get("product_vector", [])
            if vector:
                score = _cosine_similarity(query_vector, vector)
                scored.append((score, product))

        # Step 4: Sort by similarity (highest first) and take top-K
        scored.sort(key=lambda x: x[0], reverse=True)
        top_results = scored[:top_k]

        # Remove vector field before returning
        results = []
        for _, product in top_results:
            product.pop("product_vector", None)
            results.append(product)

        return results

    except Exception as e:
        print(f"Product search failed: {e}")
        return []
