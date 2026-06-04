/**
 * AudioService.js
 * Encapsulates all Audio Context management, WASM loading, and AudioWorklet initialization.
 * Follows the Singleton pattern (or Service pattern) to be used across the app (replaces global state.audio part).
 */
import eventBus from '../core/eventBus.js';
import workletUrl from '../audio/cwtAudioWorklet.js?url';
import { deviceCapabilities } from '../utils/deviceCapabilities.js';

// Path to the WASM file
const wasmUrl = '/wasm/cwt_analyzer.wasm';

// Import WASM URL explicitly for Vite to handle asset path

class AudioService {
    constructor() {
        this.context = null;
        this.workletNode = null;
        this.isReady = false;
        this.isPlaying = false;
        this.wasmModule = null;
        this.sampleRate = 48000;
        this.targetFps = 60; // Default

        // Configuration
        this.cqtConfig = {
            chunkSize: 1024,
            numBins: 128
        };
    }

    /**
     * Initializes the AudioContext and loads required modules (WASM + Worklet).
     * @returns {Promise<void>}
     */
    async initialize() {
        if (this.isReady) return;

        console.log('[AudioService] Initializing...');

        try {
            // 0. Detect Device Capabilities (FPS)
            const caps = await deviceCapabilities.detect();
            this.targetFps = caps.display.refreshRate || 60;
            console.log(`[AudioService] Detected Target FPS: ${this.targetFps}`);

            // 1. Create AudioContext
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.context = new AudioContext({
                latencyHint: 'interactive',
                sampleRate: this.sampleRate
            });
            console.log(`[AudioService] AudioContext created. State: ${this.context.state}, Rate: ${this.context.sampleRate}`);

            // 2. Resume if suspended (browser policy) - DON'T await, it blocks until user gesture!
            if (this.context.state === 'suspended') {
                // Schedule resume for later (on user interaction)
                this.context.resume().then(() => {
                    console.log('[AudioService] AudioContext resumed after user gesture.');
                }).catch(err => {
                    console.warn('[AudioService] AudioContext resume failed:', err.message);
                });
            }


            // 3. Load WASM
            await this.loadWasmModule();

            // 4. Load AudioWorklet
            await this.loadAudioWorklet();

            this.isReady = true;
            eventBus.emit('audio:ready', { context: this.context });
            console.log('[AudioService] Initialization complete.');

        } catch (error) {
            console.error('[AudioService] Initialization failed:', error);
            eventBus.emit('audio:error', error);
            throw error;
        }
    }

    /**
     * Loads the AudioWorklet module.
     */
    async loadAudioWorklet() {
        try {
            // Use the URL resolved by Vite
            console.log(`[AudioService] Loading AudioWorklet from: ${workletUrl}`);
            await this.context.audioWorklet.addModule(workletUrl);
            console.log('[AudioService] AudioWorklet module loaded.');
        } catch (error) {
            console.error('[AudioService] Failed to load AudioWorklet:', error);
            throw new Error(`Worklet Load Error: ${error.message}`);
        }
    }

    /**
     * Loads and compiles the WASM module.
     * Uses explicit fetch with MIME type checking.
     */
    async loadWasmModule() {
        console.log(`[AudioService] Loading WASM from: ${wasmUrl}`);

        try {
            const response = await fetch(wasmUrl);
            if (!response.ok) {
                throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
            }

            const contentType = response.headers.get('Content-Type');
            console.log(`[AudioService] WASM Content-Type: ${contentType}`);

            if (contentType === 'text/html' || (contentType && contentType.includes('text/html'))) {
                throw new Error(`Server returned HTML instead of WASM (MIME: ${contentType}). Check deployment configuration.`);
            }

            // We store the BUFFER instead of the compiled module
            // Compiled modules are hard to clone/transfer to worklets in some browsers
            this.wasmBuffer = await response.arrayBuffer();

            console.log('[AudioService] WASM buffer loaded successfully. Ready for transfer.');

            if (this.workletNode) {
                console.log('[AudioService] Sending WASM buffer to workletNode...');
                this.workletNode.port.postMessage({
                    type: 'WASM_BUFFER',
                    buffer: this.wasmBuffer
                }, [this.wasmBuffer]); // TRANSFER ownership
            }

        } catch (error) {
            console.error('[AudioService] WASM loading failed:', error);
            console.warn('[AudioService] Switching to JS-only fallback (Digital Basilar Membrane) due to WASM error.');
        }
    }

    /**
     * Resets the Worklet Node (disconnects and nulls it) to force recreation.
     * This is useful when stopping playback to ensure a clean state for the next run.
     */
    /**
     * Сбрасывает буферы CWT-анализатора БЕЗ уничтожения WorkletNode.
     * Используется при смене трека или нажатии Stop.
     * Worklet остаётся живым, WASM получает CLEAR и продолжает работать.
     */
    resetCwtBuffers() {
        if (this.workletNode) {
            try {
                // CLEAR — мягкий сброс, worklet остаётся жив
                this.workletNode.port.postMessage({ type: 'CLEAR' });
            } catch (e) {
                console.warn('[AudioService] Error sending CLEAR to worklet:', e);
            }
        }
    }

    /**
     * Полностью уничтожает Worklet Node (disconnect и null).
     * Используется только при полной остановке приложения.
     */
    resetWorklet() {
        if (this.workletNode) {
            try {
                this.workletNode.port.postMessage({ type: 'RESET' });
                // Очищаем обработчик ДО disconnect чтобы зомби-сообщения не обрабатывались
                this.workletNode.port.onmessage = null;
                this.workletNode.disconnect();
            } catch (e) {
                console.warn('[AudioService] Error disconnecting worklet:', e);
            }
            this.workletNode = null;
        }
        // Останавливаем FPS-мониторинг
        this.stopRefreshRateMonitoring();
    }

