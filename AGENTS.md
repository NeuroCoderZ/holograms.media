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
# LLM Модели (Hermes Router Architecture - Model Lock 18.05.2026)
# Гермес — Meta-Agent Router, НЕ одна модель. Он маршрутизирует запросы к лучшим LLM.

HERMES_ROUTER = true                    # Гермес оркестрирует, не генерирует сам
HERMES_MAIN   = "mistral-medium-3.5"    # Default fallback (128B, 256k ctx)
EMBED_MODEL   = "gemini-embedding-2-preview"  # Embeddings ONLY (3072d) - NEVER change

# LLM POOL — Code Arena WebDev Rankings (May 14, 2026)
# Использовать ТОЛЬКО актуальные модели из топа. Рейтинг обновляется ежемесячно.
# Источник: https://arena.lmsys.org (Code Arena | WebDev)

LLM_POOL = {
  # TIER 1 — Элита (Code Arena WebDev Rankings, May 14, 2026)
  "claude_opus_4_7_thinking": { rank: 1,  score: 1567, price: "$5/$25",  context: "1M",   use_for: ["complex_architecture", "thinking_mode"] },
  "claude_opus_4_7":          { rank: 2,  score: 1559, price: "$5/$25",  context: "1M",   use_for: ["general_architecture", "large_scale_refactoring"] },
  "claude_opus_4_6_thinking": { rank: 3,  score: 1546, price: "$5/$25",  context: "1M",   use_for: ["deep_reasoning", "logic_bugs"] },
  "claude_opus_4_6":          { rank: 4,  score: 1541, price: "$5/$25",  context: "1M",   use_for: ["stable_code_gen", "architecture"] },
  "glm_5_1":                  { rank: 5,  score: 1532, price: "$1.4/$4.4", context: "202K", use_for: ["tech_architecture", "balanced_tasks"] },
  
  # TIER 2 — Сильные
  "claude_sonnet_4_6":        { rank: 6,  score: 1524, price: "$3/$15",  context: "1M",   use_for: ["web_dev", "ui_ux", "fast_coding"] },
  "kimi_k2_6":                { rank: 7,  score: 1519, price: "$0.95/$4", context: "262K", use_for: ["context_intensive", "long_conversations"] },
  "muse_spark":               { rank: 8,  score: 1509, price: "N/A",     context: "N/A",  use_for: ["experimental", "creativity"] },
  "gpt_5_5_xhigh":            { rank: 9,  score: 1501, price: "N/A",     context: "N/A",  use_for: ["codex_harness", "standard_ops"] },
  "qwen3_6_max_preview":      { rank: 10, score: 1491, price: "$1.04/$6.24", context: "262K", use_for: ["general_purpose", "multilingual"] },

  # TIER 3 — Доступные / Проверенные
  "claude_opus_4_5_thinking": { rank: 11, score: 1490, price: "$5/$25",  context: "200K", use_for: ["legacy_debug"] },
  "gpt_5_5_high":             { rank: 12, score: 1481, price: "N/A",     context: "N/A",  use_for: ["stable_ops"] },
  "mimo_v2_5_pro":            { rank: 13, score: 1472, price: "$1/$3",   context: "1M",   use_for: ["mobile_optimization"] },
  "qwen3_6_plus":             { rank: 15, score: 1460, price: "$0.33/$1.95", context: "1M",   use_for: ["agent_tasks", "default_fallback"] },
  "deepseek_v4_pro_thinking": { rank: 16, score: 1458, price: "$0.43/$0.87", context: "1M",   use_for: ["reasoning", "logic_chain"] },
  
  # MULTIMODAL
  "gemini_3_1_pro_preview":   { rank: 18, score: 1450, modality: "multimodal", context: "1M" },
  "gemini_embedding_2_preview": { modality: "embedding", dim: 3072, use_for: ["RAG", "similarity_search"] }
}

# ROUTING RULES:
# - Бюджет < $0.01 → deepseek_v4_pro_thinking или kimi_k2_6
# - Бюджет $0.01-$0.1 → glm_5_1 или qwen3_6_plus
# - Бюджет > $0.1 → claude_sonnet_4_6 или claude_opus_4_7
# - Критический код → claude_opus_4_7_thinking
# - Визуал → gemini_2_0_flash
# - Embeddings → gemini_embedding_2_preview (3072d, НИКОГДА не менять)

