// js/tria/IntentActionMap.js

/**
 * Декларативное сопоставление типов интентов и их текстовых описаний
 */

const INTENT_ACTION_MAP = {
  select: 'Select the current holographic target.',
  grab: 'Grab the current spatial target.',
  release: 'Release the current spatial target.',
  navigate: 'Navigate the holographic space.',
  scale: 'Scale the active holographic object.',
  confirm: 'Confirm the current action.',
  cancel: 'Cancel the current action.'
};

/**
 * Преобразует IntentEmbedding в текстовый промпт для LLM
 */
export function intentToPrompt(embedding) {
  const text = INTENT_ACTION_MAP[embedding?.intentType] 
    || `Handle gesture intent "${embedding?.intentType || 'unknown'}".`;
  
  const confidence = Number.isFinite(embedding?.confidence)
    ? ` Confidence: ${embedding.confidence.toFixed(2)}.`
    : '';
  
  return `${text}${confidence}`;
}

export { INTENT_ACTION_MAP };
