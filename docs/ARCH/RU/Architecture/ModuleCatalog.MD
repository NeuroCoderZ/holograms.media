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
        - `chat.js` # Интеграция чата с Триа (v3.1). Поддержка THINKING стадий и Grounding.
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
    - `/config/` - Модули конфигурации.
        - `hologramConfig.js`
    - `/core/` - Основные модули ядра приложения.
        - `init.js` # Основной файл инициализации ядра.
        - `eventBus.js`
        - `platformDetector.js`
    - `/panels/` - Модули для управления панелями UI.
        - `rightPanelManager.js`
    - `/services/` - Сервисы для взаимодействия с бэкендом и глобальные сервисы.
        - `AudioService.js` # Singleton для управления AudioContext и AudioWorklet.
        - `apiService.js`
        - `websocketService.js`
    - `main.js` - Главная точка входа.

## Описание Ключевых Модулей и Связей

### `main.js`
- **Назначение:** Главная точка входа приложения.
- **Логика:**
    1.  Инициализирует `ConsentManager` для получения согласия пользователя.
    2.  Вызывает `initCore()` для базовой настройки 3D-сцены и состояния.
    3.  Определяет платформу (`desktop`, `mobile`, `xr`) и загружает соответствующие модули.
    4.  Запускает главный цикл анимации.
    5.  Инициализирует чат с Триа.
- **Связи:** `core/init.js`, `core/platformDetector.js`, `3d/rendering.js`, `ai/chat.js`.

---

### `/core/init.js`
- **Назначение:** Инициализирует ядро приложения. Определяет и экспортирует глобальный объект `state`.
- **Экспорты:** `state`, `initCore`.
- **Логика `initCore()`:**
    1.  Вызывает `initializeScene()` для настройки рендерера и сцены.
    2.  Создает экземпляры `HologramRenderer`, `MicrophoneManager`, `AudioFilePlayer`.
- **Связи:** `3d/sceneSetup.js`, `audio/microphoneManager.js`, `audio/audioFilePlayer.js`, `3d/hologramRenderer.js`.

---

### `/ai/chat.js`
- **Назначение:** Управляет логикой чата с Триа (v3.1) в Правой панели. Поддерживает стриминг, THINKING стадии и Grounding (веб-поиск).
- **Экспорты:** `initializeTriaChat`.
- **Логика `initializeTriaChat()`:**
    1.  Находит элементы чата: `#chatMessages`, `#chatInput`, `#submitChatMessage`, `#loadingIndicator`.
    2.  Подключается к бэкенду через `apiService.js` (FastAPI).
    3.  Обеспечивает плавный вывод текста через `flushQueue` (эффект печати).
    4.  Интегрирует `LiveAudioService` для голосового ввода.
- **Связи:** `services/apiService.js`, `index.html` (Правая панель).
