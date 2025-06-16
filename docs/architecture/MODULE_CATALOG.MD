# Каталог Модулей Frontend (JavaScript)

Этот документ описывает структуру и взаимосвязи модулей JavaScript во frontend части проекта holograms.media, основанные на текущем состоянии кодовой базы.

Основная цель рефакторинга - переход от монолитного `script.js` к модульной структуре с использованием ES6 модулей для улучшения поддерживаемости, читаемости и организации кода.

## Обзор Структуры Директорий

- `/frontend/js/`
    - `/3d/` - Модули для работы с 3D сценой (Three.js).
        - `.gitkeep`
        - `hologramRenderer.js`
        - `rendering.js`
        - `sceneSetup.js`
        - `/webgpu/`
            - `README.md`
            - `hologram_shader_webgpu.js`
            - `webgpu_renderer.js`
    - `/ai/` - Модули, связанные с интеграцией AI (Триа, чат).
        - `chat.js`
        - `models.js`
        - `prompts.js`
        - `tria.js`
        - `tria_mode.js`
    - `/audio/` - Модули для работы с аудио (микрофон, плеер, обработка, визуализация).
        - `.gitkeep`
        - `audioAnalyzer.js`
        - `audioFilePlayer.js`
        - `audioProcessing.js` # Бывший processing.js, переименован и обновлен
        - `audioVisualizer.js`
        - `cwt.cpp` # Возможно, требует перемещения в wasm или специальной обработки
        - `cwt_analyzer.js`
        - `microphoneManager.js`
        - `processing.js` # Старый файл, помечен как замененный в каталоге, но существует. TODO: Проверить и удалить, если не нужен.
        - `speechInput.js`
        - `waveletAnalyzer.js`
    - `/config/` - Модули конфигурации.
        - `hologramConfig.js`
        - `hologramConstants.js`
    - `/core/` - Основные модули ядра приложения.
        - `.gitkeep`
        - `/3d/`
            - `audioVisualizer.js` # Модуль визуализации в ядре
        - `appStatePersistence.js`
        - `/audio/`
            - `audioPlayer.js` # Общий аудиоплеер в ядре
        - `auth.js`
        - `consentManager.js`
        - `diagnostics.js`
        - `domEventHandlers.js`
        - `eventBus.js`
        - `events.js`
        - `firebaseInit.js`
        - `gestures.js` # Обработка жестов в ядре. См. также /gestures/
        - `init.js` # Основной файл инициализации ядра.
        - `mediaInitializer.js`
        - `/multimodal/`
            - `handsTracking.js`
            - `speechInput.js`
            - `webRTC.js`
        - `platformDetector.js`
        - `pwaInstall.js`
        - `resizeHandler.js`
        - `resizeHandler.test.js`
        - `/services/`
            - `apiService.js`
            - `nethologlyphClient.js`
        - `stateManager.js`
        - `/ui/`
            - `chatUI.js`
            - `panelManager.js`
            - `uiManager.js`
        - `ui.js`
    - `/gestures/` - Модули, связанные с распознаванием и обработкой жестов.
        - `detection.js`
    - `/multimodal/` - Модули для обработки мультимодальных данных.
        - `.gitkeep`
        - `README.md`
        - `handsTracking.js` # Отслеживание рук (MediaPipe)
        - `voice_input.js` # Голосовой ввод
    - `/panels/` - Модули для управления панелями UI.
        - `chatMessages.js`
        - `rightPanelManager.js`
    - `/platforms/` - Код, специфичный для различных платформ (desktop, mobile, XR).
        - `.gitkeep`
        - `/desktop/`
            - `.gitkeep`
            - `desktopInput.js`
            - `desktopLayout.js`
        - `/mobile/`
            - `.gitkeep`
            - `mobileInput.js`
            - `mobileLayout.js`
        - `/xr/`
            - `.gitkeep`
            - `xrInput.js`
            - `xrLayout.js`
    - `/services/` - Сервисы для взаимодействия с внешними API и бэкендом.
        - `.gitkeep`
        - `apiService.js`
        - `firebaseStorageService.js`
    - `/ui/` - Модули для управления общими элементами пользовательского интерфейса.
        - `.gitkeep`
        - `fileEditor.js`
        - `gestureAreaManager.js`
        - `gestureAreaVisualization.js`
        - `layoutManager.js`
        - `mainUI.js`
        - `panelManager.js` # См. также /core/ui/panelManager.js и /panels/
        - `promptManager.js`
        - `uiManager.js` # См. также /core/ui/uiManager.js
        - `versionManager.js`
    - `/utils/` - Вспомогательные утилиты.
        - `.gitkeep`
        - `fullscreen.js`
        - `helpers.js`
        - `storage.js`
    - `/wasm/` - Модули WebAssembly и связанный с ними код.
        - `README.md`
        - `/fastcwt/` # Готовый WASM модуль (CWT) и его JS обвязка.
        - `/src/` # Исходный код для других WASM модулей (например, Rust, C++).
        - `wasm_loader.js`
    - `/xr/` - Модули для работы с WebXR.
        - `.gitkeep`
        - `README.md`
        - `cameraManager.js`
        - `webxr_session_manager.js`
        - `xr_input_handler.js`
    - `init.js` # TODO: Уточнить роль этого файла (возможно, точка входа или ранний инициализатор). Отличается от /core/init.js.
    - `legacy-bridge.js` - Модуль для совместимости со старым кодом (временное решение).
    - `main.js` - Главная точка входа.

