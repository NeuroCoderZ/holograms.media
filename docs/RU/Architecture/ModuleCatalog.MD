# Каталог Модулей Frontend (JavaScript)

Этот документ описывает структуру и взаимосвязи модулей JavaScript во frontend части проекта holograms.media.

## Обзор Структуры Директорий

- `/js/`
    - `/3d/` - Модули для работы с 3D сценой (Three.js).
        - `hologramRenderer.js`
        - `rendering.js`
        - `sceneSetup.js`
        - `/webgpu/hologram_shader_webgpu.js` # WebGPU шейдеры для голограмм
        - `/webgpu/README.md`
        - `/webgpu/webgpu_renderer.js` # WebGPU рендерер
    - `/ai/` - Модули, связанные с интеграцией AI (Триа, чат).
        - `chat.js` # Интеграция чата с AI-ассистентом Триа через Cloudflare AutoRAG и ModernChatInterface.
        - `models.js`
        - `prompts.js`
        - `tria.js`
        - `tria_mode.js`
        - `magentaService.js`
        - `gestureIntentClassifier.js`
    - `/audio/` - Модули для работы с аудио.
        - `audioFilePlayer.js`
        - `audioProcessing.js`
        - `microphoneManager.js`
        - `speechInput.js`
        - `waveletAnalyzer.js`
        - `audioVisualizer.js`
        - `cwt_analyzer.js`
        - `cwt.cpp`
        - `cwtAudioWorklet.js`
        - `processing.js`
        - `webAudioEngine.js`
    - `/config/` - Модули конфигурации.
        - `hologramConfig.js, hologramConstants.js`
    - `/core/` - Основные модули ядра приложения.
        - `appStatePersistence.js`
        - `consentManager.js`
        - `diagnostics.js`
        - `eventBus.js`
        - `gestures.js` # (MediaPipe Hands, GestureIntentClassifier)
        - `init.js` # Основной файл инициализации ядра.
        - `mediaInitializer.js`
        - `platformDetector.js`
        - `pwaInstall.js`
        - `resizeHandler.js`
        - `resizeHandler.test.js`
        - `SQLiteEmbeddingService.js`
        - `threeImports.js`
        - `TriaBiosService.js`
        - `TriaDBClient.js`
        - `TriaOrchestrator.js`
        - `ui.js`
        - `/3d/audioVisualizer.js`
        - `/audio/audioPlayer.js`
        - `/multimodal/handsTracking.js`
        - `/multimodal/speechInput.js`
        - `/multimodal/webRTC.js`
        - `/services/apiService.js`
        - `/ui/chatUI.js`
        - `/ui/panelManager.js`
        - `/ui/uiManager.js`
        - `stateManager.js`
    - `/gestures/` - Модули, связанные с распознаванием и обработкой жестов рук.
        - `AtomicGestureClassifier.js`
        - `GestureSequencer.js`
        - `detection.js`
    - `/multimodal/` - Модули для обработки мультимодальных данных.
        - `handsTracking.js` # Отслеживание рук (MediaPipe)
        - `voice_input.js` # Обработка голосового ввода
    - `/panels/` - Модули для управления панелями UI.
        - `chatMessages.js`
        - `rightPanelManager.js`
        - `hologramPanelManager.js`
    - `/platforms/` - Код, специфичный для различных платформ.
        - `/desktop/`, `/mobile/`, `/xr/`
    - `/services/` - Сервисы для взаимодействия с бэкендом.
        - `apiService.js`
        - `CloudGestureStorage.js`
        - `firebaseStorageService.js`
        - `hologlyphService.js`
        - `netHoloGlyphClient.js`
        - `websocketService.js`
        - `gestureIntentClient.js`
    - `/ui/` - Модули для управления общими элементами UI.
        - `layoutManager.js`
        - `mainUI.js`
        - `panelManager.js`
        - `uiManager.js`
        - `fileEditor.js`
        - `gestureAreaManager.js`
        - `gestureAreaVisualization.js`
        - `GesturesListDisplay.js`
        - `GestureUIManager.js`
        - `MyGesturesPanel.js`
        - `promptManager.js`
        - `versionManager.js`
        - `VersionTimelinePanel.js`
    - `/utils/` - Вспомогательные утилиты.
        - `fullscreen.js`
        - `helpers.js`
        - `storage.js`
    - `/wasm/` - Модули WebAssembly и связанный с ними код.
        - `/fastcwt/` # Готовый WASM модуль (CWT) и его JS обвязка.
    - `/xr/` - Модули для работы с WebXR.
        - `webxr_session_manager.js`
        - `cameraManager.js` # Управление камерой в XR
        - `xr_input_handler.js` # Обработка ввода в XR
    - `main.js` - Главная точка входа.
    - `legacy-bridge.js` - Модуль для совместимости со старым кодом (временно).
    - `SmartHologram.js` - Умная голограмма с расширенными возможностями
    - `/agents/` - AI-агенты для различных задач.
        - `AudioAgent.js`
        - `BaseAgent.js`
        - `MemoryAgent.js`
        - `OrchestrationAgent.js`
        - `SynthesisAgent.js`
        - `VisualAgent.js`
    - `/managers/` - Менеджеры для управления различными аспектами приложения.
        - `GestureManager.js`
        - `GestureRecordingManager.js`
        - `HologramManager.js`
        - `InteractionManager.js`
        - `RightPanelManager.js`
    - `/workers/` - Web Workers для фоновой обработки.
        - `tria_db_worker.js`

