import asyncpg
from backend.utils.sanitization import mask_email
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

# Model imports
from backend.models.user_models import UserCreate, UserInDB
from backend.models.gesture_models import GestureCreate, UserGesture
from backend.models.hologram_models import HologramCreate, UserHologram
from backend.models.chat_models import ChatSessionCreate, UserChatSession, ChatMessageCreate, ChatMessagePublic
from backend.models.prompt_models import PromptVersionCreate, UserPromptVersion
from backend.models.code_embedding_models import CodeEmbedding, CodeEmbeddingCreate
from backend.models.azr_models import AZRTask, AZRTaskCreate # Added AZR models
from backend.models.learning_log_models import LearningLogEntry, LearningLogEntryCreate # Added Learning Log models

# Security imports
from backend.auth.security import get_password_hash

# Standard library imports
import os # Added for environment variable access in create_initial_users

# --- Users Table CRUD ---

async def create_user(conn: asyncpg.Connection, user: UserCreate) -> Optional[UserInDB]:
    """Inserts a new user into the users table after hashing the password."""
    print(f"INFO: Attempting to create user: {user.username}")
    hashed_password = get_password_hash(user.password)
    try:
        # is_active, email_verified, created_at, updated_at use DB defaults or are set by triggers/app logic
        # role is taken from user input, defaulting if not provided by UserCreate model
        query = """
            INSERT INTO users (username, email, hashed_password, role, user_settings)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *; 
        """
        # user_settings is set to None (null in DB) if not provided in UserCreate
        # This assumes UserCreate might have an optional user_settings field later
        # or it's handled by the default value in the table schema (currently not set for user_settings)
        # For now, explicitly pass None if user_settings is not part of UserCreate.
        # If UserCreate model gets user_settings: user_settings=user.user_settings
        created_user_record = await conn.fetchrow(
            query, user.username, user.email, hashed_password, user.role, None 
        ) 
        if created_user_record:
            print(f"INFO: User {user.username} created successfully with ID: {created_user_record['id']}")
            return UserInDB(**dict(created_user_record))
        return None # Should not happen if RETURNING * and insert is successful
    except asyncpg.UniqueViolationError as e:
        # This error is raised if username or email already exists due to UNIQUE constraints
        print(f"ERROR: Failed to create user {user.username}. Username or email may already exist. Details: {e}")
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error creating user {user.username}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while creating user {user.username}: {e}")
        return None

async def get_user_by_username(conn: asyncpg.Connection, username: str) -> Optional[UserInDB]:
    """Fetches a user by username."""
    print(f"INFO: Attempting to fetch user by username: {username}")
    try:
        query = "SELECT * FROM users WHERE username = $1;"
        record = await conn.fetchrow(query, username)
        if record:
            print(f"INFO: User {username} found.")
            return UserInDB(**dict(record))
        else:
            print(f"INFO: User {username} not found.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error fetching user {username}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while fetching user {username}: {e}")
        return None

async def get_user_by_email(conn: asyncpg.Connection, email: str) -> Optional[UserInDB]:
    """Fetches a user by email."""
    print(f"INFO: Attempting to fetch user by email: {mask_email(email)}")
    try:
        query = "SELECT * FROM users WHERE email = $1;"
        record = await conn.fetchrow(query, email)
        if record:
            print(f"INFO: User with email {mask_email(email)} found.")
            return UserInDB(**dict(record))
        else:
            print(f"INFO: User with email {mask_email(email)} not found.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error fetching user by email {mask_email(email)}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while fetching user by email {mask_email(email)}: {e}")
        return None

async def get_user_by_id(conn: asyncpg.Connection, user_id: int) -> Optional[UserInDB]:
    """Fetches a user by ID."""
    print(f"INFO: Attempting to fetch user by ID: {user_id}")
    try:
        query = "SELECT * FROM users WHERE id = $1;"
        record = await conn.fetchrow(query, user_id)
        if record:
            print(f"INFO: User with ID {user_id} found.")
            return UserInDB(**dict(record))
        else:
            print(f"INFO: User with ID {user_id} not found.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error fetching user ID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while fetching user ID {user_id}: {e}")
        return None

