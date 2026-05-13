# AstraDB Errors — Troubleshooting Guide

## Версия: 1.0.0
## Дата создания: 13.05.2026
## Назначение: Диагностика и решение проблем с AstraDB в Holograms Media

---

## 🎯 Обзор

Этот гайд описывает типичные ошибки при работе с AstraDB и методы их решения. Используется для:
- Диагностики проблем синхронизации knowledge base
- Мониторинга health status коллекций
- Отладки RAG запросов
- Анализа latency и performance

---

## 🔍 ТИПИЧНЫЕ ОШИБКИ

### 1. HTTP 403 Forbidden

**Симптомы:**
```python
astrapy.exceptions.DataAPIHttpException: HTTP 403 Forbidden
Message: Forbidden
```

**Причины:**
1. Невалидный `ASTRA_DB_APPLICATION_TOKEN`
2. Токен не имеет прав на коллекцию
3. Токен истёк (rotation)
4. IP-адрес заблокирован (rate limiting)

**Диагностика:**
```bash
# Проверка токена через curl
curl -X POST "https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/json/v1/default_keyspace" \
  -H "Token: ${ASTRA_DB_APPLICATION_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"findCollections": {}}'

# Ожидаемый ответ (200 OK):
{"status":{"collections":["tria_knowledge_gemini","user_chat_sessions","tria_meta_instructions"]}}

# Ошибка (403):
{"errors":[{"message":"Forbidden","errorCode":"FORBIDDEN"}]}
```

**Решение:**
1. **Проверить токен в `.env.local`:**
   ```bash
   echo $ASTRA_DB_APPLICATION_TOKEN | wc -c  # Должно быть ~300+ символов
   ```

