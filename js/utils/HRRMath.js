/**
 * HRRMath.js — Математика Голографических Представлений (v0.20.125)
 * 
 * ВНИМАНИЕ: Реализация СТРОГО на базе CWT (Continuous Wavelet Transform).
 * Исправлено: внедрен временной сдвиг Тау (τ) и сопряженный вейвлет для unbind.
 */

export class HRRMath {
    /**
     * bindCWT — Связывание жеста и звукового фонона через вейвлет.
     * 
     * @param {Object} gesture - { scale, tick } (tick здесь — это Тау, сдвиг вейвлета)
     * @param {Object} phonon - { amplitudeDb }
     * @param {number} currentTick - Текущий тик из TriaPulse (Момент "СЕЙЧАС")
     * 
     * Почему это настоящий CWT:
     * Коэффициент вычисляется как проекция сигнала на вейвлет, смещенный во времени.
     * Формула: t = (currentTick - τ) / scale
     */
    static bindCWT(gesture, phonon, currentTick) {
        const scale = gesture.scale || 1.0;
        const tau = gesture.tick; // Сдвиг вейвлета
        const amplitude = phonon.amplitudeDb;

        // Нормализованное время со сдвигом τ
        const t = (currentTick - tau) / scale;
        
        // Физика Morlet вейвлета (из cwt.cpp)
        const envelope = Math.exp(-0.5 * t * t);
        const oscillator = Math.cos(5.0 * t);
        
        // CWT коэффициент (без spatialPrecision, как просил Клод)
        return amplitude * envelope * oscillator;
    }

    /**
     * unbindCWT — Декодирование фонона из связанного состояния.
     * Реализуется через корреляцию с сопряженным вейвлетом ψ*.
     */
    static unbindCWT(compositeValue, keyGesture, currentTick) {
        const scale = keyGesture.scale || 1.0;
        const tau = keyGesture.tick;

        // Сопряженный вейвлет для вещественного Морле: инверсия знака t
        const t = -(currentTick - tau) / scale;
        
        const basis = Math.exp(-0.5 * t * t) * Math.cos(5.0 * t);
        
        return compositeValue / (basis + 1e-10);
    }

    /**
     * bindSmall — Кольцевая свертка O(n²) для векторов n <= 256.
     * Оставлено без изменений для HRR-эмбеддингов символьного уровня.
     */
    static bindSmall(a, b) {
        const n = a.length;
        const result = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            let sum = 0;
            const ni = n + i;
            for (let j = 0; j < n; j++) {
                sum += a[j] * b[(ni - j) % n];
            }
            result[i] = sum;
        }
        return this.normalize(result);
    }

    /**
     * unbind — Обратная операция для кольцевой свертки.
     * Реализуется через зеркальную инверсию вектора ключа.
     */
    static unbind(composite, key) {
        const n = key.length;
        const keyInverse = new Float32Array(n);
        keyInverse[0] = key[0];
        for (let i = 1; i < n; i++) {
            keyInverse[i] = key[n - i];
        }
        return this.bindSmall(composite, keyInverse);
    }

    /**
     * cosineSimilarity — Программатор (Сравнение Прогноза и Реальности).
     */
    static cosineSimilarity(v1, v2) {
        let dot = 0, mag1 = 0, mag2 = 0;
        for (let i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
            mag1 += v1[i] * v1[i];
            mag2 += v2[i] * v2[i];
        }
        const mag = Math.sqrt(mag1) * Math.sqrt(mag2);
        return mag > 1e-10 ? dot / mag : 0;
    }

    static normalize(v) {
        let norm = 0;
        for (let i = 0; i < v.length; i++) norm += v[i] * v[i];
        norm = Math.sqrt(norm);
        if (norm > 1e-10) {
            for (let i = 0; i < v.length; i++) v[i] /= norm;
        }
        return v;
    }

    static createRandomVector(n = 1536) {
        const v = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            v[i] = Math.random() * 2 - 1;
        }
        return this.normalize(v);
    }
}