async def update_user_email(conn: asyncpg.Connection, user_id: int, new_email: str) -> bool:
    """Updates a user's email and updated_at timestamp."""
    print(f"INFO: Attempting to update email for user ID: {user_id}")
    try:
        current_time_utc = datetime.now(timezone.utc)
        query = """
            UPDATE users
            SET email = $1, updated_at = $2
            WHERE id = $3;
        """
        status = await conn.execute(query, new_email, current_time_utc, user_id)
        if status.endswith("1"): # Example: "UPDATE 1" means one row was updated
            print(f"INFO: Email updated successfully for user ID: {user_id}")
            return True
        else:
            print(f"WARN: Failed to update email for user ID: {user_id}. User not found or no change made.")
            return False
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error updating email for user ID {user_id}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while updating email for user ID {user_id}: {e}")
        return False

async def update_user_last_login(conn: asyncpg.Connection, user_id: int) -> bool:
    """Updates a user's last_login_at and updated_at timestamps."""
    print(f"INFO: Attempting to update last login for user ID: {user_id}")
    try:
        current_time_utc = datetime.now(timezone.utc)
        query = """
            UPDATE users
            SET last_login_at = $1, updated_at = $1 
            WHERE id = $2;
        """
        # Using $1 for both fields as they should be the same current timestamp
        status = await conn.execute(query, current_time_utc, user_id)
        if status.endswith("1"): # "UPDATE 1"
            print(f"INFO: Last login updated successfully for user ID: {user_id}")
            return True
        else:
            print(f"WARN: Failed to update last login for user ID: {user_id}. User not found.")
            return False
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error updating last login for user ID {user_id}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while updating last login for user ID {user_id}: {e}")
        return False

# --- User Chat Sessions Table CRUD ---

async def create_user_chat_session(conn: asyncpg.Connection, user_id: int, session_in: ChatSessionCreate) -> Optional[UserChatSession]:
    """Creates a new chat session for a user."""
    print(f"INFO: Attempting to create chat session for user ID: {user_id}, title: {session_in.session_title}")
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

async def get_user_chat_sessions(conn: asyncpg.Connection, user_id: int, skip: int = 0, limit: int = 100) -> List[UserChatSession]:
    """Lists all chat sessions for a user, ordered by most recently updated."""
    print(f"INFO: Attempting to get chat sessions for user ID: {user_id}, skip: {skip}, limit: {limit}")
    try:
        query = """
            SELECT * FROM user_chat_sessions
            WHERE user_id = $1
            ORDER BY updated_at DESC
            LIMIT $2 OFFSET $3;
        """
        records = await conn.fetch(query, user_id, limit, skip)
        print(f"INFO: Found {len(records)} chat sessions for user ID {user_id}.")
        return [UserChatSession(**dict(record)) for record in records]
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting chat sessions for user ID {user_id}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting chat sessions for user ID {user_id}: {e}")
        return []

async def get_user_chat_session_by_id(conn: asyncpg.Connection, session_id: int, user_id: int) -> Optional[UserChatSession]:
    """Gets a specific chat session by its ID, ensuring it belongs to the user."""
    print(f"INFO: Attempting to get chat session ID: {session_id} for user ID: {user_id}")
    try:
        query = "SELECT * FROM user_chat_sessions WHERE id = $1 AND user_id = $2;"
        record = await conn.fetchrow(query, session_id, user_id)
        if record:
            print(f"INFO: Chat session ID: {session_id} found for user ID: {user_id}.")
            return UserChatSession(**dict(record))
        else:
            print(f"INFO: Chat session ID: {session_id} not found for user ID: {user_id}.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting chat session ID {session_id} for user ID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting chat session ID {session_id} for user ID {user_id}: {e}")
        return None

