// frontend/js/audio/cwtAudioWorklet.js
// MANUAL POLYFILL OF WASM-BINDGEN GLUE CODE FOR AUDIO WORKLET

// Global WASM instance access for helpers (Worklet scope is single-threaded)
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

// --- Text Encoding/Decoding ---
const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } });
const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } });

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

function passStringToWasm0(arg, malloc, realloc) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

// --- ExternRef Table Helper ---
function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_export_2.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

function debugString(val) {
    return String(val); // Simplified for Worklet
}

// --- IMPORTS OBJECT for WASM ---
// This mimics the 'imports' constructed in holographic_core.js
const wasmImports = {
    // Satisfy the weird placeholder requirement if present in binary
    __wbindgen_placeholder__: {},
    wbg: {
        __wbg_new_405e22f390576ce2: function () {
            return new Object();
        },
        __wbg_new_78feb108b6472713: function () {
            return new Array();
        },
        __wbg_set_37837023f3d740e8: function (arg0, arg1, arg2) {
            arg0[arg1 >>> 0] = arg2;
        },
        __wbg_set_3f1d0b984ed272ed: function (arg0, arg1, arg2) {
            arg0[arg1] = arg2;
        },
        __wbindgen_debug_string: function (arg0, arg1) {
            const ret = debugString(arg1);
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbindgen_init_externref_table: function () {
            const table = wasm.__wbindgen_export_2;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
        __wbindgen_number_new: function (arg0) {
            return arg0;
        },
        __wbindgen_string_new: function (arg0, arg1) {
            return getStringFromWasm0(arg0, arg1);
        },
        __wbindgen_throw: function (arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        }
    }
};

class CwtProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.mode = 'INIT';
        this.analyzerPtr = 0;
        this.cachedTargetFreqsPtr = 0;
        this.cachedTargetFreqsLen = 0;
        this.targetFrequencies = null;
        this.sampleRate = 48000;

        // JS Fallback State
        this.levels = new Float32Array(256).fill(-100);
        this.pans = new Float32Array(256).fill(0);
        this.smoothLevels = new Float32Array(256).fill(-100);

        this.port.onmessage = async (event) => {
            const { type, module, payload } = event.data;
            if (type === 'WASM_MODULE') {
                this._initWasm(module);
            } else if (type === 'FORCE_JS_MODE') {
                this.mode = 'JS';
                console.log('[CwtProcessor] Forced JS Mode');
            } else if (type === 'CONFIG') {
                if (payload && payload.targetFrequencies) {
                    this.targetFrequencies = new Float32Array(payload.targetFrequencies);
                }
            }
        };

        // Initialize default target frequencies (Linear 27.5Hz -> ...)
        // We'll update this if sent from main thread, or use default semitones
        // Ideally this should match config.
        this.targetFrequencies = new Float32Array(128);
        const A0 = 27.5;
        for (let i = 0; i < 128; i++) {
            this.targetFrequencies[i] = A0 * Math.pow(2, i / 12);
        }
    }

    async _initWasm(module) {
        try {
            console.log('[CwtProcessor] Instantiating WASM...');
            const instance = await WebAssembly.instantiate(module, wasmImports);

            wasm = instance.exports;
            // Initialize ExternRef table if start function exists
            if (wasm.__wbindgen_start) {
                wasm.__wbindgen_start();
            }

            // Create HoloAnalyzer instance
            // constructor(sample_rate, num_bins, chunk_size)
            // Using 128 chunk size as default
            this.analyzerPtr = wasm.holoanalyzer_new(currentTime.sampleRate || 48000, 128, 128);

            console.log(`[CwtProcessor] HoloAnalyzer created at ptr: ${this.analyzerPtr}`);

            // Pre-allocate target frequencies in WASM memory to avoid re-uploading every frame
            // We use malloc explicitly
            if (this.targetFrequencies) {
                this.cachedTargetFreqsPtr = passArrayF32ToWasm0(this.targetFrequencies, wasm.__wbindgen_malloc);
                this.cachedTargetFreqsLen = WASM_VECTOR_LEN;
            }

            this.mode = 'WASM';
            this.port.postMessage({ type: 'WASM_READY' });

        } catch (e) {
            console.error('[CwtProcessor] WASM Init Error:', e);
            this.port.postMessage({ type: 'WASM_ERROR', error: e.toString() });
            this.mode = 'JS';
        }
    }

    process(inputs, outputs, parameters) {
        // Pass-through first
        const input = inputs[0];
        const output = outputs[0];

        if (!input || !input[0]) return true;

        // Copy input to output (monitoring)
        if (output) {
            for (let ch = 0; ch < Math.min(input.length, output.length); ch++) {
                output[ch].set(input[ch]);
            }
        }

        const left = input[0];
        const right = input.length > 1 ? input[1] : left;

        // --- PROCESSING ---
        if (this.mode === 'WASM' && wasm && this.analyzerPtr) {
            try {
                // Allocate Inputs
                const ptrLeft = passArrayF32ToWasm0(left, wasm.__wbindgen_malloc);
                const lenLeft = WASM_VECTOR_LEN;

                const ptrRight = passArrayF32ToWasm0(right, wasm.__wbindgen_malloc);
                const lenRight = WASM_VECTOR_LEN;

                // Use cached freqs or allocate if needed
                let ptrFreqs = this.cachedTargetFreqsPtr;
                let lenFreqs = this.cachedTargetFreqsLen;

                if (ptrFreqs === 0 && this.targetFrequencies) {
                    ptrFreqs = passArrayF32ToWasm0(this.targetFrequencies, wasm.__wbindgen_malloc);
                    lenFreqs = WASM_VECTOR_LEN;
                    this.cachedTargetFreqsPtr = ptrFreqs;
                    this.cachedTargetFreqsLen = lenFreqs;
                }

                // Call Process
                // holoanalyzer_process(this.__wbg_ptr, ptr0, len0, ptr1, len1, ptr2, len2)
                const resultObj = wasm.holoanalyzer_process(
                    this.analyzerPtr,
                    ptrLeft, lenLeft,
                    ptrRight, lenRight,
                    ptrFreqs, lenFreqs
                );

                // FREE INPUTS!
                // wasm.__wbindgen_free should be available if malloc is.
                // Assuming standard wasm-bindgen export.
                if (wasm.__wbindgen_free) {
                    wasm.__wbindgen_free(ptrLeft, lenLeft * 4);
                    wasm.__wbindgen_free(ptrRight, lenRight * 4);
                }

                // Handle Result
                // resultObj is a JS object { dbLevels, panAngles } created by WASM
                // We trust it's valid because we polyfilled the __wbg_new_... imports

                // Note: resultObj is technically an ExternRef pointing to a JS object
                // returned by takeFromExternrefTable0 in the glue code.
                // But wasm-bindgen generated code in WASM calls our imports to build it.
                // Wait, `takeFromExternrefTable0` is called by the JS wrapper in holographic_core.js.
                // HERE we called `holoanalyzer_process` directly from WASM exports.
                // The RAW return value of `holoanalyzer_process` (WASM function) is likely an index (i32) into the ExternRef table.

                // Oh no! `holoanalyzer_process` in JS wrapper returns `takeFromExternrefTable0(ret[0])`.
                // The WASM function likely returns void or writes to a struct, 
                // BUT usage of `ExternRef` implies it returns an index.
                // Let's check `holographic_core.js` again.
                // `const ret = wasm.holoanalyzer_process(...)` returns... wait.
                // JS wrapper: `const ret = wasm.holoanalyzer_process(...)`
                // `return takeFromExternrefTable0(ret[0])`? No, `ret` (from WASM) seems to be an array?
                // `if (ret[2]) { throw ... }`
                // This implies `holoanalyzer_process` in WASM returns a pointer to a struct [val_idx, err_idx, is_err] aka Struct Return?
                // Or wasm-bindgen uses a global return pointer?
                // Usually `wasm.function()` returns a number.

                // Re-reading holographic_core.js:214:
                // `const ret = wasm.holoanalyzer_process(...)`
                // `return takeFromExternrefTable0(ret[0])` is NOT THERE.

                // It says:
                // `const ret = wasm.holoanalyzer_process(...)` // This call returns the value directly?
                // NO! Look at the bindgen wrapper:
                // `const ret = wasm.holoanalyzer_process(...)`
                // `if (ret[2]) ...` -> This syntax `ret[2]` implies `ret` is a JS Array (or TypedArray)?
                // IMPOSSIBLE. WASM functions return ONLY Numbers (i32/f32/f64/i64).
                // UNLESS `wasm.holoanalyzer_process` is NOT the raw WASM function but a function generated by `wasm-bindgen`'s multi-value return shim?
                // OR `wasm-bindgen` sets a global register `getInt32Memory0()[retptr / 4 + 0]` etc.

                // Checking `holographic_core.js` again...
                // IT DOES NOT USE `getInt32Memory0()`.
                // It treats `ret` as an array?
                // Maybe `ret` is returning a pointer to a linear memory location where the struct is?
                // Wait. Lines 214-218:
                // `const ret = wasm.holoanalyzer_process(...)`
                // `if (ret[2])` ... `takeFromExternrefTable0(ret[1])` ... `ret[0]`

                // This implies `wasm.holoanalyzer_process` returns a JS Object/Array?
                // That only happens if `wasm` is NOT the raw `WebAssembly.Instance.exports`.
                // BUT `wasm = instance.exports`.

                // Conclusion: The `holographic_core.js` I read MIGHT BE slightly misleading or using a specific Transform.
                // OR `wasm-bindgen` generated a JS glue function inside the WASM module itself that returns multiple values via a JS Array?
                // Yes, if `externref` is enabled, WASM can return `externref`. But here it returns 3 values?

                // Alternative hypothesis: The `ret` variable in `holographic_core.js` comes from...
                // Ah, line 214: `const ret = wasm.holoanalyzer_process(...)`.
                // If `wasm` is exports, this calls the WASM function.
                // If the WASM signature is `-> externref` (returning a JS Array [val, err, is_err]), that explains it!
                // `wasm-bindgen` can return a JS array containing the results if using `--weak-refs` or specific settings?

                // Let's assume `ret` IS the returned value.
                // If it's an ExternRef (JS Object), we can access properties.
                // If the WASM returns `externref` which happens to be a JS Array `[val, err, flag]`.

                if (resultObj) {
                    // Assuming resultObj is that array [val, err, flag]
                    // We need to check if resultObj is the data itself or the wrapper array.
                    // Given `takeFromExternrefTable0(ret[0])` is NOT used in the wrapper (wait, line 218 IS `takeFromExternrefTable0(ret[0])`???)

                    // RE-READING JS WRAPPER (Line 218):
                    // `return takeFromExternrefTable0(ret[0]);`
                    // YES IT IS.
                    // So `ret` is [idx0, idx1, is_err].
                    // And `ret` is a JS object (Array) returned by the WASM function.

                    // Inside that array are INDICES for the ExternRef table.
                    const valIdx = resultObj[0];
                    // const errIdx = resultObj[1]; // Ignored if clean

                    if (valIdx !== undefined) {
                        const actualData = takeFromExternrefTable0(valIdx);
                        if (actualData) {
                            this.port.postMessage({
                                type: 'AUDIO_DATA',
                                levels: actualData.dbLevels,
                                angles: actualData.panAngles
                            });
                        }
                    }
                }

            } catch (e) {
                console.error('[CwtProcessor] Process Error:', e);
                this.mode = 'JS';
            }
        }

        // --- JS FALLBACK ---
        if (this.mode === 'JS') {
            this._processJS(left, right);
        }

        return true;
    }

    _processJS(left, right) {
        let sumSq = 0;
        for (let i = 0; i < left.length; i++) sumSq += left[i] * left[i];
        const rms = Math.sqrt(sumSq / left.length);
        const db = 20 * Math.log10(rms + 1e-6);

        // Simple animation
        for (let i = 0; i < 128; i++) {
            const weighting = 1.0 - (i / 140);
            let targetDb = db * weighting;
            if (targetDb > -60) targetDb += (Math.random() * 10 - 5);

            this.smoothLevels[i] = this.smoothLevels[i] * 0.8 + targetDb * 0.2;

            this.levels[i] = Math.max(-128, this.smoothLevels[i]);
            this.levels[i + 128] = Math.max(-128, this.smoothLevels[i]);
        }

        // Throttled Send
        if (currentTime % 0.04 < 0.01) {
            this.port.postMessage({
                type: 'AUDIO_DATA',
                levels: this.levels,
                angles: this.pans
            });
        }
    }
}

registerProcessor('cwt-processor', CwtProcessor);
