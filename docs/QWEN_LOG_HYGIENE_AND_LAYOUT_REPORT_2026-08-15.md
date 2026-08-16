# 📊 Отчёт для Qwen: Автоцентрирование WebGPU, 5% отступы и гигиена логов (v0.20.599)

2026-08-16 10:35 MSK — Данный отчёт содержит детальную сводку выполненных работ, исправлений и успешного развёртывания релиза **v0.20.599** проекта **Holograms.media**.

---

### 1. 📐 Автоцентрирование голограммы и 5% безопасные отступы (`js/ui/layoutManager.js`):
- **Проблема:** Голограмма визуально смещалась к нижнему левому углу и не центрировалась симметрично относительно активных/выдвинутых панелей интерфейса.
- **Решение:**
  - Реализован расчёт фактической видимой зоны между левой панелью (`#left-panel`), правой панелью чата (`#right-panel`), нижней панелью управления/жестов (`#gesture-area`) и верхним краем экрана.
  - Жёстко зафиксированы **5% безопасные отступы** (`freeWidth * 0.05`, `freeHeight * 0.05`) от всех 4 граничных линий.
  - Камера `HoloEngine` ортопроекции (`holoCam.camera.target`) теперь динамически наводится ровно в геометрический центр свободной зоны `(centerScreenX, centerScreenY)` при любых состояниях сворачивания/разворачивания панелей.

---

### 2. 🔑 Устранение дублей Google Identity Services и уведомлений (`js/core/auth.js`):
- **Проблема:** Браузер выводил варнинг о повторном вызове `google.accounts.id.initialize()`, вызывал конфликт между кнопкой и One Tap `prompt()`, а также дважды показывал уведомление «С возвращением, developer!».
- **Решение:**
  - Внедрён guard-флаг `_gsiInitialized`, блокирующий повторный вызов `google.accounts.id.initialize()`.
  - Удалён дублирующий вызов `window.google.accounts.id.prompt()` (оставлен только аккуратный вход через кнопку в модалке).
  - Внедрена функция `showWelcomeOnce(role)` с флагом `_welcomeNotificationShown`, гарантирующая ровно один показ приветственного тоста за сессию.
  - Логирование конфигурации окружения `[Auth] Environment...` ограничено однократным выводом за сессию.

---

### 3. 🧹 Прореживание мусорных логов (Log Hygiene):
- **MediaPipe / Emscripten WASM (`js/multimodal/handsTracking.js`):** Перехвачены внутренние потоки `window.Module.print` и `printErr`, исключён спам `still waiting on run dependencies` и `gl_context`.
- **Telegram WebApp SDK (`index.html`):** Перед `tg.ready()` установлен `tg.debug = false`, убран поток 8 системных событий настройки темы.
- **WebSocket Reconnects (`js/tria/TriaCollectiveService.js`):** Промежуточные попытки реконнекта переведены в silent-режим.
- **Lethe Memory Obolos (`js/tria/MaturityDaemon.js`):** Батч обновления девальвации ограничен 500 блоками за цикл; лог пишется только при реальном обновлении (`updatedCount > 0`).

---

### 4. 🚀 Сборка, тесты и деплой на Cloudflare Pages:
- **Unit & E2E тесты (`npm test`):** 100% тестов пройдены успешно (`engineCamera`, `panStandard`, `presenceLayer`, `telegramEnv`, `signalingFallback`).
- **Синтаксис для Rolldown/Vite 8:** Устранены дубли объявлений переменных `leftEdge`/`rightEdge` и исправлен `rollupOptions.external` в [`vite.config.mjs`](file:///mnt/windows/NeuroCoderZ/holograms.media/vite.config.mjs).
- **Деплой:** Релиз **v0.20.599** (коммит `97ef556d`) успешно собран в GitHub Actions и развёрнут в Cloudflare Pages (`holograms-media-dev`), статус деплоя: **`success`** (Deployment ID: `9e21ae17`).
