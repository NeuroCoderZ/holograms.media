/**
 * HermaionBridge.js — Мозолистое тело Двойственного Гермеса
 * ==========================================================
 * Один Гермес, два полушария:
 *
 *   Гермес-Эйдос (жестовое) → ChunkProcessor → EmbeddingStream → PredictiveRAG
 *                              ↓ cosine similarity
 *   HermaionBridge (мозолистое тело) → IntentEmbedding → ObolosRewardEngine
 *                              ↓
 *   Гермес-Логос (символьное) → TriaOrchestrator → LLM → Действие
 *                              ↓
 *   gestureIntentClient → WebSocket → Backend
 *
 * Эйдос обрабатывает чанки по 50мс, предсказывает намерение,
 * а Логос выполняет действие. Obolos вознаграждает за качество.
 */

import { createIntentEmbedding } from './IntentEmbedding.js';
import { intentToPrompt, meetsThreshold, getIntentCategory, getXREvent } from './IntentActionMap.js';

export class HermaionBridge {
    constructor({
        eventBus = null,
        triaOrchestrator = null,
        gestureEmbeddingBridge = null,
        gestureIntentClient = null,
        obolosRewardEngine = null,
        emitCooldownMs = 700
    } = {}) {
        this.eventBus = eventBus;
        this.triaOrchestrator = triaOrchestrator;
        this.gestureEmbeddingBridge = gestureEmbeddingBridge;
        this.gestureIntentClient = gestureIntentClient;
        this.obolosRewardEngine = obolosRewardEngine;
        this.emitCooldownMs = emitCooldownMs;
        this.lastIntent = null;
        this._lastEmitAt = 0;
        this._lastIntentKey = '';
        this._stats = { total: 0, filtered: 0, emitted: 0, errors: 0, obolosMinted: 0 };

        // Эйдос: текущие гипотезы предиктивного RAG
        this._progressiveIntent = null;  // накопленное предсказание по чанкам
        this._lastPrediction = null;     // последний результат PredictiveRAG

        console.log('🌉 [HermaionBridge] Initialized',
            '| orchestrator:', !!triaOrchestrator,
            '| embeddingBridge:', !!gestureEmbeddingBridge,
            '| wsClient:', !!gestureIntentClient,
            '| obolosReward:', !!obolosRewardEngine,
            '| cooldown:', emitCooldownMs, 'ms');
    }

    /**
     * Точка входа из GestureSemanticLayer.
     * Принимает семантический результат и прогоняет через весь pipeline.
     */
    async processSemanticIntent(semanticResult, context = {}) {
        if (!semanticResult?.action) return null;
        console.log('🌉 [HermaionBridge] ← SemanticIntent:', semanticResult.action, '| conf:', semanticResult.confidence?.toFixed(2));
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
        this._stats.total++;

        // Проверка дедупликации и cooldown
        if (!intentType || !this._shouldEmit(intentType, confidence)) {
            this._stats.filtered++;
            return this.lastIntent;
        }

        // Проверка минимального confidence из IntentActionMap
        if (!meetsThreshold(intentType, confidence)) {
            this._stats.filtered++;
            console.debug('🌉 [HermaionBridge] ⏭️ Below threshold:', intentType, confidence?.toFixed(2));
            return this.lastIntent;
        }

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

        this._stats.emitted++;

        // ─── Распространение ───────────────────────────────
        console.log(
            `🌉 [HermaionBridge] ✅ EMIT #${this._stats.emitted}`,
            `| ${intentType} [${embedding.category}]`,
            `| conf: ${confidence?.toFixed(2)}`,
            `| seq: ${embedding.sequenceIndex}`,
            `| text: "${embedding.symbolicText?.slice(0, 60)}"`
        );

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
                this._stats.errors++;
                console.warn('🌉 [HermaionBridge] ❌ Orchestrator error:', err.message);
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
            console.log('🌉 [HermaionBridge] 📡 → WebSocket sent:', intentType);
        }

        // 4. Obolos Reward — вознаграждение за качество перехода
        if (this.obolosRewardEngine) {
            try {
                const scoring = this.obolosRewardEngine.scoreTransition(
                    this._lastPrediction,
                    { intentType, orchestratorHandled: !!this.triaOrchestrator, wsDelivered: !!this.gestureIntentClient }
                );
                const reward = this.obolosRewardEngine.mintObolos(scoring);
                if (reward.amount > 0) {
                    this._stats.obolosMinted += reward.amount;
                    this.eventBus?.emit?.('hermaion:obolosMinted', reward);
                    console.log(`🌉 💰 Obolos +${reward.amount.toFixed(4)} [${reward.reason}]`);
                }
            } catch (rewardErr) {
                console.warn('🌉 [ObolosReward] Error:', rewardErr.message);
            }
        }

