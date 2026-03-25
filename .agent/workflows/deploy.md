---
description: Полный цикл деплоя — от коммита до auto-reload на клиенте
---

# Deploy Pipeline

## Быстрый деплой
// turbo-all

```bash
npm run deploy "описание изменений"
```

Эта команда выполняет полный цикл:

## Внутренний процесс

1. **`scripts/deploy.js`** — инкрементирует patch в `version.txt`, обновляет `package.json` и `index.html`
2. **`scripts/generate_version.js`** — генерирует `public/version.json` с timestamp
3. **`git add . && git commit && git push origin dev`** — пуш в GitHub

## GitHub Actions (автоматически)

После пуша в `dev` запускаются 3 workflow:
- **Deploy Frontend to Cloudflare Pages** — Vite build → Cloudflare
- **Deploy Backend to Koyeb (Development)** — Docker build → Koyeb
- **Sync Knowledge Base** — repomix → Gemini Embedding 2 → AstraDB

## Auto-Reload на клиенте

`AutoReloadService.js` каждые 60 сек проверяет `/version.json`.
При обнаружении новой версии:
1. Показывает эффект "моргания" (Blink Transition)
2. Перезагружает страницу с cache buster (`?v=timestamp`)

## Обновление базы знаний

```bash
npm run ctx
```
Генерирует `repomix-context.xml` который используется `sync_knowledge_base.py` для инкрементального обновления AstraDB.

## Модели (ЗАФИКСИРОВАНЫ)

| Модель | ID | Назначение |
|---|---|---|
| LLM | `gemini-3-flash-preview` | Генерация ответов Tria |
| Embeddings | `gemini-embedding-2-preview` | Эмбеддинги (3072d) |
| Architecture | `mistral-small-latest` | ArchitectureAgent |

## Секреты (Koyeb + GitHub)

Все env vars проброшены через `koyeb-dev-deploy.yml`:
`GOOGLE_API_KEY`, `MISTRAL_API_KEY`, `OPENCLAW_GATEWAY_TOKEN`,
`ASTRA_DB_APPLICATION_TOKEN`, `ASTRA_DB_API_ENDPOINT`, `ASTRA_DB_KEYSPACE`
