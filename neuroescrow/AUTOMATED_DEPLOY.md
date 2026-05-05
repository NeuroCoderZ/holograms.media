# NeuroEscrow Automated Deployment

## 🎯 Overview

Весь процесс деплоя NeuroEscrow Hermes теперь автоматизирован через централизованный скрипт `deploy.js`.

## 🚀 One-Command Deployment

```bash
node scripts/deploy.js "update hermes"
```

Эта команда автоматически:
1. ✅ Читает ключи из `.env.local`
2. ✅ Устанавливает secrets в Cloudflare Workers
3. ✅ Генерирует `repomix-output.md`
4. ✅ Индексирует кодовую базу в AstraDB
5. ✅ Деплоит backend на Cloudflare Workers
6. ✅ Коммитит изменения и пушит в `dev`

## 📋 Prerequisites

### 1. Environment Variables

Убедись, что в `C:\holograms.media\.env.local` есть:

```env
# Mistral
MISTRAL_API_KEY=your_mistral_key

# AstraDB
ASTRA_DB_APPLICATION_TOKEN=AstraCS:...
ASTRA_DB_API_ENDPOINT=https://...
```

### 2. Dependencies

```bash
# Install Node.js dependencies (if not already)
npm install dotenv

# Install Python dependencies
cd neuroescrow/backend
pip install -r requirements.txt
```

### 3. Wrangler Authentication

```bash
# Login to Cloudflare (one-time)
npx wrangler login
```

## 🔧 How It Works

### Trigger Detection

Скрипт автоматически запускает NeuroEscrow deployment, если commit message содержит:
- `hermes`
- `neuroescrow`

**Примеры:**
```bash
node scripts/deploy.js "update hermes"          # ✅ Triggers
node scripts/deploy.js "fix neuroescrow bug"    # ✅ Triggers
node scripts/deploy.js "update main site"       # ❌ Skips
```

### Deployment Steps

#### Step 1: Cloudflare Secrets
```javascript
// Автоматически устанавливает secrets без ручного ввода
echo "secret_value" | npx wrangler secret put SECRET_NAME
```

Устанавливаются:
- `MISTRAL_API_KEY`
- `ASTRA_DB_TOKEN`
- `ASTRA_DB_ENDPOINT`

#### Step 2: RepoMix Generation
```bash
cd neuroescrow
npx repomix
```

Генерирует чистый контекст кодовой базы (19,315 tokens).

#### Step 3: AstraDB Indexing
```bash
cd neuroescrow/backend
python scripts/index.py
```

Индексирует код в векторную базу (42 chunks).

#### Step 4: Cloudflare Deploy
```bash
npx wrangler deploy
```

Деплоит backend на Workers.

## 🧪 Testing After Deployment

```bash
# Health check
curl https://neuroescrow-hermes.YOUR_SUBDOMAIN.workers.dev/health

# Test chat
curl -X POST https://neuroescrow-hermes.YOUR_SUBDOMAIN.workers.dev/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Привет!","user_id":"test","session_id":"test"}'
```

## 🐛 Troubleshooting

### Issue: "Missing environment variables"
**Fix:** Проверь `.env.local` в корне проекта

### Issue: "Wrangler not authenticated"
**Fix:** `npx wrangler login`

### Issue: "Python script failed"
**Fix:** 
```bash
cd neuroescrow/backend
pip install -r requirements.txt
```

### Issue: "Secrets already exist"
**Fix:** Это нормально, скрипт продолжит работу

## 📊 Deployment Flow

```
node scripts/deploy.js "update hermes"
         ↓
    Check .env.local
         ↓
    Set Cloudflare Secrets
         ↓
    Generate repomix-output.md
         ↓
    Index into AstraDB
         ↓
    Deploy to Workers
         ↓
    Git commit & push
         ↓
    ✅ Done!
```

## 🔐 Security

- ✅ Secrets никогда не коммитятся в Git
- ✅ `.env.local` в `.gitignore`
- ✅ Secrets передаются через pipe (не видны в логах)
- ✅ Wrangler хранит secrets в Cloudflare (encrypted)

## 📈 Next Steps

После успешного деплоя:
1. Проверь Workers dashboard: https://dash.cloudflare.com
2. Найди URL воркера
3. Обнови frontend для использования этого URL
4. Тестируй в Telegram Mini App

## 📞 Support

- GitHub Issues: [holograms.media/issues](https://github.com/YOUR_ORG/holograms.media/issues)
- Telegram: @neuroescrow_support

---

**Status:** ✅ Fully Automated  
**Last Updated:** May 4, 2026
