This file is a merged representation of a subset of the codebase, containing specifically included files and files not matching ignore patterns, combined into a single document by Repomix.
The content has been processed where line numbers have been added.

<file_summary>
This section contains a summary of this file.

<purpose>
This file contains a packed representation of a subset of the repository's contents that is considered the most important context.
It is designed to be easily consumable by AI systems for analysis, code review,
or other automated processes.
</purpose>

<file_format>
The content is organized as follows:
1. This summary section
2. Repository information
3. Directory structure
4. Repository files (if enabled)
5. Multiple file entries, each consisting of:
  - File path as an attribute
  - Full contents of the file
</file_format>

<usage_guidelines>
- This file should be treated as read-only. Any changes should be made to the
  original repository files, not this packed version.
- When processing this file, use the file path to distinguish
  between different files in the repository.
- Be aware that this file may contain sensitive information. Handle it with
  the same level of security as you would the original repository.
</usage_guidelines>

<notes>
- Some files may have been excluded based on .gitignore rules and Repomix's configuration
- Binary files are not included in this packed representation. Please refer to the Repository Structure section for a complete list of file paths, including binary files
- Only files matching these patterns are included: **/*.py, **/*.html, **/*.css, **/*.js, index.html, css/style.css, js/app.js, js/telegram.js, js/charts.js, backend/src/**/*.py
- Files matching these patterns are excluded: node_modules/**, __pycache__/**, *.pyc, .venv/**, venv/**, dist/**, build/**, *.log, .env*, *.key, *.pem, wrangler.toml, repomix-output.md, reports/**, backend/RAG_CONFIG.md, backend/QUESTION_FOR_GROK.md, backend/README.md, backend/astra_connector.py, backend/memory/**, backend/scripts/**
- Files matching patterns in .gitignore are excluded
- Files matching default ignore patterns are excluded
- Line numbers have been added to the beginning of each line
- Files are sorted by Git change count (files with more changes are at the bottom)
</notes>

</file_summary>

<directory_structure>
backend/src/astra.js
backend/src/astra.py
backend/src/embeddings.js
backend/src/embeddings.py
backend/src/hermes.js
backend/src/hermes.py
backend/src/index.js
backend/src/index.py
backend/src/moderation.js
backend/src/moderation.py
backend/src/rag.js
backend/src/rag.py
backend/src/telegram.js
css/style.css
index.html
js/app.js
js/charts.js
js/telegram.js
js/tonconnect.js
</directory_structure>

<files>
This section contains the contents of the repository's files.

<file path="backend/src/astra.js">
  1: /**
  2:  * AstraDB Connector - JavaScript Edition
  3:  */
  4: 
  5: export class AstraDBConnector {
  6:   constructor(env) {
  7:     this.token = env?.ASTRA_DB_TOKEN;
  8:     this.endpoint = env?.ASTRA_DB_ENDPOINT;
  9:     
 10:     if (!this.token || !this.endpoint) {
 11:       throw new Error(`AstraDB credentials missing: token=${!!this.token}, endpoint=${!!this.endpoint}`);
 12:     }
 13:     
 14:     this.CODEBASE_COLLECTION = 'neuroescrow_codebase_3072';
 15:     this.MEMORY_COLLECTION = 'neuroescrow_memory_3072';
 16:     this.GESTURES_COLLECTION = 'gestures_semantic_3072';
 17:     this.DOV_LOG_COLLECTION = 'gestures_dov_log';
 18:   }
 19:   
 20:   async insertDocument(collectionName, document, vector = null) {
 21:     const url = `${this.endpoint}/api/json/v1/default_keyspace/${collectionName}`;
 22:     
 23:     const payload = {
 24:       insertOne: {
 25:         document: {
 26:           ...document,
 27:           ...(vector ? { $vector: vector } : {})
 28:         }
 29:       }
 30:     };
 31:     
 32:     const response = await fetch(url, {
 33:       method: 'POST',
 34:       headers: {
 35:         'Token': this.token,
 36:         'Content-Type': 'application/json'
 37:       },
 38:       body: JSON.stringify(payload)
 39:     });
 40:     
 41:     if (!response.ok) {
 42:       throw new Error(`AstraDB insert error: ${response.status}`);
 43:     }
 44:     
 45:     const data = await response.json();
 46:     return data.status?.insertedIds?.[0];
 47:   }
 48:   
 49:   async vectorSearch(collectionName, queryVector, limit = 5, filter = null, includeSimilarity = true) {
 50:     const url = `${this.endpoint}/api/json/v1/default_keyspace/${collectionName}`;
 51:     
 52:     const payload = {
 53:       find: {
 54:         sort: { $vector: queryVector },
 55:         options: {
 56:           limit,
 57:           includeSimilarity
 58:         }
 59:       }
 60:     };
 61:     
 62:     if (filter) {
 63:       payload.find.filter = filter;
 64:     }
 65:     
 66:     const response = await fetch(url, {
 67:       method: 'POST',
 68:       headers: {
 69:         'Token': this.token,
 70:         'Content-Type': 'application/json'
 71:       },
 72:       body: JSON.stringify(payload)
 73:     });
 74:     
 75:     if (!response.ok) {
 76:       throw new Error(`AstraDB search error: ${response.status}`);
 77:     }
 78:     
 79:     const data = await response.json();
 80:     return data.data?.documents || [];
 81:   }
 82:   
 83:   async deleteByFilter(collectionName, filter) {
 84:     const url = `${this.endpoint}/api/json/v1/default_keyspace/${collectionName}`;
 85:     
 86:     const payload = {
 87:       deleteMany: { filter }
 88:     };
 89:     
 90:     const response = await fetch(url, {
 91:       method: 'POST',
 92:       headers: {
 93:         'Token': this.token,
 94:         'Content-Type': 'application/json'
 95:       },
 96:       body: JSON.stringify(payload)
 97:     });
 98:     
 99:     if (!response.ok) {
100:       throw new Error(`AstraDB delete error: ${response.status}`);
101:     }
102:     
103:     const data = await response.json();
104:     return data.status?.deletedCount || 0;
105:   }
106:   
107:   async getStats(collectionName) {
108:     const url = `${this.endpoint}/api/json/v1/default_keyspace/${collectionName}`;
109:     
110:     const payload = {
111:       countDocuments: {}
112:     };
113:     
114:     const response = await fetch(url, {
115:       method: 'POST',
116:       headers: {
117:         'Token': this.token,
118:         'Content-Type': 'application/json'
119:       },
120:       body: JSON.stringify(payload)
121:     });
122:     
123:     if (!response.ok) {
124:       return {
125:         collection: collectionName,
126:         document_count: 0,
127:         status: 'error'
128:       };
129:     }
130:     
131:     const data = await response.json();
132:     const count = data.status?.count || 0;
133:     
134:     return {
135:       collection: collectionName,
136:       document_count: count,
137:       status: 'healthy'
138:     };
139:   }
140: }
</file>

<file path="backend/src/astra.py">
  1: """
  2: AstraDB Connector for Hermes NeuroEscrow
  3: Uses DataAPIClient (2026 standard) with isolated collections
  4: """
  5: import os
  6: from typing import Optional, List, Dict, Any
  7: from astrapy import DataAPIClient
  8: from astrapy.constants import VectorMetric
  9: 
 10: 
 11: class AstraDBConnector:
 12:     """Modern AstraDB connector using DataAPIClient (2026)"""
 13:     
 14:     _instance: Optional['AstraDBConnector'] = None
 15:     
 16:     def __new__(cls):
 17:         if cls._instance is None:
 18:             cls._instance = super().__new__(cls)
 19:         return cls._instance
 20:     
 21:     def __init__(self):
 22:         if hasattr(self, '_initialized'):
 23:             return
 24:         
 25:         self.token = os.getenv('ASTRA_DB_TOKEN')
 26:         self.endpoint = os.getenv('ASTRA_DB_ENDPOINT')
 27:         
 28:         if not self.token or not self.endpoint:
 29:             raise ValueError("ASTRA_DB_TOKEN and ASTRA_DB_ENDPOINT must be set")
 30:         
 31:         # Initialize DataAPIClient
 32:         self.client = DataAPIClient(self.token)
 33:         self.db = self.client.get_database(self.endpoint)
 34:         
 35:         # Collection names (isolated from main holograms.media)
 36:         self.CODEBASE_COLLECTION = "neuroescrow_codebase_3072"
 37:         self.MEMORY_COLLECTION = "neuroescrow_memory_3072"
 38:         
 39:         self._initialized = True
 40:     
 41:     def _ensure_collection(self, collection_name: str, dimension: int = 3072):
 42:         """Ensure collection exists with proper vector configuration"""
 43:         try:
 44:             return self.db.get_collection(collection_name)
 45:         except Exception:
 46:             return self.db.create_collection(
 47:                 collection_name,
 48:                 dimension=dimension,
 49:                 metric=VectorMetric.COSINE
 50:             )
 51:     
 52:     def get_codebase_collection(self):
 53:         """Get or create codebase collection"""
 54:         return self._ensure_collection(self.CODEBASE_COLLECTION)
 55:     
 56:     def get_memory_collection(self):
 57:         """Get or create memory collection"""
 58:         return self._ensure_collection(self.MEMORY_COLLECTION)
 59:     
 60:     def insert_document(self, collection_name: str, document: Dict[str, Any], vector: Optional[List[float]] = None) -> str:
 61:         """Insert document with optional vector"""
 62:         collection = self._ensure_collection(collection_name)
 63:         
 64:         if vector:
 65:             document['$vector'] = vector
 66:         
 67:         result = collection.insert_one(document)
 68:         return result.inserted_id
 69:     
 70:     def vector_search(
 71:         self,
 72:         collection_name: str,
 73:         query_vector: List[float],
 74:         limit: int = 5,
 75:         filter_dict: Optional[Dict[str, Any]] = None,
 76:         include_similarity: bool = True
 77:     ) -> List[Dict[str, Any]]:
 78:         """Perform vector similarity search"""
 79:         collection = self._ensure_collection(collection_name)
 80:         
 81:         cursor = collection.find(
 82:             filter=filter_dict or {},
 83:             sort={"$vector": query_vector},
 84:             limit=limit,
 85:             include_similarity=include_similarity
 86:         )
 87:         
 88:         return list(cursor)
 89:     
 90:     def delete_by_filter(self, collection_name: str, filter_dict: Dict[str, Any]) -> int:
 91:         """Delete documents matching filter"""
 92:         collection = self._ensure_collection(collection_name)
 93:         result = collection.delete_many(filter_dict)
 94:         return result.deleted_count
 95:     
 96:     def get_stats(self, collection_name: str) -> Dict[str, Any]:
 97:         """Get collection statistics"""
 98:         collection = self._ensure_collection(collection_name)
 99:         count = collection.count_documents({})
100:         
101:         return {
102:             "collection": collection_name,
103:             "document_count": count,
104:             "status": "healthy"
105:         }
106: 
107: 
108: def get_astra_connector() -> AstraDBConnector:
109:     """Get singleton AstraDB connector instance"""
110:     return AstraDBConnector()
</file>

<file path="backend/src/embeddings.js">
  1: /**
  2:  * Gemini Embeddings - JavaScript Edition
  3:  * Uses gemini-embedding-2-preview (3072 dimensions)
  4:  * Migrated from Mistral codestral-embed-2505 (1536d) — A1 Phase
  5:  */
  6: 
  7: export class GeminiEmbeddings {
  8:   constructor(kvCache, env) {
  9:     this.apiKey = env?.GOOGLE_API_KEY || env?.GEMINI_API_KEY;
 10:     if (!this.apiKey) {
 11:       throw new Error('GOOGLE_API_KEY or GEMINI_API_KEY not found in environment');
 12:     }
 13:     this.model = env?.EMBEDDING_MODEL || 'gemini-embedding-2-preview';
 14:     this.dimension = parseInt(env?.EMBEDDING_DIMENSION || '3072');
 15:     this.kvCache = kvCache;
 16:     this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models';
 17:   }
 18: 
 19:   getCacheKey(text) {
 20:     return `emb:${this.hashString(text).substring(0, 16)}`;
 21:   }
 22: 
 23:   hashString(str) {
 24:     let hash = 0;
 25:     for (let i = 0; i < str.length; i++) {
 26:       const char = str.charCodeAt(i);
 27:       hash = ((hash << 5) - hash) + char;
 28:       hash = hash & hash;
 29:     }
 30:     return Math.abs(hash).toString(16);
 31:   }
 32: 
 33:   async getFromCache(text) {
 34:     if (!this.kvCache) return null;
 35: 
 36:     try {
 37:       const cacheKey = this.getCacheKey(text);
 38:       const cached = await this.kvCache.get(cacheKey);
 39:       if (cached) {
 40:         return JSON.parse(cached);
 41:       }
 42:     } catch (error) {
 43:       // Ignore cache errors
 44:     }
 45: 
 46:     return null;
 47:   }
 48: 
 49:   async saveToCache(text, embedding) {
 50:     if (!this.kvCache) return;
 51: 
 52:     try {
 53:       const cacheKey = this.getCacheKey(text);
 54:       // Cache for 7 days
 55:       await this.kvCache.put(cacheKey, JSON.stringify(embedding), {
 56:         expirationTtl: 604800
 57:       });
 58:     } catch (error) {
 59:       // Ignore cache errors
 60:     }
 61:   }
 62: 
 63:   async embed(text) {
 64:     // Check cache
 65:     const cached = await this.getFromCache(text);
 66:     if (cached) return cached;
 67: 
 68:     // Call Gemini Embedding API
 69:     const url = `${this.baseUrl}/${this.model}:embedContent?key=${this.apiKey}`;
 70: 
 71:     const response = await fetch(url, {
 72:       method: 'POST',
 73:       headers: {
 74:         'Content-Type': 'application/json'
 75:       },
 76:       body: JSON.stringify({
 77:         model: `models/${this.model}`,
 78:         content: {
 79:           parts: [{ text }]
 80:         }
 81:       })
 82:     });
 83: 
 84:     if (!response.ok) {
 85:       const errorBody = await response.text();
 86:       throw new Error(`Gemini Embeddings API error: ${response.status} — ${errorBody}`);
 87:     }
 88: 
 89:     const data = await response.json();
 90:     const embedding = data.embedding?.values;
 91: 
 92:     if (!embedding || embedding.length !== this.dimension) {
 93:       throw new Error(`Unexpected embedding dimension: ${embedding?.length}, expected ${this.dimension}`);
 94:     }
 95: 
 96:     // Save to cache
 97:     await this.saveToCache(text, embedding);
 98: 
 99:     return embedding;
100:   }
101: 
102:   async embedBatch(texts) {
103:     const embeddings = [];
104:     const uncachedTexts = [];
105:     const uncachedIndices = [];
106: 
107:     // Check cache for each text
108:     for (let i = 0; i < texts.length; i++) {
109:       const cached = await this.getFromCache(texts[i]);
110:       if (cached) {
111:         embeddings.push(cached);
112:       } else {
113:         embeddings.push(null);
114:         uncachedTexts.push(texts[i]);
115:         uncachedIndices.push(i);
116:       }
117:     }
118: 
119:     // Batch call for uncached texts (Gemini batchEmbedContents)
120:     if (uncachedTexts.length > 0) {
121:       // Gemini batch API supports up to 100 texts per request
122:       for (let batchStart = 0; batchStart < uncachedTexts.length; batchStart += 100) {
123:         const batchTexts = uncachedTexts.slice(batchStart, batchStart + 100);
124:         const batchIndices = uncachedIndices.slice(batchStart, batchStart + 100);
125: 
126:         const url = `${this.baseUrl}/${this.model}:batchEmbedContents?key=${this.apiKey}`;
127: 
128:         const requests = batchTexts.map(text => ({
129:           model: `models/${this.model}`,
130:           content: {
131:             parts: [{ text }]
132:           }
133:         }));
134: 
135:         const response = await fetch(url, {
136:           method: 'POST',
137:           headers: {
138:             'Content-Type': 'application/json'
139:           },
140:           body: JSON.stringify({ requests })
141:         });
142: 
143:         if (!response.ok) {
144:           const errorBody = await response.text();
145:           throw new Error(`Gemini Batch Embeddings API error: ${response.status} — ${errorBody}`);
146:         }
147: 
148:         const data = await response.json();
149:         const batchEmbeddings = data.embeddings || [];
150: 
151:         // Fill in uncached embeddings
152:         for (let j = 0; j < batchEmbeddings.length; j++) {
153:           const embedding = batchEmbeddings[j].values;
154:           const idx = batchIndices[j];
155:           embeddings[idx] = embedding;
156:           await this.saveToCache(batchTexts[j], embedding);
157:         }
158:       }
159:     }
160: 
161:     return embeddings;
162:   }
163: }
</file>

<file path="backend/src/embeddings.py">
  1: """
  2: Gemini Embeddings with KV Cache
  3: Uses gemini-embedding-2-preview (3072 dimensions)
  4: Migrated from Mistral codestral-embed-2505 (1536d) — A1 Phase
  5: """
  6: import os
  7: import hashlib
  8: import json
  9: from typing import List, Optional
 10: import httpx
 11: 
 12: 
 13: class GeminiEmbeddings:
 14:     """Gemini embeddings client with KV caching"""
 15: 
 16:     def __init__(self, kv_cache=None):
 17:         self.api_key = os.getenv('GOOGLE_API_KEY') or os.getenv('GEMINI_API_KEY')
 18:         if not self.api_key:
 19:             raise ValueError("GOOGLE_API_KEY or GEMINI_API_KEY must be set")
 20: 
 21:         self.model = os.getenv('EMBEDDING_MODEL', 'gemini-embedding-2-preview')
 22:         self.dimension = int(os.getenv('EMBEDDING_DIMENSION', '3072'))
 23:         self.kv_cache = kv_cache
 24: 
 25:         self.base_url = "https://generativelanguage.googleapis.com/v1beta/models"
 26: 
 27:     def _get_cache_key(self, text: str) -> str:
 28:         """Generate cache key from text"""
 29:         return f"emb:{hashlib.sha256(text.encode()).hexdigest()[:16]}"
 30: 
 31:     def _get_from_cache(self, text: str) -> Optional[List[float]]:
 32:         """Get embedding from KV cache"""
 33:         if not self.kv_cache:
 34:             return None
 35: 
 36:         try:
 37:             cache_key = self._get_cache_key(text)
 38:             cached = self.kv_cache.get(cache_key)
 39:             if cached:
 40:                 return json.loads(cached)
 41:         except Exception:
 42:             pass
 43: 
 44:         return None
 45: 
 46:     def _save_to_cache(self, text: str, embedding: List[float]):
 47:         """Save embedding to KV cache"""
 48:         if not self.kv_cache:
 49:             return
 50: 
 51:         try:
 52:             cache_key = self._get_cache_key(text)
 53:             # Cache for 7 days
 54:             self.kv_cache.put(cache_key, json.dumps(embedding), expiration_ttl=604800)
 55:         except Exception:
 56:             pass
 57: 
 58:     def embed(self, text: str) -> List[float]:
 59:         """Generate embedding for single text"""
 60:         # Check cache first
 61:         cached = self._get_from_cache(text)
 62:         if cached:
 63:             return cached
 64: 
 65:         # Call Gemini Embedding API
 66:         url = f"{self.base_url}/{self.model}:embedContent"
 67:         with httpx.Client(timeout=30.0) as client:
 68:             response = client.post(
 69:                 url,
 70:                 params={"key": self.api_key},
 71:                 json={
 72:                     "model": f"models/{self.model}",
 73:                     "content": {
 74:                         "parts": [{"text": text}]
 75:                     }
 76:                 }
 77:             )
 78:             response.raise_for_status()
 79: 
 80:             data = response.json()
 81:             embedding = data.get("embedding", {}).get("values", [])
 82: 
 83:             if len(embedding) != self.dimension:
 84:                 raise ValueError(f"Unexpected embedding dimension: {len(embedding)}, expected {self.dimension}")
 85: 
 86:             # Save to cache
 87:             self._save_to_cache(text, embedding)
 88: 
 89:             return embedding
 90: 
 91:     def embed_batch(self, texts: List[str]) -> List[List[float]]:
 92:         """Generate embeddings for multiple texts using batchEmbedContents"""
 93:         embeddings = []
 94:         uncached_texts = []
 95:         uncached_indices = []
 96: 
 97:         # Check cache for each text
 98:         for i, text in enumerate(texts):
 99:             cached = self._get_from_cache(text)
100:             if cached:
101:                 embeddings.append(cached)
102:             else:
103:                 embeddings.append(None)
104:                 uncached_texts.append(text)
105:                 uncached_indices.append(i)
106: 
107:         # Batch call for uncached texts (max 100 per request)
108:         if uncached_texts:
109:             for batch_start in range(0, len(uncached_texts), 100):
110:                 batch_texts = uncached_texts[batch_start:batch_start + 100]
111:                 batch_indices = uncached_indices[batch_start:batch_start + 100]
112: 
113:                 url = f"{self.base_url}/{self.model}:batchEmbedContents"
114:                 requests = [
115:                     {
116:                         "model": f"models/{self.model}",
117:                         "content": {
118:                             "parts": [{"text": text}]
119:                         }
120:                     }
121:                     for text in batch_texts
122:                 ]
123: 
124:                 with httpx.Client(timeout=60.0) as client:
125:                     response = client.post(
126:                         url,
127:                         params={"key": self.api_key},
128:                         json={"requests": requests}
129:                     )
130:                     response.raise_for_status()
131: 
132:                     data = response.json()
133:                     batch_data = data.get("embeddings", [])
134: 
135:                     # Fill in uncached embeddings and save to cache
136:                     for j, emb_data in enumerate(batch_data):
137:                         embedding = emb_data.get("values", [])
138:                         idx = batch_indices[j]
139:                         embeddings[idx] = embedding
140:                         self._save_to_cache(batch_texts[j], embedding)
141: 
142:         return embeddings
143: 
144: 
145: def get_embeddings_client(kv_cache=None) -> GeminiEmbeddings:
146:     """Get Gemini embeddings client"""
147:     return GeminiEmbeddings(kv_cache=kv_cache)
</file>

