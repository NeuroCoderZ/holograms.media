// frontend/js/audio/cwtAudioWorklet.js
// STRICT WASM MODE. NO JS FALLBACK.

let wasm = null;
let cachedFloat32Memory = null;

function getFloat32Memory() {
    if (!cachedFloat32Memory || cachedFloat32Memory.buffer.byteLength === 0) {
        cachedFloat32Memory = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32Memory;
}

class CwtProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.mode = 'INIT';
        this.analyzerPtr = 0;
        const opts = options.processorOptions || {};
        this.sampleRate = opts.sampleRate || 48000;

        this.port.onmessage = async (e) => {
            if (e.data.type === 'WASM_MODULE') await this.initWasm(e.data.module);
        };
    }

    async initWasm(module) {
        try {
            const instance = await WebAssembly.instantiate(module, { 
                env: { abort: () => console.error("WASM Abort") },
                wbg: { __wbindgen_init_externref_table: () => {} }
            });
            wasm = instance.exports;

            // FIX: Rust constructor only takes 1 argument: sample_rate
            if (wasm.cwtanalyzer_new) {
                this.analyzerPtr = wasm.cwtanalyzer_new(this.sampleRate);
                this.mode = 'WASM_READY';
                this.port.postMessage({ type: 'WASM_READY' });
                this.port.postMessage({ type: 'LOG', msg: 'WASM Constructor Success' });
            } else {
                throw new Error("cwtanalyzer_new not found");
            }
        } catch (err) {
            this.port.postMessage({ type: 'WASM_ERROR', error: err.message });
        }
    }

    process(inputs, outputs) {
        const input = inputs[0];
        if (!input || input.length === 0 || this.mode !== 'WASM_READY') return true;

        const left = input[0];
        const right = input.length > 1 ? input[1] : left;

        // Pass-through
        if (outputs[0] && outputs[0][0]) {
            outputs[0][0].set(left);
            if (outputs[0][1]) outputs[0][1].set(right);
        }

        try {
            const len = left.length;
            // Direct memory management
            const leftPtr = wasm.__wbindgen_malloc(len * 4);
            const rightPtr = wasm.__wbindgen_malloc(len * 4);
            const outLvlPtr = wasm.__wbindgen_malloc(256 * 4);
            const outPanPtr = wasm.__wbindgen_malloc(128 * 4);

            getFloat32Memory().set(left, leftPtr / 4);
            getFloat32Memory().set(right, rightPtr / 4);

            // Signature: self, l_ptr, l_len, r_ptr, r_len, lvl_ptr, lvl_len, pan_ptr, pan_len
            wasm.cwtanalyzer_process(this.analyzerPtr, leftPtr, len, rightPtr, len, outLvlPtr, 256, outPanPtr, 128);

            const levels = new Float32Array(getFloat32Memory().subarray(outLvlPtr / 4, outLvlPtr / 4 + 256));
            const pans = new Float32Array(getFloat32Memory().subarray(outPanPtr / 4, outPanPtr / 4 + 128));

            wasm.__wbindgen_free(leftPtr, len * 4);
            wasm.__wbindgen_free(rightPtr, len * 4);
            wasm.__wbindgen_free(outLvlPtr, 256 * 4);
            wasm.__wbindgen_free(outPanPtr, 128 * 4);

            this.port.postMessage({ type: 'AUDIO_DATA', levels, angles: pans }, [levels.buffer, pans.buffer]);

        } catch (e) {
            // Error reporting from inside worklet
            this.port.postMessage({ type: 'LOG', msg: 'Process Error: ' + e.message });
        }

        return true;
    }
}
registerProcessor('cwt-processor', CwtProcessor);
