import asyncpg
from typing import List, Optional, Dict, Any
import logging
from backend.core.models.chat_models import (
    UserChatSessionDB,
    UserChatSessionCreate,
    ChatMessageDB,
    ChatMessageCreate, # Хотя в роутере используется ChatMessageCreate, add_message_to_history будет принимать отдельные поля
    ChatMessagePublic
)

logger = logging.getLogger(__name__)

class ChatRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create_chat_session(self, user_id: str, session_in: UserChatSessionCreate) -> Optional[UserChatSessionDB]:
        sql = """
            INSERT INTO user_chat_sessions (user_id, session_title)
            VALUES ($1, $2)
            RETURNING id, user_id, session_title, created_at, updated_at;
        """
        try:
            row = await self.conn.fetchrow(sql, user_id, session_in.session_title)
            return UserChatSessionDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in ChatRepository.create_chat_session for user {user_id}, title '{session_in.session_title}': {e}")
            # Можно добавить обработку e.sqlstate == '23505' если есть уникальные ограничения на title per user
            raise
        except Exception as e:
            logger.error(f"Unexpected error in ChatRepository.create_chat_session for user {user_id}, title '{session_in.session_title}': {e}")
            raise

    async def get_chat_sessions_by_user_id(self, user_id: str, skip: int, limit: int) -> List[UserChatSessionDB]:
        sql = """
            SELECT id, user_id, session_title, created_at, updated_at
            FROM user_chat_sessions
            WHERE user_id = $1
            ORDER BY updated_at DESC
            OFFSET $2
            LIMIT $3;
        """
        try:
            rows = await self.conn.fetch(sql, user_id, skip, limit)
            return [UserChatSessionDB(**dict(row)) for row in rows]
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in ChatRepository.get_chat_sessions_by_user_id for user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in ChatRepository.get_chat_sessions_by_user_id for user {user_id}: {e}")
            raise

    async def get_chat_session_by_id(self, session_id: int, user_id: str) -> Optional[UserChatSessionDB]:
        # user_id проверяется для авторизации, чтобы пользователь не мог получить чужую сессию
        sql = """
            SELECT id, user_id, session_title, created_at, updated_at
            FROM user_chat_sessions
            WHERE id = $1 AND user_id = $2;
        """
        try:
            row = await self.conn.fetchrow(sql, session_id, user_id)
            return UserChatSessionDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in ChatRepository.get_chat_session_by_id for session_id {session_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in ChatRepository.get_chat_session_by_id for session_id {session_id}, user {user_id}: {e}")
            raise

    async def delete_chat_session(self, session_id: int, user_id: str) -> bool:
        # Сначала удаляем все сообщения, связанные с этой сессией, из-за внешнего ключа
        # или используем ON DELETE CASCADE в определении таблицы chat_history
        # Предполагаем, что ON DELETE CASCADE настроен для chat_history.user_chat_session_id
        sql_delete_session = """
            DELETE FROM user_chat_sessions
            WHERE id = $1 AND user_id = $2;
        """
        # Если ON DELETE CASCADE не настроен, нужно сначала удалить сообщения:
        # sql_delete_messages = "DELETE FROM chat_history WHERE user_chat_session_id = $1;"
        # await self.conn.execute(sql_delete_messages, session_id)
        try:
            result = await self.conn.execute(sql_delete_session, session_id, user_id)
            return result.startswith("DELETE 1")
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in ChatRepository.delete_chat_session for session_id {session_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in ChatRepository.delete_chat_session for session_id {session_id}, user {user_id}: {e}")
            raise

    async def get_messages_by_session_id(self, session_id: int, limit: int) -> List[ChatMessagePublic]:
        # user_id здесь не нужен, так как доступ к сессии уже должен быть проверен сервисом
        sql = """
            SELECT id, user_chat_session_id, role, message_content, metadata, timestamp
            FROM chat_history
            WHERE user_chat_session_id = $1
            ORDER BY timestamp ASC
            LIMIT $2;
        """
        # Примечание: Роутер использует ChatMessagePublic, который является псевдонимом ChatMessageDB.
        # Поэтому здесь мы можем использовать ChatMessageDB и это будет совместимо.
        try:
            rows = await self.conn.fetch(sql, session_id, limit)
            return [ChatMessagePublic(**dict(row)) for row in rows]
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in ChatRepository.get_messages_by_session_id for session_id {session_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in ChatRepository.get_messages_by_session_id for session_id {session_id}: {e}")
            raise

    async def add_message_to_history(self, session_id: int, role: str, message_content: str, metadata: Optional[Dict[str, Any]]) -> Optional[ChatMessageDB]:
        sql_insert_message = """
            INSERT INTO chat_history (user_chat_session_id, role, message_content, metadata)
            VALUES ($1, $2, $3, $4)
            RETURNING id, user_chat_session_id, role, message_content, metadata, timestamp;
        """
        # Также обновим updated_at для самой сессии
        sql_update_session_ts = """
            UPDATE user_chat_sessions
            SET updated_at = CURRENT_TIMESTAMP
            WHERE id = $1;
        """
        try:
            # Используем транзакцию, чтобы оба запроса были атомарны
            async with self.conn.transaction():
                row = await self.conn.fetchrow(sql_insert_message, session_id, role, message_content, metadata)
                await self.conn.execute(sql_update_session_ts, session_id)

            return ChatMessageDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in ChatRepository.add_message_to_history for session_id {session_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in ChatRepository.add_message_to_history for session_id {session_id}: {e}")
            raise
