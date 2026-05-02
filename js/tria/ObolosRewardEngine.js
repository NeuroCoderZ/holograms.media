/**
 * ObolosRewardEngine.js — Dual-Nature Token Engine
 * =================================================
 * Obolos = нейро-экономический токен двойного назначения:
 *   1. Экономический (Proof-of-Gesture, Holochain-style) — для расчётов, инвестиций
 *   2. Нейросетевой — вознаграждение Гермесу за качество работы
 *
 * Гермес получает Obolos за:
 *   - Успешное распознавание жеста (BASE_REWARD)
 *   - Предиктивное попадание с 1-2 чанков (PREDICTIVE_BONUS × 3)
 *   - Seamless crossmodal переход жест↔символ (CROSSMODAL_BONUS × 5)
 *   - Пропорционально confidence (CONFIDENCE_MULTIPLIER)
 *
 * Гермес может тратить Obolos на:
 *   - Выбор более мощной LLM (Mistral Small → Medium → Claude)
 *   - Дообучение жестовой модели
 *   - Расширение памяти
 */

// Константы вознаграждения
const BASE_REWARD        = 0.01;   // за каждый распознанный жест
const PREDICTIVE_BONUS   = 3;      // множитель за раннее предсказание (<3 чанков)
const CROSSMODAL_BONUS   = 5;      // множитель за seamless жест→символ→действие
const CONFIDENCE_FLOOR   = 0.5;    // минимальный confidence для награды
const MAX_REWARD_PER_GESTURE = 1.0; // потолок награды за один жест

// Стоимость использования LLM (в Obolos)
const LLM_COSTS = {
    'mistral-small-latest':    0.001,
    'mistral-medium-3-5':      0.005,
    'gemini-3-flash-preview':  0.003,
    'gemini-3.1-flash-lite-preview': 0.001,
};

export class ObolosRewardEngine {
    constructor() {
        this._totalMinted = 0;
        this._totalSpent = 0;
        this._rewards = [];         // история начислений
        this._maxRewardHistory = 200;

        this._stats = {
            gestures: 0,
            predictiveHits: 0,
            crossmodalHits: 0,
            totalMinted: 0,
            totalSpent: 0
        };
    }

    /**
     * Оценивает качество перехода жест → символ.
     * @param {Object} prediction - результат PredictiveRAG
     * @param {Object} actualResult - что реально выполнилось
     * @returns {{qualityScore: number, isPredictive: boolean, isCrossmodal: boolean}}
     */
    scoreTransition(prediction, actualResult) {
        const qualityScore = this._calcQuality(prediction, actualResult);
        const isPredictive = prediction?.isEarly && prediction?.confidence > 0.6;
        const isCrossmodal = !!(actualResult?.orchestratorHandled && actualResult?.wsDelivered);

        return { qualityScore, isPredictive, isCrossmodal };
    }

    /**
     * Начисляет Obolos на основе quality score.
     * @param {Object} scoring - от scoreTransition()
     * @returns {{amount: number, reason: string, breakdown: Object}}
     */
    mintObolos(scoring) {
        if (scoring.qualityScore < CONFIDENCE_FLOOR) {
            return { amount: 0, reason: 'confidence too low', breakdown: null };
        }

        let amount = BASE_REWARD;
        const breakdown = { base: BASE_REWARD };

        // Бонус за предиктивное попадание
        if (scoring.isPredictive) {
            amount *= PREDICTIVE_BONUS;
            breakdown.predictiveBonus = PREDICTIVE_BONUS;
            this._stats.predictiveHits++;
        }

        // Бонус за crossmodal переход
        if (scoring.isCrossmodal) {
            amount *= CROSSMODAL_BONUS;
            breakdown.crossmodalBonus = CROSSMODAL_BONUS;
            this._stats.crossmodalHits++;
        }

        // Множитель confidence
        amount *= scoring.qualityScore;
        breakdown.confidenceMultiplier = scoring.qualityScore;

        // Потолок
        amount = Math.min(amount, MAX_REWARD_PER_GESTURE);
        amount = parseFloat(amount.toFixed(6));

        this._totalMinted += amount;
        this._stats.totalMinted += amount;
        this._stats.gestures++;

        const reward = {
            amount,
            reason: this._formatReason(scoring),
            breakdown,
            timestamp: Date.now()
        };

        this._rewards.push(reward);
        if (this._rewards.length > this._maxRewardHistory) this._rewards.shift();

        return reward;
    }

    /**
     * Проверяет, может ли Гермес «позволить себе» данную LLM.
     * @param {string} modelId - идентификатор модели
     * @param {number} currentBalance - текущий баланс кошелька
     * @returns {{canAfford: boolean, cost: number}}
     */
    checkLLMCost(modelId, currentBalance) {
        const cost = LLM_COSTS[modelId] || 0.01;
        return {
            canAfford: currentBalance >= cost,
            cost
        };
    }

    /**
     * Списывает Obolos за использование LLM.
     * @returns {number} списанная сумма
     */
    spendOnLLM(modelId) {
        const cost = LLM_COSTS[modelId] || 0.01;
        this._totalSpent += cost;
        this._stats.totalSpent += cost;
        return cost;
    }

    _calcQuality(prediction, result) {
        if (!prediction || !result) return 0;

        let score = 0;

        // Confidence из предсказания
        score += (prediction.confidence || 0) * 0.5;

        // Совпадение предсказания с результатом
        if (prediction.predictions?.[0]?.intent === result.intentType) {
            score += 0.3;
        }

        // Orchestrator обработал
        if (result.orchestratorHandled) {
            score += 0.2;
        }

        return Math.min(1.0, score);
    }

    _formatReason(scoring) {
        const parts = ['gesture'];
        if (scoring.isPredictive) parts.push('predictive');
        if (scoring.isCrossmodal) parts.push('crossmodal');
        return parts.join('+');
    }

    get stats() { return { ...this._stats }; }

    diagnostic() {
        console.log('💰 [ObolosRewardEngine] Stats:', this._stats);
        console.log('💰 Last 5 rewards:', this._rewards.slice(-5));
        return this._stats;
    }
}

export default ObolosRewardEngine;
