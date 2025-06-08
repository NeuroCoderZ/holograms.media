# Архитектура Визуализации Аудиопотока "CyberVoice"

## 1. Введение

Данный документ описывает архитектуру системы визуализации аудиопотока в реальном времени для проекта "CyberVoice". Система предназначена для создания динамического визуального представления аудио, улавливаемого с микрофона пользователя, с использованием анализа на основе непрерывного вейвлет-преобразования (CWT) и рендеринга с помощью Three.js. Управление визуализацией осуществляется посредством жестов рук, распознаваемых библиотекой `fingerpose`.

## 2. Обзор Системы

Система состоит из следующих ключевых модулей:

*   **Модуль Захвата Аудио (Audio Input):** Использует Web Audio API для получения аудиоданных с микрофона пользователя.
*   **Модуль Анализа Аудио (Audio Analysis):** Выполняет непрерывное вейвlet-преобразование (CWT) аудиоданных для извлечения частотно-временных характеристик. Этот модуль реализован на C++ и скомпилирован в WebAssembly (WASM) для высокой производительности.
*   **Модуль Визуализации (Visualization):** Использует Three.js для рендеринга 3D-голограммы, анимированной на основе результатов CWT-анализа.
*   **Модуль Управления Жестами (Gesture Control):** Использует веб-камеру и библиотеку `fingerpose` (поверх MediaPipe Hands) для распознавания жестов рук, позволяющих управлять параметрами визуализации.

## 3. Анализ Аудио на Основе Непрерывного Вейвлет-Преобразования (CWT)

В отличие от традиционного быстрого преобразования Фурье (FFT), CWT обеспечивает лучшее разрешение как по времени, так и по частоте, что позволяет создавать более детализированные и отзывчивые визуализации.

### 3.1. Выбор Вейвлета

Будет использован вейвлет Морле (Morlet wavelet) из-за его хорошей локализации в частотно-временной области. Параметры вейвлета (например, центральная частота и ширина) будут настраиваемыми для достижения оптимального визуального эффекта.

### 3.2. Алгоритм Быстрого CWT

Для достижения производительности в реальном времени будет реализован быстрый алгоритм CWT, использующий свертку в частотной области с помощью FFT.

Шаги алгоритма:
1.  Получение блока аудиоданных.
2.  Вычисление FFT для аудиоданных.
3.  Для каждого масштаба (соответствующего определенной частоте):
    a.  Генерация вейвлета Морле для данного масштаба.
    b.  Вычисление FFT для вейвлета.
    c.  Умножение FFT аудиоданных на сопряженное FFT вейвлета.
    d.  Вычисление обратного FFT для получения коэффициентов CWT на данном масштабе.
4.  Формирование CWT-матрицы (спектрограммы).

### 3.3. Реализация WebAssembly (WASM)

Модуль анализа аудио будет реализован на C++ и скомпилирован в WebAssembly для выполнения в браузере с производительностью, близкой к нативной.

#### 3.3.1. Класс `FastCWTProcessor` (C++)

```cpp
#include <vector>
#include <complex>
#include <fftw3.h> // Используем библиотеку FFTW

class FastCWTProcessor {
public:
    FastCWTProcessor(int bufferSize, int numScales, double sampleRate);
    ~FastCWTProcessor();

    // Обрабатывает блок аудиоданных и возвращает CWT коэффициенты
    // Коэффициенты могут быть представлены как вектор амплитуд или комплексных чисел
    std::vector<std{::}vector<double>> process(const std::vector<double>& audioBuffer);

private:
    int bufferSize;        // Размер аудиобуфера (например, 1024 семпла)
    int numScales;         // Количество масштабов (частотных бинов)
    double sampleRate;     // Частота дискретизации аудио

    fftw_plan fftPlanSignal;
    fftw_plan ifftPlanConvolution;
    double* fftwInputSignal;
    fftw_complex* fftwOutputSignal;
    double* fftwInputKernel; // Для вейвлета
    fftw_complex* fftwOutputKernel;
    fftw_complex* fftwConvolutionResult; // Для результата свертки перед IFFT

    std::vector<std::vector<std::complex<double>>> morletWavelets; // Предварительно вычисленные FFT вейвлетов

    void generateMorletWavelets();
    void performFFT(const std::vector<double>& input, fftw_complex* output, fftw_plan plan);
    void performIFFT(fftw_complex* input, double* output, fftw_plan plan);
};

// Конструктор, деструктор и реализация методов
// ... (детали реализации опущены для краткости)
```
*Примечание: Использование `std{::}vector` вместо `std::vector` в сигнатуре метода `process` сделано для обхода потенциальных проблем с парсингом Markdown.*

