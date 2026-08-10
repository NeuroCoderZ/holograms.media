# WEBGPU Migration: Three.js → Native WebGPU (Safe, Non-breaking)

**Owner:** Кими K2.6 (and subsequent agent wave)  
**Status:** Phase 0 completed 09.08.2026; Phase 1-3 частично выполнены де-факто в `js/engine/*`  
**Non-goal:** “Rewrite everything at once”.  
**Primary goal:** remove Three.js *only after* equivalent working WebGPU visuals + feature-flag fallback.

---

## 0) Guardrails (Mandatory for all agents)

### 0.1 Never break the current app
- Do **not** delete Three.js imports until WebGPU backend can fully replace required visuals.
- Use a **feature flag** / runtime selector to run:
  - `renderBackend = 'three' | 'webgpu' | 'hybrid'`

### 0.2 Every commit/PR must include an audit trail
Each PR/commit message + PR description must include:
- **Backend:** `three | webgpu | hybrid`
- **Migrated modules:** list exact folders/files
- **WGSL:** shaders added/changed (or explicitly: “none”)
- **Performance delta:** FPS / GPU time / draw calls (even if rough)
- **Tested with:** `renderBackend=three` and `renderBackend=webgpu`
- **Link:** relevant section in this file

### 0.3 Dual-render is allowed
Hybrid mode is encouraged during migration:
- keep legacy Three.js pipeline for features you haven’t ported
- progressively route specific layers (grid, trails, glass overlay, etc.) to WebGPU

---

## 1) Inventory (Phase 0 deliverable)

### 1.1 Required deliverable
Create the inventory table below **fully populated** by the agent:

2026-08-08 12:21 MSK — Инвентаризация выполнена на коммите `ab30945` (ветка `dev`) по
графу символов CodeGraph (`.codegraph/codegraph.db`, 8dfa9161 → HEAD: изменён только
`package.json`, граф актуален) + перекрёстная проверка `rg`/чтением файлов.

2026-08-09 18:00 MSK — **Ревизия на коммите `f80ebb71`.** После инвентаризации
прошли: удаление мёртвых папок `js/3d/webgpu/` и `js/webgpu/adapters/` (`3d103a42`),
3-буферный рефакторинг `InstancedColumns` (`30c1a492`, vertex/static/dynamic —
шина GPU 10× меньше), wasm-пересборка (`26efa8a8`), фикс тест-раннера (`cd4ac844`),
документация гологлифа (`f80ebb71`). Ниже — актуальные на сегодня цифры.

