/**
 * Hermes Router — Meta-Agent LLM Orchestrator
 * 
 * Гермес НЕ генерирует сам. Гермес маршрутизирует запросы к лучшим LLM,
 * оценивает стоимость, накапливает опыт и агрегирует ответы.
 * 
 * Architecture:
 *   Client Intent → Router → LLM Pool → Aggregator → Structured Spec
 * 
 * Date: 18.05.2026
 * Source: Code Arena WebDev Rankings (May 14, 2026)
 */

// ═══════════════════════════════════════════════════════════
// LLM POOL — актуальный рейтинг Code Arena WebDev
// ═══════════════════════════════════════════════════════════

const LLM_POOL = {
  // TIER 1 — Элита (критические задачи, сложные архитектуры)
  claude_opus_4_7_thinking: {
    provider: "anthropic",
    model: "claude-opus-4-7-20260505",
    rank: 1,
    score: 1567,
    priceInput: 15,    // $/M input tokens
    priceOutput: 75,   // $/M output tokens
    context: 1_000_000,
    strengths: ["complex_architecture", "critical_code_review", "deep_reasoning"],
    speed: "slow",
    modality: "text"
  },
  claude_opus_4_7: {
    provider: "anthropic",
    model: "claude-opus-4-7-20260505",
    rank: 2,
    score: 1559,
    priceInput: 15,
    priceOutput: 75,
    context: 1_000_000,
    strengths: ["complex_architecture", "legal_terms", "contract_draft"],
    speed: "medium",
    modality: "text"
  },
  claude_opus_4_6_thinking: {
    provider: "anthropic",
    model: "claude-opus-4-6-20251001",
    rank: 3,
    score: 1546,
    priceInput: 15,
    priceOutput: 75,
    context: 1_000_000,
    strengths: ["deep_reasoning", "multi_step_planning"],
    speed: "slow",
    modality: "text"
  },
  claude_opus_4_6: {
    provider: "anthropic",
    model: "claude-opus-4-6-20251001",
    rank: 4,
    score: 1541,
    priceInput: 15,
    priceOutput: 75,
    context: 1_000_000,
    strengths: ["architecture", "code_generation"],
    speed: "medium",
    modality: "text"
  },

  // TIER 2 — Сильные (баланс цена/качество)
  glm_5_1: {
    provider: "zhipu",
    model: "glm-5.1",
    rank: 5,
    score: 1532,
    priceInput: 1.40,
    priceOutput: 4.40,
    context: 202_800,
    strengths: ["tech_architecture", "code_gen", "budget_friendly"],
    speed: "fast",
    modality: "text"
  },
  claude_sonnet_4_6: {
    provider: "anthropic",
    model: "claude-sonnet-4-6-20260505",
    rank: 6,
    score: 1524,
    priceInput: 3,
    priceOutput: 15,
    context: 1_000_000,
    strengths: ["general_coding", "conversation", "fast_response"],
    speed: "fast",
    modality: "text"
  },
  kimi_k2_6: {
    provider: "moonshot",
    model: "kimi-k2.6",
    rank: 7,
    score: 1519,
    priceInput: 0.95,
    priceOutput: 4,
    context: 262_100,
    strengths: ["code_gen", "cost_effective"],
    speed: "fast",
    modality: "text"
  },

  // TIER 3 — Доступные (массовые запросы, агентские задачи)
  gpt_5_5_xhigh: {
    provider: "openai",
    model: "gpt-5.5-xhigh",
    rank: 9,
    score: 1501,
    priceInput: 2.50,
    priceOutput: 15,
    context: 1_100_000,
    strengths: ["codex_harness", "automated_coding"],
    speed: "medium",
    modality: "text"
  },
  qwen3_6_max_preview: {
    provider: "alibaba",
    model: "qwen3.6-max-preview",
    rank: 10,
    score: 1491,
    priceInput: 1.04,
    priceOutput: 6.24,
    context: 262_100,
    strengths: ["general_tasks", "multilingual", "cost_effective"],
    speed: "fast",
    modality: "text"
  },
  qwen3_6_plus: {
    provider: "alibaba",
    model: "qwen3.6-plus",
    rank: 15,
    score: 1460,
    priceInput: 0.33,
    priceOutput: 1.95,
    context: 1_000_000,
    strengths: ["agent_tasks", "default_router", "budget_friendly"],
    speed: "fast",
    modality: "text"
  },
  deepseek_v4_pro_thinking: {
    provider: "deepseek",
    model: "deepseek-v4-pro-thinking",
    rank: 16,
    score: 1458,
    priceInput: 0.43,
    priceOutput: 0.87,
    context: 1_000_000,
    strengths: ["reasoning", "code_gen", "ultra_budget"],
    speed: "medium",
    modality: "text"
  },

  // FALLBACK — Mistral (текущий дефолт)
  mistral_medium_3_5: {
    provider: "mistral",
    model: "mistral-medium-3.5",
    rank: null,
    score: 1400,
    priceInput: 0.40,
    priceOutput: 2.00,
    context: 256_000,
    strengths: ["conversation", "general_coding", "fallback"],
    speed: "fast",
    modality: "text"
  },

  // MULTIMODAL
  gemini_2_0_flash: {
    provider: "google",
    model: "gemini-2.0-flash",
    rank: null,
    score: null,
    priceInput: 0.10,
    priceOutput: 0.40,
    context: 1_000_000,
    strengths: ["image_gen", "video_analysis", "multimodal"],
    speed: "fast",
    modality: "multimodal"
  }
};

