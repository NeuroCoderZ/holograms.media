## 0. Актуальный Контекст Проекта (КРИТИЧЕСКИ ВАЖНО!)
- **Перед задачей AI обязан изучить `PROJECT_CONTEXT.md` и `tria_memory_buffer.md` в корне проекта (без "@").** Эти файлы содержат срез состояния, цели, историю итераций.
- Если файлы отсутствуют/устарели, AI должен создать/обновить их как первую задачу.
- **Системная Инструкция (v29.0+) и `ARCHITECTURE.md`:** Основные документы для архитектуры и целей. Ссылайся при необходимости.
- **Дополнительные файлы:** `MODULE_CATALOG.md` (справочник модулей), `FUTUREARCHITECTURE.md`, `ROADMAP.md` (долгосрочные планы).

---

## 1. General Principles & Philosophy
- **R&D Platform:** Инновации для новой коммуникации через 3D-аудиовизуализации.
- **Open Source (MIT):** Чистый, модульный код.
- **Итеративность:** Микро-шаги, непрерывный рефакторинг.
- **Нейрокодинг + Верификация:** Trae IDE (агент "NeuroCoderZ" с Claude 3.7 Sonnet/Gemini 2.5 Pro) — главный инструмент. **AI-код проверяется, тестируется и осмысливается НейроКодером перед коммитом.**
- **Документирование:** Актуальные `PROJECT_CONTEXT.md`, `tria_memory_buffer.md`, `ARCHITECTURE.md`, `MODULE_CATALOG.md`, README.
- **Безопасность:** Секреты через `.env` или HF Secrets (например, `MISTRAL_API_KEY`, `HF_TOKEN`).

---

## 2. Core Technologies & Stack (Целевая)
- **Backend:** Python 3.12+, FastAPI, Uvicorn, PostgreSQL + `pgvector` (MongoDB — временно).
- **Frontend:** JavaScript (ES6 Modules), Three.js, WebGPU (цель), WebGL, WebRTC, Web Audio API, MediaPipe Hands, Web Speech API.
- **AI "Триа":** Сеть ботов (GestureBot, LearningBot, MemoryBot), LangChain, RAG, генетические алгоритмы.
- **Развертывание:** Hugging Face Spaces (Docker).
- **CI/CD:** GitHub Actions (ESLint, тесты, деплой).
- **Инструменты:** ESLint, Prettier (фронтенд), Pytest (бэкенд, планируется).

---

## 3. Ключевые Файлы и Их Назначение
- **`backend/app.py`:** FastAPI сервер (REST API, интеграция с LLM).
- **`frontend/js/main.js`:** Точка входа фронтенда.
- **`frontend/js/`:** Модули (например, `uiManager.js`, `sceneSetup.js`, `handsTracking.js`). **`script.js` УДАЛЕН.**
- **`PROJECT_CONTEXT.md`:** Главный файл с актуальным срезом состояния проекта.
- **`tria_memory_buffer.md`:** Детальный лог итераций (PROMPT_ID, цель, результат, следующий шаг).
- **`ARCHITECTURE.md`:** Архитектура, потоки данных, глоссарий.
- **`MODULE_CATALOG.md`:** Справочник модулей (статус, зависимости).

---

## 4. Правила Работы с Кодом
- **Коммиты:** Conventional Commits (например, `fix: correct imports in uiManager.js`).
- **JavaScript:** ES6+, модульность, избегай глобальных переменных.
- **Python:** Async/await, PEP 8, типизация (где применимо).
- **Тестирование:** Логи F12, серверные логи, `diagnostics.js`. Планируется Pytest/Jest.
- **Линтеры:** ESLint (`npx eslint frontend/js/`), Prettier (`npx prettier --write frontend/js/**`).

---

## 5. Взаимодействие с AI-Ассистентом (Агент "NeuroCoderZ" в Trae IDE)
- **Промптинг:** По **Универсальному Шаблону Промта v4.0** (см. пользовательскую инструкцию). Контекст: `@workspace`, `@file`, `#Project Rules`, `PROJECT_CONTEXT.md`.
- **Ожидаемый Отчет от AI:**
  1. Подтверждение ознакомления с `PROJECT_CONTEXT.md`, `tria_memory_buffer.md`.
  2. Статус выполнения задачи.
  3. Изменения в коде (БЫЛО/СТАЛО, до 15 строк).
  4. Вывод терминальных команд (например, `git commit -m "fix: imports"`).
  5. **Обновление файлов:**
     - `tria_memory_buffer.md`: `[2025-05-22 01:52] PROMPT_ID: 20250522-0152-001. ЦЕЛЬ: Исправление импортов. РЕЗУЛЬТАТ: Добавлен импорт. ИЗМЕНЕННЫЕ_ФАЙЛЫ: uiManager.js. СЛЕДУЮЩИЙ_ШАГ: Тестирование.`
     - `PROJECT_CONTEXT.md`: Обновить "Текущий Фокус", "Последние Изменения".
  6. Размер измененных файлов (например, `uiManager.js: 1.2 KB`).
- **Git (MCP GitHub):** Выполнять только по явной "ЗАДАЧЕ НА GIT". Сервер остановлен перед операциями.

---

## 6. Текущие Приоритеты (См. `PROJECT_CONTEXT.md`)
1. **Стабилизация Фронтенда:** Исправление ошибок (`ReferenceError`, `Module not found`) в `main.js`, `uiManager.js`, `sceneSetup.js`.
2. **UI и Голограмма:** Восстановление отображения голограммы, работа кнопок "Чат", "Триа".
3. **Миграция на PostgreSQL:** Проектирование схемы, подключение через `asyncpg`.
4. **Триа:** Заглушки для ботов в `backend/tria_bots/`, мультимодальность (голос, жесты).

---

## 7. Важно для AI при Модификации Кода
- **Приоритет:** Стабильность, модульность, устранение ошибок.
- **Проверка:** Если задача противоречит `PROJECT_CONTEXT.md` или неясна, уточняй у НейроКодера.
- **Автоматизация:** Выполняй изменения через Trae IDE или предлагай код для ручного применения (при таймаутах).
- **Таймауты Trae IDE:** Не редактируй >10 файлов за раз, разбивай задачи.

---

## 8. Последние Изменения
- [2025-05-23] Испр. Runtime Errors в sceneSetup (null.add), panelManager и gestureAreaVisualization (поиск DOM).
- [2025-05-23] Испр. Runtime Errors: инициализация mainSequencerGroup, поиск DOM в panelManager.
- [2025-05-23] Исправлена ошибка импорта initializePromptManager в promptManager.js.
- [2025-05-23] Исправлена ошибка импорта initializeChatDisplay и применены правила ESLint в promptManager.js.
- [2025-05-23] Исправлена ошибка импорта addMessage в promptManager.js и chatMessages.js.
- [2025-05-23] Исправлены SyntaxError в appStatePersistence.js и ошибка toggleModeInternal not defined в rightPanelManager.js.
- [2025-05-22] Удалена дублирующая функция switchToTimelineMode в rightPanelManager.js.
- [2025-05-23] Исправлена инициализация mainSequencerGroup в sceneSetup.js.

---

## 9. Критические Проблемы
- Нет известных критических проблем, препятствующих запуску фронтенда после применения текущих изменений.

---

## 10. Текущий Фокус
- Тестирование фронтенда на Hugging Face Spaces после Git push для подтверждения устранения Runtime Errors и полной загрузки UI.

---

## 11. Следующие Шаги
- Подготовка к миграции на PostgreSQL.
- Реализация заглушек для ботов Триа.

---

...