# Triple Token Architecture (Holochain Philosophy)
# Personal (Local) WINS over Global!
PERSONAL_TOKEN = "personal_{user_id}_{agent_id}"  # High precision: 6-8 digits (0.12345678)
GLOBAL_TOKEN   = "global_{agent_id}"                   # Medium precision: 3 digits (0.850)
NETWORK_TOKEN  = "pattern_hash"                        # Low precision: 2 digits (0.85)

# Hermes Family (Meta-Agents / DGM-H)
HERMES_CORE    = "hermes_core"       # Meta-Agent / Coordinator / Router
HERMES_BEHAVIOR = "hermes_behavior"   # Gestures, Clicks, Predictions (Markov Chain)
HERMES_CONTEXT = "hermes_context"   # Codebase, Docs, Stack
HERMES_MEMORY  = "hermes_memory"    # Enkephalon + AstraDB (3072d)
HERMES_WALLET  = "hermes_wallet"    # Obolos, Energy, DAO, LLM Cost Tracking

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
6. **Модели:** Hermes — Meta-Agent Router (НЕ одна модель). Маршрутизирует запросы к лучшим LLM из Code Arena WebDev (May 14, 2026). Default fallback: `mistral-medium-3.5`. Embeddings: `gemini-embedding-2-preview` (3072d) — ТОЛЬКО для RAG. **Gemini генеративные модели выведены из стека (май 2026). OpenClaw УДАЛЕН**.
7. **Triple Token Architecture:** Personal (Local, 6-8 digits) WINS over Global (3 digits) over Network (2 digits). **Personal (Local) WINS over Global.**
8. **⛔ ЛОКАЛЬНЫЕ СБОРКИ И ТЕСТЫ ЗАПРЕЩЕНЫ.** Запуск `npm run build`, `npm run dev`, `vite build`, `npm test`, `python -m pytest` локально строго запрещён. Все проверки, билды и валидации выполняются ТОЛЬКО в CI/CD (GitHub Actions → Cloudflare Pages / Koyeb). Агенты работают исключительно через `git push` и мониторинг ранов.
9. **Hermes Family:** Core (Meta-Agent/Router), Behavior (Gestures/Clicks), Context (Docs/Code), Memory (AstraDB), Wallet (Obolos/Energy/LLM Cost).
10. **Hermes Router Architecture:** Гермес — оркестратор, не генератор. Классифицирует интенцию → выбирает лучшую LLM → оценивает стоимость → диспатчит запрос → агрегирует ответ. Поддерживает multi-LLM параллельные консультации.
11. **Currency Rates:** Гермес всегда знает актуальные курсы TON/USD/RUB через CoinGecko API + ExchangeRate API. Кэширует в KV + Memory.
12. **Contract State Machine:** Гермес ведёт клиента по фазам (draft → review → sorting → agreement → escrow). Каждая фаза имеет опорные фразы, условия перехода, цели.

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
- **Cloudflare Workers** — Hermes Router (hermes_router.js)
- **HermesAgent** (hermes.js) — Meta-Agent / Coordinator / Contract State Machine
- **HermesRouter** (hermes_router.js) — LLM Router + Cost Estimator + Currency Rates + Experience DB + Multi-LLM Dispatch
- **TriaOrchestrator** — Darwin Critic (A/B candidates), SUB_MODEL selection
- **MetaInstructionService** — системные инструкции как данные AstraDB
- **Auto-create collections** при старте: user_chat_sessions, tria_meta_instructions
- **Fallback на Mistral** при Gemini 429 (v0.20.265)

#### Эндпоинты Hermes Router:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/chat` | POST | Chat with Hermes (use_router=true для multi-LLM) |
| `/chat/stream` | POST | SSE streaming chat |
| `/llm-pool` | GET | Список доступных LLM с рейтингами |
| `/rates` | GET | Актуальные курсы TON/USD/RUB |
| `/cost-estimate` | POST | Оценка стоимости запроса |
| `/contract-state` | GET | Состояние контракта сессии |
| `/spec` | POST | Генерация структурированного ТЗ |
| `/satisfaction` | POST | Оценка удовлетворённости клиента |
| `/intent` | POST | Классификация намерения клиента |
| `/router-stats` | GET | Статистика роутера |

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
