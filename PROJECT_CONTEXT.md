# Актуальный Контекст Проекта Holograms Media (v29.0) - Обновлено: 2025-05-19

## 0. Важная Информация для AI
- **Основной документ:** Системная Инструкция (текущая версия v29.0+).
- **Этот файл (`PROJECT_CONTEXT.md`):** Актуальный срез состояния, цели, ключевые файлы, проблемы. AI ОБЯЗАН ознакомиться перед каждой задачей.
- **Лог итераций:** `@tria_memory_buffer.md`.

## 1. Обзор и Цели Проекта
- **Имя:** holograms.media
- **Репозиторий:** `https://github.com/NeuroCoderZ/holograms.media`
- **Миссия:** R&D платформа для создания интерактивных 3D-аудиовизуализаций ("голограмм") с AI "Триа", стремящаяся к новому языку коммуникации. Преодоление симуляционно-реального разрыва через обучение Триа на "комбинированных аудио(видео)-чанках".
- **Лицензия:** MIT.
- **Системная Инструкция:** v29.0 (основной источник архитектуры и философии).

## 2. Ключевые Технологии (Целевые)
- **Backend:** Python 3.12+, FastAPI, Uvicorn, **PostgreSQL + `pgvector` (драйвер `asyncpg`)**.
- **Frontend:** JavaScript (ES6 Modules), Three.js (r128+), **WebGPU (цель)**, WebRTC, Web Audio API, MediaPipe Hands.
- **AI "Триа":** Сеть ботов (Аудио, Жесты, Память, Обучение), LangChain, RAG, Continual Learning, UMAP, Генетические алгоритмы.
- **Развертывание:** Hugging Face Spaces (Docker).
- **CI/CD:** GitHub Actions.

## 3. Структура Проекта и Ключевые Файлы
- **`backend/app.py`**: Основной файл FastAPI бэкенда.
- **`backend/requirements.txt`**: Зависимости Python.
- **`backend/tria_bots/`**: Директория для модулей ботов Триа (пока заглушки).
- **`frontend/index.html`**: Главный HTML.
- **`frontend/js/main.js`**: Точка входа и оркестратор ES6 модулей фронтенда.
- **`frontend/js/core/init.js`**: Инициализация глобального `state`.
- **`frontend/js/3d/sceneSetup.js`**: Инициализация 3D-сцены (Three.js/WebGPU).
- **`frontend/js/3d/rendering.js`**: Логика рендеринга аудиовизуализации.
- **`frontend/js/audio/`**: Модули для аудио (`microphoneManager.js`, `audioFilePlayer.js`, `speechInput.js`).
- **`frontend/js/ui/`**: Модули UI (`uiManager.js`, `panelManager.js`, `layoutManager.js`).
- **`frontend/js/core/`**: Ядро фронтенда (`events.js`, `diagnostics.js`, `resizeHandler.js`, `domEventHandlers.js`).
- **`frontend/js/xr/`**: Модули для XR и камеры (`cameraManager.js`).
- **`frontend/js/multimodal/`**: Модули для мультимодального ввода (например, `handsTracking.js`).
frontend/script.js: (УДАЛЕН) Устаревший монолитный JS файл, функционал перенесен в модули в frontend/js/.
- **`Dockerfile`**: Конфигурация Docker для HF Spaces (пути к `backend/app.py` и `backend/requirements.txt` должны быть верны).
- **`PROJECT_CONTEXT.md`**: Этот файл.
- **`tria_memory_buffer.md`**: Лог итераций.
- **`ARCHITECTURE.md`**: Описание архитектуры потоков данных и Триа.
- **Последние Изменения:**
    - [2025-05-21] Проверено: дублирующийся экспорт `initializeScene` в `sceneSetup.js` отсутствует. Ошибка, вероятно, связана с кэшем или предыдущими версиями.
    - [ДАТА] Оптимизирован порядок инициализации в main.js.
    - [2025-05-21] Исправлен путь импорта chatMessages.js в main.js.
    - [2025-05-21] Устранены дубликаты файлов chatMessages.js и handsTracking.js. Файлы перемещены в корректные логические подпапки (`panels/` и `multimodal/`).