| Feature | Files | Three.js usage examples | Complexity (1-5) | Priority (P0-P3) | Status |
|---|---|---|---:|---|---|
| Scene setup / camera | `js/3d/sceneSetup.js` (571 стр.), `js/core/init.js:265` | `new THREE.Scene()`, `new THREE.OrthographicCamera(±w/2, ±h/2, 0.1, 2000)`, `new THREE.WebGLRenderer`, `three/examples/.../WebGPURenderer.js` | 4 | **P0** | 🟡 Three-only; native `HoloEngine` держит свою камеру (ortho `[-150,150,-20,280]`, eye `[0,128,0]`→`[0,128,75]`) — **две несинхронизированные камеры** |
| Hologram renderer | **актив:** `js/engine/HologramWebGPU.js` (353), `Engine.js` (219); **legacy:** `js/3d/hologramRenderer.js` (367) | legacy: `InstancedMesh`, `ShaderMaterial`, `BufferGeometry` | 3 | **P0** | ✅ **уже native WebGPU**. `HologramRenderer` импортируется (`init.js:209`), но **НИ РАЗУ не инстанцируется** → `state.hologramRendererInstance === null` (мёртвый код) |
| Grid / instanced columns | `js/engine/InstancedColumns.js` (257), `GridWireframe.js` (105), `columns.wgsl.js` (79); legacy `js/3d/hologramGridFactory.js` (165) | legacy: `LineSegments`, `SphereGeometry`, `InstancedBufferAttribute` | 2 | **P0** | ✅ **портировано** (см. «Instancing»); с `30c1a492` — 3-буферный лейаут |
| Glass / glassmorphism | `css/_variables.css`, `_panels.css`, `_modals.css` и др.; `js/ui/glassSpecularManager.js` | **нет** — чистый CSS `backdrop-filter` | 1 | **P3** | ✅ вне зоны миграции; `glassSpecularManager` = stub (`v0.20.226`, блики отключены для FPS) |
| Gesture trails / particles | — | **нет** (`THREE.Points` не встречается ни разу) | 1 | **P3** | ⬜ не реализовано; в Phase 3 п.1 значится как задача, а не как порт |
| Instancing | native: `InstancedColumns.js`; legacy: `hologramRenderer.js:109-122` | `new THREE.InstancedMesh(geo, mat, 128)` ×2, `aColumnScaleZ` | 2 | **P0** | ✅ **портировано**: 256 столбцов = 2 draw call; 3 буфера — vertex (куб) + static (5 float: basePos, scale, color) + dynamic (2 float: depth, pan) = **2048 Б/кадр вместо 20480 Б** (10×, `30c1a492`); матрица в WGSL, яркость `(bIndex+1)/128` |
| Picking / raycasting | `js/SmartHologram.js:169-174`, `js/core/threeImports.js:29` | `new THREE.Raycaster()`, `setFromCamera`, `ray.intersectPlane` | 3 | **P2** | 🟡 только проекция на плоскость; `intersectObject(s)` НЕ используется, `state.raycaster === null` → полноценного пикинга по мешам нет |
| Post-processing | — | **нет** (`EffectComposer`/`UnrealBloom` отсутствуют) | 1 | **P3** | ⬜ не реализовано; `beginRenderPass` в `engine/` — это WebGPU-проходы, не postFX |
| OrbitControls / camera controls | `js/3d/sceneSetup.js:2,149`, `js/SmartHologram.js:3,39` | `new OrbitControls(camera, renderer.domElement)` | 3 | **P1** | 🔴 Three-only, замены нет — **главный блокер Phase 4** |
| XR / WebXR integration | `js/xr/webxr_session_manager.js`, `xr_input_handler.js`, `js/platforms/xr/xrInput.js`, `sceneSetup.js`, `init.js` | `import * as THREE from 'three'`, `renderer.xr.enabled = true`, `PerspectiveCamera` для XR | 5 | **P1** | 🔴 Three-only. В native есть `Engine._perspective`, но `getCurrentProjection()` всегда возвращает ortho → XR в native не подключён; `webxr_session_manager` ссылается на `renderer.xr`, который не инстанцируется → XR-модуль фактически неактивен |

### 1.2 Three.js usage audit method (agent checklist)
- Search patterns:
  - `import * as THREE from 'three'`
  - `three/examples/jsm/*`
  - `new THREE.*` occurrences
- Produce:
  - list of entry points for Three renderer init
  - list of all “render-critical” subsystems (gesture -> visual mapping)

---

## 2) Existing WebGPU footholds (already present in repo)

The repo already contains partial WebGPU code paths/files (do not assume they are integrated fully). Agents must verify the current state:
- `js/engine/Engine.js` uses `navigator.gpu` and `getContext('webgpu')`
- `js/3d/webgpu/*` folder contains a native WebGPU renderer/shader placeholders — **УДАЛЕНА 08.08** (`3d103a42`), см. таблицу ниже
- `js/3d/sceneSetup.js` references Three’s `WebGPURenderer` from `three/examples`

**Action for agents:** determine which WebGPU implementation is active today and which is experimental.

2026-08-08 12:21 MSK — **Проверено. В репозитории живут ТРИ параллельные WebGPU-реализации,
из них боевая одна:**

