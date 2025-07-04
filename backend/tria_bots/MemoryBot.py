# backend/tria_bots/MemoryBot.py
import asyncpg
import logging
from typing import List, Dict, Any, Optional
from backend.repositories.embedding_repository import EmbeddingRepository, EmbeddingDB

logger = logging.getLogger(__name__)

class MemoryBot:
    def __init__(self, db_conn: asyncpg.Connection):
        self.db_conn = db_conn
        self.embedding_repo = EmbeddingRepository(self.db_conn)
        logger.info("MemoryBot initialized.")

    async def find_and_prepare_context(self, intent_vector: dict) -> Optional[Dict[str, EmbeddingDB]]:
        """
        Finds relevant context in the knowledge base based on the intent.
        """
        target_context_data = intent_vector.get("target_context", {})
        context_query = target_context_data.get("currentDocumentName", "общая архитектура") # Default query

        logger.info(f"MemoryBot: Searching for context with query: '{context_query}'")

        found_embedding_obj = await self.embedding_repo.find_closest_embedding_by_text(context_query)

        if not found_embedding_obj:
            logger.warning(f"MemoryBot: No relevant context (embedding) found for query: '{context_query}'.")
            return None

        logger.info(f"MemoryBot: Found relevant embedding with ID: {found_embedding_obj.id} for query: '{context_query}'.")
        return {"base_embedding": found_embedding_obj}

    async def store_interaction_memory(self, user_id: str, data_to_store: Dict[str, Any]):
        """
        Stores information about an interaction or its result in the knowledge base. (Stub)
        """
        logger.info(f"MemoryBot: Storing interaction memory for user {user_id} (stub): {data_to_store}")
        # TODO: Implement logic for saving data to the knowledge base (e.g., creating/updating embeddings,
        # saving structured interaction data).
        # Example: await self.embedding_repo.create_or_update_embedding_for_data(data_to_store)
        pass

    async def retrieve_relevant_memory(self, user_id: str, query_vector: List[float], top_k: int = 5) -> Optional[List[Dict[str, Any]]]:
        """
        Retrieves relevant information from the knowledge base based on a query vector. (Stub - not used in current flow)
        """
        logger.info(f"MemoryBot: Retrieving relevant memory for user {user_id} (stub) with query_vector (first 3 dims): {query_vector[:3]}...")
        # TODO: Implement logic for searching relevant information in the knowledge base using query_vector.
        # Example:
        # closest_embeddings = await self.embedding_repo.find_closest_n_embeddings(query_vector, top_k)
        # if closest_embeddings:
        #    return [emb.dict() for emb in closest_embeddings]
        return [{"id": "memory_stub_1", "content": "This is a test memory."}] # Example stub response
