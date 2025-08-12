from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import List, Optional # Removed Dict, Any, uuid, json, traceback as they are not directly used by router now
import asyncpg
# import uuid # No longer needed for default session title here
# import json # No longer needed for pub/sub here
# import traceback # No longer needed for pub/sub here

# from backend.core import crud_operations # REMOVED
from backend.services.chat_service import ChatService # ADDED
from backend.core.models import chat_models, user_models
from backend.auth import security
from backend.core.db.pg_connector import get_db_connection

# Removed: async def get_llm_response(...) - this logic is now in ChatService (as a stub)

router = APIRouter(
    prefix="/users/me/chat_sessions",
    tags=["Chat Sessions (Legacy)"], # Updated tag to match app.py
)

@router.post("/", response_model=chat_models.UserChatSessionDB, status_code=status.HTTP_201_CREATED)
async def create_new_chat_session_for_user(
    session_in: chat_models.UserChatSessionCreate,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    chat_service = ChatService(db_conn)
    # Логика присвоения default title теперь в сервисе
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.firebase_uid} creating chat session: {session_in.session_title or 'Default Title'}")
    created_session = await chat_service.create_new_chat_session(
        user_id=current_user.firebase_uid, session_in=session_in
    )
    if not created_session:
        print(f"[CHAT SESSION ROUTER ERROR] Could not create chat session for user {current_user.firebase_uid}.")
        # Сервис может вернуть None при ошибке, здесь мы это преобразуем в HTTPException
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create chat session.")
    print(f"[CHAT SESSION ROUTER INFO] Chat session ID {created_session.id} created for user {current_user.firebase_uid}.")
    return created_session

@router.get("/", response_model=List[chat_models.UserChatSessionDB])
async def list_user_chat_sessions(
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    chat_service = ChatService(db_conn)
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.firebase_uid} listing chat sessions. Skip: {skip}, Limit: {limit}")
    sessions = await chat_service.list_user_chat_sessions(
        user_id=current_user.firebase_uid, skip=skip, limit=limit
    )
    print(f"[CHAT SESSION ROUTER INFO] Found {len(sessions)} chat sessions for user {current_user.firebase_uid}.")
    return sessions

@router.get("/{session_id}", response_model=chat_models.UserChatSessionDB)
async def get_specific_user_chat_session(
    session_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    chat_service = ChatService(db_conn)
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.firebase_uid} fetching chat session ID: {session_id}")
    session = await chat_service.get_specific_user_chat_session(
        session_id=session_id, user_id=current_user.firebase_uid
    )
    if not session:
        print(f"[CHAT SESSION ROUTER WARN] Chat session ID: {session_id} not found for user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found.")
    print(f"[CHAT SESSION ROUTER INFO] Chat session ID: {session_id} found for user {current_user.firebase_uid}.")
    return session

@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_specific_user_chat_session(
    session_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    chat_service = ChatService(db_conn)
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.firebase_uid} deleting chat session ID: {session_id}")
    deleted = await chat_service.delete_specific_user_chat_session(
        session_id=session_id, user_id=current_user.firebase_uid
    )
    if not deleted:
        print(f"[CHAT SESSION ROUTER WARN] Chat session ID: {session_id} not found or not owned by user {current_user.firebase_uid} for deletion.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or not owned by user.")
    print(f"[CHAT SESSION ROUTER INFO] Chat session ID: {session_id} deleted for user {current_user.firebase_uid}.")
    return None # FastAPI автоматически вернет 204 No Content

@router.get("/{session_id}/history", response_model=List[chat_models.ChatMessagePublic])
async def get_messages_for_session(
    session_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    limit: int = Query(50, ge=1, le=200) 
):
    chat_service = ChatService(db_conn)
    print(f"[CHAT MSG ROUTER INFO] User {current_user.firebase_uid} fetching history for session ID: {session_id}. Limit: {limit}")

    # Сервис сам проверит доступ к сессии и вернет None если нет доступа или сессии
    messages = await chat_service.get_messages_for_session(
        session_id=session_id, user_id=current_user.firebase_uid, limit=limit
    )

    if messages is None: # Проверяем, что сервис не вернул None (означает, что сессия не найдена/недоступна)
        print(f"[CHAT MSG ROUTER WARN] Session ID: {session_id} not found or not accessible by user {current_user.firebase_uid} for history.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or not accessible.")
        
    print(f"[CHAT MSG ROUTER INFO] Found {len(messages)} messages for session ID: {session_id} for user {current_user.firebase_uid}.")
    return messages

@router.post("/{session_id}/messages", response_model=chat_models.ChatMessagePublic)
async def add_message_to_session(
    session_id: int,
    message_in: chat_models.ChatMessageCreate,
    # request: Request, # Request больше не нужен здесь, если Pub/Sub логика ушла в сервис или удалена
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    chat_service = ChatService(db_conn)
    print(f"[CHAT MSG ROUTER INFO] User {current_user.firebase_uid} adding message to session ID: {session_id}.")

    try:
        assistant_response_message = await chat_service.add_message_to_session(
            session_id=session_id, user=current_user, message_in=message_in
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
