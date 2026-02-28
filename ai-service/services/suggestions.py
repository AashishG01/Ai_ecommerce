"""
Search suggestions service using Google Gemini.
Phase 6: Updated to use loguru for structured logging.
"""
import json
import re
import google.generativeai as genai
from loguru import logger
from config import GOOGLE_API_KEY

# Configure the Gemini API
if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)

# Initialize the model
_model = genai.GenerativeModel("gemini-2.0-flash")

SUGGESTION_PROMPT = """You are a world-class e-commerce search assistant. Your goal is to provide highly relevant, semantic, and diverse product search suggestions based on the user's input.

Think about the user's intent. Are they looking for a specific product, a category, or a feature?

Generate a list of 5 suggestions that include:
1. Direct product name matches.
2. Broader category suggestions.
3. Suggestions based on product attributes or use-cases (e.g., "waterproof running shoes", "laptops for video editing").
4. Conceptual or lifestyle-related searches (e.g., "office comfort", "outdoor adventure gear").

User's Query: {query}
Filters (if provided):
- Category: {category}
- Price Range: {price_range}
- Brand: {brand}

Return ONLY a JSON array of 5 suggestion strings. Example: ["suggestion 1", "suggestion 2", "suggestion 3", "suggestion 4", "suggestion 5"]
No extra text, just the JSON array."""


async def get_search_suggestions(
    query: str,
    category: str | None = None,
    price_range: str | None = None,
    brand: str | None = None,
) -> list[str]:
    """Generate AI-powered search suggestions using Google Gemini."""
    if not GOOGLE_API_KEY:
        # Fallback: return basic suggestions without AI
        logger.warning("No GOOGLE_API_KEY — using fallback suggestions")
        return [
            f"{query} best sellers",
            f"{query} on sale",
            f"top rated {query}",
            f"new {query}",
            f"{query} under $100",
        ]

    try:
        prompt = SUGGESTION_PROMPT.format(
            query=query,
            category=category or "Any",
            price_range=price_range or "Any",
            brand=brand or "Any",
        )

        response = await _model.generate_content_async(prompt)
        text = response.text.strip()

        # Clean markdown code blocks
        cleaned = re.sub(r'```json\s*', '', text, flags=re.IGNORECASE)
        cleaned = re.sub(r'```\s*', '', cleaned).strip()

        suggestions = json.loads(cleaned)
        if isinstance(suggestions, list):
            result = [str(s) for s in suggestions[:5]]
            logger.info(f"Gemini suggestions for '{query}': {result}")
            return result

        return []

    except Exception as e:
        logger.error(f"Gemini suggestion generation failed: {e}")
        # Fallback suggestions
        return [
            f"{query} best sellers",
            f"{query} on sale",
            f"top rated {query}",
            f"new {query}",
            f"{query} under $100",
        ]