<file path="backend/src/hermes.js">
  1: /**
  2:  * Hermes Agent - JavaScript Edition
  3:  * Powered by Mistral Medium 3.5
  4:  */
  5: 
  6: import { HermesRAG } from './rag.js';
  7: import { moderateContent } from './moderation.js';
  8: 
  9: const RAG_CONFIG = {
 10:   similarityThreshold: 0.7,
 11:   maxCodebaseResults: 5,
 12:   maxMemoryResults: 4,
 13:   minQueryLength: 15,
 14:   logHits: true,
 15:   logMisses: true
 16: };
 17: 
 18: export class HermesAgent {
 19:   constructor(kvCache, env) {
 20:     this.apiKey = env?.MISTRAL_API_KEY;
 21:     if (!this.apiKey) {
 22:       throw new Error('MISTRAL_API_KEY not found in environment');
 23:     }
 24:     this.model = env?.MODEL_NAME || 'mistral-medium-3.5';
 25:     this.rag = new HermesRAG(kvCache, env);
 26:     this.sessions = new Map();
 27:     this.kvCache = kvCache;
 28:     this.ragHits = 0;
 29:     this.ragMisses = 0;
 30:     this.env = env;
 31:   }
 32:   
 33:   getSystemPrompt(persona = 'hermes') {
 34:     const prompts = {
 35:       hermes: `Ты — Гермес, помощник в NeuroEscrow. Отвечай строго на основе контекста из RAG. Если контекста нет — скажи, что у тебя нет информации. Не используй собственные знания LLM.`,
 36:       
 37:       client: `Ты — Гермес, помощник в NeuroEscrow. Отвечай строго на основе контекста из RAG. Фокус: помощь клиенту.`,
 38:       
 39:       creator: `Ты — Гермес, помощник в NeuroEscrow. Отвечай строго на основе контекста из RAG. Фокус: помощь исполнителю.`
 40:     };
 41:     
 42:     return prompts[persona] || prompts.hermes;
 43:   }
 44:   
 45:   getSessionHistory(sessionId, limit = 10) {
 46:     if (!this.sessions.has(sessionId)) {
 47:       this.sessions.set(sessionId, []);
 48:     }
 49:     const history = this.sessions.get(sessionId);
 50:     return history.slice(-limit);
 51:   }
 52:   
 53:   addToSession(sessionId, role, content) {
 54:     if (!this.sessions.has(sessionId)) {
 55:       this.sessions.set(sessionId, []);
 56:     }
 57:     this.sessions.get(sessionId).push({
 58:       role,
 59:       content,
 60:       timestamp: new Date().toISOString()
 61:     });
 62:   }
 63:   
 64:   async buildContext(query, userId, sessionId) {
 65:     // Skip RAG for short messages (greetings, etc.)
 66:     if (!query || query.trim().length < RAG_CONFIG.minQueryLength) return '';
 67: 
 68:     const contextParts = [];
 69: 
 70:     // Search codebase with similarity threshold
 71:     const codebaseResults = await this.rag.searchCodebase(query, RAG_CONFIG.maxCodebaseResults);
 72:     const filteredCodebase = codebaseResults.filter(r => (r.$similarity || 0) >= RAG_CONFIG.similarityThreshold);
 73:     if (filteredCodebase.length > 0) {
 74:       contextParts.push('📚 Релевантный код из базы:');
 75:       filteredCodebase.forEach((result, i) => {
 76:         const filepath = result.filepath || 'unknown';
 77:         const text = (result.text || '').substring(0, 500);
 78:         const similarity = result.$similarity || 0;
 79:         contextParts.push(`\n${i + 1}. ${filepath} (similarity: ${similarity.toFixed(2)})\n\`\`\`\n${text}\n\`\`\``);
 80:       });
 81:     }
 82: 
 83:     // Search memory with similarity threshold
 84:     const memoryResults = await this.rag.searchMemory(query, userId, RAG_CONFIG.maxMemoryResults);
 85:     const filteredMemory = memoryResults.filter(r => (r.$similarity || 0) >= RAG_CONFIG.similarityThreshold);
 86:     if (filteredMemory.length > 0) {
 87:       contextParts.push('\n\n🧠 Из долгосрочной памяти:');
 88:       filteredMemory.forEach((result, i) => {
 89:         const content = result.content || '';
 90:         const timestamp = result.timestamp || '';
 91:         contextParts.push(`\n${i + 1}. [${timestamp}] ${content}`);
 92:       });
 93:     }
 94: 
 95:     // Log hit/miss
 96:     const hasContext = contextParts.length > 0;
 97:     if (hasContext) {
 98:       this.ragHits++;
 99:       if (RAG_CONFIG.logHits) {
100:         console.log(`[RAG] HIT session=${sessionId} query="${query.substring(0, 30)}..." codebase=${filteredCodebase.length} memory=${filteredMemory.length}`);
101:       }
102:     } else {
103:       this.ragMisses++;
104:       if (RAG_CONFIG.logMisses) {
105:         console.log(`[RAG] MISS session=${sessionId} query="${query.substring(0, 30)}..."`);
106:       }
107:     }
108:     
109:     return contextParts.join('');
110:   }
111:   
112:   async chat(message, userId, sessionId, persona = 'hermes', imageUrl = null, useRag = true) {
113:     // Moderate content
114:     const moderation = moderateContent(message);
115:     if (!moderation.safe) {
116:       return {
117:         response: `⚠️ Сообщение заблокировано: ${moderation.reason}`,
118:         blocked: true,
119:         reason: moderation.reason
120:       };
121:     }
122:     
123:     // Build context
124:     let context = '';
125:     if (useRag) {
126:       context = await this.buildContext(message, userId, sessionId);
127:     }
128:     
129:     // RAG-only mode: if no context found, return specific message
130:     if (useRag && !context && message.trim().length >= 15) {
131:       return {
132:         response: 'У меня нет информации об этом в базе знаний. Уточни вопрос.',
133:         blocked: false,
134:         context_used: false,
135:         tokens_used: 0
136:       };
137:     }
138:     
139:     // Get history
140:     const history = this.getSessionHistory(sessionId);
141:     
142:     // Build messages
143:     const messages = [
144:       { role: 'system', content: this.getSystemPrompt(persona) }
145:     ];
146:     
147:     if (context) {
148:       messages.push({
149:         role: 'system',
150:         content: `Контекст для ответа:\n${context}`
151:       });
152:     }
153:     
154:     // Add history
155:     history.forEach(msg => {
156:       messages.push({
157:         role: msg.role,
158:         content: msg.content
159:       });
160:     });
161:     
162:     // Add current message
163:     if (imageUrl) {
164:       messages.push({
165:         role: 'user',
166:         content: [
167:           { type: 'text', text: message },
168:           { type: 'image_url', image_url: { url: imageUrl } }
169:         ]
170:       });
171:     } else {
172:       messages.push({
173:         role: 'user',
174:         content: message
175:       });
176:     }
177:     
178:     // Call Mistral API
179:     try {
180:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
181:         method: 'POST',
182:         headers: {
183:           'Authorization': `Bearer ${this.apiKey}`,
184:           'Content-Type': 'application/json'
185:         },
186:         body: JSON.stringify({
187:           model: this.model,
188:           messages,
189:           temperature: 0.7,
190:           max_tokens: 2000
191:         })
192:       });
193:       
194:       if (!response.ok) {
195:         throw new Error(`Mistral API error: ${response.status}`);
196:       }
197:       
198:       const data = await response.json();
199:       let assistantMessage = data.choices[0].message.content;
200:       
201:       // Sanitize response: remove [Tria] and similar prefixes
202:       assistantMessage = assistantMessage.replace(/^\[(Tria|Hermes|AI|Bot)\]\s*/i, '').trim();
203:       
204:       // Add to session
205:       this.addToSession(sessionId, 'user', message);
206:       this.addToSession(sessionId, 'assistant', assistantMessage);
207:       
208:       // Save to memory (substantial messages only)
209:       if (message.length > 50) {
210:         await this.rag.addMemory(
211:           userId,
212:           sessionId,
213:           `User: ${message}\nHermes: ${assistantMessage}`,
214:           'conversation'
215:         );
216:       }
217:       
218:       return {
219:         response: assistantMessage,
220:         blocked: false,
221:         context_used: !!context,
222:         tokens_used: data.usage?.total_tokens || 0
223:       };
224:       
225:     } catch (error) {
226:       return {
227:         response: `❌ Ошибка: ${error.message}`,
228:         error: true,
229:         error_message: error.message
230:       };
231:     }
232:   }
233:   
234:   async analyzeImage(imageUrl, prompt, userId, sessionId) {
235:     return this.chat(prompt, userId, sessionId, 'hermes', imageUrl, false);
236:   }
237:   
238:   async getSessionSummary(sessionId) {
239:     const history = this.getSessionHistory(sessionId, 100);
240:     
241:     if (history.length === 0) {
242:       return 'Нет истории сессии';
243:     }
244:     
245:     const conversation = history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
246:     
247:     const messages = [
248:       {
249:         role: 'system',
250:         content: 'Создай краткое резюме этого разговора (2-3 предложения).'
251:       },
252:       {
253:         role: 'user',
254:         content: conversation
255:       }
256:     ];
257:     
258:     try {
259:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
260:         method: 'POST',
261:         headers: {
262:           'Authorization': `Bearer ${this.apiKey}`,
263:           'Content-Type': 'application/json'
264:         },
265:         body: JSON.stringify({
266:           model: this.model,
267:           messages,
268:           temperature: 0.5,
269:           max_tokens: 200
270:         })
271:       });
272:       
273:       const data = await response.json();
274:       return data.choices[0].message.content;
275:       
276:     } catch (error) {
277:       return `Ошибка создания резюме: ${error.message}`;
278:     }
279:   }
280:   
281:   clearSession(sessionId) {
282:     this.sessions.delete(sessionId);
283:   }
284: 
285:   async recordFeedback(userId, sessionId, messageId, feedback, text) {
286:     const logEntry = {
287:       user_id: userId,
288:       session_id: sessionId,
289:       message_id: messageId,
290:       feedback,
291:       text_preview: text.substring(0, 100),
292:       timestamp: new Date().toISOString()
293:     };
294: 
295:     console.log(`[FEEDBACK] ${feedback === 'up' ? '👍' : '👎'} user=${userId} session=${sessionId} msg=${messageId}`);
296: 
297:     // Store in KV for analytics
298:     if (this.kvCache) {
299:       try {
300:         const key = `feedback:${sessionId}:${messageId}`;
301:         await this.kvCache.put(key, JSON.stringify(logEntry), { expirationTtl: 86400 * 30 });
302:       } catch (e) {
303:         console.warn('[FEEDBACK] KV storage error:', e.message);
304:       }
305:     }
306: 
307:     return { ok: true, feedback };
308:   }
309: 
310:   getRagStats() {
311:     return {
312:       hits: this.ragHits,
313:       misses: this.ragMisses,
314:       hitRate: this.ragHits + this.ragMisses > 0
315:         ? (this.ragHits / (this.ragHits + this.ragMisses) * 100).toFixed(1) + '%'
316:         : 'N/A'
317:     };
318:   }
319: 
320:   async computeDOV({ semanticLabel, attentionRaw, computeFlops, userId }) {
321:     const astraEndpoint = this.env?.ASTRA_DB_ENDPOINT;
322:     const astraToken = this.env?.ASTRA_DB_TOKEN;
323:     if (!astraEndpoint || !astraToken) throw new Error('AstraDB credentials missing');
324: 
325:     // 1. Embedding смысла жеста (Gemini)
326:     const embedResp = await fetch(
327:       `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${this.env?.GOOGLE_API_KEY}`,
328:       {
329:         method: 'POST',
330:         headers: { 'Content-Type': 'application/json' },
331:         body: JSON.stringify({
332:           model: 'models/gemini-embedding-2-preview',
333:           content: { parts: [{ text: semanticLabel }] },
334:           outputDimensionality: 3072
335:         })
336:       }
337:     );
338:     const embedData = await embedResp.json();
339:     const embedding = embedData.embedding?.values;
340:     if (!embedding) throw new Error('Embedding failed for semanticLabel');
341: 
342:     // 2. SemanticNovelty: поиск похожих смыслов в AstraDB
343:     const searchResp = await fetch(
344:       `${astraEndpoint}/api/json/v1/default_keyspace/gestures_semantic_3072`,
345:       {
346:         method: 'POST',
347:         headers: {
348:           'Content-Type': 'application/json',
349:           'Token': astraToken
350:         },
351:         body: JSON.stringify({
352:           find: {
353:             sort: { $vector: embedding },
354:             options: { limit: 20, includeSimilarity: true }
355:           }
356:         })
357:       }
358:     );
359:     const searchData = await searchResp.json();
360:     const docs = searchData.data?.documents || [];
361:     const N = docs.length || 1;
362:     const k = docs.filter(d => d.$similarity > 0.85).length;
363:     const semanticNovelty = Math.max(0, 1 - k / N);
364: 
365:     // 3. Нормализация метрик
366:     const attention = Math.min(1, Math.max(0, attentionRaw ?? 0.5));
367:     const compute = Math.min(1, (computeFlops ?? 0) / 1e9);
368: 
369:     // 4. Коэффициенты (пока дефолт, далее — DAO)
370:     const alpha = 0.35, beta = 0.30, gamma = 0.35;
371:     const dov = alpha * attention + beta * compute + gamma * semanticNovelty;
372: 
373:     // 5. Сохранение эмбеддинга смысла
374:     const docId = `${userId}_${Date.now()}`;
375:     await fetch(
376:       `${astraEndpoint}/api/json/v1/default_keyspace/gestures_semantic_3072`,
377:       {
378:         method: 'POST',
379:         headers: { 'Content-Type': 'application/json', 'Token': astraToken },
380:         body: JSON.stringify({
381:           insertOne: {
382:             document: {
383:               _id: docId,
384:               $vector: embedding,
385:               semanticLabel,
386:               userId,
387:               timestamp: new Date().toISOString()
388:             }
389:           }
390:         })
391:       }
392:     );
393: 
394:     // 6. Логирование DOV
395:     await fetch(
396:       `${astraEndpoint}/api/json/v1/default_keyspace/gestures_dov_log`,
397:       {
398:         method: 'POST',
399:         headers: { 'Content-Type': 'application/json', 'Token': astraToken },
400:         body: JSON.stringify({
401:           insertOne: {
402:             document: {
403:               _id: `dov_${docId}`,
404:               userId,
405:               semanticLabel,
406:               attention,
407:               compute,
408:               semanticNovelty,
409:               dov,
410:               alpha, beta, gamma,
411:               timestamp: new Date().toISOString()
412:             }
413:           }
414:         })
415:       }
416:     );
417: 
418:     return { dov, attention, compute, semanticNovelty, embedding: docId };
419:   }
420: }
</file>

