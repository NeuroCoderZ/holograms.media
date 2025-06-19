# Функция 4: Интерфейс Жестов и Визуализация Рук/Пальцев

## 1. Эволюция и Лучшая Историческая Реализация

### Ход мыслей/анализ:
Реализация интерфейса для жестового ввода и его визуализации в `script.js.txt` была сосредоточена вокруг элемента `#gesture-area` и данных, получаемых от MediaPipe Hands.

Ключевые аспекты этой реализации:
-   **Элемент `#gesture-area`:**
    -   **Динамическая высота:** Его высота изменялась JS в функции `onHandsResults`: `4px` (когда руки не обнаружены, создавая вид "серой щели") и `25vh` (когда руки обнаружены). Плавность этой анимации должна была обеспечиваться CSS-переходами (`transition: height ...`).
    -   **"Гигантская кнопка":** К `#gesture-area` был привязан `click` listener, который вызывал `startGestureRecording()` или `stopGestureRecording()` для переключения режима записи жеста.
    -   **Визуальная обратная связь при записи:** При вызове `startGestureRecording()` элементу `#gesture-area` добавлялся CSS-класс `recording`. Предполагается, что этот класс изменял внешний вид элемента (например, фон, рамку) для индикации активной записи. Конкретные анимации (вроде бегущей красной линии) в JS не были описаны для этого класса.
-   **Визуализация пальцев в `#gesture-area` (2D):**
    -   В функции `onHandsResults` после получения данных от MediaPipe (`results.multiHandLandmarks`):
        -   Старые точки (`.finger-dot-on-line`) удалялись из `#gesture-area`.
        -   Для каждой из пяти ключевых точек пальцев (thumb, index, middle, ring, pinky - landmarks 4, 8, 12, 16, 20) создавался новый `div` с классом `finger-dot-on-line`.
        -   **Вертикальная позиция (`top`)** этих точек рассчитывалась пропорционально `tip.y` (нормализованная координата Y от MediaPipe) и текущей высоте `#gesture-area.clientHeight`. Небольшой сдвиг `-3px` применялся для центровки точки.
        -   **Размер (`transform: scale(...)`)** точек зависел от глубины `tip.z` (координата Z от MediaPipe), создавая эффект приближения/отдаления (точки больше при приближении). Использовалась функция `THREE.MathUtils.mapLinear` для этого.
        -   Цвет точек (предположительно зеленый) и их базовая форма/размер определялись CSS-классом `finger-dot-on-line`.
-   **3D Визуализация рук в сцене Three.js:**
    -   Параллельно с 2D точками в `#gesture-area`, в `onHandsResults` также обновлялась 3D-визуализация рук в основной сцене Three.js (`handMeshGroup`).
    -   Координаты всех 21 лендмарка руки преобразовывались в мировые координаты сцены.
    -   Создавались `THREE.LineSegments` для отображения скелета руки (соединения между точками, определенные в `HAND_CONNECTIONS` - эта константа не видна в `script.js.txt`, но подразумевается ее наличие) и `THREE.Points` для отображения самих точек лендмарков.
    -   Для точек использовался `PointsMaterial` с `vertexColors: true`. Цвет кончиков пальцев (индексы 4, 8, 12, 16, 20) устанавливался на зеленый (`#00cc00`), остальные точки - белые.
-   **Отсутствие "вертикальной красной линии":** В `script.js.txt` не найдено кода, который бы рисовал или анимировал постоянную вертикальную красную линию в `#gesture-area` для отслеживания пальцев. Визуализация была построена на зеленых точках.
-   **Запись жеста:** Функции `startGestureRecording` и `stopGestureRecording` управляли флагом `isGestureRecording` и классом `recording` на `#gesture-area`, а также таймером `GESTURE_RECORDING_DURATION`. Конкретная логика сбора данных жеста была помечена как `// TODO`.

Эта реализация обеспечивала как 2D-визуализацию кончиков пальцев в специальной области UI, так и полную 3D-визуализацию рук в основной сцене.

### Описание финальной логики и алгоритмов:

1.  **Инициализация (`DOMContentLoaded`):**
    *   Получение ссылки на элемент `#gesture-area`.
    *   Установка `title` для `#gesture-area`.
    *   Привязка `click` listener к `#gesture-area` для вызова `startGestureRecording`/`stopGestureRecording`.
    *   Инициализация MediaPipe Hands (`initializeMediaPipeHands`), включая установку `onHandsResults` как callback.

