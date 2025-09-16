// js/audio/audioAnalyzer.js
// Класс AudioAnalyzer - обертка для совместимости с WASM-based аудио анализом

import { state } from '../core/init.js';

/**
 * Класс AudioAnalyzer для получения уровней семитонов
 * В текущей реализации использует данные из WASM CWT анализа
 */
export class AudioAnalyzer {
    /**
     * Конструктор AudioAnalyzer
     * @param {string} channel - 'left' или 'right' для канала
     */
    constructor(channel = 'left') {
        this.channel = channel;
        this.semitoneLevels = new Float32Array(128); // 128 семитонов

        console.log(`AudioAnalyzer initialized for ${channel} channel (WASM-based)`);
    }

    /**
     * Установить узел анализатора (для совместимости, не используется в WASM версии)
     * @param {AnalyserNode} analyserNode - Узел анализатора
     */
    setAnalyserNode(analyserNode) {
        // В WASM версии анализатор не используется напрямую
        console.log('AudioAnalyzer: setAnalyserNode called (ignored in WASM version)');
    }

    /**
     * Получить узел анализатора (для совместимости)
     * @returns {null} Всегда null в WASM версии
     */
    getAnalyserNode() {
        return null;
    }

    /**
     * Получить текущие уровни для каждого семитона из WASM данных
     * @returns {Float32Array} Массив уровней для 128 семитонов (0-1)
     */
    getSemitoneLevels() {
        if (!state.audio || !state.audio.currentDbLevels) {
            return this.semitoneLevels.fill(0);
        }

        const dbLevels = state.audio.currentDbLevels;
        const isLeft = this.channel === 'left';

        // WASM возвращает 256 значений: 128 left + 128 right
        const channelOffset = isLeft ? 0 : 128;

        // Прямое копирование 128 значений для канала
        for (let i = 0; i < 128; i++) {
            const db = dbLevels[channelOffset + i];
            // Предполагаем, что db в диапазоне -100 до 0 dB
            // Преобразование в линейный уровень 0-1
            const linear = Math.pow(10, db / 20);
            this.semitoneLevels[i] = Math.max(0, Math.min(1, linear));
        }

        return this.semitoneLevels;
    }
}
