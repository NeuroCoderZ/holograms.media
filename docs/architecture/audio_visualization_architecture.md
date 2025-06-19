# Архитектура Визуализации Аудиопотока "Three-dimensional audio-visual technology"

## 1. Введение

Данный документ описывает архитектуру системы визуализации аудиопотока в реальном времени для проекта "Three-dimensional audio-visual technology". Система предназначена для создания динамического визуального представления аудио, улавливаемого с микрофона пользователя, с использованием анализа на основе непрерывного вейвлет-преобразования (CWT) и рендеринга с помощью Three.js. Управление визуализацией осуществляется посредством жестов рук, распознаваемых библиотекой `fingerpose`.

## 2. Обзор Системы

Система состоит из следующих ключевых модулей:

*   **Модуль Захвата Аудио (Audio Input):** Использует Web Audio API для получения аудиоданных с микрофона пользователя.
*   **Модуль Анализа Аудио (Audio Analysis):** Выполняет непрерывное вейвlet-преобразование (CWT) аудиоданных для извлечения частотно-временных характеристик. Этот модуль реализован на Rust и скомпилирован в WebAssembly (WASM) для высокой производительности.
*   **Модуль Визуализации (Visualization):** Использует Three.js для рендеринга 3D-голограммы, анимированной на основе результатов CWT-анализа (уровней громкости и углов панорамы).
*   **Модуль Управления Жестами (Gesture Control):** Использует веб-камеру и библиотеку `fingerpose` (поверх MediaPipe Hands) для распознавания жестов рук, позволяющих управлять параметрами визуализации.

## 3. Анализ Аудио на Основе Непрерывного Вейвлет-Преобразования (CWT)

В отличие от традиционного быстрого преобразования Фурье (FFT), CWT обеспечивает лучшее разрешение как по времени, так и по частоте, что позволяет создавать более детализированные и отзывчивые визуализации.

### 3.1. Выбор Вейвлета

Будет использован вейвлет Морле (Morlet wavelet) из-за его хорошей локализации в частотно-временной области. Ключевым параметром для вейвлета Морле является `OMEGA0`, установленный в реализации на Rust значением `6.0`. Этот параметр влияет на соотношение временного и частотного разрешения вейвлета.

### 3.2. Алгоритм Быстрого CWT

Алгоритм быстрого CWT реализован на Rust и использует библиотеку `rustfft` для выполнения преобразований Фурье. Процесс включает следующие шаги:

1.  **Получение Аудиоданных:** Стерео аудиоданные (левый и правый каналы) поступают в виде блоков (chunks).
2.  **FFT Аудиоданных:** Для каждого канала вычисляется FFT.
3.  **Генерация и FFT Вейвлетов:** Для каждой из предопределенных `target_frequencies` (целевых частот):
    a.  Генерируется вейвлет Морле, соответствующий данной частоте и `sample_rate`. Масштаб вейвлета (`s`) вычисляется на основе `OMEGA0`, `sample_rate` и целевой частоты.
    b.  Вычисляется FFT для сгенерированного вейвлета (предварительно дополненного нулями до размера аудиоданных).
4.  **Свертка в Частотной Области:** FFT аудиоданных умножается на сопряженное FFT вейвлета для каждого канала.
5.  **Обратное FFT (IFFT):** К результату умножения применяется IFFT для получения CWT коэффициентов во временной области для каждого канала и каждой целевой частоты.
6.  **Извлечение Данных для Визуализации:**
    a.  **Уровни громкости (dB):** Из CWT коэффициентов (обычно берется коэффициент из центра временного окна) извлекается магнитуда для левого и правого каналов. Эта магнитуда конвертируется в децибелы (dB) и нормализуется в диапазоне (например, от -100dB до 0dB).
    b.  **Углы панорамы:** На основе фазовой разницы между CWT коэффициентами левого и правого каналов для каждой целевой частоты вычисляется угол панорамы (например, от -90 до +90 градусов), представляющий пространственное положение звука.

Результатом являются два массива: один для уровней громкости (стерео, по одному значению для каждой целевой частоты на каждый канал) и один для углов панорамы (по одному значению для каждой целевой частоты).

### 3.3. Реализация WebAssembly (WASM)

Модуль анализа аудио реализован на Rust и скомпилирован в WebAssembly (WASM) для выполнения в браузере с производительностью, близкой к нативной. Это позволяет выполнять сложные вычисления CWT в реальном времени.

#### 3.3.1. Реализация на Rust: Функция `encode_audio_to_hologram`

Основная логика анализа аудио на стороне Rust инкапсулирована в функции `encode_audio_to_hologram`, расположенной в `backend/rust/fastcwt_processor/src/lib.rs`.

