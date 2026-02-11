// frontend/js/ai/gestureIntentClassifier.js

import GestureVectorStore from '../tria/GestureVectorStore.js';

/**
 * GestureIntentClassifier (Opus-Level Edition)
 * 
 * Превращает сырые координаты MediaPipe в семантические намерения (Intents).
 * Использует многоуровневую систему принятия решений (Tiered Decision Engine):
 * 1. Confident Vector Match (>0.85) — прямое распознавание из памяти.
 * 2. Mixed Validation (>0.7 + Heuristic) — подтверждение вектора правилами.
 * 3. Heuristic Fallback — работа по жестким правилам при отсутствии данных в БД.
 */
export class GestureIntentClassifier {
    constructor(opts = {}) {
        // Debounce to avoid flooding downstream state machines
        this.lastIntent = null;
        this.lastIntentTime = 0;
        this.debounceTime = ('debounceTime' in opts) ? opts.debounceTime : 300;

        // Векторное хранилище (ленивая инициализация)
        this.gestureStore = null; // lazy init in ensureStore()
        this._storeReadyPromise = null;

        // Intent history buffer (circular)
        this.intentHistory = [];
        this.historyLimit = ('historyLimit' in opts) ? opts.historyLimit : 16;

        // Confidence accumulator: per-intent temporal accumulator with decay
        this.accumulators = new Map(); // intent -> {value, lastTs}
        this.accumulatorCfg = Object.assign({
            acceptanceThreshold: ('acceptanceThreshold' in opts) ? opts.acceptanceThreshold : 1.0,
            decayFactorPer100ms: ('decayFactorPer100ms' in opts) ? opts.decayFactorPer100ms : 0.9,
            decayStepMs: 100,
            // how much to increment accumulator when a soft match observed (multiplied by score)
            incrementScale: ('incrementScale' in opts) ? opts.incrementScale : 1.0
        }, opts.accumulatorCfg || {});

        // Minimal score thresholds (KNN accept threshold 0.85 per Phase20)
        this.thresholds = Object.assign({
            accept: ('accept' in (opts.thresholds || {})) ? opts.thresholds.accept : 0.85,
            soft: ('soft' in (opts.thresholds || {})) ? opts.thresholds.soft : 0.6
        }, opts.thresholds || {});

        // allow injecting a GestureVectorStore class for tests
        this._GestureVectorStoreClass = opts.GestureVectorStoreClass || GestureVectorStore;

        // Personal Language Weights: learns which gestures are most common for THIS user
        this.gestureWeights = new Map(); // intent -> weight (boost)
        this.learningRate = 0.05;

        // Small debug
        // console.debug('GestureIntentClassifier initialized', {historyLimit: this.historyLimit});
    }

    /**
     * Инициализация хранилища
     */
    async ensureStore() {
        if (!this.gestureStore) this.gestureStore = new this._GestureVectorStoreClass();
        if (!this._storeReadyPromise) {
            this._storeReadyPromise = this.gestureStore.init({ includeZ: true });
        }
        return this._storeReadyPromise;
    }

    /**
     * Главный цикл предсказания
     */
    async predict(landmarks) {
        // Returns Promise resolving to {intent, confidence, action} or null
        if (!landmarks || landmarks.length < 21) return null;

        await this.ensureStore();
        const now = Date.now();

        // 1) Vector search (topK=3, minScore = soft threshold)
        const vectorResults = await this._getVectorIntents(landmarks);

        // 2) Heuristic fallback (cheap)
        const heuristic = this._getHeuristicIntent(landmarks);

        // 3) Tiered decision + Personal Weighting
        let chosen = null;
        if (vectorResults && vectorResults.length) {
            const best = vectorResults[0];
            const score = (typeof best.score === 'number') ? best.score : 0;
            const intentName = this._extractName(best);

            // Apply personal weight boost (softly)
            const weight = this.gestureWeights.get(intentName) || 1.0;
            const finalScore = score * weight;

            // Immediate accept
            if (finalScore >= this.thresholds.accept) {
                chosen = { intent: intentName, confidence: finalScore, source: 'vector', match: best };
                this._updateWeights(intentName); // Reinforce
            }
            // Soft: accumulate over time
            else if (finalScore >= this.thresholds.soft) {
                const accVal = this._accumulate(intentName, finalScore, now);
                if (accVal >= this.accumulatorCfg.acceptanceThreshold) {
                    chosen = { intent: intentName, confidence: Math.min(1, accVal), source: 'accumulated', match: best };
                    this._updateWeights(intentName);
                }
            }
        }

        // 4) Chain detection (Contextual reinforcement)
        const chainSuggestion = this._detectChain(vectorResults);
        if (chainSuggestion && (!chosen || chainSuggestion.confidence > chosen.confidence)) {
            chosen = { intent: chainSuggestion.intent, confidence: chainSuggestion.confidence, source: 'chain', chainInfo: chainSuggestion };
        }

        // If chosen, apply debounce and history bookkeeping
        if (chosen) {
            // ensure shape: {intent, confidence}
            const out = { intent: chosen.intent, confidence: Number(chosen.confidence || 0) };

            const emit = () => {
                this._addToHistory(out.intent);
                this.lastIntent = out.intent;
                this.lastIntentTime = now;
                return out;
            };

            if (this.lastIntent && this.lastIntent === out.intent && (now - this.lastIntentTime) < this.debounceTime) {
                // suppressed by debounce
                return null;
            }
            return emit();
        }

        // If no decision, decay accumulators and possibly clear lastIntent after debounce window
        this._decayAllAccumulators(now);
        if (this.lastIntent && (now - this.lastIntentTime) > this.debounceTime) this.lastIntent = null;
        return null;
    }

