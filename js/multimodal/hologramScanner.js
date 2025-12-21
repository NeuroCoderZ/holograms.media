// frontend/js/multimodal/hologramScanner.js
// Scans hologram visualization from camera and reconstructs audio

import { semitones, GRID_HEIGHT } from '../config/hologramConfig.js';
import { HologramSynthesizer } from './hologramSynthesizer.js';
import eventBus from '../core/eventBus.js';

/**
 * HologramScanner captures camera frames and extracts audio parameters
 * from the visual representation of the hologram.
 * 
 * Flow: Camera → Column Detection (by HSL color) → Height/Brightness → Audio Synthesis
 */
export class HologramScanner {
    constructor() {
        this.isActive = false;
        this.videoElement = null;
        this.canvasElement = null;
        this.canvasCtx = null;
        this.synthesizer = null;
        this.animationFrameId = null;

        // Color detection tolerances
        this.hueTolerance = 10;     // degrees
        this.satTolerance = 0.2;    // 0-1
        this.minLightness = 0.05;   // Minimum brightness to detect

        // Pre-calculate target colors for each semitone
        this.semitoneColors = this._calculateSemitoneColors();

        console.log('[HologramScanner] Initialized with', this.semitoneColors.length, 'target colors');
    }

    /**
     * Pre-calculates HSL color targets for each semitone from config.
     */
    _calculateSemitoneColors() {
        return semitones.map((st, i) => {
            const hsl = {};
            st.color.getHSL(hsl);
            return {
                index: i,
                h: hsl.h * 360, // Convert 0-1 to degrees
                s: hsl.s,
                l: hsl.l,
                frequency: st.f,
                note: st.note
            };
        });
    }

    /**
     * Starts the scanner with the specified video input device.
     * @param {string} deviceId - Optional camera device ID
     */
    async start(deviceId = null) {
        if (this.isActive) {
            console.warn('[HologramScanner] Already active');
            return;
        }

        try {
            // Get camera stream
            const constraints = {
                video: {
                    facingMode: 'environment', // Prefer rear camera on mobile
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                    frameRate: { ideal: 60, min: 30 }
                }
            };

            if (deviceId) {
                constraints.video.deviceId = { exact: deviceId };
            }

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Create hidden video element
            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = stream;
            this.videoElement.playsInline = true;
            this.videoElement.muted = true;
            await this.videoElement.play();

            // Create canvas for frame processing
            this.canvasElement = document.createElement('canvas');
            this.canvasElement.width = this.videoElement.videoWidth || 1280;
            this.canvasElement.height = this.videoElement.videoHeight || 720;
            this.canvasCtx = this.canvasElement.getContext('2d', { willReadFrequently: true });

            // Initialize synthesizer
            this.synthesizer = new HologramSynthesizer();
            await this.synthesizer.init();

            this.isActive = true;
            console.log('[HologramScanner] Started with resolution:',
                this.canvasElement.width, 'x', this.canvasElement.height);

            // Start frame processing loop
            this._processFrame();

            eventBus.emit('scannerStarted');

        } catch (error) {
            console.error('[HologramScanner] Failed to start:', error);
            this.stop();
            throw error;
        }
    }

    /**
     * Stops the scanner and releases resources.
     */
    stop() {
        this.isActive = false;

        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }

        if (this.videoElement && this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(t => t.stop());
            this.videoElement.srcObject = null;
        }

        if (this.synthesizer) {
            this.synthesizer.dispose();
            this.synthesizer = null;
        }

