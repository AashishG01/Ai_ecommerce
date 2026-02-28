"""
EStoreFront AI Service — FastAPI Entry Point (Phase 6)

Migrated from MongoDB to PostgreSQL (asyncpg).
Added: structured logging (loguru), lifecycle hooks, recommendations, product analysis.

Endpoints:
  - POST /api/chat             → Shopping assistant chat (Ollama LLM)
  - POST /api/suggestions      → Search suggestions (Google Gemini)
  - POST /api/embeddings       → Generate text embeddings (Ollama)
  - POST /api/recommendations  → Product recommendations (similar/trending/personalized)
  - POST /api/analyze          → AI product analysis (summary/strengths/ideal-for)
  - GET  /api/health           → Health check (includes DB status + cache metrics)
"""
import sys
from datetime import datetime, timezone
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from config import FRONTEND_URL, PORT
from models.schemas import (
    ChatRequest, ChatResponse,
    SuggestionRequest, SuggestionResponse,
    EmbeddingRequest, EmbeddingResponse,
    RecommendationRequest, RecommendationResponse,
    ProductAnalysisRequest, ProductAnalysisResponse,
    HealthResponse,
)
from services.chat import generate_shopping_response
from services.suggestions import get_search_suggestions
from services.embeddings import generate_embedding
from services.recommendations import (
    get_similar_products,
    get_trending,
    get_personalized_recommendations,
)
from services.product_analysis import analyze_product
from services.database import get_pool, close_pool
from services.vector_search import _product_embeddings

# ─── Loguru Configuration ───────────────────────────────────
# Remove default logger and add structured format
logger.remove()
logger.add(
    sys.stderr,
    format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level="INFO",
)
logger.add(
    "logs/ai-service.log",
    rotation="10 MB",
    retention="7 days",
    compression="zip",
    level="DEBUG",
)


# ─── Lifecycle (startup + shutdown) ─────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup and shutdown events."""
    # Startup
    logger.info("🚀 AI Service starting up...")
    try:
        pool = await get_pool()
        logger.info(f"✅ PostgreSQL connected (pool size: {pool.get_size()})")
    except Exception as e:
        logger.error(f"❌ PostgreSQL connection failed: {e}")

    yield

    # Shutdown
    logger.info("🛑 AI Service shutting down...")
    await close_pool()
    logger.info("✅ Cleanup complete")


# ─── App Initialization ────────────────────────────────────
app = FastAPI(
    title="EStoreFront AI Service",
    description="AI-powered shopping assistant, product recommendations, and analysis.",
    version="2.0.0",
    lifespan=lifespan,
)

# ─── CORS ───────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routes ─────────────────────────────────────────────────

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """Health check — includes DB status and embedding cache size."""
    db_status = "unknown"
    try:
        pool = await get_pool()
        async with pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        db_status = "connected"
    except Exception:
        db_status = "disconnected"

    return HealthResponse(
        status="ok",
        service="estorefont-ai-service",
        timestamp=datetime.now(timezone.utc).isoformat(),
        database=db_status,
        embedding_cache_size=len(_product_embeddings),
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """AI Shopping Assistant — returns product recommendations with natural language."""
    try:
        result = await generate_shopping_response(
            user_message=request.message.strip(),
            history=request.history,
        )
        return ChatResponse(
            message=result.get("message", "I couldn't process that. Please try again!"),
            products=result.get("products", []),
        )
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate response. Is Ollama running?",
        )


@app.post("/api/suggestions", response_model=SuggestionResponse)
async def suggestions(request: SuggestionRequest):
    """AI-powered search suggestions using Google Gemini."""
    try:
        results = await get_search_suggestions(
            query=request.query.strip(),
            category=request.category,
            price_range=request.price_range,
            brand=request.brand,
        )
        return SuggestionResponse(suggestions=results)
    except Exception as e:
        logger.error(f"Suggestions endpoint error: {e}")
        return SuggestionResponse(suggestions=[])


@app.post("/api/embeddings", response_model=EmbeddingResponse)
async def embeddings(request: EmbeddingRequest):
    """Generate vector embeddings for text using Ollama."""
    try:
        vector = await generate_embedding(request.text.strip())
        return EmbeddingResponse(embedding=vector, dimensions=len(vector))
    except Exception as e:
        logger.error(f"Embedding endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate embedding. Is Ollama running?",
        )


@app.post("/api/recommendations", response_model=RecommendationResponse)
async def recommendations(request: RecommendationRequest):
    """
    Product Recommendations endpoint.
    Strategies: 'similar' (needs product_id), 'trending', 'personalized' (needs user_id).
    """
    try:
        if request.strategy == "similar" and request.product_id:
            products = await get_similar_products(request.product_id, request.limit)
        elif request.strategy == "personalized":
            products = await get_personalized_recommendations(request.user_id, request.limit)
        else:
            products = await get_trending(request.limit)

        return RecommendationResponse(
            strategy=request.strategy,
            products=products,
            count=len(products),
        )
    except Exception as e:
        logger.error(f"Recommendations endpoint error: {e}")
        return RecommendationResponse(strategy=request.strategy, products=[], count=0)


@app.post("/api/analyze", response_model=ProductAnalysisResponse)
async def analyze(request: ProductAnalysisRequest):
    """
    AI Product Analysis — generates summary, strengths, and ideal-for tags
    using Ollama LLM + product data from PostgreSQL.
    """
    try:
        result = await analyze_product(request.product_id)
        if "error" in result:
            raise HTTPException(status_code=404, detail=result["error"])
        return ProductAnalysisResponse(**result)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Analysis endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to analyze product.",
        )


# ─── Run with: uvicorn main:app --reload --port 8000 ───────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