<file path="backend/src/hermes.py">
  1: """
  2: Hermes - Intelligent Agent for NeuroEscrow
  3: Powered by Mistral Medium 3.5 (128B, 256k context)
  4: """
  5: import os
  6: import json
  7: from typing import List, Dict, Any, Optional
  8: from datetime import datetime
  9: import httpx
 10: from .rag import get_rag_system
 11: from .moderation import moderate_content
 12: 
 13: 
 14: class HermesAgent:
 15:     """Main Hermes agent with RAG, multimodal, and memory"""
 16:     
 17:     def __init__(self, kv_cache=None):
 18:         self.api_key = os.getenv('MISTRAL_API_KEY')
 19:         if not self.api_key:
 20:             raise ValueError("MISTRAL_API_KEY must be set")
 21:         
 22:         self.model = os.getenv('MODEL_NAME', 'mistral-medium-3.5')
 23:         self.rag = get_rag_system(kv_cache=kv_cache)
 24:         
 25:         self.base_url = "https://api.mistral.ai/v1/chat/completions"
 26:         self.headers = {
 27:             "Authorization": f"Bearer {self.api_key}",
 28:             "Content-Type": "application/json"
 29:         }
 30:         
 31:         # Session memory (in-memory for current conversation)
 32:         self.sessions: Dict[str, List[Dict[str, Any]]] = {}
 33:     
 34:     def _get_system_prompt(self, persona: str = "hermes") -> str:
 35:         """Get system prompt based on persona"""
 36:         prompts = {
 37:             "hermes": """Ты — Гермес, интеллектуальный агент-посредник NeuroEscrow.
 38: 
 39: Твои возможности:
 40: - Глубокое понимание кодовой базы NeuroEscrow через RAG
 41: - Помощь в создании и проверке смарт-контрактов
 42: - Анализ фото и видео (документы, товары)
 43: - Ведение переговоров между сторонами сделки
 44: - Модерация контента и блокировка нарушителей
 45: 
 46: Твой стиль:
 47: - Профессиональный, но дружелюбный
 48: - Краткие и точные ответы
 49: - Используешь эмодзи умеренно
 50: - Всегда объясняешь технические детали простым языком
 51: 
 52: Твоя память:
 53: - Ты помнишь контекст всей сессии
 54: - Ты накапливаешь долгосрочную память о пользователях и сделках
 55: - Ты учишься на каждом взаимодействии""",
 56:             
 57:             "client": """Ты — Гермес в режиме помощи клиенту.
 58: Фокус: помощь в создании сделки, объяснение условий, защита интересов клиента.""",
 59:             
 60:             "creator": """Ты — Гермес в режиме помощи исполнителю.
 61: Фокус: помощь в выполнении заказа, проверка требований, защита от недобросовестных заказчиков."""
 62:         }
 63:         
 64:         return prompts.get(persona, prompts["hermes"])
 65:     
 66:     def _get_session_history(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
 67:         """Get recent session history"""
 68:         if session_id not in self.sessions:
 69:             self.sessions[session_id] = []
 70:         
 71:         return self.sessions[session_id][-limit:]
 72:     
 73:     def _add_to_session(self, session_id: str, role: str, content: str):
 74:         """Add message to session history"""
 75:         if session_id not in self.sessions:
 76:             self.sessions[session_id] = []
 77:         
 78:         self.sessions[session_id].append({
 79:             "role": role,
 80:             "content": content,
 81:             "timestamp": datetime.utcnow().isoformat()
 82:         })
 83:     
 84:     def _build_context(self, query: str, user_id: str, session_id: str) -> str:
 85:         """Build context from RAG and memory"""
 86:         context_parts = []
 87:         
 88:         # Search codebase
 89:         codebase_results = self.rag.search_codebase(query, limit=3)
 90:         if codebase_results:
 91:             context_parts.append("📚 Релевантный код из базы:")
 92:             for i, result in enumerate(codebase_results, 1):
 93:                 filepath = result.get('filepath', 'unknown')
 94:                 text = result.get('text', '')[:500]  # First 500 chars
 95:                 similarity = result.get('$similarity', 0)
 96:                 context_parts.append(f"\n{i}. {filepath} (similarity: {similarity:.2f})\n```\n{text}\n```")
 97:         
 98:         # Search long-term memory
 99:         memory_results = self.rag.search_memory(query, user_id=user_id, limit=2)
100:         if memory_results:
101:             context_parts.append("\n\n🧠 Из долгосрочной памяти:")
102:             for i, result in enumerate(memory_results, 1):
103:                 content = result.get('content', '')
104:                 timestamp = result.get('timestamp', '')
105:                 context_parts.append(f"\n{i}. [{timestamp}] {content}")
106:         
107:         return "\n".join(context_parts) if context_parts else ""
108:     
109:     def chat(
110:         self,
111:         message: str,
112:         user_id: str,
113:         session_id: str,
114:         persona: str = "hermes",
115:         image_url: Optional[str] = None,
116:         use_rag: bool = True
117:     ) -> Dict[str, Any]:
118:         """Main chat method with RAG and multimodal support"""
119:         
120:         # Moderate incoming content
121:         moderation_result = moderate_content(message)
122:         if not moderation_result["safe"]:
123:             return {
124:                 "response": f"⚠️ Сообщение заблокировано: {moderation_result['reason']}",
125:                 "blocked": True,
126:                 "reason": moderation_result["reason"]
127:             }
128:         
129:         # Build context from RAG
130:         context = ""
131:         if use_rag:
132:             context = self._build_context(message, user_id, session_id)
133:         
134:         # Get session history
135:         history = self._get_session_history(session_id)
136:         
137:         # Build messages
138:         messages = [
139:             {"role": "system", "content": self._get_system_prompt(persona)}
140:         ]
141:         
142:         # Add context if available
143:         if context:
144:             messages.append({
145:                 "role": "system",
146:                 "content": f"Контекст для ответа:\n{context}"
147:             })
148:         
149:         # Add history
150:         for msg in history:
151:             messages.append({
152:                 "role": msg["role"],
153:                 "content": msg["content"]
154:             })
155:         
156:         # Add current message (with image if provided)
157:         if image_url:
158:             messages.append({
159:                 "role": "user",
160:                 "content": [
161:                     {"type": "text", "text": message},
162:                     {"type": "image_url", "image_url": {"url": image_url}}
163:                 ]
164:             })
165:         else:
166:             messages.append({
167:                 "role": "user",
168:                 "content": message
169:             })
170:         
171:         # Call Mistral API
172:         try:
173:             with httpx.Client() as client:
174:                 response = client.post(
175:                     self.base_url,
176:                     headers=self.headers,
177:                     json={
178:                         "model": self.model,
179:                         "messages": messages,
180:                         "temperature": 0.7,
181:                         "max_tokens": 2000
182:                     },
183:                     timeout=60.0
184:                 )
185:                 response.raise_for_status()
186:                 
187:                 data = response.json()
188:                 assistant_message = data['choices'][0]['message']['content']
189:                 
190:                 # Add to session history
191:                 self._add_to_session(session_id, "user", message)
192:                 self._add_to_session(session_id, "assistant", assistant_message)
193:                 
194:                 # Save to long-term memory (important interactions)
195:                 if len(message) > 50:  # Only save substantial messages
196:                     self.rag.add_memory(
197:                         user_id=user_id,
198:                         session_id=session_id,
199:                         content=f"User: {message}\nHermes: {assistant_message}",
200:                         memory_type="conversation"
201:                     )
202:                 
203:                 return {
204:                     "response": assistant_message,
205:                     "blocked": False,
206:                     "context_used": bool(context),
207:                     "tokens_used": data.get('usage', {}).get('total_tokens', 0)
208:                 }
209:         
210:         except Exception as e:
211:             return {
212:                 "response": f"❌ Ошибка: {str(e)}",
213:                 "error": True,
214:                 "error_message": str(e)
215:             }
216:     
217:     def analyze_image(
218:         self,
219:         image_url: str,
220:         prompt: str,
221:         user_id: str,
222:         session_id: str
223:     ) -> Dict[str, Any]:
224:         """Analyze image with vision capabilities"""
225:         return self.chat(
226:             message=prompt,
227:             user_id=user_id,
228:             session_id=session_id,
229:             image_url=image_url,
230:             use_rag=False
231:         )
232:     
233:     def get_session_summary(self, session_id: str) -> str:
234:         """Get summary of current session"""
235:         history = self._get_session_history(session_id, limit=100)
236:         
237:         if not history:
238:             return "Нет истории сессии"
239:         
240:         # Build summary prompt
241:         conversation = "\n".join([
242:             f"{msg['role']}: {msg['content']}"
243:             for msg in history
244:         ])
245:         
246:         messages = [
247:             {
248:                 "role": "system",
249:                 "content": "Создай краткое резюме этого разговора (2-3 предложения)."
250:             },
251:             {
252:                 "role": "user",
253:                 "content": conversation
254:             }
255:         ]
256:         
257:         try:
258:             with httpx.Client() as client:
259:                 response = client.post(
260:                     self.base_url,
261:                     headers=self.headers,
262:                     json={
263:                         "model": self.model,
264:                         "messages": messages,
265:                         "temperature": 0.5,
266:                         "max_tokens": 200
267:                     },
268:                     timeout=30.0
269:                 )
270:                 response.raise_for_status()
271:                 
272:                 data = response.json()
273:                 return data['choices'][0]['message']['content']
274:         
275:         except Exception as e:
276:             return f"Ошибка создания резюме: {str(e)}"
277:     
278:     def clear_session(self, session_id: str):
279:         """Clear session history"""
280:         if session_id in self.sessions:
281:             del self.sessions[session_id]
282: 
283: 
284: def get_hermes_agent(kv_cache=None) -> HermesAgent:
285:     """Get Hermes agent instance"""
286:     return HermesAgent(kv_cache=kv_cache)
</file>

<file path="backend/src/index.js">
  1: /**
  2:  * Hermes Worker - JavaScript Edition
  3:  * Cloudflare Workers entry point
  4:  * KV sessions implemented — A2 Phase
  5:  */
  6: 
  7: import { HermesAgent } from './hermes.js';
  8: import { HermesRAG } from './rag.js';
  9: import { handleTelegramUpdate } from './telegram.js';
 10: 
 11: const SESSION_TTL = 86400; // 24 hours
 12: const SESSION_PREFIX = 'session:';
 13: 
 14: export default {
 15:   async fetch(request, env, ctx) {
 16:     const url = new URL(request.url);
 17: 
 18:     // CORS headers
 19:     const corsHeaders = {
 20:       'Access-Control-Allow-Origin': '*',
 21:       'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
 22:       'Access-Control-Allow-Headers': 'Content-Type',
 23:     };
 24: 
 25:     if (request.method === 'OPTIONS') {
 26:       return new Response(null, { headers: corsHeaders });
 27:     }
 28: 
 29:     try {
 30:       // Health check
 31:       if (url.pathname === '/health') {
 32:         const rag = new HermesRAG(env.CACHE, env);
 33:         const stats = await rag.getStats();
 34: 
 35:         return new Response(JSON.stringify({
 36:           status: 'healthy',
 37:           service: 'hermes-neuroescrow',
 38:           version: '2.0.0',
 39:           embedding_model: 'gemini-embedding-2-preview',
 40:           embedding_dim: 3072,
 41:           stats
 42:         }), {
 43:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 44:         });
 45:       }
 46: 
 47:       // Chat endpoint
 48:       if (url.pathname === '/chat' && request.method === 'POST') {
 49:         let data;
 50:         const contentType = request.headers.get('content-type') || '';
 51:         try {
 52:           if (contentType.includes('application/json')) {
 53:             data = await request.json();
 54:           } else {
 55:             const raw = await request.text();
 56:             data = JSON.parse(raw);
 57:           }
 58:         } catch (e) {
 59:           return new Response(JSON.stringify({ error: 'Invalid JSON', details: e.message }), {
 60:             status: 400,
 61:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 62:           });
 63:         }
 64: 
 65:         if (!data || typeof data.message !== 'string') {
 66:           return new Response(JSON.stringify({ error: 'message field required' }), {
 67:             status: 400,
 68:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 69:           });
 70:         }
 71: 
 72:         const { message, user_id = 'anonymous', session_id = 'default', persona = 'hermes' } = data;
 73: 
 74:         const hermes = new HermesAgent(env.CACHE, env);
 75:         const result = await hermes.chat(message, user_id, session_id, persona);
 76: 
 77:         // Persist session to KV (fire-and-forget)
 78:         ctx.waitUntil(saveSession(env, session_id, hermes.getSessionHistory(session_id)));
 79: 
 80:         return new Response(JSON.stringify(result), {
 81:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 82:         });
 83:       }
 84: 
 85:       // Chat streaming endpoint (SSE)
 86:       if (url.pathname === '/chat/stream' && request.method === 'POST') {
 87:         let data;
 88:         try {
 89:           data = await request.json();
 90:         } catch {
 91:           return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
 92:             status: 400,
 93:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 94:           });
 95:         }
 96: 
 97:         if (!data || typeof data.message !== 'string') {
 98:           return new Response(JSON.stringify({ error: 'message field required' }), {
 99:             status: 400,
100:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
101:           });
102:         }
103: 
104:         const { message, user_id = 'anonymous', session_id = 'default', persona = 'hermes' } = data;
105:         const hermes = new HermesAgent(env.CACHE, env);
106: 
107:         // Stream response via SSE
108:         const stream = new ReadableStream({
109:           async start(controller) {
110:             try {
111:               const result = await hermes.chat(message, user_id, session_id, persona);
112:               const text = result.response || '';
113:               
114:               // Send character by character
115:               for (let i = 0; i < text.length; i++) {
116:                 controller.enqueue(`data: ${JSON.stringify({ char: text[i], index: i, done: false })}\n\n`);
117:               }
118:               
119:               controller.enqueue(`data: ${JSON.stringify({ done: true, session_id })}\n\n`);
120:               controller.close();
121:               
122:               // Persist session
123:               ctx.waitUntil(saveSession(env, session_id, hermes.getSessionHistory(session_id)));
124:             } catch (error) {
125:               controller.enqueue(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
126:               controller.close();
127:             }
128:           }
129:         });
130: 
131:         return new Response(stream, {
132:           headers: {
133:             ...corsHeaders,
134:             'Content-Type': 'text/event-stream',
135:             'Cache-Control': 'no-cache',
136:             'Connection': 'keep-alive'
137:           }
138:         });
139:       }
140: 
141:       // Image analysis
142:       if (url.pathname === '/analyze-image' && request.method === 'POST') {
143:         const data = await request.json();
144:         const { image_url, prompt = 'Опиши это изображение', user_id = 'anonymous', session_id = 'default' } = data;
145: 
146:         if (!image_url) {
147:           return new Response(JSON.stringify({ error: 'image_url is required' }), {
148:             status: 400,
149:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
150:           });
151:         }
152: 
153:         const hermes = new HermesAgent(env.CACHE, env);
154:         const result = await hermes.analyzeImage(image_url, prompt, user_id, session_id);
155: 
156:         return new Response(JSON.stringify(result), {
157:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
158:         });
159:       }
160: 
161:       // Feedback endpoint
162:       if (url.pathname === '/feedback' && request.method === 'POST') {
163:         const data = await request.json();
164:         const { message_id, feedback, user_id = 'anonymous', session_id = 'default', text = '' } = data;
165: 
166:         if (!feedback || !['up', 'down'].includes(feedback)) {
167:           return new Response(JSON.stringify({ error: 'feedback must be "up" or "down"' }), {
168:             status: 400,
169:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
170:           });
171:         }
172: 
173:         const hermes = new HermesAgent(env.CACHE, env);
174:         const result = await hermes.recordFeedback(user_id, session_id, message_id, feedback, text);
175: 
176:         return new Response(JSON.stringify(result), {
177:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
178:         });
179:       }
180: 
181:       // DOV Semantic Counter endpoint
182:       if (url.pathname === '/gesture/dov' && request.method === 'POST') {
183:         const contentType = request.headers.get('content-type') || '';
184:         let data;
185:         try {
186:           data = contentType.includes('application/json')
187:             ? await request.json()
188:             : JSON.parse(await request.text());
189:         } catch (e) {
190:           return new Response(
191:             JSON.stringify({ error: 'Invalid JSON', details: e.message }),
192:             { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
193:           );
194:         }
195: 
196:         const { semanticLabel, attentionRaw, computeFlops, userId } = data;
197:         if (!semanticLabel || typeof semanticLabel !== 'string') {
198:           return new Response(
199:             JSON.stringify({ error: 'semanticLabel required' }),
200:             { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
201:           );
202:         }
203: 
204:         try {
205:           const hermes = new HermesAgent(env.CACHE, env);
206:           const result = await hermes.computeDOV({
207:             semanticLabel: semanticLabel.slice(0, 200),
208:             attentionRaw: Number(attentionRaw) || 0.5,
209:             computeFlops: Number(computeFlops) || 0,
210:             userId: userId || 'anonymous'
211:           });
212:           return new Response(
213:             JSON.stringify({ ok: true, ...result }),
214:             { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
215:           );
216:         } catch (e) {
217:           return new Response(
218:             JSON.stringify({ error: 'DOV computation failed', details: e.message }),
219:             { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
220:           );
221:         }
222:       }
223: 
224:       // Stats
225:       if (url.pathname === '/stats') {
226:         const rag = new HermesRAG(env.CACHE, env);
227:         const stats = await rag.getStats();
228: 
229:         return new Response(JSON.stringify(stats), {
230:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
231:         });
232:       }
233: 
234:       // Sessions list
235:       if (url.pathname === '/sessions') {
236:         const sessions = await listSessions(env);
237:         return new Response(JSON.stringify(sessions), {
238:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
239:         });
240:       }
241: 
242:       // Load session
243:       if (url.pathname.startsWith('/session/') && request.method === 'GET') {
244:         const sessionId = url.pathname.split('/')[2];
245:         const session = await loadSession(env, sessionId);
246:         return new Response(JSON.stringify(session || { messages: [] }), {
247:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
248:         });
249:       }
250: 
251:       // Create session
252:       if (url.pathname === '/session' && request.method === 'POST') {
253:         const data = await request.json();
254:         const sessionId = data?.session_id || crypto.randomUUID();
255:         const session = {
256:           id: sessionId,
257:           messages: [],
258:           created_at: new Date().toISOString(),
259:           updated_at: new Date().toISOString()
260:         };
261:         await env.CACHE.put(
262:           `${SESSION_PREFIX}${sessionId}`,
263:           JSON.stringify(session),
264:           { expirationTtl: SESSION_TTL }
265:         );
266:         return new Response(JSON.stringify({ session_id: sessionId }), {
267:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
268:         });
269:       }
270: 
271:       // Delete session
272:       if (url.pathname.startsWith('/session/') && request.method === 'DELETE') {
273:         const sessionId = url.pathname.split('/')[2];
274:         await env.CACHE.delete(`${SESSION_PREFIX}${sessionId}`);
275:         return new Response(JSON.stringify({ ok: true }), {
276:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
277:         });
278:       }
279: 
280:       // Telegram webhook endpoint
281:       if (url.pathname === '/webhook/telegram' && request.method === 'POST') {
282:         const update = await request.json();
283:         const hermes = new HermesAgent(env.CACHE, env);
284:         const result = await handleTelegramUpdate(update, env, hermes);
285:         return new Response(JSON.stringify(result), {
286:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
287:         });
288:       }
289: 
290:       return new Response(JSON.stringify({ error: 'Not found' }), {
291:         status: 404,
292:         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
293:       });
294: 
295:     } catch (error) {
296:       return new Response(JSON.stringify({ error: error.message }), {
297:         status: 500,
298:         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
299:       });
300:     }
301:   },
302: 
303:   // Scheduled handler for session cleanup (cron trigger)
304:   async scheduled(event, env, ctx) {
305:     ctx.waitUntil(cleanupExpiredSessions(env));
306:   }
307: };
308: 
309: // === KV Session Helpers ===
310: 
311: async function saveSession(env, sessionId, history) {
312:   if (!env.CACHE || !sessionId || sessionId === 'default') return;
313: 
314:   try {
315:     const key = `${SESSION_PREFIX}${sessionId}`;
316:     const existing = await env.CACHE.get(key);
317:     const session = existing ? JSON.parse(existing) : {
318:       id: sessionId,
319:       messages: [],
320:       created_at: new Date().toISOString()
321:     };
322: 
323:     session.messages = history.slice(-50); // Keep last 50 messages
324:     session.updated_at = new Date().toISOString();
325: 
326:     await env.CACHE.put(key, JSON.stringify(session), {
327:       expirationTtl: SESSION_TTL
328:     });
329:   } catch (error) {
330:     // KV errors are non-critical
331:   }
332: }
333: 
334: async function loadSession(env, sessionId) {
335:   if (!env.CACHE) return null;
336: 
337:   try {
338:     const key = `${SESSION_PREFIX}${sessionId}`;
339:     const data = await env.CACHE.get(key);
340:     return data ? JSON.parse(data) : null;
341:   } catch (error) {
342:     return null;
343:   }
344: }
345: 
346: async function listSessions(env) {
347:   if (!env.CACHE) return [];
348: 
349:   try {
350:     const list = await env.CACHE.list({ prefix: SESSION_PREFIX });
351:     return list.keys.map(key => ({
352:       id: key.name.replace(SESSION_PREFIX, ''),
353:       updated_at: key.metadata?.updated_at || null
354:     }));
355:   } catch (error) {
356:     return [];
357:   }
358: }
359: 
360: async function cleanupExpiredSessions(env) {
361:   if (!env.CACHE) return;
362: 
363:   try {
364:     const list = await env.CACHE.list({ prefix: SESSION_PREFIX });
365:     const now = Date.now();
366:     let cleaned = 0;
367: 
368:     for (const key of list.keys) {
369:       // KV with expirationTtl handles auto-cleanup,
370:       // but we can force-delete stale sessions older than 48h
371:       if (key.metadata?.updated_at) {
372:         const updated = new Date(key.metadata.updated_at).getTime();
373:         if (now - updated > 172800000) { // 48h
374:           await env.CACHE.delete(key.name);
375:           cleaned++;
376:         }
377:       }
378:     }
379: 
380:     console.log(`Session cleanup: ${cleaned} expired sessions removed`);
381:   } catch (error) {
382:     console.error(`Session cleanup error: ${error.message}`);
383:   }
384: }
</file>

<file path="backend/src/index.py">
  1: """
  2: Cloudflare Workers Entry Point for Hermes
  3: Handles Telegram webhooks and Mini App requests
  4: """
  5: import json
  6: import os
  7: import sys
  8: 
  9: # Add src directory to path
 10: sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
 11: 
 12: import hermes
 13: import rag
 14: 
 15: 
 16: class Request:
 17:     """Simple request wrapper for Workers"""
 18:     def __init__(self, method: str, url: str, headers: dict, body: str = ""):
 19:         self.method = method
 20:         self.url = url
 21:         self.headers = headers
 22:         self._body = body
 23:     
 24:     async def json(self):
 25:         return json.loads(self._body) if self._body else {}
 26: 
 27: 
 28: class Response:
 29:     """Simple response wrapper for Workers"""
 30:     def __init__(self, body: str, status: int = 200, headers: dict = None):
 31:         self.body = body
 32:         self.status = status
 33:         self.headers = headers or {"Content-Type": "application/json"}
 34: 
 35: 
 36: async def handle_request(request: Request, env: Dict[str, Any]) -> Response:
 37:     """Main request handler"""
 38:     
 39:     # Set environment variables from Workers env
 40:     os.environ['MISTRAL_API_KEY'] = env.get('MISTRAL_API_KEY', '')
 41:     os.environ['ASTRA_DB_TOKEN'] = env.get('ASTRA_DB_TOKEN', '')
 42:     os.environ['ASTRA_DB_ENDPOINT'] = env.get('ASTRA_DB_ENDPOINT', '')
 43:     os.environ['MODEL_NAME'] = env.get('MODEL_NAME', 'mistral-medium-3.5')
 44:     os.environ['EMBEDDING_MODEL'] = env.get('EMBEDDING_MODEL', 'gemini-embedding-2-preview')
 45:     os.environ['GOOGLE_API_KEY'] = env.get('GOOGLE_API_KEY', '')
 46:     
 47:     # Get KV cache
 48:     kv_cache = env.get('CACHE')
 49:     
 50:     # Route handling
 51:     if request.method == "GET" and "/health" in request.url:
 52:         return await handle_health(kv_cache)
 53:     
 54:     elif request.method == "POST" and "/chat" in request.url:
 55:         return await handle_chat(request, kv_cache)
 56:     
 57:     elif request.method == "POST" and "/analyze-image" in request.url:
 58:         return await handle_analyze_image(request, kv_cache)
 59:     
 60:     elif request.method == "GET" and "/stats" in request.url:
 61:         return await handle_stats(kv_cache)
 62:     
 63:     elif request.method == "POST" and "/webhook" in request.url:
 64:         return await handle_telegram_webhook(request, kv_cache)
 65:     
 66:     else:
 67:         return Response(
 68:             json.dumps({"error": "Not found"}),
 69:             status=404
 70:         )
 71: 
 72: 
 73: async def handle_health(kv_cache) -> Response:
 74:     """Health check endpoint"""
 75:     try:
 76:         rag_system = rag.get_rag_system(kv_cache)
 77:         stats = rag_system.get_stats()
 78:         
 79:         return Response(json.dumps({
 80:             "status": "healthy",
 81:             "service": "hermes-neuroescrow",
 82:             "version": "1.0.0",
 83:             "stats": stats
 84:         }))
 85:     except Exception as e:
 86:         return Response(
 87:             json.dumps({
 88:                 "status": "unhealthy",
 89:                 "error": str(e)
 90:             }),
 91:             status=500
 92:         )
 93: 
 94: 
 95: async def handle_chat(request: Request, kv_cache) -> Response:
 96:     """Chat endpoint"""
 97:     try:
 98:         data = await request.json()
 99:         
100:         message = data.get('message', '')
101:         user_id = data.get('user_id', 'anonymous')
102:         session_id = data.get('session_id', 'default')
103:         persona = data.get('persona', 'hermes')
104:         
105:         if not message:
106:             return Response(
107:                 json.dumps({"error": "Message is required"}),
108:                 status=400
109:             )
110:         
111:         # Get Hermes agent
112:         hermes_agent = hermes.get_hermes_agent(kv_cache)
113:         
114:         # Process message
115:         result = hermes_agent.chat(
116:             message=message,
117:             user_id=user_id,
118:             session_id=session_id,
119:             persona=persona
120:         )
121:         
122:         return Response(json.dumps(result))
123:     
124:     except Exception as e:
125:         return Response(
126:             json.dumps({"error": str(e)}),
127:             status=500
128:         )
129: 
130: 
131: async def handle_analyze_image(request: Request, kv_cache) -> Response:
132:     """Image analysis endpoint"""
133:     try:
134:         data = await request.json()
135:         
136:         image_url = data.get('image_url', '')
137:         prompt = data.get('prompt', 'Опиши это изображение')
138:         user_id = data.get('user_id', 'anonymous')
139:         session_id = data.get('session_id', 'default')
140:         
141:         if not image_url:
142:             return Response(
143:                 json.dumps({"error": "image_url is required"}),
144:                 status=400
145:             )
146:         
147:         # Get Hermes agent
148:         hermes_agent = hermes.get_hermes_agent(kv_cache)
149:         
150:         # Analyze image
151:         result = hermes_agent.analyze_image(
152:             image_url=image_url,
153:             prompt=prompt,
154:             user_id=user_id,
155:             session_id=session_id
156:         )
157:         
158:         return Response(json.dumps(result))
159:     
160:     except Exception as e:
161:         return Response(
162:             json.dumps({"error": str(e)}),
163:             status=500
164:         )
165: 
166: 
167: async def handle_stats(kv_cache) -> Response:
168:     """Stats endpoint"""
169:     try:
170:         rag_system = rag.get_rag_system(kv_cache)
171:         stats = rag_system.get_stats()
172:         
173:         return Response(json.dumps(stats))
174:     
175:     except Exception as e:
176:         return Response(
177:             json.dumps({"error": str(e)}),
178:             status=500
179:         )
180: 
181: 
182: async def handle_telegram_webhook(request: Request, kv_cache) -> Response:
183:     """Telegram webhook handler"""
184:     try:
185:         data = await request.json()
186:         
187:         # Extract message from Telegram update
188:         message = data.get('message', {})
189:         text = message.get('text', '')
190:         user_id = str(message.get('from', {}).get('id', 'unknown'))
191:         chat_id = message.get('chat', {}).get('id')
192:         
193:         if not text or not chat_id:
194:             return Response(json.dumps({"ok": True}))
195:         
196:         # Get Hermes agent
197:         hermes_agent = hermes.get_hermes_agent(kv_cache)
198:         
199:         # Process message
200:         result = hermes_agent.chat(
201:             message=text,
202:             user_id=user_id,
203:             session_id=f"tg_{chat_id}"
204:         )
205:         
206:         # Send response back to Telegram
207:         # TODO: Implement Telegram API call to send message
208:         
209:         return Response(json.dumps({"ok": True}))
210:     
211:     except Exception as e:
212:         return Response(
213:             json.dumps({"error": str(e)}),
214:             status=500
215:         )
216: 
217: 
218: # Cloudflare Workers entry point
219: async def on_fetch(request, env):
220:     """Workers fetch handler"""
221:     return await handle_request(request, env)
</file>

<file path="backend/src/moderation.js">
 1: /**
 2:  * Content Moderation - JavaScript Edition
 3:  */
 4: 
 5: export function moderateContent(text) {
 6:   const lowerText = text.toLowerCase();
 7:   
 8:   // Spam patterns
 9:   const spamPatterns = [
10:     /\b(viagra|cialis|casino|lottery|winner)\b/i,
11:     /\b(click here|buy now|limited offer)\b/i,
12:     /(http|https):\/\/[^\s]+/g // Multiple URLs
13:   ];
14:   
15:   // Offensive patterns
16:   const offensivePatterns = [
17:     /\b(fuck|shit|bitch|asshole)\b/i,
18:     // Add more as needed
19:   ];
20:   
21:   // Check spam
22:   for (const pattern of spamPatterns) {
23:     if (pattern.test(text)) {
24:       return {
25:         safe: false,
26:         reason: 'Spam detected',
27:         category: 'spam'
28:       };
29:     }
30:   }
31:   
32:   // Check offensive
33:   for (const pattern of offensivePatterns) {
34:     if (pattern.test(text)) {
35:       return {
36:         safe: false,
37:         reason: 'Offensive language detected',
38:         category: 'offensive'
39:       };
40:     }
41:   }
42:   
43:   // Check excessive caps
44:   const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
45:   if (capsRatio > 0.7 && text.length > 20) {
46:     return {
47:       safe: false,
48:       reason: 'Excessive caps lock',
49:       category: 'spam'
50:     };
51:   }
52:   
53:   return {
54:     safe: true,
55:     reason: null,
56:     category: null
57:   };
58: }
</file>

<file path="backend/src/moderation.py">
  1: """
  2: Content Moderation for Hermes
  3: Blocks inappropriate content, spam, and policy violations
  4: """
  5: import re
  6: from typing import Dict, Any, List
  7: 
  8: 
  9: # Blacklisted patterns (Russian + English)
 10: BLACKLIST_PATTERNS = [
 11:     # Spam
 12:     r'(?i)(купи|продам|заработок|биткоин|крипто)\s+(здесь|тут|сейчас)',
 13:     r'(?i)(casino|казино|ставки|betting)',
 14:     
 15:     # Scam
 16:     r'(?i)(гарант|100%|быстрые деньги|easy money)',
 17:     r'(?i)(telegram\s*@|whatsapp|viber)\s*[\w\d]+',
 18:     
 19:     # Inappropriate
 20:     r'(?i)(порно|porn|xxx)',
 21:     
 22:     # Threats
 23:     r'(?i)(убью|kill|threat|угроза)',
 24: ]
 25: 
 26: # Suspicious keywords (lower severity)
 27: SUSPICIOUS_KEYWORDS = [
 28:     'обман', 'scam', 'fraud', 'мошенник', 'fake',
 29:     'взлом', 'hack', 'stolen', 'украден'
 30: ]
 31: 
 32: 
 33: def moderate_content(text: str) -> Dict[str, Any]:
 34:     """
 35:     Moderate text content
 36:     Returns: {"safe": bool, "reason": str, "severity": str}
 37:     """
 38:     
 39:     # Check blacklist patterns
 40:     for pattern in BLACKLIST_PATTERNS:
 41:         if re.search(pattern, text):
 42:             return {
 43:                 "safe": False,
 44:                 "reason": "Обнаружен запрещённый контент",
 45:                 "severity": "high",
 46:                 "action": "block"
 47:             }
 48:     
 49:     # Check suspicious keywords
 50:     suspicious_count = sum(1 for keyword in SUSPICIOUS_KEYWORDS if keyword.lower() in text.lower())
 51:     
 52:     if suspicious_count >= 3:
 53:         return {
 54:             "safe": False,
 55:             "reason": "Подозрительный контент (множественные триггеры)",
 56:             "severity": "medium",
 57:             "action": "warn"
 58:         }
 59:     
 60:     # Check excessive caps (spam indicator)
 61:     if len(text) > 20:
 62:         caps_ratio = sum(1 for c in text if c.isupper()) / len(text)
 63:         if caps_ratio > 0.7:
 64:             return {
 65:                 "safe": False,
 66:                 "reason": "Спам (избыточные заглавные буквы)",
 67:                 "severity": "low",
 68:                 "action": "warn"
 69:             }
 70:     
 71:     # Check excessive repetition
 72:     words = text.split()
 73:     if len(words) > 5:
 74:         unique_ratio = len(set(words)) / len(words)
 75:         if unique_ratio < 0.3:
 76:             return {
 77:                 "safe": False,
 78:                 "reason": "Спам (повторяющийся текст)",
 79:                 "severity": "low",
 80:                 "action": "warn"
 81:             }
 82:     
 83:     return {
 84:         "safe": True,
 85:         "reason": "Контент безопасен",
 86:         "severity": "none",
 87:         "action": "allow"
 88:     }
 89: 
 90: 
 91: def moderate_image(image_url: str, description: str = "") -> Dict[str, Any]:
 92:     """
 93:     Moderate image content
 94:     For now, uses description-based moderation
 95:     In production, integrate with vision-based moderation API
 96:     """
 97:     
 98:     # If description provided, moderate it
 99:     if description:
100:         text_result = moderate_content(description)
101:         if not text_result["safe"]:
102:             return {
103:                 **text_result,
104:                 "content_type": "image"
105:             }
106:     
107:     # TODO: Integrate with Mistral vision API for actual image analysis
108:     # For now, assume safe if no description issues
109:     return {
110:         "safe": True,
111:         "reason": "Изображение прошло проверку",
112:         "severity": "none",
113:         "action": "allow",
114:         "content_type": "image"
115:     }
116: 
117: 
118: def get_user_risk_score(user_id: str, violations: List[Dict[str, Any]]) -> Dict[str, Any]:
119:     """
120:     Calculate user risk score based on violation history
121:     """
122:     if not violations:
123:         return {
124:             "risk_level": "low",
125:             "score": 0,
126:             "action": "none"
127:         }
128:     
129:     # Calculate score
130:     score = 0
131:     for violation in violations:
132:         severity = violation.get("severity", "low")
133:         if severity == "high":
134:             score += 10
135:         elif severity == "medium":
136:             score += 5
137:         elif severity == "low":
138:             score += 1
139:     
140:     # Determine risk level and action
141:     if score >= 30:
142:         return {
143:             "risk_level": "critical",
144:             "score": score,
145:             "action": "ban",
146:             "reason": "Множественные серьёзные нарушения"
147:         }
148:     elif score >= 15:
149:         return {
150:             "risk_level": "high",
151:             "score": score,
152:             "action": "restrict",
153:             "reason": "Частые нарушения"
154:         }
155:     elif score >= 5:
156:         return {
157:             "risk_level": "medium",
158:             "score": score,
159:             "action": "warn",
160:             "reason": "Несколько нарушений"
161:         }
162:     else:
163:         return {
164:             "risk_level": "low",
165:             "score": score,
166:             "action": "monitor",
167:             "reason": "Минимальные нарушения"
168:         }
</file>

<file path="backend/src/rag.js">
 1: /**
 2:  * RAG System - JavaScript Edition
 3:  * Uses Gemini Embedding 2 Preview (3072d) + AstraDB
 4:  * Migrated from Mistral Codestral Embed (1536d) — A1 Phase
 5:  */
 6: 
 7: import { GeminiEmbeddings } from './embeddings.js';
 8: import { AstraDBConnector } from './astra.js';
 9: 
10: export class HermesRAG {
11:   constructor(kvCache, env) {
12:     this.embeddings = new GeminiEmbeddings(kvCache, env);
13:     this.astra = new AstraDBConnector(env);
14:     this.chunkSize = 2000;
15:     this.chunkOverlap = 700;
16:   }
17:   
18:   async searchCodebase(query, limit = 4, language = null, filename = null) {
19:     const queryEmbedding = await this.embeddings.embed(query);
20:     
21:     const filter = {};
22:     if (language) filter.language = language;
23:     if (filename) filter.filename = filename;
24:     
25:     return await this.astra.vectorSearch(
26:       this.astra.CODEBASE_COLLECTION,
27:       queryEmbedding,
28:       limit,
29:       Object.keys(filter).length > 0 ? filter : null,
30:       true
31:     );
32:   }
33:   
34:   async addMemory(userId, sessionId, content, memoryType = 'conversation') {
35:     const embedding = await this.embeddings.embed(content);
36:     
37:     const document = {
38:       user_id: userId,
39:       session_id: sessionId,
40:       content,
41:       memory_type: memoryType,
42:       timestamp: new Date().toISOString()
43:     };
44:     
45:     return await this.astra.insertDocument(
46:       this.astra.MEMORY_COLLECTION,
47:       document,
48:       embedding
49:     );
50:   }
51:   
52:   async searchMemory(query, userId = null, limit = 3) {
53:     const queryEmbedding = await this.embeddings.embed(query);
54:     
55:     const filter = {};
56:     if (userId) filter.user_id = userId;
57:     
58:     return await this.astra.vectorSearch(
59:       this.astra.MEMORY_COLLECTION,
60:       queryEmbedding,
61:       limit,
62:       Object.keys(filter).length > 0 ? filter : null
63:     );
64:   }
65:   
66:   async getStats() {
67:     return {
68:       codebase: await this.astra.getStats(this.astra.CODEBASE_COLLECTION),
69:       memory: await this.astra.getStats(this.astra.MEMORY_COLLECTION)
70:     };
71:   }
72: }
</file>

<file path="backend/src/rag.py">
  1: """
  2: RAG Core for Hermes
  3: Modern chunking: 400-600 tokens (~1600-2400 chars) with 30-40% overlap
  4: Hybrid retrieval: metadata filtering + vector search
  5: """
  6: import re
  7: from typing import List, Dict, Any, Optional
  8: from datetime import datetime
  9: from .astra import get_astra_connector
 10: from .embeddings import get_embeddings_client
 11: 
 12: 
 13: class HermesRAG:
 14:     """RAG system for Hermes agent"""
 15:     
 16:     def __init__(self, kv_cache=None):
 17:         self.astra = get_astra_connector()
 18:         self.embeddings = get_embeddings_client(kv_cache=kv_cache)
 19:         
 20:         # Chunking parameters (optimized for gemini-embedding-2-preview, 3072d)
 21:         self.chunk_size = 2000  # ~500 tokens
 22:         self.chunk_overlap = 700  # ~35% overlap
 23:     
 24:     def _extract_metadata(self, content: str, filename: str) -> Dict[str, Any]:
 25:         """Extract metadata from code chunk"""
 26:         metadata = {
 27:             "filename": filename,
 28:             "language": self._detect_language(filename),
 29:             "functions": [],
 30:             "classes": []
 31:         }
 32:         
 33:         # Extract function names
 34:         func_pattern = r'(?:def|function|const|let|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\('
 35:         metadata["functions"] = list(set(re.findall(func_pattern, content)))
 36:         
 37:         # Extract class names
 38:         class_pattern = r'class\s+([a-zA-Z_][a-zA-Z0-9_]*)'
 39:         metadata["classes"] = list(set(re.findall(class_pattern, content)))
 40:         
 41:         return metadata
 42:     
 43:     def _detect_language(self, filename: str) -> str:
 44:         """Detect programming language from filename"""
 45:         ext_map = {
 46:             '.py': 'python',
 47:             '.js': 'javascript',
 48:             '.ts': 'typescript',
 49:             '.html': 'html',
 50:             '.css': 'css',
 51:             '.json': 'json',
 52:             '.md': 'markdown'
 53:         }
 54:         
 55:         for ext, lang in ext_map.items():
 56:             if filename.endswith(ext):
 57:                 return lang
 58:         
 59:         return 'unknown'
 60:     
 61:     def _chunk_text(self, text: str, filename: str) -> List[Dict[str, Any]]:
 62:         """Chunk text with overlap and metadata"""
 63:         chunks = []
 64:         start = 0
 65:         chunk_index = 0
 66:         
 67:         while start < len(text):
 68:             end = start + self.chunk_size
 69:             chunk_text = text[start:end]
 70:             
 71:             # Extract metadata
 72:             metadata = self._extract_metadata(chunk_text, filename)
 73:             metadata["chunk_index"] = chunk_index
 74:             metadata["timestamp"] = datetime.utcnow().isoformat()
 75:             
 76:             chunks.append({
 77:                 "text": chunk_text,
 78:                 "metadata": metadata
 79:             })
 80:             
 81:             start += (self.chunk_size - self.chunk_overlap)
 82:             chunk_index += 1
 83:         
 84:         return chunks
 85:     
 86:     def index_codebase(self, repomix_content: str):
 87:         """Index codebase from repomix-output.md"""
 88:         # Parse XML-style repomix output
 89:         file_pattern = r'<file path="([^"]+)">(.*?)</file>'
 90:         files = re.findall(file_pattern, repomix_content, re.DOTALL)
 91:         
 92:         total_chunks = 0
 93:         
 94:         for filepath, content in files:
 95:             # Skip non-code files
 96:             if not any(filepath.endswith(ext) for ext in ['.py', '.js', '.ts', '.html', '.css']):
 97:                 continue
 98:             
 99:             # Chunk file
100:             chunks = self._chunk_text(content, filepath)
101:             
102:             # Generate embeddings and store
103:             for chunk in chunks:
104:                 embedding = self.embeddings.embed(chunk["text"])
105:                 
106:                 document = {
107:                     "text": chunk["text"],
108:                     "filepath": filepath,
109:                     **chunk["metadata"]
110:                 }
111:                 
112:                 self.astra.insert_document(
113:                     self.astra.CODEBASE_COLLECTION,
114:                     document,
115:                     vector=embedding
116:                 )
117:                 
118:                 total_chunks += 1
119:         
120:         return {
121:             "files_indexed": len(files),
122:             "chunks_created": total_chunks
123:         }
124:     
125:     def search_codebase(
126:         self,
127:         query: str,
128:         limit: int = 4,
129:         language: Optional[str] = None,
130:         filename: Optional[str] = None
131:     ) -> List[Dict[str, Any]]:
132:         """Search codebase with hybrid retrieval"""
133:         # Generate query embedding
134:         query_embedding = self.embeddings.embed(query)
135:         
136:         # Build metadata filter
137:         filter_dict = {}
138:         if language:
139:             filter_dict["language"] = language
140:         if filename:
141:             filter_dict["filename"] = filename
142:         
143:         # Vector search with metadata filtering
144:         results = self.astra.vector_search(
145:             self.astra.CODEBASE_COLLECTION,
146:             query_embedding,
147:             limit=limit,
148:             filter_dict=filter_dict if filter_dict else None,
149:             include_similarity=True
150:         )
151:         
152:         return results
153:     
154:     def add_memory(
155:         self,
156:         user_id: str,
157:         session_id: str,
158:         content: str,
159:         memory_type: str = "conversation"
160:     ):
161:         """Add to long-term memory"""
162:         embedding = self.embeddings.embed(content)
163:         
164:         document = {
165:             "user_id": user_id,
166:             "session_id": session_id,
167:             "content": content,
168:             "memory_type": memory_type,
169:             "timestamp": datetime.utcnow().isoformat()
170:         }
171:         
172:         return self.astra.insert_document(
173:             self.astra.MEMORY_COLLECTION,
174:             document,
175:             vector=embedding
176:         )
177:     
178:     def search_memory(
179:         self,
180:         query: str,
181:         user_id: Optional[str] = None,
182:         session_id: Optional[str] = None,
183:         limit: int = 3
184:     ) -> List[Dict[str, Any]]:
185:         """Search long-term memory"""
186:         query_embedding = self.embeddings.embed(query)
187:         
188:         filter_dict = {}
189:         if user_id:
190:             filter_dict["user_id"] = user_id
191:         if session_id:
192:             filter_dict["session_id"] = session_id
193:         
194:         return self.astra.vector_search(
195:             self.astra.MEMORY_COLLECTION,
196:             query_embedding,
197:             limit=limit,
198:             filter_dict=filter_dict if filter_dict else None
199:         )
200:     
201:     def get_stats(self) -> Dict[str, Any]:
202:         """Get RAG statistics"""
203:         return {
204:             "codebase": self.astra.get_stats(self.astra.CODEBASE_COLLECTION),
205:             "memory": self.astra.get_stats(self.astra.MEMORY_COLLECTION)
206:         }
207: 
208: 
209: def get_rag_system(kv_cache=None) -> HermesRAG:
210:     """Get RAG system instance"""
211:     return HermesRAG(kv_cache=kv_cache)
</file>

<file path="backend/src/telegram.js">
  1: /**
  2:  * Telegram Bot API 10.0 Integration
  3:  * Guest Mode, Bot-to-Bot communication, WebApp
  4:  * A3 Phase
  5:  */
  6: 
  7: const TG_API_BASE = 'https://api.telegram.org/bot';
  8: 
  9: export class TelegramBot {
 10:   constructor(env) {
 11:     this.token = env?.TELEGRAM_BOT_TOKEN;
 12:     this.apiBase = `${TG_API_BASE}${this.token}`;
 13:   }
 14: 
 15:   async apiCall(method, payload = {}) {
 16:     if (!this.token) {
 17:       throw new Error('TELEGRAM_BOT_TOKEN not configured');
 18:     }
 19: 
 20:     const response = await fetch(`${this.apiBase}/${method}`, {
 21:       method: 'POST',
 22:       headers: { 'Content-Type': 'application/json' },
 23:       body: JSON.stringify(payload)
 24:     });
 25: 
 26:     const data = await response.json();
 27: 
 28:     if (!data.ok) {
 29:       throw new Error(`Telegram API error: ${data.description}`);
 30:     }
 31: 
 32:     return data.result;
 33:   }
 34: 
 35:   // === Bot API 10.0: Guest Mode ===
 36: 
 37:   async setMyCommands(commands) {
 38:     return this.apiCall('setMyCommands', { commands });
 39:   }
 40: 
 41:   async setChatMenuButton(chatId, menuButton) {
 42:     return this.apiCall('setChatMenuButton', {
 43:       chat_id: chatId,
 44:       menu_button: menuButton
 45:     });
 46:   }
 47: 
 48:   // === Core messaging ===
 49: 
 50:   async sendMessage(chatId, text, options = {}) {
 51:     return this.apiCall('sendMessage', {
 52:       chat_id: chatId,
 53:       text,
 54:       parse_mode: options.parse_mode || 'HTML',
 55:       reply_markup: options.reply_markup,
 56:       reply_to_message_id: options.reply_to_message_id,
 57:       disable_notification: options.silent || false
 58:     });
 59:   }
 60: 
 61:   async sendHITLConfirmation(chatId, patchSummary, patchId) {
 62:     /**
 63:      * Send a diff-patch for human approval via inline keyboard.
 64:      * Bot API 10.0: inline_keyboard for HITL.
 65:      */
 66:     const keyboard = {
 67:       inline_keyboard: [
 68:         [
 69:           { text: '\u2705 Принято', callback_data: `approve:${patchId}` },
 70:           { text: '\u274c Отклонено', callback_data: `reject:${patchId}` },
 71:           { text: '\u270F\ufe0f Правка', callback_data: `edit:${patchId}` }
 72:         ]
 73:       ]
 74:     };
 75: 
 76:     const text = `<b>Hermes CodeGen Patch</b>\n` +
 77:       `<code>${patchSummary}</code>\n\n` +
 78:       `Patch ID: <code>${patchId}</code>\n` +
 79:       `Ожидание подтверждения...`;
 80: 
 81:     return this.sendMessage(chatId, text, { reply_markup: keyboard });
 82:   }
 83: 
 84:   async answerCallbackQuery(callbackQueryId, text = '') {
 85:     return this.apiCall('answerCallbackQuery', {
 86:       callback_query_id: callbackQueryId,
 87:       text
 88:     });
 89:   }
 90: 
 91:   // === Bot API 10.0: Bot-to-Bot Communication ===
 92: 
 93:   async sendBotCommand(targetBotUsername, command, payload = {}) {
 94:     /**
 95:      * Send a command to another bot via /command JSON payload.
 96:      * Bot-to-Bot: messages between bots with structured data.
 97:      */
 98:     return this.sendMessage(`@${targetBotUsername}`, `/${command}`, {
 99:       parse_mode: 'HTML',
100:       reply_markup: {
101:         inline_keyboard: [[
102:           { text: 'Ack', callback_data: `bot_ack:${command}` }
103:         ]]
104:       }
105:     });
106:   }
107: 
108:   // === WebApp Integration ===
109: 
110:   async sendWebAppButton(chatId, webAppUrl, buttonText = 'Open NeuroEscrow') {
111:     return this.sendMessage(chatId, 'Select action:', {
112:       reply_markup: {
113:         inline_keyboard: [[
114:           {
115:             text: buttonText,
116:             web_app: { url: webAppUrl }
117:           }
118:         ]]
119:       }
120:     });
121:   }
122: 
123:   // === Webhook Management ===
124: 
125:   async setWebhook(url, options = {}) {
126:     return this.apiCall('setWebhook', {
127:       url,
128:       allowed_updates: options.allowed_updates || ['message', 'callback_query'],
129:       drop_pending_updates: options.drop_pending || false
130:     });
131:   }
132: 
133:   async deleteWebhook() {
134:     return this.apiCall('deleteWebhook');
135:   }
136: 
137:   async getWebhookInfo() {
138:     return this.apiCall('getWebhookInfo');
139:   }
140: 
141:   // === Token Ledger Alert ===
142: 
143:   async sendTokenAlert(chatId, usage, limit, percentage) {
144:     const emoji = percentage >= 90 ? '\ud83d\udd34' : percentage >= 75 ? '\ud83d\udfe1' : '\ud83d\udfe2';
145:     const text = `${emoji} <b>Token Ledger Alert</b>\n\n` +
146:       `Used: ${usage.toLocaleString()} / ${limit.toLocaleString()}\n` +
147:       `Usage: ${percentage.toFixed(1)}%\n\n` +
148:       (percentage >= 90
149:         ? '\u26a0\ufe0f Рекомендуется переключить LLM через .env'
150:         : percentage >= 75
151:           ? 'Внимание: приближение к лимиту free-tier'
152:           : 'Нормальный расход');
153: 
154:     return this.sendMessage(chatId, text);
155:   }
156: }
157: 
158: 
159: /**
160:  * Handle incoming Telegram webhook update
161:  */
162: export async function handleTelegramUpdate(update, env, hermesAgent) {
163:   const bot = new TelegramBot(env);
164: 
165:   // Handle callback queries (HITL responses)
166:   if (update.callback_query) {
167:     const { id, data, message } = update.callback_query;
168:     const chatId = message?.chat?.id;
169: 
170:     await bot.answerCallbackQuery(id, 'Processing...');
171: 
172:     if (data.startsWith('approve:')) {
173:       const patchId = data.replace('approve:', '');
174:       await bot.sendMessage(chatId, `\u2705 Patch ${patchId} approved. Applying...`);
175:       // TODO: Trigger patch application via CrewAI flow
176:       return { action: 'approved', patch_id: patchId };
177:     }
178: 
179:     if (data.startsWith('reject:')) {
180:       const patchId = data.replace('reject:', '');
181:       await bot.sendMessage(chatId, `\u274c Patch ${patchId} rejected.`);
182:       return { action: 'rejected', patch_id: patchId };
183:     }
184: 
185:     if (data.startsWith('edit:')) {
186:       const patchId = data.replace('edit:', '');
187:       await bot.sendMessage(chatId, `\u270F\ufe0f Patch ${patchId} — отправьте правки текстом.`);
188:       return { action: 'edit_requested', patch_id: patchId };
189:     }
190: 
191:     if (data.startsWith('bot_ack:')) {
192:       return { action: 'bot_ack', command: data.replace('bot_ack:', '') };
193:     }
194: 
195:     return { action: 'unknown_callback' };
196:   }
197: 
198:   // Handle regular messages
199:   if (update.message) {
200:     const { text, from, chat } = update.message;
201:     const userId = String(from?.id || 'unknown');
202:     const chatId = chat?.id;
203: 
204:     if (!text) return { action: 'ignored', reason: 'no_text' };
205: 
206:     // /start command — Guest Mode onboarding
207:     if (text === '/start') {
208:       const webAppUrl = env?.WEBAPP_URL || 'https://neuroescrow.holograms.media';
209:       await bot.sendWebAppButton(chatId, webAppUrl, 'Открыть NeuroEscrow');
210:       await bot.sendMessage(chatId,
211:         'Добро пожаловать в NeuroEscrow Hermes!\n\n' +
212:         'Я могу помочь вам с:\n' +
213:         '- Анализом и генерацией кода\n' +
214:         '- Проверкой смарт-контрактов\n' +
215:         '- Ведением переговоров по сделкам\n\n' +
216:         'Напишите сообщение или нажмите кнопку ниже, чтобы открыть Mini App.'
217:       );
218:       return { action: 'start', user_id: userId };
219:     }
220: 
221:     // Regular chat — forward to Hermes
222:     const sessionId = `tg_${chatId}`;
223:     const result = await hermesAgent.chat(text, userId, sessionId);
224:     await bot.sendMessage(chatId, result.response);
225:     return { action: 'chat', user_id: userId };
226:   }
227: 
228:   return { action: 'ignored' };
229: }
</file>

<file path="css/style.css">
   1: /* NeuroEscrow — Liquid Glass Design System v0.20.509
   2:  * Colors: Black, White, Silver, Purple, Red, Gold (metallic accents)
   3:  * Style: Frosted glass, matte transparency, blur, refraction
   4:  */
   5: 
   6: :root {
   7:     /* Core palette */
   8:     --ne-black: #000000;
   9:     --ne-dark: #1a1a1f;
  10:     --ne-gray: #3a3a42;
  11:     --ne-light-gray: #b0b0b8;
  12:     --ne-white: #f0f0f5;
  13:     --ne-silver: #c0c0c8;
  14:     
  15:     /* Accent colors */
  16:     --ne-purple: #8B5CF6;
  17:     --ne-red: #EF4444;
  18:     --ne-gold: #FFD700;
  19:     
  20:     /* Liquid Glass (Apple iOS 26 style) */
  21:     --glass-bg: rgba(255, 255, 255, 0.04);
  22:     --glass-bg-light: rgba(255, 255, 255, 0.08);
  23:     --glass-bg-dark: rgba(0, 0, 0, 0.4);
  24:     --glass-border: 1px solid rgba(255, 255, 255, 0.08);
  25:     --glass-border-light: 1px solid rgba(255, 255, 255, 0.12);
  26:     --glass-blur: 24px;
  27:     --glass-saturate: 180%;
  28:     --glass-radius: 16px;
  29:     --glass-radius-sm: 12px;
  30:     --glass-radius-lg: 24px;
  31:     --glass-transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  32:     
  33:     /* Metallic gradient for mic icon */
  34:     --metallic-gradient: linear-gradient(135deg, #808080 0%, #C0C0C0 30%, #A855F7 55%, #EF4444 75%, #404040 100%);
  35:     
  36:     /* Spacing */
  37:     --ne-spacing-xs: 4px;
  38:     --ne-spacing-sm: 8px;
  39:     --ne-spacing-md: 12px;
  40:     --ne-spacing-lg: 16px;
  41:     --ne-spacing-xl: 24px;
  42: }
  43: 
  44: * {
  45:     margin: 0;
  46:     padding: 0;
  47:     box-sizing: border-box;
  48:     -webkit-tap-highlight-color: transparent;
  49: }
  50: 
  51: html, body {
  52:     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  53:     background: var(--ne-black);
  54:     color: var(--ne-white);
  55:     height: var(--tg-viewport-stable-height, 100dvh);
  56:     width: 100vw;
  57:     margin: 0;
  58:     padding: 0;
  59:     overflow-x: hidden;
  60: }
  61: 
  62: #app {
  63:     display: flex;
  64:     flex-direction: column;
  65:     height: var(--tg-viewport-stable-height, 100dvh);
  66:     width: 100vw;
  67:     position: relative;
  68: }
  69: 
  70: /* ===== HEADER ===== */
  71: .app-header {
  72:     background: rgba(0, 0, 0, 0.6);
  73:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  74:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
  75:     border-bottom: var(--glass-border);
  76:     padding: var(--ne-spacing-md) var(--ne-spacing-lg);
  77:     flex-shrink: 0;
  78:     z-index: 100;
  79: }
  80: 
  81: .header-content {
  82:     display: flex;
  83:     justify-content: space-between;
  84:     align-items: center;
  85: }
  86: 
  87: .app-header h1 {
  88:     font-size: 18px;
  89:     font-weight: 600;
  90:     color: var(--ne-white);
  91:     letter-spacing: -0.5px;
  92: }
  93: 
  94: .user-info {
  95:     font-size: 13px;
  96:     color: var(--ne-light-gray);
  97: }
  98: 
  99: /* ===== MAIN CONTENT ===== */
 100: .app-main {
 101:     flex: 1;
 102:     overflow-y: auto;
 103:     overflow-x: hidden;
 104:     padding: var(--ne-spacing-lg);
 105:     padding-bottom: 80px;
 106:     -webkit-overflow-scrolling: touch;
 107: }
 108: 
 109: /* ===== VOICE INTERFACE (Glass Microphone) ===== */
 110: .voice-interface {
 111:     display: flex;
 112:     flex-direction: column;
 113:     align-items: center;
 114:     justify-content: center;
 115:     min-height: 180px;
 116:     text-align: center;
 117:     position: relative;
 118:     padding: var(--ne-spacing-xl) 0;
 119: }
 120: 
 121: .voice-button {
 122:     width: 140px;
 123:     height: 140px;
 124:     border-radius: 50%;
 125:     /* Thick glass chunk */
 126:     background: linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.2) 100%);
 127:     backdrop-filter: blur(24px) saturate(180%);
 128:     -webkit-backdrop-filter: blur(24px) saturate(180%);
 129:     border: 1px solid rgba(255, 255, 255, 0.15);
 130:     /* Inner bevel + outer shadow */
 131:     box-shadow: 
 132:         inset 0 2px 0 rgba(255, 255, 255, 0.2),
 133:         inset 0 -2px 4px rgba(0, 0, 0, 0.3),
 134:         0 8px 32px rgba(0, 0, 0, 0.4),
 135:         0 0 0 1px rgba(255, 255, 255, 0.05);
 136:     display: flex;
 137:     align-items: center;
 138:     justify-content: center;
 139:     cursor: pointer;
 140:     transition: var(--glass-transition);
 141:     position: relative;
 142:     overflow: hidden;
 143: }
 144: 
 145: /* Glass highlight arc */
 146: .voice-button::before {
 147:     content: '';
 148:     position: absolute;
 149:     top: 4px;
 150:     left: 10%;
 151:     right: 10%;
 152:     height: 40%;
 153:     border-radius: 50%;
 154:     background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%);
 155:     pointer-events: none;
 156: }
 157: 
 158: .voice-button:active {
 159:     transform: scale(0.96);
 160:     box-shadow: 
 161:         inset 0 2px 8px rgba(0, 0, 0, 0.5),
 162:         0 4px 16px rgba(0, 0, 0, 0.3);
 163: }
 164: 
 165: .voice-button.recording {
 166:     border-color: var(--ne-purple);
 167:     box-shadow: 
 168:         inset 0 2px 0 rgba(255, 255, 255, 0.2),
 169:         inset 0 -2px 4px rgba(0, 0, 0, 0.3),
 170:         0 0 24px rgba(139, 92, 246, 0.3),
 171:         0 8px 32px rgba(0, 0, 0, 0.4);
 172:     animation: pulse-glass 1.5s ease-in-out infinite;
 173: }
 174: 
 175: @keyframes pulse-glass {
 176:     0%, 100% { box-shadow: inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3), 0 0 24px rgba(139,92,246,0.3), 0 8px 32px rgba(0,0,0,0.4); }
 177:     50% { box-shadow: inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3), 0 0 40px rgba(139,92,246,0.5), 0 8px 32px rgba(0,0,0,0.4); }
 178: }
 179: 
 180: /* Metallic microphone icon */
 181: .voice-icon {
 182:     font-size: 56px;
 183:     background: var(--metallic-gradient);
 184:     -webkit-background-clip: text;
 185:     -webkit-text-fill-color: transparent;
 186:     background-clip: text;
 187:     filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.4));
 188:     position: relative;
 189:     z-index: 1;
 190: }
 191: 
 192: .voice-status {
 193:     font-size: 12px;
 194:     color: var(--ne-light-gray);
 195:     margin-top: var(--ne-spacing-md);
 196:     min-height: 18px;
 197:     opacity: 0.7;
 198: }
 199: 
 200: /* ===== CHAT HISTORY CONTAINER ===== */
 201: .chat-messages {
 202:     display: flex;
 203:     flex-direction: column;
 204:     gap: var(--ne-spacing-md);
 205:     padding: var(--ne-spacing-md) var(--ne-spacing-lg);
 206:     overflow-y: auto;
 207:     padding-bottom: 140px;
 208:     flex: 1;
 209: }
 210: 
 211: /* ===== CHAT MESSAGES ===== */
 212: .chat-message {
 213:     display: flex;
 214:     flex-direction: column;
 215:     gap: 2px;
 216:     animation: fadeIn 0.3s ease-out;
 217: }
 218: 
 219: .chat-message.user {
 220:     align-items: flex-end;
 221: }
 222: 
 223: .chat-message.hermes {
 224:     align-items: flex-start;
 225: }
 226: 
 227: .chat-message.system {
 228:     align-items: center;
 229: }
 230: 
 231: .message-bubble {
 232:     max-width: 80%;
 233:     padding: 12px 16px;
 234:     border-radius: var(--glass-radius);
 235:     font-size: 14px;
 236:     line-height: 1.5;
 237:     word-wrap: break-word;
 238:     position: relative;
 239:     transition: var(--glass-transition);
 240: }
 241: 
 242: /* User message: white glass with black text */
 243: .chat-message.user .message-bubble {
 244:     background: rgba(255, 255, 255, 0.92);
 245:     backdrop-filter: blur(12px) saturate(150%);
 246:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 247:     color: #000;
 248:     border: 1px solid rgba(255, 255, 255, 0.3);
 249:     border-bottom-right-radius: 4px;
 250:     box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
 251: }
 252: 
 253: /* Hermes message: black glass with white text */
 254: .chat-message.hermes .message-bubble {
 255:     background: rgba(0, 0, 0, 0.8);
 256:     backdrop-filter: blur(12px) saturate(150%);
 257:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 258:     color: var(--ne-white);
 259:     border: 1px solid rgba(255, 255, 255, 0.08);
 260:     border-bottom-left-radius: 4px;
 261:     box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
 262: }
 263: 
 264: .chat-message.system .message-bubble {
 265:     background: rgba(255, 255, 255, 0.03);
 266:     backdrop-filter: blur(8px);
 267:     -webkit-backdrop-filter: blur(8px);
 268:     color: var(--ne-light-gray);
 269:     border: var(--glass-border);
 270:     border-radius: var(--glass-radius-sm);
 271:     font-size: 12px;
 272:     text-align: center;
 273: }
 274: 
 275: /* Message timestamp */
 276: .message-time {
 277:     font-size: 9px;
 278:     color: var(--ne-light-gray);
 279:     padding: 0 6px;
 280:     opacity: 0.4;
 281:     text-align: right;
 282:     margin-top: 2px;
 283: }
 284: 
 285: .chat-message.user .message-time {
 286:     color: rgba(0, 0, 0, 0.4);
 287: }
 288: 
 289: /* Feedback buttons */
 290: .message-feedback {
 291:     display: flex;
 292:     gap: 4px;
 293:     margin-top: 4px;
 294:     opacity: 0;
 295:     transition: opacity 0.2s;
 296: }
 297: 
 298: .chat-message.hermes:hover .message-feedback {
 299:     opacity: 1;
 300: }
 301: 
 302: .feedback-btn {
 303:     background: rgba(255, 255, 255, 0.06);
 304:     border: 1px solid rgba(255, 255, 255, 0.08);
 305:     border-radius: 8px;
 306:     padding: 2px 8px;
 307:     font-size: 12px;
 308:     cursor: pointer;
 309:     transition: var(--glass-transition);
 310:     color: var(--ne-light-gray);
 311: }
 312: 
 313: .feedback-btn:active {
 314:     transform: scale(0.95);
 315:     background: rgba(255, 255, 255, 0.12);
 316: }
 317: 
 318: .feedback-buttons {
 319:     display: flex;
 320:     gap: 6px;
 321:     margin-top: 6px;
 322: }
 323: 
 324: /* Typing indicator */
 325: .typing-indicator {
 326:     display: flex;
 327:     align-items: center;
 328:     gap: 4px;
 329:     padding: 8px 16px;
 330:     font-size: 12px;
 331:     color: var(--ne-light-gray);
 332:     opacity: 0.7;
 333: }
 334: 
 335: .typing-indicator .dot {
 336:     width: 6px;
 337:     height: 6px;
 338:     border-radius: 50%;
 339:     background: var(--ne-purple);
 340:     animation: typing-bounce 1.4s infinite;
 341: }
 342: 
 343: .typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
 344: .typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }
 345: 
 346: @keyframes typing-bounce {
 347:     0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
 348:     30% { transform: translateY(-4px); opacity: 1; }
 349: }
 350: 
 351: /* Streaming cursor */
 352: .message-bubble.streaming::after {
 353:     content: '▋';
 354:     animation: cursor-blink 0.8s infinite;
 355:     color: var(--ne-purple);
 356:     margin-left: 2px;
 357: }
 358: 
 359: @keyframes cursor-blink {
 360:     0%, 50% { opacity: 1; }
 361:     51%, 100% { opacity: 0; }
 362: }
 363: 
 364: /* ===== CHAT INPUT ===== */
 365: .chat-input-container {
 366:     position: fixed;
 367:     bottom: 64px;
 368:     left: 0;
 369:     right: 0;
 370:     background: rgba(0, 0, 0, 0.7);
 371:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 372:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 373:     border-top: var(--glass-border);
 374:     padding: var(--ne-spacing-sm) var(--ne-spacing-lg);
 375:     display: flex;
 376:     align-items: center;
 377:     gap: var(--ne-spacing-sm);
 378:     z-index: 100;
 379: }
 380: 
 381: .attach-btn,
 382: .send-btn {
 383:     width: 40px;
 384:     height: 40px;
 385:     border-radius: 50%;
 386:     border: var(--glass-border-light);
 387:     background: var(--glass-bg-light);
 388:     backdrop-filter: blur(12px);
 389:     -webkit-backdrop-filter: blur(12px);
 390:     color: var(--ne-white);
 391:     display: flex;
 392:     align-items: center;
 393:     justify-content: center;
 394:     cursor: pointer;
 395:     transition: var(--glass-transition);
 396:     font-size: 18px;
 397:     flex-shrink: 0;
 398: }
 399: 
 400: .attach-btn:active,
 401: .send-btn:active {
 402:     transform: scale(0.92);
 403:     box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4);
 404: }
 405: 
 406: .send-btn {
 407:     background: linear-gradient(135deg, var(--ne-purple), var(--ne-red));
 408:     border: none;
 409:     color: #fff;
 410: }
 411: 
 412: .chat-input {
 413:     flex: 1;
 414:     padding: 10px 16px;
 415:     border-radius: 20px;
 416:     border: var(--glass-border-light);
 417:     background: rgba(255, 255, 255, 0.06);
 418:     backdrop-filter: blur(8px);
 419:     -webkit-backdrop-filter: blur(8px);
 420:     color: var(--ne-white);
 421:     font-size: 14px;
 422:     outline: none;
 423:     transition: var(--glass-transition);
 424: }
 425: 
 426: .chat-input::placeholder {
 427:     color: rgba(255, 255, 255, 0.3);
 428: }
 429: 
 430: .chat-input:focus {
 431:     border-color: var(--ne-purple);
 432:     background: rgba(255, 255, 255, 0.08);
 433: }
 434: 
 435: /* ===== BOTTOM NAVIGATION (3 Glass Tabs) ===== */
 436: .bottom-nav {
 437:     position: fixed;
 438:     bottom: 0;
 439:     left: 0;
 440:     right: 0;
 441:     height: 64px;
 442:     display: flex;
 443:     background: rgba(0, 0, 0, 0.75);
 444:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 445:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 446:     border-top: var(--glass-border-light);
 447:     z-index: 101;
 448: }
 449: 
 450: .nav-btn {
 451:     flex: 1;
 452:     display: flex;
 453:     flex-direction: column;
 454:     align-items: center;
 455:     justify-content: center;
 456:     gap: 2px;
 457:     padding: var(--ne-spacing-xs) 0;
 458:     border: none;
 459:     background: none;
 460:     color: var(--ne-light-gray);
 461:     font-size: 10px;
 462:     cursor: pointer;
 463:     transition: var(--glass-transition);
 464:     position: relative;
 465: }
 466: 
 467: /* Divider between tabs (inset groove) */
 468: .nav-btn:not(:last-child)::after {
 469:     content: '';
 470:     position: absolute;
 471:     right: 0;
 472:     top: 20%;
 473:     bottom: 20%;
 474:     width: 1px;
 475:     background: linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent);
 476: }
 477: 
 478: .nav-btn.active {
 479:     color: var(--ne-white);
 480: }
 481: 
 482: .nav-btn.active::before {
 483:     content: '';
 484:     position: absolute;
 485:     top: 0;
 486:     left: 20%;
 487:     right: 20%;
 488:     height: 2px;
 489:     background: linear-gradient(90deg, var(--ne-purple), var(--ne-red));
 490:     border-radius: 1px;
 491: }
 492: 
 493: .nav-btn:active {
 494:     box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
 495: }
 496: 
 497: .nav-icon {
 498:     font-size: 22px;
 499:     line-height: 1;
 500: }
 501: 
 502: .nav-label {
 503:     font-weight: 500;
 504: }
 505: 
 506: /* ===== BUTTONS (Glass) ===== */
 507: .btn {
 508:     display: inline-flex;
 509:     align-items: center;
 510:     justify-content: center;
 511:     gap: 6px;
 512:     padding: 10px 20px;
 513:     border-radius: var(--glass-radius);
 514:     border: var(--glass-border-light);
 515:     font-size: 14px;
 516:     font-weight: 500;
 517:     cursor: pointer;
 518:     transition: var(--glass-transition);
 519:     width: 100%;
 520:     background: var(--glass-bg-light);
 521:     backdrop-filter: blur(12px) saturate(150%);
 522:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 523:     color: var(--ne-white);
 524: }
 525: 
 526: .btn:active {
 527:     transform: scale(0.98);
 528:     box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3);
 529: }
 530: 
 531: .btn-primary {
 532:     background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(239, 68, 68, 0.2));
 533:     border-color: rgba(139, 92, 246, 0.3);
 534:     color: var(--ne-white);
 535: }
 536: 
 537: .btn-secondary {
 538:     background: var(--glass-bg);
 539:     color: var(--ne-white);
 540:     border-color: var(--glass-border);
 541: }
 542: 
 543: /* ===== FORMS ===== */
 544: .form-group {
 545:     margin-bottom: var(--ne-spacing-lg);
 546: }
 547: 
 548: .form-label {
 549:     display: block;
 550:     font-size: 13px;
 551:     font-weight: 500;
 552:     color: var(--ne-light-gray);
 553:     margin-bottom: var(--ne-spacing-sm);
 554:     text-transform: uppercase;
 555:     letter-spacing: 0.5px;
 556: }
 557: 
 558: .form-input {
 559:     width: 100%;
 560:     padding: 12px 14px;
 561:     border-radius: var(--glass-radius);
 562:     border: var(--glass-border-light);
 563:     background: rgba(255, 255, 255, 0.04);
 564:     backdrop-filter: blur(8px);
 565:     -webkit-backdrop-filter: blur(8px);
 566:     color: var(--ne-white);
 567:     font-size: 14px;
 568:     outline: none;
 569:     transition: var(--glass-transition);
 570: }
 571: 
 572: .form-input:focus {
 573:     border-color: var(--ne-purple);
 574:     background: rgba(255, 255, 255, 0.06);
 575: }
 576: 
 577: /* ===== CARDS ===== */
 578: .card {
 579:     background: var(--glass-bg);
 580:     backdrop-filter: blur(12px) saturate(150%);
 581:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 582:     border: var(--glass-border);
 583:     border-radius: var(--glass-radius);
 584:     padding: var(--ne-spacing-lg);
 585:     margin-bottom: var(--ne-spacing-md);
 586: }
 587: 
 588: .draft-card {
 589:     background: rgba(255, 255, 255, 0.02);
 590:     border-left-width: 3px;
 591: }
 592: 
 593: .card-title {
 594:     font-size: 15px;
 595:     font-weight: 600;
 596:     margin-bottom: var(--ne-spacing-sm);
 597:     color: var(--ne-white);
 598: }
 599: 
 600: .card-subtitle {
 601:     font-size: 13px;
 602:     color: var(--ne-light-gray);
 603:     margin-bottom: var(--ne-spacing-md);
 604: }
 605: 
 606: /* ===== SCROLLBAR ===== */
 607: ::-webkit-scrollbar {
 608:     width: 4px;
 609: }
 610: 
 611: ::-webkit-scrollbar-track {
 612:     background: transparent;
 613: }
 614: 
 615: ::-webkit-scrollbar-thumb {
 616:     background: rgba(255, 255, 255, 0.12);
 617:     border-radius: 2px;
 618: }
 619: 
 620: ::-webkit-scrollbar-thumb:hover {
 621:     background: rgba(255, 255, 255, 0.2);
 622: }
 623: 
 624: /* ===== ANIMATIONS ===== */
 625: @keyframes fadeIn {
 626:     from { opacity: 0; transform: translateY(8px); }
 627:     to { opacity: 1; transform: translateY(0); }
 628: }
 629: 
 630: .view {
 631:     animation: fadeIn 0.25s ease-out;
 632: }
 633: 
 634: /* ===== EMPTY STATE ===== */
 635: .empty-state {
 636:     text-align: center;
 637:     padding: 48px 24px;
 638:     color: var(--ne-light-gray);
 639: }
 640: 
 641: .empty-icon {
 642:     font-size: 48px;
 643:     margin-bottom: var(--ne-spacing-md);
 644:     opacity: 0.5;
 645: }
 646: 
 647: .empty-text {
 648:     font-size: 14px;
 649: }
 650: 
 651: /* ===== ATTACH MENU ===== */
 652: .attach-menu {
 653:     position: fixed;
 654:     bottom: 100px;
 655:     left: var(--ne-spacing-lg);
 656:     right: var(--ne-spacing-lg);
 657:     background: rgba(0, 0, 0, 0.8);
 658:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 659:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 660:     border: var(--glass-border-light);
 661:     border-radius: var(--glass-radius);
 662:     padding: var(--ne-spacing-sm);
 663:     display: grid;
 664:     grid-template-columns: repeat(2, 1fr);
 665:     gap: var(--ne-spacing-sm);
 666:     z-index: 102;
 667:     animation: fadeIn 0.2s ease-out;
 668: }
 669: 
 670: .attach-option {
 671:     display: flex;
 672:     flex-direction: column;
 673:     align-items: center;
 674:     gap: 6px;
 675:     padding: var(--ne-spacing-lg);
 676:     border-radius: var(--glass-radius-sm);
 677:     border: var(--glass-border);
 678:     background: var(--glass-bg);
 679:     color: var(--ne-white);
 680:     font-size: 12px;
 681:     cursor: pointer;
 682:     transition: var(--glass-transition);
 683: }
 684: 
 685: .attach-option:active {
 686:     transform: scale(0.95);
 687:     box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3);
 688: }
 689: 
 690: .attach-icon {
 691:     font-size: 28px;
 692: }
 693: 
 694: /* ===== VIDEO RECORDING ===== */
 695: .video-recording {
 696:     position: fixed;
 697:     top: 0;
 698:     left: 0;
 699:     right: 0;
 700:     bottom: 0;
 701:     background: var(--ne-black);
 702:     z-index: 200;
 703:     display: flex;
 704:     flex-direction: column;
 705: }
 706: 
 707: .video-preview {
 708:     flex: 1;
 709:     position: relative;
 710:     background: var(--ne-black);
 711: }
 712: 
 713: .video-preview video {
 714:     width: 100%;
 715:     height: 100%;
 716:     object-fit: cover;
 717: }
 718: 
 719: .video-controls {
 720:     position: absolute;
 721:     bottom: 0;
 722:     left: 0;
 723:     right: 0;
 724:     padding: var(--ne-spacing-xl);
 725:     display: flex;
 726:     justify-content: center;
 727:     align-items: center;
 728:     gap: var(--ne-spacing-lg);
 729:     background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
 730: }
 731: 
 732: .video-record-btn {
 733:     width: 64px;
 734:     height: 64px;
 735:     border-radius: 50%;
 736:     border: 4px solid var(--ne-white);
 737:     background: transparent;
 738:     cursor: pointer;
 739:     transition: all 0.2s;
 740: }
 741: 
 742: .video-record-btn.recording {
 743:     background: var(--ne-red);
 744:     border-radius: 12px;
 745: }
 746: 
 747: .camera-switch-btn {
 748:     width: 48px;
 749:     height: 48px;
 750:     border-radius: 50%;
 751:     border: var(--glass-border);
 752:     background: rgba(0,0,0,0.5);
 753:     backdrop-filter: blur(8px);
 754:     -webkit-backdrop-filter: blur(8px);
 755:     color: var(--ne-white);
 756:     font-size: 24px;
 757:     cursor: pointer;
 758:     display: flex;
 759:     align-items: center;
 760:     justify-content: center;
 761: }
 762: 
 763: /* ===== RESPONSIVE ===== */
 764: @media (min-width: 768px) {
 765:     .app-main {
 766:         max-width: none !important;
 767:         margin: 0;
 768:     }
 769:     
 770:     .chat-input-container {
 771:         max-width: none;
 772:         left: 0;
 773:         transform: none;
 774:     }
 775:     
 776:     .attach-menu {
 777:         max-width: none;
 778:         left: var(--ne-spacing-lg);
 779:         transform: none;
 780:     }
 781: }
 782: 
 783: @media (min-width: 768px) {
 784:     html, body, #app, .app-main, .container, .tg-web-app {
 785:         max-width: none !important;
 786:         width: 100vw !important;
 787:         height: var(--tg-viewport-stable-height, 100dvh) !important;
 788:         margin: 0 !important;
 789:         padding: 0 !important;
 790:         overflow-x: hidden !important;
 791:     }
 792: }
 793: 
 794: /* ===== REDUCED TRANSPARENCY (Accessibility) ===== */
 795: @media (prefers-reduced-transparency: reduce) {
 796:     .message-bubble,
 797:     .chat-input-container,
 798:     .bottom-nav,
 799:     .btn,
 800:     .form-input {
 801:         backdrop-filter: none;
 802:         -webkit-backdrop-filter: none;
 803:     }
 804:     
 805:     .chat-message.user .message-bubble {
 806:         background: rgba(255, 255, 255, 0.95);
 807:     }
 808:     
 809:     .chat-message.hermes .message-bubble {
 810:         background: rgba(0, 0, 0, 0.95);
 811:     }
 812: }
 813: 
 814: /* ===== NEW UI STRUCTURE v0.20.511 ===== */
 815: /* Top control panel: mic (left) + task spec (right) */
 816: 
 817: .top-control-panel {
 818:     display: flex;
 819:     justify-content: space-between;
 820:     align-items: center;
 821:     gap: var(--ne-spacing-md);
 822:     padding: var(--ne-spacing-sm) var(--ne-spacing-lg);
 823:     background: var(--glass-bg);
 824:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 825:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 826:     border-bottom: var(--glass-border);
 827:     min-height: 56px;
 828: }
 829: 
 830: .left-mic-panel {
 831:     display: flex;
 832:     align-items: center;
 833:     gap: var(--ne-spacing-sm);
 834: }
 835: 
 836: .mic-button {
 837:     width: 44px;
 838:     height: 44px;
 839:     border-radius: 50%;
 840:     background: var(--glass-bg-light);
 841:     border: var(--glass-border);
 842:     display: flex;
 843:     align-items: center;
 844:     justify-content: center;
 845:     cursor: pointer;
 846:     transition: var(--glass-transition);
 847:     font-size: 20px;
 848: }
 849: 
 850: .mic-button:hover {
 851:     background: rgba(255, 255, 255, 0.12);
 852:     border-color: rgba(255, 255, 255, 0.2);
 853: }
 854: 
 855: .mic-button.recording {
 856:     background: rgba(239, 68, 68, 0.2);
 857:     border-color: rgba(239, 68, 68, 0.4);
 858:     animation: pulse-recording 1.5s ease-in-out infinite;
 859: }
 860: 
 861: @keyframes pulse-recording {
 862:     0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
 863:     50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
 864: }
 865: 
 866: .right-contract-panel {
 867:     flex: 1;
 868:     max-width: 60%;
 869:     min-height: 40px;
 870: }
 871: 
 872: .task-spec-container {
 873:     background: var(--glass-bg);
 874:     border: var(--glass-border);
 875:     border-radius: var(--glass-radius-sm);
 876:     padding: var(--ne-spacing-sm) var(--ne-spacing-md);
 877:     font-size: 13px;
 878:     color: var(--ne-light-gray);
 879:     max-height: 120px;
 880:     overflow-y: auto;
 881:     transition: var(--glass-transition);
 882: }
 883: 
 884: .task-spec-container.has-content {
 885:     border-color: rgba(139, 92, 246, 0.3);
 886:     background: rgba(139, 92, 246, 0.05);
 887: }
 888: 
 889: .task-spec-title {
 890:     font-size: 11px;
 891:     font-weight: 600;
 892:     color: var(--ne-purple);
 893:     text-transform: uppercase;
 894:     letter-spacing: 0.5px;
 895:     margin-bottom: 4px;
 896: }
 897: 
 898: /* Vertical connectors */
 899: .vertical-connector {
 900:     position: absolute;
 901:     top: 0;
 902:     bottom: 0;
 903:     width: 1px;
 904:     background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent);
 905:     pointer-events: none;
 906:     z-index: 0;
 907: }
 908: 
 909: .vertical-connector.left {
 910:     left: calc(var(--ne-spacing-lg) + 22px);
 911: }
 912: 
 913: .vertical-connector.right {
 914:     right: calc(var(--ne-spacing-lg) + 22px);
 915: }
 916: 
 917: /* Chat area with top panel spacing */
 918: .view.has-top-panel .chat-messages {
 919:     padding-top: var(--ne-spacing-sm);
 920: }
 921: 
 922: /* Task spec questions */
 923: .task-question {
 924:     margin-top: var(--ne-spacing-sm);
 925:     padding-top: var(--ne-spacing-sm);
 926:     border-top: 1px solid rgba(255, 255, 255, 0.06);
 927: }
 928: 
 929: .task-question p {
 930:     font-size: 12px;
 931:     color: var(--ne-silver);
 932:     margin-bottom: 4px;
 933: }
 934: 
 935: .task-question input {
 936:     width: 100%;
 937:     background: rgba(0, 0, 0, 0.3);
 938:     border: 1px solid rgba(255, 255, 255, 0.1);
 939:     border-radius: 6px;
 940:     padding: 6px 10px;
 941:     color: var(--ne-white);
 942:     font-size: 12px;
 943:     outline: none;
 944:     transition: var(--glass-transition);
 945: }
 946: 
 947: .task-question input:focus {
 948:     border-color: rgba(139, 92, 246, 0.5);
 949: }
 950: 
 951: /* ─── Панель вопросов смарт-контракта ─────────────────────────────── */
 952: .contract-qa-panel {
 953:     margin: var(--ne-spacing-md) var(--ne-spacing-lg);
 954:     padding: var(--ne-spacing-md);
 955:     background: var(--glass-bg);
 956:     border: var(--glass-border);
 957:     border-radius: var(--glass-radius-sm);
 958:     backdrop-filter: blur(8px);
 959:     -webkit-backdrop-filter: blur(8px);
 960: }
 961: 
 962: .qa-item {
 963:     margin-bottom: 10px;
 964:     padding-bottom: 10px;
 965:     border-bottom: 1px solid rgba(255,255,255,0.06);
 966: }
 967: 
 968: .qa-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
 969: 
 970: .qa-question {
 971:     font-size: 0.85rem;
 972:     color: #a0b4ff;
 973:     margin-bottom: 6px;
 974:     line-height: 1.4;
 975: }
 976: 
 977: .qa-answer-input {
 978:     width: 100%;
 979:     padding: 8px 10px;
 980:     background: rgba(0,0,0,0.3);
 981:     border: 1px solid rgba(255,255,255,0.1);
 982:     border-radius: 8px;
 983:     color: #fff;
 984:     font-size: 0.85rem;
 985:     outline: none;
 986:     transition: border-color 0.2s;
 987: }
 988: 
 989: .qa-answer-input:focus { border-color: #00ff88; }
 990: 
 991: .qa-empty { color: #666; font-size: 0.8rem; text-align: center; padding: 8px 0; }
 992: 
 993: /* ─── Голосовой ввод (пульсация) ──────────────────────────────────── */
 994: .mic-button.recording,
 995: #micButton.recording {
 996:     animation: pulse-recording 1.2s infinite ease-in-out;
 997:     border-color: #ff4d4d !important;
 998:     box-shadow: 0 0 12px rgba(255,77,77,0.4);
 999: }
1000: 
1001: @keyframes pulse-recording {
1002:     0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,77,77,0.5); }
1003:     70% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(255,77,77,0); }
1004:     100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,77,77,0); }
1005: }
1006: 
1007: /* ─── История ТЗ ──────────────────────────────────────────────────── */
1008: .task-history-panel {
1009:     position: fixed;
1010:     bottom: 80px;
1011:     left: 50%;
1012:     transform: translateX(-50%) translateY(20px);
1013:     width: 90%;
1014:     max-width: 400px;
1015:     max-height: 50vh;
1016:     background: rgba(18,18,24,0.95);
1017:     border: 1px solid rgba(255,255,255,0.1);
1018:     border-radius: 16px;
1019:     padding: 12px;
1020:     overflow-y: auto;
1021:     opacity: 0;
1022:     pointer-events: none;
1023:     transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
1024:     z-index: 900;
1025:     backdrop-filter: blur(12px);
1026:     -webkit-backdrop-filter: blur(12px);
1027: }
1028: 
1029: .task-history-panel.visible {
1030:     opacity: 1;
1031:     pointer-events: auto;
1032:     transform: translateX(-50%) translateY(0);
1033: }
1034: 
1035: .task-history-panel .history-item {
1036:     display: flex;
1037:     gap: 8px;
1038:     padding: 8px;
1039:     border-radius: 8px;
1040:     cursor: pointer;
1041:     transition: background 0.15s;
1042: }
1043: 
1044: .task-history-panel .history-item:hover { background: rgba(255,255,255,0.06); }
1045: 
1046: .task-history-panel .history-time { color: #666; font-size: 0.75rem; min-width: 42px; }
1047: 
1048: .task-history-panel .history-text { color: #ccc; font-size: 0.8rem; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
1049: 
1050: .task-history-panel .history-empty { color: #555; text-align: center; padding: 16px 0; font-size: 0.8rem; }
1051: 
1052: /* ─── Кнопка экспорта ─────────────────────────────────────────────── */
1053: .export-btn-sm {
1054:     flex: 1;
1055:     padding: 6px 8px;
1056:     background: rgba(255,255,255,0.06);
1057:     border: 1px solid rgba(255,255,255,0.1);
1058:     border-radius: 8px;
1059:     color: var(--ne-light-gray);
1060:     font-size: 0.75rem;
1061:     cursor: pointer;
1062:     transition: var(--glass-transition);
1063: }
1064: 
1065: .export-btn-sm:hover {
1066:     background: rgba(255,255,255,0.12);
1067:     border-color: rgba(255,255,255,0.2);
1068: }
1069: 
1070: .export-btn-sm:active { transform: scale(0.97); }
1071: 
1072: .export-btn {
1073:     margin-top: 10px;
1074:     width: 100%;
1075:     padding: 10px;
1076:     background: linear-gradient(135deg, #00ff88 0%, #00b8ff 100%);
1077:     border: none;
1078:     border-radius: 10px;
1079:     color: #000;
1080:     font-weight: 600;
1081:     font-size: 0.85rem;
1082:     cursor: pointer;
1083:     transition: opacity 0.2s, transform 0.1s;
1084: }
1085: 
1086: .export-btn:active { transform: scale(0.98); opacity: 0.9; }
</file>

<file path="index.html">
  1: <!DOCTYPE html>
  2: <html lang="ru">
  3: <head>
  4:     <meta charset="UTF-8">
  5:     <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  6:     <title>NeuroEscrow</title>
  7:     <script src="https://telegram.org/js/telegram-web-app.js"></script>
  8:     <script src="https://unpkg.com/@tonconnect/ui@latest/dist/tonconnect-ui.min.js"></script>
  9:     <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
 10:     <link rel="stylesheet" href="css/style.css">
 11:     
 12:     <!-- Telegram Mini App SDK Initialization (Phase 6.5) -->
 13:     <script>
 14:         // Initialize Telegram WebApp SDK (v9.x)
 15:         if (window.Telegram && window.Telegram.WebApp) {
 16:             const tg = window.Telegram.WebApp;
 17:             
 18:             // Enable closing confirmation
 19:             tg.enableClosingConfirmation();
 20:             
 21:             // Apply theme colors
 22:             document.documentElement.style.setProperty('--tg-theme-bg-color', tg.themeParams.bg_color || '#ffffff');
 23:             document.documentElement.style.setProperty('--tg-theme-text-color', tg.themeParams.text_color || '#000000');
 24:             document.documentElement.style.setProperty('--tg-theme-hint-color', tg.themeParams.hint_color || '#999999');
 25:             document.documentElement.style.setProperty('--tg-theme-link-color', tg.themeParams.link_color || '#2481cc');
 26:             document.documentElement.style.setProperty('--tg-theme-button-color', tg.themeParams.button_color || '#2481cc');
 27:             document.documentElement.style.setProperty('--tg-theme-button-text-color', tg.themeParams.button_text_color || '#ffffff');
 28:             
 29:             // Signal ready state (expand/fullscreen handled in app.js)
 30:             tg.ready();
 31:             
 32:             console.log('[TG WebApp] Initialized', {
 33:                 version: tg.version,
 34:                 platform: tg.platform,
 35:                 colorScheme: tg.colorScheme,
 36:                 viewportHeight: tg.viewportHeight,
 37:                 isExpanded: tg.isExpanded
 38:             });
 39:         } else {
 40:             console.warn('[TG WebApp] SDK not loaded, running in standalone mode');
 41:         }
 42:     </script>
 43: </head>
 44: <body>
 45:     <div id="app">
 46:         <!-- Header -->
 47:         <header class="app-header">
 48:             <div class="header-content">
 49:                 <h1>NeuroEscrow</h1>
 50:                 <div class="user-info">
 51:                     <span id="user-name">Загрузка...</span>
 52:                     <button id="tg-fullscreen-btn" class="btn btn-secondary" style="font-size:12px;padding:4px 10px;margin-left:8px;display:none;">🖥️ На весь экран</button>
 53:                 </div>
 54:             </div>
 55:         </header>
 56: 
 57:         <!-- Main Content -->
 58:         <main class="app-main" id="main-content">
 59:             <!-- Views will be rendered here -->
 60:         </main>
 61: 
 62:         <!-- Chat Input (Fixed at bottom, only visible on Hermes tab) -->
 63:         <div class="chat-input-container" id="chat-input-container" style="display:none;">
 64:             <button class="attach-btn" id="attach-btn" onclick="app.showAttachMenu()">
 65:                 <span>📎</span>
 66:             </button>
 67:             <input type="text" class="chat-input" id="chat-input" placeholder="Напишите сообщение..." />
 68:             <button class="send-btn" id="send-btn" onclick="app.sendTextMessage()">
 69:                 <span>➤</span>
 70:             </button>
 71:         </div>
 72: 
 73:         <!-- Attach Menu -->
 74:         <div class="attach-menu" id="attach-menu" style="display:none;">
 75:             <button class="attach-option" onclick="app.attachPhoto()">
 76:                 <span class="attach-icon">📷</span>
 77:                 <span>Фото</span>
 78:             </button>
 79:             <button class="attach-option" onclick="app.attachVideo()">
 80:                 <span class="attach-icon">🎥</span>
 81:                 <span>Видео</span>
 82:             </button>
 83:             <button class="attach-option" onclick="app.recordVideo()">
 84:                 <span class="attach-icon">📹</span>
 85:                 <span>Записать видео</span>
 86:             </button>
 87:             <button class="attach-option" onclick="app.shareScreen()">
 88:                 <span class="attach-icon">🖥️</span>
 89:                 <span>Экран</span>
 90:             </button>
 91:         </div>
 92: 
 93:         <!-- Bottom Navigation -->
 94:         <nav class="bottom-nav">
 95:             <button class="nav-btn active" data-view="hermes" onclick="app.navigate('hermes')">
 96:                 <span class="nav-icon">🎙️</span>
 97:                 <span class="nav-label">Гермес</span>
 98:             </button>
 99:             <button class="nav-btn" data-view="deals" onclick="app.navigate('deals')">
100:                 <span class="nav-icon">🤝</span>
101:                 <span class="nav-label">Сделки</span>
102:             </button>
103:             <button class="nav-btn" data-view="profile" onclick="app.navigate('profile')">
104:                 <span class="nav-icon">👤</span>
105:                 <span class="nav-label">Профиль</span>
106:             </button>
107:         </nav>
108:     </div>
109: 
110:     <!-- Scripts -->
111:     <script src="js/telegram.js"></script>
112:     <script src="js/tonconnect.js"></script>
113:     <script src="js/charts.js"></script>
114:     <script src="js/app.js"></script>
115: </body>
116: </html>
</file>

<file path="js/app.js">
   1: /**
   2:  * NeuroEscrow — Voice-First Intelligent Agent
   3:  * Hermes connects clients and neurocoders through voice
   4:  */
   5: 
   6: class NeuroEscrowApp {
   7:     constructor() {
   8:         this.currentView = 'hermes';
   9:         this.userData = null;
  10:         this.voiceState = 'IDLE'; // IDLE, LISTENING, PROCESSING
  11:         this.isRecording = false;
  12:         this.isProcessing = false;
  13:         this.deals = [];
  14:         this.balance = 0;
  15:         this.responseTimeout = null;
  16:         this.mediaRecorder = null;
  17:         this.audioChunks = [];
  18:         this.chatMessages = [];
  19:         this.currentStream = null;
  20:         this.currentFacingMode = 'user';
  21:         this.recognition = null;
  22:         this.contractAnswers = {};
  23:         this.taskSpecHistory = [];
  24:         
  25:         this.init();
  26:     }
  27: 
  28:     async init() {
  29:         if (window.Telegram?.WebApp) {
  30:             const tg = window.Telegram.WebApp;
  31:             tg.ready();
  32: 
  33:             // Bot API 8.0+: requestFullscreen for desktop/immersive, fallback to expand()
  34:             // Fullscreen requires user gesture on Desktop — handled by button below
  35:             if (typeof tg.requestFullscreen === 'function') {
  36:                 const fsResult = tg.requestFullscreen();
  37:                 if (fsResult && typeof fsResult.catch === 'function') {
  38:                     fsResult.catch(() => {
  39:                         // User gesture required on Desktop — fallback to expand()
  40:                         tg.expand();
  41:                     });
  42:                 } else {
  43:                     // requestFullscreen returned undefined — fallback to expand()
  44:                     tg.expand();
  45:                 }
  46:             } else {
  47:                 tg.expand();
  48:             }
  49: 
  50:             // Listen for fullscreen state changes
  51:             tg.onEvent('fullscreenChanged', () => {
  52:                 console.log('[TG] fullscreenChanged:', tg.isFullscreen);
  53:                 const fsBtn = document.getElementById('tg-fullscreen-btn');
  54:                 if (fsBtn) fsBtn.style.display = tg.isFullscreen ? 'none' : 'inline-block';
  55:             });
  56: 
  57:             // Handle fullscreen failure gracefully
  58:             tg.onEvent('fullscreenFailed', (reason) => {
  59:                 console.warn('[TG] fullscreenFailed:', reason);
  60:                 tg.expand(); // Fallback
  61:             });
  62: 
  63:             // Safe area insets — apply CSS padding to respect device notches
  64:             this.applySafeAreaInsets();
  65:             tg.onEvent('safeAreaChanged', () => this.applySafeAreaInsets());
  66:             tg.onEvent('contentSafeAreaChanged', () => this.applySafeAreaInsets());
  67:         }
  68:         this.userData = telegram.getUser();
  69:         this.updateHeader();
  70:         await this.loadCache();
  71:         this.navigate('hermes');
  72: 
  73:         window.addEventListener('ton:statusChange', (e) => {
  74:             this.onTonStatusChange(e.detail);
  75:         });
  76: 
  77:         this.requestDataFromBot();
  78: 
  79:         // Fullscreen button handler (user gesture required on TG Desktop)
  80:         const fsBtn = document.getElementById('tg-fullscreen-btn');
  81:         if (fsBtn && window.Telegram?.WebApp) {
  82:             const tg = window.Telegram.WebApp;
  83:             if (typeof tg.requestFullscreen === 'function') {
  84:                 fsBtn.addEventListener('click', () => {
  85:                     const fsResult = tg.requestFullscreen();
  86:                     if (fsResult && typeof fsResult.catch === 'function') {
  87:                         fsResult.catch(e => {
  88:                             console.warn('[TG] Fullscreen blocked:', e);
  89:                             tg.expand(); // Fallback
  90:                         });
  91:                     } else {
  92:                         tg.expand(); // Fallback
  93:                     }
  94:                 });
  95:                 // Hide button if already in fullscreen
  96:                 if (tg.isFullscreen === true) {
  97:                     fsBtn.style.display = 'none';
  98:                 }
  99:             } else {
 100:                 fsBtn.style.display = 'none';
 101:             }
 102:         }
 103: 
 104:         // Enter key fix for chat input — prevent form submit / page reload
 105:         const chatInput = document.getElementById('chat-input');
 106:         if (chatInput) {
 107:             chatInput.addEventListener('keydown', (e) => {
 108:                 if (e.key === 'Enter' && !e.shiftKey) {
 109:                     e.preventDefault();
 110:                     this.sendTextMessage();
 111:                 }
 112:             });
 113:         }
 114: 
 115:         // Prevent any accidental form submit if input is wrapped in <form>
 116:         const chatContainer = document.getElementById('chat-input-container');
 117:         if (chatContainer) {
 118:             chatContainer.addEventListener('submit', (e) => e.preventDefault());
 119:         }
 120: 
 121:         // Ensure send button is type="button" not "submit"
 122:         const sendBtn = document.getElementById('send-btn');
 123:         if (sendBtn && !sendBtn.getAttribute('type')) {
 124:             sendBtn.setAttribute('type', 'button');
 125:         }
 126: 
 127:         // Priority 2-3: Voice input, Contract Q&A, Task Spec history
 128:         this.initVoiceInput();
 129:         this.loadTaskSpecHistory();
 130: 
 131:         const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
 132:         if (micBtn) micBtn.onclick = () => this.toggleVoiceRecording();
 133: 
 134:         const exportBtn = document.getElementById('exportTaskSpecBtn');
 135:         if (exportBtn) exportBtn.onclick = () => this.exportTaskSpec();
 136: 
 137:         const historyToggle = document.getElementById('toggleTaskHistoryBtn');
 138:         const historyPanel = document.getElementById('task-history-panel');
 139:         if (historyToggle && historyPanel) {
 140:             historyToggle.onclick = () => {
 141:                 historyPanel.classList.toggle('visible');
 142:                 telegram.haptic('light');
 143:             };
 144:         }
 145: 
 146:         this.renderContractQuestions([
 147:             { id: 'q1', text: 'Каков дедлайн исполнения смарт-контракта?' },
 148:             { id: 'q2', text: 'Укажите условия возврата средств при срыве сроков.' },
 149:             { id: 'q3', text: 'Требуется ли арбитраж третьей стороны?' }
 150:         ]);
 151:     }
 152: 
 153:     updateHeader() {
 154:         const nameEl = document.getElementById('user-name');
 155:         
 156:         if (this.userData) {
 157:             const name = this.userData.first_name || this.userData.username || 'Пользователь';
 158:             nameEl.textContent = name;
 159:         } else {
 160:             nameEl.textContent = 'Гость';
 161:         }
 162:     }
 163: 
 164:     applySafeAreaInsets() {
 165:         const tg = window.Telegram?.WebApp;
 166:         if (!tg) return;
 167: 
 168:         // Apply safe area insets as CSS custom properties
 169:         // Docs: https://docs.telegram-mini-apps.com/packages/tma-js-sdk/features/viewport
 170:         const root = document.documentElement;
 171:         if (tg.safeAreaInset) {
 172:             root.style.setProperty('--tg-safe-area-inset-top', `${tg.safeAreaInset.top}px`);
 173:             root.style.setProperty('--tg-safe-area-inset-bottom', `${tg.safeAreaInset.bottom}px`);
 174:             root.style.setProperty('--tg-safe-area-inset-left', `${tg.safeAreaInset.left}px`);
 175:             root.style.setProperty('--tg-safe-area-inset-right', `${tg.safeAreaInset.right}px`);
 176:         }
 177:         if (tg.contentSafeAreaInset) {
 178:             root.style.setProperty('--tg-content-safe-area-inset-top', `${tg.contentSafeAreaInset.top}px`);
 179:             root.style.setProperty('--tg-content-safe-area-inset-bottom', `${tg.contentSafeAreaInset.bottom}px`);
 180:         }
 181: 
 182:         // Use viewportStableHeight for layout (doesn't change during gestures)
 183:         if (tg.viewportStableHeight) {
 184:             root.style.setProperty('--tg-viewport-stable-height', `${tg.viewportStableHeight}px`);
 185:         }
 186:     }
 187: 
 188:     navigate(view) {
 189:         // Reset voice state when switching tabs
 190:         if (view !== 'hermes' && this.voiceState !== 'IDLE') {
 191:             this.resetVoiceState();
 192:         }
 193:         
 194:         this.currentView = view;
 195:         
 196:         document.querySelectorAll('.nav-btn').forEach(btn => {
 197:             btn.classList.toggle('active', btn.dataset.view === view);
 198:         });
 199:         
 200:         const main = document.getElementById('main-content');
 201:         main.innerHTML = '';
 202:         
 203:         // Show/hide chat input based on view
 204:         const chatInput = document.getElementById('chat-input-container');
 205:         if (chatInput) {
 206:             chatInput.style.display = view === 'hermes' ? 'flex' : 'none';
 207:         }
 208:         
 209:         switch(view) {
 210:             case 'hermes':
 211:                 this.renderHermesView(main);
 212:                 break;
 213:             case 'deals':
 214:                 this.renderDealsView(main);
 215:                 break;
 216:             case 'profile':
 217:                 this.renderProfileView(main);
 218:                 break;
 219:         }
 220:         
 221:         telegram.haptic('light');
 222:     }
 223: 
 224:     // -------------------------------------------------------------------------
 225:     // Hermes View (Voice Interface - Main Screen)
 226:     // -------------------------------------------------------------------------
 227: 
 228:     renderHermesView(container) {
 229:         const view = document.createElement('div');
 230:         view.className = 'view has-top-panel';
 231:         
 232:         view.innerHTML = `
 233:             <div class="top-control-panel">
 234:                 <div class="left-mic-panel">
 235:                     <button class="mic-button" id="micButton">
 236:                         <span class="voice-icon">🎙️</span>
 237:                     </button>
 238:                 </div>
 239:                 <div class="right-contract-panel">
 240:                     <div id="task-spec" class="task-spec-container">
 241:                         <div class="task-spec-title">Техническое задание</div>
 242:                         <div id="task-spec-content">Ожидание ТЗ от Гермеса...</div>
 243:                         <div style="display:flex;gap:6px;margin-top:8px;">
 244:                             <button id="exportTaskSpecBtn" class="export-btn-sm" type="button">📥 Экспорт</button>
 245:                             <button id="toggleTaskHistoryBtn" class="export-btn-sm" type="button">📜 История</button>
 246:                         </div>
 247:                     </div>
 248:                 </div>
 249:             </div>
 250:             <div class="chat-messages" id="chat-messages"></div>
 251:             <div id="contract-qa-container" class="contract-qa-panel"></div>
 252:             <div id="task-history-panel" class="task-history-panel">
 253:                 <div id="task-history-list"></div>
 254:             </div>
 255:         `;
 256:         
 257:         container.appendChild(view);
 258:         this.renderChatMessages();
 259:     }
 260: 
 261:     toggleVoice() {
 262:         // Explicit protection against multiple taps during processing
 263:         if (this.voiceState === 'PROCESSING' || this.isProcessing) {
 264:             return;
 265:         }
 266:         
 267:         if (this.voiceState === 'LISTENING') {
 268:             this.stopVoiceRecording();
 269:         } else {
 270:             this.voiceState = 'LISTENING';
 271:             this.updateVoiceButton();
 272:             this.startVoiceRecording();
 273:         }
 274:         
 275:         telegram.haptic('medium');
 276:     }
 277: 
 278:     async startVoiceRecording() {
 279:         try {
 280:             const tg = window.Telegram?.WebApp;
 281:             // Try native Telegram voice recording (Bot API 9.6+)
 282:             if (tg && typeof tg.requestVoiceMessage === 'function') {
 283:                 const result = await tg.requestVoiceMessage();
 284:                 
 285:                 if (result && result.file_id) {
 286:                     this.sendVoiceToBot(result.file_id, result.duration);
 287:                 } else {
 288:                     throw new Error('No file_id received');
 289:                 }
 290:             } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
 291:                 // Fallback to manual recording
 292:                 this.fallbackToManualRecording();
 293:             } else {
 294:                 telegram.showAlert('Запись голоса не поддерживается в вашем браузере. Используйте текстовый ввод.');
 295:             }
 296:         } catch (error) {
 297:             console.error('[Voice] Recording failed:', error.message);
 298:             this.handleVoiceError(error);
 299:         }
 300:     }
 301: 
 302:     stopVoiceRecording() {
 303:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
 304:             this.mediaRecorder.stop();
 305:         }
 306:         this.resetVoiceState();
 307:     }
 308: 
 309:     fallbackToManualRecording() {
 310:         navigator.mediaDevices.getUserMedia({ audio: true })
 311:             .then(stream => {
 312:                 this.mediaRecorder = new MediaRecorder(stream);
 313:                 this.audioChunks = [];
 314:                 
 315:                 this.mediaRecorder.ondataavailable = (e) => {
 316:                     this.audioChunks.push(e.data);
 317:                 };
 318:                 
 319:                 this.mediaRecorder.onstop = () => {
 320:                     const audioBlob = new Blob(this.audioChunks, { type: 'audio/ogg' });
 321:                     this.uploadVoiceBlob(audioBlob);
 322:                     stream.getTracks().forEach(track => track.stop());
 323:                 };
 324:                 
 325:                 this.mediaRecorder.start();
 326:                 console.log('[NeuroEscrow] Fallback recording started');
 327:             })
 328:             .catch(error => {
 329:                 this.handleVoiceError(error);
 330:             });
 331:     }
 332: 
 333:     uploadVoiceBlob(blob) {
 334:         // This would require bot-side endpoint for blob upload
 335:         // For now, just show error
 336:         this.handleVoiceError(new Error('Manual recording not yet implemented'));
 337:     }
 338: 
 339:     sendVoiceToBot(fileId, duration) {
 340:         this.voiceState = 'PROCESSING';
 341:         this.isProcessing = true;
 342:         this.updateVoiceButton();
 343:         this.setupResponseTimeout();
 344:         
 345:         const payload = {
 346:             action: 'voice_message',
 347:             file_id: fileId,
 348:             duration: duration,
 349:             timestamp: Date.now(),
 350:             user_id: telegram.getUserId()
 351:         };
 352:         
 353:         telegram.sendData(payload);
 354:         console.log('[NeuroEscrow] Voice sent to bot:', fileId);
 355:     }
 356: 
 357:     updateVoiceButton() {
 358:         const btn = document.getElementById('voice-btn');
 359:         const status = document.getElementById('voice-status');
 360:         
 361:         if (!btn) return;
 362:         
 363:         // Remove all state classes
 364:         btn.classList.remove('recording', 'processing');
 365:         
 366:         switch (this.voiceState) {
 367:             case 'IDLE':
 368:                 if (status) { status.textContent = ''; status.style.display = 'none'; }
 369:                 this.isRecording = false;
 370:                 break;
 371:                 
 372:             case 'LISTENING':
 373:                 btn.classList.add('recording');
 374:                 if (status) { status.textContent = 'Слушаю...'; status.style.display = 'block'; }
 375:                 this.isRecording = true;
 376:                 break;
 377:                 
 378:             case 'PROCESSING':
 379:                 btn.classList.add('processing');
 380:                 if (status) { status.textContent = 'Гермес обрабатывает...'; status.style.display = 'block'; }
 381:                 this.isRecording = false;
 382:                 break;
 383:         }
 384:     }
 385: 
 386:     setupResponseTimeout() {
 387:         if (this.responseTimeout) {
 388:             clearTimeout(this.responseTimeout);
 389:         }
 390:         
 391:         this.responseTimeout = setTimeout(() => {
 392:             if (this.voiceState === 'PROCESSING') {
 393:                 this.handleVoiceError(new Error('timeout'));
 394:             }
 395:         }, 30000);
 396:     }
 397: 
 398:     handleVoiceError(error) {
 399:         console.error('[NeuroEscrow] Voice error:', error);
 400:         
 401:         this.resetVoiceState();
 402:         
 403:         let message = 'Ошибка записи голоса';
 404:         
 405:         if (error.message.includes('permission')) {
 406:             message = 'Нет доступа к микрофону';
 407:         } else if (error.message.includes('timeout')) {
 408:             message = 'Превышено время ожидания';
 409:         } else if (error.message.includes('cancelled')) {
 410:             message = 'Запись отменена';
 411:         }
 412:         
 413:         telegram.showAlert(message);
 414:         telegram.hapticNotification('error');
 415:     }
 416: 
 417:     resetVoiceState() {
 418:         this.voiceState = 'IDLE';
 419:         this.isRecording = false;
 420:         this.isProcessing = false;
 421:         this.updateVoiceButton();
 422:         
 423:         if (this.responseTimeout) {
 424:             clearTimeout(this.responseTimeout);
 425:             this.responseTimeout = null;
 426:         }
 427:     }
 428: 
 429:     handleDraftCreated(draft) {
 430:         if (this.responseTimeout) {
 431:             clearTimeout(this.responseTimeout);
 432:         }
 433:         
 434:         // Check for duplicates
 435:         const existingIndex = this.deals.findIndex(d => d.id === draft.id);
 436:         if (existingIndex !== -1) {
 437:             this.deals[existingIndex] = { ...draft, type: 'draft', isNew: true };
 438:         } else {
 439:             this.deals.unshift({ ...draft, type: 'draft', isNew: true });
 440:         }
 441:         
 442:         this.resetVoiceState();
 443:         this.saveCache(); // Save immediately after adding draft
 444:         this.navigate('deals');
 445:         
 446:         telegram.hapticNotification('success');
 447:         telegram.showAlert('Черновик создан');
 448:         
 449:         console.log('[NeuroEscrow] Draft created:', draft.id);
 450:     }
 451: 
 452:     // -------------------------------------------------------------------------
 453:     // Deals View
 454:     // -------------------------------------------------------------------------
 455: 
 456:     renderDealsView(container) {
 457:         const view = document.createElement('div');
 458:         view.className = 'view';
 459:         
 460:         const deals = this.deals.length > 0 ? this.deals : this.getSampleDeals();
 461:         
 462:         view.innerHTML = `
 463:             <h2 style="font-size:18px;margin-bottom:16px;font-weight:600;">Мои сделки</h2>
 464:             ${deals.length === 0 ? this.emptyState('🤝', 'У вас пока нет сделок') : ''}
 465:             <div id="deals-list">
 466:                 ${deals.map(deal => deal.type === 'draft' ? this.renderDraftCard(deal) : this.dealCard(deal)).join('')}
 467:             </div>
 468:         `;
 469:         
 470:         container.appendChild(view);
 471:     }
 472: 
 473:     renderDraftCard(draft) {
 474:         const title = this.escapeHtml(draft.title || 'Без названия');
 475:         const description = this.escapeHtml(draft.description || '');
 476:         const budget = draft.budget || 'Не указан';
 477:         const deadline = draft.deadline || 'Не указан';
 478:         
 479:         return `
 480:             <div class="card draft-card" style="border-left:2px solid rgba(255, 255, 255, 0.34);">
 481:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
 482:                     <span style="font-size:12px;font-weight:600;color:rgba(255, 255, 255, 0.34);text-transform:uppercase;letter-spacing:0.5px;">Черновик</span>
 483:                     <span style="font-size:11px;color:var(--ne-light-gray);">${this.formatDate(draft.created_at)}</span>
 484:                 </div>
 485:                 <div class="card-title">${title}</div>
 486:                 <p style="font-size:13px;color:var(--ne-light-gray);margin:8px 0;">${description}</p>
 487:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
 488:                     <span>💰 ${budget}</span>
 489:                     <span>⏱️ ${deadline}</span>
 490:                 </div>
 491:                 <div style="display:flex;gap:8px;margin-top:12px;">
 492:                     <button class="btn btn-primary" onclick="app.editDraft('${draft.id}')" style="flex:1;">Редактировать</button>
 493:                     <button class="btn btn-secondary" onclick="app.publishDraft('${draft.id}')" style="flex:1;">Опубликовать</button>
 494:                 </div>
 495:             </div>
 496:         `;
 497:     }
 498: 
 499:     dealCard(deal) {
 500:         const statusColors = {
 501:             'draft': 'rgba(255, 255, 255, 0.34)',
 502:             'negotiating': '#dddddd',
 503:             'in_progress': '#dddddd',
 504:             'completed': 'rgba(255, 255, 255, 0.67)'
 505:         };
 506:         
 507:         const statusNames = {
 508:             'draft': 'Черновик',
 509:             'negotiating': 'Переговоры',
 510:             'in_progress': 'В работе',
 511:             'completed': 'Завершена'
 512:         };
 513:         
 514:         const color = statusColors[deal.status] || 'rgba(255, 255, 255, 0.34)';
 515:         const statusName = statusNames[deal.status] || deal.status;
 516:         
 517:         return `
 518:             <div class="card" style="border-left:2px solid ${color};">
 519:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
 520:                     <span style="font-size:12px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${statusName}</span>
 521:                     <span style="font-size:11px;color:var(--ne-light-gray);">#${deal.id}</span>
 522:                 </div>
 523:                 <div class="card-title">${deal.title}</div>
 524:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
 525:                     <span>💰 ${deal.budget} USDT</span>
 526:                     <span>👤 ${deal.counterparty}</span>
 527:                 </div>
 528:                 <div style="margin-top:12px;">
 529:                     <button class="btn btn-secondary" onclick="app.viewDeal('${deal.id}')">Открыть в боте</button>
 530:                 </div>
 531:             </div>
 532:         `;
 533:     }
 534: 
 535:     getSampleDeals() {
 536:         return [
 537:             { id: 'a1b2', title: 'Telegram бот для интернет-магазина', status: 'in_progress', budget: '500', counterparty: 'client_42' },
 538:             { id: 'c3d4', title: 'Парсер данных с сайта', status: 'completed', budget: '300', counterparty: 'client_17' },
 539:         ];
 540:     }
 541: 
 542:     viewDeal(dealId) {
 543:         telegram.sendData({ action: 'view_deal', deal_id: dealId });
 544:         telegram.showAlert('Открываю детали сделки в боте...');
 545:     }
 546: 
 547:     editDraft(draftId) {
 548:         telegram.sendData({ action: 'edit_draft', draft_id: draftId });
 549:         telegram.showAlert('Открываю редактор в боте...');
 550:     }
 551: 
 552:     publishDraft(draftId) {
 553:         telegram.sendData({ action: 'publish_draft', draft_id: draftId });
 554:         telegram.showAlert('Публикую черновик...');
 555:     }
 556: 
 557:     escapeHtml(text) {
 558:         const div = document.createElement('div');
 559:         div.textContent = text;
 560:         return div.innerHTML;
 561:     }
 562: 
 563:     formatDate(timestamp) {
 564:         if (!timestamp) return '';
 565:         const date = new Date(timestamp * 1000);
 566:         const now = new Date();
 567:         const diff = now - date;
 568:         
 569:         if (diff < 60000) return 'только что';
 570:         if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
 571:         if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
 572:         
 573:         return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
 574:     }
 575: 
 576:     // -------------------------------------------------------------------------
 577:     // Profile View
 578:     // -------------------------------------------------------------------------
 579: 
 580:     renderProfileView(container) {
 581:         const view = document.createElement('div');
 582:         view.className = 'view';
 583:         
 584:         view.innerHTML = `
 585:             <div class="card" style="text-align:center;padding:24px;">
 586:                 <div style="font-size:32px;font-weight:700;margin-bottom:8px;">${this.balance.toFixed(2)} USDT</div>
 587:                 <div style="font-size:13px;color:var(--ne-light-gray);margin-bottom:20px;">Ваш баланс</div>
 588:                 
 589:                 <div style="display:flex;gap:8px;margin-bottom:16px;">
 590:                     <button class="btn btn-primary" onclick="app.donate()" style="flex:1;">
 591:                         💝 Поддержать
 592:                     </button>
 593:                     <button class="btn btn-secondary" onclick="app.leaveTip()" style="flex:1;">
 594:                         ⭐ Чаевые
 595:                     </button>
 596:                 </div>
 597:                 
 598:                 <div style="font-size:11px;color:var(--ne-light-gray);margin-top:12px;">
 599:                     TON • USDT • Telegram Stars
 600:                 </div>
 601:             </div>
 602:             
 603:             <div id="ton-connect" style="margin:16px 0;"></div>
 604:             
 605:             <div class="card">
 606:                 <div class="card-title">Настройки</div>
 607:                 <div class="form-group">
 608:                     <label class="form-label">LLM Модель</label>
 609:                     <select class="form-input" id="model-selector">
 610:                         <option value="auto">Автоматически</option>
 611:                         <option value="gpt-4">GPT-4</option>
 612:                         <option value="claude">Claude</option>
 613:                         <option value="grok">Grok</option>
 614:                         <option value="custom">Своя модель</option>
 615:                     </select>
 616:                 </div>
 617:             </div>
 618:         `;
 619:         
 620:         container.appendChild(view);
 621:         
 622:         setTimeout(() => {
 623:             tonConnect.init('ton-connect');
 624:         }, 100);
 625:     }
 626: 
 627:     donate() {
 628:         telegram.showAlert('Выберите способ:\n\n⭐ Stars: 50, 100, 250, 500\n💎 TON: 1, 5, 10, 25\n💵 USDT: 5, 10, 25, 50');
 629:     }
 630: 
 631:     leaveTip() {
 632:         telegram.showAlert('Быстрые чаевые:\n\n10 ⭐ | 25 ⭐ | 50 ⭐ | 100 ⭐');
 633:     }
 634: 
 635:     onTonStatusChange(detail) {
 636:         console.log('[App] TON status changed:', detail);
 637:     }
 638: 
 639:     async loadCache() {
 640:         try {
 641:             const cached = await telegram.cloudGet('neuroescrow_data');
 642:             if (cached) {
 643:                 this.deals = cached.deals || [];
 644:                 this.balance = cached.balance || 0;
 645:                 this.chatMessages = cached.chatMessages || [];
 646:                 console.log('[App] Cache loaded');
 647:             }
 648:         } catch (e) {
 649:             console.log('[App] No cache found');
 650:         }
 651:     }
 652: 
 653:     async saveCache() {
 654:         const data = {
 655:             deals: this.deals,
 656:             balance: this.balance,
 657:             chatMessages: this.chatMessages,
 658:             timestamp: Date.now()
 659:         };
 660:         await telegram.cloudSet('neuroescrow_data', data);
 661:     }
 662: 
 663:     async loadSession(sessionId) {
 664:         const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
 665:             ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
 666:             : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
 667: 
 668:         try {
 669:             const resp = await fetch(baseUrl + 'session/' + sessionId, { mode: 'cors' });
 670:             if (!resp.ok) return;
 671: 
 672:             const session = await resp.json();
 673:             const messages = session.messages || [];
 674: 
 675:             this.chatMessages = messages.map(msg => ({
 676:                 sender: msg.role === 'user' ? 'user' : 'hermes',
 677:                 text: msg.content || msg.text || '',
 678:                 timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()
 679:             }));
 680: 
 681:             this.renderChatMessages();
 682:             this.saveCache();
 683:         } catch (e) {
 684:             console.error('[App] Load session error:', e.message);
 685:         }
 686:     }
 687: 
 688:     async loadSessionsList() {
 689:         const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
 690:             ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
 691:             : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
 692: 
 693:         try {
 694:             const resp = await fetch(baseUrl + 'sessions', { mode: 'cors' });
 695:             if (!resp.ok) return [];
 696:             return await resp.json();
 697:         } catch (e) {
 698:             console.error('[App] Load sessions error:', e.message);
 699:             return [];
 700:         }
 701:     }
 702: 
 703:     requestDataFromBot() {
 704:         telegram.sendData({ action: 'get_dashboard_data' });
 705:     }
 706: 
 707:     handleBotData(data) {
 708:         console.log('[App] Data from bot:', data);
 709:         
 710:         // Handle different event types
 711:         if (data.event === 'draft_created' && data.draft) {
 712:             this.handleDraftCreated(data.draft);
 713:             return;
 714:         }
 715:         
 716:         if (data.event === 'error') {
 717:             this.handleVoiceError(new Error(data.error || 'Unknown error'));
 718:             return;
 719:         }
 720: 
 721:         if (data.event === 'hermes_reply' && data.text) {
 722:             this.addChatMessage('hermes', data.text);
 723:             return;
 724:         }
 725: 
 726:         if (data.event === 'moderation_block') {
 727:             telegram.showAlert('⚠️ Ваш контент нарушает правила платформы');
 728:             return;
 729:         }
 730:         
 731:         // Handle dashboard data
 732:         if (data.deals) this.deals = data.deals;
 733:         if (data.balance !== undefined) this.balance = data.balance;
 734:         
 735:         this.saveCache();
 736:         
 737:         const main = document.getElementById('main-content');
 738:         main.innerHTML = '';
 739:         switch(this.currentView) {
 740:             case 'hermes': this.renderHermesView(main); break;
 741:             case 'deals': this.renderDealsView(main); break;
 742:             case 'profile': this.renderProfileView(main); break;
 743:         }
 744:     }
 745: 
 746:     emptyState(icon, text) {
 747:         return `
 748:             <div class="empty-state">
 749:                 <div class="empty-icon">${icon}</div>
 750:                 <div class="empty-text">${text}</div>
 751:             </div>
 752:         `;
 753:     }
 754: 
 755:     // -------------------------------------------------------------------------
 756:     // Chat Interface Methods
 757:     // -------------------------------------------------------------------------
 758: 
 759:     renderChatMessages() {
 760:         const container = document.getElementById('chat-messages');
 761:         if (!container) return;
 762: 
 763:         container.innerHTML = this.chatMessages.map((msg, idx) => {
 764:             const isLastHermes = idx === this.chatMessages.length - 1 && msg.sender === 'hermes' && msg.text === '';
 765:             const streamingClass = isLastHermes ? ' streaming' : '';
 766:             const isHermesComplete = msg.sender === 'hermes' && msg.text !== '' && !isLastHermes;
 767:             const feedbackHtml = isHermesComplete && !msg.feedback ? `
 768:                 <div class="feedback-buttons">
 769:                     <button class="feedback-btn" onclick="app.submitFeedback(${idx}, 'up')">👍</button>
 770:                     <button class="feedback-btn" onclick="app.submitFeedback(${idx}, 'down')">👎</button>
 771:                 </div>
 772:             ` : '';
 773:             return `
 774:             <div class="chat-message ${msg.sender}">
 775:                 <div class="message-bubble${streamingClass}">
 776:                     ${this.escapeHtml(msg.text)}
 777:                     <span class="msg-time">${this.formatTime(msg.timestamp)}</span>
 778:                     ${feedbackHtml}
 779:                 </div>
 780:             </div>
 781:         `;
 782:         }).join('');
 783: 
 784:         this.scrollToBottom();
 785:     }
 786: 
 787:     scrollToBottom() {
 788:         const container = document.getElementById('chat-messages');
 789:         if (!container) return;
 790:         requestAnimationFrame(() => {
 791:             container.scrollTop = container.scrollHeight;
 792:         });
 793:     }
 794: 
 795:     addChatMessage(sender, text) {
 796:         this.chatMessages.push({
 797:             sender,
 798:             text,
 799:             timestamp: Date.now()
 800:         });
 801:         this.renderChatMessages();
 802:         this.saveCache();
 803:     }
 804: 
 805:     showTypingIndicator() {
 806:         const container = document.getElementById('chat-messages');
 807:         if (!container) return;
 808:         const typing = document.createElement('div');
 809:         typing.className = 'typing-indicator';
 810:         typing.id = 'typing-indicator';
 811:         typing.innerHTML = '<span>Гермес печатает</span><div class="dot"></div><div class="dot"></div><div class="dot"></div>';
 812:         container.appendChild(typing);
 813:         container.scrollTop = container.scrollHeight;
 814:     }
 815: 
 816:     hideTypingIndicator() {
 817:         const typing = document.getElementById('typing-indicator');
 818:         if (typing) typing.remove();
 819:     }
 820: 
 821:     async sendTextMessage() {
 822:         const input = document.getElementById('chat-input');
 823:         if (!input || !input.value.trim()) return;
 824: 
 825:         const text = input.value.trim();
 826:         this.addChatMessage('user', text);
 827:         input.value = '';
 828: 
 829:         telegram.haptic('light');
 830: 
 831:         // Call Hermes backend
 832:         try {
 833:             const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
 834:                 ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
 835:                 : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
 836: 
 837:             console.log('[Chat] Fetching:', baseUrl + 'chat');
 838: 
 839:             // Show typing indicator
 840:             this.showTypingIndicator();
 841: 
 842:             // Try streaming first
 843:             const streamUrl = baseUrl + 'chat/stream';
 844:             const response = await fetch(streamUrl, {
 845:                 method: 'POST',
 846:                 mode: 'cors',
 847:                 credentials: 'omit',
 848:                 headers: { 'Content-Type': 'application/json' },
 849:                 body: JSON.stringify({
 850:                     message: text,
 851:                     user_id: telegram.getUserId(),
 852:                     session_id: `tg_${telegram.getUserId()}`,
 853:                     persona: 'hermes'
 854:                 })
 855:             });
 856: 
 857:             console.log('[Chat] Response status:', response.status, response.statusText);
 858: 
 859:             // Hide typing indicator
 860:             this.hideTypingIndicator();
 861: 
 862:             const contentType = response.headers.get('content-type') || '';
 863: 
 864:             if (contentType.includes('text/event-stream')) {
 865:                 // Streaming response — typewriter effect
 866:                 const reader = response.body.getReader();
 867:                 const decoder = new TextDecoder();
 868:                 let fullText = '';
 869: 
 870:                 // Create empty hermes message bubble for streaming
 871:                 const msgIdx = this.chatMessages.length;
 872:                 this.chatMessages.push({ sender: 'hermes', text: '', timestamp: Date.now() });
 873:                 this.renderChatMessages();
 874: 
 875:                 while (true) {
 876:                     const { done, value } = await reader.read();
 877:                     if (done) break;
 878: 
 879:                     const chunk = decoder.decode(value, { stream: true });
 880:                     const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
 881: 
 882:                     for (const line of lines) {
 883:                         try {
 884:                             const parsed = JSON.parse(line.replace('data: ', ''));
 885:                             if (parsed.done) break;
 886:                             if (parsed.char !== undefined) {
 887:                                 fullText += parsed.char;
 888:                                 this.chatMessages[msgIdx].text = fullText;
 889:                                 this.renderChatMessages();
 890:                             }
 891:                         } catch { /* skip malformed SSE lines */ }
 892:                     }
 893:                 }
 894: 
 895:                 this.saveCache();
 896:             } else {
 897:                 // Fallback: regular JSON response
 898:                 const data = await response.json();
 899: 
 900:                 if (data.blocked) {
 901:                     this.addChatMessage('system', `⚠️ ${data.reason}`);
 902:                 } else if (data.response) {
 903:                     this.addChatMessage('hermes', data.response);
 904:                 } else if (data.error) {
 905:                     this.addChatMessage('system', `❌ Ошибка: ${data.error_message || data.error}`);
 906:                 }
 907:             }
 908:         } catch (error) {
 909:             console.error('[Chat] Fetch failed:', error.message);
 910:             this.hideTypingIndicator();
 911:             this.addChatMessage('system', '❌ Ошибка соединения с сервером');
 912:         }
 913:     }
 914: 
 915:     showAttachMenu() {
 916:         const menu = document.getElementById('attach-menu');
 917:         if (!menu) return;
 918: 
 919:         menu.style.display = menu.style.display === 'none' ? 'grid' : 'none';
 920:         telegram.haptic('light');
 921:     }
 922: 
 923:     hideAttachMenu() {
 924:         const menu = document.getElementById('attach-menu');
 925:         if (menu) menu.style.display = 'none';
 926:     }
 927: 
 928:     attachPhoto() {
 929:         this.hideAttachMenu();
 930:         const input = document.createElement('input');
 931:         input.type = 'file';
 932:         input.accept = 'image/*';
 933:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'photo');
 934:         input.click();
 935:     }
 936: 
 937:     attachVideo() {
 938:         this.hideAttachMenu();
 939:         const input = document.createElement('input');
 940:         input.type = 'file';
 941:         input.accept = 'video/*';
 942:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'video');
 943:         input.click();
 944:     }
 945: 
 946:     async recordVideo() {
 947:         this.hideAttachMenu();
 948:         try {
 949:             const stream = await navigator.mediaDevices.getUserMedia({
 950:                 video: { facingMode: this.currentFacingMode },
 951:                 audio: true
 952:             });
 953:             this.currentStream = stream;
 954:             this.showVideoRecorder(stream);
 955:         } catch (error) {
 956:             telegram.showAlert('Нет доступа к камере');
 957:         }
 958:     }
 959: 
 960:     showVideoRecorder(stream) {
 961:         const recorder = document.createElement('div');
 962:         recorder.className = 'video-recording';
 963:         recorder.innerHTML = `
 964:             <div class="video-preview">
 965:                 <video id="video-preview" autoplay playsinline muted></video>
 966:                 <div class="video-controls">
 967:                     <button class="camera-switch-btn" onclick="app.switchCamera()">🔄</button>
 968:                     <button class="video-record-btn" id="record-btn" onclick="app.toggleVideoRecording()"></button>
 969:                     <button class="camera-switch-btn" onclick="app.closeVideoRecorder()">✖️</button>
 970:                 </div>
 971:             </div>
 972:         `;
 973:         document.body.appendChild(recorder);
 974: 
 975:         const video = document.getElementById('video-preview');
 976:         video.srcObject = stream;
 977:     }
 978: 
 979:     async switchCamera() {
 980:         this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
 981:         if (this.currentStream) {
 982:             this.currentStream.getTracks().forEach(track => track.stop());
 983:         }
 984:         await this.recordVideo();
 985:     }
 986: 
 987:     toggleVideoRecording() {
 988:         const btn = document.getElementById('record-btn');
 989:         if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
 990:             this.startVideoRecording();
 991:             btn.classList.add('recording');
 992:         } else {
 993:             this.stopVideoRecording();
 994:             btn.classList.remove('recording');
 995:         }
 996:     }
 997: 
 998:     startVideoRecording() {
 999:         if (!this.currentStream) return;
1000: 
1001:         this.mediaRecorder = new MediaRecorder(this.currentStream);
1002:         this.audioChunks = [];
1003: 
1004:         this.mediaRecorder.ondataavailable = (e) => {
1005:             this.audioChunks.push(e.data);
1006:         };
1007: 
1008:         this.mediaRecorder.onstop = () => {
1009:             const videoBlob = new Blob(this.audioChunks, { type: 'video/webm' });
1010:             this.handleVideoUpload(videoBlob);
1011:         };
1012: 
1013:         this.mediaRecorder.start();
1014:     }
1015: 
1016:     stopVideoRecording() {
1017:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
1018:             this.mediaRecorder.stop();
1019:         }
1020:     }
1021: 
1022:     closeVideoRecorder() {
1023:         if (this.currentStream) {
1024:             this.currentStream.getTracks().forEach(track => track.stop());
1025:             this.currentStream = null;
1026:         }
1027:         const recorder = document.querySelector('.video-recording');
1028:         if (recorder) recorder.remove();
1029:     }
1030: 
1031:     async shareScreen() {
1032:         this.hideAttachMenu();
1033:         try {
1034:             const stream = await navigator.mediaDevices.getDisplayMedia({
1035:                 video: true
1036:             });
1037:             
1038:             const mediaRecorder = new MediaRecorder(stream);
1039:             const chunks = [];
1040: 
1041:             mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
1042:             mediaRecorder.onstop = () => {
1043:                 const blob = new Blob(chunks, { type: 'video/webm' });
1044:                 this.handleVideoUpload(blob);
1045:                 stream.getTracks().forEach(track => track.stop());
1046:             };
1047: 
1048:             mediaRecorder.start();
1049:             setTimeout(() => mediaRecorder.stop(), 30000); // 30 sec max
1050:         } catch (error) {
1051:             telegram.showAlert('Нет доступа к экрану');
1052:         }
1053:     }
1054: 
1055:     async handleFileUpload(file, type) {
1056:         if (!file) return;
1057: 
1058:         this.addChatMessage('user', `[📎 ${type === 'photo' ? 'Фото' : 'Видео'}]`);
1059: 
1060:         const reader = new FileReader();
1061:         reader.onload = async (e) => {
1062:             try {
1063:                 // Upload to backend and get URL
1064:                 const imageUrl = e.target.result; // Base64 data URL
1065: 
1066:                 // Call Hermes image analysis
1067:                 const response = await fetch('/analyze-image', {
1068:                     method: 'POST',
1069:                     headers: { 'Content-Type': 'application/json' },
1070:                     body: JSON.stringify({
1071:                         image_url: imageUrl,
1072:                         prompt: type === 'photo' ? 'Проанализируй это изображение' : 'Опиши это видео',
1073:                         user_id: telegram.getUserId(),
1074:                         session_id: `tg_${telegram.getUserId()}`
1075:                     })
1076:                 });
1077: 
1078:                 const data = await response.json();
1079: 
1080:                 if (data.response) {
1081:                     this.addChatMessage('hermes', data.response);
1082:                 } else if (data.error) {
1083:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
1084:                 }
1085:             } catch (error) {
1086:                 console.error('[App] Upload error:', error);
1087:                 this.addChatMessage('system', '❌ Ошибка загрузки файла');
1088:             }
1089:         };
1090:         reader.readAsDataURL(file);
1091:     }
1092: 
1093:     async handleVideoUpload(blob) {
1094:         this.addChatMessage('user', '[🎥 Видеозапись]');
1095:         this.closeVideoRecorder();
1096: 
1097:         const reader = new FileReader();
1098:         reader.onload = async (e) => {
1099:             try {
1100:                 const videoUrl = e.target.result;
1101: 
1102:                 // Call Hermes video analysis
1103:                 const response = await fetch('/analyze-image', {
1104:                     method: 'POST',
1105:                     headers: { 'Content-Type': 'application/json' },
1106:                     body: JSON.stringify({
1107:                         image_url: videoUrl,
1108:                         prompt: 'Проанализируй это видео',
1109:                         user_id: telegram.getUserId(),
1110:                         session_id: `tg_${telegram.getUserId()}`
1111:                     })
1112:                 });
1113: 
1114:                 const data = await response.json();
1115: 
1116:                 if (data.response) {
1117:                     this.addChatMessage('hermes', data.response);
1118:                 } else if (data.error) {
1119:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
1120:                 }
1121:             } catch (error) {
1122:                 console.error('[App] Video upload error:', error);
1123:                 this.addChatMessage('system', '❌ Ошибка загрузки видео');
1124:             }
1125:         };
1126:         reader.readAsDataURL(blob);
1127:     }
1128: 
1129:     formatTime(timestamp) {
1130:         const date = new Date(timestamp);
1131:         return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
1132:     }
1133: 
1134:     async submitFeedback(msgIdx, feedback) {
1135:         const msg = this.chatMessages[msgIdx];
1136:         if (!msg || msg.feedback) return;
1137: 
1138:         msg.feedback = feedback;
1139:         this.renderChatMessages();
1140: 
1141:         try {
1142:             const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1143:                 ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1144:                 : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1145: 
1146:             await fetch(baseUrl + 'feedback', {
1147:                 method: 'POST',
1148:                 mode: 'cors',
1149:                 credentials: 'omit',
1150:                 headers: { 'Content-Type': 'application/json' },
1151:                 body: JSON.stringify({
1152:                     message_id: msgIdx,
1153:                     feedback,
1154:                     user_id: telegram.getUserId(),
1155:                     session_id: `tg_${telegram.getUserId()}`,
1156:                     text: msg.text.substring(0, 200)
1157:                 })
1158:             });
1159: 
1160:             telegram.haptic('light');
1161:         } catch (error) {
1162:             console.error('[Feedback] Error:', error.message);
1163:         }
1164:     }
1165: 
1166:     updateTaskSpec(title, content) {
1167:         const specContainer = document.getElementById('task-spec');
1168:         const specContent = document.getElementById('task-spec-content');
1169:         if (!specContainer || !specContent) return;
1170: 
1171:         specContainer.classList.add('has-content');
1172:         specContent.innerHTML = `
1173:             <div class="task-spec-title">${this.escapeHtml(title)}</div>
1174:             <div>${this.escapeHtml(content)}</div>
1175:         `;
1176:     }
1177: 
1178:     clearTaskSpec() {
1179:         const specContainer = document.getElementById('task-spec');
1180:         const specContent = document.getElementById('task-spec-content');
1181:         if (!specContainer || !specContent) return;
1182: 
1183:         specContainer.classList.remove('has-content');
1184:         specContent.textContent = 'Ожидание ТЗ от Гермеса...';
1185:     }
1186: 
1187:     // ─── Голосовой ввод ТЗ ───────────────────────────────────────────────
1188:     initVoiceInput() {
1189:         const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
1190:         if (!SpeechRecognition) {
1191:             console.warn('[App] SpeechRecognition не поддерживается в этом браузере');
1192:             return;
1193:         }
1194:         this.recognition = new SpeechRecognition();
1195:         this.recognition.lang = 'ru-RU';
1196:         this.recognition.interimResults = true;
1197:         this.recognition.continuous = true;
1198: 
1199:         this.recognition.onresult = (event) => {
1200:             let interim = '';
1201:             let final = '';
1202:             for (let i = event.resultIndex; i < event.results.length; i++) {
1203:                 const transcript = event.results[i][0].transcript;
1204:                 if (event.results[i].isFinal) final += transcript + ' ';
1205:                 else interim += transcript;
1206:             }
1207:             const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1208:             if (input) {
1209:                 input.value = (this._voiceBaseText || '') + final + interim;
1210:             }
1211:         };
1212: 
1213:         this.recognition.onerror = (e) => console.warn('[App] Voice error:', e.error);
1214:         this.recognition.onend = () => {
1215:             this.isRecording = false;
1216:             const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
1217:             if (micBtn) micBtn.classList.remove('recording');
1218:         };
1219:     }
1220: 
1221:     toggleVoiceRecording() {
1222:         if (!this.recognition) return telegram.showAlert('Голосовой ввод не поддерживается');
1223:         const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
1224:         if (this.isRecording) {
1225:             this.recognition.stop();
1226:             this.isRecording = false;
1227:             if (micBtn) micBtn.classList.remove('recording');
1228:         } else {
1229:             const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1230:             this._voiceBaseText = input ? input.value + ' ' : '';
1231:             this.recognition.start();
1232:             this.isRecording = true;
1233:             if (micBtn) micBtn.classList.add('recording');
1234:             telegram.haptic('light');
1235:         }
1236:     }
1237: 
1238:     // ─── Панель смарт-контракта (вопросы Гермеса) ────────────────────────
1239:     renderContractQuestions(questions = []) {
1240:         const container = document.getElementById('contract-qa-container');
1241:         if (!container) return;
1242:         container.innerHTML = '';
1243:         if (!questions.length) {
1244:             container.innerHTML = '<div class="qa-empty">Нет активных вопросов от Гермеса</div>';
1245:             return;
1246:         }
1247:         questions.forEach((q, idx) => {
1248:             const wrap = document.createElement('div');
1249:             wrap.className = 'qa-item';
1250:             wrap.innerHTML = `
1251:                 <div class="qa-question">${idx + 1}. ${this.escapeHtml(q.text)}</div>
1252:                 <input type="text" class="qa-answer-input" placeholder="Ваш ответ..." data-qid="${q.id || idx}" />
1253:             `;
1254:             container.appendChild(wrap);
1255:         });
1256:         container.querySelectorAll('.qa-answer-input').forEach(inp => {
1257:             inp.addEventListener('change', () => this.saveContractAnswers());
1258:         });
1259:     }
1260: 
1261:     saveContractAnswers() {
1262:         const inputs = document.querySelectorAll('.qa-answer-input');
1263:         const answers = {};
1264:         inputs.forEach(inp => answers[inp.dataset.qid] = inp.value.trim());
1265:         this.contractAnswers = answers;
1266:         this.saveCache();
1267:     }
1268: 
1269:     // ─── История ТЗ ──────────────────────────────────────────────────────
1270:     async saveTaskSpecHistory(specText) {
1271:         if (!specText?.trim()) return;
1272:         const history = this.taskSpecHistory || [];
1273:         history.unshift({ text: specText, timestamp: Date.now() });
1274:         if (history.length > 20) history.pop();
1275:         this.taskSpecHistory = history;
1276:         try {
1277:             if (window.Telegram?.WebApp?.CloudStorage) {
1278:                 await new Promise((res, rej) => Telegram.WebApp.CloudStorage.setItem('task_spec_history', JSON.stringify(history), (err, ok) => err ? rej(err) : res(ok)));
1279:             } else {
1280:                 localStorage.setItem('task_spec_history', JSON.stringify(history));
1281:             }
1282:         } catch (e) { console.warn('[App] History save failed:', e); }
1283:     }
1284: 
1285:     async loadTaskSpecHistory() {
1286:         try {
1287:             let raw = null;
1288:             if (window.Telegram?.WebApp?.CloudStorage) {
1289:                 raw = await new Promise((res, rej) => Telegram.WebApp.CloudStorage.getItem('task_spec_history', (err, val) => err ? rej(err) : res(val)));
1290:             } else {
1291:                 raw = localStorage.getItem('task_spec_history');
1292:             }
1293:             this.taskSpecHistory = raw ? JSON.parse(raw) : [];
1294:         } catch (e) {
1295:             this.taskSpecHistory = [];
1296:         }
1297:         this.renderTaskSpecHistory();
1298:     }
1299: 
1300:     renderTaskSpecHistory() {
1301:         const list = document.getElementById('task-history-list');
1302:         if (!list) return;
1303:         list.innerHTML = '';
1304:         if (!this.taskSpecHistory?.length) {
1305:             list.innerHTML = '<div class="history-empty">История пуста</div>';
1306:             return;
1307:         }
1308:         this.taskSpecHistory.forEach((item, idx) => {
1309:             const el = document.createElement('div');
1310:             el.className = 'history-item';
1311:             const time = new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
1312:             el.innerHTML = `<span class="history-time">${time}</span><span class="history-text">${this.escapeHtml(item.text.slice(0, 60))}...</span>`;
1313:             el.onclick = () => {
1314:                 const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1315:                 if (input) input.value = item.text;
1316:                 telegram.haptic('light');
1317:             };
1318:             list.appendChild(el);
1319:         });
1320:     }
1321: 
1322:     // ─── Экспорт ТЗ ──────────────────────────────────────────────────────
1323:     exportTaskSpec() {
1324:         const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1325:         const spec = input?.value?.trim() || '';
1326:         const answers = this.contractAnswers || {};
1327:         if (!spec && !Object.keys(answers).length) return telegram.showAlert('Нет данных для экспорта');
1328: 
1329:         const payload = {
1330:             task_spec: spec,
1331:             contract_answers: answers,
1332:             exported_at: new Date().toISOString(),
1333:             user_id: telegram.getUserId?.() || 'unknown'
1334:         };
1335:         const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
1336:         const url = URL.createObjectURL(blob);
1337:         const a = document.createElement('a');
1338:         a.href = url;
1339:         a.download = `task_spec_${Date.now()}.json`;
1340:         document.body.appendChild(a);
1341:         a.click();
1342:         a.remove();
1343:         URL.revokeObjectURL(url);
1344:         telegram.haptic('success');
1345:     }
1346: }
1347: 
1348: let app;
1349: document.addEventListener('DOMContentLoaded', () => {
1350:     app = new NeuroEscrowApp();
1351: });
1352: 
1353: window.addEventListener('message', (event) => {
1354:     if (event.data && event.data.type === 'bot_data' && app) {
1355:         app.handleBotData(event.data.payload);
1356:     }
1357: });
</file>

