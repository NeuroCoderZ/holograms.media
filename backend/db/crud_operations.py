import asyncpg
from backend.utils.sanitization import mask_email
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

# Model imports
# UserCreate is no longer needed here as user creation is based on Firebase payload
from backend.models.user_models import UserInDB # UserCreate removed
from backend.models.gesture_models import GestureCreate, UserGesture
from backend.models.hologram_models import HologramCreate, UserHologram
from backend.models.chat_models import ChatSessionCreate, UserChatSession, ChatMessageCreate, ChatMessagePublic
from backend.models.prompt_models import PromptVersionCreate, UserPromptVersion
from backend.models.code_embedding_models import CodeEmbedding, CodeEmbeddingCreate
from backend.models.azr_models import AZRTask, AZRTaskCreate # Added AZR models
from backend.models.learning_log_models import LearningLogEntry, LearningLogEntryCreate # Added Learning Log models

# Security imports - get_password_hash is removed
# from backend.auth.security import get_password_hash

# Standard library imports
import os # Added for environment variable access in create_initial_users

# Model imports for InteractionChunk
from backend.models.interaction_chunk_model import InteractionChunkCreate, InteractionChunkDB

# Model imports for Tria Evolution and Code Embeddings
from backend.models.code_embedding_models import (
    TriaCodeEmbeddingCreate, TriaCodeEmbeddingDB
)
from backend.models.tria_evolution_models import (
    TriaAZRTaskCreate, TriaAZRTaskDB,
    TriaAZRTaskSolutionCreate, TriaAZRTaskSolutionDB,
    TriaLearningLogCreate, TriaLearningLogDB,
    TriaBotConfigurationCreate, TriaBotConfigurationDB,
    UserPromptTitleInfo # For the missing CRUD for prompt titles
)

# --- Users Table CRUD (Adapted for Firebase Auth) ---

async def get_user_by_firebase_uid(conn: asyncpg.Connection, firebase_uid: str) -> Optional[UserInDB]:
    """Fetches a user by their Firebase UID."""
    print(f"INFO: Attempting to fetch user by Firebase UID: {firebase_uid}")
    try:
        # Assumes 'users' table primary key is 'firebase_uid' or it's an indexed column.
        # If PK is still 'id' (integer) and 'firebase_uid' is another column:
        # query = "SELECT * FROM users WHERE firebase_uid = $1;"
        # If 'firebase_uid' is the PK (as intended by schema change):
        query = "SELECT * FROM users WHERE firebase_uid = $1;" # Changed from id to firebase_uid
        record = await conn.fetchrow(query, firebase_uid)
        if record:
            print(f"INFO: User with Firebase UID {firebase_uid} found.")
            return UserInDB(**dict(record))
        else:
            print(f"INFO: User with Firebase UID {firebase_uid} not found.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error fetching user with Firebase UID {firebase_uid}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while fetching user with Firebase UID {firebase_uid}: {e}")
        return None

async def get_or_create_user_by_firebase_payload(conn: asyncpg.Connection, firebase_payload: Dict[str, Any]) -> Optional[UserInDB]:
    """
    Retrieves a user by Firebase UID from the payload. If the user does not exist,
    it creates a new user record using information from the Firebase token payload.
    The `users` table's primary key is assumed to be `firebase_uid`.
    """
    firebase_uid = firebase_payload.get("uid")
    if not firebase_uid:
        print("ERROR: Firebase UID ('uid') missing from payload.")
        return None

    user = await get_user_by_firebase_uid(conn, firebase_uid)
    if user:
        print(f"INFO: User with Firebase UID {firebase_uid} found in DB.")
        return user

    # User not found, create them
    print(f"INFO: User with Firebase UID {firebase_uid} not found. Creating new user.")
    email = firebase_payload.get("email")
    email_verified = firebase_payload.get("email_verified", False)
    # display_name = firebase_payload.get("name") # Optional, if you want to store it
    # photo_url = firebase_payload.get("picture") # Optional

    # Default role for new users, can be adjusted
    role = "user" 
    # is_active can be defaulted to True for new Firebase users
    is_active = True 

    try:
        # Assuming users table schema is:
        # firebase_uid (PK, TEXT), email (TEXT, UNIQUE), email_verified (BOOLEAN),
        # role (VARCHAR), is_active (BOOLEAN), created_at (TIMESTAMPTZ), updated_at (TIMESTAMPTZ),
        # last_login_at (TIMESTAMPTZ), user_settings (JSONB)
        # hashed_password and username are removed.
        
        query = """
            INSERT INTO users (firebase_uid, email, email_verified, role, is_active, user_settings)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *; 
        """
        # user_settings can be defaulted to None or an empty dict {}
        created_user_record = await conn.fetchrow(
            query, firebase_uid, email, email_verified, role, is_active, None # user_settings = None
        )
        
        if created_user_record:
            print(f"INFO: User with Firebase UID {firebase_uid} created successfully.")
            return UserInDB(**dict(created_user_record))
        else:
            # This case should ideally not be reached if RETURNING * is used and insert is successful
            print(f"ERROR: Failed to create user with Firebase UID {firebase_uid} despite no error. Record not returned.")
            return None
            
    except asyncpg.UniqueViolationError as e:
        # This could happen if email is not unique, or firebase_uid if not caught by prior check (race condition)
        print(f"ERROR: Failed to create user with Firebase UID {firebase_uid}. Email '{email}' or UID might already exist. Details: {e}")
        # It might be better to fetch again if UniqueViolation is on firebase_uid, as another request might have just created it.
        # For now, return None.
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Database error creating user with Firebase UID {firebase_uid}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while creating user with Firebase UID {firebase_uid}: {e}")
        return None

# get_user_by_username is removed as username is no longer a primary identifier for auth.
# If needed for other purposes (e.g., admin search), it could be kept but not used in auth flow.

# get_user_by_email is removed as email is not the primary auth identifier.
# It could be kept for features like "forgot password" if not handled by Firebase, or for uniqueness checks.
# For now, assuming Firebase handles email lookups if needed for its own flows.

# get_user_by_id (using internal integer ID) is removed as firebase_uid is the primary key.
# If relations still use an internal integer ID, this function might be kept and firebase_uid column added.
# For this task, we assume firebase_uid (TEXT) is the PK.

async def update_user_email(conn: asyncpg.Connection, firebase_uid: str, new_email: str) -> bool:
    """Updates a user's email and updated_at timestamp, identified by Firebase UID."""
    # Note: Email updates should ideally be synced with Firebase Auth.
    # This function only updates the local DB.
    print(f"INFO: Attempting to update email for user with Firebase UID: {firebase_uid}")
    try:
        current_time_utc = datetime.now(timezone.utc)
        query = """
            UPDATE users
            SET email = $1, updated_at = $2
            WHERE firebase_uid = $3;
        """
        status = await conn.execute(query, new_email, current_time_utc, firebase_uid)
        if status.endswith("1"): # Example: "UPDATE 1" means one row was updated
            print(f"INFO: Email updated successfully for Firebase UID: {firebase_uid}")
            return True
        else:
            print(f"WARN: Failed to update email for Firebase UID: {firebase_uid}. User not found or no change made.")
            return False
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error updating email for Firebase UID {firebase_uid}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while updating email for Firebase UID {firebase_uid}: {e}")
        return False

async def update_user_last_login(conn: asyncpg.Connection, firebase_uid: str) -> bool:
    """Updates a user's last_login_at and updated_at timestamps, identified by Firebase UID."""
    print(f"INFO: Attempting to update last login for user with Firebase UID: {firebase_uid}")
    try:
        current_time_utc = datetime.now(timezone.utc)
        query = """
            UPDATE users
            SET last_login_at = $1, updated_at = $1 
            WHERE firebase_uid = $2;
        """
        # Using $1 for both fields as they should be the same current timestamp
        status = await conn.execute(query, current_time_utc, firebase_uid)
        if status.endswith("1"): # "UPDATE 1"
            print(f"INFO: Last login updated successfully for Firebase UID: {firebase_uid}")
            return True
        else:
            print(f"WARN: Failed to update last login for Firebase UID: {firebase_uid}. User not found.")
            return False
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error updating last login for Firebase UID {firebase_uid}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while updating last login for Firebase UID {firebase_uid}: {e}")
        return False

# --- User Chat Sessions Table CRUD ---
# Assuming user_id in user_chat_sessions table will now correspond to an internal auto-incrementing ID
# from the users table, IF the users table PK is not firebase_uid.
# If users.firebase_uid is the PK, then user_chat_sessions.user_id should be TEXT and store firebase_uid.
# For this change, let's assume user_id in related tables (like user_chat_sessions)
# will now be the firebase_uid (TEXT). This requires schema changes in those tables too.
# If an internal integer ID is kept as PK for users table, and firebase_uid is just a unique column,
# then these related table functions don't need user_id type change.
#
# **Decision**: For consistency with "firebase_uid as PK" goal, user_id in related tables
# like user_chat_sessions, user_gestures etc. should become firebase_uid (TEXT).
# This means all functions below taking `user_id: int` will need to be changed to `user_id: str` (firebase_uid).
# This is a significant change impacting all related CRUDs.

