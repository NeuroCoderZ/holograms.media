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
    constructor() {
        super();
        this._hb = 0;
        this._initialized = false;
        
        // Robust port initialization with async handling
        this.port.onmessage = async (e) => {
            if (e.data.type === 'WASM_MODULE') {
                try {
                    await this.initWasm(e.data.module);
                } catch (err) {
                    this.port.postMessage({ type: 'WASM_ERROR', error: 'Async Init Error: ' + err.message });
                }
            }
        };

        // HANDSHAKE: Notify service that we are ready to receive the module
        this.port.postMessage({ type: 'WORKLET_READY' });
    }

    async initWasm(module) {
        try {
            const instance = await WebAssembly.instantiate(module, { 
                env: { abort: () => {} },
                wbg: { __wbindgen_init_externref_table: () => {} }
            });
            wasm = instance.exports;
            
            // UNIVERSAL INITIALIZATION: Use the global sampleRate from AudioWorkletGlobalScope
            const currentSR = typeof sampleRate !== 'undefined' ? sampleRate : 48000;
            analyzerPtr = wasm.cwtanalyzer_new(currentSR); 
            
            this.port.postMessage({ type: 'LOG', msg: `WASM Engine Created. Ptr: ${analyzerPtr}, SR: ${currentSR}` });

            // Аллоцируем буферы один раз для переиспользования
            ptrs.left = wasm.__wbindgen_malloc(128 * 4);
            ptrs.right = wasm.__wbindgen_malloc(128 * 4);
            ptrs.levels = wasm.__wbindgen_malloc(256 * 4);
            ptrs.pans = wasm.__wbindgen_malloc(128 * 4);

            this._initialized = true;
            this.port.postMessage({ type: 'WASM_READY' });
        } catch (err) {
            this.port.postMessage({ type: 'WASM_ERROR', error: err.message });
        }
    }

    process(inputs, outputs) {
        const input = inputs[0];
        // stay alive even if not processing, but don't call WASM if not ready
        if (!input || !input[0] || !wasm || !analyzerPtr || !this._initialized) {
            return true; 
        }

        // WORKLET HEARTBEAT
        if (this._hb++ % 100 === 0) {
            this.port.postMessage({ type: 'LOG', msg: 'WORKLET_PULSE: processing active' });
        }

        // Pass-through
        if (outputs[0] && outputs[0][0]) {
            outputs[0][0].set(input[0]);
            if (input[1] && outputs[0][1]) outputs[0][1].set(input[1]);
        }

        try {
            const mem = getFloat32Memory();
            
            // Внимание: input[0] (chunk) может быть 128 семплов (стандарт Worklet).
            // Rust ожидает 128 (CHUNK_SIZE).
            // Если браузер дает другой размер (напр. 256), нужно копировать только 128 или обрабатывать циклом.
            // Пока считаем что 128.
            const len = Math.min(input[0].length, 128);
            
            mem.set(input[0].subarray(0, len), ptrs.left / 4);
            mem.set((input[1] || input[0]).subarray(0, len), ptrs.right / 4);

            // Вызов Rust: process(self, l_ptr, l_len, r_ptr, r_len, lvl_ptr, lvl_len, pan_ptr, pan_len)
            // Важно передавать len, который ожидает bindgen (хотя внутри Rust мб игнорирует и берет 128, но сигнатура важна)
            wasm.cwtanalyzer_process(analyzerPtr, ptrs.left, len, ptrs.right, len, ptrs.levels, 256, ptrs.pans, 128);

            // Копируем данные (НЕ переносим буфер, чтобы не убить WASM)
            const levels = new Float32Array(mem.subarray(ptrs.levels / 4, ptrs.levels / 4 + 256));
            const angles = new Float32Array(mem.subarray(ptrs.pans / 4, ptrs.pans / 4 + 128));

            // DEBUG WASM OUTPUT
            if (this._hb % 100 === 0) {
                const sumLevels = levels.reduce((a, b) => a + b, 0);
                this.port.postMessage({ 
                    type: 'LOG', 
                    msg: `WASM_OUTPUT: Sum of levels: ${sumLevels.toFixed(2)}` 
                });
            }

            this.port.postMessage({ type: 'AUDIO_DATA', levels, angles });
        } catch (e) {
            // console.error(e); // Uncomment for debug if needed
        }

        return true;
    }
}
registerProcessor('cwt-processor', CwtProcessor);