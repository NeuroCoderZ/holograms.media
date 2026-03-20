# backend/tria_agents/tria_orchestrator.py
import logging
from typing import Dict, Any, List, Optional, Callable
import asyncio 

from backend.tria_agents.tria_rag_service import tria_rag
from backend.llm.gemini_llm import get_gemini_response
from backend.core.config import settings

logger = logging.getLogger(__name__)
def search_tria_knowledge(query: str) -> str:
    """
    Поиск по базе знаний проекта (RAG). 
    Используйте этот инструмент ОБЯЗАТЕЛЬНО, если пользователь задает технические вопросы о коде, 
    архитектуре, API или специфике реализации проекта holograms.media.
    Аргумент query должен быть четким поисковым запросом на естественном языке.
    """
    # Вызов реального RAG сервиса. 
    # В контексте Supervisor-агента мы оборачиваем асинхронный вызов.
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    return loop.run_until_complete(tria_rag.get_relevant_context(query))

def search_gesture_memory(intent: str) -> str:
    """
    Поиск по памяти жестов и биометрических паттернов (SOMA/PULSE). 
    Используйте для ответов на вопросы о пластике, движениях и эмоциональном состоянии Триа.
    """
    # Placeholder для Фазы 20.5 (Мультимодальность)
    return "Gesture memory is currently being synchronized. No specific patterns found for this intent yet."

class TriaOrchestrator:
    def __init__(self):
        # В Фазе 20.4 мы отказываемся от старой эвристической маршрутизации
        # Gemini 3 Flash теперь сам решает, когда вызывать инструменты (Supervisor Agent)
        self.tools = [search_tria_knowledge, search_gesture_memory]
        logger.info("TriaOrchestrator evolved to Supervisor Agent with Tool Calling.")

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
        
        system_instruction = (
            f"Ты Триа — AI-ассистент платформы holograms.media. "
            f"Сейчас ты в режиме: {mode_label} ТРИА. "
            f"Ты работаешь с {'разработчиком' if is_developer else 'пользователем'}. "
            f"У тебя есть доступ к базе знаний проекта через инструмент search_tria_knowledge. "
            f"Если вопрос требует технических деталей о коде, архитектуре или API — ОБЯЗАТЕЛЬНО вызывай этот инструмент. "
            f"Твои ответы должны учитывать динамический пульс BasilaQ-128 (адаптивная частота 24-240 Гц)."
        )
        
        try:
            # Вызываем Gemini с поддержкой инструментов
            # В google-genai SDK 1.x функции в tools вызываются автоматически
            response_text = await get_gemini_response(
                prompt=prompt,
                system_instruction=system_instruction,
                tools=self.tools
            )
            return response_text

        except Exception as e:
            logger.error(f"[Orchestrator] process_user_prompt error: {e}", exc_info=True)
            return f"[Tria] Ошибка оркестрации: {str(e)}"

# Глобальный экземпляр
orchestrator = TriaOrchestrator()
