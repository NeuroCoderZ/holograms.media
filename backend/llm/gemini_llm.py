import logging
import asyncio
from typing import List, Optional, Callable, Dict, Any
from google import genai
from google.genai import types
from backend.core.config import settings

logger = logging.getLogger(__name__)

# STATIC CONTEXT ONLY
SYSTEM_PROMPT = "Ты Триа — AI-ассистент платформы holograms.media. Отвечай на вопросы о проекте, используя доступные инструменты."
LLM_CONTEXT = SYSTEM_PROMPT 

# Инициализируем клиент (Async)
client = None
if settings.GOOGLE_API_KEY:
    try:
        client = genai.Client(api_key=settings.GOOGLE_API_KEY)
        logger.info("[GeminiLLM] GenAI Client initialized")
    except Exception as e:
        logger.error(f"[GeminiLLM] Client init failed: {e}")

async def get_gemini_response(
    prompt: str, 
    history: list = None, 
    system_instruction: str = None,
    tools: List[Any] = None,
    tool_map: Dict[str, Callable] = None
) -> str:
    """
    Универсальный хелпер для Gemini с поддержкой Tool Calling.
    """
    if not client:
        return "[Gemini Error] Client not initialized"

    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction or SYSTEM_PROMPT,
            temperature=0.7,
            tools=tools,
            automatic_function_calling=types.AutomaticFunctionCallingConfig(
                disable=False
            ) if tools else None
        )

        # Если мы используем автоматический вызов функций, клиент сам сделает запрос к tool_map
        # Но в текущем SDK google-genai для Python (1.66+) автоматический вызов работает 
        # если передать функции прямо в tools.
        
        response = await client.aio.models.generate_content(
            model='gemini-3-flash-preview',
            contents=prompt,
            config=config
        )

        return response.text
    except Exception as e:
        logger.error(f"Gemini LLM error: {e}")
        return f"[Gemini Error] {str(e)}"

async def generate_with_tools(
    prompt: str,
    tools: List[Dict[str, Any]],
    tool_handlers: Dict[str, Callable],
    system_instruction: str = None
) -> str:
    """
    Более продвинутый цикл обработки Tool Calling (для сложной логики).
    """
    # В google-genai 1.0.0+ AutomaticFunctionCallingConfig делает это за нас 
    # если передать функции в tools. Но для контроля мы можем делать это вручную.
    return await get_gemini_response(prompt, tools=tools, system_instruction=system_instruction)
