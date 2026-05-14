/**
 * RAG System - JavaScript Edition
 * Uses Gemini Embedding 2 Preview (3072d) + AstraDB
 * Migrated from Mistral Codestral Embed (1536d) — A1 Phase
 */

import { GeminiEmbeddings } from './embeddings.js';
import { AstraDBConnector } from './astra.js';

export class HermesRAG {
  constructor(kvCache, env) {
    this.embeddings = new GeminiEmbeddings(kvCache, env);
    this.astra = new AstraDBConnector(env);
    this.chunkSize = 2000;
    this.chunkOverlap = 700;
  }
  
  async searchCodebase(query, limit = 4, language = null, filename = null) {
    const queryEmbedding = await this.embeddings.embed(query);
    
    const filter = {};
    if (language) filter.language = language;
    if (filename) filter.filename = filename;
    
    return await this.astra.vectorSearch(
      this.astra.CODEBASE_COLLECTION,
      queryEmbedding,
      limit,
      Object.keys(filter).length > 0 ? filter : null,
      true
    );
  }
  
  async addMemory(userId, sessionId, content, memoryType = 'conversation') {
    const embedding = await this.embeddings.embed(content);
    
    const document = {
      user_id: userId,
      session_id: sessionId,
      content,
      memory_type: memoryType,
      timestamp: new Date().toISOString()
    };
    
    return await this.astra.insertDocument(
      this.astra.MEMORY_COLLECTION,
      document,
      embedding
    );
  }
  
  async searchMemory(query, userId = null, limit = 3) {
    const queryEmbedding = await this.embeddings.embed(query);
    
    const filter = {};
    if (userId) filter.user_id = userId;
    
    return await this.astra.vectorSearch(
      this.astra.MEMORY_COLLECTION,
      queryEmbedding,
      limit,
      Object.keys(filter).length > 0 ? filter : null
    );
  }
  
  async getStats() {
    return {
      codebase: await this.astra.getStats(this.astra.CODEBASE_COLLECTION),
      memory: await this.astra.getStats(this.astra.MEMORY_COLLECTION)
    };
  }
}
