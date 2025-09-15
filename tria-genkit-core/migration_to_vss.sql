.load sqlite-vss
CREATE VIRTUAL TABLE IF NOT EXISTS vss_memory USING vss0(
  embedding(3072),  -- Размерность для gemini-embedding-001
  metadata TEXT
);
INSERT INTO vss_memory(rowid, embedding, metadata)
SELECT
  id,
  embedding,
  json_object(
    'source', source,
    'timestamp', timestamp,
    'semantic_tags', semantic_tags,
    'text_preview', substr(text, 1, 100)
  )
FROM holographic_memory
WHERE embedding IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_timestamp ON holographic_memory(timestamp);
CREATE INDEX IF NOT EXISTS idx_source ON holographic_memory(source);