        console.log('[HologramScanner] Stopped');
        eventBus.emit('scannerStopped');
    }

    /**
     * Main frame processing loop.
     */
    _processFrame() {
        if (!this.isActive) return;

        // Draw video frame to canvas
        this.canvasCtx.drawImage(this.videoElement, 0, 0);

        // Get image data for analysis
        const imageData = this.canvasCtx.getImageData(
            0, 0, this.canvasElement.width, this.canvasElement.height
        );

        // Extract audio parameters from the image
        const audioParams = this._extractAudioParams(imageData);

        // Update synthesizer with extracted parameters
        if (this.synthesizer && audioParams) {
            this.synthesizer.update(audioParams.levels, audioParams.pans);
        }

        // Emit data for visualization (if needed)
        eventBus.emit('scannerData', audioParams);

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(() => this._processFrame());
    }

    /**
     * Extracts audio parameters from camera frame by detecting column colors.
     * @param {ImageData} imageData - Canvas image data
     * @returns {Object} { levels: Float32Array[256], pans: Float32Array[128] }
     */
    _extractAudioParams(imageData) {
        const { width, height, data } = imageData;
        const levels = new Float32Array(256); // 128 L + 128 R
        const pans = new Float32Array(128);

        // For each semitone, find matching colored pixels
        for (let i = 0; i < 128; i++) {
            const target = this.semitoneColors[i];
            let totalBrightness = 0;
            let matchCount = 0;
            let leftBrightness = 0;
            let rightBrightness = 0;
            let leftCount = 0;
            let rightCount = 0;
            const halfWidth = width / 2;

            // Scan image for matching pixels
            // Optimize: sample every Nth pixel for performance
            const sampleStep = 4; // Check every 4th pixel

            for (let y = 0; y < height; y += sampleStep) {
                for (let x = 0; x < width; x += sampleStep) {
                    const idx = (y * width + x) * 4;
                    const r = data[idx];
                    const g = data[idx + 1];
                    const b = data[idx + 2];

                    // Convert RGB to HSL
                    const hsl = this._rgbToHsl(r, g, b);

                    // Check if color matches this semitone
                    if (this._colorMatches(hsl, target)) {
                        const brightness = hsl.l;
                        totalBrightness += brightness;
                        matchCount++;

                        // Track left/right for pan calculation
                        if (x < halfWidth) {
                            leftBrightness += brightness;
                            leftCount++;
                        } else {
                            rightBrightness += brightness;
                            rightCount++;
                        }
                    }
                }
            }

            // Calculate average brightness (volume)
            if (matchCount > 0) {
                const avgBrightness = totalBrightness / matchCount;
                // Convert brightness (0-1) to dB scale (-128 to 0)
                const dbLevel = (avgBrightness * 128) - 128;

                levels[i] = dbLevel;       // Left channel
                levels[i + 128] = dbLevel; // Right channel

                // Calculate pan from spatial distribution
                const avgLeft = leftCount > 0 ? leftBrightness / leftCount : 0;
                const avgRight = rightCount > 0 ? rightBrightness / rightCount : 0;
                const total = avgLeft + avgRight;

                if (total > 0.001) {
                    pans[i] = (avgRight - avgLeft) / total; // -1 to +1
                } else {
                    pans[i] = 0;
                }
            } else {
                levels[i] = -128;       // Silence
                levels[i + 128] = -128;
                pans[i] = 0;
            }
        }

        return { levels, pans };
    }

    /**
     * Converts RGB to HSL.
     * @returns {Object} { h: 0-360, s: 0-1, l: 0-1 }
     */
    _rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }

        return { h: h * 360, s, l };
    }

    /**
     * Checks if a pixel color matches a semitone's target color.
     */
    _colorMatches(pixelHsl, targetColor) {
        // Check lightness first (faster rejection)
        if (pixelHsl.l < this.minLightness) return false;

        // Hue distance (circular)
        let hueDiff = Math.abs(pixelHsl.h - targetColor.h);
        if (hueDiff > 180) hueDiff = 360 - hueDiff;

        if (hueDiff > this.hueTolerance) return false;

        // Saturation must be similar
        if (Math.abs(pixelHsl.s - targetColor.s) > this.satTolerance) return false;

        return true;
    }

    /**
     * Gets current scanner status.
     */
    getStatus() {
        return {
            isActive: this.isActive,
            resolution: this.canvasElement
                ? `${this.canvasElement.width}x${this.canvasElement.height}`
                : null
        };
    }
}

// Export singleton instance
export const hologramScanner = new HologramScanner();
