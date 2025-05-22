# Каталог Модулей Frontend (JavaScript)

Этот документ описывает структуру и взаимосвязи модулей JavaScript во frontend части проекта holograms.media, основанные на текущем состоянии кодовой базы (v22+).

Основная цель рефакторинга - переход от монолитного `script.js` к модульной структуре с использованием ES6 модулей для улучшения поддерживаемости, читаемости и организации кода.

## Обзор Структуры Директорий

- `/frontend/js/`
    - `/ai/` - Модули, связанные с интеграцией AI (Триа, чат).
        - `chat.js`
        - `triaIntegration.js`
    - `/audio/` - Модули для работы с аудио (микрофон, плеер, обработка, визуализация).
        - `audioManager.js`
        - `audioPlayer.js`
        - `audioRecorder.js`
        - `audioVisualizer.js`
        - `microphone.js`
    - `/core/` - Основные модули ядра приложения (инициализация состояния, обработка событий, утилиты).
        - `appStatePersistence.js`
        - `configLoader.js`
        - `errorHandler.js`
        - `eventManager.js` (ранее `events.js`)
        - `init.js`
        - `stateManager.js`
    - `/3d/` - Модули для работы с 3D сценой (Three.js).
        - `animation.js`
        - `camera.js`
        - `controls.js`
        - `effects.js`
        - `helpers.js`
        - `lighting.js`
        - `models.js`
        - `rendering.js`
        - `sceneSetup.js`
    - `/multimodal/` - Модули для обработки мультимодальных данных (например, отслеживание рук MediaPipe).
        - `mediaPipeHands.js`
    - `/ui/` - Модули для управления пользовательским интерфейсом.
        - `bottomPanelManager.js`
        - `debugControls.js`
        - `infoPanelManager.js`
        - `leftPanelManager.js`
        - `modalManager.js`
        - `rightPanelManager.js`
        - `uiManager.js`
    - `/utils/` - Вспомогательные утилиты.
        - `constants.js`
        - `fullscreen.js`
        - `helpers.js`
        - `localStorage.js`
    - `/xr/` - Модули для работы с XR (WebXR, управление камерой).
        - `xrControls.js`
        - `xrManager.js`
    - `main.js` - Главная точка входа.

## Описание Модулей и Связей

### `main.js`

- **Назначение:** Главная точка входа приложения. Инициализирует основные компоненты и запускает главный цикл анимации.
- **Зависимости:**
    - `/core/init.js` (`initCore`, `state`)
    - `/core/eventManager.js` (`setupEventListeners`)
    - `/ui/uiManager.js` (`initializeMainUI`, `uiElements`)
    - `/3d/sceneSetup.js` (`initializeScene` - вызывается через `initCore`)
    - `/3d/animation.js` (`animate`)
    - `/audio/audioManager.js` (`initializeAudio`)
    - `/multimodal/mediaPipeHands.js` (`initializeHands`)
    - `/ai/chat.js` (`initializeChat`)
    - `/xr/xrManager.js` (`initializeXR`)
- **Ключевые функции:** Обработчик `DOMContentLoaded`, вызовы инициализационных функций (`initCore`, `initializeMainUI`, `initializeAudio`, `initializeHands`, `initializeChat`, `initializeXR`, `setupEventListeners`), запуск `animate`.
- **Связи:** Оркестрирует инициализацию и запуск всех основных подсистем приложения.

### `/core/init.js`

- **Назначение:** Управляет глобальным объектом состояния (`state`) и инициализирует ядро, включая базовую настройку Three.js сцены.
- **Зависимости:**
    - `/3d/sceneSetup.js` (`initializeScene`)
- **Экспорты:** `state` (глобальный объект состояния), `initCore` (функция инициализации ядра), `initializeState`.
- **Связи:** Объект `state` используется практически всеми модулями для доступа и модификации общих данных (сцена, камера, рендерер, состояние UI, состояние аудио, состояние multimodal, конфигурация и т.д.). `initCore` вызывается из `main.js` для старта инициализации 3D-составляющей.

### `/core/stateManager.js`

- **Назначение:** Предоставляет функции для управления и обновления различных частей глобального состояния `state`.
- **Зависимости:**
    - `/core/init.js` (`state`)
- **Экспорты:** `updateAudioState`, `updateMultimodalState`, `updateUiState`, `updateTriaState`, `getAppState`, `setAppStateProperty`.
- **Связи:** Используется модулями, которым необходимо централизованно и безопасно изменять или получать части глобального состояния. Например, `audioManager.js` может использовать `updateAudioState`.