async def delete_user_chat_session(conn: asyncpg.Connection, session_id: int, user_id: int) -> bool:
    """Deletes a chat session, ensuring it belongs to the user. Associated messages are deleted by CASCADE."""
    print(f"INFO: Attempting to delete chat session ID: {session_id} for user ID: {user_id}")
    try:
        query = "DELETE FROM user_chat_sessions WHERE id = $1 AND user_id = $2;"
        status = await conn.execute(query, session_id, user_id)
        if status.endswith("1"): # "DELETE 1"
            print(f"INFO: Chat session ID: {session_id} deleted successfully for user ID: {user_id}.")
            return True
        else:
            print(f"WARN: Failed to delete chat session ID: {session_id} for user ID: {user_id}. Session not found or not owned by user.")
            return False
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error deleting chat session ID {session_id} for user ID {user_id}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while deleting chat session ID {session_id} for user ID {user_id}: {e}")
        return False


# --- Chat History Table CRUD (Refactored) ---

async def add_chat_message(
    conn: asyncpg.Connection,
    user_chat_session_id: int, # Changed from session_id: str, user_id: Optional[int]
    role: str,
    message_content: str,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[ChatMessagePublic]: # Changed return type
    """Adds a new chat message to a specific user_chat_session."""
    print(f"INFO: Attempting to add chat message for user_chat_session_id: {user_chat_session_id}")
    if role not in ('user', 'assistant', 'system'):
        print(f"ERROR: Invalid role '{role}'. Must be 'user', 'assistant', or 'system'.")
        return None
    try:
        # Note: The user_id is implicitly validated by the foreign key on user_chat_session_id
        # if the session belongs to the correct user.
        query = """
            INSERT INTO chat_history (user_chat_session_id, role, message_content, metadata, timestamp)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *; 
        """
        current_time = datetime.now(timezone.utc)
        record = await conn.fetchrow(query, user_chat_session_id, role, message_content, metadata, current_time)
        if record:
            print(f"INFO: Chat message added successfully with ID: {record['id']} to session ID: {user_chat_session_id}")
            # Also update the parent user_chat_session's updated_at timestamp
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
    user_chat_session_id: int, # Changed from session_id: str
    limit: int = 50
) -> List[ChatMessagePublic]: # Changed return type
    """Retrieves chat history for a given user_chat_session_id, ordered by timestamp DESC."""
    print(f"INFO: Attempting to get chat history for user_chat_session_id: {user_chat_session_id} with limit {limit}")
    try:
        query = """
            SELECT * FROM chat_history
            WHERE user_chat_session_id = $1
            ORDER BY timestamp ASC -- Usually chat history is displayed oldest first, then new messages appended
            LIMIT $2;
        """
        # If you need newest first, change to ORDER BY timestamp DESC
        records = await conn.fetch(query, user_chat_session_id, limit)
        print(f"INFO: Found {len(records)} messages for user_chat_session_id {user_chat_session_id}.")
        return [ChatMessagePublic(**dict(record)) for record in records]
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting chat history for user_chat_session_id {user_chat_session_id}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting chat history for user_chat_session_id {user_chat_session_id}: {e}")
        return []

# Removed get_chat_history_for_user as its main purpose is now covered by
# get_user_chat_sessions and then get_chat_history for a specific session.
# If direct access to all messages of a user across all sessions is needed, a new function would be required.

# --- User Gestures Table CRUD ---

async def create_user_gesture(conn: asyncpg.Connection, user_id: int, gesture_in: GestureCreate) -> Optional[UserGesture]:
    """Inserts a new gesture for the user."""
    print(f"INFO: Attempting to create gesture '{gesture_in.gesture_name}' for user ID: {user_id}")
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
            print(f"INFO: Gesture '{gesture_in.gesture_name}' created successfully with ID: {record['id']} for user ID: {user_id}")
            return UserGesture(**dict(record))
        return None
    except asyncpg.UniqueViolationError:
        print(f"ERROR: Gesture name '{gesture_in.gesture_name}' already exists for user ID: {user_id}.")
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error creating gesture '{gesture_in.gesture_name}' for user ID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while creating gesture for user ID {user_id}: {e}")
        return None

