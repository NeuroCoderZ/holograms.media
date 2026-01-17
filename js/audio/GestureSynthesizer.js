/**
 * js/audio/GestureSynthesizer.js
 * Real-time audio synthesis driven by hand gesture positions.
 * Creates sound from hand movements (no input audio required).
 * Also emits visual data for hologram feedback.
 */

import eventBus from '../core/eventBus.js';

// Frequency table for 128 semitones (A0 to ~G#10, covering ~27Hz to ~13kHz)
const SEMITONE_FREQUENCIES = new Float32Array(128);
const A0 = 27.5; // Hz
for (let i = 0; i < 128; i++) {
    SEMITONE_FREQUENCIES[i] = A0 * Math.pow(2, i / 12);
}

export class GestureSynthesizer {
    constructor() {
        this.audioContext = null;
        this.mainGain = null;
        this.leftOscillator = null;
        this.rightOscillator = null;
        this.leftGain = null;
        this.rightGain = null;
        this.leftPanner = null;
        this.rightPanner = null;
        this.isInitialized = false;
        this.isActive = false;

        // Smoothing for frequency changes
        this.smoothingTime = 0.05; // 50ms

        // Visual feedback arrays (BasilaQ-127 format)
        this.visualLevels = new Float32Array(256); // 128 L + 128 R
        this.visualPans = new Float32Array(256);
    }

