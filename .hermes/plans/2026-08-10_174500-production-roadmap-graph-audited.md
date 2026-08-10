# holograms.media — Глобальный план до публичной продакшн-версии

> **Составлен:** 2026-08-10 17:45 MSK · **Версия:** v0.20.582 · **Ветка:** `dev`
> **Основан на:** свежих графах CodeGraph (424 файла, 3779 узлов) + Graphify (7084 связи),
> кросс-валидированных реальным `grep` по репозиторию.
> **Исполнители:** Hermes на Claude Opus 5 (код, архитектура) + Qwen3.8-Max (анализ объёмов).

**Цель:** публичная продакшн-версия — полный уход с Three.js на WebGPU+WebXR, рабочий
мультиплеер, отсутствие мёртвого кода, затем токеномика.

---

## Раздел 0. Аудит по графам — что показали данные

2026-08-10 17:45 MSK

**Методика.** CodeGraph синхронизирован (`codegraph sync` → 424 файла: 226 JS + 185 Python).
Graphify-граф: 3779 узлов, 7084 связи. Кандидаты в мёртвый код найдены по нулевой входящей
степени, затем **каждый перепроверен `grep`** по всему репозиторию — включая динамические
`import()` с query-строкой, ссылки из HTML и service worker.

**Почему кросс-валидация обязательна.** Первый прогон записал в мёртвые `js/engine/HologramWebGPU.js` —
ядро WebGPU-рендера. На деле он импортируется в `js/core/init.js:266` как
`await import('../engine/HologramWebGPU.js?v=444')`, и regex по имени файла этого не поймал.
Вывод: **граф даёт кандидатов, решение принимает grep**.

### 0.1 Подтверждённый мёртвый код: 42 файла, 4503 строки

2026-08-10 17:45 MSK

Ни одного упоминания вне самого файла (проверено по `js/`, `tests/`, `index.html`, `sw.js`,
`vite.config.js`, `package.json`).

**Крупные (>150 строк):**

| Строк | Файл | Примечание |
|---|---|---|
| 335 | `js/platforms/desktop/desktopInput.js` | целый слой ввода не подключён |
| 275 | `js/core/threeImports.js` | центральный Three-агрегатор — удалить на Шаге 9 |
| 239 | `js/platforms/xr/xrLayout.js` | в логе браузера есть `[XrLayout]` → **проверить вручную** |
| 236 | `js/audio/pipelineSelfTest.js` | самотест аудио |
| 220 | `js/managers/GestureRecordingManager.js` | запись жестов |
| 212 | `js/core/resizeHandler.test.js` | тест вне раннера |
| 212 | `js/services/scannerService.js` | дубль `js/multimodal/hologramScanner.js` (живой хаб, 40 вх.) |
| 211 | `js/audio/waveletAnalyzer.js` | |
| 206 | `js/ui/GesturesListDisplay.js` | |
| 204 | `js/managers/HologramManager.js` | Three-зависимый |
| 173 | `js/ui/MiniEyeLoader.js` | дубль `EyeLoader` |
| 157 | `js/platforms/desktop/desktopLayout.js` | |

**Средние (40–150):** `core/ui/chatUI.js` 144, `services/websocketService.js` 140,
`platforms/mobile/mobileInput.js` 137, `panels/hologramPanelManager.js` 136,
`tria/tria_worker.js` 125, `services/hologlyphService.js` 108, `services/hermesService.js` 81,
`engine/columns.wgsl.js` 79, `multimodal/voice_input.js` 79, `utils/perfMonitor.js` 77,
`core/SQLiteEmbeddingService.js` 69, `legacy-bridge.js` 65, `config/cloudConfig.example.js` 60,
`tria/TriaDeltaExporter.js` 59, `ai/magentaService.js` 54, `core/appStatePersistence.js` 54,
`ai/ModernChatInterface.js` 53, `ui/gestureAreaVisualization.js` 53, `core/TriaBiosService.js` 45,
`xr/xr_input_handler.js` 44, `ui/MyGesturesPanel.js` 43.

