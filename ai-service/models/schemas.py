"""
Pydantic schemas for AI service request/response models.
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
    description: str
    price: float
    originalPrice: Optional[float] = None
    image: str
    category: str
    brand: str
    rating: float


class ChatResponse(BaseModel):
    message: str
    products: list[ChatProduct] = []


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


# ─── Health Check ───────────────────────────────────────────
class HealthResponse(BaseModel):
    status: str
    service: str
    timestamp: str
