/**
 * TriaFileSystem.js — Биологическая Виртуальная Файловая Система (v0.20.125)
 * Реализует структуру "Гипермозга", L/R симметрию и резонансный доступ.
 * Пространство памяти маппится на Тор BasilaQ-128.
 */
import { EmotionalMonitor } from './EmotionalMonitor.js';
import { HRRMath } from '../utils/HRRMath.js';
import eventBus from './eventBus.js';

export const ResonanceGate = {
    OPEN: "open",           // 🙂 Полный доступ
    THROTTLED: "throttled", // 🟡 Замедленный доступ
    BLOCKED: "blocked",     // ☹️ Доступ заблокирован
    INVOLUTION: "involution" // 💀 Инволюция — нод деградирует
};

export class TriaNode {
    constructor(path, contentType, holoHash, tick, bioPhase = 0) {
        this.path = path;
        this.contentType = contentType;
        this.holoHash = holoHash;
        this.tickCreated = tick;
        this.tickLastAccess = tick;
        this.bioPhase = bioPhase;

        this.excitationScore = 0.5;
        this.inhibitionLevel = 0.0;
        this.gate = ResonanceGate.OPEN;

        this.embedding = HRRMath.createRandomVector();
        this.data = null;

        // Физика Базилак-128: Координаты на торе
        this.torusCoords = {
            theta: 0, // Угол спектра (Y)
            phi: 0,   // Угол панорамы (X)
            r: 0      // Радиус = громкость (Z)
        };

        // Психоакустическая точность
        this.spatialPrecision = 0.5; // [0.0 - 1.0]
        this.widthCells = 64;        // Ширина полутона
    }
}

export class TriaFileSystem {
    constructor(pulse, dbClient) {
        this.pulse = pulse;
        this.db = dbClient;
        this.reintegrationManager = null;
        this._nodes = new Map();
        this._resonanceThreshold = 0.3;

        this.emotionalMonitor = new EmotionalMonitor(this, this.pulse);

        this._initStructure();
        this._setupListeners();
    }

    _initStructure() {
        /**
         * ИЕРАРХИЯ ГИПЕРМОЗГА (Схема 2016):
         * L/R Симметрия:
         * /brain/left/  (КРАСНЫЙ) -> Правая сторона тела/поля (Действие)
         * /brain/right/ (ФИОЛЕТОВЫЙ) -> Левая сторона тела/поля (Сенсорика)
         */
        const hemispheres = ['left', 'right'];
        const layers = [
            'cache0',       // Инстинкты (ДНК) - Базовые CWT/BasilaQ паттерны
            'cache1',       // Приобретенные инстинкты - Рефлексы на жесты
            'grey_matter',   // Краткосрочная память (RAM/Волатильно)
            'white_matter',  // Долгосрочная память (HoloChain/Astra DB)
            'cache2'        // Эффект сознания / Характер (Эмерджентный слой)
        ];

        hemispheres.forEach(h => {
            layers.forEach(l => {
                const path = `tria://brain/${h}/${l}`;
                this._nodes.set(path, new TriaNode(path, 'directory', 'genesis', 0));
            });
        });

        // Центральные узлы (Точка Рекогеренции)
        const central = [
            'heart/limbic',           // Эмоциональный контекст (EmotionalMonitor)
            'heart/pulse',            // Мозолистое тело (Синхронизация Тактов 0/1)
            'coherence/psi',          // Точка квантовой рекогеренции (Ψ-node)
            'programmer'              // Сознательное сравнение 0 vs 1
        ];

        central.forEach(p => {
            const path = `tria://brain/central/${p}`;
            this._nodes.set(path, new TriaNode(path, 'directory', 'genesis', 0));
        });

        // МОНТАЖНЫЙ СТОЛ (Gesture Edit Suite)
        const handsLayers = [
            'workspace/timeline',
            'workspace/cuts',
            'gesture_primitives',
            'compiled_programs'
        ];
        handsLayers.forEach(layer => {
            const path = `tria://brain/hands/${layer}`;
            this._nodes.set(path, new TriaNode(path, 'directory', 'genesis', 0));
        });
    }

