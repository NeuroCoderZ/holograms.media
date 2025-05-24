# Module Interfaces

Этот документ описывает публичные API и ключевые зависимости для всех JavaScript модулей в директории `frontend/js/`.

## `frontend/js/main.js`

*   **Назначение:** Главный файл приложения, точка входа. Инициализирует все основные модули и управляет общим потоком выполнения.
*   **Экспортируемый API:** Нет (является точкой входа).
*   **Ключевые зависимости:**
    *   `./core/init.js` (для `state` и `initializeState`)
    *   `./core/events.js` (для `initializeEventListeners`)
    *   `./ui/uiManager.js` (для `initializeUI`)
    *   `./audio/audioProcessing.js` (для `initializeAudio`)
    *   `./xr/xrManager.js` (для `initializeXR`)
    *   `./3d/sceneSetup.js` (для `initializeScene`)
    *   `./3d/rendering.js` (для `startAnimationLoop`)
    *   `./multimodal/multimodalManager.js` (для `initializeMultimodalFeatures`)
    *   `./ai/aiManager.js` (для `initializeAI`)
    *   `./panels/panelManager.js` (для `initializePanelManager`)
*   **Взаимодействие с `state`:** Косвенно, через инициализацию модулей, которые используют `state`.

## `frontend/js/core/init.js`

*   **Назначение:** Инициализация глобального объекта `state`, который содержит состояние всего приложения.
*   **Экспортируемый API:**
    *   `state` (объект): Глобальный объект состояния.
    *   `initializeState()` (функция): Инициализирует объект `state`.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Определяет и инициализирует `state`.

## `frontend/js/core/events.js`

*   **Назначение:** Управление глобальными событиями DOM (клики, изменения и т.д.).
*   **Экспортируемый API:**
    *   `initializeEventListeners()` (функция): Устанавливает все слушатели событий.
*   **Ключевые зависимости:**
    *   `./init.js` (для `state`)
    *   `../ui/uiManager.js` (для `uiElements`, `updateInputSectionHeight`, `togglePanel`)
    *   `../ai/chat.js` (для `sendChatMessage`)
    *   `../ai/prompts.js` (для `sendPrompt`, `insertTextIntoPrompt`)
    *   `../utils/fullscreen.js` (для `toggleFullscreen`)
    *   `../3d/rendering.js` (для `onWindowResize`)
*   **Взаимодействие с `state`:** Читает `state.isRecording` и `state.isTriaGenerating`, `state.settings.currentLanguage`.

## `frontend/js/ui/uiManager.js`

*   **Назначение:** Управление элементами пользовательского интерфейса (UI), такими как панели, кнопки, текстовые поля.
*   **Экспортируемый API:**
    *   `uiElements` (объект): Коллекция ссылок на DOM-элементы.
    *   `initializeUI()` (функция): Инициализирует UI элементы и их состояния.
    *   `showLoading(message)` (функция): Показывает индикатор загрузки.
    *   `hideLoading()` (функция): Скрывает индикатор загрузки.
    *   `updateInputSectionHeight()` (функция): Обновляет высоту секции ввода.
    *   `togglePanel(panelId, forceShow)` (функция): Переключает видимость панели.
    *   `updateButtonState(button, isActive)` (функция): Обновляет состояние кнопки.
    *   `displayMessage(text, type)` (функция): Отображает сообщение пользователю.
    *   `updateTheme(themeName)` (функция): Обновляет тему интерфейса.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Может читать и изменять состояние UI, хранящееся в `state.ui` (если такое будет добавлено).

## `frontend/js/3d/sceneSetup.js`

*   **Назначение:** Настройка и инициализация 3D-сцены с использованием Three.js.
*   **Экспортируемый API:**
    *   `initializeScene()` (функция): Инициализирует сцену, камеру, рендерер, освещение и базовые 3D-объекты.
    *   `getSceneObjects()` (функция): Возвращает объект с ссылками на `scene`, `camera`, `renderer`.
*   **Ключевые зависимости:**
    *   `three`: Библиотека Three.js.
    *   `../core/init.js` (для `state`)
    *   `./rendering.js` (для `createSequencerGrid`, `createGrid`, `createAxis`)
*   **Взаимодействие с `state`:** Инициализирует и сохраняет `scene`, `camera`, `renderer`, `controls` в `state.three`.

## `frontend/js/3d/rendering.js`

