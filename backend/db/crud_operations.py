import asyncpg
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

# --- Users Table CRUD ---

async def create_user(conn: asyncpg.Connection, username: str, hashed_password: str, email: Optional[str] = None) -> Optional[int]:
    """Inserts a new user into the users table."""
    print(f"INFO: Attempting to create user: {username}")
    try:
        # created_at has a default, updated_at is application-handled or via trigger
        query = """
            INSERT INTO users (username, hashed_password, email)
            VALUES ($1, $2, $3)
            RETURNING id;
        """
        user_id = await conn.fetchval(query, username, hashed_password, email)
        print(f"INFO: User {username} created successfully with ID: {user_id}")
        return user_id
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error creating user {username}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while creating user {username}: {e}")
        return None

async def get_user_by_username(conn: asyncpg.Connection, username: str) -> Optional[asyncpg.Record]:
    """Fetches a user by username."""
    print(f"INFO: Attempting to fetch user by username: {username}")
    try:
        query = "SELECT * FROM users WHERE username = $1;"
        user_record = await conn.fetchrow(query, username)
        if user_record:
            print(f"INFO: User {username} found.")
        else:
            print(f"INFO: User {username} not found.")
        return user_record
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error fetching user {username}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while fetching user {username}: {e}")
        return None

async def get_user_by_id(conn: asyncpg.Connection, user_id: int) -> Optional[asyncpg.Record]:
    """Fetches a user by ID."""
    print(f"INFO: Attempting to fetch user by ID: {user_id}")
    try:
        query = "SELECT * FROM users WHERE id = $1;"
        user_record = await conn.fetchrow(query, user_id)
        if user_record:
            print(f"INFO: User with ID {user_id} found.")
        else:
            print(f"INFO: User with ID {user_id} not found.")
        return user_record
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
        if status.endswith("1"): # Example: "UPDATE 1"
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

# --- Chat History Table CRUD ---

async def add_chat_message(
    conn: asyncpg.Connection,
    session_id: str,
    role: str,
    message_content: str,
    user_id: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None
) -> Optional[int]:
    """Adds a new chat message."""
    print(f"INFO: Attempting to add chat message for session: {session_id}")
    if role not in ('user', 'assistant', 'system'):
        print(f"ERROR: Invalid role '{role}'. Must be 'user', 'assistant', or 'system'.")
        return None
    try:
        query = """
            INSERT INTO chat_history (session_id, user_id, role, message_content, metadata)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id;
        """
        message_id = await conn.fetchval(query, session_id, user_id, role, message_content, metadata)
        print(f"INFO: Chat message added successfully for session {session_id} with ID: {message_id}")
        return message_id
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error adding chat message for session {session_id}: {e}")
        return None
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while adding chat message for session {session_id}: {e}")
        return None

async def get_chat_history(conn: asyncpg.Connection, session_id: str, limit: int = 50) -> List[asyncpg.Record]:
    """Retrieves chat history for a given session_id, ordered by timestamp DESC."""
    print(f"INFO: Attempting to get chat history for session: {session_id} with limit {limit}")
    try:
        query = """
            SELECT * FROM chat_history
            WHERE session_id = $1
            ORDER BY timestamp DESC
            LIMIT $2;
        """
        records = await conn.fetch(query, session_id, limit)
        print(f"INFO: Found {len(records)} messages for session {session_id}.")
        return records
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting chat history for session {session_id}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting chat history for session {session_id}: {e}")
        return []

async def get_chat_history_for_user(conn: asyncpg.Connection, user_id: int, limit: int = 50) -> List[asyncpg.Record]:
    """Retrieves chat history for a given user_id, ordered by timestamp DESC."""
    print(f"INFO: Attempting to get chat history for user ID: {user_id} with limit {limit}")
    try:
        query = """
            SELECT * FROM chat_history
            WHERE user_id = $1
            ORDER BY timestamp DESC
            LIMIT $2;
        """
        records = await conn.fetch(query, user_id, limit)
        print(f"INFO: Found {len(records)} messages for user ID {user_id}.")
        return records
    except asyncpg.PostgresError as e:
        print(f"ERROR: Error getting chat history for user ID {user_id}: {e}")
        return []
    except Exception as e:
        print(f"ERROR: An unexpected error occurred while getting chat history for user ID {user_id}: {e}")
        return []

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