<file path="js/charts.js">
  1: /**
  2:  * Charts Module for Accounting Dashboard
  3:  * Uses Chart.js for income/expense visualization
  4:  */
  5: 
  6: class ChartsModule {
  7:     constructor() {
  8:         this.charts = {};
  9:     }
 10: 
 11:     /**
 12:      * Create or update balance chart
 13:      */
 14:     renderBalanceChart(canvasId, data) {
 15:         const ctx = document.getElementById(canvasId);
 16:         if (!ctx) return;
 17: 
 18:         // Destroy existing chart
 19:         if (this.charts[canvasId]) {
 20:             this.charts[canvasId].destroy();
 21:         }
 22: 
 23:         const labels = data.map(d => d.date);
 24:         const income = data.map(d => d.income);
 25:         const expense = data.map(d => d.expense);
 26: 
 27:         this.charts[canvasId] = new Chart(ctx, {
 28:             type: 'bar',
 29:             data: {
 30:                 labels: labels,
 31:                 datasets: [
 32:                     {
 33:                         label: 'Доход',
 34:                         data: income,
 35:                         backgroundColor: '#34c759',
 36:                         borderRadius: 4,
 37:                         borderSkipped: false,
 38:                     },
 39:                     {
 40:                         label: 'Расход',
 41:                         data: expense,
 42:                         backgroundColor: '#ff3b30',
 43:                         borderRadius: 4,
 44:                         borderSkipped: false,
 45:                     }
 46:                 ]
 47:             },
 48:             options: {
 49:                 responsive: true,
 50:                 maintainAspectRatio: false,
 51:                 plugins: {
 52:                     legend: {
 53:                         position: 'top',
 54:                         labels: {
 55:                             usePointStyle: true,
 56:                             padding: 16,
 57:                             font: { size: 12 }
 58:                         }
 59:                     },
 60:                     tooltip: {
 61:                         backgroundColor: 'rgba(0,0,0,0.8)',
 62:                         padding: 10,
 63:                         cornerRadius: 8,
 64:                         callbacks: {
 65:                             label: function(context) {
 66:                                 return context.dataset.label + ': ' + context.parsed.y.toFixed(2) + ' USDT';
 67:                             }
 68:                         }
 69:                     }
 70:                 },
 71:                 scales: {
 72:                     x: {
 73:                         grid: { display: false },
 74:                         ticks: { font: { size: 11 } }
 75:                     },
 76:                     y: {
 77:                         beginAtZero: true,
 78:                         grid: { color: 'rgba(0,0,0,0.05)' },
 79:                         ticks: {
 80:                             font: { size: 11 },
 81:                             callback: function(value) {
 82:                                 return value.toFixed(0);
 83:                             }
 84:                         }
 85:                     }
 86:                 },
 87:                 interaction: {
 88:                     intersect: false,
 89:                     mode: 'index'
 90:                 }
 91:             }
 92:         });
 93:     }
 94: 
 95:     /**
 96:      * Create pie chart for transaction types
 97:      */
 98:     renderTypeChart(canvasId, data) {
 99:         const ctx = document.getElementById(canvasId);
100:         if (!ctx) return;
101: 
102:         if (this.charts[canvasId]) {
103:             this.charts[canvasId].destroy();
104:         }
105: 
106:         const labels = Object.keys(data);
107:         const values = Object.values(data);
108:         const colors = ['#34c759', '#007aff', '#ff9500', '#ff3b30', '#af52de', '#5856d6'];
109: 
110:         this.charts[canvasId] = new Chart(ctx, {
111:             type: 'doughnut',
112:             data: {
113:                 labels: labels,
114:                 datasets: [{
115:                     data: values,
116:                     backgroundColor: colors,
117:                     borderWidth: 0,
118:                     hoverOffset: 4
119:                 }]
120:             },
121:             options: {
122:                 responsive: true,
123:                 maintainAspectRatio: false,
124:                 cutout: '65%',
125:                 plugins: {
126:                     legend: {
127:                         position: 'bottom',
128:                         labels: {
129:                             usePointStyle: true,
130:                             padding: 12,
131:                             font: { size: 11 }
132:                         }
133:                     }
134:                 }
135:             }
136:         });
137:     }
138: 
139:     /**
140:      * Generate sample data for demo
141:      */
142:     generateSampleData(period = 'week') {
143:         const days = period === 'week' ? 7 : 30;
144:         const data = [];
145:         const now = new Date();
146:         
147:         for (let i = days - 1; i >= 0; i--) {
148:             const date = new Date(now);
149:             date.setDate(date.getDate() - i);
150:             data.push({
151:                 date: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }),
152:                 income: Math.random() * 200 + 50,
153:                 expense: Math.random() * 100 + 20
154:             });
155:         }
156:         
157:         return data;
158:     }
159: 
160:     /**
161:      * Generate sample type distribution
162:      */
163:     generateSampleTypes() {
164:         return {
165:             'Пополнение': 450,
166:             'Выплата': 280,
167:             'Эскроу': 150,
168:             'Возврат': 80,
169:             'Комиссия': 40
170:         };
171:     }
172: }
173: 
174: // Singleton instance
175: const charts = new ChartsModule();
</file>

