// frontend/js/core/TriaBiosService.js (RADICALLY REWRITTEN)

// These will be populated by the JS glue code once it's loaded.
let HoloAnalyzer;

function loadJsGlue() {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '../wasm/fastcwt/fastcwt_processor.js'; // Corrected path
    script.onload = () => {
        // The glue code from wasm-pack attaches its exports to 'window.wasm_bindgen'
        // We retrieve them from there.
        HoloAnalyzer = window.wasm_bindgen.HoloAnalyzer;
        resolve(window.wasm_bindgen);
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

class TriaBiosService {
    constructor() {
        this.analyzer = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // First, load the JS glue code
            const wasm_bindgen = await loadJsGlue();

            // Then, fetch and instantiate the actual WASM binary
            const wasmResponse = await fetch('../wasm/fastcwt/fastcwt_processor_bg.wasm');
            await wasm_bindgen(wasmResponse);

            // Now we can create an instance
            const sampleRate = 44100;
            const numBins = 128;
            const chunkSize = 2048;

            this.analyzer = new HoloAnalyzer(sampleRate, numBins, chunkSize);
            this.isInitialized = true;
            console.log('✅ Tria BIOS Initialized via Static Asset Fetch.');

        } catch (error) {
            console.error('CRITICAL: Failed to initialize Tria BIOS via Fetch.', error);
            throw error;
        }
    }

    processAudio(leftChannel, rightChannel) {
        if (!this.isInitialized) {
            console.warn("BIOS not ready, skipping audio processing.");
            return [];
        }
        try {
            return this.analyzer.process(leftChannel, rightChannel);
        } catch (error) {
            console.error('Error processing audio in Tria BIOS:', error);
            return [];
        }
    }
}

export const triaBiosService = new TriaBiosService();