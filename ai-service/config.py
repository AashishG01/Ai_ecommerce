"""
Environment configuration for the AI service.
Migrated from MongoDB to PostgreSQL.
"""
import os
from dotenv import load_dotenv

load_dotenv()

# PostgreSQL (shared with backend — reads products from the same DB)
DATABASE_URL = os.getenv("DATABASE_URL", "")

# Ollama (local LLM + embeddings)
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_CHAT_MODEL = os.getenv("OLLAMA_CHAT_MODEL", "llama3.2")
OLLAMA_EMBED_MODEL = os.getenv("OLLAMA_EMBED_MODEL", "nomic-embed-text")

# Google Gemini (search suggestions)
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# Backend API URL (for cross-service calls)
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:4000")

# Server
PORT = int(os.getenv("PORT", "8000"))
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")

# Timeouts (seconds)
LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "30"))
DB_TIMEOUT = int(os.getenv("DB_TIMEOUT", "5"))
EMBEDDING_TIMEOUT = int(os.getenv("EMBEDDING_TIMEOUT", "10"))
