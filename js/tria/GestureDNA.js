/**
 * js/tria/GestureDNA.js
 * 
 * Модуль для формирования 128-dim embedding из моторики пользователя.
 * Извлекает уникальные паттерны: скорость, амплитуду, тремор, углы между суставами.
 * Это основа для Proof-of-Gesture и физической аутентификации пользователя (Антифрод).
 */

export class GestureDNA {
    constructor() {
        this.DNA_DIMENSIONS = 128;
        this.baselineDNA = null; // Текущий подтвержденный профиль (например, из IndexedDB/AstraDB)
    }

    /**
     * Создает 128-мерный эмбеддинг жеста (Gesture DNA)
     * Из-за отсутствия пред-обученной нейросети в браузере (до WebNN), 
     * мы вычисляем статические/кинематические характеристики и 
     * проецируем их (аналог детерминированного PCA) в пространство из 128 чисел [-1, 1].
     * 
     * @param {Array} trajectory - Массив объектов {x, y, z, timestamp} или raw landmarks
     * @param {Object} metadata - метаданные (доминантная рука, ракурс камеры и тд)
     * @returns {Float32Array} 128-dim vector
     */
    extractEmbedding(trajectory, metadata = {}) {
        if (!trajectory || trajectory.length < 5) {
            return new Float32Array(this.DNA_DIMENSIONS).fill(0);
        }

        const features = [];
        let totalSpeed = 0;
        let totalAccel = 0;
        let totalJerk = 0;
        let tremorCount = 0;
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        const speeds = [];

        // Кинематика (скорость, ускорение, рывок, тремор, bounding box)
        for (let i = 1; i < trajectory.length; i++) {
            const p1 = trajectory[i - 1];
            const p2 = trajectory[i];
            
            const dx = p2.x - p1.x;
            const dy = p2.y - p1.y;
            const dz = (p2.z !== undefined && p1.z !== undefined) ? (p2.z - p1.z) : 0;
            const dt = (p2.timestamp && p1.timestamp) ? (p2.timestamp - p1.timestamp) : 16.6; // 60fps default

            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            const speed = dist / (dt || 1);
            totalSpeed += speed;
            speeds.push(speed);

            if (speeds.length > 2) {
                const s1 = speeds[speeds.length - 2];
                const accel = Math.abs(speed - s1) / dt;
                totalAccel += accel;

                if (speeds.length > 3) {
                    const s0 = speeds[speeds.length - 3];
                    const a0 = Math.abs(s1 - s0) / dt;
                    const jerk = Math.abs(accel - a0) / dt;
                    totalJerk += jerk;
                    
                    // Обнаружение тремора (смена знака ускорения)
                    if ((speed - s1) * (s1 - s0) < 0) tremorCount++;
                }
            }

            if (p2.x < minX) minX = p2.x;
            if (p2.x > maxX) maxX = p2.x;
            if (p2.y < minY) minY = p2.y;
            if (p2.y > maxY) maxY = p2.y;
        }

        const avgSpeed = totalSpeed / (trajectory.length || 1);
        const avgAccel = totalAccel / (trajectory.length || 1);
        const avgJerk = totalJerk / (trajectory.length || 1);
        const tremorFactor = tremorCount / (trajectory.length || 1);
        const amplitudeX = maxX !== -Infinity ? (maxX - minX) : 0;
        const amplitudeY = maxY !== -Infinity ? (maxY - minY) : 0;

        const embedding = new Float32Array(this.DNA_DIMENSIONS);
        
        // 1. Статические и кинематические признаки
        embedding[0] = Math.tanh(avgSpeed * 50);
        embedding[1] = Math.tanh(avgAccel * 500);
        embedding[2] = Math.tanh(avgJerk * 5000);
        embedding[3] = Math.tanh(tremorFactor * 10);
        embedding[4] = Math.tanh(amplitudeX * 2);
        embedding[5] = Math.tanh(amplitudeY * 2);
        embedding[6] = metadata.handedness === 'Left' ? -1.0 : 1.0; 
        
        // 2. Биомеханическая проекция (joint distances)
        // Рассчитываем расстояния между кончиками пальцев и основанием ладони (landmark 0)
        // Это уникальный биометрический параметр «размаха» руки.
        if (trajectory.length > 0) {
            const frame = trajectory[trajectory.length - 1]; // Берем последний кадр
            const root = frame[0] || { x: 0, y: 0, z: 0 };
            
            // Индексы кончиков пальцев: 4, 8, 12, 16, 20
            const tips = [4, 8, 12, 16, 20];
            tips.forEach((tipIdx, i) => {
                const tip = frame[tipIdx] || root;
                const dist = Math.sqrt(
                    Math.pow(tip.x - root.x, 2) + 
                    Math.pow(tip.y - root.y, 2) + 
                    Math.pow(tip.z - root.z, 2)
                );
                embedding[7 + i] = Math.tanh(dist * 10);
            });

            // 3. Углы суставов (Curvature/Angles) — 15 признаков
            // По 3 угла на палец (PIP, DIP, MCP)
            const fingerLandmarks = [
                [0, 1, 2, 3, 4],    // Большой
                [0, 5, 6, 7, 8],    // Указательный
                [0, 9, 10, 11, 12], // Средний
                [0, 13, 14, 15, 16],// Безымянный
                [0, 17, 18, 19, 20] // Мизинец
            ];

            let angleIdx = 12;
            fingerLandmarks.forEach(indices => {
                for (let j = 1; j < indices.length - 2; j++) {
                    const a = frame[indices[j]];
                    const b = frame[indices[j+1]];
                    const c = frame[indices[j+2]];
                    if (a && b && c && angleIdx < this.DNA_DIMENSIONS) {
                        const angle = this._calculateAngle(a, b, c);
                        embedding[angleIdx++] = Math.tanh(angle - Math.PI); // Центрируем
                    }
                }
            });

            // 4. Межпальцевые расстояния (Spread) — 10 признаков
            let spreadIdx = angleIdx;
            for (let i = 0; i < tips.length; i++) {
                for (let j = i + 1; j < tips.length; j++) {
                    const p1 = frame[tips[i]];
                    const p2 = frame[tips[j]];
                    if (p1 && p2 && spreadIdx < this.DNA_DIMENSIONS) {
                        const dist = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
                        embedding[spreadIdx++] = Math.tanh(dist * 5);
                    }
                }
            }

            // Заполняем остаток детерминированной проекцией суммы всех признаков
            // чтобы избежать нулей, но не вносить хаос
            const baseSum = embedding.subarray(0, spreadIdx).reduce((a, b) => a + b, 0);
            for (let i = spreadIdx; i < this.DNA_DIMENSIONS; i++) {
                embedding[i] = Math.tanh(baseSum * Math.sin(i * 0.1));
            }
        }

        return this._normalizeVector(embedding);
    }

