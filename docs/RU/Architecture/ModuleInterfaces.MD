# Module Interfaces

Этот документ описывает публичные API и ключевые зависимости для JavaScript модулей.

## `frontend/js/core/init.js`

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

## `frontend/js/core/platformDetector.js`

*   **Назначение:** Определяет тип платформы (XR, mobile, desktop) на которой запущено приложение.
*   **Экспортируемый API:**
    *   `detectPlatform()` (функция): Возвращает строку 'xr', 'mobile', или 'desktop'.
*   **Ключевые зависимости:** Нет зависимостей от других модулей проекта.
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/core/stateManager.js`

*   **Назначение:** Предполагается для реализации основной логики управления состоянием. (В настоящее время является заглушкой. Глобальное состояние `state` определяется и управляется в `frontend/js/core/init.js`).
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `frontend/js/core/eventBus.js`

*   **Назначение:** Предполагается для реализации централизованной шины событий (Event Bus) для межмодульного взаимодействия. (В настоящее время является заглушкой).
*   **Экспортируемый API:** Нет (ожидаются функции типа `on`, `off`, `emit`).
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `frontend/js/core/mediaInitializer.js`

*   **Назначение:** Инициализирует мультимедийные компоненты, запрашивая доступ к камере и микрофону. Настраивает микрофон и видеопоток для отслеживания рук.
*   **Экспортируемый API:**
    *   `initializeMultimedia()` (async функция): Запрашивает `getUserMedia`, инициализирует `MicrophoneManager` и `handsTracking` с полученным `MediaStream`.
*   **Ключевые зависимости:**
    *   `./init.js` (для `state`)
    *   `../audio/microphoneManager.js` (для класса `MicrophoneManager`, используется через `state.microphoneManagerInstance`)
    *   `../multimodal/handsTracking.js` (для `startVideoStream`)
*   **Взаимодействие с `state`:**
    *   Читает: `state.audio.audioContext`, `state.microphoneManagerInstance`, `state.multimodal.videoElementForHands`, `state.multimodal.handsInstance`, `state.audioAnalyzerLeftInstance`, `state.audioAnalyzerRightInstance`.
    *   Записывает: `state.multimodal.currentStream`, `state.audio.audioContext`, `state.audio.microphoneAnalysers`, `state.audio.activeSource`. Вызывает `setAnalyserNode` на `state.audioAnalyzerLeftInstance` и `state.audioAnalyzerRightInstance`.

## `frontend/js/core/auth.js`

*   **Назначение:** Управляет аутентификацией пользователей через Firebase, включая UI и синхронизацию с бэкендом.
*   **Экспортируемый API:**
    *   `setAuthDOMElements(signInBtnId, signOutBtnId, userStatusId)` (функция): Устанавливает ссылки на DOM-элементы UI аутентификации и назначает слушатели.
    *   `signInWithGoogle()` (async функция): Инициирует вход через Google.
    *   `userSignOut()` (async функция): Выполняет выход пользователя.
    *   `initAuthObserver(callbackAfterToken)` (функция): Инициализирует наблюдатель за состоянием аутентификации Firebase; обновляет UI и вызывает `callbackAfterToken` с ID токеном.
    *   `handleTokenForBackend(token)` (async функция): Отправляет ID токен на бэкенд для синхронизации (используется как `callbackAfterToken`).
*   **Ключевые зависимости:**
    *   `./firebaseInit.js` (для `auth`, `GoogleAuthProvider`)
    *   Firebase SDK (для `signInWithPopup`, `signOut`, `onAuthStateChanged`, `getIdToken`)
    *   `./services/apiService.js` (для `syncUserAuth`)
*   **Взаимодействие с `state`:** Нет прямого взаимодействия с глобальным `state` из `core/init.js`.

## `frontend/js/core/appStatePersistence.js`

*   **Назначение:** Обеспечивает сохранение и загрузку состояния видимости UI панелей в `localStorage`.
*   **Экспортируемый API:**
    *   `loadPanelsHiddenState()` (функция): Загружает состояние видимости панелей из `localStorage`.
    *   `savePanelsHiddenState(isHidden)` (функция): Сохраняет состояние видимости панелей в `localStorage`.
*   **Ключевые зависимости:** Нет зависимостей от других модулей проекта.
*   **Взаимодействие с `state`:** Нет прямого взаимодействия с глобальным `state` из `core/init.js`.

## `frontend/js/core/diagnostics.js`

*   **Назначение:** Предоставляет функции для диагностики состояния фронтенд-приложения.
*   **Экспортируемый API:**
    *   `runFrontendDiagnostics()` (функция): Собирает и логирует в консоль информацию о глобальных объектах, DOM-элементах, состоянии ключевых компонентов из `state` и окружении. Возвращает объект с результатами диагностики. (Экспортируется как default: `{ runFrontendDiagnostics }`).
*   **Ключевые зависимости:**
    *   `./init.js` (для `state`)
*   **Взаимодействие с `state`:** Читает различные свойства из `state` для проверки их инициализации (например, `state.scene`, `state.camera`, `state.renderer`, `state.audioContext`, `state.xrMode`).

## `frontend/js/core/domEventHandlers.js`

*   **Назначение:** Содержит логику для файлового редактора (загрузка, отображение, открытие модального окна), обработку промптов (включая вызов Tria mode и отправку на `/generate`), и настройку `MutationObserver` для UI элементов жестов. Помечен как частично устаревший.
*   **Экспортируемый API:**
    *   `setupDOMEventHandlers()` (функция): Настраивает `MutationObserver` для UI жестов; основная часть логики помечена как устаревшая или перенесенная.
    *   `openFileInEditor(filePath)` (async функция): Открывает файл в модальном редакторе.
    *   `applyPrompt(prompt, model)` (async функция): Обрабатывает промпт, вызывает `applyPromptWithTriaMode`, или отправляет на `/generate`, выполняет сгенерированный код и создает новую версию через `/branches`.
*   **Ключевые зависимости:**
    *   `./init.js` (для `state`)
    *   `../ai/tria_mode.js` (для `applyPromptWithTriaMode`)
    *   `axios` (глобально)
    *   `three`
*   **Взаимодействие с `state`:** Читает `state.scene` и `state.mainSequencerGroup` при выполнении сгенерированного кода в `applyPrompt`.

## `frontend/js/core/events.js`

*   **Назначение:** Управляет `MutationObserver` для некоторых UI-элементов (панель жестов, сообщения чата, аудиоплеер) и настраивает слушатели для поля ввода чата.
*   **Экспортируемый API:**
    *   `setupDOMEventHandlers()` (функция): Настраивает `MutationObserver` для отслеживания изменений атрибутов или дочерних элементов у панели жестов, контейнера сообщений чата и контейнера аудиоплеера. (Примечание: эта функция не экспортируется из модуля `core/events.js` напрямую, а вызывается внутри `setupEventListeners`).
    *   `setupEventListeners()` (функция): Основная функция инициализации слушателей данного модуля, вызывает `setupChatTextInputListeners` и `setupDOMEventHandlers` (для observer'ов).
*   **Ключевые зависимости:**
    *   `../ui/uiManager.js` (для `uiElements`)
    *   `../ai/chat.js` (для `sendChatMessage`)
*   **Взаимодействие с `state`:** Нет прямого взаимодействия с глобальным `state` из `core/init.js`.

## `frontend/js/core/firebaseInit.js`

*   **Назначение:** Инициализирует и экспортирует экземпляры основных сервисов Firebase (App, Auth, Storage, Firestore) и `GoogleAuthProvider`.
*   **Экспортируемый API:**
    *   `app`: Экземпляр Firebase App.
    *   `auth`: Экземпляр Firebase Authentication.
    *   `storage`: Экземпляр Firebase Storage.
    *   `firestore`: Экземпляр Firebase Firestore.
    *   `GoogleAuthProvider`: Конструктор провайдера Google Auth.
*   **Ключевые зависимости:**
    *   Firebase SDK (импортируется с CDN).
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/core/gestures.js`