async def get_user_gestures(conn: asyncpg.Connection, user_id: int, skip: int = 0, limit: int = 100) -> List[UserGesture]:
    """Lists all gestures for a user."""
    print(f"INFO: Attempting to get gestures for user ID: {user_id}, skip: {skip}, limit: {limit}")
    try:
        query = "SELECT * FROM user_gestures WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3;"
        records = await conn.fetch(query, user_id, limit, skip)
        print(f"INFO: Found {len(records)} gestures for user ID: {user_id}.")
        return [UserGesture(**dict(record)) for record in records]
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting gestures for user ID {user_id}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting gestures for user ID {user_id}: {e}")
        return []

async def get_user_gesture_by_id(conn: asyncpg.Connection, gesture_id: int, user_id: int) -> Optional[UserGesture]:
    """Gets a specific gesture by its ID, ensuring it belongs to the user."""
    print(f"INFO: Attempting to get gesture ID: {gesture_id} for user ID: {user_id}")
    try:
        query = "SELECT * FROM user_gestures WHERE id = $1 AND user_id = $2;"
        record = await conn.fetchrow(query, gesture_id, user_id)
        if record:
            print(f"INFO: Gesture ID: {gesture_id} found for user ID: {user_id}.")
            return UserGesture(**dict(record))
        else:
            print(f"INFO: Gesture ID: {gesture_id} not found for user ID: {user_id}.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting gesture ID {gesture_id} for user ID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting gesture ID {gesture_id} for user ID {user_id}: {e}")
        return None

async def update_user_gesture(conn: asyncpg.Connection, gesture_id: int, user_id: int, gesture_update_data: Dict[str, Any]) -> Optional[UserGesture]:
    """Updates a gesture. Only allows updating gesture_name, gesture_definition, gesture_data_ref."""
    print(f"INFO: Attempting to update gesture ID: {gesture_id} for user ID: {user_id}")
    
    allowed_fields = {"gesture_name", "gesture_definition", "gesture_data_ref"}
    update_fields = {k: v for k, v in gesture_update_data.items() if k in allowed_fields}

    if not update_fields:
        print(f"WARN: No valid fields to update for gesture ID: {gesture_id}.")
        # Optionally, fetch and return the existing gesture if no valid fields are provided
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
            print(f"INFO: Gesture ID: {gesture_id} updated successfully for user ID: {user_id}.")
            return UserGesture(**dict(record))
        else:
            print(f"WARN: Failed to update gesture ID: {gesture_id}. Not found or not owned by user ID: {user_id}.")
            return None
    except asyncpg.UniqueViolationError: # If gesture_name is updated to one that already exists for the user
        print(f"ERROR: Update failed for gesture ID {gesture_id}. Gesture name may already exist for user ID {user_id}.")
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error updating gesture ID {gesture_id} for user ID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while updating gesture ID {gesture_id} for user ID {user_id}: {e}")
        return None

async def delete_user_gesture(conn: asyncpg.Connection, gesture_id: int, user_id: int) -> bool:
    """Deletes a gesture, ensuring it belongs to the user."""
    print(f"INFO: Attempting to delete gesture ID: {gesture_id} for user ID: {user_id}")
    try:
        query = "DELETE FROM user_gestures WHERE id = $1 AND user_id = $2;"
        status = await conn.execute(query, gesture_id, user_id)
        if status.endswith("1"):
            print(f"INFO: Gesture ID: {gesture_id} deleted successfully for user ID: {user_id}.")
            return True
        else:
            print(f"WARN: Failed to delete gesture ID: {gesture_id}. Not found or not owned by user ID: {user_id}.")
            return False
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error deleting gesture ID {gesture_id} for user ID {user_id}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while deleting gesture ID {gesture_id} for user ID {user_id}: {e}")
        return False

