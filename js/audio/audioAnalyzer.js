import { semitones, SMOOTHING_TIME_CONSTANT } from '../config/hologramConfig.js';
import eventBus from '../core/eventBus.js';
import init, { HoloAnalyzer } from '../wasm/holographic_core.js';

/**
 * AudioAnalyzer class wraps the native Web Audio API AnalyserNode.
 * It provides methods to get frequency data and map it to the 128 semitones
 * defined in the application configuration.
 * 
 * This is the NATIVE FFT FALLBACK - used when WASM CWT is not available.
 */
export class AudioAnalyzer {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.wasm_ready = false;
        this.analyzer = null;
        this.currentFrame = 0;
        this.chunkSize = 1024;
        this.left_accumulator = new Float32Array(this.chunkSize);
        this.right_accumulator = new Float32Array(this.chunkSize);
        this.target_frequencies = semitones.map(s => s.f);

        // Create stereo analysers for true L/R separation
        this.analyserLeft = this.audioContext.createAnalyser();
        this.analyserRight = this.audioContext.createAnalyser();
        this.splitter = this.audioContext.createChannelSplitter(2);
        this.merger = this.audioContext.createChannelMerger(2);

        // Configure analysers
        const FFT_SIZE = 4096;
        this.analyserLeft.fftSize = FFT_SIZE;
        this.analyserRight.fftSize = FFT_SIZE;
        this.analyserLeft.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT || 0.3;
        this.analyserRight.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT || 0.3;

        // Data buffers
        this.frequencyDataLeft = new Float32Array(this.analyserLeft.frequencyBinCount);
        this.frequencyDataRight = new Float32Array(this.analyserRight.frequencyBinCount);

        // Output buffers (256 = 128 Left + 128 Right)
        this.latestDbLevels = new Float32Array(256);
        this.latestPanAngles = new Float32Array(256);

        this.binMap = this._calculateBinMap();

        // Try to initialize WASM (optional enhancement)
        this.initWasm();