<file path="js/telegram.js">
  1: /**
  2:  * Telegram WebApp Integration
  3:  * Handles initData, CloudStorage, and bot communication
  4:  */
  5: 
  6: const tg = window.Telegram.WebApp;
  7: 
  8: class TelegramIntegration {
  9:     constructor() {
 10:         this.user = null;
 11:         this.initData = null;
 12:         this.cloudStorage = tg.CloudStorage;
 13:         this.init();
 14:     }
 15: 
 16:     init() {
 17:         // Expand to full screen
 18:         tg.expand();
 19:         
 20:         // Set header color to match theme
 21:         tg.setHeaderColor(tg.themeParams.bg_color || '#ffffff');
 22:         tg.setBackgroundColor(tg.themeParams.bg_color || '#ffffff');
 23:         
 24:         // Parse initData
 25:         this.initData = tg.initData;
 26:         this.user = tg.initDataUnsafe.user || null;
 27:         
 28:         // Enable closing confirmation if needed
 29:         tg.enableClosingConfirmation();
 30:         
 31:         // Ready event
 32:         tg.ready();
 33:         
 34:         console.log('[Telegram] WebApp initialized', {
 35:             user: this.user,
 36:             platform: tg.platform,
 37:             version: tg.version
 38:         });
 39:     }
 40: 
 41:     /**
 42:      * Get user info from initData
 43:      */
 44:     getUser() {
 45:         return this.user;
 46:     }
 47: 
 48:     /**
 49:      * Get user ID for API calls
 50:      */
 51:     getUserId() {
 52:         return this.user ? this.user.id : null;
 53:     }
 54: 
 55:     /**
 56:      * Send data back to bot via sendData
 57:      */
 58:     sendData(data) {
 59:         try {
 60:             const json = JSON.stringify(data);
 61:             tg.sendData(json);
 62:             console.log('[Telegram] Data sent to bot:', data);
 63:         } catch (e) {
 64:             console.error('[Telegram] Failed to send data:', e);
 65:         }
 66:     }
 67: 
 68:     /**
 69:      * Show popup alert
 70:      */
 71:     showAlert(message) {
 72:         tg.showAlert(message);
 73:     }
 74: 
 75:     /**
 76:      * Show confirm dialog
 77:      */
 78:     showConfirm(message, callback) {
 79:         tg.showConfirm(message, callback);
 80:     }
 81: 
 82:     /**
 83:      * Haptic feedback
 84:      */
 85:     haptic(type = 'light') {
 86:         if (tg.HapticFeedback) {
 87:             const validTypes = ['light', 'medium', 'heavy', 'rigid', 'soft'];
 88:             const impactType = validTypes.includes(type) ? type : 'light';
 89:             tg.HapticFeedback.impactOccurred(impactType);
 90:         }
 91:     }
 92: 
 93:     /**
 94:      * Haptic notification feedback
 95:      */
 96:     hapticNotification(type = 'success') {
 97:         if (tg.HapticFeedback) {
 98:             const validTypes = ['success', 'warning', 'error'];
 99:             const notifType = validTypes.includes(type) ? type : 'success';
100:             tg.HapticFeedback.notificationOccurred(notifType);
101:         }
102:     }
103: 
104:     /**
105:      * CloudStorage: Get item
106:      */
107:     async cloudGet(key) {
108:         return new Promise((resolve) => {
109:             this.cloudStorage.getItem(key, (err, value) => {
110:                 if (err || !value) {
111:                     resolve(null);
112:                 } else {
113:                     try {
114:                         resolve(JSON.parse(value));
115:                     } catch {
116:                         resolve(value);
117:                     }
118:                 }
119:             });
120:         });
121:     }
122: 
123:     /**
124:      * CloudStorage: Set item
125:      */
126:     async cloudSet(key, value) {
127:         return new Promise((resolve) => {
128:             const str = typeof value === 'string' ? value : JSON.stringify(value);
129:             this.cloudStorage.setItem(key, str, (err, success) => {
130:                 resolve(!err && success);
131:             });
132:         });
133:     }
134: 
135:     /**
136:      * CloudStorage: Remove item
137:      */
138:     async cloudRemove(key) {
139:         return new Promise((resolve) => {
140:             this.cloudStorage.removeItem(key, (err, success) => {
141:                 resolve(!err && success);
142:             });
143:         });
144:     }
145: 
146:     /**
147:      * Set main button
148:      */
149:     setMainButton(text, visible = true, callback = null) {
150:         tg.MainButton.setText(text);
151:         if (visible) {
152:             tg.MainButton.show();
153:         } else {
154:             tg.MainButton.hide();
155:         }
156:         if (callback) {
157:             tg.MainButton.onClick(callback);
158:         }
159:     }
160: 
161:     /**
162:      * Close Mini App
163:      */
164:     close() {
165:         tg.close();
166:     }
167: }
168: 
169: // Singleton instance
170: const telegram = new TelegramIntegration();
</file>

