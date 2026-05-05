// js/services/hermesService.js
const HERMES_WORKER_URL = 'https://hermes.neuroescrow.workers.dev';

export async function sendHermesMessage(message, sessionId = null, onChunk = null) {
  try {
    const response = await fetch(`${HERMES_WORKER_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId })
    });

    if (!response.ok) throw new Error(`Hermes error: ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;
      if (onChunk) onChunk(chunk);
    }

    return fullText;
  } catch (error) {
    console.error('[Hermes] Error:', error);
    throw error;
  }
}

export async function loadHermesSessions() {
  try {
    const response = await fetch(`${HERMES_WORKER_URL}/sessions`);
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('[Hermes] Load sessions error:', error);
    return [];
  }
}

export async function loadHermesSession(sessionId) {
  try {
    const response = await fetch(`${HERMES_WORKER_URL}/session/${sessionId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('[Hermes] Load session error:', error);
    return null;
  }
}

export async function createHermesSession(title = 'New Chat') {
  try {
    const response = await fetch(`${HERMES_WORKER_URL}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    });
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('[Hermes] Create session error:', error);
    return null;
  }
}

export async function clearHermesSession(sessionId) {
  try {
    const response = await fetch(`${HERMES_WORKER_URL}/session/${sessionId}`, {
      method: 'DELETE'
    });
    return response.ok;
  } catch (error) {
    console.error('[Hermes] Clear session error:', error);
    return false;
  }
}
