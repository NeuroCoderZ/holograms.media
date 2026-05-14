# CrewAI Hermes Family — Architecture Documentation

**Version:** 2.0.0 | **Date:** 14 мая 2026 | **Phase:** B (Hermes Family Core)

## Обзор

Hermes Family — это рой из 5 специализированных AI-агентов на базе CrewAI, оркестрирующих разработку и поддержку платформы holograms.media. Каждый агент привязан к своей LLM модели, имеет жёсткие лимиты токенов и итераций, и работает под контролем человека через Telegram HITL.

**Парадигма:** Ручное переключение LLM → человеческий контроль. CrewAI → оркестратор, а не автопилот.

## Архитектура

```
[Cloudflare Gateway] → [FastAPI+CrewAI на Koyeb] → [AstraDB] → [Mistral API]
                              ↓
                       [E2B/Docker Sandbox]
                              ↓
                     [Telegram Bot API 10.0]
                              ↓
                     [Human-in-the-Loop]
```

## Агенты

| Агент | LLM | Роль | max_iter | max_rpm |
|-------|-----|------|----------|---------|
| Hermes-Prime | mistral-medium-3.5 | Мета-координатор, декомпозиция, routing | 5 | 10 |
| Hermes-CodeGen | mistral-medium-3.5 | Генерация дифф-патчей (DiffPatchSet) | 3 | 8 |
| Hermes-Reviewer | mistral-small-latest | Безопасность, AST-валидация | 3 | 6 |
| Hermes-GestureUX | mistral-small-latest | Жестовый пайплайн, UX | 3 | 8 |
| Hermes-TriaWeaver | mistral-small-latest | AstraDB, RAG, Memory | 3 | 8 |

## Flow DAG

```
receive_request → classify_intent → route_intent
  ├── code_generation → plan_generation → finalize
  ├── code_review → review_code → finalize
  ├── gesture_optimization → optimize_gesture → finalize
  ├── memory_integration → integrate_memory → finalize
  └── general_query → general_query → finalize
```

## Модели (Pydantic)

- **DiffPatchSet**: Структурированный вывод Hermes-CodeGen (список патчей + мета)
- **ReviewResult**: Результат ревью (approved, security_issues, quality_score)
- **GestureAnalysis**: Параметры жестового движка
- **MemoryResult**: Результат RAG поиска

## Оптимизации

| Оптимизация | Экономия |
|-------------|----------|
| `knowledge_sources` > `knowledge` | 50-90% токенов |
| `cache=True` | 30-50% повторных вызовов |
| `planning=True` + `planning_llm=small` | 60-70% на planning |
| `output_pydantic=DiffPatchSet` | 0 retry на парсинг |
| MCP `tool_filter` | -25% токенов на tools |
| `max_iter` + `max_rpm` | Защита free-tier |
| `Semaphore(2)` | OOM защита (Koyeb 512MB) |
| Semantic caching (AstraDB) | 40-60% на похожих запросах |

## Безопасность

- `allow_code_execution=False` — строго (CVE-2026-2275)
- `PromptSanitizer` — фильтрация injection паттернов
- `SecurityConfig` — валидация конфигурации агентов
- AST-валидация патчей перед применением
- Изолированные AstraDB namespaces: `crewai_*`, `neuroescrow_*`, `tria_*`

## Token Ledger

In-memory трекинг расхода токенов с Telegram-алертами:
- 75% → жёлтое предупреждение
- 90% → красное предупреждение + рекомендация swap LLM
- 95% → критическое предупреждение

Ручной swap LLM через `.env` (HERMES_MAIN_LLM, HERMES_SUB_LLM).

## API Endpoints

- `GET /api/v1/hermes/health` — Health check + token ledger status
- `POST /api/v1/hermes/request` — Основной endpoint для запросов
- `GET /api/v1/hermes/token-ledger` — Статус расхода токенов
- `GET /api/v1/hermes/agents` — Список доступных агентов

## Файловая структура

```
backend/hermes_family/
├── __init__.py          # Публичный API пакета
├── agents.py            # 5 агентов с per-agent LLM
├── models.py            # Pydantic модели (DiffPatchSet, ReviewResult, etc.)
├── flow.py              # CrewAI Flow DAG с @router/@listen
├── memory.py            # AstraDB StorageBackend + CheckpointStore
├── mcp.py               # MCP SSE/Stdio интеграция
├── guardrails.py        # Валидация вывода (Pydantic + regex + AST)
├── security.py          # PromptSanitizer + SecurityConfig
├── token_ledger.py      # Token tracking + Telegram alerts
├── router.py            # FastAPI /api/v1/hermes/* endpoints
├── stress_test.py       # CI/CD тесты
└── hermes_crew.yaml     # YAML конфигурация CrewAI
```

## Zero-Budget Стратегия

| Ресурс | Провайдер | Free Tier |
|--------|-----------|-----------|
| LLM (генерация) | Mistral | 1B tokens/мес |
| LLM (sub) | Mistral Small | Включён в 1B |
| Embeddings | Google Gemini | 1500 req/мин, 3072d |
| DB | AstraDB | 25GB + 25M R/W |
| Runtime | Koyeb | 1 nano (512MB) |
| Gateway | CF Workers | 100K req/день |
