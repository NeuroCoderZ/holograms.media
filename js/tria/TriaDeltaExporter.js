/**
 * TriaDeltaExporter.js — Экспортёр Дельты Памяти
 *
 * Позволяет выгрузить новые Soma-блоки, созданные за сессию или с момента последней синхронизации.
 * Используется для:
 * 1. Локального бэкапа (Download JSON).
 * 2. Синхронизации с облаком (Phase 3).
 * 3. Переноса личности на другое устройство.
 */

export class TriaDeltaExporter {

    constructor(memory) {
        this.memory = memory;
    }

    /**
     * Получить блоки, созданные после определенного времени.
     * @param {number} sinceTimestamp
     */
    async getDelta(sinceTimestamp) {
        const all = await this.memory.getAllSoma();
        return all.filter(soma => soma.pneuma.created_at > sinceTimestamp);
    }

    /**
     * Экспортировать дельту в JSON-файл.
     * @param {number} sinceTimestamp
     * @param {string} fileName
     */
    async exportToFile(sinceTimestamp = 0, fileName = 'tria_memory_delta.json') {
        const delta = await this.getDelta(sinceTimestamp);

        if (delta.length === 0) {
            console.log('[DeltaExporter] Нет новых блоков для экспорта.');
            return;
        }

        const exportData = {
            version: '2.6',
            exported_at: Date.now(),
            since_ts: sinceTimestamp,
            block_count: delta.length,
            blocks: delta,
            // В Phase 3 здесь будет подпись BioHash
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();

        URL.revokeObjectURL(url);
        console.log(`[DeltaExporter] Экспортировано ${delta.length} блоков в ${fileName}`);
    }
}