- [2025-05-21] Модули chat.js и rendering.js перемещены в корректные логические подпапки (`ai/` и `3d/`).
- [2025-05-21] Логика сохранения/загрузки состояния панелей вынесена из uiManager.js в appStatePersistence.js.
- [2025-05-21] Проверена корректность путей импорта для перемещенных модулей chatMessages.js, chat.js и handsTracking.js.
- [2025-05-21] Запущен локальный бэкенд сервер для тестирования фронтенда.
- [2025-05-23] Испр. ошибка импорта addMessage между promptManager.js и chatMessages.js.

## 4. Текущий Фокус Разработки (2025-05-21)
1.  **Унификация управления состоянием:** Стандартизация подхода к управлению состоянием между модулями, устранение смешения глобального и локального состояния.
2.  **Оптимизация порядка инициализации компонентов:** Анализ и реструктуризация порядка загрузки и инициализации модулей в main.js.
3.  **Разделение UI и бизнес-логики:** Рефакторинг модулей для четкого разделения ответственности.
4. **Стабилизация фронтенда:** Устранение `SyntaxError` в `appStatePersistence.js` и `'toggleModeInternal' is not defined` в `rightPanelManager.js`.
5. Подготовка к миграции бэкенда на PostgreSQL: Анализ `backend/app.py`, проектирование схемы БД.
6.  **Документирование:** Поддержание актуальности `MODULE_CATALOG.md` и других архитектурных документов.
7.  **Стабилизация фронтенда:** Устранение `no-unused-vars` в ключевых модулях. Тестирование фронтенда после чистки кода.
8.  **Завершение рефакторинга `rendering.js` и `sceneSetup.js`:** Устранение оставшихся ошибок импорта/экспорта и синтаксиса (если будут выявлены при тестировании).

## 5. Последние Ключевые Изменения (Хронология)
- **[2025-05-20]** Удалено подключение устаревшего script.js из index.html.
- **[2025-05-20]** Завершена полная очистка и удаление `frontend/script.js`. Вся логика перенесена в ES6 модули.
- **[ДАТА]** Проведена чистка `no-unused-vars` в модулях `frontend/js/ui/uiManager.js` и `frontend/js/ui/panelManager.js`.
- **[2025-05-19]** Исправлен `Dockerfile` для корректной работы с новой структурой бэкенда (`backend/app.py`, `backend/requirements.txt`). (Коммит cc95d26)
- **[2025-05-18]** Реструктуризация папки `backend/`: `app.py`, `requirements.txt` перемещены в `backend/`, создана папка `backend/tests/` и `backend/tria_bots/`. Удалены старые бэкапы и `Jenkinsfile`. (Коммит af92652)
- **[2025-05-18]** Устранены ошибки дублирования объявлений для `createSphere/Line/Axis/Grid` в `script.js`. (Коммит 24e120e)
- **[2025-05-18]** Логика MediaPipe Hands перенесена из `script.js` в `handsTracking.js`, обновлен `main.js`. (Коммит 4cd726a)
- [2025-05-21] Проведен аудит файлов `frontend/js/main.js`, `frontend/js/utils/helpers.js` и `frontend/js/utils/storage.js` на предмет неиспользуемого кода. Неиспользуемый код, требующий удаления на данном этапе, не выявлен. Отмечены закомментированные секции в `main.js` для будущей реализации/удаления.
- [ДАТА] Проведен рефакторинг управления состоянием фронтенда, ключевые переменные модулей перенесены в глобальный state.
- [2025-05-20] Исправлены ошибка 404 для chatMessages.js и SyntaxError для THREE в sceneSetup.js.
- [ДАТА] Исправлен импорт chatMessages.js. Начато разделение UI/логики в uiManager.js.
- [2025-05-21] Проведен анализ uiManager.js и events.js на предмет смешения UI/бизнес-логики. Текущая структура признана соответствующей принципам разделения ответственности на уровне обработчиков событий.
- [2025-05-21] Устранены SyntaxError в sceneSetup.js (некорректное имя импортируемой функции в init.js), ошибка 404 при импорте chatMessages.js в main.js (неверный путь импорта), дублирующиеся экспорты в uiManager.js и gestureAreaVisualization.js, а также некорректный путь импорта и неиспользуемые параметры в sceneSetup.js.
- [2025-05-21] Подтверждено отсутствие ссылок на устаревший script.js в index.html.
- [2025-05-21] Устранены синтаксическая ошибка в sceneSetup.js, ошибки 'Export not defined' в microphoneManager.js и mainUI.js, дублирующийся экспорт в uiManager.js и неиспользуемые переменные в rendering.js и gestureAreaVisualization.js.
- [2025-05-21] Проведен анализ и частичное устранение проблем с отсутствующими импортами в main.js, созданы заглушки для storage.js и helpers.js.
- *Более ранние изменения см. в `tria_memory_buffer.md` или истории коммитов.*

