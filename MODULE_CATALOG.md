# Каталог Модулей Frontend (JavaScript)

Этот документ описывает структуру и взаимосвязи модулей JavaScript во frontend части проекта holograms.media, основанные на текущем состоянии кодовой базы.

Основная цель рефакторинга - переход от монолитного `script.js` к модульной структуре с использованием ES6 модулей для улучшения поддерживаемости, читаемости и организации кода.

## Обзор Структуры Директорий

- `/frontend/js/`
    - `/ai/` - Модули, связанные с интеграцией AI (Триа, чат).
        - `chat.js`
        - `models.js`
        - `prompts.js`
        - `tria.js`
        - `tria_mode.js`
    - `/audio/` - Модули для работы с аудио (микрофон, плеер, обработка, визуализация).
        - `audioFilePlayer.js`
        - `microphoneManager.js`
        - `audioProcessing.js` # Replaced processing.js with the new module
        - `speechInput.js`
        - `visualization.js` # This might be obsolete or its role changed
    - `/core/` - Основные модули ядра приложения (инициализация состояния, обработка событий, утилиты).
        - `appStatePersistence.js`
        - `diagnostics.js`
        - `domEventHandlers.js`
        - `events.js`
        - `gestures.js`
        - `init.js`
        - `resizeHandler.js`
        - `ui.js`
    - `/3d/` - Модули для работы с 3D сценой (Three.js).
        - `rendering.js`
        - `sceneSetup.js`
    - `/multimodal/` - Модули для обработки мультимодальных данных (например, отслеживание рук MediaPipe).
        - `handsTracking.js`
    - `/panels/` - Модули для управления панелями UI.
        - `chatMessages.js`
        - `rightPanelManager.js`
    - `/ui/` - Модули для управления пользовательским интерфейсом.
        - `fileEditor.js`
        - `gestureAreaVisualization.js`
        - `uiManager.js`
    - `/utils/` - Вспомогательные утилиты.
        - `helpers.js`
        - `storage.js`
    - `/xr/` - Модули для работы с XR (WebXR, управление камерой).
        - `xrManager.js`
    - `legacy-bridge.js` - Модуль для совместимости со старым кодом (временное решение).
    - `main.js` - Главная точка входа.

## Описание Модулей и Связей

### `main.js`

- **Назначение:** Главная точка входа приложения. Инициализирует основные компоненты и запускает главный цикл анимации.
- **Зависимости:**
    - `/core/init.js` (`initCore`, `state`)
    - `/core/events.js` (`setupDOMEventHandlers` или `initializeDOMEventHandlers` - в зависимости от того, какая из них используется)
    - `/ui/uiManager.js` (`initializeMainUI`)
    - `/ui/panelManager.js` (`initializePanelManager`)
    - `/3d/sceneSetup.js` (`initializeScene` - вызывается через `initCore`)
    - `/3d/rendering.js` (`animate`)
    - `/audio/microphoneManager.js` (`initializeMicrophone`)
    - `/multimodal/handsTracking.js` (`initializeHands`)
    - `/ai/chat.js` (`initializeChat`)
    - `/xr/xrManager.js` (`initializeXR`)
- **Ключевые функции:** Обработчик `DOMContentLoaded`, вызовы инициализационных функций (`initCore`, `initializeMainUI`, `initializeMicrophone`, `initializeHands`, `initializeChat`, `initializeXR`, `setupEventListeners`), запуск `animate`.
- **Связи:** Оркестрирует инициализацию и запуск всех основных подсистем приложения.

### `/core/init.js`

- **Назначение:** Управляет глобальным объектом состояния (`state`) и инициализирует ядро, включая базовую настройку Three.js сцены.
- **Зависимости:**
    - `/3d/sceneSetup.js` (`initializeScene`)
- **Экспорты:** `state` (глобальный объект состояния), `initCore` (функция инициализации ядра), `initializeState`.
- **Связи:** Объект `state` используется практически всеми модулями для доступа и модификации общих данных (сцена, камера, рендерер, состояние UI, состояние аудио, состояние multimodal, конфигурация и т.д.). `initCore` вызывается из `main.js` для старта инициализации 3D-составляющей.

### `/core/ui.js`

- **Назначение:** Предоставляет функции для управления и обновления различных частей глобального состояния `state`, связанных с UI.
- **Зависимости:**
    - `/core/init.js` (`state`)
- **Экспорты:** `updateUiState`, `getUiState`, `setUiStateProperty`.
- **Связи:** Используется модулями, которым необходимо централизованно и безопасно изменять или получать части глобального состояния UI.

### `/core/events.js`

