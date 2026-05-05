# NeuroEscrow Hermes - Complete Setup Guide

## 🎯 Цель

Подготовить всё для работы команды `node scripts/deploy.js "update hermes"`

---

## ✅ Checklist

### 1. Environment Variables

Проверь, что в `C:\holograms.media\.env.local` есть:

```env
# Mistral
MISTRAL_API_KEY=MISTRAL_API_KEY_REDACTED

# AstraDB
ASTRA_DB_APPLICATION_TOKEN=AstraCS:JMXwJgBxjoOXZyRXWriBIBPu:...
ASTRA_DB_API_ENDPOINT=https://403a15dc-85a4-451f-a789-df997722a23c-us-east-2.apps.astra.datastax.com
```

✅ **Статус:** Уже есть в `.env.local`

### 2. Node.js Dependencies

```bash
# В корне проекта
npm install dotenv
```

✅ **Выполни это сейчас**

### 3. Python Dependencies

```bash
cd neuroescrow\backend
pip install astrapy mistralai pydantic httpx python-telegram-bot python-dotenv
```

✅ **Выполни это сейчас**

### 4. Wrangler Authentication

```bash
npx wrangler login
```

Откроется браузер → авторизуйся в Cloudflare

✅ **Выполни это один раз**

### 5. Create KV Namespace

```bash
cd neuroescrow\backend
npx wrangler kv:namespace create "CACHE"
```

Скопируй ID из вывода и обнови `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "YOUR_KV_ID_HERE"  # ← вставь сюда
```

✅ **Выполни это один раз**

### 6. Initial Indexing

```bash
# Генерируем контекст
cd neuroescrow
npx repomix

# Первичная индексация (полная)
cd backend
python scripts\index.py --full
```

✅ **Выполни это один раз**

---

## 🚀 После Setup

### Автоматический Deploy

```bash
node scripts/deploy.js "update hermes"
```

Это автоматически:
1. Читает ключи из `.env.local`
2. Устанавливает secrets в Cloudflare
3. Генерирует `repomix-output.md`
4. **Инкрементально** обновляет только изменённые файлы
5. Деплоит на Workers
6. Коммитит и пушит

### Быстрое Обновление Контекста (без деплоя)

**Windows:**
```bash
scripts\update-hermes.bat
```

**Python:**
```bash
cd neuroescrow\backend
python scripts\quick_update.py
```

Это:
1. Генерирует свежий `repomix-output.md`
2. **Инкрементально** обновляет только изменённые файлы в AstraDB
3. Гермес получает свежий контекст

---

## 🔧 Инкрементальное Обновление

### Как Работает

**Старый способ (медленно):**
```python
# Удаляет ВСЕ embeddings
# Переиндексирует ВСЕ файлы
# Время: ~5-10 минут
```

**Новый способ (быстро):**
```python
# Вычисляет hash каждого файла
# Сравнивает с кэшем (.index_cache.json)
# Обновляет только изменённые файлы
# Время: ~30 секунд
```

### Пример

```
Файлы в проекте: 7
Изменённые: 2 (app.js, hermes.py)
Неизменённые: 5

Действия:
1. Удалить старые chunks для app.js и hermes.py
2. Переиндексировать только эти 2 файла
3. Обновить кэш

Результат: 10x быстрее!
```

### Принудительная Полная Индексация

Если нужно переиндексировать всё:

```bash
cd neuroescrow\backend
python scripts\index_incremental.py --full
```

---

## 📊 Проверка

### 1. Health Check

```bash
curl https://neuroescrow-hermes.YOUR_SUBDOMAIN.workers.dev/health
```

Ожидаемый ответ:
```json
{
  "status": "healthy",
  "service": "hermes-neuroescrow",
  "version": "1.0.0",
  "stats": {
    "codebase": {"document_count": 42},
    "memory": {"document_count": 0}
  }
}
```

### 2. Chat Test

```bash
curl -X POST https://neuroescrow-hermes.YOUR_SUBDOMAIN.workers.dev/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Привет, Гермес!\",\"user_id\":\"test\",\"session_id\":\"test\"}"
```

### 3. RAG Test

```bash
curl -X POST https://neuroescrow-hermes.YOUR_SUBDOMAIN.workers.dev/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"message\":\"Как работает voice recording?\",\"user_id\":\"test\",\"session_id\":\"test\"}"
```

Должен найти код из `app.js` и объяснить механизм.

---

## 🐛 Troubleshooting

### Issue: "Missing environment variables"
```bash
# Проверь .env.local
type C:\holograms.media\.env.local | findstr MISTRAL
type C:\holograms.media\.env.local | findstr ASTRA
```

### Issue: "Wrangler not authenticated"
```bash
npx wrangler whoami
# Если ошибка:
npx wrangler login
```

### Issue: "Python module not found"
```bash
cd neuroescrow\backend
pip install -r requirements.txt
```

### Issue: "No files to update"
```bash
# Это нормально! Значит всё актуально
# Если нужно принудительно переиндексировать:
python scripts\index_incremental.py --full
```

---

## 📁 Созданные Файлы

### Новые Скрипты
- ✅ `backend/scripts/index_incremental.py` — инкрементальная индексация
- ✅ `backend/scripts/quick_update.py` — быстрое обновление контекста
- ✅ `scripts/update-hermes.bat` — Windows batch для одной команды

### Обновлённые Файлы
- ✅ `scripts/deploy.js` — добавлена функция `deployNeuroEscrow()`
- ✅ `backend/scripts/index.py` — читает `.env.local`
- ✅ `backend/requirements.txt` — добавлен `python-dotenv`

### Документация
- ✅ `AUTOMATED_DEPLOY.md` — полное руководство
- ✅ `QUICK_DEPLOY.md` — quick reference
- ✅ `SECURITY.md` — защита от Agent Warfare
- ✅ `SETUP.md` — этот файл

---

## 🎯 Следующие Шаги

1. **Выполни Setup** (пункты 2-6 выше)
2. **Протестируй:** `node scripts/deploy.js "update hermes"`
3. **Проверь:** Health check + Chat test
4. **Используй:** `scripts\update-hermes.bat` для быстрых обновлений

---

## 🔐 Безопасность

См. [SECURITY.md](SECURITY.md) для:
- Защита от prompt injection
- RAG poisoning prevention
- Agent warfare defense
- Incident response plan

---

## 📞 Support

- GitHub Issues: [holograms.media/issues](https://github.com/YOUR_ORG/holograms.media/issues)
- Telegram: @neuroescrow_support
- Email: support@holograms.media

---

**Status:** ✅ Ready for Setup  
**Time Required:** ~10 minutes  
**Last Updated:** May 4, 2026
