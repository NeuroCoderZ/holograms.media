from astrapy import Database
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
from backend.core.models import (
    UserChatSessionDB, UserChatSessionCreate,
    ChatMessageDB, ChatMessageCreate, ChatMessagePublic
)

logger = logging.getLogger(__name__)

class ChatRepository:
    def __init__(self, db: Database):
        self.db = db
        self.sessions_collection = self.db.get_collection("user_chat_sessions")
        self.history_collection = self.db.get_collection("chat_history")

    async def create_chat_session(self, user_id: str, session_in: UserChatSessionCreate) -> Optional[UserChatSessionDB]:
        now = datetime.utcnow().isoformat()
        session_data = {
            "user_id": user_id,
            "session_title": session_in.session_title,
            "created_at": now,
            "updated_at": now
        }
        try:
            result = self.sessions_collection.insert_one(session_data)
            if result and result.inserted_id:
                session_data["id"] = str(result.inserted_id)
                return UserChatSessionDB(**session_data)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in ChatRepository.create_chat_session for user {user_id}: {e}")
            raise

    async def get_chat_sessions_by_user_id(self, user_id: str, skip: int = 0, limit: int = 100) -> List[UserChatSessionDB]:
        try:
            # Astra DB find with sort and limit
            # Note: skip/offset might be handled differently in some versions of astrapy find
            # but usually it's find(filter, skip=skip, limit=limit)
            cursor = self.sessions_collection.find(
                filter={"user_id": user_id},
                sort={"updated_at": -1},
                limit=limit,
                skip=skip
            )
            return [UserChatSessionDB(id=str(row["_id"]), **row) for row in cursor]
        except Exception as e:
            logger.error(f"Astra DB error in ChatRepository.get_chat_sessions_by_user_id for user {user_id}: {e}")
            raise

    async def get_chat_session_by_id(self, session_id: str, user_id: str) -> Optional[UserChatSessionDB]:
        try:
            row = self.sessions_collection.find_one({"_id": session_id, "user_id": user_id})
            if row:
                return UserChatSessionDB(id=str(row["_id"]), **row)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in ChatRepository.get_chat_session_by_id for session {session_id}: {e}")
            raise

    async def update_chat_session_title(self, session_id: str, user_id: str, title: str) -> Optional[UserChatSessionDB]:
        now = datetime.utcnow().isoformat()
        try:
            result = self.sessions_collection.update_one(
                {"_id": session_id, "user_id": user_id},
                {"$set": {"session_title": title, "updated_at": now}}
            )
            if result.modified_count > 0:
                return await self.get_chat_session_by_id(session_id, user_id)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in ChatRepository.update_chat_session_title for session {session_id}: {e}")
            raise

    async def delete_chat_session(self, session_id: str, user_id: str) -> bool:
        try:
            # Delete session
            res_session = self.sessions_collection.delete_one({"_id": session_id, "user_id": user_id})
            if res_session.deleted_count > 0:
                # Manually delete history (No cascade in Astra JSON API)
                self.history_collection.delete_many({"user_chat_session_id": session_id})
                return True
            return False
        except Exception as e:
            logger.error(f"Astra DB error in ChatRepository.delete_chat_session for session {session_id}: {e}")
            raise

    async def get_messages_by_session_id(self, session_id: str, user_id: str, skip: int = 0, limit: int = 100) -> List[ChatMessageDB]:
        try:
            # Check ownership first (Astra doesn't have cross-collection joins)
            session = self.sessions_collection.find_one({"_id": session_id, "user_id": user_id})
            if not session:
                return []

            cursor = self.history_collection.find(
                filter={"user_chat_session_id": session_id},
                sort={"timestamp": 1},
                limit=limit,
                skip=skip
            )
            return [ChatMessageDB(id=str(row["_id"]), **row) for row in cursor]
        except Exception as e:
            logger.error(f"Astra DB error in ChatRepository.get_messages_by_session_id for session {session_id}: {e}")
            raise

    async def add_message_to_history(self, message_in: ChatMessageCreate, user_id: str) -> Optional[ChatMessageDB]:
        try:
            # Verify ownership
            session = self.sessions_collection.find_one({"_id": message_in.user_chat_session_id, "user_id": user_id})
            if not session:
                return None

            now = datetime.utcnow().isoformat()
            message_data = message_in.dict()
            message_data["timestamp"] = now
            
            result = self.history_collection.insert_one(message_data)
            if result and result.inserted_id:
                # Update session timestamp
                self.sessions_collection.update_one(
                    {"_id": message_in.user_chat_session_id},
                    {"$set": {"updated_at": now}}
                )
                message_data["id"] = str(result.inserted_id)
                return ChatMessageDB(**message_data)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in ChatRepository.add_message_to_history: {e}")
            raise

    async def get_session_with_history(self, session_id: str, user_id: str, message_skip: int = 0, message_limit: int = 100) -> Optional[Dict[str, Any]]:
        session_data = await self.get_chat_session_by_id(session_id, user_id)
        if not session_data:
            return None

        messages_data = await self.get_messages_by_session_id(session_id, user_id, skip=message_skip, limit=message_limit)

        return {
            "session": session_data,
            "messages": messages_data
        }
