"""
AI-powered product analysis service.
Uses Ollama LLM to generate product summaries, strengths, and ideal-for tags.
"""
import json
import re
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, SystemMessage
from loguru import logger
from config import OLLAMA_BASE_URL, OLLAMA_CHAT_MODEL
from services.database import fetch_product_by_id, fetch_similar_products

_llm = ChatOllama(
    model=OLLAMA_CHAT_MODEL,
    base_url=OLLAMA_BASE_URL,
    temperature=0.5,
)

ANALYSIS_PROMPT = """You are a product analyst for an e-commerce store. Analyze the product below and provide:
1. A short, compelling summary (2-3 sentences)
2. 3-5 key strengths
3. 3-5 "ideal for" use cases (who should buy this)

Product data:
{product_data}

Respond in ONLY valid JSON:
{{"summary": "...", "strengths": ["...", "..."], "ideal_for": ["...", "..."]}}"""


async def analyze_product(product_id: str) -> dict:
    """
    Generate an AI analysis for a product.
    Returns summary, strengths, ideal-for tags, and similar products.
    """
    # Fetch product data
    product = await fetch_product_by_id(product_id)
    if not product:
        return {"error": "Product not found"}

    # Get similar products
    similar = await fetch_similar_products(product_id, limit=4)

    # Generate AI analysis
    try:
        product_text = json.dumps(product, default=str)
        prompt = ANALYSIS_PROMPT.format(product_data=product_text)

        response = await _llm.ainvoke([
            SystemMessage(content="You are a product analyst. Respond with ONLY valid JSON."),
            HumanMessage(content=prompt),
        ])

        text = response.content if isinstance(response.content, str) else json.dumps(response.content)

        # Parse JSON from LLM response
        cleaned = re.sub(r'```json\s*', '', text, flags=re.IGNORECASE)
        cleaned = re.sub(r'```\s*', '', cleaned).strip()

        try:
            analysis = json.loads(cleaned)
        except json.JSONDecodeError:
            # Try to find JSON object in response
            start = cleaned.find('{')
            end = cleaned.rfind('}')
            if start != -1 and end != -1:
                analysis = json.loads(cleaned[start:end + 1])
            else:
                analysis = {
                    "summary": f"{product['name']} - a great product in the {product.get('category', 'store')} category.",
                    "strengths": ["Quality product", "Good value"],
                    "ideal_for": ["General use"],
                }

        return {
            "product_name": product["name"],
            "summary": analysis.get("summary", ""),
            "strengths": analysis.get("strengths", []),
            "ideal_for": analysis.get("ideal_for", []),
            "similar_products": similar,
        }

    except Exception as e:
        logger.error(f"Product analysis failed: {e}")
        return {
            "product_name": product["name"],
            "summary": f"{product['name']} is available in our {product.get('category', '')} collection.",
            "strengths": ["Available in stock"],
            "ideal_for": ["Anyone looking for quality products"],
            "similar_products": similar,
        }
