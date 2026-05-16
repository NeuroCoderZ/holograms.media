/**
 * Hermes Agent - JavaScript Edition
 * Powered by Mistral Medium 3.5
 */

import { HermesRAG } from './rag.js';
import { moderateContent } from './moderation.js';

const RAG_CONFIG = {
  similarityThreshold: 0.7,
  maxCodebaseResults: 5,
  maxMemoryResults: 4,
  minQueryLength: 15,
  logHits: true,
  logMisses: true
};

export class HermesAgent {
  constructor(kvCache, env) {
    this.apiKey = env?.MISTRAL_API_KEY;
    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY not found in environment');
    }
    this.model = env?.MODEL_NAME || 'mistral-medium-3.5';
    this.rag = new HermesRAG(kvCache, env);
    this.sessions = new Map();
    this.kvCache = kvCache;
    this.ragHits = 0;
    this.ragMisses = 0;
    this.env = env;
  }
  
  getSystemPrompt(persona = 'hermes') {
    const prompts = {
      hermes: `Ты — Гермес, помощник в NeuroEscrow. Отвечай строго на основе контекста из RAG. Если контекста нет — скажи, что у тебя нет информации. Не используй собственные знания LLM.`,
      
      client: `Ты — Гермес, помощник в NeuroEscrow. Отвечай строго на основе контекста из RAG. Фокус: помощь клиенту.`,
      
      creator: `Ты — Гермес, помощник в NeuroEscrow. Отвечай строго на основе контекста из RAG. Фокус: помощь исполнителю.`
    };
    
    return prompts[persona] || prompts.hermes;
  }
  
  getSessionHistory(sessionId, limit = 10) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    const history = this.sessions.get(sessionId);
    return history.slice(-limit);
  }
  
  addToSession(sessionId, role, content) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, []);
    }
    this.sessions.get(sessionId).push({
      role,
      content,
      timestamp: new Date().toISOString()
    });
  }
  
  async buildContext(query, userId, sessionId) {
    // Skip RAG for short messages (greetings, etc.)
    if (!query || query.trim().length < RAG_CONFIG.minQueryLength) return '';

    const contextParts = [];

    // Search codebase with similarity threshold
    const codebaseResults = await this.rag.searchCodebase(query, RAG_CONFIG.maxCodebaseResults);
    const filteredCodebase = codebaseResults.filter(r => (r.$similarity || 0) >= RAG_CONFIG.similarityThreshold);
    if (filteredCodebase.length > 0) {
      contextParts.push('📚 Релевантный код из базы:');
      filteredCodebase.forEach((result, i) => {
        const filepath = result.filepath || 'unknown';
        const text = (result.text || '').substring(0, 500);
        const similarity = result.$similarity || 0;
        contextParts.push(`\n${i + 1}. ${filepath} (similarity: ${similarity.toFixed(2)})\n\`\`\`\n${text}\n\`\`\``);
      });
    }

    // Search memory with similarity threshold
    const memoryResults = await this.rag.searchMemory(query, userId, RAG_CONFIG.maxMemoryResults);
    const filteredMemory = memoryResults.filter(r => (r.$similarity || 0) >= RAG_CONFIG.similarityThreshold);
    if (filteredMemory.length > 0) {
      contextParts.push('\n\n🧠 Из долгосрочной памяти:');
      filteredMemory.forEach((result, i) => {
        const content = result.content || '';
        const timestamp = result.timestamp || '';
        contextParts.push(`\n${i + 1}. [${timestamp}] ${content}`);
      });
    }

    // Log hit/miss
    const hasContext = contextParts.length > 0;
    if (hasContext) {
      this.ragHits++;
      if (RAG_CONFIG.logHits) {
        console.log(`[RAG] HIT session=${sessionId} query="${query.substring(0, 30)}..." codebase=${filteredCodebase.length} memory=${filteredMemory.length}`);
      }
    } else {
      this.ragMisses++;
      if (RAG_CONFIG.logMisses) {
        console.log(`[RAG] MISS session=${sessionId} query="${query.substring(0, 30)}..."`);
      }
    }
    
    return contextParts.join('');
  }
  
  async chat(message, userId, sessionId, persona = 'hermes', imageUrl = null, useRag = true) {
    // Moderate content
    const moderation = moderateContent(message);
    if (!moderation.safe) {
      return {
        response: `⚠️ Сообщение заблокировано: ${moderation.reason}`,
        blocked: true,
        reason: moderation.reason
      };
    }
    
    // Build context
    let context = '';
    if (useRag) {
      context = await this.buildContext(message, userId, sessionId);
    }
    
    // RAG-only mode: if no context found, return specific message
    if (useRag && !context && message.trim().length >= 15) {
      return {
        response: 'У меня нет информации об этом в базе знаний. Уточни вопрос.',
        blocked: false,
        context_used: false,
        tokens_used: 0
      };
    }
    
    // Get history
    const history = this.getSessionHistory(sessionId);
    
    // Build messages
    const messages = [
      { role: 'system', content: this.getSystemPrompt(persona) }
    ];
    
    if (context) {
      messages.push({
        role: 'system',
        content: `Контекст для ответа:\n${context}`
      });
    }
    
    // Add history
    history.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });
    
    // Add current message
    if (imageUrl) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message },
          { type: 'image_url', image_url: { url: imageUrl } }
        ]
      });
    } else {
      messages.push({
        role: 'user',
        content: message
      });
    }
    
    // Call Mistral API
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.7,
          max_tokens: 2000
        })
      });
      
      if (!response.ok) {
        throw new Error(`Mistral API error: ${response.status}`);
      }
      
      const data = await response.json();
      let assistantMessage = data.choices[0].message.content;
      
      // Sanitize response: remove [Tria] and similar prefixes
      assistantMessage = assistantMessage.replace(/^\[(Tria|Hermes|AI|Bot)\]\s*/i, '').trim();
      
      // Add to session
      this.addToSession(sessionId, 'user', message);
      this.addToSession(sessionId, 'assistant', assistantMessage);
      
      // Save to memory (substantial messages only)
      if (message.length > 50) {
        await this.rag.addMemory(
          userId,
          sessionId,
          `User: ${message}\nHermes: ${assistantMessage}`,
          'conversation'
        );
      }
      
      return {
        response: assistantMessage,
        blocked: false,
        context_used: !!context,
        tokens_used: data.usage?.total_tokens || 0
      };
      
    } catch (error) {
      return {
        response: `❌ Ошибка: ${error.message}`,
        error: true,
        error_message: error.message
      };
    }
  }
  
  async analyzeImage(imageUrl, prompt, userId, sessionId) {
    return this.chat(prompt, userId, sessionId, 'hermes', imageUrl, false);
  }
  
  async getSessionSummary(sessionId) {
    const history = this.getSessionHistory(sessionId, 100);
    
    if (history.length === 0) {
      return 'Нет истории сессии';
    }
    
    const conversation = history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
    
    const messages = [
      {
        role: 'system',
        content: 'Создай краткое резюме этого разговора (2-3 предложения).'
      },
      {
        role: 'user',
        content: conversation
      }
    ];
    
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: 0.5,
          max_tokens: 200
        })
      });
      
      const data = await response.json();
      return data.choices[0].message.content;
      
    } catch (error) {
      return `Ошибка создания резюме: ${error.message}`;
    }
  }
  
  clearSession(sessionId) {
    this.sessions.delete(sessionId);
  }

  async recordFeedback(userId, sessionId, messageId, feedback, text) {
    const logEntry = {
      user_id: userId,
      session_id: sessionId,
      message_id: messageId,
      feedback,
      text_preview: text.substring(0, 100),
      timestamp: new Date().toISOString()
    };

    console.log(`[FEEDBACK] ${feedback === 'up' ? '👍' : '👎'} user=${userId} session=${sessionId} msg=${messageId}`);

    // Store in KV for analytics
    if (this.kvCache) {
      try {
        const key = `feedback:${sessionId}:${messageId}`;
        await this.kvCache.put(key, JSON.stringify(logEntry), { expirationTtl: 86400 * 30 });
      } catch (e) {
        console.warn('[FEEDBACK] KV storage error:', e.message);
      }
    }

    return { ok: true, feedback };
  }

  getRagStats() {
    return {
      hits: this.ragHits,
      misses: this.ragMisses,
      hitRate: this.ragHits + this.ragMisses > 0
        ? (this.ragHits / (this.ragHits + this.ragMisses) * 100).toFixed(1) + '%'
        : 'N/A'
    };
  }

  async computeDOV({ semanticLabel, attentionRaw, computeFlops, userId }) {
    const astraEndpoint = this.env?.ASTRA_DB_ENDPOINT;
    const astraToken = this.env?.ASTRA_DB_TOKEN;
    if (!astraEndpoint || !astraToken) throw new Error('AstraDB credentials missing');

    // 1. Embedding смысла жеста (Gemini)
    const embedResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${this.env?.GOOGLE_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/gemini-embedding-2-preview',
          content: { parts: [{ text: semanticLabel }] },
          outputDimensionality: 3072
        })
      }
    );
    const embedData = await embedResp.json();
    const embedding = embedData.embedding?.values;
    if (!embedding) throw new Error('Embedding failed for semanticLabel');

    // 2. SemanticNovelty: поиск похожих смыслов в AstraDB
    const searchResp = await fetch(
      `${astraEndpoint}/api/json/v1/default_keyspace/gestures_semantic_3072`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Token': astraToken
        },
        body: JSON.stringify({
          find: {
            sort: { $vector: embedding },
            options: { limit: 20, includeSimilarity: true }
          }
        })
      }
    );
    const searchData = await searchResp.json();
    const docs = searchData.data?.documents || [];
    const N = docs.length || 1;
    const k = docs.filter(d => d.$similarity > 0.85).length;
    const semanticNovelty = Math.max(0, 1 - k / N);

    // 3. Нормализация метрик
    const attention = Math.min(1, Math.max(0, attentionRaw ?? 0.5));
    const compute = Math.min(1, (computeFlops ?? 0) / 1e9);

    // 4. Коэффициенты (пока дефолт, далее — DAO)
    const alpha = 0.35, beta = 0.30, gamma = 0.35;
    const dov = alpha * attention + beta * compute + gamma * semanticNovelty;

    // 5. Сохранение эмбеддинга смысла
    const docId = `${userId}_${Date.now()}`;
    await fetch(
      `${astraEndpoint}/api/json/v1/default_keyspace/gestures_semantic_3072`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Token': astraToken },
        body: JSON.stringify({
          insertOne: {
            document: {
              _id: docId,
              $vector: embedding,
              semanticLabel,
              userId,
              timestamp: new Date().toISOString()
            }
          }
        })
      }
    );

    // 6. Логирование DOV
    await fetch(
      `${astraEndpoint}/api/json/v1/default_keyspace/gestures_dov_log`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Token': astraToken },
        body: JSON.stringify({
          insertOne: {
            document: {
              _id: `dov_${docId}`,
              userId,
              semanticLabel,
              attention,
              compute,
              semanticNovelty,
              dov,
              alpha, beta, gamma,
              timestamp: new Date().toISOString()
            }
          }
        })
      }
    );

    return { dov, attention, compute, semanticNovelty, embedding: docId };
  }
}
