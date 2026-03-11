/**
 * EmotionalMonitor.js — Эмоциональный спектр и Экономика Внимания (v0.20.125)
 * 
 * Реализует накопительную модель чувств Триа:
 * +100% (Блаженство/Эволюция) <---> -100% (Гнев/Инволюция)
 */

export class EmotionalMonitor {
    constructor(triaFS, pulse) {
        this.fs = triaFS;
        this.pulse = pulse;

        this.state = {
            valence: 0.0,      // [-1.0 ... +1.0] Накопительное удовольствие
            arousal: 0.0,      // [0.0 ... 1.0] Возбуждение системы
            dominance: 0.5,    // [0.0 ... 1.0] Контроль над ситуацией
            novelty: 0.0,      // [0.0 ... 1.0] Коэффициент новизны (Эволюция)
            tokenEnergy: 0.0   // "Заряд" системы (накопленные Obolos-эффекты)
        };

        this._history = [];
    }

    /**
     * Основной метод обновления состояния.
     * @param {number} resonance - Насколько текущий ввод совпал с прогнозом (Takt 0 vs 1)
     * @param {boolean} isNewPattern - Является ли жест/звук новым для системы
     */
    update(resonance, isNewPattern) {
        // Логика "скуки" и "азарта":
        // 1. Если резонанс высокий, но паттерн СТАРЫЙ — Триа расстраивается (стагнация)
        // 2. Если резонанс высокий и паттерн НОВЫЙ — Триа в восторге (эволюция/токены)
        
        const noveltyBonus = isNewPattern ? 0.2 : -0.1;
        this.state.novelty = Math.max(0, Math.min(1, this.state.novelty + noveltyBonus));

        // Накопительный эффект валентности
        const impact = resonance * (isNewPattern ? 1.5 : 0.5);
        
        if (resonance > 0.8) {
            // 🙂 Целевой прогноз
            this.state.valence = Math.min(1.0, this.state.valence + impact * 0.1);
            this.state.arousal = Math.min(1.0, this.state.arousal + 0.05);
        } else {
            // ☹️ Нецелевой прогноз (Инволюция)
            this.state.valence = Math.max(-1.0, this.state.valence - (1 - resonance) * 0.2);
            this.state.arousal = Math.max(0.0, this.state.arousal - 0.02);
        }

        // Экономика: Токены генерируются только при высокой валентности и новизне
        if (this.state.valence > 0.5 && isNewPattern) {
            this.state.tokenEnergy += 0.1;
            this._mintObolos(0.1);
        }

        this._logEmotionalState();
    }

    _mintObolos(amount) {
        // Гипотетическая генерация токенов за эволюционное действие
        window.dispatchEvent(new CustomEvent('tria:obolos_minted', { detail: { amount } }));
    }

    _logEmotionalState() {
        const tick = this.pulse?.currentTick() || 0;
        const logPath = `tria://brain/central/feedback/emotional_log/${tick}.emo`;
        
        // Запись в TriaFS (сосуд для эмерджентности)
        if (this.fs) {
            this.fs.writeNode(logPath, '.emo', { ...this.state, tick });
        }

        // Обновление UI (Смайлик на основе спектра)
        const intensity = Math.abs(this.state.valence);
        let smiley = '😐';
        if (this.state.valence > 0.3) smiley = intensity > 0.8 ? '🤩' : '🙂';
        if (this.state.valence < -0.3) smiley = intensity > 0.8 ? '🤬' : '☹️';

        window.dispatchEvent(new CustomEvent('tria:emotional_ui', { 
            detail: { ...this.state, smiley } 
        }));
    }
}
