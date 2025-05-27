-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: users
-- Stores user authentication and basic profile information.
-- Firebase UID is used as the primary key.
CREATE TABLE users (
    firebase_uid TEXT PRIMARY KEY,
    email VARCHAR(255) UNIQUE, -- User's email, should be kept in sync with Firebase Auth
    role VARCHAR(50) DEFAULT 'user' NOT NULL CHECK (role IN ('admin', 'core_developer', 'beta_tester', 'user')),
    last_login_at TIMESTAMP WITH TIME ZONE, -- Timestamp of the last login
    is_active BOOLEAN DEFAULT TRUE NOT NULL, -- Whether the user account is active
    email_verified BOOLEAN DEFAULT FALSE NOT NULL, -- Whether the email has been verified (synced from Firebase)
    user_settings JSONB, -- User-specific settings and preferences
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- Application-level handling for updates
);
COMMENT ON TABLE users IS 'Stores user authentication and basic profile information. Firebase UID is primary key.';

-- Table: media_files
-- Stores metadata for media files, linking to Cloud Storage paths.
CREATE TABLE media_files (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(firebase_uid) ON DELETE SET NULL, -- User who uploaded or owns the file
    file_name VARCHAR(255) NOT NULL,
    storage_path VARCHAR(1024) NOT NULL UNIQUE, -- Full path in Cloud Storage (e.g., gs://bucket_name/path/to/file)
    file_type VARCHAR(100), -- MIME type or general type (e.g., 'audio/wav', 'video/mp4', 'image/jpeg')
    file_size_bytes BIGINT,
    duration_seconds FLOAT, -- For audio/video files
    resolution_width INTEGER, -- For video/image files
    resolution_height INTEGER, -- For video/image files
    metadata JSONB, -- Any other specific metadata (e.g., codec, bitrate, EXIF)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_media_files_user_id ON media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_file_type ON media_files(file_type);
COMMENT ON TABLE media_files IS 'Stores metadata for media files, linking to Cloud Storage paths.';

-- Table: audiovisual_gestural_chunks
-- Stores raw and partially processed data from user interactions.
CREATE TABLE audiovisual_gestural_chunks (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(firebase_uid) ON DELETE CASCADE NOT NULL,
    session_id VARCHAR(255), -- Identifier for a user session
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    audio_file_id INTEGER REFERENCES media_files(id) ON DELETE SET NULL, -- Reference to audio file in media_files
    video_file_id INTEGER REFERENCES media_files(id) ON DELETE SET NULL, -- Reference to video file in media_files
    hand_landmarks JSONB, -- Raw hand landmark data from MediaPipe/other sources
    gesture_classification_client TEXT, -- Client-side initial gesture classification
    gesture_confidence_client REAL, -- Client-side confidence for the classification
    speech_transcription_client TEXT, -- Client-side speech transcription
    environment_context JSONB, -- Contextual information about the user's environment
    user_feedback_rating INTEGER, -- User rating for Tria's response to this chunk
    user_feedback_text TEXT, -- User textual feedback
    user_flagged_issue BOOLEAN DEFAULT FALSE, -- Whether the user flagged an issue with this interaction
    tria_processed_flag BOOLEAN DEFAULT FALSE, -- Whether Tria has fully processed this chunk
    processing_tags TEXT[], -- Tags added during processing by Tria
    metadata JSONB, -- Other miscellaneous metadata
    raw_data_blob JSONB, -- For any other raw data associated with the chunk
    chunk_embedding VECTOR(1536) NULL -- Semantic embedding of the chunk content (e.g., from OpenAI text-embedding-ada-002)
);
CREATE INDEX IF NOT EXISTS idx_audiovisual_chunks_user_id ON audiovisual_gestural_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_audiovisual_chunks_session_id ON audiovisual_gestural_chunks(session_id);
CREATE INDEX IF NOT EXISTS idx_audiovisual_chunks_chunk_embedding ON audiovisual_gestural_chunks USING hnsw (chunk_embedding vector_l2_ops);
COMMENT ON TABLE audiovisual_gestural_chunks IS 'Stores raw and partially processed data from user interactions.';

-- Table: gesture_sequences
-- Stores interpreted gesture sequences composed of multiple primitives, linked to an interaction chunk.
CREATE TABLE gesture_sequences (
    id SERIAL PRIMARY KEY,
    chunk_id INTEGER REFERENCES audiovisual_gestural_chunks(id) ON DELETE CASCADE NOT NULL,
    user_id TEXT REFERENCES users(firebase_uid) ON DELETE CASCADE NOT NULL,
    duration_ms FLOAT, -- Total duration of the interpreted gesture sequence
    primitives JSONB, -- Array of gestural primitives (type, timestamp, hand, confidence, spatial_data)
    semantic_hypotheses JSONB, -- List of semantic hypotheses with confidence (intent, parameters, confidence)
    context_snapshot JSONB, -- Relevant state of the holographic environment at the time of gesture
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_gesture_sequences_chunk_id ON gesture_sequences(chunk_id);
CREATE INDEX IF NOT EXISTS idx_gesture_sequences_user_id ON gesture_sequences(user_id);
COMMENT ON TABLE gesture_sequences IS 'Stores interpreted gesture sequences composed of multiple primitives.';

-- Table: user_chat_sessions
-- Defines a specific chat session for a user.
CREATE TABLE user_chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(firebase_uid) ON DELETE CASCADE NOT NULL,
    session_title VARCHAR(255), 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL 
);
CREATE INDEX IF NOT EXISTS idx_user_chat_sessions_user_id ON user_chat_sessions(user_id);
COMMENT ON TABLE user_chat_sessions IS 'Defines a specific chat session for a user.';

-- Table: chat_history (or chat_messages)
-- Stores individual messages within each chat session.
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_chat_session_id INTEGER REFERENCES user_chat_sessions(id) ON DELETE CASCADE NOT NULL,
    role VARCHAR(50) CHECK (role IN ('user', 'assistant', 'system')) NOT NULL, -- Sender of the message
    message_content TEXT NOT NULL, -- Actual text content of the message
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB -- Any additional metadata for the message (e.g., model used, confidence)
);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_chat_session_id ON chat_history(user_chat_session_id);
COMMENT ON TABLE chat_history IS 'Stores individual messages within each chat session.';

-- Table: user_gestures
-- Stores custom gesture definitions saved by users.
CREATE TABLE user_gestures (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(firebase_uid) ON DELETE CASCADE NOT NULL,
    gesture_name VARCHAR(255) NOT NULL,
    gesture_data_ref INTEGER REFERENCES audiovisual_gestural_chunks(id) ON DELETE SET NULL, -- Optional link to an example chunk
    gesture_definition JSONB NOT NULL, -- User-defined parameters or sequence for the gesture
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL 
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_gestures_user_id_gesture_name ON user_gestures(user_id, gesture_name);
CREATE INDEX IF NOT EXISTS idx_user_gestures_user_id ON user_gestures(user_id);
COMMENT ON TABLE user_gestures IS 'Stores custom gesture definitions saved by users.';

-- Table: user_holograms
-- Stores saved states or definitions of holograms created by users.
CREATE TABLE user_holograms (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(firebase_uid) ON DELETE CASCADE NOT NULL,
    hologram_name VARCHAR(255) NOT NULL,
    hologram_state_data JSONB NOT NULL, -- JSON representing the state or definition of the hologram
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL 
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_holograms_user_id_hologram_name ON user_holograms(user_id, hologram_name);
CREATE INDEX IF NOT EXISTS idx_user_holograms_user_id ON user_holograms(user_id);
COMMENT ON TABLE user_holograms IS 'Stores saved states or definitions of holograms by users.';

-- Table: user_prompt_versions
-- Stores versions of prompts created by users.
CREATE TABLE user_prompt_versions (
    id SERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(firebase_uid) ON DELETE CASCADE NOT NULL,
    prompt_title VARCHAR(255) NOT NULL, -- Title given by the user to a set of prompt versions
    prompt_text TEXT NOT NULL, -- The actual text of this version of the prompt
    version_number INTEGER NOT NULL, -- Version number for this title, managed by application
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    associated_hologram_id INTEGER REFERENCES user_holograms(id) ON DELETE SET NULL, -- Optional link to a hologram state
    metadata JSONB, -- Any other metadata related to this prompt version
    CONSTRAINT unique_user_prompt_version UNIQUE (user_id, prompt_title, version_number)
);
CREATE INDEX IF NOT EXISTS idx_user_prompt_versions_user_id ON user_prompt_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prompt_versions_user_id_prompt_title ON user_prompt_versions(user_id, prompt_title);
COMMENT ON TABLE user_prompt_versions IS 'Stores versions of prompts created by users.';

-- Table: tria_knowledge_base
-- Stores documents and their embeddings for Tria's RAG capabilities.
CREATE TABLE tria_knowledge_base (
    id SERIAL PRIMARY KEY,
    source_document_id VARCHAR(255), -- Identifier for the original source of the document
    content_text TEXT NOT NULL, -- Text content of the document
    content_embedding VECTOR(1536), -- Semantic embedding of the content_text
    metadata JSONB, -- Other metadata (e.g., source type, tags, original author)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tria_kb_content_embedding ON tria_knowledge_base USING hnsw (content_embedding vector_l2_ops);
COMMENT ON TABLE tria_knowledge_base IS 'Stores documents and embeddings for Tria RAG capabilities.';

-- Table: tria_memory_embeddings
-- Generic table for storing various types of embeddings Tria might use or generate.
CREATE TABLE tria_memory_embeddings (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(100), -- Type of the source (e.g., 'user_gesture', 'code_component', 'chat_summary')
    source_id VARCHAR(255),   -- Identifier of the source item
    embedding_vector VECTOR(1536), -- The embedding vector
    text_content TEXT, -- Optional textual representation related to the embedding
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tria_mem_emb_vector ON tria_memory_embeddings USING hnsw (embedding_vector vector_l2_ops);
COMMENT ON TABLE tria_memory_embeddings IS 'Generic table for various types of embeddings Tria uses.';

-- Table: application_logs
-- For logging application-level events, errors, and debug information.
CREATE TABLE application_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(50) CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'DEBUG')) NOT NULL,
    source_component VARCHAR(255), -- e.g., 'GestureBot', 'AuthService', 'APIEndpoint'
    message TEXT NOT NULL,
    details JSONB -- Additional structured details for the log entry
);
CREATE INDEX IF NOT EXISTS idx_application_logs_level ON application_logs(level);
CREATE INDEX IF NOT EXISTS idx_application_logs_timestamp_desc ON application_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_application_logs_source_component ON application_logs(source_component);
COMMENT ON TABLE application_logs IS 'Logs application-level events, errors, and debug information.';

-- Table: holograph_data (Placeholder, may be refined or removed based on HoloGraph design)
-- Generic table for storing data related to the HoloGraph ecosystem if needed.
CREATE TABLE holograph_data (
    id SERIAL PRIMARY KEY,
    data_type VARCHAR(255), -- Type of HoloGraph data (e.g., 'transaction_record', 'user_contribution')
    data_payload JSONB, -- The actual data payload
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE holograph_data IS 'Placeholder for data related to the HoloGraph ecosystem.';

-- Table: tria_code_embeddings
-- Stores semantic embeddings of Tria's own code components for self-understanding ("Liquid Code").
CREATE TABLE tria_code_embeddings (
    component_id VARCHAR(255) PRIMARY KEY,    -- Unique identifier (e.g., function path, module name)
    source_code_reference TEXT,               -- Link or reference to the source code file/version
    embedding_vector VECTOR(1536),            -- Semantic embedding of the code component
    semantic_description TEXT,                -- Human-readable description
    dependencies JSONB,                       -- List of other component_ids this component depends on
    version VARCHAR(50),                      -- Version of this code component/embedding
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tria_code_embeddings_embedding ON tria_code_embeddings USING hnsw (embedding_vector vector_l2_ops);
COMMENT ON TABLE tria_code_embeddings IS 'Stores semantic embeddings of Tria''s code components.';

-- Table: tria_azr_tasks
-- Manages tasks for Tria's Absolute Zero Reasoning (AZR) processes.
CREATE TABLE tria_azr_tasks (
    task_id SERIAL PRIMARY KEY,
    description_text TEXT NOT NULL, -- Description of the task Tria needs to solve
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'evaluating', 'completed_success', 'completed_failure', 'aborted')),
    priority INTEGER DEFAULT 0,
    complexity_score FLOAT, -- Estimated complexity of the task
    generation_source TEXT, -- How this task was generated (e.g., 'LearningBot', 'manual')
    related_bot_id TEXT, -- ID of the bot primarily responsible or affected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE, -- When Tria started working on this task
    completed_at TIMESTAMP WITH TIME ZONE, -- When Tria completed or aborted this task
    metadata_json JSONB -- Any other metadata related to the task
);
COMMENT ON TABLE tria_azr_tasks IS 'Manages tasks for Tria''s Absolute Zero Reasoning processes.';

-- Table: tria_azr_task_solutions
-- Stores solutions or outcomes generated by Tria for AZR tasks.
CREATE TABLE tria_azr_task_solutions (
    solution_id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES tria_azr_tasks(task_id) ON DELETE CASCADE NOT NULL,
    solution_approach_description TEXT,       -- How Tria attempted to solve the task
    solution_artifacts_json JSONB,            -- References to artifacts (e.g., new code embeddings, model versions)
    outcome_summary TEXT,                     -- Summary of the result
    performance_metrics_json JSONB,           -- Metrics evaluating the solution's success
    verification_status TEXT DEFAULT 'pending' CHECK (verification_status IN ('pending', 'verified_success', 'verified_failure', 'verification_failed_to_run')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_azr_task_solutions_task_id ON tria_azr_task_solutions(task_id);
COMMENT ON TABLE tria_azr_task_solutions IS 'Stores solutions or outcomes for AZR tasks.';

-- Table: tria_learning_log
-- Logs significant learning events, model updates, or evolutionary changes in Tria.
CREATE TABLE tria_learning_log (
    log_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT NOT NULL, -- Type of learning event (e.g., 'model_update', 'new_pattern_discovered')
    bot_affected_id TEXT, -- ID of the bot affected or involved
    summary_text TEXT NOT NULL, -- Summary of the learning event
    details_json JSONB -- Detailed information about the event
);
CREATE INDEX IF NOT EXISTS idx_tria_learning_log_timestamp ON tria_learning_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_tria_learning_log_event_type ON tria_learning_log(event_type);
COMMENT ON TABLE tria_learning_log IS 'Logs significant learning events or evolutionary changes in Tria.';

-- Table: tria_bot_configurations
-- Stores configurations for Tria's various bots, allowing for dynamic updates.
CREATE TABLE tria_bot_configurations (
    config_id SERIAL PRIMARY KEY,
    bot_id VARCHAR(255) UNIQUE NOT NULL,      -- Identifier for the bot (e.g., "GestureBot", "AudioBot")
    current_version INTEGER NOT NULL DEFAULT 1,
    config_parameters_json JSONB NOT NULL,    -- The actual configuration parameters for the bot
    last_updated_by TEXT DEFAULT 'system',    -- Who or what updated this config (e.g., "LearningBot", "admin_user")
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT                                -- Any notes about this configuration
);
COMMENT ON TABLE tria_bot_configurations IS 'Stores configurations for Tria''s bots.';

-- Function to automatically update 'updated_at' timestamp (Optional, if not handled by application)
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables that have an 'updated_at' column
-- Example for 'users' table (repeat for other relevant tables if desired):
-- CREATE TRIGGER set_timestamp_users
-- BEFORE UPDATE ON users
-- FOR EACH ROW
-- EXECUTE FUNCTION trigger_set_timestamp();

-- Note: The 'updated_at' columns in this schema are defined with DEFAULT CURRENT_TIMESTAMP,
-- which sets them on creation. For updates, either the application logic must explicitly set them,
-- or database triggers like the example above can be used.
-- For simplicity in this phase, application-level handling is assumed for 'updated_at' on updates.
-- The example trigger is provided for reference if DB-level automation is preferred later.
-- The existing schema.sql already had application-level handling noted.
-- Vector dimensions are assumed to be 1536 based on common models like OpenAI text-embedding-ada-002.
-- If other dimensions are needed, the VECTOR(1536) type should be adjusted.
-- HNSW indexes are used for vector columns for efficient similarity search.
-- Foreign key relations are defined with ON DELETE CASCADE or ON DELETE SET NULL where appropriate.
-- Check constraints are used for 'role' and 'status' fields to ensure data integrity.
-- Unique constraints are applied where necessary (e.g., email, user_id+name combinations).
-- Timestamps are WITH TIME ZONE for consistency.
-- JSONB is used for flexible structured data fields.
-- TEXT is used for potentially long string data.
-- VARCHAR limits are set for fields like email, role, titles to reasonable values.
-- SERIAL is used for auto-incrementing primary keys.
-- Comments are added to tables for better understanding.
-- The 'holograph_data' table is kept as a placeholder from the original schema.sql.
-- The 'media_files' table is added to manage paths to Cloud Storage.
-- The 'gesture_sequences' table is added to store interpreted gesture sequences.
-- `audio_data_path` and `video_data_path` in `audiovisual_gestural_chunks` are changed to `audio_file_id` and `video_file_id`
-- and now reference the `media_files` table.
```
