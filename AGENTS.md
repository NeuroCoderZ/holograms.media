# AGENTS.md — Библия Проекта Holograms Media
## Автономный контекст для Qwen 3.6 Plus / OpenCode Agent
## Дата: 31 марта 2026

---

## ⚠️ ЯЗЫК — РУССКИЙ
**ВСЕГДА отвечать только на РУССКОМ языке.** Код, команды, логи, пути — английский.
Но все мысли, рассуждения, объяснения, планы, ответы — **исключительно на русском**.

---

## КРИТИЧЕСКИЕ КОНСТАНТЫ 

```
# LLM Модели (Hermes Family Architecture)
HERMES_MAIN   = "mistral-small-latest"          # Hermes (Mistral Small 4 Latest) - Personal Tria (Local)
GEMINI_MAIN   = "gemini-3-flash-preview"           # Global Tria (Archetype) Fallback
GEMINI_SUB    = "gemini-3.1-flash-lite-preview"    # Darwin Critic (выбор лучшего ответа)

# Triple Token Architecture (Holochain Philosophy)
# Personal (Local) WINS over Global!
PERSONAL_TOKEN = "personal_{user_id}_{agent_id}"  # High precision: 6-8 digits (0.12345678)
GLOBAL_TOKEN   = "global_{agent_id}"                   # Medium precision: 3 digits (0.850)
NETWORK_TOKEN  = "pattern_hash"                        # Low precision: 2 digits (0.85)

# Hermes Family (Meta-Agents / DGM-H)
HERMES_CORE    = "hermes_core"       # Meta-Agent / Coordinator
HERMES_BEHAVIOR = "hermes_behavior"   # Gestures, Clicks, Predictions (Markov Chain)
HERMES_CONTEXT = "hermes_context"   # Codebase, Docs, Stack
HERMES_MEMORY  = "hermes_memory"    # Enkephalon + AstraDB (3072d)
HERMES_WALLET  = "hermes_wallet"    # Obolos, Energy, DAO

# Эмбеддинг модель
EMBED_MODEL   = "gemini-embedding-2-preview"
EMBED_DIM     = 3072  ← НИКОГДА не менять. Коллекция tria_knowledge_gemini создана с 3072d.

BASE_FREQ     = 16.352 Гц (C0)
SEMITONES     = 128
Z_FORMULA     = Z_scale = 128.0 + current_dB
PAN_LEFT      = [0°, -180°] фиолетовая сетка, левая рука
PAN_RIGHT     = [0°, +180°] красная сетка, правая рука

TORUS:
  H_Y = 3.44 м (128 ячеек → ≈26.9 мм/ячейка)
  D_Z = 1.72 м (128 ячеек → ≈13.4 мм/ячейка)
  R_in = 1.0 м (диаметр 2 м = размах руки)
  GRID = 128 × 128 × 256 = 4,194,304 вокселей
  XR_SCALE: 1 Three.js unit = 1 метр в WebXR

STORAGE: AstraDB — единственное. 80GB free tier. Без S3/R2 пока.
BRANCH: dev (Cloudflare Pages смотрит только dev)
DEPLOY CMD: node scripts/deploy.js "описание"
```

### Философия Holochain (Agent-Centric)
- **Personal (Local) WINS:** Source Chain (user-owned) is immutable and sovereign.
- **Global Tria:** Statistical archetypes (aggregated patterns), NOT dictator. 
- **Rule:** Personal instruction ALWAYS overrides Global suggestion.
- **Implementation:** `personal_{user_id}_{agent_id}` → `global_{agent_id}`.

---

## ПРАВИЛА РАБОТЫ

0. **ЯЗЫК:** ВСЕГДА отвечать только на РУССКОМ языке, где это только возможно.
1. **ТОЛЬКО ДИФФ-ПАТЧИ.** Никогда не переписывать файл целиком. Использовать `edit` с точным `old_string` и `new_string`. **Полная перезапись файла (`write_file`) ЗАПРЕЩЕНА** для существующих файлов.
2. **ДЕПЛОЙ КАЖДЫЕ 2–3 ФАЙЛА:** `node scripts/deploy.js "Описание изменений"`
3. **ПЕРЕД КАЖДОЙ ПРАВКОЙ:** прочитать актуальный кусок файла через Read, убедиться что old_str точно совпадает.
4. **ЗАПРЕЩЕНО:** добавлять NPU, ONNX, TurboQuant в браузере, LoRA в браузере, ARC-AGI как метрику, DGM-H самомодификацию кода.
5. **EMBED_DIM = 3072 ВЕЗДЕ И ВСЕГДА.** Никаких 768.
6. **Модели:** Hermes (Mistral Small 4 Latest) — приоритет (Personal Tria). Gemini — Global fallback (Global Tria). Mistral — только как fallback при 429. **OpenClaw УДАЛЕН**.
7. **Triple Token Architecture:** Personal (Local, 6-8 digits) WINS over Global (3 digits) over Network (2 digits). **Personal (Local) WINS over Global.**
8. **⛔ ЛОКАЛЬНЫЕ СБОРКИ И ТЕСТЫ ЗАПРЕЩЕНЫ.** Запуск `npm run build`, `npm run dev`, `vite build`, `npm test`, `python -m pytest` локально строго запрещён. Все проверки, билды и валидации выполняются ТОЛЬКО в CI/CD (GitHub Actions → Cloudflare Pages / Koyeb). Агенты работают исключительно через `git push` и мониторинг ранов.
9. **Hermes Family:** Core (Meta-Agent), Behavior (Gestures/Clicks), Context (Docs/Code), Memory (AstraDB), Wallet (Obolos/Energy).

