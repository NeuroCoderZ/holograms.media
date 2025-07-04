# backend/services/gesture_intent_service.py
import logging
import asyncpg
import numpy as np
import os # Для доступа к GOOGLE_APPLICATION_CREDENTIALS
from typing import List, Dict, Any, Optional
from backend.repositories.embedding_repository import EmbeddingRepository

# Импорт Google AI SDK
import google.generativeai as genai

# Импорты для логирования
from backend.repositories.learning_log_repository import LearningLogRepository
from backend.core.models.tria_learning_models import TriaLearningLogCreate

logger = logging.getLogger(__name__)

# Конфигурация Google AI (обычно делается один раз при старте приложения, но здесь для простоты)
# GOOGLE_API_KEY должен быть установлен как переменная окружения
# или GOOGLE_APPLICATION_CREDENTIALS должен указывать на service account key file.
try:
    # genai.configure(api_key=os.environ.get("GOOGLE_API_KEY")) # Если используем API Key
    # Если используем ADC (Application Default Credentials) через service account,
    # то явное конфигурирование ключа не всегда нужно, SDK может подхватить его из окружения.
    # Проверим, установлен ли GOOGLE_APPLICATION_CREDENTIALS
    if not os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
        logger.warning("GOOGLE_APPLICATION_CREDENTIALS is not set. Embedding generation might fail if not using API Key.")
    # Если используется API-ключ, его нужно передать в configure()
    # genai.configure(api_key="YOUR_API_KEY") # Замените на ваш ключ или используйте env var

except Exception as e:
    logger.error(f"Failed to configure Google AI: {e}. GestureIntentService might not work correctly.")


# Определяем условные векторы для наших намерений
# Размерность должна быть 768 для text-embedding-004
SEMANTIC_DIRECTIONS = {
    "select": np.array([0.05] * 10 + [-0.05] * 10 + [0.01] * (768 - 20)),  # Примерный вектор
    "grab": np.array([-0.05] * 10 + [0.05] * 10 + [-0.01] * (768 - 20)), # Примерный вектор
    "navigate": np.zeros(768)  # Навигация пока не меняет вектор
}
# Нормализуем векторы направлений на всякий случай
for key in SEMANTIC_DIRECTIONS:
    if np.linalg.norm(SEMANTIC_DIRECTIONS[key]) != 0:
        SEMANTIC_DIRECTIONS[key] = SEMANTIC_DIRECTIONS[key] / np.linalg.norm(SEMANTIC_DIRECTIONS[key])


