from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import List, Optional # Ensure List, Optional are imported
import asyncpg
import uuid # For generating a default session_id if needed by LLM logic before DB insertion

# Assuming LLM and message types are accessible, e.g., from app or a service module.
# This is a placeholder for where they would be imported from.
# from backend.app import codestral_llm # Example: direct import if available globally
# For now, we'll mock or simulate LLM interaction if needed for add_message.
# from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from backend.db import crud_operations
from backend.models import chat_models, user_models # For UserInDB type hint
from backend.auth import security
from backend.db.pg_connector import get_db_connection

# Placeholder for LLM logic - in a real app, this would be more sophisticated
# and likely reside in a service layer.
async def get_llm_response(user_message: str, history: List[chat_models.ChatMessagePublic]) -> str:
    # Simulate LLM call for now
    # In a real scenario:
    #   messages_for_llm = [SystemMessage(content="You are Tria...")]
    #   for msg in history:
    #       if msg.role == 'user': messages_for_llm.append(HumanMessage(content=msg.message_content))
    #       elif msg.role == 'assistant': messages_for_llm.append(AIMessage(content=msg.message_content))
    #   messages_for_llm.append(HumanMessage(content=user_message))
    #   if codestral_llm: # This would be your actual LLM instance
    #       response = await codestral_llm.ainvoke(messages_for_llm)
    #       return response.content
    #   else:
    #       return "LLM not available at the moment."
    print(f"[CHAT ROUTER SIMULATE LLM] Received user message: {user_message}, history length: {len(history)}")
    return f"Simulated LLM response to: {user_message}"


router = APIRouter(
    prefix="/users/me/chat_sessions",
    tags=["User Chat Sessions"],
)

