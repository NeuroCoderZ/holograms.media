-- Base schema for Holograms.media MVP
-- Using TEXT for user_id to align with Firebase UID string type.
-- Using UUID for most other primary keys.
-- Using TIMESTAMPTZ for all timestamps.
-- Using JSONB for flexible metadata fields.

-- Users table
CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY, -- Firebase UID
    email TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc')
);

-- Audiovisual Gestural Chunks table
CREATE TABLE IF NOT EXISTS audiovisual_gestural_chunks (
    chunk_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    chunk_type TEXT NOT NULL, -- e.g., 'audio', 'video', 'audiovisual'
    storage_ref TEXT NOT NULL UNIQUE, -- Path in Firebase Storage or other object store
    original_filename TEXT,
    mime_type TEXT,
    duration_seconds FLOAT,
    resolution_width INTEGER,
    resolution_height INTEGER,
    tria_processing_status TEXT DEFAULT 'pending', -- pending, processing, processed, failed
    tria_extracted_features_json JSONB,
    related_gesture_id UUID, -- Can be NULL, FK added later if gestures table exists
    related_hologram_id UUID, -- Can be NULL, FK added later if holograms table exists
    custom_metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc')
);

-- Tria Learning Log table
-- Table for logging various events, user interactions, and feedback related to Tria's learning and operation.
CREATE TABLE IF NOT EXISTS tria_learning_log (
    log_id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
    user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL, -- ID of the user associated with this log event, references users table
    session_id UUID, -- ID of the chat session associated with this log event, ideally references user_chat_sessions(session_id)
    event_type TEXT NOT NULL, -- Type of event being logged (e.g., 'user_interaction', 'model_feedback', 'system_alert')
    bot_affected_id TEXT, -- ID of the Tria bot instance or module related to this event, if applicable
    summary_text TEXT, -- A brief human-readable summary of the log event
    prompt_text TEXT, -- Full text of the prompt given by the user or system
    tria_response_text TEXT, -- Full text of Tria's response
    model_used TEXT, -- Identifier for the specific AI/ML model used for the response (e.g., 'gpt-4-turbo', 'claude-3-opus')
    feedback_score INTEGER, -- Optional user-provided feedback score (e.g., 1-5 stars)
    custom_data JSONB -- Flexible JSONB field for any additional structured data relevant to the log entry
);

-- Tria AZR Tasks table
CREATE TABLE IF NOT EXISTS tria_azr_tasks (
    task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    description_text TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    complexity_score FLOAT,
    generation_source TEXT,
    related_bot_id TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc')
);

-- Tria AZR Task Solutions table
CREATE TABLE IF NOT EXISTS tria_azr_task_solutions (
    solution_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tria_azr_tasks(task_id) ON DELETE CASCADE,
    solution_approach_description TEXT,
    solution_artifacts_json JSONB,
    outcome_summary TEXT,
    performance_metrics_json JSONB,
    verification_status TEXT DEFAULT 'unverified',
    human_reviewer_id TEXT,
    human_review_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc')
);

-- Tria Bot Configurations table
CREATE TABLE IF NOT EXISTS tria_bot_configurations (
    config_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bot_id TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    config_parameters_json JSONB NOT NULL,
    description TEXT,
    created_by TEXT,
    is_active BOOLEAN DEFAULT FALSE,
    previous_config_id UUID, -- Self-referential FK can be added with ALTER TABLE if needed
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
    UNIQUE (bot_id, version)
);

-- User Gestures table
CREATE TABLE IF NOT EXISTS user_gestures (
    gesture_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    gesture_name TEXT,
    recognized_gesture_type TEXT,
    landmark_data_3d_json JSONB, -- Could store array of landmarks
    tria_interpretation_json JSONB, -- Store InterpretedGestureModel as JSON
    source_modality TEXT,
    context_hologram_id UUID,
    custom_metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc')
);
-- Add FK for related_gesture_id in audiovisual_gestural_chunks if this table is created first
-- ALTER TABLE audiovisual_gestural_chunks ADD CONSTRAINT fk_related_gesture FOREIGN KEY (related_gesture_id) REFERENCES user_gestures(gesture_id);


-- User Holograms table
CREATE TABLE IF NOT EXISTS user_holograms (
    hologram_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    hologram_name TEXT,
    definition_json JSONB NOT NULL, -- Store HolographicSymbolModel or similar as JSON
    -- This could include type, position, orientation, scale, material, custom_data etc.
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc')
);
-- Add FK for related_hologram_id in audiovisual_gestural_chunks
-- ALTER TABLE audiovisual_gestural_chunks ADD CONSTRAINT fk_related_hologram FOREIGN KEY (related_hologram_id) REFERENCES user_holograms(hologram_id);