---

## АРХИТЕКТУРА

### Frontend (js/)
- **Рендеринг:** Three.js, приоритет WebGPU → фоллбэк WebGL
- **Ортографическая камера** для фронтального вида голограммы
- **PerspectiveCamera** для XR-режима (state.xrCamera)
- **hologramRenderer.js** — InstancedMesh, 2 draw calls, Z-scale рост вглубь
- **_frozenFrame** — заморозка 3D при паузе (v0.20.265)
- **setViewOffset ЗАМЕНЁН на hologramPivot.position.x lerp** — не ломает aspect ratio

### Backend (backend/)
- **FastAPI** на Koyeb (Docker)
- **TriaOrchestrator** — Darwin Critic (A/B candidates), SUB_MODEL selection
- **MetaInstructionService** — системные инструкции как данные AstraDB
- **Auto-create collections** при старте: user_chat_sessions, tria_meta_instructions
- **Fallback на Mistral** при Gemini 429 (v0.20.265)

### Хранилище
- **AstraDB** — единственное. Коллекции: tria_knowledge_gemini (3072d COSINE), user_chat_sessions, tria_meta_instructions
- **R2/B2** — [PLANNED], не используется

---

## ЖЕСТОВЫЙ ДВИЖОК

- CHUNK_MS = 200
- MEDIAPIPE_PTS = 21 (63 float32)
- ACCEPT_LOCAL = 0.85 → прямое исполнение (<5 мс)
- ACCEPT_CLOUD = 0.65 → облачная проверка (50-200 мс)
- EARLY_TRIGGER = при confidence ≥ 0.85 на 300-500мс жеста
- CLOUD_COOLDOWN_MS = 300

---

## ЗАЩИЩЁННЫЕ ФАЙЛЫ (НЕ ТРОГАТЬ без явной необходимости)

- GestureSynthesizer.js
- HyperbrainSynthesizer.js
- GestureVectorStore.js
- SpectralInpainter.js
- tria_worker.js

---

## ИЗВЕСТНЫЕ ПРОБЛЕМЫ

| Компонент | Проблема | Статус |
|-----------|----------|--------|
| Gemini API 429 | Лимит квоты | 🔄 В процессе |
| Enkephalon WASM | Stub mode active | 🔮 Требуется полная сборка WASM |

---

## Единый деплой / мониторинг (что должны знать агенты)

### 1) Единый деплой — `scripts/deploy.js`
Агенты должны запускать обновления проекта через **одну команду**:
- `node scripts/deploy.js "Описание изменений"`

`deploy.js` выполняет в этом порядке:
1. *Frontend build выполняется на стороне CI/CD (Cloudflare/GitHub Actions); локальный запуск `npm run build` запрещён.*
2. pre-deploy checklist (`node scripts/pre-deploy-check.js`)
3. генерацию контекста репозиториев (`npx repomix` и `neuroescrow/repomix-output.md`)
4. bump версии (`version.txt`, `package.json`, `index.html`) через `node scripts/generate_version.js`
5. деплой NeuroEscrow Hermes в Cloudflare Workers (`wrangler deploy`)
6. `git add` → `git commit` → `git push origin dev`

### 2) Почему GitHub UI показывает “старые билды”
workflow на GitHub Actions стартует **не от локального build**, а от **push/commit** в ветку, соответствующую CI.
Значит: если изменений не коммитили/не пушили — новые runs на GitHub не появятся.

### 3) Контекст для двух Hermes обновляется через CI-пайплайн
Обновления для гермесов (core/behavior/context/memory) получают актуальный контекст после деплой-события, потому что пайплайн использует:
- версионные изменения (bump)
- сгенерированный RepoMix контекст (репозиторный “код→знания”)
- push в `dev` (триггер workflows)

### 4) Самописный монитор — `scripts/monitor-server.js`
Для контроля процесса и статуса используется:
- `node scripts/monitor-server.js` → http://localhost:3001

Монитор читает агрегированные данные через endpoint’ы (`/api/status`) и отображает сборку/деплой/логи, а также управляет “копированием логов” только после того, как данные реально загружены (не по хрупким подстрокам).

*"Архитектура следует за интенцией. Код — это геометрия резонанса."*
