/**
 * HermaionBridge.js — Мост между жестовым и символьным миром
 * ==========================================================
 * Архитектура «мозолистого тела»:
 *
 *   [Жест] → GestureEmbeddingBridge (KNN+Cloud) → IntentEmbedding → symbolicText
 *         → eventBus('hermaion:intentReady')
 *         → triaOrchestrator.handleIntent()
 *         → gestureIntentClient.sendIntent() → WebSocket → Backend
 *         → eventBus('hermaion:resultReady') ← обратная связь
 *
 * Зависимости:
 *   - IntentEmbedding.js   — создание структурированного интента
 *   - IntentActionMap.js   — жест→символьный текст + threshold
 *   - GestureEmbeddingBridge.js — двухслойный KNN+Cloud pipeline (опционально)
 *   - gestureIntentClient.js — WebSocket к бэкенду (опционально)
 */

import { createIntentEmbedding } from './IntentEmbedding.js';
import { intentToPrompt, meetsThreshold, getIntentCategory, getXREvent } from './IntentActionMap.js';

export class HermaionBridge {
    constructor({
        eventBus = null,
        triaOrchestrator = null,
        gestureEmbeddingBridge = null,
        gestureIntentClient = null,
        emitCooldownMs = 700
    } = {}) {
        this.eventBus = eventBus;
        this.triaOrchestrator = triaOrchestrator;
        this.gestureEmbeddingBridge = gestureEmbeddingBridge;
        this.gestureIntentClient = gestureIntentClient;
        this.emitCooldownMs = emitCooldownMs;
        this.lastIntent = null;
        this._lastEmitAt = 0;
        this._lastIntentKey = '';
    }

    /**
     * Точка входа из GestureSemanticLayer.
     * Принимает семантический результат и прогоняет через весь pipeline.
     */
    async processSemanticIntent(semanticResult, context = {}) {
        if (!semanticResult?.action) return null;
        return this.onGestureReady(
            context.gestureDNA || null,
            semanticResult.action,
            semanticResult.confidence,
            {
                ...context,
                semantic: semanticResult,
                intensity: semanticResult.intensity ?? semanticResult.raw_score ?? semanticResult.confidence,
                xrEvent: semanticResult.xr_event || getXREvent(semanticResult.action),
                rawScore: semanticResult.raw_score || 0
            }
        );
    }

    /**
     * Альтернативная точка входа: из GestureEmbeddingBridge (KNN/Cloud).
     * Вызывается напрямую, если двухслойное распознавание включено.
     * @param {Array} hand21 — 21 MediaPipe landmark
     * @param {Object} context — дополнительный контекст
     */
    async processFromEmbeddingBridge(hand21, context = {}) {
        if (!this.gestureEmbeddingBridge) return null;

        const result = await this.gestureEmbeddingBridge.recognize(hand21, context);
        if (!result) return null;

        return this.onGestureReady(
            context.gestureDNA || null,
            result.intent,
            result.confidence,
            {
                ...context,
                embeddingSource: result.source,
                latency: result.latency,
                embeddingMetadata: result.metadata,
                intensity: result.confidence
            }
        );
    }

    /**
     * Главный обработчик: создаёт IntentEmbedding и распространяет его.
     */
    async onGestureReady(gestureDNAVector, intentType, confidence, metadata = {}) {
        // Проверка дедупликации и cooldown
        if (!intentType || !this._shouldEmit(intentType, confidence)) return this.lastIntent;

        // Проверка минимального confidence из IntentActionMap
        if (!meetsThreshold(intentType, confidence)) return this.lastIntent;

        // Создание IntentEmbedding
        const embedding = createIntentEmbedding({
            intentType,
            confidence,
            intensity: metadata.intensity,
            semantic: metadata.semantic || null,
            gestureDNA: gestureDNAVector,
            rawIntent: metadata.rawIntent || null,
            predictedIntent: metadata.predictedIntent || null,
            gestureFlat: metadata.gestureFlat || null,
            userId: metadata.userId || null,
            metadata
        });

        // Символьный текст — перевод жеста в мир слов
        embedding.symbolicText = intentToPrompt(embedding);
        embedding.category = getIntentCategory(intentType);
        embedding.xrEvent = metadata.xrEvent || getXREvent(intentType);

        // Обновление состояния
        this.lastIntent = embedding;
        this._lastEmitAt = Date.now();
        this._lastIntentKey = this._intentKey(intentType, confidence);

        // ─── Распространение ───────────────────────────────

        // 1. EventBus → UI и другие компоненты
        this.eventBus?.emit?.('hermaion:intentReady', embedding);

        // 2. Tria Orchestrator → LLM обработка
        if (this.triaOrchestrator?.handleIntent) {
            try {
                const result = await this.triaOrchestrator.handleIntent(embedding, {
                    source: 'hermaion_bridge',
                    embedding
                });
                // Обратная связь в UI
                this.eventBus?.emit?.('hermaion:resultReady', {
                    embedding,
                    result,
                    status: 'success'
                });
            } catch (err) {
                console.warn('[HermaionBridge] Orchestrator error:', err.message);
                this.eventBus?.emit?.('hermaion:resultReady', {
                    embedding,
                    result: null,
                    status: 'error',
                    error: err.message
                });
            }
        }

        // 3. WebSocket → Backend (gesture_intent_service)
        if (this.gestureIntentClient) {
            this.gestureIntentClient.sendIntent(intentType, {
                confidence,
                sessionId: embedding.sessionId,
                sequenceIndex: embedding.sequenceIndex,
                category: embedding.category,
                symbolicText: embedding.symbolicText,
                source: embedding.source
            });
        }

        return embedding;
    }

    _shouldEmit(intentType, confidence = 0) {
        const key = this._intentKey(intentType, confidence);
        return key !== this._lastIntentKey || Date.now() - this._lastEmitAt >= this.emitCooldownMs;
    }

    _intentKey(intentType, confidence) {
        return `${intentType}:${Math.round((confidence || 0) * 10)}`;
    }
}

export default HermaionBridge;