2.  **Обработка результатов MediaPipe (`onHandsResults`):**
    *   Определение `handsArePresent`.
    *   **Обновление `#gesture-area`:**
        *   Установка `gestureAreaElement.style.height` в `'25vh'` (если `handsArePresent`) или `'4px'` (иначе). Это изменение высоты должно анимироваться через CSS-transition.
        *   Вызов `updateHologramLayout(handsArePresent)` для адаптации основной 3D-сцены.
    *   **2D Визуализация пальцев в `#gesture-area`:**
        *   Если `isGestureCanvasReady` (флаг готовности, вероятно, после инициализации MediaPipe) `true` и `handsArePresent`:
            *   Очистка предыдущих элементов `.finger-dot-on-line` из `#gesture-area`.
            *   Для каждой обнаруженной руки (`results.multiHandLandmarks`):
                *   Извлечение 5 ключевых точек пальцев (landmarks 4, 8, 12, 16, 20 - `tip`).
                *   Для каждой точки `tip`:
                    *   Создание `div.finger-dot-on-line`.
                    *   `dot.style.top = (tip.y * gestureArea.clientHeight - 3) + 'px';`.
                    *   `scale = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(tip.z, -0.5, 0.1, 1.5, 0.5), 0.5, 1.5);`.
                    *   `dot.style.transform = \`scale(\${scale})\`;`.
                    *   Добавление `dot` в `#gesture-area`.
    *   **3D Визуализация рук в сцене Three.js:**
        *   Очистка `handMeshGroup` (группа в сцене Three.js для 3D рук).
        *   Если `handsArePresent`:
            *   Для каждой руки:
                *   Преобразование всех 21 лендмарков в 3D-координаты сцены.
                *   Создание `THREE.LineSegments` для скелета руки (по `HAND_CONNECTIONS`).
                *   Создание `THREE.Points` для лендмарков.
                *   Установка цветов вершин для `Points` (зеленые кончики, остальные белые).
                *   Добавление `LineSegments` и `Points` в `handMeshGroup`.

3.  **Запись Жеста:**
    *   `startGestureRecording()`:
        *   Устанавливает `isGestureRecording = true`.
        *   Добавляет класс `recording` к `#gesture-area`.
        *   Запускает `setTimeout(stopGestureRecording, GESTURE_RECORDING_DURATION)`.
        *   `// TODO: Добавить здесь логику сбора данных жеста`.
    *   `stopGestureRecording()`:
        *   Устанавливает `isGestureRecording = false`.
        *   Удаляет класс `recording` с `#gesture-area`.
        *   Очищает таймаут.
        *   `// TODO: Добавить здесь логику обработки/отправки записанных данных жеста`.

### Ключевые фрагменты кода из архивов (`script.js`):

*   **Обновление высоты `#gesture-area` и вызов `updateHologramLayout` в `onHandsResults`:**
    ```javascript
    function onHandsResults(results) {
        const gestureAreaElement = document.getElementById('gesture-area');
        const handsArePresent = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

        if (gestureAreaElement) {
            const targetHeight = handsArePresent ? '25vh' : '4px';
            if (gestureAreaElement.style.height !== targetHeight) {
                gestureAreaElement.style.height = targetHeight;
                updateHologramLayout(handsArePresent);
            }
        }
        // ...
    }
    ```

*   **Создание и позиционирование 2D точек пальцев в `#gesture-area` (внутри `onHandsResults`):**
    ```javascript
    // ... (внутри цикла по рукам и затем по 5 кончикам пальцев 'tip')
    const dot = document.createElement('div');
    dot.className = 'finger-dot-on-line';
    const gestureAreaHeight = gestureArea.clientHeight;
    const topPosition = tip.y * gestureAreaHeight;
    const scale = THREE.MathUtils.clamp(THREE.MathUtils.mapLinear(tip.z, -0.5, 0.1, 1.5, 0.5), 0.5, 1.5);
    dot.style.top = `${topPosition - 3}px`; // -3px для центровки
    dot.style.transform = `scale(${scale})`;
    gestureArea.appendChild(dot);
    ```

