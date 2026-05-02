/**
 * ChunkProcessor.js — Нарезка жестового потока на 50мс окна
 * ===========================================================
 * Гермес-Эйдос: жестовое полушарие.
 *
 * MediaPipe даёт 30-60 FPS → 1 кадр каждые 16-33мс.
 * Мы нарезаем поток на чанки по 50мс (1/20 секунды = ~2-3 кадра).
 * Каждый чанк содержит достаточно данных для вектора скорости.
 *
 * Обоснование 50мс:
 *   - Период ноты C0 (16.352 Гц) ≈ 61мс — близко к 50мс
 *   - Короче 20мс → слишком шумно
 *   - Длиннее 100мс → теряем предиктивность
 *   - 50мс = оптимальный компромисс для раннего предсказания
 *
 * Emit: eventBus('eidos:chunkReady', chunk)
 */

const CHUNK_MS = 50;              // 1/20 секунды
const MAX_GESTURE_MS = 20_000;    // максимальная длительность жеста
const MAX_CHUNKS = Math.ceil(MAX_GESTURE_MS / CHUNK_MS); // ~400

export class ChunkProcessor {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this._buffer = [];           // ring buffer кадров текущего чанка
        this._gestureBuffer = [];    // все чанки текущего жеста
        this._lastChunkTime = 0;
        this._gestureStartTime = 0;
        this._isGestureActive = false;
        this._chunkIndex = 0;

        this._stats = { framesReceived: 0, chunksEmitted: 0, gesturesCompleted: 0 };
    }

    /**
     * Вызывается каждый кадр от MediaPipe (~30-60 раз/сек).
     * @param {Array} landmarks - 21 точек [{x,y,z}, ...]
     * @param {number} timestamp - performance.now() в мс
     */
    onNewFrame(landmarks, timestamp) {
        if (!landmarks || landmarks.length < 21) return;
        this._stats.framesReceived++;

        // Начало жеста — первый кадр после паузы
        if (!this._isGestureActive) {
            this._isGestureActive = true;
            this._gestureStartTime = timestamp;
            this._chunkIndex = 0;
            this._gestureBuffer = [];
        }

        // Добавляем кадр в буфер текущего чанка
        this._buffer.push({
            landmarks: this._flattenLandmarks(landmarks),
            timestamp
        });

        // Каждые 50мс — flush чанк
        if (timestamp - this._lastChunkTime >= CHUNK_MS) {
            this._flushChunk(timestamp);
            this._lastChunkTime = timestamp;
        }

        // Ограничение максимальной длительности жеста
        if (timestamp - this._gestureStartTime > MAX_GESTURE_MS) {
            this.endGesture(timestamp);
        }
    }

    /**
     * Явное завершение жеста (вызывается когда рука пропала из кадра).
     */
    endGesture(timestamp) {
        if (!this._isGestureActive) return;

        // Flush оставшиеся кадры
        if (this._buffer.length > 0) {
            this._flushChunk(timestamp);
        }

        this._isGestureActive = false;
        this._stats.gesturesCompleted++;

        this.eventBus?.emit?.('eidos:gestureComplete', {
            chunks: this._gestureBuffer.length,
            durationMs: timestamp - this._gestureStartTime,
            chunkIndex: this._chunkIndex
        });
    }

    _flushChunk(timestamp) {
        if (this._buffer.length === 0) return;

        const frames = this._buffer.splice(0);
        const chunk = {
            index: this._chunkIndex++,
            timestamp,
            durationMs: frames.length > 1
                ? frames[frames.length - 1].timestamp - frames[0].timestamp
                : 0,
            frameCount: frames.length,
            frames: frames.map(f => f.landmarks),   // [Float32Array(63), ...]
            velocity: this._calcVelocity(frames),    // средняя скорость движения
            centroid: this._calcCentroid(frames),     // средняя позиция
            gestureElapsedMs: timestamp - this._gestureStartTime
        };

        // Сохраняем в буфер жеста
        this._gestureBuffer.push(chunk);
        if (this._gestureBuffer.length > MAX_CHUNKS) {
            this._gestureBuffer.shift();
        }

        this._stats.chunksEmitted++;
        this.eventBus?.emit?.('eidos:chunkReady', chunk);
    }

    /**
     * Flatten 21 landmarks [{x,y,z}] → Float32Array(63)
     */
    _flattenLandmarks(landmarks) {
        const flat = new Float32Array(63);
        for (let i = 0; i < Math.min(21, landmarks.length); i++) {
            flat[i * 3]     = landmarks[i].x || 0;
            flat[i * 3 + 1] = landmarks[i].y || 0;
            flat[i * 3 + 2] = landmarks[i].z || 0;
        }
        return flat;
    }

    /**
     * Средняя скорость движения между кадрами (евклидово расстояние по centroid).
     */
    _calcVelocity(frames) {
        if (frames.length < 2) return 0;
        let totalDist = 0;
        for (let i = 1; i < frames.length; i++) {
            const a = frames[i - 1].landmarks;
            const b = frames[i].landmarks;
            // Берём запястье (index 0) как anchor
            const dx = b[0] - a[0];
            const dy = b[1] - a[1];
            const dz = b[2] - a[2];
            totalDist += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        const dt = (frames[frames.length - 1].timestamp - frames[0].timestamp) / 1000;
        return dt > 0 ? totalDist / dt : 0;
    }

    /**
     * Средняя позиция запястья в чанке.
     */
    _calcCentroid(frames) {
        if (frames.length === 0) return { x: 0, y: 0, z: 0 };
        let sx = 0, sy = 0, sz = 0;
        for (const f of frames) {
            sx += f.landmarks[0]; // wrist x
            sy += f.landmarks[1]; // wrist y
            sz += f.landmarks[2]; // wrist z
        }
        const n = frames.length;
        return { x: sx / n, y: sy / n, z: sz / n };
    }

    get stats() { return { ...this._stats }; }
    get isActive() { return this._isGestureActive; }
    get currentGestureChunks() { return this._gestureBuffer.length; }
}

export default ChunkProcessor;