| Путь | Что это | Кто импортирует | Вердикт |
|---|---|---|---|
| `js/engine/*` (`Engine.js`, `HologramWebGPU.js`, `InstancedColumns.js`, `GridWireframe.js`, `columns.wgsl.js`) | **Native WebGPU**: свой `device`/`context`, свои матрицы, свой WGSL, свой `requestAnimationFrame`-цикл | `js/core/init.js:267` — динамический `import('../engine/HologramWebGPU.js?v=444')` | ✅ **БОЕВАЯ.** Рисует всю голограмму: 256 столбцов + сетка + оси + сферы |
| `js/3d/webgpu/*` (`webgpu_renderer.js` 53 стр., `hologram_shader_webgpu.js` 27 стр.) | Заготовка нативного рендерера; тело `renderFrame` закомментировано | **никто** | ❌ **МЁРТВАЯ** — **УДАЛЕНА 08.08** (`3d103a42`) |
| `js/webgpu/*` (`interfaces/IRenderer.js`, `adapters/ThreeRendererAdapter.js`, `adapters/WebGPURendererAdapter.js`, `webgpu_rendererAdapterFactory.js`) | Контракт Phase 1 | **никто**; оба адаптера **целиком закомментированы**, фабрика — **файл 0 байт** | ❌ **МЁРТВАЯ** (Phase 1 фактически не сделана) — **УДАЛЕНА 08.08** (`3d103a42`) |
| `three/examples/jsm/renderers/webgpu/WebGPURenderer.js` в `sceneSetup.js:488-516` | WebGPU **через Three.js** (не native) | `js/3d/sceneSetup.js` | 🟡 **ЖИВАЯ** при `?renderBackend=webgpu`, с авто-fallback на WebGL |

2026-08-09 18:00 MSK — **После чистки `3d103a42` остались две реализации:** боевая
`js/engine/*` (native) и `three/examples` WebGPURenderer (через Three.js, только при
флаге `?renderBackend=webgpu`). Обе мёртвые папки удалены, дублирования нет.

2026-08-08 12:21 MSK — **Ключевой вывод, меняющий план миграции:** фактическое состояние
репозитория **опережает** документ. Phase 2 («отрисовать один примитив») и большая часть
Phase 3 п.1-2 (инстансированные столбцы + сетка) **уже выполнены** в `js/engine/`, минуя
Phase 1 (адаптеры). Приложение сейчас работает в **де-факто hybrid-режиме**:
Three.js держит `<canvas>` сцены/камеру/OrbitControls/XR, а поверх него вторым canvas
(`#holo-webgpu-canvas`, `z-index:100`, `pointer-events:none`, `alphaMode:'premultiplied'`)
native WebGPU рисует саму голограмму. Флага `renderBackend` этот native-слой **не слушает**
— он грузится всегда.

2026-08-08 12:21 MSK — **Расхождение флага с реальностью:** `resolveRenderBackendFlag`
(`sceneSetup.js:15-28`) принимает `three|webgpu|hybrid`, но ветка `hybrid` намеренно
сведена к WebGL (`sceneSetup.js:84`), тогда как реальный гибрид работает **всегда**,
независимо от флага. То есть значение `hybrid` сегодня семантически ложно.

---

## 2.1 Roadmap переезда: Three.js → WebGPU+WebXR (09.08.2026)

2026-08-09 18:00 MSK — **Стратегия одобрена Нейрокодером:** Three.js изымается
полностью, замена — нативный WebGPU + WebXR. AndroidXR — **не скоро** в работу:
это профессиональный рынок сбыта для реальных потребителей на этапе, когда XR
уже тестируется в деле, а не в теории и не на плоских мониторах. Ниже —
порядок шагов по блокерам (Phase 4 документа выше = финальный шаг).

2026-08-10 09:39 MSK — **Стратегия ужесточена (см. раздел 8 и `WEB_STACK.md`): ПОЛНЫЙ отказ
от Three.** Цель — согласованный стек WebGPU + WebXR + WebSocket + WebRTC
(`WEB_STACK.md` — целевая архитектура, оси, потоки данных, связный порядок).
Ниже — выполнение по связности, а не «выпиливание по файлу».