*   **Назначение:** Настраивает и управляет сенсорными жестами (pan, pinch) для взаимодействия с 3D-голограммой с использованием библиотеки `Hammer.js`.
*   **Экспортируемый API:**
    *   `initializeHammerGestures()` (функция): Инициализирует `Hammer.js` на DOM-элементе рендерера и настраивает обработчики жестов. Возвращает экземпляр Hammer.
*   **Ключевые зависимости:**
    *   `./init.js` (для `state`)
    *   `three` (для `THREE.MathUtils`, `THREE.Euler`)
    *   `Hammer.js` (глобально)
    *   `TWEEN.js` (глобально через `window.TWEEN`)
*   **Взаимодействие с `state`:**
    *   Читает: `state.renderer.domElement`, `state.isXRMode`, `state.hologramRendererInstance`, `state.camera`.
    *   Модифицирует: Вращение и масштаб `hologramPivot` (через `state.hologramRendererInstance`). Вращение `state.camera` в режиме XR.

## `frontend/js/core/pwaInstall.js`

*   **Назначение:** Управляет логикой установки Progressive Web Application (PWA).
*   **Экспортируемый API:**
    *   `initializePwaInstall()` (функция): Настраивает слушатели событий `beforeinstallprompt` и `appinstalled`, а также слушатель клика для кнопки установки PWA.