*   **Переключение режима записи жеста:**
    ```javascript
    // В DOMContentLoaded:
    const gestureArea = document.getElementById('gesture-area');
    if (gestureArea) {
      gestureArea.addEventListener('click', () => {
        if (!isGestureRecording) {
          startGestureRecording();
        } else {
          stopGestureRecording(); // Позволяем остановить запись повторным кликом
        }
      });
    }

    // Функции:
    function startGestureRecording() {
      if (isGestureRecording) return;
      isGestureRecording = true;
      if (gestureArea) gestureArea.classList.add('recording');
      console.log("Начало записи жеста.");
      gestureTimeoutId = setTimeout(stopGestureRecording, GESTURE_RECORDING_DURATION);
      // TODO: Логика сбора данных
    }

    function stopGestureRecording() {
      if (!isGestureRecording) return;
      isGestureRecording = false;
      if (gestureArea) gestureArea.classList.remove('recording');
      if (gestureTimeoutId) clearTimeout(gestureTimeoutId);
      console.log("Остановка записи жеста.");
      // TODO: Логика обработки данных
    }
    ```

## 2. План Интеграции в Текущую Архитектуру

*(Примечание: План основан на предполагаемой структуре. Адаптируйте имена модулей и пути.)*

### Целевые модули:

*   **`frontend/js/managers/HandTrackingManager.js`** (или аналогичный модуль для MediaPipe): Будет содержать логику `initializeMediaPipeHands` и `onHandsResults`. Отвечает за получение данных от MediaPipe.
*   **`frontend/js/ui/GestureAreaUIManager.js`**: Управляет элементом `#gesture-area`, его высотой, классом `recording`, созданием и обновлением 2D точек (`.finger-dot-on-line`).
*   **`frontend/js/managers/GestureRecordingManager.js`**: Содержит логику `startGestureRecording`, `stopGestureRecording`, управление состоянием `isGestureRecording`, таймером и сбором/обработкой данных жеста (TODOs из оригинала).
*   **`frontend/js/renderers/HandRenderer3D.js`** (или часть `SceneManager.js`): Отвечает за 3D-визуализацию рук (`handMeshGroup`) в основной сцене Three.js.
*   **`frontend/js/EventBus.js`** (если используется): Для событий, таких как `handsDetected`, `handsLost`, `gestureDataRecorded`.
*   **`frontend/js/state/AppState.js`**: Может хранить состояние `isGestureRecording`, `handsArePresent`.

### Адаптированный код и инструкции:

1.  **`HandTrackingManager.js`**:
    *   **Метод `initialize()`:** Настраивает MediaPipe Hands и устанавливает `this.onResultsCallback` как обработчик.
    *   **Метод `onResultsCallback(results)` (адаптированный `onHandsResults`):**
        *   Определяет `handsArePresent`.
        *   Публикует событие: `eventBus.emit(handsArePresent ? 'handsDetected' : 'handsLost', results);`.
        *   Не должен напрямую манипулировать DOM элементами типа `#gesture-area` или 3D-сценой.

2.  **`GestureAreaUIManager.js`**:
    *   **Элементы:** `this.gestureArea = document.getElementById('gesture-area');`.
    *   **Метод `updateVisibility(handsArePresent)`:** Устанавливает `this.gestureArea.style.height` (`'25vh'` или `'4px'`).
    *   **Метод `renderFingerDots(results)`:**
        *   Вызывается при событии `handsDetected`.
        *   Очищает старые `.finger-dot-on-line`.
        *   Создает и добавляет новые точки на основе `results.multiHandLandmarks` (логика из `onHandsResults` для 2D точек).
    *   **Метод `setRecordingState(isRecording)`:** Добавляет/удаляет класс `recording` с `this.gestureArea`.
    *   **Инициализация:** Привязывает `click` listener к `this.gestureArea`, который вызывает методы `GestureRecordingManager.toggleRecording()`.
    *   **Подписки:** `eventBus.on('handsDetected', (results) => { this.updateVisibility(true); this.renderFingerDots(results); });`, `eventBus.on('handsLost', () => { this.updateVisibility(false); this.clearFingerDots(); });`, `eventBus.on('gestureRecordingStateChanged', (isRecording) => this.setRecordingState(isRecording));`.

3.  **`GestureRecordingManager.js`**:
    *   **Свойства:** `this.isRecording`, `this.timeoutId`, `this.RECORDING_DURATION`.
    *   **Метод `toggleRecording()`:** Переключает состояние записи.
    *   **Метод `start()` (адаптированный `startGestureRecording`):**
        *   Устанавливает `this.isRecording = true`.
        *   Публикует `eventBus.emit('gestureRecordingStateChanged', true);`.
        *   Запускает таймер.
        *   `// TODO: Логика сбора данных жеста`.
    *   **Метод `stop()` (адаптированный `stopGestureRecording`):**
        *   Устанавливает `this.isRecording = false`.
        *   Публикует `eventBus.emit('gestureRecordingStateChanged', false);`.
        *   Очищает таймер.
        *   `// TODO: Логика обработки и, возможно, отправки данных жеста (например, eventBus.emit('gestureDataRecorded', recordedData))`.
    *   **Подписки:** Может не требоваться, если управление идет через `GestureAreaUIManager`.

