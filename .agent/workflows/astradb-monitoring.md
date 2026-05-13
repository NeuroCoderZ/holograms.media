# AstraDB Monitoring Workflow

## Версия: 1.0.0
## Дата создания: 13.05.2026
## Назначение: Процедуры мониторинга и диагностики AstraDB для агентов

---

## 🎯 Цель

Этот workflow описывает процедуры мониторинга AstraDB для AI-агентов:
- Проверка health status коллекций
- Диагностика ошибок синхронизации
- Анализ latency и performance
- Escalation при критических проблемах

---

## 📋 ПРОЦЕДУРА МОНИТОРИНГА

### Этап 1: Health Check (ежедневно)

Агент ОБЯЗАН проверять health status перед началом работы:

```bash
# 1. Проверка доступности AstraDB
curl -I "https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/json/v1"

# Ожидаемый ответ: HTTP/2 200
# Если 5xx → Escalation Level 2
```

```bash
# 2. Проверка коллекций
curl -X POST "https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/json/v1/default_keyspace" \
  -H "Token: ${ASTRA_DB_APPLICATION_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"findCollections": {}}'

# Ожидаемый ответ:
# {"status":{"collections":["tria_knowledge_gemini","user_chat_sessions","tria_meta_instructions"]}}

# Если 403 → Проверить токен (см. Troubleshooting Guide)
# Если 500 → Escalation Level 2
```

```bash
# 3. Подсчёт документов
curl -X POST "https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/json/v1/default_keyspace/tria_knowledge_gemini" \
  -H "Token: ${ASTRA_DB_APPLICATION_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"countDocuments": {}}'

# Ожидаемый ответ: {"status":{"count": 1500+}}
# Если count < 100 → Escalation Level 1 (возможна потеря данных)
```

**Результат Health Check:**
- ✅ **Healthy:** Все проверки пройдены → продолжить работу
- ⚠️ **Degraded:** Частичные проблемы → логировать, продолжить с осторожностью
- 🚨 **Critical:** Критические ошибки → Escalation

---

### Этап 2: Sync Monitoring (после каждого деплоя)

После деплоя агент ОБЯЗАН проверить статус синхронизации:

```bash
# 1. Проверка GitHub Actions workflow "Sync Knowledge Base"
gh run list --workflow="sync-knowledge.yml" --limit 1 --json status,conclusion,url

# Ожидаемый ответ:
# [{"status":"completed","conclusion":"success","url":"https://github.com/..."}]

# Если conclusion == "failure" → Проверить логи
gh run view <RUN_ID> --log-failed
```

**Типичные ошибки в логах:**

