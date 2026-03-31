/**
 * OneEuroFilter.js — Адаптивный фильтр сглаживания для 21-точечных landmarks
 * ============================================================================
 * Алгоритм: One Euro Filter (Casiez et al., 2012)
 * 
 * Принцип: динамическая частота среза cutoff = minCutoff + beta * |speed|
 * - В покое: cutoff ≈ minCutoff → сильное сглаживание (убирает джиттер)
 * - В движении: cutoff растёт → быстрая реакция (не тормозит жесты)
 *
 * Параметры (настроены для MediaPipe Hands @ 60fps):
 *   minCutoff = 1.0    — базовая частота среза (Гц)
 *   beta      = 0.007  — коэффициент ускорения (чем выше, тем агрессивнее следование)
 *   dCutoff   = 1.0    — частота среза для производной
 */

class OneEuroFilter {
    /**
     * @param {number} minCutoff — минимальная частота среза (Гц)
     * @param {number} beta      — коэффициент ускорения
     * @param {number} dCutoff   — частота среза производной (Гц)
     * @param {number} sampleRate — частота дискретизации (Гц)
     */
    constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0, sampleRate = 60) {
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.dCutoff = dCutoff;
        this.sampleRate = sampleRate;
        this.T = 1.0 / sampleRate;

        // Состояние на каждую координату: { value, dx }
        this._state = new Map(); // key: "pointIndex_axis" → { value, dx }
    }

    /**
     * Вычисляет alpha для заданной частоты среза.
     * alpha = 1 / (1 + T * 2π * cutoff)
     */
    _alpha(cutoff) {
        const tau = 1.0 / (2 * Math.PI * cutoff);
        return 1.0 / (1.0 + tau / this.T);
    }

    /**
     * Фильтрует одно скалярное значение.
     */
    _filter1d(key, x) {
        let state = this._state.get(key);
        if (!state) {
            // Инициализация: первое значение без фильтрации
            state = { value: x, dx: 0 };
            this._state.set(key, state);
            return x;
        }

        // Скорость (производная) с фильтрацией
        const alphaD = this._alpha(this.dCutoff);
        const dx = Math.abs(x - state.value);
        const filteredDx = alphaD * dx + (1 - alphaD) * state.dx;

        // Динамическая частота среза
        const cutoff = this.minCutoff + this.beta * filteredDx;
        const alpha = this._alpha(cutoff);

        // Экспоненциальное сглаживание
        const filtered = alpha * x + (1 - alpha) * state.value;

        state.value = filtered;
        state.dx = filteredDx;

        return filtered;
    }

    /**
     * Фильтрует все 21 точку кисти (63 координаты).
     * @param {Array} landmarks — 21 точка [{x, y, z}, ...]
     * @returns {Array} — отфильтрованные 21 точка
     */
    filter(landmarks) {
        if (!landmarks || landmarks.length < 21) return landmarks;

        const result = [];
        for (let i = 0; i < 21; i++) {
            const p = landmarks[i];
            result.push({
                x: this._filter1d(`${i}_x`, p.x),
                y: this._filter1d(`${i}_y`, p.y),
                z: this._filter1d(`${i}_z`, p.z || 0),
            });
        }
        return result;
    }

    /**
     * Сброс состояния (при смене пользователя / перезапуске трекинга).
     */
    reset() {
        this._state.clear();
    }

    /**
     * Статический фабричный метод с пресетами.
     */
    static preset(name) {
        switch (name) {
            case 'smooth':
                return new OneEuroFilter(0.5, 0.003, 1.0, 60);  // Максимальное сглаживание
            case 'default':
                return new OneEuroFilter(1.0, 0.007, 1.0, 60);  // Баланс
            case 'fast':
                return new OneEuroFilter(2.0, 0.015, 1.0, 60);  // Быстрая реакция
            case 'vr':
                return new OneEuroFilter(1.5, 0.01, 1.0, 90);   // Для WebXR @ 90fps
            default:
                return new OneEuroFilter(1.0, 0.007, 1.0, 60);
        }
    }
}

export default OneEuroFilter;
