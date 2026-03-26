from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from fastapi.responses import StreamingResponse
from typing import List, Optional, Any
import logging
# Removed asyncpg
# import uuid # No longer needed for default session title here
# import json # No longer needed for pub/sub here
# import traceback # No longer needed for pub/sub here

# from backend.core import crud_operations # REMOVED
from backend.services.chat_service import ChatService # ADDED
from backend.core.models import chat_models, user_models
from backend.auth import security
from backend.core.db.astra_connector import get_db
from backend.core.config import settings

# Removed: async def get_llm_response(...) - this logic is now in ChatService (as a stub)

router = APIRouter(
    prefix="/users/me/chat_sessions",
    tags=["Chat Sessions"],
)

logger = logging.getLogger(__name__)

# --- Simplified Chat Endpoint for Tria ---
@router.post("/direct", response_model=chat_models.ChatMessagePublic)
async def direct_chat_with_tria(
    message_in: chat_models.ChatMessageCreate,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db: Any = Depends(get_db)
):
    """
    Simplified endpoint that finds the last active session or creates a new one
    and sends the message. Used by the main Tria chat interface.
    """
    import traceback
    try:
        # DEBUG LOGS
        print(f"[DEBUG CHAT] Starting request. Message: {message_in.message_content[:50]}...")
        # print(f"[DEBUG CHAT] Settings.ASTRA_DB_API_ENDPOINT: '{settings.ASTRA_DB_API_ENDPOINT[:10]}...' (len={len(settings.ASTRA_DB_API_ENDPOINT)})")
        
        # Check DB connection immediately
        if db is None:
             print("[DEBUG CHAT] DB is None! Switching to In-Memory Mock Mode.")
             # raise HTTPException(status_code=503, detail="Database connection unavailable.") # REMOVED

        # Safe extraction of user_id (handle both dict and Pydantic model)
        if isinstance(current_user, dict):
            user_id = current_user.get("user_id") or current_user.get("id")
        else:
            user_id = getattr(current_user, "user_id", None) or getattr(current_user, "id", None)

        print(f"[DEBUG CHAT] Identified User ID: {user_id}")

        if not user_id:
             raise HTTPException(status_code=500, detail="Could not identify user (auth error).")

        if not db:
             logger.error("❌ Astra DB connection is not available in chat_sessions.")
             raise HTTPException(status_code=503, detail="Database connection is unavailable. Please check backend environment variables.")

        chat_service = ChatService(db)
        
        # 1. Find or create session
        print("[DEBUG CHAT] Listing sessions...")
        sessions = await chat_service.list_user_chat_sessions(user_id=user_id, limit=1)
        if sessions:
            session_id = sessions[0].id
            print(f"[DEBUG CHAT] Found existing session: {session_id}")
        else:
            print("[DEBUG CHAT] No session found, creating new one...")
            new_session = await chat_service.create_new_chat_session(
                user_id=user_id, 
                session_title="Tria Quick Chat"
            )
            if not new_session:
                 raise HTTPException(status_code=500, detail="Failed to create new chat session.")
            session_id = new_session.id
            print(f"[DEBUG CHAT] Created new session: {session_id}")
        
        # 2. Return StreamingResponse
        print("[DEBUG CHAT] Starting streaming response...")
        return StreamingResponse(
            chat_service.stream_message_to_session(
                session_id=session_id, 
                user=current_user, 
                message_content=message_in.message_content, 
                metadata=message_in.metadata
            ),
            media_type="text/event-stream"
        )

    except HTTPException as he:
        print(f"[DEBUG CHAT] HTTPException: {he.detail}")
        raise he
    except Exception as e:
        error_details = traceback.format_exc()
        print(f"[DIRECT CHAT CRITICAL ERROR] {error_details}")
        # Return a structured error so the frontend receives JSON, not just "Internal Server Error"
        # INCLUDE TRACEBACK IN DETAIL FOR ONE-TIME DEBUGGING
        raise HTTPException(status_code=500, detail=f"DEBUG TRACEBACK: {error_details}")


@router.post("/", response_model=chat_models.UserChatSessionDB, status_code=status.HTTP_201_CREATED)
async def create_new_chat_session_for_user(
    session_in: chat_models.UserChatSessionCreate,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db: Any = Depends(get_db)
):
    chat_service = ChatService(db)
    # Логика присвоения default title теперь в сервисе
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.user_id} creating chat session: {session_in.session_title or 'Default Title'}")
    created_session = await chat_service.create_new_chat_session(
        user_id=current_user.user_id, session_title=session_in.session_title
    )
    if not created_session:
        print(f"[CHAT SESSION ROUTER ERROR] Could not create chat session for user {current_user.user_id}.")
        # Сервис может вернуть None при ошибке, здесь мы это преобразуем в HTTPException
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create chat session.")
    print(f"[CHAT SESSION ROUTER INFO] Chat session ID {created_session.id} created for user {current_user.user_id}.")
    return created_session

