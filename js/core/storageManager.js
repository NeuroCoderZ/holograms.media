// frontend/js/core/storageManager.js
// Unified storage manager with graceful fallback for Telegram WebView / Tracking Prevention

class StorageManager {
    constructor() {
        this.memoryStore = {};
        this.useFallback = false;
        this._test();
    }

    _test() {
        try {
            const key = '__storage_test__';
            localStorage.setItem(key, '1');
            localStorage.removeItem(key);
            console.log('[Storage] localStorage accessible');
        } catch (e) {
            console.warn('[Storage] localStorage blocked, using memory fallback');
            this.useFallback = true;
        }
    }

    getItem(key) {
        if (this.useFallback) return this.memoryStore[key] || null;
        try {
            return localStorage.getItem(key);
        } catch {
            return this.memoryStore[key] || null;
        }
    }

    setItem(key, value) {
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        if (this.useFallback) {
            this.memoryStore[key] = str;
            return;
        }
        try {
            localStorage.setItem(key, str);
        } catch {
            this.memoryStore[key] = str;
        }
    }

    removeItem(key) {
        if (this.useFallback) {
            delete this.memoryStore[key];
            return;
        }
        try {
            localStorage.removeItem(key);
        } catch {
            delete this.memoryStore[key];
        }
    }

    clear() {
        this.memoryStore = {};
        if (!this.useFallback) {
            try { localStorage.clear(); } catch {}
        }
    }

    // Telegram CloudStorage wrapper (безопасный — ловит исключения TG v6.0)
    async tgCloudGet(key) {
        try {
            if (!window.Telegram?.WebApp?.CloudStorage) return null;
            return await new Promise((res, rej) => {
                const timeout = setTimeout(() => rej(new Error('CloudStorage timeout')), 2000);
                Telegram.WebApp.CloudStorage.getItem(key, (err, val) => {
                    clearTimeout(timeout);
                    if (err) rej(err);
                    else res(val);
                });
            });
        } catch (e) {
            console.warn('[Storage] CloudStorage unavailable, falling back to localStorage:', e.message);
            return localStorage.getItem(key);
        }
    }

    async tgCloudSet(key, value) {
        try {
            if (!window.Telegram?.WebApp?.CloudStorage) return false;
            const str = typeof value === 'string' ? value : JSON.stringify(value);
            return await new Promise((res, rej) => {
                const timeout = setTimeout(() => rej(new Error('CloudStorage timeout')), 2000);
                Telegram.WebApp.CloudStorage.setItem(key, str, (err, ok) => {
                    clearTimeout(timeout);
                    if (err) rej(err);
                    else res(ok);
                });
            });
        } catch (e) {
            console.warn('[Storage] CloudStorage set failed, using localStorage:', e.message);
            localStorage.setItem(key, value);
            return true;
        }
    }
}

export const storage = new StorageManager();
export default storage;
