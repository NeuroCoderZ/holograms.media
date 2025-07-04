from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional
import asyncpg
import logging

from backend.services.chat_service import ChatService
from backend.core import models as core_models
from backend.auth import security
from backend.core.db.pg_connector import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter(
    # Prefix will be set in app.py, e.g., /api/v1/chat
    tags=["Chat Sessions"], # Renamed tag for clarity
)

class CreateSessionPayload(core_models.UserChatSessionBase):
    # Allow session_title to be optional on creation, service can provide default
    session_title: Optional[str] = None

@router.post("/sessions/", response_model=core_models.UserChatSessionDB, status_code=status.HTTP_201_CREATED)
async def create_chat_session_endpoint(
    payload: CreateSessionPayload,
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    chat_service = ChatService(db_conn)
    # Service method create_new_chat_session takes user_id and optional title
    session = await chat_service.create_new_chat_session(
        user_id=current_user.firebase_uid,
        session_title=payload.session_title
    )
    if not session:
        logger.error(f"Router: Failed to create chat session for user {current_user.firebase_uid}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create chat session.")
    return session

@router.get("/sessions/", response_model=List[core_models.UserChatSessionDB])
async def list_chat_sessions_endpoint(
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    chat_service = ChatService(db_conn)
    sessions = await chat_service.list_user_chat_sessions(user_id=current_user.firebase_uid, skip=skip, limit=limit)
    return sessions

@router.get("/sessions/{session_id}", response_model=core_models.UserChatSessionDB)
async def get_chat_session_endpoint(
    session_id: int,
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    chat_service = ChatService(db_conn)
    session = await chat_service.get_specific_user_chat_session(session_id=session_id, user_id=current_user.firebase_uid)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or not accessible.")
    return session

class UpdateSessionPayload(core_models.UserChatSessionBase):
    session_title: str # Title is required for update here

@router.put("/sessions/{session_id}", response_model=core_models.UserChatSessionDB)
async def update_chat_session_endpoint(
    session_id: int,
    payload: UpdateSessionPayload,
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    chat_service = ChatService(db_conn)
    updated_session = await chat_service.update_chat_session_title(
        session_id=session_id,
        user_id=current_user.firebase_uid,
        title=payload.session_title
    )
    if not updated_session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or update failed.")
    return updated_session

@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session_endpoint(
    session_id: int,
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    chat_service = ChatService(db_conn)
    deleted = await chat_service.delete_specific_user_chat_session(session_id=session_id, user_id=current_user.firebase_uid)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or could not be deleted.")
    return None

@router.post("/sessions/{session_id}/messages/", response_model=core_models.ChatMessagePublic)
async def add_message_to_session_endpoint(
    session_id: int,
    message_in: core_models.NewChatMessageRequest,
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    chat_service = ChatService(db_conn)

    if message_in.role != 'user': # This endpoint is for user-initiated messages that expect an AI response
        logger.warning(f"Router: Attempt to add non-user message via user endpoint for session {session_id}.")
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This endpoint is for user messages only.")

    # The service method add_message_to_session handles saving user message and then getting/saving AI response.
    response_message = await chat_service.add_message_to_session(
        session_id=session_id,
        user=current_user,
        message_content=message_in.message_content,
        role=message_in.role,
        metadata=message_in.metadata
    )
    if not response_message:
        logger.error(f"Router: Failed to process message or get AI response for session {session_id}, user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to process message or get AI response.")
    return response_message


@router.get("/sessions/{session_id}/messages/", response_model=List[core_models.ChatMessageDB])
async def list_messages_for_session_endpoint(
    session_id: int,
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
):
    chat_service = ChatService(db_conn)
    messages = await chat_service.get_messages_for_session(
        session_id=session_id,
        user_id=current_user.firebase_uid,
        skip=skip,
        limit=limit
    )
    return messages

@router.get("/sessions/{session_id}/history", response_model=core_models.ChatSessionWithHistory)
async def get_session_with_history_endpoint(
    session_id: int,
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    message_skip: int = Query(0, ge=0), # Renamed from skip for clarity
    message_limit: int = Query(100, ge=1, le=200) # Renamed from limit for clarity
):
    chat_service = ChatService(db_conn)
    session_with_history = await chat_service.get_session_with_history(
        session_id=session_id,
        user_id=current_user.firebase_uid,
        message_skip=message_skip,
        message_limit=message_limit
    )
    if not session_with_history:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or not accessible.")
    return session_with_history

```
