/**
 * js/core/EnkephalonBridge.js
 * 
 * JS-мост к WASM-модулю brain.rs (Enkephalon).
 * Управляет жизненным циклом Brain-инстанса в линейной памяти WASM.
 * 
 * Pure WASM API: нет wasm-bindgen, работаем с указателями напрямую.
 */

const BRAIN_INPUT_DIM = 63;    // 21 точка × 3 координаты
const BRAIN_EMBED_DIM = 64;    // размер эмбеддинга
const BRAIN_INTENT_DIM = 25;   // размер вектора намерения
const BRAIN_SEED = 42n;        // BigInt для u64

export class EnkephalonBridge {
    constructor() {
        this._wasm = null;       // WebAssembly.Instance.exports
        this._memory = null;     // WebAssembly.Memory
        this._slots = null;
        this._slotIdx = 0;
        this._snapshotInterval = null;
    }

    /**
     * Инициализировать мост, передав уже загруженный WASM-инстанс.
     * @param {Object} wasmExports - exports от WebAssembly.Instance
     */
    init(wasmExports) {
        this._wasm = wasmExports;
        this._memory = wasmExports.memory;

        if (!this._wasm.brain_new) {
            console.error('[EnkephalonBridge] brain_new не найден в экспортах WASM');
            return;
        }

        // Создаём Brain в WASM-памяти
        this._brainPtr = this._wasm.brain_new(
            BRAIN_INPUT_DIM,
            BRAIN_EMBED_DIM,
            BRAIN_INTENT_DIM,
            BRAIN_SEED
        );

        if (!this._brainPtr) {
            console.error('[EnkephalonBridge] brain_new вернул null — WASM не инициализирован');
            return;
        }

        const paramCount = this._wasm.brain_total_params(this._brainPtr);
        console.log(`[EnkephalonBridge] Enkephalon активирован. Параметры: ${paramCount} (~${(paramCount * 4 / 1024).toFixed(1)} KB)`);
        this.isReady = true;
    }

    /**
     * Encode: gesture[63] → embedding[64]
     * @param {Float32Array} gestureInput — 63 float
     * @returns {Float32Array} embedding — 64 float
     */
    encode(gestureInput) {
        if (!this.isReady) return new Float32Array(BRAIN_EMBED_DIM);

        const inputPtr = this._alloc(BRAIN_INPUT_DIM * 4);
        const outputPtr = this._alloc(BRAIN_EMBED_DIM * 4);

        // Unify memory access: write to memory directly via byteOffset (matching recall/learn)
        new Float32Array(this._memory.buffer, inputPtr, BRAIN_INPUT_DIM).set(
            gestureInput.subarray(0, Math.min(gestureInput.length, BRAIN_INPUT_DIM))
        );

        this._wasm.brain_encode(
            this._brainPtr,
            inputPtr, BRAIN_INPUT_DIM,
            outputPtr, BRAIN_EMBED_DIM
        );

        const result = new Float32Array(new Float32Array(this._memory.buffer, outputPtr, BRAIN_EMBED_DIM));

        // Memory cleanup not needed for slot allocator but helpful for mental model
        return result;
    }

    /**
     * Recall: embedding[64] → intent[25]
     * @param {Float32Array} embedding — 64 float
     * @returns {Float32Array} intent — 25 float
     */
    recall(embedding) {
        if (!this.isReady) return new Float32Array(BRAIN_INTENT_DIM);

        const inputPtr = this._alloc(BRAIN_EMBED_DIM * 4);
        const outputPtr = this._alloc(BRAIN_INTENT_DIM * 4);

        // Исправлено: byteOffset должен быть в байтах, не делим на 4
        new Float32Array(this._memory.buffer, inputPtr, BRAIN_EMBED_DIM).set(embedding);

        this._wasm.brain_recall(
            this._brainPtr,
            inputPtr, BRAIN_EMBED_DIM,
            outputPtr, BRAIN_INTENT_DIM
        );

        const resultView = new Float32Array(this._memory.buffer, outputPtr, BRAIN_INTENT_DIM);
        const result = new Float32Array(resultView);

        this._free(inputPtr, BRAIN_EMBED_DIM * 4);
        this._free(outputPtr, BRAIN_INTENT_DIM * 4);
        return result;
    }

