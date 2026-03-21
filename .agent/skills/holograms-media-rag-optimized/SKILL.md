---
name: holograms-media-rag-optimized
description: "Advanced RAG strategies for AstraDB to avoid SHRED_DOC_LIMIT_VIOLATION and ensure high recall for Tria knowledge."
---

# Optimized RAG for AstraDB

AstraDB has a strict `SHRED_DOC_LIMIT` (approx 8000-16000 bytes depending on metadata). To solve the 403/500 errors during ingestion:

## Chunking Strategy

Use `RecursiveCharacterTextSplitter` with balanced settings for Cyrillic (which consumes more bytes than ASCII).

```python
CHUNK_SIZE = 6000  # Safe limit for AstraDB including metadata
CHUNK_OVERLAP = 800 # High overlap for context preservation
```

## Vector Search (AstraDB)

Use `vector-search-powered` collections. Ensure keyspace is explicitly set.

```python
# collection_creation.py
db.create_collection(
    "tria_knowledge", 
    dimension=1024, # Match Mistral/Gemini embedding dim
    metric="cosine",
    check_exists=False # Prevent race conditions
)
```

## Anti-Patterns
- **Large Metadata**: Avoid storing massive JSON objects in the `metadata` field. It counts towards the document size limit.
- **Missing Sync**: Always add a 5s delay after `drop_collection` before `create_collection` to let the distributed index clear.