*   **Ключевые зависимости:** Нет зависимостей от других модулей проекта.
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/core/resizeHandler.js`

*   **Назначение:** Обрабатывает события изменения размера окна для адаптации макета UI и 3D-сцены.
*   **Экспортируемый API:**
    *   `getPanelWidths()` (функция): Возвращает суммарную ширину левой и правой панелей.
    *   `getLeftPanelWidth()` (функция): Возвращает ширину левой панели.
    *   `initializeResizeHandler()` (функция): Устанавливает слушатель `resize` на `window` с использованием `debounce`.
*   **Ключевые зависимости:**
    *   `three` (для `THREE.MathUtils`)
    *   `./init.js` (для `state`)
    *   `../ui/layoutManager.js` (для `updateHologramLayout`)
    *   `../utils/helpers.js` (для `debounce`)
*   **Взаимодействие с `state`:**
    *   Читает: `state.uiElements.leftPanel`, `state.uiElements.rightPanel`, `state.uiElements.gridContainer`, `state.uiElements.gestureArea`, `state.renderer`, `state.activeCamera`.
    *   Модифицирует: Свойства `state.renderer` (размер) и `state.activeCamera` (матрица проекции, FOV, аспект, ортографический объем).

## `frontend/js/core/ui.js`

*   **Назначение:** Управляет пользовательским интерфейсом, включая инициализацию ссылок на DOM-элементы, переключение видимости панелей, области жестов и режима чата.
*   **Экспортируемый API:**
    *   `ui` (объект): Структурированный объект, содержащий ссылки на DOM-элементы UI.
    *   `setupUI()` (функция): Инициализирует объект `ui` путем поиска элементов в DOM и вызывает `initializePanelState`.
    *   `toggleGestureArea(show)` (функция): Переключает видимость области жестов.
    *   `initializePanelState()` (функция): Инициализирует состояние панелей (видимость) из `localStorage`.
    *   `togglePanels()` (функция): Переключает видимость левой/правой панелей и сохраняет состояние.
    *   `toggleChatMode()` (функция): Переключает UI между режимом чата и режимом ввода основного промпта.
*   **Ключевые зависимости:**
    *   `./init.js` (для `state` - используется косвенно, если `uiElements` в `state` обновляются этим модулем или `uiManager.js`)
*   **Взаимодействие с `state`:** Косвенное. Этот модуль определяет и наполняет собственный объект `ui` ссылками на DOM. Если `state.uiElements` из `uiManager.js` является основным, то роль этого `ui` объекта требует уточнения.

## `frontend/js/core/consentManager.js`

*   **Назначение:** Управляет получением и хранением согласия пользователя.
*   **Экспортируемый API:**
    *   `initializeConsentManager()` (функция): Возвращает Promise; проверяет/запрашивает согласие пользователя через модальное окно.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/core/3d/audioVisualizer.js`

*   **Назначение:** Предполагается для размещения основной или общей логики 3D-визуализации аудио. (В настоящее время является заглушкой).
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `frontend/js/core/audio/audioPlayer.js`

*   **Назначение:** Предполагается для инкапсуляции основной или общей логики воспроизведения аудио. (В настоящее время является заглушкой).
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `frontend/js/core/multimodal/handsTracking.js`

*   **Назначение:** Предполагаемое новое место для основной логики отслеживания рук с использованием MediaPipe. (В настоящее время является заглушкой. Функциональная реализация находится в `frontend/js/multimodal/handsTracking.js`).
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `frontend/js/core/multimodal/speechInput.js`

*   **Назначение:** Предполагается для размещения основной логики обработки речевого ввода. (В настоящее время является заглушкой. Функциональные реализации есть в `frontend/js/audio/speechInput.js` и `frontend/js/multimodal/voice_input.js`).
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `frontend/js/core/multimodal/webRTC.js`

*   **Назначение:** Предполагается для реализации основной логики WebRTC для peer-to-peer коммуникации. (В настоящее время является заглушкой).
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `frontend/js/core/services/apiService.js`

*   **Назначение:** Предоставляет функции для взаимодействия с основными API бэкенда, такими как синхронизация аутентификации пользователя и отправка сообщений чата. (Примечание: Существует также `/services/apiService.js` для API, связанных с файловыми операциями).
*   **Экспортируемый API:**
    *   `syncUserAuth(idToken)` (async функция): Отправляет Firebase ID токен на бэкенд для синхронизации пользователя.
    *   `sendChatMessage(messageText, idToken)` (async функция): Отправляет сообщение чата и ID токен на бэкенд.
*   **Ключевые зависимости:** Нет зависимостей от других модулей проекта.
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/core/services/nethologlyphClient.js`

*   **Назначение:** Предполагается для реализации клиента для взаимодействия с сервером 'NetHoloGlyph'. (В настоящее время является заглушкой).
*   **Экспортируемый API:** Нет.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `frontend/js/core/ui/chatUI.js`

*   **Назначение:** Управляет пользовательским интерфейсом чата, включая отображение сообщений и отправку сообщений на бэкенд (Cloud Function).
*   **Экспортируемый API:**
    *   `initChatUI()` (функция): Инициализирует DOM-элементы чата и слушатели событий для отправки сообщений.
*   **Ключевые зависимости:**
    *   `../firebaseInit.js` (для `auth` - получения ID текущего пользователя).
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/core/ui/panelManager.js`

*   **Назначение:** Определяет класс `PanelManager`, предназначенный для управления UI-панелями. (В настоящее время содержит только конструктор-заглушку. Более функциональные менеджеры панелей: `frontend/js/ui/panelManager.js` для контента внутри панелей и `frontend/js/panels/rightPanelManager.js` для управления правой панелью).
*   **Экспортируемый API:**
    *   `PanelManager` (class, default export).
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `frontend/js/core/ui/uiManager.js`

*   **Назначение:** Определяет класс `UIManager` для общего управления UI. (В настоящее время содержит только конструктор, который получает ссылку на `PanelManager` из `state`. Основной модуль сбора ссылок на UI-элементы и инициализации UI находится в `frontend/js/ui/uiManager.js`).
*   **Экспортируемый API:**
    *   `UIManager` (class, default export).
