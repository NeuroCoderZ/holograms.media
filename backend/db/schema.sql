-- Enable vector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Table: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- Handled at application level
);

-- Table: chat_history
CREATE TABLE chat_history (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    role VARCHAR(50) CHECK (role IN ('user', 'assistant', 'system')) NOT NULL,
    message_content TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

CREATE INDEX idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX idx_chat_history_user_id ON chat_history(user_id);

-- Table: audiovisual_gestural_chunks
CREATE TABLE audiovisual_gestural_chunks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    audio_data_path VARCHAR(512),
    video_data_path VARCHAR(512),
    gesture_data JSONB,
    transcription_text TEXT,
    recognized_gestures JSONB,
    context_metadata JSONB,
    chunk_embedding VECTOR(1536)
);

CREATE INDEX idx_audiovisual_chunks_session_id ON audiovisual_gestural_chunks(session_id);
CREATE INDEX idx_audiovisual_chunks_user_id ON audiovisual_gestural_chunks(user_id);
-- Example HNSW index for chunk_embedding (syntax may vary based on pgvector version)
-- CREATE INDEX ON audiovisual_gestural_chunks USING hnsw (chunk_embedding vector_l2_ops);

-- Table: tria_knowledge_base
CREATE TABLE tria_knowledge_base (
    id SERIAL PRIMARY KEY,
    source_document_id VARCHAR(255),
    content_text TEXT NOT NULL,
    content_embedding VECTOR(1536),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Example IVFFlat index for content_embedding (syntax may vary based on pgvector version)
-- CREATE INDEX ON tria_knowledge_base USING ivfflat (content_embedding vector_l2_ops) WITH (lists = 100);

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

-- Example HNSW index for embedding_vector (syntax may vary based on pgvector version)
-- CREATE INDEX ON tria_memory_embeddings USING hnsw (embedding_vector vector_l2_ops);

-- Table: application_logs
CREATE TABLE application_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(50) CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'DEBUG')) NOT NULL,
    source_component VARCHAR(255),
    message TEXT NOT NULL,
    details JSONB
);

-- Table: holograph_data
CREATE TABLE holograph_data (
    id SERIAL PRIMARY KEY,
    data_type VARCHAR(255),
    data_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: updated_at in the users table is intended to be handled at the application level.
-- If database-level automatic updates are required, a trigger function would be needed:
/*
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
*/
