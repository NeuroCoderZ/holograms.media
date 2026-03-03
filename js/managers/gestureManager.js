// js/managers/GestureManager.js
import { SmartHologram } from '../SmartHologram.js';
import { state } from '../core/init.js';
import { CloudGestureStorage } from '../services/CloudGestureStorage.js';
import { gestureSynthesizer } from '../audio/GestureSynthesizer.js';
import netHoloGlyphClient from '../services/netHoloGlyphClient.js';
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

            // Загружаем жестовые коды из облака (безопасно)
            try {
                await this.loadGestureCodesFromCloud();
            } catch (loadError) {
                console.warn('[GestureManager] Не удалось загрузить жесты из облака, продолжаем работу:', loadError.message);
            }

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
     * Main State Machine Update Loop for Gesture Mixer
     * @param {Array} multiLandmarks - MediaPipe multi-hand landmarks
     * @param {Array} multiHandedness - MediaPipe handedness info
     */
    processHandLandmarks(multiLandmarks, multiHandedness) {
        if (!multiLandmarks || multiLandmarks.length === 0) {
            this.state = 'IDLE';
            state.multimodal.gestureModulationData = { left: null, right: null };
            return;
        }

        const modulation = { left: null, right: null };

        multiLandmarks.forEach((landmarks, index) => {
            const handedness = multiHandedness[index]?.label; // "Left" or "Right"
            const wrist = landmarks[0];
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const palmCenter = landmarks[9]; // Middle MCP as requested

            // --- NORMALIZE COORDINATES ---

            // 1. Frequency (Y): 0..1 (Top to Bottom?) 
            // In MediaPipe Y: 0 is top, 1 is bottom. 
            // We want 0 (Bas) at bottom, 127 (Treble) at top.
            const freqY = 1.0 - palmCenter.y; // Invert: Bottom 0, Top 1
            const frequency = Math.max(0, Math.min(127, freqY * 127));

            // 2. Pan (X): -1..1
            // MediaPipe X: 0 is left, 1 is right (mirrored).
            const pan = (palmCenter.x * 2) - 1;

            // 3. Gain (Z): 0..1 (Inverted Depth: Close to camera = 0, Far = 1)
            // MediaPipe Z: closer to camera is more negative. 
            // Let's assume a range: -0.2 (close) to 0.0 (far)
            // Or better: map Z relative to calibrated mid.
            const rawZ = palmCenter.z;
            const gain = Math.max(0, Math.min(1, (rawZ + 0.1) / 0.2));

            // 4. Bandwidth (Spread): Thumb to Index Tip
            const spread = Math.sqrt(
                Math.pow(thumbTip.x - indexTip.x, 2) +
                Math.pow(thumbTip.y - indexTip.y, 2)
            );
            const bandwidth = Math.max(1, spread * 50); // Scale to ~1-10 semitones range

            const handData = {
                frequency,
                pan,
                gain,
                bandwidth,
                active: true
            };

            if (handedness === 'Left') modulation.left = handData;
            if (handedness === 'Right') modulation.right = handData;
        });

        state.multimodal.gestureModulationData = modulation;
        this.state = 'ACTIVE';

        // Update GestureSynthesizer if active
        if (state.audio?.isGestureSynthMode) {
            gestureSynthesizer.update(modulation);
        }

        // Send gesture frame via NetHoloGlyph for network sync
        netHoloGlyphClient.sendQuantum({
            type: 'gesture_frame',
            timestamp: Date.now(),
            hands: modulation
        });

        // Feedback in console for debugging (throttle)
        if (Date.now() % 30 === 0) {
            // console.log(`[GestureMixer] L: ${modulation.left?.frequency.toFixed(0)} R: ${modulation.right?.frequency.toFixed(0)}`);
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
        // Если пользователь авторизован
        if (state && state.user && state.user.email) {
            return state.user.email;
        }
        // Fallback на анонимную сессию, но персистентную!
        let anonId = localStorage.getItem('anonUserId');
        if (!anonId) {
            anonId = 'anon_' + Date.now();
            localStorage.setItem('anonUserId', anonId);
        }
        return anonId;
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