**Сигнатура функции (упрощенно):**
```rust
pub fn encode_audio_to_hologram(
    left_channel: &[f32],      // Слайс с данными левого аудиоканала
    right_channel: &[f32],     // Слайс с данными правого аудиоканала
    sample_rate: f32,          // Частота дискретизации аудио
    target_frequencies: &[f32],// Слайс с целевыми частотами для анализа
    output_db_levels: &mut [f32], // Выходной мутабельный слайс для уровней dB (стерео)
    output_pan_angles: &mut [f32] // Выходной мутабельный слайс для углов панорамы
)
```

**Описание работы:**
1.  **Инициализация:** Создается планировщик FFT (`FftPlanner`) из библиотеки `rustfft`.
2.  **FFT Входных Сигналов:** К данным левого и правого каналов применяется прямое FFT.
3.  **Итерация по Целевым Частотам:** Для каждой частоты в `target_frequencies`:
    a.  **Генерация Вейвлета Морле:** Создается вейвлет Морле для текущей частоты с использованием параметра `OMEGA0` (6.0). Размер вейвлета соответствует размеру входного аудио-чанка.
    b.  **FFT Вейвлета:** К сгенерированному вейвлету применяется прямое FFT.
    c.  **Свертка:** Производится умножение FFT аудиосигнала на FFT вейвлета (в сопряженной форме) в частотной области. Затем выполняется обратное FFT для получения коэффициентов CWT во временной области.
    d.  **Извлечение Магнитуды и Фазы:** Из центральной точки полученных CWT коэффициентов для каждого канала извлекаются магнитуда и фаза.
    e.  **Расчет Уровня dB:** Магнитуды преобразуются в уровни громкости в децибелах (dB), которые затем записываются в `output_db_levels`. Предусмотрено по одному значению на канал для каждой целевой частоты (например, `output_db_levels[i]` для левого канала, `output_db_levels[i + target_frequencies.len()]` для правого).
    f.  **Расчет Угла Панорамы:** Фазовая разница между левым и правым каналами используется для расчета угла панорамы, который записывается в `output_pan_angles`.
4.  **Результат:** Массивы `output_db_levels` и `output_pan_angles` заполняются вычисленными значениями.

Используется библиотека `rustfft` для эффективных преобразований Фурье.

#### 3.3.2. Взаимодействие JavaScript с WASM через AudioWorklet

Для интеграции Rust-WASM модуля с Web Audio API используется `AudioWorkletProcessor`. Это позволяет выполнять ресурсоемкий анализ аудио в отдельном потоке, не блокируя основной поток браузера.

##### 3.3.2.1. JavaScript на Основном Потоке (`CwtAudioPipelineManager` - концептуально)

На основном потоке JavaScript необходим класс или модуль (условно назовем его `CwtAudioPipelineManager`) для управления аудио-пайплайном. Его задачи:

1.  **Загрузка AudioWorklet:** Загрузка скрипта `waveletAnalyzer.js` (в котором определен `CwtProcessor`) с помощью `audioContext.audioWorklet.addModule()`.
2.  **Создание Узла AudioWorkletNode:** Создание экземпляра `AudioWorkletNode`, указав имя процессора `'cwt-processor'`.
    ```javascript
    // Пример создания узла в основном потоке
    // const audioContext = new AudioContext();
    // await audioContext.audioWorklet.addModule('path/to/waveletAnalyzer.js');
    // const cwtNode = new AudioWorkletNode(audioContext, 'cwt-processor');
    ```
3.  **Отправка Инициализационных Данных:** После готовности WASM-модуля в AudioWorklet (о чем может сигнализировать сообщение `WASM_READY`), отправка необходимых данных для инициализации анализатора, таких как `sampleRate` и `targetFrequencies`, через `cwtNode.port.postMessage()`.
    ```javascript
    // Пример отправки данных в AudioWorklet
    // cwtNode.port.postMessage({
    //   type: 'INIT_DATA',
    //   sampleRate: audioContext.sampleRate,
    //   targetFrequencies: [60, 120, 250, ... , 16000] // Пример массива частот
    // });
    ```
4.  **Получение Результатов Анализа:** Прослушивание сообщений от `AudioWorkletNode` через `cwtNode.port.onmessage`. Ожидаются сообщения с типом `AUDIO_DATA`, содержащие массивы `levels` (уровни dB) и `angles` (углы панорамы).
    ```javascript
    // cwtNode.port.onmessage = (event) => {
    //   if (event.data.type === 'AUDIO_DATA') {
    //     const { levels, angles } = event.data;
    //     // Передача данных в модуль визуализации
    //     hologramRenderer.updateVisualization(levels, angles);
    //   } else if (event.data.type === 'WASM_READY') {
    //     console.log('WASM module is ready in AudioWorklet.');
    //     // Теперь можно отправлять INIT_DATA
    //   }
    // };
    ```
