import eventBus from '../core/eventBus.js';
import { state } from '../core/init.js';

class ScannerService {
    constructor() {
        this.isActive = false;
        this.videoElement = null;
        this.canvas = null;
        this.ctx = null;
        this.animationFrameId = null;

        // Audio
        this.audioContext = null;
        this.oscillators = [];
        this.gainNodes = [];
        this.masterGain = null;

        // Config
        this.NUM_BANDS = 16;
        this.BASE_FREQ = 110; // A2
        this.frequencies = this._generateHarmonicSeries(this.BASE_FREQ, this.NUM_BANDS);

        this._initElements();
    }

    _initElements() {
        this.videoElement = document.createElement('video');
        this.videoElement.autoplay = true;
        this.videoElement.playsInline = true;
        this.videoElement.style.display = 'none';
        document.body.appendChild(this.videoElement);

        this.canvas = document.createElement('canvas');
        this.canvas.width = 300; // Low res for performance
        this.canvas.height = 150;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    }

    _generateHarmonicSeries(base, count) {
        const freqs = [];
        for (let i = 1; i <= count; i++) {
            // Simple harmonic: base * i
            // Or maybe pentatonic scale for musicality?
            // Let's use harmonic intended for spectral resynthesis
            freqs.push(base * i);
        }
        return freqs;
    }

    async startScanning() {
        if (this.isActive) return;

        try {
            const constraints = {
                video: {
                    facingMode: 'environment', // Rear camera preferred
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.videoElement.srcObject = stream;

            await this._initAudio();

            this.isActive = true;
            eventBus.emit('scannerStarted');
            this._loop();

            console.log('[ScannerService] Started');
        } catch (err) {
            console.error('[ScannerService] Failed to start:', err);
            eventBus.emit('scannerError', err);
        }
    }

    async stopScanning() {
        if (!this.isActive) return;

        this.isActive = false;
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

        // Stop Camera
        if (this.videoElement.srcObject) {
            this.videoElement.srcObject.getTracks().forEach(track => track.stop());
            this.videoElement.srcObject = null;
        }

        // Stop Audio
        this._stopAudio();

        eventBus.emit('scannerStopped');
        console.log('[ScannerService] Stopped');
    }

    async _initAudio() {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioContext.state === 'suspended') await this.audioContext.resume();

        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.5; // Main volume
        this.masterGain.connect(this.audioContext.destination);

        // Create oscillator bank
        this.oscillators = [];
        this.gainNodes = [];

        for (let i = 0; i < this.NUM_BANDS; i++) {
            const osc = this.audioContext.createOscillator();
            osc.type = i % 2 === 0 ? 'sine' : 'triangle'; // Mix sine/tri
            osc.frequency.value = this.frequencies[i];

            const gain = this.audioContext.createGain();
            gain.gain.value = 0; // Start silent

            osc.connect(gain);
            gain.connect(this.masterGain);
            osc.start();

            this.oscillators.push(osc);
            this.gainNodes.push(gain);
        }
    }

    _stopAudio() {
        if (this.oscillators) {
            this.oscillators.forEach(osc => {
                try { osc.stop(); osc.disconnect(); } catch (e) { }
            });
        }
        if (this.gainNodes) {
            this.gainNodes.forEach(g => g.disconnect());
        }
        this.oscillators = [];
        this.gainNodes = [];
    }

    _loop() {
        if (!this.isActive) return;

        if (this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
            this.ctx.drawImage(this.videoElement, 0, 0, this.canvas.width, this.canvas.height);
            this._processFrame();
        }

        this.animationFrameId = requestAnimationFrame(() => this._loop());
    }

    _processFrame() {
        const frame = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = frame.data;
        const width = this.canvas.width;
        const height = this.canvas.height;

        // Analyze vertical bands
        const bandWidth = Math.floor(width / this.NUM_BANDS);
        const amplitudes = new Float32Array(this.NUM_BANDS).fill(0);

        for (let b = 0; b < this.NUM_BANDS; b++) {
            let totalLuma = 0;
            let pixelCount = 0;

            const startX = b * bandWidth;
            const endX = startX + bandWidth;

            // Sample pixels in band
            for (let y = 0; y < height; y += 4) { // Skip rows for perf
                for (let x = startX; x < endX; x += 4) { // Skip cols
                    const i = (y * width + x) * 4;
                    const r = data[i];
                    const g = data[i + 1];
                    const bVal = data[i + 2];

                    // Simple Luma
                    const luma = 0.299 * r + 0.587 * g + 0.114 * bVal;

                    // Threshold to ignore black background
                    if (luma > 50) {
                        totalLuma += luma;
                    }
                    pixelCount++;
                }
            }

            // Normalized avg brightness (0..1)
            amplitudes[b] = (totalLuma / pixelCount) / 255.0;
        }

        this._updateSynth(amplitudes);
    }

    _updateSynth(amplitudes) {
        if (!this.gainNodes.length) return;

        const now = this.audioContext.currentTime;
        const LAG = 0.1; // Smooth transitions

        for (let i = 0; i < this.NUM_BANDS; i++) {
            // Apply gain with smoothing
            // Scale amplitude to avoid clipping with many oscs
            const targetGain = Math.min(0.2, amplitudes[i] * 0.5);

            this.gainNodes[i].gain.setTargetAtTime(targetGain, now, LAG);
        }
    }
}

const scannerService = new ScannerService();
export default scannerService;
