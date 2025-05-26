-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    role VARCHAR(50) DEFAULT 'user' NOT NULL CHECK (role IN ('admin', 'core_developer', 'beta_tester', 'user')),
    last_login_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    user_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- Handled at application level
);

-- Table: user_chat_sessions
CREATE TABLE user_chat_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    session_title VARCHAR(255), -- User-defined or auto-generated
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL -- App level update
);
CREATE INDEX IF NOT EXISTS idx_user_chat_sessions_user_id ON user_chat_sessions(user_id);

-- Table: chat_history
-- Old indexes idx_chat_history_session_id and idx_chat_history_user_id are implicitly dropped
-- by removing the columns they depend on, or should be explicitly dropped before altering table.
-- For simplicity in a full script, we assume they are gone or will be handled during migration.
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    user_chat_session_id INTEGER REFERENCES user_chat_sessions(id) ON DELETE CASCADE NOT NULL,
    -- session_id VARCHAR(255), -- Removed
    -- user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, -- Removed
    role VARCHAR(50) CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
    message_content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);
CREATE INDEX IF NOT EXISTS idx_chat_history_user_chat_session_id ON chat_history(user_chat_session_id);

-- Table: audiovisual_gestural_chunks
CREATE TABLE audiovisual_gestural_chunks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL, -- Changed to NOT NULL and ON DELETE CASCADE
    session_id VARCHAR(255), -- Kept as per instruction, might refer to a recording session
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    audio_data_path VARCHAR(512),
    video_data_path VARCHAR(512),
    gesture_data JSONB,
    transcription_text TEXT,
    recognized_gestures JSONB,
    context_metadata JSONB,
    chunk_embedding VECTOR(1536)
);
CREATE INDEX IF NOT EXISTS idx_audiovisual_chunks_user_id ON audiovisual_gestural_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_audiovisual_chunks_session_id ON audiovisual_gestural_chunks(session_id); -- Kept existing index
CREATE INDEX IF NOT EXISTS idx_audiovisual_chunks_chunk_embedding ON audiovisual_gestural_chunks USING hnsw (chunk_embedding vector_l2_ops);

-- Table: user_gestures
CREATE TABLE user_gestures (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    gesture_name VARCHAR(255) NOT NULL,
    gesture_data_ref INTEGER REFERENCES audiovisual_gestural_chunks(id) ON DELETE SET NULL, -- Optional link
    gesture_definition JSONB NOT NULL, -- Simplified landmarks, sequence, or parameters
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL -- App level update
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_gestures_user_id_gesture_name ON user_gestures(user_id, gesture_name);
CREATE INDEX IF NOT EXISTS idx_user_gestures_user_id ON user_gestures(user_id);

-- Table: user_holograms
CREATE TABLE user_holograms (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    hologram_name VARCHAR(255) NOT NULL,
    hologram_state_data JSONB NOT NULL, -- Full state to reconstruct visualization/application state
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL -- App level update
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_holograms_user_id_hologram_name ON user_holograms(user_id, hologram_name);
CREATE INDEX IF NOT EXISTS idx_user_holograms_user_id ON user_holograms(user_id);

-- Table: user_prompt_versions
CREATE TABLE user_prompt_versions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
    prompt_title VARCHAR(255) NOT NULL,
    prompt_text TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    associated_hologram_id INTEGER REFERENCES user_holograms(id) ON DELETE SET NULL, -- Optional link
    metadata JSONB, -- e.g., LLM used, parameters
    CONSTRAINT unique_user_prompt_version UNIQUE (user_id, prompt_title, version_number)
);
CREATE INDEX IF NOT EXISTS idx_user_prompt_versions_user_id ON user_prompt_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prompt_versions_user_id_prompt_title ON user_prompt_versions(user_id, prompt_title);


-- Table: tria_knowledge_base
CREATE TABLE tria_knowledge_base (
    id SERIAL PRIMARY KEY,
    source_document_id VARCHAR(255),
    content_text TEXT NOT NULL,
    content_embedding VECTOR(1536),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tria_kb_content_embedding ON tria_knowledge_base USING hnsw (content_embedding vector_l2_ops);

-- Table: tria_memory_embeddings
CREATE TABLE tria_memory_embeddings (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(100), -- e.g., 'chat', 'chunk', 'document'
    source_id VARCHAR(255),   -- Can be integer or string
    embedding_vector VECTOR(1536),
    text_content TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_tria_mem_emb_vector ON tria_memory_embeddings USING hnsw (embedding_vector vector_l2_ops);

-- Table: application_logs
CREATE TABLE application_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(50) CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'DEBUG')) NOT NULL,
    source_component VARCHAR(255),
    message TEXT NOT NULL,
    details JSONB
);
CREATE INDEX IF NOT EXISTS idx_application_logs_level ON application_logs(level);
CREATE INDEX IF NOT EXISTS idx_application_logs_timestamp_desc ON application_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_application_logs_source_component ON application_logs(source_component); -- Added as per instruction point 9 review

-- Table: holograph_data
CREATE TABLE holograph_data (
    id SERIAL PRIMARY KEY,
    data_type VARCHAR(255),
    data_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: updated_at in users, user_chat_sessions, user_gestures, user_holograms
-- is intended to be handled at the application level.
-- If database-level automatic updates are required for any of these,
-- a trigger function would be needed for each table similar to the example below for users.
/*
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Example for one table:
CREATE TRIGGER update_user_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
*/