5.  **Интеграция с Визуализацией:** Передача полученных данных `levels` и `angles` в модуль визуализации (например, `HologramRenderer`) для обновления отображения.

##### 3.3.2.2. AudioWorkletProcessor Script (`waveletAnalyzer.js` - файл `frontend/js/audio/waveletAnalyzer.js`)

Файл `waveletAnalyzer.js` определяет класс `CwtProcessor`, наследуемый от `AudioWorkletProcessor`.

```javascript
// frontend/js/audio/waveletAnalyzer.js (сокращенно)
import init, { encode_audio_to_hologram } from '../wasm/fastcwt/fastcwt_processor.js';

class CwtProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.wasm_ready = false;
        this.sample_rate = 0;
        this.target_frequencies = null;

        this.initWasm(); // Загрузка и инициализация WASM

        this.port.onmessage = (event) => {
            if (event.data.type === 'INIT_DATA') {
                this.sample_rate = event.data.sampleRate;
                this.target_frequencies = new Float32Array(event.data.targetFrequencies);
                console.log('CwtProcessor: Received init data.');
            }
        };
    }

    async initWasm() {
        try {
            // Загрузка WASM-модуля (fastcwt_processor_bg.wasm)
            await init(new URL('../wasm/fastcwt/fastcwt_processor_bg.wasm', import.meta.url));
            this.wasm_ready = true;
            this.port.postMessage({ type: 'WASM_READY' }); // Сообщение о готовности WASM
            console.log('CwtProcessor: WASM module loaded and ready.');
        } catch (e) {
            console.error("CwtProcessor: Failed to load WASM module", e);
        }
    }

    process(inputs, outputs, parameters) {
        // Проверка готовности WASM и наличия данных
        if (!this.wasm_ready || !this.target_frequencies || inputs[0].length === 0 || !inputs[0][0]) {
            return true; // Продолжать обработку, если не готово или нет входных данных
        }

        const inputChannelData = inputs[0]; // Данные с первого входного порта
        const leftChannel = inputChannelData[0];
        const rightChannel = inputChannelData[1] || leftChannel; // Если моно, использовать левый канал для правого

        // Буферы для результатов от WASM-функции
        // Размеры зависят от количества target_frequencies (здесь 130)
        const outputDbLevels = new Float32Array(this.target_frequencies.length * 2); // Стерео
        const outputPanAngles = new Float32Array(this.target_frequencies.length);

        try {
            // Вызов функции Rust WASM
            encode_audio_to_hologram(
                leftChannel,
                rightChannel,
                this.sample_rate,
                this.target_frequencies,
                outputDbLevels,
                outputPanAngles
            );

            // Отправка обработанных данных обратно в основной поток
            this.port.postMessage({
                type: 'AUDIO_DATA',
                levels: outputDbLevels,
                angles: outputPanAngles
            });
        } catch (e) {
            console.error("CwtProcessor: Error processing audio in WASM:", e);
        }
        return true; // Необходимо для продолжения работы AudioWorkletNode
    }
}

registerProcessor('cwt-processor', CwtProcessor);
```

**Ключевые моменты `CwtProcessor`:**
*   **Инициализация WASM:** В конструкторе или асинхронном методе `initWasm` происходит загрузка и инициализация WASM-модуля, скомпилированного из Rust (`fastcwt_processor_bg.wasm`). После успешной загрузки отправляется сообщение `WASM_READY` на основной поток.
*   **Обработка `INIT_DATA`:** Получает от основного потока `sampleRate` и `targetFrequencies` и сохраняет их для последующих вызовов `process`.
*   **Метод `process`:** Этот метод вызывается Web Audio API с блоками аудиоданных.
    *   Он принимает входные аудиоданные (`inputs`).
    *   Подготавливает буферы для выходных данных (`outputDbLevels`, `outputPanAngles`).
    *   Вызывает экспортированную из Rust WASM функцию `encode_audio_to_hologram`, передавая ей аудиоданные, частоту дискретизации, целевые частоты и буферы для результатов.
    *   После выполнения WASM-функции, отправляет полученные массивы `levels` и `angles` обратно на основной поток с помощью `this.port.postMessage({ type: 'AUDIO_DATA', ... })`.

Такая архитектура обеспечивает эффективный анализ аудио в реальном времени, перенося вычисления на Rust/WASM и выполняя их в отдельном потоке AudioWorklet.

