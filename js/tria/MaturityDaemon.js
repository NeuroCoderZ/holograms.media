/**
 * MaturityDaemon.js — Демон Зрелости и Лета (Lethe)
 *
 * Отвечает за:
 * 1. Цикл Лета (Lethe Cycle): Ежедневное затухание весов нейросети.
 * 2. Управление хранилищем: Перенос L1 -> L2 и удаление старых блоков.
 * 3. Расчёт Obolos: Девальвация полезности неиспользуемых знаний.
 */

import { TriaConfig } from './config.js';

export class MaturityDaemon {

    /**
     * @param {Object} enkephalon - Интерфейс к WASM ядру (brain.rs)
     * @param {TriaMemory} hippocampus - Интерфейс к IndexedDB
     */
    constructor(enkephalon, hippocampus) {
        this.brain = enkephalon;
        this.memory = hippocampus;
        this._timer = null;
        this.lastRunKey = 'lethe_last_run_ts';
    }

    start() {
        this._checkCycle();
        // Проверка каждый час, не пора ли запускать цикл (если 24ч прошло)
        this._timer = setInterval(() => this._checkCycle(), 3600000);
        console.log('[MaturityDaemon] Демон запущен');
    }

    stop() {
        if (this._timer) {
            clearInterval(this._timer);
            this._timer = null;
        }
    }

    async _checkCycle() {
        const lastRun = parseInt(localStorage.getItem(this.lastRunKey) || '0', 10);
        const now = Date.now();
        const interval = TriaConfig.lethe.intervalMs; // 24 часа

        if (now - lastRun >= interval) {
            console.log('[Lethe] Время пришло. Запуск цикла увядания...');
            await this.runLetheCycle();
            localStorage.setItem(this.lastRunKey, now.toString());
        }
    }

    async runLetheCycle() {
        try {
            // 1. Enkephalon Decay (WASM)
            // Вызываем brain_decay в Rust коде
            if (this.brain && this.brain.decay) {
                this.brain.decay();
                console.log('[Lethe] Нейронные веса ослаблены (Global Decay).');
            } else {
                console.warn('[Lethe] Enkephalon не доступен, пропуск decay.');
            }

            // 2. Storage Pruning (Hippocampus)
            // Удаляем блоки старше L2 Retention (30 дней по умолчанию)
            const maxAge = TriaConfig.storage.l2RetentionDays;
            const prunedCount = await this.memory.pruneByAge(maxAge);
            console.log(`[Lethe] Память очищена: удалено ${prunedCount} блоков старше ${maxAge} дней.`);

            // 3. Obolos Devaluation (Local Soma Blocks)
            // Проходим по всем блокам L1 и снижаем их utility score, если они не использовались
            const allBlocks = await this.memory.getAllSoma();
            let updatedCount = 0;

            for (const block of allBlocks) {
                // Логика девальвации
                // Если блок не подтвержден ('confirmed'), он теряет 10% полезности за цикл
                if (block.sarx && block.sarx.feedback !== 'confirmed') {
                    block.sarx.utility_score *= 0.9;
                    block.sarx.last_updated_at = Date.now();
                    await this.memory.saveSoma(block);
                    updatedCount++;
                }
            }
            console.log(`[Lethe] Девальвация Obolos: обновлено ${updatedCount} блоков.`);

        } catch (e) {
            console.error('[Lethe] Критическая ошибка цикла:', e);
        }
    }
}