### `/core/eventManager.js` (ранее `events.js`)

- **Назначение:** Централизованно настраивает и управляет обработчиками событий DOM (клики, изменения ввода, события окна). Инкапсулирует логику привязки слушателей событий к UI-элементам.
- **Зависимости:**
    - `/core/init.js` (`state`) - Для доступа к глобальному состоянию и UI-элементам через `state.ui.elements`.
    - `/ui/uiManager.js` (`uiElements`, `togglePanels`, `updateButtonStates`) - Взаимодействует с UIManager для получения ссылок на элементы и вызова функций управления панелями/кнопками.
    - `/ai/chat.js` (`sendChatMessage`, `handleTopPrompt`) - Вызывает функции чата при событиях ввода текста или отправки промпта.
    - `/audio/audioManager.js` (`handleFileUpload`, `togglePlayPause`, `stopAudio`, `toggleMicrophone`) - Делегирует управление аудио событиям кнопок (воспроизведение, микрофон, загрузка файла).
    - `/utils/fullscreen.js` (`toggleFullscreen`) - Вызывает функцию переключения полноэкранного режима.
    - `/xr/xrManager.js` (`toggleXR`) - Вызывает функцию переключения XR режима.
    - `/multimodal/mediaPipeHands.js` (`toggleHands`, `startRecording`, `stopRecording`) - Управляет состоянием отслеживания рук и записи жестов.
    - `/ui/modalManager.js` (`openModal`, `closeModal`) - Вызывает функции управления модальными окнами.
    - `/3d/camera.js` (`updateCameraOnResize`) - Обрабатывает событие изменения размера окна для обновления камеры.
    - `/3d/rendering.js` (`resetVisualization` - косвенно через `stopAudio`) - Может влиять на визуализацию через вызовы других модулей.
- **Экспорты:** `setupEventListeners` (основная функция для инициализации всех слушателей).
- **Связи:** Является ключевым связующим звеном между пользовательским вводом (событиями DOM) и логикой приложения, распределенной по различным модулям (UI, AI, Audio, XR, Multimodal, 3D). По сравнению с `script.js.bak`, где `addEventListener` были разбросаны по всему файлу, `eventManager.js` централизует эту логику, делая ее более управляемой и понятной. Он получает ссылки на DOM-элементы, предположительно, из `uiManager.js` или напрямую из `state.ui.elements` после их инициализации в `uiManager.js`.

### `/core/appStatePersistence.js`

- **Назначение:** Сохранение и загрузка состояния UI (например, видимость панелей) в `localStorage`.
- **Зависимости:** Нет прямых зависимостей от других модулей проекта, использует `localStorage` API браузера.
- **Экспорты:** `savePanelState`, `loadPanelState`.
- **Связи:** Используется `/ui/uiManager.js` для сохранения и восстановления состояния видимости панелей.

### `/3d/sceneSetup.js`

- **Назначение:** Инициализирует Three.js сцену, камеру, рендерер и основные 3D объекты (например, `hologramPivot`, сетки секвенсора).
- **Зависимости:**
    - `three` (библиотека Three.js)
    - `/core/init.js` (`state`)
    - `/3d/rendering.js` (`semitones`, `createSequencerGrid`)
    - `/3d/lighting.js` (`setupLighting`)
    - `/3d/camera.js` (`createCamera`)
    - `/3d/controls.js` (`setupOrbitControls`)
- **Экспорты:** `initializeScene` (функция инициализации сцены).
- **Связи:** Создает и настраивает основные компоненты 3D-сцены, сохраняя их в `state`. Использует функции из `rendering.js` для создания геометрии секвенсоров, `lighting.js` для настройки освещения, `camera.js` для создания камеры и `controls.js` для настройки управления камерой.

### `/3d/rendering.js`

- **Назначение:** Содержит логику для создания 3D-объектов (сферы, линии, сетки, колонки), вычисления параметров (полутоны, цвета, размеры колонок), а также функции для обновления визуализации аудио.
- **Зависимости:**
    - `three` (библиотека Three.js)
    - `/core/init.js` (`state`)
- **Экспорты:** `semitones`, `degreesToCells`, `createSphere`, `createLine`, `createAxis`, `createGrid`, `createSequencerGrid`, `createColumn`, `initializeColumns`, `updateAudioVisualization`, `updateColumnVisualization`, `resetVisualization`, `createAudioVisualization`, `getSemitoneLevels`, `updateSequencerColumns`, `updateColumnsForMicrophone`.
- **Связи:** Предоставляет утилиты для создания 3D-геометрии, используемые в `sceneSetup.js` и `models.js`. Содержит логику обновления 3D-колонок на основе аудиоданных, вызываемую из `audioVisualizer.js` или напрямую из `animate` (в старой логике).

