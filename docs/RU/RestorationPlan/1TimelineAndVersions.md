# Функция 1: Таймлайн Версий, Отображение Промптов и Выбор Модели LLM

## 1. Эволюция и Лучшая Историческая Реализация

### Ход мыслей/анализ:
Исторически, функциональность таймлайна версий и управления ими была наиболее полно реализована в файле `script.js.txt`. Более ранние версии скриптов (`script(1).js.txt` - `script(6).js.txt`) не содержали этой сложной системы, ограничиваясь базовой отправкой промпта на сервер без сохранения версий, управления файлами состояний или выбора моделей LLM для генерации.

Реализация в `script.js.txt` включала:
-   Клиентское хранение массива версий (`hologramVersions`, `branches`).
-   Кэширование содержимого файлов (`fileContents`), ассоциированных с каждой версией.
-   Динамическое создание HTML-элементов для отображения каждой версии в правой боковой панели.
-   Отображение номера версии (например, "В1"), текста промпта.
-   Автоматическую прокрутку к последней добавленной версии (новейшая версия внизу).
-   Возможность переключения на любую выбранную версию, восстанавливая состояние 3D-сцены и содержимое файлов.
-   Интеграцию с бэкэндом для сохранения/загрузки версий и генерации кода (`/generate`, `/branches` эндпоинты).
-   Выбор модели LLM через выпадающий список (`#modelSelect`), значение которого использовалось при создании новых версий.
-   Визуально элементы версий представляли собой "маленькие окошки" (контейнеры `div.version-frame`), вероятно, со стилизованным фоном и рамками (определялось в CSS). Отображение миниатюр (thumbnails) было предусмотрено через `capturePreview()`, но его полное использование и отображение в UI не до конца ясно из JS (могло быть частью CSS/HTML структуры, которая не генерировалась полностью в JS).

Эта версия считается лучшей, так как она предоставляет наиболее полный набор функций для интерактивного управления версиями и промптами.

### Описание финальной логики и алгоритмов:

1.  **Инициализация:**
    *   Глобальные переменные: `hologramVersions = []`, `currentBranch = 'main'`, `branches = {'main': []}`, `fileContents = {}`.
    *   При загрузке страницы (`DOMContentLoaded`):
        *   Вызывается `loadInitialFilesAndSetupEditor()` для загрузки базовых файлов (`index.html`, `script.js`, `style.css`) в `fileContents`.
        *   Вызывается `updateTimelineFromServer()` для загрузки и отображения существующих версий для текущей ветки.
        *   Создается начальная "нулевая" версия с промптом "Initial version".
        *   Инициализируется `MutationObserver` для контейнера `#versionFrames` для автоскролла.

2.  **Создание Новой Версии (`applyPrompt`):**
    *   Пользователь вводит промпт в `#topPromptInput` и выбирает модель в `#modelSelect`.
    *   При отправке вызывается `applyPrompt(prompt, model)`.
    *   (Опционально) Вызов `applyPromptWithTriaMode` (логика из `tria_mode.js`).
    *   Если не обработано Tria:
        *   POST-запрос на `/generate` с `{ prompt, model }`. Ожидается ответ `{ generatedCode, backgroundColor }`.
        *   Если `generatedCode` получен, он выполняется: `new Function('scene', 'mainSequencerGroup', 'THREE', generatedCode)(scene, mainSequencerGroup, THREE);`.
        *   Собирается состояние текущих файлов: `updatedFiles = { ...fileContents, 'generated_code.js': generatedCode || '' }`.
        *   Сохраняется состояние 3D-сцены: `sceneState = JSON.stringify(scene.toJSON())`.
        *   (Опционально) Генерируется превью: `previewDataURL = capturePreview()`.
        *   Формируется объект новой версии: `{ branch, prompt, model, files: updatedFiles, scene_state: sceneState, customData: { backgroundColor }, preview: previewDataURL }`.
        *   POST-запрос на `/branches` с данными новой версии.
        *   При успехе – `location.reload(true);` для обновления состояния приложения и таймлайна.

