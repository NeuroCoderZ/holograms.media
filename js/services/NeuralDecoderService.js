// js/services/NeuralDecoderService.js
import { state } from '../core/init.js';
import eventBus from '../core/eventBus.js';

export class NeuralDecoderService {
    constructor() {
        this.isActive = false;
        this.buffer = [];
        this.windowSizeMs = 1000; // Накапливаем данные за 1 секунду
        this.lastProcessTime = 0;
        this.isProcessing = false;
        
        // Коэффициенты обогащения (лерпа) по умолчанию
        this.neuralEnrichment = {
            levelsGain: new Float32Array(256).fill(1.0),
            pansOffset: new Float32Array(128).fill(0.0)
        };

        // Слушаем сырые данные от сканнера
        eventBus.on('scannerData', (audioParams) => {
            if (this.isActive) {
                this._accumulate(audioParams);
            }
        });
    }

    start() {
        this.isActive = true;
        this.buffer = [];
        this.lastProcessTime = performance.now();
        console.log('[NeuralDecoder] Started');
    }

    stop() {
        this.isActive = false;
        this.buffer = [];
        // Сброс коэффициентов
        this.neuralEnrichment.levelsGain.fill(1.0);
        this.neuralEnrichment.pansOffset.fill(0.0);
        console.log('[NeuralDecoder] Stopped');
    }

    _accumulate(audioParams) {
        if (!audioParams || !audioParams.levels || !audioParams.pans) return;

        const now = performance.now();
        this.buffer.push({
            time: now,
            levels: new Float32Array(audioParams.levels),
            pans: new Float32Array(audioParams.pans)
        });

        // Очистка старых фреймов
        this.buffer = this.buffer.filter(f => now - f.time <= this.windowSizeMs);

        if (now - this.lastProcessTime >= this.windowSizeMs && !this.isProcessing && this.buffer.length > 5) {
            this._processBuffer(now);
        }
    }

    async _processBuffer(now) {
        this.isProcessing = true;
        this.lastProcessTime = now;

        try {
            // В идеале здесь мы берем усредненный или "пиковый" вектор из буфера
            // и отправляем его в TriaOrchestrator или напрямую на сервер для инференса.
            
            // Mock: эмулируем задержку сети
            await new Promise(r => setTimeout(r, 200));

            // Симуляция ответа от LLM Триа 3: "Обогащение" гармоник
            // Нейросеть предсказывает, какие частоты нужно усилить/ослабить
            // на основе визуального шума голограммы.
            const newLevelsGain = new Float32Array(256).fill(1.0);
            const newPansOffset = new Float32Array(128).fill(0.0);

            for (let i = 0; i < 256; i++) {
                // Псевдослучайное обогащение: +- 5% к амплитуде, чтобы звук был "живее"
                newLevelsGain[i] = 1.0 + (Math.random() * 0.1 - 0.05);
            }
            
            for (let i = 0; i < 128; i++) {
                newPansOffset[i] = (Math.random() * 0.05 - 0.025);
            }

            this.neuralEnrichment = {
                levelsGain: newLevelsGain,
                pansOffset: newPansOffset
            };

            // console.log('[NeuralDecoder] Вектор обогащения обновлён (Tria 3 mock).');
            eventBus.emit('neuralDecoderEnrichment', this.neuralEnrichment);

        } catch (e) {
            console.error('[NeuralDecoder] Ошибка процессинга:', e);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Подмешивает (apply) нейросетевые коэффициенты к сырому звуку.
     * Эту функцию вызывает HologramScanner или Синтезатор перед генерацией звука.
     */
    applyEnrichment(levels, pans) {
        if (!this.isActive) return { enrichedLevels: levels, enrichedPans: pans };

        const enrichedLevels = new Float32Array(256);
        const enrichedPans = new Float32Array(128);

        for (let i = 0; i < 256; i++) {
            // Применяем gain. Если original level = -128 (тишина), оставляем -128.
            if (levels[i] <= -120) {
                enrichedLevels[i] = levels[i];
            } else {
                // Умножение dB-значений требует осторожности.
                // В данном упрощении мы слегка сдвигаем dB. 1.05 = +5%
                // dB * 1.05 (поскольку dB отрицательные, 1.05 сделает их более отрицательными, т.е. тише.
                // Лучше добавлять delta в dB).
                
                // Пересчитываем множитель в смещение: (gain - 1.0) * 10
                // Например, 1.05 -> +0.5 dB
                const dbShift = (this.neuralEnrichment.levelsGain[i] - 1.0) * 10;
                enrichedLevels[i] = Math.max(-128, Math.min(0, levels[i] + dbShift));
            }
        }

        for (let i = 0; i < 128; i++) {
            enrichedPans[i] = Math.max(-1, Math.min(1, pans[i] + this.neuralEnrichment.pansOffset[i]));
        }

        return { enrichedLevels, enrichedPans };
    }
}