2. **Сгенерировать новый токен:**
   - Перейти в [Astra DB Console](https://astra.datastax.com/)
   - Settings → Application Tokens → Generate Token
   - Scope: `Database Administrator` (для полного доступа)
   - Обновить `.env.local` и GitHub Secrets

3. **Проверить IP whitelist:**
   - Astra DB Console → Database → Settings → Allowed IP Addresses
   - Добавить IP GitHub Actions runners (если используется CI/CD)

---

### 2. HTTP 500 Internal Server Error

**Симптомы:**
```python
astrapy.exceptions.DataAPIHttpException: HTTP 500 Internal Server Error
Message: Internal server error
```

**Причины:**
1. Перегрузка AstraDB (rate limiting)
2. Слишком большой батч `insert_many` (>20 документов)
3. Документ превышает 8KB (SHRED_DOC_LIMIT_VIOLATION)
4. Коллекция в процессе индексации

**Диагностика:**
```bash
# Проверка размера документов
python3 << 'EOF'
import sys
sys.path.append('backend')
from scripts.sync_knowledge_base import chunk_text

text = open('repomix-output.xml').read()
chunks = chunk_text(text, 'test.xml')

for i, chunk in enumerate(chunks[:5]):
    size = len(chunk['content'].encode('utf-8'))
    print(f"Chunk {i}: {size} bytes ({size/1024:.2f} KB)")
    if size > 8000:
        print(f"  ⚠️ WARNING: Exceeds 8KB limit!")
EOF
```

**Решение:**
1. **Уменьшить размер батча:**
   ```python
   # scripts/sync_knowledge_base.py
   MAX_CHUNKS_PER_RUN = 10  # Уже установлено (консервативно)
   ```

2. **Уменьшить размер чанков:**
   ```python
   # scripts/sync_knowledge_base.py
   CHUNK_SIZE_CHARS = 3500  # Уже установлено (было 8000)
   ```

3. **Добавить retry с exponential backoff:**
   ```python
   # Пример (НЕ применять без review!)
   from tenacity import retry, stop_after_attempt, wait_exponential
   
   @retry(
       stop=stop_after_attempt(3),
       wait=wait_exponential(multiplier=1, min=4, max=10)
   )
   async def insert_with_retry(collection, chunks):
       await collection.insert_many(chunks, ordered=False)
   ```

4. **Проверить статус коллекции:**
   ```bash
   # Через Astra DB Console
   # Database → Collections → tria_knowledge_gemini → Status
   # Если "Indexing" → дождаться завершения
   ```

---

### 3. DOCUMENT_ALREADY_EXISTS

**Симптомы:**
```python
astrapy.exceptions.InsertManyException: DOCUMENT_ALREADY_EXISTS
```

**Причины:**
1. Дублирующиеся `_id` в батче
2. Повторный запуск sync без удаления старых чанков
3. Коллизия хешей (крайне редко)

**Диагностика:**
```python
# Проверка дубликатов в батче
import hashlib

file_path = "backend/app.py"
chunks = []
for idx in range(5):
    chunk_id = hashlib.sha256(f"{file_path}:{idx}".encode('utf-8')).hexdigest()
    chunks.append(chunk_id)

print(f"Unique IDs: {len(set(chunks))} / {len(chunks)}")
# Должно быть: Unique IDs: 5 / 5
```

**Решение:**
1. **Использовать `ordered=False`:**
   ```python
   # scripts/sync_knowledge_base.py (уже установлено)
   await collection.insert_many(db_chunks, ordered=False)
   ```
   Это позволяет вставить уникальные документы, пропуская дубликаты.

2. **Удалить старые чанки перед обновлением:**
   ```python
   # scripts/sync_knowledge_base.py (уже реализовано)
   if files_to_update:
       await collection.delete_many(
           filter={"metadata.source": {"$in": list(files_to_update)}}
       )
   ```

3. **Обработать исключение:**
   ```python
   # scripts/sync_knowledge_base.py (уже реализовано)
   try:
       await collection.insert_many(db_chunks, ordered=False)
   except Exception as e:
       if "DOCUMENT_ALREADY_EXISTS" in str(e):
           print(f"  ℹ️  {path}: Some chunks already exist, skipping duplicates.")
       else:
           print(f"  ⚠️  {path}: Partial sync error: {e}")
   ```

---

### 4. RESOURCE_EXHAUSTED (429 Too Many Requests)

**Симптомы:**
```python
google.api_core.exceptions.ResourceExhausted: 429 Resource has been exhausted
```

**Причины:**
1. Превышен лимит Gemini Embedding API (Free Tier: 1500 requests/day)
2. Слишком частые запросы (rate limiting: 60 requests/minute)
3. Квота исчерпана (monthly limit)

**Диагностика:**
```bash
# Проверка текущего использования
# Google Cloud Console → APIs & Services → Gemini API → Quotas
# https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/quotas

# Локальная проверка (сколько чанков будет обработано)
python3 << 'EOF'
import sys
sys.path.append('backend')
from scripts.sync_knowledge_base import parse_and_hash_repomix, chunk_text

file_map = parse_and_hash_repomix('repomix-output.xml')
total_chunks = 0

for path, data in list(file_map.items())[:10]:  # Первые 10 файлов
    chunks = chunk_text(data['content'], path)
    total_chunks += len(chunks)
    print(f"{path}: {len(chunks)} chunks")

print(f"\nTotal chunks (first 10 files): {total_chunks}")
print(f"Estimated API calls: {total_chunks}")
EOF
```

**Решение:**
1. **Уменьшить батч:**
   ```python
   # scripts/sync_knowledge_base.py (уже установлено)
   MAX_CHUNKS_PER_RUN = 10  # Консервативный лимит
   ```

2. **Добавить rate limiting:**
   ```python
   # scripts/sync_knowledge_base.py (уже реализовано)
   elapsed = time.time() - self.last_request_time
   if elapsed < 0.8:  # 0.8s между запросами = 75 requests/minute
       await asyncio.sleep(0.8 - elapsed)
   ```

3. **Использовать quota exhausted flag:**
   ```python
   # scripts/sync_knowledge_base.py (уже реализовано)
   if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
       self.quota_exhausted = True
       return None
   ```

4. **Запланировать синхронизацию:**
   ```yaml
   # .github/workflows/sync-knowledge.yml
   on:
     schedule:
       - cron: '0 2 * * *'  # Раз в день в 02:00 UTC
   ```

---

### 5. Network Timeout / Connection Error

**Симптомы:**
```python
httpx.TimeoutException: Request timeout
httpx.ConnectError: Connection refused
```

**Причины:**
1. Нестабильное интернет-соединение
2. AstraDB endpoint недоступен
3. Firewall блокирует исходящие запросы
4. Слишком короткий timeout

**Диагностика:**
```bash
# Проверка доступности AstraDB
curl -I "https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/json/v1"

# Ожидаемый ответ:
HTTP/2 200
content-type: application/json

# Проверка latency
time curl -X POST "https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/json/v1/default_keyspace" \
  -H "Token: ${ASTRA_DB_APPLICATION_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"findCollections": {}}'

# Должно быть < 2s
```

**Решение:**
1. **Увеличить timeout:**
   ```python
   # scripts/sync_knowledge_base.py (уже установлено)
   API_TIMEOUT_SECONDS = 300  # 5 минут для тяжёлых батчей
   ```

2. **Graceful exit при network errors:**
   ```python
   # scripts/sync_knowledge_base.py (уже реализовано)
   except (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError) as e:
       print(f"\n⚠️  [NETWORK] Синхронизация знаний пропущена из-за сетевых ограничений.")
       sys.exit(0)  # Не ломаем пайплайн
   ```

3. **Использовать retry:**
   ```python
   # Пример (НЕ применять без review!)
   from tenacity import retry, stop_after_attempt, wait_fixed
   
   @retry(stop=stop_after_attempt(3), wait=wait_fixed(5))
   async def fetch_with_retry(url):
       async with httpx.AsyncClient(timeout=30) as client:
           return await client.get(url)
   ```

---

## 📊 МОНИТОРИНГ HEALTH STATUS

### 1. Проверка коллекций

```bash
# Список всех коллекций
curl -X POST "https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/json/v1/default_keyspace" \
  -H "Token: ${ASTRA_DB_APPLICATION_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"findCollections": {}}'

# Ожидаемый ответ:
{
  "status": {
    "collections": [
      "tria_knowledge_gemini",
      "user_chat_sessions",
      "tria_meta_instructions"
    ]
  }
}
```

### 2. Подсчёт документов

```bash
# Количество документов в коллекции
curl -X POST "https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/json/v1/default_keyspace/tria_knowledge_gemini" \
  -H "Token: ${ASTRA_DB_APPLICATION_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"countDocuments": {}}'

# Ожидаемый ответ:
{
  "status": {
    "count": 1523
  }
}
```

### 3. Проверка эмбеддингов

```bash
# Получить один документ с вектором
curl -X POST "https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/json/v1/default_keyspace/tria_knowledge_gemini" \
  -H "Token: ${ASTRA_DB_APPLICATION_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "findOne": {
      "projection": {
        "_id": 1,
        "$vector": 1,
        "metadata.source": 1
      }
    }
  }'

# Проверить размерность вектора
# Должно быть: "$vector": [0.123, 0.456, ...] (3072 элемента)
```

### 4. Latency Test

```python
# scripts/test_astra_latency.py
import asyncio
import time
from astrapy import DataAPIClient

async def test_latency():
    token = os.getenv("ASTRA_DB_APPLICATION_TOKEN")
    endpoint = os.getenv("ASTRA_DB_API_ENDPOINT")
    
    client = DataAPIClient(token)
    db = client.get_async_database(endpoint, keyspace="default_keyspace")
    collection = db.get_collection("tria_knowledge_gemini")
    
    # Test 1: Find one document
    start = time.time()
    doc = await collection.find_one({})
    latency_find = (time.time() - start) * 1000
    print(f"Find one: {latency_find:.2f}ms")
    
    # Test 2: Vector search
    start = time.time()
    results = await collection.find(
        sort={"$vector": [0.1] * 3072},
        limit=5
    )
    latency_vector = (time.time() - start) * 1000
    print(f"Vector search (top 5): {latency_vector:.2f}ms")
    
    # Test 3: Count documents
    start = time.time()
    count = await collection.count_documents({})
    latency_count = (time.time() - start) * 1000
    print(f"Count documents: {latency_count:.2f}ms")

asyncio.run(test_latency())
```

**Ожидаемые значения:**
- Find one: < 100ms
- Vector search: < 500ms
- Count documents: < 200ms

---

## 🔧 BEST PRACTICES

### 1. Инкрементальная синхронизация

**Текущая реализация** (`scripts/sync_knowledge_base.py`):
```python
# Сравнение хешей файлов
local_files = parse_and_hash_repomix(str(xml_path))
remote_files = {}  # {source: hash}

# Планирование изменений
files_to_add = set(local_files.keys()) - set(remote_files.keys())
files_to_delete = set(remote_files.keys()) - set(local_files.keys())
files_to_update = {
    p for p in (set(local_files.keys()) & set(remote_files.keys()))
    if local_files[p]["hash"] != remote_files[p]
}
```

**Преимущества:**
- Минимизация API calls (только изменённые файлы)
- Быстрая синхронизация (секунды вместо минут)
- Экономия квоты Gemini Embedding API

### 2. Chunking Strategy

**Текущие параметры:**
```python
CHUNK_SIZE_CHARS = 3500  # Reduced from 8000 to prevent SHRED_DOC_LIMIT_VIOLATION
CHUNK_OVERLAP_CHARS = 300  # Overlap для контекста
```

**Обоснование:**
- 3500 chars ≈ 6-7KB UTF-8 (безопасно для 8KB лимита)
- 300 chars overlap сохраняет контекст между чанками
- Баланс между детализацией и количеством API calls

### 3. Rate Limiting

**Текущая реализация:**
```python
# GeminiEmbeddingService
elapsed = time.time() - self.last_request_time
if elapsed < 0.8:
    await asyncio.sleep(0.8 - elapsed)
```

**Параметры:**
- 0.8s между запросами = 75 requests/minute
- Безопасный запас для Free Tier (60 requests/minute)
- Предотвращает 429 errors

### 4. Error Handling

**Текущая реализация:**
```python
# Graceful degradation
try:
    await collection.insert_many(db_chunks, ordered=False)
except Exception as e:
    if "DOCUMENT_ALREADY_EXISTS" in str(e):
        print(f"  ℹ️  {path}: Some chunks already exist, skipping duplicates.")
    else:
        print(f"  ⚠️  {path}: Partial sync error: {e}")
```

**Преимущества:**
- Не ломает пайплайн при частичных ошибках
- Логирует проблемы для дальнейшего анализа
- Продолжает обработку оставшихся файлов

---

## 📈 МЕТРИКИ ПРОИЗВОДИТЕЛЬНОСТИ

### Целевые показатели:

| Метрика | Целевое значение | Критическое значение |
|---------|------------------|----------------------|
| **Sync latency** | < 5 минут | > 15 минут |
| **API calls per sync** | < 200 | > 500 |
| **Failed chunks** | 0% | > 5% |
| **Vector search latency** | < 500ms | > 2s |
| **RAG accuracy** | > 80% | < 60% |

### Мониторинг через GitHub Actions:

```yaml
# .github/workflows/sync-knowledge.yml
- name: Sync Knowledge Base
  run: |
    START_TIME=$(date +%s)
    python scripts/sync_knowledge_base.py
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    echo "Sync duration: ${DURATION}s"
    
    if [ $DURATION -gt 900 ]; then
      echo "⚠️ WARNING: Sync took longer than 15 minutes"
    fi
```

---

## 🚨 ESCALATION PATH

### Уровень 1: Автоматическое восстановление
- Retry с exponential backoff
- Graceful degradation
- Fallback на cached embeddings

### Уровень 2: Manual intervention
- Проверка логов GitHub Actions
- Ручной запуск `scripts/sync_knowledge_base.py`
- Проверка AstraDB Console

### Уровень 3: Critical incident
- Ротация токенов
- Контакт с DataStax Support
- Миграция на backup коллекцию

---

## 📞 КОНТАКТЫ

**Вопросы по AstraDB:**
- DataStax Support: https://support.datastax.com/
- Astra DB Docs: https://docs.datastax.com/en/astra-db-serverless/

**Вопросы по Gemini Embedding API:**
- Google AI Studio: https://aistudio.google.com/
- Gemini API Docs: https://ai.google.dev/gemini-api/docs

**Внутренние вопросы:**
- НейроКодер (neurocoderz@gmail.com)
- GitHub Issues: https://github.com/neurocoderz/holograms.media/issues

---

**Последнее обновление:** 13.05.2026  
**Автор:** Claude 4.5 Sonnet (Foundation & Safety Sprint v0.20.492)  
**Статус:** Активно