| Шаг | Что делаем | Где | Статус |
|-----|-----------|-----|--------|
| 1 | **Контроль камеры без Three** — drag/wheel/pinch → `Engine.orbit/setZoom` | `js/engine/Engine.js`, `js/core/gestures.js` | ✅ **DONE 10.08** (`a4551681`): wheel-зум добавлен (`zoomBy`), мёртвый `InteractionManager.js` удалён |
| 2 | **Одна камера-источник** — `state.camera` ↔ HoloEngine синхронны (убрать 2 несинхронизированные) | `js/3d/sceneSetup.js`, `js/3d/rendering.js`, `js/engine/Engine.js` | ✅ **DONE 10.08** (`5c454206`): `Engine.getCameraPose()`, rendering.js отражает позу HoloEngine в activeCamera (не-XR); + `docs/GLOSSARY.md` (единый словарь) |
| 3 | **Портировать слои (EarthZero/жесты) на граф HoloEngine** — разблокирует удаление `THREE.Scene` | `js/3d/sceneSetup.js`, `js/core/init.js`, `js/3d/EarthZero.js`, `js/core/gestures.js` | ⬜ БЛОКЕР для Шага 4 |
| 4 | **Удалить `THREE.Scene`/`OrthographicCamera`** из sceneSetup — перенос сцены завершён | `js/3d/sceneSetup.js` | ⬜ зависит от Шага 3 |
| 5 | **Picking нативный** — заменить `THREE.Raycaster` на луч в HoloEngine (по pan/depth из dynamic-буфера) | `js/SmartHologram.js`, `js/core/threeImports.js` | 🟡 P2 |
| 6 | **XR нативно** — `navigator.xr.requestSession` + `XRGPUBinding`; убрать `renderer.xr`. **Камера в XR:** орто — базово; **обратная (реверсивная) перспектива** — тестируется для XR (решение Нейрокодера 10.08) | `js/xr/webxr_session_manager.js`, `js/platforms/xr/xrInput.js` | 🔴 P1, зависит от Chrome WebGPU-XR |
| 7 | **Мультиплеер** — контракт состояния WebRTC/WS (`hologlyph-data`) над портом слоёв | `js/services/netHoloGlyphClient.js` | 🟡 сырой P2P |
| 8 | **Вычитка Three-импортов** по модулю: `hologramRenderer.js`, `hologramGridFactory.js`, `EarthZero.js`, `TorusVom.js`, `CochlearCylinder.js`, `SmartHologram.js` | все `js/3d/*`, `js/SmartHologram.js` | ⬜ механическая после зелёных 1-7 |
| 9 | **Финал** — удалить `three` из `package.json`, `threeImports.js`, сцену Three; `renderBackend='webgpu'` по умолчанию | весь репо | ⬜ = Phase 4 |

**Отдельная недоделка (вне шагов миграции):**
- `tests/unit/test_net_hologlyph_reconnect.test.js:68` — flaky-тест, асинхронная гонка:
  `client.connect()` создаёт сокет асинхронно, но тест читает `MockWS.created[0]`
  синхронно → `socket` = `undefined` → `TypeError: cannot read 'onopen'`.
  К камере/жестам отношения не имеет (NetHoloGlyphClient / WebSocket P2P).
  Зафиксирован 10.08.2026; чинить при работе над Шагом 7.

**Порядок задан связностью (см. `WEB_STACK.md`):** камера уже без Three (Шаг 1);
Шаг 2 убирает рассинхрон камер; Шаг 3 портирует слои на граф HoloEngine — это
разблокирует Шаг 4 (удаление `THREE.Scene`). Дальше picking (5), XR (6),
мультиплеер (7), механическая вычитка (8), финал (9).

---

## 3) Migration architecture (Phase 1 deliverable)

### 3.1 Required: adapter interfaces
Create a minimal renderer contract:

- `IRenderer`:
  - `init()`
  - `resize(width,height,dpr)`
  - `renderFrame(frameParams)`
  - `destroy()`
- `ISceneGraph` / `IHoloScene`:
  - `update(sceneState)` (gesture positions, grid heights, etc.)
- `IGeometryFactory`:
  - geometry creation helpers
- `IMaterialSystem`:
  - glass/hologram shader pipelines

### 3.2 Required: dual backend flag
Add a single source of truth, e.g.
- `appState.renderBackend` or config env:
  - `'three' | 'webgpu' | 'hybrid'`

**Behavior rules:**
- If WebGPU unsupported: automatically fallback to `three`
- If WebGPU init fails: fallback to `three` and log once

---

## 4) Migration phases (strict order)

### Phase 0 — Inventory + Migration blueprint (ONLY this now)
- Create `WEBGPU_MIGRATION.md` fully (fill table)
- Identify priorities & critical path
- Output: “first safe WebGPU object” plan (which feature to port first)

**Success criteria:**
- `WEBGPU_MIGRATION.md` table completed
- Agent can answer: what is P0, what blocks picking, what blocks gesture trails

---