**Мелкие и пустые:** `agents/SynthesisAgent.js` 39, `platforms/xr/xrInput.js` 35,
`agents/MemoryAgent.js` 22, `ui/gestureAreaManager.js` 12, `ui/mainUI.js` 9,
`core/3d/audioVisualizer.js` 1, и три файла **нулевой длины**:
`agents/AudioAgent.js`, `agents/OrchestrationAgent.js`, `agents/VisualAgent.js`.

**Важно:** `js/engine/columns.wgsl.js` в списке — при этом WGSL-шейдеры колонок живут
в `HologramWebGPU.js`. Перед удалением сверить, не потеряется ли рабочий шейдер.

### 0.2 Дубли (одна функция в двух местах)

2026-08-10 17:45 MSK

Граф выявил параллельные реализации — живёт одна, вторая мёртвая:

| Живой | Мёртвый дубль |
|---|---|
| `js/multimodal/hologramScanner.js` (хаб, 40 вх.) | `js/services/scannerService.js` |
| `js/multimodal/handsTracking.js` | `js/core/multimodal/handsTracking.js` |
| `js/ui/EyeLoader.js` | `js/ui/MiniEyeLoader.js` |
| `js/tria/SpectralInpainter.js` | `js/audio/SpectralInpainter.js` |
| `js/ai/StreamingQuant.js` | `js/core/StreamingQuant.js` |

Ветка `js/core/{ui,multimodal,audio,3d,services}/` — целиком legacy-слепок структуры `js/`.

### 0.3 Хабы — точки максимального риска

2026-08-10 17:45 MSK

Изменения здесь задевают весь проект (входящих связей):

```
74 ← js/tria/GestureVectorStore.js      45 ← js/managers/gestureManager.js
68 ← js/core/init.js                    43 ← js/core/eventBus.js
51 ← js/core/EarthStorage.js            42 ← js/engine/Engine.js
46 ← js/config/hologramConfig.js        40 ← js/multimodal/hologramScanner.js
```

`js/core/init.js` — одновременно хаб (68 вх.) и Three-зависимый: расшивать осторожно.

### 0.4 Three.js — 21 файл по графу

2026-08-10 17:45 MSK

Фронтенд (15): `3d/sceneSetup.js`, `3d/hologramRenderer.js`, `3d/hologramGridFactory.js`,
`3d/TorusVom.js`, `core/init.js`, `core/threeImports.js`, `core/events.js`,
`core/domEventHandlers.js`, `core/resizeHandler.js`, `config/hologramConfig.js`,
`managers/HologramManager.js`, `xr/webxr_session_manager.js`, `audio/3d_spatializer.js`,
`audio/GestureSynthesizer.js`, `engine/Engine.js` (только `ref_three` в комментарии).

Из них **мёртвые** (можно снять сразу, без портирования): `core/threeImports.js`,
`managers/HologramManager.js`. Остальные требуют миграции.

Также в графе `backend/core/models/hologlyph_models.py` и `hologram_models.py` ссылаются
на three-термины — это модели данных, к рендеру отношения не имеют.

---

## Раздел 1. Спринт 1 — БЛОКЕРЫ ЗАПУСКА (сейчас)

2026-08-10 17:45 MSK

Без них публичной версии нет: приложение не работает у пользователя.

### 1.1 WebGPU-адаптер = null на Linux/AMD ⛔

**Симптом:** «WebGPU-адаптер недоступен», голограмма не рендерится.

**Установлено:** `chrome://gpu` показывает `WebGPU: Hardware accelerated`, но
**`Vulkan: Disabled`** и запись `Disable webgpu on vk via gl interop`. При этом Vulkan
в системе исправен: `RADV KRACKAN1` (Radeon 840M), Mesa 26.0.3, `radeon_icd.json` на месте.
В headless-пробе адаптер `null` без флагов и **OK** с `--enable-features=Vulkan
--enable-unsafe-webgpu`. Значит железо ни при чём — **Chrome не отдаёт адаптер**.

