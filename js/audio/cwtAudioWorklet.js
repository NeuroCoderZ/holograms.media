// frontend/js/audio/cwtAudioWorklet.js
// BasilaQ-127 Engine Wrapper
// STRICT WASM MODE. NO JS MATH.

let wasm = null;
let instance = null;

// Helper to interact with WASM memory
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
        this.mode = 'INIT'; // INIT -> WASM_READY -> RUNNING
        this.analyzerPtr = 0;
        
        // Config from arguments
        const opts = options.processorOptions || {};
        this.sampleRate = opts.sampleRate || 48000;
        this.numBins = opts.numBins || 128;
        this.chunkSize = opts.chunkSize || 1024; // Must match buffer size logic in Rust
        this.channelCount = opts.channelCount || 2;

        this.port.onmessage = async (e) => {
            if (e.data.type === 'WASM_MODULE') {
                await this.initWasm(e.data.module);
            }
        };
    }

    async initWasm(module) {
        try {
            // Imports for WASM (usually standard emscripten/bindgen stuff)
            const imports = {
                env: {
                    abort: () => console.error("WASM Abort"),
                    emscripten_notify_memory_growth: () => { cachedFloat32Memory = null; } 
                },
                wbg: {} // bindgen placeholders if needed
            };

            instance = await WebAssembly.instantiate(module, imports);
            wasm = instance.exports;

            // Initialize the Rust structure (CwtAnalyzer)
            // Assuming the Rust export is named `cwtanalyzer_new`
            if (wasm.cwtanalyzer_new) {
                this.analyzerPtr = wasm.cwtanalyzer_new(this.sampleRate, this.numBins);
                this.mode = 'WASM_READY';
                this.port.postMessage({ type: 'WASM_READY' });
                // console.log(`[CwtWorklet] BasilaQ-127 Engine Active. Ptr: ${this.analyzerPtr}`);
            } else {
                throw new Error("Export 'cwtanalyzer_new' not found in WASM");
            }
        } catch (err) {
            console.error('[CwtWorklet] Critical WASM Error:', err);
            this.port.postMessage({ type: 'WASM_ERROR', error: err.message });
        }
    }

    process(inputs, outputs, parameters) {
        // 1. Check inputs
        const input = inputs[0];
        if (!input || input.length === 0) return true;
        const leftChannel = input[0];
        const rightChannel = input.length > 1 ? input[1] : leftChannel; // Force stereo logic

        // 2. Pass-through audio (so user can hear it)
        const output = outputs[0];
        if (output && output.length > 0) {
            output[0].set(leftChannel);
            if (output[1]) output[1].set(rightChannel);
        }

        // 3. STRICT WASM PROCESSING
        if (this.mode === 'WASM_READY' && this.analyzerPtr !== 0) {
            try {
                const len = leftChannel.length;
                
                // A. Alloc input memory in WASM
                const leftPtr = wasm.__wbindgen_malloc(len * 4);
                const rightPtr = wasm.__wbindgen_malloc(len * 4);
                
                // B. Copy data to WASM
                getFloat32Memory().set(leftChannel, leftPtr / 4);
                getFloat32Memory().set(rightChannel, rightPtr / 4);

                // C. Alloc Output pointers (256 floats for Levels, 128 floats for Pans)
                // Levels: 128 L + 128 R (or specific BasilaQ layout)
                // Pans: 128 angles
                const outLevelsPtr = wasm.__wbindgen_malloc(256 * 4); 
                const outPansPtr = wasm.__wbindgen_malloc(128 * 4);

                // D. EXECUTE (The Heavy Lifting)
                // fn process(ptr, left_in, right_in, len, out_levels, out_pans)
                wasm.cwtanalyzer_process(
                    this.analyzerPtr, 
                    leftPtr, 
                    rightPtr, 
                    len, 
                    outLevelsPtr, 
                    outPansPtr
                );

                // E. Read views (No copy if possible, but here we need to postMessage)
                const levelsView = getFloat32Memory().subarray(outLevelsPtr / 4, outLevelsPtr / 4 + 256);
                const pansView = getFloat32Memory().subarray(outPansPtr / 4, outPansPtr / 4 + 128);

                // Clone data to send to main thread (Float32Array is transferrable but view is tied to WASM memory)
                const levelsData = new Float32Array(levelsView);
                const pansData = new Float32Array(pansView);

                // F. Cleanup Memory
                wasm.__wbindgen_free(leftPtr, len * 4);
                wasm.__wbindgen_free(rightPtr, len * 4);
                wasm.__wbindgen_free(outLevelsPtr, 256 * 4);
                wasm.__wbindgen_free(outPansPtr, 128 * 4);

                // G. Send to Main Thread
                this.port.postMessage({
                    type: 'AUDIO_DATA',
                    levels: levelsData,
                    angles: pansData
                }, [levelsData.buffer, pansData.buffer]); // Transfer buffers for speed

            } catch (e) {
                console.error('[CwtWorklet] Calculation Error:', e);
            }
        }

        return true;
    }
}

registerProcessor('cwt-processor', CwtProcessor);