    /**
     * Learn (Hebbian update): обновить веса на основе жеста и намерения.
     * @param {Float32Array} embedding — 64 float
     * @param {Float32Array} intent    — 25 float
     */
    learn(embedding, intent) {
        if (!this.isReady) return;

        const embPtr = this._alloc(BRAIN_EMBED_DIM * 4);
        const intPtr = this._alloc(BRAIN_INTENT_DIM * 4);

        // Исправлено: byteOffset должен быть в байтах, не делим на 4
        new Float32Array(this._memory.buffer, embPtr, BRAIN_EMBED_DIM).set(embedding);
        new Float32Array(this._memory.buffer, intPtr, BRAIN_INTENT_DIM).set(intent);

        this._wasm.brain_learn(
            this._brainPtr,
            embPtr, BRAIN_EMBED_DIM,
            intPtr, BRAIN_INTENT_DIM
        );

        this._free(embPtr, BRAIN_EMBED_DIM * 4);
        this._free(intPtr, BRAIN_INTENT_DIM * 4);
    }

    /**
     * Decay (Lethe): глобальное затухание всех весов.
     * Вызывается MaturityDaemon раз в 24 часа.
     */
    decay() {
        if (!this.isReady) return;
        this._wasm.brain_decay(this._brainPtr);
        console.log('[EnkephalonBridge] Lethe: глобальное затухание весов выполнено');
    }

    /**
     * Экспорт весов в Float32Array (для сохранения в TriaMemory).
     * @returns {Float32Array}
     */
    exportWeights() {
        if (!this.isReady) return null;
        const totalParams = this._wasm.brain_total_params(this._brainPtr);
        const outPtr = this._alloc(totalParams * 4);
        this._wasm.brain_export_weights(this._brainPtr, outPtr, totalParams);
        const weights = new Float32Array(new Float32Array(this._memory.buffer, outPtr, totalParams));
        this._free(outPtr, totalParams * 4);
        return weights;
    }

    /**
     * Импорт весов из Float32Array (загрузка снапшота из TriaMemory).
     * @param {Float32Array} weights
     */
    importWeights(weights) {
        if (!this.isReady || !weights) return;
        const totalParams = this._wasm.brain_total_params(this._brainPtr);
        if (weights.length !== totalParams) {
            console.error(`[EnkephalonBridge] Несовпадение параметров: ожидалось ${totalParams}, получено ${weights.length}`);
            return;
        }
        const dataPtr = this._alloc(totalParams * 4);
        // Исправлено: byteOffset должен быть в байтах, не делим на 4
        new Float32Array(this._memory.buffer, dataPtr, totalParams).set(weights);
        this._wasm.brain_import_weights(this._brainPtr, dataPtr, totalParams);
        this._free(dataPtr, totalParams * 4);
        console.log('[EnkephalonBridge] Веса восстановлены из снапшота');
    }

    /** Освободить память Brain при уничтожении */
    destroy() {
        if (this._snapshotInterval) clearInterval(this._snapshotInterval);
        if (this._brainPtr && this._wasm?.brain_free) {
            this._wasm.brain_free(this._brainPtr);
            this._brainPtr = 0;
            this.isReady = false;
        }
    }

    /**
     * Планирование периодического сохранения весов (B-3 / C-2).
     */
    scheduleWeightSnapshot(memoryService, intervalMs = 300000) { // 5 min default
        if (this._snapshotInterval) clearInterval(this._snapshotInterval);
        
        this._snapshotInterval = setInterval(async () => {
            if (!this.isReady) return;
            try {
                const weights = this.exportWeights();
                if (weights) {
                    await memoryService.saveSnapshot(weights);
                    console.log('[EnkephalonBridge] Периодический снапшот весов сохранен.');
                }
            } catch (err) {
                console.warn('[EnkephalonBridge] Ошибка авто-снапшота:', err);
            }
        }, intervalMs);
    }

    _alloc(bytes) {
        if (this._wasm.malloc) return this._wasm.malloc(bytes);
        
        // Slot-аллокатор: 4 фиксированных слота, переиспользуемых по кругу
        if (!this._slots) {
            const base = 512 * 1024; // 512KB — безопасный offset от данных WASM
            const slotSize = 8 * 1024; // 8KB на слот — с запасом для всех наших буферов
            this._slots = [base, base + slotSize, base + slotSize * 2, base + slotSize * 3];
            this._slotIdx = 0;
        }
        
        const ptr = this._slots[this._slotIdx % 4];
        this._slotIdx++;
        return ptr;
    }

    _free(ptr, bytes) {
        if (this._wasm.free) this._wasm.free(ptr, bytes);
        // Slot-аллокатор не требует явного освобождения, так как слоты переиспользуются
    }
}

export const enkephalon = new EnkephalonBridge();
