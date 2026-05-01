/**
 * IntentActionMap.js — Карта жест → символьное действие
 * =====================================================
 * Категории: spatial (пространственные), code (нейрокодинг),
 *            ui (интерфейс), audio (звук), meta (системные).
 *
 * Связь с AtomicGestureClassifier: OPEN_PALM, FIST, POINTING_UP, VICTORY
 * Связь с GestureSemanticLayer: select, grab, release, navigate, scale
 */

const INTENT_ACTION_MAP = {
    // ─── Spatial (пространственные) ──────────────────
    select:       { prompt: 'Select the current holographic target.',       category: 'spatial', minConfidence: 0.70, xr_event: 'onSelectStart' },
    grab:         { prompt: 'Grab the current spatial target.',             category: 'spatial', minConfidence: 0.80, xr_event: 'onGrabStart' },
    release:      { prompt: 'Release the current spatial target.',          category: 'spatial', minConfidence: 0.65, xr_event: 'onSelectEnd' },
    navigate:     { prompt: 'Navigate the holographic space.',              category: 'spatial', minConfidence: 0.70, xr_event: 'onNavigate' },
    scale:        { prompt: 'Scale the active holographic object.',         category: 'spatial', minConfidence: 0.75, xr_event: 'onScale' },
    rotate:       { prompt: 'Rotate the active holographic object.',        category: 'spatial', minConfidence: 0.75, xr_event: 'onRotate' },

    // ─── Atomic Gestures (from AtomicGestureClassifier) ──
    open_palm:    { prompt: 'Open palm detected — ready for interaction.',  category: 'meta',    minConfidence: 0.85, xr_event: 'onOpenPalm' },
    fist:         { prompt: 'Fist detected — confirm or grab action.',      category: 'spatial', minConfidence: 0.85, xr_event: 'onFist' },
    pointing_up:  { prompt: 'Pointing up — select or indicate direction.',  category: 'ui',      minConfidence: 0.80, xr_event: 'onPoint' },
    victory:      { prompt: 'Victory sign — confirm or toggle mode.',       category: 'meta',    minConfidence: 0.80, xr_event: 'onVictory' },

    // ─── UI (интерфейс) ──────────────────────────────
    pinch:        { prompt: 'Pinch gesture — fine selection or zoom.',      category: 'ui',      minConfidence: 0.75, xr_event: 'onPinch' },
    swipe:        { prompt: 'Swipe gesture — navigate between views.',      category: 'ui',      minConfidence: 0.70, xr_event: 'onSwipe' },

    // ─── Audio (звук) ────────────────────────────────
    audio_mute:   { prompt: 'Mute audio output.',                          category: 'audio',   minConfidence: 0.80, xr_event: 'onAudioMute' },
    audio_play:   { prompt: 'Start audio playback.',                       category: 'audio',   minConfidence: 0.80, xr_event: 'onAudioPlay' },
};

/**
 * Проверяет, достаточен ли confidence для данного типа intent.
 * @param {string} intentType
 * @param {number} confidence
 * @returns {boolean}
 */
export function meetsThreshold(intentType, confidence) {
    const entry = INTENT_ACTION_MAP[intentType];
    if (!entry) return confidence >= 0.70; // default threshold
    return confidence >= entry.minConfidence;
}

/**
 * Генерирует символьный текст (prompt) из IntentEmbedding.
 * Это "мозолистое тело" — перевод жеста в символьный мир.
 * @param {Object} embedding - IntentEmbedding object
 * @returns {string}
 */
export function intentToPrompt(embedding) {
    const entry = INTENT_ACTION_MAP[embedding?.intentType];
    const text = entry?.prompt
        || `Handle gesture intent "${embedding?.intentType || 'unknown'}".`;
    const confidence = Number.isFinite(embedding?.confidence)
        ? ` Confidence: ${embedding.confidence.toFixed(2)}.`
        : '';
    const category = entry?.category ? ` [${entry.category}]` : '';
    return `${text}${confidence}${category}`;
}

/**
 * Возвращает категорию intent'a.
 * @param {string} intentType
 * @returns {string}
 */
export function getIntentCategory(intentType) {
    return INTENT_ACTION_MAP[intentType]?.category || 'unknown';
}

/**
 * Возвращает XR event name для intent'a.
 * @param {string} intentType
 * @returns {string|null}
 */
export function getXREvent(intentType) {
    return INTENT_ACTION_MAP[intentType]?.xr_event || null;
}

export { INTENT_ACTION_MAP };