*   **Назначение:** Управление циклом рендеринга, анимацией и визуализацией аудио-данных в 3D-сцене.
*   **Экспортируемый API:**
    *   `semitones` (массив): Массив сгенерированных данных о полутонах.
    *   `startAnimationLoop(callback)` (функция): Запускает цикл анимации.
    *   `onWindowResize()` (функция): Обрабатывает изменение размера окна.
    *   `createSphere(radius, color, position)` (функция): Создает сферу.
    *   `createLine(start, end, color)` (функция): Создает линию.
    *   `createAxis(size)` (функция): Создает оси координат.
    *   `createGrid(size, divisions)` (функция): Создает сетку.
    *   `createSequencerGrid(sequencerSize, stepSize, color)` (функция): Создает сетку для секвенсора.
    *   `createColumn(height, color, position)` (функция): Создает колонку.
    *   `initializeColumns(numColumns, spacing)` (функция): Инициализирует колонки для визуализации.
    *   `updateAudioVisualization(analyserNode)` (функция): Обновляет визуализацию аудио.
    *   `updateColumnVisualization(column, level)` (функция): Обновляет визуализацию отдельной колонки.
    *   `resetVisualization()` (функция): Сбрасывает визуализацию.
    *   `createAudioVisualization()` (функция): Создает объекты для аудиовизуализации.
    *   `updateSequencerColumns(sequencerData)` (функция): Обновляет колонки секвенсора.
*   **Ключевые зависимости:**
    *   `three`: Библиотека Three.js.
    *   `@tweenjs/tween.js`: Библиотека TWEEN.js.
    *   `../core/init.js` (для `state`)
    *   `../audio/audioProcessing.js` (для `getSemitoneLevels`)
*   **Взаимодействие с `state`:** Читает `state.three.scene`, `state.three.camera`, `state.three.renderer`, `state.audio.analyserNode`, `state.audio.semitoneLevels`. Модифицирует объекты в `state.three.scene`.

## `frontend/js/audio/audioProcessing.js`

*   **Назначение:** Обработка аудио, включая получение контекста, создание анализаторов и извлечение данных о полутонах.
*   **Экспортируемый API:**
    *   `getAudioContext()` (функция): Возвращает или создает AudioContext.
    *   `createAnalyserNodes(audioContext, numNodes)` (функция): Создает массив AnalyserNode.
    *   `getSemitoneLevels(analyserNode, fftSize, semitoneIndex, baseFrequency, octaves)` (функция): Рассчитывает уровни для указанного полутона.
    *   `initializeAudio()` (функция): Инициализирует аудио подсистему.
*   **Ключевые зависимости:**
    *   `../3d/rendering.js` (для `semitones` - циклическая зависимость, которую стоит устранить)
    *   `three` (для `MathUtils`)
    *   `../core/init.js` (для `state`)
*   **Взаимодействие с `state`:** Инициализирует и сохраняет `audioContext`, `analyserNode`, `semitoneLevels` в `state.audio`.

## `frontend/js/ai/chat.js`

*   **Назначение:** Управление функциональностью чата, включая отправку сообщений и отображение ответов.
*   **Экспортируемый API:**
    *   `setupChat()` (функция): Настраивает обработчики событий для чата.
    *   `sendChatMessage(message, role)` (функция): Отправляет сообщение в чат и отображает его.
*   **Ключевые зависимости:**
    *   `../ui/uiManager.js` (для `uiElements`)
    *   `../core/init.js` (для `state`)
*   **Взаимодействие с `state`:** Читает `state.settings.currentLanguage`, `state.ai.currentModel`. Может обновлять `state.chatHistory` (если будет добавлено).

## `frontend/js/ai/models.js`

*   **Назначение:** Управление выбором AI моделей.
*   **Экспортируемый API:**
    *   `models` (массив): Список доступных моделей.
    *   `modelMetadata` (объект): Метаданные для моделей.
    *   `getSelectedModel()` (функция): Возвращает текущую выбранную модель.
    *   `setSelectedModel(modelId)` (функция): Устанавливает выбранную модель.
    *   `initializeModelSelector()` (функция): Инициализирует селектор моделей в UI.
*   **Ключевые зависимости:**
    *   `../ui/uiManager.js` (для `uiElements`)
    *   `../core/init.js` (для `state`)
*   **Взаимодействие с `state`:** Читает и записывает `state.ai.currentModel`.

## `frontend/js/ai/prompts.js`

*   **Назначение:** Управление отправкой промптов AI и отображением результатов.
*   **Экспортируемый API:**
    *   `initializePrompts()` (функция): Инициализирует функциональность промптов.
    *   `sendPrompt(promptText)` (функция): Отправляет промпт AI.
    *   `insertTextIntoPrompt(text)` (функция): Вставляет текст в поле ввода промпта.
*   **Ключевые зависимости:**
    *   `../ui/uiManager.js` (для `uiElements`, `showLoading`, `hideLoading`, `displayMessage`)
    *   `./models.js` (для `getSelectedModel`)
    *   `../core/init.js` (для `state`)
*   **Взаимодействие с `state`:** Читает `state.settings.currentLanguage`, `state.ai.currentModel`, `state.isTriaModeActive`.

## `frontend/js/ai/tria.js`

