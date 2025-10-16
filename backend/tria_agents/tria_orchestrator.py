# backend/tria_bots/tria_orchestrator.py
import logging
from typing import Dict, Any, List, Optional
import asyncio 

from backend.Tria.tria_rag_service import TriaRequest, TriaResponse, QueryClassifier
from backend.tria_bots.tria_agents import FrontendAgent, BackendAgent, DebugAgent, ArchitectureAgent, ProtocolAgent, AgentResponse
from backend.tria_bots.tria_context import ContextManager
from backend.tria_bots.live_code_analyzer import LiveCodeAnalyzer

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
        
        codebase_root = "/home/neurocoderz/holograms.media/" 
        self.code_analyzer = LiveCodeAnalyzer(self.context_manager, codebase_root)
        self.code_analyzer.start()

        logger.info("TriaOrchestrator initialized with agents, ContextManager, and LiveCodeAnalyzer.")

    async def process_user_prompt(self, prompt: str) -> str:
        """
        A simplified method to handle a direct string prompt, for use with the new API endpoint.
        This provides a simple entry point for direct user queries.
        """
        logger.info(f"Orchestrator: Processing simple prompt: '{prompt}'")
        
        # For now, we will use a simple echo response to test the pipeline.
        # In the future, we can route this to a default agent or use the RAG service directly.
        
        # TODO: Replace this with a call to the RAG service or a default agent.
        response_text = f"Tria received your prompt: '{prompt}'"
        
        return response_text

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
