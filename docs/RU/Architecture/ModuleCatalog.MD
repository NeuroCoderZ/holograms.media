# Каталог Модулей Frontend (JavaScript)

Этот документ описывает структуру и взаимосвязи модулей JavaScript во frontend части проекта holograms.media.

## Обзор Структуры Директорий

- `/frontend/js/`
    - `/3d/` - Модули для работы с 3D сценой (Three.js).
        - `hologramRenderer.js`
        - `rendering.js`
        - `sceneSetup.js`
    - `/ai/` - Модули, связанные с интеграцией AI (Триа, чат).
        - `chat.js`
        - `models.js`
        - `prompts.js`
        - `tria.js`
        - `tria_mode.js`
    - `/audio/` - Модули для работы с аудио.
        - `audioFilePlayer.js`
        - `audioProcessing.js`
        - `microphoneManager.js`
        - `speechInput.js`
        - `waveletAnalyzer.js`
    - `/config/` - Модули конфигурации.
        - `hologramConfig.js`
    - `/core/` - Основные модули ядра приложения.
        - `appStatePersistence.js`
        - `auth.js`
        - `consentManager.js`
        - `diagnostics.js`
        - `eventBus.js` # (Заглушка)
        - `firebaseInit.js`
        - `gestures.js` # (Hammer.js)
        - `init.js` # Основной файл инициализации ядра.
        - `mediaInitializer.js`
        - `platformDetector.js`
        - `pwaInstall.js`
        - `resizeHandler.js`
        - `stateManager.js` # (Заглушка)
    - `/gestures/` - Модули, связанные с распознаванием и обработкой жестов рук.
        - `AtomicGestureClassifier.js`
        - `GestureSequencer.js`
        - `detection.js` # (Заглушка)
    - `/multimodal/` - Модули для обработки мультимодальных данных.
        - `handsTracking.js` # Отслеживание рук (MediaPipe)
    - `/panels/` - Модули для управления панелями UI.
        - `chatMessages.js`
        - `rightPanelManager.js`
    - `/platforms/` - Код, специфичный для различных платформ.
        - `/desktop/`, `/mobile/`, `/xr/`
    - `/services/` - Сервисы для взаимодействия с бэкендом.
        - `apiService.js`
    - `/ui/` - Модули для управления общими элементами UI.
        - `layoutManager.js`
        - `mainUI.js`
        - `panelManager.js`
        - `uiManager.js`
    - `/utils/` - Вспомогательные утилиты.
        - `fullscreen.js`
        - `helpers.js`
        - `storage.js`
    - `/wasm/` - Модули WebAssembly и связанный с ними код.
        - `/fastcwt/` # Готовый WASM модуль (CWT) и его JS обвязка.
    - `/xr/` - Модули для работы с WebXR.
        - `webxr_session_manager.js`
    - `main.js` - Главная точка входа.
    - `legacy-bridge.js` - Модуль для совместимости со старым кодом (временно).

## Описание Ключевых Модулей и Связей

### `main.js`
- **Назначение:** Главная точка входа приложения. Запускается после `DOMContentLoaded`.
- **Логика:**
    1.  Регистрирует Service Worker (`/sw.js`).
    2.  Вызывает `initializeConsentManager()` для получения согласия пользователя.
    3.  Вызывает `async initCore()` из `core/init.js` для инициализации ядра приложения (3D-сцена, менеджеры).
    4.  Вызывает `initializeMainUI()` из `ui/uiManager.js` для кэширования ссылок на DOM-элементы.
    5.  Настраивает слушатель для кнопки 'Start Session', который запускает `startFullApplication`.
- **`async startFullApplication(appState)`:**
    1.  Вызывает `initializeMultimedia()` для доступа к камере/микрофону.
    2.  Вызывает `detectPlatform()` и динамически импортирует нужные модули для платформы (layout, input).
    3.  Инициализирует остальные сервисы (Firebase Auth, обработчики жестов, чат и т.д.).
    4.  Запускает главный цикл анимации через `startAnimationLoop()` из `3d/rendering.js`.
- **Связи:** Импортирует и координирует запуск почти всех основных модулей системы.

### `/core/init.js`
- **Назначение:** Инициализирует ядро приложения. Определяет и экспортирует глобальный объе��т `state`.
- **Экспорты:** `state`, `initCore`.
- **`async initCore()`:**
    1.  Асинхронно вызывает `await initializeScene(state)` из `3d/sceneSetup.js` для настройки WebGPU рендерера и сцены.
    2.  **Обрабатывает ошибки инициализации WebGPU.** Если `initializeScene` возвращает `null` (из-за отсутствия поддержки или сбоя), дальнейшая инициализация прекращается.
    3.  Создает и сохраняет в `state` экземпляры ключевых менеджеров: `HologramRenderer`, `XRSessionManager`, `PanelManager`, `MicrophoneManager`, `AudioFilePlayer`.
