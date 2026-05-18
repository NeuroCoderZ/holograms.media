/**
 * Hermes Agent - JavaScript Edition
 * Powered by Mistral Medium 3.5 + Multi-LLM Router Architecture
 * Date: 18.05.2026
 */

import { HermesRAG } from './rag.js';
import { moderateContent } from './moderation.js';
import { HermesRouter } from './hermes_router.js';

const RAG_CONFIG = {
  similarityThreshold: 0.7,
  maxCodebaseResults: 5,
  maxMemoryResults: 4,
  minQueryLength: 15,
  logHits: true,
  logMisses: true
};

// ═══════════════════════════════════════════════════════════
// CONTRACT STATE MACHINE — ведение клиента по фазам
// ═══════════════════════════════════════════════════════════

const CONTRACT_PHASES = {
  draft: {
    goal: "Собрать ТЗ",
    required_fields: ["title", "description"],
    anchor_phrases: ["опишите задачу", "что нужно сделать", "какой результат ожидается", "расскажите подробнее о проекте"],
    exit_condition: (fields) => fields.title && fields.description,
    next: "review",
    prompt_addition: "Сейчас фаза СОСТАВЛЕНИЯ. Собирай ТЗ. Задавай уточняющие вопросы о задаче, результате, требованиях."
  },
  review: {
    goal: "Уточнить детали",
    required_fields: ["budget", "deadline", "tech_stack"],
    anchor_phrases: ["какой бюджет", "какие сроки", "какие технологии предпочитаете", "подходит ли описание", "что добавить или убрать"],
    exit_condition: (fields) => fields.budget && fields.deadline,
    next: "agreement",
    prompt_addition: "Сейчас фаза СОГЛАСОВАНИЯ. Уточняй бюджет, сроки, технологии. Предлагай оптимальные решения."
  },
  sorting: {
    goal: "Подбор исполнителя",
    required_fields: ["tech_stack", "requirements"],
    anchor_phrases: ["подберу нейрокодера", "какие требования к исполнителю", "предпочтения по стеку"],
    exit_condition: (fields) => fields.tech_stack,
    next: "agreement",
    prompt_addition: "Сейчас фаза ПОДБОРА. Помоги выбрать исполнителя по квалификации и рейтингу."
  },
  agreement: {
    goal: "Согласовать условия",
    required_fields: ["payment_terms", "milestones"],
    anchor_phrases: ["условия оплаты", "этапы работы", "готовы создать контракт", "штрафы за просрочку"],
    exit_condition: (fields) => fields.payment_terms,
    next: "escrow",
    prompt_addition: "Сейчас фаза СДЕЛКИ. Согласовывай условия оплаты, этапы, штрафы."
  },
  escrow: {
    goal: "Активация эскроу",
    required_fields: ["depositor", "beneficiary", "amount"],
    anchor_phrases: ["внесите токены в эскроу", "контракт активирован", "отслеживание исполнения"],
    exit_condition: (fields) => fields.amount,
    next: "completed",
    prompt_addition: "Сейчас фаза ЭСКРОУ. Помоги клиенту внести токены и отслеживать исполнение."
  }
};

// ═══════════════════════════════════════════════════════════
// SATISFACTION SCORER — оценка удовлетворённости клиента
// ═══════════════════════════════════════════════════════════

