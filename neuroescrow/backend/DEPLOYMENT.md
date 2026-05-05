# Hermes NeuroEscrow - Production Deployment Guide

## 🎯 Overview

**Hermes** — интеллектуальный агент-посредник для NeuroEscrow, работающий на Mistral Medium 3.5 (128B, 256k context) с RAG-системой на AstraDB.

### Ключевые возможности
- 🎙️ Voice-first интерфейс (Telegram Mini App)
- 💬 Полноценный чат с текстом и медиа
- 🧠 RAG: глубокое понимание кодовой базы
- 👁️ Multimodal: анализ фото/видео
- 🛡️ Модерация контента
- 💾 Долгосрочная память (session + episodic)
- 🔄 3 персоны: hermes / client / creator

---

## 📦 Architecture

```
Telegram Mini App (Frontend)
         ↓
Cloudflare Workers (Python Backend)
         ↓
    ┌────┴────┐
    ↓         ↓
Mistral API  AstraDB
(Medium 3.5) (Vector DB)
(Embeddings)
```

### Tech Stack
- **LLM**: Mistral Medium 3.5 (256k context, multimodal)
- **Embeddings**: codestral-embed-2505 (1536d)
- **Vector DB**: AstraDB Serverless (isolated collections)
- **Runtime**: Cloudflare Workers (Python)
- **Cache**: KV (embedding cache, 7 days TTL)
- **Frontend**: Vanilla JS + Telegram WebApp API

---

## 🚀 Quick Start

### 1. Prerequisites

```bash
# Install dependencies
pip install -r backend/requirements.txt

# Install Wrangler CLI
npm install -g wrangler
```

### 2. Environment Setup

Create secrets in Cloudflare Workers:

```bash
cd backend

# Mistral API key
wrangler secret put MISTRAL_API_KEY

# AstraDB credentials
wrangler secret put ASTRA_DB_TOKEN
wrangler secret put ASTRA_DB_ENDPOINT

# Telegram bot token (optional, for webhooks)
wrangler secret put TELEGRAM_BOT_TOKEN
```

### 3. Create KV Namespace

```bash
# Create KV for embedding cache
wrangler kv:namespace create "CACHE"

# Update wrangler.toml with the returned ID
```

### 4. Index Codebase

```bash
# Generate clean context
cd ..
repomix

# Index into AstraDB
cd backend
python scripts/index.py
```

Expected output:
```
🚀 Starting codebase indexing...
📄 Loaded repomix-output.md (73,039 chars)
🔍 Chunking and indexing files...
✅ Indexing complete!
   Files indexed: 7
   Chunks created: 42
```

### 5. Deploy to Cloudflare

```bash
cd backend
wrangler deploy
```

### 6. Test Deployment

```bash
# Health check
curl https://neuroescrow-hermes.YOUR_SUBDOMAIN.workers.dev/health

# Test chat
curl -X POST https://neuroescrow-hermes.YOUR_SUBDOMAIN.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Как работает голосовой интерфейс?",
    "user_id": "test_user",
    "session_id": "test_session"
  }'
```

---

## 🔧 Configuration

### wrangler.toml

```toml
name = "neuroescrow-hermes"
main = "src/index.py"
compatibility_date = "2026-05-01"

[vars]
ENVIRONMENT = "production"
MODEL_NAME = "mistral-medium-3.5"
EMBEDDING_MODEL = "codestral-embed-2505"
EMBEDDING_DIMENSION = 1536

[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_ID"
```

### Chunking Parameters (src/rag.py)

```python
self.chunk_size = 2000      # ~500 tokens
self.chunk_overlap = 700    # ~35% overlap
```

Оптимизировано для codestral-embed-2505 (май 2026).

---

## 📊 API Endpoints

### GET /health
Health check + RAG stats

**Response:**
```json
{
  "status": "healthy",
  "service": "hermes-neuroescrow",
  "version": "1.0.0",
  "stats": {
    "codebase": {"document_count": 42},
    "memory": {"document_count": 128}
  }
}
```

### POST /chat
Main chat endpoint

**Request:**
```json
{
  "message": "Объясни архитектуру NeuroEscrow",
  "user_id": "tg_123456",
  "session_id": "tg_123456",
  "persona": "hermes"
}
```