# --- User Holograms Table CRUD ---

async def create_user_hologram(conn: asyncpg.Connection, user_id: int, hologram_in: HologramCreate) -> Optional[UserHologram]:
    """Creates a new hologram for the user."""
    print(f"INFO: Attempting to create hologram '{hologram_in.hologram_name}' for user ID: {user_id}")
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
            print(f"INFO: Hologram '{hologram_in.hologram_name}' created successfully with ID: {record['id']} for user ID: {user_id}")
            return UserHologram(**dict(record))
        return None
    except asyncpg.UniqueViolationError:
        print(f"ERROR: Hologram name '{hologram_in.hologram_name}' already exists for user ID: {user_id}.")
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error creating hologram '{hologram_in.hologram_name}' for user ID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while creating hologram for user ID {user_id}: {e}")
        return None

async def get_user_holograms(conn: asyncpg.Connection, user_id: int, skip: int = 0, limit: int = 100) -> List[UserHologram]:
    """Lists all holograms for a user."""
    print(f"INFO: Attempting to get holograms for user ID: {user_id}, skip: {skip}, limit: {limit}")
    try:
        query = "SELECT * FROM user_holograms WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3;"
        records = await conn.fetch(query, user_id, limit, skip)
        print(f"INFO: Found {len(records)} holograms for user ID: {user_id}.")
        return [UserHologram(**dict(record)) for record in records]
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting holograms for user ID {user_id}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting holograms for user ID {user_id}: {e}")
        return []

async def get_user_hologram_by_id(conn: asyncpg.Connection, hologram_id: int, user_id: int) -> Optional[UserHologram]:
    """Gets a specific hologram by its ID, ensuring it belongs to the user."""
    print(f"INFO: Attempting to get hologram ID: {hologram_id} for user ID: {user_id}")
    try:
        query = "SELECT * FROM user_holograms WHERE id = $1 AND user_id = $2;"
        record = await conn.fetchrow(query, hologram_id, user_id)
        if record:
            print(f"INFO: Hologram ID: {hologram_id} found for user ID: {user_id}.")
            return UserHologram(**dict(record))
        else:
            print(f"INFO: Hologram ID: {hologram_id} not found for user ID: {user_id}.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting hologram ID {hologram_id} for user ID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting hologram ID {hologram_id} for user ID {user_id}: {e}")
        return None

async def update_user_hologram(conn: asyncpg.Connection, hologram_id: int, user_id: int, hologram_update_data: Dict[str, Any]) -> Optional[UserHologram]:
    """Updates a hologram. Only allows updating hologram_name, hologram_state_data."""
    print(f"INFO: Attempting to update hologram ID: {hologram_id} for user ID: {user_id}")
    
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
            print(f"INFO: Hologram ID: {hologram_id} updated successfully for user ID: {user_id}.")
            return UserHologram(**dict(record))
        else:
            print(f"WARN: Failed to update hologram ID: {hologram_id}. Not found or not owned by user ID: {user_id}.")
            return None
    except asyncpg.UniqueViolationError:
        print(f"ERROR: Update failed for hologram ID {hologram_id}. Hologram name may already exist for user ID {user_id}.")
        return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error updating hologram ID {hologram_id} for user ID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while updating hologram ID {hologram_id} for user ID {user_id}: {e}")
        return None

async def delete_user_hologram(conn: asyncpg.Connection, hologram_id: int, user_id: int) -> bool:
    """Deletes a hologram, ensuring it belongs to the user."""
    print(f"INFO: Attempting to delete hologram ID: {hologram_id} for user ID: {user_id}")
    try:
        query = "DELETE FROM user_holograms WHERE id = $1 AND user_id = $2;"
        status = await conn.execute(query, hologram_id, user_id)
        if status.endswith("1"):
            print(f"INFO: Hologram ID: {hologram_id} deleted successfully for user ID: {user_id}.")
            return True
        else:
            print(f"WARN: Failed to delete hologram ID: {hologram_id}. Not found or not owned by user ID: {user_id}.")
            return False
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error deleting hologram ID {hologram_id} for user ID {user_id}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while deleting hologram ID {hologram_id} for user ID {user_id}: {e}")
        return False

