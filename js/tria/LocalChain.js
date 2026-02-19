/**
 * LocalChain.js — Цепочка Soma-блоков памяти Триа
 *
 * Soma    = блок целиком (живая структура данных)
 * Pneuma  = неизменяемое ядро (сырые данные, хэш, время)
 * Sarx    = изменяемая оболочка (интерпретация, зрелость, полезность)
 *
 * Lethe-цикл: блоки стареют и переходят между уровнями L1→L2→L3→B2.
 * context_links пусты в Phase 1 (активируются в Phase 3).
 */

import { TriaConfig } from './config.js';

export class LocalChain {

    constructor() {
        this._letheTimer = null;
    }

    // ─────────────────────────────────────────────
    // Создание нового Soma-блока
    // ─────────────────────────────────────────────

    /**
     * Создать новый блок памяти.
     * @param {Float32Array} gestureRaw   — сырые данные жеста (63 float)
     * @param {Float32Array} audioSpectrum — аудиоспектр (128 float)
     * @param {string|null}  prevHash      — хэш предыдущего блока
     * @returns {Object} soma — новый блок
     */
    createSoma(gestureRaw, audioSpectrum, prevHash = null) {
        const soma = {

            // Pneuma: неизменяемое ядро — нельзя редактировать после создания
            pneuma: {
                id: crypto.randomUUID(),
                created_at: Date.now(),
                creator_bio_hash: new Uint8Array(32), // Phase 2: биометрический хэш
                gesture_raw: gestureRaw instanceof Float32Array
                    ? gestureRaw
                    : new Float32Array(63),
                audio_spectrum: audioSpectrum instanceof Float32Array
                    ? audioSpectrum
                    : new Float32Array(128),
                prev_block_hash: prevHash
                    ? this._hexToBytes(prevHash)
                    : new Uint8Array(32),
            },

            // Sarx: изменяемая оболочка — интерпретация может обновляться
            sarx: {
                last_updated_at: Date.now(),
                maturity_level: 0,         // 0–100: зрелость блока
                plasticity: 1.0,           // способность к изменению (снижается со временем)
                utility_score: 0.1,        // Obolos: полезность (растёт при использовании)
                predicted_intent: new Float32Array(25),
                confidence: 0.0,
                feedback: 'pending',       // pending | confirmed | corrected | abandoned | shared
            },

            content_type: 'gesture_frame', // gesture_frame | gesture_chain | knowledge_node
            parents: [],
            context_links: [],             // Phase 3: пусто в Phase 1

        };

        soma.pneuma.hash = this._computeHash(soma.pneuma);
        return soma;
    }

    // ─────────────────────────────────────────────
    // Обновление Sarx (изменяемой оболочки)
    // ─────────────────────────────────────────────

    updateSarx(soma, patch) {
        if (!soma?.sarx) throw new Error('LocalChain: невалидный Soma-блок');
        Object.assign(soma.sarx, patch, { last_updated_at: Date.now() });
        return soma;
    }

    // ─────────────────────────────────────────────
    // Lethe-цикл: затухание зрелости и полезности
    // ─────────────────────────────────────────────

    /**
     * Запустить Lethe-цикл — вызывается раз в 24 часа.
     * Неиспользуемые блоки теряют utility_score.
     * @param {Object[]} blocks — массив Soma-блоков
     */
    applyLethe(blocks) {
        const { decayRate } = TriaConfig.enkephalon;
        const now = Date.now();

        for (const soma of blocks) {
            if (!soma?.sarx) continue;

            const ageDays = (now - soma.pneuma.created_at) / 86400000;
            const usageFactor = soma.sarx.feedback === 'confirmed' ? 1.0 : 0.5;

            // Obolos девальвируется без использования (Lethe)
            soma.sarx.utility_score *= (1 - decayRate * ageDays * (1 - usageFactor));
            soma.sarx.utility_score = Math.max(0.001, soma.sarx.utility_score);

            // Пластичность снижается с возрастом блока
            soma.sarx.plasticity = Math.max(0.1, 1.0 - (ageDays / 365));
            soma.sarx.last_updated_at = now;
        }

        return blocks;
    }

    /**
     * Запустить автоматический Lethe-цикл (раз в 24 часа).
     * @param {Function} getBlocks  — функция, возвращающая Promise<blocks[]>
     * @param {Function} saveBlocks — функция для сохранения обновлённых блоков
     */
    startLethecycle(getBlocks, saveBlocks) {
        const interval = TriaConfig.lethe.intervalMs;
        this._letheTimer = setInterval(async () => {
            try {
                const blocks = await getBlocks();
                const updated = this.applyLethe(blocks);
                await saveBlocks(updated);
                console.log(`[LocalChain] Lethe-цикл: обработано ${updated.length} блоков`);
            } catch (e) {
                console.error('[LocalChain] Lethe-цикл ошибка:', e);
            }
        }, interval);
    }

    stopLetheCycle() {
        if (this._letheTimer) {
            clearInterval(this._letheTimer);
            this._letheTimer = null;
        }
    }

    // ─────────────────────────────────────────────
    // Утилиты
    // ─────────────────────────────────────────────

    _computeHash(pneuma) {
        // Phase 1: детерминированный псевдохэш без SubtleCrypto (синхронный)
        // Phase 2: заменить на crypto.subtle.digest('SHA-256', ...)
        let h = 0x811c9dc5;
        const bytes = new Uint8Array(pneuma.gesture_raw.buffer);
        for (const b of bytes) {
            h ^= b;
            h = (h * 0x01000193) >>> 0;
        }
        return h.toString(16).padStart(8, '0');
    }

    _hexToBytes(hex) {
        const arr = new Uint8Array(hex.length / 2);
        for (let i = 0; i < hex.length; i += 2) {
            arr[i / 2] = parseInt(hex.slice(i, i + 2), 16);
        }
        return arr;
    }
}
