# Функция 3: Расположение Голограммы, Адаптивное Масштабирование и Взаимодействие

## 1. Эволюция и Лучшая Историческая Реализация

### Ход мыслей/анализ:
Логика позиционирования, масштабирования и адаптивного поведения 3D-голограммы в ответ на изменения UI (в частности, появление/скрытие области для жестового ввода `#gesture-area`) была хорошо проработана в `script.js.txt`. Эта версия является наиболее полной.

Ключевые аспекты реализации:
-   **Основной объект голограммы:** `hologramPivot = new THREE.Group()` служил как основной "якорь" для всех трансформаций (масштаб, позиция по Y). Фактические 3D-объекты (`mainSequencerGroup`, содержащий левую и правую сетки) были дочерними по отношению к `hologramPivot` и центрированы относительно него.
-   **Начальное состояние:** При загрузке страницы, голограмма (`hologramPivot`) позиционировалась по центру доступной области рендеринга и масштабировалась так, чтобы занимать большую часть этой области, но с небольшими отступами. Это достигалось вызовом `updateHologramLayout(false)`.
-   **Адаптация к области жестов (`#gesture-area`):**
    -   При появлении рук (определяется `onHandsResults` из MediaPipe), высота `#gesture-area` увеличивалась до `25vh`.
    -   Это событие триггерило вызов `updateHologramLayout(true)`.
    -   В `updateHologramLayout(true)`:
        -   Голограмма (`hologramPivot`) анимированно (через `TWEEN.js`) уменьшала свой масштаб до фиксированного значения `0.8`.
        -   Позиция `hologramPivot` по оси Y смещалась вверх, создавая отступ `window.innerHeight * 0.05` (5% от высоты окна) сверху, чтобы освободить место для `#gesture-area` внизу.
        -   Доступная высота для рендеринга голограммы считалась уменьшенной на высоту `#gesture-area` (`windowHeight * 0.25`).
-   **Возврат в исходное состояние:**
    -   Когда руки переставали отслеживаться, `onHandsResults` вызывал `updateHologramLayout(false)`.
    -   Голограмма анимированно возвращалась к исходному масштабу (рассчитанному `calculateInitialScale`) и позиции Y=0 (центр доступного пространства).
-   **Функция `calculateInitialScale`:** Рассчитывала оптимальный масштаб, чтобы вписать голограмму в доступную ширину (98% от `containerWidth`) и высоту (`availableHeightForHologram`), с минимальным порогом масштаба `0.1`.
-   **Обработка изменения размера окна (`resize` event):** Пересчитывались размеры панелей, доступное пространство для рендера, обновлялись камера и рендерер, и вызывался `updateHologramLayout` для коррекции макета голограммы.
-   **Вращение голограммы:** Осуществлялось с помощью `Hammer.js` для `pan` жестов, изменяя `hologramPivot.rotation.x` и `hologramPivot.rotation.y`. При окончании жеста (`panend`), вращение плавно анимировалось обратно к нулю.

Эта система обеспечивала динамическое и плавное изменение макета голограммы в зависимости от контекста использования (наличие рук для жестового ввода).

### Описание финальной логики и алгоритмов:

1.  **Инициализация (`DOMContentLoaded`):**
    *   Создается `hologramPivot = new THREE.Group()`.
    *   `mainSequencerGroup` (содержащий 3D-сетки) добавляется в `hologramPivot` и центрируется локально: `mainSequencerGroup.position.set(0, -GRID_HEIGHT / 2, 0);`.
    *   `hologramPivot` добавляется в сцену: `scene.add(hologramPivot);`.
    *   Начальное положение и масштаб задаются вызовом `updateHologramLayout(false);`.
    *   Устанавливаются обработчики событий `resize` на `window` и `pan`/`panend` на элемент рендерера через `Hammer.js`.
    *   `MutationObserver` настроен на изменения стиля `#gesture-area` (косвенный триггер `updateHologramLayout` через `resize`).

2.  **Обнаружение Рук (`onHandsResults` из MediaPipe):**
    *   Определяется `handsArePresent = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;`.
    *   Изменяется `gestureAreaElement.style.height` (`'25vh'` или `'4px'`).
    *   **Прямой вызов `updateHologramLayout(handsArePresent);`** для адаптации макета голограммы.

