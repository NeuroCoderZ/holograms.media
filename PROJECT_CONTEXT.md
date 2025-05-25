# PROJECT_CONTEXT.md - Контекст Проекта "Голографические Медиа"

## Текущее Состояние Проекта

Проект находится в активной фазе R&D. Основные усилия сосредоточены на разработке фронтенда для отображения 3D-голограмм и интеграции аудио-визуальных элементов. CI/CD через GitHub Actions для деплоя на Hugging Face Spaces настроен и работает.

## Цели Текущей Итерации

1.  **КРИТИЧНО:** Устранить все известные JavaScript ошибки, препятствующие полной загрузке и корректному отображению 3D-сцены и UI.
2.  Актуализировать проектную документацию (`PROJECT_CONTEXT.md`, `tria_memory_buffer.md`, `MODULE_CATALOG.md`, `MODULE_INTERFACES.md`).
3.  Подготовить код к деплою на Hugging Face Spaces через GitHub Actions.

### 3. Критические Проблемы (Блокеры)

*   **[ИСПРАВЛЯЕТСЯ]** Бэкенд не стартует из-за `SyntaxError: expected 'except' or 'finally' block` в `backend/app.py` ~строка 409.

*   ~~**[КРИТИЧЕСКАЯ ПРОБЛЕМА]** `Uncaught SyntaxError: Export 'animate' is not defined in module (at rendering.js:420:23)` (Лог HF Spaces от 2025-05-25 00:35:07) - **Блокирует отображение 3D сцены.** Требует немедленного исправления экспорта/импорта `animate` в `rendering.js` и его вызова.~~ (ИСПРАВЛЕНО 2025-05-25)

*   **УСТРАНЕНО:** Ошибки загрузки модулей (`404 Not Found` для `ui.js`).
*   **УСТРАНЕНО:** Ошибка `GET .../static/js/panels/panelManager.js net::ERR_ABORTED 404` (исправлен путь импорта в `events.js`).
*   **УСТРАНЕНО:** Ошибки дублирования экспортов (`Duplicate export` в `panelManager.js`).
*   **УСТРАНЕНО:** Ошибки `Runtime Error` (связанные с инициализацией сцены, поиском DOM-элементов, инициализацией аудио плеера и панелей).
*   **УСТРАНЕНО:** Ошибка `SyntaxError: Invalid or unexpected token` в `rendering.js` после мержа.
*   **УСТРАНЕНО:** `ReferenceError` для `toggleChatMode` и `updateHologramLayout` в `events.js` (добавлены необходимые импорты).
*   **УСТРАНЕНО:** Ошибка `SyntaxError: missing ) after argument list` (или `Unexpected token TWEEN`) в `rendering.js` (строка ~395).
*   **УСТРАНЕНО:** `Uncaught TypeError: Failed to resolve module specifier "@tweenjs/tween.js"` ✅ ИСПРАВЛЕНО (2025-05-25)
*   **РЕАЛИЗОВАНО:** Базовая логика аудиовизуализации из `script.js.bak` интегрирована в `rendering.js` и `audioProcessing.js`.
- **Frontend: Fixing Tween.js import error for 3D launch**
  - **Статус:** Завершено.
  - **Описание:** Исправлена ошибка импорта `Tween.js` в `rendering.js` путем удаления ES6 импорта и использования глобальной переменной, загружаемой через CDN. Устранены ошибки ESLint, связанные с неопределенными переменными `camera` и `renderer` путем использования `state.camera` и `state.renderer`. Закомментирован неиспользуемый импорт `getSemitoneLevels`. Удален неиспользуемый параметр `time` из `updateHologramMesh`. Изменения зафиксированы и отправлены в репозитории GitHub и Hugging Face. Обнаружена критическая уязвимость на GitHub (требует дальнейшего анализа).