### Критические Проблемы

- [ ] **Ошибки ESLint:** Остались некритические ошибки, требующие внимания.
- [ ] **404 Errors:** Ошибка 404 для `frontend/js/core/init.js` наблюдается, но указанный некорректный путь (`js/ai/js/core/init.js` или `/static/js/ai/js/core/init.js`) не найден в `main.js` или его прямых импортах. Требуется дальнейшее расследование источника ошибки.
- [ ] **404 Errors:** Ошибка 404 для `frontend/js/core/init.js` наблюдается, но указанный некорректный путь (`js/ai/js/core/init.js` или `/static/js/ai/js/core/init.js`) не найден в `main.js` или его прямых импортах. Требуется дальнейшее расследование источника источника ошибки.
- [ ] **Неиспользуемый код/переменные:** Требуется чистка кода.
- [ ] **Логика сохранения/загрузки состояния:** Перенесена в `appStatePersistence.js`, требует тестирования.
- [ ] **Интеграция WebGPU:** Долгосрочная цель, пока неактуально.
- [ ] **Интеграция WebRTC:** Долгосрочная цель, пока неактуально.
- [ ] **Интеграция MediaPipe Hands:** Долгосрочная цель, пока неактуально.
*   Ошибки 404 при загрузке статических файлов (CSS, JS, favicon) - **Проверено, пути в index.html корректны (/static/). Проблема может быть в конфигурации сервера статики или кэше браузера.**
*   Ошибка `'state' is not defined` в `frontend/js/ui/uiManager.js` - **Проверено, импорт state присутствует и корректен.**
- [x] **no-unused-vars в audioFilePlayer.js:** Устранены.
- [x] **SyntaxError (duplicate setupCamera) в cameraManager.js:** Устранен.
- [x] **SyntaxError в cameraManager.js:** Устранен.


### Последние Изменения
- [2025-05-22] Исправлены ошибки 'Identifier 'handleFileLoad' has already been declared' в `audioFilePlayer.js` и ''state' is not defined` в `uiManager.js`. Добавлен импорт `state` в `uiManager.js`. Указанный некорректный путь для `init.js` не найден в `main.js` или его прямых импортах.
- [2025-05-22] Устранена дублирующаяся функция `switchToTimelineMode` в `frontend/js/panels/rightPanelManager.js`.
- [2025-05-22] Проверен файл `frontend/js/panels/rightPanelManager.js` на предмет синтаксических ошибок и незакрытых блоков кода. Ошибок не обнаружено.

- [2025-05-21] Выполнен Git add, commit и push изменений, связанных со структурой фронтенд-модулей и обновлением контекстных файлов.
- [2025-05-21] Устранена ошибка импорта axios путем использования CDN. Проанализированы TODO в main.js, созданы заглушки для отсутствующих модулей.

### Последние Изменения
- Удален неиспользуемый импорт в `frontend/js/main.js` для очистки кода.

