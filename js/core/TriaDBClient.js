// frontend/js/core/TriaDBClient.js - Updated to pass dbUrl
console.log("TriaDBClient: Module loaded.");

class TriaDBClient {
    constructor() {
        if (TriaDBClient.instance) {
            return TriaDBClient.instance;
        }
        console.log("TriaDBClient: Creating new Singleton instance...");
        this.worker = null;
        this.isInitialized = false;
        this.pendingCalls = new Map();
        this.nextCallId = 0;
        this._initializeWorker();
        TriaDBClient.instance = this;
    }

    _initializeWorker() {
        try {
            console.log("TriaDBClient: Initializing Dedicated Worker...");
            this.worker = new Worker('/js/workers/tria_db_worker.js');
            this.worker.onmessage = this._handleMessage.bind(this);
            this.worker.onerror = this._handleError.bind(this);
            console.log("✅ TriaDBClient: Dedicated Worker connection established.");
        } catch (error) {
            console.error("❌ TriaDBClient: Failed to initialize worker:", error);
            throw error;
        }
    }

    _handleMessage(event) {
        const { id, result, error, stack } = event.data;
        if (!this.pendingCalls.has(id)) return;
        const { resolve, reject, timeoutId } = this.pendingCalls.get(id);
        clearTimeout(timeoutId);
        if (error) {
            const err = new Error(error);
            err.stack = stack;
            reject(err);
        } else {
            resolve(result);
        }
        this.pendingCalls.delete(id);
    }

    _handleError(error) {
        console.error("❌ TriaDBClient: A critical error occurred in the worker:", error);
        this.pendingCalls.forEach(call => {
            call.reject(new Error("Worker encountered a critical error."));
            clearTimeout(call.timeoutId);
        });
        this.pendingCalls.clear();
    }

    async call(method, params = {}, timeout = 30000) {
        if (!this.worker) throw new Error("Worker is not initialized.");
        const id = ++this.nextCallId;
        return new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                this.pendingCalls.delete(id);
                reject(new Error(`Call to '${method}' timed out after ${timeout / 1000}s.`));
            }, timeout);
            this.pendingCalls.set(id, { resolve, reject, timeoutId });
            this.worker.postMessage({ id, method, params });
        });
    }

    // --- Public API ---

    async initialize({ dbUrl }) {
        if (this.isInitialized) {
            return { success: true, message: 'Already initialized' };
        }
        if (!dbUrl) {
            throw new Error('Database URL is required for initialization.');
        }
        console.log(`TriaDBClient: Sending 'initialize' command to worker with URL: ${dbUrl}`);
        // Use a longer timeout for the very first initialization
        const result = await this.call('initialize', { dbUrl }, 360000); // 6 minutes
        this.isInitialized = true;
        console.log("✅ TriaDBClient: Initialization promise resolved.");
        return result;
    }

    async fullTextSearch(query, k = 20) {
        if (!this.isInitialized) throw new Error("Client not initialized. Call initialize() first.");
        return this.call('fullTextSearch', { query, k });
    }
    
    static getInstance() {
        if (!TriaDBClient.instance) {
            TriaDBClient.instance = new TriaDBClient();
        }
        return TriaDBClient.instance;
    }
}

// Initialize the singleton instance immediately.
const instance = new TriaDBClient();
export { TriaDBClient, instance as TriaDBClientInstance };
