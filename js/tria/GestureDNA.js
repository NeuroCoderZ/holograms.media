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
        let totalSpeed = 0, totalAccel = 0, totalJerk = 0, tremorCount = 0;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        const speeds = [];

        // 1. Кинематика всей кисти (p0 - основание ладони)
        for (let i = 1; i < trajectory.length; i++) {
            const p1 = trajectory[i - 1][0] || trajectory[i - 1]; // Support both raw landmarks and objects
            const p2 = trajectory[i][0] || trajectory[i];
            
            const dx = p2.x - p1.x, dy = p2.y - p1.y, dz = (p2.z || 0) - (p1.z || 0);
            const dt = (p2.timestamp && p1.timestamp) ? (p2.timestamp - p1.timestamp) : 16.6;

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
                    const jerk = Math.abs(accel - (Math.abs(s1 - s0) / dt)) / dt;
                    totalJerk += jerk;
                    if ((speed - s1) * (s1 - s0) < 0) tremorCount++;
                }
            }
            minX = Math.min(minX, p2.x); maxX = Math.max(maxX, p2.x);
            minY = Math.min(minY, p2.y); maxY = Math.max(maxY, p2.y);
        }

        const embedding = new Float32Array(this.DNA_DIMENSIONS);
        const lastFrame = trajectory[trajectory.length - 1];
        const root = lastFrame[0] || { x: 0, y: 0, z: 0 };
        
        // [0-5] Кинематические агрегаты
        embedding[0] = Math.tanh(totalSpeed / trajectory.length * 50);
        embedding[1] = Math.tanh(totalAccel / trajectory.length * 500);
        embedding[2] = Math.tanh(totalJerk / trajectory.length * 5000);
        embedding[3] = Math.tanh((tremorCount / trajectory.length) * 10);
        embedding[4] = Math.tanh((maxX - minX) * 2);
        embedding[5] = Math.tanh((maxY - minY) * 2);

        // [6] Temporal Entropy (D-2: Anti-Replay)
        if (speeds.length > 4) {
            const speedBins = new Array(8).fill(0);
            const maxSpd = Math.max(...speeds, 0.001);
            for (const s of speeds) {
                speedBins[Math.min(7, Math.floor((s / maxSpd) * 8))]++;
            }
            let entropy = 0;
            for (const count of speedBins) {
                if (count > 0) {
                    const p = count / speeds.length;
                    entropy -= p * Math.log2(p);
                }
            }
            embedding[6] = Math.tanh(entropy / 3);
        } else {
            embedding[6] = 0;
        }

        // [7-11] Длины пальцев (Biometric Core)
        const tips = [4, 8, 12, 16, 20];
        tips.forEach((tipIdx, i) => {
            const tip = lastFrame[tipIdx] || root;
            const d = Math.sqrt(Math.pow(tip.x - root.x, 2) + Math.pow(tip.y - root.y, 2) + Math.pow(tip.z - root.z, 2));
            embedding[7 + i] = Math.tanh(d * 10);
        });

        // [12-26] Углы суставов (Digital DNA)
        const joints = [[0,1,2,3,4],[0,5,6,7,8],[0,9,10,11,12],[0,13,14,15,16],[0,17,18,19,20]];
        let angleIdx = 12;
        joints.forEach(js => {
            for (let j = 1; j < js.length - 2; j++) {
                const a = lastFrame[js[j]], b = lastFrame[js[j+1]], c = lastFrame[js[j+2]];
                if (a && b && c && angleIdx < 27) {
                    embedding[angleIdx++] = Math.tanh(this._calculateAngle(a, b, c) - Math.PI/2);
                }
            }
        });

        // [27-36] Расстояние между пальцами (Spread)
        let spreadIdx = 27;
        for (let i = 0; i < tips.length; i++) {
            for (let j = i + 1; j < tips.length; j++) {
                const p1 = lastFrame[tips[i]], p2 = lastFrame[tips[j]];
                if (p1 && p2 && spreadIdx < 37) {
                    const d = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
                    embedding[spreadIdx++] = Math.tanh(d * 5);
                }
            }
        }

        // [37-41] Скорости кончиков пальцев (D-1: Biomechanical DNA)
        if (trajectory.length > 2) {
            const prevFrame = trajectory[trajectory.length - 2];
            tips.forEach((tipIdx, i) => {
                const p1 = prevFrame[tipIdx], p2 = lastFrame[tipIdx];
                if (p1 && p2) {
                    const dv = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
                    embedding[37 + i] = Math.tanh(dv * 100);
                }
            });
        }

        // Заполняем остаток (42-127) детерминированной проекцией (Robust Padding)
        const seed = embedding.subarray(0, 42).reduce((a, b) => a + b, 0);
        for (let i = 42; i < this.DNA_DIMENSIONS; i++) {
            embedding[i] = Math.tanh(seed * Math.cos(i * 0.13));
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