# --- User Prompt Versions Table CRUD ---

async def create_user_prompt_version(conn: asyncpg.Connection, user_id: int, prompt_in: PromptVersionCreate) -> Optional[UserPromptVersion]:
    """Creates a new prompt version for the user, incrementing version number."""
    print(f"INFO: Attempting to create prompt version for title '{prompt_in.prompt_title}' for user ID: {user_id}")
    try:
        # Determine next version number
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
            print(f"INFO: Prompt version '{prompt_in.prompt_title}' v{next_version} created successfully with ID: {record['id']} for user ID: {user_id}")
            return UserPromptVersion(**dict(record))
        return None
    except asyncpg.UniqueViolationError: # Should be caught by the (user_id, prompt_title, version_number) constraint if race condition happens
        print(f"ERROR: Prompt version '{prompt_in.prompt_title}' v{next_version} creation failed due to unique constraint for user ID {user_id}.")
        return None # Or re-try logic if desired
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error creating prompt version '{prompt_in.prompt_title}' for user ID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while creating prompt version for user ID {user_id}: {e}")
        return None

async def get_user_prompt_versions_by_title(conn: asyncpg.Connection, user_id: int, prompt_title: str, skip: int = 0, limit: int = 100) -> List[UserPromptVersion]:
    """Lists all versions of a specific prompt for a user, ordered by version number DESC."""
    print(f"INFO: Attempting to get prompt versions for title '{prompt_title}' for user ID: {user_id}")
    try:
        query = """
            SELECT * FROM user_prompt_versions 
            WHERE user_id = $1 AND prompt_title = $2 
            ORDER BY version_number DESC 
            LIMIT $3 OFFSET $4;
        """
        records = await conn.fetch(query, user_id, prompt_title, limit, skip)
        print(f"INFO: Found {len(records)} versions for prompt '{prompt_title}' for user ID: {user_id}.")
        return [UserPromptVersion(**dict(record)) for record in records]
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting prompt versions for '{prompt_title}' for user ID {user_id}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting prompt versions for user ID {user_id}: {e}")
        return []

async def get_user_prompt_version_by_id(conn: asyncpg.Connection, prompt_version_id: int, user_id: int) -> Optional[UserPromptVersion]:
    """Gets a specific prompt version by its ID, ensuring it belongs to the user."""
    print(f"INFO: Attempting to get prompt version ID: {prompt_version_id} for user ID: {user_id}")
    try:
        query = "SELECT * FROM user_prompt_versions WHERE id = $1 AND user_id = $2;"
        record = await conn.fetchrow(query, prompt_version_id, user_id)
        if record:
            print(f"INFO: Prompt version ID: {prompt_version_id} found for user ID: {user_id}.")
            return UserPromptVersion(**dict(record))
        else:
            print(f"INFO: Prompt version ID: {prompt_version_id} not found for user ID: {user_id}.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting prompt version ID {prompt_version_id} for user ID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting prompt version ID {prompt_version_id} for user ID {user_id}: {e}")
        return None

