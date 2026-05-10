/**
 * Hermes Agent - JavaScript Edition
 * Powered by Mistral Medium 3.5
 */

import { HermesRAG } from './rag.js';
import { moderateContent } from './moderation.js';

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
  }
  
  getSystemPrompt(persona = 'hermes') {
    const prompts = {
      hermes: `Ты — Гермес, интеллектуальный агент-посредник NeuroEscrow.

Твои возможности:
- Глубокое понимание кодовой базы NeuroEscrow через RAG
- Помощь в создании и проверке смарт-контрактов
- Анализ фото и видео (документы, товары)
- Ведение переговоров между сторонами сделки
- Модерация контента и блокировка нарушителей

Твой стиль:
- Профессиональный, но дружелюбный
- Краткие и точные ответы
- Используешь эмодзи умеренно
- Всегда объясняешь технические детали простым языком
- Отвечай на русском языке, без использования markdown (**, *, #), с правильной пунктуацией, абзацами и отступами. Используй естественный русский стиль.`,
      
      client: `Ты — Гермес в режиме помощи клиенту.
Фокус: помощь в создании сделки, объяснение условий, защита интересов клиента.`,
      
      creator: `Ты — Гермес в режиме помощи исполнителю.
Фокус: помощь в выполнении заказа, проверка требований, защита от недобросовестных заказчиков.`
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
    const contextParts = [];
    
    // Search codebase
    const codebaseResults = await this.rag.searchCodebase(query, 3);
    if (codebaseResults.length > 0) {
      contextParts.push('📚 Релевантный код из базы:');
      codebaseResults.forEach((result, i) => {
        const filepath = result.filepath || 'unknown';
        const text = (result.text || '').substring(0, 500);
        const similarity = result.$similarity || 0;
        contextParts.push(`\n${i + 1}. ${filepath} (similarity: ${similarity.toFixed(2)})\n\`\`\`\n${text}\n\`\`\``);
      });
    }
    
    // Search memory
    const memoryResults = await this.rag.searchMemory(query, userId, 2);
    if (memoryResults.length > 0) {
      contextParts.push('\n\n🧠 Из долгосрочной памяти:');
      memoryResults.forEach((result, i) => {
        const content = result.content || '';
        const timestamp = result.timestamp || '';
        contextParts.push(`\n${i + 1}. [${timestamp}] ${content}`);
      });
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
      const assistantMessage = data.choices[0].message.content;
      
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
}
