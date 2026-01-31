// frontend/js/audio/cwtAudioWorklet.js
// NATIVE WASM INTEGRATION FOR AUDIO WORKLET (Basilar-127)

let wasm;
let cachedUint8ArrayMemory0 = null;
let cachedFloat32ArrayMemory0 = null;
let cachedDataViewMemory0 = null;

// --- Memory Access Helpers ---
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let WASM_VECTOR_LEN = 0;

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

// --- IMPORTS OBJECT for WASM ---
const wasmImports = {
    __wbindgen_placeholder__: {},
    wbg: {
        __wbindgen_init_externref_table: function () {
            // Placeholder for wasm-bindgen 0.2.108
        },
        __wbindgen_throw: function (arg0, arg1) {
            throw new Error('WASM Error');
        }
    }
};

class CwtProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.mode = 'INIT';
        this.targetFrequencies = new Float32Array(128);
        this.sampleRate = 48000;

        // JS Fallback State
        this.levels = new Float32Array(256).fill(-100);
        this.pans = new Float32Array(256).fill(0);
        this.smoothLevels = new Float32Array(256).fill(-100);

        const A0 = 27.5;
        for (let i = 0; i < 128; i++) {
            this.targetFrequencies[i] = A0 * Math.pow(2, i / 12);
        }

        this.port.onmessage = async (event) => {
            const { type, module, payload } = event.data;
            if (type === 'WASM_MODULE') {
                this._initWasm(module);
            } else if (type === 'CONFIG') {
                if (payload && payload.targetFrequencies) {
                    this.targetFrequencies = new Float32Array(payload.targetFrequencies);
                }
            }
        };
    }

    async _initWasm(module) {
        try {
            console.log('[CwtProcessor] Instantiating Native WASM...');
            const instance = await WebAssembly.instantiate(module, wasmImports);
            wasm = instance.exports;
            if (wasm.__wbindgen_start) wasm.__wbindgen_start();
            this.mode = 'WASM';
            this.port.postMessage({ type: 'WASM_READY' });
        } catch (e) {
            console.error('[CwtProcessor] WASM Init Error:', e);
            this.mode = 'JS';
        }
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        if (!input || !input[0]) return true;

        if (output) {
            for (let ch = 0; ch < Math.min(input.length, output.length); ch++) {
                output[ch].set(input[ch]);
            }
        }

        const left = input[0];
        const right = input.length > 1 ? input[1] : left;

        if (this.mode === 'WASM' && wasm) {
            try {
                // 1. Prepare Inputs
                const ptrLeft = passArrayF32ToWasm0(left, wasm.__wbindgen_malloc);
                const lenLeft = WASM_VECTOR_LEN;
                const ptrRight = passArrayF32ToWasm0(right, wasm.__wbindgen_malloc);
                const lenRight = WASM_VECTOR_LEN;
                const ptrFreqs = passArrayF32ToWasm0(this.targetFrequencies, wasm.__wbindgen_malloc);
                const lenFreqs = WASM_VECTOR_LEN;

                // 2. Prepare Outputs
                const ptrDb = wasm.__wbindgen_malloc(256 * 4, 4) >>> 0;
                const ptrPan = wasm.__wbindgen_malloc(128 * 4, 4) >>> 0;

                // 3. Native Call
                wasm.encode_audio_to_hologram(ptrLeft, lenLeft, ptrRight, lenRight, this.sampleRate, ptrFreqs, lenFreqs, ptrDb, 256, ptrPan, 128);

                // 4. Read Results
                const resDb = getFloat32ArrayMemory0().subarray(ptrDb / 4, ptrDb / 4 + 256);
                const resPan = getFloat32ArrayMemory0().subarray(ptrPan / 4, ptrPan / 4 + 128);

                const finalDb = new Float32Array(resDb);
                const finalPan = new Float32Array(256);
                finalPan.set(resPan);

                // Free
                if (wasm.__wbindgen_free) {
                    wasm.__wbindgen_free(ptrLeft, lenLeft * 4, 4);
                    wasm.__wbindgen_free(ptrRight, lenRight * 4, 4);
                    wasm.__wbindgen_free(ptrFreqs, lenFreqs * 4, 4);
                    wasm.__wbindgen_free(ptrDb, 256 * 4, 4);
                    wasm.__wbindgen_free(ptrPan, 128 * 4, 4);
                }

                this.port.postMessage({ type: 'AUDIO_DATA', levels: finalDb, angles: finalPan });
            } catch (e) {
                console.error('[CwtProcessor] Native WASM Execution Error:', e);
                this.mode = 'JS';
            }
        }

        if (this.mode === 'JS') this._processJS(left, right);
        return true;
    }

    _processJS(left, right) {
        let sumSq = 0;
        for (let i = 0; i < left.length; i++) sumSq += left[i] * left[i];
        const rms = Math.sqrt(sumSq / left.length);
        const db = 20 * Math.log10(rms + 1e-6);
        for (let i = 0; i < 128; i++) {
            const weighting = 1.0 - (i / 140);
            let targetDb = db * weighting;
            if (targetDb > -60) targetDb += (Math.random() * 10 - 5);
            this.smoothLevels[i] = this.smoothLevels[i] * 0.8 + targetDb * 0.2;
            this.levels[i] = Math.max(-128, this.smoothLevels[i]);
            this.levels[i + 128] = Math.max(-128, this.smoothLevels[i]);
        }
        this.port.postMessage({ type: 'AUDIO_DATA', levels: this.levels, angles: this.pans });
    }
}

registerProcessor('cwt-processor', CwtProcessor);