        // Legacy scriptProcessor for compatibility
        this.scriptProcessor = this.audioContext.createScriptProcessor(1024, 2, 2);
        this.scriptProcessor.onaudioprocess = this.handleAudioProcess.bind(this);
    }

    async initWasm() {
        try {
            await init();
            console.log('[AudioAnalyzer] WASM module loaded.');
            this.analyzer = new HoloAnalyzer(this.audioContext.sampleRate, semitones.length, this.chunkSize);
            this.wasm_ready = true;
            console.log('[AudioAnalyzer] HoloAnalyzer initialized successfully.');
        } catch (e) {
            console.warn("[AudioAnalyzer] WASM module not available, using pure JS fallback:", e.message);
        }
    }

    handleAudioProcess(event) {
        const input = event.inputBuffer;
        const output = event.outputBuffer;
        const leftIn = input.getChannelData(0);
        const rightIn = input.getChannelData(1) || leftIn;
        output.getChannelData(0).set(leftIn);
        output.getChannelData(1).set(rightIn);

        // Accumulate for WASM if available
        if (this.wasm_ready && this.analyzer) {
            const frameSize = leftIn.length;
            if (this.currentFrame + frameSize <= this.chunkSize) {
                this.left_accumulator.set(leftIn, this.currentFrame);
                this.right_accumulator.set(rightIn, this.currentFrame);
                this.currentFrame += frameSize;
            } else {
                this.currentFrame = 0;
            }
            if (this.currentFrame >= this.chunkSize) {
                this.runWasmAnalysis();
                this.currentFrame = 0;
            }
        }
    }

    /**
     * WASM-based analysis (if available)
     */
    runWasmAnalysis() {
        try {
            const results = this.analyzer.process(this.left_accumulator, this.right_accumulator, this.target_frequencies);
            if (results && results.length > 0) {
                const num_bins = semitones.length;
                const epsilon = 1e-6;

                results.forEach((output, i) => {
                    // FIXED: Extract volume and pan from output object
                    const volume = output.volume_db || -128;
                    const pan = output.pan_lr || 0;

                    // Sanitize volume
                    const safeVolume = Number.isFinite(volume) ? Math.max(-128, Math.min(0, volume)) : -128;

                    // Reconstruct stereo levels from pan
                    const panNorm = (pan + 1) / 2; // 0 to 1
                    const left_gain = Math.cos(panNorm * Math.PI / 2);
                    const right_gain = Math.sin(panNorm * Math.PI / 2);

                    const leftDbRaw = safeVolume + 20 * Math.log10(left_gain + epsilon);
                    const rightDbRaw = safeVolume + 20 * Math.log10(right_gain + epsilon);

                    const leftDb = Number.isFinite(leftDbRaw) ? Math.max(-128, leftDbRaw) : -128;
                    const rightDb = Number.isFinite(rightDbRaw) ? Math.max(-128, rightDbRaw) : -128;

                    this.latestDbLevels[i] = leftDb;
                    this.latestDbLevels[i + num_bins] = rightDb;
                    this.latestPanAngles[i] = Number.isFinite(pan) ? pan : 0;
                    this.latestPanAngles[i + num_bins] = this.latestPanAngles[i]; // Mirror for R channel
                });

                eventBus.emit('cwtResult', {
                    dbLevels: this.latestDbLevels,
                    panAngles: this.latestPanAngles
                });
            }
        } catch (e) {
            console.error("[AudioAnalyzer] WASM Analysis error:", e);
        }
    }

    /**
     * NATIVE FFT Analysis - The reliable fallback.
     * Uses Web Audio API AnalyserNode for frequency data.
     * Calculates stereo pan from L/R amplitude difference.
     */
    runNativeAnalysis() {
        // Get frequency data from both channels
        this.analyserLeft.getFloatFrequencyData(this.frequencyDataLeft);
        this.analyserRight.getFloatFrequencyData(this.frequencyDataRight);

        const num_bins = semitones.length;
        const epsilon = 1e-6;

        for (let i = 0; i < num_bins; i++) {
            const bins = this.binMap[i];
            if (!bins || bins.length === 0) continue;

            // Average dB values across mapped FFT bins
            let leftSum = 0;
            let rightSum = 0;

            for (const binIdx of bins) {
                // getFloatFrequencyData returns dB values, typically -100 to 0
                const leftVal = this.frequencyDataLeft[binIdx] || -128;
                const rightVal = this.frequencyDataRight[binIdx] || -128;

                // Convert dB to linear for averaging, then back
                leftSum += Math.pow(10, leftVal / 20);
                rightSum += Math.pow(10, rightVal / 20);
            }

            const leftAmp = leftSum / bins.length;
            const rightAmp = rightSum / bins.length;

            // Convert back to dB
            const leftDb = 20 * Math.log10(leftAmp + epsilon);
            const rightDb = 20 * Math.log10(rightAmp + epsilon);

            // Clamp to valid range
            const safeLeftDb = Number.isFinite(leftDb) ? Math.max(-128, Math.min(0, leftDb)) : -128;
            const safeRightDb = Number.isFinite(rightDb) ? Math.max(-128, Math.min(0, rightDb)) : -128;

            // STEREO PAN CALCULATION (Physics)
            // Pan = (Right - Left) / (Right + Left + epsilon)
            // Result: -1 (full left) to +1 (full right)
            const pan = (rightAmp - leftAmp) / (rightAmp + leftAmp + epsilon);
            const safePan = Number.isFinite(pan) ? Math.max(-1, Math.min(1, pan)) : 0;

            // Store in output buffers
            this.latestDbLevels[i] = safeLeftDb;              // Left: 0-127
            this.latestDbLevels[i + num_bins] = safeRightDb;  // Right: 128-255
            this.latestPanAngles[i] = safePan;
            this.latestPanAngles[i + num_bins] = safePan;     // Same pan for both
        }
    }

    get inputInfo() {
        return {
            scriptProcessor: this.scriptProcessor
        };
    }

    /**
     * Connects an audio source to this analyzer.
     * Sets up stereo splitting for true L/R analysis.
     */
    connectSource(sourceNode) {
        // Connect source to splitter
        sourceNode.connect(this.splitter);

        // Split channels to separate analysers
        this.splitter.connect(this.analyserLeft, 0);
        this.splitter.connect(this.analyserRight, 1);

        // Also connect to legacy scriptProcessor for WASM compatibility
        sourceNode.connect(this.scriptProcessor);
        this.scriptProcessor.connect(this.audioContext.destination);
    }

    disconnectSource(sourceNode) {
        try {
            sourceNode.disconnect(this.splitter);
            sourceNode.disconnect(this.scriptProcessor);
            this.scriptProcessor.disconnect(this.audioContext.destination);
        } catch (e) {
            // Ignore if already disconnected
        }
    }

    /**
     * Pre-calculates which FFT bins correspond to which semitone index.
     * Uses multiple bins for low frequencies and skips bin 0 (DC offset).
     */
    _calculateBinMap() {
        const sampleRate = this.audioContext.sampleRate;
        const fftSize = 4096;
        const binWidth = sampleRate / fftSize;
        const maxBin = 2047; // fftSize / 2 - 1

        const map = [];

        for (let i = 0; i < semitones.length; i++) {
            const noteFreq = semitones[i].f;

            // Calculate center bin, but skip bin 0 (DC offset)
            let centerBin = Math.round(noteFreq / binWidth);
            centerBin = Math.max(1, centerBin);

            const bins = [];
            if (noteFreq < 100) {
                // Low frequencies: use 3 adjacent bins
                for (let b = Math.max(1, centerBin - 1); b <= Math.min(maxBin, centerBin + 1); b++) {
                    bins.push(b);
                }
            } else if (noteFreq < 500) {
                // Mid-low frequencies: use 2 bins
                bins.push(centerBin);
                if (centerBin + 1 <= maxBin) bins.push(centerBin + 1);
            } else {
                // Higher frequencies: single bin
                bins.push(Math.min(centerBin, maxBin));
            }

            map.push(bins);
        }
        return map;
    }

    /**
     * Retrieves the current audio data, mapped to 128 semitones.
     * Returns true stereo data for L and R channels.
     * 
     * OUTPUT PROTOCOL:
     * { dbLevels: Float32Array(256), panAngles: Float32Array(256) }
     */
    getAnalysisData() {
        // Run native analysis to update buffers
        this.runNativeAnalysis();

        return {
            dbLevels: this.latestDbLevels,
            panAngles: this.latestPanAngles
        };
    }
}
