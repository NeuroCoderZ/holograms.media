// frontend/js/audio/cwtAudioWorklet.js
// NATIVE WASM INTEGRATION FOR AUDIO WORKLET (BasilaQ-127)
// STRICT WASM PROCESSING ONLY. NO JS FALLBACK.

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

// let cachedDataViewMemory0 = null; // Defined above

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
    },
    // Add generic env imports to prevent LinkError if binary expects them
    env: {
        abort: () => console.error("WASM Aborted"),
        emscripten_notify_memory_growth: () => { },
    }
};

class CwtProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.mode = 'INIT';
        this.targetFrequencies = new Float32Array(128);
        this.sampleRate = 48000;
        this._dbgCount = 0;

        const C0 = 16.352; // Sync with Semitones_Angles.md
        for (let i = 0; i < 128; i++) {
            this.targetFrequencies[i] = C0 * Math.pow(2, i / 12);
        }

        this.port.onmessage = async (event) => {
            const { type, module, payload } = event.data;
            console.log(`[CwtProcessor] 📩 Message received: ${type}`);

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
        if (this.mode === 'WASM') return;
        try {
            console.log('[CwtProcessor] 🛠️ Starting WASM Instantiation in Worklet thread...');
            console.log('[CwtProcessor] Module type:', module?.constructor?.name);

            const instance = await WebAssembly.instantiate(module, wasmImports);
            wasm = instance.exports;

            console.log('[CwtProcessor] WASM Instance created. Exports:', Object.keys(wasm).length);

            if (wasm.__wbindgen_start) {
                console.log('[CwtProcessor] Running wbindgen_start...');
                wasm.__wbindgen_start();
            }

            this.mode = 'WASM';
            console.log('[CwtProcessor] ✅ WASM Engine Ready. Signalling main thread.');
            this.port.postMessage({ type: 'WASM_READY' });
        } catch (e) {
            console.error('[CwtProcessor] ❌ WASM Init Error:', e);
            this.mode = 'ERROR';
            this.port.postMessage({ type: 'WASM_ERROR', error: e.message });
        }
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];
        // Pass-through audio if needed
        if (output && input) {
            for (let ch = 0; ch < Math.min(input.length, output.length); ch++) {
                output[ch].set(input[ch]);
            }
        }

        if (!input || !input[0]) return true;

        const left = input[0];
        const right = input.length > 1 ? input[1] : left;

        // --- DIAGNOSTIC LOGGING (Every 1s at 60fps) ---
        if (this._dbgCount++ % 60 === 0) {
            // let sumSq = 0;
            // for (let i = 0; i < left.length; i++) sumSq += left[i] * left[i];
            // const rms = Math.sqrt(sumSq / left.length);
            // Log less frequently to save console space, or only on issue
            // console.log(`[CwtProcessor] 🔊 Audio Flow Check: mode=${this.mode}, RMS=${rms.toFixed(6)}`);
        }

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

                // DATA SHAPING (Degrees -> Normalized)
                for (let i = 0; i < 128; i++) {
                    let deg = resPan[i];
                    if (deg > 90) deg = 90;
                    if (deg < -90) deg = -90;
                    finalPan[i] = deg / 90.0;
                    finalPan[i + 128] = finalPan[i];
                }

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
                this.mode = 'ERROR';
            }
        }

        return true;
    }
}

registerProcessor('cwt-processor', CwtProcessor);
