# backend/tria_agents/tria_orchestrator.py
import logging
from typing import Dict, Any, List, Optional
import asyncio 

from backend.tria_agents.tria_rag_service import TriaRequest, TriaResponse, QueryClassifier
from backend.tria_agents.tria_agents import FrontendAgent, BackendAgent, DebugAgent, ArchitectureAgent, ProtocolAgent, AgentResponse
from backend.tria_agents.tria_context import ContextManager
from backend.tria_agents.live_code_analyzer import LiveCodeAnalyzer

logger = logging.getLogger(__name__)

class AgentRouter:
    def __init__(self, classifier: QueryClassifier):
        self.classifier = classifier

    def route(self, query: str, context: Dict) -> Dict[str, Any]:
        query_type, score = self.classifier.classify(query)
        if query_type == 'general':
            return {'primary_agent': 'architecture', 'multi_agent': False}
        return {'primary_agent': query_type, 'multi_agent': False}

class TriaOrchestrator:
    def __init__(self):
        self.classifier = QueryClassifier()
        self.router = AgentRouter(self.classifier)
        self.agents = {
            'frontend': FrontendAgent(),
            'backend': BackendAgent(),
            'debug': DebugAgent(),
            'architecture': ArchitectureAgent(),
            'protocol': ProtocolAgent(),
        }
        self.context_manager = ContextManager()
        
        import os
        codebase_root = os.environ.get("CODEBASE_ROOT", "/app")
        try:
            self.code_analyzer = LiveCodeAnalyzer(self.context_manager, codebase_root)
            self.code_analyzer.start()
            logger.info(f"[Orchestrator] LiveCodeAnalyzer started at '{codebase_root}'")
        except Exception as e:
            logger.warning(f"[Orchestrator] LiveCodeAnalyzer failed to start: {e}. Continuing without it.")
            self.code_analyzer = None

        logger.info("TriaOrchestrator initialized with agents, ContextManager, and LiveCodeAnalyzer.")

    async def process_user_prompt(
        self, 
        prompt: str, 
        context: Optional[str] = None,
        user_email: str = ""
    ) -> str:
        """
        Routes a direct user prompt to the best available agent.
        Supports Role-Based Routing (Global vs Personal Tria).
        """
        from backend.core.config import settings
        
        # Determine user role
        is_developer = user_email in settings.DEV_USERS
        mode_label = "ГЛОБАЛЬНАЯ" if is_developer else "ПЕРСОНАЛЬНАЯ"
        
        role_context = (
            f"[РЕЖИМ: {mode_label} ТРИА. Ты работаешь с {'разработчиком' if is_developer else 'пользователем'}. "
            f"{'Отвечай технически, с полным доступом к архитектуре.' if is_developer else 'Отвечай как персональный AI-ассистент.'}]"
        )
        
        full_context = f"{role_context}\n\n{context or ''}"
        
        display_prompt = str(prompt)[:80]
        logger.info(f"[Orchestrator] Routing prompt ({mode_label}): '{display_prompt}...'")
        
        try:
            # 1. Classify the query to pick the right agent
            query_type, score = self.classifier.classify(prompt)
            logger.info(f"[Orchestrator] Classified as '{query_type}' (score={score:.2f})")

            # 2. Pick agent (fallback to 'architecture' if not found)
            agent = self.agents.get(query_type) or self.agents.get('architecture')
            if not agent:
                return "[Tria] Нет доступных агентов для обработки запроса."

            # 3. Process via agent
            agent_response: AgentResponse = await agent.process_query(
                prompt,
                {"source": "direct_prompt", "session_id": None, "llm_context": full_context}
            )
            return agent_response.answer

        except Exception as e:
            logger.error(f"[Orchestrator] process_user_prompt error: {e}", exc_info=True)
            return f"[Tria] Ошибка обработки: {str(e)}"

    async def process_request(self, request: TriaRequest) -> TriaResponse:
        logger.info(f"Orchestrator: Processing request for query: '{request.query}'")
        
        session_context_obj = self.context_manager.get_context(request.session_id) if request.session_id else None
        session_context_dict = session_context_obj.__dict__ if session_context_obj else {}

        routing_decision = self.router.route(request.query, session_context_dict)

        primary_agent_name = routing_decision['primary_agent']
        agent = self.agents.get(primary_agent_name)

        if not agent:
            logger.warning(f"Orchestrator: No agent found for type: {primary_agent_name}")
            return TriaResponse(answer=f"Извините, я не могу обработать запрос по теме '{primary_agent_name}'.", confidence=0.0, agent_chain=[primary_agent_name])

        agent_response: AgentResponse = await agent.process_query(request.query, {"session_id": request.session_id, **session_context_dict})

        if request.session_id and session_context_obj:
            asyncio.create_task(self.context_manager.update_session_context(
                request.session_id,
                request.query,
                agent_response.answer,
                agent_response.agent_name,
                agent_response.sources
            ))

        return TriaResponse(
            answer=agent_response.answer,
            confidence=agent_response.confidence,
            sources=agent_response.sources,
            agent_chain=[agent_response.agent_name],
            session_context=session_context_dict,
            suggestions=[],
            processing_time=0.0
        )