class GestureIntentService:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn
        self.embedding_repo = EmbeddingRepository(conn)
        self.learning_log_repo = LearningLogRepository(conn) # <-- Инициализируем новый репозиторий
        self.embedding_model_name = "models/text-embedding-004" # Имя модели для Google AI SDK

    async def _get_embedding(self, text: str) -> Optional[List[float]]:
        """Вспомогательная функция для получения эмбеддинга текста."""
        try:
            result = await genai.embed_content_async(
                model=self.embedding_model_name,
                content=text,
                task_type="RETRIEVAL_QUERY" # или "SEMANTIC_SIMILARITY" в зависимости от задачи
            )
            return result['embedding']
        except Exception as e:
            logger.error(f"Failed to get embedding for text '{text[:50]}...': {e}")
            return None

    async def apply_intent_to_embedding(self, user_id: str, intent_vector: dict, context_embedding: Any) -> dict: # Any пока что для EmbeddingDB
        """
        Применяет вектор намерения к предоставленному базовому эмбеддингу.

        Args:
            user_id (str): Идентификатор пользователя.
            intent_vector (dict): Словарь, содержащий 'type' (строка намерения) и 'intensity' (float).
            context_embedding (EmbeddingDB): Объект найденного эмбеддинга из БД.
        """
        intent_type = intent_vector.get("type", "unknown")
        intensity_factor = float(intent_vector.get("intensity", 0.1)) # Используем intensity из intent_vector

        logger.info(f"Applying intent_type '{intent_type}' with intensity {intensity_factor} to embedding_id {context_embedding.id} for user {user_id}")

        # ✅ ШАГ 1: Проверка Аффордансов
        # Убедимся, что context_embedding.metadata существует и является словарем
        if not isinstance(context_embedding.metadata, dict):
            logger.warning(f"Metadata for embedding {context_embedding.id} is not a dict or is missing. Skipping affordance check.")
            # Можно вернуть ошибку или продолжить без проверки, в зависимости от требований
            # return {"status": "error", "message": "Missing or invalid metadata for affordance check."}
        else:
            available_gestures = context_embedding.metadata.get("gesture_affordances", [])
            if not isinstance(available_gestures, list): # Дополнительная проверка типа
                logger.warning(f"gesture_affordances for embedding {context_embedding.id} is not a list: {available_gestures}. Treating as no affordances.")
                available_gestures = []

            if intent_type not in available_gestures:
                message = f"Intent '{intent_type}' is not applicable to this context (Embedding ID: {context_embedding.id}). Available gestures: {available_gestures}"
                logger.warning(message)
                return {"status": "ignored", "message": message, "available_gestures": available_gestures}

        # 2. Получаем вектор модификации для нашего намерения (стало Шаг 2)
        direction_vector_np = SEMANTIC_DIRECTIONS.get(intent_type)
        if direction_vector_np is None:
            logger.info(f"Intent type '{intent_type}' has no defined vector operation for user {user_id}. No action taken.")
            return {"status": "ignored", "message": f"Intent type '{intent_type}' has no defined vector operation."}

        if direction_vector_np.shape[0] != 768: # Проверка согласованности размерности
            logger.error(f"Dimension mismatch for SEMANTIC_DIRECTIONS['{intent_type}']. Expected 768, got {direction_vector_np.shape[0]}.")
            return {"status": "error", "message": f"Internal configuration error for intent type '{intent_type}'."}

        # 2. Выполняем векторную арифметику
        # context_embedding.embedding это List[float] (или embedding_vector если alias сработал)
        # Убедимся, что используем правильное имя поля, которое содержит вектор List[float]
        # В модели EmbeddingDB это поле 'embedding', которое алиасится в 'embedding_vector' при создании объекта.
        # Если объект приходит из репозитория, он должен иметь поле 'embedding' как List[float].

        base_vector_list = context_embedding.embedding # Должно быть List[float]
        if not isinstance(base_vector_list, list) or not all(isinstance(n, (int, float)) for n in base_vector_list):
            logger.error(f"Base embedding vector is not a list of numbers. ID: {context_embedding.id}. Type: {type(base_vector_list)}")
            return {"status": "error", "message": "Corrupted base embedding data (not a list of numbers)."}

        base_vector_np = np.array(base_vector_list)

        if base_vector_np.shape[0] != 768:
            logger.error(f"Dimension mismatch for base_vector. Expected 768, got {base_vector_np.shape[0]}. Embedding ID: {context_embedding.id}")
            return {"status": "error", "message": "Corrupted base embedding data (dimension mismatch)."}

        modified_vector_np = base_vector_np + (direction_vector_np * intensity_factor)

        # Нормализуем, чтобы не "улететь" из семантического пространства
        norm = np.linalg.norm(modified_vector_np)
        if norm == 0: # Избегаем деления на ноль
            logger.warning(f"Norm of modified vector is zero for intent_type '{intent_type}', embedding ID {context_embedding.id}. Using original vector.")
            modified_vector_list = base_vector_np.tolist()
        else:
            modified_vector_np /= norm
            modified_vector_list = modified_vector_np.tolist()
            logger.info(f"Applied intent_type '{intent_type}', modified embedding {context_embedding.id}. Norm before: {np.linalg.norm(base_vector_np):.4f}, Norm after: {np.linalg.norm(modified_vector_np):.4f}")


        # Обновляем вектор в базе данных (стало Шаг 3)
        success = await self.embedding_repo.update_embedding_vector(
            embedding_id=context_embedding.id,
            new_vector=modified_vector_list
        )

        if success:
            return {
                "status": "success",
                "message": f"Intent '{intent_type}' applied. Embedding '{context_embedding.id}' was modified.",
                "modified_embedding_id": str(context_embedding.id)
            }
        else:
            logger.error(f"Failed to update embedding {context_embedding.id} in database for intent_type '{intent_type}'.")
            return {
                "status": "error",
                "message": f"Failed to update embedding for intent_type '{intent_type}'.",
                "target_embedding_id": str(context_embedding.id)
            }

    async def _log_interaction(self, user_id: str, intent_vector: dict, context_embedding: Optional[Any], action_result_status: str, message: str, modified_embedding_id: Optional[UUID] = None):
        # Убедимся, что context_embedding не None перед доступом к его id
        # context_embedding_id может быть None, если, например, контекст не был найден MemoryBot'ом
        # или если проверка аффордансов произошла до того, как context_embedding был получен (что не должно быть, но для безопасности)

        current_context_embedding_id = None
        if hasattr(context_embedding, 'id'): # Проверяем, что у объекта есть атрибут id
            current_context_embedding_id = context_embedding.id
        elif context_embedding is not None: # Если это не None, но без id, логируем предупреждение
            logger.warning(f"Context embedding object provided to _log_interaction does not have an 'id' attribute: {type(context_embedding)}")

        log_entry = TriaLearningLogCreate(
            user_id=user_id,
            # session_id=intent_vector.get("session_id"), # Если session_id передается в intent_vector
            intent_vector=intent_vector,
            context_embedding_id=current_context_embedding_id,
            action_result=action_result_status,
            result_message=message,
            modified_embedding_id=modified_embedding_id
            # additional_metadata можно будет добавить позже, если нужно
        )
        try:
            await self.learning_log_repo.create_log_entry(log_entry)
            logger.info(f"Interaction logged for user {user_id}. Result: {action_result_status}, Intent: {intent_vector.get('type')}")
        except Exception as e:
            logger.error(f"Failed to create learning log entry for user {user_id}: {e}", exc_info=True)

    # Обновленный apply_intent_to_embedding с логированием
    async def apply_intent_to_embedding(self, user_id: str, intent_vector: dict, context_embedding: Any) -> dict: # Any для EmbeddingDB
        intent_type = intent_vector.get("type", "unknown")
        intensity_factor = float(intent_vector.get("intensity", 0.1))
        action_result_status: str = "error" # Default to error
        message_to_return: str = "An unexpected error occurred."
        modified_id: Optional[UUID] = None

        logger.info(f"Applying intent_type '{intent_type}' with intensity {intensity_factor} to embedding_id {context_embedding.id if context_embedding else 'N/A'} for user {user_id}")

        if not context_embedding: # Добавим проверку, если context_embedding может быть None
            action_result_status = "error"
            message_to_return = "Context embedding was not provided."
            await self._log_interaction(user_id, intent_vector, context_embedding, action_result_status, message_to_return, modified_id)
            return {"status": action_result_status, "message": message_to_return}

        # Проверка Аффордансов
        if not isinstance(context_embedding.metadata, dict):
            logger.warning(f"Metadata for embedding {context_embedding.id} is not a dict or is missing. Affordance check might be unreliable.")
            available_gestures = [] # Предполагаем отсутствие аффордансов, если метаданные некорректны
        else:
            available_gestures = context_embedding.metadata.get("gesture_affordances", [])
            if not isinstance(available_gestures, list):
                logger.warning(f"gesture_affordances for embedding {context_embedding.id} is not a list: {available_gestures}. Treating as no affordances.")
                available_gestures = []

        if intent_type not in available_gestures:
            action_result_status = "ignored"
            message_to_return = f"Intent '{intent_type}' is not applicable to this context (Embedding ID: {context_embedding.id}). Available gestures: {available_gestures}"
            logger.warning(message_to_return)
            await self._log_interaction(user_id, intent_vector, context_embedding, action_result_status, message_to_return, modified_id)
            return {"status": action_result_status, "message": message_to_return, "available_gestures": available_gestures}

        direction_vector_np = SEMANTIC_DIRECTIONS.get(intent_type)
        if direction_vector_np is None:
            action_result_status = "ignored"
            message_to_return = f"Intent type '{intent_type}' has no defined vector operation."
            logger.info(f"{message_to_return} for user {user_id}. No action taken.")
            await self._log_interaction(user_id, intent_vector, context_embedding, action_result_status, message_to_return, modified_id)
            return {"status": action_result_status, "message": message_to_return}

        if direction_vector_np.shape[0] != 768:
            action_result_status = "error"
            message_to_return = f"Internal configuration error for intent type '{intent_type}' (dimension mismatch)."
            logger.error(f"Dimension mismatch for SEMANTIC_DIRECTIONS['{intent_type}']. Expected 768, got {direction_vector_np.shape[0]}.")
            await self._log_interaction(user_id, intent_vector, context_embedding, action_result_status, message_to_return, modified_id)
            return {"status": action_result_status, "message": message_to_return}

        base_vector_list = context_embedding.embedding
        if not isinstance(base_vector_list, list) or not all(isinstance(n, (int, float)) for n in base_vector_list):
            action_result_status = "error"
            message_to_return = "Corrupted base embedding data (not a list of numbers)."
            logger.error(f"Base embedding vector is not a list of numbers. ID: {context_embedding.id}. Type: {type(base_vector_list)}")
            await self._log_interaction(user_id, intent_vector, context_embedding, action_result_status, message_to_return, modified_id)
            return {"status": action_result_status, "message": message_to_return}

        base_vector_np = np.array(base_vector_list)
        if base_vector_np.shape[0] != 768:
            action_result_status = "error"
            message_to_return = "Corrupted base embedding data (dimension mismatch)."
            logger.error(f"Dimension mismatch for base_vector. Expected 768, got {base_vector_np.shape[0]}. Embedding ID: {context_embedding.id}")
            await self._log_interaction(user_id, intent_vector, context_embedding, action_result_status, message_to_return, modified_id)
            return {"status": action_result_status, "message": message_to_return}

        modified_vector_np = base_vector_np + (direction_vector_np * intensity_factor)
        norm = np.linalg.norm(modified_vector_np)
        if norm == 0:
            logger.warning(f"Norm of modified vector is zero for intent_type '{intent_type}', embedding ID {context_embedding.id}. Using original vector.")
            modified_vector_list = base_vector_np.tolist()
        else:
            modified_vector_np /= norm
            modified_vector_list = modified_vector_np.tolist()

        logger.info(f"Applied intent_type '{intent_type}', modified embedding {context_embedding.id}. Norm before: {np.linalg.norm(base_vector_np):.4f}, Norm after: {np.linalg.norm(modified_vector_np):.4f}")

        success = await self.embedding_repo.update_embedding_vector(
            embedding_id=context_embedding.id,
            new_vector=modified_vector_list
        )

        if success:
            action_result_status = "success"
            message_to_return = f"Intent '{intent_type}' applied. Embedding '{context_embedding.id}' was modified."
            modified_id = context_embedding.id
            await self._log_interaction(user_id, intent_vector, context_embedding, action_result_status, message_to_return, modified_id)
            return {"status": action_result_status, "message": message_to_return, "modified_embedding_id": str(modified_id)}
        else:
            action_result_status = "error"
            message_to_return = f"Failed to update embedding for intent_type '{intent_type}'."
            logger.error(f"Failed to update embedding {context_embedding.id} in database for intent_type '{intent_type}'.")
            await self._log_interaction(user_id, intent_vector, context_embedding, action_result_status, message_to_return, modified_id)
            return {"status": action_result_status, "message": message_to_return, "target_embedding_id": str(context_embedding.id)}