## 4. Визуализация с Three.js

Визуализация будет представлять собой 3D голограмму, реагирующую на данные CWT-анализа (уровни громкости и углы панорамы).

### 4.1. `HologramRenderer.js`

Этот класс отвечает за создание и обновление 3D-объектов голограммы в предоставленной сцене Three.js.

**Конструктор и Основные Компоненты:**
*   Конструктор принимает существующий экземпляр `THREE.Scene`: `constructor(scene)`.
*   Создается корневой `THREE.Group` с именем `hologramPivot`, который служит основной точкой привязки для всех элементов голограммы. Это позволяет легко трансформировать всю голограмму (перемещать, вращать, масштабировать).
*   Внутри `hologramPivot` создается `mainSequencerGroup`. Эта группа содержит две дочерние группы: `leftSequencerGroup` и `rightSequencerGroup`.
*   `leftSequencerGroup` и `rightSequencerGroup` представляют собой сетки, содержащие визуальные "колонны" (столбцы). Каждая колонна соответствует определенной частоте/полутону.

**Создание Колонн:**
*   Геометрия каждой колонны представляет собой `THREE.BoxGeometry`.
*   Колонны создаются на основе конфигурационных данных, импортируемых из `hologramConfig.js`, таких как `semitones` (массив объектов, описывающих каждый полутон, включая его цвет и ширину), и констант `GRID_WIDTH`, `GRID_HEIGHT`, `GRID_DEPTH`, `CELL_SIZE`, которые определяют размеры и структуру сеток.
*   Каждая колонна (экземпляр `THREE.Mesh`) добавляется в соответствующую группу (`leftSequencerGroup` или `rightSequencerGroup`).

**Метод `updateVisuals(dbLevels, panAngles)`:**
*   **Входные данные:**
    *   `dbLevels`: `Float32Array` из 260 значений, представляющих уровни громкости в децибелах для левого и правого каналов (по 130 значений на каждый канал, соответствующих `target_frequencies` из CWT анализа).
    *   `panAngles`: `Float32Array` из 130 значений, представляющих углы панорамы в градусах (от -90 до +90) для каждой из `target_frequencies`.
*   **Функциональность:**
    *   **Масштаб по оси Z (глубина):** Масштаб колонн по оси Z изменяется в соответствии со значениями из `dbLevels`. Более высокий уровень громкости приводит к большей глубине колонны.
    *   **Яркость (Emissive Intensity):** Интенсивность собственного свечения материала (`emissiveIntensity`) каждой колонны также модулируется значениями `dbLevels`. Более громкие звуки делают колонны ярче.
    *   **Позиция по оси X (панорамирование):** Позиция колонн по оси X внутри их родительских сеток (`leftSequencerGroup` и `rightSequencerGroup`) изменяется на основе `panAngles` и индивидуальных свойств колонны (например, ее начальной позиции `initialX` и ширины). Это создает эффект смещения колонны влево или вправо в зависимости от вычисленного угла панорамы для соответствующей частоты.

**Внешнее Управление Сценой и Анимацией:**
*   Настройка сцены, такая как создание камеры, добавление основных источников света, цикл рендеринга (`requestAnimationFrame`) и обработка изменения размеров окна, управляются внешними по отношению к классу `HologramRenderer` модулями (например, `sceneSetup.js` и `rendering.js`). `HologramRenderer` фокусируется исключительно на объектах самой голограммы.

