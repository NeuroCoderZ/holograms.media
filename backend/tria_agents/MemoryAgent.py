# backend/tria_agents/MemoryAgent.py
# Removed asyncpg
import logging
from typing import List, Dict, Any, Optional
from backend.repositories.embedding_repository import EmbeddingRepository, EmbeddingDB
import httpx # NEW IMPORT
import json # NEW IMPORT

logger = logging.getLogger(__name__)

# URL of the Tria RAG Service
RAG_SERVICE_URL = "http://127.0.0.1:8001/query" # Updated to /query endpoint

class MemoryAgent:
    def __init__(self, db: Any):
        self.db = db
        self.embedding_repo = EmbeddingRepository(self.db)
        self.rag_client = httpx.AsyncClient() # NEW: Async HTTP client for RAG service
        logger.info("MemoryAgent initialized.")

    async def retrieve_and_synthesize(self, query: str, session_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Retrieves relevant information and synthesizes an answer using the Tria RAG Service.
        """
        payload = {
            "query": query,
            "session_id": session_id,
            "debug": True # Enable debug for now
        }
        try:
            response = await self.rag_client.post(RAG_SERVICE_URL, json=payload, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"MemoryAgent: Error communicating with RAG service at {RAG_SERVICE_URL}: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"MemoryAgent: Error decoding JSON response from RAG service: {e}")
            return None

    async def find_and_prepare_context(self, intent_vector: dict, session_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Finds relevant context in the knowledge base based on the intent and synthesizes a response.
        """
        target_context_data = intent_vector.get("target_context", {})
        context_query = target_context_data.get("currentDocumentName", "общая архитектура") # Default query

        logger.info(f"MemoryAgent: Searching for context with query: '{context_query}' using RAG service.")

        rag_response = await self.retrieve_and_synthesize(context_query, session_id)

        if not rag_response:
            logger.warning(f"MemoryAgent: No relevant context (synthesized response) found for query: '{context_query}'.")
            return None

        logger.info(f"MemoryAgent: Received synthesized response from RAG service for query: '{context_query}'.")
        return {"synthesized_response": rag_response} # Return the full RAG response

    async def store_interaction_memory(self, user_id: str, data_to_store: Dict[str, Any]):
        """
        Stores information about an interaction or its result in the knowledge base. (Stub)
        """
        logger.info(f"MemoryAgent: Storing interaction memory for user {user_id} (stub): {data_to_store}")
        # TODO: Implement logic for saving data to the knowledge base (e.g., creating/updating embeddings,
        # saving structured interaction data).
        # Example: await self.embedding_repo.create_or_update_embedding_for_data(data_to_store)
        pass

    async def retrieve_relevant_memory(self, user_id: str, query_vector: List[float], top_k: int = 5) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieves relevant information from the knowledge base based on a query vector. (Stub - not used in current flow)
        """
        logger.info(f"MemoryAgent: Retrieving relevant memory for user {user_id} (stub) with query_vector (first 3 dims): {query_vector[:3]}...")
        # TODO: Implement logic for searching relevant information in the knowledge base using query_vector.
        # Example:
        # closest_embeddings = await self.embedding_repo.find_closest_n_embeddings(query_vector, top_k)
        # if closest_embeddings:
        #    return [emb.dict() for emb in closest_embeddings]
        return [{"id": "memory_stub_1", "content": "This is a test memory."}] # Example stub response
