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

    // Telegram CloudStorage wrapper
    async tgCloudGet(key) {
        if (!window.Telegram?.WebApp?.CloudStorage) return null;
        return new Promise((resolve) => {
            Telegram.WebApp.CloudStorage.getItem(key, (err, val) => {
                if (err) { console.warn('[Storage] CloudStorage get error:', err); resolve(null); }
                else resolve(val);
            });
        });
    }

    async tgCloudSet(key, value) {
        if (!window.Telegram?.WebApp?.CloudStorage) return false;
        const str = typeof value === 'string' ? value : JSON.stringify(value);
        return new Promise((resolve) => {
            Telegram.WebApp.CloudStorage.setItem(key, str, (err) => {
                if (err) { console.warn('[Storage] CloudStorage set error:', err); resolve(false); }
                else resolve(true);
            });
        });
    }
}

export const storage = new StorageManager();
export default storage;