async def create_user_chat_session(conn: asyncpg.Connection, user_id: str, session_in: ChatSessionCreate) -> Optional[UserChatSession]: # user_id is now firebase_uid (str)
    """Creates a new chat session for a user (identified by Firebase UID)."""
    print(f"INFO: Attempting to create chat session for user Firebase UID: {user_id}, title: {session_in.session_title}")
    try:
        query = """
            INSERT INTO user_chat_sessions (user_id, session_title, created_at, updated_at)
            VALUES ($1, $2, $3, $3) 
            RETURNING *;
        """
        # Using $3 for both created_at and updated_at on creation
        current_time = datetime.now(timezone.utc)
        record = await conn.fetchrow(query, user_id, session_in.session_title, current_time)
        if record:
            print(f"INFO: Chat session created successfully with ID: {record['id']} for user ID: {user_id}")
            return UserChatSession(**dict(record))
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error creating chat session for user ID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while creating chat session for user ID {user_id}: {e}")
        return None

async def get_user_chat_sessions(conn: asyncpg.Connection, user_id: str, skip: int = 0, limit: int = 100) -> List[UserChatSession]: # user_id is str
    """Lists all chat sessions for a user (Firebase UID), ordered by most recently updated."""
    print(f"INFO: Attempting to get chat sessions for user Firebase UID: {user_id}, skip: {skip}, limit: {limit}")
    try:
        query = """
            SELECT * FROM user_chat_sessions
            WHERE user_id = $1
            ORDER BY updated_at DESC
            LIMIT $2 OFFSET $3;
        """
        records = await conn.fetch(query, user_id, limit, skip)
        print(f"INFO: Found {len(records)} chat sessions for user Firebase UID: {user_id}.")
        return [UserChatSession(**dict(record)) for record in records]
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting chat sessions for user Firebase UID {user_id}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting chat sessions for user Firebase UID {user_id}: {e}")
        return []

async def get_user_chat_session_by_id(conn: asyncpg.Connection, session_id: int, user_id: str) -> Optional[UserChatSession]: # user_id is str
    """Gets a specific chat session by its ID, ensuring it belongs to the user (Firebase UID)."""
    print(f"INFO: Attempting to get chat session ID: {session_id} for user Firebase UID: {user_id}")
    try:
        query = "SELECT * FROM user_chat_sessions WHERE id = $1 AND user_id = $2;"
        record = await conn.fetchrow(query, session_id, user_id)
        if record:
            print(f"INFO: Chat session ID: {session_id} found for user Firebase UID: {user_id}.")
            return UserChatSession(**dict(record))
        else:
            print(f"INFO: Chat session ID: {session_id} not found for user Firebase UID: {user_id}.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting chat session ID {session_id} for user Firebase UID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting chat session ID {session_id} for user Firebase UID {user_id}: {e}")
        return None

async def delete_user_chat_session(conn: asyncpg.Connection, session_id: int, user_id: str) -> bool: # user_id is str
    """Deletes a chat session, ensuring it belongs to the user (Firebase UID). Associated messages are deleted by CASCADE."""
    print(f"INFO: Attempting to delete chat session ID: {session_id} for user Firebase UID: {user_id}")
    try:
        query = "DELETE FROM user_chat_sessions WHERE id = $1 AND user_id = $2;"
        status = await conn.execute(query, session_id, user_id)
        if status.endswith("1"): # "DELETE 1"
            print(f"INFO: Chat session ID: {session_id} deleted successfully for user Firebase UID: {user_id}.")
            return True
        else:
            print(f"WARN: Failed to delete chat session ID: {session_id} for user Firebase UID: {user_id}. Session not found or not owned by user.")
            return False
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error deleting chat session ID {session_id} for user Firebase UID {user_id}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while deleting chat session ID {session_id} for user Firebase UID {user_id}: {e}")
        return False


# --- Chat History Table CRUD (Refactored) ---
# user_chat_session_id remains int as it's a FK to user_chat_sessions.id (PK, SERIAL)
# No changes needed here regarding user_id type, as it's indirect.

