# backend/tria_agents/tria_orchestrator.py
import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
import asyncio

from backend.tria_agents.tria_rag_service import tria_rag
from backend.llm.gemini_llm import get_gemini_response
from backend.llm.mistral_llm import get_mistral_response
from backend.tria_agents.skill_router import get_relevant_skills
from backend.tria_agents.meta_agent import MetaInstructionService
from backend.core.config import settings

logger = logging.getLogger(__name__)

# Model Constants v3.0
# Gemini stack
GEMINI_MAIN = "gemini-3-flash-preview"
GEMINI_SUB = "gemini-3.1-flash-lite-preview"
# Mistral stack (алиасы на latest версии)
MISTRAL_MAIN = "mistral-large-latest"
MISTRAL_SUB = "mistral-small-latest"


async def _mistral_fallback(prompt: str, system_instruction: str) -> str:
    """Fallback на Mistral при 429 от Gemini."""
    try:
        from backend.llm.mistral_llm import get_mistral_response

        return await get_mistral_response(
            user_message=prompt,
            history=[],
            system_instruction=system_instruction,
            model_id=MISTRAL_MAIN,
        )
    except Exception as e:
        logger.error(f"Mistral fallback failed: {e}")
        return f"[Mistral Fallback Error] {str(e)}"


class TriaOrchestrator:
    def __init__(self):
        self.meta_service = MetaInstructionService()
        logger.info(
            f"TriaOrchestrator v3.0 initialized with Gemini ({GEMINI_MAIN}/{GEMINI_SUB}) and Mistral ({MISTRAL_MAIN}/{MISTRAL_SUB})"
        )

    async def _get_subagent_context(
        self,
        prompt: str,
        user_id: str,
        history: Optional[List[Dict]] = None,
        model_stack: str = "gemini",
    ) -> str:
        """
        Recursive RAG, Skill Routing & Situational Web Search via Subagent.
        model_stack: 'gemini' or 'mistral'
        """
        # Step 1: Analyze intent and check if web search is needed
        history_str = "\n".join(
            [f"{m['role']}: {m['content']}" for m in (history or [])[-5:]]
        )

        analysis_prompt = (
            f"History:\n{history_str}\n\n"
            f"Current Query: '{prompt}'\n"
            "1. Extract 3-5 technical keywords for RAG search (comma-separated).\n"
            "2. Determine if web search is needed for current events or facts beyond Jan 2025. "
            "Return 'SEARCH: TRUE' or 'SEARCH: FALSE'.\n"
            "Format: Keywords: k1, k2 | Search: TRUE/FALSE"
        )

        sub_model = GEMINI_SUB if model_stack == "gemini" else MISTRAL_SUB
        get_response = (
            get_gemini_response if model_stack == "gemini" else get_mistral_response
        )

        analysis_res = await get_response(
            prompt=analysis_prompt,
            system_instruction="You are Tria Subagent (Analyst). Determine keywords and search necessity.",
            model_id=sub_model,
        )

        search_needed = "SEARCH: TRUE" in analysis_res.upper()
        keywords_part = analysis_res.split("|")[0].replace("Keywords:", "").strip()
        keywords = [k.strip() for k in keywords_part.split(",")]

        # Step 2: Parallel RAG & Skills & optional Search
        tasks = [
            tria_rag.get_relevant_context(kw, limit=3, user_id=user_id)
            for kw in keywords[:3]
        ]
        rag_results = await asyncio.gather(*tasks)

        skills_context = get_relevant_skills(prompt + " " + analysis_res)

        web_context = ""
        if search_needed:
            # We use Gemini's built-in grounding for 'web search' stage in the main generator,
            # but for subagent context we can note it.
            web_context = "\n[Note: Web search recommended for this query]"

        # Step 3: Synthesis
        context_body = "\n---\n".join(set(filter(None, rag_results)))
        return (
            f"{skills_context}\n\n### Research Findings:\n{context_body}{web_context}"
        )

    async def stream_user_prompt(
        self,
        prompt: str,
        user_email: str = "",
        history: Optional[List[Dict]] = None,
        user_id: str = "guest",
        ui_context: str = "",
        context: str = "",  # LLM_CONTEXT from tria_commands
    ) -> AsyncGenerator[str, None]:
        """
        Streaming Orchestrator with Thinking UI markers and History.
        """
        try:
            # Determine model stack from selected_model in context
            # If context contains 'mistral', use Mistral stack
            use_mistral = context and "mistral" in context.lower()
            model_stack = "mistral" if use_mistral else "gemini"
            main_model = MISTRAL_MAIN if use_mistral else GEMINI_MAIN
            sub_model = MISTRAL_SUB if use_mistral else GEMINI_SUB
            get_response = get_mistral_response if use_mistral else get_gemini_response

            logger.info(f"[Orchestrator] Using {model_stack} stack")

            # Stage 1: Research
            yield "[[THINKING:RESEARCH]]"
            research_pack = await self._get_subagent_context(
                prompt, user_id, history, model_stack
            )

            # Check if web search was recommended
            use_grounding = "[Note: Web search recommended]" in research_pack
            if use_grounding:
                yield "[[THINKING:GROUNDING]]"
                await asyncio.sleep(0.5)

            # Stage 2: Synthesis (Darwin Critic Branching)
            yield "[[THINKING:SYNTHESIS]]"

            system_instruction = await self.meta_service.get_instruction("main")
            if not system_instruction:
                system_instruction = (
                    f"Ты Триа (v{settings.ENVIRONMENT}). AI-ассистент платформы holograms.media. "
                    "Используй предоставленный контекст исследования для точных ответов."
                )

            # Generate two candidates in parallel with history context
            history_ctx = "\n".join(
                [f"{m['role']}: {m['content']}" for m in (history or [])[-10:]]
            )

            # Добавляем UI Snapshot если он есть (v0.20 GA B-5)
            ui_snippet = (
                f"\n\nUI Snapshot (Front-end context):\n{ui_context}"
                if ui_context
                else ""
            )

            # OPTIMIZATION v3.1: Single candidate mode (Free Tier friendly)
            # Используем один вызов вместо двух параллельных для экономии API
            use_single_candidate = True  # Включить для Free Tier

            if use_single_candidate:
                # Stage 2a: Single generation (1 API call)
                single_prompt = f"History:\n{history_ctx}\n\nContext:\n{research_pack}{ui_snippet}\n\nTask: {prompt}\nProvide a clear, helpful response."

                candidates = [
                    await get_response(
                        single_prompt,
                        system_instruction=system_instruction,
                        model_id=main_model,
                    )
                ]
                final_response = candidates[0]
            else:
                # Stage 2b: Dual candidate mode (2 API calls)
                candidate_prompts = [
                    f"History:\n{history_ctx}\n\nContext:\n{research_pack}{ui_snippet}\n\nTask: {prompt}\nVariant A: Elaborate and technical.",
                    f"History:\n{history_ctx}\n\nContext:\n{research_pack}{ui_snippet}\n\nTask: {prompt}\nVariant B: Concise and direct.",
                ]

                candidates = await asyncio.gather(
                    *[
                        get_response(
                            p,
                            system_instruction=system_instruction,
                            model_id=main_model,
                        )
                        for p in candidate_prompts
                    ],
                    return_exceptions=True,
                )

            # Fallback: если модель 429 — переключаемся на альтернативный стек
            # OPTIMIZATION: Только для dual candidate mode
            if not use_single_candidate:
                for idx, c in enumerate(candidates):
                    if isinstance(c, Exception) and (
                        "429" in str(c) or "RESOURCE_EXHAUSTED" in str(c)
                    ):
                        fallback_model = (
                            MISTRAL_MAIN if model_stack == "gemini" else GEMINI_MAIN
                        )
                        fallback_fn = (
                            get_mistral_response
                            if model_stack == "gemini"
                            else get_gemini_response
                        )
                        logger.warning(
                            f"{model_stack} 429: Switching to {'Mistral' if model_stack == 'gemini' else 'Gemini'}"
                        )
                        candidates[idx] = await fallback_fn(
                            prompt=candidate_prompts[idx],
                            system_instruction=system_instruction,
                            model_id=fallback_model,
                        )
                    elif isinstance(c, Exception):
                        candidates[idx] = f"[Error] {str(c)}"

            # Stage 3: Selection (Darwin Critic) - Hidden from UI stream
            # OPTIMIZATION v3.1: Пропускаем Darwin Critic если используем один кандидат (Free Tier)
            if use_single_candidate:
                final_response = (
                    candidates[0]
                    if candidates
                    else "Триа не смогла сформировать ответ."
                )
            else:
                # Dual candidate mode: выбираем лучший через Darwin Critic
                # yield "[[THINKING:SELECTION]]" # REMOVED per user request

                critic_prompt = (
                    f"User requested: '{prompt}'\n\n"
                    f"Candidate 1: {candidates[0]}\n\n"
                    f"Candidate 2: {candidates[1]}\n\n"
                    "INSTRUCTIONS:\n"
                    "1. Pick the best response, merge or improve if necessary.\n"
                    "2. RETURN ONLY THE FINAL CLEAN RESPONSE TEXT.\n"
                    "3. DO NOT include any labels like 'Candidate 1', 'Selection', or any justification/reasoning.\n"
                    "4. Your output must be ready to show directly to the end user."
                )

                final_response = await get_response(
                    prompt=critic_prompt,
                    system_instruction="You are Darwin Critic. Return ONLY the final user-facing response. NO thinking tags, NO reasoning.",
                    model_id=sub_model,
                )

                # Fallback: если Darwin Critic вернул 429 — пробуем Mistral
                if isinstance(final_response, Exception) and (
                    "429" in str(final_response)
                    or "RESOURCE_EXHAUSTED" in str(final_response)
                ):
                    logger.warning(
                        f"Sub-model {sub_model} 429: Falling back to Mistral"
                    )
                    final_response = await get_mistral_response(
                        prompt=critic_prompt,
                        system_instruction="You are Darwin Critic. Return ONLY the final user-facing response.",
                        model_id=MISTRAL_MAIN,
                    )

                # Fallback: если Darwin Critic вернул пустой ответ или Exception
                response_text = (
                    final_response
                    if isinstance(final_response, str)
                    else str(final_response)
                )
                if not response_text.strip():
                    logger.warning(
                        "Darwin Critic returned empty response, using best candidate"
                    )
                    best = None
                    for c in candidates:
                        if c and not isinstance(c, Exception) and str(c).strip():
                            best = str(c)
                            break
                    final_response = (
                        best
                        or "Триа не смогла сформировать ответ. Попробуйте переформулировать запрос или повторите позже."
                    )

            # Final Output (Streaming)
            response_text = (
                final_response
                if isinstance(final_response, str)
                else str(final_response)
            )
            chunk_size = 64
            for i in range(0, len(response_text), chunk_size):
                yield response_text[i : i + chunk_size]
                await asyncio.sleep(0.01)

        except Exception as e:
            logger.error(f"[Orchestrator v3] Error: {e}", exc_info=True)
            yield f"[Tria Error] {str(e)}"

    async def process_user_prompt(self, prompt: str, **kwargs) -> str:
        """Compatibility wrapper."""
        full_text = ""
        async for chunk in self.stream_user_prompt(prompt, **kwargs):
            if not chunk or chunk.startswith("[[THINKING:"):
                continue
            full_text += chunk
        return full_text


# Singleton
orchestrator = TriaOrchestrator()
