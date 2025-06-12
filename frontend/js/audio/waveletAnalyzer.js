import init, { encode_audio_to_hologram } from '../wasm/fastcwt/fastcwt_processor.js';

class CwtProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.wasm_ready = false;
        this.sample_rate = 0;
        this.target_frequencies = null;

        this.initWasm();

        this.port.onmessage = (event) => {
            if (event.data.type === 'INIT_DATA') {
                this.sample_rate = event.data.sampleRate;
                // target_frequencies sent as a plain array, convert to Float32Array for WASM
                this.target_frequencies = new Float32Array(event.data.targetFrequencies);
                console.log('CwtProcessor: Received init data (sampleRate, targetFrequencies).');
            }
        };
    }

    async initWasm() {
        try {
            await init(new URL('../wasm/fastcwt/fastcwt_processor_bg.wasm', import.meta.url));
            this.wasm_ready = true;
            this.port.postMessage({ type: 'WASM_READY' });
            console.log('CwtProcessor: WASM module loaded and ready.');
        } catch (e) {
            console.error("CwtProcessor: Failed to load WASM module", e);
        }
    }

    process(inputs, outputs, parameters) {
        // Ensure WASM is ready and input channels exist
        if (!this.wasm_ready || !this.target_frequencies || inputs[0].length === 0 || !inputs[0][0]) {
            return true; // Keep processing if not ready or no input
        }

        const inputChannelData = inputs[0]; // First input port
        const leftChannel = inputChannelData[0];
        const rightChannel = inputChannelData[1] || leftChannel; // Use left if right is mono

        // Create output buffers for WASM function
        const outputDbLevels = new Float32Array(260); // 130 for left, 130 for right
        const outputPanAngles = new Float32Array(130); // 130 pan angles

        try {
            // Call the Rust WASM function
            encode_audio_to_hologram(
                leftChannel,
                rightChannel,
                this.sample_rate,
                this.target_frequencies,
                outputDbLevels,
                outputPanAngles
            );

            // Post the processed data back to the main thread
            this.port.postMessage({
                levels: outputDbLevels,
                angles: outputPanAngles
            });
        } catch (e) {
            console.error("CwtProcessor: Error processing audio in WASM:", e);
        }

        return true; // Keep the AudioWorkletNode alive
    }
}

registerProcessor('cwt-processor', CwtProcessor);
