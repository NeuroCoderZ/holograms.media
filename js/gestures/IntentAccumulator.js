/**
 * IntentAccumulator.js
 * xMemory-inspired intent buffer для brain.rs Hebbian output.
 * Реализует плавную смену намерения (intent switching) в реальном времени.
 *
 * Архитектура:
 *   MediaPipe landmarks
 *     → brain_encode() [WASM] → embedding[64]
 *     → brain_recall() [WASM] → rawIntent[25]
 *     → IntentAccumulator  ← этот модуль
 *         ├── accumulated[25] += α * rawIntent
 *         ├── if cos_sim(raw, buffer) < 0 → DECAY_FAST (смена намерения)
 *         └── if confidence > threshold → emit 'intentReady'
 */

export class IntentAccumulator extends EventTarget {
    /**
     * @param {object} options
     * @param {number} options.intentDim - размерность intent вектора (default: 25)
     * @param {number} options.decayFast - быстрое затухание при смене intent (default: 0.60)
     * @param {number} options.decaySlow - нормальное затухание фона (default: 0.97)
     * @param {number} options.accumRate - скорость накопления (default: 0.12)
     * @param {number} options.threshold - порог уверенности для emit (default: 0.75)
     * @param {number} options.minFrames  - минимум кадров до emit (default: 8)
     */
    constructor(options = {}) {
        super();
        this.intentDim   = options.intentDim  ?? 25;
        this.DECAY_FAST  = options.decayFast  ?? 0.60;
        this.DECAY_SLOW  = options.decaySlow  ?? 0.97;
        this.ACCUM_RATE  = options.accumRate  ?? 0.12;
        this.THRESHOLD   = options.threshold  ?? 0.75;
        this.MIN_FRAMES  = options.minFrames  ?? 8;

        this.buffer      = new Float32Array(this.intentDim);
        this.confidence  = 0.0;
        this.frameAge    = 0;
        this._lastEmit   = null;
        this._lastEmitFrame = -999;
        this._emitCooldown = 45; // 0.75s at 60fps — prevent spam
    }

    /**
     * Обновить аккумулятор новым raw intent из brain_recall().
     * @param {Float32Array|number[]} rawIntent - выход brain_recall()[25]
     * @returns {number} текущая confidence [0..1]
     */
    update(rawIntent) {
        const raw = rawIntent instanceof Float32Array
            ? rawIntent
            : new Float32Array(rawIntent);

        if (raw.length !== this.intentDim) {
            console.warn(`[IntentAccumulator] dim mismatch: got ${raw.length}, expected ${this.intentDim}`);
            return 0;
        }

        const similarity = this._cosineSim(raw, this.buffer);

        const decayFactor = similarity < -0.05 ? this.DECAY_FAST : this.DECAY_SLOW;

        let norm_sq = 0;
        for (let i = 0; i < this.intentDim; i++) {
            this.buffer[i] = this.buffer[i] * decayFactor + raw[i] * this.ACCUM_RATE;
            norm_sq += this.buffer[i] * this.buffer[i];
        }

        const bufNorm = Math.sqrt(norm_sq);
        this.confidence = Math.min(1.0, bufNorm / this.THRESHOLD);
        this.frameAge++;

        if (
            this.confidence >= 1.0 &&
            this.frameAge >= this.MIN_FRAMES &&
            this.frameAge - this._lastEmitFrame >= this._emitCooldown
        ) {
            const intentSnapshot = new Float32Array(this.buffer);
            const intentNorm = bufNorm > 0
                ? intentSnapshot.map(v => v / bufNorm)
                : intentSnapshot;

            // Проверяем что intent действительно изменился (не дубликат)
            if (this._lastEmit) {
                const sim = this._cosineSim(intentNorm, this._lastEmit);
                if (sim > 0.95) {
                    // Тот же intent — не emit
                    return this.confidence;
                }
            }

            this.dispatchEvent(new CustomEvent('intentReady', {
                detail: {
                    intent: intentNorm,
                    confidence: this.confidence,
                    frameAge: this.frameAge,
                    switchedFrom: this._lastEmit
                }
            }));

            this._lastEmit = intentNorm;
            this._lastEmitFrame = this.frameAge;
        }

        return this.confidence;
    }

    reset() {
        this.buffer.fill(0);
        this.confidence = 0.0;
        this.frameAge   = 0;
        this._lastEmit  = null;
        this._lastEmitFrame = -999;
    }

    getCurrentIntent() {
        const norm = this._norm(this.buffer);
        if (norm === 0) return new Float32Array(this.intentDim);
        return this.buffer.map(v => v / norm);
    }

    _cosineSim(a, b) {
        let dot = 0, na = 0, nb = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            na  += a[i] * a[i];
            nb  += b[i] * b[i];
        }
        const denom = Math.sqrt(na) * Math.sqrt(nb);
        return denom < 1e-8 ? 0 : dot / denom;
    }

    _norm(v) {
        let s = 0;
        for (let i = 0; i < v.length; i++) s += v[i] * v[i];
        return Math.sqrt(s);
    }
}
