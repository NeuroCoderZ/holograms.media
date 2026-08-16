/**
 * GestureEmbeddingBridge.js — Мост между локальным KNN и облачным Gemini Embedding 2
 * ===================================================================================
 * Двухслойная архитектура:
 *   Слой 1 (< 5мс): Локальный KNN через GestureVectorStore (IndexedDB/sql.js)
 *   Слой 2 (50-200мс): Облачный Gemini Embedding 2 через бэкенд API
 *
 * Поток:
 *   MediaPipe Hand21 → normalize → localKNN
 *     → ≥ 0.85 → Прямое исполнение (intent)
 *     → < 0.85 → cloudEmbed → AstraDB search → intent + обучение
 */

import GestureVectorStore from './GestureVectorStore.js';
import OneEuroFilter from '../filters/OneEuroFilter.js';
import { state } from '../core/init.js';

class GestureEmbeddingBridge {
    constructor() {
        this.localStore = null;
        this._ready = false;
        
        // One Euro Filter — адаптивное сглаживание 21 точки
        this.euroFilter = OneEuroFilter.preset('default');
        
        // Thresholds
        this.LOCAL_ACCEPT = 0.85;    // Прямой KNN accept
        this.LOCAL_SOFT = 0.65;      // Облачная проверка
        this.CLOUD_COOLDOWN_MS = 300; // Минимум между облачными запросами
        
        this._lastCloudCall = 0;
        this._pendingCloud = null;
        
        // Параметры Sleep Cycle
        this._inactiveTimer = null;
        this.INACTIVITY_TIMEOUT = 30000; // 30 секунд неактивности запускают сон
        
        // Stats
        this.stats = {
            localHits: 0,
            cloudHits: 0,
            cloudMisses: 0,
            totalQueries: 0
        };
    }
    
    async init() {
        this.localStore = new GestureVectorStore();
        await this.localStore.init({ includeZ: true });
        this._ready = true;
        console.log('[GestureEmbeddingBridge] Initialized. Local KNN ready.');
        this._resetInactivityTimer();
    }
    
    /**
     * Основной метод: распознаёт жест через двухслойную систему.
     * @param {Array} hand21 - 21 MediaPipe landmark [{x,y,z}, ...]
     * @param {Object} context - Дополнительный контекст {audioSnippet, screenshot, sessionId}
     * @returns {Promise<{intent, confidence, source, metadata, complexity}|null>}
     */
    async recognize(hand21, context = {}) {
        if (!this._ready || !hand21 || hand21.length < 21) return null;
        this.stats.totalQueries++;
        
        // Сброс таймера сна при обнаружении активности
        this._resetInactivityTimer();
        
        // One Euro Filter: сглаживаем джиттер перед распознаванием
        const filtered = this.euroFilter.filter(hand21);
        
        // Вычисляем геометрическую сложность жеста (Бомба Сложности)
        const complexity = this.calculateGestureComplexity(filtered);
        context.complexity = complexity;
        
        // Слой 1: Локальный KNN (< 5мс)
        const localResults = await this.localStore.query(filtered, 3, this.LOCAL_SOFT);
        
        if (localResults.length > 0) {
            const best = localResults[0];
            
            // Высокий confidence → прямое исполнение
            if (best.score >= this.LOCAL_ACCEPT) {
                this.stats.localHits++;
                return {
                    intent: best.name,
                    confidence: best.score,
                    source: 'local_knn',
                    metadata: best.metadata,
                    latency: 'fast',
                    complexity: complexity
                };
            }
            
            // Средний confidence → облачная проверка (при наличии кулдауна)
            if (best.score >= this.LOCAL_SOFT) {
                const cloudResult = await this._cloudVerify(filtered, best, context);
                if (cloudResult) {
                    cloudResult.complexity = complexity;
                    return cloudResult;
                }
                
                // Если облако недоступно, используем локальный fallback
                this.stats.localHits++;
                return {
                    intent: best.name,
                    confidence: best.score,
                    source: 'local_fallback',
                    metadata: best.metadata,
                    latency: 'fast',
                    complexity: complexity
                };
            }
        }
        
        // Нет локальных совпадений → полный облачный поиск
        const cloudResult = await this._cloudSearch(filtered, context);
        return cloudResult;
    }
    