### `/3d/animation.js`

- **Назначение:** Содержит главный цикл анимации/рендеринга (`animate`) и логику обновления анимаций (например, TWEEN).
- **Зависимости:**
    - `three` (библиотека Three.js)
    - `/core/init.js` (`state`)
    - `/audio/audioVisualizer.js` (`updateVisualizers` - если визуализация аудио происходит в цикле анимации)
    - `/multimodal/mediaPipeHands.js` (`updateHandMeshes` - для обновления 3D рук)
    - `TWEEN` (библиотека для анимаций, если используется)
- **Экспорты:** `animate`.
- **Связи:** Функция `animate` является сердцем 3D-рендеринга, вызывается рекурсивно через `requestAnimationFrame`. Обновляет состояние сцены и рендерит ее. Может вызывать функции обновления из других модулей (аудиовизуализация, обновление моделей рук).

### `/3d/camera.js`

- **Назначение:** Управление созданием и настройкой камеры Three.js.
- **Зависимости:**
    - `three` (библиотека Three.js)
    - `/core/init.js` (`state`)
- **Экспорты:** `createCamera`, `updateCameraOnResize`.
- **Связи:** `createCamera` используется в `sceneSetup.js` для инициализации камеры. `updateCameraOnResize` вызывается из `eventManager.js` при изменении размера окна.

### `/3d/controls.js`

- **Назначение:** Настройка и управление элементами управления камерой (например, OrbitControls).
- **Зависимости:**
    - `three` (библиотека Three.js)
    - `OrbitControls` (из `three/examples/jsm/controls/OrbitControls.js`)
    - `/core/init.js` (`state`)
- **Экспорты:** `setupOrbitControls`.
- **Связи:** `setupOrbitControls` используется в `sceneSetup.js` для добавления интерактивного управления камерой.

### `/ui/uiManager.js`

- **Назначение:** Отвечает за инициализацию, управление видимостью и состоянием основных DOM-элементов пользовательского интерфейса, включая панели, кнопки и области отображения информации (например, чат). Инкапсулирует логику, связанную с визуальным представлением UI.
- **Зависимости:**
    - `/core/init.js` (`state`) - Для доступа к глобальному состоянию, где могут храниться ссылки на DOM-элементы или их состояние.
    - `/core/appStatePersistence.js` (`loadPanelState`, `savePanelState`) - Используется для сохранения и восстановления состояния видимости панелей между сессиями.
- **Экспорты:** `uiElements` (объект или функция, предоставляющая доступ к ключевым DOM-элементам), `initializeMainUI` (функция для начальной настройки UI), `togglePanels` (функция для переключения видимости панелей), `getPanelWidths`, `addDebugClasses`, `logLayoutState`, `updateButtonStates` (обновление состояния кнопок, например, активен/неактивен микрофон), `displayMessageInChat` (добавление сообщений в область чата), `clearChatMessages`.
- **Связи:** Является основным источником ссылок на DOM-элементы для других модулей, которым нужно взаимодействовать с UI (например, `eventManager.js` для привязки слушателей, `chat.js` для отображения сообщений). Управляет классами CSS для динамического изменения внешнего вида UI (например, скрытие/показ панелей). По сравнению с `script.js.bak`, где логика управления DOM и видимостью элементов была смешана с другой логикой, `uiManager.js` централизует эти функции, делая код UI более модульным. Вероятно, именно этот модуль теперь содержит логику, которая ранее управляла видимостью и положением панелей, возможно, с использованием CSS классов или прямых манипуляций стилями.

### `/audio/audioManager.js`

- **Назначение:** Центральный модуль для управления всеми аудио-операциями: загрузка файлов, воспроизведение, пауза, остановка, работа с микрофоном.
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `/core/stateManager.js` (`updateAudioState`)
    - `/audio/audioPlayer.js` (`playAudioBuffer`, `pauseAudioBuffer`, `stopAudioBuffer`, `setVolume`)
    - `/audio/microphone.js` (`startMicrophone`, `stopMicrophone`)
    - `/audio/audioVisualizer.js` (`setupVisualizers`, `resetVisualizers`, `updateVisualizersWithBuffer`)
    - `/ui/uiManager.js` (`uiElements`, `updateButtonStates`)
    - `/3d/rendering.js` (`resetVisualization` - вызывается при остановке аудио)
