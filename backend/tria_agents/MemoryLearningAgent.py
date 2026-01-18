# backend/tria_agents/MemoryLearningAgent.py
# Removed asyncpg
import logging
from typing import List, Dict, Any, Optional
import httpx
import json
import asyncio
from datetime import datetime
from backend.repositories.embedding_repository import EmbeddingRepository
from backend.core.models.learning_log_models import TriaLearningLogModel
import subprocess
import os

logger = logging.getLogger(__name__)

# URL of the Tria RAG Service
RAG_SERVICE_URL = "http://127.0.0.1:8001/query"

class MemoryLearningAgent:
    """
    Объединенный агент MemoryLearningAgent, обеспечивающий память через RAG,
    самообучение через логирование взаимодействий и дообучение моделей,
    а также адаптацию с помощью маленькой нейросети на TensorFlow.js.
    """

    def __init__(self, db: Any):
        self.db = db
        self.embedding_repo = EmbeddingRepository(self.db)
        self.rag_client = httpx.AsyncClient()
        self.learning_log_repo = None  # Можно добавить репозиторий для логов
        logger.info("MemoryLearningAgent initialized.")

    async def retrieve_and_synthesize(self, query: str, session_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Извлекает релевантную информацию и синтезирует ответ с использованием Tria RAG Service.
        """
        payload = {
            "query": query,
            "session_id": session_id,
            "debug": True
        }
        try:
            response = await self.rag_client.post(RAG_SERVICE_URL, json=payload, timeout=30.0)
            response.raise_for_status()
            return response.json()
        except httpx.RequestError as e:
            logger.error(f"MemoryLearningAgent: Ошибка связи с RAG сервисом {RAG_SERVICE_URL}: {e}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"MemoryLearningAgent: Ошибка декодирования JSON ответа от RAG сервиса: {e}")
            return None

    async def find_and_prepare_context(self, intent_vector: dict, session_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """
        Находит релевантный контекст в базе знаний на основе вектора интента и синтезирует ответ.
        """
        target_context_data = intent_vector.get("target_context", {})
        context_query = target_context_data.get("currentDocumentName", "общая архитектура")

        logger.info(f"MemoryLearningBot: Поиск контекста по запросу: '{context_query}' с использованием RAG сервиса.")

        rag_response = await self.retrieve_and_synthesize(context_query, session_id)

        if not rag_response:
            logger.warning(f"MemoryLearningBot: Не найден релевантный контекст (синтезированный ответ) для запроса: '{context_query}'.")
            return None

        logger.info(f"MemoryLearningBot: Получен синтезированный ответ от RAG сервиса для запроса: '{context_query}'.")
        return {"synthesized_response": rag_response}

    async def store_interaction_memory(self, user_id: str, data_to_store: Dict[str, Any]):
        """
        Сохраняет информацию о взаимодействии или его результате в базе знаний.
        """
        logger.info(f"MemoryLearningBot: Сохранение памяти взаимодействия для пользователя {user_id}: {data_to_store}")
        # Реализовать сохранение в Astra Database с векторными представлениями
        # Пример: await self.embedding_repo.create_or_update_embedding_for_data(data_to_store)
        pass

    async def retrieve_relevant_memory(self, user_id: str, query_vector: List[float], top_k: int = 5) -> Optional[List[Dict[str, Any]]]:
        """
        Извлекает релевантную информацию из базы знаний на основе вектора запроса.
        """
        logger.info(f"MemoryLearningBot: Извлечение релевантной памяти для пользователя {user_id} с query_vector (первые 3 измерения): {query_vector[:3]}...")
        # Реализовать поиск в Astra DB
        # Пример: closest_embeddings = await self.embedding_repo.find_closest_n_embeddings(query_vector, top_k)
        return [{"id": "memory_stub_1", "content": "Это тестовая память."}]

    async def process_interaction_for_learning(self, learning_data: dict):
        """
        Обрабатывает взаимодействие для самообучения, логируя данные и адаптируя модель.
        """
        # Логирование в tria_learning_log
        log_entry = TriaLearningLogModel(
            user_id=learning_data.get('user_id'),
            session_id=learning_data.get('session_id'),
            intent_vector=learning_data.get('intent_vector'),
            action_result=learning_data.get('action_result', 'success'),
            result_message=learning_data.get('result_message'),
            custom_data=learning_data.get('custom_data')
        )
        # Сохранить в БД
        # await self.db_conn.execute("INSERT INTO tria_learning_log ...", log_entry.dict())

        # Адаптация модели через TensorFlow.js
        await self.adapt_model_with_feedback(learning_data)

        logger.info(f"MemoryLearningAgent: Залогировано обучение для пользователя {learning_data.get('user_id', 'unknown')}")

    async def adapt_model_with_feedback(self, feedback_data: dict):
        """
        Адаптирует маленькую нейросеть на TensorFlow.js на основе обратной связи.
        """
        # Вызвать Node.js скрипт с TF.js для обучения
        script_path = os.path.join(os.path.dirname(__file__), 'tfjs_adapter.js')
        try:
            result = await asyncio.create_subprocess_exec(
                'node', script_path, json.dumps(feedback_data),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await result.communicate()
            if result.returncode == 0:
                logger.info("MemoryLearningAgent: Модель адаптирована успешно.")
            else:
                logger.error(f"MemoryLearningAgent: Ошибка адаптации модели: {stderr.decode()}")
        except Exception as e:
            logger.error(f"MemoryLearningAgent: Исключение при адаптации модели: {e}")

    async def receive_search_request_from_orchestrator(self, search_query: str, session_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Получает запрос на поиск от Orchestrator и возвращает результаты.
        """
        results = await self.retrieve_and_synthesize(search_query, session_id)
        return {"results": results, "query": search_query}

    async def send_results_to_orchestrator(self, results: Dict[str, Any], orchestrator_callback: callable):
        """
        Отправляет результаты поиска обратно в Orchestrator.
        """
        await orchestrator_callback(results)
        logger.info("MemoryLearningAgent: Результаты отправлены в Orchestrator.")

    async def close(self):
        """
        Закрывает соединения.
        """
        await self.rag_client.aclose()</content>
</edit_file>