3.  **Обновление Макета Голограммы (`updateHologramLayout(handsVisible)`):**
    *   Получение текущих размеров окна и панелей (`getPanelWidths()`).
    *   Расчет `availableHeight` для голограммы: `windowHeight - (handsVisible ? windowHeight * 0.25 : 4);`.
    *   Расчет `targetScale`: Если `handsVisible`, то `0.8`, иначе `calculateInitialScale(availableWidth, availableHeight)`.
    *   Расчет `targetPositionY`: Если `handsVisible`, то `windowHeight * 0.05` (отступ сверху), иначе `0` (центр).
    *   Плавная анимация `hologramPivot.scale` до `targetScale` и `hologramPivot.position.y` до `targetPositionY` с использованием `TWEEN.js` (длительность 500ms, easing `Quadratic.InOut`).

4.  **Расчет Начального/Адаптивного Масштаба (`calculateInitialScale`):**
    *   Входные параметры: `containerWidth`, `availableHeightForHologram`.
    *   `hologramVisualWidth = GRID_WIDTH * 2; hologramVisualHeight = GRID_HEIGHT;`.
    *   `widthScale = (containerWidth * 0.98) / hologramVisualWidth;` (98% ширины).
    *   `heightScale = availableHeightForHologram / hologramVisualHeight;`.
    *   `scale = Math.min(widthScale, heightScale);`.
    *   `scale = Math.max(scale, 0.1);` (минимальный масштаб).
    *   Возвращает `scale`.

5.  **Обработчик `resize` окна:**
    *   Обновляет размеры рендерера и параметры камеры.
    *   Вызывает `updateHologramLayout`, передавая `handsVisible` (определяемый по классу `hands-detected` на `#gesture-area`, что менее надежно, чем прямой параметр из `onHandsResults`).

6.  **Вращение Голограммы (`Hammer.js`):**
    *   `pan` жест: обновляет `hologramPivot.rotation.x` и `hologramPivot.rotation.y`, ограничивая их `Math.PI/2`.
    *   `panend` жест: анимирует `hologramPivot.rotation.x` и `hologramPivot.rotation.y` обратно к `0` за `ROTATION_RETURN_DURATION`.

### Ключевые фрагменты кода из архивов (`script.js`):

*   **Инициализация `hologramPivot` и `mainSequencerGroup`:**
    ```javascript
    let hologramPivot = new THREE.Group();
    let mainSequencerGroup = new THREE.Group(); // Содержит leftSequencerGroup и rightSequencerGroup
    // ...
    scene.add(hologramPivot);
    hologramPivot.add(mainSequencerGroup);
    mainSequencerGroup.position.set(0, -GRID_HEIGHT / 2, 0); // Центрирование геометрии относительно пивота
    hologramPivot.position.set(0, 0, 0); // Начальная позиция пивота
    // ...
    updateHologramLayout(false); // Установить начальные параметры для состояния "без рук"
    ```

*   **Функция `updateHologramLayout`:**
    ```javascript
    function updateHologramLayout(handsVisible) {
        // ... (проверки элементов) ...
        const windowHeight = window.innerHeight;
        const topMargin = windowHeight * 0.05;
        const availableWidth = window.innerWidth - getPanelWidths();
        const availableHeight = windowHeight - (handsVisible ? windowHeight * 0.25 : 4);

        const targetScale = handsVisible ? 0.8 : calculateInitialScale(availableWidth, availableHeight);
        const targetPositionY = handsVisible ? topMargin : 0;

        new TWEEN.Tween(hologramPivot.scale)
            .to({ x: targetScale, y: targetScale, z: targetScale }, 500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();

        new TWEEN.Tween(hologramPivot.position)
            .to({ y: targetPositionY }, 500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onComplete(() => activeCamera.updateProjectionMatrix())
            .start();
    }
    ```

*   **Функция `calculateInitialScale`:**
    ```javascript
    function calculateInitialScale(containerWidth, availableHeightForHologram) {
        const hologramWidth = GRID_WIDTH * 2;
        const hologramHeight = GRID_HEIGHT;
        let widthScale = (containerWidth * 0.98) / hologramWidth; // Отступ 2% по ширине
        let heightScale = availableHeightForHologram / hologramHeight;
        let scale = Math.min(widthScale, heightScale);
        scale = Math.max(scale, 0.1); // Минимальный масштаб 0.1
        return scale;
    }
    ```