*   **Ключевые зависимости:**
    *   `../init.js` (для `state`).
*   **Взаимодействие с `state`:** Читает `state.panelManager` при инстанцировании.

## `frontend/js/3d/hologramRenderer.js`

*   **Назначение:** Определяет класс `HologramRenderer` для создания и управления 3D-визуализацией аудио-голограммы в предоставленной сцене Three.js.
*   **Экспортируемый API:**
    *   `HologramRenderer` (class):
        *   `constructor(scene: THREE.Scene)`
        *   `updateVisuals(dbLevels: Float32Array, panAngles: Float32Array)`: Обновляет визуализацию на основе аудиоданных.
        *   `getHologramPivot(): THREE.Group`: Возвращает основной узел голограммы.
*   **Ключевые зависимости:**
    *   `three` (библиотека Three.js)
    *   `three/examples/jsm/lines/Line2.js`
    *   `three/examples/jsm/lines/LineMaterial.js`
    *   `three/examples/jsm/lines/LineGeometry.js`
    *   `../config/hologramConfig.js` (для `semitones` и констант грида)
*   **Взаимодействие с `state`:** Не взаимодействует напрямую с глобальным `state` из `core/init.js`. Работает с переданным ему объектом `THREE.Scene`. Экземпляр этого класса хранится в `state.hologramRendererInstance`.

## `frontend/js/3d/rendering.js`

*   **Назначение:** Отвечает за главный цикл анимации (`requestAnimationFrame`) и рендеринг 3D-сцены.
*   **Экспортируемый API:**
    *   `animate(currentTime)` (функция): Основной цикл рендеринга; обновляет TWEEN, вызывает `updateVisuals` у `hologramRendererInstance` и рендерит сцену.
    *   `updateHologramMesh()` (функция): Заглушка для возможного обновления меша голограммы.
*   **Ключевые зависимости:**
    *   `../core/init.js` (для `state`)
    *   `three` (библиотека Three.js)
    *   `TWEEN.js` (глобально через `window.TWEEN`)
*   **Взаимодействие с `state`:**
    *   Читает: `state.hologramRendererInstance`, `state.audio.currentDbLevels`, `state.audio.currentPanAngles`, `state.renderer`, `state.scene`, `state.activeCamera`.

## `frontend/js/3d/sceneSetup.js`

*   **Назначение:** Инициализирует базовую 3D-сцену Three.js, WebGL рендерер, ортографическую камеру и основное освещение.
*   **Экспортируемый API:**
    *   `initializeScene(state)` (функция): Инициализирует компоненты сцены и записывает их в переданный объект `state`. Возвращает `true` при успехе, `false` при ошибке WebGL.
*   **Ключевые зависимости:**
    *   `three` (библиотека Three.js).
*   **Взаимодействие с `state`:**
    *   Записывает: `state.scene`, `state.renderer`, `state.camera`, `state.activeCamera`, `state.ambientLight`, `state.directionalLight`.

## `frontend/js/3d/webgpu/hologram_shader_webgpu.js`

*   **Назначение:** Содержит заглушки для WGSL (WebGPU Shading Language) шейдеров (вершинного и фрагментного) для рендеринга голограмм с использованием WebGPU.
*   **Экспортируемый API:** Нет (экспорт констант с кодом шейдеров закомментирован).
    *   (Планируемые экспорты: `HOLOGRAM_VERTEX_SHADER_WGSL`, `HOLOGRAM_FRAGMENT_SHADER_WGSL` - строки с кодом WGSL).
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/3d/webgpu/webgpu_renderer.js`

*   **Назначение:** Определяет класс `WebGPURenderer` для инкапсуляции логики рендеринга с использованием WebGPU. Включает инициализацию WebGPU адаптера, устройства и настройку контекста. (В настоящее время содержит базовую структуру и заглушки для полной реализации).
*   **Экспортируемый API:** Нет (экспорт класса `WebGPURenderer` закомментирован).
    *   (Планируемый экспорт: `WebGPURenderer` class с методами `init`, `renderFrame`).
*   **Ключевые зависимости:** Нет зависимостей от других модулей проекта.
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/audio/audioAnalyzer.js`

