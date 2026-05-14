/**
 * Gemini Embeddings - JavaScript Edition
 * Uses gemini-embedding-2-preview (3072 dimensions)
 * Migrated from Mistral codestral-embed-2505 (1536d) — A1 Phase
 */

export class GeminiEmbeddings {
  constructor(kvCache, env) {
    this.apiKey = env?.GOOGLE_API_KEY || env?.GEMINI_API_KEY;
    if (!this.apiKey) {
      throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY not found in environment');
    }
    this.model = env?.EMBEDDING_MODEL || 'gemini-embedding-2-preview';
    this.dimension = parseInt(env?.EMBEDDING_DIMENSION || '3072');
    this.kvCache = kvCache;
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
  }

  getCacheKey(text) {
    return `emb:${this.hashString(text).substring(0, 16)}`;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  async getFromCache(text) {
    if (!this.kvCache) return null;

    try {
      const cacheKey = this.getCacheKey(text);
      const cached = await this.kvCache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      // Ignore cache errors
    }

    return null;
  }

  async saveToCache(text, embedding) {
    if (!this.kvCache) return;

    try {
      const cacheKey = this.getCacheKey(text);
      // Cache for 7 days
      await this.kvCache.put(cacheKey, JSON.stringify(embedding), {
        expirationTtl: 604800
      });
    } catch (error) {
      // Ignore cache errors
    }
  }

  async embed(text) {
    // Check cache
    const cached = await this.getFromCache(text);
    if (cached) return cached;

    // Call Gemini Embedding API
    const url = `${this.baseUrl}/${this.model}:embedContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: `models/${this.model}`,
        content: {
          parts: [{ text }]
        }
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Gemini Embeddings API error: ${response.status} — ${errorBody}`);
    }

    const data = await response.json();
    const embedding = data.embedding?.values;

    if (!embedding || embedding.length !== this.dimension) {
      throw new Error(`Unexpected embedding dimension: ${embedding?.length}, expected ${this.dimension}`);
    }

    // Save to cache
    await this.saveToCache(text, embedding);

    return embedding;
  }

  async embedBatch(texts) {
    const embeddings = [];
    const uncachedTexts = [];
    const uncachedIndices = [];

    // Check cache for each text
    for (let i = 0; i < texts.length; i++) {
      const cached = await this.getFromCache(texts[i]);
      if (cached) {
        embeddings.push(cached);
      } else {
        embeddings.push(null);
        uncachedTexts.push(texts[i]);
        uncachedIndices.push(i);
      }
    }

    // Batch call for uncached texts (Gemini batchEmbedContents)
    if (uncachedTexts.length > 0) {
      // Gemini batch API supports up to 100 texts per request
      for (let batchStart = 0; batchStart < uncachedTexts.length; batchStart += 100) {
        const batchTexts = uncachedTexts.slice(batchStart, batchStart + 100);
        const batchIndices = uncachedIndices.slice(batchStart, batchStart + 100);

        const url = `${this.baseUrl}/${this.model}:batchEmbedContents?key=${this.apiKey}`;

        const requests = batchTexts.map(text => ({
          model: `models/${this.model}`,
          content: {
            parts: [{ text }]
          }
        }));

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ requests })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Gemini Batch Embeddings API error: ${response.status} — ${errorBody}`);
        }

        const data = await response.json();
        const batchEmbeddings = data.embeddings || [];

        // Fill in uncached embeddings
        for (let j = 0; j < batchEmbeddings.length; j++) {
          const embedding = batchEmbeddings[j].values;
          const idx = batchIndices[j];
          embeddings[idx] = embedding;
          await this.saveToCache(batchTexts[j], embedding);
        }
      }
    }

    return embeddings;
  }
}