### Phase 1 — Abstraction + Dual-render layer
- Implement interfaces (`IRenderer` etc.)
- Implement:
  - `WebGPURendererAdapter` (native WebGPU)
  - `ThreeRendererAdapter` (wrap current Three pipeline)
- Add runtime flag `renderBackend`

**Success criteria:**
- app runs in all three modes without crash
- visual output in `three` mode is unchanged

---

### Phase 2 — WebGPU Skeleton
- Implement `WebGPUContext`
- Implement a working render loop + pipeline creation + shader binding
- Render **one** simple primitive (triangle/cube) in the target canvas
- Integrate resize

**Success criteria:**
- At least one primitive renders via native WebGPU

---

### Phase 3 — ROI migration (by priority)
Port features in this order (agents may adjust only after approval):
1. Gesture trails + instanced columns
2. Holographic grid (128^3 / or equivalent constraints)
3. Main scene layout + camera
4. Materials (glass / holographic effect)
5. Picking / raycasting
6. Particle systems
7. Post-processing

**Success criteria:**
- Each port has measurable “works visually” and does not break gesture pipeline

---

### Phase 4 — Full disable Three.js
- Remove/disable Three imports for runtime (keep as fallback for 1-2 releases)
- Only after:
  - picking works
  - glass/hologram materials match closely
  - gesture visuals match and performance is acceptable

**Success criteria:**
- `renderBackend='webgpu'` is stable and default

---

## 5) Agent PR template (copy/paste)

**PR Title:** [webgpu] Phase X - <feature>

**Backend:** `three | webgpu | hybrid`  
**Migrated modules:**  
- <list files/folders>

**WGSL changes:**  
- Added: <files>  
- Modified: <files>  
- None

**Performance delta:**  
- FPS: <before → after>  
- GPU time: <before → after or “N/A”>  
- Draw calls: <before → after or “N/A”>

**Tests:**  
- Tested with `renderBackend=three`: ✅ / ❌ (notes)  
- Tested with `renderBackend=webgpu`: ✅ / ❌ (notes)

**Notes / risks:**  
- <what could break>

**Docs:**  
- Updated `WEBGPU_MIGRATION.md` section: <anchor>

---

## 6) Minimal “evidence” logging for migration
Agents must log:
- chosen backend
- WebGPU support status
- shader compile / pipeline errors
- frame time rolling average (even if simple)

Example log prefix:
- `[WEBGPU][init] …`
- `[WEBGPU][render] frameMs=…`
- `[WEBGPU][fallback] reason=…`

---

## 7) Rollback strategy
If native WebGPU causes regressions:
- flip runtime flag to `three`
- keep last working adapter commit
- do not delete code paths until stable release

---

## 8) Current Next Action

2026-08-10 09:22 MSK — **Стратегия ужесточена Нейрокодером: ПОЛНЫЙ ОТКАЗ от Three.js.**
Девиз этапа: «Нахуй Three!». Three.js НЕ используется даже для окружения (сцены,
камеры, пикинга, XR). Обоснование (подтверждено 08.08, актуально):
- зеркальный граф голограммы (2D-параллелепипед + 3D-тор) у Three как единого целого
  разваливается, в нативном WebGPU — одна строка шейдера;
- граф проекта простой (примитивы: тор/параллелепипед/колонки/сетка/сферы/эхо) —
  менеджер сцены Three избыточен;
- гибрид «две камеры / два canvas / два рендера» — источник багов (depth-текстура,
  несинхронизированные камеры). Убираем его → класс проблем исчезает;
- XR достигается стандартным веб-API (`navigator.xr` + `XRGPUBinding`), Three — лишь
  тонкая обёртка; сеть (socket/RTC) — ортогональна, к Three не относится.

**Решение: все задачи закрываются нативным WebGPU + WebXR + Socket/RTC.
Three не обязателен нигде. Резервный план «three для окружения» отменён.**

Следующий шаг — **Шаг 1 roadmap: контроль камеры без Three** (порт OrbitControls на
`Engine.orbit`: входы drag/wheel/pinch → свой орбит-контроллер). За ним — Шаг 2
(одна камера вместо двух), Шаг 3 (нативный picking), Шаг 4 (XR на `navigator.xr`),
Шаг 5 (вычитка Three-импортов), Шаг 6 (финал — `three` из package.json).

