# Том 6: Справочник Фронтенд-модулей
**Версия:** 20.2 (Optimized)
**Дата:** 29 марта 2026 г.
**Статус:** Техническая документация для разработчиков

---

## 1. Ядро (Core)

### 1.1. `js/core/init.js`
Центральный узел инициализации.
*   **`initCore()` (async):** Запускает последовательность: Scene -> Audio -> UI -> Tria.
*   **`state`:** Глобальный объект состояния. Содержит инстансы всех менеджеров.

### 1.2. `js/core/eventBus.js`
Шина событий (Mediator Pattern).
*   **`emit(event, data)`:** Трансляция события (например, `audio:spectralData`).
*   **`on(event, callback)`:** Подписка на поток данных.

---

## 2. 3D и Визуализация

### 2.1. `js/3d/sceneSetup.js`
Настройка графического контура.
*   **`initializeScene(state)`:** Инициализирует `WebGPURenderer` (r171+). Если WebGPU недоступен, автоматически переключается на WebGL 2.
*   **Параметры:** Настраивает `OrthographicCamera` для фронтального вида голограммы.

### 2.2. `js/3d/hologramRenderer.js`
Ядро отрисовки BasilaQ-128.
*   **`updateVisuals(levels, pans)`:** Принимает данные из CWT. 
    *   `levels`: Float32Array(256) — громкость.
    *   `pans`: Float32Array(128) — фазовая панорама.
*   **Физика:** Реализует дискретное смещение по X (шаг 1.41°).

---

## 3. Аудио-процессинг

### 3.1. `js/services/AudioService.js`
Singleton для управления аудио-контекстом.
*   **`loadWasmModule()`:** Загружает `cwt_analyzer.wasm`.
*   **`createWorkletNode()`:** Создает `AudioWorkletNode` и передает клонированный WASM-буфер (`slice(0)`).

### 3.2. `js/audio/waveletAnalyzer.js`
AudioWorklet-процессор.
*   Выполняет **Truncated CWT** (вейвлет-анализ) в отдельном потоке.
*   Отправляет результаты в `eventBus` каждые 16мс (60 FPS).

---

## 4. Мультимодальный ввод (MediaPipe)

### 4.1. `js/multimodal/handsTracking.js`
Интеграция **MediaPipe Hand Landmarker Task (API3)**.
*   **`landmarks`:** Нормализованные координаты (0.0 - 1.0).
*   **`worldLandmarks`:** Физические координаты в метрах для XR-маппинга.
*   **`GestureDNA`:** Анализ уникальной моторики пользователя.

---

## 5. Интерфейс (UI)

### 5.1. `js/ai/chat.js`
Управление чатом с Триа v3.1.
*   **`streamThought()`:** Посимвольный вывод процесса размышлений.
*   **`stageLabels`:** Маркеры `RESEARCH`, `THOUGHT` (💭), `SYNTHESIS`, `CRITIC`.

### 5.2. `js/ui/GestureLiveStudio.js`
Интерфейс записи жестов.
*   Обеспечивает маппинг траекторий на команды (`applyProgramEvent`).

---
**"Модульность — это свобода эволюции. Чистый код — это ясное мышление."**
_Approved by Frontend Architecture Group._