## Описание Ключевых Модулей и Связей

### `main.js`
- **Назначение:** Главная точка входа приложения.
- **Логика:**
    1.  Инициализирует `ConsentManager` для получения согласия пользователя.
    2.  Вызывает `initCore()` для базовой настройки 3D-сцены и состояния.
    3.  Вызывает `initializeMainUI()` для кэширования DOM-элементов.
    4.  Вызывает `startFullApplication()`, который определяет платформу (`desktop`, `mobile`, `xr`) и динамически загружает соответствующие модули для управления макетом (`...Layout.js`) и вводом (`...Input.js`).
    5.  Запускает главный цикл анимации.
    6.  Вызывает `initializeTriaChat()` для инициализации чата с AI-ассистентом Триа.
- **Связи:** `core/init.js`, `ui/uiManager.js`, `core/platformDetector.js`, `3d/rendering.js`, `core/consentManager.js`, `ai/chat.js`, динамически импортирует модули из `platforms/*`.

---

### `/core/init.js`
- **Назначение:** Инициализирует ядро приложения. Определяет и экспортирует глобальный объект `state`.
- **Экспорты:** `state`, `initCore`.
- **Логика `initCore()`:**
    1.  Вызывает `initializeScene()` для настройки **WebGPU** рендерера и сцены. Обрабатывает ошибки инициализации.
    2.  Создает и сохраняет в `state` экземпляры ключевых менеджеров: `HologramRenderer`, `XRSessionManager`, `MicrophoneManager`, `AudioFilePlayer`.
    3.  **Не создает** устаревший `AudioAnalyzer`.
- **Связи:** `3d/sceneSetup.js`, `audio/microphoneManager.js`, `audio/audioFilePlayer.js`, `3d/hologramRenderer.js`, `xr/webxr_session_manager.js`, `ui/panelManager.js`.

---

### `/3d/sceneSetup.js`
- **Назначение:** Отвечает за инициализацию 3D сцены, камеры и **WebGPU** рендерера.
- **Экспорты:** `initializeScene`.
- **Логика:**
    1.  Проверяет поддержку `WebGPU` (`if (!navigator.gpu)`).
    2.  Асинхронно инициализирует `THREE.WebGPURenderer`, запрашивая адаптер и устройство.
    3.  Вызывает `renderer.init()` для завершения настройки.
    4.  Настраивает ортографическую камеру, сцену и базовое освещение.
    5.  В случае ошибки (WebGPU не поддерживается, не удалось получить адаптер/устройство, ошибка инициализации рендерера) выводит критическую ошибку в консоль, отображает модальное окно (`webgl-error-modal`) и возвращает `null` для сцены, рендерера и камеры.
- **Связи:** `three.js`.

---

### `/3d/rendering.js`
- **Назначение:** Управляет циклом рендеринга (анимации).
- **Экспорты:** `startAnimationLoop`.
- **Логика:**
    1.  Запускает цикл анимации через `renderer.setAnimationLoop()`.
    2.  В каждом кадре обновляет TWEEN-анимации и рендерит сцену (`renderer.render()`).
    3.  Вызов `hologramRenderer.updateVisuals()` теперь **активен** и получает данные от `MicrophoneManager` (через `WASM модуля для динамического обновления визуализации.
- **Связи:** `three.js`, `@tweenjs/tween.js`, `3d/hologramRenderer.js`, `audio/microphoneManager.js`.

---

### `/ai/chat.js`
- **Назначение:** Управляет логикой чата с AI-ассистентом Триа, используя `Cloudflare AutoRAG` через `ModernChatInterface`.
- **Экспорты:** `initializeTriaChat`.
- **Логика `initializeTriaChat()`:**
    1.  Импортирует `ModernChatInterface` напрямую с воркера Cloudflare (`fp-chat-interface-snippet.js`).
    2.  Находит существующие HTML-элементы чата: `#chatMessages` (контейнер истории), `#chatInput` (поле ввода), `#submitChatMessage` (кнопка отправки) и `#loadingIndicator` (индикатор загрузки).
    3.  Создает и настраивает экземпляр `ModernChatInterface`, передавая ему найденные HTML-элементы.
    4.  Устанавливает `selectedSite` для `ModernChatInterface` на URL нашего воркера `throbbing-wave-797e-nlweb.neurocoderz.workers.dev`.
    5.  Вызывает `createNewChat()` для инициализации новой сессии чата.
    6.  Переопределяет стандартные обработчики событий для кнопки отправки и поля ввода, чтобы они вызывали `triaInterface.sendMessage(message)`.
    7.  Добавляет функциональность автоматического изменения размера поля ввода.
- **Связи:** `ModernChatInterface` (внешний скрипт Cloudflare), `index.html` (DOM-элементы).