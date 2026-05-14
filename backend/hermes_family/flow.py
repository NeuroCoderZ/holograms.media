"""
Hermes Family Flow — CrewAI Event-Driven DAG Orchestration
@start, @listen, @router for deterministic routing without cycles.
Semaphore(2) for Koyeb 512MB OOM protection.

Paradigm: Ручное переключение LLM → человеческий контроль.
CrewAI → оркестратор, а не автопилот.
"""

import asyncio
import logging
from typing import Optional
from crewai import Crew, Process, Task
from crewai.flow.flow import Flow, and_, or_

from backend.hermes_family.agents import (
    hermes_prime, hermes_codegen, hermes_reviewer,
    hermes_gesture, hermes_tria,
    _llm_main, _llm_sub,
)
from backend.hermes_family.models import DiffPatchSet, ReviewResult
from backend.hermes_family.token_ledger import get_token_ledger

logger = logging.getLogger(__name__)

# Semaphore to limit concurrent CrewAI tasks (Koyeb 512MB OOM protection)
_semaphore = asyncio.Semaphore(2)


class HermesState(dict):
    """Flow state — simple dict subclass for CrewAI Flow compatibility"""
    def __init__(self):
        super().__init__()
        self["user_request"] = ""
        self["intent"] = ""
        self["patches"] = None
        self["review_result"] = None
        self["deploy_status"] = "pending"
        self["hitl_required"] = False
        self["hitl_patch_id"] = None

    @property
    def user_request(self) -> str:
        return self.get("user_request", "")

    @user_request.setter
    def user_request(self, value: str):
        self["user_request"] = value

    @property
    def intent(self) -> str:
        return self.get("intent", "")

    @intent.setter
    def intent(self, value: str):
        self["intent"] = value