@router.post("/", response_model=chat_models.UserChatSession, status_code=status.HTTP_201_CREATED)
async def create_new_chat_session_for_user(
    session_in: chat_models.ChatSessionCreate,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Create a new chat session for the authenticated user.
    """
    if not session_in.session_title: 
        session_in.session_title = f"Chat Session - {uuid.uuid4().hex[:8]}"
    
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.firebase_uid} creating chat session: {session_in.session_title}")    
    created_session = await crud_operations.create_user_chat_session(
        conn=db_conn, user_id=current_user.firebase_uid, session_in=session_in # Use firebase_uid
    )
    if not created_session:
        print(f"[CHAT SESSION ROUTER ERROR] Could not create chat session for user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create chat session.")
    print(f"[CHAT SESSION ROUTER INFO] Chat session ID {created_session.id} created for user {current_user.firebase_uid}.")
    return created_session

@router.get("/", response_model=List[chat_models.UserChatSession])
async def list_user_chat_sessions(
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200)
):
    """
    List all chat sessions for the current authenticated user.
    """
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.firebase_uid} listing chat sessions. Skip: {skip}, Limit: {limit}") # Use firebase_uid
    sessions = await crud_operations.get_user_chat_sessions(
        conn=db_conn, user_id=current_user.firebase_uid, skip=skip, limit=limit # Use firebase_uid
    )
    print(f"[CHAT SESSION ROUTER INFO] Found {len(sessions)} chat sessions for user {current_user.firebase_uid}.")
    return sessions

@router.get("/{session_id}", response_model=chat_models.UserChatSession)
async def get_specific_user_chat_session(
    session_id: int,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Get details of a specific chat session owned by the user.
    """
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.firebase_uid} fetching chat session ID: {session_id}") # Use firebase_uid
    session = await crud_operations.get_user_chat_session_by_id(
        conn=db_conn, session_id=session_id, user_id=current_user.firebase_uid # Use firebase_uid
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
    """
    Delete a specific chat session and its associated messages (due to CASCADE).
    """
    print(f"[CHAT SESSION ROUTER INFO] User {current_user.firebase_uid} deleting chat session ID: {session_id}") # Use firebase_uid
    deleted = await crud_operations.delete_user_chat_session(
        conn=db_conn, session_id=session_id, user_id=current_user.firebase_uid # Use firebase_uid
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
    """
    Get chat messages for a specific session owned by the user.
    Replaces old /api/chat_history.
    """
    print(f"[CHAT MSG ROUTER INFO] User {current_user.firebase_uid} fetching history for session ID: {session_id}. Limit: {limit}") # Use firebase_uid
    session = await crud_operations.get_user_chat_session_by_id(
        conn=db_conn, session_id=session_id, user_id=current_user.firebase_uid # Use firebase_uid
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
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Add a new message from the user to a specific chat session,
    get a response from Tria (LLM), and save both.
    Replaces main logic of old /chat endpoint.
    """
    print(f"[CHAT MSG ROUTER INFO] User {current_user.firebase_uid} adding message to session ID: {session_id}.") # Use firebase_uid
    session = await crud_operations.get_user_chat_session_by_id(
        conn=db_conn, session_id=session_id, user_id=current_user.firebase_uid # Use firebase_uid
    )
    if not session:
        print(f"[CHAT MSG ROUTER WARN] Session ID: {session_id} not found or not accessible by user {current_user.firebase_uid} for adding message.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chat session not found or not accessible.")

    # 1. Save user's message
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

    # 2. Get current history to provide context to LLM
    # This should ideally be limited to recent messages for performance/cost.
    # For now, fetching up to 'limit' messages as context.
    print(f"[CHAT MSG ROUTER DEBUG] Fetching history for LLM context for session ID: {session_id}.")
    history_for_llm = await crud_operations.get_chat_history(conn=db_conn, user_chat_session_id=session_id, limit=20) # Example limit for context
    print(f"[CHAT MSG ROUTER DEBUG] Fetched {len(history_for_llm)} messages for LLM context for session ID: {session_id}.")

    # 3. Get LLM response (simulated or real)
    try:
        print(f"[CHAT MSG ROUTER DEBUG] Getting LLM response for session ID: {session_id}.")
        llm_response_content = await get_llm_response(message_in.message_content, history_for_llm)
        print(f"[CHAT MSG ROUTER DEBUG] LLM response received for session ID: {session_id}.")
    except Exception as e:
        # Log LLM call error
        print(f"[CHAT MSG ROUTER ERROR] Error calling LLM for session ID: {session_id}: {e}")
        # Optionally save a system error message to chat history here
        print(f"[CHAT MSG ROUTER DEBUG] Saving system error message for LLM failure for session ID: {session_id}.")
        await crud_operations.add_chat_message(
            conn=db_conn, user_chat_session_id=session_id, role="system",
            message_content=f"Error processing your request: LLM call failed. Details: {str(e)[:100]}...",
            metadata={"error": True, "source": "llm_call"}
        )
        print(f"[CHAT MSG ROUTER DEBUG] System error message saved for session ID: {session_id}.")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=f"Error communicating with Tria (LLM): {e}")

    # 4. Save assistant's message
    print(f"[CHAT MSG ROUTER DEBUG] Saving assistant message for session ID: {session_id}.")
    assistant_saved_message = await crud_operations.add_chat_message(
        conn=db_conn,
        user_chat_session_id=session_id,
        role="assistant",
        message_content=llm_response_content,
        metadata={"llm_model_name": "simulated_tria_v1"} # Example metadata
    )
    if not assistant_saved_message:
        # This is problematic, user message saved but assistant response failed to save.
        # Log this inconsistency.
        print(f"CRITICAL: User message {user_saved_message.id} saved, but failed to save assistant response for session {session_id}")
        # For now, we'll return the user's saved message if assistant save fails,
        # or raise an error indicating partial success / server error.
        # Let's raise an error as the operation is not fully complete.
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not save Tria's response.")
    
    print(f"[CHAT MSG ROUTER INFO] Assistant message ID {assistant_saved_message.id} saved for session ID: {session_id}. Returning assistant message.")
    # For this endpoint, we usually return the assistant's response.
    return assistant_saved_message
```
