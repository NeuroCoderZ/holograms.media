// js/tria/HermaionBridge.js

import { createIntentEmbedding } from './IntentEmbedding.js';
import { intentToPrompt } from './IntentActionMap.js';

/**
 * HermaionBridge — мост между жестовым (Эйдос) и символьным (Логос) мирами.
 * 
 * Это тонкий адаптер, который:
 * 1. Принимает уже распознанный жест от GestureSemanticLayer
 * 2. Заворачивает его в IntentEmbedding
 * 3. Передаёт в TriaOrchestrator
 */
export class HermaionBridge {
  constructor({ 
    eventBus = null, 
    triaOrchestrator = null, 
    emitCooldownMs = 700 
  } = {}) {
    this.eventBus = eventBus;
    this.triaOrchestrator = triaOrchestrator;
    this.emitCooldownMs = emitCooldownMs;
    
    this.lastIntent = null;
    this._lastEmitAt = 0;
    this._lastIntentKey = '';
    this._isDev = this._checkDevMode();
  }

  /**
   * Главный метод: обрабатывает распознанный жест
   * 
   * @param {Object} semanticResult - результат от GestureSemanticLayer
   * @param {Object} context - дополнительный контекст (gestureDNA, rawIntent и т.д.)
   * @returns {Object|null} IntentEmbedding или null
   */
  async processSemanticIntent(semanticResult, context = {}) {
    if (!semanticResult?.action) {
      return null;
    }

    const intentType = semanticResult.action;
    const confidence = semanticResult.confidence || 0;

    // Проверка cooldown (не спамить одинаковыми интентами)
    if (!this._shouldEmit(intentType, confidence)) {
      return this.lastIntent;
    }

    // Создаём IntentEmbedding
    const embedding = createIntentEmbedding({
      intentType,
      confidence,
      intensity: semanticResult.intensity ?? semanticResult.raw_score ?? confidence,
      semantic: semanticResult,
      gestureDNA: context.gestureDNA || null,
      rawIntent: context.rawIntent || null,
      predictedIntent: context.predictedIntent || null,
      gestureFlat: context.gestureFlat || null,
      userId: context.userId || null,
      metadata: {
        xrEvent: semanticResult.xr_event || null,
        rawScore: semanticResult.raw_score || 0,
        ...context
      }
    });

    // Добавляем текстовое представление для LLM
    embedding.symbolicText = intentToPrompt(embedding);

    // Сохраняем
    this.lastIntent = embedding;
    this._lastEmitAt = Date.now();
    this._lastIntentKey = this._intentKey(intentType, confidence);

    // Эмитим событие (если есть eventBus)
    if (this.eventBus?.emit) {
      this.eventBus.emit('hermaion:intentReady', embedding);
    }

    // Передаём в TriaOrchestrator (с защитой от отсутствия)
    if (this.triaOrchestrator?.handleIntent) {
      try {
        await this.triaOrchestrator.handleIntent(embedding, {
          source: 'hermaion_bridge',
          embedding
        });
      } catch (error) {
        if (this._isDev) {
          console.error('[HermaionBridge] Error in TriaOrchestrator.handleIntent:', error);
        }
      }
    }

    // Логирование только в dev-режиме
    if (this._isDev) {
      console.log('[HermaionBridge] Intent ready:', intentType, confidence.toFixed(2));
    }

    return embedding;
  }

  /**
   * Проверка cooldown: не эмитить одинаковые интенты слишком часто
   */
  _shouldEmit(intentType, confidence = 0) {
    const key = this._intentKey(intentType, confidence);
    return key !== this._lastIntentKey || 
           Date.now() - this._lastEmitAt >= this.emitCooldownMs;
  }

  /**
   * Ключ для сравнения интентов (тип + округлённая уверенность)
   */
  _intentKey(intentType, confidence) {
    return `${intentType}:${Math.round((confidence || 0) * 10)}`;
  }

  /**
   * Определяет, запущен ли проект в dev-режиме
   */
  _checkDevMode() {
    // Проверка через import.meta.env (Vite)
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return import.meta.env.DEV === true || import.meta.env.MODE === 'development';
    }
    
    // Проверка через hostname (localhost или 127.0.0.1)
    if (typeof window !== 'undefined' && window.location) {
      const hostname = window.location.hostname;
      return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
    }
    
    return false;
  }
}

export default HermaionBridge;
