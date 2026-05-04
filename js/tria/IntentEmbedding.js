// js/tria/IntentEmbedding.js

/**
 * Формат IntentEmbedding — унифицированное представление жестового намерения
 * для передачи между жестовым и символьным мирами.
 */

export const HERMAION_INTENT_KIND = 'hermaion.intent_embedding.v1';

/**
 * Создаёт объект IntentEmbedding из распознанного жеста
 */
export function createIntentEmbedding({
  intentType = 'unknown',
  confidence = 0,
  intensity = null,
  semantic = null,
  gestureDNA = null,
  rawIntent = null,
  predictedIntent = null,
  gestureFlat = null,
  userId = null,
  metadata = {}
} = {}) {
  return {
    kind: HERMAION_INTENT_KIND,
    source: 'hermaion_bridge',
    
    // Основные поля
    intentType: intentType || 'unknown',
    confidence: clamp01(confidence),
    intensity: clamp01(intensity ?? confidence),
    
    // Контекст жеста
    semantic,
    gestureDNA: asArray(gestureDNA),
    rawIntent: asArray(rawIntent),
    predictedIntent: asArray(predictedIntent),
    gestureFlat: asArray(gestureFlat),
    
    // Метаданные
    userId,
    metadata,
    timestamp: Date.now(),
    
    // Символьное представление (для логов и LLM)
    symbolicText: buildSymbolicText(intentType, confidence)
  };
}

// Внутренние вспомогательные функции
function clamp01(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function asArray(value) {
  return value ? Array.from(value) : null;
}

function buildSymbolicText(intentType, confidence) {
  return `gesture intent: ${intentType}; confidence: ${confidence.toFixed(2)}`;
}
