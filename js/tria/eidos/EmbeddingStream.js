/**
 * EmbeddingStream.js — Преобразование жестовых чанков в эмбеддинги
 * ================================================================
 * Гермес-Эйдос: кодировщик.
 *
 * Берёт GestureChunk (50мс окно от ChunkProcessor) и превращает
 * его в компактный embedding вектор для PredictiveRAG.
 *
 * Стратегия кодирования:
 *   1. Если Enkephalon WASM готов → encode() через WASM (быстро, <1мс)
 *   2. Fallback → простое усреднение + нормализация (CPU)
 *
 * Выходная размерность: 64 (совместимо с Enkephalon)
 */

const EMBED_DIM = 64;

export class EmbeddingStream {
    constructor(enkephalon = null) {
        this.enkephalon = enkephalon;
        this._useWasm = false;
    }

    /**
     * Инициализация — проверяем доступность WASM.
     */
    init(enkephalon) {
        this.enkephalon = enkephalon;
        this._useWasm = !!(enkephalon?.isReady && enkephalon.encode);
        console.log(`[EmbeddingStream] Mode: ${this._useWasm ? 'WASM Enkephalon' : 'CPU fallback'}`);
    }

    /**
     * Кодирует чанк в эмбеддинг.
     * @param {Object} chunk - от ChunkProcessor: {frames, velocity, centroid}
     * @returns {Float32Array} embedding вектор (64-dim)
     */
    encode(chunk) {
        if (!chunk?.frames?.length) return null;

        if (this._useWasm) {
            return this._encodeWasm(chunk);
        }
        return this._encodeCPU(chunk);
    }

    /**
     * WASM путь: берём последний кадр и пропускаем через Enkephalon.
     */
    _encodeWasm(chunk) {
        const lastFrame = chunk.frames[chunk.frames.length - 1];
        // Enkephalon ожидает Float32Array(63) — 21 точек × 3 координаты
        const input = lastFrame instanceof Float32Array
            ? lastFrame
            : new Float32Array(lastFrame);
        return this.enkephalon.encode(input);
    }

    /**
     * CPU fallback: усредняем все кадры чанка + добавляем meta-features.
     * Выход: Float32Array(64)
     */
    _encodeCPU(chunk) {
        const embed = new Float32Array(EMBED_DIM);
        const frames = chunk.frames;
        const n = frames.length;

        if (n === 0) return embed;

        // 1. Среднее по координатам (первые 63 из 64)
        for (const frame of frames) {
            for (let i = 0; i < Math.min(63, frame.length); i++) {
                embed[i] += frame[i] / n;
            }
        }

        // 2. Последний слот — velocity (meta-feature)
        embed[63] = Math.min(chunk.velocity || 0, 10) / 10; // нормализация 0..1

        // 3. L2 нормализация для cosine similarity
        this._l2normalize(embed);

        return embed;
    }

    /**
     * Cosine Similarity между двумя эмбеддингами.
     * @param {Float32Array} a
     * @param {Float32Array} b
     * @returns {number} сходство [-1, 1]
     */
    static cosineSim(a, b) {
        if (!a || !b || a.length !== b.length) return 0;
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        const denom = Math.sqrt(normA) * Math.sqrt(normB);
        return denom > 0 ? dot / denom : 0;
    }

    _l2normalize(vec) {
        let norm = 0;
        for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
        norm = Math.sqrt(norm);
        if (norm > 0) {
            for (let i = 0; i < vec.length; i++) vec[i] /= norm;
        }
    }
}

export default EmbeddingStream;
