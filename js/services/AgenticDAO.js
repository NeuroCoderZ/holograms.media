/**
 * js/services/AgenticDAO.js
 * 
 * Модуль Agentic DAO для Tria-сети.
 * Реализует концепт "Управление Без Голосования" (Управление через Utility Score).
 * Естественный отбор решений через скоринг полезности (utility_score) вместо голосования токенами.
 */

export class AgenticDAO {
    constructor() {
        this.globalUtilityScore = 0;
        this.personalUtilityScore = 50.0; // Baseline
        
        // История контрибьюций compute 
        this.computeContributions = [];
        this._memory = null;
    }

    /**
     * Инициализация с восстановлением состояния
     */
    async init(triaMemory) {
        this._memory = triaMemory;
        const savedState = await this._memory.loadDaoState();
        if (savedState) {
            this.personalUtilityScore = savedState.score || 50.0;
            this.computeContributions = savedState.contributions || [];
            console.log(`[AgenticDAO] Состояние восстановлено. Utility Score: ${this.personalUtilityScore.toFixed(2)}`);
            this._broadcastUpdate();
        }
    }

    /**
     * Зарегистрировать вклад вычислений (Compute Contribution)
     */
    async registerComputeFactor(computeAmount, taskType) {
        this.computeContributions.push({
            timestamp: Date.now(),
            amount: computeAmount,
            type: taskType
        });
        
        // Очистка старых данных (храним за последние 24ч для скоринга)
        const ONE_DAY = 24 * 60 * 60 * 1000;
        const now = Date.now();
        this.computeContributions = this.computeContributions.filter(c => (now - c.timestamp) < ONE_DAY);
        
        this._recalculateUtilityScore();
        await this._saveState();
    }

    async _saveState() {
        if (this._memory) {
            try {
                await this._memory.saveDaoState({
                    score: this.personalUtilityScore,
                    contributions: this.computeContributions,
                    last_updated: Date.now()
                });
            } catch (error) {
                console.error('[AgenticDAO] Ошибка при сохранении состояния:', error);
            }
        }
    }

    /**
     * Утилитный скоринг на основе реальной активности
     */
    _recalculateUtilityScore() {
        let dailyCompute = 0;
        for (const c of this.computeContributions) {
            dailyCompute += c.amount;
        }

        const computeBonus = dailyCompute > 0 ? (Math.log10(dailyCompute + 1) * 5) : 0;
        const penalty = 0; 

        // Обновляем Utility Score (0.0 - 100.0)
        let newScore = 50.0 + computeBonus - penalty;
        this.personalUtilityScore = Math.max(0, Math.min(100, newScore));
        
        this._broadcastUpdate();
    }

    _broadcastUpdate() {
        window.dispatchEvent(new CustomEvent('tria:dao_score_updated', {
            detail: { score: this.personalUtilityScore }
        }));
    }

    getScore() {
        return this.personalUtilityScore;
    }
}

export const agenticDAO = new AgenticDAO();