- **Назначение:** Централизованно настраивает и управляет обработчиками событий DOM (клики, изменения ввода, события окна). Инкапсулирует логику привязки слушателей событий к UI-элементам.
- **Зависимости:**
    - `/core/init.js` (`state`) - Для доступа к глобальному состоянию и UI-элементам через `state.ui.elements`.
    - `/ui/uiManager.js` (`uiElements`) - Для доступа к элементам UI, ссылки на которые хранятся в `state.uiElements`.
    - `/ui/panelManager.js` (`togglePanels`) - Для переключения видимости боковых панелей.
    - `/panels/rightPanelManager.js` (`toggleModeInternal`) - Для переключения режима содержимого правой панели (например, чат/таймлайн).
    - `/ai/chat.js` (`sendChatMessage`) - Вызывает функции чата при событиях ввода текста.
    - `/audio/audioFilePlayer.js` (различные функции управления аудио) - Делегирует управление аудио событиям кнопок.
    - `/audio/microphoneManager.js` (различные функции управления микрофоном) - Делегирует управление аудио событиям кнопок.
    - `/utils/helpers.js` (`toggleFullscreen`) - Вызывает функцию переключения полноэкранного режима.
    - `/xr/xrManager.js` (`toggleXR`) - Вызывает функцию переключения XR режима.
    - `/multimodal/handsTracking.js` (`toggleHands`, `startRecording`, `stopRecording`) - Управляет состоянием отслеживания рук и записи жестов.
    - `/core/resizeHandler.js` (`updateCameraOnResize`) - Обрабатывает событие изменения размера окна для обновления камеры.
    - `/3d/rendering.js` (`resetVisualization` - косвенно через `stopAudio`) - Может влиять на визуализацию через вызовы других модулей.
- **Экспорты:** `setupDOMEventHandlers` или `initializeDOMEventHandlers` (основная функция для инициализации всех слушателей; необходимо уточнить, какая из них используется, и удалить другую).
- **Связи:** Является ключевым связующим звеном между пользовательским вводом (событиями DOM) и логикой приложения. Вместо `uiManager.js#toggleChatMode` теперь использует `rightPanelManager.js#toggleModeInternal` для переключения режима чата. Централизует логику привязки слушателей событий. Получает ссылки на DOM-элементы через `state.uiElements`, которые инициализируются в `uiManager.js`.

### `/core/appStatePersistence.js`

- **Назначение:** Управляет сохранением и загрузкой состояния UI, такого как видимость панелей, в `localStorage`.
- **Зависимости:** Нет прямых зависимостей от других модулей проекта, использует `localStorage` API браузера.
- **Экспорты:** `savePanelsHiddenState`, `loadPanelsHiddenState`.
- **Связи:** Используется `/ui/panelManager.js` для сохранения и восстановления состояния видимости панелей.

### `/3d/sceneSetup.js`

- **Назначение:** Инициализирует Three.js сцену, камеру, рендерер и основные 3D объекты (например, `hologramPivot`, сетки секвенсера).
- **Зависимости:**
    - `three` (библиотека Three.js)
    - `/core/init.js` (`state`)
    - `/3d/rendering.js` (`semitones`, `createSequencerGrid`)
    - `/3d/rendering.js` (`setupLighting` - если освещение настраивается в rendering.js)
    - `/3d/rendering.js` (`createCamera` - если камера создается в rendering.js)
    - `/3d/rendering.js` (`setupOrbitControls` - если OrbitControls настраивается в rendering.js)
- **Экспорты:** `initializeScene` (функция инициализации сцены).
- **Связи:** Создает и настраивает основные компоненты 3D-сцены, сохраняя их в `state`. Использует функции из `rendering.js` для создания геометрии секвенсоров, освещения, камеры и управления камерой.

### `/3d/rendering.js`

- **Назначение:** Содержит логику для создания 3D-объектов (сферы, линии, сетки, колонки), вычисления параметров (полутоны, цвета, размеры колонок), а также функции для обновления визуализации аудио и анимации. **Ключевая функция `animate` отвечает за рендер-цикл и обновление аудиовизуализации.**
- **Зависимости:**
    - `three` (библиотека Three.js)
    - `/core/init.js` (`state`)
    - `/audio/audioProcessing.js` (для `getSemitoneLevels`)