| Ошибка | Причина | Решение |
|--------|---------|---------|
| `HTTP 403 Forbidden` | Невалидный токен | См. [AstraDB_Errors.md](../../docs/ARCH/RU/Troubleshooting/AstraDB_Errors.md#1-http-403-forbidden) |
| `HTTP 500 Internal Server Error` | Перегрузка / большой батч | См. [AstraDB_Errors.md](../../docs/ARCH/RU/Troubleshooting/AstraDB_Errors.md#2-http-500-internal-server-error) |
| `RESOURCE_EXHAUSTED` | Квота Gemini API | См. [AstraDB_Errors.md](../../docs/ARCH/RU/Troubleshooting/AstraDB_Errors.md#4-resource_exhausted-429-too-many-requests) |
| `TimeoutException` | Network issues | См. [AstraDB_Errors.md](../../docs/ARCH/RU/Troubleshooting/AstraDB_Errors.md#5-network-timeout--connection-error) |

---

### Этап 3: Performance Monitoring (еженедельно)

Агент ДОЛЖЕН проверять performance метрики раз в неделю:

```python
# scripts/test_astra_latency.py (запускать локально)
import asyncio
import time
import os
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
    
    # Test 2: Vector search
    start = time.time()
    results = []
    async for doc in collection.find(
        sort={"$vector": [0.1] * 3072},
        limit=5
    ):
        results.append(doc)
    latency_vector = (time.time() - start) * 1000
    
    # Test 3: Count documents
    start = time.time()
    count = await collection.count_documents({})
    latency_count = (time.time() - start) * 1000
    
    print(f"📊 AstraDB Performance Metrics:")
    print(f"  Find one: {latency_find:.2f}ms {'✅' if latency_find < 100 else '⚠️'}")
    print(f"  Vector search (top 5): {latency_vector:.2f}ms {'✅' if latency_vector < 500 else '⚠️'}")
    print(f"  Count documents: {latency_count:.2f}ms {'✅' if latency_count < 200 else '⚠️'}")
    print(f"  Total documents: {count}")
    
    # Escalation
    if latency_vector > 2000:
        print(f"\n🚨 CRITICAL: Vector search latency > 2s")
        print(f"   Action: Escalation Level 2")
    elif latency_vector > 500:
        print(f"\n⚠️ WARNING: Vector search latency > 500ms")
        print(f"   Action: Monitor closely")

asyncio.run(test_latency())
```

**Целевые метрики:**
- Find one: < 100ms
- Vector search: < 500ms
- Count documents: < 200ms

**Escalation:**
- Latency > 2s → Escalation Level 2
- Latency > 500ms → Логировать, мониторить

---

## 🚨 ESCALATION LEVELS

### Level 0: Normal Operation
**Условия:**
- Все health checks пройдены
- Latency в пределах нормы
- Sync успешен

**Действия:**
- Продолжить работу
- Логировать метрики

---

### Level 1: Degraded Performance
**Условия:**
- Latency > 500ms (но < 2s)
- Частичные ошибки sync (< 5% failed chunks)
- Документов < 100 (возможна потеря данных)

**Действия:**
1. Логировать проблему в GitHub Issue
2. Проверить логи GitHub Actions
3. Запустить `scripts/sync_knowledge_base.py` вручную
4. Мониторить в течение 24 часов

**Шаблон GitHub Issue:**
```markdown
## 🟡 AstraDB Degraded Performance

**Дата:** 13.05.2026  
**Метрика:** Vector search latency = 750ms (target: <500ms)

### Диагностика:
- Health check: ✅ Passed
- Document count: 1523
- Last sync: Success (5 minutes ago)

### Действия:
- [ ] Проверить AstraDB Console (indexing status)
- [ ] Запустить latency test повторно через 1 час
- [ ] Escalate to Level 2 if latency > 1s

### Логи:
<details>
<summary>Latency test output</summary>

\`\`\`
Find one: 95.23ms ✅
Vector search (top 5): 750.12ms ⚠️
Count documents: 180.45ms ✅
\`\`\`
</details>
```

---

### Level 2: Critical Incident
**Условия:**
- AstraDB недоступен (5xx errors)
- Latency > 2s
- Sync failures > 5%
- Токен невалиден (403 Forbidden)

**Действия:**
1. **Немедленно остановить работу** (не применять изменения)
2. Создать Critical GitHub Issue
3. Уведомить НейроКодера
4. Проверить AstraDB Console
5. Ротация токенов (если 403)
6. Контакт с DataStax Support (если 5xx)

**Шаблон Critical GitHub Issue:**
```markdown
## 🚨 CRITICAL: AstraDB Unavailable

**Дата:** 13.05.2026  
**Severity:** P0 (Critical)

### Симптомы:
- AstraDB endpoint returns HTTP 500
- All sync attempts fail
- RAG queries timeout

### Impact:
- Knowledge base sync blocked
- Tria RAG unavailable
- User queries degraded

### Диагностика:
\`\`\`bash
curl -I "https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/json/v1"
# HTTP/2 500 Internal Server Error
\`\`\`

### Escalation:
- [ ] НейроКодер уведомлён
- [ ] DataStax Support ticket created: #XXXXX
- [ ] Fallback to cached embeddings (if available)

### Timeline:
- 12:00 UTC: Issue detected
- 12:05 UTC: Escalation initiated
- 12:10 UTC: Support ticket created
```

---

### Level 3: Data Loss / Corruption
**Условия:**
- Document count < 100 (ожидается 1500+)
- Коллекция пуста
- Векторы повреждены (dimension != 3072)

**Действия:**
1. **STOP ALL OPERATIONS**
2. Создать P0 GitHub Issue
3. Немедленно уведомить НейроКодера
4. НЕ ЗАПУСКАТЬ sync (риск перезаписи)
5. Проверить backup (если есть)
6. Восстановление из `repomix-output.xml`

**Процедура восстановления:**
```bash
# 1. Проверка backup
curl -X POST "https://${ASTRA_DB_ID}-${ASTRA_DB_REGION}.apps.astra.datastax.com/api/json/v1/default_keyspace/tria_knowledge_gemini_backup" \
  -H "Token: ${ASTRA_DB_APPLICATION_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"countDocuments": {}}'

# 2. Если backup есть → восстановление
# (требует manual intervention от НейроКодера)

# 3. Если backup нет → полная пересинхронизация
python scripts/sync_knowledge_base.py
```

---

## 📊 DASHBOARD METRICS

Агент ДОЛЖЕН логировать следующие метрики:

### Daily Metrics:
```json
{
  "date": "2026-05-13",
  "health_check": {
    "status": "healthy",
    "collections": 3,
    "documents": 1523
  },
  "sync_status": {
    "last_run": "2026-05-13T09:07:55Z",
    "duration_seconds": 180,
    "chunks_processed": 45,
    "chunks_failed": 0,
    "api_calls": 45
  },
  "performance": {
    "find_one_ms": 95,
    "vector_search_ms": 450,
    "count_documents_ms": 180
  }
}
```

### Weekly Report:
```markdown
## AstraDB Weekly Report (2026-05-06 → 2026-05-13)

### Health Status: ✅ Healthy

**Uptime:** 100% (7/7 days)  
**Sync Success Rate:** 100% (14/14 runs)  
**Average Latency:** 420ms (target: <500ms)

### Metrics:
| Metric | Min | Max | Avg | Target |
|--------|-----|-----|-----|--------|
| Find one | 85ms | 120ms | 95ms | <100ms |
| Vector search | 380ms | 550ms | 420ms | <500ms |
| Count docs | 150ms | 220ms | 180ms | <200ms |

### Issues:
- None

### Recommendations:
- Continue monitoring
- No action required
```

---

## 🔧 AUTOMATION

### GitHub Actions Integration:

```yaml
# .github/workflows/astradb-health-check.yml
name: AstraDB Health Check

on:
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours
  workflow_dispatch:

jobs:
  health-check:
    runs-on: ubuntu-latest
    steps:
      - name: Check AstraDB Health
        run: |
          RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
            "https://${{ secrets.ASTRA_DB_ID }}-${{ secrets.ASTRA_DB_REGION }}.apps.astra.datastax.com/api/json/v1")
          
          if [ "$RESPONSE" != "200" ]; then
            echo "🚨 CRITICAL: AstraDB health check failed (HTTP $RESPONSE)"
            exit 1
          fi
          
          echo "✅ AstraDB health check passed"
      
      - name: Count Documents
        run: |
          COUNT=$(curl -s -X POST \
            "https://${{ secrets.ASTRA_DB_ID }}-${{ secrets.ASTRA_DB_REGION }}.apps.astra.datastax.com/api/json/v1/default_keyspace/tria_knowledge_gemini" \
            -H "Token: ${{ secrets.ASTRA_DB_APPLICATION_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"countDocuments": {}}' | jq '.status.count')
          
          echo "📊 Document count: $COUNT"
          
          if [ "$COUNT" -lt 100 ]; then
            echo "🚨 CRITICAL: Document count < 100 (possible data loss)"
            exit 1
          fi
```

---

## 📚 ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ

- [AstraDB Errors Guide](../../docs/ARCH/RU/Troubleshooting/AstraDB_Errors.md) — детальный troubleshooting
- [Security Zones](../.agent/instructions/security-zones.md) — правила работы с DB
- [Deploy Workflow](../.agent/workflows/deploy.md) — процесс деплоя

---

**Последнее обновление:** 13.05.2026  
**Автор:** Claude 4.5 Sonnet (Foundation & Safety Sprint v0.20.492)  
**Статус:** Активно