*   **Назначение:** Конфигурация и инициализация взаимодействия с API Tria.
*   **Экспортируемый API:**
    *   `triaConfig` (объект): Конфигурация для Tria API.
    *   `initializeTria()` (функция): Инициализирует интерфейс Tria.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет прямого взаимодействия, но конфигурация может использоваться другими AI модулями, которые работают со `state`.

## `frontend/js/ai/tria_mode.js`

*   **Назначение:** Управление режимом Tria (активен/неактивен) и соответствующей логикой отправки промптов.
*   **Экспортируемый API:**
    *   `isTriaModeActive()` (функция): Возвращает `true`, если режим Tria активен.
    *   `initializeTriaMode()` (функция): Инициализирует переключатель режима Tria.
    *   `applyPromptWithTriaMode(promptText, callback)` (функция): Применяет промпт с учетом режима Tria.
*   **Ключевые зависимости:**
    *   `../core/init.js` (для `state`)
    *   `../ui/uiManager.js` (для `uiElements`)
*   **Взаимодействие с `state`:** Читает и записывает `state.isTriaModeActive`.

## `frontend/js/multimodal/handsTracking.js`

*   **Назначение:** Интеграция с MediaPipe Hands для отслеживания рук.
*   **Экспортируемый API:**
    *   `startVideoStream()` (функция): Запускает видеопоток с камеры и инициализирует отслеживание рук.
    *   `initializeHandTracking()` (функция): Инициализирует систему отслеживания рук.
*   **Ключевые зависимости:**
    *   `@mediapipe/hands`: Библиотека MediaPipe Hands.
    *   `@mediapipe/camera_utils`: Утилиты для камеры MediaPipe.
    *   `@mediapipe/drawing_utils`: Утилиты для рисования MediaPipe.
    *   `../core/init.js` (для `state`)
    *   `../ui/uiManager.js` (для `uiElements`)
*   **Взаимодействие с `state`:** Может записывать данные отслеживания рук в `state.multimodal.hands` (если будет добавлено).

## `frontend/js/multimodal/voice_input.js`

*   **Назначение:** Управление распознаванием речи.
*   **Экспортируемый API:**
    *   `VoiceInputManager` (класс):
        *   `constructor(uiElements, state)`
        *   `init()`: Инициализирует распознавание речи.
        *   `startRecognition()`: Начинает распознавание.
        *   `stopRecognition()`: Останавливает распознавание.
        *   `toggleRecognition()`: Переключает состояние распознавания.
    *   `initializeVoiceInput()` (функция): Создает и инициализирует экземпляр `VoiceInputManager`.
*   **Ключевые зависимости:**
    *   `../ui/uiManager.js` (для `uiElements`)
    *   `../core/init.js` (для `state`)
    *   `../ai/prompts.js` (для `insertTextIntoPrompt`)
*   **Взаимодействие с `state`:** Читает `state.settings.currentLanguage`. Записывает `state.isRecording`.

## `frontend/js/panels/panelManager.js`

*   **Назначение:** Управление состоянием и видимостью различных UI панелей.
*   **Экспортируемый API:**
    *   `initializePanelState()` (функция): Инициализирует начальное состояние панелей.
    *   `togglePanels(panelIds, show)` (функция): Переключает видимость указанных панелей.
    *   `initializePanelManager()` (функция): Инициализирует менеджер панелей.
*   **Ключевые зависимости:**
    *   `../ui/uiManager.js` (для `uiElements`, `togglePanel`)
*   **Взаимодействие с `state`:** Может читать и изменять состояние видимости панелей, хранящееся в `state.ui.panels` (если будет добавлено).

## `frontend/js/utils/fullscreen.js`

*   **Назначение:** Управление полноэкранным режимом браузера.
*   **Экспортируемый API:**
    *   `toggleFullscreen()` (функция): Переключает полноэкранный режим.
    *   `enterFullscreen()` (функция): Входит в полноэкранный режим.
    *   `exitFullscreen()` (функция): Выходит из полноэкранного режима.
    *   `initFullscreenListeners()` (функция): Инициализирует слушатели событий полноэкранного режима.
*   **Ключевые зависимости:**
    *   `../core/ui.js` (для `ui`)
*   **Взаимодействие с `state`:** Нет прямого взаимодействия.

## `frontend/js/utils/helpers.js`

*   **Назначение:** Заглушка для вспомогательных функций (debounce, throttle).
*   **Экспортируемый API:**
    *   `debounce(func, wait)` (функция): Заглушка.
    *   `throttle(func, limit)` (функция): Заглушка.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.

## `frontend/js/utils/storage.js`

*   **Назначение:** Заглушка для функций сохранения и загрузки настроек.
*   **Экспортируемый API:**
    *   `loadSettings()` (функция): Заглушка.
    *   `saveSettings(settings)` (функция): Заглушка.
*   **Ключевые зависимости:** Нет.
*   **Взаимодействие с `state`:** Нет.