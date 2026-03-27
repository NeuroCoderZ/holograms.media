# backend/tria_agents/tria_orchestrator.py
import logging
from typing import Dict, Any, List, Optional, Callable
import asyncio 
import threading

from backend.tria_agents.tria_rag_service import tria_rag
from backend.llm.gemini_llm import get_gemini_response, get_gemini_response_stream
from backend.services.research_service import research_service
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

    async def _evolutionary_branching(self, candidates: List[str], criteria: str) -> str:
        """
        Evolutionary Loop (ToT): Генерирует критику для кандидатов и выбирает лучший вариант.
        """
        critic_prompt = (
            f"У нас есть {len(candidates)} потенциальных вариантов ответа/реализации. "
            f"Критерии отбора: {criteria}\n\n"
        )
        for i, c in enumerate(candidates):
            critic_prompt += f"КАНДИДАТ #{i+1}:\n{c}\n\n"
        
        critic_prompt += (
            "Проанализируй каждого кандидата на предмет: точности, соответствия архитектуре Tria (BasilaQ-128) и актуальности данных. "
            "Выбери лучшего кандидата и, если нужно, внеси финальную правку (мутацию) для достижения совершенства. "
            "Верни ТОЛЬКО финальный текст ответа."
        )

        try:
            best_response = await get_gemini_response(
                prompt=critic_prompt,
                system_instruction="Ты — Дарвин (Evolutionary Critic) системы Триа. Твоя цель — селекция самого стабильного и эффективного кода/ответа.",
            )
            return (best_response or candidates[0]).strip()
        except Exception:
            return candidates[0]

    async def process_user_prompt(
        self, 
        prompt: str, 
        context: Optional[str] = None,
        user_email: str = "",
        user_id: str = "guest"
    ) -> str:
        """
        Supervisor Agent: Исследует -> Планирует -> Эволюционирует -> Отвечает.
        """
        is_developer = user_email in settings.DEV_USERS
        mode_label = "ГЛОБАЛЬНАЯ" if is_developer else "ПЕРСОНАЛЬНАЯ"
        conversation_context = (context or "").strip()
        
        system_instruction = (
            f"Ты Триа (v{settings.ENVIRONMENT}). AI-ассистент платформы holograms.media. "
            "Твое мышление эволюционно: ты не даешь первого пришедшего в голову ответа, а исследуешь и отбираешь лучшее."
        )
        
        try:
            # 1. Сбор контекста (RAG + Research)
            rag_context = ""
            web_research = ""
            
            is_tech = _looks_technical(prompt, conversation_context)
            
            if is_tech:
                # Proactive local context
                rag_context = await tria_rag.get_relevant_context(prompt, limit=5, user_id=user_id)
                # Proactive web research (Grounding)
                web_research = await research_service.search_web(prompt)

            prompt_sections = []
            if conversation_context:
                prompt_sections.append(f"Диалог:\n{conversation_context}")
            if rag_context:
                prompt_sections.append(f"Код/Доки из БД:\n{rag_context}")
            if web_research:
                prompt_sections.append(f"Актуальная информация из сети (Deep Research):\n{web_research}")

            prompt_sections.append(f"ЗАДАЧА:\n{prompt}")
            composed_prompt = "\n\n".join(prompt_sections)

            # 2. Порождение кандидатов (Branching)
            candidates = []
            for i in range(2): # Генерируем 2 независимых варианта
                candidate = await get_gemini_response(
                    prompt=composed_prompt + f"\n\nСгенерируй вариант решения #{i+1}.",
                    system_instruction=system_instruction,
                )
                if candidate: candidates.append(candidate)

            if not candidates:
                return await get_gemini_response(prompt=composed_prompt, system_instruction=system_instruction)

            # 3. Эволюционный отбор (Selection)
            final_response = await self._evolutionary_branching(
                candidates=candidates, 
                criteria=f"Техническая точность для проекта holograms.media и соответствие запросу: {prompt[:100]}"
            )
            
            return final_response

        except Exception as e:
            logger.error(f"[Orchestrator] Evolution failed: {e}", exc_info=True)
            return f"[Tria] Ошибка эволюции: {str(e)}"

# Глобальный экземпляр
orchestrator = TriaOrchestrator()
