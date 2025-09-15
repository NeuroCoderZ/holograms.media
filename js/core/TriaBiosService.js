// frontend/js/core/TriaBiosService.js (FINAL, CORRECT VERSION)

// Используем динамический импорт, который Vite обработает корректно
const { default: init, HoloAnalyzer } = await import('@holographic-core/holographic_core.js');

class TriaBiosService {
    constructor() {
        this.analyzer = null;
        this.isInitialized = false;
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Инициализируем сам WASM-модуль
            await init();

            // Создаем экземпляр анализатора
            const sampleRate = 44100;
            const numBins = 128;
            const chunkSize = 2048; // Должен соответствовать размеру буфера в audioProcessing
            this.analyzer = new HoloAnalyzer(sampleRate, numBins, chunkSize);

            this.isInitialized = true;
            console.log('✅ Tria BIOS Initialized via dynamic import.');

        } catch (error) {
            console.error('CRITICAL: Failed to initialize Tria BIOS.', error);
            throw error;
        }
    }

    processAudio(leftChannel, rightChannel) {
        if (!this.isInitialized) return [];
        try {
            return this.analyzer.process(leftChannel, rightChannel);
        } catch (error) {
            console.error('Error processing audio in Tria BIOS:', error);
            return [];
        }
    }
}

export const triaBiosService = new TriaBiosService();