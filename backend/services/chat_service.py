# Removed asyncpg
from typing import List, Optional, Dict, Any, Union
import uuid # Для генерации заголовка сессии по умолчанию
import logging

from backend.repositories.chat_repository import ChatRepository
from backend.core.models import ( # Updated import
    UserChatSessionDB, UserChatSessionCreate,
    ChatMessageDB, ChatMessageCreate, ChatMessagePublic,
    ChatSessionWithHistory, UserInDB
)

logger = logging.getLogger(__name__)

import google.generativeai as genai
from backend.core.config import settings
from backend.llm.mistral_llm import get_mistral_response

if settings.GOOGLE_API_KEY:
    genai.configure(api_key=settings.GOOGLE_API_KEY)

import os
# Загружаем контекст проекта один раз при старте
LLM_CONTEXT = ""
context_path = os.path.join(os.path.dirname(__file__), "..", "llm_context.md")
try:
    with open(context_path, "r", encoding="utf-8") as f:
        LLM_CONTEXT = f.read()
    logger.info(f"LLM Context loaded successfully ({len(LLM_CONTEXT)} chars)")
except FileNotFoundError:
    logger.warning("llm_context.md not found. AI will be context-blind.")

# Основная функция интеграции: пытаемся Gemini, затем Mistral
async def get_llm_response(user_message: str, history: List[ChatMessageDB]) -> str:
    logger.info(f"LLM: Received '{user_message}' with history length {len(history)}")
    
    # Пытаемся использовать Gemini
    if settings.GOOGLE_API_KEY:
        try:
            formatted_history = []
            for msg in history:
                role = "user" if msg.role == "user" else "model"
                formatted_history.append({"role": role, "parts": [msg.message_content]})
                
            # Ранее использовалась 1.5-flash, по запросу обновлено до актуальной 3-flash-preview
            model = genai.GenerativeModel(
                model_name='models/gemini-3.0-flash-preview', 
                system_instruction=LLM_CONTEXT or "Ты АИ-ассистент Триа."
            )
            chat = model.start_chat(history=formatted_history)
            
            # Вызываем асинхронный метод
            response = await chat.send_message_async(user_message)
            return response.text
            
        except Exception as e:
            logger.error(f"Error calling Gemini API: {e}. Falling back to Mistral...")
    
    # Фоллбэк на Mistral (или основной выбор если ключ Gemini отсутствует)
    if settings.MISTRAL_API_KEY:
        try:
            return await get_mistral_response(user_message, history, LLM_CONTEXT or "Ты АИ-ассистент Триа.")
        except Exception as e:
            logger.error(f"Error calling Mistral API: {e}.")
            
    logger.warning("No LLM API keys available or both failed. Returning stub response.")
    return f"Триа (Заглушка): Я услышала '{user_message}', но мои ИИ-модули (Gemini/Mistral) не подключены к серверу."