// ═══════════════════════════════════════════════════════════
// CURRENCY RATES — актуальные курсы (прямые API источники)
// ═══════════════════════════════════════════════════════════

const RATE_SOURCES = {
  ton_usd: {
    url: "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd",
    path: "the-open-network.usd",
    fallback: 5.0,
    ttl: 60_000  // 1 минута
  },
  usd_rub: {
    url: "https://api.exchangerate-api.com/v4/latest/USD",
    path: "rates.RUB",
    fallback: 90.0,
    ttl: 300_000  // 5 минут
  },
  ton_rub: {
    derived: true,  // ton_usd * usd_rub
    ttl: 60_000
  }
};

class CurrencyCache {
  constructor(kv) {
    this.kv = kv;
    this.memory = new Map();
  }

  async getRate(key) {
    // Memory cache
    const cached = this.memory.get(key);
    if (cached && Date.now() - cached.ts < (RATE_SOURCES[key]?.ttl || 60_000)) {
      return cached.value;
    }

    // KV cache
    if (this.kv) {
      try {
        const raw = await this.kv.get(`rate:${key}`);
        if (raw) {
          const data = JSON.parse(raw);
          if (Date.now() - data.ts < (RATE_SOURCES[key]?.ttl || 60_000)) {
            this.memory.set(key, data);
            return data.value;
          }
        }
      } catch { /* KV error, continue */ }
    }

    // Fetch fresh
    const value = await this.fetchRate(key);
    this.memory.set(key, { value, ts: Date.now() });
    return value;
  }

  async fetchRate(key) {
    const source = RATE_SOURCES[key];
    if (!source) return source?.fallback || 1;

    if (source.derived) {
      const tonUsd = await this.getRate("ton_usd");
      const usdRub = await this.getRate("usd_rub");
      return tonUsd * usdRub;
    }

    try {
      const resp = await fetch(source.url, { cf: { cacheTtl: 60 } });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      
      // Navigate path
      let value = data;
      for (const part of source.path.split(".")) {
        value = value?.[part];
      }
      
      if (!value || typeof value !== "number") throw new Error("Invalid rate data");

      // Save to KV
      if (this.kv) {
        try {
          await this.kv.put(`rate:${key}`, JSON.stringify({ value, ts: Date.now() }), { expirationTtl: 600 });
        } catch { /* KV error */ }
      }

      return value;
    } catch (error) {
      console.warn(`[Rates] Failed to fetch ${key}:`, error.message);
      return source.fallback;
    }
  }

