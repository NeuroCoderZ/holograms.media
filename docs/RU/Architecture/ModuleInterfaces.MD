# Module Interfaces

Этот документ описывает публичные API и ключевые зависимости для JavaScript модулей.

## `js/core/init.js`

*   **Назначение:** Центральный модуль для определения и инициализации глобального объекта `state`, а также для координации запуска основных сервисов и менеджеров приложения.
*   **Экспортируемый API:**
    *   `state` (объект): Глобальный объект состояния приложения.
    *   `initCore()` (async функция): Основная функция инициализации ядра приложения (3D сцена, аудио, XR, UI панели и менеджеры).
    *   `initializeState()` (функция): Функция для инициализации или логирования начального состояния.
*   **Ключевые зависимости:**
    *   `../config/hologramConfig.js` (для `semitones`)
    *   `../3d/sceneSetup.js` (для `initializeScene`)
    *   `../audio/microphoneManager.js` (для класса `MicrophoneManager`)
    *   `../audio/audioFilePlayer.js` (для класса `AudioFilePlayer`)
    *   `../3d/hologramRenderer.js` (для класса `HologramRenderer`)
    *   `../xr/webxr_session_manager.js` (для класса `XRSessionManager`)
    *   `../ui/panelManager.js` (для класса `PanelManager`)
    *   `../audio/audioProcessing.js` (динамический импорт `setupAudioProcessing`)
*   **Взаимодействие с `state`:** Определяет, экспортирует и активно наполняет глобальный объект `state` различными компонентами, конфигурациями и инстансами менеджеров.

## `js/core/platformDetector.js`

*   **Назначение:** Определяет тип платформы (XR, mobile, desktop) на которой запущено приложение.
*   **Экспортируемый API:**
    *   `detectPlatform()` (функция): Возвращает строку 'xr', 'mobile', или 'desktop'.
*   **Ключевые зависимости:** Нет зависимостей от других модулей проекта.
*   **Взаимодействие с `state`:** Нет.



## `js/core/mediaInitializer.js`

*   **Назначение:** Инициализирует мультимедийные компоненты, запрашивая доступ к камере и микрофону. Настраивает микрофон и видеопоток для отслеживания рук.
*   **Экспортируемый API:**
    *   `initializeMultimedia(appState)` (async функция): Запрашивает `getUserMedia`, инициализирует `MicrophoneManager` и `handsTracking` с полученным `MediaStream`. Принимает объект состояния приложения (`appState`).
*   **Ключевые зависимости:**
    *   `../audio/microphoneManager.js` (для класса `MicrophoneManager`)
    *   `../multimodal/handsTracking.js` (для `startVideoStream`)
*   **Взаимодействие с `state` (передается как `appState`):**
    *   Читает: `appState.audio.audioContext`, `appState.microphoneManagerInstance`, `appState.multimodal.videoElementForHands`, `appState.multimodal.handsInstance`.
    *   Записывает: `appState.multimodal.currentStream`, `appState.audio.audioContext`, `appState.audio.microphoneAnalysers`, `appState.audio.activeSource`.


## `js/core/appStatePersistence.js`

*   **Назначение:** Обеспечивает сохранение и загрузку состояния приложения, в частности видимости UI панелей, в `localStorage`.
*   **Экспортируемый API:**
    *   `loadPanelsHiddenState()` (функция): Загружает состояние видимости панелей из `localStorage`.
    *   `savePanelsHiddenState(isHidden)` (функция): Сохраняет состояние видимости панелей в `localStorage`.
*   **Ключевые зависимости:** Нет зависимостей от других модулей проекта.
*   **Взаимодействие с `state`:** Взаимодействует с объектом состояния приложения (получаемым из `localStorage`), а не напрямую с глобальным `state` из `core/init.js`.

## `js/core/diagnostics.js`

*   **Назначение:** Предоставляет ф��нкции для диагностики состояния фронтенд-приложения, собирая и логируя информацию о глобальных объектах, DOM-элементах, состоянии ключевых компонентов из `state` и окружении.
*   **Экспортируемый API:**
    *   `runFrontendDiagnostics()` (функция): Основная функция диагностики. Возвращает объект с результатами диагностики.
*   **Ключевые зависимости:**
    *   `./init.js` (для `state`)
*   **Взаимодействие с `state`:** Читает различные свойства из `state` для проверки их инициализации (например, `state.scene`, `state.camera`, `state.renderer`, `state.audioContext`, `state.xrMode`).

## `js/core/domEventHandlers.js`

*   **Назначение:** Содержит логику для обработки промптов (включая вызов Tria mode и отправку на `/generate`), выполнения сгенерированного кода и создания новых версий. Также настраивает `MutationObserver` для UI элементов жестов. Большая часть функциональности по работе с файловым редактором и общими DOM-событиями была перенесена в другие модули (например, `DesktopInput.js`).
*   **Экспортируемый API:**
    *   `setupDOMEventHandlers()` (функция): Настраивает `MutationObserver` для UI жестов. Большая часть логики, связанной с кнопками и файловым редактором, устарела или перенесена.
    *   `applyPrompt(prompt, model)` (async функция): Обрабатывает промпт. **Вызывается из `DesktopInput.js`**. Сначала пытается использовать `applyPromptWithTriaMode` (если режим Триа активен). Если режим Триа не активен или не обрабатывает промпт, отправляет запрос на `/generate` для получения сгенерированного кода, выполняет его в контексте Three.js сцены, а затем отправляет состояние сцены на `/branches` для создания новой версии. Параметр `model` для `/generate` берется из селектора `#modelSelect`.
*   **Ключевые зависимости:**
    *   `./init.js` (для `state`)
    *   `../ai/tria_mode.js` (для `applyPromptWithTriaMode`)
    *   `axios`
    *   `three`
*   **Взаимодействие с `state`:**
    *   Читает: `state.scene`, `state.mainSequencerGroup` (для выполнения сгенерированного кода), `state.uiElements.inputs.topPromptInput`, `state.uiElements.inputs.modelSelect`, `state.currentBranch`, `state.hologramVersions`, `state.currentVersion`, `state.uiElements.containers.versionFrames`.
    *   Записывает: `state.uiElements.inputs.topPromptInput.value`, `state.currentVersion`, `state.hologramVersions` (при создании новой версии).

## `js/core/events.js`

