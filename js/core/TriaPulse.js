/**
 * TriaPulse.js — Движок тактов и биоритмов (v0.20.125)
 * Реализует динамическую частоту обновления, синхронизированную с дисплеем и AudioService.
 */
import eventBus from './eventBus.js';
import audioService from '../services/AudioService.js';

export class TriaPulse {
    constructor() {
        this.tickValue = 0;
        this.takt = 0; // 0 = Прогноз, 1 = Реальность
        this.startTime = performance.now();
        
        // Частота обновления (Temporal Res): Динамическая (равна FPS дисплея)
        this.displayRate = 60; // По умолчанию
        this.basilaqColumnsPerSecond = 60;
        
        this._isRunning = false;
        this._rafId = null;
    }

    /**
     * Инициализация пульса с детекцией частоты дисплея
     */
    async init() {
        this.displayRate = await this._detectDisplayRate();
        this.basilaqColumnsPerSecond = this.displayRate;
        
        // Синхронизируем с AudioService, если он уже определил FPS
        if (audioService.targetFps) {
            this.displayRate = audioService.targetFps;
            this.basilaqColumnsPerSecond = this.displayRate;
        }

        console.log(`[TriaPulse] Heartbeat initialized at ${this.displayRate} Hz`);
        this.start();
    }

    async _detectDisplayRate() {
        return new Promise(resolve => {
            let frames = 0;
            const start = performance.now();
            const count = () => {
                if (++frames < 60) return requestAnimationFrame(count);
                const elapsed = performance.now() - start;
                resolve(Math.round(frames * 1000 / elapsed));
            };
            requestAnimationFrame(count);
        });
    }

    start() {
        if (this._isRunning) return;
        this._isRunning = true;
        this._loop();
        
        // Дополнительная синхронизация со спектральными данными
        eventBus.on('audio:spectralData', () => {
            // Аудио-тик может приходить чаще или реже, 
            // но мы используем его как подтверждение Такта 1 (Реальность)
            this._beat(true);
        });
    }

    _loop() {
        if (!this._isRunning) return;
        
        this._beat(false);
        this._rafId = requestAnimationFrame(() => this._loop());
    }

    _beat(isAudioSync = false) {
        this.tickValue++;
        
        // Переключение между Тактом 0 (прогноз) и Тактом 1 (сравнение)
        // 120 Гц логика была в том, что на 60fps кадр мы имеем 2 такта.
        // При динамическом FPS мы просто чередуем их.
        this.takt = this.tickValue % 2;

        eventBus.emit('tria:pulse', {
            tick: this.tickValue,
            takt: this.takt,
            phase: this.currentPhase(),
            isAudioSync,
            fps: this.displayRate
        });
    }

    currentTick() {
        return this.tickValue;
    }

    currentTakt() {
        return this.takt;
    }

    /**
     * Возвращает текущую фазу биоритма [0–2π]
     */
    currentPhase() {
        const cycleDuration = 1000; // 1 секунда на цикл
        const elapsed = performance.now() - this.startTime;
        const normalized = (elapsed % cycleDuration) / cycleDuration;
        return normalized * 2 * Math.PI;
    }

    stop() {
        this._isRunning = false;
        if (this._rafId) cancelAnimationFrame(this._rafId);
    }
}

export const triaPulse = new TriaPulse();