  async getAllRates() {
    const [tonUsd, usdRub] = await Promise.all([
      this.getRate("ton_usd"),
      this.getRate("usd_rub")
    ]);
    return {
      ton_usd: tonUsd,
      usd_rub: usdRub,
      ton_rub: tonUsd * usdRub,
      updated_at: new Date().toISOString()
    };
  }
}

// ═══════════════════════════════════════════════════════════
// COST ESTIMATOR — токены → USD → TON
// ═══════════════════════════════════════════════════════════

const TOKEN_ESTIMATES = {
  intent_classification: 300,
  simple_question: 800,
  contract_draft: 4000,
  tech_architecture: 6000,
  legal_terms: 5000,
  image_generation: 1500,
  code_review: 10000,
  multi_llm_consult: 15000,
  spec_generation: 8000
};

class CostEstimator {
  constructor(currencyCache) {
    this.rates = currencyCache;
  }

  async estimate(task, complexity = 1.0, llmName = "mistral_medium_3_5") {
    const llm = LLM_POOL[llmName] || LLM_POOL.mistral_medium_3_5;
    const baseTokens = TOKEN_ESTIMATES[task] || 1000;
    const inputTokens = Math.round(baseTokens * complexity);
    const outputTokens = Math.round(inputTokens * 0.6); // ~60% output ratio
    const totalTokens = inputTokens + outputTokens;

    // Cost in USD
    const inputCost = (inputTokens / 1_000_000) * llm.priceInput;
    const outputCost = (outputTokens / 1_000_000) * llm.priceOutput;
    const totalUsd = inputCost + outputCost;

    // Convert to TON
    const tonUsd = await this.rates.getRate("ton_usd");
    const totalTon = totalUsd / tonUsd;

    return {
      llm: llmName,
      task,
      complexity,
      tokens: {
        input: inputTokens,
        output: outputTokens,
        total: totalTokens
      },
      cost: {
        usd: Math.round(totalUsd * 10000) / 10000,
        ton: Math.round(totalTon * 10000) / 10000,
        perToken: Math.round((totalUsd / totalTokens) * 1000000) / 1000000
      },
      rates: {
        ton_usd: tonUsd
      }
    };
  }

  async estimateMultiLLM(task, complexity = 1.0, llmNames) {
    const estimates = {};
    for (const name of llmNames) {
      estimates[name] = await this.estimate(task, complexity, name);
    }
    return estimates;
  }
}

// ═══════════════════════════════════════════════════════════
// EXPERIENCE DB — трекинг качества LLM через AstraDB
// ═══════════════════════════════════════════════════════════

class ExperienceDB {
  constructor(astraEndpoint, astraToken) {
    this.endpoint = astraEndpoint;
    this.token = astraToken;
    this.collection = "hermes_llm_experience";
  }

  async getTaskScores(task) {
    if (!this.endpoint || !this.token) return {};

    try {
      const resp = await fetch(
        `${this.endpoint}/api/json/v1/default_keyspace/${this.collection}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Token": this.token },
          body: JSON.stringify({
            find: { filter: { task } },
            options: { limit: 20 }
          })
        }
      );
      const data = await resp.json();
      const docs = data.data?.documents || [];

      // Aggregate scores per LLM
      const scores = {};
      for (const doc of docs) {
        const llm = doc.llmName;
        if (!scores[llm]) scores[llm] = { total: 0, count: 0 };
        scores[llm].total += doc.qualityScore || 0.5;
        scores[llm].count++;
      }

      // Average
      const result = {};
      for (const [llm, data] of Object.entries(scores)) {
        result[llm] = data.total / data.count;
      }
      return result;
    } catch {
      return {};
    }
  }

  async updateScore(task, llmName, qualityScore, metadata = {}) {
    if (!this.endpoint || !this.token) return;

    try {
      const docId = `exp_${task}_${llmName}_${Date.now()}`;
      await fetch(
        `${this.endpoint}/api/json/v1/default_keyspace/${this.collection}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "Token": this.token },
          body: JSON.stringify({
            insertOne: {
              document: {
                _id: docId,
                task,
                llmName,
                qualityScore,
                metadata,
                timestamp: new Date().toISOString()
              }
            }
          })
        }
      );
    } catch (error) {
      console.warn("[Experience] Failed to update:", error.message);
    }
  }

  async getBestLLM(task) {
    const scores = await this.getTaskScores(task);
    let bestName = null;
    let bestScore = 0;

    for (const [name, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestName = name;
      }
    }

    return { llmName: bestName, score: bestScore };
  }
}

