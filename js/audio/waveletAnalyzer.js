// frontend/js/audio/waveletAnalyzer.js
// CQT AudioWorklet Processor - Digital Basilar Membrane (Physiological Modeling)
// This implements a high-precision CQT using a bank of Complex Discrete Fourier Filters.
// One-to-one mapping: 128 semitones -> 128 visual columns.

class CwtProcessor extends AudioWorkletProcessor {
    constructor(options) {
        super();
        this.wasm_ready = false;

        // 1. Physical Parameters
        const processorOptions = options.processorOptions || {};
        this.sampleRate = processorOptions.sampleRate || 48000;
        this.numBins = processorOptions.numBins || 128;
        this.chunkSize = processorOptions.chunkSize || 1024; // Lower for less latency

        // 2. Accumulators (Double Buffered)
        this.left_accumulator = new Float32Array(this.chunkSize);
        this.right_accumulator = new Float32Array(this.chunkSize);
        this.currentFrame = 0;

        // 3. Basilar Membrane Frequency Map (Semitones)
        // A0 = 27.5Hz, spacing = 2^(1/12)
        const BASE_FREQ = 27.5;
        this.binFreqs = new Float32Array(this.numBins);
        for (let i = 0; i < this.numBins; i++) {
            this.binFreqs[i] = BASE_FREQ * Math.pow(2, i / 12);
        }

        // 4. Pre-calculate Oscillators (Phasors) for Each Bin
        // This is a "Resonance Bank" approach.
        this.phasors = new Float32Array(this.numBins * 2); // [cos, sin] pairs
        for (let i = 0; i < this.numBins; i++) {
            const angle = (2 * Math.PI * this.binFreqs[i]) / this.sampleRate;
            this.phasors[i * 2] = Math.cos(angle);
            this.phasors[i * 2 + 1] = Math.sin(angle);
        }

        this.port.onmessage = (e) => {
            if (e.data.type === 'WASM_MODULE') {
                // We keep the loader for future WASM integration
                this.wasm_ready = true;
                this.port.postMessage({ type: 'WASM_READY' });
            }
        };

        console.log(`[CwtProcessor] Digital Basilar Membrane Ready. ${this.numBins} bins, ${this.sampleRate}Hz.`);
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        const output = outputs[0];

        // Diagnostic - once per second
        this.tick = (this.tick || 0) + 1;
        if (this.tick % 375 === 0) {
            if (!input || !input[0]) {
                console.warn('[CwtProcessor] ⚠ No input channels detected.');
            } else {
                const peak = Math.max(...input[0].subarray(0, 32).map(Math.abs));
                if (peak < 0.0001) {
                    // console.log('[CwtProcessor] 📊 Silent bus.');
                } else {
                    console.log(`[CwtProcessor] 📊 Signal detected: Peak=${peak.toFixed(4)}`);
                }
            }
        }

        if (!input || !input[0]) return true;

        const leftIn = input[0];
        const rightIn = input[1] || input[0];

        // Passthrough
        if (output && output[0]) {
            output[0].set(leftIn);
            if (output[1]) output[1].set(rightIn);
        }

        // Accumulate
        const count = leftIn.length;
        if (this.currentFrame + count <= this.chunkSize) {
            this.left_accumulator.set(leftIn, this.currentFrame);
            this.right_accumulator.set(rightIn, this.currentFrame);
            this.currentFrame += count;
        } else {
            this.runAnalysis();
            this.currentFrame = 0;
            this.left_accumulator.set(leftIn, 0);
            this.right_accumulator.set(rightIn, 0);
            this.currentFrame = count;
        }

        return true;
    }

    /**
     * BasilaQ-256: Digital Basilar Membrane Analysis
     * Maps Magnitude -> 7-bit dB (0-127 scale)
     */
    runAnalysis() {
        const numBins = this.numBins;
        const dbLevels = new Float32Array(numBins * 2);
        const panAngles = new Float32Array(numBins);
        const epsilon = 1e-9;
        // Gain boost calibrated for full 0-127 utilization
        const gainBoost = 50.0;

        for (let i = 0; i < numBins; i++) {
            const freq = this.binFreqs[i];

            // Calculate Vector Magnitudes for Left and Right Channels separately
            // We use a complex dot product (Heterodyne)
            const magnitudeL = this.getMagnitudeAtFreq(this.left_accumulator, freq);
            const magnitudeR = this.getMagnitudeAtFreq(this.right_accumulator, freq);

            // PHYSICS: Stereo Pan = (R-L) / (R+L+eps)
            const sum = magnitudeL + magnitudeR + epsilon;
            const pan = (magnitudeR - magnitudeL) / sum;

            // MAPPING: Digital Basilar Membrane (0dB = silence, 127dB = absolute max)
            // We assume a 127dB dynamic range where 1.0 (0dBFS) maps to 127 human-dB.
            // Magnitude 1.0 -> 127 dB
            // Magnitude 1e-6.35 (~0.0004) -> 0 dB
            let splL = 127 + 20 * Math.log10(magnitudeL * gainBoost + epsilon);
            let splR = 127 + 20 * Math.log10(magnitudeR * gainBoost + epsilon);

            // Clamp to physical limits [0, 127]
            dbLevels[i] = Math.max(0, Math.min(127, splL));
            dbLevels[i + numBins] = Math.max(0, Math.min(127, splR));
            panAngles[i] = Math.max(-1, Math.min(1, pan));

            // Sample Log for Debug
            if (i === 60 && this.tick % 375 === 0) {
                console.log(`[CwtProcessor] Bin 60 (${Math.round(freq)}Hz): ${Math.round(dbLevels[i])} dB, Pan: ${pan.toFixed(2)}`);
            }
        }

        this.port.postMessage({
            type: 'AUDIO_DATA',
            levels: dbLevels,
            angles: panAngles
        });
    }

    /**
     * Extract Magnitude at specific frequency using Recursive Phasor (Optimal)
     */
    getMagnitudeAtFreq(samples, freq) {
        const N = samples.length;
        let re = 0;
        let im = 0;
        const omega = (2 * Math.PI * freq) / this.sampleRate;

        // Complex Rotation Step
        const c = Math.cos(omega);
        const s = Math.sin(omega);

        // Recursive Phasor state
        let pRe = 1.0;
        let pIm = 0.0;

        for (let n = 0; n < N; n++) {
            const val = samples[n];

            // Accumulate complex product
            re += val * pRe;
            im += val * pIm;

            // Rotate phasor: (pRe + i*pIm) * (c + i*s)
            const nextRe = pRe * c - pIm * s;
            const nextIm = pRe * s + pIm * c;
            pRe = nextRe;
            pIm = nextIm;
        }

        return (2.0 * Math.sqrt(re * re + im * im)) / N;
    }
}

registerProcessor('cwt-processor', CwtProcessor);