**Response:**
```json
{
  "response": "NeuroEscrow использует...",
  "blocked": false,
  "context_used": true,
  "tokens_used": 1234
}
```

### POST /analyze-image
Multimodal analysis

**Request:**
```json
{
  "image_url": "data:image/jpeg;base64,...",
  "prompt": "Проанализируй этот контракт",
  "user_id": "tg_123456",
  "session_id": "tg_123456"
}
```

### GET /stats
RAG statistics

**Response:**
```json
{
  "codebase": {
    "collection": "neuroescrow_codebase",
    "document_count": 42,
    "status": "healthy"
  },
  "memory": {
    "collection": "neuroescrow_memory",
    "document_count": 128,
    "status": "healthy"
  }
}
```

---

## 🧪 Testing Plan

### 1. RAG Quality Tests

```bash
# Test codebase search
curl -X POST .../chat -d '{
  "message": "Как работает voice recording?",
  "user_id": "test",
  "session_id": "test"
}'

# Expected: Должен найти код из app.js и объяснить механизм
```

### 2. Multimodal Tests

```bash
# Upload test image
curl -X POST .../analyze-image -d '{
  "image_url": "https://example.com/contract.jpg",
  "prompt": "Что на этом изображении?",
  "user_id": "test",
  "session_id": "test"
}'

# Expected: Детальное описание изображения
```

### 3. Moderation Tests

```bash
# Test spam detection
curl -X POST .../chat -d '{
  "message": "КУПИ БИТКОИН ЗДЕСЬ СЕЙЧАС!!!",
  "user_id": "test",
  "session_id": "test"
}'

# Expected: {"blocked": true, "reason": "Обнаружен запрещённый контент"}
```

### 4. Memory Tests

```bash
# First message
curl -X POST .../chat -d '{
  "message": "Меня зовут Алексей, я разработчик",
  "user_id": "user_1",
  "session_id": "session_1"
}'

# Second message (should remember)
curl -X POST .../chat -d '{
  "message": "Как меня зовут?",
  "user_id": "user_1",
  "session_id": "session_1"
}'

# Expected: "Вас зовут Алексей"
```

### 5. Load Tests

```bash
# Use Apache Bench
ab -n 100 -c 10 -p chat_payload.json -T application/json \
  https://neuroescrow-hermes.YOUR_SUBDOMAIN.workers.dev/chat
```

---

## 📈 Monitoring

### Key Metrics

1. **Response Time**
   - Target: < 2s for text chat
   - Target: < 5s for multimodal

2. **RAG Quality**
   - Context relevance: > 80%
   - Answer accuracy: > 90%

3. **Moderation Accuracy**
   - False positives: < 5%
   - False negatives: < 1%

4. **Cache Hit Rate**
   - Embedding cache: > 60%

### Cloudflare Analytics

```bash
# View logs
wrangler tail

# View metrics
wrangler metrics
```

---

## 🔐 Security

### Secrets Management
- ✅ All secrets in Cloudflare Workers (not in code)
- ✅ No credentials in repomix-output.md
- ✅ Content moderation before processing

### Data Isolation
- ✅ Separate collections: `neuroescrow_codebase` / `neuroescrow_memory`
- ✅ No cross-contamination with main holograms.media

### Rate Limiting
```python
# TODO: Implement in index.py
# - Max 10 requests/minute per user
# - Max 100 requests/hour per user
```

---

## 🐛 Troubleshooting

### Issue: "ASTRA_DB_TOKEN not set"
**Solution:** Run `wrangler secret put ASTRA_DB_TOKEN`

### Issue: "No documents in codebase collection"
**Solution:** Run indexing script: `python backend/scripts/index.py`

### Issue: "Embedding cache not working"
**Solution:** Check KV namespace binding in wrangler.toml

### Issue: "Slow response times"
**Solution:** 
- Check AstraDB region (should be close to Workers)
- Verify embedding cache hit rate
- Reduce chunk_size if needed

---

## 📚 Next Steps

See [ROADMAP.md](ROADMAP.md) for future development plans.

---

## 📞 Support

- GitHub Issues: [holograms.media/issues](https://github.com/YOUR_ORG/holograms.media/issues)
- Telegram: @neuroescrow_support
- Email: support@holograms.media