- **Frontend: Финальная отладка `rendering.js` (экспорт onWindowResize)**
  - **Статус:** Завершено.
  - **Описание:** Исправлена ошибка экспорта `onWindowResize` в `rendering.js` путем удаления его из списка экспорта, так как функция была удалена ранее. Это устраняет `Uncaught SyntaxError: Export 'onWindowResize' is not defined in module`.
- **Frontend: Fixing ReferenceError and SyntaxError**
  - **Статус:** Завершено.
  - **Описание:** Устранена ошибка `ReferenceError: Cannot access 'state' before initialization` в `frontend/js/3d/rendering.js` путем удаления дублирующей функции `onWindowResize`. Исправлена ошибка `SyntaxError: Unexpected token ')'` в `frontend/js/audio/microphoneManager.js` путем добавления отсутствующей закрывающей скобки. Изменения будут зафиксированы и отправлены в репозитории GitHub и Hugging Face.
*   **СЛЕДУЮЩИЕ ШАГИ:** Продолжение работы над UI, интеграция новых типов голограмм, проектирование схемы базы данных PostgreSQL.

## Последние Изменения и Прогресс

*   **Фокус:** БЭКЕНД КРИТИЧЕСКИЙ ФИКС: Устранение SyntaxError в app.py для запуска сервера.

*   [2025-05-23] Исправлены ошибки `404 Not Found` для `ui.js` и `Duplicate export` в `panelManager.js`.
*   [2025-05-23] Устранены множественные `Runtime Error`, связанные с инициализацией сцены, UI элементов (панелей, аудио плеера) и обработчиков событий DOM.
*   [2025-05-23] Актуализированы `index.html` для корректной структуры UI.
*   [2025-05-23] Разрешены конфликты слияния в контекстных файлах и коде.
*   [2025-05-24] Исправлена финальная SyntaxError в rendering.js (стр.395) и реализована базовая аудиовизуализация.
*   [Дата] Создан файл `MODULE_INTERFACES.md` для документирования API модулей.

### 2.2. Последние ключевые изменения в коде (за последние 1-2 итерации):
*   [2025-05-25] Исправлен импорт Tween.js и ошибки ESLint в `rendering.js`.
*   [2025-05-25] Исправлена функция `animate` в `frontend/js/3d/rendering.js` для корректного запуска цикла рендеринга 3D-сцены. Обеспечен ее правильный экспорт и импорт в `main.js`.
*   [2025-05-25] Исправлена ошибка экспорта `onWindowResize` в `rendering.js`.
*   [2025-05-25] Исправлена `SyntaxError` в `backend/app.py` (незавершенный try...except).

## Архитектура и Модули (Кратко)

Проект использует модульную структуру. Ключевые директории:
*   `frontend/js/core`: Основная логика инициализации, событий, состояния.
*   `frontend/js/3d`: Работа с Three.js, рендеринг, управление сценой и объектами.
*   `frontend/js/ui`: Управление пользовательским интерфейсом (панели, элементы управления).
*   `frontend/js/audio`: Работа с Web Audio API, управление аудио источниками и анализом.

(Более детально в `ARCHITECTURE.md` и `MODULE_CATALOG.md`)

## Среда Разработки и Деплой

*   **Локально:** Разработка ведется в Trae AI IDE.
*   **Удаленный репозиторий:** GitHub (`github main`).
*   **CI/CD:** GitHub Actions для автоматического деплоя на Hugging Face Spaces при каждом push в `main`.
*   **Деплой:** Hugging Face Spaces (https://huggingface.co/spaces/NeuroCoderZ/holograms-media).

## Команда

*   **НейроКодер (Александр):** Руководитель проекта, основной разработчик, постановщик задач.
*   **AI-ассистент NeuroCoderZ (Ты):** Эксперт по коду, помощник в рефакторинге, отладке, написании кода и актуализации документации.
*   **Jules:** Разработчик аудио подсистемы (Web Audio API, анализаторы).

---

*Последнее обновление: 2025-05-25*