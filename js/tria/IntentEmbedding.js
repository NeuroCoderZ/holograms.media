export const HERMAION_INTENT_KIND = 'hermaion.intent_embedding.v1';

// Глобальный счётчик для sequenceIndex в пределах сессии
let _sequenceCounter = 0;
let _currentSessionId = null;

function clamp01(value) {
    const n = Number(value);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0;
}

function asArray(value) {
    return value ? Array.from(value) : null;
}

/**
 * Генерирует или возвращает текущий sessionId.
 * Сессия сбрасывается при вызове resetSession().
 */
export function getSessionId() {
    if (!_currentSessionId) {
        _currentSessionId = `ses_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        _sequenceCounter = 0;
    }
    return _currentSessionId;
}

export function resetSession() {
    _currentSessionId = null;
    _sequenceCounter = 0;
}

export function createIntentEmbedding({
    intentType = 'unknown',
    confidence = 0,
    intensity = confidence,
    semantic = null,
    gestureDNA = null,
    rawIntent = null,
    predictedIntent = null,
    gestureFlat = null,
    userId = null,
    sessionId = null,
    metadata = {}
} = {}) {
    const sid = sessionId || getSessionId();
    const seqIdx = _sequenceCounter++;

    const embedding = {
        kind: HERMAION_INTENT_KIND,
        source: 'hermaion_bridge',
        intentType: intentType || 'unknown',
        confidence: clamp01(confidence),
        intensity: clamp01(intensity),
        sessionId: sid,
        sequenceIndex: seqIdx,
        semantic,
        gestureDNA: asArray(gestureDNA),
        rawIntent: asArray(rawIntent),
        predictedIntent: asArray(predictedIntent),
        gestureFlat: asArray(gestureFlat),
        userId,
        metadata,
        timestamp: Date.now()
    };

    embedding.symbolicText = `gesture intent: ${embedding.intentType}; confidence: ${embedding.confidence.toFixed(2)}; seq: ${seqIdx}`;
    return embedding;
}

