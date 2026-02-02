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
        this._dbgCount = 0;

        // Circular Buffer for JS Fallback (Spectral Resolution)
        this.circBuffer = new Float32Array(4096);
        this.writePtr = 0;

        // JS Fallback State
        this.levels = new Float32Array(256).fill(-100);
        this.pans = new Float32Array(256).fill(0);
        this.smoothLevels = new Float32Array(256).fill(-100);

        const C0 = 16.352; // Sync with Semitones_Angles.md
        for (let i = 0; i < 128; i++) {
            this.targetFrequencies[i] = C0 * Math.pow(2, i / 12);
            // --- BasilaQ-127: Psychoacoustic Panorama (Gibson's Hemispheres Model) ---
            // User Vision: Two cylinders around the head.
            // Left Hemisphere (Purple): 0 to -180 deg (Mapped to Renderer X: -1.0)
            // Right Hemisphere (Red): 0 to +180 deg (Mapped to Renderer X: 1.0)
            // Current Algo: 180 deg (Low Freq, Left) -> 0 deg (High Freq, Center/Right)
            // Renderer expects -1.0 (Left) to 1.0 (Right).
            const deg = 180.0 - (i * 1.40625);
            this.pans[i] = (deg - 90.0) / -90.0; // 180deg -> -1.0; 0deg -> 1.0
            this.pans[i + 128] = this.pans[i];
        }

        this.port.onmessage = async (event) => {
            const { type, module, payload } = event.data;
            if (type === 'WASM_MODULE') {
                this._initWasm(module);
            } else if (type === 'FORCE_JS_MODE') {
                console.log('[CwtProcessor] Forced to JS mode via message.');
                this.mode = 'JS';
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
            this.mode = 'JS';
            this.port.postMessage({ type: 'WASM_ERROR', error: e.message });
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

        // --- DIAGNOSTIC LOGGING (Every 1s at 60fps) ---
        if (this._dbgCount++ % 60 === 0) {
            let sumSq = 0;
            for (let i = 0; i < left.length; i++) sumSq += left[i] * left[i];
            const rms = Math.sqrt(sumSq / left.length);
            console.log(`[CwtProcessor] 🔊 Audio Flow Check: mode=${this.mode}, RMS=${rms.toFixed(6)}`);
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

        if (this.mode === 'JS') {
            // Fill circular buffer
            for (let i = 0; i < left.length; i++) {
                this.circBuffer[this.writePtr] = left[i];
                this.writePtr = (this.writePtr + 1) % 4096;
            }

            // OPTIMIZATION: Process at ~60fps instead of ~375fps
            // 48000 / 60 = 800 samples. 
            if (!this._sampleCounter) this._sampleCounter = 0;
            this._sampleCounter += left.length;

            if (this._sampleCounter >= 800) {
                this._processJS();
                this._sampleCounter = 0;
            }
        }
        return true;
    }

    _processJS() {
        const N = 2048; // Window size for Goertzel
        const TWO_PI = 2 * Math.PI;

        // Extract latest N samples from circular buffer and apply Hanning Window
        const window = new Float32Array(N);
        for (let i = 0; i < N; i++) {
            const idx = (this.writePtr - N + i + 4096) % 4096;
            // Hanning Window: 0.5 * (1 - cos(2*PI*i / (N-1)))
            // Reduces spectral leakage, making columns move independently (asynchronously)
            const winValue = 0.5 * (1 - Math.cos((TWO_PI * i) / (N - 1)));
            window[i] = this.circBuffer[idx] * winValue;
        }

        for (let i = 0; i < 128; i++) {
            const targetFreq = this.targetFrequencies[i];
            const k = (N * targetFreq) / this.sampleRate;
            const omega = (TWO_PI * k) / N;
            const cosine = Math.cos(omega);
            const coeff = 2 * cosine;

            let q1 = 0;
            let q2 = 0;

            for (let j = 0; j < N; j++) {
                let q0 = window[j] + coeff * q1 - q2;
                q2 = q1;
                q1 = q0;
            }

            const power = q1 * q1 + q2 * q2 - coeff * q1 * q2;
            const magnitude = Math.sqrt(Math.max(0, power));

            // Convert to dB. Normalization by N/2
            const rawDb = 20 * Math.log10((magnitude / (N / 2)) + 1e-6);

            // Tight smoothing for JS mode to prevent jitter
            this.smoothLevels[i] = this.smoothLevels[i] * 0.6 + rawDb * 0.4;

            this.levels[i] = Math.max(-128, this.smoothLevels[i]);
            this.levels[i + 128] = this.levels[i];
            // this.pans[i] defaults from constructor, can be modulated by AudioGestureBridge later
        }

        this.port.postMessage({ type: 'AUDIO_DATA', levels: this.levels, angles: this.pans });
    }
}

registerProcessor('cwt-processor', CwtProcessor);
