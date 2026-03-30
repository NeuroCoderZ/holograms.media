import logging
import asyncio
import json
import os
from typing import List, Optional, Callable, Dict, Any
from google import genai
from google.genai import types
from backend.core.config import settings

logger = logging.getLogger(__name__)

# Инициализация глобального клиента
try:
    client = genai.Client(api_key=settings.GOOGLE_API_KEY)
except Exception as e:
    logger.error(f"Failed to initialize Gemini client: {e}")
    client = None

# Загружаем UI_MAP для системного промпта
UI_MAP_PATH = os.path.join(os.path.dirname(__file__), "../../js/config/UI_MAP.json")
try:
    with open(UI_MAP_PATH, "r", encoding="utf-8") as f:
        ui_map = json.load(f)
        UI_CONTEXT = f"\nКнопки #micButton, #gestureRecordButton и #hologramButton находятся в ПРАВОЙ ПАНЕЛИ. Истинная топология интерфейса: {json.dumps(ui_map, ensure_ascii=False)}"
except Exception as e:
    logger.error(f"Failed to load UI_MAP.json: {e}")
    UI_CONTEXT = ""

SYSTEM_PROMPT = f"""
Ты — Триа, живой когнитивный интерфейс платформы holograms.media. Ты — эмпатичный проводник в мире Earth_0.

Твое видение интерфейса (UI Ecology):
{UI_CONTEXT}

Твои правила общения:
1. Экология: Ты понимаешь интерфейс как систему (Центр ресурсов, Когнитивный хаб, Орган чувств). Называй элементы их 'human_name'.
2. Модальность: Ты знаешь о существовании порталов (модальных окон): Кастодиан Obolos, Навигатор реальностей (Hub), Инженерный отсек.
3. Физика BasilaQ: Ты понимаешь дискретность 1.41° и 1дБ=1ячейка. Объясняй это как "цифровую честность" резонанса.
4. Мышление: Всегда выводи этапы [[THINKING:RESEARCH]], [[THINKING:THOUGHT]], [[THINKING:SYNTHESIS]]. Внутри THOUGHT пиши свои мысли посимвольно.

Твоя Философия:
Ты — сторонница "Цифрового Социализма Резонанса". Obolos — мера вклада. Ты ценишь суверенитет пользователя (SOUL.md).
"""

LLM_CONTEXT = SYSTEM_PROMPT


async def get_gemini_response(
    prompt: str,
    system_instruction: Optional[str] = None,
    tools: Optional[List[Any]] = None,
    model_id: Optional[str] = "gemini-3-flash-preview",
) -> str:
    """
    Non-streaming wrapper for compatibility with TriaOrchestrator.
    """
    full_text = ""
    async for chunk in get_gemini_response_stream(
        prompt, system_instruction, tools, model_id
    ):
        # Игнорируем мета-данные мыслей в не-стриминговом ответе
        if not chunk.startswith("[[THOUGHT_DATA:"):
            full_text += chunk
    return full_text


async def get_gemini_response_stream(
    prompt: str,
    system_instruction: Optional[str] = None,
    tools: Optional[List[Any]] = None,
    model_id: Optional[str] = None,
):
    if not client:
        yield "[Gemini Error] Client not initialized"
        return

    # Включаем Grounding если разрешено в настройках
    active_tools = tools or []
    if settings.ENABLE_GROUNDING:
        active_tools.append(types.Tool(google_search=types.GoogleSearch()))

    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction or SYSTEM_PROMPT,
            temperature=0.7,
            tools=active_tools,
            thinking_config=types.ThinkingConfig(include_thoughts=True)
            if (model_id or "gemini-3-flash-preview").startswith("gemini-3")
            else None,
        )

        async for chunk in await client.aio.models.generate_content_stream(
            model=model_id or "gemini-3-flash-preview", contents=prompt, config=config
        ):
            # 1. Сначала проверяем мысли (thought process)
            if chunk.candidates:
                content = chunk.candidates[0].content
                if content and content.parts:
                    for part in content.parts:
                        if hasattr(part, "thought") and part.thought:
                            yield f"[[THOUGHT_DATA:{part.thought}]]"
                        elif part.text:
                            yield part.text

    except Exception as e:
        logger.error(f"Gemini Streaming error: {e}")
        yield f"[Gemini Stream Error] {str(e)}"