#### 3.3.2. Оптимизации в C++
*   **Предварительное вычисление FFT вейвлетов:** FFT для каждого вейвлета Морле на разных масштабах вычисляется один раз при инициализации.
*   **Использование FFTW:** Высокооптимизированная библиотека для FFT.
*   **Управление памятью:** Эффективное выделение и переиспользование памяти для буферов FFT.

#### 3.3.3. JavaScript Класс `WaveletAnalyzer`

Этот класс будет оберткой над WASM модулем, управляющей его жизненным циклом и взаимодействием с Web Audio API.

```javascript
class WaveletAnalyzer {
    constructor(audioContext, bufferSize = 1024, numScales = 64) {
        this.audioContext = audioContext;
        this.bufferSize = bufferSize;
        this.numScales = numScales;
        this.processorNode = null; // AudioWorkletNode
        this.wasmModule = null;    // Экземпляр WASM модуля

        this.onCwtData = null; // Callback для отправки CWT данных
    }

    async init(wasmPath = 'fastcwt.wasm') {
        // 1. Загрузка и компиляция WASM модуля
        const response = await fetch(wasmPath);
        const wasmBytes = await response.arrayBuffer();
        const { instance } = await WebAssembly.instantiate(wasmBytes, {
            // импорты, если нужны (например, для FFTW JS)
        });
        this.wasmModule = instance.exports; // Предполагается, что C++ функции экспортированы

        // 2. Создание FastCWTProcessor в WASM памяти
        // this.cwtProcessorPtr = this.wasmModule.create_processor(this.bufferSize, this.numScales, this.audioContext.sampleRate);

        // 3. Настройка AudioWorklet
        await this.audioContext.audioWorklet.addModule('wavelet-processor-worklet.js');
        this.processorNode = new AudioWorkletNode(this.audioContext, 'wavelet-processor', {
            processorOptions: {
                bufferSize: this.bufferSize,
                numScales: this.numScales,
                sampleRate: this.audioContext.sampleRate,
                // Передача указателя на WASM обработчик или использование WASM напрямую в AudioWorklet
            }
        });

        this.processorNode.port.onmessage = (event) => {
            if (event.data.type === 'cwtData' && this.onCwtData) {
                this.onCwtData(event.data.cwtMatrix);
            }
        };
    }

    connect(sourceNode) {
        if (!this.processorNode) throw new Error("WaveletAnalyzer не инициализирован.");
        sourceNode.connect(this.processorNode);
        this.processorNode.connect(this.audioContext.destination); // Или другой узел, если нужно слышать аудио
    }

    disconnect() {
        if (this.processorNode) {
            this.processorNode.disconnect();
        }
    }

    // Метод для передачи WASM модуля в AudioWorklet, если он не загружается там напрямую
    // setWasmModule(moduleInstance) { ... }
}

// wavelet-processor-worklet.js (AudioWorkletProcessor)
class WaveletProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.bufferSize = options.processorOptions.bufferSize;
        this.numScales = options.processorOptions.numScales;
        this.sampleRate = options.processorOptions.sampleRate;

        // Здесь будет экземпляр C++ FastCWTProcessor, созданный через WASM
        // this.cwtProcessor = new SomeWasmWrapper(this.wasmModuleInstance, this.bufferSize, ...);
        this.cwtProcessorPtr = null; // Указатель на C++ объект в WASM памяти
        this.wasmMemory = null;      // WebAssembly.Memory, если нужно напрямую читать/писать

        this.inputBuffer = new Float32Array(this.bufferSize);
        this.bufferWritePos = 0;

        // Инициализация WASM (может быть передана через postMessage от основного потока)
        this.port.onmessage = (event) => {
            if (event.data.type === 'loadWasm') {
                WebAssembly.instantiate(event.data.wasmBytes).then(wasm => {
                    this.wasmModule = wasm.instance.exports;
                    this.cwtProcessorPtr = this.wasmModule.create_processor(this.bufferSize, this.numScales, this.sampleRate);
                    // Выделение памяти в WASM для входного буфера и получение указателя
                    this.wasmInputBufferPtr = this.wasmModule.allocate_input_buffer(this.bufferSize);
                    this.wasmOutputBufferPtr = this.wasmModule.allocate_output_buffer(this.bufferSize * this.numScales); // Примерный размер
                    this.wasmMemory = this.wasmModule.memory;
                });
            }
        };
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (input.length === 0 || !this.cwtProcessorPtr) {
            return true;
        }

        // Копируем данные в буфер для WASM
        // Предполагаем, что process вызывается с блоками по 128 семплов
        const channelData = input[0]; // Берем первый канал
        for (let i = 0; i < channelData.length; i++) {
            this.inputBuffer[this.bufferWritePos++] = channelData[i];
            if (this.bufferWritePos === this.bufferSize) {
                // Заполняем WASM память
                const wasmInputArray = new Float32Array(this.wasmMemory.buffer, this.wasmInputBufferPtr, this.bufferSize);
                wasmInputArray.set(this.inputBuffer);

                // Вызов CWT обработки в WASM
                this.wasmModule.process_audio(this.cwtProcessorPtr, this.wasmInputBufferPtr, this.bufferSize);

                // Получение результата из WASM памяти
                const cwtMatrix = new Float32Array(this.wasmMemory.buffer, this.wasmOutputBufferPtr, this.bufferSize * this.numScales);

                // Отправка данных в основной поток
                this.port.postMessage({ type: 'cwtData', cwtMatrix: Array.from(cwtMatrix) }); // Копируем, чтобы избежать проблем с передачей ArrayBuffer
                this.bufferWritePos = 0;
            }
        }
        return true;
    }
}
registerProcessor('wavelet-processor', WaveletProcessor);
```