- **Экспорты:** `semitones`, `degreesToCells`, `createSphere`, `createLine`, `createAxis`, `createGrid`, `createSequencerGrid`, `createColumn`, `initializeColumns`, `updateAudioVisualization`, `updateColumnVisualization`, `resetVisualization`, `createAudioVisualization`, `updateSequencerColumns`, `animate` (главный цикл анимации/рендеринга). **Локальные `getSemitoneLevels` и `updateColumnsForMicrophone` были удалены.**
- **Связи:** Предоставляет утилиты для создания 3D-геометрии, используемые в `sceneSetup.js`.
    - **Цикл `animate` теперь определяет активный источник аудио (`state.audio.activeSource`).**
    - В зависимости от источника, он получает соответствующие `AnalyserNode`s (`state.audio.filePlayerAnalysers` или `state.audio.analyserLeft`/`Right`).
    - Затем вызывает `audioProcessing.js#getSemitoneLevels()` с выбранными анализаторами.
    - Наконец, вызывает собственную функцию `updateSequencerColumns()` для обновления 3D-визуализации на основе полученных уровней.
    - Функция `resetVisualization()` вызывается из `audioFilePlayer.js` (косвенно через `stopAudio()`) и `microphoneManager.js` для очистки визуализации.

### `/ui/uiManager.js`

- **Назначение:** Отвечает за инициализацию основных DOM-элементов пользовательского интерфейса (кроме управления видимостью основных боковых панелей и контентом правой панели) и другую UI-специфичную логику. Собирает ссылки на UI элементы и сохраняет их в `state.uiElements`.
- **Зависимости:**
    - `/core/init.js` (`state`) - Для доступа к глобальному состоянию, где хранятся ссылки на DOM-элементы.
- **Экспорты:** `uiElements` (объект, предоставляющий доступ к ключевым DOM-элементам), `initializeMainUI` (функция для начальной настройки UI), `getPanelWidths`, `addDebugClasses`, `logLayoutState`, `updateButtonStates` (обновление состояния кнопок), `displayMessageInChat` (добавление сообщений в область чата), `clearChatMessages`, `openModal`, `closeModal`.
- **Связи:** Является основным источником ссылок на DOM-элементы для других модулей через `state.uiElements`. Модули, такие как `events.js`, используют эти ссылки для привязки слушателей. `chat.js` использует его для отображения сообщений.

### `/audio/audioFilePlayer.js`

- **Назначение:** Управляет загрузкой аудиофайлов, их воспроизведением (play, pause, stop) и настройкой своего специфического аудио графа для воспроизведения и **анализа**.
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `/audio/audioProcessing.js` (для `getAudioContext`, `createAnalyserNodes`)
- **Экспорты:** `initializeAudioPlayerControls`, `playAudio`, `pauseAudio`, `stopAudio`, `loadAudioFile`. (Экспорты не изменились, но внутренняя работа другая).
- **Связи:**
    - Использует `audioProcessing.js` для получения `AudioContext` и создания `AnalyserNode`s (`state.audio.filePlayerAnalysers`).
    - Подключает свой аудио источник через `GainNode` (`state.audio.filePlayerGainNode`) и затем к `ChannelSplitterNode`, который передает данные в `filePlayerAnalysers`. `GainNode` также подключен к `audioContext.destination` для воспроизведения.
    - Управляет `state.audio.activeSource`, устанавливая его в `'file'` во время воспроизведения и `'none'` при паузе/остановке.
    - Управляет состоянием `state.audio.isPlaying`, `state.audio.pausedAt`, `state.audio.audioBuffer`, `state.audio.startOffset`.
    - Инициализирует элементы управления плеером (кнопки загрузки, play, pause, stop) и их обработчики событий.

### `/audio/microphoneManager.js`

- **Назначение:** Управляет вводом с микрофона, включая настройку аудио графа для **анализа** аудиоданных с микрофона.
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `/audio/audioProcessing.js` (для `getAudioContext`, `createAnalyserNodes`)
    - `/3d/rendering.js` (для `resetVisualization`)
- **Экспорты:** `initializeMicrophoneButton` (Основной экспорт не изменился).
- **Связи:**
    - Использует `audioProcessing.js` для получения `AudioContext` и создания своих `AnalyserNode`s (`state.audio.analyserLeft`, `state.audio.analyserRight`) с соответствующим `smoothingTimeConstant`.
    - Управляет `state.audio.activeSource`, устанавливая его в `'microphone'` когда активен и `'none'` когда остановлен.
    - Вызывает `rendering.js#resetVisualization()` при остановке микрофона.
    - **Больше не обрабатывает аудио напрямую в уровни полутонов и не обновляет колонки; это теперь делается в `rendering.js` с использованием данных от этих анализаторов через `audioProcessing.js`.**
    - Инициализирует кнопку микрофона (`micButton`) и ее обработчик событий.

### `/audio/audioProcessing.js`

