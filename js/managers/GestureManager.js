// js/managers/GestureManager.js
import { SmartHologram } from '../SmartHologram.js';
import { state } from '../core/init.js';
import { CloudGestureStorage } from '../services/CloudGestureStorage.js';
export class GestureManager {
    constructor() {
        this.smartHologram = null;
        this.eventListeners = new Map();
        this.isInitialized = false;

        // STATE MACHINE
        this.state = 'IDLE'; // IDLE, HOVER, GRAB
        this.grabbedIndex = -1; // Index of grabbed frequency
        this.pinchThreshold = 0.05; // ~5cm normalized

        // Physics
        this.volume = 0;
        this.pan = 0;

        // ... existing props ...
        this.gestureCodes = new Map();
        this.activeTrajectories = new Map();
        this.gestureBuffer = [];
        this.codeInterpreter = new GestureCodeInterpreter();
        this.customGestures = new Map();
        this.loadFromLocalStorage();
        this.learningMode = false;
        this.currentRecording = null;
        this.cloudStorage = new CloudGestureStorage();
    }

    async init(container) {
        console.log('Инициализация GestureManager...');

        try {
            // Создаем SmartHologram для работы с существующими голограммами
            // Check if SmartHologram is imported. It is imported at the top of the file (line 2).
            this.smartHologram = new SmartHologram(container, this, state.aiEngine, state.renderer);
            await this.smartHologram.init();

            // Настраиваем слушателей событий
            this.setupEventListeners();

            // Загружаем жестовые коды из облака
            await this.loadGestureCodesFromCloud();

            this.isInitialized = true;
            console.log('GestureManager инициализирован успешно');

        } catch (error) {
            console.error('Ошибка инициализации GestureManager:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Listening to High-Frequency Hand Events via EventBus (from handsTracking.js or similar)
        // Usually handsTracking emits 'handsDetected' but we need the DATA stream.
        // Assuming handsTracking calls a method here or we intercept the loop.
        // handsTracking.js calls: state.gestureIntentClassifier.predict(handLandmarks)
        // We should hook into `handleHandFrame(landmarks)` if we expose it, or listen to an event.
        // Currently handsTracking doesn't emit data-stream via eventBus efficiently.
        // We will assume `handsTracking.js` has been updated or we will patch it to call `gestureManager.update(landmarks)`.
        // Or we can rely on `state.multimodal.lastHandData` if we run a loop.

        // For this task, I will add an update loop or assume handsTracking calls `processHandLandmarks`.
    }

    /**
     * Main State Machine Update Loop
     * Called by handsTracking.js or internal loop with new landmarks
     * @param {Array} landmarks - MediaPipe landmarks
     */
    processHandLandmarks(landmarks) {
        if (!landmarks) {
            this.state = 'IDLE';
            return;
        }

        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];
        const wrist = landmarks[0];

        // 1. Calculate Pinch Distance (Euclidean)
        const distance = Math.sqrt(
            Math.pow(thumbTip.x - indexTip.x, 2) +
            Math.pow(thumbTip.y - indexTip.y, 2) +
            Math.pow(thumbTip.z - indexTip.z, 2)
        );

        // 2. Determine State
        if (distance < this.pinchThreshold) {
            if (this.state !== 'GRAB') {
                // Transition to GRAB
                this.state = 'GRAB';
                // Lock frequency based on Index Finger X position
                // X is 0..1 (flipped? Check mirror). usually 0 is left.
                this.grabbedIndex = Math.floor(indexTip.x * 127);
                this.grabbedIndex = Math.max(0, Math.min(127, this.grabbedIndex));
                console.log(`[Gesture] GRABBED Frequency Index: ${this.grabbedIndex}`);

                // Visual Feedback: Lock Highlight
                // eventBus.emit('hologramLockColumn', this.grabbedIndex);
            }
        } else {
            this.state = 'HOVER';
            this.grabbedIndex = -1;
        }

        // 3. Act based on State
        if (this.state === 'HOVER') {
            // HOVER Logic: Preview
            const hoverIndex = Math.floor(indexTip.x * 127);
            // Flicker / Preview Low Volume
            // We can emit audio preview event
            // eventBus.emit('audioPreview', { index: hoverIndex, volume: 0.2 });
        }
        else if (this.state === 'GRAB') {
            // CONTROL Logic: Physics
            // Calculate Volume from Z (String Tension)
            // Z in MediaPipe: 0 is camera, negative is towards screen? 
            // Actually Z is relative to specific point. 
            // Let's use Wrist Z or average Z. 
            // Usually Z is around 0. 
            // Let's assume Z range -0.2 (close) to 0.2 (far).
            // Formula: Volume = map(z, -0.1, 0.1, 0, 1) inverted? 
            // User request: "Close to camera = Silence (0). Far (to self) = Loud (1.0)."
            // In MP, negative Z is closer to camera? No, usually Z is depth.
            // Let's assume normalized input or calibrate.
            // Typical MP Z: 0 at wrist... it's tricky.
            // Let's stick to the prompt formula assumption: 
            // "Volume = clamp((DepthZ - MinZ) / (MaxZ - MinZ), 0, 1)"

            // For now, simple mapping:
            // Assuming Z varies from -0.1 (very close) to 0.1 (farther). Or 0 to -0.2?
            // Let's rely on Relative Movement or basic clamping.

            const rawZ = Math.abs(wrist.z); // Simple depth proxy
            // Heuristic: 0.02 (Close) -> 0.15 (Far)
            let vol = (rawZ - 0.02) / (0.15 - 0.02);
            vol = Math.max(0, Math.min(1, vol));
            this.volume = vol;

            // Pan X
            this.pan = (wrist.x * 2) - 1; // 0..1 -> -1..1

            // Execute Feedback
            // 1. Audio
            import('../multimodal/hologramScanner.js').then(module => {
                if (module.hologramScanner.synthesizer) {
                    module.hologramScanner.synthesizer.previewFrequency(this.grabbedIndex, this.volume);
                }
            });

            // 2. Visual (TODO: Pass pan/vol to renderer)
            console.log(`[Gesture] CONTROL: Vol ${this.volume.toFixed(2)} | Pan ${this.pan.toFixed(2)}`);
        }
    }

    /**
     * Обработка траекторий пальцев и генерация жестового кода
     */
    processFingerTrajectories(handLandmarks, intent) {
        const trajectories = this.extractFingerTrajectories(handLandmarks);
        const gestureCode = this.generateGestureCode(trajectories, intent);

        // Добавляем в буфер для анализа последовательностей
        this.gestureBuffer.push({
            code: gestureCode,
            trajectories: trajectories,
            timestamp: Date.now()
        });

        // Ограничиваем размер буфера
        if (this.gestureBuffer.length > 50) {
            this.gestureBuffer.shift();
        }

        return gestureCode;
    }

    /**
     * Извлечение траекторий пальцев из landmarks
     */
    extractFingerTrajectories(handLandmarks) {
        const trajectories = {};

        // Определяем ключевые точки пальцев (MediaPipe hand landmarks)
        const fingerTips = {
            thumb: 4,
            index: 8,
            middle: 12,
            ring: 16,
            pinky: 20
        };

        for (const [finger, index] of Object.entries(fingerTips)) {
            if (handLandmarks[index]) {
                const point = handLandmarks[index];
                trajectories[finger] = {
                    x: point.x,
                    y: point.y,
                    z: point.z,
                    timestamp: Date.now()
                };
            }
        }

        return trajectories;
    }

    /**
     * Генерация жестового кода из траекторий
     */
    generateGestureCode(trajectories, intent) {
        let code = '';

        // Анализируем относительные позиции пальцев
        const fingers = Object.keys(trajectories);
        for (let i = 0; i < fingers.length - 1; i++) {
            for (let j = i + 1; j < fingers.length; j++) {
                const finger1 = trajectories[fingers[i]];
                const finger2 = trajectories[fingers[j]];

                if (finger1 && finger2) {
                    const distance = this.calculateDistance(finger1, finger2);
                    const angle = this.calculateAngle(finger1, finger2);

                    // Преобразуем в символьный код
                    code += this.distanceToSymbol(distance);
                    code += this.angleToSymbol(angle);
                }
            }
        }

        // Добавляем информацию о намерении
        if (intent && intent.action) {
            code += `_${intent.action}`;
        }

        return code;
    }

    /**
     * Преобразование расстояния в символ
     */
    distanceToSymbol(distance) {
        if (distance < 0.1) return 'C'; // Close
        if (distance < 0.2) return 'N'; // Near
        if (distance < 0.3) return 'M'; // Medium
        return 'F'; // Far
    }

    /**
     * Преобразование угла в символ
     */
    angleToSymbol(angle) {
        const normalizedAngle = (angle + Math.PI) / (2 * Math.PI); // 0-1
        const symbols = 'ABCDEFGHIJ';
        return symbols[Math.floor(normalizedAngle * symbols.length)];
    }

    /**
     * Расчет расстояния между точками
     */
    calculateDistance(point1, point2) {
        return Math.sqrt(
            Math.pow(point1.x - point2.x, 2) +
            Math.pow(point1.y - point2.y, 2) +
            Math.pow(point1.z - point2.z, 2)
        );
    }

    /**
     * Расчет угла между точками
     */
    calculateAngle(point1, point2) {
        return Math.atan2(point2.y - point1.y, point2.x - point1.x);
    }

    /**
     * Применение жеста к активной голограмме
     */
    applyGestureToHologram(programEvents, handLandmarks) {
        if (!this.smartHologram) return;

        // Вшиваем траектории в голограмму
        this.smartHologram.embedTrajectories(handLandmarks, programEvents);

        // Применяем программные события к параметрам голограммы
        for (const event of programEvents) {
            this.applyProgramEvent(event);
        }
    }

    /**
     * Применение программного события к параметрам голограммы
     */
    applyProgramEvent(event) {
        if (!this.smartHologram) return;

        switch (event.type) {
            case 'AXIS_ROTATION':
                this.smartHologram.modifyAxisRotation(event.value);
                break;
            case 'SCALE_MODIFICATION':
                this.smartHologram.modifyScale(event.value);
                break;
            case 'COLOR_SHIFT':
                this.smartHologram.modifyColor(event.value);
                break;
            case 'AUDIO_FREQUENCY':
                this.smartHologram.modifyAudioFrequency(event.value);
                break;
            case 'VISUAL_INTENSITY':
                this.smartHologram.modifyVisualIntensity(event.value);
                break;
        }
    }

    /**
     * Сохранение пользовательского жеста в облако
     */
    async saveCustomGesture(name, trajectories, gestureCode) {
        const gestureData = {
            name: name,
            trajectories: trajectories,
            code: gestureCode,
            timestamp: Date.now(),
            userId: this.getCurrentUserId()
        };

        this.customGestures.set(name, gestureData);
        // Сохраняем локально в localStorage
        this.saveToLocalStorage();


        // Сохраняем в облако
        await this.cloudStorage.saveGesture(gestureData);

        console.log(`Пользовательский жест "${name}" сохранен локально`);
    }

    /**
     * Загрузка жестовых кодов из облака
     */
    async loadGestureCodesFromCloud() {
        try {
            const gestures = await this.cloudStorage.loadUserGestures(this.getCurrentUserId());

            for (const gesture of gestures) {
                this.customGestures.set(gesture.name, gesture);
                this.gestureCodes.set(gesture.code, gesture);
            }

            console.log(`Загружено ${gestures.length} жестов из облака`);
        } catch (error) {
            console.error('Ошибка загрузки жестов из облака:', error);
        }
    }

    /**
     * Получение ID текущего пользователя
     */
    getCurrentUserId() {
        // В реальном приложении это будет получено из системы аутентификации
        return 'user_' + Date.now();
    }

    /**
     * Добавление слушателя событий
     */

    addEventListener(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, []);
        }
        this.eventListeners.get(eventType).push(callback);
    }

    /**
     * Генерация события
     */
    emit(eventType, data) {
        const listeners = this.eventListeners.get(eventType);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback({ type: eventType, detail: data });
                } catch (error) {
                    console.error(`Ошибка в обработчике события ${eventType}:`, error);
                }
            });
        }
    }

    /**
     * Получение экземпляра SmartHologram
     */
    getSmartHologram() {
        return this.smartHologram;
    }

    /**
     * Получение списка доступных жестов
     */
    getAvailableGestures() {
        return {
            standard: ['open_hand', 'fist', 'point', 'peace', 'thumb_up', 'thumb_down'],
            custom: Array.from(this.customGestures.keys()),
            codes: Array.from(this.gestureCodes.keys())
        };
    }

    /**
     * Уничтожение GestureManager
     */
    /**
     * Сохранить жесты в localStorage
     */
    saveToLocalStorage() {
        try {
            const gesturesArray = Array.from(this.customGestures.entries());
            localStorage.setItem('holograms_gestures', JSON.stringify(gesturesArray));
        } catch (error) {
            console.warn('Ошибка сохранения жестов в localStorage:', error);
        }
    }

    /**
     * Загрузить жесты из localStorage
     */
    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem('holograms_gestures');
            if (stored) {
                const gesturesArray = JSON.parse(stored);
                this.customGestures = new Map(gesturesArray);
                console.log(`Загружено ${this.customGestures.size} жестов из localStorage`);
            }
        } catch (error) {
            console.warn('Ошибка загрузки жестов из localStorage:', error);
        }
    }

    /**
     * Освобождение ресурсов
     */
    dispose() {
        if (this.smartHologram) {
            this.smartHologram.dispose();
            this.smartHologram = null;
        }

        this.eventListeners.clear();
        this.customGestures.clear();
        this.gestureCodes.clear();
        this.activeTrajectories.clear();
        this.gestureBuffer = [];
        this.isInitialized = false;

        console.log('GestureManager уничтожен');
    }
}