*   **Назначение:** Определяет класс `AudioAnalyzer`. **Модуль в значительной степени устарел**, так как анализ аудио теперь выполняется WASM AudioWorklet.
*   **Экспортируемый API:**
    *   `AudioAnalyzer` (class):
        *   `constructor()`
        *   `getSemitoneLevels()`: Возвращает пустой массив (заглушка).
        *   `setAnalyserNode(newNode)`: Не выполняет операций (заглушка).
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/audio/audioFilePlayer.js`

*   **Назначение:** Определяет класс `AudioFilePlayer` для управления загрузкой и воспроизведением аудиофайлов.
*   **Экспортируемый API:**
    *   `AudioFilePlayer` (class):
        *   `constructor(audioContext, globalState)`
        *   `initializeAudioPlayerControls()`: Инициализирует DOM-элементы управления плеером.
        *   `loadAudioFile(event)`: Загружает и декодирует аудиофайл.
        *   `playAudio()`: Начинает/возобновляет воспроизведение.
        *   `pauseAudio()`: Приостанавливает воспроизведение.
        *   `stopAudio()`: Останавливает воспроизведение.
*   **Ключевые зависимости:**
    *   `../core/init.js` (для `state`)
    *   `./audioProcessing.js` (для `getAudioContext`, `setupAudioProcessing`)
*   **Взаимодействие с `state`:**
    *   Читает: `state.multimodal.currentStream`, `state.audioAnalyzerLeftInstance`, `state.audioAnalyzerRightInstance`, `state.audio.filePlayerAnalysers`, `state.audio.microphoneAnalysers`.
    *   Записывает: `state.audio.audioContext` (при необходимости), `state.audio.activeSource`, `state.audio.filePlayerGainNode`, `state.audio.filePlayerAnalysers`. Управляет `enabled` на треках в `state.multimodal.currentStream`. Вызывает `setAnalyserNode` на экземплярах `AudioAnalyzer` в `state`.

## `frontend/js/audio/audioProcessing.js`

*   **Назначение:** Управляет `AudioContext` и настраивает цепочку обработки аудио через `AudioWorkletNode` для анализа с помощью WASM.
*   **Экспортируемый API:**
    *   `setupAudioProcessing(sourceNode, type)` (async функция): Асинхронно загружает AudioWorklet (`waveletAnalyzer.js`), создает `AudioWorkletNode` ('cwt-processor'), инициализирует его и подключает `sourceNode`.
    *   `getAudioContext()` (функция): Возвращает или создает/возобновляет глобальный `AudioContext`.
*   **Ключевые зависимости:**
    *   `../core/init.js` (для `state`)
    *   (Неявно) `../audio/waveletAnalyzer.js` (загружается как AudioWorklet модуль)
*   **Взаимодействие с `state`:**
    *   Читает: `state.audio.audioContext`, `state.audio.targetFrequencies`.
    *   Записывает: `state.audio.audioContext`, `state.audio.currentDbLevels`, `state.audio.currentPanAngles`, `state.audio.filePlayerGainNode`, `state.audio.cwtProcessorNodeFile`, `state.audio.microphoneGainNode`, `state.audio.cwtProcessorNodeMicrophone`, `state.audio.audioSource`, `state.audio.activeSource`.

## `frontend/js/audio/audioVisualizer.js`

*   **Назначение:** Инициализирует связь между аудио анализом и 3D-визуализацией. (В настоящее время основная логика цикла анимации визуализации (`animateAudioVisuals`) закомментирована и перенесена в `rendering.js`. Ссылается на устаревший `AudioAnalyzer`).
*   **Экспортируемый API:**
    *   `initAudioVisualization()` (функция): Проверяет наличие инстансов анализаторов и рендерера в `state`.
*   **Ключевые зависимости:**
    *   `./audioAnalyzer.js` (импортирует устаревший `AudioAnalyzer`)
    *   `../3d/hologramRenderer.js` (импортирует `HologramRenderer`)
    *   `../core/init.js` (для `state`)
*   **Взаимодействие с `state`:** Читает `state.audioAnalyzerLeftInstance`, `state.audioAnalyzerRightInstance`, `state.hologramRendererInstance`.

## `frontend/js/audio/cwt_analyzer.js`

*   **Назначение:** Определяет класс `CWTAnalyzer` для выполнения анализа аудиоданных с использованием непрерывного вейвлет-преобразования (CWT) через WebAssembly. (В настоящее время содержит концептуальную структуру и заглушки).
*   **Экспортируемый API:** Нет (экспорт класса `CWTAnalyzer` закомментирован).
    *   (Планируемый экспорт: `CWTAnalyzer` class с методами `constructor(wasmInstance)`, `performCWT(audioDataFloat32Array)`).
*   **Ключевые зависимости:**
    *   (Предполагается) WebAssembly модуль (например, из `../wasm/src/audio_analyzer_rs/pkg/audio_analyzer_rs.js`).
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `frontend/js/audio/microphoneManager.js`

*   **Назначение:** Определяет класс `MicrophoneManager` для управления доступом к микрофону, получения аудиопотока и создания `AnalyserNode` для анализа.
*   **Экспортируемый API:**
    *   `MicrophoneManager` (class):
        *   `constructor(audioContext, state, fftSize, smoothingTimeConstant)`
        *   `initializeWithStream(stream)` (async): Инициализирует аудиограф с существующим потоком.
        *   `init()` (async): Запрашивает доступ к микрофону и инициализирует аудиограф.
        *   `stop()`: Останавливает микрофонный поток.
        *   `destroy()`: Останавливает поток и удаляет слушатели.
        *   `getAudioContext()`: Возвращает `AudioContext`.
        *   `getAnalysers()`: Возвращает созданные `AnalyserNode` (left/right).
        *   `toggleMicrophone()` (async): Переключает состояние микрофона (вкл/выкл).
*   **Ключевые зависимости:**
    *   `../config/hologramConfig.js` (для `FFT_SIZE`, `SMOOTHING_TIME_CONSTANT`)
*   **Взаимодействие с `state`:**
    *   Принимает `state` в конструкторе.
    *   Читает: `state.uiElements.buttons.microphoneButton`, `state.audio.activeSource`, `state.audioAnalyzerLeftInstance`, `state.audioAnalyzerRightInstance`.
    *   Записывает: `state.audio.audioContext`, `state.audio.microphoneStream`, `state.audio.microphoneAnalysers`, `state.audio.activeSource`. Вызывает `setAnalyserNode` на экземплярах `AudioAnalyzer` в `state`.

## `frontend/js/audio/speechInput.js`

*   **Назначение:** Реализует распознавание речи через Web Speech API для ввода текста в чат.
*   **Экспортируемый API:**
    *   `initializeSpeechInput()` (функция): Инициализирует Web Speech API, DOM-элементы и слушатели событий.
    *   `isRecognitionActive()` (функция): Возвращает текущий статус активности распознавания.
*   **Ключевые зависимости:**
    *   `../panels/rightPanelManager.js` (для `switchToChatMode`).
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/audio/waveletAnalyzer.js`

