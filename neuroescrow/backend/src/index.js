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
      // TTS — Silero V5 (Russian SOTA) + VITS + Google fallback
      // ═══════════════════════════════════════════════════════════
      if (url.pathname === '/tts' && request.method === 'POST') {
        const data = await request.json();
        const { text, lang = 'ru', voice = 'xenia', engine = 'silero' } = data;
        console.log('[TTS] Request received:', { engine, textLen: text?.length, voice });

        if (!text || text.length > 1000) {
          return new Response(JSON.stringify({ error: 'text required, max 1000 chars' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Route to selected engine
        if (engine === 'silero') {
          try {
            return await handleSileroTTS(text, voice, corsHeaders);
          } catch (error) {
            console.error('[TTS] Silero failed, auto-fallback to VITS');
            try {
              return await handleVitsTTS(text, voice, corsHeaders);
            } catch (vitsError) {
              console.error('[TTS] VITS failed, auto-fallback to Google');
              return await handleGoogleTTS(text, corsHeaders);
            }
          }
        } else if (engine === 'vits') {
          return await handleVitsTTS(text, voice, corsHeaders);
        } else if (engine === 'google') {
          return await handleGoogleTTS(text, corsHeaders);
        }

        // Default: try Silero, fallback chain
        return await handleTTSPipeline(text, voice, corsHeaders);
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

// ═══════════════════════════════════════════════════════════
// TTS Engine Handlers
// ═══════════════════════════════════════════════════════════

async function handleSileroTTS(text, voice, corsHeaders) {
  console.log('[TTS] Silero START:', { textLen: text.length, voice });
  try {
    const sileroSpace = 'https://neurosenko-tts-silero.hf.space';
    // App.py inputs: [text_input, text_type_input, speaker_input]
    // Available speakers: aidar, baya, kseniya, xenia, eugene, random
    const speakerName = voice || 'kseniya';
    
    // Step 1: Queue prediction via Gradio /call/2 (unnamed endpoint #2)
    console.log('[TTS] Silero Step 1: POST /call/2');
    const initResp = await fetch(`${sileroSpace}/call/2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [text.substring(0, 1000), 'Common', speakerName]
      })
    });

    console.log('[TTS] Silero Step 1 response:', initResp.status, initResp.statusText);
    
    if (!initResp.ok) {
      const errText = await initResp.text().catch(() => '');
      console.error('[TTS] Silero Step 1 error:', errText.substring(0, 500));
      throw new Error(`Silero queue failed: ${initResp.status} ${errText.substring(0, 200)}`);
    }
    
    const initData = await initResp.json();
    console.log('[TTS] Silero Step 1 data:', JSON.stringify(initData).substring(0, 200));
    const { event_id } = initData;
    
    if (!event_id) {
      console.error('[TTS] Silero no event_id:', initData);
      throw new Error('Silero returned no event_id');
    }
    
    // Step 2: Poll for result via SSE
    console.log('[TTS] Silero Step 2: GET /call/2/', event_id);
    const streamResp = await fetch(`${sileroSpace}/call/2/${event_id}`);
    console.log('[TTS] Silero Step 2 response:', streamResp.status, streamResp.statusText);
    
    const reader = streamResp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let audioUrl = null;
    let eventCount = 0;
    
    const timeout = setTimeout(() => {
      console.warn('[TTS] Silero timeout after 15s');
      reader.cancel();
    }, 15000);

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          eventCount++;
          console.log(`[TTS] Silero SSE event #${eventCount}:`, line.substring(0, 150));
          
          if (line.startsWith('event: complete') || line.startsWith('event: completed')) {
            const dataIdx = lines.indexOf(line) + 1;
            if (dataIdx < lines.length && lines[dataIdx].startsWith('data:')) {
              const rawData = JSON.parse(lines[dataIdx].slice(5));
              console.log('[TTS] Silero complete data:', JSON.stringify(rawData).substring(0, 500));
              // Gradio Audio component returns: {path: "...", url: null, name: "..."}
              if (rawData && rawData.path) {
                audioUrl = `${sileroSpace}/file=${rawData.path}`;
              } else if (rawData && rawData.url) {
                audioUrl = rawData.url;
              } else if (Array.isArray(rawData) && rawData[0]) {
                // Sometimes returns array [path, sample_rate]
                audioUrl = `${sileroSpace}/file=${rawData[0]}`;
              }
            }
            break;
          }
        }
        if (audioUrl) break;
      }
    } finally {
      clearTimeout(timeout);
    }

    console.log('[TTS] Silero audioUrl:', audioUrl);
    if (!audioUrl) throw new Error('Silero TTS timeout - no audio URL');

    const audioResp = await fetch(audioUrl);
    console.log('[TTS] Silero audio download:', audioResp.status, audioResp.headers.get('content-type'));
    
    if (!audioResp.ok) throw new Error(`Silero audio download failed: ${audioResp.status}`);
    
    const audioBuffer = await audioResp.arrayBuffer();
    console.log('[TTS] Silero SUCCESS:', audioBuffer.byteLength, 'bytes');
    
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('[TTS] Silero error:', error.message);
    throw error;
  }
}

async function handleVitsTTS(text, voice, corsHeaders) {
  console.log('[TTS] VITS START:', { textLen: text.length, voice });
  try {
    // VITS API: [speaker_id, text] where speaker_id is "woman" or "man"
    const speakerType = voice === 'male' ? 'man' : 'woman';
    const vitsSpace = 'https://utrobinmv-tts-ru-free-hf-vits-low-multispeaker.hf.space';
    
    console.log('[TTS] VITS Step 1: POST /call/predict');
    const initResp = await fetch(`${vitsSpace}/call/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: [speakerType, text.substring(0, 1000)] })
    });

    console.log('[TTS] VITS Step 1 response:', initResp.status, initResp.statusText);
    
    if (!initResp.ok) {
      const errText = await initResp.text().catch(() => '');
      console.error('[TTS] VITS Step 1 error:', errText.substring(0, 500));
      throw new Error(`VITS queue failed: ${initResp.status} ${errText.substring(0, 200)}`);
    }
    
    const initData = await initResp.json();
    console.log('[TTS] VITS Step 1 data:', JSON.stringify(initData).substring(0, 200));
    const { event_id } = initData;
    
    if (!event_id) {
      console.error('[TTS] VITS no event_id:', initData);
      throw new Error('VITS returned no event_id');
    }
    
    console.log('[TTS] VITS Step 2: GET /call/predict/', event_id);
    const streamResp = await fetch(`${vitsSpace}/call/predict/${event_id}`);
    console.log('[TTS] VITS Step 2 response:', streamResp.status, streamResp.statusText);
    
    const reader = streamResp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let audioUrl = null;
    let eventCount = 0;
    
    const timeout = setTimeout(() => reader.cancel(), 15000);

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
          eventCount++;
          if (eventCount <= 5) {
            console.log(`[TTS] VITS SSE event #${eventCount}:`, line.substring(0, 100));
          }
          
          if (line.startsWith('event: complete') || line.startsWith('event: completed')) {
            const dataIdx = lines.indexOf(line) + 1;
            if (dataIdx < lines.length && lines[dataIdx].startsWith('data:')) {
              const rawData = JSON.parse(lines[dataIdx].slice(5));
              console.log('[TTS] VITS complete data:', JSON.stringify(rawData).substring(0, 300));
              if (rawData && rawData.path) {
                audioUrl = `${vitsSpace}/file=${rawData.path}`;
              }
            }
            break;
          }
        }
        if (audioUrl) break;
      }
    } finally {
      clearTimeout(timeout);
    }

    console.log('[TTS] VITS audioUrl:', audioUrl);
    if (!audioUrl) throw new Error('VITS TTS timeout - no audio URL');

    const audioResp = await fetch(audioUrl);
    console.log('[TTS] VITS audio download:', audioResp.status, audioResp.headers.get('content-type'));
    
    if (!audioResp.ok) throw new Error(`VITS audio download failed: ${audioResp.status}`);
    
    const audioBuffer = await audioResp.arrayBuffer();
    console.log('[TTS] VITS SUCCESS:', audioBuffer.byteLength, 'bytes');
    
    return new Response(audioBuffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/wav',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('[TTS] VITS error:', error.message);
    throw error;
  }
}

async function handleGoogleTTS(text, corsHeaders) {
  console.log('[TTS] Google START:', { textLen: text.length });
  try {
    const chunks = text.match(/[^.!?]+[.!?]*/g) || [text];
    const audioSegments = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const trimmed = chunks[i].trim();
      if (!trimmed) continue;
      
      const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ru&q=${encodeURIComponent(trimmed.substring(0, 180))}`;
      console.log(`[TTS] Google chunk ${i + 1}:`, trimmed.substring(0, 50));
      
      const resp = await fetch(googleUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      console.log(`[TTS] Google chunk ${i + 1} response:`, resp.status, resp.headers.get('content-type'));
      
      if (resp.ok) {
        audioSegments.push(await resp.arrayBuffer());
      }
    }
    
    console.log('[TTS] Google segments:', audioSegments.length);
    if (audioSegments.length === 0) throw new Error('Google TTS failed - no segments');
    
    const totalLength = audioSegments.reduce((acc, val) => acc + val.byteLength, 0);
    const mergedAudio = new Uint8Array(totalLength);
    let offset = 0;
    for (const segment of audioSegments) {
      mergedAudio.set(new Uint8Array(segment), offset);
      offset += segment.byteLength;
    }
    
    console.log('[TTS] Google SUCCESS:', totalLength, 'bytes');
    return new Response(mergedAudio, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    });
  } catch (error) {
    console.error('[TTS] Google error:', error.message);
    throw error;
  }
}

async function handleTTSPipeline(text, voice, corsHeaders) {
  console.log('[TTS] Pipeline START');
  // Try Silero first
  try {
    return await handleSileroTTS(text, voice, corsHeaders);
  } catch (error) {
    console.warn('[TTS] Silero failed, trying VITS:', error.message);
    
    // Fallback to VITS
    try {
      return await handleVitsTTS(text, voice, corsHeaders);
    } catch (vitsError) {
      console.warn('[TTS] VITS failed, trying Google:', vitsError.message);
      
      // Final fallback: Google
      try {
        return await handleGoogleTTS(text, corsHeaders);
      } catch (googleError) {
        console.error('[TTS] All providers failed:', googleError.message);
        return new Response(JSON.stringify({ error: 'All TTS providers failed' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
  }
}