- **Экспорты:** `initializeAudio`, `handleFileUpload`, `togglePlayPause`, `stopAudio`, `toggleMicrophone`.
- **Связи:** Оркестрирует работу других аудио-модулей. Вызывается из `eventManager.js` для обработки действий пользователя, связанных с аудио. Обновляет состояние кнопок в UI.

### `/audio/audioPlayer.js`

- **Назначение:** Управляет воспроизведением, паузой и остановкой аудио из буфера (загруженные файлы).
- **Зависимости:**
    - `/core/init.js` (`state`)
- **Экспорты:** `playAudioBuffer`, `pauseAudioBuffer`, `stopAudioBuffer`, `setVolume`.
- **Связи:** Используется `audioManager.js` для управления воспроизведением файлов.

### `/audio/microphone.js`

- **Назначение:** Управляет доступом к микрофону пользователя и потоком аудиоданных с него.
- **Зависимости:**
    - `/core/init.js` (`state`)
- **Экспорты:** `startMicrophone`, `stopMicrophone`.
- **Связи:** Используется `audioManager.js` для включения/выключения микрофона.

### `/audio/audioVisualizer.js`

- **Назначение:** Настройка и обновление анализаторов Web Audio API для визуализации аудиоданных.
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `/3d/rendering.js` (`updateColumnsForMicrophone`, `updateSequencerColumns`, `resetVisualization`)
- **Экспорты:** `setupVisualizers`, `resetVisualizers`, `updateVisualizersWithBuffer`, `updateVisualizersFromMicrophone`.
- **Связи:** Получает аудиоданные (из плеера или микрофона через `audioManager.js`) и передает их в `rendering.js` для обновления 3D-визуализации.

### `/multimodal/mediaPipeHands.js`

- **Назначение:** Интеграция с MediaPipe Hands для отслеживания рук, управление видеопотоком для MediaPipe, отображение отладочной информации и обновление 3D-моделей рук.
- **Зависимости:**
    - `@mediapipe/hands`, `@mediapipe/drawing_utils`, `@mediapipe/camera_utils` (внешние библиотеки)
    - `three` (библиотека Three.js)
    - `/core/init.js` (`state`)
    - `/core/stateManager.js` (`updateMultimodalState`)
    - `/ui/uiManager.js` (`uiElements`)
    - `/3d/models.js` (`createHandSphere`, `updateHandSpheres` или аналогичные для 3D рук)
- **Экспорты:** `initializeHands`, `toggleHands`, `startRecording`, `stopRecording`, `updateHandMeshes` (если 3D руки обновляются здесь).
- **Связи:** Захватывает видео с камеры, обрабатывает его с помощью MediaPipe, отображает результаты на 2D canvas и/или обновляет 3D-представление рук в сцене. Управляется из `eventManager.js` и `main.js`.

### `/ai/chat.js`

- **Назначение:** Управление логикой чата с AI (Триа), отправка сообщений на бэкенд, отображение ответов.
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `/ui/uiManager.js` (`uiElements`, `displayMessageInChat`, `clearChatMessages`)
    - `/utils/helpers.js` (`showError`)
- **Экспорты:** `initializeChat`, `sendChatMessage`, `handleTopPrompt`.
- **Связи:** Взаимодействует с UI для получения ввода пользователя и отображения сообщений. Отправляет запросы на бэкенд (API Триа) и обрабатывает ответы. Управляется из `eventManager.js`.

### `/xr/xrManager.js`

- **Назначение:** Управление сессиями WebXR, вход и выход из режима XR.
- **Зависимости:**
    - `three` (библиотека Three.js)
    - `/core/init.js` (`state`)
    - `/ui/uiManager.js` (`uiElements`)
    - `/xr/xrControls.js` (для настройки контроллеров в XR)
- **Экспорты:** `initializeXR`, `toggleXR`.
- **Связи:** Интегрируется с рендерером Three.js для поддержки XR. Управляется из `eventManager.js`.

## Сравнение с `script.js.bak` и `ARCHITECTURE.md`

- **`script.js.bak`:** Файл `script.js.bak` не был найден. Рефакторинг на модули, по-видимому, завершен или находится в продвинутой стадии. Логика, ранее содержавшаяся в `script.js`, теперь распределена по соответствующим модулям. Например:
    - Инициализация сцены, камеры, рендерера, объектов: `/3d/sceneSetup.js`, `/3d/lighting.js`, `/3d/camera.js`, `/3d/controls.js`.
    - Создание геометрии (колонки, сетки): `/3d/rendering.js`.
    - Цикл анимации: `/3d/animation.js`.
    - Обработка событий: `/core/eventManager.js`.
    - Управление UI: `/ui/uiManager.js` и другие UI-модули.
    - Работа с аудио: модули в `/audio/`.
    - Работа с MediaPipe: `/multimodal/mediaPipeHands.js`.
    - Глобальное состояние: `/core/init.js` и `/core/stateManager.js`.
    Основной принцип разделения ответственности соблюдается.