4.  **`HandRenderer3D.js`**:
    *   **Свойства:** `this.handMeshGroup = new THREE.Group();`. Добавляется в основную сцену при инициализации.
    *   **Метод `updateHandMeshes(results)`:**
        *   Вызывается при событии `handsDetected`.
        *   Очищает `this.handMeshGroup`.
        *   Создает и добавляет 3D-линии и точки для рук на основе `results.multiHandLandmarks` (логика из `onHandsResults` для 3D).
    *   **Метод `clearHandMeshes()`:** Вызывается при событии `handsLost`.
    *   **Подписки:** `eventBus.on('handsDetected', (results) => this.updateHandMeshes(results));`, `eventBus.on('handsLost', () => this.clearHandMeshes());`.

### Необходимые зависимости:
*   **`GestureAreaUIManager`**: `EventBus`, `GestureRecordingManager`.
*   **`HandTrackingManager`**: `EventBus`, MediaPipe.
*   **`GestureRecordingManager`**: `EventBus`.
*   **`HandRenderer3D`**: `EventBus`, `THREE.js`.
*   CSS для `#gesture-area` (включая transition для height), `.finger-dot-on-line`, и класса `.recording`.

### Пример структуры `GestureAreaUIManager.js`:
```javascript
// In frontend/js/ui/GestureAreaUIManager.js
// import EventBus from '../EventBus.js';
// import GestureRecordingManager from '../managers/GestureRecordingManager.js';

class GestureAreaUIManager {
    constructor(/* eventBus, gestureRecordingManager */) {
        // this.eventBus = eventBus;
        // this.gestureRecordingManager = gestureRecordingManager;
        this.gestureArea = document.getElementById('gesture-area');

        if (this.gestureArea) {
            this.gestureArea.title = 'Кликните для записи жеста';
            this.gestureArea.addEventListener('click', () => {
                // this.gestureRecordingManager.toggleRecording();
                console.log("Gesture area clicked - toggle recording"); // Placeholder
            });
        }
        // this.subscribeToEvents();
    }

    /*
    subscribeToEvents() {
        this.eventBus.on('handsDetected', (results) => {
            this.updateVisibility(true);
            this.renderFingerDots(results);
        });
        this.eventBus.on('handsLost', () => {
            this.updateVisibility(false);
            this.clearFingerDots();
        });
        this.eventBus.on('gestureRecordingStateChanged', (isRecording) => {
            this.setRecordingState(isRecording);
        });
    }
    */

    updateVisibility(show) {
        if (!this.gestureArea) return;
        this.gestureArea.style.height = show ? '25vh' : '4px';
    }

    renderFingerDots(results) {
        if (!this.gestureArea || !results.multiHandLandmarks) return;
        this.clearFingerDots();

        results.multiHandLandmarks.forEach(landmarks => {
            const fingerTipsIndices = [4, 8, 12, 16, 20]; // Thumb, Index, Middle, Ring, Pinky
            fingerTipsIndices.forEach(index => {
                const tip = landmarks[index];
                if (!tip) return;

                const dot = document.createElement('div');
                dot.className = 'finger-dot-on-line';

                const gestureAreaHeight = this.gestureArea.clientHeight;
                const topPosition = tip.y * gestureAreaHeight;
                // Note: THREE.MathUtils might not be available here directly
                // Need a utility for mapLinear and clamp or implement it.
                const scale = Math.max(0.5, Math.min(1.5, (tip.z + 0.5) * -1 + 1.5)); // Simplified mapping

                dot.style.top = `${topPosition - 3}px`;
                dot.style.transform = `scale(${scale})`;
                this.gestureArea.appendChild(dot);
            });
        });
    }

    clearFingerDots() {
        if (!this.gestureArea) return;
        const existingDots = this.gestureArea.querySelectorAll('.finger-dot-on-line');
        existingDots.forEach(dot => dot.remove());
    }

    setRecordingState(isRecording) {
        if (!this.gestureArea) return;
        this.gestureArea.classList.toggle('recording', isRecording);
    }
}
```
Этот план предполагает сильную модульность и использование шины событий для межмодульного взаимодействия, что типично для современных frontend-архитектур. Необходимо будет также воссоздать соответствующие CSS стили.