/**
 * Интерпретатор жестового кода
 */
class GestureCodeInterpreter {
    constructor() {
        this.codeMappings = new Map([
            ['CC', { type: 'AXIS_ROTATION', value: 0.1 }],
            ['NN', { type: 'SCALE_MODIFICATION', value: 1.05 }],
            ['MM', { type: 'COLOR_SHIFT', value: 0.02 }],
            ['FF', { type: 'AUDIO_FREQUENCY', value: 1.1 }],
            ['open_hand', { type: 'VISUAL_INTENSITY', value: 0.1 }],
            ['fist', { type: 'VISUAL_INTENSITY', value: -0.1 }]
        ]);
    }

    /**
     * Интерпретация жестового кода в программные события
     */
    interpret(gestureCode) {
        const events = [];
        const parts = gestureCode.split('_');

        // Обрабатываем символьную часть кода
        const symbolCode = parts[0];
        for (let i = 0; i < symbolCode.length; i += 2) {
            const pair = symbolCode.substr(i, 2);
            const mapping = this.codeMappings.get(pair);
            if (mapping) {
                events.push(mapping);
            }
        }

        // Обрабатываем именованную часть (intent)
        if (parts[1]) {
            const intentMapping = this.codeMappings.get(parts[1]);
            if (intentMapping) {
                events.push(intentMapping);
            }
        }

        return events;
    }
}

/**
 * Cloud Storage для жестов
 */

// Создаем глобальный экземпляр
export const gestureManager = new GestureManager();