**Упрощенный Пример Структуры Класса:**
```javascript
import * as THREE from 'three';
import { semitones, GRID_WIDTH, GRID_HEIGHT, GRID_DEPTH, CELL_SIZE } from '../config/hologramConfig.js'; // Пример импорта

class HologramRenderer {
    constructor(scene) {
        this.scene = scene;
        this.hologramPivot = new THREE.Group();
        this.mainSequencerGroup = new THREE.Group();
        // ... инициализация leftSequencerGroup и rightSequencerGroup ...
        this.hologramPivot.add(this.mainSequencerGroup);
        this.columns = []; // Массив для хранения ссылок на объекты колонн

        this._createSequencerGrids(); // Приватный метод для создания сеток
        this._initializeColumns();    // Приватный метод для создания колонн
        this.scene.add(this.hologramPivot);
    }

    // Концептуальный приватный метод для создания одной колонны
    _createColumn(semitoneIndex, isLeftGrid) {
        const semitone = semitones[semitoneIndex];
        const columnGroup = new THREE.Group();
        // ... создание THREE.Mesh с BoxGeometry ...
        // Сохранение начальной позиции X для панорамирования
        columnGroup.userData.initialX = isLeftGrid ? (GRID_WIDTH - semitone.width) : 0;
        // ... добавление mesh в columnGroup ...
        return columnGroup;
    }

    // Концептуальный приватный метод для инициализации всех колонн
    _initializeColumns() {
        // Цикл по semitones для создания левых и правых колонн
        semitones.forEach((semitone, index) => {
            const columnLeftMeshGroup = this._createColumn(index, true);
            const columnRightMeshGroup = this._createColumn(index, false);

            this.columns.push({
                left: columnLeftMeshGroup, // Группа, содержащая левую колонну-меш
                right: columnRightMeshGroup, // Группа, содержащая правую колонну-меш
                semitoneData: semitone
            });

            // this.leftSequencerGroup.add(columnLeftMeshGroup);
            // this.rightSequencerGroup.add(columnRightMeshGroup);
        });
    }

    updateVisuals(dbLevels, panAngles) {
        if (!dbLevels || !panAngles || dbLevels.length !== 260 || panAngles.length !== 130) {
            // Обработка отсутствия данных, возможно сброс визуализации
            return;
        }

        this.columns.forEach((columnPair, index) => {
            const leftLevelDb = dbLevels[index];
            const rightLevelDb = dbLevels[index + 130]; // 130 - количество целевых частот
            const panAngle = panAngles[index];

            // Обработка левой колонны
            const leftColumnMesh = columnPair.left.children[0]; // Предполагаем, что меш - первый дочерний элемент
            if (leftColumnMesh instanceof THREE.Mesh) {
                const leftAmplitude = THREE.MathUtils.clamp((leftLevelDb + 100) / 100.0, 0, 1);
                leftColumnMesh.scale.z = Math.max(0.001, leftAmplitude * GRID_DEPTH);
                leftColumnMesh.position.z = leftColumnMesh.scale.z / 2;
                if (leftColumnMesh.material instanceof THREE.MeshStandardMaterial) {
                    leftColumnMesh.material.emissiveIntensity = leftAmplitude * 1.5;
                }
                // Расчет и применение панорамирования для X позиции columnPair.left
                const initialXLeft = columnPair.left.userData.initialX;
                const panFactorLeft = panAngle / 90.0;
                const maxPanShiftLeft = columnPair.semitoneData.width / 2;
                columnPair.left.position.x = initialXLeft - (panFactorLeft * maxPanShiftLeft);
            }

            // Обработка правой колонны (аналогично левой)
            const rightColumnMesh = columnPair.right.children[0];
            if (rightColumnMesh instanceof THREE.Mesh) {
                const rightAmplitude = THREE.MathUtils.clamp((rightLevelDb + 100) / 100.0, 0, 1);
                rightColumnMesh.scale.z = Math.max(0.001, rightAmplitude * GRID_DEPTH);
                rightColumnMesh.position.z = rightColumnMesh.scale.z / 2;
                if (rightColumnMesh.material instanceof THREE.MeshStandardMaterial) {
                    rightColumnMesh.material.emissiveIntensity = rightAmplitude * 1.5;
                }
                // Расчет и применение панорамирования для X позиции columnPair.right
                const initialXRight = columnPair.right.userData.initialX;
                const panFactorRight = panAngle / 90.0;
                const maxPanShiftRight = columnPair.semitoneData.width / 2;
                columnPair.right.position.x = initialXRight + (panFactorRight * maxPanShiftRight);
            }
        });
    }

    getHologramPivot() {
        return this.hologramPivot;
    }
}
```

### 4.2. Оптимизированный Рендеринг
*   Для каждой визуальной колонны создается отдельный объект `THREE.Mesh`.
*   **Пользовательские Шейдеры (Потенциально):** Для более сложных визуальных эффектов (например, волновые узоры на поверхности голограммы, эффекты частиц) могут быть разработаны пользовательские вершинные и фрагментные шейдеры в будущем.

### 4.3. Обновление Визуализации
Метод `updateVisuals(dbLevels, panAngles)` класса `HologramRenderer` вызывается логикой основного приложения каждый раз, когда доступны новые данные `dbLevels` (уровни громкости) и `panAngles` (углы панорамы) из конвейера CWT-анализа аудио. Этот метод обновляет визуальные свойства колонн (глубину, яркость свечения, положение по оси X) на основе этих данных, создавая динамическую реакцию голограммы на звук.

## 5. Управление Жестами

Управление параметрами визуализации (например, цвет, форма, чувствительность) планируется осуществлять с помощью жестов рук.

### 5.1. Библиотеки и Технологии

