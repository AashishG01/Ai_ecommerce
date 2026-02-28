"""
PostgreSQL database connection pool using asyncpg.
Replaces MongoDB connection — reads from the same database as the backend.
"""
import asyncpg
from loguru import logger
from config import DATABASE_URL

_pool: asyncpg.Pool | None = None


async def get_pool() -> asyncpg.Pool:
    """Get or create the connection pool (lazy init)."""
    global _pool
    if _pool is None:
        logger.info("Creating asyncpg connection pool...")
        _pool = await asyncpg.create_pool(
            DATABASE_URL,
            min_size=2,
            max_size=10,
            command_timeout=5,
        )
        logger.info("asyncpg pool created (min=2, max=10)")
    return _pool


async def close_pool():
    """Close the connection pool (called on shutdown)."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("asyncpg pool closed")


async def fetch_products_for_search(limit: int = 200) -> list[dict]:
    """
    Fetch products from PostgreSQL for vector search.
    Returns product data needed for the AI shopping assistant.
    """
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT
            p.id, p.name, p.slug, p.description,
            p.price::float, p.original_price::float,
            p.images[1] AS image,
            p.rating::float,
            p.review_count,
            c.name AS category,
            b.name AS brand,
            i.quantity AS stock
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        LEFT JOIN inventory i ON i.product_id = p.id
        WHERE i.quantity > 0
        ORDER BY p.rating DESC
        LIMIT $1
    """, limit)

    return [dict(row) for row in rows]


async def fetch_product_by_id(product_id: str) -> dict | None:
    """Fetch a single product by ID."""
    pool = await get_pool()
    row = await pool.fetchrow("""
        SELECT
            p.id, p.name, p.slug, p.description,
            p.price::float, p.original_price::float,
            p.images[1] AS image,
            p.rating::float, p.review_count,
            c.name AS category,
            b.name AS brand
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        WHERE p.id = $1
    """, product_id)

    return dict(row) if row else None


async def fetch_trending_products(limit: int = 8) -> list[dict]:
    """Fetch trending products for recommendations."""
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT
            p.id, p.name, p.slug,
            p.price::float, p.original_price::float,
            p.images[1] AS image,
            p.rating::float, p.review_count,
            c.name AS category,
            b.name AS brand
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        WHERE p.is_trending = true
        ORDER BY p.rating DESC
        LIMIT $1
    """, limit)

    return [dict(row) for row in rows]


async def fetch_similar_products(product_id: str, limit: int = 4) -> list[dict]:
    """
    Fetch products similar to the given product.
    Uses same category + brand proximity as a heuristic.
    """
    pool = await get_pool()

    # Get the product's category and brand
    product = await pool.fetchrow(
        "SELECT category_id, brand_id, price::float FROM products WHERE id = $1",
        product_id
    )
    if not product:
        return []

    # Find products in same category, ordered by price proximity
    rows = await pool.fetch("""
        SELECT
            p.id, p.name, p.slug,
            p.price::float, p.original_price::float,
            p.images[1] AS image,
            p.rating::float, p.review_count,
            c.name AS category,
            b.name AS brand
        FROM products p
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        WHERE p.category_id = $1
          AND p.id != $2
        ORDER BY
            CASE WHEN p.brand_id = $3 THEN 0 ELSE 1 END,  -- Same brand first
            ABS(p.price - $4),                               -- Close in price
            p.rating DESC
        LIMIT $5
    """, product["category_id"], product_id, product["brand_id"], product["price"], limit)

    return [dict(row) for row in rows]


async def fetch_user_order_history(user_id: str, limit: int = 20) -> list[dict]:
    """Fetch a user's recent order items for personalized recommendations."""
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT DISTINCT
            p.id, p.name, p.slug,
            c.name AS category,
            b.name AS brand
        FROM order_items oi
        JOIN orders o ON oi.order_id = o.id
        JOIN products p ON oi.product_id = p.id
        JOIN categories c ON p.category_id = c.id
        JOIN brands b ON p.brand_id = b.id
        WHERE o.user_id = $1
        ORDER BY p.name
        LIMIT $2
    """, user_id, limit)

    return [dict(row) for row in rows]