## 4. Визуализация с Three.js

Визуализация будет представлять собой 3D голограмму, реагирующую на CWT-спектрограмму.

### 4.1. `HologramRenderer.js`

Этот класс инкапсулирует логику рендеринга.

```javascript
import * as THREE from 'three';

class HologramRenderer {
    constructor(canvasElement, initialWidth, initialHeight) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, initialWidth / initialHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ canvas: canvasElement, antialias: true, alpha: true });
        this.renderer.setSize(initialWidth, initialHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        this.numBars = 64; // Количество полос в визуализации (соответствует numScales в CWT)
        this.barGeometry = new THREE.BoxGeometry(0.5, 1, 0.5); // Базовая геометрия для полосы
        this.barMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ffff,
            emissive: 0x00ffff,
            emissiveIntensity: 0.5,
            metalness: 0.8,
            roughness: 0.4,
        });

        // Оптимизация с InstancedMesh
        this.instancedBars = new THREE.InstancedMesh(this.barGeometry, this.barMaterial, this.numBars);
        this.scene.add(this.instancedBars);

        this.dummy = new THREE.Object3D(); // Для установки трансформаций экземпляров

        this._setupScene();
        this._animate();
    }

    _setupScene() {
        this.camera.position.set(0, 10, 20);
        this.camera.lookAt(0, 0, 0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7.5);
        this.scene.add(directionalLight);

        // Инициализация положений и масштабов полос
        for (let i = 0; i < this.numBars; i++) {
            this.dummy.position.set(
                (i - this.numBars / 2) * 0.7, // Распределяем по X
                0,
                0
            );
            this.dummy.scale.set(1, 0.1, 1); // Начальная высота очень маленькая
            this.dummy.updateMatrix();
            this.instancedBars.setMatrixAt(i, this.dummy.matrix);
        }
        this.instancedBars.instanceMatrix.needsUpdate = true;
    }

    updateVisualization(cwtData) {
        // cwtData - это массив амплитуд (или усредненных значений) для каждого частотного бина
        if (!cwtData || cwtData.length === 0) return;

        const dataLength = Math.min(cwtData.length, this.numBars);

        for (let i = 0; i < dataLength; i++) {
            const value = Math.max(0.05, cwtData[i]); // Нормализованное значение от 0 до 1, минимальная высота

            this.instancedBars.getMatrixAt(i, this.dummy.matrix);
            const position = new THREE.Vector3();
            const quaternion = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            this.dummy.matrix.decompose(position, quaternion, scale);

            // Анимация высоты
            scale.y += (value * 10 - scale.y) * 0.1; // Плавная анимация высоты, максимальная высота 10

            this.dummy.scale.set(scale.x, Math.max(0.05, scale.y), scale.z); // Устанавливаем новую высоту
            this.dummy.position.set(position.x, scale.y / 2, position.z); // Корректируем позицию Y, чтобы основание оставалось на месте

            this.dummy.updateMatrix();
            this.instancedBars.setMatrixAt(i, this.dummy.matrix);
        }
        this.instancedBars.instanceMatrix.needsUpdate = true;

        // Динамическое изменение цвета на основе общей громкости (пример)
        const overallIntensity = cwtData.reduce((sum, val) => sum + val, 0) / cwtData.length;
        const hue = THREE.MathUtils.mapLinear(overallIntensity, 0, 0.5, 0.55, 0.85); // от голубого к фиолетовому
        this.barMaterial.emissive.setHSL(hue, 0.8, 0.5);
        this.barMaterial.color.setHSL(hue, 0.8, 0.5);

    }

    _animate() {
        requestAnimationFrame(this._animate.bind(this));
        // Здесь могут быть другие анимации, например, вращение камеры
        this.renderer.render(this.scene, this.camera);
    }

    onResize(newWidth, newHeight) {
        this.camera.aspect = newWidth / newHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(newWidth, newHeight);
    }

    // Методы для управления через жесты
    changeColor(colorHex) {
        this.barMaterial.color.set(colorHex);
        this.barMaterial.emissive.set(colorHex);
    }

    changeCameraPosition(x, y, z) {
        this.camera.position.set(x,y,z);
        this.camera.lookAt(0,0,0);
    }
}
```

