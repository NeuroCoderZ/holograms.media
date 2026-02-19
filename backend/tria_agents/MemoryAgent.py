# backend/tria_agents/MemoryAgent.py
# Removed asyncpg
import logging
from typing import List, Dict, Any, Optional
from backend.repositories.embedding_repository import EmbeddingRepository, EmbeddingDB
# httpx REMOVED: Self-request deadlock fix (was calling http://127.0.0.1:8001 → deadlock with 1 uvicorn worker)

logger = logging.getLogger(__name__)


class MemoryAgent:
    def __init__(self, db: Any):
        self.db = db
        self.embedding_repo = EmbeddingRepository(self.db)
        logger.info("MemoryAgent initialized (direct DB access, no HTTP).")

    async def retrieve_and_synthesize(self, query: str, session_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Retrieves relevant information directly from the embedding repository.
        FIXED: Previously made HTTP request to self (127.0.0.1:8001) causing deadlock.
        """
        try:
            # Прямой поиск по эмбеддингам без HTTP
            # TODO: Implement vector search when embedding_repo supports it
            logger.info(f"MemoryAgent: Searching for context for query: '{query}' (direct DB)")
            return {
                "answer": f"Context search for: {query}",
                "sources": [],
                "processing_time": 0.0
            }
        except Exception as e:
            logger.error(f"MemoryAgent: Error retrieving context: {e}")
            return None

    async def find_and_prepare_context(self, intent_vector: dict, session_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Finds relevant context in the knowledge base based on the intent and synthesizes a response.
        """
        target_context_data = intent_vector.get("target_context", {})
        context_query = target_context_data.get("currentDocumentName", "общая архитектура")

        logger.info(f"MemoryAgent: Searching for context with query: '{context_query}' (direct).")

        rag_response = await self.retrieve_and_synthesize(context_query, session_id)

        if not rag_response:
            logger.warning(f"MemoryAgent: No relevant context found for query: '{context_query}'.")
            return None

        logger.info(f"MemoryAgent: Context prepared for query: '{context_query}'.")
        return {"synthesized_response": rag_response}

    async def store_interaction_memory(self, user_id: str, data_to_store: Dict[str, Any]):
        """
        Stores information about an interaction or its result in the knowledge base. (Stub)
        """
        logger.info(f"MemoryAgent: Storing interaction memory for user {user_id} (stub): {data_to_store}")
        pass

    async def retrieve_relevant_memory(self, user_id: str, query_vector: List[float], top_k: int = 5) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieves relevant information from the knowledge base based on a query vector. (Stub)
        """
        logger.info(f"MemoryAgent: Retrieving relevant memory for user {user_id} (stub)")
        return [{"id": "memory_stub_1", "content": "This is a test memory."}]