## Описание Модулей и Связей

### `main.js`

- **Назначение:** Главная точка входа приложения. Регистрирует Service Worker. После загрузки DOM, последовательно инициализирует все основные модули и подсистемы: менеджер согласия, ядро (`initCore`), основной UI (`initializeMainUI`), обработчик кнопки 'Start Session' (который запускает `initializeMultimedia`), аутентификацию Firebase, менеджеры промптов, версий, чата, визуализации жестов, MediaPipe Hands, аудио ввод/вывод, Tria AI, XR. Настраивает глобальные обработчики (изменение размера, жесты Hammer.js, PWA). Динамически загружает и инициализирует платформо-специфичные модули управления макетом и вводом. Управляет вращением голограммы через события указателя на `#grid-container`. Запускает главный цикл анимации.
- **Экспорты:** Нет явных экспортов (является точкой входа).
- **Ключевые функции:**
    - Обработчик `DOMContentLoaded`: Основная логика инициализации приложения.
    - `setupStartButtonListener()`: Настройка слушателя для кнопки начала сессии.
    - `onPointerDown`, `onPointerUp`, `onPointerMove`: Обработчики событий указателя для вращения голограммы.
- **Связи:**
    - Импортирует и вызывает функции инициализации из большого числа модулей во всех категориях (`core`, `ui`, `audio`, `xr`, `3d`, `multimodal`, `ai`, `utils`, `platforms`).
    - Регистрирует Service Worker (`/sw.js`).
    - Использует `state` из `core/init.js`.
    - Взаимодействует с DOM для модального окна старта сессии и событий на `#grid-container`.
    - Использует `TWEEN.js` (ожидается глобально) для анимации вращения голограммы.

### `legacy-bridge.js`

- **Назначение:** Обеспечивает обратную совместимость между старым кодом (предположительно из `script.js`) и новой модульной структурой. Экспортирует ключевые объекты (`state`, `config`, `ui`) и функции из новых модулей в глобальный объект `window`, делая их доступными для старого кода, который ожидает их в глобальной области видимости.
- **Экспорты:** `initLegacyBridge`, `registerLegacyHandlers`. (Также неявно экспортирует в `window`).
- **Ключевые функции:**
    - `initLegacyBridge()`: Инициализирует мост, присваивая функции новым глобальным переменным.
    - `registerLegacyHandlers()`: Пример перехвата вызовов старых глобальных функций.
    - (Неявный экспорт): Присваивает `window.appState`, `window.appConfig`, `window.appUI`, `window.legacyAPI` и другие глобальные функции.
- **Связи:**
    - Импортирует большое количество функций и объектов из модулей: `core/init.js`, `core/ui.js`, `ai/prompts.js`, `ai/chat.js`, `ai/models.js`.
    - Основное взаимодействие — модификация глобального объекта `window`.

### `init.js`

- **Назначение:** TODO: Уточнить роль этого файла (возможно, точка входа или ранний инициализатор). Отличается от `/core/init.js`. (В настоящее время содержит только комментарий-заглушку `// Frontend initialization logic will go here.`).
- **Экспорты:** (Нет).
- **Ключевые функции:** (Нет).
- **Связи:** (Нет).

