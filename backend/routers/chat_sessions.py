from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from typing import List, Optional
import asyncpg
import uuid
import json
import traceback

from backend.core import crud_operations
from backend.core.models import chat_models, user_models
from backend.auth import security
from backend.core.db.pg_connector import get_db_connection

async def get_llm_response(user_message: str, history: List[chat_models.ChatMessagePublic]) -> str:
    print(f"[CHAT ROUTER SIMULATE LLM] Received user message: {user_message}, history length: {len(history)}")
    return f"Simulated LLM response to: {user_message}"

router = APIRouter(
    prefix="/users/me/chat_sessions",
    tags=["User Chat Sessions"],
)

@router.post("/", response_model=chat_models.UserChatSessionDB, status_code=status.HTTP_201_CREATED)
async def create_new_chat_session_for_user(
    session_in: chat_models.UserChatSessionCreate,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    if not session_in.session_title: 
        session_in.session_title = f"Chat Session - {uuid.uuid4().hex[:8]}"
    
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.firebase_uid} creating chat session: {session_in.session_title}")    
    created_session = await crud_operations.create_user_chat_session(
        conn=db_conn, user_id=current_user.firebase_uid, session_in=session_in
    )
    if not created_session:
        print(f"[CHAT SESSION ROUTER ERROR] Could not create chat session for user {current_user.firebase_uid}.")
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
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.firebase_uid} listing chat sessions. Skip: {skip}, Limit: {limit}")
    sessions = await crud_operations.get_user_chat_sessions(
        conn=db_conn, user_id=current_user.firebase_uid, skip=skip, limit=limit
    )
    print(f"[CHAT SESSION ROUTER INFO] Found {len(sessions)} chat sessions for user {current_user.firebase_uid}.")
    return sessions

@router.get("/{session_id}", response_model=chat_models.UserChatSessionDB)
async def get_specific_user_chat_session(
    session_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.firebase_uid} fetching chat session ID: {session_id}")
    session = await crud_operations.get_user_chat_session_by_id(
        conn=db_conn, session_id=session_id, user_id=current_user.firebase_uid
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
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.firebase_uid} deleting chat session ID: {session_id}")
    deleted = await crud_operations.delete_user_chat_session(
        conn=db_conn, session_id=session_id, user_id=current_user.firebase_uid
    )
    if not deleted:
        print(f"[CHAT SESSION ROUTER WARN] Chat session ID: {session_id} not found or not owned by user {current_user.firebase_uid} for deletion.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or not owned by user.")
    print(f"[CHAT SESSION ROUTER INFO] Chat session ID: {session_id} deleted for user {current_user.firebase_uid}.")
    return None

@router.get("/{session_id}/history", response_model=List[chat_models.ChatMessagePublic])
async def get_messages_for_session(
    session_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    limit: int = Query(50, ge=1, le=200) 
):
    print(f"[CHAT MSG ROUTER INFO] User {current_user.firebase_uid} fetching history for session ID: {session_id}. Limit: {limit}")
    session = await crud_operations.get_user_chat_session_by_id(
        conn=db_conn, session_id=session_id, user_id=current_user.firebase_uid
    )
    if not session:
        print(f"[CHAT MSG ROUTER WARN] Session ID: {session_id} not found or not accessible by user {current_user.firebase_uid} for history.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or not accessible.")
        
    messages = await crud_operations.get_chat_history(
        conn=db_conn, user_chat_session_id=session_id, limit=limit
    )
    print(f"[CHAT MSG ROUTER INFO] Found {len(messages)} messages for session ID: {session_id} for user {current_user.firebase_uid}.")
    return messages

@router.post("/{session_id}/messages", response_model=chat_models.ChatMessagePublic)
async def add_message_to_session(
    session_id: int,
    message_in: chat_models.ChatMessageCreate,
    request: Request, # Moved before default arguments
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    print(f"[CHAT MSG ROUTER INFO] User {current_user.firebase_uid} adding message to session ID: {session_id}.")
    session = await crud_operations.get_user_chat_session_by_id(
        conn=db_conn, session_id=session_id, user_id=current_user.firebase_uid
    )
    if not session:
        print(f"[CHAT MSG ROUTER WARN] Session ID: {session_id} not found or not accessible by user {current_user.firebase_uid} for adding message.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or not accessible.")

    print(f"[CHAT MSG ROUTER DEBUG] Saving user message for session ID: {session_id}.")
    user_saved_message = await crud_operations.add_chat_message(
        conn=db_conn,
        user_chat_session_id=session_id,
        role="user",
        message_content=message_in.message_content,
        metadata=message_in.metadata
    )
    if not user_saved_message:
        print(f"[CHAT MSG ROUTER ERROR] Could not save user message for session ID: {session_id}.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save user message.")
    print(f"[CHAT MSG ROUTER DEBUG] User message ID {user_saved_message.id} saved for session ID: {session_id}.")

    print(f"[CHAT MSG ROUTER DEBUG] Fetching history for LLM context for session ID: {session_id}.")
    history_for_llm = await crud_operations.get_chat_history(conn=db_conn, user_chat_session_id=session_id, limit=20)
    print(f"[CHAT MSG ROUTER DEBUG] Fetched {len(history_for_llm)} messages for LLM context for session ID: {session_id}.")

    try:
        print(f"[CHAT MSG ROUTER DEBUG] Getting LLM response for session ID: {session_id}.")
        llm_response_content = await get_llm_response(message_in.message_content, history_for_llm)
        print(f"[CHAT MSG ROUTER DEBUG] LLM response received for session ID: {session_id}.")
    except Exception as e:
        print(f"[CHAT MSG ROUTER ERROR] Error calling LLM for session ID: {session_id}: {e}")
        print(f"[CHAT MSG ROUTER DEBUG] Saving system error message for LLM failure for session ID: {session_id}.")
        await crud_operations.add_chat_message(
            conn=db_conn, user_chat_session_id=session_id, role="system",
            message_content=f"Error processing your request: LLM call failed. Details: {str(e)[:100]}...",
            metadata={"error": True, "source": "llm_call"}
        )
        print(f"[CHAT MSG ROUTER DEBUG] System error message saved for session ID: {session_id}.")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error communicating with Tria (LLM): {e}")

    print(f"[CHAT MSG ROUTER DEBUG] Saving assistant message for session ID: {session_id}.")
    assistant_saved_message = await crud_operations.add_chat_message(
        conn=db_conn,
        user_chat_session_id=session_id,
        role="assistant",
        message_content=llm_response_content,
        metadata={"llm_model_name": "simulated_tria_v1"}
    )
    if not assistant_saved_message:
        print(f"CRITICAL: User message {user_saved_message.id} saved, but failed to save assistant response for session {session_id}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save Tria's response.")
    
    print(f"[CHAT MSG ROUTER INFO] Assistant message ID {assistant_saved_message.id} saved for session ID: {session_id}. Returning assistant message.")
    return assistant_saved_message