3.  **Отображение Таймлайна (`updateTimelineFromServer`):**
    *   GET-запрос на `/branches/${currentBranch}` для получения списка версий.
    *   Очистка контейнера `#versionFrames.innerHTML = '';`.
    *   `versions.reverse();` (для отображения новейших внизу, если изначально отсортированы по возрастанию).
    *   Для каждой версии в массиве:
        *   Создается `div.version-frame`.
        *   Устанавливается `data-version-id`.
        *   Внутрь добавляется `span.version-label` (текст "В" + `index + 1`) и `div.version-text > p` (текст промпта).
        *   К `div.version-frame` добавляется `click` listener, вызывающий `switchToVersion(version.version_id, version.branch)`.
        *   `#versionFrames.appendChild(frame)`.
    *   Если загрузка с сервера не удалась, вызывается `createDemoVersions()` для отображения заглушек.

4.  **Переключение Версий (`switchToVersion`):**
    *   PUT-запрос на `/branches/${branch}/switch` с `{ version_id }`.
    *   Бэкенд возвращает данные выбранной версии (`files`, `scene_state`, `customData`).
    *   Применяется `backgroundColor` из `customData`.
    *   `fileContents` обновляется файлами версии.
    *   `generated_code.js` отображается в редакторе (`#fileContent`, `#fileList`).
    *   3D-сцена перезагружается: `scene.remove(mainSequencerGroup); mainSequencerGroup = new THREE.ObjectLoader().parse(scene_state); scene.add(mainSequencerGroup);`.

5.  **Авто-скролл:**
    *   `MutationObserver` следит за изменениями в `#versionFrames`. При добавлении дочерних элементов (новых версий) устанавливает `versionFramesContainer.scrollTop = versionFramesContainer.scrollHeight;`.

6.  **Выбор Модели LLM:**
    *   HTML-элемент `<select id="modelSelect">` используется для выбора.
    *   Его значение `.value` передается в `applyPrompt` и далее на бэкенд.

### Ключевые фрагменты кода из архивов (`script.js`):

*   **Создание элемента версии в `updateTimelineFromServer`:**
    ```javascript
    versions.reverse(); // Newest items will be appended last, appearing at the bottom.
    versions.forEach((version, index) => {
      const frame = document.createElement('div');
      frame.className = 'version-frame';
      frame.setAttribute('data-version-id', version.version_id);
      frame.innerHTML = `
        <div class="version-placeholder">
          <span class="version-label">В${index + 1}</span>
        </div>
        <div class="version-text">
          <p>${version.prompt || 'No prompt'}</p>
        </div>
      `;
      frame.addEventListener('click', () => {
        switchToVersion(version.version_id, version.branch);
      });
      versionFrames.appendChild(frame);
    });
    ```

*   **Авто-скролл с `MutationObserver`:**
    ```javascript
    const versionFramesContainer = document.getElementById('versionFrames');
    if (versionFramesContainer) {
        const observer = new MutationObserver((mutationsList, observer) => {
            versionFramesContainer.scrollTop = versionFramesContainer.scrollHeight;
        });
        observer.observe(versionFramesContainer, { childList: true });
    }
    ```

*   **Отправка данных для новой версии в `applyPrompt`:**
    ```javascript
    // ... (после получения generatedCode, sceneStateObject)
    return axios.post('/branches', {
      branch: currentBranch,
      prompt: prompt,
      model: model,
      files: { ...fileContents, 'generated_code.js': generatedCode || '' },
      scene_state: sceneStateObject,
      customData: { backgroundColor: backgroundColor }
      // preview: previewDataURL // Опционально
    }).then(branchesResponse => {
        // ...
        location.reload(true);
    });
    ```

*   **Переключение версии в `switchToVersion` (ключевые моменты):**
    ```javascript
    async function switchToVersion(versionId, branch) {
      // ... axios.put request ...
      // ... applying backgroundColor, fileContents, generated_code.js to editor ...

      const scene_state = response.data.scene_state;
      if (scene_state && /*...validation...*/) {
        const loader = new THREE.ObjectLoader();
        const parsedData = loader.parse(scene_state);
        scene.remove(mainSequencerGroup);
        mainSequencerGroup = parsedData;
        scene.add(mainSequencerGroup);
      }
    }
    ```

