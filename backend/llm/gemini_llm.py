# backend/llm/gemini_llm.py
import logging
import asyncio
import google.generativeai as genai
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

if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)

async def get_gemini_response(prompt: str, history: list = None, system_instruction: str = None) -> str:
    """ Универсальный хелпер для Gemini 3 Flash. """
    if not settings.GOOGLE_API_KEY:
        return "[Gemini Error] No API key"
    
    try:
        model = genai.GenerativeModel(
            model_name='models/gemini-3.0-flash',
            system_instruction=system_instruction or "Ты АИ-ассистент Триа."
        )
        
        chat = model.start_chat(history=history or [])
        response = await asyncio.wait_for(chat.send_message_async(prompt), timeout=15.0)
        return response.text
        
    except Exception as e:
        logger.error(f"Gemini LLM error: {e}")
        return f"[Gemini Error] {str(e)}"
