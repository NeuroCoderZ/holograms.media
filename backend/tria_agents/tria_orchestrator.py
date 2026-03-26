# backend/tria_agents/tria_orchestrator.py
import logging
from typing import Dict, Any, List, Optional, Callable
import asyncio 
import threading

from backend.tria_agents.tria_rag_service import tria_rag
from backend.llm.gemini_llm import get_gemini_response, get_gemini_response_stream
from backend.core.config import settings

logger = logging.getLogger(__name__)

TECHNICAL_KEYWORDS = (
    "api", "архит", "код", "code", "repo", "репо", "файл", "file",
    "модул", "module", "render", "renderer", "shader", "three", "webgl",
    "webgpu", "audio", "cwt", "worklet", "basilaq", "панорам", "panning",
    "панорама", "gesture", "жест", "astra", "database", "db", "rag",
    "gemini", "mistral", "ws", "websocket", "hologram", "голограм",
    "tria", "debug", "bug", "fix", "semitone", "частот", "visualization",
    "аудиовиз", "визуализ"
)


def _run_async_tool_sync(coro):
    try:
        asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.run(coro)

    result = {"value": ""}
    error = {"value": None}

    def runner():
        try:
            result["value"] = asyncio.run(coro)
        except Exception as exc:
            error["value"] = exc

    thread = threading.Thread(target=runner, daemon=True)
    thread.start()
    thread.join()

    if error["value"] is not None:
        raise error["value"]

    return result["value"]


def search_tria_knowledge(query: str) -> str:
    """
    Поиск по базе знаний проекта (RAG). 
    Используйте этот инструмент ОБЯЗАТЕЛЬНО, если пользователь задает технические вопросы о коде, 
    архитектуре, API или специфике реализации проекта holograms.media.
    Аргумент query должен быть четким поисковым запросом на естественном языке.
    """
    try:
        return _run_async_tool_sync(tria_rag.get_relevant_context(query))
    except Exception as exc:
        logger.error(f"[TriaOrchestrator] search_tria_knowledge failed: {exc}")
        return ""

def search_gesture_memory(intent: str) -> str:
    """
    Поиск по памяти жестов и биометрических паттернов (SOMA/PULSE). 
    Используйте для ответов на вопросы о пластике, движениях и эмоциональном состоянии Триа.
    """
    # Placeholder для Фазы 20.5 (Мультимодальность)
    return "Gesture memory is currently being synchronized. No specific patterns found for this intent yet."


def _looks_technical(prompt: str, context: str = "") -> bool:
    haystack = f"{prompt}\n{context}".lower()
    return any(keyword in haystack for keyword in TECHNICAL_KEYWORDS)

class TriaOrchestrator:
    def __init__(self):
        # В Фазе 20.4 мы отказываемся от старой эвристической маршрутизации
        # Gemini 3 Flash теперь сам решает, когда вызывать инструменты (Supervisor Agent)
        self.tools = [search_tria_knowledge, search_gesture_memory]
        logger.info("TriaOrchestrator evolved to Supervisor Agent with Tool Calling.")

    async def stream_user_prompt(
        self,
        prompt: str,
        user_email: str = "",
        context: Optional[str] = None,
        user_id: str = "guest"
    ):
        """
        Pseudo-streaming Supervisor Agent.
        We resolve the full answer through the same tool-calling path as process_user_prompt
        and then yield it in chunks. This is more reliable than SDK streaming when tool
        execution is involved.
        """
        try:
            response_text = await self.process_user_prompt(
                prompt=prompt,
                context=context,
                user_email=user_email,
                user_id=user_id
            )

            if not (response_text or "").strip():
                yield "Не удалось сформировать ответ. Попробуйте уточнить запрос или отправить его еще раз."
                return

            chunk_size = 48
            for offset in range(0, len(response_text), chunk_size):
                yield response_text[offset:offset + chunk_size]
                await asyncio.sleep(0)
        except Exception as e:
            logger.error(f"[Orchestrator] stream_user_prompt error: {e}")
            yield f"[Tria Stream Error] {str(e)}"

    async def process_user_prompt(
        self, 
        prompt: str, 
        context: Optional[str] = None,
        user_email: str = "",
        user_id: str = "guest"
    ) -> str:
        """
        Supervisor Agent: Использует Gemini для анализа промпта и вызова инструментов.
        """
        is_developer = user_email in settings.DEV_USERS
        mode_label = "ГЛОБАЛЬНАЯ" if is_developer else "ПЕРСОНАЛЬНАЯ"
        conversation_context = (context or "").strip()
        
        system_instruction = (
            f"Ты Триа — AI-ассистент платформы holograms.media. "
            f"Сейчас ты в режиме: {mode_label} ТРИА. "
            f"Ты работаешь с {'разработчиком' if is_developer else 'пользователем'}. "
            f"Если вопрос требует технических деталей о коде, архитектуре или API — опирайся на контекст базы знаний, если он передан ниже. "
            f"Твои ответы должны учитывать динамический пульс BasilaQ-128 (адаптивная частота 24-240 Гц)."
        )
        
        try:
            rag_context = ""
            if _looks_technical(prompt, conversation_context):
                try:
                    rag_context = await tria_rag.get_relevant_context(prompt, limit=5, user_id=user_id)
                except Exception as exc:
                    logger.error(f"[TriaOrchestrator] proactive RAG failed: {exc}")

            prompt_sections = []
            if conversation_context:
                prompt_sections.append(
                    "Последние сообщения диалога:\n"
                    f"{conversation_context}"
                )
            if rag_context:
                prompt_sections.append(
                    "Контекст из базы знаний holograms.media:\n"
                    f"{rag_context}"
                )
            elif _looks_technical(prompt, conversation_context):
                prompt_sections.append(
                    "База знаний не вернула релевантный контекст. "
                    "Не выдумывай конкретные детали кода; если точного контекста нет, скажи об этом честно и дай максимально полезный общий ответ."
                )

            prompt_sections.append(f"Запрос пользователя:\n{prompt}")
            composed_prompt = "\n\n".join(prompt_sections)

            response_text = await get_gemini_response(
                prompt=composed_prompt,
                system_instruction=system_instruction,
                tools=None
            )
            return (response_text or "").strip()

        except Exception as e:
            logger.error(f"[Orchestrator] process_user_prompt error: {e}", exc_info=True)
            return f"[Tria] Ошибка оркестрации: {str(e)}"

# Глобальный экземпляр
orchestrator = TriaOrchestrator()
