/**
 * PredictiveRAG.js — Предиктивный поиск по жестовым эмбеддингам
 * =============================================================
 * Гермес-Эйдос: предсказатель.
 *
 * Работает как «поиск руками» — жестовый эмбеддинг ищется среди
 * символьных интентов через cosine similarity.
 *
 * Предиктивность: начинает выдавать гипотезы с 1-2 чанков (~100мс),
 * уточняя предсказание по мере поступления новых чанков.
 *
 * Progressive Confidence:
 *   - 1-2 чанка (100мс) → ~0.4-0.6 confidence
 *   - 3-5 чанков (250мс) → ~0.6-0.8 confidence
 *   - 6+ чанков (300мс+) → ~0.8-1.0 confidence
 */

import { EmbeddingStream } from './EmbeddingStream.js';

// Предрассчитанные «семантические якоря» интентов.
// В реальной системе — эмбеддинги из AstraDB.
// Сейчас — детерминированные псевдо-эмбеддинги для каждого интента.
const INTENT_ANCHORS = {
    select:       _seedEmbed(1),
    grab:         _seedEmbed(2),
    release:      _seedEmbed(3),
    navigate:     _seedEmbed(4),
    scale:        _seedEmbed(5),
    rotate:       _seedEmbed(6),
    fist:         _seedEmbed(7),
    open_palm:    _seedEmbed(8),
    victory:      _seedEmbed(9),
    pointing_up:  _seedEmbed(10),
    pinch:        _seedEmbed(11),
    swipe:        _seedEmbed(12),
    audio_mute:   _seedEmbed(13),
    audio_play:   _seedEmbed(14),
};

/**
 * Генерирует детерминированный 64-dim эмбеддинг из seed.
 * В будущем заменится на реальные эмбеддинги из Gemini/AstraDB.
 */
function _seedEmbed(seed) {
    const embed = new Float32Array(64);
    // Детерминированный pseudo-random через simple hash
    let h = seed * 2654435761; // Knuth multiplicative hash
    for (let i = 0; i < 64; i++) {
        h = (h * 1103515245 + 12345) & 0x7fffffff;
        embed[i] = (h / 0x7fffffff) * 2 - 1; // [-1, 1]
    }
    // L2 normalize
    let norm = 0;
    for (let i = 0; i < 64; i++) norm += embed[i] * embed[i];
    norm = Math.sqrt(norm);
    if (norm > 0) for (let i = 0; i < 64; i++) embed[i] /= norm;
    return embed;
}

export class PredictiveRAG {
    constructor() {
        this.intentAnchors = new Map();
        this._history = [];         // последние N предсказаний для сглаживания
        this._maxHistory = 10;
        this._adaptiveWeights = {}; // дообучение через feedback

        // Загружаем якоря
        for (const [intent, embed] of Object.entries(INTENT_ANCHORS)) {
            this.intentAnchors.set(intent, embed);
        }
    }

    /**
     * Основной поиск: chunk embedding → top-K интентов.
     * @param {Float32Array} chunkEmbedding - 64-dim вектор от EmbeddingStream
     * @param {number} chunkIndex - порядковый номер чанка в жесте
     * @param {number} topK - сколько кандидатов вернуть
     * @returns {{predictions: Array<{intent, score}>, confidence: number, isEarly: boolean}}
     */
    search(chunkEmbedding, chunkIndex = 0, topK = 3) {
        if (!chunkEmbedding) return { predictions: [], confidence: 0, isEarly: true };

        const scores = [];

        for (const [intent, anchor] of this.intentAnchors) {
            let score = EmbeddingStream.cosineSim(chunkEmbedding, anchor);

            // Применяем адаптивные веса (дообучение через feedback)
            if (this._adaptiveWeights[intent]) {
                score *= this._adaptiveWeights[intent];
            }

            scores.push({ intent, score });
        }

        // Сортировка по убыванию
        scores.sort((a, b) => b.score - a.score);
        const predictions = scores.slice(0, topK);

        // Progressive Confidence:
        // Чем больше чанков — тем увереннее предсказание
        const rawConfidence = predictions[0]?.score || 0;
        const chunkMultiplier = Math.min(1.0, (chunkIndex + 1) / 6); // растёт до 1.0 за 6 чанков
        const confidence = rawConfidence * (0.4 + 0.6 * chunkMultiplier);

        // Сглаживание через историю
        this._history.push({ topIntent: predictions[0]?.intent, confidence });
        if (this._history.length > this._maxHistory) this._history.shift();

        const result = {
            predictions,
            confidence: Math.min(1.0, confidence),
            isEarly: chunkIndex < 3,
            chunkIndex,
            consensusIntent: this._getConsensus(),
            intent: predictions[0]?.intent
        };

        return result;
    }

    /**
     * Обратная связь: корректировка весов после завершения жеста.
     * @param {string} predictedIntent - что предсказали
     * @param {string} actualIntent - что оказалось на самом деле
     * @param {boolean} wasCorrect - угадали или нет
     */
    feedback(predictedIntent, actualIntent, wasCorrect) {
        if (wasCorrect) {
            // Усиливаем якорь правильного интента
            this._adaptiveWeights[actualIntent] =
                (this._adaptiveWeights[actualIntent] || 1.0) * 1.05;
        } else {
            // Ослабляем неправильный, усиливаем правильный
            this._adaptiveWeights[predictedIntent] =
                (this._adaptiveWeights[predictedIntent] || 1.0) * 0.95;
            this._adaptiveWeights[actualIntent] =
                (this._adaptiveWeights[actualIntent] || 1.0) * 1.1;
        }
    }

    /**
     * Consensus: самый частый интент в последних N предсказаниях.
     */
    _getConsensus() {
        if (this._history.length < 2) return null;
        const counts = {};
        for (const h of this._history) {
            counts[h.topIntent] = (counts[h.topIntent] || 0) + 1;
        }
        let best = null, bestCount = 0;
        for (const [intent, count] of Object.entries(counts)) {
            if (count > bestCount) { best = intent; bestCount = count; }
        }
        return best;
    }

    /**
     * Добавить/заменить якорь интента (например, из AstraDB).
     */
    setIntentAnchor(intentType, embedding) {
        this.intentAnchors.set(intentType, embedding);
    }

    get anchorCount() { return this.intentAnchors.size; }
}

export default PredictiveRAG;
