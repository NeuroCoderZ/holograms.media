import asyncpg
from typing import List, Optional, Dict, Any
import logging
from backend.core.models import ( # Updated to use __init__
    UserChatSessionDB, UserChatSessionCreate,
    ChatMessageDB, ChatMessageCreate, ChatMessagePublic
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
            raise
        except Exception as e:
            logger.error(f"Unexpected error in ChatRepository.create_chat_session for user {user_id}, title '{session_in.session_title}': {e}")
            raise

    async def get_chat_sessions_by_user_id(self, user_id: str, skip: int = 0, limit: int = 100) -> List[UserChatSessionDB]:
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

    async def update_chat_session_title(self, session_id: int, user_id: str, title: str) -> Optional[UserChatSessionDB]:
        sql = """
            UPDATE user_chat_sessions
            SET session_title = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND user_id = $3
            RETURNING id, user_id, session_title, created_at, updated_at;
        """
        try:
            row = await self.conn.fetchrow(sql, title, session_id, user_id)
            return UserChatSessionDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in ChatRepository.update_chat_session_title for session {session_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in ChatRepository.update_chat_session_title for session {session_id}, user {user_id}: {e}")
            raise

    async def delete_chat_session(self, session_id: int, user_id: str) -> bool:
        # Assumes ON DELETE CASCADE is set for chat_history.user_chat_session_id FK
        sql_delete_session = """
            DELETE FROM user_chat_sessions
            WHERE id = $1 AND user_id = $2;
        """
        try:
            result = await self.conn.execute(sql_delete_session, session_id, user_id)
            return result.startswith("DELETE 1")
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in ChatRepository.delete_chat_session for session_id {session_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in ChatRepository.delete_chat_session for session_id {session_id}, user {user_id}: {e}")
            raise

    async def get_messages_by_session_id(self, session_id: int, user_id: str, skip: int = 0, limit: int = 100) -> List[ChatMessageDB]:
        # Verify session ownership before fetching messages
        sql = """
            SELECT ch.id, ch.user_chat_session_id, ch.role, ch.message_content, ch.timestamp, ch.metadata
            FROM chat_history ch
            JOIN user_chat_sessions ucs ON ch.user_chat_session_id = ucs.id
            WHERE ch.user_chat_session_id = $1 AND ucs.user_id = $2
            ORDER BY ch.timestamp ASC
            OFFSET $3
            LIMIT $4;
        """
        try:
            rows = await self.conn.fetch(sql, session_id, user_id, skip, limit)
            # ChatMessagePublic is an alias for ChatMessageDB, so using ChatMessageDB directly is fine
            return [ChatMessageDB(**dict(row)) for row in rows]
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in ChatRepository.get_messages_by_session_id for session {session_id}, user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in ChatRepository.get_messages_by_session_id for session {session_id}, user {user_id}: {e}")
            raise

    async def add_message_to_history(self, message_in: ChatMessageCreate, user_id: str) -> Optional[ChatMessageDB]:
        # First, verify the session belongs to the user
        session_check_sql = "SELECT id FROM user_chat_sessions WHERE id = $1 AND user_id = $2;"
        try:
            session_owner_check = await self.conn.fetchval(session_check_sql, message_in.user_chat_session_id, user_id)
            if not session_owner_check:
                logger.warning(f"User {user_id} attempted to add message to session {message_in.user_chat_session_id} not owned by them or session does not exist.")
                return None

            sql_insert_message = """
                INSERT INTO chat_history (user_chat_session_id, role, message_content, metadata)
                VALUES ($1, $2, $3, $4)
                RETURNING id, user_chat_session_id, role, message_content, metadata, timestamp;
            """
            sql_update_session_ts = """
                UPDATE user_chat_sessions
                SET updated_at = CURRENT_TIMESTAMP
                WHERE id = $1;
            """
            async with self.conn.transaction():
                row = await self.conn.fetchrow(
                    sql_insert_message,
                    message_in.user_chat_session_id,
                    message_in.role,
                    message_in.message_content,
                    message_in.metadata
                )
                await self.conn.execute(sql_update_session_ts, message_in.user_chat_session_id)

            return ChatMessageDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in ChatRepository.add_message_to_history for session {message_in.user_chat_session_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in ChatRepository.add_message_to_history for session {message_in.user_chat_session_id}: {e}")
            raise

    async def get_session_with_history(self, session_id: int, user_id: str, message_skip: int = 0, message_limit: int = 100) -> Optional[Dict[str, Any]]:
        """
        Retrieves a session and its messages (paginated).
        """
        session_data = await self.get_chat_session_by_id(session_id, user_id)
        if not session_data:
            return None

        messages_data = await self.get_messages_by_session_id(session_id, user_id, skip=message_skip, limit=message_limit)

        return {
            "session": session_data,
            "messages": messages_data
        }