*   **Назначение:** Управляет `MutationObserver` для некоторых UI-элементов (панель жестов, сообщения чата, аудиоплеер) и настраивает слушатели для поля ввода чата. Большая часть специфичных обработчиков ввода была перенесена в платформо-зависимые модули (`DesktopInput.js`, `MobileInput.js`).
*   **Экспортируемый API:**
    *   `setupDOMEventHandlers()` (функция): Настраивает `MutationObserver` для отслеживания изменений атрибутов или дочерних элементов у панели жестов, контейнера сообщений чата и контейнера аудиоплеера.
    *   `setupEventListeners()` (функция): Основная функция инициализации слушателей данного модуля, вызывает `setupChatTextInputListeners` и `setupDOMEventHandlers` (для observer'ов).
*   **Ключевые зависимости:**
    *   `../ui/uiManager.js` (для `uiElements`)
*   **Взаимодействие с `state`:** Нет прямого взаимодействия с глобальным `state` из `core/init.js`.


## `js/core/gestures.js`

*   **Назначение:** Настраивает и управляет сенсорными жестами (pan, pinch) для взаимодействия с 3D-голограммой с использованием библиотек `MediaPipe Hands` и `GestureIntentClassifier`.
*   **Экспортируемый API:**
    *   `initializeGestures(passedState)` (функция): Инициализирует `MediaPipe Hands` и `GestureIntentClassifier` на DOM-элементе рендерера и настраивает обработчики жестов. Принимает объект состояния приложения (`passedState`).
*   **Ключевые зависимости:**
    *   `three` (импортируется напрямую)
    *   `@mediapipe/hands`
    *   `../ai/gestureIntentClassifier.js`
    *   `TWEEN.js` (глобально через `window.TWEEN`)
*   **Взаимодействие с `state` (передается как `passedState`):**
    *   Читает: `passedState.renderer.domElement`, `passedState.isXRMode`, `passedState.hologramRendererInstance`, `passedState.camera`.
    *   Модифицирует: Вращение и масштаб `hologramPivot` (через `passedState.hologramRendererInstance`). Вращение `passedState.camera` в режиме XR.

## `js/core/pwaInstall.js`

*   **Назначение:** Управляет логикой установки Progressive Web Application (PWA).
*   **Экспортируемый API:**
    *   `initializePwaInstall()` (функция): Настраивает слушатели событий `beforeinstallprompt` и `appinstalled`, а также слушатель клика для кнопки установки PWA.
*   **Ключевые зависимости:** Нет зависимостей от других модулей проекта.
*   **Взаимодействие с `state`:** Нет.

## `js/core/resizeHandler.js`

*   **Назначение:** Обрабатывает события изменения размера окна для адаптации макета UI и 3D-сцены.
*   **Экспортируемый API:**
    *   `getPanelWidths()` (функция): Возвращает суммарную ширину левой и правой панелей.
    *   `getLeftPanelWidth()` (функция): Возвращает ширину левой панели.
    *   `initializeResizeHandler(passedState)` (функция): Устанавливает слушатель `resize` на `window` с использованием `debounce`. Принимает объект состояния приложения (`passedState`).
*   **Ключевые зависимости:**
    *   `three` (импортируется напрямую)
    *   `../ui/layoutManager.js` (для `updateHologramLayout`)
    *   `../utils/helpers.js` (для `debounce`)
*   **Взаимодействие с `state` (передается как `passedState`):**
    *   Читает: `passedState.uiElements.leftPanel`, `passedState.uiElements.rightPanel`, `passedState.uiElements.gridContainer`, `passedState.uiElements.gestureArea`, `passedState.renderer`, `passedState.activeCamera`.
    *   Модифицирует: Свойства `passedState.renderer` (размер) и `passedState.activeCamera` (матрица проекции, FOV, аспект, ортографический объем).

## `js/core/ui.js`

*   **Назначение:** Управляет пользовательским интерфейсом, включая инициализацию ссылок на DOM-элементы, переключение видимости панелей, области жестов и режима чата.
*   **Экспортируемый API:**
    *   `ui` (объект): Структурированный объект, содержащий ссылки на DOM-элементы UI.
    *   `setupUI()` (функция): Инициализирует объект `ui` путем поиска элементов в DOM и вызывает `initializePanelState`.
    *   `toggleGestureArea(show)` (функция): Переключает видимость области жестов.
    *   `initializePanelState()` (функция): Инициализирует состояние панелей (видимость) из `localStorage`.
    *   `togglePanels()` (функция): Переключает видимость левой/правой панелей и сохраняет состояние.
    *   `toggleChatMode()` (функция): Переключает UI между режимом чата и режимом ввода основного промпта.
*   **Ключевые зависимости:** Нет прямых зависимостей от других модулей проекта.
*   **Взаимодействие с `state`:**
    *   Этот модуль определяет и экспортирует объект `ui`, который содержит ссылки на DOM-элементы. `setupUI` наполняет этот объект.
    *   Функции `initializePanelState` и `togglePanels` используют `localStorage` для сохранения и загрузки состояния видимости панелей, а не напрямую `state`.
    *   Другие функции (`toggleGestureArea`, `toggleChatMode`) не взаимодействуют напрямую с глобальным `state`.

## `js/core/consentManager.js`

*   **Назначение:** Управляет получением и хранением согласия пользователя, используя модальное окно для запроса согласия и `localStorage` для его сохранения.
*   **Экспортируемый API:**
    *   `ConsentManager` (class):
        *   `constructor(state)`: Принимает объект глобального состояния `state` для доступа к UI элементам.
        *   `initialize()` (async функция): Инициализирует логику запроса согласия. Возвращает Promise, который разрешается, когда пользователь дает согласие. Проверяет `localStorage` на наличие ранее данного согласия.
*   **Ключевые зависимости:** Нет прямых зависимостей от других модулей проекта, но использует DOM API и `localStorage`.
*   **Взаимодействие с `state`:**
    *   Принимает `state` в конструкторе.
    *   Читает: `state.uiElements.modals.startSessionModal`, `state.uiElements.buttons.startSessionButton`.
    *   Не модифицирует `state` напрямую, но использует его для доступа к UI элементам.

## `js/core/3d/audioVisualizer.js`

*   **Назначение:** Предполагается для размещения основной или общей логики 3D-визуализации аудио. **Файл реализован и содержит функциональность.**
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `js/core/audio/audioPlayer.js`

*   **Назначение:** Предполагается для инкапсуляции основной или общей логики воспроизведения аудио. **Файл реализован и содержит функциональность.**
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `js/core/multimodal/handsTracking.js`

*   **Назначение:** Предполагаемое новое место для основной логики отслеживания рук с использованием MediaPipe. **В настоящее время файл содержит только импорты и является заглушкой. Функциональная реализация находится в `js/multimodal/handsTracking.js`.**
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:**
    *   `@mediapipe/hands`
    *   `@mediapipe/camera_utils`
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `js/core/multimodal/speechInput.js`

*   **Назначение:** Предполагается для размещения основной логики обработки речевого ввода. **Файл реализован и содержит функциональность.** Функциональные реализации есть в `js/audio/speechInput.js` и `js/multimodal/voice_input.js`.
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `js/core/multimodal/webRTC.js`

*   **Назначение:** Предполагается для реализации основной логики WebRTC для peer-to-peer коммуникации. **Файл реализован и содержит функциональность.**
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `js/core/services/apiService.js`

*   **Назначение:** Предоставляет функции для взаимодействия с основными API бэкенда (развернутого на Koyeb), такими как синхронизация аутентификации пользователя (`/auth_sync`) и отправка сообщений чата (`/tria_chat_handler`).
*   **Экспортируемый API:**
    *   `syncUserAuth(idToken)` (async функция): Отправляет Firebase ID токен на бэкенд для синхронизации пользователя. Использует `fetch`.
    *   `sendChatMessage(messageText, idToken)` (async функция): Отправляет сообщение чата и ID токен на бэкенд. Использует `fetch`.
*   **Ключевые зависимости:** Нет прямых зависимостей от других модулей проекта, но использует нативный `fetch` API.
*   **Взаимодействие с `state`:** Нет.

## `js/core/services/nethologlyphClient.js`

*   **Назначение:** Предполагается для реализации клиента для взаимодействия с сервером 'NetHoloGlyph'. **Файл реализован и содержит функциональность.**
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `js/core/ui/chatUI.js`

*   **Назначение:** Управляет пользовательским интерфейсом чата, включая отображение сообщений и отправку сообщений на бэкенд (Cloud Function).
*   **Экспортируемый API:**
    *   `initChatUI()` (функция): Инициализирует DOM-элементы чата и слушатели событий для отправки сообщений.
*   **Ключевые зависимости:**
    *   `../firebaseInit.js` (для `auth` - получения текущего пользователя).
*   **Взаимодействие с `state`:** Нет. Использует `auth.currentUser` для получения ID пользователя.

## `js/core/ui/panelManager.js`

*   **Назначение:** Определяет класс `PanelManager`, предназначенный для управления UI-панелями. **Содержит минимальную реализацию с конструктором и базовой функциональностью.** Более функциональные менеджеры панелей: `js/ui/panelManager.js` для контента внутри панелей и `js/panels/rightPanelManager.js` для управления правой панелью.
*   **Экспортируемый API:**
    *   `PanelManager` (class, default export).
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `js/core/ui/uiManager.js`

*   **Назначение:** Определяет класс `UIManager` для общего управления UI. **В настоящее время является минимальной з��глушкой, содержащей только конструктор, который получает ссылку на `PanelManager` из `state`.** Основной модуль сбора ссылок на UI-элементы и инициализации UI находится в `js/ui/uiManager.js`.
*   **Экспортируемый API:**
    *   `UIManager` (class, default export).
*   **Ключевые зависимости:**
    *   `../init.js` (для `state`).
*   **Взаимодействие с `state`:** Читает `state.panelManager` при инстанцировании.

## `js/3d/hologramRenderer.js`

*   **Назначение:** Определяет класс `HologramRenderer` для создания и управления 3D-визуализацией аудио-голограммы в предоставленной сцене Three.js. Он создает и обновляет сетчатую структуру, представляющую аудиоданные, с колонками, которые реагируют на уровни аудио.
*   **Экспортируемый API:**
    *   `HologramRenderer` (class):
        *   `constructor(scene: THREE.Scene)`: Принимает объект сцены Three.js.
        *   `updateVisuals(dbLevels: Float32Array, panAngles: Float32Array)`: Обновляет визуализацию на основе аудиоданных (уровни громкости и углы панорамирования). Если данные `null` или некорректны, визуализация сбрасывается.
        *   `getHologramPivot(): THREE.Group`: Возвращает основной узел (группу) голограммы, который может быть добавлен в сцену.
*   **Ключевые зависимости:**
    *   `three` (импортируется напрямую)
    *   `three/addons/lines/Line2.js`
    *   `three/addons/lines/LineMaterial.js`
    *   `three/addons/lines/LineGeometry.js`
    *   `three/addons/loaders/GLTFLoader.js`
    *   `three/addons/loaders/KTX2Loader.js`
    *   `three/addons/libs/meshopt_decoder.module.js`
    *   `../config/hologramConfig.js` (для `semitones`, `GRID_WIDTH`, `GRID_HEIGHT`, `GRID_DEPTH`, `CELL_SIZE`)
    *   `../core/eventBus.js` (для подписки на результаты CWT)
*   **Взаимодействие с `state`:** Не взаимодействует напрямую с глобальным `state` из `core/init.js` для своих внутренних операций. Работает с переданным ему объектом `THREE.Scene`. Экземпляр этого класса хранится в `state.hologramRendererInstance`. Подписывается на событие `cwtResult` через `eventBus`.

## `js/3d/rendering.js`

*   **Назначение:** Отвечает за главный цикл анимации (`renderer.setAnimationLoop`) и рендеринг 3D-сцены. Обновляет TWEEN-анимации и вызывает `updateVisuals` у `hologramRendererInstance`.
*   **Экспортируемый API:**
    *   `startAnimationLoop(appState)` (функция): Запускает основной цикл рендеринга, передавая ему объект состояния приложения (`appState`).
    *   `updateHologramMesh()` (функция): Заглушка для возможного обновления меша голограммы (в настоящее время не используется).
*   **Ключевые зависимости:**
    *   `@tweenjs/tween.js` (импортируется напрямую)
    *   `three` (импортируется напрямую)
    *   `../3d/hologramRenderer.js`
    *   `../audio/microphoneManager.js`
*   **Взаимодействие с `state` (передается как `appState`):**
    *   Читает: `appState.renderer`, `appState.scene`, `appState.activeCamera`, `appState.hologramRendererInstance`, `appState.audio.currentDbLevels`, `appState.audio.currentPanAngles`.
    *   Не модифицирует `state` напрямую, но использует его свойства для рендеринга и обновления визуализации.

## `js/3d/sceneSetup.js`

*   **Назначение:** Инициализирует базовую 3D-сцену Three.js, WebGPU рендерер, ортографическую камеру и основное освещение. Обрабатывает ошибки инициализации WebGPU.
*   **Экспортируемый API:**
    *   `initializeScene(state)` (async функция): Инициализирует компоненты сцены (сцена, рендерер, камера, освещение) и записывает их в переданный объект `state`. Возвращает объект с инициализированными `scene`, `renderer`, `camera` или `null` в случае критической ошибки WebGPU.
*   **Ключевые зависимости:**
    *   `three` (импортируется напрямую).
*   **Взаимодействие с `state`:**
    *   Записывает: `state.scene`, `state.renderer`, `state.camera`, `state.activeCamera`, `state.ambientLight`, `state.directionalLight`.

## `js/3d/webgpu/hologram_shader_webgpu.js`

*   **Назначение:** Содержит заглушки для WGSL (WebGPU Shading Language) шейдеров (вершинного и фрагментного) для рендеринга голограмм с использованием WebGPU. **В наст��ящее время экспорты закомментированы, и файл является концептуальным плейсхолдером.**
*   **Экспортируемый API:** Нет (планируемые экспорты: `HOLOGRAM_VERTEX_SHADER_WGSL`, `HOLOGRAM_FRAGMENT_SHADER_WGSL` - строки с кодом WGSL).
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `js/3d/webgpu/webgpu_renderer.js`

*   **Назначение:** Определяет класс `WebGPURenderer` для инкапсуляции логики рендеринга с использованием WebGPU. Включает инициализацию WebGPU адаптера, устройства и настройку контекста. **В настоящее время содержит базовую структуру и заглушки для полной реализации, а экспорт класса закомментирован.**
*   **Экспортируемый API:** Нет (планируемый экспорт: `WebGPURenderer` class с методами `init`, `renderFrame`).
*   **Ключевые зависимости:** Нет прямых зависимостей от других модулей проекта, но использует WebGPU API.
*   **Взаимодействие с `state`:** Нет.

## `js/audio/audioAnalyzer.js`

*   **Назначение:** Определяет класс `AudioAnalyzer`. **Модуль полностью устарел и не используется**, так как анализ аудио теперь выполняется WASM AudioWorklet. Содержит заглушки для обратной совместимости.
*   **Экспортируемый API:**
    *   `AudioAnalyzer` (class):
        *   `constructor()`
        *   `getSemitoneLevels()`: Возвращает пустой массив (заглушка).
        *   `setAnalyserNode(newNode)`: Не выполняет операций (заглушка).
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `js/audio/audioFilePlayer.js`

*   **Назначение:** Определяет класс `AudioFilePlayer` для управления загрузкой и воспроизведением аудиофайлов. Он также управляет переключением активного источника аудио (микрофон/файл) и соответствующими анализаторами.
*   **Экспортируемый API:**
    *   `AudioFilePlayer` (class):
        *   `constructor(audioContext, globalState)`: Принимает `AudioContext` и объект глобального состояния `globalState`.
        *   `initializeAudioPlayerControls()`: Инициализирует DOM-элемен��ы управления плеером и прикрепляет к ним слушатели событий.
        *   `loadAudioFile(event)` (async): Обработчик события изменения файла для `fileInput`. Загружает и декодирует аудиофайл, переключает активный источник на файл и отключает микрофонные треки.
        *   `playAudio()`: Начинает или возобновляет воспроизведение загруженного аудиофайла. Подключает источник к цепочке обработки аудио (`setupAudioProcessing`) и устанавливает соответствующие анализаторы.
        *   `pauseAudio()`: Приостанавливает воспроизведение аудиофайла.
        *   `stopAudio()`: Останавливает воспроизведение аудиофайла, сбрасывает состояние плеера и переключает активный источник аудио обратно на микрофон, повторно включая микрофонные треки.
*   **Ключевые зависимости:**
    *   `../core/init.js` (для `state`)
    *   `./audioProcessing.js` (для `getAudioContext`, `setupAudioProcessing`)
*   **Взаимодействие с `state`:**
    *   Читает: `state.multimodal.currentStream`, `state.audioAnalyzerLeftInstance`, `state.audioAnalyzerRightInstance`, `state.audio.filePlayerAnalysers`, `state.audio.microphoneAnalysers`, `state.audio.audioContext`.
    *   Записывает: `state.audio.audioContext` (при необходимости), `state.audio.activeSource`, `state.audio.filePlayerGainNode`, `state.audio.filePlayerAnalysers`, `state.multimodal.currentStream` (изменяет `enabled` треков). Вызывает `setAnalyserNode` на экземплярах `AudioAnalyzer` в `state`.

## `js/audio/audioProcessing.js`

*   **Назначение:** Управляет `AudioContext` и настраивает цепочку обработки аудио через `AudioWorkletNode` для анализа с помощью WASM. Отвечает за загрузку `waveletAnalyzer.js` как AudioWorklet модуля и передачу данных в основной поток.
*   **Экспортируемый API:**
    *   `setupAudioProcessing(sourceNode, type)` (async функция): Асинхронно загружает AudioWorklet (`waveletAnalyzer.js`), создает `AudioWorkletNode` ('cwt-processor'), инициализирует его и подключает `sourceNode`. Принимает `AudioNode` (источник аудио) и `type` ('file' или 'microphone').
    *   `getAudioContext()` (функция): Возвращает или создает/возобновляет глобальный `AudioContext`.
*   **Ключевые зависимости:**
    *   `../core/init.js` (для `state`)
    *   `../audio/waveletAnalyzer.js` (загружается как AudioWorklet модуль)
*   **Взаимодействие с `state`:**
    *   Читает: `state.audio.audioContext`, `state.audio.targetFrequencies`.
    *   Записывает: `state.audio.audioContext`, `state.audio.currentDbLevels`, `state.audio.currentPanAngles`, `state.audio.filePlayerGainNode`, `state.audio.cwtProcessorNodeFile`, `state.audio.microphoneGainNode`, `state.audio.cwtProcessorNodeMicrophone`, `state.audio.audioSource`, `state.audio.activeSource`. Получает `currentDbLevels` и `currentPanAngles` из `AudioWorkletNode` через `postMessage`.

## `js/audio/audioVisualizer.js`

*   **Назначение:** Инициализирует связь между аудио анализом и 3D-визуализацией. **Модуль устарел, и его основная логика цикла анимации визуализации (`animateAudioVisuals`) перенесена в `rendering.js`. Модуль ссылается на устаревший `AudioAnalyzer` и используется для связывания экземпляров анализаторов и рендерера из глобального состояния.**
*   **Экспортируемый API:**
    *   `initAudioVisualization()` (функция): Проверяет наличие инстансов анализаторов и рендерера в `state` и устанавливает локальную ссылку на `hologramRendererInstance`.
*   **Ключевые зависимости:**
    *   `./audioAnalyzer.js` (импортирует устаревший `AudioAnalyzer`)
    *   `../3d/hologramRenderer.js` (импортирует `HologramRenderer`)
    *   `../core/init.js` (для `state`)
*   **Взаимодействие с `state`:** Читает `state.audioAnalyzerLeftInstance`, `state.audioAnalyzerRightInstance`, `state.hologramRendererInstance`.

## `js/audio/cwt_analyzer.js`

*   **Назначение:** Определяет класс `CWTAnalyzer` для выполнения анализа аудиоданных с использованием непрерывного вейвлет-преобразования (CWT) через WebAssembly. **В настоящее время содержит концептуальную структуру и заглушки, а экспорт класса закомментирован.**
*   **Экспортируемый API:** Нет (планируемый экспорт: `CWTAnalyzer` class с методами `constructor(wasmInstance)`, `performCWT(audioDataFloat32Array)`).
*   **Ключевые зависимости:**
    *   (Предполагается) WebAssembly модуль (например, из `../wasm/src/audio_analyzer_rs/pkg/audio_analyzer_rs.js`).
*   **Взаимодействие с `state`:** Нет.

## `js/audio/microphoneManager.js`

*   **Назначение:** Определяет класс `MicrophoneManager` для управления доступом к микрофону, получения аудиопотока и подключения к цепочке обработки аудио через `AudioWorklet`.
*   **Экспортируемый API:**
    *   `MicrophoneManager` (class):
        *   `constructor(audioContext, state, fftSize, smoothingTimeConstant)`: Принимает `AudioContext`, объект глобального состояния `state` и опциональные параметры для анализатора.
        *   `initializeWithStream(stream, appStateParam)` (async): Инициализирует аудиограф с существующим `MediaStream` (полученным из `getUserMedia`). Подключает поток к `ChannelSplitter` (для стерео) или напрямую к `AudioWorklet` через `setupAudioProcessing`.
        *   `init()` (async): Запрашивает доступ к микрофону через `getUserMedia` и вызывает `initializeWithStream`.
        *   `stop()`: Останавливает микрофонный поток и отключает аудиоузлы.
        *   `destroy()`: Останавливает микрофон и удаляет слушатель изменения видимости страницы.
        *   `getAudioContext()`: Возвращает `AudioContext`.
        *   `toggleMicrophone()` (async): Переключает состояние микрофона (вкл/выкл), обновляет UI и переключает активный источник аудио в `state`.
*   **Ключевые зависимости:**
    *   `../config/hologramConfig.js` (для `FFT_SIZE`, `SMOOTHING_TIME_CONSTANT`)
    *   `./audioProcessing.js` (для `setupAudioProcessing`)
*   **Взаимодействие с `state`:**
    *   Принимает `state` в конструкторе и в `initializeWithStream`.
    *   Читает: `state.uiElements.buttons.microphoneButton`, `state.audio.activeSource`.
    *   Записывает: `state.audio.audioContext`, `state.audio.microphoneStream`, `state.audio.activeSource`.

## `js/audio/speechInput.js`

*   **Назначение:** Реализует распознавание речи через Web Speech API для ввода текста в чат. Управляет состоянием кнопки микрофона и переключает UI в режим чата при активации.
*   **Экспортируемый API:**
    *   `initializeSpeechInput(state)` (функция): Инициализирует Web Speech API, получает ссылки на DOM-элементы из `state` и настраивает слушатели событий. Возвращает `true` при успешной инициализации, `false` в противном случае.
    *   `isRecognitionActive()` (функция): Возвращает текущий статус активности распознавания.
*   **Ключевые зависимости:** Нет прямых зависимостей от других модулей проекта.
*   **Взаимодействие с `state`:**
    *   Принимает `state` в качестве параметра.
    *   Читает: `state.uiElements.buttons.micButton`, `state.uiElements.inputs.chatInput`, `state.uiElements.actions.submitChatMessage`, `state.uiElements.buttons.triaButton`.

## `js/audio/waveletAnalyzer.js`

*   **Назначение:** Определяет `CwtProcessor`, класс `AudioWorkletProcessor`, для выполнения анализа аудиоданных (CWT) с использованием WebAssembly в отдельном аудио-потоке. Он загружает WASM-модуль `fastcwt_processor.js` и обрабатывает аудиоданные, отправляя результаты (уровни громкости и углы панорамирования) обратно в основной поток.
*   **Экспортируемый API:** Класс `CwtProcessor` регистрируется через `registerProcessor('cwt-processor', CwtProcessor)`.
*   **Ключевые зависимости:**
    *   `../wasm/fastcwt/fastcwt_processor.js` (для WASM-функций `init`, `encode_audio_to_hologram`).
*   **Взаимодействие с `state`:** Нет прямого взаимодействия. Обменивается данными с основным потоком (модулем `audioProcessing.js`) через `port` (`postMessage` и `onmessage`).

## `js/ai/chat.js`

*   **Назначение:** Управляет основной логикой и UI чата, включая интерактивный тур по интерфейсу, отправку сообщений на бэкенд (FastAPI или публичный эндпоинт) и синтез речи. Также обрабатывает форматирование сообщений (базовый Markdown).
*   **Экспортируемый API:**
    *   `setupChat(appState)` (функция): Инициализирует UI чата, получает ссылки на DOM-элементы из `appState` и настраивает обработчики ввода текста.
    *   `sendChatMessage(messageText)` (async функция): Отправляет сообщение пользователя на бэкенд, обрабатывает ответ, управляет туром (если активен) и отображает ответ бота. Использует `fetch` для запросов к API.
    *   `addMessageToChat(sender, message)` (функция): Добавляет отформатированное сообщение в UI чата и в массив `chatMessages`.
    *   `chatMessages` (массив): История сообщений чата.
*   **Ключевые зависимости:**
    *   `./models.js` (для `getSelectedModel`)
    *   `../core/init.js` (для `state` - передается как `appState`)
*   **Взаимодействие с `state` (передается как `appState`):**
    *   Читает: `appState.uiElements.containers.chatMessages`, `appState.uiElements.inputs.chatInput`, `appState.uiElements.inputs.modelSelect`.
    *   Не модифицирует `state` напрямую, но использует его для доступа к UI элементам и для получения выбранной модели.

## `js/ai/models.js`

*   **Назначение:** Управляет выбором и конфигурацией моделей ИИ (LLM).
*   **Экспортируемый API:**
    *   `models` (объект): Перечисление доступных ID моделей.
    *   `modelMetadata` (объект): Метаданные для каждой модели (имя, описание).
    *   `getSelectedModel(modelSelectElement)` (функция): Возвращает ID текущей выбранной модели.
    *   `setSelectedModel(model, modelSelectElement)` (функция): Устанавливает выбранную модель и сохраняет ее в `localStorage`.
    *   `initializeModelSelector()` (функция): Инициализирует UI элемент (dropdown `#modelSelect`) для выбора модели.
    *   `selectedModel` (переменная): ID текущей выбранной модели (экспортируется, но предпочтительнее использовать `getSelectedModel`).
*   **Ключевые зависимости:** Нет зависимостей от других модулей проекта.
*   **Взаимодействие с `state`:** Нет. Использует `localStorage` для сохранения выбора модели.

## `js/ai/prompts.js`

*   **Назначение:** Управляет отправкой структурированных 'промптов' на специальный эндпоинт бэкенда (`/prompt`). Включает вставку текста в поле ввода промпта, обработку ответа от бэкенда, отображение статусов, и потенциальное применение изменений к 'голограмме', включая управление UI для версионирования.
*   **Экспортируемый API:**
    *   `initializePrompts(passedState)` (функция): Инициализация системы промптов. Принимает объект состояния приложения (`passedState`).
    *   `sendPrompt(promptText, passedState)` (async функция): Отправляет промпт на бэкенд, обрабатывает ответ, обновляет UI версий. Принимает текст промпта и объект состояния приложения (`passedState`).
    *   `insertTextIntoPrompt(text, passedState)` (функция): Вставляет текст в поле ввода основного промпта. Принимает текст для вставки и объект состояния приложения (`passedState`).
*   **Ключевые зависимости:**
    *   `./models.js` (для `getSelectedModel`)
    *   `axios` (глобально, для HTTP-запросов к `/prompt` и `/branches`)
*   **Взаимодействие с `state` (передается как `passedState`):**
    *   Читает: `passedState.uiElements.inputs.topPromptInput`, `passedState.uiElements.inputs.modelSelect`, `passedState.currentBranch`, `passedState.hologramVersions`, `passedState.currentVersion`, `passedState.uiElements.containers.versionFrames`.
    *   Записывает: `passedState.uiElements.inputs.topPromptInput.value`, `passedState.currentVersion`, `passedState.hologramVersions` (при создании новой версии).

## `js/ai/tria.js`

*   **Назначение:** Управляет конфигурацией и некоторыми UI-аспектами, связанными с AI 'Триа', включая режим обучения. Включает инициализацию селектора моделей и UI Триа.
*   **Экспортируемый API:**
    *   `triaConfig` (объект): Конфигурационные данные Tria (API URL, версия, параметры модели).
    *   `initializeTria(state)` (функция): Инициализирует селектор моделей и UI Триа. Принимает объект глобального состояния `state`.
    *   `getTriaUsageStats()` (async функция): Заглушка для получения статистики использования Tria с бэкенда.
    *   `toggleTriaLearningMode(triaButton, modelSelect, state)` (функция): Переключает режим обучения Триа и обновляет UI. Принимает ссылки на DOM-элементы кнопок и объект глобального состояния `state`.
*   **Ключевые зависимости:**
    *   `./models.js` (для `initializeModelSelector`)
*   **Взаимодействие с `state`:**
    *   Принимает `state` в `initializeTria` и `toggleTriaLearningMode`.
    *   Читает: `state.uiElements.labels.triaVersion` (для отображения версии), `state.tria.isLearningActive`.
    *   Записывает: `state.tria.isLearningActive` (для переключения режима обучения).

## `js/ai/tria_mode.js`

*   **Назначение:** Управляет "Режимом Триа", перенаправляя запросы на эндпоинт `/chat` при его активации. Инициализирует кнопку переключения режима Триа.
*   **Экспортируемый API:**
    *   `isTriaModeActive()` (функция): Возвращает `true`, если режим Триа активен (читает из `state.isTriaModeActive`).
    *   `initializeTriaMode()` (функция): Инициализирует кнопку `#triaButton` и ее состояние для переключения режима. Добавляет слушатель клика для переключения `state.isTriaModeActive`.
    *   `applyPromptWithTriaMode(prompt, model)` (async функция): Отправляет промпт на `/chat` если режим Триа активен; иначе возвращает `false`, чтобы основной код ��ог выполнить стандартную логику. Управляет индикатором загрузки и блокировкой кнопки отправки.
*   **Ключевые зависимости:**
    *   `../core/init.js` (для `state`).
*   **Взаимодействие с `state`:** Читает и записывает `state.isTriaModeActive`. Также читает `state.uiElements.inputs.topPromptInput` и `state.uiElements.inputs.modelSelect` косвенно через `applyPrompt` в `domEventHandlers.js`.

## `js/config/hologramConfig.js`

*   **Назначение:** Определяет и экспортирует конфигурационные константы и данные для визуализации голограммы, включая параметры цвета, аудио, сетки и масштаба. Также генерирует массив `semitones`.
*   **Экспортируемый API:**
    *   Константы: `START_HUE`, `END_HUE`, `SATURATION`, `LIGHTNESS`, `BASE_FREQUENCY`, `NOTES_PER_OCTAVE`, `STARTING_OCTAVE`, `NOTES` (массив), `FFT_SIZE`, `SMOOTHING_TIME_CONSTANT`, `GRID_WIDTH`, `GRID_HEIGHT`, `GRID_DEPTH`, `CELL_SIZE`, `HOLOGRAM_REFERENCE_HEIGHT`.
    *   `degreesToCells(index)` (функция): Вычисляет ширину визуальной колонки на основе индекса.
    *   `semitones` (массив): Массив объектов, описывающих каждый полутон/колонку (частота, ширина, цвет и т.д.).
*   **Ключевые зависимости:**
    *   `three` (импортируется напрямую).
*   **Взаимодействие с `state`:** Нет.

## `js/config/hologramConstants.js`

*   **Назначение:** Генерирует и экспортирует массив `semitones`. **Примечание: Функциональность и константы этого модуля полностью дублируют `js/config/hologramConfig.js`, который является предпочтительным и более полным источником этих данных. Этот файл, вероятно, устарел и подлежит удалению или слиянию.**
*   **Экспортируемый API:**
    *   `semitones` (массив, default export): Массив объектов, описывающих каждый полутон/колонку.
*   **Ключевые зависимости:**
    *   `three` (импортируется напрямую).
*   **Взаимодействие с `state`:** Нет.

## `js/gestures/detection.js`

*   **Назначение:** Предполагается для реализации логики распознавания жестов. (В настоящее время содержит только функцию-заглушку).
*   **Экспортируемый API:**
    *   `initializeGestureDetection()` (функция): Заглушка, выводит предупреждение в консоль.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `js/multimodal/handsTracking.js`

*   **Назначение:** Интегрирует MediaPipe Hands для отслеживания рук, управляет видеопотоком и отображает результаты в 2D и 3D. Использует `GestureIntentClassifier` для интерпретации жестов и `webSocketService` для отправки намерений.
*   **Экспортируемый API:**
    *   `startVideoStream(videoElement, handsInstance, stream)` (async функция): Запускает или использует существующий видеопоток для MediaPipe.
    *   `initializeMediaPipeHands()` (функция): Инициализирует MediaPipe Hands, настраивает коллбэки и запускает видеопоток.
    *   `stopVideoStream()` (функция): Останавливает видеопоток и очищает ресурсы MediaPipe.
*   **Ключевые зависимости:**
    *   `@mediapipe/hands` (импортируется напрямую)
    *   `@mediapipe/camera_utils` (импортируется ��апрямую)
    *   `../core/init.js` (для `state`)
    *   `../core/eventBus.js`
    *   `../ui/layoutManager.js` (для `updateHologramLayout`)
    *   `../ai/gestureIntentClassifier.js`
    *   `../services/websocketService.js`
*   **Взаимодействие с `state`:**
    *   Читает: `state.config`, `state.renderer`, `state.multimodal.videoElementForHands`, `state.multimodal.handsInstance`, `state.multimodal.cameraInstance`, `state.multimodal.gestureCanvasCtx`, `state.multimodal.gestureCanvas`, `state.gestureIntentClassifier`, `state.webAudioEngine`, `state.webAudioEngine.isInitialized`.
    *   Записывает: `state.multimodal.currentStream`, `state.multimodal.cameraInstance`, `state.multimodal.isGestureCanvasReady`, `state.multimodal.handsInstance`, `state.gestureIntentClassifier`, `state.multimodal.lastHandData`, `state.multimodal.handsVisible`.

## `js/multimodal/voice_input.js`

*   **Назначение:** Определяет класс `VoiceInputManager` для управления распознаванием речи ч��рез Web Speech API. **В настоящее время содержит базовую структуру и заглушки для полной реализации, а экспорт класса закомментирован.**
*   **Экспортируемый API:** Нет (планируемый экспорт: `VoiceInputManager` class с методами `constructor()`, `startRecognition()`, `stopRecognition()`, `getFinalTranscript()`).
*   **Ключевые зависимости:** Нет прямых зависимостей от других модулей проекта, но использует Web Speech API.
*   **Взаимодействие с `state`:** Нет.

## `js/panels/chatMessages.js`

*   **Назначение:** Управляет отображением сообщений в UI чата (`#chatMessages`) и предоставляет функцию синтеза речи (`speak`). Каждое сообщение дополняется кнопкой для копирования его содержимого в основное поле ввода промпта.
*   **Экспортируемый API:**
    *   `initializeChatDisplay()` (функция): Инициализирует ссылки на DOM-элементы чата (`#chatMessages`, `#topPromptInput`).
    *   `addMessageToChat(sender, message)` (функция): Добавляет отформатированное сообщение в UI чата с кнопкой "Вставить в промпт". Использует `textContent` для безопасности.
    *   `speak(text)` (функция): Озвучивает переданный текст с использованием Web Speech API, с приоритетом для русского голоса и обработкой загрузки голосов.
*   **Ключевые зависимости:**
    *   `./rightPanelManager.js` (для `toggleModeInternal`).
*   **Взаимодействие с `state`:** Нет.

## `js/panels/rightPanelManager.js`

*   **Назначение:** Управляет переключением режимов отображения содержимого в правой панели интерфейса, в основном между режимом 'Таймлайн' и режимом 'Чат'.
*   **Экспортируемый API:**
    *   `initializeRightPanel(appState)` (функция): Инициализирует DOM-элементы правой панели, получая их из `appState.uiElements`, и назначает обработчик на кнопку чата. Возвращает `true` при успешной инициализации, `false` в противном случае.
    *   `switchToChatMode()` (функция): Программно переключает панель в режим чата.
    *   `getCurrentMode()` (функция): Возвращает текущий активный режим ('chat', 'timeline') или 'unknown', если панель не инициализирована.
    *   `toggleModeInternal()` (функция): Внутренняя функция для переключения режимов. Управляет видимостью элементов UI и автофокусом.
*   **Ключевые зависимости:** Нет прямых зависимостей от других модулей проекта, но использует DOM API.
*   **Взаимодействие с `state` (передается как `appState`):**
    *   Принимает `appState` в `initializeRightPanel`.
    *   Читает: `appState.uiElements.buttons.chatButton`, `appState.uiElements.actions.submitTopPrompt`, `appState.uiElements.actions.submitChatMessage`, `appState.uiElements.versionTimeline`, `appState.uiElements.chatHistory`, `appState.uiElements.inputs.topPromptInput`, `appState.uiElements.inputs.chatInput`, `appState.uiElements.containers.promptBar`, `appState.uiElements.containers.chatInputBar`, `appState.uiElements.indicators.loadingIndicator`.

## `js/platforms/desktop/desktopInput.js`

*   **Назначение:** Определяет класс `DesktopInput` для инициализации и управления всеми основными обработчиками событий пользовательского ввода, специфичными для десктопной платформы. Он также отвечает за инициализацию многих других ключевых модулей приложения, передавая им глобальное состояние.
*   **Экспортируемый API:**
    *   `DesktopInput` (class, default export):
        *   `constructor(globalState)`: Принимает объект глобального состояния `globalState`.
        *   `initialize()`: Инициализирует слушатели клавиатуры, мыши и общих кнопок. Вызывает функции инициализации для `prompts`, `versionManager`, `chat`, `speechInput`, `tria`, `resizeHandler`, `hammerGestures`, `rightPanelManager`, `fileEditor`.
        *   `setupKeyboardListeners()`: Настраивает слушатели для поля ввода основного промпта и кнопки отправки.
        *   `setupMouseListeners()`: Настраивает слушатели для кнопки GitHub, кнопок закрытия модальных окон и кнопки отправки промпта из модального окна.
        *   `setupGeneralButtonListeners()`: Настраивает слушатели для кнопок переключения файлов, полноэкранного режима, загрузки аудиофайлов, микрофона, воспроизведения/паузы/остановки аудио, а также заглушки для кнопок камеры, записи жестов, сканирования и Bluetooth.
*   **Ключевые зависимости:**
    *   `../../core/domEventHandlers.js` (для `applyPrompt`)
    *   `../../utils/fullscreen.js` (для `toggleFullscreen`, `initFullscreenListeners`)
    *   `../../ai/prompts.js` (для `initializePrompts`)
    *   `../../ui/versionManager.js` (для `initializeVersionManager`)
    *   `../../ai/chat.js` (для `setupChat`)
    *   `../../audio/speechInput.js` (для `initializeSpeechInput`)
    *   `../../ai/tria.js` (для `initializeTria`)
    *   `../../core/resizeHandler.js` (для `initializeResizeHandler`)
    *   `../../core/gestures.js` (для `initializeHammerGestures`)
    *   `../../panels/rightPanelManager.js` (для `initializeRightPanel`)
    *   `../../ui/fileEditor.js` (для `initializeFileEditor`)
*   **Взаимодействие с `state`:**
    *   Получает `globalState` в конструкторе и передает его многим другим модулям при их инициализации.
    *   Читает: `this.state.audioFilePlayer`, `this.state.microphoneManager` для вызова их методов.

## `js/platforms/desktop/desktopLayout.js`

*   **Назначение:** Определяет класс `DesktopLayout` для управления макетом и видимостью основных UI панелей на десктопной платформе. Он инициализирует состояние панелей из `localStorage` и обрабатывает их переключение.
*   **Экспортируемый API:**
    *   `DesktopLayout` (class, default export):
        *   `constructor(state)`: Принимает объект глобального состояния `state`.
        *   `initialize()`: Инициализирует ссылки на DOM-элементы панелей из `state.uiElements`, устанавливает их начальное состояние и добавляет слушатель клика для кнопки переключения панелей.
        *   `initializeMainPanelState()`: Устанавливает начальную видимость панелей из `localStorage` и вызывает `updateHologramLayout`.
        *   `toggleMainPanels()`: Переключает видимость левой/правой панелей, обновляет класс кнопки переключения и сохраняет состояние в `localStorage`. Также вызывает `updateHologramLayout`.
*   **Ключевые зависимости:**
    *   `../../ui/layoutManager.js` (для `updateHologramLayout`)
*   **Взаимодействие с `state`:**
    *   Принимает `state` в конструкторе.
    *   Читает: `state.uiElements.leftPanel`, `state.uiElements.rightPanel`, `state.uiElements.togglePanelsButton`.
    *   Не модифицирует `state` напрямую, но использует его для доступа к UI элементам и передает его в `updateHologramLayout`. Использует `localStorage` для сохранения состояния панелей.

## `js/platforms/mobile/mobileInput.js`

*   **Назначение:** Определяет класс `MobileInput` для обработки событий ввода, специфичных для мобильных платформ, включая инициализацию мультимедиа при первом взаимодействии.
*   **Экспортируемый API:**
    *   `MobileInput` (class):
        *   `constructor()`
        *   `initialize()`: Инициализирует все слушатели.
        *   `setupTouchListeners()`: Настройка сенсорных слушателей (например, для `#gesture-area`).
        *   `setupFirstInteractionListener()`: Настройка слушателя первого взаимодействия для запуска `initializeMultimedia`.
*   **Ключевые зависимости:**
    *   `../../core/init.js` (для импорта `state`, хотя прямое использование не очевидно в текущем коде).
    *   `../../core/mediaInitializer.js` (для `initializeMultimedia`).
*   **Взаимодействие с `state`:** Косвенное, через вызов `initializeMultimedia`, который взаимодействует с `state`.

## `js/platforms/mobile/mobileLayout.js`

*   **Назначение:** Определяет класс `MobileLayout` для управления макетом UI на мобильных платформах, включая видимость панелей и адаптацию области жестов к ориентации экрана. Инициализирует состояние панелей и обрабатывает изменения ориентации.
*   **Экспортируемый API:**
    *   `MobileLayout` (class, default export):
        *   `constructor(state)`: Принимает объект глобального состояния `state`.
        *   `initialize()`: Инициализирует ссылки на DOM-элементы панелей и области жестов из `state.uiElements`, устанавливает их начальное состояние и добавляет слушатель клика для кнопки переключения панелей.
        *   `initializeMainPanelState()`: Устанавливает начальное состояние видимос��и панелей (левая видима, правая скрыта) и вызывает `updateHologramLayout`.
        *   `toggleMainPanels()`: Переключает видимость левой панели.
        *   `initializeGestureArea()`: Настраивает обработчики для области жестов, включая слушатели изменения ориентации и размера окна.
        *   `handleOrientationChange()`: Обновляет классы CSS области жестов (`portrait`/`landscape`) при смене ориентации экрана.
*   **Ключевые зависимости:**
    *   `../../ui/layoutManager.js` (для `updateHologramLayout`)
*   **Взаимодействие с `state`:**
    *   Принимает `state` в конструкторе.
    *   Читает: `state.uiElements.leftPanel`, `state.uiElements.rightPanel`, `state.uiElements.togglePanelsButton`, `state.uiElements.gestureArea`.
    *   Не модифицирует `state` напрямую, но использует его для доступа к UI элементам и передает его в `updateHologramLayout`.

## `js/platforms/xr/xrInput.js`

*   **Назначение:** Определяет класс `XrInput` для обработки ввода в WebXR. **В настоящее время является заглушкой, содержащей только базовую структуру и консольные логи.**
*   **Экспортируемый API:**
    *   `XrInput` (class, default export):
        *   `constructor(state)`: Принимает объект глобального состояния `state`.
        *   `initialize()`: Инициализирует обработчики XR-ввода (заглушка).
        *   `setupXrControllerListeners()`: Заглушка для настройки слушателей контроллеров.
*   **Ключевые зависимости:** Нет прямых зависимостей от других модулей проекта (предполагается использование WebXR Device API).
*   **Взаимодействие с `state`:**
    *   Принимает `state` в конструкторе, но не взаимодействует с ним напрямую в текущей реализации.

## `js/platforms/xr/xrLayout.js`

*   **Назначение:** Определяет класс `XrLayout` для управления макетом UI в WebXR. **В настоящее время является заглушкой, содержащей только базовую структуру и консольные логи.**
*   **Экспортиру��мый API:**
    *   `XrLayout` (class, default export):
        *   `constructor(appState)`: Принимает объект состояния приложения `appState`.
        *   `initialize()`: Заглушка для инициализации XR-макета.
        *   `toggleMainPanels()`: Заглушка для переключения панелей в XR.
*   **Ключевые зависимости:** Нет прямых зависимостей от других модулей проекта (предполагается использование WebXR Device API и Three.js).
*   **Взаимодействие с `state`:**
    *   Принимает `appState` в конструкторе, но не взаимодействует с ним напрямую в текущей реализации.
