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

        // Adaptive Frame State (Stabilization)
        this.frameState = {
            x: 0.5, y: 0.5, w: 0.8, h: 0.8, // Normalized 0..1
            velocity: { x: 0, y: 0, w: 0, h: 0 }
        };
        // Ensure square start
        const screenAspect = window.innerWidth / window.innerHeight;
        this.frameState.h = this.frameState.w * screenAspect;

        console.log('[HologramScanner] Initialized with optimized single-pass analysis.');
    }

    async start(deviceId = null) {
        if (this.isActive) {
            console.warn('[HologramScanner] Already active');
            return;
        }

        try {
            // Get all devices to find the best camera
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');

            // Heuristic: Prefer back cameras and look for many cameras (pro/max models)
            let bestDeviceId = deviceId;
            if (!bestDeviceId) {
                const backCams = videoDevices.filter(d =>
                    d.label.toLowerCase().includes('back') ||
                    d.label.toLowerCase().includes('rear') ||
                    d.label.toLowerCase().includes('environment')
                );
                // We pick the one with the highest index, often the primary high-res one
                if (backCams.length > 0) {
                    bestDeviceId = backCams[backCams.length - 1].deviceId;
                }
            }

            const constraints = {
                video: {
                    facingMode: bestDeviceId ? undefined : 'environment',
                    deviceId: bestDeviceId ? { exact: bestDeviceId } : undefined,
                    width: { ideal: 3840, min: 1280 }, // Request 4K if available
                    height: { ideal: 2160, min: 720 },
                    frameRate: { ideal: 60, min: 30 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);

            // Create viewfinder overlay
            this._createViewfinderUI();

            // Create video element for camera feed
            this.videoElement = document.createElement('video');
            this.videoElement.srcObject = stream;
            this.videoElement.playsInline = true;
            this.videoElement.muted = true;
            this.videoElement.id = 'scanner-video';
            // Show video full screen as background
            this.videoElement.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                object-fit: cover;
                z-index: 999;
                visibility: visible;
                background: #000;
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
            background: transparent; /* Transparent to allow box-shadow dimming */
            z-index: 1000;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        `;

        // Create scanning frame (Window)
        this.frameElement = document.createElement('div');
        this.frameElement.id = 'scanner-frame';
        this.frameElement.style.cssText = `
            position: absolute;
            width: 80vw;
            max-width: 640px;
            aspect-ratio: 1 / 1; 
            overflow: visible; 
            pointer-events: none;
            /* Spotlight effect: everything outside is dimmed */
            box-shadow: 0 0 0 5000px rgba(0, 0, 0, 0.5); 
            z-index: 1010;
        `;

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
                border: 4px solid #ffffff;
                ${v}: -2px;
                ${h}: -2px;
                border-${v === 'top' ? 'bottom' : 'top'}: none;
                border-${h === 'left' ? 'right' : 'left'}: none;
                border-radius: 0; /* Sharp corners as requested */
                pointer-events: none;
                z-index: 10;
            `;
            this.frameElement.appendChild(marker);
        });

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
            z-index: 2000; /* Ensure clickable */
        `;
        closeBtn.onclick = () => this.stop();

        this.overlayElement.appendChild(this.frameElement);
        this.overlayElement.appendChild(closeBtn);
        this.overlayElement.style.pointerEvents = 'none';
        closeBtn.style.pointerEvents = 'auto';

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

        // --- ASPECT SYNC (cover simulation) ---
        const screenAspect = window.innerWidth / window.innerHeight;
        const videoAspect = videoW / videoH;

        let cropW, cropH;
        if (screenAspect > videoAspect) {
            cropW = videoW;
            cropH = videoW / screenAspect;
        } else {
            cropH = videoH;
            cropW = videoH * screenAspect;
        }

        // Apply Stabilization Offset
        let cx = videoW / 2 + this.stabilization.offX;
        let cy = videoH / 2 + this.stabilization.offY;

        cx = Math.max(cropW / 2, Math.min(videoW - cropW / 2, cx));
        cy = Math.max(cropH / 2, Math.min(videoH - cropH / 2, cy));

        const sx = cx - cropW / 2;
        const sy = cy - cropH / 2;

        this.canvasCtx.drawImage(this.videoElement, sx, sy, cropW, cropH, 0, 0, canvasW, canvasH);
        const imageData = this.canvasCtx.getImageData(0, 0, canvasW, canvasH);

        const result = this._extractAudioParamsOptimized(imageData);
        const { audioParams, centroid, boundingBox } = result;

        if (centroid.weight > 0.01) {
            const errX = (centroid.x - 0.5) * cropW;
            const errY = (centroid.y - 0.5) * cropH;
            this.stabilization.offX += errX * 0.1;
            this.stabilization.offY += errY * 0.1;
        } else {
            this.stabilization.offX *= 0.95;
            this.stabilization.offY *= 0.95;
        }

        if (this.synthesizer && audioParams) {
            this.synthesizer.update(audioParams.levels, audioParams.pans);
        }

        eventBus.emit('scannerData', audioParams);

        // --- Adaptive Frame Update ---
        if (boundingBox && boundingBox.found) {
            const targetW = Math.max(0.3, (boundingBox.maxX - boundingBox.minX) / canvasW + 0.1);
            const targetH = targetW * screenAspect; // Forced square on screen (1:1)

            const targetX = (boundingBox.minX + boundingBox.maxX) / 2 / canvasW;
            const targetY = (boundingBox.minY + boundingBox.maxY) / 2 / canvasH;

            this.frameState.x += (targetX - this.frameState.x) * 0.1;
            this.frameState.y += (targetY - this.frameState.y) * 0.1;
            this.frameState.w += (targetW - this.frameState.w) * 0.1;
            this.frameState.h += (targetH - this.frameState.h) * 0.1;
        } else {
            const defaultW = 0.8;
            const defaultH = defaultW * screenAspect;

            this.frameState.x += (0.5 - this.frameState.x) * 0.05;
            this.frameState.y += (0.5 - this.frameState.y) * 0.05;
            this.frameState.w += (defaultW - this.frameState.w) * 0.05;
            this.frameState.h += (defaultH - this.frameState.h) * 0.05;
        }

        if (this.frameElement) {
            const left = (this.frameState.x - this.frameState.w / 2) * 100;
            const top = (this.frameState.y - this.frameState.h / 2) * 100;
            const width = this.frameState.w * 100;
            const height = this.frameState.h * 100;

            this.frameElement.style.left = `${left}%`;
            this.frameElement.style.top = `${top}%`;
            this.frameElement.style.width = `${width}%`;
            this.frameElement.style.height = `${height}%`;
            this.frameElement.style.aspectRatio = 'auto';
            this.frameElement.style.transform = 'translate(0, 0)';
        }

        this.animationFrameId = requestAnimationFrame(() => this._processFrame());
    }

    _extractAudioParamsOptimized(imageData) {
        const { width, height, data } = imageData;
        const levels = new Float32Array(256).fill(-128); // Init silence
        const pans = new Float32Array(128).fill(0);      // Center pan for simple mode

        // Calculate global scene brightness for adaptive thresholding
        let globalSum = 0;
        for (let i = 0; i < data.length; i += 16) {
            globalSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        }
        const avgBrightness = globalSum / (data.length / 16);
        const adaptiveThreshold = Math.max(0.1, avgBrightness / 255 * 1.5);

        // Strip width
        const numStrips = 128;
        const stripWidth = width / numStrips;

        // Iterate over strips to detect columns
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

                if (amp > adaptiveThreshold) {
                    const db = 20 * Math.log10(Math.max(0.000001, amp));
                    levels[i] = Math.max(-128, db);
                    levels[i + 128] = Math.max(-128, db);
                    pans[i] = (i / 63.5) - 1.0;
                }
            }
        }

        // Centroid calculation for stabilization (now actually weighted)
        let weightedX = 0, totalWeight = 0;
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

        // Update Centroid & Bounding Box
        let minX = width, maxX = 0, minY = height, maxY = 0;
        let foundAny = false;

        // Specialized Anchor Detection for Corners (Purple/Red)
        // Violet is i ~ 127 (high freq), Red is i ~ 0 (low freq)
        // Based on user: Purple Top-Left, Red Top-Right

        for (let i = 0; i < numStrips; i++) {
            if (levels[i] > -90) {
                foundAny = true;
                const startX = i * stripWidth;
                minX = Math.min(minX, startX);
                maxX = Math.max(maxX, startX + stripWidth);

                // Scan vertical extent for this active column
                let colMinY = height, colMaxY = 0;
                const stripCenterX = Math.floor(startX + stripWidth / 2);

                for (let y = 0; y < height; y += 8) {
                    const idx = (y * width + stripCenterX) * 4;
                    const lum = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2];
                    if (lum > adaptiveThreshold * 255) {
                        colMinY = Math.min(colMinY, y);
                        colMaxY = Math.max(colMaxY, y);
                    }
                }

                if (colMinY < colMaxY) {
                    minY = Math.min(minY, colMinY);
                    maxY = Math.max(maxY, colMaxY);
                } else {
                    // Fallback if column scan failed but levels detected
                    minY = Math.min(minY, height * 0.25);
                    maxY = Math.max(maxY, height * 0.75);
                }
            }
        }

        const boundingBox = {
            found: foundAny,
            minX: foundAny ? minX : 0,
            maxX: foundAny ? maxX : width,
            minY: foundAny ? minY : 0,
            maxY: foundAny ? maxY : height
        };

        return {
            audioParams: { levels, pans },
            centroid,
            boundingBox
        };
    }

    _rgbToHsl(r, g, b) {
        let r1 = r / 255, g1 = g / 255, b1 = b / 255;
        let max = Math.max(r1, g1, b1), min = Math.min(r1, g1, b1);
        let h, s, l = (max + min) / 2;
        if (max === min) h = s = 0;
        else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r1: h = (g1 - b1) / d + (g1 < b1 ? 6 : 0); break;
                case g1: h = (b1 - r1) / d + 2; break;
                case b1: h = (r1 - g1) / d + 4; break;
            }
            h /= 6;
        }
        return { h: h * 360, s, l };
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