@router.get("/", response_model=List[chat_models.UserChatSessionDB])
async def list_user_chat_sessions(
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db: Any = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    chat_service = ChatService(db)
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.user_id} listing chat sessions. Skip: {skip}, Limit: {limit}")
    sessions = await chat_service.list_user_chat_sessions(
        user_id=current_user.user_id, skip=skip, limit=limit
    )
    print(f"[CHAT SESSION ROUTER INFO] Found {len(sessions)} chat sessions for user {current_user.user_id}.")
    return sessions

@router.get("/{session_id}", response_model=chat_models.UserChatSessionDB)
async def get_specific_user_chat_session(
    session_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db: Any = Depends(get_db)
):
    chat_service = ChatService(db)
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.user_id} fetching chat session ID: {session_id}")
    session = await chat_service.get_specific_user_chat_session(
        session_id=session_id, user_id=current_user.user_id
    )
    if not session:
        print(f"[CHAT SESSION ROUTER WARN] Chat session ID: {session_id} not found for user {current_user.user_id}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found.")
    print(f"[CHAT SESSION ROUTER INFO] Chat session ID: {session_id} found for user {current_user.user_id}.")
    return session

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_specific_user_chat_session(
    session_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db: Any = Depends(get_db)
):
    chat_service = ChatService(db)
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.user_id} deleting chat session ID: {session_id}")
    deleted = await chat_service.delete_specific_user_chat_session(
        session_id=session_id, user_id=current_user.user_id
    )
    if not deleted:
        print(f"[CHAT SESSION ROUTER WARN] Chat session ID: {session_id} not found or not owned by user {current_user.user_id} for deletion.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or not owned by user.")
    print(f"[CHAT SESSION ROUTER INFO] Chat session ID: {session_id} deleted for user {current_user.user_id}.")
    return None # FastAPI автоматически вернет 204 No Content

@router.get("/{session_id}/history", response_model=List[chat_models.ChatMessagePublic])
async def get_messages_for_session(
    session_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db: Any = Depends(get_db),
    limit: int = Query(50, ge=1, le=200) 
):
    chat_service = ChatService(db)
    print(f"[CHAT MSG ROUTER INFO] User {current_user.user_id} fetching history for session ID: {session_id}. Limit: {limit}")

    # Сервис сам проверит доступ к сессии и вернет None если нет доступа или сессии
    messages = await chat_service.get_messages_for_session(
        session_id=session_id, user_id=current_user.user_id, limit=limit
    )

    if messages is None: # Проверяем, что сервис не вернул None (означает, что сессия не найдена/недоступна)
        print(f"[CHAT MSG ROUTER WARN] Session ID: {session_id} not found or not accessible by user {current_user.user_id} for history.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or not accessible.")
        
    print(f"[CHAT MSG ROUTER INFO] Found {len(messages)} messages for session ID: {session_id} for user {current_user.user_id}.")
    return messages

@router.post("/{session_id}/messages", response_model=chat_models.ChatMessagePublic)
async def add_message_to_session(
    session_id: int,
    message_in: chat_models.ChatMessageCreate,
    # request: Request, # Request больше не нужен здесь, если Pub/Sub логика ушла в сервис или удалена
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db: Any = Depends(get_db)
):
    chat_service = ChatService(db)
    print(f"[CHAT MSG ROUTER INFO] User {current_user.user_id} adding message to session ID: {session_id}.")

    try:
        assistant_response_message = await chat_service.add_message_to_session(
            session_id=session_id, user=current_user, message_content=message_in.message_content, metadata=message_in.metadata
        )
    except Exception as e: # Ловим общее исключение от сервиса (например, если LLM реально упал)
        print(f"[CHAT MSG ROUTER ERROR] Error from ChatService for session ID {session_id}: {e}")
        # Можно детализировать ошибку на основе типа исключения от сервиса
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error processing message: {str(e)}")

    if not assistant_response_message:
        # Это может случиться, если сессия не найдена, или не удалось сохранить сообщение пользователя/AI
        # Сервис должен был бы выбросить исключение, если что-то пошло не так критически,
        # но если он может вернуть None (например, при ненайденной сессии), обрабатываем это.
        print(f"[CHAT MSG ROUTER ERROR] Could not process message or session not found for session ID: {session_id}.")
        # Определяем более конкретный код ошибки в зависимости от логики сервиса
        # Если сервис проверяет сессию и возвращает None, то это 404. Если ошибка сохранения, то 500.
        # Предположим, что если assistant_response_message is None, то это проблема с сессией.
        # Для ошибок сохранения сервис должен был бы выбросить исключение.
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or message could not be processed.")

    print(f"[CHAT MSG ROUTER INFO] Assistant message ID {assistant_response_message.id} processed for session ID: {session_id}. Returning assistant message.")
    return assistant_response_message
