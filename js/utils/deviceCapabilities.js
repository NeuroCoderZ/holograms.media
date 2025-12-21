// frontend/js/utils/deviceCapabilities.js
// Detects device capabilities for adaptive audio/video processing

/**
 * DeviceCapabilities class detects and provides device-specific parameters
 * for optimal CWT audio analysis and hologram rendering.
 */
export class DeviceCapabilities {
    constructor() {
        this.capabilities = null;
        this._refreshRatePromise = null;
    }

    /**
     * Detects all device capabilities asynchronously.
     * @returns {Promise<Object>} Device capabilities object
     */
    async detect() {
        if (this.capabilities) return this.capabilities;

        const [audioInputs, videoInputs, refreshRate, channelCount] = await Promise.all([
            this.getAudioInputDevices(),
            this.getVideoInputDevices(),
            this.detectRefreshRate(),
            this.getMaxChannelCount()
        ]);

        this.capabilities = {
            // Audio capabilities
            audio: {
                inputs: audioInputs,
                inputCount: audioInputs.length,
                maxChannelCount: channelCount,
                sampleRate: this.getPreferredSampleRate(),
            },

            // Video capabilities (for Scanner)
            video: {
                inputs: videoInputs,
                inputCount: videoInputs.length,
            },

            // Display capabilities
            display: {
                refreshRate: refreshRate,
                width: window.screen.width,
                height: window.screen.height,
                pixelRatio: window.devicePixelRatio || 1,
            },

            // Performance capabilities
            performance: {
                hardwareConcurrency: navigator.hardwareConcurrency || 4,
                deviceMemory: navigator.deviceMemory || 4,
            },

            // Calculated optimal parameters
            optimal: this._calculateOptimalParams(refreshRate, channelCount)
        };

        console.log('[DeviceCapabilities] Detected:', this.capabilities);
        return this.capabilities;
    }

    /**
     * Gets list of audio input devices.
     */
    async getAudioInputDevices() {
        try {
            // Request permission first to get full device info
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(d => d.kind === 'audioinput');
        } catch (e) {
            console.warn('[DeviceCapabilities] Cannot enumerate audio devices:', e);
            return [];
        }
    }

    /**
     * Gets list of video input devices (cameras).
     */
    async getVideoInputDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(d => d.kind === 'videoinput');
        } catch (e) {
            console.warn('[DeviceCapabilities] Cannot enumerate video devices:', e);
            return [];
        }
    }

    /**
     * Detects maximum channel count supported by device microphone.
     */
    async getMaxChannelCount() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    channelCount: { ideal: 8 }, // Request max possible
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });
            const track = stream.getAudioTracks()[0];
            const settings = track.getSettings();
            stream.getTracks().forEach(t => t.stop());
            return settings.channelCount || 2;
        } catch (e) {
            console.warn('[DeviceCapabilities] Cannot detect channel count:', e);
            return 2; // Default to stereo
        }
    }

    /**
     * Gets preferred sample rate from AudioContext.
     */
    getPreferredSampleRate() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const rate = ctx.sampleRate;
            ctx.close();
            return rate;
        } catch (e) {
            return 48000; // Default
        }
    }

    /**
     * Detects display refresh rate by measuring requestAnimationFrame timing.
     * @returns {Promise<number>} Detected refresh rate in Hz
     */
    async detectRefreshRate() {
        if (this._refreshRatePromise) return this._refreshRatePromise;

        this._refreshRatePromise = new Promise(resolve => {
            const frameTimes = [];
            let lastTime = performance.now();
            let frameCount = 0;
            const maxFrames = 60; // Measure over ~1 second

            const measure = (currentTime) => {
                if (frameCount > 0) {
                    frameTimes.push(currentTime - lastTime);
                }
                lastTime = currentTime;
                frameCount++;

                if (frameCount < maxFrames) {
                    requestAnimationFrame(measure);
                } else {
                    // Calculate average frame time, ignoring outliers
                    const sorted = frameTimes.slice().sort((a, b) => a - b);
                    const trimmed = sorted.slice(5, -5); // Remove 5 fastest and slowest
                    const avgFrameTime = trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
                    const refreshRate = Math.round(1000 / avgFrameTime);

                    // Snap to common values
                    if (refreshRate >= 115 && refreshRate <= 125) resolve(120);
                    else if (refreshRate >= 85 && refreshRate <= 95) resolve(90);
                    else if (refreshRate >= 55 && refreshRate <= 65) resolve(60);
                    else if (refreshRate >= 25 && refreshRate <= 35) resolve(30);
                    else resolve(refreshRate);
                }
            };

            requestAnimationFrame(measure);
        });

        return this._refreshRatePromise;
    }

    /**
     * Calculates optimal CWT parameters based on device capabilities.
     */
    _calculateOptimalParams(refreshRate, channelCount) {
        const sampleRate = this.getPreferredSampleRate();

        // ChunkSize: samples per frame for CWT processing
        // At 48kHz and 60Hz: 48000/60 = 800 samples per frame
        // At 48kHz and 120Hz: 48000/120 = 400 samples per frame
        const chunkSize = Math.floor(sampleRate / refreshRate);

        // Round to power of 2 for FFT efficiency (WASM may benefit)
        const chunkSizePow2 = Math.pow(2, Math.round(Math.log2(chunkSize)));

        // Processing interval in milliseconds
        const processingIntervalMs = 1000 / refreshRate;

        return {
            sampleRate,
            refreshRate,
            chunkSize: chunkSizePow2,
            hopSize: chunkSizePow2, // Non-overlapping for real-time
            processingIntervalMs,
            channelCount,
            numBins: 128, // Fixed: 128 semitones
        };
    }

    /**
     * Returns cached capabilities or triggers detection.
     */
    getCapabilities() {
        return this.capabilities;
    }
}

// Singleton instance
export const deviceCapabilities = new DeviceCapabilities();
