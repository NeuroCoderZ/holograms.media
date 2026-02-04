/**
 * AudioService.js
 * Encapsulates all Audio Context management, WASM loading, and AudioWorklet initialization.
 * Follows the Singleton pattern (or Service pattern) to be used across the app (replaces global state.audio part).
 */
import eventBus from '../core/eventBus.js';
import workletUrl from '../audio/cwtAudioWorklet.js?url';

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


            // 3. Load AudioWorklet
            await this.loadAudioWorklet();

            // 4. Load WASM
            await this.loadWasmModule();

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
     * Creates the CWT Worklet Node.
     */
    /**
     * Creates or retrieves the CWT Worklet Node (Singleton).
     */
    createWorkletNode() {
        if (!this.context) throw new Error('AudioContext not associated.');

        if (this.workletNode) {
            return this.workletNode;
        }

        this.workletNode = new AudioWorkletNode(this.context, 'cwt-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [2],
            processorOptions: {
                sampleRate: this.context.sampleRate,
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
                if (this.wasmBuffer) {
                    this.workletNode.port.postMessage({
                        type: 'WASM_BUFFER',
                        buffer: this.wasmBuffer
                    }, [this.wasmBuffer]); // TRANSFER ownership
                } else {
                    console.warn('[AudioService] WASM buffer not loaded yet. Handshake delayed.');
                }
                return;
            }

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
                // Standardized event for the entire app
                eventBus.emit('audio:spectralData', { levels, angles });
            }
        };

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
}

// Export as Singleton
const audioService = new AudioService();
export default audioService;