*   **Отслеживание Ключевых Точек Руки:** Используется библиотека `MediaPipe Hands` от Google. Эта технология обрабатывает видеопоток с веб-камеры пользователя и предоставляет координаты ключевых точек кисти руки и пальцев в реальном времени. Интеграция с `MediaPipe Hands` реализована в модуле `frontend/js/multimodal/handsTracking.js`, который также отвечает за 3D-визуализацию обнаруженных рук.
*   **Распознавание Жестов:** Для интерпретации ключевых точек, полученных от `MediaPipe Hands`, и определения конкретных жестов (например, "сжатый кулак", "открытая ладонь") предназначена библиотека `fingerpose`. Однако, на текущий момент, интеграция `fingerpose` для активного управления визуализацией не завершена. Файл `frontend/js/gestures/detection.js`, который мог бы содержать эту логику, является заглушкой.

### 5.2. Механизм Распознавания Жестов и Управления (Концепция)

Текущая реализация в `frontend/js/multimodal/handsTracking.js` обеспечивает получение данных о положении рук (landmarks) от `MediaPipe Hands` и их отображение в виде 3D-моделей рук на сцене.

Для полноценного управления визуализацией через жесты необходим дополнительный модуль (условно `GestureRecognizer` или доработка `frontend/js/gestures/detection.js`), который будет выполнять следующие функции:

1.  **Получение Данных о Положении Рук:** Этот модуль будет получать данные о ключевых точках рук от `handsTracking.js` (например, через систему событий `eventBus` или прямым вызовом).
2.  **Оценка Жеста с `fingerpose`:** Используя полученные ключевые точки, модуль будет применять библиотеку `fingerpose` для распознавания предопределенных жестов. `fingerpose` позволяет описывать жесты на основе положения пальцев и их сгибов.
3.  **Трансляция Жеста в Команду:** Распознанный жест должен быть преобразован в конкретную команду управления. Например, жест "большой палец вверх" может изменить цвет визуализации, а "сжатый кулак" — ее интенсивность.
4.  **Взаимодействие с Системой:** Команда управления будет передаваться соответствующим компонентам системы, например, классу `HologramRenderer` для изменения визуальных параметров или в общую систему управления состоянием приложения.

**Концептуальный Пример Использования `fingerpose` (Иллюстрация):**
Следующий код показывает, как `fingerpose` мог бы быть использован для распознавания жестов. *Примечание: данный код является концептуальной иллюстрацией и не отражает полностью реализованную и подключенную к управлению систему, так как модуль `gestures/detection.js` является заглушкой.*

```javascript
import * as fp from 'fingerpose';
import * as Gestures from 'fingerpose/src/gestures'; // Стандартные жесты Fingerpose
// import { ThumbsUpGesture, VictoryGesture } from 'fingerpose/src/gestures'; // Пример импорта конкретных жестов

// Предполагается, что handLandmarks приходят от MediaPipe Hands
// (например, из frontend/js/multimodal/handsTracking.js)

class GestureRecognizer {
    constructor() {
        // Пример определения набора жестов для распознавания
        const knownGestures = [
            Gestures.VictoryGesture,
            Gestures.ThumbsUpGesture,
            // Сюда можно добавить кастомные жесты, определенные через GestureDescription
            // new fp.GestureDescription('closed_fist').addCurl(fp.Finger.Thumb, fp.FingerCurl.FullCurl, 1.0)
            //                                       .addCurl(fp.Finger.Index, fp.FingerCurl.FullCurl, 1.0)
            //                                       .addCurl(fp.Finger.Middle, fp.FingerCurl.FullCurl, 1.0)
            //                                       .addCurl(fp.Finger.Ring, fp.FingerCurl.FullCurl, 1.0)
            //                                       .addCurl(fp.Finger.Pinky, fp.FingerCurl.FullCurl, 1.0)
        ];
        this.gestureEstimator = new fp.GestureEstimator(knownGestures);
        console.log("GestureRecognizer: Initialized with predefined gestures.");
    }

    // Метод для обработки данных о положении рук и распознавания жеста
    recognize(handLandmarks) {
        if (!handLandmarks || handLandmarks.length === 0) {
            // Нет данных о руках, нет жестов для распознавания
            return null;
        }

        // fingerpose ожидает массив ключевых точек в формате [x, y, z] для каждой точки
        // handLandmarks от MediaPipe уже в подходящем формате (массив объектов {x,y,z})
        // Однако, fingerpose ожидает массив массивов [[x,y,z], [x,y,z], ...]
        const landmarksAsArrays = handLandmarks.map(point => [point.x, point.y, point.z]);

        const estimation = this.gestureEstimator.estimate(landmarksAsArrays, 8.5); // Чувствительность 8.5

        if (estimation.gestures && estimation.gestures.length > 0) {
            // Сортируем жесты по убыванию уверенности (score)
            const sortedGestures = estimation.gestures.sort((a, b) => b.score - a.score);
            const topGesture = sortedGestures[0];
            console.log(`GestureRecognizer: Detected gesture - ${topGesture.name} (score: ${topGesture.score})`);

            // Здесь должна быть логика трансляции жеста в команду управления
            // this.dispatchGestureAction(topGesture);
            return topGesture;
        }
        return null;
    }

    // Концептуальный метод для выполнения действий на основе распознанного жеста
    dispatchGestureAction(gesture) {
        // Пример:
        // if (gesture.name === 'thumbs_up') {
        //     // eventBus.emit('gestureControl:changeColor', 'red');
        // } else if (gesture.name === 'victory') {
        //     // eventBus.emit('gestureControl:changeColor', 'green');
        // }
        // В реальной системе это могло бы взаимодействовать с HologramRenderer
        // или глобальным состоянием приложения.
        console.warn(`GestureRecognizer: Action for gesture '${gesture.name}' is not implemented.`);
    }
}

// Использование:
// const recognizer = new GestureRecognizer();
// eventBus.on('handsDetected', (landmarks) => { // landmarks от handsTracking.js
//     if (landmarks && landmarks.length > 0) {
//         const gesture = recognizer.recognize(landmarks[0]); // Обработка первой обнаруженной руки
//         // ... дальнейшие действия с распознанным жестом ...
//     }
// });
```
На данный момент, описанный выше `GestureRecognizer` и его интеграция с `HologramRenderer` или другими системами управления является концепцией, так как файл `frontend/js/gestures/detection.js` не содержит полноценной реализации.

