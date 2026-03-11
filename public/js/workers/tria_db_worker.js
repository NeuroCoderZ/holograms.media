// frontend/js/workers/tria_db_worker.js - FINAL ARCHITECTURE v3
// Classic Worker using importScripts for maximum compatibility.

// Load the sql.js library into the worker's global scope
try {
    importScripts('/sql-wasm.js');
} catch (e) {
    console.error("CRITICAL: Failed to import sql-wasm.js script.", e);
    // Send a message back to the main thread that we've failed.
    self.postMessage({ error: "Failed to load core SQL library." });
    // Terminate the worker
    self.close();
}


let db = null;
let sqlite = null;
let isInitialized = false;

const broadcast = new BroadcastChannel('tria_db_channel');

async function initializeDatabase({ dbUrl }) {
    if (isInitialized) {
        return { success: true, message: 'Database already initialized' };
    }
    
    try {
        broadcast.postMessage({ type: 'INITIALIZING', message: 'Initializing SQLite WASM (Classic Worker)...' });
        
        // initSqlJs is now in the global scope thanks to importScripts()
        sqlite = await initSqlJs({
            locateFile: file => `/${file}` // Assumes sql-wasm.wasm is in /public root
        });
        
        broadcast.postMessage({ type: 'WASM_READY', message: 'SQLite WASM initialized successfully' });
        
        broadcast.postMessage({ type: 'FETCHING', message: 'Loading database file...' });
        const response = await fetch(dbUrl);
        if (!response.ok) {
            throw new Error(`Database load failed: ${response.status}`);
        }
        
        const dbArrayBuffer = await response.arrayBuffer();
        db = new sqlite.Database(new Uint8Array(dbArrayBuffer));
        
        isInitialized = true;
        broadcast.postMessage({ type: 'READY', message: 'Database initialization complete' });
        return { success: true };
        
    } catch (error) {
        broadcast.postMessage({ type: 'ERROR', message: `Initialization failed: ${error.message}` });
        throw error;
    }
}

async function fullTextSearch({ query, k = 20 }) {
    if (!isInitialized) {
        throw new Error('База данных не инициализирована');
    }

    try {
        // Используем простой exec() вместо prepare() для совместимости
        const results = [];
        
        // Sanitize the query to prevent basic SQL injection
        const sanitizedQuery = query.replace(/'/g, "''");

        const sqlQuery = `
            SELECT hm.id, hm.text, hm.source, hm.timestamp, hm.semanticTags
            FROM memory_fts fts
            JOIN holographic_memory hm ON hm.id = fts.rowid
            WHERE fts.memory_fts MATCH '${sanitizedQuery}'
            ORDER BY rank
            LIMIT ${k}
        `;
        
        const queryResults = db.exec(sqlQuery);
        
        if (queryResults.length > 0 && queryResults[0].values) {
            const columns = queryResults[0].columns;
            queryResults[0].values.forEach(row => {
                const result = {};
                columns.forEach((col, index) => {
                    result[col] = row[index];
                });
                
                result.semanticTags = JSON.parse(result.semanticTags || '[]');
                results.push(result);
            });
        }
        
        return results;
        
    } catch (error) {
        console.error('Ошибка полнотекстового поиска:', error);
        throw error;
    }
}

self.onmessage = async (event) => {
    const { id, method, params } = event.data;
    try {
        let result;
        switch (method) {
            case 'initialize':
                result = await initializeDatabase(params);
                break;
            case 'fullTextSearch':
                result = await fullTextSearch(params);
                break;
            default:
                throw new Error(`Unknown method: ${method}`);
        }
        self.postMessage({ id, result });
    } catch (error) {
        self.postMessage({ id, error: error.message, stack: error.stack });
    }
};