## 2. План Интеграции в Текущую Архитектуру

*(Примечание: Так как `MODULE_CATALOG.MD`, `MODULE_INTERFACES.MD`, `SYSTEM_DESCRIPTION.MD` не предоставлены, нижеследующий план основан на предполагаемых именах модулей и общей модульной структуре. Адаптируйте имена и пути по необходимости.)*

### Целевые модули:

*   **`frontend/js/services/versionService.js`**: Для всей логики взаимодействия с бэкендом по версиям (`/branches` API calls for fetching, creating, switching).
*   **`frontend/js/ui/VersionTimelinePanel.js`** (или часть `RightSidebarManager.js`): Для управления DOM-элементами таймлайна (`#versionFrames`), их создания, обновления и обработки кликов.
*   **`frontend/js/state/AppState.js`** (или аналогичный): Для хранения состояния `currentBranch`, `hologramVersions`, `fileContents`, `currentVersion`.
*   **`frontend/js/managers/PromptManager.js`**: Для обработки логики `applyPrompt`, включая взаимодействие с `versionService` и `sceneManager`.
*   **`frontend/js/managers/SceneManager.js`**: Для применения `scene_state` при переключении версий и для функции `capturePreview`.
*   **`frontend/js/ui/FileEditorManager.js`**: Для обновления редактора при `switchToVersion`.
*   **`frontend/js/EventBus.js`** (если используется): Для событий, таких как `versionCreated`, `versionSwitched`.

### Адаптированный код и инструкции:

1.  **`versionService.js`**:
    *   Перенести всю `axios` логику для эндпоинтов `/branches/*` сюда.
    *   Методы: `fetchVersions(branchName)`, `createVersion(versionData)`, `switchVersion(versionId, branchName)`.
    *   Эти методы будут возвращать Promises с данными ответа.

2.  **`AppState.js`**:
    *   Хранить: `state.versions.timeline = []`, `state.versions.currentBranch = 'main'`, `state.versions.activeVersion = null`, `state.files.cachedContents = {}`.
    *   Предоставить методы для обновления этих состояний.

3.  **`VersionTimelinePanel.js`**:
    *   **Отвечает за `#versionFrames` и `#versionTimeline`.**
    *   Метод `renderTimeline(versions)`:
        *   Принимает массив версий (из `AppState` или от `versionService`).
        *   Очищает `#versionFrames`.
        *   Создает элементы `div.version-frame` (как в `updateTimelineFromServer`).
        *   Добавляет click listeners, которые вызывают метод в `PromptManager` или `versionService` для переключения версии (например, `eventBus.emit('requestVersionSwitch', { versionId, branchName })`).
    *   Инициализировать `MutationObserver` для авто-скролла здесь.
    *   Подписаться на событие типа `eventBus.on('versionsUpdated', renderTimeline)` или получать данные из `AppState` и перерисовываться при их изменении.

4.  **`PromptManager.js`**:
    *   Функция, аналогичная `applyPrompt(prompt, model)`:
        *   Получает `prompt` и `model` из UI.
        *   Взаимодействует с `SceneManager` для получения `scene.toJSON()` и `capturePreview()`.
        *   Получает `fileContents` из `AppState`.
        *   Вызывает `versionService.createVersion(...)`.
        *   После успешного создания, инициирует перезагрузку или обновление состояния приложения (например, через `eventBus.emit('newVersionCreated')`, что приведет к обновлению таймлайна и других частей). `location.reload(true)` может быть временным решением, но в SPA-архитектуре лучше обновлять состояние.
    *   Обработка `switchToVersion`:
        *   Может быть инициирована здесь после события от `VersionTimelinePanel`.
        *   Вызывает `versionService.switchVersion(...)`.
        *   При успехе:
            *   Обновляет `AppState` с данными новой активной версии.
            *   Уведомляет `SceneManager` для перезагрузки сцены.
            *   Уведомляет `FileEditorManager` для обновления файлов.
            *   Уведомляет `VersionTimelinePanel` для выделения активной версии.

