import logging
import asyncio
from google import genai
from google.genai import types
from backend.core.config import settings

logger = logging.getLogger(__name__)

# STATIC CONTEXT ONLY
SYSTEM_PROMPT = "Ты Триа — AI-ассистент платформы holograms.media. Отвечай на вопросы о проекте."
LLM_CONTEXT = SYSTEM_PROMPT # Alias for compatibility with routers and orchestrator

# Инициализируем клиент (Async)
client = None
if settings.GOOGLE_API_KEY:
    try:
        client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        logger.info("[GeminiLLM] GenAI Client initialized")
    except Exception as e:
        logger.error(f"[GeminiLLM] Client init failed: {e}")

async def get_gemini_response(prompt: str, history: list = None, system_instruction: str = None) -> str:
    """ Универсальный хелпер для Gemini. """
    if not client:
        return "[Gemini Error] Client not initialized (check API key)"

    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction or SYSTEM_PROMPT,
            temperature=0.7,
        )

        response = await client.aio.models.generate_content(
            model='gemini-3-flash-preview',
            contents=prompt,
            config=config
        )

        return response.text
    except Exception as e:
        logger.error(f"Gemini LLM error: {e}")
        return f"[Gemini Error] {str(e)}"