const SATISFACTION_PROMPT = `Оцени удовлетворённость клиента по шкале 0.0-1.0 на основе диалога.
Критерии:
- 0.8-1.0: клиент доволен, все вопросы решены
- 0.5-0.8: клиент заинтересован, но есть уточнения
- 0.0-0.5: клиент недоволен или запутан

Верни ТОЛЬКО число: {"score": 0.75, "reason": "краткое объяснение"}`;

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
    
    // Router Architecture
    this.router = env?.MISTRAL_API_KEY ? new HermesRouter(env) : null;
    
    // Contract state per session
    this.contractStates = new Map();
  }
  
  getContractState(sessionId) {
    if (!this.contractStates.has(sessionId)) {
      this.contractStates.set(sessionId, {
        phase: 'draft',
        fields: {
          title: null,
          description: null,
          budget: null,
          deadline: null,
          client: null,
          coder: null,
          tech_stack: null,
          payment_terms: null,
          milestones: null
        },
        completeness: 0,
        satisfaction_score: 0.5,
        history: []
      });
    }
    return this.contractStates.get(sessionId);
  }
  
  updateContractPhase(sessionId, newFields = {}) {
    const state = this.getContractState(sessionId);
    
    // Update fields
    for (const [key, value] of Object.entries(newFields)) {
      if (value && state.fields.hasOwnProperty(key)) {
        state.fields[key] = value;
      }
    }
    
    // Calculate completeness
    const allFields = Object.values(state.fields).filter(v => v !== null).length;
    const totalFields = Object.keys(state.fields).length;
    state.completeness = allFields / totalFields;
    
    // Check phase exit condition
    const phaseConfig = CONTRACT_PHASES[state.phase];
    if (phaseConfig && phaseConfig.exit_condition(state.fields)) {
      const oldPhase = state.phase;
      state.phase = phaseConfig.next;
      console.log(`[Contract] Phase transition: ${oldPhase} → ${state.phase}`);
    }
    
    return state;
  }
  
  getAnchorPhrases(sessionId) {
    const state = this.getContractState(sessionId);
    const phaseConfig = CONTRACT_PHASES[state.phase];
    return phaseConfig?.anchor_phrases || [];
  }
  
  getSystemPrompt(persona = 'hermes', sessionId = null) {
    const basePrompts = {
      hermes: `Ты — Гермес, AI-ассистент платформы NeuroEscrow. Ты помогаешь клиентам и нейрокодерам с безопасными сделками через эскроу-смарт-контракты на блокчейне TON.

Твои основные функции:
- Создание и проверка смарт-контрактов для эскроу
- Анализ документов, товаров по фото/видео
- Ведение переговоров между сторонами сделки
- Модерация контента и блокировка мошенников
- Подбор нейрокодеров по квалификации и рейтингу
- Отслеживание исполнения контрактов

Жизненный цикл сделки:
1. Составление — сбор ТЗ от клиента
2. Согласование — утверждение и публикация на доске
3. Подбор — сортировка нейрокодеров по рейтингу
4. Сделка — согласование деталей с исполнителем  
5. Эскроу — клиент заводит токены, отслеживание исполнения`,
      
      client: `Ты — Гермес, помощник в NeuroEscrow. Фокус: помощь клиенту в создании безопасных сделок. Жизненный цикл: составление → согласование → подбор → сделка → эскроу.`,
      
      creator: `Ты — Гермес, помощник в NeuroEscrow. Фокус: помощь нейрокодеру-исполнителю. Помогай с поиском заданий, оценкой ТЗ и ведением сделок.`
    };
    
    let prompt = basePrompts[persona] || basePrompts.hermes;
    
    // Add contract phase context
    if (sessionId) {
      const state = this.getContractState(sessionId);
      const phaseConfig = CONTRACT_PHASES[state.phase];
      if (phaseConfig) {
        prompt += `\n\nТЕКУЩАЯ ФАЗА: ${state.phase.toUpperCase()} — ${phaseConfig.goal}`;
        prompt += `\n${phaseConfig.prompt_addition}`;
        prompt += `\nЗаполненные поля: ${JSON.stringify(state.fields)}`;
        prompt += `\nПолнота контракта: ${(state.completeness * 100).toFixed(0)}%`;
        prompt += `\nОпорные фразы для этой фазы: ${phaseConfig.anchor_phrases.join(', ')}`;
        prompt += `\nТвоя задача — вести клиента к заполнению всех полей контракта. Используй опорные фразы чтобы удерживать фокус.`;
      }
    }
    
    prompt += `\n\nОтвечай дружелюбно и профессионально. Если у тебя есть контекст из RAG — используй его. Если нет — отвечай на основе своих знаний как AI-ассистент NeuroEscrow.`;
    
    return prompt;
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
  
  async extractContractFields(message, sessionId) {
    const history = this.getSessionHistory(sessionId);
    const contextMessages = history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
    
    const messages = [
      {
        role: 'system',
        content: `Ты — экстрактор данных смарт-контракта. Извлеки из диалога пользователя поля контракта в формате JSON.
        
Правила:
- Возвращай ТОЛЬКО JSON без markdown, без пояснений
- Поля которые не найдены — оставляй null
- budget — число (TON), deadline — строка YYYY-MM-DD или относительная ("2 недели")
- title — краткое название задачи (до 80 символов)
- description — описание задачи (до 500 символов)
- client — имя клиента если упомянуто
- coder — имя исполнителя если упомянуто

Формат ответа:
{"title": null, "description": null, "budget": null, "deadline": null, "client": null, "coder": null}`
      }
    ];
    
    if (contextMessages) {
      messages.push({ role: 'user', content: `Контекст диалога:\n${contextMessages}` });
    }
    messages.push({ role: 'user', content: `Текущее сообщение: ${message}` });
    
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
          temperature: 0.1,
          max_tokens: 300,
          response_format: { type: 'json_object' }
        })
      });
      
      if (!response.ok) return null;
      
      const data = await response.json();
      const raw = data.choices[0].message.content;
      
      // Parse and validate
      const parsed = JSON.parse(raw);
      const validFields = ['title', 'description', 'budget', 'deadline', 'client', 'coder'];
      const result = {};
      
      for (const field of validFields) {
        result[field] = parsed[field] || null;
      }
      
      // Check if we got any meaningful data
      const hasData = Object.values(result).some(v => v !== null);
      return hasData ? result : null;
      
    } catch (error) {
      console.warn('[Contract Extract] Failed:', error.message);
      return null;
    }
  }
  
  async chat(message, userId, sessionId, persona = 'hermes', imageUrl = null, useRag = true, extractContract = false, useRouter = false) {
    // Moderate content
    const moderation = moderateContent(message);
    if (!moderation.safe) {
      return {
        response: `⚠️ Сообщение заблокировано: ${moderation.reason}`,
        blocked: true,
        reason: moderation.reason
      };
    }
    
    // Router mode — multi-LLM orchestration
    if (useRouter && this.router) {
      return await this.chatWithRouter(message, userId, sessionId, persona);
    }
    
    // Standard mode — single LLM (Mistral)
    return await this.chatStandard(message, userId, sessionId, persona, imageUrl, useRag, extractContract);
  }
  
  async chatWithRouter(message, userId, sessionId, persona) {
    const contractState = this.getContractState(sessionId);
    
    try {
      const result = await this.router.processRequest(message, contractState);
      
      // Update contract state from router's intent
      if (result.intent.missing_fields) {
        this.updateContractPhase(sessionId);
      }
      
      // Extract contract fields from aggregated response
      const extractedFields = await this.extractContractFields(message, sessionId);
      if (extractedFields) {
        this.updateContractPhase(sessionId, extractedFields);
      }
      
      // Add to session
      this.addToSession(sessionId, 'user', message);
      this.addToSession(sessionId, 'assistant', result.spec.aggregated_response);
      
      return {
        response: result.spec.aggregated_response,
        blocked: false,
        context_used: false,
        tokens_used: result.spec.cost_summary.total_tokens,
        contract_fields: extractedFields,
        contract_state: this.getContractState(sessionId),
        cost_estimate: result.cost_estimate,
        intent: result.intent,
        llm_selection: result.llm_selection,
        rates: result.rates,
        router_mode: true
      };
    } catch (error) {
      console.warn('[Router] Failed, falling back to standard:', error.message);
      return await this.chatStandard(message, userId, sessionId, persona, null, true, true);
    }
  }
  
  async chatStandard(message, userId, sessionId, persona, imageUrl, useRag, extractContract) {
    // Build context
    let context = '';
    if (useRag) {
      context = await this.buildContext(message, userId, sessionId);
    }
    
    // Get history
    const history = this.getSessionHistory(sessionId);
    
    // Build messages with contract phase context
    const messages = [
      { role: 'system', content: this.getSystemPrompt(persona, sessionId) }
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
      
      // Extract contract fields if requested (parallel to memory save)
      let extractedFields = null;
      if (extractContract) {
        extractedFields = await this.extractContractFields(message, sessionId);
      }
      
      // Update contract state
      if (extractedFields) {
        this.updateContractPhase(sessionId, extractedFields);
      }
      
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
        tokens_used: data.usage?.total_tokens || 0,
        contract_fields: extractedFields,
        contract_state: this.getContractState(sessionId),
        router_mode: false
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
  
  async generateSpec(sessionId) {
    const state = this.getContractState(sessionId);
    const history = this.getSessionHistory(sessionId, 50);
    
    const specPrompt = `Ты — генератор структурированных спеков для NeuroEscrow.
Создай подробный черновик ТЗ для нейрокодера на основе диалога с клиентом.

Формат ответа — JSON:
{
  "title": "название проекта",
  "description": "подробное описание",
  "tech_stack": ["Flutter", "Firebase", "TON Connect"],
  "modules": ["модуль 1", "модуль 2"],
  "milestones": [{"name": "этап", "percent": 30, "days": 7}],
  "budget_ton": 100,
  "deadline_days": 30,
  "risks": ["риск 1", "риск 2"],
  "acceptance_criteria": ["критерий 1", "критерий 2"],
  "for_neurocoder": "инструкция для нейрокодера"
}`;

    const conversation = history.map(m => `${m.role}: ${m.content}`).join('\n');
    
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: specPrompt },
            { role: 'user', content: `Поля контракта: ${JSON.stringify(state.fields)}\n\nДиалог:\n${conversation}` }
          ],
          temperature: 0.3,
          max_tokens: 3000,
          response_format: { type: 'json_object' }
        })
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.warn('[Spec] Generation failed:', error.message);
      return null;
    }
  }
  
  async assessSatisfaction(sessionId) {
    const history = this.getSessionHistory(sessionId, 10);
    if (history.length < 2) return { score: 0.5, reason: 'Недостаточно данных' };
    
    const conversation = history.map(m => `${m.role}: ${m.content}`).join('\n');
    
    try {
      const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: SATISFACTION_PROMPT },
            { role: 'user', content: conversation }
          ],
          temperature: 0.1,
          max_tokens: 100,
          response_format: { type: 'json_object' }
        })
      });
      
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content);
      
      const state = this.getContractState(sessionId);
      state.satisfaction_score = parsed.score || 0.5;
      
      return parsed;
    } catch (error) {
      return { score: 0.5, reason: error.message };
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
