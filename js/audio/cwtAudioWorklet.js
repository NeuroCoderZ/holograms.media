// frontend/js/audio/cwtAudioWorklet.js
// BasilaQ-127 Engine
// STRICT WASM MODE.

let wasm = null;
let analyzerPtr = 0;
let cachedFloat32Memory = null;

// Пред-аллокация указателей (reuse)
let ptrs = { left: 0, right: 0, levels: 0, pans: 0 };

function getFloat32Memory() {
    if (!cachedFloat32Memory || cachedFloat32Memory.buffer.byteLength === 0) {
        cachedFloat32Memory = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32Memory;
}

class CwtProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this._hb = 0;
        this._initialized = false;

        // Configuration from service
        this._sampleRate = options.processorOptions.sampleRate || 48000;
        this._targetFps = options.processorOptions.targetFps || 60;

        console.log(`[CwtWorklet] Initialized with SR: ${this._sampleRate}, FPS: ${this._targetFps}`);

        // === БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ ПОРТА ===
        this.port.onmessage = async (event) => {
            const data = event.data;
            if (data.type === 'WASM_BUFFER') {
                this.port.postMessage({ type: 'LOG', msg: 'WASM_BUFFER_RECEIVED' });
                try {
                    await this.initWasm(data.buffer);
                } catch (err) {
                    this.port.postMessage({
                        type: 'WASM_ERROR',
                        error: 'INIT_FAILED: ' + (err.message || 'unknown')
                    });
                }
            } else if (data.type === 'SET_FPS' && wasm && analyzerPtr) {
                // Динамическое обновление FPS для адаптации под частоту экрана
                const newFps = data.fps;
                if (newFps > 0 && wasm.cwtanalyzer_set_fps) {
                    wasm.cwtanalyzer_set_fps(analyzerPtr, newFps);
                    this._targetFps = newFps;
                    this.port.postMessage({ type: 'LOG', msg: `FPS updated to: ${newFps}` });
                }
            }
        };

        // HANDSHAKE: Notify service that we are ready
        this.port.postMessage({ type: 'WORKLET_READY' });
    }

    async initWasm(buffer) {
        this.port.postMessage({ type: 'LOG', msg: 'INSTANTIATION_START (from buffer)' });
        try {
            // ✅ ПРАВИЛЬНАЯ инициализация для чистого WASM (без wasm-bindgen)
            const result = await WebAssembly.instantiate(buffer, {
                env: {
                    abort: () => { this.port.postMessage({ type: 'LOG', msg: 'WASM_ABORT_CALLED' }); },
                    // Support standard C library names if needed
                    malloc: (size) => wasm.malloc(size),
                    free: (ptr, size) => wasm.free(ptr, size)
                }
            });

            wasm = result.instance.exports;

            // Проверка экспортов
            if (!wasm.cwtanalyzer_new || !wasm.cwtanalyzer_process) {
                throw new Error('Required WASM exports not found (cwtanalyzer_new/process)');
            }

            // Pass SR and FPS to constructor
            analyzerPtr = wasm.cwtanalyzer_new(this._sampleRate, this._targetFps);

            if (!analyzerPtr) {
                throw new Error('cwtanalyzer_new returned null');
            }

            this.port.postMessage({
                type: 'LOG',
                msg: `WASM Engine Created. Ptr: ${analyzerPtr}, SR: ${this._sampleRate}, FPS: ${this._targetFps}`
            });

            // Allocate buffers (Using the new malloc export)
            ptrs.left = wasm.malloc(128 * 4);
            ptrs.right = wasm.malloc(128 * 4);
            ptrs.levels = wasm.malloc(256 * 4);
            ptrs.pans = wasm.malloc(128 * 4);

            this._initialized = true;
            this.port.postMessage({ type: 'WASM_READY' });
            this.port.postMessage({ type: 'LOG', msg: 'PIPELINE_FULLY_READY' });
        } catch (err) {
            this.port.postMessage({
                type: 'WASM_ERROR',
                error: 'INIT_FAILED: ' + (err.message || 'unknown error')
            });
        }
    }

    process(inputs, outputs) {
        const input = inputs[0];

        // HEARTBEAT even if not ready
        if (this._hb++ % 100 === 0) {
            this.port.postMessage({
                type: 'LOG',
                msg: `PULSE ready=${this._initialized} wasm=${!!wasm} input=${!!input && !!input[0]}`
            });
        }

        if (!input || !input[0] || !wasm || !analyzerPtr || !this._initialized) {
            return true;
        }

        // Pass-through
        if (outputs[0] && outputs[0][0]) {
            outputs[0][0].set(input[0]);
            if (input[1] && outputs[0][1]) outputs[0][1].set(input[1]);
        }

        try {
            const mem = getFloat32Memory();
            const len = Math.min(input[0].length, 128);

            mem.set(input[0].subarray(0, len), ptrs.left / 4);
            mem.set((input[1] || input[0]).subarray(0, len), ptrs.right / 4);

            wasm.cwtanalyzer_process(analyzerPtr, ptrs.left, len, ptrs.right, len, ptrs.levels, 256, ptrs.pans, 128);

            const levels = new Float32Array(mem.subarray(ptrs.levels / 4, ptrs.levels / 4 + 256));
            const angles = new Float32Array(mem.subarray(ptrs.pans / 4, ptrs.pans / 4 + 128));

            this.port.postMessage({ type: 'AUDIO_DATA', levels, angles });
        } catch (e) {
            // Silently swallow to keep the worklet alive
        }

        return true;
    }
}

registerProcessor('cwt-processor', CwtProcessor);