**Шаги:**
1. Снять `chrome://gpu` на десктопном Chrome с `--enable-features=Vulkan --ignore-gpu-blocklist`.
2. Проверить воспроизводимость на смартфоне (Android) — там другой стек.
3. **Деградация вместо ошибки:** нет адаптера → не «ошибка HoloEngine», а понятный экран
   с инструкцией + WebGL-фолбэк, если он ещё жив.
4. Тест `tests/unit/engineAdapterFallback.test.mjs`: при `requestAdapter → null` движок
   возвращает статус, а не бросает исключение.

**Файлы:** `js/engine/Engine.js:194-220`, `js/engine/HologramWebGPU.js`, `js/main.js`.

### 1.2 WebSocket-сигналинг рвётся (code 1006)

Из консоли: `wss://dev.holograms.media/ws/signaling` → `failed`, `closed code: 1006`,
реконнекты по кругу. Проверить проксирование WS через Cloudflare → Koyeb, роут
`backend/routers/signaling.py`, ограничить спам реконнектов.

### 1.3 HTTP-сигналинг отсутствует

Клиент стучится в `<host>/{roomId}/poll`, но на бэкенде **только WebSocket-роуты**.
`/poll` и `/send` не существуют → long-poll всегда 404, ошибка гасится в `catch`.
Добавить `POST /signaling/{room_id}/send` и `GET /signaling/{room_id}/poll` (очередь
в памяти комнаты), затем парную отправку на клиенте.

**Файлы:** `backend/routers/signaling.py`, `js/services/netHoloGlyphClient.js:343-360`.

---

## Раздел 2. Спринт 2 — ВЕЛИКАЯ ЧИСТКА (4503 строки)

2026-08-10 17:45 MSK

Дешёвый и безопасный выигрыш: удаляем то, что доказанно никто не использует.
Делать **до** миграции — меньше кода портировать.

**Порядок (от безопасного к рискованному):**

1. **Волна 1 — пустые и однострочные (6 файлов):** три пустых агента, `mainUI.js`,
   `core/3d/audioVisualizer.js`, `ui/gestureAreaManager.js`. Риск нулевой.
2. **Волна 2 — legacy-ветка `js/core/{ui,multimodal,audio,3d,services}/`:** слепок структуры,
   живут дубли в `js/`. Сверить попарно, удалить мёртвую половину.
3. **Волна 3 — платформенные слои:** `platforms/desktop/*`, `platforms/mobile/*`,
   `platforms/xr/*` (866 строк). **Сначала выяснить**, почему не подключены: это
   недоделка или сознательно отключено. `[XrLayout]` виден в логе браузера — проверить руками.
4. **Волна 4 — сервисы и UI:** `scannerService`, `websocketService`, `hologlyphService`,
   `hermesService`, `GesturesListDisplay`, `MiniEyeLoader`, `chatUI`, `promptManager`.
5. **Волна 5 — Three-мёртвые:** `core/threeImports.js`, `managers/HologramManager.js` —
   удалить вместе с Шагом 9.

**Протокол каждой волны:** удалить → `npm test` (10/10) → `npm run deploy "..."` → проверить
стенд. Откат — один `git revert`.

**Проверено вручную (флаги риска сняты, 17:48 MSK):**
- `js/engine/columns.wgsl.js` — **безопасен к удалению**. Это дубль эпохи миграции GLSL→WGSL;
  боевые шейдеры живут прямо в `HologramWebGPU.js` (собственные `@vertex`/`@fragment`
  на строках 205-270 + `createShaderModule` на 124). Импорта `columns.wgsl` нет нигде.
- `js/platforms/xr/xrLayout.js` — **мёртв**. Единственное совпадение по слову «XrLayout»
  во всём репозитории — комментарий в `js/ui/panelManager.js:33`. Строки `[XrLayout]`
  в логе браузера пришли со **стенда старой версии**, а не из текущего кода.

---

## Раздел 3. Спринт 3 — ЗАВЕРШЕНИЕ МИГРАЦИИ

2026-08-10 17:45 MSK

### 3.1 Шаг 6: XR нативно 🔴 P1 (разблокирует Шаг 4)