*   **Вызов `updateHologramLayout` из `onHandsResults`:**
    ```javascript
    function onHandsResults(results) {
        const gestureAreaElement = document.getElementById('gesture-area');
        const handsArePresent = results.multiHandLandmarks && results.multiHandLandmarks.length > 0;

        if (gestureAreaElement) {
            const targetHeight = handsArePresent ? '25vh' : '4px';
            if (gestureAreaElement.style.height !== targetHeight) {
                gestureAreaElement.style.height = targetHeight;
                updateHologramLayout(handsArePresent); // Ключевой вызов
            }
        }
        // ...
    }
    ```

## 2. План Интеграции в Текущую Архитектуру

*(Примечание: План основан на предполагаемой структуре. Адаптируйте имена модулей и пути.)*

### Целевые модули:

*   **`frontend/js/managers/HologramManager.js`** (или `SceneManager.js` с расширенной ответственностью): Будет управлять объектом `hologramPivot`, его начальной настройкой, применением трансформаций (масштаб, позиция), и содержать логику `updateHologramLayout` и `calculateInitialScale`.
*   **`frontend/js/managers/InteractionManager.js`**: Для настройки и обработки жестов вращения через `Hammer.js`.
*   **`frontend/js/managers/HandTrackingManager.js`** (или модуль, ответственный за MediaPipe): Где будет находиться логика `onHandsResults`. Этот модуль должен будет уведомлять `HologramManager` и модуль, управляющий `#gesture-area` (например, `GestureUIManager`), о наличии или отсутствии рук.
*   **`frontend/js/ui/GestureUIManager.js`** (или часть `RightPanelManager.js` или `AppUIManager.js`): Для управления высотой и состоянием `#gesture-area`.
*   **`frontend/js/EventBus.js`** (если используется): Для передачи событий, таких как `handsDetected`, `handsLost`, `windowResized`.
*   **`frontend/js/animation/TweenService.js`** (если TWEEN.js используется как сервис): Обертка для TWEEN.js.

### Адаптированный код и инструкции:

1.  **`HologramManager.js`**:
    *   **Свойства:** `this.hologramPivot`, `this.mainSequencerGroup`.
    *   **Метод `initializeHologram()`:** Создает `hologramPivot`, `mainSequencerGroup`, добавляет их в сцену, устанавливает начальное положение `mainSequencerGroup` относительно `hologramPivot`. Вызывает `this.updateLayout(false)` для установки начального состояния.
    *   **Метод `updateLayout(handsVisible)`:** Адаптированная версия `updateHologramLayout`.
        *   Получает `window.innerHeight`, `window.innerWidth`.
        *   Может запрашивать ширину панелей у `PanelManager` или получать ее через `AppState`.
        *   Вызывает `this.calculateOptimalScale(availableWidth, availableHeight)` (аналог `calculateInitialScale`).
        *   Использует `TweenService` для анимации `this.hologramPivot.scale` и `this.hologramPivot.position`.
    *   **Метод `calculateOptimalScale(containerWidth, availableHeight)`:** Адаптированная версия `calculateInitialScale`.
    *   **Метод `resetRotation()`:** Анимирует `this.hologramPivot.rotation` к нулю.
    *   **Подписки:** Подписывается на события `eventBus.on('handsDetected', () => this.updateLayout(true))`, `eventBus.on('handsLost', () => this.updateLayout(false))`, `eventBus.on('windowResized', (dims) => this.updateLayout(this.appState.handsAreVisible))`.

2.  **`InteractionManager.js`**:
    *   **Метод `setupPanGestures(domElement)`:** Настраивает `Hammer.js` на `domElement` рендерера.
        *   `pan` событие: Обновляет `HologramManager.hologramPivot.rotation` (или через метод `HologramManager.setRotation(x,y)`).
        *   `panend` событие: Вызывает `HologramManager.resetRotation()`.

3.  **`HandTrackingManager.js`**:
    *   Логика `onHandsResults`:
        *   Определяет `handsArePresent`.
        *   Генерирует событие: `this.eventBus.emit(handsArePresent ? 'handsDetected' : 'handsLost');`.
        *   (Также может передавать данные о положении пальцев для других целей, например, для `#gesture-area` через `GestureUIManager`).