class ChatService:
    def __init__(self, db: Any):
        self.repo = ChatRepository(db)

    async def create_new_chat_session(self, user_id: str, session_title: Optional[str] = None) -> Optional[UserChatSessionDB]:
        """ Renamed session_in to session_title for directness, matching my planned version. """
        if not session_title:
            session_title = f"Chat Session - {uuid.uuid4().hex[:8]}"
        session_in_create = UserChatSessionCreate(session_title=session_title)
        logger.info(f"Service: Creating chat session for user {user_id} with title '{session_title}'.")
        created_session = await self.repo.create_chat_session(user_id=user_id, session_in=session_in_create)
        if created_session:
            logger.info(f"Service: Chat session {created_session.id} created for user {user_id}.")
        else:
            logger.error(f"Service: Failed to create chat session for user {user_id}.")
        return created_session

    async def list_user_chat_sessions(self, user_id: str, skip: int = 0, limit: int = 100) -> List[UserChatSessionDB]:
        logger.info(f"Service: Listing chat sessions for user {user_id} (skip={skip}, limit={limit}).")
        return await self.repo.get_chat_sessions_by_user_id(user_id=user_id, skip=skip, limit=limit)

    async def get_specific_user_chat_session(self, session_id: int, user_id: str) -> Optional[UserChatSessionDB]:
        logger.info(f"Service: Getting chat session {session_id} for user {user_id}.")
        return await self.repo.get_chat_session_by_id(session_id=session_id, user_id=user_id)

    async def update_chat_session_title(self, session_id: int, user_id: str, title: str) -> Optional[UserChatSessionDB]:
        """
        Updates the title of a chat session, if it belongs to the user.
        """
        logger.info(f"Service: Updating title for session {session_id} (user: {user_id}) to '{title}'.")
        # Repository method get_chat_session_by_id checks ownership
        session = await self.repo.get_chat_session_by_id(session_id=session_id, user_id=user_id)
        if not session:
            logger.warning(f"Service: Session {session_id} not found or not owned by user {user_id} for title update.")
            return None
        return await self.repo.update_chat_session_title(session_id=session_id, user_id=user_id, title=title)

    async def delete_specific_user_chat_session(self, session_id: int, user_id: str) -> bool:
        logger.info(f"Service: Deleting session {session_id} for user {user_id}.")
        deleted = await self.repo.delete_chat_session(session_id=session_id, user_id=user_id)
        if deleted:
            logger.info(f"Service: Session {session_id} deleted successfully for user {user_id}.")
        else:
            logger.warning(f"Service: Session {session_id} not found or not deleted for user {user_id}.")
        return deleted

    async def get_messages_for_session(self, session_id: int, user_id: str, skip: int = 0, limit: int = 100) -> List[ChatMessageDB]: # Changed limit default, added skip
        logger.info(f"Service: Getting messages for session {session_id} (user: {user_id}), skip={skip}, limit={limit}.")
        # Repository method now checks user_id and supports pagination
        return await self.repo.get_messages_by_session_id(session_id=session_id, user_id=user_id, skip=skip, limit=limit)

    async def add_message_to_session(
        self,
        session_id: int,
        user: UserInDB,
        message_content: str, # Changed from message_in: ChatMessageCreate
        role: str = "user",   # Added role parameter
        metadata: Optional[Dict[str, Any]] = None # Added metadata parameter
    ) -> Optional[ChatMessagePublic]: # Return type is ChatMessagePublic, which is fine.

        logger.info(f"Service: Adding message to session {session_id} (user: {user.user_id}), role: {role}.")

        # Construct ChatMessageCreate before passing to repository
        message_in_create = ChatMessageCreate(
            user_chat_session_id=session_id,
            role=role,
            message_content=message_content,
            metadata=metadata or {}
        )

        # Repository's add_message_to_history now takes ChatMessageCreate and user_id for check
        user_saved_message = await self.repo.add_message_to_history(message_in=message_in_create, user_id=user.user_id)

        if not user_saved_message:
            logger.warning(f"Service: Failed to save user message to session {session_id} for user {user.user_id}.")
            return None # Indicates failure to save user message

        # If the message is from the user, then get LLM response
        if role == "user":
            logger.info(f"Service: User message saved (ID: {user_saved_message.id}), now getting LLM response.")
            history_for_llm = await self.repo.get_messages_by_session_id(session_id=session_id, user_id=user.user_id, limit=20) # Get recent history

            try:
                llm_response_content = await get_llm_response(message_content, history_for_llm)
            except Exception as e:
                logger.error(f"Service: LLM call failed for session {session_id}: {e}")
                # Optionally save a system error message to chat
                error_message_in = ChatMessageCreate(
                    user_chat_session_id=session_id, role="system",
                    message_content=f"Error: Could not get AI response. Details: {str(e)[:100]}...",
                    metadata={"error": True, "source": "llm_service_error"}
                )
                await self.repo.add_message_to_history(message_in=error_message_in, user_id=user.user_id) # System messages associated with user
                # Depending on desired behavior, could return user_saved_message or raise an error to be caught by router
                return ChatMessagePublic(**user_saved_message.dict()) # Return the user's message if LLM fails

            assistant_message_in = ChatMessageCreate(
                user_chat_session_id=session_id,
                role="assistant",
                message_content=llm_response_content,
                metadata={"llm_model_name": "simulated_tria_v1_stub"}
            )
            assistant_saved_message = await self.repo.add_message_to_history(message_in=assistant_message_in, user_id=user.user_id) # user_id for audit, though RLS won't apply to assistant messages in same way

            if not assistant_saved_message:
                logger.error(f"Service: User message saved, but failed to save assistant response for session {session_id}.")
                # Return user's message as a partial success, or handle error more explicitly
                return ChatMessagePublic(**user_saved_message.dict())

            return ChatMessagePublic(**assistant_saved_message.dict())
        else:
            # If message role is not 'user' (e.g. 'system'), just return the saved message
            return ChatMessagePublic(**user_saved_message.dict())

    async def get_session_with_history(self, session_id: int, user_id: str, message_skip: int = 0, message_limit: int = 100) -> Optional[ChatSessionWithHistory]:
        logger.info(f"Service: Getting session {session_id} with history for user {user_id}.")
        data = await self.repo.get_session_with_history(session_id=session_id, user_id=user_id, message_skip=message_skip, message_limit=message_limit)
        if data and data.get("session"):
            return ChatSessionWithHistory(
                id=data["session"].id,
                user_id=data["session"].user_id,
                session_title=data["session"].session_title,
                created_at=data["session"].created_at,
                updated_at=data["session"].updated_at,
                messages=[ChatMessagePublic(**message.dict()) for message in data["messages"]]
            )
        return None