class HermesFamilyFlow(Flow[HermesState]):
    """
    Event-driven DAG for Hermes Family orchestration.

    Flow:
      receive_request → classify_intent → route_intent
        ├── code_generation → plan_generation → finalize
        ├── code_review → review_parallel → finalize
        ├── gesture_optimization → finalize
        └── general_query → finalize

    Constraints:
      - Semaphore(2): max 2 concurrent tasks (Koyeb 512MB)
      - Planning Mode: plan-then-execute with cheap LLM
      - HITL: Telegram webhook for human approval on risky patches
      - Token Ledger: track usage, alert at 75%/90%
    """

    @start()
    def receive_request(self):
        """Entry point — store user request in state"""
        logger.info(f"HermesFamilyFlow: received request: {self.state.user_request[:100]}")
        return self.state.user_request

    @listen(receive_request)
    def classify_intent(self, request: str) -> str:
        """Route: code_generation | code_review | gesture | memory | general"""
        request_lower = request.lower()

        code_gen_kw = ["generate", "создай", "напиши", "add feature", "implement", "сгенерируй"]
        code_rev_kw = ["review", "проверь", "аудит", "audit", "security", "безопасность"]
        gesture_kw = ["gesture", "жест", "mediapipe", "chord", "chuck_ms", "pipewire"]
        memory_kw = ["memory", "rag", "astra", "recall", "помни", "embedding"]

        if any(kw in request_lower for kw in code_gen_kw):
            intent = "code_generation"
        elif any(kw in request_lower for kw in code_rev_kw):
            intent = "code_review"
        elif any(kw in request_lower for kw in gesture_kw):
            intent = "gesture_optimization"
        elif any(kw in request_lower for kw in memory_kw):
            intent = "memory_integration"
        else:
            intent = "general"

        self.state.intent = intent
        logger.info(f"HermesFamilyFlow: classified intent = {intent}")
        return intent

    @router(classify_intent)
    def route_intent(self, intent: str):
        """Route to appropriate branch based on classified intent"""
        return intent

    # === Branch: Code Generation (plan-then-execute) ===

    @listen("code_generation")
    async def plan_generation(self):
        """Planning Mode: decompose task, then execute with Hermes-CodeGen"""
        async with _semaphore:
            ledger = get_token_ledger()

            # Planning phase (cheap LLM)
            planning_crew = Crew(
                agents=[hermes_prime, hermes_codegen],
                process=Process.hierarchical,
                manager_llm=_llm_main,
                planning=True,
                planning_llm="mistral/mistral-small-latest",
                verbose=True,
            )

            codegen_task = Task(
                description=(
                    "Сгенерировать дифф-патчи для: {request}\n\n"
                    "ПРАВИЛА:\n"
                    "1. Только дифф-патчи (old_string → new_string)\n"
                    "2. EMBED_DIM=3072 НЕИЗМЕНЕН\n"
                    "3. Никаких полных перезаписей файлов\n"
                    "4. output_pydantic=DiffPatchSet"
                ),
                agent=hermes_codegen,
                expected_output="DiffPatchSet with patches list",
            )

            try:
                result = planning_crew.kickoff(
                    inputs={"request": self.state.user_request}
                )
                # Record token usage
                if hasattr(result, 'token_usage'):
                    ledger.record("mistral-medium-3.5", 0, result.token_usage)

                self.state["patches"] = result.raw
                self.state["hitl_required"] = True
                logger.info("HermesFamilyFlow: code generation complete, HITL required")
                return result.raw

            except Exception as e:
                logger.error(f"HermesFamilyFlow: code generation failed: {e}")
                self.state["deploy_status"] = "error"
                return str(e)

    # === Branch: Code Review (parallel: security + quality) ===

    @listen("code_review")
    async def review_code(self):
        """Security + quality review with AST validation"""
        async with _semaphore:
            review_task = Task(
                description=(
                    "Проверить код на безопасность и качество: {request}\n\n"
                    "Проверки:\n"
                    "1. AST-валидация (python -c 'import ast; ast.parse(...)')\n"
                    "2. EMBED_DIM=3072 compliance\n"
                    "3. Prompt injection patterns\n"
                    "4. No exec()/os.system()/subprocess\n"
                    "5. output_pydantic=ReviewResult"
                ),
                agent=hermes_reviewer,
                expected_output="ReviewResult with approval status",
            )

            review_crew = Crew(
                agents=[hermes_reviewer],
                tasks=[review_task],
                process=Process.sequential,
                verbose=True,
            )

            try:
                result = review_crew.kickoff(
                    inputs={"request": self.state.user_request}
                )
                self.state["review_result"] = result.raw
                logger.info("HermesFamilyFlow: code review complete")
                return result.raw

            except Exception as e:
                logger.error(f"HermesFamilyFlow: code review failed: {e}")
                return str(e)

    # === Branch: Gesture Optimization ===

    @listen("gesture_optimization")
    async def optimize_gesture(self):
        """Gesture pipeline optimization"""
        async with _semaphore:
            gesture_task = Task(
                description=(
                    "Оптимизировать жестовый пайплайн: {request}\n\n"
                    "Контекст:\n"
                    "CHUNK_MS=200, MEDIAPIPE_PTS=21, ACCEPT_LOCAL=0.85\n"
                    "ACCEPT_CLOUD=0.65, EARLY_TRIGGER >= 0.85 на 300-500мс\n"
                    "CLOUD_COOLDOWN_MS=300"
                ),
                agent=hermes_gesture,
                expected_output="GestureAnalysis with recommendations",
            )

            crew = Crew(
                agents=[hermes_gesture],
                tasks=[gesture_task],
                process=Process.sequential,
                verbose=True,
            )

            try:
                result = crew.kickoff(
                    inputs={"request": self.state.user_request}
                )
                logger.info("HermesFamilyFlow: gesture optimization complete")
                return result.raw

            except Exception as e:
                logger.error(f"HermesFamilyFlow: gesture optimization failed: {e}")
                return str(e)

    # === Branch: Memory Integration ===

    @listen("memory_integration")
    async def integrate_memory(self):
        """AstraDB/RAG integration task"""
        async with _semaphore:
            memory_task = Task(
                description=(
                    "Интегрировать с AstraDB/RAG: {request}\n\n"
                    "Контекст:\n"
                    "EMBED_DIM=3072, gemini-embedding-2-preview\n"
                    "Collections: tria_knowledge_gemini, neuroescrow_codebase_3072\n"
                    "Personal Tria WINS over Global Tria"
                ),
                agent=hermes_tria,
                expected_output="MemoryResult with context details",
            )

            crew = Crew(
                agents=[hermes_tria],
                tasks=[memory_task],
                process=Process.sequential,
                verbose=True,
            )

            try:
                result = crew.kickoff(
                    inputs={"request": self.state.user_request}
                )
                logger.info("HermesFamilyFlow: memory integration complete")
                return result.raw

            except Exception as e:
                logger.error(f"HermesFamilyFlow: memory integration failed: {e}")
                return str(e)

    # === Branch: General Query ===

    @listen("general")
    async def general_query(self):
        """General query handled by Hermes-Prime"""
        async with _semaphore:
            general_task = Task(
                description="Ответить на запрос: {request}",
                agent=hermes_prime,
                expected_output="Text response with context",
            )

            crew = Crew(
                agents=[hermes_prime],
                tasks=[general_task],
                process=Process.sequential,
                verbose=True,
            )

            try:
                result = crew.kickoff(
                    inputs={"request": self.state.user_request}
                )
                return result.raw

            except Exception as e:
                logger.error(f"HermesFamilyFlow: general query failed: {e}")
                return str(e)

    # === Fan-in: Finalize ===

    @listen(or_(
        plan_generation,
        review_code,
        optimize_gesture,
        integrate_memory,
        general_query,
    ))
    def finalize(self, result):
        """Aggregate results and set deploy status"""
        self.state["deploy_status"] = "ready"
        logger.info(f"HermesFamilyFlow: finalized. Deploy status: {self.state['deploy_status']}")
        return {
            "result": result,
            "intent": self.state.intent,
            "deploy_status": self.state["deploy_status"],
            "hitl_required": self.state.get("hitl_required", False),
        }
