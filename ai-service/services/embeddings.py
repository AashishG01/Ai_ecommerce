"""
Embedding generation service using Ollama via LangChain.
"""
from langchain_ollama import OllamaEmbeddings
from config import OLLAMA_BASE_URL, OLLAMA_EMBED_MODEL

# Initialize embeddings model
_embeddings = OllamaEmbeddings(
    model=OLLAMA_EMBED_MODEL,
    base_url=OLLAMA_BASE_URL,
)


async def generate_embedding(text: str) -> list[float]:
    """Generate a vector embedding for the given text using Ollama."""
    try:
        vector = await _embeddings.aembed_query(text)
        return vector
    except Exception as e:
        raise RuntimeError(f"Failed to generate embedding. Is Ollama running? Error: {e}")