async def get_latest_user_prompt_version(conn: asyncpg.Connection, user_id: int, prompt_title: str) -> Optional[UserPromptVersion]:
    """Gets the latest version of a specific prompt for a user."""
    print(f"INFO: Attempting to get latest version of prompt '{prompt_title}' for user ID: {user_id}")
    try:
        query = """
            SELECT * FROM user_prompt_versions 
            WHERE user_id = $1 AND prompt_title = $2 
            ORDER BY version_number DESC 
            LIMIT 1;
        """
        record = await conn.fetchrow(query, user_id, prompt_title)
        if record:
            print(f"INFO: Latest version {record['version_number']} of prompt '{prompt_title}' found for user ID: {user_id}.")
            return UserPromptVersion(**dict(record))
        else:
            print(f"INFO: No versions found for prompt '{prompt_title}' for user ID: {user_id}.")
            return None
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting latest prompt version for '{prompt_title}' for user ID {user_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting latest prompt version for user ID {user_id}: {e}")
        return None

async def delete_user_prompt_version(conn: asyncpg.Connection, prompt_version_id: int, user_id: int) -> bool:
    """Deletes a prompt version, ensuring it belongs to the user."""
    print(f"INFO: Attempting to delete prompt version ID: {prompt_version_id} for user ID: {user_id}")
    try:
        query = "DELETE FROM user_prompt_versions WHERE id = $1 AND user_id = $2;"
        status = await conn.execute(query, prompt_version_id, user_id)
        if status.endswith("1"):
            print(f"INFO: Prompt version ID: {prompt_version_id} deleted successfully for user ID: {user_id}.")
            return True
        else:
            print(f"WARN: Failed to delete prompt version ID: {prompt_version_id}. Not found or not owned by user ID: {user_id}.")
            return False
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error deleting prompt version ID {prompt_version_id} for user ID {user_id}: {e}")
        return False
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while deleting prompt version ID {prompt_version_id} for user ID {user_id}: {e}")
        return False

# --- Initial User Seeding ---
async def create_initial_users(conn: asyncpg.Connection):
    print("INFO: Attempting to create initial users (admin, test_user)...")
    
    admin_username = "NeuroCoderZ_Admin"
    admin_email = os.getenv("INITIAL_ADMIN_EMAIL", "admin@example.com") 
    admin_password = os.getenv("INITIAL_ADMIN_PASSWORD")
    admin_role = "admin"

    test_user_username = "test_user_0"
    test_user_email = os.getenv("INITIAL_TEST_USER_EMAIL", "testuser@example.com")
    test_user_password = os.getenv("INITIAL_TEST_USER_PASSWORD")
    test_user_role = "user"

    users_to_create = []
    if admin_password:
        users_to_create.append(
            {"username": admin_username, "email": admin_email, "password": admin_password, "role": admin_role, "is_admin": True}
        )
    else:
        print(f"WARN: INITIAL_ADMIN_PASSWORD not set. Admin user '{admin_username}' will not be created.")

    if test_user_password:
        users_to_create.append(
            {"username": test_user_username, "email": test_user_email, "password": test_user_password, "role": test_user_role, "is_admin": False}
        )
    else:
        print(f"WARN: INITIAL_TEST_USER_PASSWORD not set. Test user '{test_user_username}' will not be created.")

    for user_data in users_to_create:
        existing_user_by_name = await get_user_by_username(conn, user_data["username"])
        if existing_user_by_name:
            print(f"INFO: User '{user_data['username']}' already exists by username. Skipping creation.")
            continue
        
        # Also check by email to prevent UniqueViolationError if username is different but email is same
        existing_user_by_email = await get_user_by_email(conn, user_data["email"])
        if existing_user_by_email:
            sanitized_user_data = {key: (value if key != "password" else "****") for key, value in user_data.items()}
            print(f"INFO: User with email '{sanitized_user_data['email']}' (intended for '{sanitized_user_data['username']}') already exists. Skipping creation.")
            continue
        
        user_create_model = UserCreate(
            username=user_data["username"],
            email=user_data["email"],
            password=user_data["password"], # create_user will hash this
            role=user_data["role"]
        )
        
        created_user = await create_user(conn, user_create_model) 
        if created_user:
            sanitized_user_data = {key: (value if key != "password" else "****") for key, value in user_data.items()}
            print(f"INFO: Successfully created user '{sanitized_user_data['username']}' with role '{sanitized_user_data['role']}'. ID: {created_user.id}")
            # Schema defaults: is_active=True, email_verified=False.
            # If specific settings like making admin active and verified are needed immediately,
            # an update operation would be required here. E.g.,
            # if user_data["is_admin"]:
            #    await conn.execute("UPDATE users SET email_verified = TRUE, is_active = TRUE WHERE id = $1", created_user.id)
            #    print(f"INFO: Admin user '{created_user.username}' explicitly set to active and email_verified.")
        else:
            # create_user already prints detailed error including UniqueViolation
            print(f"ERROR: Failed to create user '{user_data['username']}'. See previous logs from create_user function.")
    print("INFO: Initial user creation process finished.")

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

async def store_av_chunk(
    conn: asyncpg.Connection,
    session_id: str,
    audio_data_path: str,
    video_data_path: str,
    gesture_data: Dict[str, Any], # JSONB
    chunk_embedding: List[float], # VECTOR
    user_id: Optional[int] = None,
    transcription_text: Optional[str] = None,
    recognized_gestures: Optional[Dict[str, Any]] = None, # JSONB
    context_metadata: Optional[Dict[str, Any]] = None # JSONB
) -> Optional[int]:
    """Stores a new audiovisual chunk."""
    print(f"INFO: Attempting to store AV chunk for session: {session_id}")
    try:
        # asyncpg can handle List[float] for vector types if pgvector codec is registered.
        # Otherwise, it might need to be cast or passed as a string like '[1.0,2.0,3.0]'
        # Assuming asyncpg handles it correctly with pgvector.
        query = """
            INSERT INTO audiovisual_gestural_chunks (
                user_id, session_id, audio_data_path, video_data_path,
                gesture_data, transcription_text, recognized_gestures,
                context_metadata, chunk_embedding
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id;
        """
        chunk_id = await conn.fetchval(
            query, user_id, session_id, audio_data_path, video_data_path,
            gesture_data, transcription_text, recognized_gestures,
            context_metadata, chunk_embedding
        )
        print(f"INFO: AV chunk stored successfully for session {session_id} with ID: {chunk_id}")
        return chunk_id
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error storing AV chunk for session {session_id}: {e}")
        # You might want to log the specific error, e.g., if it's related to vector format
        if "vector" in str(e).lower():
             print("ERROR: Potential issue with vector data format or pgvector extension.")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while storing AV chunk for session {session_id}: {e}")
        return None

async def get_av_chunk_by_id(conn: asyncpg.Connection, chunk_id: int) -> Optional[asyncpg.Record]:
    """Retrieves an AV chunk by its ID."""
    print(f"INFO: Attempting to fetch AV chunk by ID: {chunk_id}")
    try:
        query = "SELECT * FROM audiovisual_gestural_chunks WHERE id = $1;"
        chunk_record = await conn.fetchrow(query, chunk_id)
        if chunk_record:
            print(f"INFO: AV chunk with ID {chunk_id} found.")
        else:
            print(f"INFO: AV chunk with ID {chunk_id} not found.")
        return chunk_record
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error fetching AV chunk ID {chunk_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while fetching AV chunk ID {chunk_id}: {e}")
        return None

async def find_similar_chunks(conn: asyncpg.Connection, query_embedding: List[float], top_k: int = 5) -> List[asyncpg.Record]:
    """Finds top_k similar chunks based on chunk_embedding similarity (L2 distance)."""
    print(f"INFO: Attempting to find {top_k} similar AV chunks.")
    try:
        # L2 distance: <-> operator. Smaller distance means more similar.
        query = """
            SELECT id, session_id, audio_data_path, video_data_path, transcription_text,
                   (chunk_embedding <-> $1) AS distance
            FROM audiovisual_gestural_chunks
            ORDER BY distance ASC
            LIMIT $2;
        """
        records = await conn.fetch(query, query_embedding, top_k)
        print(f"INFO: Found {len(records)} similar AV chunks.")
        return records
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
