# backend/tria_bots/MemoryBot.py
import asyncpg
import logging
from typing import List, Dict, Any, Optional
from backend.repositories.embedding_repository import EmbeddingRepository, EmbeddingDB # <-- ВАЖНО

logger = logging.getLogger(__name__)

class MemoryBot:
    def __init__(self, db_conn: asyncpg.Connection):
        self.db_conn = db_conn
        self.embedding_repo = EmbeddingRepository(self.db_conn)
        logger.info("MemoryBot initialized.")

    async def find_and_prepare_context(self, intent_vector: dict) -> Optional[Dict[str, EmbeddingDB]]: # Возвращаем словарь с EmbeddingDB
        """
        Находит релевантный контекст в базе знаний на основе намерения.
        """
        # target_context - это словарь, приходящий от GestureBot, содержащий поле context из WebSocket
        target_context_data = intent_vector.get("target_context", {})
        context_query = target_context_data.get("currentDocumentName", "общая архитектура")

        logger.info(f"MemoryBot: Searching for context with query: '{context_query}'")

        # Используем новый метод репозитория, который сам генерирует эмбеддинг для текста
        found_embedding_obj = await self.embedding_repo.find_closest_embedding_by_text(context_query)

        if not found_embedding_obj:
            logger.warning(f"MemoryBot: No relevant context (embedding) found for query: '{context_query}'.")
            return None

        logger.info(f"MemoryBot: Found relevant embedding with ID: {found_embedding_obj.id} for query: '{context_query}'.")
        return {"base_embedding": found_embedding_obj} # Возвращаем объект EmbeddingDB

    async def store_interaction_memory(self, user_id: str, data_to_store: Dict[str, Any]):
        """
        Сохраняет информацию о взаимодействии или его результате в базу знаний.
        """
        logger.info(f"MemoryBot: Storing interaction memory for user {user_id} (stub): {data_to_store}")
        # TODO: Логика сохранения данных в базу знаний (например, создание/обновление эмбеддингов,
        # сохранение структурированных данных о взаимодействии).
        # await self.embedding_repo.create_or_update_embedding_for_data(data_to_store)
        pass

    async def retrieve_relevant_memory(self, user_id: str, query_vector: List[float], top_k: int = 5) -> Optional[List[Dict[str, Any]]]:
        """
        Извлекает релевантную информацию из базы знаний на основе вектора запроса.
        (Этот метод пока не используется в текущей цепочке, но является частью заглушки)
        """
        logger.info(f"MemoryBot: Retrieving relevant memory for user {user_id} (stub) with query_vector (first 3 dims): {query_vector[:3]}...")
        # TODO: Логика поиска релевантной информации в базе знаний с использованием query_vector.
        # closest_embeddings = await self.embedding_repo.find_closest_n_embeddings(query_vector, top_k) # find_closest_n_embeddings не реализован
        # if closest_embeddings:
        #    return [emb.dict() for emb in closest_embeddings] # Пример
        return [{"id": "memory_stub_1", "content": "Это тестовое воспоминание."}]