- **Назначение:** Этот модуль отвечает за централизацию основных аудио функций, таких как управление `AudioContext`, создание `AnalyserNode` и обработка аудиоданных (например, вычисление уровней полутонов из частотных данных). Служит как утилитарный модуль для других аудио компонентов, которым необходимо выполнять анализ или обеспечивать согласованный `AudioContext`.
- **Ключевые функции/Экспорты:**
    - `getAudioContext()`: Управляет жизненным циклом общего экземпляра `AudioContext` (получает или создает/возобновляет его), сохраняя его в `state.audio.audioContext`.
    - `createAnalyserNodes(audioContext, smoothingTimeConstant)`: Создает и настраивает пару `AnalyserNode` (левый и правый каналы) для аудио анализа, позволяя указать `smoothingTimeConstant`.
    - `getSemitoneLevels(analyser)`: Принимает `AnalyserNode` и вычисляет массив уровней в децибелах для каждого музыкального полутона на основе его частотных данных.
- **Зависимости:**
    - `../core/init.js` (для `state`)
    - `../3d/rendering.js` (для массива `semitones`, используемого `getSemitoneLevels`)
    - `three` (для `THREE.MathUtils.clamp`, используемого `getSemitoneLevels`)
- **Взаимодействия:** Предоставляет утилитарные функции и анализаторы модулям, таким как `audioFilePlayer.js`, `microphoneManager.js`. Используется `rendering.js` (косвенно, так как `rendering.js` теперь вызывает `getSemitoneLevels`, который определен здесь, но выполняется с анализаторами, предоставленными плеером/менеджером).

### `/audio/visualization.js`

- **Назначение:** Отвечает за обновление 3D-визуализации на основе аудиоданных.
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `/3d/rendering.js` (`updateColumnsForMicrophone`, `resetVisualization`)
- **Экспорты:** `setupVisualizers`, `resetVisualizers`, `updateVisualizersWithBuffer`.
- **Связи:** Используется `microphoneManager.js` для обновления визуализации во время записи с микрофона или воспроизведения файла.

### `/multimodal/handsTracking.js`

- **Назначение:** Интеграция с MediaPipe Hands для отслеживания положения рук и жестов.
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `@mediapipe/hands` (библиотека MediaPipe Hands)
    - `/core/gestures.js` (`processHandLandmarks`)
    - `/3d/rendering.js` (`updateHandMeshes`)
- **Экспорты:** `initializeHands`, `toggleHands`, `startRecording`, `stopRecording`.
- **Связи:** Инициализируется из `main.js`. Получает данные от MediaPipe и передает их в `gestures.js` для обработки жестов и в `rendering.js` для обновления 3D-моделей рук.

### `/core/gestures.js`

- **Назначение:** Обработка данных отслеживания рук для определения жестов и их интерпретации.
- **Зависимости:**
    - `/core/init.js` (`state`)
- **Экспорты:** `processHandLandmarks`.
- **Связи:** Получает данные от `handsTracking.js` и определяет текущий жест.

### `/ai/chat.js`

- **Назначение:** Управление логикой чата, отправка сообщений на бэкенд, отображение ответов.
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `/ui/uiManager.js` (`displayMessageInChat`, `clearChatMessages`)
    - `/ai/prompts.js` (`getPromptTemplate`)
- **Экспорты:** `initializeChat`, `sendChatMessage`, `handleTopPrompt`.
- **Связи:** Инициализируется из `main.js`. Взаимодействует с `uiManager.js` для отображения сообщений и с `prompts.js` для получения шаблонов промптов.

### `/ai/tria.js`

- **Назначение:** Интеграция с AI Триа (заглушка).
- **Зависимости:**
    - `/core/init.js` (`state`)
- **Экспорты:** `initializeTria`, `sendTriaCommand`.
- **Связи:** Планируется взаимодействие с бэкендом для отправки команд Триа и получения ответов.

### `/ai/tria_mode.js`

- **Назначение:** Управление режимами работы Триа (например, обучение, выполнение команд).
- **Зависимости:**
    - `/core/init.js` (`state`)
- **Экспорты:** `setTriaMode`, `getTriaMode`.
- **Связи:** Используется другими модулями AI для установки и получения текущего режима Триа.

### `/ai/models.js`

- **Назначение:** Управление загрузкой и использованием 3D-моделей, связанных с AI (например, модель голограммы).
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `three` (библиотека Three.js)
    - `GLTFLoader` (из `three/examples/jsm/loaders/GLTFLoader.js`)
- **Экспорты:** `loadHologramModel`, `updateHologramPosition`.
- **Связи:** Используется `sceneSetup.js` или другими модулями для загрузки и размещения 3D-моделей в сцене.

