/**
 * AudioService.js
 * Encapsulates all Audio Context management, WASM loading, and AudioWorklet initialization.
 * Follows the Singleton pattern (or Service pattern) to be used across the app (replaces global state.audio part).
 */
import eventBus from '../core/eventBus.js';

// Import WASM URL explicitly for Vite to handle asset path
// Assuming the file is in public/wasm/ or src/wasm/. 
// If it is in public, direct URL works, but ?url is safer for bundlers if moved to src.
// For now, let's assume it stays in public, but we enforce the path.
// Actually, to fix the deployment issue, better to put it in `src/wasm` or let Vite know about it.
// But legacy structure uses `wasm_loader.js`. Let's reimplement loader here.
import wasmUrl from '../wasm/cwt_analyzer.wasm?url';
import workletUrl from '../audio/cwtAudioWorklet.js?url';

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

            const buffer = await response.arrayBuffer();
            // Instantiate to allow access to memory/exports from main thread if needed
            // Also keep the module to send to Worklet
            const { instance, module } = await WebAssembly.instantiate(buffer, {});
            this.wasmInstance = instance;
            this.wasmModule = module;
            this.wasmExports = instance.exports;
            this.wasmMemory = instance.exports.memory;

            console.log('[AudioService] WASM instantiated successfully.');

        } catch (error) {
            console.error('[AudioService] WASM loading failed:', error);
            // Fallback strategy: Emit warning, allow app to fall back to JS processing if implemented
            console.warn('[AudioService] Switching to JS-only fallback (Digital Basilar Membrane) due to WASM error.');
        }
    }

    /**
     * Creates the CWT Worklet Node.
     */
    createWorkletNode() {
        if (!this.context) throw new Error('AudioContext not associated.');

        this.workletNode = new AudioWorkletNode(this.context, 'cwt-audio-processor', {
            numberOfInputs: 1,
            numberOfOutputs: 1,
            outputChannelCount: [1], // Mono output
            processorOptions: {
                sampleRate: this.context.sampleRate,
                ...this.cqtConfig
            }
        });

        // Handle messages from Worklet
        this.workletNode.port.onmessage = (event) => {
            if (event.data.type === 'CWT_DATA') {
                // Broadcast spectral data via EventBus
                // event.data.data contains { levels, pans }
                eventBus.emit('audio:spectralData', event.data.data);
            }
        };

        // If WASM loaded successfully, send it to the worklet
        if (this.wasmModule) {
            this.workletNode.port.postMessage({
                type: 'INIT_WASM',
                wasmModule: this.wasmModule
            });
            console.log('[AudioService] Sent WASM module to worklet.');
        }

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
