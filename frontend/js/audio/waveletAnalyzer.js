// frontend/js/audio/waveletAnalyzer.js

// Path to the WASM module, assuming it's in 'js/wasm/' relative to where the main script (or HTML) is served.
// Adjust if your build process places it elsewhere.
const WASM_MODULE_PATH = './wasm/fastcwt.wasm'; // Or '/js/wasm/fastcwt.wasm' depending on server root

class WaveletAnalyzerProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super(options);
        this.wasmModule = null;
        this.wasmMemory = null;
        this._processAudioData = null; // Function pointer for WASM _process_audio_data
        this._malloc = null;          // Function pointer for WASM _malloc
        this._free = null;            // Function pointer for WASM _free

        this.chunkSize = options.processorOptions.chunkSize || 2048; // Default if not provided
        this.targetFrequencies = options.processorOptions.targetFrequencies || []; // Expecting 130 frequencies

        if (this.targetFrequencies.length !== 130) {
            console.error(`WaveletAnalyzerProcessor: Expected 130 target frequencies, got ${this.targetFrequencies.length}. Analysis may be incorrect.`);
        }

        this.dbLevelsOutputPtr = null;
        this.panAnglesOutputPtr = null;
        this.targetFrequenciesPtr = null;
        this.leftChannelInputPtr = null;
        this.rightChannelInputPtr = null;

        this.loadWasmModule();

        this.port.onmessage = (event) => {
            if (event.data.type === 'updateTargetFrequencies') {
                this.targetFrequencies = event.data.frequencies;
                if (this.targetFrequencies.length !== 130) {
                    console.warn(`WaveletAnalyzerProcessor: Updated target frequencies length is ${this.targetFrequencies.length}, expected 130.`);
                }
                // If WASM is loaded and memory is allocated, update the frequency buffer in WASM memory
                if (this.wasmModule && this.targetFrequenciesPtr && this._malloc) {
                    this.updateWasmTargetFrequencies();
                }
            }
        };
    }

    async loadWasmModule() {
        try {
            const response = await fetch(WASM_MODULE_PATH);
            const bytes = await response.arrayBuffer();
            const { instance, module } = await WebAssembly.instantiate(bytes, {
                env: {
                    // Emscripten usually provides these if needed by the C code (like abort, etc.)
                    // If your C++ code uses external functions not provided by Emscripten by default,
                    // they need to be defined here. For FFTW and standard C++, this is typically not needed.
                }
            });

            this.wasmModule = instance;
            this.wasmMemory = this.wasmModule.exports.memory; // Accessing exported memory

            // Get exported functions
            this._processAudioData = this.wasmModule.exports._process_audio_data;
            this._malloc = this.wasmModule.exports._malloc;
            this._free = this.wasmModule.exports._free;

            if (!this._processAudioData || !this._malloc || !this._free) {
                 console.error('WaveletAnalyzerProcessor: Critical WASM functions not found after loading.');
                 this.port.postMessage({ type: 'error', message: 'Failed to link critical WASM functions.' });
                 return;
            }

            // Allocate memory in the WASM heap for inputs and outputs
            // These pointers will be stable for the lifetime of this processor instance
            this.leftChannelInputPtr = this._malloc(this.chunkSize * Float32Array.BYTES_PER_ELEMENT);
            this.rightChannelInputPtr = this._malloc(this.chunkSize * Float32Array.BYTES_PER_ELEMENT);
            this.targetFrequenciesPtr = this._malloc(130 * Float32Array.BYTES_PER_ELEMENT);
            this.dbLevelsOutputPtr = this._malloc(260 * Float32Array.BYTES_PER_ELEMENT); // 130 L + 130 R
            this.panAnglesOutputPtr = this._malloc(130 * Float32Array.BYTES_PER_ELEMENT);

            if (!this.leftChannelInputPtr || !this.rightChannelInputPtr || !this.targetFrequenciesPtr || !this.dbLevelsOutputPtr || !this.panAnglesOutputPtr) {
                console.error('WaveletAnalyzerProcessor: Failed to allocate memory in WASM heap.');
                this.port.postMessage({ type: 'error', message: 'WASM memory allocation failed.' });
                // Consider freeing any partially allocated buffers if robust error handling is needed
                return;
            }

            this.updateWasmTargetFrequencies(); // Initial population of frequencies

            this.port.postMessage({ type: 'wasmLoaded' });
            console.log('WaveletAnalyzerProcessor: WASM module loaded and memory allocated successfully.');

        } catch (e) {
            console.error('WaveletAnalyzerProcessor: Error loading WASM module.', e);
            this.port.postMessage({ type: 'error', message: `WASM loading failed: ${e.toString()}` });
        }
    }

    updateWasmTargetFrequencies() {
        if (this.wasmModule && this.targetFrequenciesPtr && this.targetFrequencies.length > 0) {
            const wasmHeapF32 = new Float32Array(this.wasmMemory.buffer, this.targetFrequenciesPtr, this.targetFrequencies.length);
            wasmHeapF32.set(this.targetFrequencies);
        }
    }

    process(inputs, outputs, parameters) {
        if (!this.wasmModule || !this._processAudioData || !this.leftChannelInputPtr || !this.dbLevelsOutputPtr) {
            // WASM not ready or critical pointers are null
            // console.warn('WaveletAnalyzerProcessor: WASM module not ready for processing.');
            return true; // Keep processor alive
        }

        // Assuming stereo input: inputs[0] contains 2 channels
        const input = inputs[0];
        if (!input || input.length < 2) {
            // console.warn('WaveletAnalyzerProcessor: Input is not stereo or not available.');
            return true; // No data to process or not stereo
        }

        const leftChannel = input[0];
        const rightChannel = input[1];

        if (leftChannel.length !== this.chunkSize || rightChannel.length !== this.chunkSize) {
            // This should not happen if the AudioWorkletNode is configured with the same chunkSize
            console.warn(`WaveletAnalyzerProcessor: Audio data chunk size mismatch. Expected ${this.chunkSize}, got ${leftChannel.length}. Dropping frame.`);
            return true;
        }

        // Copy audio data to WASM memory
        const wasmHeapF32Left = new Float32Array(this.wasmMemory.buffer, this.leftChannelInputPtr, this.chunkSize);
        wasmHeapF32Left.set(leftChannel);

        const wasmHeapF32Right = new Float32Array(this.wasmMemory.buffer, this.rightChannelInputPtr, this.chunkSize);
        wasmHeapF32Right.set(rightChannel);

        // Call the WASM function
        // void process_audio_data(
        //     float* left_channel_input, float* right_channel_input,
        //     int chunk_size, float sample_rate,
        //     const float* target_frequencies,
        //     float* db_levels_output, float* pan_angles_output
        // );
        this._processAudioData(
            this.leftChannelInputPtr,
            this.rightChannelInputPtr,
            this.chunkSize,
            sampleRate, // sampleRate is a global variable in AudioWorkletProcessor
            this.targetFrequenciesPtr,
            this.dbLevelsOutputPtr,
            this.panAnglesOutputPtr
        );

        // Read results from WASM memory
        const dbLevels = new Float32Array(this.wasmMemory.buffer, this.dbLevelsOutputPtr, 260).slice();
        const panAngles = new Float32Array(this.wasmMemory.buffer, this.panAnglesOutputPtr, 130).slice();
        // .slice() creates a copy, which is important before posting, as the underlying ArrayBuffer might change.

        // Post results to the main thread
        this.port.postMessage({
            type: 'analysisResult',
            levels: dbLevels,
            angles: panAngles
        });

        return true; // Keep processor alive
    }

    // Lifecycle method: called when the processor is about to be destroyed.
    // Not always guaranteed to be called, e.g., if the page crashes.
    // However, it's good practice for explicit cleanup.
    // For Emscripten modules, _free is usually sufficient. FFTW cleanup might be handled by Emscripten's exit routines.
    static get parameterDescriptors() {
        // If your processor needs custom parameters, define them here.
        // For this example, we are passing configuration via constructor options.
        return [];
    }

    // Custom method to handle cleanup if needed, though not standard AudioWorkletProcessor API
    // This would typically be called before the node is disconnected and the processor is destroyed.
    // However, direct calls from main thread to processor instances aren't standard.
    // The best place for cleanup is when the AudioWorkletNode is being disposed of,
    // which might involve sending a specific message to the processor to trigger this.
    // For now, rely on _free for pointers allocated with _malloc.
    // If fftwf_cleanup_threads() or fftwf_cleanup() were necessary and not handled by Emscripten's exit,
    // it would be more complex to manage from here.
}

registerProcessor('wavelet-analyzer-processor', WaveletAnalyzerProcessor);