    /**
     * Creates or retrieves the CWT Worklet Node (Singleton).
     * @param {string} sourceType - 'file', 'microphone', or 'synth'
     */
    createWorkletNode(sourceType = 'file', options = {}) {
        const sourceTypeCode = (sourceType === 'microphone') ? 1 : 0;

        if (!this.context) throw new Error('AudioContext not associated.');

        if (this.workletNode) {
            // Если узел уже есть, просто возвращаем его
            return this.workletNode;
        }

        // BASILAQ-256: Dynamic adaptation based on refresh rate
        this.workletNode = new AudioWorkletNode(this.context, 'cwt-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2],
            processorOptions: {
                sampleRate: this.context.sampleRate,
                targetFps: options.targetFps || this.targetFps, // Используем FPS из опций или дефолтный
                sourceType: sourceTypeCode,
                ...this.cqtConfig
            }
        });

        // Explicitly start the port to ensure communication flow
        this.workletNode.port.start();

        // Handle messages from Worklet
        this.workletNode.port.onmessage = (event) => {
            const { type, levels, angles, msg, error } = event.data;

            if (type === 'WORKLET_READY') {
                console.log('[AudioService] Worklet is READY for Handshake. Sending WASM BUFFER...');
                if (this.wasmBuffer && this.wasmBuffer.byteLength > 0) {
                    // CRITICAL FIX: Clone buffer before transferring to keep a local copy for restarts
                    const bufferToSend = this.wasmBuffer.slice(0);
                    this.workletNode.port.postMessage({
                        type: 'WASM_BUFFER',
                        buffer: bufferToSend
                    }, [bufferToSend]); // TRANSFER the clone, NOT the original
                    console.log(`[AudioService] WASM buffer sent: ${bufferToSend.byteLength} bytes`);
                } else {
                    console.error('[AudioService] WASM buffer is empty or not loaded. Reloading...');
                    this.loadWasmModule();
                }
                return;
            }
            
            // ... rest of handlers
            if (type === 'LOG') {
                console.log(`[CwtWorklet] ${msg}`);
                return;
            }

            if (type === 'WASM_READY') {
                console.log('[AudioService] ✅ WASM Engine initialized in Worklet.');
                return;
            }

            if (type === 'WASM_ERROR') {
                console.error('[AudioService] ❌ WASM Engine Error:', error);
                return;
            }

            if (type === 'AUDIO_DATA') {
                // DIAGNOSTIC: Что приходит от Worklet?
                if (!window._audioServiceEmitLog) {
                    console.log('[AudioService] 📤 Emitting audio:spectralData:', {
                        hasLevels: !!(levels),
                        hasAngles: !!(angles),
                        levelsLen: levels?.length,
                        anglesLen: angles?.length,
                        isFallback: event.data?.isFallback
                    });
                    window._audioServiceEmitLog = true;
                }
                // Standardized event for the entire app
                eventBus.emit('audio:spectralData', { levels, angles });
            }
        };

        // Запускаем мониторинг изменений FPS дисплея
        this._startRefreshRateMonitoring();

        return this.workletNode;
    }

    getAudioContext() {
        return this.context;
    }

    getWasmExports() {
        return this.wasmExports;
    }

    getWasmMemory() {
        return this.wasmMemory;
    }

    getWasmModule() {
        return this.wasmModule;
    }

    /**
     * Resumes AudioContext (user interaction required).
     */
    async resume() {
        if (this.context && this.context.state === 'suspended') {
            await this.context.resume();
        }
    }

    /**
     * Динамически обновляет target FPS для адаптации под частоту экрана.
     * Используется при переключении режимов энергосбережения или смене монитора.
     * @param {number} newFps - Новая частота кадров (60, 90, 120, 144, 165, 240 и т.д.)
     */
    setTargetFps(newFps) {
        if (newFps <= 0 || newFps === this.targetFps) return;

        this.targetFps = newFps;
        // console.log(`[AudioService] Updating target FPS to: ${newFps}`);

        if (this.workletNode) {
            this.workletNode.port.postMessage({
                type: 'SET_FPS',
                fps: newFps
            });
        }
    }

    /**
     * Инициализирует мониторинг изменений частоты экрана.
     * Вызывается автоматически при создании WorkletNode.
     */
    _startRefreshRateMonitoring() {
        // Мониторинг FPS экрана каждые 30 секунд (безопасный интервал)
        if (this._fpsMonitorInterval) return;
        this._fpsMonitorInterval = setInterval(async () => {
            if (!this.workletNode) {
                this.stopRefreshRateMonitoring();
                return;
            }
            try {
                const caps = await deviceCapabilities.detect();
                const newFps = caps?.display?.refreshRate;
                if (newFps && newFps > 0 && newFps !== this.targetFps) {
                    this.setTargetFps(newFps);
                }
            } catch (e) { /* молча */ }
        }, 30000);
    }

    /**
     * Останавливает мониторинг FPS.
     */
    stopRefreshRateMonitoring() {
        if (this._fpsMonitorId) {
            cancelAnimationFrame(this._fpsMonitorId);
            this._fpsMonitorId = null;
        }
        if (this._fpsMonitorInterval) {
            clearInterval(this._fpsMonitorInterval);
            this._fpsMonitorInterval = null;
        }
    }
}

// Export as Singleton
const audioService = new AudioService();
export default audioService;
