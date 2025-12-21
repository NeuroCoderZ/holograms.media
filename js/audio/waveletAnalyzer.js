// frontend/js/audio/waveletAnalyzer.js
// CWT AudioWorklet Processor using WASM HoloAnalyzer (Morlet Wavelet)

import init, { HoloAnalyzer } from '../wasm/holographic_core.js';

/**
 * CwtProcessor - AudioWorkletProcessor for Continuous Wavelet Transform analysis.
 * Uses WASM-compiled Morlet wavelet for accurate semitone frequency detection.
 */
class CwtProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.wasm_ready = false;
        this.analyzer = null;

        // Get adaptive parameters from processor options
        const processorOptions = options.processorOptions || {};
        this.sampleRate = processorOptions.sampleRate || 48000;
        this.numBins = processorOptions.numBins || 128;
        this.chunkSize = processorOptions.chunkSize || 1024;
        this.channelCount = processorOptions.channelCount || 2;

        // Buffers for audio data accumulation
        this.currentFrame = 0;
        this.left_accumulator = new Float32Array(this.chunkSize);
        this.right_accumulator = new Float32Array(this.chunkSize);

        // Pre-calculate target frequencies: 128 semitones in equal temperament
        // Starting from A0 = 27.5 Hz
        const BASE_FREQUENCY = 27.5;
        const NOTES_PER_OCTAVE = 12;
        this.target_frequencies = new Float32Array(this.numBins);
        for (let i = 0; i < this.numBins; i++) {
            this.target_frequencies[i] = BASE_FREQUENCY * Math.pow(2, i / NOTES_PER_OCTAVE);
        }

        console.log(`[CwtProcessor] Initializing with sampleRate=${this.sampleRate}, chunkSize=${this.chunkSize}, channels=${this.channelCount}`);

        // Initialize WASM module
        this.initWasm();
    }

    async initWasm() {
        try {
            await init();
            console.log('[CwtProcessor] WASM module loaded.');

            this.analyzer = new HoloAnalyzer(this.sampleRate, this.numBins, this.chunkSize);
            this.wasm_ready = true;
            this.port.postMessage({ type: 'WASM_READY' });
            console.log('[CwtProcessor] HoloAnalyzer initialized successfully.');
        } catch (e) {
            console.error("[CwtProcessor] Failed to load WASM module:", e);
        }
    }

    /**
     * Main audio processing callback.
     * Accumulates samples and triggers CWT analysis when buffer is full.
     */
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];

        if (!input || !input[0]) return true;

        // Get stereo channels (or duplicate mono)
        const leftIn = input[0];
        const rightIn = input[1] || leftIn; // Fallback to mono if single channel

        // --- 1. Audio Pass-through (user hears the audio) ---
        if (output && output[0]) {
            output[0].set(leftIn);
            if (output[1]) {
                output[1].set(rightIn);
            }
        }

        // --- 2. Accumulate samples for CWT processing ---
        if (this.wasm_ready && this.analyzer) {
            const frameSize = leftIn.length; // Usually 128 samples per render quantum

            // Check if we have space in accumulator
            if (this.currentFrame + frameSize <= this.chunkSize) {
                // Add samples to accumulators
                this.left_accumulator.set(leftIn, this.currentFrame);
                this.right_accumulator.set(rightIn, this.currentFrame);
                this.currentFrame += frameSize;
            } else {
                // Buffer overflow - start fresh (shouldn't happen with proper sizing)
                this.currentFrame = 0;
            }

            // If accumulator is full, run CWT analysis
            if (this.currentFrame >= this.chunkSize) {
                this.runAnalysis();
                this.currentFrame = 0; // Reset for next batch
            }
        }

        return true; // CRITICAL: Keep worklet alive
    }

    /**
     * Performs CWT analysis using WASM and sends results to main thread.
     */
    runAnalysis() {
        try {
            // Call WASM CWT processor
            // Returns array of { volume_db, pan_lr } for each semitone
            const results = this.analyzer.process(
                this.left_accumulator,
                this.right_accumulator,
                this.target_frequencies
            );

            if (results && results.length > 0) {
                const num_bins = this.numBins;
                const dbLevels = new Float32Array(num_bins * 2); // 128 Left + 128 Right
                const panAngles = new Float32Array(num_bins);

                results.forEach((output, i) => {
                    const pan = output.pan_lr;       // -1 (Left) to +1 (Right)
                    const volume = output.volume_db; // Volume in dB

                    // Reconstruct stereo levels based on pan position
                    // Using constant-power panning law
                    const panNorm = (pan + 1) / 2; // 0 to 1
                    const left_gain = Math.cos(panNorm * Math.PI / 2);
                    const right_gain = Math.sin(panNorm * Math.PI / 2);

                    // Calculate individual channel levels in dB
                    // Safe log with epsilon to prevent -Infinity
                    const epsilon = 1e-6;
                    const leftDb = volume + 20 * Math.log10(left_gain + epsilon);
                    const rightDb = volume + 20 * Math.log10(right_gain + epsilon);

                    dbLevels[i] = leftDb;              // Left channel: 0-127
                    dbLevels[i + num_bins] = rightDb;  // Right channel: 128-255
                    panAngles[i] = pan;                // -1 to +1 (used for column shift)
                });

                // Send results to main thread
                this.port.postMessage({
                    type: 'AUDIO_DATA',
                    levels: dbLevels,
                    angles: panAngles
                });
            }
        } catch (e) {
            console.error("[CwtProcessor] Analysis error:", e);
        }
    }
}

// Register the processor
registerProcessor('cwt-processor', CwtProcessor);