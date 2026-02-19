/**
 * js/audio/SpectralInpainter.js
 * Palinodes v1.0: Spectral Inpainting Engine.
 * 
 * Purpose: Recover missing or corrupted audio spectral frames to ensure
 * smooth visual and auditory continuity in the presence of network packet loss.
 *
 * Current Strategy (v1.0): Linear Interpolation (Lerp) + Last Known Good Hold.
 * Future Strategy (v2.0): Latent Diffusion Inpainting (Enkephalon-driven).
 */

export class SpectralInpainter {
    constructor() {
        this.lastGoodFrame = null;
        this.maxDropoutFrames = 5; // How many frames to interpolate before giving up
        this.dropoutCount = 0;
        this.isProcessing = false;
    }

    /**
     * Process incoming spectral data.
     * If data is valid, it passes through and updates history.
     * If data is missing/null, it attempts to reconstruct it.
     * 
     * @param {Object|null} currentFrame - { levels: Float32Array, pans: Float32Array, confidence: Float32Array }
     * @returns {Object} - The processed (potentially repaired) frame.
     */
    process(currentFrame) {
        // Case 1: Frame is valid
        if (currentFrame && currentFrame.levels && currentFrame.levels.length > 0) {
            this._updateHistory(currentFrame);
            return currentFrame;
        }

        // Case 2: Frame is missing (Dropout)
        return this._inpaint();
    }

    _updateHistory(frame) {
        // Deep copy to prevent reference issues if the source buffer is recycled
        this.lastGoodFrame = {
            levels: new Float32Array(frame.levels),
            pans: new Float32Array(frame.pans || 128),
            confidence: new Float32Array(frame.confidence || 128),
            timestamp: Date.now()
        };
        this.dropoutCount = 0;
    }

    _inpaint() {
        // Sub-case 2.1: No history (startup or long silence), return silence
        if (!this.lastGoodFrame) {
            return this._generateSilence();
        }

        // Sub-case 2.2: Dropout limit reached (signal lost too long)
        if (this.dropoutCount >= this.maxDropoutFrames) {
            // Fade out to avoid abrupt cutoff? Or just hold silence.
            // For v1, we return silence to indicate connection loss.
            return this._generateSilence();
        }

        // Sub-case 2.3: Inpainting (Reconstruction)
        this.dropoutCount++;

        // Decay strategy: Reduce amplitude by 10% per missing frame (Soft Falloff)
        const decayFactor = Math.pow(0.9, this.dropoutCount);

        const reconstructedLevels = new Float32Array(this.lastGoodFrame.levels.length);
        const reconstructedPans = new Float32Array(this.lastGoodFrame.pans.length);
        const reconstructedConfidence = new Float32Array(this.lastGoodFrame.confidence.length);

        for (let i = 0; i < this.lastGoodFrame.levels.length; i++) {
            reconstructedLevels[i] = Math.max(-128, this.lastGoodFrame.levels[i] - (5 * this.dropoutCount)); // -5dB per frame logic check? 
            // Better: Linear decay in dB is exponential in amplitude.
            // Let's just subtract dB. -3dB per frame is reasonable decay.
            reconstructedLevels[i] = this.lastGoodFrame.levels[i] - (3.0 * this.dropoutCount);
        }

        // Keep pans and confidence steady (or decay confidence)
        reconstructedPans.set(this.lastGoodFrame.pans);

        for (let i = 0; i < this.lastGoodFrame.confidence.length; i++) {
            reconstructedConfidence[i] = this.lastGoodFrame.confidence[i] * decayFactor;
        }

        console.debug(`[Palinodes] Inpainting frame +${this.dropoutCount} (Decay: ${decayFactor.toFixed(2)})`);

        return {
            levels: reconstructedLevels,
            pans: reconstructedPans,
            confidence: reconstructedConfidence,
            isInpainted: true
        };
    }

    _generateSilence() {
        return {
            levels: new Float32Array(256).fill(-128),
            pans: new Float32Array(128).fill(0),
            confidence: new Float32Array(128).fill(0),
            isSilence: true
        };
    }
}

// Singleton instance
export const spectralInpainter = new SpectralInpainter();
