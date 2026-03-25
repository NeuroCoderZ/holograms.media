---
name: holograms-media-rag-optimized
description: "Advanced RAG strategies for AstraDB with Gemini Embedding 2 (gemini-embedding-2-preview). Dimension 3072."
---

# Optimized RAG for AstraDB (Gemini Embedding 2)

> [!IMPORTANT]
> **Модель эмбеддингов: `gemini-embedding-2-preview`** (ID зафиксирован). Размерность: **3072**.
> НЕ использовать `text-embedding-004`, `text-embedding-005` или любые другие устаревшие модели.

AstraDB has a strict `SHRED_DOC_LIMIT` (approx 8000-16000 bytes depending on metadata). To solve the 403/500 errors during ingestion:

## Chunking Strategy

Use balanced settings for Cyrillic (which consumes more bytes than ASCII).

```python
CHUNK_SIZE = 8000  # Gemini Embedding 2 handles larger context
CHUNK_OVERLAP = 500 # Context preservation
OUTPUT_DIMENSIONALITY = 3072  # Нативная размерность gemini-embedding-2-preview
```

## Vector Search (AstraDB)

Use `vector-search-powered` collections. Ensure keyspace is explicitly set.

```python
# collection_creation.py
db.create_collection(
    "tria_knowledge_gemini", 
    dimension=3072, # Gemini Embedding 2 native dimension
    metric="cosine",
    check_exists=False
)
```

## Embedding Service

```python
# ЕДИНСТВЕННО ВЕРНЫЙ ID модели
self.model = "gemini-embedding-2-preview"

response = client.models.embed_content(
    model="gemini-embedding-2-preview",
    contents=text,
    config=types.EmbedContentConfig(
        task_type="RETRIEVAL_DOCUMENT",
        output_dimensionality=3072
    )
)
```

## Anti-Patterns
- **Устаревшие модели**: НИКОГДА не использовать `text-embedding-004` или `text-embedding-005`. Только `gemini-embedding-2-preview`.
- **Large Metadata**: Avoid storing massive JSON objects in the `metadata` field. It counts towards the document size limit.
- **Missing Sync**: Always add a 5s delay after `drop_collection` before `create_collection` to let the distributed index clear.
