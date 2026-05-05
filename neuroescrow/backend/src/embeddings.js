/**
 * Mistral Embeddings - JavaScript Edition
 * Uses codestral-embed-2505 (1536 dimensions)
 */

export class MistralEmbeddings {
  constructor(kvCache, env) {
    this.apiKey = env?.MISTRAL_API_KEY;
    if (!this.apiKey) {
      throw new Error('MISTRAL_API_KEY not found in environment');
    }
    this.model = env?.EMBEDDING_MODEL || 'codestral-embed-2505';
    this.dimension = parseInt(env?.EMBEDDING_DIMENSION || '1536');
    this.kvCache = kvCache;
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
    
    // Call Mistral API
    const response = await fetch('https://api.mistral.ai/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        input: [text]
      })
    });
    
    if (!response.ok) {
      throw new Error(`Mistral Embeddings API error: ${response.status}`);
    }
    
    const data = await response.json();
    const embedding = data.data[0].embedding;
    
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
    
    // Batch call for uncached texts
    if (uncachedTexts.length > 0) {
      const response = await fetch('https://api.mistral.ai/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          input: uncachedTexts
        })
      });
      
      if (!response.ok) {
        throw new Error(`Mistral Embeddings API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Fill in uncached embeddings
      for (let i = 0; i < data.data.length; i++) {
        const embedding = data.data[i].embedding;
        const idx = uncachedIndices[i];
        embeddings[idx] = embedding;
        await this.saveToCache(uncachedTexts[i], embedding);
      }
    }
    
    return embeddings;
  }
}
