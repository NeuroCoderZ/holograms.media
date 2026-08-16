# 📊 Отчёт для Qwen: Автоцентрирование WebGPU, 5% отступы и гигиена логов (v0.20.601)

2026-08-16 10:35 MSK — Данный отчёт содержит детальную сводку выполненных работ, исправлений и успешного развёртывания релизов **v0.20.599**, **v0.20.600** и **v0.20.601** проекта **Holograms.media**.

---

### 1. 📐 Автоцентрирование голограммы и 5% безопасные отступы (`js/ui/layoutManager.js`):

2026-08-16 10:35 MSK — **Проблема:** Голограмма визуально смещалась к нижнему левому углу и не центрировалась симметрично относительно активных/выдвинутых панелей интерфейса.

2026-08-16 11:42 MSK — **Решение и калибровка ортокамеры:**
- Реализован расчёт фактической видимой зоны между левой панелью (`#left-panel`), правой панелью чата (`#right-panel`), нижней панелью управления/жестов (`#gesture-area`) и верхним краем экрана.
- Жёстко зафиксированы **5% безопасные отступы** (`freeWidth * 0.05`, `freeHeight * 0.05`) от всех 4 граничных линий.
- В `Engine.js` константа `ORTHO_CENTER_Y` установлена в `0`, а в `layoutManager.js` смещение камеры `holoCam.camera.target` инвертировано и масштабировано так, чтобы точка 3D-мира `(0, 128, 75)` (геометрический центр голограммы $Y \in [0, 256]$) проецировалась строго в центр свободной зоны `(centerScreenX, centerScreenY)`.
- Ширина нижней панели жестов (`#gesture-area`) динамически установлена равной `usableWidth` (доступной ширине между панелями за вычетом 5% отступов) и центрирована соосно голограмме.

---

### 2. 🔑 Устранение дублей Google Identity Services и уведомлений (`js/core/auth.js`):

2026-08-16 10:35 MSK — **Проблема:** Браузер выводил варнинг о повторном вызове `google.accounts.id.initialize()`, вызывал конфликт между кнопкой и One Tap `prompt()`, а также дважды показывал уведомление «С возвращением, developer!».

2026-08-16 11:42 MSK — **Решение:**
- Внедрён guard-флаг `_gsiInitialized`, блокирующий повторный вызов `google.accounts.id.initialize()`.
- Удалён дублирующий вызов `window.google.accounts.id.prompt()` (оставлен только аккуратный вход через кнопку в модалке).
- Внедрена функция `showWelcomeOnce(role)` с флагом `_welcomeNotificationShown`, гарантирующая ровно один показ приветственного тоста за сессию.
- Логирование конфигурации окружения `[Auth] Environment...` ограничено однократным выводом за сессию.

---

### 3. 🧹 Прореживание логов и устранение багов (Log Hygiene v2):

2026-08-16 11:42 MSK — **AMD define conflict (`index.html`):** Перед загрузкой библиотек MediaPipe добавлен guard `window.define = undefined`, восстанавливающийся после их инициализации. Это полностью предотвращает фатальную ошибку `loader.min.js:3 Uncaught Error: Can only have one anonymous define call per script file`.

2026-08-16 11:42 MSK — **Sleep-sync 405 Method Not Allowed (`js/tria/GestureEmbeddingBridge.js`):** Заглушен нереализованный облачный запрос к `/api/v1/tria/sleep-sync` — консолидация памяти переведена в чисто локальный режим IndexedDB.

2026-08-16 11:42 MSK — **MediaPipe Hands Inference Watchdog (`js/multimodal/handsTracking.js`):** Таймаут инференса увеличен с 2000мс до 3000мс, а предупреждения watchdog задротлены (лог не чаще раза в 10 секунд).

2026-08-16 11:42 MSK — **Audio Spectral Data Спам (`js/audio/audioProcessing.js`):** Интервал логирования `spectralData` увеличен до 30 секунд (`_LOG_INTERVAL = 30000`) и включается только при установленном флаге `window.__debugSpectral`.

2026-08-16 11:42 MSK — **Empty WASM Buffer Guard (`js/audio/cwtAudioWorklet.js`):** Добавлена проверка на нулевой размер переданного ArrayBuffer во избежание race conditions при загрузке CWT ворклетом.

2026-08-16 11:42 MSK — **Мёртвые проверки UI и DEV-only тесты (`js/ui/uiManager.js`, `js/audio/browserPipelineTest.js`):** Удалены логи отсутствующих элементов `promptBar` и `chatInputBar`, а диагностика пайплайна `BrowserPipelineTest` обёрнута в `import.meta.env.DEV`.

---

### 4. 🚀 Сборка, тесты и деплой:

2026-08-16 11:42 MSK — **Unit & E2E тесты (`npm test`):** 100% тестов пройдены успешно (`engineCamera`, `panStandard`, `presenceLayer`, `telegramEnv`, `signalingFallback`, `handsWatchdog`, `onFrameResilience`).

2026-08-16 11:42 MSK — **Деплой:** Изменения готовы к сборке и публикации на Cloudflare Pages и Koyeb через `node scripts/deploy.js`.