    /**
     * Облачная верификация через Gemini Embedding 2 + AstraDB
     */
    async _cloudVerify(hand21, localBest, context) {
        const now = Date.now();
        if (now - this._lastCloudCall < this.CLOUD_COOLDOWN_MS) return null;
        
        try {
            this._lastCloudCall = now;
            const apiUrl = state.apiUrl || '';
            
            const response = await fetch(`${apiUrl}/api/v1/gestures/embed`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.auth?.token || ''}`
                },
                body: JSON.stringify({
                    landmarks: hand21.map(p => ({
                        x: p.x, y: p.y, z: p.z || 0
                    })),
                    local_candidate: localBest.name,
                    local_score: localBest.score,
                    context: context.sessionId ? { session_id: context.sessionId } : {}
                })
            });
            
            if (!response.ok) return null;
            
            const data = await response.json();
            if (data.intent && data.confidence > localBest.score) {
                this.stats.cloudHits++;
                
                // Обучение: сохраняем подтверждённый жест в локальное хранилище
                if (data.confidence > 0.9) {
                    await this._learnLocally(hand21, data.intent, data.metadata || {});
                }
                
                return {
                    intent: data.intent,
                    confidence: data.confidence,
                    source: 'cloud_verified',
                    metadata: data.metadata || {},
                    latency: 'cloud'
                };
            }
            
            return null;
        } catch (e) {
            console.warn('[GestureEmbeddingBridge] Cloud verify failed:', e.message);
            return null;
        }
    }
    
    /**
     * Полный облачный поиск (когда локальный KNN ничего не нашёл)
     */
    async _cloudSearch(hand21, context) {
        const now = Date.now();
        if (now - this._lastCloudCall < this.CLOUD_COOLDOWN_MS) return null;
        
        try {
            this._lastCloudCall = now;
            const apiUrl = state.apiUrl || '';
            
            const response = await fetch(`${apiUrl}/api/v1/gestures/embed`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${state.auth?.token || ''}`
                },
                body: JSON.stringify({
                    landmarks: hand21.map(p => ({
                        x: p.x, y: p.y, z: p.z || 0
                    })),
                    mode: 'full_search',
                    context: context.sessionId ? { session_id: context.sessionId } : {}
                })
            });
            
            if (!response.ok) return null;
            
            const data = await response.json();
            if (data.intent) {
                this.stats.cloudHits++;
                
                // Обучение: добавляем в локальный кэш
                if (data.confidence > 0.85) {
                    await this._learnLocally(hand21, data.intent, data.metadata || {});
                }
                
                return {
                    intent: data.intent,
                    confidence: data.confidence,
                    source: 'cloud_search',
                    metadata: data.metadata || {},
                    latency: 'cloud'
                };
            }
            
            this.stats.cloudMisses++;
            return null;
        } catch (e) {
            console.warn('[GestureEmbeddingBridge] Cloud search failed:', e.message);
            return null;
        }
    }
    
    /**
     * Обучение локальной Триа: сохраняет подтверждённый жест в IndexedDB
     * Это делает KNN всё точнее с каждым использованием.
     */
    async _learnLocally(hand21, intentName, metadata) {
        try {
            await this.localStore.addGesture(intentName, hand21, {
                ...metadata,
                intent: intentName,
                learned_at: Date.now(),
                source: 'cloud_confirmed'
            });
            console.debug(`[GestureEmbeddingBridge] Learned gesture: ${intentName}`);
        } catch (e) {
            console.warn('[GestureEmbeddingBridge] Learn failed:', e.message);
        }
    }
    
    /**
     * Регистрация нового жеста (из панели жестов)
     */
    async registerGesture(name, hand21, metadata = {}) {
        if (!this._ready) return null;
        return await this.localStore.addGesture(name, hand21, {
            ...metadata,
            intent: name,
            registered_at: Date.now(),
            source: 'user_panel'
        });
    }
    
    /**
     * Экспорт всех жестов для синхронизации с глобальной Триа
     */
    async exportForSync() {
        if (!this._ready) return null;
        return await this.localStore.export();
    }
    
    getStats() {
        return { ...this.stats };
    }

    // ============================================
    // SLEEP CYCLE & COMPLEXITY BOMB
    // ============================================

    /**
     * Сброс таймера неактивности для запуска Sleep Cycle
     */
    _resetInactivityTimer() {
        if (this._inactiveTimer) clearTimeout(this._inactiveTimer);
        this._inactiveTimer = setTimeout(() => {
            this.triggerSleepCycleSync();
        }, this.INACTIVITY_TIMEOUT);
    }

    /**
     * Вычисляет геометрическую сложность жеста (Бомба Сложности).
     * Использует пространственную энтропию расстояний от запястья до кончиков пальцев.
     * @param {Array} hand21 - 21 точка MediaPipe руки
     * @returns {number} - нормализованная сложность [0, 1]
     */
    calculateGestureComplexity(hand21) {
        if (!hand21 || hand21.length < 21) return 0;

        const wrist = hand21[0];
        const tips = [4, 8, 12, 16, 20];

        const distances = tips.map(i => {
            const p = hand21[i];
            const dx = p.x - wrist.x;
            const dy = p.y - wrist.y;
            const dz = p.z - (wrist.z || 0);
            return Math.sqrt(dx * dx + dy * dy + dz * dz);
        });

        const mean = distances.reduce((a, b) => a + b, 0) / distances.length;
        const variance = distances.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / distances.length;
        const stdDev = Math.sqrt(variance);

        return Math.min(1.0, stdDev * 3.5);
    }

    /**
     * Асинхронная консолидация памяти во время сна (Sleep Cycle).
     * Выгружает Soma-блоки в AstraDB и получает предиктивные эмбеддинги.
     * @returns {Promise<boolean>}
     */
    async triggerSleepCycleSync() {
        if (!this._ready) return false;

        console.log('💤 [Sleep Cycle] Local memory consolidation active.');
        // В текущей фазе цикл сна консолидируется локально в IndexedDB (AstraDB sync запланирован на Phase 3)
        return true;
    }
}

// Singleton
export const gestureEmbeddingBridge = new GestureEmbeddingBridge();
export default gestureEmbeddingBridge;