    _setupListeners() {
        // Подписка на BasilaQ тики для автоматического наполнения /brain/right/audio
        eventBus.on('audio:spectralData', ({ levels, angles }) => {
            this.ingestBasilaQTick(levels, angles);
        });
    }

    /**
     * Поглощение тика BasilaQ-128
     * 1дБ = 1 ячейка = 1 фонон-нод
     */
    async ingestBasilaQTick(levels, angles) {
        const tick = this.pulse.currentTick();
        const phase = this.pulse.currentPhase();

        for (let i = 0; i < levels.length; i++) {
            const amplitudeDb = levels[i];
            if (amplitudeDb < -90) continue; // Порог тишины

            const path = `tria://brain/right/grey_matter/phonons/${i}_${tick}.phn`;
            const node = new TriaNode(path, '.phn', 'volatile', tick, phase);

            // Физика Тора и Ширины (Semitones_Angles.md)
            node.widthCells = 128 - i;
            node.spatialPrecision = i / 127;

            // Маппинг на Тор
            node.torusCoords = {
                theta: (i / 128) * 2 * Math.PI, // Угол частоты
                phi: (angles ? angles[i] : 0),  // Угол панорамы
                r: 128 + amplitudeDb            // Z-depth (1дБ = 1 ячейка)
            };

            node.excitationScore = (128 + amplitudeDb) / 128;
            this._nodes.set(path, node);
        }
    }

    /**
     * Резонансный резолв ноды
     */
    async resolve(path, contextVector = null) {
        const node = this._nodes.get(path);
        if (!node) return null;

        const takt = this.pulse.currentTakt();
        if (takt === 0) return node; // Такт 0: Предсказание (без торможения)

        // Такт 1: Сравнение (Резонанс)
        const currentPhase = this.pulse.currentPhase();
        const bioCompat = (1.0 + Math.cos(node.bioPhase - currentPhase)) / 2.0;

        let similarity = 0.5;
        if (contextVector && node.embedding) {
            similarity = HRRMath.cosineSimilarity(contextVector, node.embedding);
        }

        const resonance = (bioCompat * 0.4 + similarity * 0.4 + node.excitationScore * 0.2) - node.inhibitionLevel;

        // Обновление эмоций: высокочастотные ноды (precision) влияют сильнее
        const isNewPattern = (this.pulse.currentTick() - node.tickLastAccess) > (this.pulse.displayRate * 5);
        this.emotionalMonitor.update(resonance * (0.5 + node.spatialPrecision), isNewPattern);

        node.tickLastAccess = this.pulse.currentTick();

        if (resonance < this._resonanceThreshold) {
            node.gate = ResonanceGate.BLOCKED;
            await this._triggerInhibition(node);
            return null;
        }

        node.gate = ResonanceGate.OPEN;
        node.excitationScore = Math.min(1.0, node.excitationScore + 0.1);
        return node;
    }

    async _triggerInhibition(node) {
        node.inhibitionLevel = Math.min(1.0, node.inhibitionLevel + 0.05);
        if (node.inhibitionLevel > 0.7) {
            console.log(`[AZR] Slow learning triggered for ${node.path}`);
            // Здесь будет вызов бэкенда Astra DB / AZR
        }
        if (node.inhibitionLevel > 0.9 && this.reintegrationManager) {
            await this.reintegrationManager.scheduleFragment(node);
        }
    }

    setReintegrationManager(manager) {
        this.reintegrationManager = manager;
    }

    async writeNode(path, type, data, embedding = null) {
        const tick = this.pulse.currentTick();
        const phase = this.pulse.currentPhase();
        const node = new TriaNode(path, type, 'pending', tick, phase);
        node.data = data;
        if (embedding) node.embedding = embedding;
        this._nodes.set(path, node);
        return node;
    }
}