### 4.2. Оптимизированный Рендеринг
*   **`InstancedMesh`:** Для эффективного рендеринга большого количества однотипных объектов (полос эквалайзера) используется `THREE.InstancedMesh`. Это значительно снижает количество вызовов отрисовки.
*   **Пользовательские Шейдеры (Потенциально):** Для более сложных визуальных эффектов (например, волновые узоры на поверхности голограммы, эффекты частиц) могут быть разработаны пользовательские вершинные и фрагментные шейдеры.

### 4.3. Обновление Визуализации
Метод `updateVisualization(cwtData)` класса `HologramRenderer` будет вызываться каждый раз, когда `WaveletAnalyzer` предоставляет новые данные CWT. Этот метод будет обновлять трансформации (масштаб, положение) экземпляров `InstancedMesh`.

## 5. Управление Жестами

Управление параметрами визуализации (например, цвет, форма, чувствительность) будет осуществляться с помощью жестов рук.

### 5.1. Библиотека
Используется `fingerpose` совместно с `MediaPipe Hands` для отслеживания ключевых точек кисти руки и пальцев через веб-камеру.

### 5.2. `GestureController.js`
Этот класс будет отвечать за инициализацию `fingerpose`, определение жестов и вызов соответствующих действий в `HologramRenderer`.

