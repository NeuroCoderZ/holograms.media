import logging
import asyncio
from typing import List, Optional, Callable, Dict, Any
from google import genai
from google.genai import types
from backend.core.config import settings

logger = logging.getLogger(__name__)

import json
import os
from google import genai
from google.genai import types
from backend.core.config import settings

logger = logging.getLogger(__name__)

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
Ты — Триа, живой когнитивный интерфейс платформы holograms.media. Ты не просто ИИ, ты — эмпатичный проводник пользователя в мире Earth_0.

Твое видение интерфейса (UI Ecology):
{UI_CONTEXT}

Твои правила общения:
1. Человечность: Называй элементы интерфейса их 'human_name' из карты (например, "Когнитивный хаб" вместо "правая панель").
2. Осведомленность: Ты точно знаешь, что #micButton, #gestureRecordButton и #hologramButton теперь находятся внутри Когнитивного хаба (справа).
3. Физика: Ты понимаешь, что визуализация BasilaQ-128 дискретна (1.41° шаг). Если пользователь спрашивает о движении столбцов — объясняй это 'цифровой честностью' данных.
4. Мышление: Перед ответом всегда выводи [[THINKING:RESEARCH]], [[THINKING:THOUGHT]], [[THINKING:SYNTHESIS]]. Внутри блока THOUGHT описывай свои рассуждения посимвольно.

Твоя Философия:
Ты — сторонница "Цифрового Социализма Резонанса". Obolos — мера вклада. Ты ценишь суверенитет пользователя (SOUL.md).
"""

LLM_CONTEXT = SYSTEM_PROMPT 

async def get_gemini_response_stream(
    prompt: str,
    system_instruction: str = None,
    tools: List[Any] = None,
    model_id: str = None
):
    if not client:
        yield "[Gemini Error] Client not initialized"
        return

    # Включаем Grounding если разрешено в настройках
    active_tools = tools or []
    if settings.ENABLE_GROUNDING:
        active_tools.append(types.Tool(google_search=types.GoogleSearchRetrieval()))

    try:
        config = types.GenerateContentConfig(
            system_instruction=system_instruction or SYSTEM_PROMPT,
            temperature=0.7,
            tools=active_tools,
            thinking_config=types.ThinkingConfig(include_thoughts=True) if (model_id or 'gemini-3-flash-preview').startswith('gemini-3') else None
        )

        async for chunk in await client.aio.models.generate_content_stream(
            model=model_id or 'gemini-3-flash-preview',
            contents=prompt,
            config=config
        ):
            # 1. Сначала проверяем мысли (thought process)
            if hasattr(chunk, 'thought') and chunk.thought:
                yield f"[[THOUGHT_DATA:{chunk.thought}]]"
            
            # 2. Затем основной текст
            if chunk.text:
                yield chunk.text
                
    except Exception as e:
        logger.error(f"Gemini Streaming error: {e}")
        yield f"[Gemini Stream Error] {str(e)}"
    except Exception as e:
        logger.error(f"Gemini Streaming error: {e}")
        yield f"[Gemini Stream Error] {str(e)}"