---

## 9) Журнал: разблокировка dev-стенда (08.08.2026)

2026-08-08 12:53 MSK — **Симптом:** `https://dev.holograms.media/` «зависал на глазе»
(EyeLoader), голограмма не появлялась. В консоли: `[Main] Platform: Telegram Mini App` →
`[Core] TG mode — skipping 3D scene, WebGPU, MediaPipe` →
`Animation loop cannot start: renderer is missing`.

2026-08-08 12:53 MSK — **Корневая причина (баг продакшна, не локальный):** скрипт
`https://telegram.org/js/telegram-web-app.js` (подключён в `index.html:18`) создаёт объект
`window.Telegram.WebApp` **в ЛЮБОМ браузере**, а не только внутри Telegram. Проверка
`!!(window.Telegram && window.Telegram.WebApp)` поэтому **всегда возвращала `true`**, и
приложение уходило в TG-режим для **всех обычных веб-посетителей** — 3D-сцена, WebGPU и
MediaPipe не инициализировались. Замер на живом dev-стенде через CDP:
`platform: "unknown"`, `initData: ""` (длина 0), старый детектор → `true`, новый → `false`.

2026-08-08 12:53 MSK — **Проверка по первоисточнику:** документация
`core.telegram.org/bots/webapps` — «`platform` — The name of the platform of the user's
Telegram app», `initData` — «A string with raw data transferred to the Mini App».
Вне Telegram: `platform = "unknown"`, `initData = ""`.

2026-08-08 12:53 MSK — **Исправление:** добавлен модуль `js/core/telegramEnv.js`
(`isTelegramMiniApp()` + `describeTelegramEnv()`), проверяющий 4 признака по убыванию
надёжности: непустой `initData` → непустой `initDataUnsafe` → `platform !== 'unknown'` →
маркер `tgWebApp*` в URL-хэше. На него переведены все 5 мест ложной проверки:
`js/main.js`, `js/core/platformDetector.js`, `js/core/auth.js`,
`js/core/consentManager.js`, `js/services/gestureIntentClient.js`.
Диагностика причины решения теперь печатается в лог `[Main] Platform: ...`.

2026-08-08 12:53 MSK — **Тесты:** `tests/unit/telegramEnv.test.mjs` (запуск:
`node tests/unit/telegramEnv.test.mjs`) — 9/9 passed. Покрыты: обычный браузер со
скриптом Telegram (тот самый баг), браузер без скрипта, `Telegram` без `WebApp`,
настоящие Android/tdesktop/weba, `initDataUnsafe`-кейс и запуск с `#tgWebAppData=...`.

2026-08-08 12:53 MSK — **Побочная находка (инфраструктура, не код):** из России
Cloudflare рвёт HTML-ответ dev-стенда на ~19-20 КБ из 50.7 КБ (три прямых запроса подряд:
`http=200 size=19139 time=12.0s` — обрыв по таймауту), через mihomo-прокси
(`http://127.0.0.1:7890`) — `size=50748 time=0.4s`. То есть «зависание» усугублялось
обрывом загрузки на сетевом уровне. Для отладки dev-стенда браузер обязан ходить через
прокси.

2026-08-08 12:53 MSK — **Состояние бэкенда:** FastAPI на Koyeb
(`holograms-media-dev-holograms-media-cb8383e3.koyeb.app`) засыпает; первый запрос — 45 с
холодного старта, далее ~0.3 с. Корректный health-путь — **`/healthz`**
(`{"status":"ok","message":"FastAPI is healthy"}`); `/health` и `/api/v1/health` отдают
404. Перед тестами стенд нужно «будить» запросом на `/healthz`. Neon в проекте
не используется (подтверждено Нейрокодером 08.08.2026).

2026-08-08 12:53 MSK — **Осторожно, ловушка репозитория:** рабочая копия лежит на
windows-монтировании (`/mnt/windows/...`). Файлы в git хранятся с **LF**, а запись
редактором может переписать их целиком в **CRLF** — тогда diff распухает до сотен
фиктивных строк (наблюдалось: 762 изменения вместо 24). После правки проверять
`git diff --stat` и при необходимости возвращать LF.