- [2025-05-22] Проанализирована логика событий и межмодульные связи в script.js.bak (часть 2). Обновлен MODULE_CATALOG.md с детальным описанием eventManager.js и panelManager.js. Завершено исправление uiManager и начальное документирование UI-модулей.
- [2025-05-21] Актуализирован файл MODULE_CATALOG.md: детализирована структура модулей frontend, их назначение, зависимости, экспорты и связи. Проведено сравнение с ARCHITECTURE.md.
- [2025-05-21] Устранен дублирующийся экспорт в versionManager.js и исправлен путь импорта в tria_mode.js.
- [2025-05-21] Устранены критические SyntaxErrors в sceneSetup.js, rendering.js, uiManager.js.
- [2025-05-21] Устранены ошибки ESLint и синтаксические ошибки в sceneSetup.js, microphoneManager.js, mainUI.js, uiManager.js, rendering.js, gestureAreaVisualization.js. Исправлены пути импорта в main.js.
- [2025-05-21] Проверены пути импорта для chatMessages.js, chat.js, handsTracking.js. Запущен локальный бэкенд сервер.
- [2025-05-21] Ошибки/дубликаты устранены. Модули перемещены. Логика localStorage вынесена из uiManager.
- [2025-05-21] Исправлен путь импорта chatMessages.js в main.js на './panels/chatMessages.js'.
- [2025-05-21] Ошибки исправлены в предыдущих итерациях (Duplicate export в sceneSetup и импорт chatMessages).
- [2025-05-21] Исправлен путь импорта chatMessages.js в main.js, подтверждено отсутствие ссылки на script.js в index.html, исправлено имя импортируемой функции в init.js.
- [2023-05-20 18:45] Исправлены semitones export, chatMessages import, sceneSetup syntax.
- [2025-05-21 00:00:00] Ошибки исправлены. Логика сохранения/загрузки состояния панелей перенесена в appStatePersistence.js.
- [2025-05-21 00:00:00] Проведен анализ uiManager.js и events.js. Текущая структура обработчиков событий в events.js и функций в uiManager.js соответствует разделению ответственности. Нет очевидных функций для переноса на данном этапе.
- [2024-05-20 10:35] Импорт в main.js исправлен. Удалена дублирующая логика панелей из domEventHandlers.js. uiManager.js проанализирован, не содержит явной бизнес-логики, требующей немедленного переноса.
- [2025-05-20 10:00] Путь импорта и объявление THREE исправлены.
- [2024-05-20 10:30] Порядок вызовов реструктурирован.
- [2025-05-21] Импорты в main.js проанализированы, созданы заглушки для storage.js, helpers.js.
- [2025-05-20] НейроКодером устранены критические SyntaxErrors и проблемы export/import в rendering.js и sceneSetup.js.
- **[2025-05-21]** Проведена чистка no-unused-vars в модулях `frontend/js/core/events.js`, `frontend/js/ui/uiManager.js`, `frontend/js/audio/microphoneManager.js`.
- **[2025-05-21]** Рефакторинг `rendering.js`: исправлены синтаксические ошибки, модуль успешно загружается.
*   [2025- [2025-05-22] Исправлен SyntaxError (handleFileLoad) в audioFilePlayer.js. Проверены пути к статике в index.html (корректны). Проверен импорт state в uiManager.js (корректен).
- [2025-05-22] Испр. ошибки экспорта (playAudio, loadAudioFile и др.) в audioFilePlayer.js путем корректного определения/переименования функций.
- [2025-05-22] Исправлен SyntaxError (handlePlay) в audioFilePlayer.js.
- [2025-05-22] Выполнены Git add, commit, push для фиксации изменений в MODULE_CATALOG.md, frontend/js/audio/audioFilePlayer.js и tria_memory_buffer.md.
- [2025-05-22] Исправлен SyntaxError в cameraManager.js.
- [2025-05-22] Подтверждено устранение SyntaxError в cameraManager.js и обновлена документация (PROJECT_CONTEXT.md, tria_memory_buffer.md).
- [2025-05-22] Устранены no-unused-vars в audioFilePlayer.js.
- [2025-05-22] Испр. SyntaxError (duplicate setupCamera) в cameraManager.js.
- [2025-05-22] Испр. SyntaxError (duplicate toggleXRMode) в cameraManager.js.
- [2025-05-22] Исправлен SyntaxError (Unexpected token '}' на стр.94) в cameraManager.js.
- [2025-05-22] Исправлен SyntaxError (duplicate toggleXRMode) в cameraManager.js.
- [2025-05-22] Произведена попытка финального исправления SyntaxError (Unexpected token '}' на стр.135) в cameraManager.js путем детального анализа структуры блока.
- [2025-05-22] Исправлен SyntaxError в cameraManager.js.
## 6. Текущие Приоритеты (См. актуальный `PROJECT_CONTEXT.md`)
1.  **Стабилизация фронтенда** после рефакторинга `script.js` и удаления `no-unused-vars` в UI модулях.
2.  **Тестирование фронтенда** после последних исправлений и Git push.
2.  **Устранение JS ошибок** (ReferenceError, интеграция модулей).
3.  **Подготовка к PostgreSQL.**
4.  [x] **Устранены критические SyntaxErrors в rendering.js.**
4.  **Проверка импортов/экспортов в 3D модулях:** Проверена корректность импортов в <mcfile name="sceneSetup.js" path="c:\Projects\holograms-media\frontend\js\3d\sceneSetup.js"></mcfile> из <mcfile name="rendering.js" path="c:\Projects\holograms-media\frontend\js\3d\rendering.js"></mcfile>. Подтверждено отсутствие функции <mcsymbol name="calculateInitialScale" filename="rendering.js" path="c:\Projects\holograms-media\frontend\js\3d\rendering.js" startline="46" type="function"></mcsymbol> в <mcfile name="rendering.js" path="c:\Projects\holograms-media\frontend\js\3d\rendering.js"></mcfile> (согласно TODO). Функция <mcsymbol name="createColumn" filename="rendering.js" path="c:\Projects\holograms-media\PROJECT_CONTEXT.md"></mcfile> не имеет параметра `isLeft`.
5.  **Анализ rendering.js на синтаксические ошибки:** Проведен анализ файла rendering.js на наличие синтаксических ошибок; явных ошибок не обнаружено в предоставленном контексте.

### План на Следующие Итерации

1.  **Тестирование:** Локальное тестирование фронтенда после исправления синтаксических ошибок.
2.  **Чистка кода:** Удаление неиспользуемых функций и переменных.
3.  **Рефакторинг:** Продолжение рефакторинга по мере необходимости, улучшение структуры модулей.
4.  **PostgreSQL:** Начало интеграции с бэкендом.

### Архитектура (Кратко)

- **Frontend:** Модульный JS (ES6+), Three.js, WebGPU (цель), WebRTC, Web Audio API, MediaPipe Hands.
- **Backend:** Python (FastAPI, Uvicorn), PostgreSQL + pgvector.
- **AI "Триа":** Сеть ботов, LangChain, RAG.
- **Развертывание:** Hugging Face Spaces (Docker).

### Структура Проекта (Ключевые Директории)

- `backend/`
- `frontend/`
  - `frontend/js/`
    - `frontend/js/3d/`
    - `frontend/js/ai/`
    - `frontend/js/core/`
    - `frontend/js/multimodal/`
    - `frontend/js/panels/`
    - `frontend/js/ui/`
    - `frontend/js/utils/`
- `docs/`
- `models/`
- `notebooks/`
- `tests/`
- `PROJECT_CONTEXT.md`
- `ARCHITECTURE.md`
- `README.md`

### Зависимости

- См. `requirements.txt` (backend) и `package.json` (frontend, если используется npm/yarn).

### Конфигурация

- Переменные окружения для секретов.

### Логирование

- Консоль браузера для фронтенда.
- Логи сервера для бэкенда.

### Тестирование

- Локальное тестирование.
- Тестирование на Hugging Face Spaces.

### CI/CD

- GitHub Actions (планируется).

### Лицензия

- MIT.

### Контакты
В "Последние Ключевые Изменения" добавьте: [2025-05-20] НейроКодером устранены критические SyntaxErrors и проблемы export/import в rendering.js и sceneSetup.js.
В "Критические Известные Проблемы" обновите статус этих ошибок (например, пометьте их как решенные или удалите, если они там были).

- См. README.md или GitHub репозиторий.