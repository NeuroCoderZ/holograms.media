/**
 * TriaMemory.js — IndexedDB-хранилище Soma-блоков (Hippocampus)
 *
 * L1: горячая память (7 дней) — IndexedDB, полные блоки
 * L2: тёплая память (30 дней) — IndexedDB, без Float32Array
 * L3: холодная память (90 дней) — Backblaze B2 (Phase 2)
 *
 * Также хранит снимки весов Enkephalon (brain snapshot).
 */

import { TriaConfig } from './config.js';

const DB_NAME = 'TriaMemory';
const DB_VERSION = 2; // Increased version for new store
const STORE_BLOCKS = 'soma_blocks';
const STORE_SNAPSHOTS = 'enkephalon_snapshots';
const STORE_DAO_STATE = 'dao_state';

export class TriaMemory {

    constructor() {
        this._db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const req = indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = (event) => {
                const db = event.target.result;

                if (!db.objectStoreNames.contains(STORE_BLOCKS)) {
                    const store = db.createObjectStore(STORE_BLOCKS, { keyPath: 'pneuma.id' });
                    store.createIndex('created_at', 'pneuma.created_at', { unique: false });
                    store.createIndex('feedback', 'sarx.feedback', { unique: false });
                    store.createIndex('utility_score', 'sarx.utility_score', { unique: false });
                }

                if (!db.objectStoreNames.contains(STORE_SNAPSHOTS)) {
                    db.createObjectStore(STORE_SNAPSHOTS, { keyPath: 'snapshot_id' });
                }

                if (!db.objectStoreNames.contains(STORE_DAO_STATE)) {
                    db.createObjectStore(STORE_DAO_STATE); // Key-value store (no keyPath)
                }
            };

            req.onsuccess = (e) => {
                this._db = e.target.result;
                console.log('[TriaMemory] Hippocampus инициализирован (IndexedDB)');
                resolve(this);
            };

            req.onerror = (e) => reject(e.target.error);
        });
    }

    // ─────────────────────────────────────────────
    // Soma-блоки
    // ─────────────────────────────────────────────

    async saveSoma(soma) {
        return this._put(STORE_BLOCKS, soma);
    }

    async getSoma(id) {
        return this._get(STORE_BLOCKS, id);
    }

    async getAllSoma() {
        return this._getAll(STORE_BLOCKS);
    }

    async deleteSoma(id) {
        return this._delete(STORE_BLOCKS, id);
    }

    /**
     * Lethe-очистка: удалить блоки старше N дней
     */
    async pruneByAge(maxAgeDays) {
        const all = await this.getAllSoma();
        const cutoff = Date.now() - maxAgeDays * 86400000;
        let pruned = 0;
        for (const soma of all) {
            if (soma.pneuma.created_at < cutoff) {
                await this.deleteSoma(soma.pneuma.id);
                pruned++;
            }
        }
        console.log(`[TriaMemory] Lethe-очистка: удалено ${pruned} блоков (старше ${maxAgeDays}д)`);
        return pruned;
    }

    // ─────────────────────────────────────────────
    // Enkephalon snapshots (сохранение весов мозга)
    // ─────────────────────────────────────────────

    async saveEnkephalonSnapshot(weightsF32Array) {
        const snapshot = {
            snapshot_id: `enkephalon_${Date.now()}`,
            created_at: Date.now(),
            weights: Array.from(weightsF32Array), // Float32Array → обычный массив для IDB
            param_count: weightsF32Array.length,
        };
        await this._put(STORE_SNAPSHOTS, snapshot);
        console.log(`[TriaMemory] Enkephalon snapshot сохранён: ${snapshot.param_count} параметров`);
        return snapshot.snapshot_id;
    }

    async loadLatestEnkephalonSnapshot() {
        const all = await this._getAll(STORE_SNAPSHOTS);
        if (!all.length) return null;
        all.sort((a, b) => b.created_at - a.created_at);
        const latest = all[0];
        return new Float32Array(latest.weights);
    }

    // ─────────────────────────────────────────────
    // Agentic DAO state
    // ─────────────────────────────────────────────

    async saveDaoState(state) {
        return this._put(STORE_DAO_STATE, state, 'current_state');
    }

    async loadDaoState() {
        return this._get(STORE_DAO_STATE, 'current_state');
    }

    // ─────────────────────────────────────────────
    // IndexedDB helpers
    // ─────────────────────────────────────────────

    _put(store, value, key = null) {
        return new Promise((resolve, reject) => {
            const tx = this._db.transaction(store, 'readwrite');
            const os = tx.objectStore(store);
            const req = key ? os.put(value, key) : os.put(value);
            req.onsuccess = () => resolve(req.result);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    _get(store, key) {
        return new Promise((resolve, reject) => {
            const tx = this._db.transaction(store, 'readonly');
            const req = tx.objectStore(store).get(key);
            req.onsuccess = () => resolve(req.result || null);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    _getAll(store) {
        return new Promise((resolve, reject) => {
            const tx = this._db.transaction(store, 'readonly');
            const req = tx.objectStore(store).getAll();
            req.onsuccess = () => resolve(req.result || []);
            req.onerror = (e) => reject(e.target.error);
        });
    }

    _delete(store, key) {
        return new Promise((resolve, reject) => {
            const tx = this._db.transaction(store, 'readwrite');
            const req = tx.objectStore(store).delete(key);
            req.onsuccess = () => resolve(true);
            req.onerror = (e) => reject(e.target.error);
        });
    }
}
