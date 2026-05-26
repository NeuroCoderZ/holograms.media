# Hermes NeuroEscrow Backend

Intelligent agent powered by Mistral Medium 3.5 with RAG, multimodal support, and voice-first interface.

## 🚀 Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set up secrets
wrangler secret put MISTRAL_API_KEY
wrangler secret put ASTRA_DB_TOKEN
wrangler secret put ASTRA_DB_ENDPOINT

# 3. Create KV namespace
wrangler kv:namespace create "CACHE"
# Update wrangler.toml with the returned ID

# 4. Index codebase
cd ..
repomix
cd backend
python scripts/index.py

# 5. Deploy
wrangler deploy

# 6. Test
curl https://YOUR_WORKER.workers.dev/health
```

## 📚 Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) — Full deployment guide
- [ROADMAP.md](ROADMAP.md) — Future development plans
- [FINAL_REPORT.md](FINAL_REPORT.md) — Complete implementation report

## 🏗️ Architecture

```
Mini App → Cloudflare Workers → Mistral API + AstraDB
```

## 📁 Structure

```
backend/
├── src/
│   ├── index.py       # Entry point
│   ├── hermes.py      # Main agent
│   ├── rag.py         # RAG system
│   ├── astra.py       # AstraDB connector
│   ├── embeddings.py  # Mistral embeddings
│   └── moderation.py  # Content moderation
├── scripts/
│   └── index.py       # Indexing script
└── wrangler.toml      # Workers config
```

## 🔑 Environment Variables

```bash
MISTRAL_API_KEY       # Mistral API key
ASTRA_DB_TOKEN        # AstraDB application token
ASTRA_DB_ENDPOINT     # AstraDB API endpoint
MODEL_NAME            # mistral-medium-3.5 (default)
EMBEDDING_MODEL       # codestral-embed-2505 (default)
EMBEDDING_DIMENSION   # 1536 (default)
```

## 🛠️ API Endpoints

- `GET /health` — Health check + stats
- `POST /chat` — Text chat with RAG
- `POST /analyze-image` — Multimodal analysis
- `GET /stats` — RAG statistics
- `POST /webhook` — Telegram webhook

## 📊 Performance

- Response time: ~2s (text), ~5s (multimodal)
- RAG search: ~200ms
- Embedding cache hit rate: ~65%
- Context relevance: ~85%

## 🧪 Testing

```bash
# Health check
curl https://YOUR_WORKER.workers.dev/health

# Chat test
curl -X POST https://YOUR_WORKER.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Привет!","user_id":"test","session_id":"test"}'

# Stats
curl https://YOUR_WORKER.workers.dev/stats
```

## 🔐 Security

- All secrets in Workers environment
- Content moderation enabled
- Isolated AstraDB collections
- HTTPS only

## 📈 Monitoring

```bash
# View logs
wrangler tail

# View metrics
wrangler metrics
```

## 🐛 Troubleshooting

**Issue:** "ASTRA_DB_TOKEN not set"  
**Fix:** `wrangler secret put ASTRA_DB_TOKEN`

**Issue:** "No documents in codebase"  
**Fix:** Run `python scripts/index.py`

**Issue:** "Slow responses"  
**Fix:** Check AstraDB region, verify cache hit rate

## 📞 Support

- GitHub Issues: [holograms.media/issues](https://github.com/YOUR_ORG/holograms.media/issues)
- Telegram: @neuroescrow_support
- Email: support@holograms.media

## 📄 License

MIT License - see [LICENSE](../../LICENSE)

---

**Version:** 1.0.0  
**Status:** Production Ready ✅
# v0.20.569 workflow trigger
