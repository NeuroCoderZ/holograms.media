import asyncpg
from typing import List, Optional, Dict, Any
import uuid # Для генерации заголовка сессии по умолчанию

from backend.repositories.chat_repository import ChatRepository
from backend.core.models.chat_models import (
    UserChatSessionDB,
    UserChatSessionCreate,
    ChatMessageDB,
    ChatMessageCreate, # Используется в роутере, здесь будем принимать отдельные поля
    ChatMessagePublic
)
from backend.core.models.user_models import UserInDB # Для проверки пользователя

# Заглушка для LLM ответа
async def get_llm_response_stub(user_message: str, history: List[ChatMessagePublic]) -> str:
    # В будущем здесь будет вызов к LLM сервису
    # logger.info(f"LLM Stub: Received '{user_message}' with history length {len(history)}")
    return f"AI response to: {user_message}"

class ChatService:
    def __init__(self, conn: asyncpg.Connection):
        self.repo = ChatRepository(conn)

    async def create_new_chat_session(self, user_id: str, session_in: UserChatSessionCreate) -> Optional[UserChatSessionDB]:
        if not session_in.session_title:
            session_in.session_title = f"Chat Session - {uuid.uuid4().hex[:8]}"
        # Дополнительная бизнес-логика может быть здесь
        return await self.repo.create_chat_session(user_id=user_id, session_in=session_in)

    async def list_user_chat_sessions(self, user_id: str, skip: int, limit: int) -> List[UserChatSessionDB]:
        return await self.repo.get_chat_sessions_by_user_id(user_id=user_id, skip=skip, limit=limit)

    async def get_specific_user_chat_session(self, session_id: int, user_id: str) -> Optional[UserChatSessionDB]:
        # Проверка принадлежности сессии пользователю уже есть в репозитории
        return await self.repo.get_chat_session_by_id(session_id=session_id, user_id=user_id)

    async def delete_specific_user_chat_session(self, session_id: int, user_id: str) -> bool:
        # Проверка принадлежности и удаление в репозитории
        return await self.repo.delete_chat_session(session_id=session_id, user_id=user_id)

    async def get_messages_for_session(self, session_id: int, user_id: str, limit: int) -> Optional[List[ChatMessagePublic]]:
        # Сначала проверяем, что пользователь имеет доступ к сессии
        session = await self.repo.get_chat_session_by_id(session_id=session_id, user_id=user_id)
        if not session:
            return None # Или можно выбросить HTTPException(status_code=404, detail="Chat session not found or not accessible")

        return await self.repo.get_messages_by_session_id(session_id=session_id, limit=limit)

    async def add_message_to_session(
        self,
        session_id: int,
        user: UserInDB, # Принимаем объект UserInDB для user_id
        message_in: ChatMessageCreate # ChatMessageCreate из pydantic моделей
    ) -> Optional[ChatMessagePublic]:

        # 1. Проверить, принадлежит ли сессия пользователю
        session = await self.repo.get_chat_session_by_id(session_id=session_id, user_id=user.firebase_uid)
        if not session:
            # В роутере это вызовет HTTPException 404
            return None

        # 2. Сохранить сообщение пользователя
        # message_in.user_chat_session_id здесь не используется, так как session_id уже есть
        user_saved_message = await self.repo.add_message_to_history(
            session_id=session_id,
            role="user", # Роль берем из логики, а не из message_in, если это всегда 'user'
            message_content=message_in.message_content,
            metadata=message_in.metadata
        )
        if not user_saved_message:
            # В роутере это вызовет HTTPException 500
            return None

        # 3. (Заглушка) Сделать вызов к LLM для получения ответа
        # Для истории LLM, можно получить последние N сообщений
        history_for_llm = await self.repo.get_messages_by_session_id(session_id=session_id, limit=20) # limit=20 как в роутере

        try:
            llm_response_content = await get_llm_response_stub(message_in.message_content, history_for_llm)
        except Exception as e:
            # Если LLM падает, можно сохранить системное сообщение об ошибке
            await self.repo.add_message_to_history(
                session_id=session_id, role="system",
                message_content=f"Error processing your request: LLM call failed. Details: {str(e)[:100]}...",
                metadata={"error": True, "source": "llm_call_stub"}
            )
            raise # Передаем исключение дальше, чтобы роутер вернул 503

        # 4. Сохранить ответ AI
        assistant_saved_message = await self.repo.add_message_to_history(
            session_id=session_id,
            role="assistant",
            message_content=llm_response_content,
            metadata={"llm_model_name": "simulated_tria_v1_stub"} # Метаданные для ответа AI
        )
        if not assistant_saved_message:
            # Это критическая ошибка, если сообщение пользователя сохранено, а ответ AI нет
            # logger.critical(f"User message {user_saved_message.id} saved, but failed to save assistant response for session {session_id}")
            # В роутере это вызовет HTTPException 500
            return None

        # 5. Вернуть ответ AI (как ChatMessagePublic)
        # ChatMessagePublic - это псевдоним ChatMessageDB, так что assistant_saved_message уже подходит
        return ChatMessagePublic(**assistant_saved_message.dict())
