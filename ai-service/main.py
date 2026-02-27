"""
EStoreFront AI Service — FastAPI Entry Point

Provides AI-powered endpoints:
  - POST /api/chat        → Shopping assistant chat (Ollama LLM)
  - POST /api/suggestions → Search suggestions (Google Gemini)
  - POST /api/embeddings  → Generate text embeddings (Ollama)
  - GET  /api/health      → Health check
"""
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from config import FRONTEND_URL, PORT
from models.schemas import (
    ChatRequest, ChatResponse,
    SuggestionRequest, SuggestionResponse,
    EmbeddingRequest, EmbeddingResponse,
    HealthResponse,
)
from services.chat import generate_shopping_response
from services.suggestions import get_search_suggestions
from services.embeddings import generate_embedding

# ─── App Initialization ────────────────────────────────────
app = FastAPI(
    title="EStoreFront AI Service",
    description="AI-powered shopping assistant, product search, and embedding generation.",
    version="1.0.0",
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
    """Health check endpoint."""
    return HealthResponse(
        status="ok",
        service="estorefont-ai-service",
        timestamp=datetime.now(timezone.utc).isoformat(),
    )


@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    AI Shopping Assistant chat endpoint.
    Receives a user message, performs vector search, returns products + AI message.
    """
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
        print(f"Chat endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate response. Is Ollama running?",
        )


@app.post("/api/suggestions", response_model=SuggestionResponse)
async def suggestions(request: SuggestionRequest):
    """
    AI-powered search suggestions endpoint.
    Uses Google Gemini to generate relevant product search suggestions.
    """
    try:
        results = await get_search_suggestions(
            query=request.query.strip(),
            category=request.category,
            price_range=request.price_range,
            brand=request.brand,
        )
        return SuggestionResponse(suggestions=results)
    except Exception as e:
        print(f"Suggestions endpoint error: {e}")
        return SuggestionResponse(suggestions=[])


@app.post("/api/embeddings", response_model=EmbeddingResponse)
async def embeddings(request: EmbeddingRequest):
    """
    Generate a vector embedding for the given text.
    Uses Ollama with the nomic-embed-text model.
    """
    try:
        vector = await generate_embedding(request.text.strip())
        return EmbeddingResponse(embedding=vector, dimensions=len(vector))
    except Exception as e:
        print(f"Embedding endpoint error: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to generate embedding. Is Ollama running?",
        )


# ─── Run with: uvicorn main:app --reload --port 8000 ───────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)
