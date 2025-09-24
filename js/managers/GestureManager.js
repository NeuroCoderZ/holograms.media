// js/managers/GestureManager.js
import { SmartHologram } from '../SmartHologram.js';
import { state } from '../core/init.js';
import { CloudGestureStorage } from '../services/CloudGestureStorage.js';
export class GestureManager {
    constructor() {
        this.smartHologram = null;
        this.eventListeners = new Map();
        this.isInitialized = false;

        // Система жестового кода
        this.gestureCodes = new Map(); // name -> gesture code mapping
        this.activeTrajectories = new Map(); // finger -> trajectory data
        this.gestureBuffer = []; // буфер для анализа последовательностей
        this.codeInterpreter = new GestureCodeInterpreter();

        // Система обучения жестам
        this.customGestures = new Map(); // name -> gesture data
        this.learningMode = false;
        this.currentRecording = null;

        // Cloud storage для жестов
        this.cloudStorage = new CloudGestureStorage();
        this.loadFromLocalStorage();
    }

    /**
     * Инициализация GestureManager
     */
    async init(container) {
        console.log('Инициализация GestureManager...');

        try {
            // Создаем SmartHologram для работы с существующими голограммами
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

    /**
     * Настройка слушателей событий жестов
     */
    setupEventListeners() {
        // Слушаем события от GestureIntentClassifier
        if (state.gestureIntentClassifier) {
            const originalPredict = state.gestureIntentClassifier.predict.bind(state.gestureIntentClassifier);

            state.gestureIntentClassifier.predict = async (handLandmarks) => {
                const intent = await originalPredict(handLandmarks);

                if (intent && this.smartHologram) {
                    // Обрабатываем траектории пальцев
                    const gestureCode = this.processFingerTrajectories(handLandmarks, intent);

                    if (gestureCode) {
                        // Преобразуем жестовый код в программные события
                        const programEvents = this.codeInterpreter.interpret(gestureCode);

                        // Применяем события к активной голограмме
                        this.applyGestureToHologram(programEvents, handLandmarks);

                        this.emit('gestureCodeGenerated', {
                            code: gestureCode,
                            events: programEvents,
                            landmarks: handLandmarks,
                            timestamp: Date.now()
                        });
                    }
                }

                return intent;
            };
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