4.  **`GestureUIManager.js`** (или аналогичный):
    *   **Метод `setHandsPresent(present)`:** Изменяет `style.height` для `#gesture-area`.
    *   **Подписки:** `eventBus.on('handsDetected', () => this.setHandsPresent(true))`, `eventBus.on('handsLost', () => this.setHandsPresent(false))`.

5.  **Главный инициализационный файл приложения:**
    *   Инициализирует все менеджеры.
    *   Настраивает `window.addEventListener('resize', ...)` который публикует событие `eventBus.emit('windowResized', { width, height })` или напрямую вызывает методы менеджеров.

### Необходимые зависимости:
*   **`HologramManager`**: `TweenService`, `AppState` (для получения состояния `handsAreVisible` при `resize`), возможно, `PanelManager` (для `getPanelWidths`).
*   **`InteractionManager`**: `HologramManager`, `Hammer.js`.
*   **`HandTrackingManager`**: `EventBus`, MediaPipe library.
*   **`GestureUIManager`**: `EventBus`.
*   CSS для `z-index` и плавных переходов высоты для `#gesture-area`.

### Пример адаптации `updateHologramLayout` для `HologramManager.js`:
```javascript
// In frontend/js/managers/HologramManager.js
// import TweenService from '../animation/TweenService.js'; // Предполагаемый сервис
// import AppState from '../state/AppState.js'; // Для получения состояния панелей/рук

class HologramManager {
    constructor(scene, camera, /* TweenService, AppState, PanelManager */) {
        this.scene = scene;
        this.camera = camera; // activeCamera
        // this.tweenService = TweenService;
        // this.appState = AppState;
        // this.panelManager = PanelManager; // Для получения getPanelWidths()

        this.hologramPivot = new THREE.Group();
        this.mainSequencerGroup = new THREE.Group(); // Заполняется основной геометрией

        // Константы могут быть частью конфигурации или этого класса
        this.GRID_WIDTH = 130;
        this.GRID_HEIGHT = 260;
    }

    initializeHologram() {
        this.scene.add(this.hologramPivot);
        this.hologramPivot.add(this.mainSequencerGroup);
        this.mainSequencerGroup.position.set(0, -this.GRID_HEIGHT / 2, 0);
        this.hologramPivot.position.set(0, 0, 0);
        this.updateLayout(false); // Начальное состояние без рук
    }

    calculateOptimalScale(containerWidth, availableHeightForHologram) {
        const hologramVisualWidth = this.GRID_WIDTH * 2;
        const hologramVisualHeight = this.GRID_HEIGHT;
        let widthScale = (containerWidth * 0.98) / hologramVisualWidth;
        let heightScale = availableHeightForHologram / hologramVisualHeight;
        let scale = Math.min(widthScale, heightScale);
        return Math.max(scale, 0.1);
    }

    updateLayout(handsVisible) {
        const windowHeight = window.innerHeight;
        const windowWidth = window.innerWidth;
        // const panelWidths = this.panelManager.getPanelWidths(); // Пример
        const panelWidths = (document.querySelector('.panel.left-panel')?.offsetWidth || 0) +
                            (document.querySelector('.panel.right-panel')?.offsetWidth || 0);


        const topMargin = windowHeight * 0.05;
        const availableRenderWidth = windowWidth - panelWidths;
        const availableRenderHeight = windowHeight - (handsVisible ? windowHeight * 0.25 : 4);

        const targetScaleValue = handsVisible ? 0.8 : this.calculateOptimalScale(availableRenderWidth, availableRenderHeight);
        const targetPositionY = handsVisible ? topMargin : 0;

        // Используем TWEEN.js (предполагается, что он доступен глобально или через сервис)
        new TWEEN.Tween(this.hologramPivot.scale)
            .to({ x: targetScaleValue, y: targetScaleValue, z: targetScaleValue }, 500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();

        new TWEEN.Tween(this.hologramPivot.position)
            .to({ y: targetPositionY }, 500)
            .easing(TWEEN.Easing.Quadratic.InOut)
            // .onComplete(() => this.camera.updateProjectionMatrix()) // Камера должна обновляться, если ее параметры зависят от этого
            .start();
    }

    // ... другие методы, как setRotation, resetRotation ...
}
```
Эта структура обеспечивает инкапсуляцию логики управления голограммой и ее реакцией на внешние события, такие как обнаружение рук или изменение размера окна.
