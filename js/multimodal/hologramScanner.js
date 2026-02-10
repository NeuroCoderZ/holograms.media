// frontend/js/multimodal/hologramScanner.js
// Scans hologram visualization from camera and reconstructs audio

import { semitones, GRID_HEIGHT, START_HUE, END_HUE } from '../config/hologramConfig.js';
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
        // this.hueTolerance = 10;     // No longer used with direct mapping
        this.minSaturation = 0.5;   // Minimum saturation to accept
        this.minLightness = 0.15;   // Minimum brightness to detect

        // Stabilization State (Sticky Frame)
        this.stabilization = {
            offX: 0,
            offY: 0
        };

        // Pre-calculate target colors? No, we use direct mapping now.
        // this.semitoneColors = this._calculateSemitoneColors();
        console.log('[HologramScanner] Initialized with optimized single-pass analysis.');
    }

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

            // Create viewfinder overlay
            this._createViewfinderUI();

            // Create video element for camera feed
            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = stream;
            this.videoElement.playsInline = true;
            this.videoElement.muted = true;
            this.videoElement.id = 'scanner-video';
            // Hidden video element, we only show the canvas or just the viewfinder UI
            this.videoElement.style.cssText = `
                position: fixed;
                top: -9999px;
                left: -9999px;
                visibility: hidden;
            `;
            document.body.appendChild(this.videoElement);
            await this.videoElement.play();

            // Create canvas for frame processing (Analysis Buffer)
            // We use a smaller size for analysis to improve performance
            this.canvasElement = document.createElement('canvas');
            this.canvasElement.width = 640; // Reduced resolution for analysis
            this.canvasElement.height = 360;
            this.canvasCtx = this.canvasElement.getContext('2d', { willReadFrequently: true });

            // Initialize synthesizer
            this.synthesizer = new HologramSynthesizer();
            await this.synthesizer.init();

            this.isActive = true;
            this.stabilization = { offX: 0, offY: 0 }; // Reset stabilization

            console.log('[HologramScanner] Started. Analysis Resolution:',
                this.canvasElement.width, 'x', this.canvasElement.height);

            // Disable hand tracking while scanning
            eventBus.emit('scannerStarted');

            // Start frame processing loop
            this._processFrame();

        } catch (error) {
            console.error('[HologramScanner] Failed to start:', error);
            this.stop();
            throw error;
        }
    }

    /**
     * Creates the viewfinder overlay UI (QR-scanner style).
     */
    _createViewfinderUI() {
        // Remove any existing overlay
        const existing = document.getElementById('scanner-overlay');
        if (existing) existing.remove();

        // Create overlay container
        this.overlayElement = document.createElement('div');
        this.overlayElement.id = 'scanner-overlay';
        this.overlayElement.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.85);
            z-index: 1000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        `;

        // Create scanning frame
        // Updated to 2:1 aspect ratio (256x128 approx)
        const frame = document.createElement('div');
        frame.id = 'scanner-frame';
        frame.style.cssText = `
            position: relative;
            width: 80vw;
            max-width: 640px;
            aspect-ratio: 2 / 1; 
            border: 3px solid #00ff88;
            border-radius: 12px;
            box-shadow: 0 0 30px rgba(0, 255, 136, 0.3);
            background: rgba(0, 50, 0, 0.1); /* Slight tint to show active area */
            overflow: hidden;
        `;

        // Add a canvas to show the "Stabilized" view inside the frame
        // This gives the user feedback on what the scanner is "locking" onto
        this.feedbackCanvas = document.createElement('canvas');
        this.feedbackCanvas.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0.6;
        `;
        frame.appendChild(this.feedbackCanvas);

        // Scan Beam Animation
        const scanBeam = document.createElement('div');
        scanBeam.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 4px;
            background: linear-gradient(90deg, transparent, #00ff88, transparent);
            box-shadow: 0 0 15px #00ff88;
            opacity: 0.8;
            animation: scanMove 2s infinite linear;
            pointer-events: none;
        `;
        // Inject animation keyframes
        const styleSheet = document.createElement("style");
        styleSheet.innerText = `
            @keyframes scanMove {
                0% { top: 0%; opacity: 0; }
                10% { opacity: 1; }
                90% { opacity: 1; }
                100% { top: 100%; opacity: 0; }
            }
        `;
        document.head.appendChild(styleSheet);
        frame.appendChild(scanBeam);

        // Corner markers
        const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
        corners.forEach(corner => {
            const marker = document.createElement('div');
            marker.className = 'scanner-corner';
            const [v, h] = corner.split('-');
            marker.style.cssText = `
                position: absolute;
                width: 30px;
                height: 30px;
                border: 4px solid #00ff88;
                ${v}: -2px;
                ${h}: -2px;
                border-${v === 'top' ? 'bottom' : 'top'}: none;
                border-${h === 'left' ? 'right' : 'left'}: none;
                border-radius: ${corner === 'top-left' ? '12px 0 0 0' :
                    corner === 'top-right' ? '0 12px 0 0' :
                        corner === 'bottom-left' ? '0 0 0 12px' : '0 0 12px 0'};
                pointer-events: none;
            `;
            frame.appendChild(marker);
        });

        // Status text
        const statusText = document.createElement('div');
        statusText.id = 'scanner-status';
        statusText.textContent = '🎵 Scanning...';
        statusText.style.cssText = `
            color: #00ff88;
            font-size: 16px;
            margin-top: 20px;
            font-family: system-ui, sans-serif;
        `;

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ Close';
        closeBtn.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
        `;
        closeBtn.onclick = () => this.stop();

        this.overlayElement.appendChild(frame);
        this.overlayElement.appendChild(statusText);
        this.overlayElement.appendChild(closeBtn);
        document.body.appendChild(this.overlayElement);
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

        if (this.videoElement && this.videoElement.parentNode) {
            this.videoElement.parentNode.removeChild(this.videoElement);
            this.videoElement = null;
        }

        if (this.overlayElement && this.overlayElement.parentNode) {
            this.overlayElement.parentNode.removeChild(this.overlayElement);
            this.overlayElement = null;
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
        if (!this.isActive || !this.videoElement || this.videoElement.readyState < 2) {
            if (this.isActive) this.animationFrameId = requestAnimationFrame(() => this._processFrame());
            return;
        }

        const videoW = this.videoElement.videoWidth;
        const videoH = this.videoElement.videoHeight;
        const canvasW = this.canvasElement.width;
        const canvasH = this.canvasElement.height;

        // Calculate aspect ratio crop
        const targetAspect = canvasW / canvasH; // 1.77 or 2.0 based on canvas size
        const videoAspect = videoW / videoH;

        let cropW, cropH;
        if (targetAspect > videoAspect) {
            cropW = videoW;
            cropH = videoW / targetAspect;
        } else {
            cropH = videoH;
            cropW = videoH * targetAspect;
        }

        // Apply Stabilization Offset
        // Center of crop region
        let cx = videoW / 2 + this.stabilization.offX;
        let cy = videoH / 2 + this.stabilization.offY;

        // Clamp crop to video bounds
        cx = Math.max(cropW / 2, Math.min(videoW - cropW / 2, cx));
        cy = Math.max(cropH / 2, Math.min(videoH - cropH / 2, cy));

        const sx = cx - cropW / 2;
        const sy = cy - cropH / 2;

        // Draw stabilized frame to Analysis Canvas
        this.canvasCtx.drawImage(this.videoElement, sx, sy, cropW, cropH, 0, 0, canvasW, canvasH);

        // Also draw to feedback canvas in UI (low res preview)
        if (this.feedbackCanvas) {
            if (this.feedbackCanvas.width !== canvasW) {
                this.feedbackCanvas.width = canvasW;
                this.feedbackCanvas.height = canvasH;
            }
            const fbCtx = this.feedbackCanvas.getContext('2d');
            fbCtx.drawImage(this.canvasElement, 0, 0);
        }

        // Get image data for analysis
        const imageData = this.canvasCtx.getImageData(0, 0, canvasW, canvasH);

        // Extract audio parameters & Calculate new Centroid
        const result = this._extractAudioParamsOptimized(imageData);
        const { audioParams, centroid } = result;

        // Update Stabilization
        if (centroid.weight > 0.01) { // Only stabilize if we see something significant
            // Centroid is in normalized coords 0..1 (relative to canvas center would be better for offset)
            // But _extractAudioParamsOptimized returns relative to top-left 0..1?
            // Let's assume normalized 0..1 first.

            // Error relative to center (0.5, 0.5)
            const errX = (centroid.x - 0.5) * cropW;
            const errY = (centroid.y - 0.5) * cropH;

            // Apply dampening (Sticky Frame effect)
            // Move the offset towards the error to center the "mass"
            // If object is at right (centroid.x > 0.5), we need to look right -> offset increases.
            this.stabilization.offX += errX * 0.1;
            this.stabilization.offY += errY * 0.1;
        } else {
            // Decay to center if nothing found
            this.stabilization.offX *= 0.95;
            this.stabilization.offY *= 0.95;
        }

        // Update synthesizer with extracted parameters
        if (this.synthesizer && audioParams) {
            this.synthesizer.update(audioParams.levels, audioParams.pans);
        }

        // Emit data for visualization
        eventBus.emit('scannerData', audioParams);

        // Schedule next frame
        this.animationFrameId = requestAnimationFrame(() => this._processFrame());
    }

    /**
     * Optimized single-pass Audio Param extraction.
     * Also calculates brightness centroid.
     * @param {ImageData} imageData 
     */
    /*
     * DENDY-SCANNER (BasilaQ-127 Simple Vision)
     * Maps 128 vertical strips directly to frequencies.
     * Ignores Hue. Uses Luminance only.
     */
    _extractAudioParamsOptimized(imageData) {
        const { width, height, data } = imageData;
        const levels = new Float32Array(256).fill(-128); // Init silence
        const pans = new Float32Array(128).fill(0);      // Center pan for simple mode

        // Calculate global scene brightness for adaptive thresholding
        let globalSum = 0;
        for (let i = 0; i < data.length; i += 16) { // Sparse sampling
            globalSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        const avgBrightness = globalSum / (data.length / 16);
        const adaptiveThreshold = Math.max(0.1, avgBrightness / 255 * 1.5); // Adaptive base

        // Strip width
        const numStrips = 128;
        const stripWidth = width / numStrips;

        const fbCtx = this.feedbackCanvas ? this.feedbackCanvas.getContext('2d') : null;
        if (fbCtx) fbCtx.clearRect(0, 0, width, height); // Clear for highlights

        // Iterate over strips
        for (let i = 0; i < numStrips; i++) {
            const startX = Math.floor(i * stripWidth);
            const endX = Math.floor((i + 1) * stripWidth);

            let totalLuminance = 0;
            let pixelCount = 0;

            for (let y = 0; y < height; y += 4) {
                for (let x = startX; x < endX; x += 4) {
                    if (x >= width) break;
                    const idx = (y * width + x) * 4;
                    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                    totalLuminance += lum;
                    pixelCount++;
                }
            }

            if (pixelCount > 0) {
                const avgLum = totalLuminance / pixelCount;
                const amp = avgLum / 255.0;

                // Use adaptive threshold instead of fixed 0.1
                if (amp > adaptiveThreshold) {
                    const db = 20 * Math.log10(Math.max(0.000001, amp));
                    levels[i] = Math.max(-128, db);
                    levels[i + 128] = Math.max(-128, db);

                    // Simple Pan Mapping: Left (0) -> -1, Right (127) -> 1
                    pans[i] = (i / 63.5) - 1.0;

                    // Visual Feedback: Stereo Color Gradient (Cyan -> Magenta)
                    if (fbCtx) {
                        const hue = 180 + (i / 127) * 120; // 180 (Cyan) -> 300 (Magenta)
                        fbCtx.fillStyle = `hsla(${hue}, 100%, 50%, ${amp * 0.8})`;
                        fbCtx.fillRect(startX, 0, stripWidth, height);
                    }
                }
            }
        }

        // Centroid calculation for stabilization (now actually weighted)
        let weightedX = 0, weightedY = 0, totalWeight = 0;
        for (let i = 0; i < 128; i++) {
            const amp = Math.pow(10, levels[i] / 20);
            if (amp > 0.1) {
                weightedX += (i / 127) * amp;
                totalWeight += amp;
            }
        }

        const centroid = totalWeight > 0 ?
            { x: weightedX / totalWeight, y: 0.5, weight: totalWeight } :
            { x: 0.5, y: 0.5, weight: 0 };

        return {
            audioParams: { levels, pans },
            centroid
        };
    }

    _rgbToHsl(r, g, b) {
        // ... (Utility kept if needed, but inlined above for perf) ...
        return {};
    }

    getStatus() {
        return {
            isActive: this.isActive,
            stabilization: this.stabilization
        };
    }
}

// Export singleton instance
export const hologramScanner = new HologramScanner();