- **Связи:** `3d/sceneSetup.js`, `audio/microphoneManager.js`, `audio/audioFilePlayer.js`, `3d/hologramRenderer.js`, `xr/webxr_session_manager.js`, `ui/panelManager.js`.

### `/3d/sceneSetup.js`
- **Назначение:** Отвечает за инициализацию 3D сцены, камеры и **WebGPU рендерера**.
- **Экспорты:** `initializeScene`.
- **`async initializeScene(state)`:**
    1.  Проверяет поддержку WebGPU (`navigator.gpu`).
    2.  Асинхронно за��рашивает адаптер и устройство WebGPU.
    3.  Создает экземпляр `THREE.WebGPURenderer`.
    4.  Вызывает `await renderer.init()` для завершения инициализации рендерера.
    5.  Настраивает сцену, камеру и базовое освещение.
    6.  **В случае ошибки** (отсутствие поддержки WebGPU, сбой инициализации) отображает модальное окно с ошибкой и возвращает объект с `null` значениями.
    7.  В случае успеха возвращает объект `{ scene, renderer, camera }`.
- **Связи:** `three.js`. Используется `initCore` из `/core/init.js`.

### `/3d/rendering.js`
- **Назначение:** Управляет циклом рендеринга (анимации) с использованием WebGPU.
- **Экспорты:** `startAnimationLoop`.
- **`startAnimationLoop(appState)`:**
    - Принимает состояние приложения (`appState`) и запускает цикл анимации, вызывая `appState.renderer.setAnimationLoop(animation)`.
- **`async function animation(time)`:**
    - Асинхронная функция, вызываемая в каждом кадре.
    - Обновляет анимации (TWEEN).
    - **Вызывает `hologramRenderer.updateVisuals()`**, передавая актуальные данные из `state.audio.currentDbLevels` и `state.audio.currentPanAngles`.
    - Рендерит сцену с помощью `await appState.renderer.renderAsync(appState.scene, appState.activeCamera)`.
- **Связи:** `three.js`, `core/init.js` (для `state`). Используется `main.js` для запуска цикла.

### `/3d/hologramRenderer.js`
- **Назначение:** Управляет созданием и обновлением 3D-визуализации голограммы (сетки колонн).
- **Экспорты:** `HologramRenderer` (класс).
- **Ключевые методы:**
    - `constructor(scene)`: Принимает сцену, создает `THREE.Group` для голограммы.
    - `_initializeColumns()`: Создает все колонны на основе `hologramConfig.js`. Для совместимости с WebGPU используется `MeshBasicNodeMaterial`.
    - `updateVisuals(dbLevels, panAngles)`: Обновляет Z-масштаб (глубину) и X-позицию (панорамирование) каждой колонны на основе аудиоданных.
- **Связи:** `three.js`, `config/hologramConfig.js`. Используется `initCore` для создания экземпляра.

### `/audio/audioProcessing.js`
- **Назначение:** Управляет `AudioContext` и настраивает цепочку обработки аудио через `AudioWorkletNode` для анализа с помощью WASM.
- **Экспорты:** `setupAudioProcessing`, `getAudioContext`.
- **`async setupAudioProcessing(sourceNode)`:**
    1.  Асинхронно загружает AudioWorklet (`waveletAnalyzer.js`).
    2.  Создает `AudioWorkletNode` с именем `'cwt-processor'`.
    3.  Инициализирует его, отправляя `sampleRate` и `targetFrequencies`.
    4.  Подключает `sourceNode` к созданному `AudioWorkletNode`.
    5.  Настраивает обработчик `onmessage` для получения результатов анализа (`AUDIO_DATA`) от ворклера.
    6.  Сохраняет полученные `levels` и `angles` в `state.audio.currentDbLevels` и `state.audio.currentPanAngles`.
- **Связи:** `core/init.js` (для `state`), `audio/waveletAnalyzer.js` (динамически).

### `/audio/waveletAnalyzer.js`
- **Назначение:** Определяет `CwtProcessor`, класс `AudioWorkletProcessor`, для выполнения CWT-анализа с использованием WebAssembly в отдельном аудио-потоке.
- **Логика:**
    1.  В конструкторе асинхронно загружает и инициализирует WASM-модуль (`fastcwt_processor.js`).
    2.  В методе `process()`:
        - Принимает блок аудиоданных (`inputs`).
        - Вызывает экспортированную из Rust WASM-функцию `encode_audio_to_hologram`, передавая ей аудиоданные и буферы для результатов.
        - Отправляет полученные массивы (`levels`, `angles`) обратно в основной поток (`audioProcessing.js`) через `this.port.postMessage()`.
- **Связи:** `wasm/fastcwt/fastcwt_processor.js`.