*   **Назначение:** Определяет `CwtProcessor`, класс `AudioWorkletProcessor`, для выполнения анализа аудиоданных (CWT) с использованием WebAssembly в отдельном аудио-потоке.
*   **Экспортируемый API:** Класс `CwtProcessor` регистрируется через `registerProcessor('cwt-processor', CwtProcessor)`.
*   **Ключевые зависимости:**
    *   `../wasm/fastcwt/fastcwt_processor.js` (для WASM-функций `init`, `encode_audio_to_hologram`).
*   **Взаимодействие с `state`:** Нет прямого взаимодействия. Обменивается данными с основным потоком (модулем `audioProcessing.js`) через `port`.

## `frontend/js/ai/chat.js`

*   **Назначение:** Управляет основной логикой и UI чата, включая интерактивный тур по интерфейсу, отправку сообщений на бэкенд и синтез речи.
*   **Экспортируемый API:**
    *   `setupChat()` (функция): Инициализирует UI чата и слушатели событий.
    *   `sendChatMessage(messageText)` (async функция): Отправляет сообщение пользователя на бэкенд, обрабатывает ответ, управляет туром.
    *   `addMessageToChat(sender, message)` (функция): Добавляет сообщение в UI чата и в массив `chatMessages`.
    *   `chatMessages` (массив): История сообщений чата.
*   **Ключевые зависимости:**
    *   `./models.js` (для `getSelectedModel`)
    *   `../core/init.js` (для `state`)
*   **Взаимодействие с `state`:** Читает `state.uiElements.containers.chatMessages`, `state.uiElements.inputs.chatInput`, `state.uiElements.inputs.modelSelect`.

## `frontend/js/ai/models.js`

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

## `frontend/js/ai/prompts.js`

*   **Назначение:** Управляет отправкой структурированных 'промптов' на специальный эндпоинт бэкенда (`/prompt`). Включает вставку текста в поле ввода промпта, обработку ответа от бэкенда, отображение статусов, и потенциальное применение изменений к 'голограмме', включая управление UI для версионирования.
*   **Экспортируемый API:**
    *   `initializePrompts()` (функция): Инициализация системы промптов (проверяет наличие поля ввода).
    *   `sendPrompt(promptText)` (async функция): Отправляет промпт на бэкенд, обрабатывает ответ, обновляет UI версий.
    *   `insertTextIntoPrompt(text)` (функция): Вставляет текст в поле ввода основного промпта.
*   **Ключевые зависимости:**
    *   `./models.js` (для `getSelectedModel`)
    *   `../core/init.js` (для `state`)
    *   `axios` (глобально, для HTTP-запросов к `/prompt` и `/branches`)
*   **Взаимодействие с `state`:**
    *   Читает: `state.uiElements.inputs.topPromptInput`, `state.uiElements.inputs.modelSelect`, `state.currentBranch`, `state.hologramVersions`, `state.currentVersion`, `state.uiElements.containers.versionFrames`.
    *   Записывает: `state.uiElements.inputs.topPromptInput.value`, `state.currentVersion`, `state.hologramVersions`.

## `frontend/js/ai/tria.js`

*   **Назначение:** Управляет конфигурацией и некоторыми UI-аспектами, связанными с AI 'Триа', включая режим обучения.
*   **Экспортируемый API:**
    *   `triaConfig` (объект): Конфигурационные данные Tria (API URL, версия, параметры модели).
    *   `initializeTria()` (функция): Инициализирует селектор моделей и UI Триа.
    *   `getTriaUsageStats()` (async функция): Заглушка для получения статистики использования Tria с бэкенда.
    *   `toggleTriaLearningMode(triaButton, modelSelect, state)` (функция): Переключает режим обучения Триа и обновляет UI.
*   **Ключевые зависимости:**
    *   `../core/ui.js` (для `ui`)
    *   `./models.js` (для `initializeModelSelector`)
*   **Взаимодействие с `state`:** Функция `toggleTriaLearningMode` читает и записывает `state.tria.isLearningActive`.

## `frontend/js/ai/tria_mode.js`

