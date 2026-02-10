/**
 * js/audio/AudioGestureBridge.js
 * Bridges hand Tracking data with real-time CQT spectral data for BasilaQ-127 Performance Mode.
 */

export class AudioGestureBridge {
    /**
     * Applies hand modulation to the raw CQT audio data.
     * @param {object} audioData - { levels: Float32Array(256), pans: Float32Array(256) }
     * @param {object} modulationData - { left: handData|null, right: handData|null }
     * @param {boolean} isSynthMode - State flag from UI
     * @returns {object} - Modified audio data
     */
    static applyModulation(audioData, modulationData, isSynthMode) {
        if (!modulationData) return audioData;

        const levels = new Float32Array(audioData.levels);
        const pans = new Float32Array(audioData.pans);

        // Process Left Hand (Indices 0-127)
        if (modulationData.left && modulationData.left.active) {
            this._applyHandInfluence(levels, pans, modulationData.left, 0, 127);
        }

        // Process Right Hand (Indices 128-255)
        if (modulationData.right && modulationData.right.active) {
            this._applyHandInfluence(levels, pans, modulationData.right, 128, 255);
        }

        return { levels, pans };
    }

    /**
     * Internal helper to apply "spectral brush" influence to a range of bins.
     */
    static _applyHandInfluence(levels, pans, hand, startIdx, endIdx) {
        // Only modulate if pinching (grabbing)
        if (!hand.isPinching) return;

        const center = hand.frequency + (startIdx === 128 ? 128 : 0);
        const bandwidth = hand.bandwidth;
        // FIX: Map 0..1 gain to -128..0 dB range (Silence to Max)
        // Previously: hand.gain * 127 resulted in +127dB (EXPLOSION)
        const gainMod = (hand.gain * 128) - 128;
        const panMod = hand.pan;

        for (let i = startIdx; i <= endIdx; i++) {
            // Gaussian influence: exp(- (x - center)^2 / (2 * sigma^2))
            // sigma is bandwidth proxy
            const dist = Math.abs(i - center);
            const influence = Math.exp(-(dist * dist) / (2 * bandwidth * bandwidth));

            if (influence > 0.01) {
                // Boost/Override volume based on influence
                // Simple additive blending: original + influence * (hand_gain - original)
                // If hand is "far", it amplifies. If close, it dampens. 
                const targetLvl = gainMod;
                levels[i] = levels[i] * (1 - influence) + targetLvl * influence;

                // Adjust Pan
                pans[i] = pans[i] * (1 - influence) + panMod * influence;
            }
        }
    }
}
