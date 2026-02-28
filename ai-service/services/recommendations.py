"""
Product recommendation engine.

Provides multiple recommendation strategies:
  1. Similar products (same category + brand proximity)
  2. Trending/popular products
  3. Personalized recommendations based on order history
  4. AI-powered "customers also bought" via LLM reasoning
"""
from loguru import logger
from services.database import (
    fetch_similar_products,
    fetch_trending_products,
    fetch_user_order_history,
    fetch_products_for_search,
)


async def get_similar_products(product_id: str, limit: int = 4) -> list[dict]:
    """
    Get products similar to the given product.
    Uses category + brand + price proximity heuristic from PostgreSQL.
    """
    try:
        results = await fetch_similar_products(product_id, limit)
        logger.info(f"Similar products for {product_id}: {len(results)} found")
        return results
    except Exception as e:
        logger.error(f"Similar products failed: {e}")
        return []


async def get_trending(limit: int = 8) -> list[dict]:
    """Get trending products — marked as trending in the database."""
    try:
        results = await fetch_trending_products(limit)
        logger.info(f"Trending products: {len(results)}")
        return results
    except Exception as e:
        logger.error(f"Trending products failed: {e}")
        return []


async def get_personalized_recommendations(
    user_id: str | None = None, limit: int = 8
) -> list[dict]:
    """
    Get personalized recommendations for a user.
    Strategy:
      - If user has order history → recommend from same categories/brands they've bought
      - Otherwise → return trending products as fallback
    """
    try:
        if not user_id:
            return await get_trending(limit)

        # Get user's purchase history
        history = await fetch_user_order_history(user_id)

        if not history:
            logger.info(f"No order history for user {user_id}, using trending")
            return await get_trending(limit)

        # Extract categories and brands the user has bought from
        bought_categories = set(item["category"] for item in history)
        bought_brands = set(item["brand"] for item in history)
        bought_ids = set(item["id"] for item in history)

        # Fetch all products and filter for recommendations
        all_products = await fetch_products_for_search(limit=100)

        # Score products: higher score = more relevant to user
        scored = []
        for product in all_products:
            if product["id"] in bought_ids:
                continue  # Don't recommend what they already bought

            score = 0
            if product.get("category") in bought_categories:
                score += 2  # Same category = strong signal
            if product.get("brand") in bought_brands:
                score += 1  # Same brand = weaker signal
            if product.get("rating", 0) >= 4.0:
                score += 0.5  # High-rated bonus

            if score > 0:
                scored.append((score, product))

        # Sort by score, then by rating
        scored.sort(key=lambda x: (x[0], x[1].get("rating", 0)), reverse=True)

        results = [product for _, product in scored[:limit]]
        logger.info(f"Personalized recs for user {user_id}: {len(results)} (from {len(scored)} scored)")

        # If not enough personalized results, pad with trending
        if len(results) < limit:
            trending = await get_trending(limit - len(results))
            existing_ids = set(r["id"] for r in results)
            for item in trending:
                if item["id"] not in existing_ids:
                    results.append(item)
                    if len(results) >= limit:
                        break

        return results

    except Exception as e:
        logger.error(f"Personalized recommendations failed: {e}")
        return await get_trending(limit)