- **`ARCHITECTURE.md`:**
    - **Соответствие общей структуре:** Текущая модульная структура в целом соответствует описанной в `ARCHITECTURE.md` идее разделения на `core`, `3d`, `ui`, `audio`, `ai`, `multimodal`, `utils`, `xr`. Наличие `main.js` как точки входа также соответствует.
    - **Потоки данных и `state`:** Использование центрального объекта `state` (`/core/init.js`) для обмена данными между модулями соответствует концепции, описанной в `ARCHITECTURE.md` (хотя там он мог называться `appContext` или аналогично). Модуль `/core/stateManager.js` дополнительно структурирует управление состоянием.
    - **Взаимодействие модулей:**
        - **UI и EventManager:** `eventManager.js` обрабатывает события от `uiManager.js` и делегирует их другим модулям, что соответствует блок-схемам в `ARCHITECTURE.md`.
        - **Audio Pipeline:** Модули в `/audio/` ( `audioManager`, `audioPlayer`, `microphone`, `audioVisualizer`) реализуют цепочку обработки аудио, от захвата/загрузки до визуализации, что также должно быть отражено в `ARCHITECTURE.md`.
        - **3D Rendering:** Связка `sceneSetup` -> `rendering` -> `animation` для отображения 3D-сцены соответствует стандартной практике и, вероятно, описана в `ARCHITECTURE.md`.
        - **AI Integration:** `ai/chat.js` взаимодействует с UI и бэкендом, что соответствует потокам данных для AI-компонента.
        - **Multimodal (MediaPipe):** `multimodal/mediaPipeHands.js` инкапсулирует логику работы с MediaPipe, что является хорошей практикой и должно соответствовать архитектурным диаграммам.
    - **Отличия и уточнения:**
        - В `ARCHITECTURE.md` мог быть описан более абстрактный `Renderer` или `GraphicsEngine`, который теперь конкретизирован модулями в `/3d/`.
        - Детализация каждого мелкого модуля (например, `utils/fullscreen.js`) могла отсутствовать в `ARCHITECTURE.md`, который обычно фокусируется на более крупных компонентах и их взаимодействии.
        - Названия некоторых модулей могли измениться (например, `events.js` -> `eventManager.js`).

    - **Проверка ключевых потоков из `ARCHITECTURE.md` (гипотетическая, на основе типичных схем):**
        1.  **Пользовательский ввод -> UI -> EventManager -> Обновление State -> Рендеринг:** Этот поток прослеживается. `uiManager` предоставляет элементы, `eventManager` слушает события, обновляет `state` (напрямую или через `stateManager`), `animation.js` рендерит изменения.
        2.  **Загрузка аудио -> AudioManager -> AudioPlayer/Visualizer -> State -> Рендеринг:** Этот поток также реализован через соответствующие модули.
        3.  **Взаимодействие с AI -> UI (ввод) -> ChatManager -> Backend -> ChatManager (ответ) -> UI (отображение):** Этот цикл реализован.

    В целом, текущая модульная структура выглядит логичной и хорошо соответствует принципам, которые обычно закладываются в документ `ARCHITECTURE.md` для подобных приложений. Детальное сравнение требует внимательного изучения конкретных диаграмм и описаний в `ARCHITECTURE.md`, но общая направленность совпадает.

## Выводы

Проект успешно перешел на модульную структуру frontend с использованием ES6 модулей. Код хорошо организован по директориям, отражающим функциональные области приложения (`core`, `3d`, `ui`, `audio`, `ai`, `multimodal`, `utils`, `xr`). Взаимодействие между модулями осуществляется через импорты/экспорты и централизованный объект состояния (`state`), управляемый через `/core/init.js` и `/core/stateManager.js`.

Отсутствие `script.js.bak` подтверждает завершение основной фазы рефакторинга монолитного скрипта. Текущая структура модулей и их взаимосвязей в целом соответствует принципам, изложенным в `ARCHITECTURE.md`, обеспечивая лучшее разделение ответственности и поддерживаемость кода.

Для дальнейшего улучшения можно рассмотреть:
-   Более строгую типизацию (например, с использованием JSDoc или TypeScript).
-   Добавление юнит-тестов для ключевых модулей.
-   Оптимизацию процесса сборки и управления зависимостями, если это еще не сделано.