### 5.3. Примеры Целевых Жестов
Это примеры жестов, которые система нацелена распознавать и на которые должна реагировать после полной интеграции `fingerpose` для управления визуализацией:

*   **"Victory" (V / "Мир"):** Изменяет основной цвет голограммы (например, на зеленый).
*   **"Thumbs Up" (Большой палец вверх):** Изменяет цвет на другой (например, красный).
*   **"Open Palm" (Открытая ладонь):** Увеличивает чувствительность/амплитуду визуализации.
*   **"Closed Fist" (Сжатый кулак):** Уменьшает чувствительность/амплитуду.
*   **"Pointing Up" (Указательный палец вверх):** Циклическое переключение типов визуализации (если их несколько).

## 6. Производительность и Оптимизация

### 6.1. Целевые Показатели
*   Частота обновления CWT-анализа: не менее 30 раз в секунду.
*   Частота кадров рендеринга (FPS): 60 FPS на современных десктопных браузерах.

### 6.2. Ключевые Оптимизации
*   **WebAssembly для CWT:** Реализовано (Rust скомпилирован в WASM), что критично для производительности анализа аудио.
*   **AudioWorklet:** Реализовано (класс `CwtProcessor` в `frontend/js/audio/waveletAnalyzer.js`), что позволяет выполнять анализ аудио в отдельном потоке, не блокируя основной поток UI.
*   **Рендеринг Колонн Визуализации:** В текущей реализации `HologramRenderer.js` используются индивидуальные объекты `THREE.Mesh` для каждой колонны. Рассмотрение `THREE.InstancedMesh` может стать шагом для дальнейшей оптимизации производительности рендеринга при необходимости отображения очень большого количества колонок или сложной геометрии.
*   **Оптимизация Шейдеров:** Если в будущем будут использоваться кастомные шейдеры для более сложных визуальных эффектов, их необходимо будет тщательно оптимизировать.
*   **Управление Частотой Обновлений:** CWT-данные могут обновляться реже, чем каждый кадр рендеринга, с интерполяцией для плавности визуализации. Это может быть рассмотрено для оптимизации.
*   **Ленивая Загрузка:** Модули WASM и, в будущем, модели для распознавания жестов (если они будут тяжеловесными) должны загружаться асинхронно для улучшения времени начальной загрузки страницы. WASM-модуль CWT уже загружается асинхронно.

## 7. План Реализации и Дальнейшего Развития

Данный план описывает как уже реализованные компоненты, так и следующие шаги по развитию проекта.

