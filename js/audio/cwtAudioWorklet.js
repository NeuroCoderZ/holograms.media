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
        
        // === БЕЗОПАСНАЯ ИНИЦИАЛИЗАЦИЯ ПОРТА ===
        this.port.onmessage = async (event) => {
            const data = event.data;
            if (data.type === 'WASM_MODULE') {
                this.port.postMessage({ type: 'LOG', msg: 'WASM_MODULE_RECEIVED' });
                try {
                    await this.initWasm(data.module);
                } catch (err) {
                    this.port.postMessage({ 
                        type: 'WASM_ERROR', 
                        error: 'INIT_FAILED: ' + (err.message || 'unknown') 
                    });
                }
            }
        };

        // HANDSHAKE: Notify service that we are ready
        this.port.postMessage({ type: 'WORKLET_READY' });
    }

    async initWasm(module) {
        this.port.postMessage({ type: 'LOG', msg: 'INSTANTIATION_START' });
        try {
            const instance = await WebAssembly.instantiate(module, { 
                env: { 
                    abort: () => { this.port.postMessage({ type: 'LOG', msg: 'WASM_ABORT_CALLED' }); } 
                },
                wbg: { 
                    __wbindgen_init_externref_table: () => {},
                    __wbindgen_placeholder__: () => {},
                    __wbindgen_throw: (ptr, len) => { 
                        this.port.postMessage({ type: 'LOG', msg: 'WASM_THROW_ERROR' }); 
                    },
                    __wbindgen_memory: () => {},
                    __wbindgen_rethrow: () => {},
                    __wbindgen_describe: () => {},
                    __wbindgen_module: () => {}
                }
            });
            
            wasm = instance.exports;
            this.port.postMessage({ type: 'LOG', msg: 'INSTANCE_CREATED' });
            
            // Use global sampleRate
            const currentSR = typeof sampleRate !== 'undefined' ? sampleRate : 48000;
            analyzerPtr = wasm.cwtanalyzer_new(currentSR); 
            
            this.port.postMessage({ type: 'LOG', msg: `ANALYZER_CREATED Ptr:${analyzerPtr} SR:${currentSR}` });

            // Allocate buffers
            ptrs.left = wasm.__wbindgen_malloc(128 * 4);
            ptrs.right = wasm.__wbindgen_malloc(128 * 4);
            ptrs.levels = wasm.__wbindgen_malloc(256 * 4);
            ptrs.pans = wasm.__wbindgen_malloc(128 * 4);

            this._initialized = true;
            this.port.postMessage({ type: 'WASM_READY' });
            this.port.postMessage({ type: 'LOG', msg: 'PIPELINE_FULLY_READY' });
        } catch (err) {
            this.port.postMessage({ 
                type: 'WASM_ERROR', 
                error: 'INSTANTIATION_CRASH: ' + (err.message || 'no message') 
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