async def add_chat_message(
    conn: asyncpg.Connection,
    user_chat_session_id: int, 
    role: str,
    message_content: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[ChatMessagePublic]:
    """Adds a new chat message to a specific user_chat_session."""
    print(f"INFO: Attempting to add chat message for user_chat_session_id: {user_chat_session_id}")
    if role not in ('user', 'assistant', 'system'):
        print(f"ERROR: Invalid role '{role}'. Must be 'user', 'assistant', or 'system'.")
        return None
    try:
        query = """
            INSERT INTO chat_history (user_chat_session_id, role, message_content, metadata, timestamp)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *; 
        """
        current_time = datetime.now(timezone.utc)
        record = await conn.fetchrow(query, user_chat_session_id, role, message_content, metadata, current_time)
        if record:
            print(f"INFO: Chat message added successfully with ID: {record['id']} to session ID: {user_chat_session_id}")
            update_session_query = "UPDATE user_chat_sessions SET updated_at = $1 WHERE id = $2"
            await conn.execute(update_session_query, current_time, user_chat_session_id)
            return ChatMessagePublic(**dict(record))
        return None
    except asyncpg.ForeignKeyViolationError as e:
        print(f"ERROR: Error adding chat message. User chat session ID {user_chat_session_id} may not exist. Details: {e}")
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error adding chat message for session {user_chat_session_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while adding chat message for session {user_chat_session_id}: {e}")
        return None

async def get_chat_history(
    conn: asyncpg.Connection, 
    user_chat_session_id: int, 
    limit: int = 50
) -> List[ChatMessagePublic]:
    """Retrieves chat history for a given user_chat_session_id, ordered by timestamp DESC."""
    print(f"INFO: Attempting to get chat history for user_chat_session_id: {user_chat_session_id} with limit {limit}")
    try:
        query = """
            SELECT * FROM chat_history
            WHERE user_chat_session_id = $1
            ORDER BY timestamp ASC 
            LIMIT $2;
        """
        records = await conn.fetch(query, user_chat_session_id, limit)
        print(f"INFO: Found {len(records)} messages for user_chat_session_id {user_chat_session_id}.")
        return [ChatMessagePublic(**dict(record)) for record in records]
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting chat history for user_chat_session_id {user_chat_session_id}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting chat history for user_chat_session_id {user_chat_session_id}: {e}")
        return []

# --- User Gestures Table CRUD ---

async def create_user_gesture(conn: asyncpg.Connection, user_id: str, gesture_in: GestureCreate) -> Optional[UserGesture]: # user_id is str
    """Inserts a new gesture for the user (Firebase UID)."""
    print(f"INFO: Attempting to create gesture '{gesture_in.gesture_name}' for user Firebase UID: {user_id}")
    current_time = datetime.now(timezone.utc)
    try:
        query = """
            INSERT INTO user_gestures (user_id, gesture_name, gesture_data_ref, gesture_definition, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $5)
            RETURNING *;
        """
        record = await conn.fetchrow(
            query, user_id, gesture_in.gesture_name, gesture_in.gesture_data_ref, 
            gesture_in.gesture_definition, current_time
        )
        if record:
            print(f"INFO: Gesture '{gesture_in.gesture_name}' created successfully with ID: {record['id']} for user Firebase UID: {user_id}")
            return UserGesture(**dict(record))
        return None
    except asyncpg.UniqueViolationError:
        print(f"ERROR: Gesture name '{gesture_in.gesture_name}' already exists for user Firebase UID: {user_id}.")
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error creating gesture '{gesture_in.gesture_name}' for user Firebase UID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while creating gesture for user Firebase UID {user_id}: {e}")
        return None

async def get_user_gestures(conn: asyncpg.Connection, user_id: str, skip: int = 0, limit: int = 100) -> List[UserGesture]: # user_id is str
    """Lists all gestures for a user (Firebase UID)."""
    print(f"INFO: Attempting to get gestures for user Firebase UID: {user_id}, skip: {skip}, limit: {limit}")
    try:
        query = "SELECT * FROM user_gestures WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3;"
        records = await conn.fetch(query, user_id, limit, skip)
        print(f"INFO: Found {len(records)} gestures for user Firebase UID: {user_id}.")
        return [UserGesture(**dict(record)) for record in records]
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting gestures for user Firebase UID {user_id}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting gestures for user Firebase UID {user_id}: {e}")
        return []

async def get_user_gesture_by_id(conn: asyncpg.Connection, gesture_id: int, user_id: str) -> Optional[UserGesture]: # user_id is str
    """Gets a specific gesture by its ID, ensuring it belongs to the user (Firebase UID)."""
    print(f"INFO: Attempting to get gesture ID: {gesture_id} for user Firebase UID: {user_id}")
    try:
        query = "SELECT * FROM user_gestures WHERE id = $1 AND user_id = $2;"
        record = await conn.fetchrow(query, gesture_id, user_id)
        if record:
            print(f"INFO: Gesture ID: {gesture_id} found for user Firebase UID: {user_id}.")
            return UserGesture(**dict(record))
        else:
            print(f"INFO: Gesture ID: {gesture_id} not found for user Firebase UID: {user_id}.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting gesture ID {gesture_id} for user Firebase UID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting gesture ID {gesture_id} for user Firebase UID {user_id}: {e}")
        return None

async def update_user_gesture(conn: asyncpg.Connection, gesture_id: int, user_id: str, gesture_update_data: Dict[str, Any]) -> Optional[UserGesture]: # user_id is str
    """Updates a gesture (user identified by Firebase UID). Only allows updating gesture_name, gesture_definition, gesture_data_ref."""
    print(f"INFO: Attempting to update gesture ID: {gesture_id} for user Firebase UID: {user_id}")
    
    allowed_fields = {"gesture_name", "gesture_definition", "gesture_data_ref"}
    update_fields = {k: v for k, v in gesture_update_data.items() if k in allowed_fields}

    if not update_fields:
        print(f"WARN: No valid fields to update for gesture ID: {gesture_id}.")
        return await get_user_gesture_by_id(conn, gesture_id, user_id)

    update_fields["updated_at"] = datetime.now(timezone.utc)
    
    set_clause_parts = [f"{field} = ${i+1}" for i, field in enumerate(update_fields.keys())]
    set_clause = ", ".join(set_clause_parts)
    
    query = f"""
        UPDATE user_gestures
        SET {set_clause}
        WHERE id = ${len(update_fields) + 1} AND user_id = ${len(update_fields) + 2}
        RETURNING *;
    """
    values = list(update_fields.values()) + [gesture_id, user_id]
    
    try:
        record = await conn.fetchrow(query, *values)
        if record:
            print(f"INFO: Gesture ID: {gesture_id} updated successfully for user Firebase UID: {user_id}.")
            return UserGesture(**dict(record))
        else:
            print(f"WARN: Failed to update gesture ID: {gesture_id}. Not found or not owned by user Firebase UID: {user_id}.")
            return None
    except asyncpg.UniqueViolationError: 
        print(f"ERROR: Update failed for gesture ID {gesture_id}. Gesture name may already exist for user Firebase UID {user_id}.")
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error updating gesture ID {gesture_id} for user Firebase UID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while updating gesture ID {gesture_id} for user Firebase UID {user_id}: {e}")
        return None

async def delete_user_gesture(conn: asyncpg.Connection, gesture_id: int, user_id: str) -> bool: # user_id is str
    """Deletes a gesture, ensuring it belongs to the user (Firebase UID)."""
    print(f"INFO: Attempting to delete gesture ID: {gesture_id} for user Firebase UID: {user_id}")
    try:
        query = "DELETE FROM user_gestures WHERE id = $1 AND user_id = $2;"
        status = await conn.execute(query, gesture_id, user_id)
        if status.endswith("1"):
            print(f"INFO: Gesture ID: {gesture_id} deleted successfully for user Firebase UID: {user_id}.")
            return True
        else:
            print(f"WARN: Failed to delete gesture ID: {gesture_id}. Not found or not owned by user Firebase UID: {user_id}.")
            return False
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error deleting gesture ID {gesture_id} for user Firebase UID {user_id}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while deleting gesture ID {gesture_id} for user Firebase UID {user_id}: {e}")
        return False

# --- User Holograms Table CRUD ---

async def create_user_hologram(conn: asyncpg.Connection, user_id: str, hologram_in: HologramCreate) -> Optional[UserHologram]: # user_id is str
    """Creates a new hologram for the user (Firebase UID)."""
    print(f"INFO: Attempting to create hologram '{hologram_in.hologram_name}' for user Firebase UID: {user_id}")
    current_time = datetime.now(timezone.utc)
    try:
        query = """
            INSERT INTO user_holograms (user_id, hologram_name, hologram_state_data, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $4)
            RETURNING *;
        """
        record = await conn.fetchrow(
            query, user_id, hologram_in.hologram_name, hologram_in.hologram_state_data, current_time
        )
        if record:
            print(f"INFO: Hologram '{hologram_in.hologram_name}' created successfully with ID: {record['id']} for user Firebase UID: {user_id}")
            return UserHologram(**dict(record))
        return None
    except asyncpg.UniqueViolationError:
        print(f"ERROR: Hologram name '{hologram_in.hologram_name}' already exists for user Firebase UID: {user_id}.")
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error creating hologram '{hologram_in.hologram_name}' for user Firebase UID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while creating hologram for user Firebase UID {user_id}: {e}")
        return None

async def get_user_holograms(conn: asyncpg.Connection, user_id: str, skip: int = 0, limit: int = 100) -> List[UserHologram]: # user_id is str
    """Lists all holograms for a user (Firebase UID)."""
    print(f"INFO: Attempting to get holograms for user Firebase UID: {user_id}, skip: {skip}, limit: {limit}")
    try:
        query = "SELECT * FROM user_holograms WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3;"
        records = await conn.fetch(query, user_id, limit, skip)
        print(f"INFO: Found {len(records)} holograms for user Firebase UID: {user_id}.")
        return [UserHologram(**dict(record)) for record in records]
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting holograms for user Firebase UID {user_id}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting holograms for user Firebase UID {user_id}: {e}")
        return []

async def get_user_hologram_by_id(conn: asyncpg.Connection, hologram_id: int, user_id: str) -> Optional[UserHologram]: # user_id is str
    """Gets a specific hologram by its ID, ensuring it belongs to the user (Firebase UID)."""
    print(f"INFO: Attempting to get hologram ID: {hologram_id} for user Firebase UID: {user_id}")
    try:
        query = "SELECT * FROM user_holograms WHERE id = $1 AND user_id = $2;"
        record = await conn.fetchrow(query, hologram_id, user_id)
        if record:
            print(f"INFO: Hologram ID: {hologram_id} found for user Firebase UID: {user_id}.")
            return UserHologram(**dict(record))
        else:
            print(f"INFO: Hologram ID: {hologram_id} not found for user Firebase UID: {user_id}.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting hologram ID {hologram_id} for user Firebase UID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting hologram ID {hologram_id} for user Firebase UID {user_id}: {e}")
        return None

async def update_user_hologram(conn: asyncpg.Connection, hologram_id: int, user_id: str, hologram_update_data: Dict[str, Any]) -> Optional[UserHologram]: # user_id is str
    """Updates a hologram (user identified by Firebase UID). Only allows updating hologram_name, hologram_state_data."""
    print(f"INFO: Attempting to update hologram ID: {hologram_id} for user Firebase UID: {user_id}")
    
    allowed_fields = {"hologram_name", "hologram_state_data"}
    update_fields = {k: v for k, v in hologram_update_data.items() if k in allowed_fields}

    if not update_fields:
        print(f"WARN: No valid fields to update for hologram ID: {hologram_id}.")
        return await get_user_hologram_by_id(conn, hologram_id, user_id)

    update_fields["updated_at"] = datetime.now(timezone.utc)
    
    set_clause_parts = [f"{field} = ${i+1}" for i, field in enumerate(update_fields.keys())]
    set_clause = ", ".join(set_clause_parts)
    
    query = f"""
        UPDATE user_holograms
        SET {set_clause}
        WHERE id = ${len(update_fields) + 1} AND user_id = ${len(update_fields) + 2}
        RETURNING *;
    """
    values = list(update_fields.values()) + [hologram_id, user_id]
    
    try:
        record = await conn.fetchrow(query, *values)
        if record:
            print(f"INFO: Hologram ID: {hologram_id} updated successfully for user Firebase UID: {user_id}.")
            return UserHologram(**dict(record))
        else:
            print(f"WARN: Failed to update hologram ID: {hologram_id}. Not found or not owned by user Firebase UID: {user_id}.")
            return None
    except asyncpg.UniqueViolationError:
        print(f"ERROR: Update failed for hologram ID {hologram_id}. Hologram name may already exist for user Firebase UID {user_id}.")
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error updating hologram ID {hologram_id} for user Firebase UID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while updating hologram ID {hologram_id} for user Firebase UID {user_id}: {e}")
        return None

async def delete_user_hologram(conn: asyncpg.Connection, hologram_id: int, user_id: str) -> bool: # user_id is str
    """Deletes a hologram, ensuring it belongs to the user (Firebase UID)."""
    print(f"INFO: Attempting to delete hologram ID: {hologram_id} for user Firebase UID: {user_id}")
    try:
        query = "DELETE FROM user_holograms WHERE id = $1 AND user_id = $2;"
        status = await conn.execute(query, hologram_id, user_id)
        if status.endswith("1"):
            print(f"INFO: Hologram ID: {hologram_id} deleted successfully for user Firebase UID: {user_id}.")
            return True
        else:
            print(f"WARN: Failed to delete hologram ID: {hologram_id}. Not found or not owned by user Firebase UID: {user_id}.")
            return False
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error deleting hologram ID {hologram_id} for user Firebase UID {user_id}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while deleting hologram ID {hologram_id} for user Firebase UID {user_id}: {e}")
        return False

# --- User Prompt Versions Table CRUD ---

async def create_user_prompt_version(conn: asyncpg.Connection, user_id: str, prompt_in: PromptVersionCreate) -> Optional[UserPromptVersion]: # user_id is str
    """Creates a new prompt version for the user (Firebase UID), incrementing version number."""
    print(f"INFO: Attempting to create prompt version for title '{prompt_in.prompt_title}' for user Firebase UID: {user_id}")
    try:
        version_query = """
            SELECT MAX(version_number) FROM user_prompt_versions
            WHERE user_id = $1 AND prompt_title = $2;
        """
        max_version_record = await conn.fetchval(version_query, user_id, prompt_in.prompt_title)
        next_version = (max_version_record or 0) + 1
        
        insert_query = """
            INSERT INTO user_prompt_versions 
                (user_id, prompt_title, prompt_text, version_number, associated_hologram_id, metadata, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *;
        """
        current_time = datetime.now(timezone.utc)
        record = await conn.fetchrow(
            insert_query, user_id, prompt_in.prompt_title, prompt_in.prompt_text, 
            next_version, prompt_in.associated_hologram_id, prompt_in.metadata, current_time
        )
        if record:
            print(f"INFO: Prompt version '{prompt_in.prompt_title}' v{next_version} created successfully with ID: {record['id']} for user Firebase UID: {user_id}")
            return UserPromptVersion(**dict(record))
        return None
    except asyncpg.UniqueViolationError: 
        print(f"ERROR: Prompt version '{prompt_in.prompt_title}' v{next_version} creation failed due to unique constraint for user Firebase UID {user_id}.")
        return None 
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error creating prompt version '{prompt_in.prompt_title}' for user Firebase UID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while creating prompt version for user Firebase UID {user_id}: {e}")
        return None

async def get_user_prompt_versions_by_title(conn: asyncpg.Connection, user_id: str, prompt_title: str, skip: int = 0, limit: int = 100) -> List[UserPromptVersion]: # user_id is str
    """Lists all versions of a specific prompt for a user (Firebase UID), ordered by version number DESC."""
    print(f"INFO: Attempting to get prompt versions for title '{prompt_title}' for user Firebase UID: {user_id}")
    try:
        query = """
            SELECT * FROM user_prompt_versions 
            WHERE user_id = $1 AND prompt_title = $2 
            ORDER BY version_number DESC 
            LIMIT $3 OFFSET $4;
        """
        records = await conn.fetch(query, user_id, prompt_title, limit, skip)
        print(f"INFO: Found {len(records)} versions for prompt '{prompt_title}' for user Firebase UID: {user_id}.")
        return [UserPromptVersion(**dict(record)) for record in records]
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting prompt versions for '{prompt_title}' for user Firebase UID {user_id}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting prompt versions for user Firebase UID {user_id}: {e}")
        return []

async def get_user_prompt_version_by_id(conn: asyncpg.Connection, prompt_version_id: int, user_id: str) -> Optional[UserPromptVersion]: # user_id is str
    """Gets a specific prompt version by its ID, ensuring it belongs to the user (Firebase UID)."""
    print(f"INFO: Attempting to get prompt version ID: {prompt_version_id} for user Firebase UID: {user_id}")
    try:
        query = "SELECT * FROM user_prompt_versions WHERE id = $1 AND user_id = $2;"
        record = await conn.fetchrow(query, prompt_version_id, user_id)
        if record:
            print(f"INFO: Prompt version ID: {prompt_version_id} found for user Firebase UID: {user_id}.")
            return UserPromptVersion(**dict(record))
        else:
            print(f"INFO: Prompt version ID: {prompt_version_id} not found for user Firebase UID: {user_id}.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting prompt version ID {prompt_version_id} for user Firebase UID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting prompt version ID {prompt_version_id} for user Firebase UID {user_id}: {e}")
        return None

async def get_latest_user_prompt_version(conn: asyncpg.Connection, user_id: str, prompt_title: str) -> Optional[UserPromptVersion]: # user_id is str
    """Gets the latest version of a specific prompt for a user (Firebase UID)."""
    print(f"INFO: Attempting to get latest version of prompt '{prompt_title}' for user Firebase UID: {user_id}")
    try:
        query = """
            SELECT * FROM user_prompt_versions 
            WHERE user_id = $1 AND prompt_title = $2 
            ORDER BY version_number DESC 
            LIMIT 1;
        """
        record = await conn.fetchrow(query, user_id, prompt_title)
        if record:
            print(f"INFO: Latest version {record['version_number']} of prompt '{prompt_title}' found for user Firebase UID: {user_id}.")
            return UserPromptVersion(**dict(record))
        else:
            print(f"INFO: No versions found for prompt '{prompt_title}' for user Firebase UID: {user_id}.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting latest prompt version for '{prompt_title}' for user Firebase UID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting latest prompt version for user Firebase UID {user_id}: {e}")
        return None

async def delete_user_prompt_version(conn: asyncpg.Connection, prompt_version_id: int, user_id: str) -> bool: # user_id is str
    """Deletes a prompt version, ensuring it belongs to the user (Firebase UID)."""
    print(f"INFO: Attempting to delete prompt version ID: {prompt_version_id} for user Firebase UID: {user_id}")
    try:
        query = "DELETE FROM user_prompt_versions WHERE id = $1 AND user_id = $2;"
        status = await conn.execute(query, prompt_version_id, user_id)
        if status.endswith("1"):
            print(f"INFO: Prompt version ID: {prompt_version_id} deleted successfully for user Firebase UID: {user_id}.")
            return True
        else:
            print(f"WARN: Failed to delete prompt version ID: {prompt_version_id}. Not found or not owned by user Firebase UID: {user_id}.")
            return False
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error deleting prompt version ID {prompt_version_id} for user Firebase UID {user_id}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while deleting prompt version ID {prompt_version_id} for user Firebase UID {user_id}: {e}")
        return False

# --- Initial User Seeding (REMOVED) ---
# The create_initial_users function is removed as user creation is now handled
# via Firebase authentication and the get_or_create_user_by_firebase_payload function.
# Seeding initial users would require using Firebase Admin SDK to create users in Firebase
# or manually creating them in the Firebase console, then potentially pre-populating
# the local DB if needed (though get_or_create handles on-demand creation).

# --- Tria Code Embeddings Table CRUD ---

async def add_code_embedding(conn: asyncpg.Connection, embedding_data: CodeEmbeddingCreate) -> Optional[CodeEmbedding]:
    """Stores a new code embedding in the tria_code_embeddings table."""
    print(f"INFO: Attempting to add code embedding for component: {embedding_data.component_id}")
    # TODO: Implement actual database insertion logic
    # Placeholder:
    # query = """
    #     INSERT INTO tria_code_embeddings (component_id, source_code_reference, embedding_vector, 
    #                                     semantic_description, dependencies, version, created_at, updated_at)
    #     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    #     RETURNING *;
    # """
    # try:
    #     record = await conn.fetchrow(
    #         query, embedding_data.component_id, embedding_data.source_code_reference,
    #         embedding_data.embedding_vector, embedding_data.semantic_description,
    #         json.dumps(embedding_data.dependencies) if embedding_data.dependencies is not None else None, # Ensure JSONB is handled
    #         embedding_data.version
    #     )
    #     if record:
    #         return CodeEmbedding(**dict(record))
    #     return None
    # except asyncpg.PostgresError as e:
    #     print(f"ERROR: Error adding code embedding {embedding_data.component_id}: {e}")
    #     return None
    print(f"TODO: Implement add_code_embedding for {embedding_data.component_id}")
    return None # Placeholder

async def get_code_embedding_by_id(conn: asyncpg.Connection, component_id: str) -> Optional[CodeEmbedding]:
    """Retrieves a code embedding by its component_id."""
    print(f"INFO: Attempting to fetch code embedding for component: {component_id}")
    # TODO: Implement actual database retrieval logic
    # Placeholder:
    # query = "SELECT * FROM tria_code_embeddings WHERE component_id = $1;"
    # try:
    #     record = await conn.fetchrow(query, component_id)
    #     if record:
    #         return CodeEmbedding(**dict(record))
    #     return None
    # except asyncpg.PostgresError as e:
    #     print(f"ERROR: Error fetching code embedding {component_id}: {e}")
    #     return None
    print(f"TODO: Implement get_code_embedding_by_id for {component_id}")
    return None # Placeholder

async def find_similar_code_components_by_embedding(conn: asyncpg.Connection, embedding_vector: List[float], top_k: int = 5) -> List[CodeEmbedding]:
    """Finds top_k similar code components based on embedding_vector similarity (L2 distance)."""
    print(f"INFO: Attempting to find {top_k} similar code components.")
    # TODO: Implement actual database similarity search logic
    # Placeholder:
    # query = """
    #     SELECT *, (embedding_vector <-> $1) AS distance
    #     FROM tria_code_embeddings
    #     ORDER BY distance ASC
    #     LIMIT $2;
    # """
    # try:
    #     records = await conn.fetch(query, embedding_vector, top_k)
    #     return [CodeEmbedding(**dict(record)) for record in records]
    # except asyncpg.PostgresError as e:
    #     print(f"ERROR: Error finding similar code components: {e}")
    #     return []
    print(f"TODO: Implement find_similar_code_components_by_embedding")
    return [] # Placeholder

# --- TRIA AZR Tasks Table CRUD ---

async def create_azr_task(conn: asyncpg.Connection, task_data: AZRTaskCreate) -> Optional[AZRTask]:
    """Creates a new AZR task."""
    print(f"INFO: Attempting to create AZR task: {task_data.description_text[:50]}...")
    # TODO: Implement actual database insertion logic
    # Example:
    # query = """
    #     INSERT INTO tria_azr_tasks (description_text, status, priority, complexity_score, generation_source, related_bot_id, metadata_json, created_at, started_at, completed_at)
    #     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9)
    #     RETURNING *;
    # """
    # try:
    #     record = await conn.fetchrow(query, task_data.description_text, task_data.status, task_data.priority, 
    #                                  task_data.complexity_score, task_data.generation_source, task_data.related_bot_id, 
    #                                  json.dumps(task_data.metadata_json) if task_data.metadata_json else None, 
    #                                  None, None) # Assuming started_at and completed_at are None on creation
    #     if record:
    #         return AZRTask(**dict(record))
    # except asyncpg.PostgresError as e:
    #     print(f"ERROR: Error creating AZR task '{task_data.description_text[:50]}': {e}")
    # return None
    print(f"TODO: Implement create_azr_task for {task_data.description_text[:50]}")
    return None # Placeholder

async def get_azr_task_by_id(conn: asyncpg.Connection, task_id: int) -> Optional[AZRTask]:
    """Retrieves an AZR task by its ID."""
    print(f"INFO: Attempting to fetch AZR task ID: {task_id}")
    # TODO: Implement actual database retrieval logic
    # Example:
    # query = "SELECT * FROM tria_azr_tasks WHERE task_id = $1;"
    # try:
    #     record = await conn.fetchrow(query, task_id)
    #     if record:
    #         return AZRTask(**dict(record))
    # except asyncpg.PostgresError as e:
    #     print(f"ERROR: Error fetching AZR task ID {task_id}: {e}")
    # return None
    print(f"TODO: Implement get_azr_task_by_id for {task_id}")
    return None # Placeholder

async def update_azr_task_status(conn: asyncpg.Connection, task_id: int, status: str, completed_at: Optional[datetime] = None) -> Optional[AZRTask]:
    """Updates the status and optionally completed_at time of an AZR task."""
    print(f"INFO: Attempting to update AZR task ID: {task_id} to status: {status}")
    # TODO: Implement actual database update logic
    # Example:
    # started_at_update = ", started_at = NOW()" if status == "active" and completed_at is None else "" # Example logic
    # completed_at_update = ", completed_at = $3" if completed_at else ""
    # query = f"""
    #     UPDATE tria_azr_tasks 
    #     SET status = $2 {started_at_update} {completed_at_update}, updated_at = NOW() 
    #     WHERE task_id = $1 RETURNING *;
    # """ # Note: schema.sql does not have updated_at for tria_azr_tasks yet. Add if needed.
    # values = [task_id, status]
    # if completed_at:
    #     values.append(completed_at)
    # try:
    #     record = await conn.fetchrow(query, *values)
    #     if record:
    #         return AZRTask(**dict(record))
    # except asyncpg.PostgresError as e:
    #     print(f"ERROR: Error updating AZR task ID {task_id}: {e}")
    # return None
    print(f"TODO: Implement update_azr_task_status for {task_id}")
    return None # Placeholder

# --- TRIA Learning Log Table CRUD ---

async def add_learning_log_entry(conn: asyncpg.Connection, log_entry_data: LearningLogEntryCreate) -> Optional[LearningLogEntry]:
    """Adds a new entry to the learning log."""
    print(f"INFO: Attempting to add learning log entry: {log_entry_data.event_type} - {log_entry_data.summary_text[:50]}...")
    # TODO: Implement actual database insertion logic
    # Example:
    # query = """
    #     INSERT INTO tria_learning_log (event_type, bot_affected_id, summary_text, details_json, timestamp)
    #     VALUES ($1, $2, $3, $4, NOW())
    #     RETURNING *;
    # """
    # try:
    #     record = await conn.fetchrow(query, log_entry_data.event_type, log_entry_data.bot_affected_id, 
    #                                  log_entry_data.summary_text, 
    #                                  json.dumps(log_entry_data.details_json) if log_entry_data.details_json else None)
    #     if record:
    #         return LearningLogEntry(**dict(record))
    # except asyncpg.PostgresError as e:
    #     print(f"ERROR: Error adding learning log for event '{log_entry_data.event_type}': {e}")
    # return None
    print(f"TODO: Implement add_learning_log_entry for {log_entry_data.event_type}")
    return None # Placeholder

async def get_learning_log_entries(conn: asyncpg.Connection, event_type: Optional[str] = None, limit: int = 100) -> List[LearningLogEntry]:
    """Retrieves learning log entries, optionally filtered by event_type."""
    print(f"INFO: Attempting to fetch learning log entries (event_type: {event_type}, limit: {limit})")
    # TODO: Implement actual database retrieval logic
    # Example:
    # if event_type:
    #     query = "SELECT * FROM tria_learning_log WHERE event_type = $1 ORDER BY timestamp DESC LIMIT $2;"
    #     params = [event_type, limit]
    # else:
    #     query = "SELECT * FROM tria_learning_log ORDER BY timestamp DESC LIMIT $1;"
    #     params = [limit]
    # try:
    #     records = await conn.fetch(query, *params)
    #     return [LearningLogEntry(**dict(record)) for record in records]
    # except asyncpg.PostgresError as e:
    #     print(f"ERROR: Error fetching learning log entries: {e}")
    # return []
    print(f"TODO: Implement get_learning_log_entries")
    return [] # Placeholder

# --- Audiovisual Gestural Chunks Table CRUD ---

async def create_audiovisual_gestural_chunk(
    conn: asyncpg.Connection,
    firebase_uid: str, 
    chunk_create: InteractionChunkCreate
) -> Optional[InteractionChunkDB]:
    """
    Stores a new audiovisual_gestural_chunk in the database.
    The 'user_id' field in the table is populated with firebase_uid.
    'chunk_embedding' is currently not handled via InteractionChunkCreate and will be set to NULL.
    """
    print(f"INFO: Attempting to create AV chunk for user Firebase UID: {firebase_uid}, session: {chunk_create.session_id}")
    try:
        # Ensure all fields from InteractionChunkCreate are mapped to the table columns.
        # The table schema includes:
        # id (SERIAL PK), user_id (TEXT FK to users.firebase_uid), session_id (TEXT),
        # timestamp (TIMESTAMPTZ), audio_data_path (TEXT), video_data_path (TEXT),
        # hand_landmarks (JSONB), gesture_classification_client (TEXT), gesture_confidence_client (REAL),
        # speech_transcription_client (TEXT), environment_context (JSONB),
        # user_feedback_rating (INTEGER), user_feedback_text (TEXT), user_flagged_issue (BOOLEAN),
        # tria_processed_flag (BOOLEAN), processing_tags (TEXT[]), metadata (JSONB),
        # raw_data_blob (JSONB),
        # chunk_embedding (VECTOR(1536) NULL), - Will be NULL for now
        # created_at (TIMESTAMPTZ DEFAULT now()), updated_at (TIMESTAMPTZ DEFAULT now())
        
        # Fields from InteractionChunkCreate model:
        # timestamp, user_id (this will be firebase_uid), session_id,
        # audio_data_ref, video_data_ref, hand_landmarks, gesture_classification_client,
        # gesture_confidence_client, speech_transcription_client, environment_context,
        # user_feedback_rating, user_feedback_text, user_flagged_issue,
        # tria_processed_flag, processing_tags, metadata, raw_data_blob

        query = """
            INSERT INTO audiovisual_gestural_chunks (
                user_id, session_id, timestamp, 
                audio_data_path, video_data_path, 
                hand_landmarks, gesture_classification_client, gesture_confidence_client,
                speech_transcription_client, environment_context,
                user_feedback_rating, user_feedback_text, user_flagged_issue,
                tria_processed_flag, processing_tags, metadata, raw_data_blob,
                chunk_embedding 
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NULL)
            RETURNING *;
        """
        # chunk_embedding is passed as NULL as it's not in InteractionChunkCreate yet.
        
        record = await conn.fetchrow(
            query,
            firebase_uid, # user_id
            chunk_create.session_id,
            chunk_create.timestamp,
            chunk_create.audio_data_ref, # mapped to audio_data_path
            chunk_create.video_data_ref, # mapped to video_data_path
            chunk_create.hand_landmarks,
            chunk_create.gesture_classification_client,
            chunk_create.gesture_confidence_client,
            chunk_create.speech_transcription_client,
            chunk_create.environment_context,
            chunk_create.user_feedback_rating,
            chunk_create.user_feedback_text,
            chunk_create.user_flagged_issue,
            chunk_create.tria_processed_flag,
            chunk_create.processing_tags,
            chunk_create.metadata,
            chunk_create.raw_data_blob
            # chunk_embedding is NULL
        )
        if record:
            print(f"INFO: AV chunk created successfully with ID: {record['id']} for user Firebase UID: {firebase_uid}")
            return InteractionChunkDB(**dict(record))
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error creating AV chunk for user Firebase UID {firebase_uid}: {e}")
        if "vector" in str(e).lower(): # Though we are passing NULL, good to keep if embedding is added later
             print("ERROR: Potential issue with vector data format or pgvector extension.")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while creating AV chunk for user Firebase UID {firebase_uid}: {e}")
        return None

async def get_av_chunk_by_id(conn: asyncpg.Connection, chunk_id: int, firebase_uid: Optional[str] = None) -> Optional[InteractionChunkDB]:
    """
    Retrieves an AV chunk by its ID.
    If firebase_uid is provided, it also ensures the chunk belongs to that user.
    """
    log_message = f"INFO: Attempting to fetch AV chunk by ID: {chunk_id}"
    if firebase_uid:
        log_message += f" for user Firebase UID: {firebase_uid}"
    print(log_message)
    
    try:
        if firebase_uid:
            query = "SELECT * FROM audiovisual_gestural_chunks WHERE id = $1 AND user_id = $2;"
            record = await conn.fetchrow(query, chunk_id, firebase_uid)
        else:
            query = "SELECT * FROM audiovisual_gestural_chunks WHERE id = $1;"
            record = await conn.fetchrow(query, chunk_id)
            
        if record:
            print(f"INFO: AV chunk with ID {chunk_id} found.")
            return InteractionChunkDB(**dict(record))
        else:
            print(f"INFO: AV chunk with ID {chunk_id} not found {('for user ' + firebase_uid) if firebase_uid else ''}.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error fetching AV chunk ID {chunk_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while fetching AV chunk ID {chunk_id}: {e}")
        return None

async def find_similar_chunks(
    conn: asyncpg.Connection, 
    query_embedding: List[float], 
    top_k: int = 5, 
    firebase_uid: Optional[str] = None
) -> List[InteractionChunkDB]:
    """
    Finds top_k similar chunks based on chunk_embedding similarity (L2 distance).
    If firebase_uid is provided, search is filtered to that user's chunks.
    Returns a list of InteractionChunkDB objects.
    """
    log_message = f"INFO: Attempting to find {top_k} similar AV chunks"
    if firebase_uid:
        log_message += f" for user Firebase UID: {firebase_uid}"
    print(log_message)
    
    try:
        if firebase_uid:
            query = """
                SELECT *, (chunk_embedding <-> $1) AS distance
                FROM audiovisual_gestural_chunks
                WHERE user_id = $3
                ORDER BY distance ASC
                LIMIT $2;
            """
            records = await conn.fetch(query, query_embedding, top_k, firebase_uid)
        else:
            query = """
                SELECT *, (chunk_embedding <-> $1) AS distance
                FROM audiovisual_gestural_chunks
                ORDER BY distance ASC
                LIMIT $2;
            """
            records = await conn.fetch(query, query_embedding, top_k)
            
        print(f"INFO: Found {len(records)} similar AV chunks.")
        return [InteractionChunkDB(**dict(record)) for record in records]
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error finding similar AV chunks: {e}")
        if "vector" in str(e).lower():
             print("ERROR: Potential issue with vector data format or pgvector extension for similarity search.")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while finding similar AV chunks: {e}")
        return []

# --- TRIA Knowledge Base Table CRUD ---

async def add_kb_document(
    conn: asyncpg.Connection,
    content_text: str,
    content_embedding: List[float], # VECTOR
    source_document_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None # JSONB
) -> Optional[int]:
    """Adds a new document to the knowledge base."""
    print(f"INFO: Attempting to add KB document, source ID: {source_document_id if source_document_id else 'N/A'}")
    try:
        query = """
            INSERT INTO tria_knowledge_base (source_document_id, content_text, content_embedding, metadata)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        """
        doc_id = await conn.fetchval(query, source_document_id, content_text, content_embedding, metadata)
        print(f"INFO: KB document added successfully with ID: {doc_id}")
        return doc_id
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error adding KB document (source ID: {source_document_id}): {e}")
        if "vector" in str(e).lower():
             print("ERROR: Potential issue with vector data format or pgvector extension.")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while adding KB document (source ID: {source_document_id}): {e}")
        return None

async def find_similar_kb_documents(conn: asyncpg.Connection, query_embedding: List[float], top_k: int = 5) -> List[asyncpg.Record]:
    """Finds top_k similar documents in the knowledge base (L2 distance)."""
    print(f"INFO: Attempting to find {top_k} similar KB documents.")
    try:
        query = """
            SELECT id, source_document_id, content_text, (content_embedding <-> $1) AS distance
            FROM tria_knowledge_base
            ORDER BY distance ASC
            LIMIT $2;
        """
        records = await conn.fetch(query, query_embedding, top_k)
        print(f"INFO: Found {len(records)} similar KB documents.")
        return records
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error finding similar KB documents: {e}")
        if "vector" in str(e).lower():
             print("ERROR: Potential issue with vector data format or pgvector extension for similarity search.")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while finding similar KB documents: {e}")
        return []

async def get_kb_document_by_id(conn: asyncpg.Connection, doc_id: int) -> Optional[asyncpg.Record]:
    """Retrieves a KB document by ID."""
    print(f"INFO: Attempting to fetch KB document by ID: {doc_id}")
    try:
        query = "SELECT * FROM tria_knowledge_base WHERE id = $1;"
        doc_record = await conn.fetchrow(query, doc_id)
        if doc_record:
            print(f"INFO: KB document with ID {doc_id} found.")
        else:
            print(f"INFO: KB document with ID {doc_id} not found.")
        return doc_record
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error fetching KB document ID {doc_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while fetching KB document ID {doc_id}: {e}")
        return None

# --- TRIA Memory Embeddings Table CRUD ---

async def store_memory_embedding(
    conn: asyncpg.Connection,
    source_type: str,
    source_id: str, # VARCHAR in schema, can represent int or string ID
    embedding_vector: List[float], # VECTOR
    text_content: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None # JSONB
) -> Optional[int]:
    """Stores a generic embedding."""
    print(f"INFO: Attempting to store memory embedding for source {source_type}:{source_id}")
    try:
        query = """
            INSERT INTO tria_memory_embeddings (source_type, source_id, embedding_vector, text_content, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        """
        embedding_id = await conn.fetchval(query, source_type, source_id, embedding_vector, text_content, metadata)
        print(f"INFO: Memory embedding stored successfully with ID: {embedding_id}")
        return embedding_id
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error storing memory embedding for {source_type}:{source_id}: {e}")
        if "vector" in str(e).lower():
             print("ERROR: Potential issue with vector data format or pgvector extension.")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while storing memory embedding for {source_type}:{source_id}: {e}")
        return None

async def find_similar_memory_embeddings(
    conn: asyncpg.Connection,
    query_embedding: List[float],
    top_k: int = 5,
    source_type_filter: Optional[str] = None
) -> List[asyncpg.Record]:
    """Finds top_k similar memory embeddings, optionally filtered by source_type (L2 distance)."""
    print(f"INFO: Attempting to find {top_k} similar memory embeddings (filter: {source_type_filter if source_type_filter else 'None'}).")
    try:
        if source_type_filter:
            query = """
                SELECT id, source_type, source_id, text_content, (embedding_vector <-> $1) AS distance
                FROM tria_memory_embeddings
                WHERE source_type = $3
                ORDER BY distance ASC
                LIMIT $2;
            """
            records = await conn.fetch(query, query_embedding, top_k, source_type_filter)
        else:
            query = """
                SELECT id, source_type, source_id, text_content, (embedding_vector <-> $1) AS distance
                FROM tria_memory_embeddings
                ORDER BY distance ASC
                LIMIT $2;
            """
            records = await conn.fetch(query, query_embedding, top_k)
        print(f"INFO: Found {len(records)} similar memory embeddings.")
        return records
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error finding similar memory embeddings: {e}")
        if "vector" in str(e).lower():
             print("ERROR: Potential issue with vector data format or pgvector extension for similarity search.")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while finding similar memory embeddings: {e}")
        return []

# --- Application Logs Table CRUD ---

async def log_application_event(
    conn: asyncpg.Connection,
    level: str,
    source_component: str,
    message: str,
    details: Optional[Dict[str, Any]] = None # JSONB
) -> Optional[int]:
    """Logs an application event."""
    # This print is for demonstrating the call, not for the actual log content which goes to DB
    print(f"DEBUG: Logging application event call: [{level}] {source_component} - {message}")
    if level not in ('INFO', 'WARNING', 'ERROR', 'DEBUG'):
        print(f"ERROR: Invalid log level '{level}'. Must be 'INFO', 'WARNING', 'ERROR', 'DEBUG'.")
        return None
    try:
        query = """
            INSERT INTO application_logs (level, source_component, message, details)
            VALUES ($1, $2, $3, $4)
            RETURNING id;
        """
        log_id = await conn.fetchval(query, level, source_component, message, details)
        # Avoid print here to prevent recursive logging if this function itself is used for logging DB operations.
        # The calling code might log the returned ID if necessary.
        return log_id
    except asyncpg.PostgresError as e:
        # Log this error to console, but be careful about log storms if DB is down
        print(f"CRITICAL_ERROR: Error logging application event to database: {e}")
        return None
    except Exception as e:
        print(f"CRITICAL_ERROR: An unexpected error occurred while logging application event to database: {e}")
        return None

# --- Holograph Data Table CRUD ---

async def store_holograph_data(
    conn: asyncpg.Connection,
    data_type: str,
    data_payload: Dict[str, Any] # JSONB
) -> Optional[int]:
    """Stores generic holograph data."""
    print(f"INFO: Attempting to store holograph data of type: {data_type}")
    try:
        query = """
            INSERT INTO holograph_data (data_type, data_payload)
            VALUES ($1, $2)
            RETURNING id;
        """
        data_id = await conn.fetchval(query, data_type, data_payload)
        print(f"INFO: Holograph data stored successfully with ID: {data_id}")
        return data_id
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error storing holograph data (type: {data_type}): {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while storing holograph data (type: {data_type}): {e}")
        return None

async def get_holograph_data_by_type(
    conn: asyncpg.Connection,
    data_type: str,
    limit: int = 10
) -> List[asyncpg.Record]:
    """Retrieves holograph data entries by data_type, ordered by created_at DESC."""
    print(f"INFO: Attempting to get holograph data for type: {data_type} with limit {limit}")
    try:
        query = """
            SELECT * FROM holograph_data
            WHERE data_type = $1
            ORDER BY created_at DESC
            LIMIT $2;
        """
        records = await conn.fetch(query, data_type, limit)
        print(f"INFO: Found {len(records)} holograph data entries for type {data_type}.")
        return records
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting holograph data for type {data_type}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting holograph data for type {data_type}: {e}")
        return []

# Example usage section (commented out, for reference)
# import asyncio
# from backend.db.pg_connector import init_pg_pool, get_pg_connection, release_pg_connection, close_pg_pool
#
# async def main_crud_example():
#     # IMPORTANT: Ensure pg_connector.py is correctly configured with your DB details
#     # and that the PostgreSQL server is running with the pgvector extension created.
#     # E.g., in psql: CREATE EXTENSION IF NOT EXISTS vector;
#     await init_pg_pool()
#     conn = None
#     try:
#         conn = await get_pg_connection()
#         if not conn:
#             print("CRITICAL: Failed to get DB connection for CRUD example. Exiting.")
#             return
#
#         print("\n--- Running User CRUD Example ---")
#         new_user_id = await create_user(conn, f"testuser_crud_{int(time.time())}", "securepassword123", f"crud_{int(time.time())}@example.com")
#         if new_user_id:
#             user_r = await get_user_by_id(conn, new_user_id)
#             if user_r: print(f"Fetched user by ID: {dict(user_r)}")
#             await update_user_email(conn, new_user_id, f"updated_crud_{int(time.time())}@example.com")
#             user_r_updated = await get_user_by_username(conn, user_r['username'])
#             if user_r_updated: print(f"Fetched updated user by username: {dict(user_r_updated)}")
#
#         print("\n--- Running Chat History CRUD Example ---")
#         session_example_id = f"session_crud_{int(time.time())}"
#         msg_id = await add_chat_message(conn, session_example_id, "user", "Hello from CRUD example!", user_id=new_user_id, metadata={"client_type": "test_rig"})
#         if msg_id:
#             await add_chat_message(conn, session_example_id, "assistant", "Hi there! How can I help?", metadata={"confidence": 0.98})
#             history = await get_chat_history(conn, session_example_id, limit=5)
#             print(f"Chat history for {session_example_id} (first {len(history)} messages):")
#             for msg in history: print(f"  [{msg['role']}] {msg['message_content']}")
#         if new_user_id:
#             user_history = await get_chat_history_for_user(conn, new_user_id, limit=5)
#             print(f"Chat history for user ID {new_user_id} (first {len(user_history)} messages):")
#             for msg in user_history: print(f"  [{msg['role']}] {msg['message_content']}")
#
#         # Note: For vector operations, your audiovisual_gestural_chunks.chunk_embedding column
#         # and other vector columns must match the dimension of the example_embedding.
#         # The schema.sql specifies VECTOR(1536). The example below uses 3 for brevity.
#         # Adjust your table DDL or the example_embedding dimension for actual testing.
#         # For example: example_embedding = [random.random() for _ in range(1536)]
#         example_embedding_dim3 = [0.1, 0.2, 0.3] # Use 1536-dim for real tests
#         # Make sure your table DDL for chunk_embedding is VECTOR(3) if testing with this example.
#
#         print("\n--- Running AV Chunk CRUD Example (using placeholder 3-dim embedding) ---")
#         # Ensure your table's VECTOR column has dimension 3 for this example, or use 1536 dim embedding
#         # av_chunk_id = await store_av_chunk(conn, session_example_id, "/path/audio.wav", "/path/video.mp4", {"type": "wave_gesture"}, example_embedding_dim3, user_id=new_user_id)
#         # if av_chunk_id:
#         #     chunk = await get_av_chunk_by_id(conn, av_chunk_id)
#         #     if chunk: print(f"Stored AV chunk ID: {chunk['id']}")
#         #     similar_av_chunks = await find_similar_chunks(conn, example_embedding_dim3, top_k=2)
#         #     print(f"Found {len(similar_av_chunks)} similar AV chunks (embedding: {example_embedding_dim3}).")
#         # else:
#         #     print("AV Chunk storage skipped or failed (possibly due to vector dimension mismatch or pgvector setup).")
#
#         print("\n--- Running KB Document CRUD Example (using placeholder 3-dim embedding) ---")
#         # example_kb_embedding_dim3 = [0.4, 0.5, 0.6] # Use 1536-dim for real tests
#         # kb_doc_id = await add_kb_document(conn, "This is a test KB document about AI.", example_kb_embedding_dim3, "doc_crud_001", {"category": "AI"})
#         # if kb_doc_id:
#         #     kb_doc = await get_kb_document_by_id(conn, kb_doc_id)
#         #     if kb_doc: print(f"Stored KB doc ID: {kb_doc['id']}")
#         #     similar_kb_docs = await find_similar_kb_documents(conn, example_kb_embedding_dim3, top_k=2)
#         #     print(f"Found {len(similar_kb_docs)} similar KB docs (embedding: {example_kb_embedding_dim3}).")
#         # else:
#         #     print("KB Document storage skipped or failed.")
#
#         print("\n--- Running Log CRUD Example ---")
#         log_id = await log_application_event(conn, "INFO", "CRUD_Example_Script", "CRUD operations main_crud_example completed successfully.", {"user_id": new_user_id})
#         if log_id: print(f"Application event logged with ID: {log_id}")
#
#         print("\n--- Running Holograph Data CRUD Example ---")
#         holo_data_id = await store_holograph_data(conn, "user_preferences", {"theme": "dark", "notifications": "enabled"})
#         if holo_data_id:
#             holo_data_entries = await get_holograph_data_by_type(conn, "user_preferences", limit=5)
#             print(f"Found {len(holo_data_entries)} holograph data entries of type 'user_preferences'.")
#
#     except asyncpg.exceptions.PostgresConnectionError as pce:
#         print(f"CRITICAL_DB_ERROR: Could not connect to PostgreSQL: {pce}")
#         print("Please ensure PostgreSQL is running and pg_connector.py has correct credentials.")
#     except RuntimeError as re:
#         print(f"RUNTIME_ERROR in CRUD example main: {re}")
#     except Exception as e:
#         print(f"UNEXPECTED_ERROR in CRUD example main: {e}")
#     finally:
#         if conn:
#             await release_pg_connection(conn)
#         await close_pg_pool()
#
# if __name__ == "__main__":
#     import time # for unique usernames in example
#     # import random # for example embeddings
#     print("Running CRUD operations example (requires PostgreSQL with pgvector extension)...")
#     # asyncio.run(main_crud_example()) # This line would run the example.
#     print("Example main_crud_example() is defined but not run by default in this script.")
#     print("To run the example, uncomment 'asyncio.run(main_crud_example())' and ensure DB is set up.")

# --- CRUD for User Prompt Titles with Meta (Missing from previous) ---

async def get_distinct_user_prompt_titles_with_meta(
    conn: asyncpg.Connection, 
    firebase_uid: str, 
    skip: int = 0, 
    limit: int = 100
) -> List[UserPromptTitleInfo]:
    """
    Lists all unique prompt titles for a specific user, along with a count of versions
    and the last updated (created_at) timestamp for each title.
    """
    print(f"INFO: Attempting to get distinct prompt titles with meta for user Firebase UID: {firebase_uid}")
    try:
        query = """
            SELECT 
                prompt_title, 
                COUNT(id) as version_count, 
                MAX(created_at) as last_updated
            FROM user_prompt_versions
            WHERE user_id = $1
            GROUP BY prompt_title
            ORDER BY MAX(created_at) DESC
            LIMIT $2 OFFSET $3;
        """
        records = await conn.fetch(query, firebase_uid, limit, skip)
        print(f"INFO: Found {len(records)} distinct prompt titles for user Firebase UID: {firebase_uid}.")
        return [UserPromptTitleInfo(**dict(record)) for record in records]
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting distinct prompt titles for user Firebase UID {firebase_uid}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting distinct prompt titles for user Firebase UID {firebase_uid}: {e}")
        return []

# --- Tria Code Embeddings Table CRUD ---

async def create_tria_code_embedding(conn: asyncpg.Connection, item_create: TriaCodeEmbeddingCreate) -> Optional[TriaCodeEmbeddingDB]:
    """Creates a new Tria code embedding record."""
    print(f"INFO: Attempting to create Tria code embedding for component_id: {item_create.component_id}")
    try:
        query = """
            INSERT INTO tria_code_embeddings 
                (component_id, source_code_reference, embedding_vector, semantic_description, dependencies, version)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        """
        record = await conn.fetchrow(
            query, item_create.component_id, item_create.source_code_reference, 
            item_create.embedding_vector, item_create.semantic_description, 
            item_create.dependencies, item_create.version
        )
        if record:
            print(f"INFO: Tria code embedding for component_id {record['component_id']} created successfully.")
            return TriaCodeEmbeddingDB(**dict(record))
        return None
    except asyncpg.UniqueViolationError:
        print(f"ERROR: Tria code embedding with component_id '{item_create.component_id}' already exists.")
        return None # Or re-fetch and return existing? For now, None.
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error creating Tria code embedding for component_id {item_create.component_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: Unexpected error creating Tria code embedding for component_id {item_create.component_id}: {e}")
        return None

async def get_tria_code_embedding_by_component_id(conn: asyncpg.Connection, component_id: str) -> Optional[TriaCodeEmbeddingDB]:
    """Fetches a Tria code embedding by component_id."""
    print(f"INFO: Attempting to fetch Tria code embedding by component_id: {component_id}")
    try:
        record = await conn.fetchrow("SELECT * FROM tria_code_embeddings WHERE component_id = $1;", component_id)
        return TriaCodeEmbeddingDB(**dict(record)) if record else None
    except Exception as e:
        print(f"ERROR: Error fetching Tria code embedding by component_id {component_id}: {e}")
        return None

async def list_tria_code_embeddings(conn: asyncpg.Connection, skip: int = 0, limit: int = 100) -> List[TriaCodeEmbeddingDB]:
    """Lists Tria code embeddings."""
    try:
        records = await conn.fetch("SELECT * FROM tria_code_embeddings ORDER BY component_id LIMIT $1 OFFSET $2;", limit, skip)
        return [TriaCodeEmbeddingDB(**dict(record)) for record in records]
    except Exception as e:
        print(f"ERROR: Error listing Tria code embeddings: {e}")
        return []

# --- Tria AZR Tasks Table CRUD ---

async def create_tria_azr_task(conn: asyncpg.Connection, item_create: TriaAZRTaskCreate) -> Optional[TriaAZRTaskDB]:
    """Creates a new Tria AZR task."""
    print(f"INFO: Attempting to create Tria AZR task: {item_create.description_text[:50]}...")
    try:
        query = """
            INSERT INTO tria_azr_tasks 
                (description_text, status, priority, complexity_score, generation_source, metadata)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        """
        record = await conn.fetchrow(
            query, item_create.description_text, item_create.status, item_create.priority,
            item_create.complexity_score, item_create.generation_source, item_create.metadata
        )
        if record:
            print(f"INFO: Tria AZR task ID {record['task_id']} created successfully.")
            return TriaAZRTaskDB(**dict(record))
        return None
    except Exception as e:
        print(f"ERROR: Error creating Tria AZR task: {e}")
        return None

async def get_tria_azr_task_by_id(conn: asyncpg.Connection, task_id: int) -> Optional[TriaAZRTaskDB]:
    """Fetches a Tria AZR task by task_id."""
    try:
        record = await conn.fetchrow("SELECT * FROM tria_azr_tasks WHERE task_id = $1;", task_id)
        return TriaAZRTaskDB(**dict(record)) if record else None
    except Exception as e:
        print(f"ERROR: Error fetching Tria AZR task ID {task_id}: {e}")
        return None

async def list_tria_azr_tasks(conn: asyncpg.Connection, skip: int = 0, limit: int = 100) -> List[TriaAZRTaskDB]:
    """Lists Tria AZR tasks."""
    try:
        records = await conn.fetch("SELECT * FROM tria_azr_tasks ORDER BY created_at DESC LIMIT $1 OFFSET $2;", limit, skip)
        return [TriaAZRTaskDB(**dict(record)) for record in records]
    except Exception as e:
        print(f"ERROR: Error listing Tria AZR tasks: {e}")
        return []

# --- Tria AZR Task Solutions Table CRUD ---

async def create_tria_azr_task_solution(conn: asyncpg.Connection, item_create: TriaAZRTaskSolutionCreate) -> Optional[TriaAZRTaskSolutionDB]:
    """Creates a new Tria AZR task solution."""
    print(f"INFO: Attempting to create Tria AZR task solution for task_id: {item_create.task_id}")
    try:
        query = """
            INSERT INTO tria_azr_task_solutions
                (task_id, solution_approach_description, solution_artifacts_json, outcome_summary, performance_metrics_json, verification_status)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *;
        """
        record = await conn.fetchrow(
            query, item_create.task_id, item_create.solution_approach_description, item_create.solution_artifacts_json,
            item_create.outcome_summary, item_create.performance_metrics_json, item_create.verification_status
        )
        if record:
            print(f"INFO: Tria AZR task solution ID {record['solution_id']} created successfully for task ID {record['task_id']}.")
            return TriaAZRTaskSolutionDB(**dict(record))
        return None
    except asyncpg.ForeignKeyViolationError:
        print(f"ERROR: Task ID {item_create.task_id} not found for AZR task solution.")
        return None
    except Exception as e:
        print(f"ERROR: Error creating Tria AZR task solution: {e}")
        return None

async def get_tria_azr_task_solution_by_id(conn: asyncpg.Connection, solution_id: int) -> Optional[TriaAZRTaskSolutionDB]:
    """Fetches a Tria AZR task solution by solution_id."""
    try:
        record = await conn.fetchrow("SELECT * FROM tria_azr_task_solutions WHERE solution_id = $1;", solution_id)
        return TriaAZRTaskSolutionDB(**dict(record)) if record else None
    except Exception as e:
        print(f"ERROR: Error fetching Tria AZR task solution ID {solution_id}: {e}")
        return None

async def list_tria_azr_task_solutions_for_task(conn: asyncpg.Connection, task_id: int, skip: int = 0, limit: int = 100) -> List[TriaAZRTaskSolutionDB]:
    """Lists Tria AZR task solutions for a specific task."""
    try:
        records = await conn.fetch("SELECT * FROM tria_azr_task_solutions WHERE task_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3;", task_id, limit, skip)
        return [TriaAZRTaskSolutionDB(**dict(record)) for record in records]
    except Exception as e:
        print(f"ERROR: Error listing Tria AZR task solutions for task ID {task_id}: {e}")
        return []

# --- Tria Learning Log Table CRUD ---

async def create_tria_learning_log_entry(conn: asyncpg.Connection, item_create: TriaLearningLogCreate) -> Optional[TriaLearningLogDB]:
    """Creates a new Tria learning log entry."""
    print(f"INFO: Attempting to create Tria learning log entry, type: {item_create.event_type}")
    try:
        query = """
            INSERT INTO tria_learning_log (event_type, bot_affected_id, summary_text, details_json)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
        """
        record = await conn.fetchrow(
            query, item_create.event_type, item_create.bot_affected_id, item_create.summary_text, item_create.details_json
        )
        if record:
            print(f"INFO: Tria learning log entry ID {record['log_id']} created successfully.")
            return TriaLearningLogDB(**dict(record))
        return None
    except Exception as e:
        print(f"ERROR: Error creating Tria learning log entry: {e}")
        return None

async def get_tria_learning_log_entry_by_id(conn: asyncpg.Connection, log_id: int) -> Optional[TriaLearningLogDB]:
    """Fetches a Tria learning log entry by log_id."""
    try:
        record = await conn.fetchrow("SELECT * FROM tria_learning_log WHERE log_id = $1;", log_id)
        return TriaLearningLogDB(**dict(record)) if record else None
    except Exception as e:
        print(f"ERROR: Error fetching Tria learning log entry ID {log_id}: {e}")
        return None

async def list_tria_learning_log_entries(conn: asyncpg.Connection, skip: int = 0, limit: int = 100) -> List[TriaLearningLogDB]:
    """Lists Tria learning log entries."""
    try:
        records = await conn.fetch("SELECT * FROM tria_learning_log ORDER BY timestamp DESC LIMIT $1 OFFSET $2;", limit, skip)
        return [TriaLearningLogDB(**dict(record)) for record in records]
    except Exception as e:
        print(f"ERROR: Error listing Tria learning log entries: {e}")
        return []

# --- Tria Bot Configurations Table CRUD ---

async def create_tria_bot_configuration(conn: asyncpg.Connection, item_create: TriaBotConfigurationCreate) -> Optional[TriaBotConfigurationDB]:
    """Creates a new Tria bot configuration."""
    print(f"INFO: Attempting to create Tria bot configuration for bot_id: {item_create.bot_id}")
    try:
        query = """
            INSERT INTO tria_bot_configurations 
                (bot_id, current_version, config_parameters_json, last_updated_by, notes)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        """
        record = await conn.fetchrow(
            query, item_create.bot_id, item_create.current_version, item_create.config_parameters_json,
            item_create.last_updated_by, item_create.notes
        )
        if record:
            print(f"INFO: Tria bot configuration for bot_id {record['bot_id']} created successfully with config_id {record['config_id']}.")
            return TriaBotConfigurationDB(**dict(record))
        return None
    except asyncpg.UniqueViolationError:
        print(f"ERROR: Tria bot configuration with bot_id '{item_create.bot_id}' already exists.")
        return None
    except Exception as e:
        print(f"ERROR: Error creating Tria bot configuration for bot_id {item_create.bot_id}: {e}")
        return None

async def get_tria_bot_configuration_by_bot_id(conn: asyncpg.Connection, bot_id: str) -> Optional[TriaBotConfigurationDB]:
    """Fetches a Tria bot configuration by bot_id."""
    try:
        record = await conn.fetchrow("SELECT * FROM tria_bot_configurations WHERE bot_id = $1;", bot_id)
        return TriaBotConfigurationDB(**dict(record)) if record else None
    except Exception as e:
        print(f"ERROR: Error fetching Tria bot configuration for bot_id {bot_id}: {e}")
        return None

async def list_tria_bot_configurations(conn: asyncpg.Connection, skip: int = 0, limit: int = 100) -> List[TriaBotConfigurationDB]:
    """Lists Tria bot configurations."""
    try:
        records = await conn.fetch("SELECT * FROM tria_bot_configurations ORDER BY bot_id LIMIT $1 OFFSET $2;", limit, skip)
        return [TriaBotConfigurationDB(**dict(record)) for record in records]
    except Exception as e:
        print(f"ERROR: Error listing Tria bot configurations: {e}")
        return []

async def update_tria_bot_configuration(conn: asyncpg.Connection, bot_id: str, item_update: TriaBotConfigurationCreate) -> Optional[TriaBotConfigurationDB]:
    """Updates an existing Tria bot configuration."""
    # This is a full update, not partial. For partial, more complex logic is needed.
    # Increments version automatically.
    print(f"INFO: Attempting to update Tria bot configuration for bot_id: {bot_id}")
    try:
        # Fetch current version to increment
        current_config = await get_tria_bot_configuration_by_bot_id(conn, bot_id)
        if not current_config:
            print(f"WARN: Bot configuration for bot_id {bot_id} not found for update.")
            return None
        
        new_version = current_config.current_version + 1

        query = """
            UPDATE tria_bot_configurations
            SET current_version = $1, config_parameters_json = $2, last_updated_by = $3, notes = $4, updated_at = NOW()
            WHERE bot_id = $5
            RETURNING *;
        """
        record = await conn.fetchrow(
            query, new_version, item_update.config_parameters_json, 
            item_update.last_updated_by, item_update.notes, bot_id
        )
        if record:
            print(f"INFO: Tria bot configuration for bot_id {bot_id} updated to version {new_version}.")
            return TriaBotConfigurationDB(**dict(record))
        return None # Should not happen if bot_id exists
    except Exception as e:
        print(f"ERROR: Error updating Tria bot configuration for bot_id {bot_id}: {e}")
        return None

async def delete_tria_bot_configuration(conn: asyncpg.Connection, bot_id: str) -> bool:
    """Deletes a Tria bot configuration."""
    print(f"INFO: Attempting to delete Tria bot configuration for bot_id: {bot_id}")
    try:
        status = await conn.execute("DELETE FROM tria_bot_configurations WHERE bot_id = $1;", bot_id)
        return status.endswith("1") # "DELETE 1"
    except Exception as e:
        print(f"ERROR: Error deleting Tria bot configuration for bot_id {bot_id}: {e}")
        return False
