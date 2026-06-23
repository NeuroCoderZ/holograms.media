---
name: holograms-media-advanced
description: "Advanced architectural patterns for Tria (Holograms Media). Covers Streaming LLM (SSE) and AstraDB RAG Optimization."
---

# Advanced Tria Architecture (March 2026)

This skill synthesizes global best practices for high-performance AI integration in the Holograms Media project.

> [!IMPORTANT]
> **Embedding Model Lock**: Всегда использовать `gemini-embedding-2` (dimension 3072).
> НЕ использовать `text-embedding-004/005` или любые другие устаревшие ID.

## 1. LLM Streaming Implementation (SSE)

### Backend (FastAPI)
Use `StreamingResponse` for character-by-character output. Avoid waiting for the full response to minimize Time To First Token (TTFT).

**Key Rules:**
- Set `media_type="text/event-stream"`.
- Use `data: ` prefix for every chunk.
- Terminate with `data: [DONE]`.

```python
async def stream_generator(it):
    for token in it:
        yield f"data: {json.dumps({'token': token})}\n\n"
    yield "data: [DONE]\n\n"
```

### Frontend (JavaScript)
Consumption via `fetch` and `ReadableStream`.

```javascript
const reader = response.body.getReader();
const decoder = new TextDecoder();
while (true) {
    const {done, value} = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    // Parse SSE lines...
}
```

## 2. AstraDB RAG Mastery (Avoiding Shred Limits)

### Embedding Model
- **ID**: `gemini-embedding-2` (ЗАФИКСИРОВАН)
- **Dimension**: 3072 (нативная, Matryoshka)
- **Мультимодальность**: текст, код, медиа — единое пространство

### Chunking Protocol
AstraDB restricts document size. Large Cyrillic texts or heavy metadata cause 403/500 errors.

- **Safe Chunk Size**: 8000 characters (Gemini Embedding 2 handles larger context).
- **Overlap**: 500 characters for context preservation.
- **Metadata**: Stick to minimal IDs and source paths.

### Ingestion Pipeline
- **Sync Delay**: 5 seconds after `delete_many` or `drop_collection` is MANDATORY for distributed indexing stability.
- **Batching**: Use `insert_many` with `ordered=False` for maximum throughput.
- **Quota Cap**: MAX_CHUNKS_PER_RUN = 200 (Free Tier 2026).

## 3. Deployment & Health Checks (Koyeb/Cloudflare)
- **Port**: Always use port 8000.
- **Healthz**: `/healthz` must return 200 OK without blocking on external DB timeouts during startup.
