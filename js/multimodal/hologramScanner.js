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

        // 4-Point Frame State (Perspective Support)
        this.framePoints = {
            tl: { x: 0.1, y: 0.1 },
            tr: { x: 0.9, y: 0.1 },
            bl: { x: 0.1, y: 0.7 },
            br: { x: 0.9, y: 0.7 }
        };

        console.log('[HologramScanner] Initialized with Perspective Tracking support.');
    }

    async start(deviceId = null) {
        if (this.isActive) {
            console.warn('[HologramScanner] Already active');
            return;
        }

        try {
            const constraints = {
                video: {
                    facingMode: 'environment',
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
            this.videoElement.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; object-fit: cover; z-index: 999; visibility: visible; background: #000;`;
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
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.5); /* Base dimming */
            z-index: 1000; pointer-events: none;
            clip-path: polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 
                               0% 0%, 10% 10%, 10% 70%, 90% 70%, 90% 10%, 10% 10%);
        `;

        // Corner markers
        this.cornerElements = {};
        ['tl', 'tr', 'bl', 'br'].forEach(pos => {
            const marker = document.createElement('div');
            marker.className = 'scanner-corner';
            marker.style.cssText = `
                position: absolute; width: 40px; height: 40px;
                border: 4px solid #ffffff; z-index: 1010; transition: none;
            `;
            if (pos === 'tl') marker.style.borderRight = marker.style.borderBottom = 'none';
            if (pos === 'tr') marker.style.borderLeft = marker.style.borderBottom = 'none';
            if (pos === 'bl') marker.style.borderRight = marker.style.borderTop = 'none';
            if (pos === 'br') marker.style.borderLeft = marker.style.borderTop = 'none';

            this.cornerElements[pos] = marker;
            document.body.appendChild(marker);
        });

        // Close button
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '✕ Close';
        closeBtn.style.cssText = `position:absolute; top:20px; right:20px; background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.3); color:white; padding:10px 20px; border-radius:8px; cursor:pointer; z-index:2000; pointer-events:auto;`;
        closeBtn.onclick = () => this.stop();
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

        if (this.videoElement) {
            if (this.videoElement.srcObject) {
                this.videoElement.srcObject.getTracks().forEach(t => t.stop());
                this.videoElement.srcObject = null;
            }
            this.videoElement.remove();
            this.videoElement = null;
        }

        if (this.overlayElement) {
            this.overlayElement.remove();
            this.overlayElement = null;
        }

        Object.values(this.cornerElements || {}).forEach(el => el.remove());
        this.cornerElements = null;

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

        this.canvasCtx.drawImage(this.videoElement, cx - cropW / 2, cy - cropH / 2, cropW, cropH, 0, 0, canvasW, canvasH);
        const imageData = this.canvasCtx.getImageData(0, 0, canvasW, canvasH);

        const result = this._extractAudioParamsOptimized(imageData);
        const { audioParams, centroid, boundingBox } = result;

        // Stabilization using Centroid of whole hologram
        this.stabilization.offX += (centroid.weight > 0.01 ? (centroid.x - 0.5) * cropW * 0.1 : -this.stabilization.offX * 0.05);
        this.stabilization.offY += (centroid.weight > 0.01 ? (centroid.y - 0.5) * cropH * 0.1 : -this.stabilization.offY * 0.05);

        if (this.synthesizer && audioParams) {
            this.synthesizer.update(audioParams.levels, audioParams.pans);
        }

        eventBus.emit('scannerData', audioParams);

        // --- Perspective Update ---
        const lerpFactor = 0.3; // More intensive tracking
        let targets;

        if (boundingBox && boundingBox.found && boundingBox.corners) {
            targets = {
                tl: { x: boundingBox.corners.tl.x / canvasW, y: boundingBox.corners.tl.y / canvasH },
                tr: { x: boundingBox.corners.tr.x / canvasW, y: boundingBox.corners.tr.y / canvasH },
                bl: { x: boundingBox.corners.bl.x / canvasW, y: boundingBox.corners.bl.y / canvasH },
                br: { x: boundingBox.corners.br.x / canvasW, y: boundingBox.corners.br.y / canvasH }
            };
        } else {
            targets = {
                tl: { x: 0.1, y: 0.15 }, tr: { x: 0.9, y: 0.15 }, bl: { x: 0.1, y: 0.75 }, br: { x: 0.9, y: 0.75 }
            };
        }

        ['tl', 'tr', 'bl', 'br'].forEach(p => {
            this.framePoints[p].x += (targets[p].x - this.framePoints[p].x) * lerpFactor;
            this.framePoints[p].y += (targets[p].y - this.framePoints[p].y) * lerpFactor;

            if (this.cornerElements[p]) {
                this.cornerElements[p].style.left = `${this.framePoints[p].x * 100}%`;
                this.cornerElements[p].style.top = `${this.framePoints[p].y * 100}%`;
                this.cornerElements[p].style.transform = `translate(${p.includes('r') ? '-100%' : '0'}, ${p.includes('b') ? '-100%' : '0'})`;
            }
        });

        // Update Spotlight Hole via Clip-Path
        if (this.overlayElement) {
            const clip = `polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, ` +
                `${this.framePoints.tl.x * 100}% ${this.framePoints.tl.y * 100}%, ` +
                `${this.framePoints.tr.x * 100}% ${this.framePoints.tr.y * 100}%, ` +
                `${this.framePoints.br.x * 100}% ${this.framePoints.br.y * 100}%, ` +
                `${this.framePoints.bl.x * 100}% ${this.framePoints.bl.y * 100}%, ` +
                `${this.framePoints.tl.x * 100}% ${this.framePoints.tl.y * 100}%)`;
            this.overlayElement.style.clipPath = clip;
        }

        this.animationFrameId = requestAnimationFrame(() => this._processFrame());
    }

    _extractAudioParamsOptimized(imageData) {
        const { width, height, data } = imageData;
        const levels = new Float32Array(256).fill(-128);
        const pans = new Float32Array(128).fill(0);

        // Global adaptive threshold
        let globalSum = 0;
        for (let i = 0; i < data.length; i += 16) globalSum += (data[i] + data[i + 1] + data[i + 2]) / 3;
        const threshold = Math.max(0.1, (globalSum / (data.length / 16) / 255) * 1.5) * 255;

        // --- ROW-BASED SCANNING (128 Rows) ---
        // Top row = High freq (index 127), Bottom row = Low freq (index 0)
        const rowH = height / 128;
        let weightedX = 0, weightedY = 0, totalW = 0;
        let minX = width, maxX = 0, minY = height, maxY = 0;
        let foundAny = false;

        for (let i = 0; i < 128; i++) {
            const semIdx = 127 - i; // Scan from Top to Bottom
            const sem = semitones[semIdx];
            if (!sem) continue;

            const rY = Math.floor(i * rowH + rowH / 2);
            const rOff = rY * width * 4;

            // Split row into Left half (Channel 0) and Right half (Channel 1)
            let sL = 0, cL = 0, cxL = 0;
            let sR = 0, cR = 0, cxR = 0;

            for (let x = 0; x < width; x += 2) {
                const b = (data[rOff + x * 4] + data[rOff + x * 4 + 1] + data[rOff + x * 4 + 2]) / 3;
                if (b > threshold) {
                    if (x < width / 2) {
                        sL += b; cL++; cxL += x * b;
                    } else {
                        sR += b; cR++; cxR += x * b;
                    }
                    minX = Math.min(minX, x);
                    maxX = Math.max(maxX, x);
                    minY = Math.min(minY, rY);
                    maxY = Math.max(maxY, rY);
                    foundAny = true;
                }
            }

            // Map brightness to dB (approximate)
            if (cL > 0) {
                const ampL = Math.max(0.000001, sL / (width / 2) / 255); // Normalized over half width
                levels[semIdx] = 20 * Math.log10(ampL);

                // PAN Extraction: Centroid relative to its base
                const space = 128 - sem.width;
                if (space > 1) {
                    pans[semIdx] = ((cxL / sL) / (width / 2) * 128 - 128 + sem.width - sem.width / 2) / space;
                }
                weightedX += (cxL / sL) * ampL;
                weightedY += rY * ampL;
                totalW += ampL;
            }
            if (cR > 0) {
                const ampR = Math.max(0.000001, sR / (width / 2) / 255);
                levels[semIdx + 128] = 20 * Math.log10(ampR);

                const space = 128 - sem.width;
                if (space > 1) {
                    pans[semIdx] = ((cxR / sR - width / 2) / (width / 2) * 128 - sem.width / 2) / space;
                }
                weightedX += (cxR / sR) * ampR;
                weightedY += rY * ampR;
                totalW += ampR;
            }
        }

        // Detect 4 corner points for perspective
        let corners = {
            tl: { x: width * 0.1, y: height * 0.15 },
            tr: { x: width * 0.9, y: height * 0.15 },
            bl: { x: width * 0.1, y: height * 0.75 },
            br: { x: width * 0.9, y: height * 0.75 }
        };

        if (foundAny) {
            // Find top and bottom active rows
            let firstActiveRow = -1, lastActiveRow = -1;
            for (let i = 0; i < 128; i++) {
                if (levels[i] > -100 || levels[i + 128] > -100) {
                    if (firstActiveRow === -1) firstActiveRow = i; // This is actually BOTTOM because we scan 127->0? 
                    // Wait, loop i=0..127. semIdx = 127-i. i=0 is Top (127), i=127 is Bottom (0).
                    lastActiveRow = i;
                }
            }

            if (firstActiveRow !== -1) {
                // Determine span for top and bottom edges
                const getRowSpan = (rowIdx) => {
                    let min = width, max = 0;
                    const rY = Math.floor(rowIdx * rowH + rowH / 2);
                    const rOff = rY * width * 4;
                    for (let x = 0; x < width; x += 4) {
                        const b = (data[rOff + x * 4] + data[rOff + x * 4 + 1] + data[rOff + x * 4 + 2]) / 3;
                        if (b > threshold) { min = Math.min(min, x); max = Math.max(max, x); }
                    }
                    return min < max ? { min, max, y: rY } : null;
                };

                const topSpan = getRowSpan(firstActiveRow);
                const bottomSpan = getRowSpan(lastActiveRow);

                if (topSpan) {
                    corners.tl = { x: topSpan.min, y: topSpan.y };
                    corners.tr = { x: topSpan.max, y: topSpan.y };
                }
                if (bottomSpan) {
                    corners.bl = { x: bottomSpan.min, y: bottomSpan.y };
                    corners.br = { x: bottomSpan.max, y: bottomSpan.y };
                }
            }
        }

        // Anchor points (Violet top-left, Red top-right)
        let violet = { x: 0, y: 0, val: 0 };
        let red = { x: width, y: 0, val: 0 };

        for (let y = 0; y < height * 0.15; y += 4) {
            for (let x = 0; x < width; x += 4) {
                const r = data[(y * width + x) * 4], b = data[(y * width + x) * 4 + 2];
                if (x < width / 2 && b > r * 1.5 && b > violet.val) violet = { x, y, val: b };
                if (x > width / 2 && r > b * 1.5 && r > red.val) red = { x, y, val: r };
            }
        }

        // Override top corners with anchors if strong
        if (violet.val > 180) { corners.tl.x = violet.x; corners.tl.y = violet.y; }
        if (red.val > 180) { corners.tr.x = red.x; corners.tr.y = red.y; }

        return {
            audioParams: { levels, pans },
            centroid: totalW > 0 ? { x: weightedX / totalW / width, y: weightedY / totalW / height, weight: totalW } : { x: 0.5, y: 0.5, weight: 0 },
            boundingBox: { found: foundAny, corners, minX, maxX, minY, maxY } // Keep min/max for legacy/compat
        };
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
