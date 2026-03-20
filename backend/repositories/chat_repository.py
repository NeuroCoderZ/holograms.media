from astrapy import Database
from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import uuid
from backend.core.models import (
    UserChatSessionDB, UserChatSessionCreate,
    ChatMessageDB, ChatMessageCreate, ChatMessagePublic
)

logger = logging.getLogger(__name__)

# In-Memory Storage for Mock Mode
MOCK_SESSIONS = {}
MOCK_HISTORY = {}

class ChatRepository:
    def __init__(self, db: Optional[Database]):
        self.db = db
        if self.db:
            self.sessions_collection = self.db.get_collection("user_chat_sessions")
            self.history_collection = self.db.get_collection("chat_history")
            self.is_mock = False
        else:
            logger.warning("ChatRepository initialized in MOCK MODE (In-Memory). Data will be lost on restart.")
            self.is_mock = True

    async def create_chat_session(self, user_id: str, session_in: UserChatSessionCreate) -> Optional[UserChatSessionDB]:
        now = datetime.utcnow().isoformat()
        session_data = {
            "user_id": user_id,
            "session_title": session_in.session_title,
            "created_at": now,
            "updated_at": now
        }
        
        if self.is_mock:
            session_id = str(uuid.uuid4())
            session_data["id"] = session_id
            session_data["_id"] = session_id
            MOCK_SESSIONS[session_id] = session_data
            return UserChatSessionDB(**session_data)

        try:
            result = await self.sessions_collection.insert_one(session_data)
            if result and result.inserted_id:
                session_data["id"] = str(result.inserted_id)
                return UserChatSessionDB(**session_data)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in ChatRepository.create_chat_session for user {user_id}: {e}")
            raise

    async def get_chat_sessions_by_user_id(self, user_id: str, skip: int = 0, limit: int = 100) -> List[UserChatSessionDB]:
        if self.is_mock:
            user_sessions = [s for s in MOCK_SESSIONS.values() if s["user_id"] == user_id]
            user_sessions.sort(key=lambda x: x["updated_at"], reverse=True)
            return [UserChatSessionDB(**s) for s in user_sessions[skip:skip+limit]]

        try:
            cursor = self.sessions_collection.find(
                filter={"user_id": user_id},
                sort={"updated_at": -1},
                limit=limit,
                skip=skip
            )
            results = await cursor.to_list()
            return [UserChatSessionDB(id=str(row["_id"]), **row) for row in results]
        except Exception as e:
            logger.error(f"Astra DB error in ChatRepository.get_chat_sessions_by_user_id for user {user_id}: {e}")
            raise

    async def get_chat_session_by_id(self, session_id: str, user_id: str) -> Optional[UserChatSessionDB]:
        if self.is_mock:
            session = MOCK_SESSIONS.get(session_id)
            if session and session["user_id"] == user_id:
                return UserChatSessionDB(**session)
            return None

        try:
            row = await self.sessions_collection.find_one({"_id": session_id, "user_id": user_id})
            if row:
                return UserChatSessionDB(id=str(row["_id"]), **row)
            return None
        except Exception as e:
            logger.error(f"Astra DB error in ChatRepository.get_chat_session_by_id for session {session_id}: {e}")
            raise

    async def update_chat_session_title(self, session_id: str, user_id: str, title: str) -> Optional[UserChatSessionDB]:
        now = datetime.utcnow().isoformat()
        
        if self.is_mock:
            session = MOCK_SESSIONS.get(session_id)
            if session and session["user_id"] == user_id:
                session["session_title"] = title
                session["updated_at"] = now
                return UserChatSessionDB(**session)
            return None

        try:
            result = await self.sessions_collection.update_one(
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
        if self.is_mock:
            session = MOCK_SESSIONS.get(session_id)
            if session and session["user_id"] == user_id:
                del MOCK_SESSIONS[session_id]
                # Delete history too
                keys_to_delete = [k for k, v in MOCK_HISTORY.items() if v["user_chat_session_id"] == session_id]
                for k in keys_to_delete:
                    del MOCK_HISTORY[k]
                return True
            return False

        try:
            res_session = await self.sessions_collection.delete_one({"_id": session_id, "user_id": user_id})
            if res_session.deleted_count > 0:
                await self.history_collection.delete_many({"user_chat_session_id": session_id})
                return True
            return False
        except Exception as e:
            logger.error(f"Astra DB error in ChatRepository.delete_chat_session for session {session_id}: {e}")
            raise

    async def get_messages_by_session_id(self, session_id: str, user_id: str, skip: int = 0, limit: int = 100) -> List[ChatMessageDB]:
        if self.is_mock:
            # Verify session access first
            session = MOCK_SESSIONS.get(session_id)
            if not session or session["user_id"] != user_id:
                return []
            
            messages = [m for m in MOCK_HISTORY.values() if m["user_chat_session_id"] == session_id]
            messages.sort(key=lambda x: x["timestamp"])
            return [ChatMessageDB(**m) for m in messages[skip:skip+limit]]

        try:
            session = await self.sessions_collection.find_one({"_id": session_id, "user_id": user_id})
            if not session:
                return []

            cursor = self.history_collection.find(
                filter={"user_chat_session_id": session_id},
                sort={"timestamp": 1},
                limit=limit,
                skip=skip
            )
            results = await cursor.to_list()
            return [ChatMessageDB(id=str(row["_id"]), **row) for row in results]
        except Exception as e:
            logger.error(f"Astra DB error in ChatRepository.get_messages_by_session_id for session {session_id}: {e}")
            raise

    async def add_message_to_history(self, message_in: ChatMessageCreate, user_id: str) -> Optional[ChatMessageDB]:
        now = datetime.utcnow().isoformat()
        message_data = message_in.dict()
        message_data["timestamp"] = now

        if self.is_mock:
            # Verify session access
            session = MOCK_SESSIONS.get(message_in.user_chat_session_id)
            if not session or session["user_id"] != user_id:
                return None
            
            msg_id = str(uuid.uuid4())
            message_data["id"] = msg_id
            message_data["_id"] = msg_id
            MOCK_HISTORY[msg_id] = message_data
            
            # Update session timestamp
            session["updated_at"] = now
            
            return ChatMessageDB(**message_data)

        try:
            session = await self.sessions_collection.find_one({"_id": message_in.user_chat_session_id, "user_id": user_id})
            if not session:
                return None
            
            result = await self.history_collection.insert_one(message_data)
            if result and result.inserted_id:
                await self.sessions_collection.update_one(
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
