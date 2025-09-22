# Каталог Модулей Frontend (JavaScript)

Этот документ описывает структуру и взаимосвязи модулей JavaScript во frontend части проекта holograms.media.

## Обзор Структуры Директорий

- `/frontend/js/`
    - `/3d/` - Модули для работы с 3D сценой (Three.js).
        - `hologramRenderer.js`
        - `rendering.js`
        - `sceneSetup.js`
    - `/ai/` - Модули, связанные с интеграцией AI (Триа, чат).
        - `chat.js` # Интеграция чата с AI-ассистентом Триа через Cloudflare AutoRAG и ModernChatInterface.
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
        - `consentManager.js`
        - `diagnostics.js`
        - `eventBus.js` # (Заглушка)
        - `gestures.js` # (MediaPipe Hands, GestureIntentClassifier)
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
        - `gestureIntentClient.js`
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

### `frontend/js/core/domEventHandlers.js`

-   **Назначение:** Содержит логику для обработки промптов (включая вызов Tria mode и отправку на `/generate`), выполнения сгенерированного кода и создания новых версий. Также настраивает `MutationObserver` для UI элементов жестов. Большая часть функциональности по работе с файловым редактором и общими DOM-событиями была перенесена в другие модули (например, `DesktopInput.js`).
-   **Экспортируемый API:**
    *   `setupDOMEventHandlers()` (функция): Настраивает `MutationObserver` для UI жестов. Большая часть логики, связанной с кнопками и файловым редактором, устарела или перенесена.
    *   `applyPrompt(prompt, model)` (async функция): Обрабатывает промпт. **Вызывается из `DesktopInput.js`**. Сначала пытается использовать `applyPromptWithTriaMode` (если режим Триа активен). Если режим Триа не активен или не обрабатывает промпт, отправляет запрос на `/generate` для получения сгенерированного кода, выполняет его в контексте Three.js сцены, а затем отправляет состояние сцены на `/branches` для создания новой версии. Параметр `model` для `/generate` берется из селектора `#modelSelect`.
-   **Ключевые зависимости:**
    *   `./init.js` (для `state`)
    *   `../ai/tria_mode.js` (для `applyPromptWithTriaMode`)
    *   `axios`
    *   `three`
-   **Взаимодействие с `state`:**
    *   Читает: `state.scene`, `state.mainSequencerGroup` (для выполнения сгенерированного кода), `state.uiElements.inputs.topPromptInput`, `state.uiElements.inputs.modelSelect`, `state.currentBranch`, `state.hologramVersions`, `state.currentVersion`, `state.uiElements.containers.versionFrames`.
    *   Записывает: `state.uiElements.inputs.topPromptInput.value`, `state.currentVersion`, `state.hologramVersions` (при создании новой версии).

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
    3.  Вызов `hologramRenderer.updateVisuals()` теперь **активен** и получает данные от `MicrophoneManager` (через `AudioWorklet`) для динамического обновления визуализации.
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