### `/ai/prompts.js`

- **Назначение:** Управление шаблонами промптов для взаимодействия с AI.
- **Зависимости:** Нет прямых зависимостей от других модулей проекта.
- **Экспорты:** `getPromptTemplate`.
- **Связи:** Используется `chat.js` для получения форматированных промптов.

### `/panels/rightPanelManager.js`

- **Назначение:** Управляет внутренними режимами содержимого (например, Таймлайн vs. Чат) правой панели UI. Является единственным модулем, ответственным за переключение между этими режимами отображения в правой панели.
- **Зависимости:**
    - `/core/init.js` (`state`) - Потенциально, для доступа к глобальному состоянию, если потребуется в будущем. В текущей реализации DOM-элементы получаются напрямую.
- **Экспорты:** `initializeRightPanel`, `switchToChatMode`, `toggleModeInternal`, `getCurrentMode`.
- **Связи:** Используется `core/events.js` (или `core/domEventHandlers.js`) для переключения режима содержимого (вызовом `toggleModeInternal`) при клике на кнопку чата. Инициализирует собственные ссылки на DOM-элементы при помощи `document.getElementById`.

### `/panels/chatMessages.js`

- **Назначение:** Управление отображением сообщений в области чата внутри панели.
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `/ui/uiManager.js` (`uiElements`)
- **Экспорты:** `addMessage`, `clearMessages`.
- **Связи:** Используется `chat.js` для добавления новых сообщений в чат.

### `/ui/fileEditor.js`

- **Назначение:** Управление интерфейсом для редактирования файлов (если такая функциональность будет добавлена).
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `/ui/uiManager.js` (`uiElements`)
- **Экспорты:** `openFileEditor`, `closeFileEditor`, `loadFileContent`, `saveFileContent`.
- **Связи:** Планируется использование для редактирования файлов конфигурации или скриптов.

### `/ui/panelManager.js`

- **Path:** `/ui/panelManager.js`
- **Назначение (Purpose):** "Отвечает за управление видимостью основных боковых панелей интерфейса (левой и правой). Является центральным авторитетом для состояния видимости этих панелей, используя `appStatePersistence.js` для загрузки и сохранения этого состояния."
- **Зависимости (Dependencies):**
    - `/core/appStatePersistence.js` (`loadPanelsHiddenState`, `savePanelsHiddenState`)
- **Экспорты (Exports):** `initializePanelState`, `togglePanels`, `initializePanelManager`.
- **Связи (Connections):** "Используется `core/domEventHandlers.js` для переключения видимости панелей и установки их начального состояния. Инициализируется из `main.js` через вызов `initializePanelManager()`."

### `/ui/gestureAreaVisualization.js`

- **Назначение:** Визуализация области для записи жестов.
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `/ui/uiManager.js` (`uiElements`)
- **Экспорты:** `initializeGestureArea`, `showGestureArea`, `hideGestureArea`.
- **Связи:** Используется `rightPanelManager.js` при переключении на режим жестов.

### `/utils/helpers.js`

- **Назначение:** Общие вспомогательные функции (например, форматирование времени, утилиты DOM).
- **Зависимости:** Нет прямых зависимостей от других модулей проекта.
- **Экспорты:** `formatTime`, `getElement`, `toggleFullscreen`.
- **Связи:** Используется различными модулями, которым требуются общие утилиты.

### `/utils/storage.js`

- **Назначение:** Вспомогательные функции для работы с `localStorage` или другими механизмами хранения.
- **Зависимости:** Нет прямых зависимостей от других модулей проекта.
- **Экспорты:** `saveItem`, `loadItem`, `removeItem`.
- **Связи:** Используется `appStatePersistence.js`.

### `/xr/xrManager.js`

- **Назначение:** Управление сессиями WebXR.
- **Зависимости:**
    - `/core/init.js` (`state`)
    - `three` (библиотека Three.js)
- **Экспорты:** `initializeXR`, `toggleXR`.
- **Связи:** Инициализируется из `main.js`. Управляет началом и завершением XR-сессий.

### `/legacy-bridge.js`

- **Назначение:** Мост для совместимости со старым кодом или глобальными переменными (временное решение).
- **Зависимости:** Может зависеть от старых глобальных переменных или функций.
- **Экспорты:** Может экспортировать функции или объекты для использования в новой модульной структуре.
- **Связи:** Используется модулями, которым временно требуется доступ к функциональности из старого `script.js`.

---

**Примечание:** Этот каталог будет обновляться по мере развития проекта и рефакторинга.
