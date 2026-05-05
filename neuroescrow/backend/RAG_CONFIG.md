# NeuroEscrow RAG Configuration

## Environment Variables

```bash
# Mistral API (required)
MISTRAL_API_KEY=your_mistral_api_key_here

# AstraDB (required)
ASTRA_DB_TOKEN=your_astra_token_here
ASTRA_DB_ENDPOINT=your_astra_endpoint_here

# Model Configuration
MISTRAL_MODEL=mistral-medium-3.5
EMBEDDING_MODEL=codestral-embed-2505
VECTOR_DIMENSION=1536

# Collection Names
CODEBASE_COLLECTION=neuroescrow_codebase
MEMORY_COLLECTION=hermes_memory
```

## Architecture

### RAG System Components

1. **Embeddings** (`backend/memory/embeddings.py`)
   - Mistral API client for codestral-embed-2505
   - 1536-dimensional vectors
   - Batch processing (32 texts per request)

2. **Memory Core** (`backend/memory/core.py`)
   - AstraDB integration (shared with holograms.media)
   - Vector search with cosine similarity
   - Chunk management (add, search, delete)

3. **Indexing Script** (`backend/scripts/index_codebase.py`)
   - Parses repomix-output.md
   - Chunks files (4000 chars, 500 overlap)
   - Generates embeddings and stores in AstraDB

### Data Flow

```
repomix-output.md
    ↓
parse_repomix()
    ↓
chunk_file() → chunks (4000 chars each)
    ↓
MistralEmbeddingClient.embed_batch()
    ↓
HermesMemory.add_chunk()
    ↓
AstraDB (neuroescrow_codebase collection)
```

### Query Flow

```
User Query
    ↓
MistralEmbeddingClient.embed(query)
    ↓
HermesMemory.search_codebase(query_vector)
    ↓
AstraDB vector search (top 5 results)
    ↓
Return relevant code chunks to Hermes
```

## Usage

### 1. Generate RepoMix Context

```bash
cd neuroescrow
npx repomix --config repomix.config.json
```

### 2. Index Codebase

```bash
python backend/scripts/index_codebase.py \
  --repomix repomix-output.md \
  --api-key $MISTRAL_API_KEY \
  --astra-token $ASTRA_DB_TOKEN \
  --astra-endpoint $ASTRA_DB_ENDPOINT
```

### 3. Query from Hermes

```python
from backend.memory.core import HermesMemory
from backend.memory.embeddings import MistralEmbeddingClient

# Initialize
embed_client = MistralEmbeddingClient(api_key=MISTRAL_API_KEY)
memory = HermesMemory(astra_client, embed_client)

# Search
results = await memory.search_codebase("how does chat interface work?", limit=5)

for r in results:
    print(f"File: {r['filename']}")
    print(f"Content: {r['content'][:200]}...")
```

## Optimization Recommendations

### 1. Chunk Size Optimization
- **Current:** 4000 chars with 500 overlap
- **Recommendation:** Test 3000 chars with 300 overlap for better granularity
- **Reason:** Smaller chunks = more precise retrieval

### 2. Embedding Caching
- Cache embeddings for frequently queried terms
- Use Redis or in-memory cache
- Reduces API calls to Mistral

### 3. Hybrid Search
- Combine vector search with keyword search
- Use BM25 for exact matches
- Improves retrieval accuracy

### 4. Reranking
- Add cross-encoder reranking after initial retrieval
- Use Mistral Medium 3.5 for relevance scoring
- Improves top-k results quality

### 5. Metadata Filtering
- Add filters: language, file type, recency
- Pre-filter before vector search
- Reduces search space

## Performance Metrics

### Current Setup
- **Vector Dimension:** 1536
- **Chunk Size:** 4000 chars
- **Overlap:** 500 chars
- **Batch Size:** 32 texts
- **Search Limit:** 5 results

### Expected Performance
- **Indexing Speed:** ~10 chunks/sec
- **Query Latency:** <500ms
- **Embedding Cost:** $0.001 per 1K tokens
- **Storage:** ~2KB per chunk

## Integration with Hermes

### Backend Integration (Python)

```python
# In hermes_agent.py
from neuroescrow.backend.memory.core import HermesMemory

class HermesAgent:
    def __init__(self):
        self.memory = HermesMemory(astra_client, embed_client)
    
    async def answer_with_context(self, query: str):
        # Get relevant code chunks
        context = await self.memory.search_codebase(query, limit=5)
        
        # Build prompt with context
        context_text = "\n\n".join([
            f"File: {c['filename']}\n{c['content']}"
            for c in context
        ])
        
        prompt = f"Context:\n{context_text}\n\nQuestion: {query}"
        
        # Query Mistral Medium 3.5
        response = await self.llm.chat(prompt)
        return response
```

### Frontend Integration (JavaScript)

```javascript
// In app.js
async sendQueryToHermes(query) {
    const response = await telegram.sendData({
        action: 'hermes_query',
        query: query,
        use_rag: true
    });
    
    // Hermes will use RAG context automatically
    this.addChatMessage('hermes', response.text);
}
```

## Security Considerations

1. **API Key Protection**
   - Store in environment variables
   - Never commit to git
   - Use secrets manager in production

2. **Content Sanitization**
   - Remove sensitive data before indexing
   - Use .repomixignore to exclude secrets
   - Apply security tier filtering

3. **Access Control**
   - RAG access only for authenticated users
   - Rate limiting on queries
   - Audit logging for all searches

## Troubleshooting

### Issue: Embeddings fail
**Solution:** Check Mistral API key and quota

### Issue: AstraDB connection timeout
**Solution:** Verify endpoint and token, check network

### Issue: Poor search results
**Solution:** Reindex with smaller chunks, add metadata filters

### Issue: High latency
**Solution:** Enable caching, reduce search limit, use batch queries

## Next Steps

1. ✅ Create RAG infrastructure
2. ⏳ Integrate with AstraDB (replace mock)
3. ⏳ Add caching layer
4. ⏳ Implement reranking
5. ⏳ Add monitoring and metrics
6. ⏳ Deploy to production

---

**Last Updated:** 2026-05-04  
**Version:** 1.0.0  
**Status:** Development
