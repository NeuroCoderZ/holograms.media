# 📊 Отчёт для Qwen: Гигиена логов, 5% автоцентрирование WebGPU и устранение дублей (v0.20.597)

2026-08-15 21:11 MSK — Данный отчёт содержит детальное описание исправлений и архитектурных улучшений в кодовой базе **Holograms.media**, реализованных в релизе **v0.20.597**.

---

### 1. 📐 Автоцентрирование голограммы и 5% отступы (`js/ui/layoutManager.js`):
- **Проблема:** Голограмма визуально смещалась в нижний левый угол и не центрировалась относительно выдвижных панелей.
- **Решение:**
  - Реализован динамический расчёт видимой свободной рабочей зоны между левой панелью (`#left-panel`), правой панелью чата (`#right-panel`), нижней строкой управления/жестов (`#gesture-area`) и верхним краем экрана.
  - Жёстко зафиксированы **5% безопасные отступы** (`marginX = freeWidth * 0.05`, `marginY = freeHeight * 0.05`) от всех активных границ.
  - Смещение ортокамеры HoloEngine (`holoCam.camera.target`) теперь точно проецирует центр 3D-голограммы в геометрический центр свободной зоны `(centerScreenX, centerScreenY)` при любых состояниях (свёрнуто/развёрнуто) и масштабирует её без искажения пропорций.

---

### 2. 🔑 Устранение дублей Google Identity Services и уведомлений (`js/core/auth.js`):
- **Проблема:** В консоль выводился варнинг `[GSI_LOGGER]: google.accounts.id.initialize() is called multiple times`, появлялось два запроса на авторизацию (кнопка + One Tap) и дважды всплывала плашка «С возвращением, developer!».
- **Решение:**
  - Внедрён флаг защиты `_gsiInitialized`, блокирующий повторный вызов `google.accounts.id.initialize()` при 401 перехватах.
  - Удалён дублирующий вызов `window.google.accounts.id.prompt()` (оставлена только аккуратная кнопка в модальном окне).
  - Внедрена функция `showWelcomeOnce(role)` с флагом `_welcomeNotificationShown`, гарантирующая ровно один показ приветственного тоста за сессию.
  - Логирование `[Auth] Environment...` в `getAuthConfig()` ограничено однократным выводом за сессию через `_authConfigLogged`.

---

### 3. 🧹 Прореживание мусорных логов (Log Hygiene):
- **MediaPipe WASM спам (`js/multimodal/handsTracking.js`):** Перехвачены и заглушены внутренние потоки `window.Module.print` и `printErr`, исключив спам `still waiting on run dependencies` и `gl_context` C++ ядра.
- **Telegram WebApp SDK (`index.html`):** Перед вызовом `tg.ready()` выставлен `tg.debug = false`, что убрало вывод 8 системных событий `web_app_set_header_color` и `web_app_request_theme`.
- **WebSocket Reconnects (`js/tria/TriaCollectiveService.js`):** Промежуточные попытки реконнекта переведены в silent-режим; в консоль пишется только первая фиксация обрыва и финальный статус работы на HTTP-фолбэке.
- **Lethe Memory Obolos (`js/tria/MaturityDaemon.js`):** Батч обновления девальвации ограничен 500 блоками за цикл; лог `[Lethe] Девальвация Obolos` выводится только при реальном обновлении (`updatedCount > 0`).

---

### 4. 🚀 Верификация и деплой:
- **Unit & E2E тесты (`npm test`):** 100% тестов успешно пройдены (камера `engineCamera`, панорама `panStandard`, `presenceLayer`, `telegramEnv`, `signalingFallback`).
- **Релиз:** Сборка **v0.20.597** успешно отправлена в Git репозиторий (`dev -> dev`) и развёрнута на Cloudflare Pages (`dev.holograms.media`).
