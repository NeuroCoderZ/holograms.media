/**
 * Hermes Worker - JavaScript Edition
 * Cloudflare Workers entry point
 */

import { HermesAgent } from './hermes.js';
import { HermesRAG } from './rag.js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
          version: '1.0.0',
          stats
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Chat endpoint
      if (url.pathname === '/chat' && request.method === 'POST') {
        const data = await request.json();
        const { message, user_id = 'anonymous', session_id = 'default', persona = 'hermes' } = data;
        
        if (!message) {
          return new Response(JSON.stringify({ error: 'Message is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        
        const hermes = new HermesAgent(env.CACHE, env);
        const result = await hermes.chat(message, user_id, session_id, persona);
        
        return new Response(JSON.stringify(result), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
        // TODO: Implement sessions storage in KV
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Load session
      if (url.pathname.startsWith('/session/') && request.method === 'GET') {
        const sessionId = url.pathname.split('/')[2];
        // TODO: Load from KV
        return new Response(JSON.stringify({ messages: [] }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Create session
      if (url.pathname === '/session' && request.method === 'POST') {
        const data = await request.json();
        const sessionId = crypto.randomUUID();
        // TODO: Save to KV
        return new Response(JSON.stringify({ session_id: sessionId }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      // Delete session
      if (url.pathname.startsWith('/session/') && request.method === 'DELETE') {
        const sessionId = url.pathname.split('/')[2];
        // TODO: Delete from KV
        return new Response(JSON.stringify({ ok: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
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
  }
};
