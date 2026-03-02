/**
 * GestureToCodeExecutor.js — ТЗ v4.5 Этап 3
 * ============================================
 * Безопасный исполнитель кода, генерируемого Tria.
 * 
 * Поток:
 *  1. Жест записан → отправляется в Tria
 *  2. Tria (+ Gemini Flash 3 при необходимости) генерирует JS-код
 *  3. Код безопасно выполняется в Web Worker
 *  4. Результат мгновенно виден в голограмме и интерфейсе
 *  5. Tria запоминает связь «траектория → код» в LocalTraceDB
 */

import eventBus from './eventBus.js';

export class GestureToCodeExecutor {
    constructor(commandEngine) {
        this.commandEngine = commandEngine;
        this.worker = null;
        this.pendingCallbacks = new Map();
        this.nextId = 1;

        // Code history (for undo/redo)
        this.executionHistory = [];
        this.maxHistorySize = 50;

        this._initWorker();

        console.log('[GestureToCodeExecutor] Initialized.');
    }

    // ─── Web Worker for Safe Execution ────────────────────────────

    _initWorker() {
        // Create an inline Web Worker for sandboxed code execution
        const workerCode = `
            // GestureToCodeExecutor Worker
            // Sandboxed environment for executing Tria-generated code.
            
            self.onmessage = function(e) {
                const { id, code, context } = e.data;
                
                try {
                    // Create a sandboxed function with limited API
                    const safeContext = {
                        Math, JSON, Date,
                        console: {
                            log: (...args) => self.postMessage({ id, type: 'log', data: args.join(' ') }),
                            warn: (...args) => self.postMessage({ id, type: 'warn', data: args.join(' ') }),
                            error: (...args) => self.postMessage({ id, type: 'error', data: args.join(' ') })
                        },
                        emit: (event, data) => self.postMessage({ id, type: 'emit', event, data }),
                        context: context || {}
                    };
                    
                    // Execute the code in sandbox
                    const fn = new Function(
                        ...Object.keys(safeContext),
                        code
                    );
                    const result = fn(...Object.values(safeContext));
                    
                    self.postMessage({ id, type: 'result', data: result });
                } catch (error) {
                    self.postMessage({ id, type: 'error', data: error.message, stack: error.stack });
                }
            };
        `;

        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));

        this.worker.onmessage = (e) => {
            const { id, type, data, event } = e.data;

            switch (type) {
                case 'result': {
                    const callback = this.pendingCallbacks.get(id);
                    if (callback) {
                        callback.resolve(data);
                        this.pendingCallbacks.delete(id);
                    }
                    break;
                }
                case 'error': {
                    const callback = this.pendingCallbacks.get(id);
                    if (callback) {
                        callback.reject(new Error(data));
                        this.pendingCallbacks.delete(id);
                    }
                    console.error('[GestureToCodeExecutor] Worker error:', data);
                    break;
                }
                case 'log':
                    console.log('[Worker]', data);
                    break;
                case 'warn':
                    console.warn('[Worker]', data);
                    break;
                case 'emit':
                    // Forward events from worker to main thread EventBus
                    eventBus.emit(event, data);
                    break;
            }
        };

        this.worker.onerror = (e) => {
            console.error('[GestureToCodeExecutor] Worker fatal error:', e.message);
        };
    }

    // ─── Code Execution ───────────────────────────────────────────

    /**
     * Execute code safely in the Web Worker.
     * @param {string} code - JavaScript code to execute
     * @param {object} context - Context data available to the code
     * @param {number} timeout - Max execution time in ms (default 5000)
     * @returns {Promise<any>} - Execution result
     */
    async execute(code, context = {}, timeout = 5000) {
        if (!this.worker) {
            throw new Error('Worker not initialized');
        }

        const id = this.nextId++;

        return new Promise((resolve, reject) => {
            // Set timeout for execution
            const timer = setTimeout(() => {
                this.pendingCallbacks.delete(id);
                reject(new Error(`Execution timed out after ${timeout}ms`));
            }, timeout);

            this.pendingCallbacks.set(id, {
                resolve: (result) => {
                    clearTimeout(timer);
                    // Log to history
                    this._addToHistory(code, context, result, null);
                    resolve(result);
                },
                reject: (error) => {
                    clearTimeout(timer);
                    this._addToHistory(code, context, null, error.message);
                    reject(error);
                }
            });

            this.worker.postMessage({ id, code, context });
        });
    }

    /**
     * Full pipeline: Tria generates code → execute → return result.
     * @param {string} intent - User intent description (in Russian or English)
     * @param {object} gestureData - The gesture trajectory data
     */
    async processGestureIntent(intent, gestureData = {}) {
        console.log(`[GestureToCodeExecutor] Processing intent: "${intent}"`);

        // For now, emit to Tria and wait for code
        // In future, this will call Gemini Flash 3 API directly
        eventBus.emit('tria:codeRequest', { intent, gestureData });

        // Placeholder: return a simple action
        // Real implementation will await Tria's response
        return {
            status: 'pending',
            message: 'Запрос отправлен в Tria для генерации кода.'
        };
    }

    /**
     * Execute code received from Tria.
     * This is called when Tria responds with generated code.
     */
    async executeTriaCode(code, context = {}) {
        try {
            const result = await this.execute(code, context);
            eventBus.emit('tria:codeExecuted', { code, result });
            console.log('[GestureToCodeExecutor] Tria code executed successfully.');
            return result;
        } catch (error) {
            eventBus.emit('tria:codeError', { code, error: error.message });
            console.error('[GestureToCodeExecutor] Tria code execution failed:', error.message);
            throw error;
        }
    }

    // ─── History (Undo/Redo) ──────────────────────────────────────

    _addToHistory(code, context, result, error) {
        this.executionHistory.push({
            code,
            context,
            result,
            error,
            timestamp: Date.now()
        });

        // Keep history bounded
        if (this.executionHistory.length > this.maxHistorySize) {
            this.executionHistory.shift();
        }
    }

    getHistory() {
        return [...this.executionHistory];
    }

    async undoLast() {
        const last = this.executionHistory.pop();
        if (last) {
            eventBus.emit('tria:codeUndone', last);
            console.log('[GestureToCodeExecutor] Undo last execution.');
        }
        return last;
    }

    // ─── Lifecycle ────────────────────────────────────────────────

    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.pendingCallbacks.clear();
        this.executionHistory = [];
    }
}

export default GestureToCodeExecutor;