```javascript
import * as fp from 'fingerpose';
import * as Gestures from 'fingerpose/src/gestures'; // Стандартные жесты
// import { GestureEstimator, GestureDescription, Finger, FingerCurl } from 'fingerpose'; // Для создания кастомных жестов

class GestureController {
    constructor(videoElement, hologramRenderer) {
        this.videoElement = videoElement;
        this.hologramRenderer = hologramRenderer;
        this.gestureEstimator = null;
        this.handposeModel = null; // MediaPipe Hands model

        this._init();
    }

    async _init() {
        // Загрузка MediaPipe Hands (если используется напрямую, а не через обертку fingerpose)
        // this.handposeModel = await handpose.load(); // Пример для TensorFlow.js handpose
        // Для MediaPipe Hands через CDN:
        // const hands = new Hands({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`});
        // hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });
        // hands.onResults(this._onResults.bind(this));
        // this.handposeModel = hands;

        // Настройка fingerpose
        const knownGestures = [
            Gestures.VictoryGesture, // "V" / "Мир"
            Gestures.ThumbsUpGesture, // Большой палец вверх
            // Можно добавить кастомные жесты
            // new GestureDescription('closed_fist').addCurl(Finger.Thumb, FingerCurl.FullCurl, 1.0)
            //                                      .addCurl(Finger.Index, FingerCurl.FullCurl, 1.0)
            //                                      // ... и т.д. для всех пальцев
        ];
        this.gestureEstimator = new fp.GestureEstimator(knownGestures);

        // Запуск обработки видео
        if (this.videoElement.readyState >= HTMLMediaElement.HAVE_METADATA) {
            this._startDetection();
        } else {
            this.videoElement.onloadedmetadata = this._startDetection.bind(this);
        }
    }

    async _startDetection() {
        // Предполагается, что MediaPipe Hands уже настроена и вызывает _onResults
        // Либо, если fingerpose используется с tfjs/handpose:
        // const estimateHands = async () => {
        //    const predictions = await this.handposeModel.estimateHands(this.videoElement, { flipHorizontal: true });
        //    if (predictions.length > 0) {
        //        const estimatedGestures = this.gestureEstimator.estimate(predictions[0].landmarks, 8.5); // Оценка жестов
        //        if (estimatedGestures.gestures && estimatedGestures.gestures.length > 0) {
        //            this._handleGesture(estimatedGestures.gestures[0]);
        //        }
        //    }
        //    requestAnimationFrame(estimateHands);
        // };
        // estimateHands();
        console.log("Gesture detection setup. Waiting for MediaPipe Hands results.");
    }

    // Этот метод вызывается из MediaPipe Hands
    _onResults(results) {
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0]; // Берем первую обнаруженную руку
            const estimatedGestures = this.gestureEstimator.estimate(landmarks, 8.5); // Чувствительность 8.5

            if (estimatedGestures.gestures && estimatedGestures.gestures.length > 0) {
                const topGesture = estimatedGestures.gestures.sort((a, b) => b.score - a.score)[0];
                this._handleGesture(topGesture);
            }
        }
    }


    _handleGesture(gesture) {
        console.log("Detected gesture:", gesture.name, "with score", gesture.score);
        switch (gesture.name) {
            case 'victory': // "V"
                this.hologramRenderer.changeColor(0x00ff00); // Зеленый
                console.log("Gesture: Victory -> Change color to green");
                break;
            case 'thumbs_up': // Большой палец вверх
                this.hologramRenderer.changeColor(0xff0000); // Красный
                console.log("Gesture: Thumbs Up -> Change color to red");
                break;
            // Добавить другие жесты и соответствующие действия
            // case 'closed_fist':
            //    this.hologramRenderer.changeCameraPosition(0, 5, 25); // Пример изменения камеры
            //    break;
        }
    }

    // Метод для передачи результатов MediaPipe Hands в GestureController из основного приложения
    processFrame(handLandmarks) {
        if (handLandmarks && handLandmarks.length > 0) {
            // handLandmarks должен быть в формате, ожидаемом fingerpose
            // (массив из 21 точки [x,y,z])
            const estimatedGestures = this.gestureEstimator.estimate(handLandmarks, 8.5);
            if (estimatedGestures.gestures && estimatedGestures.gestures.length > 0) {
                 const topGesture = estimatedGestures.gestures.sort((a, b) => b.score - a.score)[0];
                this._handleGesture(topGesture);
            }
        }
    }
}
```

### 5.3. Поддерживаемые Жесты (Примеры)
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
*   **WebAssembly для CWT:** Критично для производительности анализа аудио.
*   **AudioWorklet:** Выполнение анализа аудио в отдельном потоке, не блокируя основной поток UI.
*   **`THREE.InstancedMesh`:** Снижение нагрузки на CPU/GPU при рендеринге множества объектов.
*   **Оптимизация Шейдеров:** Если используются кастомные шейдеры, они должны быть тщательно оптимизированы.
*   **Управление Частотой Обновлений:** CWT-данные могут обновляться реже, чем каждый кадр рендеринга, с интерполяцией для плавности.
*   **Ленивая Загрузка:** Модули WASM и модели для распознавания жестов загружаются асинхронно.

## 7. План Реализации

### Фаза 1: Базовый Анализ и Визуализация
1.  **Реализация `FastCWTProcessor` на C++:** Разработка и тестирование алгоритма CWT.
2.  **Компиляция в WASM:** Настройка Emscripten (или аналогичного) для сборки WASM-модуля.
3.  **Интеграция WASM с `AudioWorklet`:** Создание `WaveletAnalyzer` и `WaveletProcessor` для обработки аудио в реальном времени.
4.  **Базовая Визуализация с `HologramRenderer`:** Рендеринг простых полос на основе данных от `WaveletAnalyzer`. Использование `InstancedMesh`.

### Фаза 2: Улучшенная Визуализация и Эффекты
1.  **Разработка Продвинутых Шейдеров:** Создание более сложных визуальных эффектов (например, свечение, частицы, динамические текстуры).
2.  **Настройка Параметров Вейвлета:** Подбор оптимальных параметров вейвлета Морле для лучшего визуального отклика.
3.  **Оптимизация Рендеринга:** Профилирование и оптимизация узких мест в Three.js.

### Фаза 3: Управление Жестами
1.  **Настройка `fingerpose`:** Интеграция с MediaPipe Hands (или другой библиотекой для отслеживания рук).
2.  **Определение Кастомных Жестов:** Создание набора жестов для управления визуализацией.
3.  **Реализация `GestureController`:** Связывание распознанных жестов с действиями в `HologramRenderer`.

### Фаза 4: Тестирование и Полировка
1.  **Тестирование Производительности:** На различных устройствах и браузерах.
2.  **Пользовательское Тестирование:** Сбор обратной связи по удобству управления жестами и качеству визуализации.
3.  **Исправление Ошибок и Оптимизация.**

## 8. Заключение

Предложенная архитектура позволяет создать высокопроизводительную и интерактивную систему визуализации аудио "CyberVoice". Использование WebAssembly для CWT-анализа и оптимизированного рендеринга с Three.js обеспечит плавную работу в реальном времени, а управление жестами добавит уникальный способ взаимодействия с приложением.
```
