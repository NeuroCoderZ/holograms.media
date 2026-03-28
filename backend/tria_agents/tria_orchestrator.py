# backend/tria_agents/tria_orchestrator.py
import logging
from typing import Dict, Any, List, Optional, AsyncGenerator
import asyncio 

from backend.tria_agents.tria_rag_service import tria_rag
from backend.llm.gemini_llm import get_gemini_response
from backend.tria_agents.skill_router import get_relevant_skills
from backend.tria_agents.meta_agent import MetaInstructionService
from backend.core.config import settings

logger = logging.getLogger(__name__)

# Model Constants v3.0
MAIN_MODEL = 'gemini-3-flash-preview'
SUB_MODEL = 'gemini-3.1-flash-lite-preview'

class TriaOrchestrator:
    def __init__(self):
        self.meta_service = MetaInstructionService()
        logger.info(f"TriaOrchestrator v3.0 initialized with {MAIN_MODEL} / {SUB_MODEL}")

    async def _get_subagent_context(self, prompt: str, user_id: str) -> str:
        """
        Recursive RAG & Skill Routing via Subagent.
        """
        # Step 1: Extract keywords and intent
        extract_prompt = (
            f"Analyze the user query: '{prompt}'.\n"
            "Extract 3-5 technical keywords for RAG search. "
            "Return keywords separated by commas."
        )
        keywords_str = await get_gemini_response(
            prompt=extract_prompt,
            system_instruction="You are Tria Subagent (Research). Focus on technical keywords.",
            model_id=SUB_MODEL
        )
        
        # Step 2: Parallel RAG & Skills
        keywords = [k.strip() for k in keywords_str.split(',')]
        rag_results = await asyncio.gather(*[
            tria_rag.get_relevant_context(kw, limit=3, user_id=user_id) 
            for kw in keywords[:3]
        ])
        
        skills_context = get_relevant_skills(prompt + " " + keywords_str)
        
        # Step 3: Synthesis
        context_body = "\n---\n".join(set(filter(None, rag_results)))
        return f"{skills_context}\n\n### Research Findings:\n{context_body}"

    async def stream_user_prompt(
        self,
        prompt: str,
        user_email: str = "",
        context: Optional[str] = None,
        user_id: str = "guest"
    ) -> AsyncGenerator[str, None]:
        """
        Streaming Orchestrator with Thinking UI markers.
        """
        try:
            # Stage 1: Research
            yield "[[THINKING:RESEARCH]]"
            research_pack = await self._get_subagent_context(prompt, user_id)
            await asyncio.sleep(0.5) # Sim for UI visibility

            # Stage 2: Synthesis (Darwin Critic Branching)
            yield "[[THINKING:SYNTHESIS]]"
            
            system_instruction = await self.meta_service.get_instruction("main")
            if not system_instruction:
                system_instruction = (
                    f"Ты Триа (v{settings.ENVIRONMENT}). AI-ассистент платформы holograms.media. "
                    "Используй предоставленный контекст исследования для точных ответов."
                )

            # Generate two candidates in parallel
            candidate_prompts = [
                f"Context:\n{research_pack}\n\nTask: {prompt}\nVariant A: Elaborate and technical.",
                f"Context:\n{research_pack}\n\nTask: {prompt}\nVariant B: Concise and direct."
            ]
            
            candidates = await asyncio.gather(*[
                get_gemini_response(p, system_instruction=system_instruction, model_id=MAIN_MODEL)
                for p in candidate_prompts
            ])

            # Stage 3: Selection (Darwin Critic)
            yield "[[THINKING:SELECTION]]"
            
            critic_prompt = (
                f"User requested: '{prompt}'\n\n"
                f"Candidate 1: {candidates[0]}\n\n"
                f"Candidate 2: {candidates[1]}\n\n"
                "Pick the best one, improve it if needed, and return the final response."
            )
            
            final_response = await get_gemini_response(
                prompt=critic_prompt,
                system_instruction="You are Darwin Critic. Select the most accurate and safe response.",
                model_id=SUB_MODEL
            )

            # Final Output
            chunk_size = 64
            for i in range(0, len(final_response), chunk_size):
                yield final_response[i:i+chunk_size]
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