5.  **`SceneManager.js`**:
    *   Метод `loadSceneState(scene_state_json)`: Парсит JSON и обновляет текущую сцену.
    *   Метод `capturePreview()`: Как и в `script.js.txt`.
    *   Метод `applyGeneratedCode(generatedCode)`: Выполняет код через `new Function(...)`.

6.  **LLM Модель (`#modelSelect`):**
    *   Его значение должно быть доступно `PromptManager` при вызове `applyPrompt`. Может быть частью общего UI state или передаваться напрямую.

### Необходимые зависимости:

*   **`VersionTimelinePanel`**:
    *   Доступ к `AppState` для получения списка версий и текущей активной версии (для выделения).
    *   Возможность вызывать `versionService.switchVersion` или генерировать событие для `PromptManager`.
*   **`PromptManager`**:
    *   Доступ к `versionService` для создания и переключения версий.
    *   Доступ к `SceneManager` для получения состояния сцены и выполнения кода.
    -   Доступ к `AppState` для `fileContents` и текущей ветки.
    *   Доступ к значению выбранной LLM модели.
*   **`versionService`**:
    *   `axios` или аналогичный HTTP клиент.
*   **Общее**:
    *   Если используется `EventBus`, модули будут публиковать и подписываться на события (например, `newVersionCreated`, `versionSwitchRequested`, `versionSwitched`, `sceneStateUpdated`, `fileContentUpdated`).

### Пример адаптации `updateTimelineFromServer` для `VersionTimelinePanel.js`:

```javascript
// In VersionTimelinePanel.js
class VersionTimelinePanel {
    constructor(appState, eventBus, versionService) {
        this.appState = appState;
        this.eventBus = eventBus; // Если используется
        this.versionService = versionService;
        this.timelineContainer = document.getElementById('versionTimeline');
        this.versionFrames = document.getElementById('versionFrames');
        this.initAutoScroll();

        // Подписка на обновление состояния или прямой вызов render
        // this.eventBus.on('versionsUpdated', (versions) => this.renderTimeline(versions));
        // или this.appState.on('change:versions.timeline', (versions) => this.renderTimeline(versions));
    }

    initAutoScroll() {
        if (this.versionFrames) {
            const observer = new MutationObserver(() => {
                this.versionFrames.scrollTop = this.versionFrames.scrollHeight;
            });
            observer.observe(this.versionFrames, { childList: true });
        }
    }

    async loadAndRenderVersions() {
        try {
            const currentBranch = this.appState.getState().versions.currentBranch; // Пример получения ветки
            const versions = await this.versionService.fetchVersions(currentBranch);
            this.appState.setState({ versions: { timeline: versions } }); // Обновляем состояние
            this.renderTimeline(versions);
        } catch (error) {
            console.error("Failed to load versions for timeline:", error);
            this.renderDemoVersions(); // Опциональный fallback
        }
    }

    renderTimeline(versions) {
        if (!this.versionFrames) return;
        this.versionFrames.innerHTML = '';
        const localVersions = [...versions].reverse(); // Newest at bottom

        localVersions.forEach((version, index) => {
            const frame = document.createElement('div');
            frame.className = 'version-frame';
            // ... (как в оригинале, но index может быть не нужен если номера версий приходят с бэка)
            // или использовать реальный version.name/id если он есть
            frame.innerHTML = `
              <div class="version-placeholder">
                <span class="version-label">В${version.displayId || (index + 1)}</span>
              </div>
              <div class="version-text">
                <p>${version.prompt || 'No prompt'}</p>
              </div>
            `;
            frame.addEventListener('click', () => {
                // this.eventBus.emit('versionSwitchRequested', { versionId: version.id, branchName: version.branch });
                // или прямой вызов:
                // this.promptManager.switchToVersion(version.id, version.branch);
                // (потребуется передать promptManager или сделать его доступным)
                console.log(`Requesting switch to version ${version.id}`);
            });
            this.versionFrames.appendChild(frame);
        });
    }
    // ... renderDemoVersions ...
}
```
Это примерная структура, требующая адаптации под конкретную реализацию `AppState`, `EventBus` и архитектуру менеджеров. Важно сохранить асинхронность при работе с сервисами и четко разделить обязанности между модулями.