// ═══════════════════════════════════════════════════════════
// INTENT ROUTER — классификация намерений клиента
// ═══════════════════════════════════════════════════════════

const INTENT_PROMPT = `Ты — классификатор интенций клиента платформы NeuroEscrow.
Проанализируй сообщение и определи:

1. intent: "contract_creation" | "information" | "conversation" | "generation" | "support"
2. confidence: 0.0-1.0
3. task_type: "tech_architecture" | "legal_terms" | "contract_draft" | "simple_question" | "image_generation" | "code_review" | "multi_llm_consult" | "spec_generation"
4. complexity: 0.1-2.0 (насколько задача сложная)
5. missing_contract_fields: массив полей которые ещё не заполнены ["title", "budget", "deadline", "description", "tech_stack", "payment_terms"]
6. suggested_modality: "text" | "image" | "code" | "search"
7. suggested_llms: массив рекомендуемых LLM из пула (максимум 3)

Верни ТОЛЬКО JSON без markdown. Пример:
{"intent":"contract_creation","confidence":0.9,"task_type":"contract_draft","complexity":1.2,"missing_contract_fields":["budget","deadline"],"suggested_modality":"text","suggested_llms":["claude_opus_4_7","glm_5_1","mistral_medium_3_5"]}`;

class IntentRouter {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.model = "mistral-medium-3.5";
  }

  async classify(message, contractState = {}) {
    const contextHint = contractState.phase
      ? `\nТекущая фаза контракта: ${contractState.phase}. Заполненные поля: ${JSON.stringify(contractState.fields || {})}`
      : "";

    try {
      const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: "system", content: INTENT_PROMPT },
            { role: "user", content: `Сообщение клиента: ${message}${contextHint}` }
          ],
          temperature: 0.1,
          max_tokens: 300,
          response_format: { type: "json_object" }
        })
      });

      if (!resp.ok) throw new Error(`API error: ${resp.status}`);
      const data = await resp.json();
      const parsed = JSON.parse(data.choices[0].message.content);

      return {
        intent: parsed.intent || "conversation",
        confidence: parsed.confidence || 0.5,
        task_type: parsed.task_type || "simple_question",
        complexity: parsed.complexity || 1.0,
        missing_fields: parsed.missing_contract_fields || [],
        suggested_modality: parsed.suggested_modality || "text",
        suggested_llms: parsed.suggested_llms || ["mistral_medium_3_5"],
        raw: parsed
      };
    } catch (error) {
      console.warn("[Intent] Classification failed:", error.message);
      return {
        intent: "conversation",
        confidence: 0.5,
        task_type: "simple_question",
        complexity: 1.0,
        missing_fields: [],
        suggested_modality: "text",
        suggested_llms: ["mistral_medium_3_5"],
        error: error.message
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════
// MULTI-LLM DISPATCH — параллельные запросы к разным LLM
// ═══════════════════════════════════════════════════════════

const PROVIDER_ENDPOINTS = {
  anthropic: {
    url: "https://api.anthropic.com/v1/messages",
    headers: (apiKey) => ({
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json"
    }),
    formatRequest: (model, messages, maxTokens) => ({
      model,
      max_tokens: maxTokens || 4000,
      messages: messages.map(m => ({ role: m.role === "system" ? "assistant" : m.role, content: m.content }))
    }),
    parseResponse: (data) => data.content?.[0]?.text || ""
  },
  mistral: {
    url: "https://api.mistral.ai/v1/chat/completions",
    headers: (apiKey) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }),
    formatRequest: (model, messages, maxTokens) => ({
      model,
      messages,
      max_tokens: maxTokens || 4000,
      temperature: 0.7
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ""
  },
  openai: {
    url: "https://api.openai.com/v1/chat/completions",
    headers: (apiKey) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }),
    formatRequest: (model, messages, maxTokens) => ({
      model,
      messages,
      max_tokens: maxTokens || 4000,
      temperature: 0.7
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ""
  },
  google: {
    url: (apiKey, model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    headers: () => ({ "Content-Type": "application/json" }),
    formatRequest: (model, messages, maxTokens) => ({
      contents: messages.map(m => ({ role: m.role === "system" ? "user" : m.role, parts: [{ text: m.content }] })),
      generationConfig: { maxOutputTokens: maxTokens || 4000, temperature: 0.7 }
    }),
    parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || ""
  },
  alibaba: {
    url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
    headers: (apiKey) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }),
    formatRequest: (model, messages, maxTokens) => ({
      model,
      messages,
      max_tokens: maxTokens || 4000,
      temperature: 0.7
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ""
  },
  deepseek: {
    url: "https://api.deepseek.com/v1/chat/completions",
    headers: (apiKey) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }),
    formatRequest: (model, messages, maxTokens) => ({
      model,
      messages,
      max_tokens: maxTokens || 4000,
      temperature: 0.7
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ""
  },
  zhipu: {
    url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
    headers: (apiKey) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }),
    formatRequest: (model, messages, maxTokens) => ({
      model,
      messages,
      max_tokens: maxTokens || 4000,
      temperature: 0.7
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ""
  },
  moonshot: {
    url: "https://api.moonshot.cn/v1/chat/completions",
    headers: (apiKey) => ({
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    }),
    formatRequest: (model, messages, maxTokens) => ({
      model,
      messages,
      max_tokens: maxTokens || 4000,
      temperature: 0.7
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content || ""
  }
};

class MultiLLMDispatch {
  constructor(apiKeys) {
    this.keys = apiKeys; // { anthropic: "...", openai: "...", google: "...", ... }
  }

  async dispatch(llmName, systemPrompt, userMessage, maxTokens = 4000) {
    const llm = LLM_POOL[llmName];
    if (!llm) throw new Error(`Unknown LLM: ${llmName}`);

    const provider = PROVIDER_ENDPOINTS[llm.provider];
    if (!provider) throw new Error(`Unknown provider: ${llm.provider}`);

    const apiKey = this.keys[llm.provider];
    if (!apiKey) throw new Error(`No API key for ${llm.provider}`);

    const url = typeof provider.url === "function" ? provider.url(apiKey, llm.model) : provider.url;
    const headers = provider.headers(apiKey);
    const body = provider.formatRequest(llm.model, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage }
    ], maxTokens);

    const startTime = Date.now();
    const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
    const latency = Date.now() - startTime;

    if (!resp.ok) {
      const errorText = await resp.text().catch(() => "");
      throw new Error(`${llm.provider} API error: ${resp.status} ${errorText}`);
    }

    const data = await resp.json();
    const content = provider.parseResponse(data);
    const tokensUsed = data.usage?.total_tokens || 0;

    return {
      llmName,
      provider: llm.provider,
      content,
      tokens: tokensUsed,
      latency,
      rank: llm.rank,
      score: llm.score
    };
  }

  async dispatchParallel(tasks) {
    // tasks = [{ llmName, systemPrompt, userMessage, maxTokens }]
    const results = await Promise.allSettled(
      tasks.map(t => this.dispatch(t.llmName, t.systemPrompt, t.userMessage, t.maxTokens))
    );

    const fulfilled = results
      .filter(r => r.status === "fulfilled")
      .map(r => r.value);

    const rejected = results
      .filter(r => r.status === "rejected")
      .map(r => r.reason);

    return { fulfilled, rejected };
  }
}

// ═══════════════════════════════════════════════════════════
// RESPONSE AGGREGATOR — сбор ответов в единый структурированный спец
// ═══════════════════════════════════════════════════════════

class ResponseAggregator {
  async aggregate(results, intent, contractState) {
    const spec = {
      version: "1.0",
      generated_at: new Date().toISOString(),
      intent,
      contract_state: contractState,
      consultations: [],
      aggregated_response: "",
      recommendations: [],
      cost_summary: {
        total_tokens: 0,
        total_usd: 0,
        total_ton: 0,
        llms_used: []
      }
    };

    for (const result of results.fulfilled || []) {
      spec.consultations.push({
        llm: result.llmName,
        provider: result.provider,
        rank: result.rank,
        score: result.score,
        tokens: result.tokens,
        latency: result.latency,
        content_preview: result.content.substring(0, 200)
      });

      spec.cost_summary.total_tokens += result.tokens;
      spec.cost_summary.llms_used.push(result.llmName);
    }

    // Generate aggregated response using best LLM
    if (results.fulfilled?.length > 0) {
      const best = results.fulfilled.reduce((a, b) => (b.score || 0) > (a.score || 0) ? b : a);
      spec.aggregated_response = best.content;
      spec.primary_llm = best.llmName;
    }

    // Extract recommendations
    if (results.fulfilled?.length > 1) {
      const allContent = results.fulfilled.map(r => r.content).join("\n\n---\n\n");
      spec.recommendations = this.extractRecommendations(allContent);
    }

    return spec;
  }

  extractRecommendations(content) {
    // Simple extraction: look for bullet points, numbered lists
    const lines = content.split("\n");
    const recs = [];
    for (const line of lines) {
      const trimmed = line.trim();
      if (/^[\d\*\-\•]+\s/.test(trimmed) && trimmed.length > 10 && trimmed.length < 300) {
        recs.push(trimmed.replace(/^[\d\*\-\•]+\s*/, ""));
      }
    }
    return recs.slice(0, 10);
  }
}

// ═══════════════════════════════════════════════════════════
// HERMES ROUTER — главный класс (Facade)
// ═══════════════════════════════════════════════════════════

export class HermesRouter {
  constructor(env) {
    this.apiKeys = {
      mistral: env?.MISTRAL_API_KEY,
      anthropic: env?.ANTHROPIC_API_KEY,
      openai: env?.OPENAI_API_KEY,
      google: env?.GOOGLE_API_KEY,
      alibaba: env?.DASHSCOPE_API_KEY,
      deepseek: env?.DEEPSEEK_API_KEY,
      zhipu: env?.ZHIPU_API_KEY,
      moonshot: env?.MOONSHOT_API_KEY
    };

    this.currencyCache = new CurrencyCache(env?.CACHE);
    this.costEstimator = new CostEstimator(this.currencyCache);
    this.experienceDB = new ExperienceDB(env?.ASTRA_DB_ENDPOINT, env?.ASTRA_DB_TOKEN);
    this.intentRouter = new IntentRouter(env?.MISTRAL_API_KEY);
    this.dispatch = new MultiLLMDispatch(this.apiKeys);
    this.aggregator = new ResponseAggregator();

    // Stats
    this.totalRequests = 0;
    this.totalCostUSD = 0;
    this.totalTokens = 0;
  }

  async processRequest(message, contractState = {}) {
    this.totalRequests++;

    // 1. Classify intent
    const intent = await this.intentRouter.classify(message, contractState);

    // 2. Select best LLM(s)
    const llmSelection = await this.selectLLMs(intent);

    // 3. Estimate cost
    const costEstimate = await this.costEstimator.estimate(
      intent.task_type,
      intent.complexity,
      llmSelection.primary
    );

    // 4. Dispatch to LLM(s)
    const dispatchResults = await this.dispatchToLLMs(intent, llmSelection, message);

    // 5. Aggregate response
    const spec = await this.aggregator.aggregate(dispatchResults, intent, contractState);

    // 6. Update experience
    for (const result of dispatchResults.fulfilled || []) {
      await this.experienceDB.updateScore(
        intent.task_type,
        result.llmName,
        0.7, // Default score, will be updated by feedback
        { latency: result.latency, tokens: result.tokens }
      );
    }

    // 7. Update stats
    this.totalTokens += spec.cost_summary.total_tokens;

    return {
      intent,
      cost_estimate: costEstimate,
      spec,
      llm_selection: llmSelection,
      rates: await this.currencyCache.getAllRates()
    };
  }

  async selectLLMs(intent) {
    // Get experience-based scores
    const expScores = await this.experienceDB.getTaskScores(intent.task_type);

    // Score each LLM — filter out those without API keys
    const candidates = Object.entries(LLM_POOL).map(([name, llm]) => {
      // Skip if no API key for this provider
      if (!this.apiKeys[llm.provider]) return null;
      if (llm.modality !== "text" && intent.suggested_modality === "text") return null;
      if (!llm.strengths.includes(intent.task_type) && llm.rank > 10) return null;

      const strengthScore = llm.strengths.includes(intent.task_type) ? 0.9 : 0.5;
      const expScore = expScores[name] || 0.5;
      const rankScore = llm.rank ? (20 - llm.rank) / 20 : 0.5;

      return {
        name,
        score: (strengthScore * 0.3) + (expScore * 0.4) + (rankScore * 0.3),
        llm
      };
    }).filter(Boolean).sort((a, b) => b.score - a.score);

    return {
      primary: candidates[0]?.name || "mistral_medium_3_5",
      secondary: candidates.slice(1, 3).map(c => c.name),
      all: candidates.slice(0, 5).map(c => c.name)
    };
  }

  async dispatchToLLMs(intent, llmSelection, message) {
    const tasks = [];

    // Primary LLM — always dispatch
    const primaryLLM = LLM_POOL[llmSelection.primary];
    tasks.push({
      llmName: llmSelection.primary,
      systemPrompt: this.getSystemPrompt(intent, primaryLLM),
      userMessage: message,
      maxTokens: 4000
    });

    // Secondary LLMs — only for complex tasks
    if (intent.complexity > 1.2 && llmSelection.secondary.length > 0) {
      for (const name of llmSelection.secondary.slice(0, 2)) {
        const llm = LLM_POOL[name];
        tasks.push({
          llmName: name,
          systemPrompt: this.getSystemPrompt(intent, llm),
          userMessage: message,
          maxTokens: 3000
        });
      }
    }

    return await this.dispatch.dispatchParallel(tasks);
  }

  getSystemPrompt(intent, llm) {
    const basePrompts = {
      contract_creation: `Ты — эксперт по созданию смарт-контрактов NeuroEscrow. Помоги клиенту структурировать ТЗ для нейрокодера. Задавай уточняющие вопросы, предлагай оптимальный стек технологий, оценивай реалистичность сроков и бюджета.`,
      information: `Ты — эксперт платформы NeuroEscrow. Отвечай на вопросы клиентов о смарт-контрактах, эскроу, нейрокодинге.`,
      conversation: `Ты — Гермес, AI-ассистент NeuroEscrow. Дружелюбно общайся с клиентом, помогай с созданием сделок.`,
      generation: `Ты — генеративный AI. Создавай контент (код, схемы, описания) для смарт-контрактов NeuroEscrow.`,
      support: `Ты — техподдержка NeuroEscrow. Помогай решать проблемы клиентов.`
    };

    const base = basePrompts[intent.intent] || basePrompts.conversation;
    return `${base}\n\nИспользуй модель: ${llm.model}. Отвечай на русском языке.`;
  }

  async getRates() {
    return await this.currencyCache.getAllRates();
  }

  getStats() {
    return {
      total_requests: this.totalRequests,
      total_tokens: this.totalTokens,
      total_cost_usd: Math.round(this.totalCostUSD * 10000) / 10000,
      llm_pool_size: Object.keys(LLM_POOL).length,
      providers: [...new Set(Object.values(LLM_POOL).map(l => l.provider))]
    };
  }

  getLLMPool() {
    return Object.entries(LLM_POOL).map(([name, llm]) => ({
      name,
      provider: llm.provider,
      rank: llm.rank,
      score: llm.score,
      priceInput: llm.priceInput,
      priceOutput: llm.priceOutput,
      context: llm.context,
      strengths: llm.strengths,
      speed: llm.speed,
      modality: llm.modality
    }));
  }
}