-- User Chat Sessions table
-- Stores information about individual user chat sessions with Tria, including timing, status, and preferences.
CREATE TABLE IF NOT EXISTS user_chat_sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- Unique identifier for the chat session (Primary Key)
    user_id TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE, -- Identifier of the user who owns this session, references users table
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'), -- Timestamp when the session was created (effectively the start_time)
    end_time TIMESTAMPTZ NULLABLE, -- Timestamp when the session officially ended (e.g., user explicitly closes session). NULL if ongoing.
    last_updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'), -- Timestamp of the last activity in the session (e.g., last message sent/received), used for tracking active/idle sessions
    model_preferences JSONB, -- JSONB field to store user-specific or session-specific model preferences (e.g., preferred AI model, temperature, persona)
    session_summary TEXT, -- Optional human-readable or AI-generated summary of the chat session's content or purpose
    custom_metadata_json JSONB -- Flexible JSONB field for any other custom metadata related to the session (e.g., client type, device info)
);

-- Chat History table
CREATE TABLE IF NOT EXISTS chat_history (
    message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES user_chat_sessions(session_id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(user_id) ON DELETE SET NULL, -- User might be deleted but chat history retained
    sender_type TEXT NOT NULL, -- e.g., 'user', 'tria_bot', 'system'
    message_content TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
    metadata_json JSONB -- e.g., for reactions, read status, message type (text, image_uri)
);

-- Tria Code Embeddings table
-- For MVP, storing embedding_vector as JSONB is acceptable.
-- For production with pgvector: embedding_vector VECTOR(DIMENSION_HERE)
CREATE TABLE IF NOT EXISTS tria_code_embeddings (
    embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash of the code snippet
    code_snippet TEXT NOT NULL,
    embedding_vector_json JSONB NOT NULL, -- For MVP; use VECTOR type for production with pgvector
    code_language TEXT NOT NULL,
    embedding_model_version TEXT NOT NULL,
    source_file_path TEXT,
    code_construct_type TEXT, -- e.g., 'function', 'class'
    dependencies_json JSONB,
    custom_metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc')
);
-- Example pgvector index (if using actual VECTOR type):
-- CREATE EXTENSION IF NOT EXISTS vector; -- Run once per database
-- CREATE INDEX ON tria_code_embeddings USING ivfflat (embedding_vector vector_l2_ops) WITH (lists = 100);

-- Tria Knowledge Base (example, if needed for MVP)
CREATE TABLE IF NOT EXISTS tria_knowledge_base (
    kb_entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_identifier TEXT UNIQUE NOT NULL, -- e.g., document URI, internal code module ID
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text', -- e.g., 'text', 'markdown', 'code_documentation'
    embedding_vector_json JSONB, -- For MVP; use VECTOR type for production
    embedding_model_version TEXT,
    tags TEXT[], -- Array of text tags for categorization
    custom_metadata_json JSONB,
    created_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc'),
    updated_at TIMESTAMPTZ DEFAULT (now() AT TIME ZONE 'utc')
);
-- Example pgvector index for knowledge base:
-- CREATE INDEX ON tria_knowledge_base USING hnsw (embedding_vector vector_cosine_ops);

-- Trigger function to update 'updated_at' timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now() AT TIME ZONE 'utc';
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply the trigger to tables that have an 'updated_at' column
-- Example for one table (repeat for others):
-- CREATE TRIGGER update_users_updated_at
-- BEFORE UPDATE ON users
-- FOR EACH ROW
-- EXECUTE FUNCTION update_updated_at_column();

-- Note: Applying triggers for all tables with updated_at:
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN (SELECT table_name FROM information_schema.columns WHERE column_name = 'updated_at' AND table_schema = 'public')
    LOOP
        EXECUTE format('CREATE TRIGGER trigger_update_updated_at_%s
                       BEFORE UPDATE ON %I
                       FOR EACH ROW
                       EXECUTE FUNCTION update_updated_at_column();', t_name, t_name);
    END LOOP;
END;
$$;

-- Initial data or enum types if necessary can be added here.
-- E.g., CREATE TYPE sender_type_enum AS ENUM ('user', 'tria_bot', 'system');
-- And then use sender_type_enum for chat_history.sender_type

-- Add indexes for frequently queried columns, especially foreign keys
CREATE INDEX IF NOT EXISTS idx_chunks_user_id ON audiovisual_gestural_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_azr_solutions_task_id ON tria_azr_task_solutions(task_id);
CREATE INDEX IF NOT EXISTS idx_gestures_user_id ON user_gestures(user_id);
CREATE INDEX IF NOT EXISTS idx_holograms_user_id ON user_holograms(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON user_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);

-- For JSONB columns that will be queried, consider GIN indexes:
-- CREATE INDEX IF NOT EXISTS idx_chunks_metadata ON audiovisual_gestural_chunks USING GIN (metadata_json);
-- CREATE INDEX IF NOT EXISTS idx_chunks_tria_features ON audiovisual_gestural_chunks USING GIN (tria_extracted_features_json);

-- Comments on pgvector:
-- To enable pgvector, the extension needs to be created in the database:
-- CREATE EXTENSION IF NOT EXISTS vector;
-- Then, vector columns would be defined as `embedding_vector VECTOR(DIM_SIZE)`
-- And specific vector indexes (HNSW, IVFFlat) would be created.
-- For MVP, using JSONB for `embedding_vector_json` is a simplification if direct pgvector setup is constrained.
-- The actual embedding generation and vector similarity search logic will be in the application code.
-- If JSONB is used, similarity search will be less efficient and done in application layer or with JSONB operators.

SELECT 'Schema creation script executed successfully.' AS result;
