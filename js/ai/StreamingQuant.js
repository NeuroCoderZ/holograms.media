/**
 * StreamingQuant.js — Глобальная Триа Stage 1
 * ===================================================================
 * Модуль для нарезки потока координат MediaPipe на 200-мс кванты.
 * Оптимизировано для инкрементального обучения и Early Trigger.
 */

export class StreamingQuant {
    constructor(options = {}) {
        this.chunkMs = options.chunkMs || 200; // 200мс — стандарт v0.20.250
        this.fps = options.fps || 60;
        this.framesPerChunk = Math.floor(this.fps * (this.chunkMs / 1000));
        
        this.buffer = []; // Накопленные кадры (21 точка кисти)
        this.onChunkReady = options.onChunkReady || null;
        
        console.log(`[StreamingQuant] Initialized. Window: ${this.chunkMs}ms (${this.framesPerChunk} frames)`);
    }

    /**
     * Добавить новый кадр из MediaPipe
     * @param {Array} landmarks — 21 точка кисти [{x,y,z}, ...]
     */
    addFrame(landmarks) {
        if (!landmarks || landmarks.length !== 21) return;

        // Схлопываем 21 точку в плоский массив (63 значения)
        const flatFrame = new Float32Array(63);
        for (let i = 0; i < 21; i++) {
            flatFrame[i * 3]     = landmarks[i].x;
            flatFrame[i * 3 + 1] = landmarks[i].y;
            flatFrame[i * 3 + 2] = landmarks[i].z;
        }

        this.buffer.push(flatFrame);

        // Если накопили достаточно кадров для кванта
        if (this.buffer.length >= this.framesPerChunk) {
            this._processChunk();
        }
    }

    /**
     * Формирует квант и вызывает callback
     */
    _processChunk() {
        const chunkData = this.buffer.slice(0, this.framesPerChunk);
        this.buffer = []; // Очищаем буфер для следующего кванта

        // Создаем плоский вектор кванта (frames * 63)
        const flatChunk = new Float32Array(this.framesPerChunk * 63);
        for (let i = 0; i < this.framesPerChunk; i++) {
            flatChunk.set(chunkData[i], i * 63);
        }

        if (this.onChunkReady) {
            this.onChunkReady({
                timestamp: Date.now(),
                duration: this.chunkMs,
                frameCount: this.framesPerChunk,
                vector: flatChunk
            });
        }
    }

    reset() {
        this.buffer = [];
    }
}
