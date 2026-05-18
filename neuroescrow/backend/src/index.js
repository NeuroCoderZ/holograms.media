/**
 * Hermes Worker - JavaScript Edition
 * Cloudflare Workers entry point
 * KV sessions implemented — A2 Phase
 */

import { HermesAgent } from './hermes.js';
import { HermesRAG } from './rag.js';
import { handleTelegramUpdate } from './telegram.js';

const SESSION_TTL = 86400; // 24 hours
const SESSION_PREFIX = 'session:';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check
      if (url.pathname === '/health') {
        const rag = new HermesRAG(env.CACHE, env);
        const stats = await rag.getStats();

        return new Response(JSON.stringify({
          status: 'healthy',
          service: 'hermes-neuroescrow',
          version: '2.0.0',
          embedding_model: 'gemini-embedding-2-preview',
          embedding_dim: 3072,
          stats
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Chat endpoint
      if (url.pathname === '/chat' && request.method === 'POST') {
        let data;
        const contentType = request.headers.get('content-type') || '';
        try {
          if (contentType.includes('application/json')) {
            data = await request.json();
          } else {
            const raw = await request.text();
            data = JSON.parse(raw);
          }
        } catch (e) {
          return new Response(JSON.stringify({ error: 'Invalid JSON', details: e.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!data || typeof data.message !== 'string') {
          return new Response(JSON.stringify({ error: 'message field required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { message, user_id = 'anonymous', session_id = 'default', persona = 'hermes', use_router = false } = data;

        const hermes = new HermesAgent(env.CACHE, env);
        const result = await hermes.chat(message, user_id, session_id, persona, null, true, true, use_router);

        // Persist session to KV (fire-and-forget)
        ctx.waitUntil(saveSession(env, session_id, hermes.getSessionHistory(session_id)));

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Chat streaming endpoint (SSE)
      if (url.pathname === '/chat/stream' && request.method === 'POST') {
        let data;
        try {
          data = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (!data || typeof data.message !== 'string') {
          return new Response(JSON.stringify({ error: 'message field required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { message, user_id = 'anonymous', session_id = 'default', persona = 'hermes' } = data;
        const hermes = new HermesAgent(env.CACHE, env);

        // Stream response via SSE
        const stream = new ReadableStream({
          async start(controller) {
            try {
              const result = await hermes.chat(message, user_id, session_id, persona, null, true, true);
              const text = result.response || '';
              
              // Send character by character
              for (let i = 0; i < text.length; i++) {
                controller.enqueue(`data: ${JSON.stringify({ char: text[i], index: i, done: false })}\n\n`);
              }
              
              // Send contract fields in final event if extracted
              const finalEvent = { done: true, session_id };
              if (result.contract_fields) {
                finalEvent.contract_fields = result.contract_fields;
              }
              controller.enqueue(`data: ${JSON.stringify(finalEvent)}\n\n`);
              controller.close();
              
              // Persist session
              ctx.waitUntil(saveSession(env, session_id, hermes.getSessionHistory(session_id)));
            } catch (error) {
              controller.enqueue(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
              controller.close();
            }
          }
        });

        return new Response(stream, {
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          }
        });
      }

      // Image analysis
      if (url.pathname === '/analyze-image' && request.method === 'POST') {
        const data = await request.json();
        const { image_url, prompt = 'Опиши это изображение', user_id = 'anonymous', session_id = 'default' } = data;

        if (!image_url) {
          return new Response(JSON.stringify({ error: 'image_url is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const hermes = new HermesAgent(env.CACHE, env);
        const result = await hermes.analyzeImage(image_url, prompt, user_id, session_id);

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Feedback endpoint
      if (url.pathname === '/feedback' && request.method === 'POST') {
        const data = await request.json();
        const { message_id, feedback, user_id = 'anonymous', session_id = 'default', text = '' } = data;

        if (!feedback || !['up', 'down'].includes(feedback)) {
          return new Response(JSON.stringify({ error: 'feedback must be "up" or "down"' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const hermes = new HermesAgent(env.CACHE, env);
        const result = await hermes.recordFeedback(user_id, session_id, message_id, feedback, text);

        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // DOV Semantic Counter endpoint
      if (url.pathname === '/gesture/dov' && request.method === 'POST') {
        const contentType = request.headers.get('content-type') || '';
        let data;
        try {
          data = contentType.includes('application/json')
            ? await request.json()
            : JSON.parse(await request.text());
        } catch (e) {
          return new Response(
            JSON.stringify({ error: 'Invalid JSON', details: e.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { semanticLabel, attentionRaw, computeFlops, userId } = data;
        if (!semanticLabel || typeof semanticLabel !== 'string') {
          return new Response(
            JSON.stringify({ error: 'semanticLabel required' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        try {
          const hermes = new HermesAgent(env.CACHE, env);
          const result = await hermes.computeDOV({
            semanticLabel: semanticLabel.slice(0, 200),
            attentionRaw: Number(attentionRaw) || 0.5,
            computeFlops: Number(computeFlops) || 0,
            userId: userId || 'anonymous'
          });
          return new Response(
            JSON.stringify({ ok: true, ...result }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } catch (e) {
          return new Response(
            JSON.stringify({ error: 'DOV computation failed', details: e.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Stats
      if (url.pathname === '/stats') {
        const rag = new HermesRAG(env.CACHE, env);
        const stats = await rag.getStats();

        return new Response(JSON.stringify(stats), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Sessions list
      if (url.pathname === '/sessions') {
        const sessions = await listSessions(env);
        return new Response(JSON.stringify(sessions), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Load session
      if (url.pathname.startsWith('/session/') && request.method === 'GET') {
        const sessionId = url.pathname.split('/')[2];
        const session = await loadSession(env, sessionId);
        return new Response(JSON.stringify(session || { messages: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Create session
      if (url.pathname === '/session' && request.method === 'POST') {
        const data = await request.json();
        const sessionId = data?.session_id || crypto.randomUUID();
        const session = {
          id: sessionId,
          messages: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await env.CACHE.put(
          `${SESSION_PREFIX}${sessionId}`,
          JSON.stringify(session),
          { expirationTtl: SESSION_TTL }
        );
        return new Response(JSON.stringify({ session_id: sessionId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Delete session
      if (url.pathname.startsWith('/session/') && request.method === 'DELETE') {
        const sessionId = url.pathname.split('/')[2];
        await env.CACHE.delete(`${SESSION_PREFIX}${sessionId}`);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Telegram webhook endpoint
      if (url.pathname === '/webhook/telegram' && request.method === 'POST') {
        const update = await request.json();
        const hermes = new HermesAgent(env.CACHE, env);
        const result = await handleTelegramUpdate(update, env, hermes);
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ═══════════════════════════════════════════════════════════
      // NEW ENDPOINTS — Hermes Router Architecture
      // ═══════════════════════════════════════════════════════════

      // LLM Pool — список доступных моделей
      if (url.pathname === '/llm-pool' && request.method === 'GET') {
        const { HermesRouter } = await import('./hermes_router.js');
        const router = new HermesRouter(env);
        return new Response(JSON.stringify({
          llm_pool: router.getLLMPool(),
          stats: router.getStats()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Currency Rates — актуальные курсы
      if (url.pathname === '/rates' && request.method === 'GET') {
        const { HermesRouter } = await import('./hermes_router.js');
        const router = new HermesRouter(env);
        const rates = await router.getRates();
        return new Response(JSON.stringify(rates), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Cost Estimate — оценка стоимости запроса
      if (url.pathname === '/cost-estimate' && request.method === 'POST') {
        const data = await request.json();
        const { task = 'simple_question', complexity = 1.0, llm = 'mistral_medium_3_5' } = data;

        const { HermesRouter } = await import('./hermes_router.js');
        const router = new HermesRouter(env);
        const estimate = await router.costEstimator.estimate(task, complexity, llm);

        return new Response(JSON.stringify(estimate), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Contract State — состояние контракта сессии
      if (url.pathname === '/contract-state' && request.method === 'GET') {
        const sessionId = url.searchParams.get('session_id') || 'default';
        const hermes = new HermesAgent(env.CACHE, env);
        const state = hermes.getContractState(sessionId);

        return new Response(JSON.stringify(state), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Generate Spec — генерация структурированного ТЗ
      if (url.pathname === '/spec' && request.method === 'POST') {
        const data = await request.json();
        const { session_id = 'default' } = data;

        const hermes = new HermesAgent(env.CACHE, env);
        const spec = await hermes.generateSpec(session_id);

        if (!spec) {
          return new Response(JSON.stringify({ error: 'Spec generation failed' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify(spec), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Satisfaction Assessment — оценка удовлетворённости
      if (url.pathname === '/satisfaction' && request.method === 'POST') {
        const data = await request.json();
        const { session_id = 'default' } = data;

        const hermes = new HermesAgent(env.CACHE, env);
        const assessment = await hermes.assessSatisfaction(session_id);

        return new Response(JSON.stringify(assessment), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Intent Classification — классификация намерения
      if (url.pathname === '/intent' && request.method === 'POST') {
        const data = await request.json();
        const { message, session_id = 'default' } = data;

        if (!message) {
          return new Response(JSON.stringify({ error: 'message required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        const { HermesRouter } = await import('./hermes_router.js');
        const router = new HermesRouter(env);
        const hermes = new HermesAgent(env.CACHE, env);
        const contractState = hermes.getContractState(session_id);
        const intent = await router.intentRouter.classify(message, contractState);

        return new Response(JSON.stringify(intent), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Router Stats — статистика роутера
      if (url.pathname === '/router-stats' && request.method === 'GET') {
        const { HermesRouter } = await import('./hermes_router.js');
        const router = new HermesRouter(env);
        return new Response(JSON.stringify(router.getStats()), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // ═══════════════════════════════════════════════════════════
      // TTS — Edge Neural Voices (бесплатно, без ключей)
      // ═══════════════════════════════════════════════════════════
      if (url.pathname === '/tts' && request.method === 'POST') {
        const data = await request.json();
        const { text, lang = 'ru-RU', voice = 'ru-RU-SvetlanaNeural', rate = '0', pitch = '0' } = data;

        if (!text || text.length > 3000) {
          return new Response(JSON.stringify({ error: 'text required, max 3000 chars' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        try {
          // Edge-TTS через официальный endpoint
          const SSML = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'>
            <voice name='${voice}'>
              <prosody rate='${rate}%' pitch='${pitch}%'>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</prosody>
            </voice>
          </speak>`;

          const edgeUrl = 'https://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
          const uuid = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
          });

          const resp = await fetch(`${edgeUrl}?TrustedClientToken=6A5AA1D4EAFF4E9FB37E23D68491D6F4`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/ssml+xml',
              'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
              'Origin': 'https://edge.microsoft.com',
              'Accept': '*/*',
              'Sec-Fetch-Mode': 'cors'
            },
            body: SSML
          });

          if (!resp.ok) {
            throw new Error(`Edge-TTS failed: ${resp.status}`);
          }

          const audioBuffer = await resp.arrayBuffer();
          return new Response(audioBuffer, {
            headers: {
              ...corsHeaders,
              'Content-Type': 'audio/mpeg',
              'Cache-Control': 'public, max-age=3600'
            }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  },

  // Scheduled handler for session cleanup (cron trigger)
  async scheduled(event, env, ctx) {
    ctx.waitUntil(cleanupExpiredSessions(env));
  }
};

// === KV Session Helpers ===

async function saveSession(env, sessionId, history) {
  if (!env.CACHE || !sessionId || sessionId === 'default') return;

  try {
    const key = `${SESSION_PREFIX}${sessionId}`;
    const existing = await env.CACHE.get(key);
    const session = existing ? JSON.parse(existing) : {
      id: sessionId,
      messages: [],
      created_at: new Date().toISOString()
    };

    session.messages = history.slice(-50); // Keep last 50 messages
    session.updated_at = new Date().toISOString();

    await env.CACHE.put(key, JSON.stringify(session), {
      expirationTtl: SESSION_TTL
    });
  } catch (error) {
    // KV errors are non-critical
  }
}

async function loadSession(env, sessionId) {
  if (!env.CACHE) return null;

  try {
    const key = `${SESSION_PREFIX}${sessionId}`;
    const data = await env.CACHE.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    return null;
  }
}

async function listSessions(env) {
  if (!env.CACHE) return [];

  try {
    const list = await env.CACHE.list({ prefix: SESSION_PREFIX });
    return list.keys.map(key => ({
      id: key.name.replace(SESSION_PREFIX, ''),
      updated_at: key.metadata?.updated_at || null
    }));
  } catch (error) {
    return [];
  }
}

async function cleanupExpiredSessions(env) {
  if (!env.CACHE) return;

  try {
    const list = await env.CACHE.list({ prefix: SESSION_PREFIX });
    const now = Date.now();
    let cleaned = 0;

    for (const key of list.keys) {
      // KV with expirationTtl handles auto-cleanup,
      // but we can force-delete stale sessions older than 48h
      if (key.metadata?.updated_at) {
        const updated = new Date(key.metadata.updated_at).getTime();
        if (now - updated > 172800000) { // 48h
          await env.CACHE.delete(key.name);
          cleaned++;
        }
      }
    }

    console.log(`Session cleanup: ${cleaned} expired sessions removed`);
  } catch (error) {
    console.error(`Session cleanup error: ${error.message}`);
  }
}
