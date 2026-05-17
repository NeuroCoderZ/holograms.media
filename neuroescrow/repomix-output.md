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
 102:     overflow: hidden;
 103:     padding: 0;
 104:     -webkit-overflow-scrolling: touch;
 105:     display: flex;
 106:     flex-direction: column;
 107:     min-height: 0;
 108: }
 109: 
 110: /* ===== VOICE INTERFACE (Glass Microphone) ===== */
 111: .voice-interface {
 112:     display: flex;
 113:     flex-direction: column;
 114:     align-items: center;
 115:     justify-content: center;
 116:     min-height: 180px;
 117:     text-align: center;
 118:     position: relative;
 119:     padding: var(--ne-spacing-xl) 0;
 120: }
 121: 
 122: .voice-button {
 123:     width: 140px;
 124:     height: 140px;
 125:     border-radius: 50%;
 126:     /* Thick glass chunk */
 127:     background: linear-gradient(145deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 50%, rgba(0,0,0,0.2) 100%);
 128:     backdrop-filter: blur(24px) saturate(180%);
 129:     -webkit-backdrop-filter: blur(24px) saturate(180%);
 130:     border: 1px solid rgba(255, 255, 255, 0.15);
 131:     /* Inner bevel + outer shadow */
 132:     box-shadow: 
 133:         inset 0 2px 0 rgba(255, 255, 255, 0.2),
 134:         inset 0 -2px 4px rgba(0, 0, 0, 0.3),
 135:         0 8px 32px rgba(0, 0, 0, 0.4),
 136:         0 0 0 1px rgba(255, 255, 255, 0.05);
 137:     display: flex;
 138:     align-items: center;
 139:     justify-content: center;
 140:     cursor: pointer;
 141:     transition: var(--glass-transition);
 142:     position: relative;
 143:     overflow: hidden;
 144: }
 145: 
 146: /* Glass highlight arc */
 147: .voice-button::before {
 148:     content: '';
 149:     position: absolute;
 150:     top: 4px;
 151:     left: 10%;
 152:     right: 10%;
 153:     height: 40%;
 154:     border-radius: 50%;
 155:     background: linear-gradient(180deg, rgba(255,255,255,0.15) 0%, transparent 100%);
 156:     pointer-events: none;
 157: }
 158: 
 159: .voice-button:active {
 160:     transform: scale(0.96);
 161:     box-shadow: 
 162:         inset 0 2px 8px rgba(0, 0, 0, 0.5),
 163:         0 4px 16px rgba(0, 0, 0, 0.3);
 164: }
 165: 
 166: .voice-button.recording {
 167:     border-color: var(--ne-purple);
 168:     box-shadow: 
 169:         inset 0 2px 0 rgba(255, 255, 255, 0.2),
 170:         inset 0 -2px 4px rgba(0, 0, 0, 0.3),
 171:         0 0 24px rgba(139, 92, 246, 0.3),
 172:         0 8px 32px rgba(0, 0, 0, 0.4);
 173:     animation: pulse-glass 1.5s ease-in-out infinite;
 174: }
 175: 
 176: @keyframes pulse-glass {
 177:     0%, 100% { box-shadow: inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3), 0 0 24px rgba(139,92,246,0.3), 0 8px 32px rgba(0,0,0,0.4); }
 178:     50% { box-shadow: inset 0 2px 0 rgba(255,255,255,0.2), inset 0 -2px 4px rgba(0,0,0,0.3), 0 0 40px rgba(139,92,246,0.5), 0 8px 32px rgba(0,0,0,0.4); }
 179: }
 180: 
 181: /* Metallic microphone icon */
 182: .voice-icon {
 183:     font-size: 56px;
 184:     background: var(--metallic-gradient);
 185:     -webkit-background-clip: text;
 186:     -webkit-text-fill-color: transparent;
 187:     background-clip: text;
 188:     filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.4));
 189:     position: relative;
 190:     z-index: 1;
 191: }
 192: 
 193: .voice-status {
 194:     font-size: 12px;
 195:     color: var(--ne-light-gray);
 196:     margin-top: var(--ne-spacing-md);
 197:     min-height: 18px;
 198:     opacity: 0.7;
 199: }
 200: 
 201: /* ===== CHAT HISTORY CONTAINER ===== */
 202: .chat-messages {
 203:     display: flex;
 204:     flex-direction: column;
 205:     gap: var(--ne-spacing-md);
 206:     padding: var(--ne-spacing-md) var(--ne-spacing-lg);
 207:     overflow-y: auto;
 208:     padding-bottom: 140px;
 209:     flex: 1;
 210: }
 211: 
 212: /* ===== CHAT MESSAGES ===== */
 213: .chat-message {
 214:     display: flex;
 215:     flex-direction: column;
 216:     gap: 2px;
 217:     animation: fadeIn 0.3s ease-out;
 218: }
 219: 
 220: .chat-message.user {
 221:     align-items: flex-end;
 222: }
 223: 
 224: .chat-message.hermes {
 225:     align-items: flex-start;
 226: }
 227: 
 228: .chat-message.system {
 229:     align-items: center;
 230: }
 231: 
 232: .message-bubble {
 233:     max-width: 80%;
 234:     padding: 12px 16px;
 235:     border-radius: var(--glass-radius);
 236:     font-size: 14px;
 237:     line-height: 1.5;
 238:     word-wrap: break-word;
 239:     position: relative;
 240:     transition: var(--glass-transition);
 241: }
 242: 
 243: /* User message: white glass with black text */
 244: .chat-message.user .message-bubble {
 245:     background: rgba(255, 255, 255, 0.92);
 246:     backdrop-filter: blur(12px) saturate(150%);
 247:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 248:     color: #000;
 249:     border: 1px solid rgba(255, 255, 255, 0.3);
 250:     border-bottom-right-radius: 4px;
 251:     box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
 252: }
 253: 
 254: /* Hermes message: black glass with white text */
 255: .chat-message.hermes .message-bubble {
 256:     background: rgba(0, 0, 0, 0.8);
 257:     backdrop-filter: blur(12px) saturate(150%);
 258:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 259:     color: var(--ne-white);
 260:     border: 1px solid rgba(255, 255, 255, 0.08);
 261:     border-bottom-left-radius: 4px;
 262:     box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
 263: }
 264: 
 265: .chat-message.system .message-bubble {
 266:     background: rgba(255, 255, 255, 0.03);
 267:     backdrop-filter: blur(8px);
 268:     -webkit-backdrop-filter: blur(8px);
 269:     color: var(--ne-light-gray);
 270:     border: var(--glass-border);
 271:     border-radius: var(--glass-radius-sm);
 272:     font-size: 12px;
 273:     text-align: center;
 274: }
 275: 
 276: /* Message timestamp */
 277: .message-time {
 278:     font-size: 9px;
 279:     color: var(--ne-light-gray);
 280:     padding: 0 6px;
 281:     opacity: 0.4;
 282:     text-align: right;
 283:     margin-top: 2px;
 284: }
 285: 
 286: .chat-message.user .message-time {
 287:     color: rgba(0, 0, 0, 0.4);
 288: }
 289: 
 290: /* Feedback buttons */
 291: .message-feedback {
 292:     display: flex;
 293:     gap: 4px;
 294:     margin-top: 4px;
 295:     opacity: 0;
 296:     transition: opacity 0.2s;
 297: }
 298: 
 299: .chat-message.hermes:hover .message-feedback {
 300:     opacity: 1;
 301: }
 302: 
 303: .feedback-btn {
 304:     background: rgba(255, 255, 255, 0.06);
 305:     border: 1px solid rgba(255, 255, 255, 0.08);
 306:     border-radius: 8px;
 307:     padding: 2px 8px;
 308:     font-size: 12px;
 309:     cursor: pointer;
 310:     transition: var(--glass-transition);
 311:     color: var(--ne-light-gray);
 312: }
 313: 
 314: .feedback-btn:active {
 315:     transform: scale(0.95);
 316:     background: rgba(255, 255, 255, 0.12);
 317: }
 318: 
 319: .feedback-buttons {
 320:     display: flex;
 321:     gap: 6px;
 322:     margin-top: 6px;
 323: }
 324: 
 325: /* Typing indicator */
 326: .typing-indicator {
 327:     display: flex;
 328:     align-items: center;
 329:     gap: 4px;
 330:     padding: 8px 16px;
 331:     font-size: 12px;
 332:     color: var(--ne-light-gray);
 333:     opacity: 0.7;
 334: }
 335: 
 336: .typing-indicator .dot {
 337:     width: 6px;
 338:     height: 6px;
 339:     border-radius: 50%;
 340:     background: var(--ne-purple);
 341:     animation: typing-bounce 1.4s infinite;
 342: }
 343: 
 344: .typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
 345: .typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }
 346: 
 347: @keyframes typing-bounce {
 348:     0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
 349:     30% { transform: translateY(-4px); opacity: 1; }
 350: }
 351: 
 352: /* Streaming cursor */
 353: .message-bubble.streaming::after {
 354:     content: '▋';
 355:     animation: cursor-blink 0.8s infinite;
 356:     color: var(--ne-purple);
 357:     margin-left: 2px;
 358: }
 359: 
 360: @keyframes cursor-blink {
 361:     0%, 50% { opacity: 1; }
 362:     51%, 100% { opacity: 0; }
 363: }
 364: 
 365: /* ===== CHAT INPUT ===== */
 366: .chat-input-container {
 367:     position: fixed;
 368:     bottom: 64px;
 369:     left: 0;
 370:     right: 0;
 371:     background: rgba(0, 0, 0, 0.7);
 372:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 373:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 374:     border-top: var(--glass-border);
 375:     padding: var(--ne-spacing-sm) var(--ne-spacing-lg);
 376:     display: flex;
 377:     align-items: center;
 378:     gap: var(--ne-spacing-sm);
 379:     z-index: 100;
 380: }
 381: 
 382: /* Chat input inside split layout (desktop) */
 383: .split-pane.left-pane .chat-input-container {
 384:     position: sticky;
 385:     bottom: 0;
 386:     left: auto;
 387:     right: auto;
 388:     border-top: var(--glass-border);
 389:     border-right: none;
 390:     z-index: 10;
 391:     padding: var(--ne-spacing-sm) var(--ne-spacing-md);
 392: }
 393: 
 394: /* Hide fixed chat input when split layout is active (desktop) */
 395: @media (min-width: 600px) {
 396:     .chat-input-container:not(.split-chat-input) {
 397:         display: none !important;
 398:     }
 399: }
 400: 
 401: /* Show fixed chat input on mobile, hide split version */
 402: @media (max-width: 599px) {
 403:     .split-chat-input {
 404:         display: none !important;
 405:     }
 406: }
 407: 
 408: .attach-btn,
 409: .send-btn {
 410:     width: 40px;
 411:     height: 40px;
 412:     border-radius: 50%;
 413:     border: var(--glass-border-light);
 414:     background: var(--glass-bg-light);
 415:     backdrop-filter: blur(12px);
 416:     -webkit-backdrop-filter: blur(12px);
 417:     color: var(--ne-white);
 418:     display: flex;
 419:     align-items: center;
 420:     justify-content: center;
 421:     cursor: pointer;
 422:     transition: var(--glass-transition);
 423:     font-size: 18px;
 424:     flex-shrink: 0;
 425: }
 426: 
 427: .attach-btn:active,
 428: .send-btn:active {
 429:     transform: scale(0.92);
 430:     box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4);
 431: }
 432: 
 433: .send-btn {
 434:     background: linear-gradient(135deg, var(--ne-purple), var(--ne-red));
 435:     border: none;
 436:     color: #fff;
 437: }
 438: 
 439: .chat-input {
 440:     flex: 1;
 441:     padding: 10px 16px;
 442:     border-radius: 20px;
 443:     border: var(--glass-border-light);
 444:     background: rgba(255, 255, 255, 0.06);
 445:     backdrop-filter: blur(8px);
 446:     -webkit-backdrop-filter: blur(8px);
 447:     color: var(--ne-white);
 448:     font-size: 14px;
 449:     outline: none;
 450:     transition: var(--glass-transition);
 451: }
 452: 
 453: .chat-input::placeholder {
 454:     color: rgba(255, 255, 255, 0.3);
 455: }
 456: 
 457: .chat-input:focus {
 458:     border-color: var(--ne-purple);
 459:     background: rgba(255, 255, 255, 0.08);
 460: }
 461: 
 462: /* ===== BOTTOM NAVIGATION (3 Glass Tabs) ===== */
 463: .bottom-nav {
 464:     position: fixed;
 465:     bottom: 0;
 466:     left: 0;
 467:     right: 0;
 468:     height: 64px;
 469:     display: flex;
 470:     background: rgba(0, 0, 0, 0.75);
 471:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 472:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 473:     border-top: var(--glass-border-light);
 474:     z-index: 101;
 475: }
 476: 
 477: .nav-btn {
 478:     flex: 1;
 479:     display: flex;
 480:     flex-direction: column;
 481:     align-items: center;
 482:     justify-content: center;
 483:     gap: 2px;
 484:     padding: var(--ne-spacing-xs) 0;
 485:     border: none;
 486:     background: none;
 487:     color: var(--ne-light-gray);
 488:     font-size: 10px;
 489:     cursor: pointer;
 490:     transition: var(--glass-transition);
 491:     position: relative;
 492: }
 493: 
 494: /* Divider between tabs (inset groove) */
 495: .nav-btn:not(:last-child)::after {
 496:     content: '';
 497:     position: absolute;
 498:     right: 0;
 499:     top: 20%;
 500:     bottom: 20%;
 501:     width: 1px;
 502:     background: linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent);
 503: }
 504: 
 505: .nav-btn.active {
 506:     color: var(--ne-white);
 507: }
 508: 
 509: .nav-btn.active::before {
 510:     content: '';
 511:     position: absolute;
 512:     top: 0;
 513:     left: 20%;
 514:     right: 20%;
 515:     height: 2px;
 516:     background: linear-gradient(90deg, var(--ne-purple), var(--ne-red));
 517:     border-radius: 1px;
 518: }
 519: 
 520: .nav-btn:active {
 521:     box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
 522: }
 523: 
 524: .nav-icon {
 525:     font-size: 22px;
 526:     line-height: 1;
 527: }
 528: 
 529: .nav-label {
 530:     font-weight: 500;
 531: }
 532: 
 533: /* ===== BUTTONS (Glass) ===== */
 534: .btn {
 535:     display: inline-flex;
 536:     align-items: center;
 537:     justify-content: center;
 538:     gap: 6px;
 539:     padding: 10px 20px;
 540:     border-radius: var(--glass-radius);
 541:     border: var(--glass-border-light);
 542:     font-size: 14px;
 543:     font-weight: 500;
 544:     cursor: pointer;
 545:     transition: var(--glass-transition);
 546:     width: 100%;
 547:     background: var(--glass-bg-light);
 548:     backdrop-filter: blur(12px) saturate(150%);
 549:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 550:     color: var(--ne-white);
 551: }
 552: 
 553: .btn:active {
 554:     transform: scale(0.98);
 555:     box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3);
 556: }
 557: 
 558: .btn-primary {
 559:     background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(239, 68, 68, 0.2));
 560:     border-color: rgba(139, 92, 246, 0.3);
 561:     color: var(--ne-white);
 562: }
 563: 
 564: .btn-secondary {
 565:     background: var(--glass-bg);
 566:     color: var(--ne-white);
 567:     border-color: var(--glass-border);
 568: }
 569: 
 570: /* ===== FORMS ===== */
 571: .form-group {
 572:     margin-bottom: var(--ne-spacing-lg);
 573: }
 574: 
 575: .form-label {
 576:     display: block;
 577:     font-size: 13px;
 578:     font-weight: 500;
 579:     color: var(--ne-light-gray);
 580:     margin-bottom: var(--ne-spacing-sm);
 581:     text-transform: uppercase;
 582:     letter-spacing: 0.5px;
 583: }
 584: 
 585: .form-input {
 586:     width: 100%;
 587:     padding: 12px 14px;
 588:     border-radius: var(--glass-radius);
 589:     border: var(--glass-border-light);
 590:     background: rgba(255, 255, 255, 0.04);
 591:     backdrop-filter: blur(8px);
 592:     -webkit-backdrop-filter: blur(8px);
 593:     color: var(--ne-white);
 594:     font-size: 14px;
 595:     outline: none;
 596:     transition: var(--glass-transition);
 597: }
 598: 
 599: .form-input:focus {
 600:     border-color: var(--ne-purple);
 601:     background: rgba(255, 255, 255, 0.06);
 602: }
 603: 
 604: /* ===== CARDS ===== */
 605: .card {
 606:     background: var(--glass-bg);
 607:     backdrop-filter: blur(12px) saturate(150%);
 608:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 609:     border: var(--glass-border);
 610:     border-radius: var(--glass-radius);
 611:     padding: var(--ne-spacing-lg);
 612:     margin-bottom: var(--ne-spacing-md);
 613: }
 614: 
 615: .draft-card {
 616:     background: rgba(255, 255, 255, 0.02);
 617:     border-left-width: 3px;
 618: }
 619: 
 620: .card-title {
 621:     font-size: 15px;
 622:     font-weight: 600;
 623:     margin-bottom: var(--ne-spacing-sm);
 624:     color: var(--ne-white);
 625: }
 626: 
 627: .card-subtitle {
 628:     font-size: 13px;
 629:     color: var(--ne-light-gray);
 630:     margin-bottom: var(--ne-spacing-md);
 631: }
 632: 
 633: /* ===== SCROLLBAR ===== */
 634: ::-webkit-scrollbar {
 635:     width: 4px;
 636: }
 637: 
 638: ::-webkit-scrollbar-track {
 639:     background: transparent;
 640: }
 641: 
 642: ::-webkit-scrollbar-thumb {
 643:     background: rgba(255, 255, 255, 0.12);
 644:     border-radius: 2px;
 645: }
 646: 
 647: ::-webkit-scrollbar-thumb:hover {
 648:     background: rgba(255, 255, 255, 0.2);
 649: }
 650: 
 651: /* ===== ANIMATIONS ===== */
 652: @keyframes fadeIn {
 653:     from { opacity: 0; transform: translateY(8px); }
 654:     to { opacity: 1; transform: translateY(0); }
 655: }
 656: 
 657: .view {
 658:     animation: fadeIn 0.25s ease-out;
 659:     height: 100%;
 660:     display: flex;
 661:     flex-direction: column;
 662: }
 663: 
 664: .view.has-top-panel {
 665:     height: 100%;
 666:     display: flex;
 667:     flex-direction: column;
 668: }
 669: 
 670: /* ===== EMPTY STATE ===== */
 671: .empty-state {
 672:     text-align: center;
 673:     padding: 48px 24px;
 674:     color: var(--ne-light-gray);
 675: }
 676: 
 677: .empty-icon {
 678:     font-size: 48px;
 679:     margin-bottom: var(--ne-spacing-md);
 680:     opacity: 0.5;
 681: }
 682: 
 683: .empty-text {
 684:     font-size: 14px;
 685: }
 686: 
 687: /* ===== ATTACH MENU ===== */
 688: .attach-menu {
 689:     position: fixed;
 690:     bottom: 100px;
 691:     left: var(--ne-spacing-lg);
 692:     right: var(--ne-spacing-lg);
 693:     background: rgba(0, 0, 0, 0.8);
 694:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 695:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 696:     border: var(--glass-border-light);
 697:     border-radius: var(--glass-radius);
 698:     padding: var(--ne-spacing-sm);
 699:     display: grid;
 700:     grid-template-columns: repeat(2, 1fr);
 701:     gap: var(--ne-spacing-sm);
 702:     z-index: 102;
 703:     animation: fadeIn 0.2s ease-out;
 704: }
 705: 
 706: .attach-option {
 707:     display: flex;
 708:     flex-direction: column;
 709:     align-items: center;
 710:     gap: 6px;
 711:     padding: var(--ne-spacing-lg);
 712:     border-radius: var(--glass-radius-sm);
 713:     border: var(--glass-border);
 714:     background: var(--glass-bg);
 715:     color: var(--ne-white);
 716:     font-size: 12px;
 717:     cursor: pointer;
 718:     transition: var(--glass-transition);
 719: }
 720: 
 721: .attach-option:active {
 722:     transform: scale(0.95);
 723:     box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3);
 724: }
 725: 
 726: .attach-icon {
 727:     font-size: 28px;
 728: }
 729: 
 730: /* ===== VIDEO RECORDING ===== */
 731: .video-recording {
 732:     position: fixed;
 733:     top: 0;
 734:     left: 0;
 735:     right: 0;
 736:     bottom: 0;
 737:     background: var(--ne-black);
 738:     z-index: 200;
 739:     display: flex;
 740:     flex-direction: column;
 741: }
 742: 
 743: .video-preview {
 744:     flex: 1;
 745:     position: relative;
 746:     background: var(--ne-black);
 747: }
 748: 
 749: .video-preview video {
 750:     width: 100%;
 751:     height: 100%;
 752:     object-fit: cover;
 753: }
 754: 
 755: .video-controls {
 756:     position: absolute;
 757:     bottom: 0;
 758:     left: 0;
 759:     right: 0;
 760:     padding: var(--ne-spacing-xl);
 761:     display: flex;
 762:     justify-content: center;
 763:     align-items: center;
 764:     gap: var(--ne-spacing-lg);
 765:     background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
 766: }
 767: 
 768: .video-record-btn {
 769:     width: 64px;
 770:     height: 64px;
 771:     border-radius: 50%;
 772:     border: 4px solid var(--ne-white);
 773:     background: transparent;
 774:     cursor: pointer;
 775:     transition: all 0.2s;
 776: }
 777: 
 778: .video-record-btn.recording {
 779:     background: var(--ne-red);
 780:     border-radius: 12px;
 781: }
 782: 
 783: .camera-switch-btn {
 784:     width: 48px;
 785:     height: 48px;
 786:     border-radius: 50%;
 787:     border: var(--glass-border);
 788:     background: rgba(0,0,0,0.5);
 789:     backdrop-filter: blur(8px);
 790:     -webkit-backdrop-filter: blur(8px);
 791:     color: var(--ne-white);
 792:     font-size: 24px;
 793:     cursor: pointer;
 794:     display: flex;
 795:     align-items: center;
 796:     justify-content: center;
 797: }
 798: 
 799: /* ===== RESPONSIVE ===== */
 800: @media (min-width: 768px) {
 801:     .app-main {
 802:         max-width: none !important;
 803:         margin: 0;
 804:     }
 805:     
 806:     .chat-input-container {
 807:         max-width: none;
 808:         left: 0;
 809:         transform: none;
 810:     }
 811:     
 812:     .attach-menu {
 813:         max-width: none;
 814:         left: var(--ne-spacing-lg);
 815:         transform: none;
 816:     }
 817: }
 818: 
 819: @media (min-width: 768px) {
 820:     html, body, #app, .app-main, .container, .tg-web-app {
 821:         max-width: none !important;
 822:         width: 100vw !important;
 823:         height: var(--tg-viewport-stable-height, 100dvh) !important;
 824:         margin: 0 !important;
 825:         padding: 0 !important;
 826:         overflow-x: hidden !important;
 827:     }
 828: }
 829: 
 830: /* ===== REDUCED TRANSPARENCY (Accessibility) ===== */
 831: @media (prefers-reduced-transparency: reduce) {
 832:     .message-bubble,
 833:     .chat-input-container,
 834:     .bottom-nav,
 835:     .btn,
 836:     .form-input {
 837:         backdrop-filter: none;
 838:         -webkit-backdrop-filter: none;
 839:     }
 840:     
 841:     .chat-message.user .message-bubble {
 842:         background: rgba(255, 255, 255, 0.95);
 843:     }
 844:     
 845:     .chat-message.hermes .message-bubble {
 846:         background: rgba(0, 0, 0, 0.95);
 847:     }
 848: }
 849: 
 850: /* ===== NEW UI STRUCTURE v0.20.511 ===== */
 851: /* Top control panel: mic (left) + task spec (right) */
 852: 
 853: .top-control-panel {
 854:     display: flex;
 855:     justify-content: space-between;
 856:     align-items: center;
 857:     gap: var(--ne-spacing-md);
 858:     padding: var(--ne-spacing-sm) var(--ne-spacing-lg);
 859:     background: var(--glass-bg);
 860:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 861:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 862:     border-bottom: var(--glass-border);
 863:     min-height: 56px;
 864: }
 865: 
 866: .left-mic-panel {
 867:     display: flex;
 868:     align-items: center;
 869:     gap: var(--ne-spacing-sm);
 870: }
 871: 
 872: .mic-button {
 873:     width: 44px;
 874:     height: 44px;
 875:     border-radius: 50%;
 876:     background: var(--glass-bg-light);
 877:     border: var(--glass-border);
 878:     display: flex;
 879:     align-items: center;
 880:     justify-content: center;
 881:     cursor: pointer;
 882:     transition: var(--glass-transition);
 883:     font-size: 20px;
 884: }
 885: 
 886: .mic-button:hover {
 887:     background: rgba(255, 255, 255, 0.12);
 888:     border-color: rgba(255, 255, 255, 0.2);
 889: }
 890: 
 891: .mic-button.recording {
 892:     background: rgba(239, 68, 68, 0.2);
 893:     border-color: rgba(239, 68, 68, 0.4);
 894:     animation: pulse-recording 1.5s ease-in-out infinite;
 895: }
 896: 
 897: @keyframes pulse-recording {
 898:     0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
 899:     50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
 900: }
 901: 
 902: .right-contract-panel {
 903:     flex: 1;
 904:     max-width: 60%;
 905:     min-height: 40px;
 906: }
 907: 
 908: .task-spec-container {
 909:     background: var(--glass-bg);
 910:     border: var(--glass-border);
 911:     border-radius: var(--glass-radius-sm);
 912:     padding: var(--ne-spacing-sm) var(--ne-spacing-md);
 913:     font-size: 13px;
 914:     color: var(--ne-light-gray);
 915:     max-height: 120px;
 916:     overflow-y: auto;
 917:     transition: var(--glass-transition);
 918: }
 919: 
 920: .task-spec-container.has-content {
 921:     border-color: rgba(139, 92, 246, 0.3);
 922:     background: rgba(139, 92, 246, 0.05);
 923: }
 924: 
 925: .task-spec-title {
 926:     font-size: 11px;
 927:     font-weight: 600;
 928:     color: var(--ne-purple);
 929:     text-transform: uppercase;
 930:     letter-spacing: 0.5px;
 931:     margin-bottom: 4px;
 932: }
 933: 
 934: /* Vertical connectors */
 935: .vertical-connector {
 936:     position: absolute;
 937:     top: 0;
 938:     bottom: 0;
 939:     width: 1px;
 940:     background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent);
 941:     pointer-events: none;
 942:     z-index: 0;
 943: }
 944: 
 945: .vertical-connector.left {
 946:     left: calc(var(--ne-spacing-lg) + 22px);
 947: }
 948: 
 949: .vertical-connector.right {
 950:     right: calc(var(--ne-spacing-lg) + 22px);
 951: }
 952: 
 953: /* Chat area with top panel spacing */
 954: .view.has-top-panel .chat-messages {
 955:     padding-top: var(--ne-spacing-sm);
 956: }
 957: 
 958: /* Task spec questions */
 959: .task-question {
 960:     margin-top: var(--ne-spacing-sm);
 961:     padding-top: var(--ne-spacing-sm);
 962:     border-top: 1px solid rgba(255, 255, 255, 0.06);
 963: }
 964: 
 965: .task-question p {
 966:     font-size: 12px;
 967:     color: var(--ne-silver);
 968:     margin-bottom: 4px;
 969: }
 970: 
 971: .task-question input {
 972:     width: 100%;
 973:     background: rgba(0, 0, 0, 0.3);
 974:     border: 1px solid rgba(255, 255, 255, 0.1);
 975:     border-radius: 6px;
 976:     padding: 6px 10px;
 977:     color: var(--ne-white);
 978:     font-size: 12px;
 979:     outline: none;
 980:     transition: var(--glass-transition);
 981: }
 982: 
 983: .task-question input:focus {
 984:     border-color: rgba(139, 92, 246, 0.5);
 985: }
 986: 
 987: /* ─── Панель вопросов смарт-контракта ─────────────────────────────── */
 988: .contract-qa-panel {
 989:     margin: var(--ne-spacing-md) var(--ne-spacing-lg);
 990:     padding: var(--ne-spacing-md);
 991:     background: var(--glass-bg);
 992:     border: var(--glass-border);
 993:     border-radius: var(--glass-radius-sm);
 994:     backdrop-filter: blur(8px);
 995:     -webkit-backdrop-filter: blur(8px);
 996: }
 997: 
 998: .qa-item {
 999:     margin-bottom: 10px;
1000:     padding-bottom: 10px;
1001:     border-bottom: 1px solid rgba(255,255,255,0.06);
1002: }
1003: 
1004: .qa-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
1005: 
1006: .qa-question {
1007:     font-size: 0.85rem;
1008:     color: #a0b4ff;
1009:     margin-bottom: 6px;
1010:     line-height: 1.4;
1011: }
1012: 
1013: .qa-answer-input {
1014:     width: 100%;
1015:     padding: 8px 10px;
1016:     background: rgba(0,0,0,0.3);
1017:     border: 1px solid rgba(255,255,255,0.1);
1018:     border-radius: 8px;
1019:     color: #fff;
1020:     font-size: 0.85rem;
1021:     outline: none;
1022:     transition: border-color 0.2s;
1023: }
1024: 
1025: .qa-answer-input:focus { border-color: #00ff88; }
1026: 
1027: .qa-empty { color: #666; font-size: 0.8rem; text-align: center; padding: 8px 0; }
1028: 
1029: /* ─── Голосовой ввод (пульсация) ──────────────────────────────────── */
1030: .mic-button.recording,
1031: #micButton.recording {
1032:     animation: pulse-recording 1.2s infinite ease-in-out;
1033:     border-color: #ff4d4d !important;
1034:     box-shadow: 0 0 12px rgba(255,77,77,0.4);
1035: }
1036: 
1037: @keyframes pulse-recording {
1038:     0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,77,77,0.5); }
1039:     70% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(255,77,77,0); }
1040:     100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,77,77,0); }
1041: }
1042: 
1043: /* ─── История ТЗ ──────────────────────────────────────────────────── */
1044: .task-history-panel {
1045:     position: fixed;
1046:     bottom: 80px;
1047:     left: 50%;
1048:     transform: translateX(-50%) translateY(20px);
1049:     width: 90%;
1050:     max-width: 400px;
1051:     max-height: 50vh;
1052:     background: rgba(18,18,24,0.95);
1053:     border: 1px solid rgba(255,255,255,0.1);
1054:     border-radius: 16px;
1055:     padding: 12px;
1056:     overflow-y: auto;
1057:     opacity: 0;
1058:     pointer-events: none;
1059:     transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
1060:     z-index: 900;
1061:     backdrop-filter: blur(12px);
1062:     -webkit-backdrop-filter: blur(12px);
1063: }
1064: 
1065: .task-history-panel.visible {
1066:     opacity: 1;
1067:     pointer-events: auto;
1068:     transform: translateX(-50%) translateY(0);
1069: }
1070: 
1071: .task-history-panel .history-item {
1072:     display: flex;
1073:     gap: 8px;
1074:     padding: 8px;
1075:     border-radius: 8px;
1076:     cursor: pointer;
1077:     transition: background 0.15s;
1078: }
1079: 
1080: .task-history-panel .history-item:hover { background: rgba(255,255,255,0.06); }
1081: 
1082: .task-history-panel .history-time { color: #666; font-size: 0.75rem; min-width: 42px; }
1083: 
1084: .task-history-panel .history-text { color: #ccc; font-size: 0.8rem; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
1085: 
1086: .task-history-panel .history-empty { color: #555; text-align: center; padding: 16px 0; font-size: 0.8rem; }
1087: 
1088: /* ─── Кнопка экспорта ─────────────────────────────────────────────── */
1089: .export-btn-sm {
1090:     flex: 1;
1091:     padding: 6px 8px;
1092:     background: rgba(255,255,255,0.06);
1093:     border: 1px solid rgba(255,255,255,0.1);
1094:     border-radius: 8px;
1095:     color: var(--ne-light-gray);
1096:     font-size: 0.75rem;
1097:     cursor: pointer;
1098:     transition: var(--glass-transition);
1099: }
1100: 
1101: .export-btn-sm:hover {
1102:     background: rgba(255,255,255,0.12);
1103:     border-color: rgba(255,255,255,0.2);
1104: }
1105: 
1106: .export-btn-sm:active { transform: scale(0.97); }
1107: 
1108: .export-btn {
1109:     margin-top: 10px;
1110:     width: 100%;
1111:     padding: 10px;
1112:     background: linear-gradient(135deg, #00ff88 0%, #00b8ff 100%);
1113:     border: none;
1114:     border-radius: 10px;
1115:     color: #000;
1116:     font-weight: 600;
1117:     font-size: 0.85rem;
1118:     cursor: pointer;
1119:     transition: opacity 0.2s, transform 0.1s;
1120: }
1121: 
1122: .export-btn:active { transform: scale(0.98); opacity: 0.9; }
1123: 
1124: /* ═══════════════════════════════════════════════════════════════════
1125:    SPLIT-PANE LAYOUT (Android Studio style)
1126:    Left: Hermes chat  |  Right: Smart contract / ТЗ (лист А4)
1127:    Горизонтальный split ВСЕГДА — мобильные тоже
1128:    ══════════════════════════════════════════════════════════════════ */
1129: 
1130: /* Split container wrapper — всегда горизонтальный */
1131: .split-layout {
1132:     display: flex;
1133:     flex-direction: row;
1134:     height: 100%;
1135:     flex: 1;
1136:     gap: 0;
1137:     min-height: 0;
1138: }
1139: 
1140: /* Individual pane */
1141: .split-pane {
1142:     display: flex;
1143:     flex-direction: column;
1144:     min-height: 0;
1145:     overflow: hidden;
1146: }
1147: 
1148: /* Left pane: chat (dark) */
1149: .split-pane.left-pane {
1150:     flex: 1;
1151:     min-width: 0;
1152:     background: var(--ne-black);
1153: }
1154: 
1155: /* Right pane: contract (A4 paper style) */
1156: .split-pane.right-pane {
1157:     flex: 0 0 38%;
1158:     min-width: 200px;
1159:     background: rgba(18, 18, 24, 0.95);
1160:     border-left: 1px solid rgba(255, 255, 255, 0.06);
1161: }
1162: 
1163: /* Pane header (IDE-style tab bar) */
1164: .pane-header {
1165:     display: flex;
1166:     align-items: center;
1167:     gap: 8px;
1168:     padding: 8px 12px;
1169:     background: rgba(0, 0, 0, 0.6);
1170:     border-bottom: 1px solid rgba(255, 255, 255, 0.08);
1171:     flex-shrink: 0;
1172:     min-height: 36px;
1173: }
1174: 
1175: .pane-header-icon {
1176:     font-size: 14px;
1177:     opacity: 0.7;
1178: }
1179: 
1180: .pane-header-title {
1181:     font-size: 12px;
1182:     font-weight: 600;
1183:     color: var(--ne-light-gray);
1184:     text-transform: uppercase;
1185:     letter-spacing: 0.5px;
1186: }
1187: 
1188: .pane-header-dot {
1189:     width: 8px;
1190:     height: 8px;
1191:     border-radius: 50%;
1192:     flex-shrink: 0;
1193: }
1194: 
1195: .pane-header-dot.purple { background: var(--ne-purple); }
1196: .pane-header-dot.red { background: var(--ne-red); }
1197: .pane-header-dot.green { background: #00ff88; }
1198: 
1199: /* Pane content area */
1200: .pane-content {
1201:     flex: 1;
1202:     overflow-y: auto;
1203:     overflow-x: hidden;
1204:     min-height: 0;
1205:     display: flex;
1206:     flex-direction: column;
1207: }
1208: 
1209: /* Left pane content: chat area */
1210: .split-pane.left-pane .pane-content {
1211:     position: relative;
1212: }
1213: 
1214: /* Resizable divider between panes */
1215: .split-divider {
1216:     flex-shrink: 0;
1217:     width: 4px;
1218:     height: 100%;
1219:     background: rgba(255, 255, 255, 0.06);
1220:     position: relative;
1221:     cursor: col-resize;
1222:     transition: background 0.2s;
1223:     z-index: 10;
1224: }
1225: 
1226: .split-divider:hover,
1227: .split-divider.dragging {
1228:     background: rgba(139, 92, 246, 0.4);
1229: }
1230: 
1231: .split-divider::after {
1232:     content: '';
1233:     position: absolute;
1234:     top: 50%;
1235:     left: 50%;
1236:     transform: translate(-50%, -50%);
1237:     width: 2px;
1238:     height: 40px;
1239:     border-radius: 1px;
1240:     background: rgba(255, 255, 255, 0.15);
1241: }
1242: 
1243: /* ─── Right pane: A4 paper style ─── */
1244: .right-contract-panel {
1245:     flex: 1;
1246:     padding: var(--ne-spacing-md);
1247:     min-height: 0;
1248: }
1249: 
1250: .task-spec-container {
1251:     background: rgba(255, 255, 255, 0.03);
1252:     border: 1px solid rgba(255, 255, 255, 0.08);
1253:     border-radius: var(--glass-radius-sm);
1254:     padding: var(--ne-spacing-md);
1255:     font-size: 13px;
1256:     color: var(--ne-light-gray);
1257:     height: 100%;
1258:     overflow-y: auto;
1259:     transition: var(--glass-transition);
1260:     /* A4 paper feel */
1261:     box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
1262: }
1263: 
1264: .task-spec-container.has-content {
1265:     border-color: rgba(139, 92, 246, 0.3);
1266:     background: rgba(139, 92, 246, 0.04);
1267: }
1268: 
1269: .task-spec-title {
1270:     font-size: 11px;
1271:     font-weight: 600;
1272:     color: var(--ne-purple);
1273:     text-transform: uppercase;
1274:     letter-spacing: 0.5px;
1275:     margin-bottom: 8px;
1276:     padding-bottom: 6px;
1277:     border-bottom: 1px solid rgba(255, 255, 255, 0.06);
1278: }
1279: 
1280: .task-spec-content {
1281:     line-height: 1.6;
1282:     font-size: 13px;
1283: }
1284: 
1285: /* Contract Q&A panel inside right pane */
1286: .contract-qa-panel {
1287:     margin: var(--ne-spacing-md);
1288:     padding: var(--ne-spacing-md);
1289:     background: rgba(255, 255, 255, 0.02);
1290:     border: 1px solid rgba(255, 255, 255, 0.06);
1291:     border-radius: var(--glass-radius-sm);
1292:     backdrop-filter: blur(8px);
1293:     -webkit-backdrop-filter: blur(8px);
1294: }
1295: 
1296: /* ─── Chat messages inside left pane ─── */
1297: .split-pane.left-pane .chat-messages {
1298:     flex: 1;
1299:     padding-bottom: 80px;
1300: }
1301: 
1302: /* ─── Top control panel inside left pane ─── */
1303: .split-pane.left-pane .top-control-panel {
1304:     background: rgba(0, 0, 0, 0.4);
1305:     border-bottom: 1px solid rgba(255, 255, 255, 0.06);
1306: }
1307: 
1308: /* ─── Chat input inside left pane ─── */
1309: .split-pane.left-pane .chat-input-container {
1310:     position: sticky;
1311:     bottom: 0;
1312:     left: auto;
1313:     right: auto;
1314:     border-top: var(--glass-border);
1315:     z-index: 10;
1316:     padding: var(--ne-spacing-sm) var(--ne-spacing-md);
1317:     background: rgba(0, 0, 0, 0.85);
1318:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
1319:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
1320:     flex-shrink: 0;
1321: }
1322: 
1323: /* Hide fixed chat input when split layout is active */
1324: .chat-input-container:not(.split-chat-input) {
1325:     display: none !important;
1326: }
1327: 
1328: /* Show split chat input only on hermes view (handled by JS) */
1329: .split-chat-input {
1330:     display: flex;
1331: }
1332: 
1333: /* ─── Mobile adjustments ─── */
1334: @media (max-width: 599px) {
1335:     .split-pane.right-pane {
1336:         flex: 0 0 35%;
1337:         min-width: 140px;
1338:     }
1339: 
1340:     .pane-header-title {
1341:         font-size: 10px;
1342:     }
1343: 
1344:     .task-spec-container {
1345:         padding: var(--ne-spacing-sm);
1346:         font-size: 12px;
1347:     }
1348: 
1349:     .contract-qa-panel {
1350:         margin: var(--ne-spacing-sm);
1351:         padding: var(--ne-spacing-sm);
1352:     }
1353: }
1354: 
1355: /* ─── Desktop adjustments ─── */
1356: @media (min-width: 600px) {
1357:     .split-pane.right-pane {
1358:         flex: 0 0 38%;
1359:         min-width: 280px;
1360:     }
1361: 
1362:     .task-spec-container {
1363:         padding: var(--ne-spacing-md);
1364:         font-size: 13px;
1365:     }
1366: 
1367:     .contract-qa-panel {
1368:         margin: var(--ne-spacing-md);
1369:         padding: var(--ne-spacing-md);
1370:     }
1371: }
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
 104:         // Priority 2-3: Voice input, Contract Q&A, Task Spec history
 105:         this.initVoiceInput();
 106:         this.loadTaskSpecHistory();
 107: 
 108:         const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
 109:         if (micBtn) micBtn.onclick = () => this.toggleVoiceRecording();
 110: 
 111:         const exportBtn = document.getElementById('exportTaskSpecBtn');
 112:         if (exportBtn) exportBtn.onclick = () => this.exportTaskSpec();
 113: 
 114:         const historyToggle = document.getElementById('toggleTaskHistoryBtn');
 115:         const historyPanel = document.getElementById('task-history-panel');
 116:         if (historyToggle && historyPanel) {
 117:             historyToggle.onclick = () => {
 118:                 historyPanel.classList.toggle('visible');
 119:                 telegram.haptic('light');
 120:             };
 121:         }
 122: 
 123:         this.renderContractQuestions([
 124:             { id: 'q1', text: 'Каков дедлайн исполнения смарт-контракта?' },
 125:             { id: 'q2', text: 'Укажите условия возврата средств при срыве сроков.' },
 126:             { id: 'q3', text: 'Требуется ли арбитраж третьей стороны?' }
 127:         ]);
 128:     }
 129: 
 130:     updateHeader() {
 131:         const nameEl = document.getElementById('user-name');
 132:         
 133:         if (this.userData) {
 134:             const name = this.userData.first_name || this.userData.username || 'Пользователь';
 135:             nameEl.textContent = name;
 136:         } else {
 137:             nameEl.textContent = 'Гость';
 138:         }
 139:     }
 140: 
 141:     applySafeAreaInsets() {
 142:         const tg = window.Telegram?.WebApp;
 143:         if (!tg) return;
 144: 
 145:         // Apply safe area insets as CSS custom properties
 146:         // Docs: https://docs.telegram-mini-apps.com/packages/tma-js-sdk/features/viewport
 147:         const root = document.documentElement;
 148:         if (tg.safeAreaInset) {
 149:             root.style.setProperty('--tg-safe-area-inset-top', `${tg.safeAreaInset.top}px`);
 150:             root.style.setProperty('--tg-safe-area-inset-bottom', `${tg.safeAreaInset.bottom}px`);
 151:             root.style.setProperty('--tg-safe-area-inset-left', `${tg.safeAreaInset.left}px`);
 152:             root.style.setProperty('--tg-safe-area-inset-right', `${tg.safeAreaInset.right}px`);
 153:         }
 154:         if (tg.contentSafeAreaInset) {
 155:             root.style.setProperty('--tg-content-safe-area-inset-top', `${tg.contentSafeAreaInset.top}px`);
 156:             root.style.setProperty('--tg-content-safe-area-inset-bottom', `${tg.contentSafeAreaInset.bottom}px`);
 157:         }
 158: 
 159:         // Use viewportStableHeight for layout (doesn't change during gestures)
 160:         if (tg.viewportStableHeight) {
 161:             root.style.setProperty('--tg-viewport-stable-height', `${tg.viewportStableHeight}px`);
 162:         }
 163:     }
 164: 
 165:     navigate(view) {
 166:         // Reset voice state when switching tabs
 167:         if (view !== 'hermes' && this.voiceState !== 'IDLE') {
 168:             this.resetVoiceState();
 169:         }
 170:         
 171:         this.currentView = view;
 172:         
 173:         document.querySelectorAll('.nav-btn').forEach(btn => {
 174:             btn.classList.toggle('active', btn.dataset.view === view);
 175:         });
 176:         
 177:         const main = document.getElementById('main-content');
 178:         main.innerHTML = '';
 179:         
 180:         // Show/hide chat input based on view (split-chat-input is inside left pane)
 181:         const chatInput = document.getElementById('chat-input-container');
 182:         if (chatInput) {
 183:             chatInput.style.display = view === 'hermes' ? 'flex' : 'none';
 184:         }
 185:         
 186:         // Also handle the split-layout chat input
 187:         const splitChatInput = document.querySelector('.split-chat-input');
 188:         if (splitChatInput) {
 189:             splitChatInput.style.display = view === 'hermes' ? 'flex' : 'none';
 190:         }
 191:         
 192:         // Hide fixed chat input container when not on hermes
 193:         const fixedChatInput = document.querySelector('.chat-input-container:not(.split-chat-input)');
 194:         if (fixedChatInput) {
 195:             fixedChatInput.style.display = view === 'hermes' ? 'flex' : 'none';
 196:         }
 197:         }
 198:         
 199:         switch(view) {
 200:             case 'hermes':
 201:                 this.renderHermesView(main);
 202:                 break;
 203:             case 'deals':
 204:                 this.renderDealsView(main);
 205:                 break;
 206:             case 'profile':
 207:                 this.renderProfileView(main);
 208:                 break;
 209:         }
 210:         
 211:         telegram.haptic('light');
 212:     }
 213: 
 214:     // -------------------------------------------------------------------------
 215:     // Hermes View (Voice Interface - Main Screen)
 216:     // -------------------------------------------------------------------------
 217: 
 218:     renderHermesView(container) {
 219:         const view = document.createElement('div');
 220:         view.className = 'view has-top-panel';
 221:         
 222:         view.innerHTML = `
 223:             <div class="split-layout">
 224:                 <!-- LEFT PANE: Hermes Chat -->
 225:                 <div class="split-pane left-pane">
 226:                     <div class="pane-header">
 227:                         <span class="pane-header-dot purple"></span>
 228:                         <span class="pane-header-icon">🎙️</span>
 229:                         <span class="pane-header-title">Гермес — Чат</span>
 230:                     </div>
 231:                     <div class="pane-content">
 232:                         <div class="top-control-panel">
 233:                             <div class="left-mic-panel">
 234:                                 <button class="mic-button" id="micButton">
 235:                                     <span class="voice-icon">🎙️</span>
 236:                                 </button>
 237:                             </div>
 238:                         </div>
 239:                         <div class="chat-messages" id="chat-messages"></div>
 240:                         <!-- Chat input inside left pane (desktop) -->
 241:                         <div class="chat-input-container split-chat-input" id="chat-input-container">
 242:                             <button class="attach-btn" id="attach-btn" onclick="app.showAttachMenu()">
 243:                                 <span>📎</span>
 244:                             </button>
 245:                             <input type="text" class="chat-input" id="chat-input" placeholder="Напишите сообщение..." />
 246:                             <button class="send-btn" id="send-btn" onclick="app.sendTextMessage()">
 247:                                 <span>➤</span>
 248:                             </button>
 249:                         </div>
 250:                     </div>
 251:                 </div>
 252: 
 253:                 <!-- DIVIDER -->
 254:                 <div class="split-divider" id="split-divider"></div>
 255: 
 256:                 <!-- RIGHT PANE: Smart Contract / ТЗ -->
 257:                 <div class="split-pane right-pane">
 258:                     <div class="pane-header">
 259:                         <span class="pane-header-dot green"></span>
 260:                         <span class="pane-header-icon">📋</span>
 261:                         <span class="pane-header-title">Смарт-контракт</span>
 262:                     </div>
 263:                     <div class="pane-content">
 264:                         <div class="right-contract-panel">
 265:                             <div id="task-spec" class="task-spec-container">
 266:                                 <div class="task-spec-title">Техническое задание</div>
 267:                                 <div id="task-spec-content">Ожидание ТЗ от Гермеса...</div>
 268:                                 <div style="display:flex;gap:6px;margin-top:8px;">
 269:                                     <button id="exportTaskSpecBtn" class="export-btn-sm" type="button">📥 Экспорт</button>
 270:                                     <button id="toggleTaskHistoryBtn" class="export-btn-sm" type="button"> История</button>
 271:                                 </div>
 272:                             </div>
 273:                         </div>
 274:                         <div id="contract-qa-container" class="contract-qa-panel"></div>
 275:                     </div>
 276:                 </div>
 277:             </div>
 278: 
 279:             <!-- Task history (overlay) -->
 280:             <div id="task-history-panel" class="task-history-panel">
 281:                 <div id="task-history-list"></div>
 282:             </div>
 283:         `;
 284:         
 285:         container.appendChild(view);
 286:         this.renderChatMessages();
 287:         this.initSplitDivider();
 288:         this.bindChatInputEvents();
 289:     }
 290: 
 291:     bindChatInputEvents() {
 292:         // Enter key fix for chat input — prevent form submit / page reload
 293:         const chatInput = document.getElementById('chat-input');
 294:         if (chatInput) {
 295:             chatInput.addEventListener('keydown', (e) => {
 296:                 if (e.key === 'Enter' && !e.shiftKey) {
 297:                     e.preventDefault();
 298:                     this.sendTextMessage();
 299:                 }
 300:             });
 301:         }
 302: 
 303:         // Prevent any accidental form submit if input is wrapped in <form>
 304:         const chatContainer = document.getElementById('chat-input-container');
 305:         if (chatContainer) {
 306:             chatContainer.addEventListener('submit', (e) => e.preventDefault());
 307:         }
 308: 
 309:         // Ensure send button is type="button" not "submit"
 310:         const sendBtn = document.getElementById('send-btn');
 311:         if (sendBtn && !sendBtn.getAttribute('type')) {
 312:             sendBtn.setAttribute('type', 'button');
 313:         }
 314:     }
 315: 
 316:     initSplitDivider() {
 317:         const divider = document.getElementById('split-divider');
 318:         if (!divider) return;
 319: 
 320:         let isDragging = false;
 321:         let startX, startY, startWidth;
 322: 
 323:         const onMouseDown = (e) => {
 324:             isDragging = true;
 325:             divider.classList.add('dragging');
 326:             startX = e.clientX || e.touches?.[0]?.clientX || 0;
 327:             startY = e.clientY || e.touches?.[0]?.clientY || 0;
 328:             const leftPane = divider.previousElementSibling;
 329:             startWidth = leftPane?.getBoundingClientRect().width || 0;
 330:             document.addEventListener('mousemove', onMouseMove);
 331:             document.addEventListener('mouseup', onMouseUp);
 332:             document.addEventListener('touchmove', onTouchMove, { passive: false });
 333:             document.addEventListener('touchend', onTouchEnd);
 334:         };
 335: 
 336:         const onMouseMove = (e) => {
 337:             if (!isDragging) return;
 338:             const dx = (e.clientX || 0) - startX;
 339:             const container = divider.parentElement;
 340:             const totalWidth = container?.getBoundingClientRect().width || 1;
 341:             const newWidth = Math.max(200, Math.min(totalWidth - 200, startWidth + dx));
 342:             const leftPane = divider.previousElementSibling;
 343:             const rightPane = divider.nextElementSibling;
 344:             if (leftPane) leftPane.style.flex = `0 0 ${newWidth}px`;
 345:             if (rightPane) rightPane.style.flex = '1';
 346:         };
 347: 
 348:         const onMouseUp = () => {
 349:             isDragging = false;
 350:             divider.classList.remove('dragging');
 351:             document.removeEventListener('mousemove', onMouseMove);
 352:             document.removeEventListener('mouseup', onMouseUp);
 353:         };
 354: 
 355:         const onTouchMove = (e) => {
 356:             if (!isDragging) return;
 357:             e.preventDefault();
 358:             const dx = (e.touches?.[0]?.clientX || 0) - startX;
 359:             const container = divider.parentElement;
 360:             const totalWidth = container?.getBoundingClientRect().width || 1;
 361:             const newWidth = Math.max(200, Math.min(totalWidth - 200, startWidth + dx));
 362:             const leftPane = divider.previousElementSibling;
 363:             if (leftPane) leftPane.style.flex = `0 0 ${newWidth}px`;
 364:         };
 365: 
 366:         const onTouchEnd = () => {
 367:             isDragging = false;
 368:             divider.classList.remove('dragging');
 369:             document.removeEventListener('touchmove', onTouchMove);
 370:             document.removeEventListener('touchend', onTouchEnd);
 371:         };
 372: 
 373:         divider.addEventListener('mousedown', onMouseDown);
 374:         divider.addEventListener('touchstart', (e) => {
 375:             startX = e.touches?.[0]?.clientX || 0;
 376:             startY = e.touches?.[0]?.clientY || 0;
 377:             onMouseDown(e);
 378:         }, { passive: true });
 379:     }
 380: 
 381:     toggleVoice() {
 382:         // Explicit protection against multiple taps during processing
 383:         if (this.voiceState === 'PROCESSING' || this.isProcessing) {
 384:             return;
 385:         }
 386:         
 387:         if (this.voiceState === 'LISTENING') {
 388:             this.stopVoiceRecording();
 389:         } else {
 390:             this.voiceState = 'LISTENING';
 391:             this.updateVoiceButton();
 392:             this.startVoiceRecording();
 393:         }
 394:         
 395:         telegram.haptic('medium');
 396:     }
 397: 
 398:     async startVoiceRecording() {
 399:         try {
 400:             const tg = window.Telegram?.WebApp;
 401:             // Try native Telegram voice recording (Bot API 9.6+)
 402:             if (tg && typeof tg.requestVoiceMessage === 'function') {
 403:                 const result = await tg.requestVoiceMessage();
 404:                 
 405:                 if (result && result.file_id) {
 406:                     this.sendVoiceToBot(result.file_id, result.duration);
 407:                 } else {
 408:                     throw new Error('No file_id received');
 409:                 }
 410:             } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
 411:                 // Fallback to manual recording
 412:                 this.fallbackToManualRecording();
 413:             } else {
 414:                 telegram.showAlert('Запись голоса не поддерживается в вашем браузере. Используйте текстовый ввод.');
 415:             }
 416:         } catch (error) {
 417:             console.error('[Voice] Recording failed:', error.message);
 418:             this.handleVoiceError(error);
 419:         }
 420:     }
 421: 
 422:     stopVoiceRecording() {
 423:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
 424:             this.mediaRecorder.stop();
 425:         }
 426:         this.resetVoiceState();
 427:     }
 428: 
 429:     fallbackToManualRecording() {
 430:         navigator.mediaDevices.getUserMedia({ audio: true })
 431:             .then(stream => {
 432:                 this.mediaRecorder = new MediaRecorder(stream);
 433:                 this.audioChunks = [];
 434:                 
 435:                 this.mediaRecorder.ondataavailable = (e) => {
 436:                     this.audioChunks.push(e.data);
 437:                 };
 438:                 
 439:                 this.mediaRecorder.onstop = () => {
 440:                     const audioBlob = new Blob(this.audioChunks, { type: 'audio/ogg' });
 441:                     this.uploadVoiceBlob(audioBlob);
 442:                     stream.getTracks().forEach(track => track.stop());
 443:                 };
 444:                 
 445:                 this.mediaRecorder.start();
 446:                 console.log('[NeuroEscrow] Fallback recording started');
 447:             })
 448:             .catch(error => {
 449:                 this.handleVoiceError(error);
 450:             });
 451:     }
 452: 
 453:     uploadVoiceBlob(blob) {
 454:         // This would require bot-side endpoint for blob upload
 455:         // For now, just show error
 456:         this.handleVoiceError(new Error('Manual recording not yet implemented'));
 457:     }
 458: 
 459:     sendVoiceToBot(fileId, duration) {
 460:         this.voiceState = 'PROCESSING';
 461:         this.isProcessing = true;
 462:         this.updateVoiceButton();
 463:         this.setupResponseTimeout();
 464:         
 465:         const payload = {
 466:             action: 'voice_message',
 467:             file_id: fileId,
 468:             duration: duration,
 469:             timestamp: Date.now(),
 470:             user_id: telegram.getUserId()
 471:         };
 472:         
 473:         telegram.sendData(payload);
 474:         console.log('[NeuroEscrow] Voice sent to bot:', fileId);
 475:     }
 476: 
 477:     updateVoiceButton() {
 478:         const btn = document.getElementById('voice-btn');
 479:         const status = document.getElementById('voice-status');
 480:         
 481:         if (!btn) return;
 482:         
 483:         // Remove all state classes
 484:         btn.classList.remove('recording', 'processing');
 485:         
 486:         switch (this.voiceState) {
 487:             case 'IDLE':
 488:                 if (status) { status.textContent = ''; status.style.display = 'none'; }
 489:                 this.isRecording = false;
 490:                 break;
 491:                 
 492:             case 'LISTENING':
 493:                 btn.classList.add('recording');
 494:                 if (status) { status.textContent = 'Слушаю...'; status.style.display = 'block'; }
 495:                 this.isRecording = true;
 496:                 break;
 497:                 
 498:             case 'PROCESSING':
 499:                 btn.classList.add('processing');
 500:                 if (status) { status.textContent = 'Гермес обрабатывает...'; status.style.display = 'block'; }
 501:                 this.isRecording = false;
 502:                 break;
 503:         }
 504:     }
 505: 
 506:     setupResponseTimeout() {
 507:         if (this.responseTimeout) {
 508:             clearTimeout(this.responseTimeout);
 509:         }
 510:         
 511:         this.responseTimeout = setTimeout(() => {
 512:             if (this.voiceState === 'PROCESSING') {
 513:                 this.handleVoiceError(new Error('timeout'));
 514:             }
 515:         }, 30000);
 516:     }
 517: 
 518:     handleVoiceError(error) {
 519:         console.error('[NeuroEscrow] Voice error:', error);
 520:         
 521:         this.resetVoiceState();
 522:         
 523:         let message = 'Ошибка записи голоса';
 524:         
 525:         if (error.message.includes('permission')) {
 526:             message = 'Нет доступа к микрофону';
 527:         } else if (error.message.includes('timeout')) {
 528:             message = 'Превышено время ожидания';
 529:         } else if (error.message.includes('cancelled')) {
 530:             message = 'Запись отменена';
 531:         }
 532:         
 533:         telegram.showAlert(message);
 534:         telegram.hapticNotification('error');
 535:     }
 536: 
 537:     resetVoiceState() {
 538:         this.voiceState = 'IDLE';
 539:         this.isRecording = false;
 540:         this.isProcessing = false;
 541:         this.updateVoiceButton();
 542:         
 543:         if (this.responseTimeout) {
 544:             clearTimeout(this.responseTimeout);
 545:             this.responseTimeout = null;
 546:         }
 547:     }
 548: 
 549:     handleDraftCreated(draft) {
 550:         if (this.responseTimeout) {
 551:             clearTimeout(this.responseTimeout);
 552:         }
 553:         
 554:         // Check for duplicates
 555:         const existingIndex = this.deals.findIndex(d => d.id === draft.id);
 556:         if (existingIndex !== -1) {
 557:             this.deals[existingIndex] = { ...draft, type: 'draft', isNew: true };
 558:         } else {
 559:             this.deals.unshift({ ...draft, type: 'draft', isNew: true });
 560:         }
 561:         
 562:         this.resetVoiceState();
 563:         this.saveCache(); // Save immediately after adding draft
 564:         this.navigate('deals');
 565:         
 566:         telegram.hapticNotification('success');
 567:         telegram.showAlert('Черновик создан');
 568:         
 569:         console.log('[NeuroEscrow] Draft created:', draft.id);
 570:     }
 571: 
 572:     // -------------------------------------------------------------------------
 573:     // Deals View
 574:     // -------------------------------------------------------------------------
 575: 
 576:     renderDealsView(container) {
 577:         const view = document.createElement('div');
 578:         view.className = 'view';
 579:         
 580:         const deals = this.deals.length > 0 ? this.deals : this.getSampleDeals();
 581:         
 582:         view.innerHTML = `
 583:             <h2 style="font-size:18px;margin-bottom:16px;font-weight:600;">Мои сделки</h2>
 584:             ${deals.length === 0 ? this.emptyState('🤝', 'У вас пока нет сделок') : ''}
 585:             <div id="deals-list">
 586:                 ${deals.map(deal => deal.type === 'draft' ? this.renderDraftCard(deal) : this.dealCard(deal)).join('')}
 587:             </div>
 588:         `;
 589:         
 590:         container.appendChild(view);
 591:     }
 592: 
 593:     renderDraftCard(draft) {
 594:         const title = this.escapeHtml(draft.title || 'Без названия');
 595:         const description = this.escapeHtml(draft.description || '');
 596:         const budget = draft.budget || 'Не указан';
 597:         const deadline = draft.deadline || 'Не указан';
 598:         
 599:         return `
 600:             <div class="card draft-card" style="border-left:2px solid rgba(255, 255, 255, 0.34);">
 601:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
 602:                     <span style="font-size:12px;font-weight:600;color:rgba(255, 255, 255, 0.34);text-transform:uppercase;letter-spacing:0.5px;">Черновик</span>
 603:                     <span style="font-size:11px;color:var(--ne-light-gray);">${this.formatDate(draft.created_at)}</span>
 604:                 </div>
 605:                 <div class="card-title">${title}</div>
 606:                 <p style="font-size:13px;color:var(--ne-light-gray);margin:8px 0;">${description}</p>
 607:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
 608:                     <span>💰 ${budget}</span>
 609:                     <span>⏱️ ${deadline}</span>
 610:                 </div>
 611:                 <div style="display:flex;gap:8px;margin-top:12px;">
 612:                     <button class="btn btn-primary" onclick="app.editDraft('${draft.id}')" style="flex:1;">Редактировать</button>
 613:                     <button class="btn btn-secondary" onclick="app.publishDraft('${draft.id}')" style="flex:1;">Опубликовать</button>
 614:                 </div>
 615:             </div>
 616:         `;
 617:     }
 618: 
 619:     dealCard(deal) {
 620:         const statusColors = {
 621:             'draft': 'rgba(255, 255, 255, 0.34)',
 622:             'negotiating': '#dddddd',
 623:             'in_progress': '#dddddd',
 624:             'completed': 'rgba(255, 255, 255, 0.67)'
 625:         };
 626:         
 627:         const statusNames = {
 628:             'draft': 'Черновик',
 629:             'negotiating': 'Переговоры',
 630:             'in_progress': 'В работе',
 631:             'completed': 'Завершена'
 632:         };
 633:         
 634:         const color = statusColors[deal.status] || 'rgba(255, 255, 255, 0.34)';
 635:         const statusName = statusNames[deal.status] || deal.status;
 636:         
 637:         return `
 638:             <div class="card" style="border-left:2px solid ${color};">
 639:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
 640:                     <span style="font-size:12px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${statusName}</span>
 641:                     <span style="font-size:11px;color:var(--ne-light-gray);">#${deal.id}</span>
 642:                 </div>
 643:                 <div class="card-title">${deal.title}</div>
 644:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
 645:                     <span>💰 ${deal.budget} USDT</span>
 646:                     <span>👤 ${deal.counterparty}</span>
 647:                 </div>
 648:                 <div style="margin-top:12px;">
 649:                     <button class="btn btn-secondary" onclick="app.viewDeal('${deal.id}')">Открыть в боте</button>
 650:                 </div>
 651:             </div>
 652:         `;
 653:     }
 654: 
 655:     getSampleDeals() {
 656:         return [
 657:             { id: 'a1b2', title: 'Telegram бот для интернет-магазина', status: 'in_progress', budget: '500', counterparty: 'client_42' },
 658:             { id: 'c3d4', title: 'Парсер данных с сайта', status: 'completed', budget: '300', counterparty: 'client_17' },
 659:         ];
 660:     }
 661: 
 662:     viewDeal(dealId) {
 663:         telegram.sendData({ action: 'view_deal', deal_id: dealId });
 664:         telegram.showAlert('Открываю детали сделки в боте...');
 665:     }
 666: 
 667:     editDraft(draftId) {
 668:         telegram.sendData({ action: 'edit_draft', draft_id: draftId });
 669:         telegram.showAlert('Открываю редактор в боте...');
 670:     }
 671: 
 672:     publishDraft(draftId) {
 673:         telegram.sendData({ action: 'publish_draft', draft_id: draftId });
 674:         telegram.showAlert('Публикую черновик...');
 675:     }
 676: 
 677:     escapeHtml(text) {
 678:         const div = document.createElement('div');
 679:         div.textContent = text;
 680:         return div.innerHTML;
 681:     }
 682: 
 683:     formatDate(timestamp) {
 684:         if (!timestamp) return '';
 685:         const date = new Date(timestamp * 1000);
 686:         const now = new Date();
 687:         const diff = now - date;
 688:         
 689:         if (diff < 60000) return 'только что';
 690:         if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
 691:         if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
 692:         
 693:         return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
 694:     }
 695: 
 696:     // -------------------------------------------------------------------------
 697:     // Profile View
 698:     // -------------------------------------------------------------------------
 699: 
 700:     renderProfileView(container) {
 701:         const view = document.createElement('div');
 702:         view.className = 'view';
 703:         
 704:         view.innerHTML = `
 705:             <div class="card" style="text-align:center;padding:24px;">
 706:                 <div style="font-size:32px;font-weight:700;margin-bottom:8px;">${this.balance.toFixed(2)} USDT</div>
 707:                 <div style="font-size:13px;color:var(--ne-light-gray);margin-bottom:20px;">Ваш баланс</div>
 708:                 
 709:                 <div style="display:flex;gap:8px;margin-bottom:16px;">
 710:                     <button class="btn btn-primary" onclick="app.donate()" style="flex:1;">
 711:                         💝 Поддержать
 712:                     </button>
 713:                     <button class="btn btn-secondary" onclick="app.leaveTip()" style="flex:1;">
 714:                         ⭐ Чаевые
 715:                     </button>
 716:                 </div>
 717:                 
 718:                 <div style="font-size:11px;color:var(--ne-light-gray);margin-top:12px;">
 719:                     TON • USDT • Telegram Stars
 720:                 </div>
 721:             </div>
 722:             
 723:             <div id="ton-connect" style="margin:16px 0;"></div>
 724:             
 725:             <div class="card">
 726:                 <div class="card-title">Настройки</div>
 727:                 <div class="form-group">
 728:                     <label class="form-label">LLM Модель</label>
 729:                     <select class="form-input" id="model-selector">
 730:                         <option value="auto">Автоматически</option>
 731:                         <option value="gpt-4">GPT-4</option>
 732:                         <option value="claude">Claude</option>
 733:                         <option value="grok">Grok</option>
 734:                         <option value="custom">Своя модель</option>
 735:                     </select>
 736:                 </div>
 737:             </div>
 738:         `;
 739:         
 740:         container.appendChild(view);
 741:         
 742:         setTimeout(() => {
 743:             tonConnect.init('ton-connect');
 744:         }, 100);
 745:     }
 746: 
 747:     donate() {
 748:         telegram.showAlert('Выберите способ:\n\n⭐ Stars: 50, 100, 250, 500\n💎 TON: 1, 5, 10, 25\n💵 USDT: 5, 10, 25, 50');
 749:     }
 750: 
 751:     leaveTip() {
 752:         telegram.showAlert('Быстрые чаевые:\n\n10 ⭐ | 25 ⭐ | 50 ⭐ | 100 ⭐');
 753:     }
 754: 
 755:     onTonStatusChange(detail) {
 756:         console.log('[App] TON status changed:', detail);
 757:     }
 758: 
 759:     async loadCache() {
 760:         try {
 761:             const cached = await telegram.cloudGet('neuroescrow_data');
 762:             if (cached) {
 763:                 this.deals = cached.deals || [];
 764:                 this.balance = cached.balance || 0;
 765:                 this.chatMessages = cached.chatMessages || [];
 766:                 console.log('[App] Cache loaded');
 767:             }
 768:         } catch (e) {
 769:             console.log('[App] No cache found');
 770:         }
 771:     }
 772: 
 773:     async saveCache() {
 774:         const data = {
 775:             deals: this.deals,
 776:             balance: this.balance,
 777:             chatMessages: this.chatMessages,
 778:             timestamp: Date.now()
 779:         };
 780:         await telegram.cloudSet('neuroescrow_data', data);
 781:     }
 782: 
 783:     async loadSession(sessionId) {
 784:         const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
 785:             ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
 786:             : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
 787: 
 788:         try {
 789:             const resp = await fetch(baseUrl + 'session/' + sessionId, { mode: 'cors' });
 790:             if (!resp.ok) return;
 791: 
 792:             const session = await resp.json();
 793:             const messages = session.messages || [];
 794: 
 795:             this.chatMessages = messages.map(msg => ({
 796:                 sender: msg.role === 'user' ? 'user' : 'hermes',
 797:                 text: msg.content || msg.text || '',
 798:                 timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()
 799:             }));
 800: 
 801:             this.renderChatMessages();
 802:             this.saveCache();
 803:         } catch (e) {
 804:             console.error('[App] Load session error:', e.message);
 805:         }
 806:     }
 807: 
 808:     async loadSessionsList() {
 809:         const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
 810:             ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
 811:             : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
 812: 
 813:         try {
 814:             const resp = await fetch(baseUrl + 'sessions', { mode: 'cors' });
 815:             if (!resp.ok) return [];
 816:             return await resp.json();
 817:         } catch (e) {
 818:             console.error('[App] Load sessions error:', e.message);
 819:             return [];
 820:         }
 821:     }
 822: 
 823:     requestDataFromBot() {
 824:         telegram.sendData({ action: 'get_dashboard_data' });
 825:     }
 826: 
 827:     handleBotData(data) {
 828:         console.log('[App] Data from bot:', data);
 829:         
 830:         // Handle different event types
 831:         if (data.event === 'draft_created' && data.draft) {
 832:             this.handleDraftCreated(data.draft);
 833:             return;
 834:         }
 835:         
 836:         if (data.event === 'error') {
 837:             this.handleVoiceError(new Error(data.error || 'Unknown error'));
 838:             return;
 839:         }
 840: 
 841:         if (data.event === 'hermes_reply' && data.text) {
 842:             this.addChatMessage('hermes', data.text);
 843:             return;
 844:         }
 845: 
 846:         if (data.event === 'moderation_block') {
 847:             telegram.showAlert('⚠️ Ваш контент нарушает правила платформы');
 848:             return;
 849:         }
 850:         
 851:         // Handle dashboard data
 852:         if (data.deals) this.deals = data.deals;
 853:         if (data.balance !== undefined) this.balance = data.balance;
 854:         
 855:         this.saveCache();
 856:         
 857:         const main = document.getElementById('main-content');
 858:         main.innerHTML = '';
 859:         switch(this.currentView) {
 860:             case 'hermes': this.renderHermesView(main); break;
 861:             case 'deals': this.renderDealsView(main); break;
 862:             case 'profile': this.renderProfileView(main); break;
 863:         }
 864:     }
 865: 
 866:     emptyState(icon, text) {
 867:         return `
 868:             <div class="empty-state">
 869:                 <div class="empty-icon">${icon}</div>
 870:                 <div class="empty-text">${text}</div>
 871:             </div>
 872:         `;
 873:     }
 874: 
 875:     // -------------------------------------------------------------------------
 876:     // Chat Interface Methods
 877:     // -------------------------------------------------------------------------
 878: 
 879:     renderChatMessages() {
 880:         const container = document.getElementById('chat-messages');
 881:         if (!container) return;
 882: 
 883:         container.innerHTML = this.chatMessages.map((msg, idx) => {
 884:             const isLastHermes = idx === this.chatMessages.length - 1 && msg.sender === 'hermes' && msg.text === '';
 885:             const streamingClass = isLastHermes ? ' streaming' : '';
 886:             const isHermesComplete = msg.sender === 'hermes' && msg.text !== '' && !isLastHermes;
 887:             const feedbackHtml = isHermesComplete && !msg.feedback ? `
 888:                 <div class="feedback-buttons">
 889:                     <button class="feedback-btn" onclick="app.submitFeedback(${idx}, 'up')">👍</button>
 890:                     <button class="feedback-btn" onclick="app.submitFeedback(${idx}, 'down')">👎</button>
 891:                 </div>
 892:             ` : '';
 893:             return `
 894:             <div class="chat-message ${msg.sender}">
 895:                 <div class="message-bubble${streamingClass}">
 896:                     ${this.escapeHtml(msg.text)}
 897:                     <span class="msg-time">${this.formatTime(msg.timestamp)}</span>
 898:                     ${feedbackHtml}
 899:                 </div>
 900:             </div>
 901:         `;
 902:         }).join('');
 903: 
 904:         this.scrollToBottom();
 905:     }
 906: 
 907:     scrollToBottom() {
 908:         const container = document.getElementById('chat-messages');
 909:         if (!container) return;
 910:         requestAnimationFrame(() => {
 911:             container.scrollTop = container.scrollHeight;
 912:         });
 913:     }
 914: 
 915:     addChatMessage(sender, text) {
 916:         this.chatMessages.push({
 917:             sender,
 918:             text,
 919:             timestamp: Date.now()
 920:         });
 921:         this.renderChatMessages();
 922:         this.saveCache();
 923:     }
 924: 
 925:     showTypingIndicator() {
 926:         const container = document.getElementById('chat-messages');
 927:         if (!container) return;
 928:         const typing = document.createElement('div');
 929:         typing.className = 'typing-indicator';
 930:         typing.id = 'typing-indicator';
 931:         typing.innerHTML = '<span>Гермес печатает</span><div class="dot"></div><div class="dot"></div><div class="dot"></div>';
 932:         container.appendChild(typing);
 933:         container.scrollTop = container.scrollHeight;
 934:     }
 935: 
 936:     hideTypingIndicator() {
 937:         const typing = document.getElementById('typing-indicator');
 938:         if (typing) typing.remove();
 939:     }
 940: 
 941:     async sendTextMessage() {
 942:         const input = document.getElementById('chat-input');
 943:         if (!input || !input.value.trim()) return;
 944: 
 945:         const text = input.value.trim();
 946:         this.addChatMessage('user', text);
 947:         input.value = '';
 948: 
 949:         telegram.haptic('light');
 950: 
 951:         // Call Hermes backend
 952:         try {
 953:             const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
 954:                 ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
 955:                 : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
 956: 
 957:             console.log('[Chat] Fetching:', baseUrl + 'chat');
 958: 
 959:             // Show typing indicator
 960:             this.showTypingIndicator();
 961: 
 962:             // Try streaming first
 963:             const streamUrl = baseUrl + 'chat/stream';
 964:             const response = await fetch(streamUrl, {
 965:                 method: 'POST',
 966:                 mode: 'cors',
 967:                 credentials: 'omit',
 968:                 headers: { 'Content-Type': 'application/json' },
 969:                 body: JSON.stringify({
 970:                     message: text,
 971:                     user_id: telegram.getUserId(),
 972:                     session_id: `tg_${telegram.getUserId()}`,
 973:                     persona: 'hermes'
 974:                 })
 975:             });
 976: 
 977:             console.log('[Chat] Response status:', response.status, response.statusText);
 978: 
 979:             // Hide typing indicator
 980:             this.hideTypingIndicator();
 981: 
 982:             const contentType = response.headers.get('content-type') || '';
 983: 
 984:             if (contentType.includes('text/event-stream')) {
 985:                 // Streaming response — typewriter effect
 986:                 const reader = response.body.getReader();
 987:                 const decoder = new TextDecoder();
 988:                 let fullText = '';
 989: 
 990:                 // Create empty hermes message bubble for streaming
 991:                 const msgIdx = this.chatMessages.length;
 992:                 this.chatMessages.push({ sender: 'hermes', text: '', timestamp: Date.now() });
 993:                 this.renderChatMessages();
 994: 
 995:                 while (true) {
 996:                     const { done, value } = await reader.read();
 997:                     if (done) break;
 998: 
 999:                     const chunk = decoder.decode(value, { stream: true });
1000:                     const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
1001: 
1002:                     for (const line of lines) {
1003:                         try {
1004:                             const parsed = JSON.parse(line.replace('data: ', ''));
1005:                             if (parsed.done) break;
1006:                             if (parsed.char !== undefined) {
1007:                                 fullText += parsed.char;
1008:                                 this.chatMessages[msgIdx].text = fullText;
1009:                                 this.renderChatMessages();
1010:                             }
1011:                         } catch { /* skip malformed SSE lines */ }
1012:                     }
1013:                 }
1014: 
1015:                 this.saveCache();
1016:             } else {
1017:                 // Fallback: regular JSON response
1018:                 const data = await response.json();
1019: 
1020:                 if (data.blocked) {
1021:                     this.addChatMessage('system', `⚠️ ${data.reason}`);
1022:                 } else if (data.response) {
1023:                     this.addChatMessage('hermes', data.response);
1024:                 } else if (data.error) {
1025:                     this.addChatMessage('system', `❌ Ошибка: ${data.error_message || data.error}`);
1026:                 }
1027:             }
1028:         } catch (error) {
1029:             console.error('[Chat] Fetch failed:', error.message);
1030:             this.hideTypingIndicator();
1031:             this.addChatMessage('system', '❌ Ошибка соединения с сервером');
1032:         }
1033:     }
1034: 
1035:     showAttachMenu() {
1036:         const menu = document.getElementById('attach-menu');
1037:         if (!menu) return;
1038: 
1039:         menu.style.display = menu.style.display === 'none' ? 'grid' : 'none';
1040:         telegram.haptic('light');
1041:     }
1042: 
1043:     hideAttachMenu() {
1044:         const menu = document.getElementById('attach-menu');
1045:         if (menu) menu.style.display = 'none';
1046:     }
1047: 
1048:     attachPhoto() {
1049:         this.hideAttachMenu();
1050:         const input = document.createElement('input');
1051:         input.type = 'file';
1052:         input.accept = 'image/*';
1053:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'photo');
1054:         input.click();
1055:     }
1056: 
1057:     attachVideo() {
1058:         this.hideAttachMenu();
1059:         const input = document.createElement('input');
1060:         input.type = 'file';
1061:         input.accept = 'video/*';
1062:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'video');
1063:         input.click();
1064:     }
1065: 
1066:     async recordVideo() {
1067:         this.hideAttachMenu();
1068:         try {
1069:             const stream = await navigator.mediaDevices.getUserMedia({
1070:                 video: { facingMode: this.currentFacingMode },
1071:                 audio: true
1072:             });
1073:             this.currentStream = stream;
1074:             this.showVideoRecorder(stream);
1075:         } catch (error) {
1076:             telegram.showAlert('Нет доступа к камере');
1077:         }
1078:     }
1079: 
1080:     showVideoRecorder(stream) {
1081:         const recorder = document.createElement('div');
1082:         recorder.className = 'video-recording';
1083:         recorder.innerHTML = `
1084:             <div class="video-preview">
1085:                 <video id="video-preview" autoplay playsinline muted></video>
1086:                 <div class="video-controls">
1087:                     <button class="camera-switch-btn" onclick="app.switchCamera()">🔄</button>
1088:                     <button class="video-record-btn" id="record-btn" onclick="app.toggleVideoRecording()"></button>
1089:                     <button class="camera-switch-btn" onclick="app.closeVideoRecorder()">✖️</button>
1090:                 </div>
1091:             </div>
1092:         `;
1093:         document.body.appendChild(recorder);
1094: 
1095:         const video = document.getElementById('video-preview');
1096:         video.srcObject = stream;
1097:     }
1098: 
1099:     async switchCamera() {
1100:         this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
1101:         if (this.currentStream) {
1102:             this.currentStream.getTracks().forEach(track => track.stop());
1103:         }
1104:         await this.recordVideo();
1105:     }
1106: 
1107:     toggleVideoRecording() {
1108:         const btn = document.getElementById('record-btn');
1109:         if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
1110:             this.startVideoRecording();
1111:             btn.classList.add('recording');
1112:         } else {
1113:             this.stopVideoRecording();
1114:             btn.classList.remove('recording');
1115:         }
1116:     }
1117: 
1118:     startVideoRecording() {
1119:         if (!this.currentStream) return;
1120: 
1121:         this.mediaRecorder = new MediaRecorder(this.currentStream);
1122:         this.audioChunks = [];
1123: 
1124:         this.mediaRecorder.ondataavailable = (e) => {
1125:             this.audioChunks.push(e.data);
1126:         };
1127: 
1128:         this.mediaRecorder.onstop = () => {
1129:             const videoBlob = new Blob(this.audioChunks, { type: 'video/webm' });
1130:             this.handleVideoUpload(videoBlob);
1131:         };
1132: 
1133:         this.mediaRecorder.start();
1134:     }
1135: 
1136:     stopVideoRecording() {
1137:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
1138:             this.mediaRecorder.stop();
1139:         }
1140:     }
1141: 
1142:     closeVideoRecorder() {
1143:         if (this.currentStream) {
1144:             this.currentStream.getTracks().forEach(track => track.stop());
1145:             this.currentStream = null;
1146:         }
1147:         const recorder = document.querySelector('.video-recording');
1148:         if (recorder) recorder.remove();
1149:     }
1150: 
1151:     async shareScreen() {
1152:         this.hideAttachMenu();
1153:         try {
1154:             const stream = await navigator.mediaDevices.getDisplayMedia({
1155:                 video: true
1156:             });
1157:             
1158:             const mediaRecorder = new MediaRecorder(stream);
1159:             const chunks = [];
1160: 
1161:             mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
1162:             mediaRecorder.onstop = () => {
1163:                 const blob = new Blob(chunks, { type: 'video/webm' });
1164:                 this.handleVideoUpload(blob);
1165:                 stream.getTracks().forEach(track => track.stop());
1166:             };
1167: 
1168:             mediaRecorder.start();
1169:             setTimeout(() => mediaRecorder.stop(), 30000); // 30 sec max
1170:         } catch (error) {
1171:             telegram.showAlert('Нет доступа к экрану');
1172:         }
1173:     }
1174: 
1175:     async handleFileUpload(file, type) {
1176:         if (!file) return;
1177: 
1178:         this.addChatMessage('user', `[📎 ${type === 'photo' ? 'Фото' : 'Видео'}]`);
1179: 
1180:         const reader = new FileReader();
1181:         reader.onload = async (e) => {
1182:             try {
1183:                 // Upload to backend and get URL
1184:                 const imageUrl = e.target.result; // Base64 data URL
1185: 
1186:                 // Call Hermes image analysis
1187:                 const response = await fetch('/analyze-image', {
1188:                     method: 'POST',
1189:                     headers: { 'Content-Type': 'application/json' },
1190:                     body: JSON.stringify({
1191:                         image_url: imageUrl,
1192:                         prompt: type === 'photo' ? 'Проанализируй это изображение' : 'Опиши это видео',
1193:                         user_id: telegram.getUserId(),
1194:                         session_id: `tg_${telegram.getUserId()}`
1195:                     })
1196:                 });
1197: 
1198:                 const data = await response.json();
1199: 
1200:                 if (data.response) {
1201:                     this.addChatMessage('hermes', data.response);
1202:                 } else if (data.error) {
1203:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
1204:                 }
1205:             } catch (error) {
1206:                 console.error('[App] Upload error:', error);
1207:                 this.addChatMessage('system', '❌ Ошибка загрузки файла');
1208:             }
1209:         };
1210:         reader.readAsDataURL(file);
1211:     }
1212: 
1213:     async handleVideoUpload(blob) {
1214:         this.addChatMessage('user', '[🎥 Видеозапись]');
1215:         this.closeVideoRecorder();
1216: 
1217:         const reader = new FileReader();
1218:         reader.onload = async (e) => {
1219:             try {
1220:                 const videoUrl = e.target.result;
1221: 
1222:                 // Call Hermes video analysis
1223:                 const response = await fetch('/analyze-image', {
1224:                     method: 'POST',
1225:                     headers: { 'Content-Type': 'application/json' },
1226:                     body: JSON.stringify({
1227:                         image_url: videoUrl,
1228:                         prompt: 'Проанализируй это видео',
1229:                         user_id: telegram.getUserId(),
1230:                         session_id: `tg_${telegram.getUserId()}`
1231:                     })
1232:                 });
1233: 
1234:                 const data = await response.json();
1235: 
1236:                 if (data.response) {
1237:                     this.addChatMessage('hermes', data.response);
1238:                 } else if (data.error) {
1239:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
1240:                 }
1241:             } catch (error) {
1242:                 console.error('[App] Video upload error:', error);
1243:                 this.addChatMessage('system', '❌ Ошибка загрузки видео');
1244:             }
1245:         };
1246:         reader.readAsDataURL(blob);
1247:     }
1248: 
1249:     formatTime(timestamp) {
1250:         const date = new Date(timestamp);
1251:         return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
1252:     }
1253: 
1254:     async submitFeedback(msgIdx, feedback) {
1255:         const msg = this.chatMessages[msgIdx];
1256:         if (!msg || msg.feedback) return;
1257: 
1258:         msg.feedback = feedback;
1259:         this.renderChatMessages();
1260: 
1261:         try {
1262:             const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1263:                 ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1264:                 : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1265: 
1266:             await fetch(baseUrl + 'feedback', {
1267:                 method: 'POST',
1268:                 mode: 'cors',
1269:                 credentials: 'omit',
1270:                 headers: { 'Content-Type': 'application/json' },
1271:                 body: JSON.stringify({
1272:                     message_id: msgIdx,
1273:                     feedback,
1274:                     user_id: telegram.getUserId(),
1275:                     session_id: `tg_${telegram.getUserId()}`,
1276:                     text: msg.text.substring(0, 200)
1277:                 })
1278:             });
1279: 
1280:             telegram.haptic('light');
1281:         } catch (error) {
1282:             console.error('[Feedback] Error:', error.message);
1283:         }
1284:     }
1285: 
1286:     updateTaskSpec(title, content) {
1287:         const specContainer = document.getElementById('task-spec');
1288:         const specContent = document.getElementById('task-spec-content');
1289:         if (!specContainer || !specContent) return;
1290: 
1291:         specContainer.classList.add('has-content');
1292:         specContent.innerHTML = `
1293:             <div class="task-spec-title">${this.escapeHtml(title)}</div>
1294:             <div>${this.escapeHtml(content)}</div>
1295:         `;
1296:     }
1297: 
1298:     clearTaskSpec() {
1299:         const specContainer = document.getElementById('task-spec');
1300:         const specContent = document.getElementById('task-spec-content');
1301:         if (!specContainer || !specContent) return;
1302: 
1303:         specContainer.classList.remove('has-content');
1304:         specContent.textContent = 'Ожидание ТЗ от Гермеса...';
1305:     }
1306: 
1307:     // ─── Голосовой ввод ТЗ ───────────────────────────────────────────────
1308:     initVoiceInput() {
1309:         const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
1310:         if (!SpeechRecognition) {
1311:             console.warn('[App] SpeechRecognition не поддерживается в этом браузере');
1312:             return;
1313:         }
1314:         this.recognition = new SpeechRecognition();
1315:         this.recognition.lang = 'ru-RU';
1316:         this.recognition.interimResults = true;
1317:         this.recognition.continuous = true;
1318: 
1319:         this.recognition.onresult = (event) => {
1320:             let interim = '';
1321:             let final = '';
1322:             for (let i = event.resultIndex; i < event.results.length; i++) {
1323:                 const transcript = event.results[i][0].transcript;
1324:                 if (event.results[i].isFinal) final += transcript + ' ';
1325:                 else interim += transcript;
1326:             }
1327:             const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1328:             if (input) {
1329:                 input.value = (this._voiceBaseText || '') + final + interim;
1330:             }
1331:         };
1332: 
1333:         this.recognition.onerror = (e) => console.warn('[App] Voice error:', e.error);
1334:         this.recognition.onend = () => {
1335:             this.isRecording = false;
1336:             const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
1337:             if (micBtn) micBtn.classList.remove('recording');
1338:         };
1339:     }
1340: 
1341:     toggleVoiceRecording() {
1342:         if (!this.recognition) return telegram.showAlert('Голосовой ввод не поддерживается');
1343:         const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
1344:         if (this.isRecording) {
1345:             this.recognition.stop();
1346:             this.isRecording = false;
1347:             if (micBtn) micBtn.classList.remove('recording');
1348:         } else {
1349:             const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1350:             this._voiceBaseText = input ? input.value + ' ' : '';
1351:             this.recognition.start();
1352:             this.isRecording = true;
1353:             if (micBtn) micBtn.classList.add('recording');
1354:             telegram.haptic('light');
1355:         }
1356:     }
1357: 
1358:     // ─── Панель смарт-контракта (вопросы Гермеса) ────────────────────────
1359:     renderContractQuestions(questions = []) {
1360:         const container = document.getElementById('contract-qa-container');
1361:         if (!container) return;
1362:         container.innerHTML = '';
1363:         if (!questions.length) {
1364:             container.innerHTML = '<div class="qa-empty">Нет активных вопросов от Гермеса</div>';
1365:             return;
1366:         }
1367:         questions.forEach((q, idx) => {
1368:             const wrap = document.createElement('div');
1369:             wrap.className = 'qa-item';
1370:             wrap.innerHTML = `
1371:                 <div class="qa-question">${idx + 1}. ${this.escapeHtml(q.text)}</div>
1372:                 <input type="text" class="qa-answer-input" placeholder="Ваш ответ..." data-qid="${q.id || idx}" />
1373:             `;
1374:             container.appendChild(wrap);
1375:         });
1376:         container.querySelectorAll('.qa-answer-input').forEach(inp => {
1377:             inp.addEventListener('change', () => this.saveContractAnswers());
1378:         });
1379:     }
1380: 
1381:     saveContractAnswers() {
1382:         const inputs = document.querySelectorAll('.qa-answer-input');
1383:         const answers = {};
1384:         inputs.forEach(inp => answers[inp.dataset.qid] = inp.value.trim());
1385:         this.contractAnswers = answers;
1386:         this.saveCache();
1387:     }
1388: 
1389:     // ─── История ТЗ ──────────────────────────────────────────────────────
1390:     async saveTaskSpecHistory(specText) {
1391:         if (!specText?.trim()) return;
1392:         const history = this.taskSpecHistory || [];
1393:         history.unshift({ text: specText, timestamp: Date.now() });
1394:         if (history.length > 20) history.pop();
1395:         this.taskSpecHistory = history;
1396:         try {
1397:             if (window.Telegram?.WebApp?.CloudStorage) {
1398:                 await new Promise((res, rej) => Telegram.WebApp.CloudStorage.setItem('task_spec_history', JSON.stringify(history), (err, ok) => err ? rej(err) : res(ok)));
1399:             } else {
1400:                 localStorage.setItem('task_spec_history', JSON.stringify(history));
1401:             }
1402:         } catch (e) { console.warn('[App] History save failed:', e); }
1403:     }
1404: 
1405:     async loadTaskSpecHistory() {
1406:         try {
1407:             let raw = null;
1408:             if (window.Telegram?.WebApp?.CloudStorage) {
1409:                 raw = await new Promise((res, rej) => Telegram.WebApp.CloudStorage.getItem('task_spec_history', (err, val) => err ? rej(err) : res(val)));
1410:             } else {
1411:                 raw = localStorage.getItem('task_spec_history');
1412:             }
1413:             this.taskSpecHistory = raw ? JSON.parse(raw) : [];
1414:         } catch (e) {
1415:             this.taskSpecHistory = [];
1416:         }
1417:         this.renderTaskSpecHistory();
1418:     }
1419: 
1420:     renderTaskSpecHistory() {
1421:         const list = document.getElementById('task-history-list');
1422:         if (!list) return;
1423:         list.innerHTML = '';
1424:         if (!this.taskSpecHistory?.length) {
1425:             list.innerHTML = '<div class="history-empty">История пуста</div>';
1426:             return;
1427:         }
1428:         this.taskSpecHistory.forEach((item, idx) => {
1429:             const el = document.createElement('div');
1430:             el.className = 'history-item';
1431:             const time = new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
1432:             el.innerHTML = `<span class="history-time">${time}</span><span class="history-text">${this.escapeHtml(item.text.slice(0, 60))}...</span>`;
1433:             el.onclick = () => {
1434:                 const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1435:                 if (input) input.value = item.text;
1436:                 telegram.haptic('light');
1437:             };
1438:             list.appendChild(el);
1439:         });
1440:     }
1441: 
1442:     // ─── Экспорт ТЗ ──────────────────────────────────────────────────────
1443:     exportTaskSpec() {
1444:         const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1445:         const spec = input?.value?.trim() || '';
1446:         const answers = this.contractAnswers || {};
1447:         if (!spec && !Object.keys(answers).length) return telegram.showAlert('Нет данных для экспорта');
1448: 
1449:         const payload = {
1450:             task_spec: spec,
1451:             contract_answers: answers,
1452:             exported_at: new Date().toISOString(),
1453:             user_id: telegram.getUserId?.() || 'unknown'
1454:         };
1455:         const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
1456:         const url = URL.createObjectURL(blob);
1457:         const a = document.createElement('a');
1458:         a.href = url;
1459:         a.download = `task_spec_${Date.now()}.json`;
1460:         document.body.appendChild(a);
1461:         a.click();
1462:         a.remove();
1463:         URL.revokeObjectURL(url);
1464:         telegram.haptic('success');
1465:     }
1466: }
1467: 
1468: let app;
1469: document.addEventListener('DOMContentLoaded', () => {
1470:     app = new NeuroEscrowApp();
1471: });
1472: 
1473: window.addEventListener('message', (event) => {
1474:     if (event.data && event.data.type === 'bot_data' && app) {
1475:         app.handleBotData(event.data.payload);
1476:     }
1477: });
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
