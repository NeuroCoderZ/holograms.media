import { semitones, SMOOTHING_TIME_CONSTANT } from '../config/hologramConfig.js';

/**
 * AudioAnalyzer class wraps the native Web Audio API AnalyserNode.
 * It provides methods to get frequency data and map it to the 128 semitones
 * defined in the application configuration.
 */
export class AudioAnalyzer {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.splitter = this.audioContext.createChannelSplitter(2);
        this.analyserL = this.audioContext.createAnalyser();
        this.analyserR = this.audioContext.createAnalyser();

        // Configure FFT
        // 4096 is good for bass resolution.
        this.analyserL.fftSize = 4096;
        this.analyserR.fftSize = 4096;

        // Use global smoothing constant
        this.analyserL.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;
        this.analyserR.smoothingTimeConstant = SMOOTHING_TIME_CONSTANT;

        this.splitter.connect(this.analyserL, 0);
        this.splitter.connect(this.analyserR, 1);

        this.frequencyDataL = new Uint8Array(this.analyserL.frequencyBinCount);
        this.frequencyDataR = new Uint8Array(this.analyserR.frequencyBinCount);

        // Pre-calculate bin ranges for each semitone to optimize the render loop
        // Both analysers have same settings, so one map is enough
        this.binMap = this._calculateBinMap();
    }

    get inputInfo() {
        return {
            splitter: this.splitter,
            analyserL: this.analyserL,
            analyserR: this.analyserR
        };
    }

    connectSource(sourceNode) {
        // Connect source to splitter. 
        // If source is mono, splitter duplicates channel 0 to outputs 0 and 1 usually, 
        // or we relying on up-mixing. 
        // MediaStreamAudioSourceNode usually handles channel count.
        sourceNode.connect(this.splitter);
    }

    disconnectSource(sourceNode) {
        try {
            sourceNode.disconnect(this.splitter);
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
        const fftSize = this.analyserL.fftSize;
        const binWidth = sampleRate / fftSize;
        const maxBin = this.frequencyDataL.length - 1;

        const map = [];

        for (let i = 0; i < semitones.length; i++) {
            const noteFreq = semitones[i].f;

            // Calculate center bin, but skip bin 0 (DC offset)
            let centerBin = Math.round(noteFreq / binWidth);
            centerBin = Math.max(1, centerBin); // Skip bin 0

            // For low frequencies, use a range of bins (±1) for better accuracy
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
     */
    getAnalysisData() {
        if (!this.analyserL || !this.analyserR) return null;

        // Get raw frequency data for both channels
        this.analyserL.getByteFrequencyData(this.frequencyDataL);
        this.analyserR.getByteFrequencyData(this.frequencyDataR);

        const dbLevels = new Float32Array(256); // 128 Left, 128 Right
        const panAngles = new Float32Array(128);

        for (let i = 0; i < 128; i++) {
            const bins = this.binMap[i];

            // Calculate Level for Left
            let sumL = 0;
            for (let j = 0; j < bins.length; j++) sumL += this.frequencyDataL[bins[j]];
            const rawL = bins.length > 0 ? sumL / bins.length : 0;
            const dbL = (rawL / 255.0) * 128.0 - 128.0;

            // Calculate Level for Right
            let sumR = 0;
            for (let j = 0; j < bins.length; j++) sumR += this.frequencyDataR[bins[j]];
            const rawR = bins.length > 0 ? sumR / bins.length : 0;
            const dbR = (rawR / 255.0) * 128.0 - 128.0;

            dbLevels[i] = dbL;       // Left 0-127
            dbLevels[i + 128] = dbR; // Right 128-255

            // Placeholder for panAngles - calculation is now done in Renderer for visualization
            // But we can validly put 0 here as we pass raw L/R data.
            panAngles[i] = 0;
        }

        return {
            dbLevels,
            panAngles
        };
    }
}
