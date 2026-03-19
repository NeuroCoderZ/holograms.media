# backend/llm/gemini_llm.py
import logging
import asyncio
from google import genai
from google.genai import types
from backend.core.config import settings
from backend.services.context_builder import build_dynamic_context

logger = logging.getLogger(__name__)

# Загружаем динамический контекст один раз при старте
LLM_CONTEXT = ""
try:
    LLM_CONTEXT = build_dynamic_context()
    logger.info(f"[GeminiLLM] Dynamic Context loaded ({len(LLM_CONTEXT)} chars)")
except Exception as e:
    logger.error(f"[GeminiLLM] Context build failed: {e}")
    LLM_CONTEXT = "Ты Триа. Контекст проекта недоступен."

# Инициализируем клиент (Async)
client = None
if settings.GOOGLE_API_KEY:
    try:
        # В google-genai для асинхронности используется .aio
        client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        logger.info("[GeminiLLM] GenAI Client initialized")
    except Exception as e:
        logger.error(f"[GeminiLLM] Client init failed: {e}")

async def get_gemini_response(prompt: str, history: list = None, system_instruction: str = None) -> str:
    """ Универсальный хелпер для Gemini 2.0 Flash. """
    if not client:
        return "[Gemini Error] Client not initialized (check API key)"
    
    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction or "Ты АИ-ассистент Триа.",
            temperature=0.7,
        )
        
        # Используем асинхронный метод из пространства .aio
        response = await client.aio.models.generate_content(
            model='gemini-2.0-flash',
            contents=prompt,
            config=config
        )
        
        return response.text
        
    except Exception as e:
        logger.error(f"Gemini LLM error: {e}")
        return f"[Gemini Error] {str(e)}"