    /**
     * Initialize the Web Audio nodes.
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Master gain
            this.mainGain = this.audioContext.createGain();
            this.mainGain.gain.value = 0.3; // Prevent clipping
            this.mainGain.connect(this.audioContext.destination);

            // Left hand oscillator chain
            this.leftOscillator = this.audioContext.createOscillator();
            this.leftOscillator.type = 'sine';
            this.leftOscillator.frequency.value = 440; // A4

            this.leftGain = this.audioContext.createGain();
            this.leftGain.gain.value = 0;

            this.leftPanner = this.audioContext.createStereoPanner();
            this.leftPanner.pan.value = -0.5; // Slightly left

            this.leftOscillator.connect(this.leftGain);
            this.leftGain.connect(this.leftPanner);
            this.leftPanner.connect(this.mainGain);

            // Right hand oscillator chain
            this.rightOscillator = this.audioContext.createOscillator();
            this.rightOscillator.type = 'sawtooth';
            this.rightOscillator.frequency.value = 440;

            this.rightGain = this.audioContext.createGain();
            this.rightGain.gain.value = 0;

            this.rightPanner = this.audioContext.createStereoPanner();
            this.rightPanner.pan.value = 0.5; // Slightly right

            this.rightOscillator.connect(this.rightGain);
            this.rightGain.connect(this.rightPanner);
            this.rightPanner.connect(this.mainGain);

            // Start oscillators (always running, controlled by gain)
            this.leftOscillator.start();
            this.rightOscillator.start();

            this.isInitialized = true;
            console.log('[GestureSynthesizer] Initialized');
        } catch (error) {
            console.error('[GestureSynthesizer] Init error:', error);
        }
    }

    /**
     * Start synthesis (unmute).
     */
    start() {
        if (!this.isInitialized) {
            console.warn('[GestureSynthesizer] Not initialized');
            return;
        }
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }
        this.isActive = true;
        console.log('[GestureSynthesizer] Started');
    }

    /**
     * Stop synthesis (mute).
     */
    stop() {
        if (!this.isInitialized) return;
        this.isActive = false;
        // Fade out
        const now = this.audioContext.currentTime;
        this.leftGain.gain.setTargetAtTime(0, now, 0.1);
        this.rightGain.gain.setTargetAtTime(0, now, 0.1);

        // Clear visual arrays
        this.visualLevels.fill(0);
        this.visualPans.fill(0);

        console.log('[GestureSynthesizer] Stopped');
    }

    /**
     * Update synthesizer based on hand data.
     * Also emits visual data for hologram feedback.
     * @param {object} handData - { left: { active, frequency, gain, pan, bandwidth }, right: {...} }
     */
    update(handData) {
        if (!this.isInitialized || !this.isActive) return;

        const now = this.audioContext.currentTime;

        // Reset visual arrays
        this.visualLevels.fill(-128); // Silence in dB
        this.visualPans.fill(0);

        // Left Hand → Left Oscillator + Left Visual (indices 0-127)
        if (handData.left && handData.left.active) {
            const freqIdx = Math.floor(handData.left.frequency);
            const freq = SEMITONE_FREQUENCIES[Math.min(freqIdx, 127)] || 440;
            const gain = handData.left.gain * 0.5; // Scale down
            const pan = handData.left.pan;
            const bandwidth = handData.left.bandwidth || 5;

            this.leftOscillator.frequency.setTargetAtTime(freq, now, this.smoothingTime);
            this.leftGain.gain.setTargetAtTime(gain, now, this.smoothingTime);
            this.leftPanner.pan.setTargetAtTime(pan, now, this.smoothingTime);

            // Generate visual data with Gaussian spread
            this._fillVisualData(0, 127, freqIdx, gain, pan, bandwidth);
        } else {
            // Fade out left
            this.leftGain.gain.setTargetAtTime(0, now, this.smoothingTime);
        }

        // Right Hand → Right Oscillator + Right Visual (indices 128-255)
        if (handData.right && handData.right.active) {
            const freqIdx = Math.floor(handData.right.frequency);
            const freq = SEMITONE_FREQUENCIES[Math.min(freqIdx, 127)] || 440;
            const gain = handData.right.gain * 0.5;
            const pan = handData.right.pan;
            const bandwidth = handData.right.bandwidth || 5;

            this.rightOscillator.frequency.setTargetAtTime(freq, now, this.smoothingTime);
            this.rightGain.gain.setTargetAtTime(gain, now, this.smoothingTime);
            this.rightPanner.pan.setTargetAtTime(pan, now, this.smoothingTime);

            // Generate visual data with Gaussian spread (offset by 128 for right channel)
            this._fillVisualData(128, 255, freqIdx + 128, gain, pan, bandwidth);
        } else {
            // Fade out right
            this.rightGain.gain.setTargetAtTime(0, now, this.smoothingTime);
        }

        // Emit visual data for hologram (closing the loop!)
        eventBus.emit('gestureSynthData', {
            levels: this.visualLevels,
            pans: this.visualPans,
            isGestureSynth: true
        });
    }

    /**
     * Fill visual data arrays with Gaussian-spread energy around a center frequency.
     */
    _fillVisualData(startIdx, endIdx, centerIdx, gain, pan, bandwidth) {
        // Convert gain (0-0.5) to dB (-60 to -10)
        const dbValue = gain > 0 ? -60 + (gain * 2 * 50) : -128;

        for (let i = startIdx; i <= endIdx; i++) {
            const dist = Math.abs(i - centerIdx);
            const influence = Math.exp(-(dist * dist) / (2 * bandwidth * bandwidth));

            if (influence > 0.01) {
                // Additive blending
                const currentDb = this.visualLevels[i];
                const targetDb = dbValue * influence;
                this.visualLevels[i] = Math.max(currentDb, targetDb);
                this.visualPans[i] = pan * influence;
            }
        }
    }

    /**
     * Set oscillator waveform type.
     * @param {string} type - 'sine', 'square', 'sawtooth', 'triangle'
     * @param {string} hand - 'left', 'right', or 'both'
     */
    setWaveform(type, hand = 'both') {
        if (!this.isInitialized) return;
        if (hand === 'left' || hand === 'both') {
            this.leftOscillator.type = type;
        }
        if (hand === 'right' || hand === 'both') {
            this.rightOscillator.type = type;
        }
    }

    /**
     * Clean up resources.
     */
    dispose() {
        if (!this.isInitialized) return;
        this.stop();
        this.leftOscillator.stop();
        this.rightOscillator.stop();
        this.audioContext.close();
        this.isInitialized = false;
        console.log('[GestureSynthesizer] Disposed');
    }
}

// Singleton instance
export const gestureSynthesizer = new GestureSynthesizer();
