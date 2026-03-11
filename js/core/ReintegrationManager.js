/**
 * ReintegrationManager.js — Протокол «Реинтеграция» (Reverse Spaghettification)
 * Tria Evolution v0.20.125
 * 
 * Собирает «растянутые» и деградирующие данные обратно в связную структуру сознания.
 */

export class ReintegrationManager {
    constructor(triaFS, holochainService) {
        this.fs = triaFS;
        this.holo = holochainService;

        this._pendingFragments = [];
        this._reintegrationThreshold = 0.75; // Косинусное сходство для кластеризации
    }

    /**
     * Ставит фрагмент в очередь на реинтеграцию (обычно вызывается из TriaFS при инволюции).
     */
    async scheduleFragment(node) {
        if (!this._pendingFragments.some(f => f.path === node.path)) {
            this._pendingFragments.push(node);
            console.log(`[Reintegration] Fragment scheduled: ${node.path}`);

            // Если накопилось достаточно фрагментов, запускаем процесс сборки
            if (this._pendingFragments.length >= 5) {
                await this.processQueue();
            }
        }
    }

    /**
     * Основной процесс сборки структуры из хаоса.
     */
    async processQueue() {
        if (this._pendingFragments.length < 2) return;

        console.log(`[Reintegration] Starting reintegration of ${this._pendingFragments.length} fragments...`);

        // 1. Кластеризация по эмбеддингам
        const clusters = this._clusterFragments(this._pendingFragments);

        for (const cluster of clusters) {
            if (cluster.length < 2) continue;

            // 2. Хронологическая сортировка через HoloChain ticks
            cluster.sort((a, b) => a.tickCreated - b.tickCreated);

            // 3. Выбор центрального нода (максимальное возбуждение до деградации)
            const center = cluster.reduce((prev, curr) =>
                (prev.excitationScore > curr.excitationScore) ? prev : curr
            );

            // 4. Синтез нового TriaState (.tst)
            const resultPath = `tria://brain/central/coherence/reintegrated/${center.holoHash.slice(0, 8)}.tst`;

            const reintegratedData = {
                origin_fragments: cluster.map(c => c.path),
                fragment_count: cluster.length,
                time_span: cluster[cluster.length - 1].tickCreated - cluster[0].tickCreated,
                recomposed_at: Date.now()
            };

            await this.fs.writeNode(
                resultPath,
                '.tst',
                reintegratedData,
                center.embedding // Наследуем вектор центрального смысла
            );

            console.log(`[Reintegration] Successfully recomposed: ${resultPath}`);

            // 5. Очистка очереди от обработанных фрагментов
            this._pendingFragments = this._pendingFragments.filter(f => !cluster.includes(f));

            // 6. Мягкое торможение исходных фрагментов (реинтеграция завершена)
            cluster.forEach(node => {
                node.inhibitionLevel = 0.8;
                node.gate = 'ARCHIVED';
            });
        }
    }

    _clusterFragments(fragments) {
        const clusters = [];
        const visited = new Set();

        for (let i = 0; i < fragments.length; i++) {
            if (visited.has(i)) continue;

            const cluster = [fragments[i]];
            visited.add(i);

            if (!fragments[i].embedding) {
                clusters.push(cluster);
                continue;
            }

            for (let j = i + 1; j < fragments.length; j++) {
                if (visited.has(j) || !fragments[j].embedding) continue;

                const similarity = this._cosineSimilarity(fragments[i].embedding, fragments[j].embedding);
                if (similarity > this._reintegrationThreshold) {
                    cluster.push(fragments[j]);
                    visited.add(j);
                }
            }
            clusters.push(cluster);
        }
        return clusters;
    }

    _cosineSimilarity(v1, v2) {
        let dot = 0, m1 = 0, m2 = 0;
        for (let i = 0; i < v1.length; i++) {
            dot += v1[i] * v2[i];
            m1 += v1[i] * v1[i];
            m2 += v2[i] * v2[i];
        }
        return dot / (Math.sqrt(m1) * Math.sqrt(m2) + 1e-9);
    }
}
