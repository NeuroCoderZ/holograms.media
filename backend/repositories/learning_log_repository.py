import asyncpg
from typing import Dict, Any, Optional
from uuid import UUID
import logging
from backend.core.models.tria_learning_models import TriaLearningLogDB, TriaLearningLogCreate

logger = logging.getLogger(__name__)

class LearningLogRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create_log_entry(
        self,
        log_entry_in: TriaLearningLogCreate
        # user_id: str,
        # intent_vector: Dict[str, Any],
        # context_embedding_id: Optional[UUID], # Сделаем Optional, так как может не быть контекста
        # action_result: str,
        # result_message: Optional[str] = None,
        # modified_embedding_id: Optional[UUID] = None,
        # session_id: Optional[str] = None,
        # feedback_signal: Optional[int] = None,
        # additional_metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[TriaLearningLogDB]:
        """
        Создает новую запись в логе обучения Tria.
        """
        sql = """
            INSERT INTO tria_learning_log (
                user_id, session_id, intent_vector, context_embedding_id,
                action_result, result_message, modified_embedding_id,
                feedback_signal, additional_metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, user_id, session_id, intent_vector, context_embedding_id,
                      action_result, result_message, modified_embedding_id,
                      feedback_signal, additional_metadata, created_at, updated_at;
        """
        try:
            row = await self.conn.fetchrow(
                sql,
                log_entry_in.user_id,
                log_entry_in.session_id,
                log_entry_in.intent_vector, # Должно быть JSON-сериализуемым Dict
                log_entry_in.context_embedding_id,
                log_entry_in.action_result,
                log_entry_in.result_message,
                log_entry_in.modified_embedding_id,
                log_entry_in.feedback_signal,
                log_entry_in.additional_metadata # Должно быть JSON-сериализуемым Dict
            )
            if row:
                return TriaLearningLogDB(**dict(row))
            return None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in LearningLogRepository.create_log_entry for user {log_entry_in.user_id}: {e}", exc_info=True)
            # Можно добавить более специфичную обработку ошибок, если необходимо
            raise
        except Exception as e:
            logger.error(f"Unexpected error in LearningLogRepository.create_log_entry for user {log_entry_in.user_id}: {e}", exc_info=True)
            raise

    async def get_log_entry_by_id(self, log_id: UUID) -> Optional[TriaLearningLogDB]:
        """
        Извлекает запись лога по ее ID.
        """
        sql = """
            SELECT id, user_id, session_id, intent_vector, context_embedding_id,
                   action_result, result_message, modified_embedding_id,
                   feedback_signal, additional_metadata, created_at, updated_at
            FROM tria_learning_log
            WHERE id = $1;
        """
        try:
            row = await self.conn.fetchrow(sql, log_id)
            if row:
                return TriaLearningLogDB(**dict(row))
            return None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in LearningLogRepository.get_log_entry_by_id for log_id {log_id}: {e}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"Unexpected error in LearningLogRepository.get_log_entry_by_id for log_id {log_id}: {e}", exc_info=True)
            raise

    # Можно добавить другие методы, например, для выборки логов по user_id, action_result и т.д.
    async def get_logs_by_user_id(self, user_id: str, limit: int = 100, offset: int = 0) -> List[TriaLearningLogDB]:
        sql = """
            SELECT id, user_id, session_id, intent_vector, context_embedding_id,
                   action_result, result_message, modified_embedding_id,
                   feedback_signal, additional_metadata, created_at, updated_at
            FROM tria_learning_log
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3;
        """
        try:
            rows = await self.conn.fetch(sql, user_id, limit, offset)
            return [TriaLearningLogDB(**dict(row)) for row in rows]
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in LearningLogRepository.get_logs_by_user_id for user {user_id}: {e}", exc_info=True)
            raise
        except Exception as e:
            logger.error(f"Unexpected error in LearningLogRepository.get_logs_by_user_id for user {user_id}: {e}", exc_info=True)
            raise