*   **Назначение:** Управляет "Режимом Триа", перенаправляя запросы на эндпоинт `/chat` при его активации.
*   **Экспортируемый API:**
    *   `isTriaModeActive()` (функция): Возвращает `true`, если режим Триа активен.
    *   `initializeTriaMode()` (функция): Инициализирует кнопку `#triaButton` и ее состояние для переключения режима.
    *   `applyPromptWithTriaMode(prompt, model)` (async функция): Отправляет промпт на `/chat` если режим Триа активен; иначе возвращает `false`.
*   **Ключевые зависимости:**
    *   `../core/init.js` (для `state`).
*   **Взаимодействие с `state`:** Читает и записывает `state.isTriaModeActive`.

## `frontend/js/config/hologramConfig.js`

*   **Назначение:** Определяет и экспортирует конфигурационные константы и данные для визуализации голограммы.
*   **Экспортируемый API:**
    *   Константы: `START_HUE`, `END_HUE`, `SATURATION`, `LIGHTNESS`, `BASE_FREQUENCY`, `NOTES_PER_OCTAVE`, `STARTING_OCTAVE`, `NOTES` (массив), `FFT_SIZE`, `SMOOTHING_TIME_CONSTANT`, `GRID_WIDTH`, `GRID_HEIGHT`, `GRID_DEPTH`, `CELL_SIZE`, `HOLOGRAM_REFERENCE_HEIGHT`.
    *   `degreesToCells(index)` (функция): Вычисляет ширину визуальной колонки.
    *   `semitones` (массив): Массив объектов, описывающих каждый полутон/колонку (частота, ширина, цвет и т.д.).
*   **Ключевые зависимости:**
    *   `three` (для `THREE.Color`).
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/config/hologramConstants.js`

*   **Назначение:** Генерирует и экспортирует массив `semitones`. (Примечание: Функциональность и константы дублируют `frontend/js/config/hologramConfig.js`, который является предпочтительным источником этих данных).
*   **Экспортируемый API:**
    *   `semitones` (массив, default export): Массив объектов, описывающих каждый полутон/колонку.
*   **Ключевые зависимости:**
    *   `three` (для `THREE.Color`).
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/gestures/detection.js`

*   **Назначение:** Предполагается для реализации логики распознавания жестов. (В настоящее время содержит только функцию-заглушку).
*   **Экспортируемый API:**
    *   `initializeGestureDetection()` (функция): Заглушка, выводит предупреждение в консоль.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/multimodal/handsTracking.js`

*   **Назначение:** Интегрирует MediaPipe Hands для отслеживания рук, управляет видеопотоком и отображает результаты в 2D и 3D. (Примечание: Существует также заглушка `/core/multimodal/handsTracking.js`).
*   **Экспортируемый API:**
    *   `startVideoStream(videoElement, handsInstance, stream)` (async функция): Запускает или использует существующий видеопоток для MediaPipe.
    *   `initializeMediaPipeHands()` (функция): Инициализирует MediaPipe Hands, настраивает коллбэки и запускает видеопоток.
    *   `stopVideoStream()` (функция): Останавливает видеопоток и очищает ресурсы MediaPipe.
*   **Ключевые зависимости:**
    *   `three` (для 3D-визуализации рук)
    *   `../core/init.js` (для `state`)
    *   `../ui/layoutManager.js` (для `updateHologramLayout` - импорт есть, но вызов закомментирован)
    *   MediaPipe Hands library (глобально, через `new Hands()`)
*   **Взаимодействие с `state`:**
    *   Читает: `state.config.GRID`, `state.uiElements.containers.gestureArea`, `state.scene`.
    *   Записывает: `state.multimodal.currentStream`, `state.multimodal.isGestureCanvasReady`, `state.multimodal.lastHandData`, `state.multimodal.handsVisible`, `state.multimodal.videoElementForHands`, `state.multimodal.handsInstance`, `state.multimodal.handMeshGroup`.

## `frontend/js/multimodal/voice_input.js`

*   **Назначение:** Определяет класс `VoiceInputManager` для управления распознаванием речи через Web Speech API. (Примечание: Функциональность распознавания речи также имеется в `frontend/js/audio/speechInput.js`).
*   **Экспортируемый API:** Нет (экспорт класса `VoiceInputManager` закомментирован).
    *   (Планируемый экспорт: `VoiceInputManager` class с методами `constructor()`, `startRecognition()`, `stopRecognition()`, `getFinalTranscript()`).
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `frontend/js/panels/chatMessages.js`

*   **Назначение:** Управляет отображением сообщений в UI чата (`#chatMessages`) и предоставляет функцию синтеза речи (`speak`). Каждое сообщение дополняется кнопкой для копирования его содержимого в основное поле ввода промпта.
*   **Экспортируемый API:**
    *   `initializeChatDisplay()` (функция): Инициализирует ссылки на DOM-элементы чата.
    *   `addMessageToChat(sender, message)` (функция): Добавляет отформатированное сообщение в UI чата с кнопкой "Вставить в промпт".
    *   `speak(text)` (функция): Озвучивает переданный текст с использованием Web Speech API, с приоритетом для русского голоса.