### Фаза 1: Завершенные Компоненты и Текущая База
1.  **Модуль CWT на Rust:** Реализована функция `encode_audio_to_hologram` в `backend/rust/fastcwt_processor/src/lib.rs`, выполняющая CWT-анализ стерео аудиопотока. (Статус: **Завершено**)
2.  **Компиляция Rust в WASM:** Модуль Rust успешно компилируется в WebAssembly для использования в браузере. (Статус: **Завершено**)
3.  **Интеграция WASM с AudioWorklet:**
    *   Класс `CwtProcessor` (`frontend/js/audio/waveletAnalyzer.js`) для выполнения WASM-кода в AudioWorklet реализован. (Статус: **Завершено**)
    *   Взаимодействие основного потока с `CwtProcessor` для отправки данных (`INIT_DATA`) и получения результатов (`AUDIO_DATA`) реализовано. Дальнейшая инкапсуляция логики основного потока в класс типа `CwtAudioPipelineManager` может быть рассмотрена для улучшения структуры. (Статус: **Частично завершено, требует возможной доработки**)
4.  **Базовая Визуализация с `HologramRenderer`:** Реализована визуализация с двумя сетками (`leftSequencerGroup`, `rightSequencerGroup`) и индивидуальными 3D-колоннами (`THREE.Mesh`), которые динамически изменяют свой Z-масштаб (глубину), эмиссионную яркость материала в зависимости от уровней громкости (`dbLevels`), и X-смещение на основе углов панорамы (`panAngles`), как описано в Секции 4. (Статус: **Завершено**)
5.  **Отслеживание Рук:** Интеграция `MediaPipe Hands` для отслеживания ключевых точек рук реализована в `frontend/js/multimodal/handsTracking.js`, включая 3D-визуализацию рук. (Статус: **Завершено**)

### Фаза 2: Улучшенная Визуализация и Эффекты (Следующие Шаги)
1.  **Разработка Продвинутых Шейдеров:** Исследование и реализация пользовательских шейдеров для создания более сложных и эстетически привлекательных визуальных эффектов (например, свечение, эффекты частиц, динамические текстуры на колоннах).
2.  **Динамическое Поведение Колонн:** Добавление более сложного поведения для колонн, помимо простого масштабирования и изменения яркости (например, волновые движения, реакции на скорость изменения звука).
3.  **Настройка Параметров Вейвлета:** Экспериментирование с параметрами вейвлета Морле (`OMEGA0` и др.) для достижения различных визуальных стилей и откликов.
4.  **Оптимизация Рендеринга:** Профилирование производительности рендеринга и, при необходимости, внедрение оптимизаций, таких как использование `THREE.InstancedMesh` (если количество объектов станет проблемой) или оптимизация материалов и геометрии.

### Фаза 3: Управление Жестами (Следующие Шаги)
1.  **Интеграция `fingerpose`:** Полноценная интеграция библиотеки `fingerpose` с данными о ключевых точках рук, получаемыми от `MediaPipe Hands` (через `frontend/js/multimodal/handsTracking.js`). Это включает обработку данных в модуле, ответственном за распознавание жестов (например, доработка `frontend/js/gestures/detection.js`).
2.  **Определение и Реализация Кастомных Жестов:** Разработка и реализация набора кастомных жестов с использованием `fingerpose` (например, жесты для управления цветом, формой, интенсивностью визуализации, навигации по интерфейсу).
3.  **Реализация Модуля Управления Жестами:** Создание или доработка модуля (например, в `frontend/js/gestures/detection.js` или нового `GestureController`), который будет:
    a.  Принимать распознанные жесты от `fingerpose`.
    b.  Транслировать эти жесты в конкретные команды управления.
    c.  Взаимодействовать с `HologramRenderer` для изменения визуализации или с другими частями приложения (например, через `eventBus` или систему управления состоянием) для выполнения соответствующих действий.

### Фаза 4: Тестирование и Полировка (Постоянный Процесс / Будущее)
1.  **Тестирование Производительности:** Тщательное тестирование производительности всего конвейера аудиоанализа (CWT + WASM + AudioWorklet) и рендеринга на различных устройствах и браузерах.
2.  **Тестирование Управления Жестами:** После реализации, всестороннее тестирование точности и отзывчивости управления жестами.
3.  **Пользовательское Тестирование (UX):** Сбор обратной связи от пользователей по качеству визуализации, удобству управления жестами и общему впечатлению от приложения.
4.  **Исправление Ошибок и Оптимизация:** Постоянный процесс исправления выявленных ошибок и дальнейшая оптимизация производительности и пользовательского опыта.

## 8. Заключение

Предложенная архитектура позволяет создать высокопроизводительную и интерактивную систему визуализации аудио "Three-dimensional audio-visual technology". Использование WebAssembly для CWT-анализа и оптимизированного рендеринга с Three.js обеспечит плавную работу в реальном времени, а управление жестами добавит уникальный способ взаимодействия с приложением.
```