**Установлено по графу:** `Engine._perspective` существует, но `getCurrentProjection()`
**всегда** возвращает ortho → XR в native не подключён. `webxr_session_manager` ссылается
на `renderer.xr`, который не инстанцируется → модуль фактически неактивен.

Шаги: переключение ortho↔perspective по режиму; `navigator.xr.requestSession` + `XRGPUBinding`;
убрать зависимость от `renderer.xr`; реверсивная перспектива (решение Нейрокодера 10.08).

### 3.2 Шаг 4: удалить `THREE.Scene` / `OrthographicCamera`

Блокер: `state.scene` нужен `cameraManager` (null-гард XR) и `init.js` (TorusVOM).
Только после 3.1.

### 3.3 Шаг 8: дочистить Three (оставшиеся живые файлы)

Порядок по зависимостям: `TorusVom.js` → `hologramGridFactory.js` → `hologramRenderer.js`
→ `sceneSetup.js` → `core/init.js`. Последним — `core/events.js`, `resizeHandler.js`,
`domEventHandlers.js`, `config/hologramConfig.js`.

### 3.4 Шаг 9: финал

Убрать `three` из `package.json`, удалить `threeImports.js`, `renderBackend='webgpu'`
по умолчанию. **Критерий:** `grep -rl "from 'three'" js/` → пусто.

---

## Раздел 4. Спринт 4 — КАЧЕСТВО

2026-08-10 17:45 MSK

- **Спека ≠ реализация.** `docs/RU/05_NetHoloGlyph_P2P_Protocol.md` обещает QJL-сжатие
  и постквантовый ML-KEM; в коде — `JSON.stringify` по WebRTC без шифрования и сжатия.
  Решить: реализовать или переписать документ честно.
- **Пользовательское соглашение** (`js/core/consentManager.js`) — текст и UX галочки.
- **Безопасность:** 138 уязвимостей Dependabot (5 critical, 64 high) — разобрать critical+high.
- **Тесты:** покрыть Engine (адаптер/проекции), сигналинг, EyeLoader, жесты.

---

## Раздел 5. Спринт 5 — ПРОДАКШН

2026-08-10 17:45 MSK

- Прод-домен и окружение (сейчас только `dev.holograms.media`).
- Lighthouse, бюджет FPS, замер до/после чистки.
- Мобильный сценарий: смартфон + ноут в разных сетях — **нужен TURN**, иначе WebRTC не пробьётся.
- Живой e2e мультиплеера на двух аккаунтах Google.
- README и онбординг для публики.

---

## Раздел 6. После продакшна — ТОКЕНОМИКА

2026-08-10 17:45 MSK

Целевая формула упоминалась в документах проекта — найти, свести с токеномикой
**NeuroEscrow** на **GRAM** (бывший TON). Файл: `TOKENOMICS.md`.

---

## Правила работы (обязательны)

2026-08-10 17:45 MSK

1. **Деплой только `npm run deploy "сообщение"`** — бампает версию. Прямой `git push` — нарушение.
2. **Локальных сборок не делать** — только CI.
3. **Repomix только txt** во всех проектах NeuroCoderZ.
4. **Логи не читать целиком** — `grep -nEi`, затем точечно.
5. **Тесты перед деплоем:** `npm test` (сейчас 10/10).
6. **Даты в документации:** каждый абзац с `YYYY-MM-DD HH:MM MSK`.
7. **Граф — гипотеза, grep — доказательство.** Не удалять по одному лишь графу.
8. **Не выдумывать API** — сверяться с исходником (урок: несуществующие `/poll`, `/send`).

## Разделение труда

| Кто | Что |
|---|---|
| **Qwen3.8-Max** | Анализ `repomix-output.txt`, разбор больших логов, поиск дублей и несогласованностей, вычитка документации |
| **Opus 5** | Правки кода, архитектура, отладка, ревью находок Qwen, деплой |

Причина: чтение 694K-токенного репомикса и тысяч строк логов на Opus 5 — прямое транжирство.

**Письмо-онбординг для Qwen:** `docs/QWEN_ONBOARDING.md` (составлено 10.08.2026).
