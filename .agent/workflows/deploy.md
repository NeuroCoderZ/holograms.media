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

`scripts/deploy.js` выполняет в этом порядке:

1. **Warden Security Check** — проверка красных зон в staged files (см. [.agent/skills/warden-security/SKILL.md](../.agent/skills/warden-security/SKILL.md))
2. **Pre-deploy checklist** — `node scripts/pre-deploy-check.js` (BasilaQ health check, audio pipeline, Three.js exports)
3. **RepoMix контекст** — генерация `repomix-output.xml` (Holograms.Media) и `neuroescrow/repomix-output.md` (NeuroEscrow)
4. **Version bump** — инкрементирует patch в `version.txt`, обновляет `package.json` и `index.html`
5. **Version manifest** — `node scripts/generate_version.js` → `public/version.json` с timestamp
6. **NeuroEscrow Hermes деплой** — `npx wrangler@4.90.0 deploy` (Cloudflare Workers, Python)
7. **Git push** — `git add . && git commit && git push origin dev`

**Важно:** Frontend build выполняется на стороне CI/CD (Cloudflare Pages). Локальный `npm run build` запрещён.

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

RepoMix контекст генерируется автоматически при каждом деплое:
- `repomix-output.xml` — Holograms.Media (XML format)
- `neuroescrow/repomix-output.md` — NeuroEscrow Hermes (Markdown format)

Используется `sync_knowledge_base.py` (GitHub Actions) для инкрементального обновления AstraDB.

## Модели (Model Lock 13.05.2026)

| Модель | ID | Назначение |
|---|---|---|
| Hermes Main | `mistral-medium-3.5` | Основная модель (128B, 256k ctx) |
| Hermes Sub | `mistral-small-latest` | Архитектурный агент, роутинг |
| Embeddings | `gemini-embedding-2-preview` | Эмбеддинги (3072d) — НИКОГДА не менять |

**ЗАПРЕЩЕНО:** `gemini-3-flash-preview`, `gemini-3.1-flash-lite-preview` (выведены из стека, май 2026)

## Секреты (Koyeb + GitHub)

Все env vars проброшены через `koyeb-dev-deploy.yml`:
`GOOGLE_API_KEY`, `MISTRAL_API_KEY`,
`ASTRA_DB_APPLICATION_TOKEN`, `ASTRA_DB_API_ENDPOINT`, `ASTRA_DB_KEYSPACE`

**⚠️ КРАСНЫЕ ЗОНЫ:** Модификация деплой-скриптов, workflows и секретов требует явного `✅ Принято` от НейроКодера. См. [security-zones.md](../.agent/instructions/security-zones.md)
