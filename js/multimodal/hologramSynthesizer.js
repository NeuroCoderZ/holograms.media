// frontend/js/multimodal/hologramSynthesizer.js
// Audio synthesis from hologram visual data - 128 oscillators for semitones

import { semitones } from '../config/hologramConfig.js';

/**
 * HologramSynthesizer creates audio output from visual hologram parameters.
 * Uses 128 oscillators tuned to equal-temperament frequencies from semitones config.
 */
export class HologramSynthesizer {
    constructor() {
        this.audioContext = null;
        this.oscillators = [];
        this.gains = [];
        this.panners = [];
        this.masterGain = null;
        this.isInitialized = false;

        // Synthesis parameters
        this.oscillatorType = 'sine'; // sine, triangle for softer sound
        this.attackTime = 0.01;       // 10ms attack (Snappy)
        this.releaseTime = 0.05;      // 50ms release (No drone)
        this.maxVolume = 0.5;         // Master volume limit (Phase 19.14)
    }

    /**
     * Initializes the audio context and creates 128 oscillators.
     */
    async init() {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            // Master gain to prevent clipping
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.maxVolume / Math.sqrt(128);
            this.masterGain.connect(this.audioContext.destination);

            // Create oscillator chain for each semitone
            for (let i = 0; i < 128; i++) {
                const rawFrequency = semitones[i].f;
                // Clamp to nominal range for AudioContext (typically 24kHz)
                const frequency = Math.min(24000, rawFrequency);

                // Oscillator
                const osc = this.audioContext.createOscillator();
                osc.type = this.oscillatorType;
                osc.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

                // Individual gain node (for volume control)
                const gain = this.audioContext.createGain();
                gain.gain.setValueAtTime(0, this.audioContext.currentTime); // Start silent

                // Stereo panner
                const panner = this.audioContext.createStereoPanner();
                panner.pan.setValueAtTime(0, this.audioContext.currentTime);

                // Connect: osc → gain → panner → master
                osc.connect(gain);
                gain.connect(panner);
                panner.connect(this.masterGain);

                // Start oscillator (runs continuously, volume controls sound)
                osc.start();

                this.oscillators.push(osc);
                this.gains.push(gain);
                this.panners.push(panner);
            }

            this.isInitialized = true;
            this._configureRefinedOscillators(); // Apply 8-bit waveforms
            console.log('[HologramSynthesizer] Initialized 128 oscillators (8-bit Mode)');

        } catch (error) {
            console.error('[HologramSynthesizer] Failed to initialize:', error);
            throw error;
        }
    }

    /**
     * Updates oscillator types based on frequency range for 8-bit feel.
     * Bass (<200Hz) -> Sawtooth
     * Mid (<1000Hz) -> Square
     * High -> Triangle
     */
    /**
     * Updates oscillator types based on frequency range.
     * High Fidelity -> All Sine for pure spectral reconstruction.
     */
    _configureRefinedOscillators() {
        this.oscillators.forEach((osc, i) => {
            osc.type = 'sine'; // Pure sine for high fidelity reconstruction
        });
    }

    /**
     * Updates all oscillators based on extracted visual parameters.
     * Uses dynamic allocation with increased polyphony (32 voices).
     * @param {Float32Array} levels - 256 values (128 L + 128 R), dB scale (-128 to 0)
     * @param {Float32Array} pans - 128 pan values (-1 to +1)
     */
    update(levels, pans) {
        if (!this.isInitialized) return;

        const now = this.audioContext.currentTime;

        // 1. Calculate linear amplitudes for all 128 bins
        const activeVoices = [];

        for (let i = 0; i < 128; i++) {
            const levelL = levels[i];
            const levelR = levels[i + 128];
            const maxLevel = Math.max(levelL, levelR);

            // Convert dB to Linear
            const amplitude = Math.pow(10, maxLevel / 20);

            if (amplitude > 0.001) { // Lower threshold for more detail
                activeVoices.push({ index: i, amp: amplitude, pan: pans[i] });
            }
        }

        // 2. Update Gains and Pans for all 128 bins (Phase 19.15: No polyphony limit)
        for (let i = 0; i < 128; i++) {
            const gain = this.gains[i];
            const panner = this.panners[i];

            const levelL = levels[i];
            const levelR = levels[i + 128];
            const maxLevel = Math.max(levelL, levelR);
            const amplitude = Math.pow(10, maxLevel / 20);

            if (amplitude > 0.001) {
                // Active Voice (Visible on Hologram)
                const targetVolume = Math.min(1, Math.max(0, amplitude * this.maxVolume));

                gain.gain.cancelScheduledValues(now);
                gain.gain.setTargetAtTime(targetVolume, now, 0.012);

                panner.pan.cancelScheduledValues(now);
                panner.pan.setTargetAtTime(Math.max(-1, Math.min(1, pans[i])), now, 0.012);
            } else {
                // Inactive Voice (Below noise/visibility floor)
                gain.gain.cancelScheduledValues(now);
                gain.gain.setTargetAtTime(0, now, 0.05);
            }
        }
    }

    /**
     * Previews a specific frequency index (for Gesture Interaction).
     * @param {number} index - Semitone index (0-127).
     * @param {number} volume - Volume (0.0 to 1.0).
     */
    previewFrequency(index, volume) {
        if (!this.isInitialized || index < 0 || index >= 128) return;

        const now = this.audioContext.currentTime;
        const gain = this.gains[index];

        // Direct control for feedback
        const targetVol = volume * this.maxVolume;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setTargetAtTime(targetVol, now, 0.05); // Fast response
    }

    /**
     * Sets the oscillator waveform type.
     * @param {'sine' | 'triangle' | 'sawtooth' | 'square'} type 
     */
    setOscillatorType(type) {
        this.oscillatorType = type;
        this.oscillators.forEach(osc => {
            osc.type = type;
        });
    }

    /**
     * Sets master volume (0 to 1).
     */
    setMasterVolume(volume) {
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(
                volume / Math.sqrt(128),
                this.audioContext.currentTime,
                0.05
            );
        }
    }

    /**
     * Mutes all oscillators.
     */
    mute() {
        if (!this.isInitialized) return;
        const now = this.audioContext.currentTime;
        this.gains.forEach(gain => {
            gain.gain.cancelScheduledValues(now);
            gain.gain.setTargetAtTime(0, now, this.releaseTime);
        });
    }

    /**
     * Disposes all audio resources.
     */
    dispose() {
        this.oscillators.forEach(osc => {
            try { osc.stop(); } catch (e) { }
            osc.disconnect();
        });

        this.gains.forEach(g => g.disconnect());
        this.panners.forEach(p => p.disconnect());

        if (this.masterGain) {
            this.masterGain.disconnect();
        }

        if (this.audioContext && this.audioContext.state !== 'closed') {
            this.audioContext.close();
        }

        this.oscillators = [];
        this.gains = [];
        this.panners = [];
        this.masterGain = null;
        this.audioContext = null;
        this.isInitialized = false;

        console.log('[HologramSynthesizer] Disposed');
    }
}
