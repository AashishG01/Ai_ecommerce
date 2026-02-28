"""
Pydantic schemas for AI service request/response models.
Updated for Phase 6 — added recommendation and product analysis schemas.
"""
from pydantic import BaseModel, Field
from typing import Optional


# ─── Chat Schemas ───────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000, description="User message")
    history: str = Field(default="", description="Conversation history")


class ChatProduct(BaseModel):
    id: str
    name: str
    slug: str
    description: Optional[str] = None
    price: float
    original_price: Optional[float] = None
    image: Optional[str] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    similarity_score: Optional[float] = None


class ChatResponse(BaseModel):
    message: str
    products: list = []


# ─── Suggestion Schemas ─────────────────────────────────────
class SuggestionRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="Search query")
    category: Optional[str] = None
    price_range: Optional[str] = None
    brand: Optional[str] = None


class SuggestionResponse(BaseModel):
    suggestions: list[str] = []


# ─── Embedding Schemas ──────────────────────────────────────
class EmbeddingRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=5000, description="Text to embed")


class EmbeddingResponse(BaseModel):
    embedding: list[float]
    dimensions: int


# ─── Recommendation Schemas ─────────────────────────────────
class RecommendationRequest(BaseModel):
    product_id: Optional[str] = Field(None, description="Product ID for similar products")
    user_id: Optional[str] = Field(None, description="User ID for personalized recommendations")
    strategy: str = Field(
        default="trending",
        description="Recommendation strategy: similar, trending, personalized",
    )
    limit: int = Field(default=8, ge=1, le=20)


class RecommendationResponse(BaseModel):
    strategy: str
    products: list = []
    count: int = 0


# ─── Product Analysis Schemas ───────────────────────────────
class ProductAnalysisRequest(BaseModel):
    product_id: str = Field(..., description="Product ID to analyze")


class ProductAnalysisResponse(BaseModel):
    product_name: str
    summary: str
    strengths: list[str] = []
    ideal_for: list[str] = []
    similar_products: list = []


# ─── Health Check ───────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str
    database: str = "unknown"
    embedding_cache_size: int = 0