### `/core/init.js`
(... existing content ...)
### `/core/platformDetector.js`
(... existing content ...)
### `/core/stateManager.js`
(... existing content ...)
### `/core/eventBus.js`
(... existing content ...)
### `/core/mediaInitializer.js`
(... existing content ...)
### `/core/auth.js`
(... existing content ...)
### `/core/appStatePersistence.js`
(... existing content ...)
### `/core/diagnostics.js`
(... existing content ...)
### `/core/domEventHandlers.js`
(... existing content ...)
### `/core/events.js`
(... existing content ...)
### `/core/firebaseInit.js`
(... existing content ...)
### `/core/gestures.js`
(... existing content ...)
### `/core/pwaInstall.js`
(... existing content ...)
### `/core/resizeHandler.js`
(... existing content ...)
### `/core/ui.js`
(... existing content ...)
### `/core/consentManager.js`
(... existing content ...)
### `/core/3d/audioVisualizer.js`
(... existing content ...)
### `/core/audio/audioPlayer.js`
(... existing content ...)
### `/core/multimodal/handsTracking.js`
(... existing content ...)
### `/core/multimodal/speechInput.js`
(... existing content ...)
### `/core/multimodal/webRTC.js`
(... existing content ...)
### `/core/services/apiService.js`
(... existing content ...)
### `/core/services/nethologlyphClient.js`
(... existing content ...)
### `/core/ui/chatUI.js`
(... existing content ...)
### `/core/ui/panelManager.js`
(... existing content ...)
### `/core/ui/uiManager.js`
(... existing content ...)
### `/3d/sceneSetup.js`
(... existing content ...)
### `/3d/rendering.js`
(... existing content ...)
### `/3d/hologramRenderer.js`
(... existing content ...)
### `/3d/webgpu/hologram_shader_webgpu.js`
(... existing content ...)
### `/3d/webgpu/webgpu_renderer.js`
(... existing content ...)
### `/audio/audioAnalyzer.js`
(... existing content ...)
### `/audio/audioFilePlayer.js`
(... existing content ...)
### `/audio/audioProcessing.js`
(... existing content ...)
### `/audio/audioVisualizer.js`
(... existing content ...)
### `/audio/cwt_analyzer.js`
(... existing content ...)
### `/audio/microphoneManager.js`
(... existing content ...)
### `/audio/processing.js`
(... existing content ...)
### `/audio/speechInput.js`
(... existing content ...)
### `/audio/waveletAnalyzer.js`
(... existing content ...)
### `/ai/chat.js`
(... existing content ...)
### `/ai/models.js`
(... existing content ...)
### `/ai/prompts.js`
(... existing content ...)
### `/ai/tria.js`
(... existing content ...)
### `/ai/tria_mode.js`
(... existing content ...)
### `/config/hologramConfig.js`
(... existing content ...)
### `/config/hologramConstants.js`
(... existing content ...)
### `/gestures/detection.js`
(... existing content ...)
### `/multimodal/handsTracking.js`
(... existing content ...)
### `/multimodal/voice_input.js`
(... existing content ...)
### `/panels/chatMessages.js`
(... existing content ...)
### `/panels/rightPanelManager.js`
(... existing content ...)
### `/platforms/desktop/desktopInput.js`
(... existing content ...)
### `/platforms/desktop/desktopLayout.js`
(... existing content ...)
### `/platforms/mobile/mobileInput.js`
(... existing content ...)
### `/platforms/mobile/mobileLayout.js`
(... existing content ...)
### `/platforms/xr/xrInput.js`
(... existing content ...)
### `/platforms/xr/xrLayout.js`
(... existing content ...)
### `/services/apiService.js`
(... existing content ...)
### `/services/firebaseStorageService.js`
(... existing content ...)
### `/ui/fileEditor.js`
(... existing content ...)
### `/ui/gestureAreaManager.js`
(... existing content ...)
### `/ui/gestureAreaVisualization.js`
(... existing content ...)
### `/ui/layoutManager.js`
(... existing content ...)
### `/ui/mainUI.js`
(... existing content ...)
### `/ui/panelManager.js`
(... existing content ...)
### `/ui/promptManager.js`
(... existing content ...)
### `/ui/uiManager.js`
(... existing content ...)
### `/ui/versionManager.js`
(... existing content ...)
### `/utils/fullscreen.js`
(... existing content ...)
### `/utils/helpers.js`
(... existing content ...)
### `/utils/storage.js`
(... existing content ...)
### `/wasm/wasm_loader.js`
(... existing content ...)
### `/xr/cameraManager.js`
(... existing content ...)
### `/xr/webxr_session_manager.js`
(... existing content ...)
### `/xr/xr_input_handler.js`
(... existing content ...)

---

**Примечание:** Этот каталог будет обновляться по мере развития проекта и рефакторинга.