    /**
     * Уровень 1 & 2: Векторный поиск
     */
    async _getVectorIntents(landmarks) {
        try {
            // Ищем топ-3 совпадения
            return await this.gestureStore.query(landmarks, 3, 0.6);
        } catch (e) {
            console.warn("OpusClassifier: Vector query failed", e);
            return [];
        }
    }

    /**
     * Уровень 3: Улучшенные эвристики
     */
    _getHeuristicIntent(landmarks) {
        // Returns {intent, confidence} or null
        const wrist = landmarks[0];
        if (!wrist) return null;

        const idx = i => landmarks[i];
        const dist3 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));

        // scale reference: wrist -> middle_mcp (index 9)
        const middleMcp = idx(9) || wrist;
        const scaleRef = Math.max(1e-6, dist3(wrist, middleMcp));

        const thumbTip = idx(4); const indexTip = idx(8); const middleTip = idx(12); const ringTip = idx(16); const pinkyTip = idx(20);
        if (!thumbTip || !indexTip) return null;

        // Pinch / select: thumb-index distance small relative to hand size
        const pinchDist = dist3(indexTip, thumbTip) / scaleRef;
        if (pinchDist < 0.18) return { intent: 'select', confidence: 0.6 };

        // Fist / grab: tips close to wrist
        const tips = [indexTip, middleTip, ringTip, pinkyTip].filter(Boolean);
        if (tips.length === 4) {
            const closed = tips.every(t => (dist3(t, wrist) / scaleRef) < 0.6);
            if (closed) return { intent: 'grab', confidence: 0.55 };
        }

        // Open palm / navigate: fingers substantially extended using 3D alignment
        const isExtended = (tipIdx, pipIdx, mcpIdx) => {
            const tip = idx(tipIdx), pip = idx(pipIdx), mcp = idx(mcpIdx);
            if (!tip || !pip || !mcp) return false;
            return this.isFingerExtended3D(tip, pip, mcp, scaleRef);
        };
        const open = isExtended(8, 7, 5) && isExtended(12, 11, 9) && isExtended(16, 15, 13) && isExtended(20, 19, 17);
        if (open) return { intent: 'navigate', confidence: 0.5 };

        return null;
    }

    /**
     * Слой принятия решений (Tiered Logic)
     */
    _extractName(match) {
        return (match && match.metadata && match.metadata.intent) ? match.metadata.intent : (match && match.name) || null;
    }

    // -------------------------
    // Confidence accumulator helpers
    // -------------------------
    _accumulate(intentName, score, now) {
        // decay existing value first
        const rec = this.accumulators.get(intentName) || { value: 0, lastTs: now };
        this._decaySingle(rec, now);
        rec.value = rec.value + (score * this.accumulatorCfg.incrementScale);
        rec.lastTs = now;
        this.accumulators.set(intentName, rec);
        return rec.value;
    }

    _decaySingle(rec, now) {
        const dt = Math.max(0, now - (rec.lastTs || now));
        if (dt <= 0) return;
        const steps = dt / this.accumulatorCfg.decayStepMs;
        const f = Math.pow(this.accumulatorCfg.decayFactorPer100ms, steps);
        rec.value = rec.value * f;
    }

    _decayAllAccumulators(now) {
        for (const [k, rec] of this.accumulators.entries()) {
            this._decaySingle(rec, now);
            // garbage collect tiny values
            if (rec.value < 1e-4) this.accumulators.delete(k);
            else this.accumulators.set(k, rec);
        }
    }

    // Chain detection inspects vectorResults metadata for chain sequences
    _detectChain(vectorResults) {
        if (!vectorResults || !vectorResults.length) return null;
        const now = Date.now();
        // build simple history array of intent strings
        const hist = this.intentHistory.map(h => h.intent).slice(-32);
        // look through top results for chain metadata
        for (const r of vectorResults) {
            const md = r.metadata || {};
            if (!md.chains) continue;
            const chains = Array.isArray(md.chains) ? md.chains : [];
            for (const c of chains) {
                let seq = null; let chainIntent = null;
                if (Array.isArray(c)) { seq = c; chainIntent = c.join('->'); }
                else if (c && Array.isArray(c.sequence)) { seq = c.sequence; chainIntent = c.intent || c.sequence.join('->'); }
                if (!seq || seq.length < 2) continue;
                const prefix = seq.slice(0, seq.length - 1);
                const tail = hist.slice(-prefix.length);
                if (tail.length === prefix.length && prefix.every((v, i) => v === tail[i])) {
                    // next expected in chain is last element
                    const expected = seq[seq.length - 1];
                    // if current result corresponds to expected, suggest chain
                    const cand = this._extractName(r) || r.name;
                    if (cand === expected) {
                        // возвращаем ожидаемый следующий intent (последний элемент последовательности)
                        return { intent: expected, chainLabel: chainIntent, confidence: (r.score || 0) * 0.9, sequence: seq, sourceResult: r };
                    }
                }
            }
        }
        return null;
    }

    // legacy smoothing removed - using accumulators above

    _addToHistory(intent) {
        this.intentHistory.push({ intent, time: Date.now() });
        if (this.intentHistory.length > this.historyLimit) this.intentHistory.shift();

        // Здесь можно добавить детектор цепочек (например, 'select' -> 'navigate' = 'shortcut_action')
    }

    // 3D finger heuristic: uses cross-product and vector alignment
    isFingerExtended3D(tip, pip, mcp, scaleRef) {
        // Feature 1: Directional alignment (Cosine similarity of phalanges)
        const v = { x: (pip.x - mcp.x), y: (pip.y - mcp.y), z: (pip.z || 0) - (mcp.z || 0) };
        const w = { x: (tip.x - pip.x), y: (tip.y - pip.y), z: (tip.z || 0) - (pip.z || 0) };

        const nv = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2) || 1e-9;
        const nw = Math.sqrt(w.x ** 2 + w.y ** 2 + w.z ** 2) || 1e-9;
        const cos = (v.x * w.x + v.y * w.y + v.z * w.z) / (nv * nw);

        // Feature 2: Distance ratio (Tip must be further from wrist)
        const tipToMcp = Math.sqrt((tip.x - mcp.x) ** 2 + (tip.y - mcp.y) ** 2 + (tip.z - mcp.z) ** 2);
        const pipToMcp = Math.sqrt((pip.x - mcp.x) ** 2 + (pip.y - mcp.y) ** 2 + (pip.z - mcp.z) ** 2);
        const ratio = tipToMcp / (pipToMcp || 1e-9);

        // Feature 3: Parallelism (Small cross-product indicates straight finger)
        const cross = {
            x: v.y * w.z - v.z * w.y,
            y: v.z * w.x - v.x * w.z,
            z: v.x * w.y - v.y * w.x
        };
        const sin = Math.sqrt(cross.x ** 2 + cross.y ** 2 + cross.z ** 2) / (nv * nw);

        return cos > 0.85 && ratio > 1.15 && sin < 0.25;
    }

    _updateWeights(intentName) {
        let w = this.gestureWeights.get(intentName) || 1.0;
        w = Math.min(1.5, w + this.learningRate); // Max boost 50%
        this.gestureWeights.set(intentName, w);
        // Decay others slightly
        for (const [k, v] of this.gestureWeights.entries()) {
            if (k !== intentName) {
                this.gestureWeights.set(k, Math.max(0.8, v - this.learningRate * 0.2));
            }
        }
    }

    // -----------------------
    // Accumulator inspection & test helpers
    // -----------------------

    /** Возвращает значение аккумулятора для intent (или null) */
    getAccumulator(intentName) {
        const rec = this.accumulators.get(intentName);
        if (!rec) return null;
        return { value: rec.value, lastTs: rec.lastTs };
    }

    /** Возвращает snapshot всех аккумуляторов */
    getAllAccumulators() {
        const out = {};
        for (const [k, v] of this.accumulators.entries()) out[k] = { value: v.value, lastTs: v.lastTs };
        return out;
    }

    /** Сбрасывает все аккумуляторы (тесты) */
    resetAccumulators() {
        this.accumulators.clear();
    }

    /** Обновить конфиг аккумулятора (только для тестирования/отладки) */
    setAccumulatorCfg(cfg = {}) {
        Object.assign(this.accumulatorCfg, cfg);
    }

}

