# NeuroEscrow Hermes - Quick Deploy

## ⚡ One Command

```bash
node scripts/deploy.js "update hermes"
```

## ✅ Prerequisites Checklist

- [ ] `.env.local` содержит `MISTRAL_API_KEY`
- [ ] `.env.local` содержит `ASTRA_DB_APPLICATION_TOKEN`
- [ ] `.env.local` содержит `ASTRA_DB_API_ENDPOINT`
- [ ] `npx wrangler login` выполнен
- [ ] `pip install -r neuroescrow/backend/requirements.txt` выполнен

## 📦 What Happens

1. Reads secrets from `.env.local`
2. Sets Cloudflare Workers secrets
3. Generates `repomix-output.md` (19k tokens)
4. Indexes codebase into AstraDB (42 chunks)
5. Deploys to Cloudflare Workers
6. Commits & pushes to `dev`

## 🧪 Test

```bash
curl https://YOUR_WORKER.workers.dev/health
```

## 🐛 Common Issues

| Issue | Fix |
|-------|-----|
| Missing env vars | Check `.env.local` |
| Wrangler auth | `npx wrangler login` |
| Python deps | `pip install -r requirements.txt` |

## 📚 Full Docs

- [AUTOMATED_DEPLOY.md](AUTOMATED_DEPLOY.md) — Detailed guide
- [backend/DEPLOYMENT.md](backend/DEPLOYMENT.md) — Manual deployment
- [backend/ROADMAP.md](backend/ROADMAP.md) — Future plans

---

**Status:** ✅ Ready  
**Time:** ~2-3 minutes