*   **Ключевые зависимости:**
    *   `./rightPanelManager.js` (для `toggleModeInternal`).
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/panels/rightPanelManager.js`

*   **Назначение:** Управляет переключением режимов отображения содержимого в правой панели интерфейса, в основном между режимом 'Таймлайн' и режимом 'Чат'.
*   **Экспортируемый API:**
    *   `initializeRightPanel()` (функция): Инициализирует DOM-элементы правой панели и слушатель для кнопки переключения режимов.
    *   `switchToChatMode()` (функция): Программно переключает панель в режим чата.
    *   `getCurrentMode()` (функция): Возвращает текущий активный режим ('chat' или 'timeline').
    *   `toggleModeInternal()` (функция): Внутренняя функция для переключения режимов.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/platforms/desktop/desktopInput.js`

*   **Назначение:** Определяет класс `DesktopInput` для инициализации и управления всеми основными обработчиками событий пользовательского ввода, специфичными для десктопной платформы.
*   **Экспортируемый API:**
    *   `DesktopInput` (class):
        *   `constructor(globalState)`
        *   `initialize()`: Настраивает слушатели клавиатуры, мыши и общих кнопок.
        *   `setupKeyboardListeners()`: Настройка слушателей для поля ввода основного промпта.
        *   `setupMouseListeners()`: Настройка слушателей для кнопок (GitHub, модальные окна, отправка промпта из модального окна).
        *   `setupGeneralButtonListeners()`: Настройка слушателей для остальных кнопок (файлы, полноэкранный режим, аудио, микрофон и др.).
*   **Ключевые зависимости:**
    *   `../../core/init.js` (для `state`)
    *   `../../core/domEventHandlers.js` (для `applyPrompt`, `loadInitialFilesAndSetupEditor`)
    *   `../../utils/fullscreen.js` (для `toggleFullscreen`, `initFullscreenListeners`)
*   **Взаимодействие с `state`:**
    *   Получает `globalState` в конструкторе.
    *   Читает `this.state.audioFilePlayer` и `this.state.microphoneManager` для вызова их методов.

## `frontend/js/platforms/desktop/desktopLayout.js`

*   **Назначение:** Определяет класс `DesktopLayout` для управления макетом и видимостью основных UI панелей на десктопной платформе.
*   **Экспортируемый API:**
    *   `DesktopLayout` (class):
        *   `constructor(uiElements)`
        *   `initialize()`: Инициализирует состояние панелей и слушатель для кнопки переключения.
        *   `initializeMainPanelState()`: Устанавливает начальную видимость панелей из `localStorage`.
        *   `toggleMainPanels()`: Переключает видимость панелей и сохраняет состояние.
*   **Ключевые зависимости:**
    *   `../../ui/layoutManager.js` (для `updateHologramLayout`).
*   **Взаимодействие с `state`:** Нет прямого. Получает ссылки на UI-элементы через конструктор (предположительно из `state.uiElements`). Использует `localStorage` для сохранения состояния панелей.

## `frontend/js/platforms/mobile/mobileInput.js`

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

## `frontend/js/platforms/mobile/mobileLayout.js`

*   **Назначение:** Определяет класс `MobileLayout` для управления макетом UI на мобильных платформах, включая видимость панелей и адаптацию области жестов к ориентации экрана.
*   **Экспортируемый API:**
    *   `MobileLayout` (class):
        *   `constructor(uiElements)`
        *   `initialize()`: Инициализирует панели и область жестов.
        *   `initializeMainPanelState()`: Устанавливает начальное состояние видимости панелей.
        *   `toggleMainPanels()`: Переключает видимость левой панели.
        *   `initializeGestureArea()`: Настраивает обработчики для области жестов.
        *   `handleOrientationChange()`: Обновляет классы CSS области жестов при смене ориентации.
*   **Ключевые зависимости:**
    *   `../../core/init.js` (косвенно, через `uiElements`, которые должны быть `state.uiElements`)
    *   `../../ui/layoutManager.js` (для `updateHologramLayout`)
*   **Взаимодействие с `state`:** Получает `uiElements` (предположительно из `state.uiElements`) через конструктор.

## `frontend/js/platforms/xr/xrInput.js`

*   **Назначение:** Определяет класс `XrInput` для обработки ввода в WebXR. (В настоящее время является заглушкой).
*   **Экспортируемый API:**
    *   `XrInput` (class):
        *   `constructor()`
        *   `initialize()`: Инициализирует обработчики XR-ввода.
        *   `setupXrControllerListeners()`: Заглушка для настройки слушателей контроллеров.
*   **Ключевые зависимости:** Нет (предполагается использование WebXR Device API).
*   **Взаимодействие с `state`:** Нет (в текущем виде).

## `frontend/js/platforms/xr/xrLayout.js`

*   **Назначение:** Определяет класс `XrLayout` для управления макетом UI в WebXR. (В настоящее время является заглушкой).
*   **Экспортируемый API:**
    *   `XrLayout` (class):
        *   `constructor()`
        *   `initialize()`: Заглушка для инициализации XR-макета.
        *   `toggleMainPanels()`: Заглушка для переключения панелей в XR.
*   **Ключевые зависимости:** Нет (предполагается использование WebXR Device API и Three.js).
*   **Взаимодействие с `state`:** Нет (в текущем виде).
