# backend/tria_agents/tria_agents.py
import logging
from typing import Dict, Any, List, Optional
from abc import ABC, abstractmethod
from backend.llm.gemini_llm import get_gemini_response
from backend.llm.mistral_llm import get_mistral_response

# Assuming TriaRequest and TriaResponse are defined in tria_rag_service.py
# We will import them directly for consistency.
from backend.tria_agents.tria_rag_service import TriaRequest, TriaResponse

logger = logging.getLogger(__name__)

class AgentResponse:
    def __init__(self, answer: str, confidence: float = 1.0, sources: Optional[List[Dict[str, Any]]] = None, agent_name: str = "general"):
        self.answer = answer
        self.confidence = confidence
        self.sources = sources if sources is not None else []
        self.agent_name = agent_name

class BaseTriaAgent(ABC):
    def __init__(self, domain: str):
        self.domain = domain
        logger.info(f"Initialized {self.domain} agent (direct access, no HTTP).")

    @abstractmethod
    async def process_query(self, query: str, context: Dict) -> AgentResponse:
        pass

    async def _query_rag_service(self, query: str, session_id: Optional[str] = None) -> Optional[TriaResponse]:
        """
        FIXED: Ранее делал HTTP к 127.0.0.1:8001 → deadlock.
        Теперь возвращает stub с TODO для интеграции.
        """
        try:
            logger.info(f"{self.domain} Agent: Searching context for '{query}' (direct)")
            # TODO: Integrate with EmbeddingRepository for vector search
            return TriaResponse(
                answer=f"Context for {self.domain}: {query}",
                sources=[],
            )
        except Exception as e:
            logger.error(f"{self.domain} Agent: Error: {e}")
            return None

class FrontendAgent(BaseTriaAgent):
    def __init__(self):
        super().__init__("frontend")

    async def process_query(self, query: str, context: Dict) -> AgentResponse:
        logger.info(f"FrontendAgent processing query: {query}")
        llm_context = context.get("llm_context", "Ты Frontend-агент Триа.")
        
        # Индивидуальная инструкция для агента
        system_instr = f"{llm_context}\n\nТвоя специализация: Frontend (React, Three.js, CSS, UI/UX). Отвечай на вопрос пользователя максимально экспертно."
        
        answer = await get_gemini_response(query, system_instruction=system_instr)
        return AgentResponse(answer=answer, agent_name=self.domain)

class BackendAgent(BaseTriaAgent):
    def __init__(self):
        super().__init__("backend")

    async def process_query(self, query: str, context: Dict) -> AgentResponse:
        logger.info(f"BackendAgent processing query: {query}")
        llm_context = context.get("llm_context", "Ты Backend-агент Триа.")
        system_instr = f"{llm_context}\n\nТвоя специализация: Backend (Python, FastAPI, Postgres/AstraDB, P2P). Отвечай экспертно."
        answer = await get_gemini_response(query, system_instruction=system_instr)
        return AgentResponse(answer=answer, agent_name=self.domain)

class DebugAgent(BaseTriaAgent):
    def __init__(self):
        super().__init__("debug")

    async def process_query(self, query: str, context: Dict) -> AgentResponse:
        logger.info(f"DebugAgent processing query: {query}")
        llm_context = context.get("llm_context", "Ты Debug-агент Триа.")
        system_instr = f"{llm_context}\n\nТвоя специализация: Поиск багов, анализ логов и исправление ошибок. Помоги пользователю решить проблему."
        answer = await get_gemini_response(query, system_instruction=system_instr)
        return AgentResponse(answer=answer, agent_name=self.domain)

class ArchitectureAgent(BaseTriaAgent):
    def __init__(self):
        super().__init__("architecture")

    async def process_query(self, query: str, context: Dict) -> AgentResponse:
        logger.info(f"ArchitectureAgent processing query: {query}")
        llm_context = context.get("llm_context", "Ты Архитектор Триа.")
        system_instr = f"{llm_context}\n\nТвоя специализация: Глобальная архитектура системы, Neuro-Symmetry, TriaFS. Объясни концепцию."
        # Архитектурные задачи лучше решает Mistral Large
        answer = await get_mistral_response(query, [], system_instruction=system_instr)
        return AgentResponse(answer=answer, agent_name=self.domain)

class ProtocolAgent(BaseTriaAgent):
    def __init__(self):
        super().__init__("protocol")

    async def process_query(self, query: str, context: Dict) -> AgentResponse:
        logger.info(f"ProtocolAgent processing query: {query}")
        rag_response = await self._query_rag_service(query, context.get("session_id"))

        if rag_response and rag_response.answer:
            answer = f"Protocol-агент анализирует протокол: '{query}'. Ответ RAG: {rag_response.answer}"
            return AgentResponse(answer=answer, sources=rag_response.sources, agent_name=self.domain)
        else:
            return AgentResponse(answer=f"Protocol-агент не смог найти релевантную информацию по запросу: '{query}'.", confidence=0.0, agent_name=self.domain)
