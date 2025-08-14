// frontend/js/audio/waveletAnalyzer.js (REWRITTEN for new WASM interface)
import init, { init_processor, process_audio } from '../wasm/fastcwt/holographic_core.js';

class CwtProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.wasm_ready = false;
        this.processor_ready = false;
        
        // Buffers for audio data
        this.left_buffer = new Float32Array(1024); // Assuming chunk size is 1024
        this.right_buffer = new Float32Array(1024);

        this.initWasm();

        this.port.onmessage = (event) => {
            if (event.data.type === 'INIT_PROCESSOR') {
                if (this.wasm_ready) {
                    console.log('CwtProcessor: Initializing WASM processor...');
                    init_processor(event.data.sampleRate, event.data.numBins, event.data.chunkSize);
                    this.processor_ready = true;
                    console.log('CwtProcessor: WASM processor initialized.');
                } else {
                    console.error('CwtProcessor: Attempted to initialize processor before WASM was ready.');
                }
            }
        };
    }

    async initWasm() {
        try {
            // The generated glue code handles the WASM path, so we just need to call init.
            await init();
            this.wasm_ready = true;
            this.port.postMessage({ type: 'WASM_READY' });
            console.log('CwtProcessor: WASM module loaded and ready.');
        } catch (e) {
            console.error("CwtProcessor: Failed to load WASM module", e);
        }
    }

    process(inputs, outputs, parameters) {
        // Ensure the processor is ready and there's input data.
        if (!this.processor_ready || !inputs[0] || !inputs[0][0]) {
            return true; // Keep processor alive
        }

        const leftChannel = inputs[0][0];
        const rightChannel = inputs[0][1] || leftChannel; // Fallback to left for mono

        // For simplicity, we assume the input buffer size matches our expected chunk size.
        // In a real-world scenario, you might need to handle buffer accumulation.
        if (leftChannel.length !== this.left_buffer.length) {
             console.warn(`Input buffer size (${leftChannel.length}) does not match expected chunk size (${this.left_buffer.length}). Skipping frame.`);
             return true;
        }

        this.left_buffer.set(leftChannel);
        this.right_buffer.set(rightChannel);

        try {
            // Call the exported Rust function
            const results_json = process_audio(this.left_buffer, this.right_buffer);

            if (results_json && results_json.length > 0) {
                // The result is an array of SemitoneOutput objects.
                // We need to transform it into the format expected by the main thread.
                const num_bins = results_json.length;
                const dbLevels = new Float32Array(num_bins * 2); // left and right
                const panAngles = new Float32Array(num_bins);

                results_json.forEach((output, i) => {
                    // This is a simplification. The old system had separate L/R levels.
                    // The new Rust code gives a single volume_db and a pan_lr.
                    // We'll reconstruct L/R levels based on pan.
                    const pan = output.pan_lr; // -1 (L) to +1 (R)
                    const volume = output.volume_db;

                    // A simple way to map pan back to L/R levels.
                    // When pan is -1, right is lower. When pan is +1, left is lower.
                    const left_gain = Math.cos((pan + 1) * Math.PI / 4);
                    const right_gain = Math.sin((pan + 1) * Math.PI / 4);
                    
                    // This is not a perfect dB conversion, but it preserves the stereo image.
                    dbLevels[i] = volume * left_gain;
                    dbLevels[i + num_bins] = volume * right_gain;
                    
                    panAngles[i] = pan * 90; // Convert pan from -1..1 to -90..+90 degrees
                });

                this.port.postMessage({
                    type: 'AUDIO_DATA',
                    levels: dbLevels,
                    angles: panAngles
                });
            }
        } catch (e) {
            console.error("CwtProcessor: Error processing audio in WASM:", e);
        }

        return true; // Keep the AudioWorkletNode alive
    }
}

registerProcessor('cwt-processor', CwtProcessor);