    _calculateAngle(a, b, c) {
        const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
        const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };
        
        const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);
        
        if (mag1 === 0 || mag2 === 0) return 0;
        return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
    }

    /**
     * Валидация: соответствует ли жест текущему пользователю?
     * 
     * @param {Float32Array} currentDNA - Эмбеддинг текущего жеста
     * @param {Float32Array} baselineDNA - Сохраненный эталонный эмбеддинг пользователя
     * @returns {number} Степень совпадения (0.0 - 1.0)
     */
    verify(currentDNA, baselineDNA = this.baselineDNA) {
        if (!currentDNA || !baselineDNA) return 0.0;
        if (currentDNA.length !== baselineDNA.length) return 0.0;

        return this._cosineSimilarity(currentDNA, baselineDNA);
    }
    
    setBaseline(dnaVector) {
        this.baselineDNA = dnaVector;
    }

    // --- Utility Methods ---

    _normalizeVector(vector) {
        let sumSq = 0;
        for (let i = 0; i < vector.length; i++) {
            sumSq += vector[i] * vector[i];
        }
        const magnitude = Math.sqrt(sumSq) || 1;
        
        for (let i = 0; i < vector.length; i++) {
            vector[i] /= magnitude;
        }
        return vector;
    }

    _cosineSimilarity(vecA, vecB) {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }
        if (normA === 0 || normB === 0) return 0;
        const sim = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
        return Math.max(0, sim); // Приводим к диапазону [0, 1]
    }
}

// Singleton export
export const gestureDNA = new GestureDNA();