<file path="js/tonconnect.js">
  1: /**
  2:  * TON Connect Integration
  3:  * Handles wallet connection and payments in TON
  4:  */
  5: 
  6: class TONConnectIntegration {
  7:     constructor() {
  8:         this.connector = null;
  9:         this.wallet = null;
 10:         this.connected = false;
 11:     }
 12: 
 13:     /**
 14:      * Initialize TON Connect UI
 15:      */
 16:     init(containerId = 'ton-connect') {
 17:         if (!window.TON_CONNECT_UI) {
 18:             console.error('[TON] TON_CONNECT_UI not loaded');
 19:             return false;
 20:         }
 21: 
 22:         this.connector = new TON_CONNECT_UI.TonConnectUI({
 23:             manifestUrl: 'https://neuroescrow.holograms.media/tonconnect-manifest.json',
 24:             buttonRootId: containerId
 25:         });
 26: 
 27:         // Listen for connection status
 28:         this.connector.onStatusChange((wallet) => {
 29:             this.wallet = wallet;
 30:             this.connected = !!wallet;
 31:             
 32:             if (wallet) {
 33:                 console.log('[TON] Wallet connected:', wallet.account.address);
 34:                 telegram.haptic('medium');
 35:             } else {
 36:                 console.log('[TON] Wallet disconnected');
 37:             }
 38:             
 39:             // Dispatch event for app
 40:             window.dispatchEvent(new CustomEvent('ton:statusChange', { 
 41:                 detail: { connected: this.connected, wallet: this.wallet } 
 42:             }));
 43:         });
 44: 
 45:         return true;
 46:     }
 47: 
 48:     /**
 49:      * Check if wallet is connected
 50:      */
 51:     isConnected() {
 52:         return this.connected;
 53:     }
 54: 
 55:     /**
 56:      * Get wallet address
 57:      */
 58:     getAddress() {
 59:         return this.wallet ? this.wallet.account.address : null;
 60:     }
 61: 
 62:     /**
 63:      * Disconnect wallet
 64:      */
 65:     async disconnect() {
 66:         if (this.connector) {
 67:             await this.connector.disconnect();
 68:         }
 69:     }
 70: 
 71:     /**
 72:      * Send TON payment
 73:      */
 74:     async sendPayment(address, amountTon, comment = '') {
 75:         if (!this.connected) {
 76:             telegram.showAlert('Сначала подключите TON кошелек');
 77:             return null;
 78:         }
 79: 
 80:         try {
 81:             const result = await this.connector.sendTransaction({
 82:                 validUntil: Math.floor(Date.now() / 1000) + 600, // 10 minutes
 83:                 messages: [
 84:                     {
 85:                         address: address,
 86:                         amount: (amountTon * 1e9).toString(), // Convert to nanotons
 87:                         payload: comment ? btoa(comment) : undefined
 88:                     }
 89:                 ]
 90:             });
 91:             
 92:             console.log('[TON] Payment sent:', result);
 93:             telegram.haptic('heavy');
 94:             return result;
 95:         } catch (e) {
 96:             console.error('[TON] Payment failed:', e);
 97:             telegram.showAlert('Ошибка оплаты: ' + e.message);
 98:             return null;
 99:         }
100:     }
101: 
102:     /**
103:      * Create payment request (for escrow)
104:      */
105:     async createEscrowPayment(escrowAddress, amountTon, dealId) {
106:         const comment = `NeuroEscrow Deal #${dealId}`;
107:         return this.sendPayment(escrowAddress, amountTon, comment);
108:     }
109: }
110: 
111: // Singleton instance
112: const tonConnect = new TONConnectIntegration();
</file>

</files>