        return embedding;
    }

    // ─── Эйдос: приём чанков от PredictiveRAG ────────

    /**
     * Приём предсказания от PredictiveRAG (вызывается каждые 50мс).
     * Накапливает гипотезы и при высоком confidence → автоматически emit.
     */
    onPredictiveResult(ragResult) {
        if (!ragResult?.predictions?.length) return;

        this._lastPrediction = ragResult;
        const top = ragResult.predictions[0];

        // Progressive: при confidence >= 0.8 и consensus → автоматический emit
        if (ragResult.confidence >= 0.8 && ragResult.consensusIntent) {
            console.log(`🌉 🔮 Predictive EMIT: ${ragResult.consensusIntent} (conf: ${ragResult.confidence.toFixed(2)}, chunk #${ragResult.chunkIndex})`);
            this.processSemanticIntent({
                action: ragResult.consensusIntent,
                confidence: ragResult.confidence,
                intensity: ragResult.confidence,
                xr_event: getXREvent(ragResult.consensusIntent),
                raw_score: top.score
            }, { predictive: true, chunkIndex: ragResult.chunkIndex });
        }
    }

    _shouldEmit(intentType, confidence = 0) {
        const key = this._intentKey(intentType, confidence);
        return key !== this._lastIntentKey || Date.now() - this._lastEmitAt >= this.emitCooldownMs;
    }

    _intentKey(intentType, confidence) {
        return `${intentType}:${Math.round((confidence || 0) * 10)}`;
    }
    // ─── Диагностика ───────────────────────────────────

    diagnostic() {
        const info = {
            stats: { ...this._stats },
            lastIntent: this.lastIntent ? {
                type: this.lastIntent.intentType,
                confidence: this.lastIntent.confidence,
                category: this.lastIntent.category,
                sessionId: this.lastIntent.sessionId,
                sequenceIndex: this.lastIntent.sequenceIndex,
                text: this.lastIntent.symbolicText
            } : null,
            connections: {
                eventBus: !!this.eventBus,
                orchestrator: !!this.triaOrchestrator,
                embeddingBridge: !!this.gestureEmbeddingBridge,
                wsClient: !!this.gestureIntentClient,
                obolosReward: !!this.obolosRewardEngine
            },
            obolosStats: this.obolosRewardEngine?.stats || null,
            lastPrediction: this._lastPrediction ? {
                top: this._lastPrediction.predictions?.[0],
                confidence: this._lastPrediction.confidence,
                consensus: this._lastPrediction.consensusIntent
            } : null
        };
        console.table(info.stats);
        console.log('🌉 [HermaionBridge] Diagnostic:', info);
        if (this.obolosRewardEngine) this.obolosRewardEngine.diagnostic();
        return info;
    }

    /**
     * Ручной тест — вызов из консоли браузера:
     *   window.testHermaionBridge()
     * или:
     *   window.testHermaionBridge('grab', 0.9)
     */
    static async selfTest(bridge, action = 'select', confidence = 0.85) {
        console.log('🌉 ══════════════════════════════════════');
        console.log('🌉 [HermaionBridge] 🧪 SELF-TEST START');
        console.log(`🌉 Action: ${action} | Confidence: ${confidence}`);
        console.log('🌉 ══════════════════════════════════════');

        if (!bridge) {
            console.error('🌉 ❌ Bridge не инициализирован! state.hermaionBridge = null');
            return null;
        }

        // Симулируем результат от GestureSemanticLayer
        const fakeSemanticResult = {
            action,
            confidence,
            intensity: confidence,
            xr_event: `on${action.charAt(0).toUpperCase() + action.slice(1)}`,
            raw_score: confidence
        };

        const result = await bridge.processSemanticIntent(fakeSemanticResult, {
            testMode: true,
            gestureDNA: null
        });

        if (result) {
            console.log('🌉 ✅ TEST PASSED! IntentEmbedding created:');
            console.log('🌉   intentType:', result.intentType);
            console.log('🌉   confidence:', result.confidence);
            console.log('🌉   category:', result.category);
            console.log('🌉   sessionId:', result.sessionId);
            console.log('🌉   symbolicText:', result.symbolicText);
            console.log('🌉   xrEvent:', result.xrEvent);
        } else {
            console.warn('🌉 ⚠️ TEST: No embedding returned (filtered by threshold or cooldown)');
        }

        console.log('🌉 ══════════════════════════════════════');
        bridge.diagnostic();
        return result;
    }
}

export default HermaionBridge;
