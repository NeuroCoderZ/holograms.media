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
        this.minSaturation = 0.3;   // Minimum saturation to accept (lowered from 0.5)
        this.minLightness = 0.10;   // Minimum brightness to detect (lowered from 0.15)

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

        // Last stable frame points for corner stabilization
        this.lastStableFramePoints = null;

        // Tracking & Kalman state
        this.prevGray = null;
        this.prevPts = [];
        this.nextTrackId = 1;
        this.kalman = {
            tl: this._initKalman(), tr: this._initKalman(), bl: this._initKalman(), br: this._initKalman()
        };
        this.lastTrackTime = performance.now();

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
                    width: { ideal: 1920 }, // 1080p ideal, no min
                    height: { ideal: 1080 },
                    frameRate: { ideal: 60 }
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

        // Clear stabilization state to prevent memory leaks
        this.lastStableFramePoints = null;

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
        const confidence = boundingBox && boundingBox.confidence ? boundingBox.confidence : 0;

        // Stabilization using Centroid of whole hologram
        this.stabilization.offX += (centroid.weight > 0.01 ? (centroid.x - 0.5) * cropW * 0.1 : -this.stabilization.offX * 0.05);
        this.stabilization.offY += (centroid.weight > 0.01 ? (centroid.y - 0.5) * cropH * 0.1 : -this.stabilization.offY * 0.05);

        if (this.synthesizer && audioParams) {
            this.synthesizer.update(audioParams.levels, audioParams.pans);
        }

        eventBus.emit('scannerData', audioParams);

        const trackRes = this._trackAndEstimateCorners(imageData, canvasW, canvasH, 0.016);
        // --- Dynamic Viewfinder Update (Phase 20.3) ---
        const lerpFactor = 0.35;
        const defaultTargets = {
            tl: { x: 0.1, y: 0.15 }, tr: { x: 0.9, y: 0.15 }, bl: { x: 0.1, y: 0.75 }, br: { x: 0.9, y: 0.75 }
        };

        let targets = Object.assign({}, defaultTargets);

        // 1. Detection Base: If bounding box found something and confidence is good, use it to snap corners
        // If confidence < 0.5, use last stable frame points as fallback
        if (boundingBox && boundingBox.found && confidence >= 0.5) {
            ['tl', 'tr', 'bl', 'br'].forEach(k => {
                targets[k] = {
                    x: boundingBox.corners[k].x / canvasW,
                    y: boundingBox.corners[k].y / canvasH
                };
            });
        } else if (confidence < 0.5 && this.lastStableFramePoints) {
            // Weak tracking: use last known stable position
            ['tl', 'tr', 'bl', 'br'].forEach(k => {
                targets[k] = { x: this.lastStableFramePoints[k].x, y: this.lastStableFramePoints[k].y };
            });
        }

        // 2. Tracking Refinement: If Kalman tracking is healthy, override detection
        if (trackRes && trackRes.corners) {
            const now = performance.now();
            const dt = Math.max(1e-3, (now - this.lastTrackTime) / 1000);
            this.lastTrackTime = now;

            ['tl', 'tr', 'bl', 'br'].forEach(k => {
                const meas = trackRes.corners[k];
                this._kalmanPredict(this.kalman[k], dt);
                if (meas) {
                    this._kalmanUpdate(this.kalman[k], meas.x, meas.y);
                }
                const est = this.kalman[k].x;
                // Use tracking estimate if available
                targets[k] = { x: est[0] / canvasW, y: est[1] / canvasH };
            });
        }

        // Apply LERP and Update UI
        ['tl', 'tr', 'bl', 'br'].forEach(p => {
            this.framePoints[p].x += (targets[p].x - this.framePoints[p].x) * lerpFactor;
            this.framePoints[p].y += (targets[p].y - this.framePoints[p].y) * lerpFactor;
            if (this.cornerElements[p]) {
                this.cornerElements[p].style.left = `${this.framePoints[p].x * 100}%`;
                this.cornerElements[p].style.top = `${this.framePoints[p].y * 100}%`;
                // Keep the brackets pointing inward
                this.cornerElements[p].style.transform = `translate(${p.includes('r') ? '-100%' : '0'}, ${p.includes('b') ? '-100%' : '0'})`;
            }
        });

        // Save stable frame points for fallback when tracking is weak
        // Always save to have a recent fallback position, especially when confidence is high
        if (confidence >= 0.6) {
            this.lastStableFramePoints = JSON.parse(JSON.stringify(this.framePoints));
        } else if (!this.lastStableFramePoints) {
            // If no stable point set yet, save current position as baseline
            this.lastStableFramePoints = JSON.parse(JSON.stringify(this.framePoints));
        }

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

        // Prepare fallback region for weak tracking
        // Fallback: analyze center area (40% width, 40% height)
        const fallbackRegion = {
            x: Math.floor(width * 0.3),
            y: Math.floor(height * 0.2),
            width: Math.floor(width * 0.4),
            height: Math.floor(height * 0.4)
        };

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

        // Detect 4 corner points (Phase 19.14: Axial Anchor Base)
        // Default relative square
        let corners = {
            tl: { x: width * 0.1, y: height * 0.15 },
            tr: { x: width * 0.9, y: height * 0.15 },
            bl: { x: width * 0.1, y: height * 0.75 },
            br: { x: width * 0.9, y: height * 0.75 }
        };

        // --- Anchor Search (Phase 19.14 / 20.3) ---
        // Find anchors: Violet (Bottom-Left), Red (Bottom-Right), Green (Top-Spine)
        let violet = { x: 0, y: 0, val: 0 };
        let red = { x: width, y: 0, val: 0 };
        let green = { x: 0, y: 0, val: 0 };

        // Sample more densely for anchors
        for (let y = 0; y < height; y += 4) {
            for (let x = 0; x < width; x += 4) {
                const idx = (y * width + x) * 4;
                const r = data[idx], g = data[idx + 1], b = data[idx + 2];

                // Violet (Purple): B > R*1.2 && B > 150
                if (y > height * 0.5 && x < width * 0.5 && b > r * 1.2 && b > violet.val) {
                    violet = { x, y, val: b };
                }
                // Red: R > B*1.5 && R > 150
                if (y > height * 0.5 && x > width * 0.5 && r > b * 1.5 && r > red.val) {
                    red = { x, y, val: r };
                }
                // Green: G > R*1.3 && G > B*1.3 && G > 150
                if (y < height * 0.5 && g > r * 1.3 && g > b * 1.3 && g > green.val) {
                    green = { x, y, val: g };
                }
            }
        }

        const anchorQuality = 140;
        let confidence = 0.0;
        
        if (violet.val > anchorQuality && red.val > anchorQuality) {
            // Found stable base (violet + red anchors detected)
            corners.bl = { x: violet.x, y: violet.y };
            corners.br = { x: red.x, y: red.y };

            const baseW = red.x - violet.x;
            const h = (green.val > anchorQuality) ? (violet.y - green.y) : baseW;

            corners.tl = { x: violet.x, y: violet.y - h };
            corners.tr = { x: red.x, y: red.y - h };
            confidence = 0.95; // High confidence when anchors found
        } else if (foundAny) {
            // Fallback to detected content bounding box
            const margin = 10;
            corners.tl = { x: Math.max(0, minX - margin), y: Math.max(0, minY - margin) };
            corners.tr = { x: Math.min(width, maxX + margin), y: Math.max(0, minY - margin) };
            corners.bl = { x: Math.max(0, minX - margin), y: Math.min(height, maxY + margin) };
            corners.br = { x: Math.min(width, maxX + margin), y: Math.min(height, maxY + margin) };
            confidence = 0.5; // Medium confidence for fallback
        }

        // PHASE 20.4: Audio Synthesis Gate - Only generate sound when hologram is fully detected
        // If confidence < 0.7 (weak/no detection), return completely silent audio
        if (confidence < 0.7) {
            console.log('[HologramScanner] confidence:', confidence.toFixed(2), '< 0.7 - NO AUDIO output (hologram not detected)');
            return {
                audioParams: { 
                    levels: new Float32Array(256).fill(-128),  // All channels silent (-128 dB)
                    pans: new Float32Array(128).fill(0)         // All pans centered
                },
                centroid: { x: 0.5, y: 0.5, weight: 0 },
                boundingBox: { found: false, corners, minX, maxX, minY, maxY, confidence }
            };
        }

        // If confidence is in medium range [0.7, 0.95), use only main detection, NO fallback
        if (confidence >= 0.7 && confidence < 0.95) {
            console.log('[HologramScanner] confidence:', confidence.toFixed(2), 'in [0.7, 0.95) - using main detection only (no fallback)');
            // Skip fallback analysis for medium confidence level
            // Return with current levels/pans from ROW-BASED scanning
        }
        // If confidence >= 0.95 (strong anchor detection), use normally (with fallback if needed)

        return {
            audioParams: { levels, pans },
            centroid: totalW > 0 ? { x: weightedX / totalW / width, y: weightedY / totalW / height, weight: totalW } : { x: 0.5, y: 0.5, weight: 0 },
            boundingBox: { found: foundAny, corners, minX, maxX, minY, maxY, confidence }
        };
    }

    // -------------------- Tracking & CV helpers --------------------
    _initKalman() {
        // state [x, y, vx, vy]
        return {
            x: [0, 0, 0, 0],
            P: [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]],
            Q: [[1e-2, 0, 0, 0], [0, 1e-2, 0, 0], [0, 0, 1e-1, 0], [0, 0, 0, 1e-1]],
            R: [[25, 0], [0, 25]] // measurement noise (px^2)
        };
    }

    _kalmanPredict(kf, dt) {
        const F = [[1, 0, dt, 0], [0, 1, 0, dt], [0, 0, 1, 0], [0, 0, 0, 1]];
        // x = F*x
        const x = kf.x;
        const nx = [0, 0, 0, 0];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) nx[i] += F[i][j] * x[j];
        kf.x = nx;
        // P = F P F^T + Q
        const P = kf.P; const Q = kf.Q;
        const FP = Array.from({ length: 4 }, () => Array(4).fill(0));
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) FP[i][j] += F[i][k] * P[k][j];
        const FPFt = Array.from({ length: 4 }, () => Array(4).fill(0));
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) FPFt[i][j] += FP[i][k] * F[j][k];
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) kf.P[i][j] = FPFt[i][j] + Q[i][j];
    }

    _kalmanUpdate(kf, mx, my) {
        // H = [ [1 0 0 0], [0 1 0 0] ]
        const H = [[1, 0, 0, 0], [0, 1, 0, 0]];
        // y = z - Hx
        const z = [mx, my];
        const Hx = [kf.x[0], kf.x[1]];
        const y = [z[0] - Hx[0], z[1] - Hx[1]];
        // S = H P H^T + R
        const P = kf.P; const R = kf.R;
        const S = [[0, 0], [0, 0]];
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 4; k++) S[i][j] += H[i][k] * P[k][j] * H[j][j];
        // approximate S as P[0..1][0..1] + R for simplicity
        S[0][0] = P[0][0] + R[0][0]; S[0][1] = P[0][1] + R[0][1]; S[1][0] = P[1][0] + R[1][0]; S[1][1] = P[1][1] + R[1][1];
        // K = P H^T S^-1  (4x2)
        const det = S[0][0] * S[1][1] - S[0][1] * S[1][0] || 1e-6;
        const Sinv = [[S[1][1] / det, -S[0][1] / det], [-S[1][0] / det, S[0][0] / det]];
        const K = Array.from({ length: 4 }, () => Array(2).fill(0));
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) for (let k = 0; k < 2; k++) K[i][j] += P[i][k] * H[j][k] * Sinv[k][j];
        // x = x + K y
        for (let i = 0; i < 4; i++) kf.x[i] += K[i][0] * y[0] + K[i][1] * y[1];
        // P = (I - K H) P
        const IminusKH = Array.from({ length: 4 }, () => Array(4).fill(0));
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
            let sum = (i === j ? 1 : 0);
            for (let k = 0; k < 2; k++) sum -= K[i][k] * H[k][j];
            IminusKH[i][j] = sum;
        }
        const newP = Array.from({ length: 4 }, () => Array(4).fill(0));
        for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) newP[i][j] += IminusKH[i][k] * P[k][j];
        kf.P = newP;
    }

    _grayscaleFromImage(imageData) {
        const { data, width, height } = imageData;
        const gray = new Float32Array(width * height);
        for (let i = 0, j = 0; i < data.length; i += 4, j++) {
            gray[j] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
        }
        return { gray, width, height };
    }

    _harrisCorners(grayBuf, width, height, maxCorners = 64, k = 0.04, thresh = 1e-4) {
        const Ix = new Float32Array(width * height);
        const Iy = new Float32Array(width * height);
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const i = y * width + x;
                const gx = -grayBuf[i - width - 1] - 2 * grayBuf[i - 1] - grayBuf[i + width - 1]
                    + grayBuf[i - width + 1] + 2 * grayBuf[i + 1] + grayBuf[i + width + 1];
                const gy = -grayBuf[i - width - 1] - 2 * grayBuf[i - width] - grayBuf[i - width + 1]
                    + grayBuf[i + width - 1] + 2 * grayBuf[i + width] + grayBuf[i + width + 1];
                Ix[i] = gx; Iy[i] = gy;
            }
        }
        const R = new Float32Array(width * height);
        for (let y = 2; y < height - 2; y++) {
            for (let x = 2; x < width - 2; x++) {
                let sxx = 0, syy = 0, sxy = 0;
                for (let yy = -1; yy <= 1; yy++) for (let xx = -1; xx <= 1; xx++) {
                    const idx = (y + yy) * width + (x + xx);
                    const ix = Ix[idx], iy = Iy[idx];
                    sxx += ix * ix; syy += iy * iy; sxy += ix * iy;
                }
                const det = sxx * syy - sxy * sxy; const tr = sxx + syy;
                R[y * width + x] = det - k * tr * tr;
            }
        }
        const pts = [];
        for (let y = 2; y < height - 2; y++) for (let x = 2; x < width - 2; x++) {
            const v = R[y * width + x]; if (v > thresh) pts.push({ x, y, v });
        }
        pts.sort((a, b) => b.v - a.v);
        return pts.slice(0, maxCorners);
    }

    _subpixelRefine(gray, pt, width, height, win = 3) {
        const x0 = Math.round(pt.x), y0 = Math.round(pt.y);
        let sumI = 0, cx = 0, cy = 0;
        for (let dy = -win; dy <= win; dy++) for (let dx = -win; dx <= win; dx++) {
            const x = x0 + dx, y = y0 + dy; if (x < 0 || x >= width || y < 0 || y >= height) continue;
            const v = gray[y * width + x]; const w = Math.max(0, v);
            sumI += w; cx += x * w; cy += y * w;
        }
        if (sumI <= 0) return { x: pt.x, y: pt.y, q: 0 };
        return { x: cx / sumI, y: cy / sumI, q: sumI };
    }

    _lucasKanadeTrack(prevGray, curGray, prevPts, width, height, win = 3) {
        if (!prevPts || prevPts.length === 0) return [];
        const next = [];
        for (let i = 0; i < prevPts.length; i++) {
            const p = prevPts[i]; const x0 = Math.round(p.x), y0 = Math.round(p.y);
            let A00 = 0, A01 = 0, A11 = 0, b0 = 0, b1 = 0;
            for (let dy = -win; dy <= win; dy++) for (let dx = -win; dx <= win; dx++) {
                const x = x0 + dx, y = y0 + dy; if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) continue;
                const idx = y * width + x;
                const ix = 0.5 * (curGray[idx + 1] - curGray[idx - 1]);
                const iy = 0.5 * (curGray[idx + width] - curGray[idx - width]);
                const it = curGray[idx] - prevGray[idx];
                A00 += ix * ix; A01 += ix * iy; A11 += iy * iy; b0 += ix * it; b1 += iy * it;
            }
            const det = A00 * A11 - A01 * A01; if (Math.abs(det) < 1e-6) { next.push({ x: p.x, y: p.y, status: 0 }); continue; }
            const ux = (-A11 * b0 + A01 * b1) / det; const uy = (A01 * b0 - A00 * b1) / det;
            next.push({ x: p.x + ux, y: p.y + uy, status: 1, id: p.id, age: (p.age || 1) + 1 });
        }
        return next;
    }

    _estimateHomographyDLT(srcPts, dstPts) {
        // srcPts/dstPts are arrays of {x,y} length >=4
        const n = srcPts.length; if (n < 4) return null;
        // Build linear system A h = 0
        const A = [];
        for (let i = 0; i < n; i++) {
            const xs = srcPts[i].x, ys = srcPts[i].y, xd = dstPts[i].x, yd = dstPts[i].y;
            A.push([-xs, -ys, -1, 0, 0, 0, xs * xd, ys * xd, xd]);
            A.push([0, 0, 0, -xs, -ys, -1, xs * yd, ys * yd, yd]);
        }
        // Solve via normal equations and power iteration on ATA (approximate smallest singular vector)
        const ATA = Array.from({ length: 9 }, () => Array(9).fill(0));
        for (let i = 0; i < A.length; i++) for (let j = 0; j < 9; j++) for (let k = 0; k < 9; k++) ATA[j][k] += A[i][j] * A[i][k];
        let v = Array(9).fill(0).map((_, i) => (i === 8 ? 1 : 0));
        for (let it = 0; it < 40; it++) {
            const w = Array(9).fill(0);
            for (let i = 0; i < 9; i++) for (let j = 0; j < 9; j++) w[i] += ATA[i][j] * v[j];
            const norm = Math.hypot(...w) || 1;
            for (let i = 0; i < 9; i++) v[i] = w[i] / norm;
        }
        // normalize so last element == 1 for stability
        if (Math.abs(v[8]) > 1e-9) for (let i = 0; i < 9; i++) v[i] /= v[8];
        return [v[0], v[1], v[2], v[3], v[4], v[5], v[6], v[7], v[8]];
    }

    _applyHomographyToPoint(H, x, y) {
        const w = H[6] * x + H[7] * y + H[8];
        return { x: (H[0] * x + H[1] * y + H[2]) / w, y: (H[3] * x + H[4] * y + H[5]) / w };
    }

    // RANSAC robust homography estimation (prevPts -> curPts). Returns H (3x3 array) or null.
    /*
    Unit-like test (paste into console for quick check):
    (function(){
        // build synthetic homography: translate + scale + small rotation
        const ang = 0.12; const s = 1.05; const tx=12, ty=8;
        const Htrue = [s*Math.cos(ang), -s*Math.sin(ang), tx, s*Math.sin(ang), s*Math.cos(ang), ty, 0.0001, 0.0002, 1];
        const src=[]; const dst=[];
        for(let i=0;i<50;i++){ const x= Math.random()*200+10, y=Math.random()*120+20; src.push({x,y,id:i}); const p=(h,x,y)=>{const w=h[6]*x+h[7]*y+h[8];return {x:(h[0]*x+h[1]*y+h[2])/w,y:(h[3]*x+h[4]*y+h[5])/w}}; const q=p(Htrue,x,y); // add noise
            dst.push({x:q.x+ (Math.random()-0.5)*1.0, y:q.y+(Math.random()-0.5)*1.0, id:i, status:1}); }
        const H = hologramScanner._ransacHomography(src,dst,{iterations:300,threshold:3,earlyStopInlierRatio:0.6});
        console.log('H found', H);
    })();
    */
    _ransacHomography(srcPts, dstPts, opts = {}) {
        // opts: iterations, threshold(px), earlyStopInlierRatio, confidence
        const itersDefault = 800;
        const threshold = opts.threshold || 4.0;
        let maxIters = opts.iterations || itersDefault;
        const earlyStopInlierRatio = opts.earlyStopInlierRatio || 0.6;
        const confidence = opts.confidence || 0.99;

        const N = Math.min(srcPts.length, dstPts.length);
        if (N < 4) return null;

        // build matches by id intersection if available
        const matches = [];
        const dstById = new Map();
        for (const p of dstPts) if (p && p.id != null) dstById.set(p.id, p);
        for (const p of srcPts) {
            if (p && p.id != null && dstById.has(p.id)) {
                const q = dstById.get(p.id);
                if (q.status === 1) matches.push({ src: { x: p.x, y: p.y }, dst: { x: q.x, y: q.y } });
            }
        }
        // fallback: zip by index
        if (matches.length < 8) {
            matches.length = 0;
            const M = Math.min(srcPts.length, dstPts.length);
            for (let i = 0; i < M; i++) if (dstPts[i] && dstPts[i].status === 1) matches.push({ src: { x: srcPts[i].x, y: srcPts[i].y }, dst: { x: dstPts[i].x, y: dstPts[i].y } });
        }
        if (matches.length < 4) return null;

        // limit number of matches for performance
        const maxMatches = Math.min(64, matches.length);
        // sort by id/age heuristic: prefer earlier (if available)
        matches.sort((a, b) => (b.src.age || 0) - (a.src.age || 0));
        const pool = matches.slice(0, maxMatches);

        let bestH = null; let bestInliers = []; let bestCount = 0;
        const s = 4; // sample size for homography

        // helper reprojection
        const reprojErr = (H, m) => {
            const p = this._applyHomographyToPoint(H, m.src.x, m.src.y);
            const dx = p.x - m.dst.x; const dy = p.y - m.dst.y; return Math.hypot(dx, dy);
        };

        let iter = 0;
        while (iter < maxIters) {
            // random sample of 4 distinct indices
            const idxs = new Set();
            while (idxs.size < s) idxs.add(Math.floor(Math.random() * pool.length));
            const idxArr = Array.from(idxs);
            const sampleSrc = idxArr.map(i => ({ x: pool[i].src.x, y: pool[i].src.y }));
            const sampleDst = idxArr.map(i => ({ x: pool[i].dst.x, y: pool[i].dst.y }));
            const H = this._estimateHomographyDLT(sampleSrc, sampleDst);
            if (!H) { iter++; continue; }

            // count inliers
            const inliers = [];
            for (let i = 0; i < pool.length; i++) {
                const e = reprojErr(H, pool[i]);
                if (e <= threshold) inliers.push(i);
            }
            if (inliers.length > bestCount) { bestCount = inliers.length; bestInliers = inliers.slice(); bestH = H; }

            // adaptive iterations based on inlier ratio
            const inlierRatio = inliers.length / pool.length;
            if (inlierRatio > 0) {
                const num = Math.log(1 - confidence);
                const den = Math.log(1 - Math.pow(inlierRatio, s));
                if (den !== 0) {
                    const needed = Math.ceil(Math.min(2000, Math.max(10, num / den)));
                    maxIters = Math.min(maxIters, needed);
                }
            }

            // early stop
            if (bestCount / pool.length >= earlyStopInlierRatio && bestCount >= 8) break;
            iter++;
        }

        if (!bestH || bestCount < 6) return null;

        // build inlier correspondences arrays
        const inSrc = [], inDst = [];
        for (const idx of bestInliers) { inSrc.push({ x: pool[idx].src.x, y: pool[idx].src.y }); inDst.push({ x: pool[idx].dst.x, y: pool[idx].dst.y }); }

        // refine with GN on inliers
        const refinedH = this._refineHomographyGN(bestH, inSrc, inDst, { iterations: 7 });
        return refinedH;
    }

    // Gauss-Newton refinement of homography H given correspondences (srcPts -> dstPts)
    _refineHomographyGN(Hin, srcPts, dstPts, opts = {}) {
        const iters = opts.iterations || 6;
        // ensure Hin normalized so h8 = 1
        let H = Hin.slice(); if (Math.abs(H[8]) > 1e-12) { for (let i = 0; i < 9; i++) H[i] /= H[8]; } else H[8] = 1;

        // parameter vector h = [h0..h7] with h8 fixed = 1
        let h = H.slice(0, 8);

        const n = srcPts.length;
        if (n === 0) return Hin;

        for (let it = 0; it < iters; it++) {
            // accumulate J^T J (8x8) and J^T r (8)
            const JTJ = Array.from({ length: 8 }, () => Array(8).fill(0));
            const JTr = Array(8).fill(0);
            let totalErr = 0;
            for (let i = 0; i < n; i++) {
                const xs = srcPts[i].x, ys = srcPts[i].y;
                const xd = dstPts[i].x, yd = dstPts[i].y;
                const a = h[0] * xs + h[1] * ys + h[2];
                const b = h[3] * xs + h[4] * ys + h[5];
                const c = h[6] * xs + h[7] * ys + 1;
                const u = a / c; const v = b / c;
                const ru = u - xd; const rv = v - yd;
                totalErr += ru * ru + rv * rv;
                // partials du/dh0..h7
                const invc = 1 / c; const invc2 = invc * invc;
                const du = [xs * invc, ys * invc, 1 * invc, 0, 0, 0, -a * xs * invc2, -a * ys * invc2];
                const dv = [0, 0, 0, xs * invc, ys * invc, 1 * invc, -b * xs * invc2, -b * ys * invc2];
                // accumulate
                for (let p = 0; p < 8; p++) {
                    for (let q = 0; q < 8; q++) {
                        JTJ[p][q] += du[p] * du[q] + dv[p] * dv[q];
                    }
                    JTr[p] += du[p] * ru + dv[p] * rv;
                }
            }

            // solve JTJ * dx = -JTr  (8x8)
            // add small damping for stability
            const lambda = 1e-3;
            for (let i = 0; i < 8; i++) JTJ[i][i] *= (1 + lambda);

            // Gaussian elimination (copy matrices)
            const A = JTJ.map(row => row.slice()); const b = JTr.map(v => -v);
            // solve Ax = b
            const m = 8;
            for (let i = 0; i < m; i++) {
                // pivot
                let piv = i;
                for (let r = i + 1; r < m; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
                if (piv !== i) { const tmp = A[i]; A[i] = A[piv]; A[piv] = tmp; const tv = b[i]; b[i] = b[piv]; b[piv] = tv; }
                const diag = A[i][i] || 1e-12;
                for (let j = i + 1; j < m; j++) { const fac = A[j][i] / diag; for (let k = i; k < m; k++) A[j][k] -= fac * A[i][k]; b[j] -= fac * b[i]; }
            }
            const x = Array(m).fill(0);
            for (let i = m - 1; i >= 0; i--) { let s = b[i]; for (let j = i + 1; j < m; j++) s -= A[i][j] * x[j]; x[i] = s / (A[i][i] || 1e-12); }

            // update h
            let maxDelta = 0;
            for (let i = 0; i < 8; i++) { h[i] += x[i]; maxDelta = Math.max(maxDelta, Math.abs(x[i])); }
            if (maxDelta < 1e-6) break;
        }
        const Hout = [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
        return Hout;
    }

    _trackAndEstimateCorners(imageData, width, height, dt) {
        const { gray } = this._grayscaleFromImage(imageData);
        // downsample detection resolution for speed
        const detW = Math.max(160, Math.floor(width / 2));
        const detH = Math.max(90, Math.floor(height / 2));
        // simple scaling indices
        // For performance keep detection on same resolution - use existing gray
        const candidates = this._harrisCorners(gray, width, height, 96, 0.04, 1e-5);
        const refined = candidates.map(p => this._subpixelRefine(gray, p, width, height, 2));

        // initialize prev when empty
        if (!this.prevGray) {
            this.prevGray = gray;
            this.prevPts = refined.map(p => ({ x: p.x, y: p.y, age: 1, id: this.nextTrackId++ }));
            return null; // need next frame to track
        }

        // track prev -> cur
        const prevPtsLocal = this.prevPts ? this.prevPts.slice() : [];
        const tracked = this._lucasKanadeTrack(this.prevGray, gray, prevPtsLocal, width, height, 3);
        // merge tracked with new detections
        const merged = [];
        for (let i = 0; i < tracked.length; i++) { if (tracked[i].status === 1) merged.push(tracked[i]); }
        for (let i = 0; i < refined.length; i++) {
            const p = refined[i]; let near = false;
            for (let j = 0; j < merged.length; j++) { const d2 = (merged[j].x - p.x) * (merged[j].x - p.x) + (merged[j].y - p.y) * (merged[j].y - p.y); if (d2 < 36) { near = true; break; } }
            if (!near) merged.push({ x: p.x, y: p.y, age: 1, id: this.nextTrackId++ });
        }
        merged.sort((a, b) => (b.age || 1) - (a.age || 1));
        this.prevPts = merged.slice(0, 128);
        this.prevGray = gray;

        if (prevPtsLocal.length < 8 || tracked.length < 8) return null;

        // Build correspondences prev->tracked and run RANSAC
        const H = this._ransacHomography(prevPtsLocal, tracked, { iterations: 800, threshold: 4.0, earlyStopInlierRatio: 0.6 });
        if (!H) return null;

        // Apply H to previous frame corners (pixels) to get new corners in this frame
        const prevCornersPx = {
            tl: { x: this.framePoints.tl.x * width, y: this.framePoints.tl.y * height },
            tr: { x: this.framePoints.tr.x * width, y: this.framePoints.tr.y * height },
            bl: { x: this.framePoints.bl.x * width, y: this.framePoints.bl.y * height },
            br: { x: this.framePoints.br.x * width, y: this.framePoints.br.y * height }
        };
        const pc_tl = this._applyHomographyToPoint(H, prevCornersPx.tl.x, prevCornersPx.tl.y);
        const pc_tr = this._applyHomographyToPoint(H, prevCornersPx.tr.x, prevCornersPx.tr.y);
        const pc_br = this._applyHomographyToPoint(H, prevCornersPx.br.x, prevCornersPx.br.y);
        const pc_bl = this._applyHomographyToPoint(H, prevCornersPx.bl.x, prevCornersPx.bl.y);

        // geometric consistency checks
        const cornersPx = [{ x: pc_tl.x, y: pc_tl.y }, { x: pc_tr.x, y: pc_tr.y }, { x: pc_br.x, y: pc_br.y }, { x: pc_bl.x, y: pc_bl.y }];
        const isConvex = (() => {
            // cross product signs must be same
            let signs = [];
            for (let i = 0; i < 4; i++) { const a = cornersPx[i], b = cornersPx[(i + 1) % 4], c = cornersPx[(i + 2) % 4]; const ux = b.x - a.x, uy = b.y - a.y; const vx = c.x - b.x, vy = c.y - b.y; const cross = ux * vy - uy * vx; signs.push(Math.sign(cross)); }
            const pos = signs.filter(s => s > 0).length; const neg = signs.filter(s => s < 0).length; return !(pos > 0 && neg > 0);
        })();
        const edge = (p, q) => Math.hypot(p.x - q.x, p.y - q.y);
        const w = (edge(cornersPx[0], cornersPx[1]) + edge(cornersPx[2], cornersPx[3])) / 2;
        const hgt = (edge(cornersPx[1], cornersPx[2]) + edge(cornersPx[3], cornersPx[0])) / 2;
        const aspect = w / (hgt || 1);
        if (!isConvex || !(aspect > 0.4 && aspect < 2.8)) return null;

        return { corners: { tl: { x: pc_tl.x, y: pc_tl.y }, tr: { x: pc_tr.x, y: pc_tr.y }, br: { x: pc_br.x, y: pc_br.y }, bl: { x: pc_bl.x, y: pc_bl.y } } };
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

