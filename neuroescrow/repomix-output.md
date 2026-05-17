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
 35:       hermes: `Ты — Гермес, AI-ассистент платформы NeuroEscrow. Ты помогаешь клиентам и нейрокодерам с безопасными сделками через эскроу-смарт-контракты на блокчейне TON.
 36: 
 37: Твои основные функции:
 38: - Создание и проверка смарт-контрактов для эскроу
 39: - Анализ документов, товаров по фото/видео
 40: - Ведение переговоров между сторонами сделки
 41: - Модерация контента и блокировка мошенников
 42: - Подбор нейрокодеров по квалификации и рейтингу
 43: - Отслеживание исполнения контрактов
 44: 
 45: Жизненный цикл сделки:
 46: 1. Составление — сбор ТЗ от клиента
 47: 2. Согласование — утверждение и публикация на доске
 48: 3. Подбор — сортировка нейрокодеров по рейтингу
 49: 4. Сделка — согласование деталей с исполнителем  
 50: 5. Эскроу — клиент заводит токены, отслеживание исполнения
 51: 
 52: Отвечай дружелюбно и профессионально. Если у тебя есть контекст из RAG — используй его. Если нет — отвечай на основе своих знаний как AI-ассистент NeuroEscrow.`,
 53:       
 54:       client: `Ты — Гермес, помощник в NeuroEscrow. Фокус: помощь клиенту в создании безопасных сделок. Жизненный цикл: составление → согласование → подбор → сделка → эскроу.`,
 55:       
 56:       creator: `Ты — Гермес, помощник в NeuroEscrow. Фокус: помощь нейрокодеру-исполнителю. Помогай с поиском заданий, оценкой ТЗ и ведением сделок.`
 57:     };
 58:     
 59:     return prompts[persona] || prompts.hermes;
 60:   }
 61:   
 62:   getSessionHistory(sessionId, limit = 10) {
 63:     if (!this.sessions.has(sessionId)) {
 64:       this.sessions.set(sessionId, []);
 65:     }
 66:     const history = this.sessions.get(sessionId);
 67:     return history.slice(-limit);
 68:   }
 69:   
 70:   addToSession(sessionId, role, content) {
 71:     if (!this.sessions.has(sessionId)) {
 72:       this.sessions.set(sessionId, []);
 73:     }
 74:     this.sessions.get(sessionId).push({
 75:       role,
 76:       content,
 77:       timestamp: new Date().toISOString()
 78:     });
 79:   }
 80:   
 81:   async buildContext(query, userId, sessionId) {
 82:     // Skip RAG for short messages (greetings, etc.)
 83:     if (!query || query.trim().length < RAG_CONFIG.minQueryLength) return '';
 84: 
 85:     const contextParts = [];
 86: 
 87:     // Search codebase with similarity threshold
 88:     const codebaseResults = await this.rag.searchCodebase(query, RAG_CONFIG.maxCodebaseResults);
 89:     const filteredCodebase = codebaseResults.filter(r => (r.$similarity || 0) >= RAG_CONFIG.similarityThreshold);
 90:     if (filteredCodebase.length > 0) {
 91:       contextParts.push('📚 Релевантный код из базы:');
 92:       filteredCodebase.forEach((result, i) => {
 93:         const filepath = result.filepath || 'unknown';
 94:         const text = (result.text || '').substring(0, 500);
 95:         const similarity = result.$similarity || 0;
 96:         contextParts.push(`\n${i + 1}. ${filepath} (similarity: ${similarity.toFixed(2)})\n\`\`\`\n${text}\n\`\`\``);
 97:       });
 98:     }
 99: 
100:     // Search memory with similarity threshold
101:     const memoryResults = await this.rag.searchMemory(query, userId, RAG_CONFIG.maxMemoryResults);
102:     const filteredMemory = memoryResults.filter(r => (r.$similarity || 0) >= RAG_CONFIG.similarityThreshold);
103:     if (filteredMemory.length > 0) {
104:       contextParts.push('\n\n🧠 Из долгосрочной памяти:');
105:       filteredMemory.forEach((result, i) => {
106:         const content = result.content || '';
107:         const timestamp = result.timestamp || '';
108:         contextParts.push(`\n${i + 1}. [${timestamp}] ${content}`);
109:       });
110:     }
111: 
112:     // Log hit/miss
113:     const hasContext = contextParts.length > 0;
114:     if (hasContext) {
115:       this.ragHits++;
116:       if (RAG_CONFIG.logHits) {
117:         console.log(`[RAG] HIT session=${sessionId} query="${query.substring(0, 30)}..." codebase=${filteredCodebase.length} memory=${filteredMemory.length}`);
118:       }
119:     } else {
120:       this.ragMisses++;
121:       if (RAG_CONFIG.logMisses) {
122:         console.log(`[RAG] MISS session=${sessionId} query="${query.substring(0, 30)}..."`);
123:       }
124:     }
125:     
126:     return contextParts.join('');
127:   }
128:   
129:   async chat(message, userId, sessionId, persona = 'hermes', imageUrl = null, useRag = true) {
130:     // Moderate content
131:     const moderation = moderateContent(message);
132:     if (!moderation.safe) {
133:       return {
134:         response: `⚠️ Сообщение заблокировано: ${moderation.reason}`,
135:         blocked: true,
136:         reason: moderation.reason
137:       };
138:     }
139:     
140:     // Build context
141:     let context = '';
142:     if (useRag) {
143:       context = await this.buildContext(message, userId, sessionId);
144:     }
145:     
146:     // RAG is enhancement, not requirement — always proceed to LLM
147:     
148:     // Get history
149:     const history = this.getSessionHistory(sessionId);
150:     
151:     // Build messages
152:     const messages = [
153:       { role: 'system', content: this.getSystemPrompt(persona) }
154:     ];
155:     
156:     if (context) {
157:       messages.push({
158:         role: 'system',
159:         content: `Контекст для ответа:\n${context}`
160:       });
161:     }
162:     
163:     // Add history
164:     history.forEach(msg => {
165:       messages.push({
166:         role: msg.role,
167:         content: msg.content
168:       });
169:     });
170:     
171:     // Add current message
172:     if (imageUrl) {
173:       messages.push({
174:         role: 'user',
175:         content: [
176:           { type: 'text', text: message },
177:           { type: 'image_url', image_url: { url: imageUrl } }
178:         ]
179:       });
180:     } else {
181:       messages.push({
182:         role: 'user',
183:         content: message
184:       });
185:     }
186:     
187:     // Call Mistral API
188:     try {
189:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
190:         method: 'POST',
191:         headers: {
192:           'Authorization': `Bearer ${this.apiKey}`,
193:           'Content-Type': 'application/json'
194:         },
195:         body: JSON.stringify({
196:           model: this.model,
197:           messages,
198:           temperature: 0.7,
199:           max_tokens: 2000
200:         })
201:       });
202:       
203:       if (!response.ok) {
204:         throw new Error(`Mistral API error: ${response.status}`);
205:       }
206:       
207:       const data = await response.json();
208:       let assistantMessage = data.choices[0].message.content;
209:       
210:       // Sanitize response: remove [Tria] and similar prefixes
211:       assistantMessage = assistantMessage.replace(/^\[(Tria|Hermes|AI|Bot)\]\s*/i, '').trim();
212:       
213:       // Add to session
214:       this.addToSession(sessionId, 'user', message);
215:       this.addToSession(sessionId, 'assistant', assistantMessage);
216:       
217:       // Save to memory (substantial messages only)
218:       if (message.length > 50) {
219:         await this.rag.addMemory(
220:           userId,
221:           sessionId,
222:           `User: ${message}\nHermes: ${assistantMessage}`,
223:           'conversation'
224:         );
225:       }
226:       
227:       return {
228:         response: assistantMessage,
229:         blocked: false,
230:         context_used: !!context,
231:         tokens_used: data.usage?.total_tokens || 0
232:       };
233:       
234:     } catch (error) {
235:       return {
236:         response: `❌ Ошибка: ${error.message}`,
237:         error: true,
238:         error_message: error.message
239:       };
240:     }
241:   }
242:   
243:   async analyzeImage(imageUrl, prompt, userId, sessionId) {
244:     return this.chat(prompt, userId, sessionId, 'hermes', imageUrl, false);
245:   }
246:   
247:   async getSessionSummary(sessionId) {
248:     const history = this.getSessionHistory(sessionId, 100);
249:     
250:     if (history.length === 0) {
251:       return 'Нет истории сессии';
252:     }
253:     
254:     const conversation = history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
255:     
256:     const messages = [
257:       {
258:         role: 'system',
259:         content: 'Создай краткое резюме этого разговора (2-3 предложения).'
260:       },
261:       {
262:         role: 'user',
263:         content: conversation
264:       }
265:     ];
266:     
267:     try {
268:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
269:         method: 'POST',
270:         headers: {
271:           'Authorization': `Bearer ${this.apiKey}`,
272:           'Content-Type': 'application/json'
273:         },
274:         body: JSON.stringify({
275:           model: this.model,
276:           messages,
277:           temperature: 0.5,
278:           max_tokens: 200
279:         })
280:       });
281:       
282:       const data = await response.json();
283:       return data.choices[0].message.content;
284:       
285:     } catch (error) {
286:       return `Ошибка создания резюме: ${error.message}`;
287:     }
288:   }
289:   
290:   clearSession(sessionId) {
291:     this.sessions.delete(sessionId);
292:   }
293: 
294:   async recordFeedback(userId, sessionId, messageId, feedback, text) {
295:     const logEntry = {
296:       user_id: userId,
297:       session_id: sessionId,
298:       message_id: messageId,
299:       feedback,
300:       text_preview: text.substring(0, 100),
301:       timestamp: new Date().toISOString()
302:     };
303: 
304:     console.log(`[FEEDBACK] ${feedback === 'up' ? '👍' : '👎'} user=${userId} session=${sessionId} msg=${messageId}`);
305: 
306:     // Store in KV for analytics
307:     if (this.kvCache) {
308:       try {
309:         const key = `feedback:${sessionId}:${messageId}`;
310:         await this.kvCache.put(key, JSON.stringify(logEntry), { expirationTtl: 86400 * 30 });
311:       } catch (e) {
312:         console.warn('[FEEDBACK] KV storage error:', e.message);
313:       }
314:     }
315: 
316:     return { ok: true, feedback };
317:   }
318: 
319:   getRagStats() {
320:     return {
321:       hits: this.ragHits,
322:       misses: this.ragMisses,
323:       hitRate: this.ragHits + this.ragMisses > 0
324:         ? (this.ragHits / (this.ragHits + this.ragMisses) * 100).toFixed(1) + '%'
325:         : 'N/A'
326:     };
327:   }
328: 
329:   async computeDOV({ semanticLabel, attentionRaw, computeFlops, userId }) {
330:     const astraEndpoint = this.env?.ASTRA_DB_ENDPOINT;
331:     const astraToken = this.env?.ASTRA_DB_TOKEN;
332:     if (!astraEndpoint || !astraToken) throw new Error('AstraDB credentials missing');
333: 
334:     // 1. Embedding смысла жеста (Gemini)
335:     const embedResp = await fetch(
336:       `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${this.env?.GOOGLE_API_KEY}`,
337:       {
338:         method: 'POST',
339:         headers: { 'Content-Type': 'application/json' },
340:         body: JSON.stringify({
341:           model: 'models/gemini-embedding-2-preview',
342:           content: { parts: [{ text: semanticLabel }] },
343:           outputDimensionality: 3072
344:         })
345:       }
346:     );
347:     const embedData = await embedResp.json();
348:     const embedding = embedData.embedding?.values;
349:     if (!embedding) throw new Error('Embedding failed for semanticLabel');
350: 
351:     // 2. SemanticNovelty: поиск похожих смыслов в AstraDB
352:     const searchResp = await fetch(
353:       `${astraEndpoint}/api/json/v1/default_keyspace/gestures_semantic_3072`,
354:       {
355:         method: 'POST',
356:         headers: {
357:           'Content-Type': 'application/json',
358:           'Token': astraToken
359:         },
360:         body: JSON.stringify({
361:           find: {
362:             sort: { $vector: embedding },
363:             options: { limit: 20, includeSimilarity: true }
364:           }
365:         })
366:       }
367:     );
368:     const searchData = await searchResp.json();
369:     const docs = searchData.data?.documents || [];
370:     const N = docs.length || 1;
371:     const k = docs.filter(d => d.$similarity > 0.85).length;
372:     const semanticNovelty = Math.max(0, 1 - k / N);
373: 
374:     // 3. Нормализация метрик
375:     const attention = Math.min(1, Math.max(0, attentionRaw ?? 0.5));
376:     const compute = Math.min(1, (computeFlops ?? 0) / 1e9);
377: 
378:     // 4. Коэффициенты (пока дефолт, далее — DAO)
379:     const alpha = 0.35, beta = 0.30, gamma = 0.35;
380:     const dov = alpha * attention + beta * compute + gamma * semanticNovelty;
381: 
382:     // 5. Сохранение эмбеддинга смысла
383:     const docId = `${userId}_${Date.now()}`;
384:     await fetch(
385:       `${astraEndpoint}/api/json/v1/default_keyspace/gestures_semantic_3072`,
386:       {
387:         method: 'POST',
388:         headers: { 'Content-Type': 'application/json', 'Token': astraToken },
389:         body: JSON.stringify({
390:           insertOne: {
391:             document: {
392:               _id: docId,
393:               $vector: embedding,
394:               semanticLabel,
395:               userId,
396:               timestamp: new Date().toISOString()
397:             }
398:           }
399:         })
400:       }
401:     );
402: 
403:     // 6. Логирование DOV
404:     await fetch(
405:       `${astraEndpoint}/api/json/v1/default_keyspace/gestures_dov_log`,
406:       {
407:         method: 'POST',
408:         headers: { 'Content-Type': 'application/json', 'Token': astraToken },
409:         body: JSON.stringify({
410:           insertOne: {
411:             document: {
412:               _id: `dov_${docId}`,
413:               userId,
414:               semanticLabel,
415:               attention,
416:               compute,
417:               semanticNovelty,
418:               dov,
419:               alpha, beta, gamma,
420:               timestamp: new Date().toISOString()
421:             }
422:           }
423:         })
424:       }
425:     );
426: 
427:     return { dov, attention, compute, semanticNovelty, embedding: docId };
428:   }
429: }
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
 208:     padding-bottom: 16px;
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
 464:     display: none;
 465: }
 466: 
 467: /* ─── New bottom nav inside left pane ─── */
 468: .bottom-nav-left {
 469:     display: flex;
 470:     align-items: center;
 471:     gap: 4px;
 472:     padding: 6px 8px;
 473:     background: rgba(0, 0, 0, 0.6);
 474:     border-top: 1px solid rgba(255, 255, 255, 0.06);
 475:     flex-shrink: 0;
 476: }
 477: 
 478: .nav-btn-left {
 479:     flex: 1;
 480:     display: flex;
 481:     flex-direction: column;
 482:     align-items: center;
 483:     justify-content: center;
 484:     gap: 2px;
 485:     padding: 8px 4px;
 486:     border: none;
 487:     background: rgba(255, 255, 255, 0.03);
 488:     border-radius: 10px;
 489:     color: var(--ne-light-gray);
 490:     font-size: 10px;
 491:     cursor: pointer;
 492:     transition: var(--glass-transition);
 493:     position: relative;
 494: }
 495: 
 496: .nav-btn-left.active {
 497:     color: var(--ne-white);
 498:     background: rgba(139, 92, 246, 0.15);
 499: }
 500: 
 501: .nav-btn-left:active {
 502:     transform: scale(0.95);
 503: }
 504: 
 505: .nav-btn-left .nav-icon {
 506:     font-size: 18px;
 507:     line-height: 1;
 508: }
 509: 
 510: .nav-btn-left .nav-label {
 511:     font-weight: 500;
 512:     font-size: 9px;
 513: }
 514: 
 515: /* ─── Hide Telegram "Neuro" branding in top-right corner ─── */
 516: .telegram-branding,
 517: .tg-branding,
 518: [data-tg-branding] {
 519:     display: none !important;
 520: }
 521: 
 522: /* Hide Telegram watermark via overlay */
 523: body::after {
 524:     content: '';
 525:     position: fixed;
 526:     top: 0;
 527:     right: 0;
 528:     width: 80px;
 529:     height: 30px;
 530:     background: var(--ne-black);
 531:     z-index: 10000;
 532:     pointer-events: none;
 533: }
 534: 
 535: .nav-btn {
 536:     flex: 1;
 537:     display: flex;
 538:     flex-direction: column;
 539:     align-items: center;
 540:     justify-content: center;
 541:     gap: 2px;
 542:     padding: var(--ne-spacing-xs) 0;
 543:     border: none;
 544:     background: none;
 545:     color: var(--ne-light-gray);
 546:     font-size: 10px;
 547:     cursor: pointer;
 548:     transition: var(--glass-transition);
 549:     position: relative;
 550: }
 551: 
 552: /* Divider between tabs (inset groove) */
 553: .nav-btn:not(:last-child)::after {
 554:     content: '';
 555:     position: absolute;
 556:     right: 0;
 557:     top: 20%;
 558:     bottom: 20%;
 559:     width: 1px;
 560:     background: linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent);
 561: }
 562: 
 563: .nav-btn.active {
 564:     color: var(--ne-white);
 565: }
 566: 
 567: .nav-btn.active::before {
 568:     content: '';
 569:     position: absolute;
 570:     top: 0;
 571:     left: 20%;
 572:     right: 20%;
 573:     height: 2px;
 574:     background: linear-gradient(90deg, var(--ne-purple), var(--ne-red));
 575:     border-radius: 1px;
 576: }
 577: 
 578: .nav-btn:active {
 579:     box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
 580: }
 581: 
 582: .nav-icon {
 583:     font-size: 22px;
 584:     line-height: 1;
 585: }
 586: 
 587: .nav-label {
 588:     font-weight: 500;
 589: }
 590: 
 591: /* ===== BUTTONS (Glass) ===== */
 592: .btn {
 593:     display: inline-flex;
 594:     align-items: center;
 595:     justify-content: center;
 596:     gap: 6px;
 597:     padding: 10px 20px;
 598:     border-radius: var(--glass-radius);
 599:     border: var(--glass-border-light);
 600:     font-size: 14px;
 601:     font-weight: 500;
 602:     cursor: pointer;
 603:     transition: var(--glass-transition);
 604:     width: 100%;
 605:     background: var(--glass-bg-light);
 606:     backdrop-filter: blur(12px) saturate(150%);
 607:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 608:     color: var(--ne-white);
 609: }
 610: 
 611: .btn:active {
 612:     transform: scale(0.98);
 613:     box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3);
 614: }
 615: 
 616: .btn-primary {
 617:     background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(239, 68, 68, 0.2));
 618:     border-color: rgba(139, 92, 246, 0.3);
 619:     color: var(--ne-white);
 620: }
 621: 
 622: .btn-secondary {
 623:     background: var(--glass-bg);
 624:     color: var(--ne-white);
 625:     border-color: var(--glass-border);
 626: }
 627: 
 628: /* ===== FORMS ===== */
 629: .form-group {
 630:     margin-bottom: var(--ne-spacing-lg);
 631: }
 632: 
 633: .form-label {
 634:     display: block;
 635:     font-size: 13px;
 636:     font-weight: 500;
 637:     color: var(--ne-light-gray);
 638:     margin-bottom: var(--ne-spacing-sm);
 639:     text-transform: uppercase;
 640:     letter-spacing: 0.5px;
 641: }
 642: 
 643: .form-input {
 644:     width: 100%;
 645:     padding: 12px 14px;
 646:     border-radius: var(--glass-radius);
 647:     border: var(--glass-border-light);
 648:     background: rgba(255, 255, 255, 0.04);
 649:     backdrop-filter: blur(8px);
 650:     -webkit-backdrop-filter: blur(8px);
 651:     color: var(--ne-white);
 652:     font-size: 14px;
 653:     outline: none;
 654:     transition: var(--glass-transition);
 655: }
 656: 
 657: .form-input:focus {
 658:     border-color: var(--ne-purple);
 659:     background: rgba(255, 255, 255, 0.06);
 660: }
 661: 
 662: /* ===== CARDS ===== */
 663: .card {
 664:     background: var(--glass-bg);
 665:     backdrop-filter: blur(12px) saturate(150%);
 666:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 667:     border: var(--glass-border);
 668:     border-radius: var(--glass-radius);
 669:     padding: var(--ne-spacing-lg);
 670:     margin-bottom: var(--ne-spacing-md);
 671: }
 672: 
 673: .draft-card {
 674:     background: rgba(255, 255, 255, 0.02);
 675:     border-left-width: 3px;
 676: }
 677: 
 678: .card-title {
 679:     font-size: 15px;
 680:     font-weight: 600;
 681:     margin-bottom: var(--ne-spacing-sm);
 682:     color: var(--ne-white);
 683: }
 684: 
 685: .card-subtitle {
 686:     font-size: 13px;
 687:     color: var(--ne-light-gray);
 688:     margin-bottom: var(--ne-spacing-md);
 689: }
 690: 
 691: /* ===== SCROLLBAR ===== */
 692: ::-webkit-scrollbar {
 693:     width: 4px;
 694: }
 695: 
 696: ::-webkit-scrollbar-track {
 697:     background: transparent;
 698: }
 699: 
 700: ::-webkit-scrollbar-thumb {
 701:     background: rgba(255, 255, 255, 0.12);
 702:     border-radius: 2px;
 703: }
 704: 
 705: ::-webkit-scrollbar-thumb:hover {
 706:     background: rgba(255, 255, 255, 0.2);
 707: }
 708: 
 709: /* ===== ANIMATIONS ===== */
 710: @keyframes fadeIn {
 711:     from { opacity: 0; transform: translateY(8px); }
 712:     to { opacity: 1; transform: translateY(0); }
 713: }
 714: 
 715: .view {
 716:     animation: fadeIn 0.25s ease-out;
 717:     flex: 1;
 718:     display: flex;
 719:     flex-direction: column;
 720:     min-height: 0;
 721:     overflow: hidden;
 722: }
 723: 
 724: .view.has-top-panel {
 725:     flex: 1;
 726:     display: flex;
 727:     flex-direction: column;
 728:     min-height: 0;
 729:     overflow: hidden;
 730: }
 731: 
 732: /* ===== EMPTY STATE ===== */
 733: .empty-state {
 734:     text-align: center;
 735:     padding: 48px 24px;
 736:     color: var(--ne-light-gray);
 737: }
 738: 
 739: .empty-icon {
 740:     font-size: 48px;
 741:     margin-bottom: var(--ne-spacing-md);
 742:     opacity: 0.5;
 743: }
 744: 
 745: .empty-text {
 746:     font-size: 14px;
 747: }
 748: 
 749: /* ===== ATTACH MENU ===== */
 750: .attach-menu {
 751:     position: fixed;
 752:     bottom: 100px;
 753:     left: var(--ne-spacing-lg);
 754:     right: var(--ne-spacing-lg);
 755:     background: rgba(0, 0, 0, 0.8);
 756:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 757:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 758:     border: var(--glass-border-light);
 759:     border-radius: var(--glass-radius);
 760:     padding: var(--ne-spacing-sm);
 761:     display: grid;
 762:     grid-template-columns: repeat(2, 1fr);
 763:     gap: var(--ne-spacing-sm);
 764:     z-index: 102;
 765:     animation: fadeIn 0.2s ease-out;
 766: }
 767: 
 768: .attach-option {
 769:     display: flex;
 770:     flex-direction: column;
 771:     align-items: center;
 772:     gap: 6px;
 773:     padding: var(--ne-spacing-lg);
 774:     border-radius: var(--glass-radius-sm);
 775:     border: var(--glass-border);
 776:     background: var(--glass-bg);
 777:     color: var(--ne-white);
 778:     font-size: 12px;
 779:     cursor: pointer;
 780:     transition: var(--glass-transition);
 781: }
 782: 
 783: .attach-option:active {
 784:     transform: scale(0.95);
 785:     box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3);
 786: }
 787: 
 788: .attach-icon {
 789:     font-size: 28px;
 790: }
 791: 
 792: /* ===== VIDEO RECORDING ===== */
 793: .video-recording {
 794:     position: fixed;
 795:     top: 0;
 796:     left: 0;
 797:     right: 0;
 798:     bottom: 0;
 799:     background: var(--ne-black);
 800:     z-index: 200;
 801:     display: flex;
 802:     flex-direction: column;
 803: }
 804: 
 805: .video-preview {
 806:     flex: 1;
 807:     position: relative;
 808:     background: var(--ne-black);
 809: }
 810: 
 811: .video-preview video {
 812:     width: 100%;
 813:     height: 100%;
 814:     object-fit: cover;
 815: }
 816: 
 817: .video-controls {
 818:     position: absolute;
 819:     bottom: 0;
 820:     left: 0;
 821:     right: 0;
 822:     padding: var(--ne-spacing-xl);
 823:     display: flex;
 824:     justify-content: center;
 825:     align-items: center;
 826:     gap: var(--ne-spacing-lg);
 827:     background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
 828: }
 829: 
 830: .video-record-btn {
 831:     width: 64px;
 832:     height: 64px;
 833:     border-radius: 50%;
 834:     border: 4px solid var(--ne-white);
 835:     background: transparent;
 836:     cursor: pointer;
 837:     transition: all 0.2s;
 838: }
 839: 
 840: .video-record-btn.recording {
 841:     background: var(--ne-red);
 842:     border-radius: 12px;
 843: }
 844: 
 845: .camera-switch-btn {
 846:     width: 48px;
 847:     height: 48px;
 848:     border-radius: 50%;
 849:     border: var(--glass-border);
 850:     background: rgba(0,0,0,0.5);
 851:     backdrop-filter: blur(8px);
 852:     -webkit-backdrop-filter: blur(8px);
 853:     color: var(--ne-white);
 854:     font-size: 24px;
 855:     cursor: pointer;
 856:     display: flex;
 857:     align-items: center;
 858:     justify-content: center;
 859: }
 860: 
 861: /* ===== RESPONSIVE ===== */
 862: @media (min-width: 768px) {
 863:     .app-main {
 864:         max-width: none !important;
 865:         margin: 0;
 866:     }
 867:     
 868:     .chat-input-container {
 869:         max-width: none;
 870:         left: 0;
 871:         transform: none;
 872:     }
 873:     
 874:     .attach-menu {
 875:         max-width: none;
 876:         left: var(--ne-spacing-lg);
 877:         transform: none;
 878:     }
 879: }
 880: 
 881: @media (min-width: 768px) {
 882:     html, body, #app, .app-main, .container, .tg-web-app {
 883:         max-width: none !important;
 884:         width: 100vw !important;
 885:         height: var(--tg-viewport-stable-height, 100dvh) !important;
 886:         margin: 0 !important;
 887:         padding: 0 !important;
 888:         overflow-x: hidden !important;
 889:     }
 890: }
 891: 
 892: /* ===== REDUCED TRANSPARENCY (Accessibility) ===== */
 893: @media (prefers-reduced-transparency: reduce) {
 894:     .message-bubble,
 895:     .chat-input-container,
 896:     .bottom-nav,
 897:     .btn,
 898:     .form-input {
 899:         backdrop-filter: none;
 900:         -webkit-backdrop-filter: none;
 901:     }
 902:     
 903:     .chat-message.user .message-bubble {
 904:         background: rgba(255, 255, 255, 0.95);
 905:     }
 906:     
 907:     .chat-message.hermes .message-bubble {
 908:         background: rgba(0, 0, 0, 0.95);
 909:     }
 910: }
 911: 
 912: /* ===== NEW UI STRUCTURE v0.20.511 ===== */
 913: /* Top control panel: mic (left) + task spec (right) */
 914: 
 915: .top-control-panel {
 916:     display: flex;
 917:     justify-content: space-between;
 918:     align-items: center;
 919:     gap: var(--ne-spacing-md);
 920:     padding: var(--ne-spacing-sm) var(--ne-spacing-lg);
 921:     background: var(--glass-bg);
 922:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 923:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 924:     border-bottom: var(--glass-border);
 925:     min-height: 56px;
 926: }
 927: 
 928: .left-mic-panel {
 929:     display: flex;
 930:     align-items: center;
 931:     gap: var(--ne-spacing-sm);
 932: }
 933: 
 934: .mic-button {
 935:     width: 44px;
 936:     height: 44px;
 937:     border-radius: 50%;
 938:     background: var(--glass-bg-light);
 939:     border: var(--glass-border);
 940:     display: flex;
 941:     align-items: center;
 942:     justify-content: center;
 943:     cursor: pointer;
 944:     transition: var(--glass-transition);
 945:     font-size: 20px;
 946: }
 947: 
 948: .mic-button:hover {
 949:     background: rgba(255, 255, 255, 0.12);
 950:     border-color: rgba(255, 255, 255, 0.2);
 951: }
 952: 
 953: .mic-button.recording {
 954:     background: rgba(239, 68, 68, 0.2);
 955:     border-color: rgba(239, 68, 68, 0.4);
 956:     animation: pulse-recording 1.5s ease-in-out infinite;
 957: }
 958: 
 959: @keyframes pulse-recording {
 960:     0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
 961:     50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
 962: }
 963: 
 964: .right-contract-panel {
 965:     flex: 1;
 966:     max-width: 60%;
 967:     min-height: 40px;
 968: }
 969: 
 970: /* Phase indicator (step bar) */
 971: .contract-phases {
 972:     display: flex;
 973:     align-items: center;
 974:     justify-content: space-between;
 975:     padding: 12px 8px;
 976:     border-bottom: 1px solid rgba(255, 255, 255, 0.06);
 977:     flex-shrink: 0;
 978: }
 979: 
 980: .phase-step {
 981:     display: flex;
 982:     flex-direction: column;
 983:     align-items: center;
 984:     gap: 4px;
 985:     opacity: 0.3;
 986:     transition: opacity 0.3s, transform 0.3s;
 987:     position: relative;
 988: }
 989: 
 990: .phase-step.active {
 991:     opacity: 1;
 992: }
 993: 
 994: .phase-step.completed {
 995:     opacity: 0.6;
 996: }
 997: 
 998: .phase-step.completed .phase-icon::after {
 999:     content: '✓';
1000:     position: absolute;
1001:     top: -2px;
1002:     right: -6px;
1003:     font-size: 10px;
1004:     color: #00ff88;
1005:     background: rgba(0, 0, 0, 0.8);
1006:     border-radius: 50%;
1007:     width: 14px;
1008:     height: 14px;
1009:     display: flex;
1010:     align-items: center;
1011:     justify-content: center;
1012: }
1013: 
1014: .phase-icon {
1015:     font-size: 18px;
1016:     position: relative;
1017: }
1018: 
1019: .phase-label {
1020:     font-size: 9px;
1021:     color: var(--ne-light-gray);
1022:     text-align: center;
1023:     white-space: nowrap;
1024: }
1025: 
1026: .phase-step.active .phase-label {
1027:     color: var(--ne-white);
1028:     font-weight: 600;
1029: }
1030: 
1031: /* Connector lines between phases */
1032: .phase-step:not(:last-child)::after {
1033:     content: '';
1034:     position: absolute;
1035:     top: 14px;
1036:     right: -50%;
1037:     width: 100%;
1038:     height: 1px;
1039:     background: rgba(255, 255, 255, 0.1);
1040:     z-index: -1;
1041: }
1042: 
1043: .phase-step.completed:not(:last-child)::after {
1044:     background: rgba(0, 255, 136, 0.3);
1045: }
1046: 
1047: /* Contract fields */
1048: .contract-fields {
1049:     padding: 12px;
1050:     overflow-y: auto;
1051:     flex: 1;
1052: }
1053: 
1054: .contract-field {
1055:     margin-bottom: 12px;
1056:     padding-bottom: 12px;
1057:     border-bottom: 1px solid rgba(255, 255, 255, 0.04);
1058: }
1059: 
1060: .contract-field:last-child {
1061:     border-bottom: none;
1062:     margin-bottom: 0;
1063:     padding-bottom: 0;
1064: }
1065: 
1066: .field-label {
1067:     font-size: 10px;
1068:     font-weight: 600;
1069:     color: var(--ne-purple);
1070:     text-transform: uppercase;
1071:     letter-spacing: 0.5px;
1072:     margin-bottom: 4px;
1073:     display: block;
1074: }
1075: 
1076: .field-value {
1077:     font-size: 13px;
1078:     color: var(--ne-white);
1079:     line-height: 1.5;
1080:     min-height: 20px;
1081: }
1082: 
1083: .field-value.empty {
1084:     color: rgba(255, 255, 255, 0.2);
1085:     font-style: italic;
1086: }
1087: 
1088: /* Status badges */
1089: .status-badge {
1090:     display: inline-block;
1091:     padding: 3px 10px;
1092:     border-radius: 12px;
1093:     font-size: 11px;
1094:     font-weight: 600;
1095: }
1096: 
1097: .status-badge.draft {
1098:     background: rgba(255, 255, 255, 0.08);
1099:     color: var(--ne-light-gray);
1100: }
1101: 
1102: .status-badge.review {
1103:     background: rgba(139, 92, 246, 0.2);
1104:     color: #a78bfa;
1105: }
1106: 
1107: .status-badge.sorting {
1108:     background: rgba(59, 130, 246, 0.2);
1109:     color: #60a5fa;
1110: }
1111: 
1112: .status-badge.agreement {
1113:     background: rgba(245, 158, 11, 0.2);
1114:     color: #fbbf24;
1115: }
1116: 
1117: .status-badge.escrow {
1118:     background: rgba(0, 255, 136, 0.2);
1119:     color: #00ff88;
1120: }
1121: 
1122: .status-badge.completed {
1123:     background: rgba(0, 255, 136, 0.3);
1124:     color: #00ff88;
1125: }
1126: 
1127: .status-badge.disputed {
1128:     background: rgba(239, 68, 68, 0.2);
1129:     color: #ef4444;
1130: }
1131: 
1132: /* Progress bar for escrow phase */
1133: .escrow-progress {
1134:     margin-top: 16px;
1135:     padding: 12px;
1136:     background: rgba(0, 0, 0, 0.3);
1137:     border-radius: 8px;
1138:     border: 1px solid rgba(255, 255, 255, 0.06);
1139: }
1140: 
1141: .escrow-progress-label {
1142:     font-size: 11px;
1143:     color: var(--ne-light-gray);
1144:     margin-bottom: 8px;
1145: }
1146: 
1147: .escrow-progress-bar {
1148:     height: 6px;
1149:     background: rgba(255, 255, 255, 0.06);
1150:     border-radius: 3px;
1151:     overflow: hidden;
1152: }
1153: 
1154: .escrow-progress-fill {
1155:     height: 100%;
1156:     background: linear-gradient(90deg, var(--ne-purple), #00ff88);
1157:     border-radius: 3px;
1158:     transition: width 0.5s ease;
1159: }
1160: 
1161: .escrow-progress-percent {
1162:     font-size: 12px;
1163:     color: var(--ne-white);
1164:     margin-top: 6px;
1165:     text-align: right;
1166:     font-weight: 600;
1167: }
1168: 
1169: /* Vertical connectors */
1170: .vertical-connector {
1171:     position: absolute;
1172:     top: 0;
1173:     bottom: 0;
1174:     width: 1px;
1175:     background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent);
1176:     pointer-events: none;
1177:     z-index: 0;
1178: }
1179: 
1180: .vertical-connector.left {
1181:     left: calc(var(--ne-spacing-lg) + 22px);
1182: }
1183: 
1184: .vertical-connector.right {
1185:     right: calc(var(--ne-spacing-lg) + 22px);
1186: }
1187: 
1188: /* Chat area with top panel spacing */
1189: .view.has-top-panel .chat-messages {
1190:     padding-top: var(--ne-spacing-sm);
1191: }
1192: 
1193: /* Task spec questions */
1194: .task-question {
1195:     margin-top: var(--ne-spacing-sm);
1196:     padding-top: var(--ne-spacing-sm);
1197:     border-top: 1px solid rgba(255, 255, 255, 0.06);
1198: }
1199: 
1200: .task-question p {
1201:     font-size: 12px;
1202:     color: var(--ne-silver);
1203:     margin-bottom: 4px;
1204: }
1205: 
1206: .task-question input {
1207:     width: 100%;
1208:     background: rgba(0, 0, 0, 0.3);
1209:     border: 1px solid rgba(255, 255, 255, 0.1);
1210:     border-radius: 6px;
1211:     padding: 6px 10px;
1212:     color: var(--ne-white);
1213:     font-size: 12px;
1214:     outline: none;
1215:     transition: var(--glass-transition);
1216: }
1217: 
1218: .task-question input:focus {
1219:     border-color: rgba(139, 92, 246, 0.5);
1220: }
1221: 
1222: /* ─── Панель вопросов смарт-контракта ─────────────────────────────── */
1223: .contract-qa-panel {
1224:     margin: var(--ne-spacing-md) var(--ne-spacing-lg);
1225:     padding: var(--ne-spacing-md);
1226:     background: var(--glass-bg);
1227:     border: var(--glass-border);
1228:     border-radius: var(--glass-radius-sm);
1229:     backdrop-filter: blur(8px);
1230:     -webkit-backdrop-filter: blur(8px);
1231: }
1232: 
1233: .qa-item {
1234:     margin-bottom: 10px;
1235:     padding-bottom: 10px;
1236:     border-bottom: 1px solid rgba(255,255,255,0.06);
1237: }
1238: 
1239: .qa-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
1240: 
1241: .qa-question {
1242:     font-size: 0.85rem;
1243:     color: #a0b4ff;
1244:     margin-bottom: 6px;
1245:     line-height: 1.4;
1246: }
1247: 
1248: .qa-answer-input {
1249:     width: 100%;
1250:     padding: 8px 10px;
1251:     background: rgba(0,0,0,0.3);
1252:     border: 1px solid rgba(255,255,255,0.1);
1253:     border-radius: 8px;
1254:     color: #fff;
1255:     font-size: 0.85rem;
1256:     outline: none;
1257:     transition: border-color 0.2s;
1258: }
1259: 
1260: .qa-answer-input:focus { border-color: #00ff88; }
1261: 
1262: .qa-empty { color: #666; font-size: 0.8rem; text-align: center; padding: 8px 0; }
1263: 
1264: /* ─── Голосовой ввод (пульсация) ──────────────────────────────────── */
1265: .mic-button.recording,
1266: #micButton.recording {
1267:     animation: pulse-recording 1.2s infinite ease-in-out;
1268:     border-color: #ff4d4d !important;
1269:     box-shadow: 0 0 12px rgba(255,77,77,0.4);
1270: }
1271: 
1272: @keyframes pulse-recording {
1273:     0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,77,77,0.5); }
1274:     70% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(255,77,77,0); }
1275:     100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,77,77,0); }
1276: }
1277: 
1278: /* ─── История ТЗ ──────────────────────────────────────────────────── */
1279: .task-history-panel {
1280:     position: fixed;
1281:     bottom: 80px;
1282:     left: 50%;
1283:     transform: translateX(-50%) translateY(20px);
1284:     width: 90%;
1285:     max-width: 400px;
1286:     max-height: 50vh;
1287:     background: rgba(18,18,24,0.95);
1288:     border: 1px solid rgba(255,255,255,0.1);
1289:     border-radius: 16px;
1290:     padding: 12px;
1291:     overflow-y: auto;
1292:     opacity: 0;
1293:     pointer-events: none;
1294:     transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
1295:     z-index: 900;
1296:     backdrop-filter: blur(12px);
1297:     -webkit-backdrop-filter: blur(12px);
1298: }
1299: 
1300: .task-history-panel.visible {
1301:     opacity: 1;
1302:     pointer-events: auto;
1303:     transform: translateX(-50%) translateY(0);
1304: }
1305: 
1306: .task-history-panel .history-item {
1307:     display: flex;
1308:     gap: 8px;
1309:     padding: 8px;
1310:     border-radius: 8px;
1311:     cursor: pointer;
1312:     transition: background 0.15s;
1313: }
1314: 
1315: .task-history-panel .history-item:hover { background: rgba(255,255,255,0.06); }
1316: 
1317: .task-history-panel .history-time { color: #666; font-size: 0.75rem; min-width: 42px; }
1318: 
1319: .task-history-panel .history-text { color: #ccc; font-size: 0.8rem; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
1320: 
1321: .task-history-panel .history-empty { color: #555; text-align: center; padding: 16px 0; font-size: 0.8rem; }
1322: 
1323: /* ─── Кнопка экспорта ─────────────────────────────────────────────── */
1324: .export-btn-sm {
1325:     flex: 1;
1326:     padding: 6px 8px;
1327:     background: rgba(255,255,255,0.06);
1328:     border: 1px solid rgba(255,255,255,0.1);
1329:     border-radius: 8px;
1330:     color: var(--ne-light-gray);
1331:     font-size: 0.75rem;
1332:     cursor: pointer;
1333:     transition: var(--glass-transition);
1334: }
1335: 
1336: .export-btn-sm:hover {
1337:     background: rgba(255,255,255,0.12);
1338:     border-color: rgba(255,255,255,0.2);
1339: }
1340: 
1341: .export-btn-sm:active { transform: scale(0.97); }
1342: 
1343: .export-btn {
1344:     margin-top: 10px;
1345:     width: 100%;
1346:     padding: 10px;
1347:     background: linear-gradient(135deg, #00ff88 0%, #00b8ff 100%);
1348:     border: none;
1349:     border-radius: 10px;
1350:     color: #000;
1351:     font-weight: 600;
1352:     font-size: 0.85rem;
1353:     cursor: pointer;
1354:     transition: opacity 0.2s, transform 0.1s;
1355: }
1356: 
1357: .export-btn:active { transform: scale(0.98); opacity: 0.9; }
1358: 
1359: /* ═══════════════════════════════════════════════════════════════════
1360:    SPLIT-PANE LAYOUT (Android Studio style)
1361:    Left: Hermes chat  |  Right: Smart contract / ТЗ (лист А4)
1362:    Горизонтальный split ВСЕГДА — мобильные тоже
1363:    ══════════════════════════════════════════════════════════════════ */
1364: 
1365: /* Split container wrapper — всегда горизонтальный */
1366: .split-layout {
1367:     display: flex;
1368:     flex-direction: row;
1369:     flex: 1;
1370:     gap: 0;
1371:     min-height: 0;
1372:     overflow: hidden;
1373: }
1374: 
1375: /* Individual pane */
1376: .split-pane {
1377:     display: flex;
1378:     flex-direction: column;
1379:     min-height: 0;
1380:     overflow: hidden;
1381: }
1382: 
1383: /* Left pane: chat (dark) */
1384: .split-pane.left-pane {
1385:     flex: 1;
1386:     min-width: 0;
1387:     background: transparent;
1388:     padding: 8px;
1389:     padding-right: 4px;
1390: }
1391: 
1392: /* Right pane: contract (A4 paper style) */
1393: .split-pane.right-pane {
1394:     flex: 0 0 38%;
1395:     min-width: 200px;
1396:     background: transparent;
1397:     padding: 8px;
1398:     padding-left: 4px;
1399: }
1400: 
1401: /* Glass pane borders — Android Studio style */
1402: .split-pane .pane-glass {
1403:     flex: 1;
1404:     display: flex;
1405:     flex-direction: column;
1406:     background: rgba(20, 20, 28, 0.85);
1407:     backdrop-filter: blur(20px) saturate(150%);
1408:     -webkit-backdrop-filter: blur(20px) saturate(150%);
1409:     border: 1px solid rgba(255, 255, 255, 0.08);
1410:     border-radius: 12px;
1411:     overflow: hidden;
1412:     box-shadow:
1413:         0 0 0 1px rgba(255, 255, 255, 0.03),
1414:         0 4px 24px rgba(0, 0, 0, 0.4),
1415:         inset 0 1px 0 rgba(255, 255, 255, 0.05);
1416:     min-height: 0;
1417: }
1418: 
1419: .split-pane.left-pane .pane-glass {
1420:     background: rgba(10, 10, 14, 0.9);
1421: }
1422: 
1423: .split-pane.right-pane .pane-glass {
1424:     background: rgba(22, 22, 30, 0.9);
1425: }
1426: 
1427: /* Pane header (IDE-style tab bar) */
1428: .pane-header {
1429:     display: flex;
1430:     align-items: center;
1431:     gap: 8px;
1432:     padding: 8px 12px;
1433:     background: rgba(0, 0, 0, 0.6);
1434:     border-bottom: 1px solid rgba(255, 255, 255, 0.08);
1435:     flex-shrink: 0;
1436:     min-height: 36px;
1437: }
1438: 
1439: .pane-header-icon {
1440:     font-size: 14px;
1441:     opacity: 0.7;
1442: }
1443: 
1444: .pane-header-title {
1445:     font-size: 12px;
1446:     font-weight: 600;
1447:     color: var(--ne-light-gray);
1448:     text-transform: uppercase;
1449:     letter-spacing: 0.5px;
1450: }
1451: 
1452: .pane-header-dot {
1453:     width: 8px;
1454:     height: 8px;
1455:     border-radius: 50%;
1456:     flex-shrink: 0;
1457: }
1458: 
1459: .pane-header-dot.purple { background: var(--ne-purple); }
1460: .pane-header-dot.red { background: var(--ne-red); }
1461: .pane-header-dot.green { background: #00ff88; }
1462: 
1463: /* Pane content area */
1464: .pane-content {
1465:     flex: 1;
1466:     overflow-y: auto;
1467:     overflow-x: hidden;
1468:     min-height: 0;
1469:     display: flex;
1470:     flex-direction: column;
1471: }
1472: 
1473: /* Left pane content: chat area */
1474: .split-pane.left-pane .pane-content {
1475:     position: relative;
1476: }
1477: 
1478: /* Resizable divider between panes */
1479: .split-divider {
1480:     flex-shrink: 0;
1481:     width: 4px;
1482:     background: transparent;
1483:     position: relative;
1484:     cursor: col-resize;
1485:     transition: background 0.2s;
1486:     z-index: 10;
1487:     align-self: stretch;
1488:     display: flex;
1489:     align-items: center;
1490:     justify-content: center;
1491: }
1492: 
1493: .split-divider::after {
1494:     content: '';
1495:     width: 2px;
1496:     height: 100%;
1497:     border-radius: 1px;
1498:     background: rgba(255, 255, 255, 0.06);
1499:     transition: background 0.2s;
1500: }
1501: 
1502: .split-divider:hover::after,
1503: .split-divider.dragging::after {
1504:     background: rgba(139, 92, 246, 0.4);
1505: }
1506: 
1507: /* ─── Right pane: A4 paper style ─── */
1508: .right-contract-panel {
1509:     flex: 1;
1510:     padding: var(--ne-spacing-md);
1511:     min-height: 0;
1512: }
1513: 
1514: .task-spec-container {
1515:     background: rgba(255, 255, 255, 0.03);
1516:     border: 1px solid rgba(255, 255, 255, 0.08);
1517:     border-radius: var(--glass-radius-sm);
1518:     padding: var(--ne-spacing-md);
1519:     font-size: 13px;
1520:     color: var(--ne-light-gray);
1521:     height: 100%;
1522:     overflow-y: auto;
1523:     transition: var(--glass-transition);
1524:     /* A4 paper feel */
1525:     box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
1526: }
1527: 
1528: .task-spec-container.has-content {
1529:     border-color: rgba(139, 92, 246, 0.3);
1530:     background: rgba(139, 92, 246, 0.04);
1531: }
1532: 
1533: .task-spec-title {
1534:     font-size: 11px;
1535:     font-weight: 600;
1536:     color: var(--ne-purple);
1537:     text-transform: uppercase;
1538:     letter-spacing: 0.5px;
1539:     margin-bottom: 8px;
1540:     padding-bottom: 6px;
1541:     border-bottom: 1px solid rgba(255, 255, 255, 0.06);
1542: }
1543: 
1544: .task-spec-content {
1545:     line-height: 1.6;
1546:     font-size: 13px;
1547: }
1548: 
1549: /* Contract Q&A panel inside right pane */
1550: .contract-qa-panel {
1551:     margin: var(--ne-spacing-md);
1552:     padding: var(--ne-spacing-md);
1553:     background: rgba(255, 255, 255, 0.02);
1554:     border: 1px solid rgba(255, 255, 255, 0.06);
1555:     border-radius: var(--glass-radius-sm);
1556:     backdrop-filter: blur(8px);
1557:     -webkit-backdrop-filter: blur(8px);
1558: }
1559: 
1560: /* ─── Top control panel inside left pane ─── */
1561: .split-pane.left-pane .top-control-panel {
1562:     background: rgba(0, 0, 0, 0.4);
1563:     border-bottom: 1px solid rgba(255, 255, 255, 0.06);
1564: }
1565: 
1566: /* ─── Chat input inside left pane ─── */
1567: .split-pane.left-pane .chat-input-container {
1568:     position: sticky;
1569:     bottom: 0;
1570:     left: auto;
1571:     right: auto;
1572:     border-top: 1px solid rgba(255, 255, 255, 0.06);
1573:     z-index: 10;
1574:     padding: 8px 12px;
1575:     background: rgba(0, 0, 0, 0.6);
1576:     backdrop-filter: blur(12px);
1577:     -webkit-backdrop-filter: blur(12px);
1578:     flex-shrink: 0;
1579: }
1580: 
1581: /* Hide fixed chat input when split layout is active */
1582: .chat-input-container:not(.split-chat-input) {
1583:     display: none !important;
1584: }
1585: 
1586: /* Show split chat input only on hermes view (handled by JS) */
1587: .split-chat-input {
1588:     display: flex;
1589: }
1590: 
1591: /* ─── Mobile adjustments ─── */
1592: @media (max-width: 599px) {
1593:     .split-pane.right-pane {
1594:         flex: 0 0 35%;
1595:         min-width: 140px;
1596:     }
1597: 
1598:     .pane-header-title {
1599:         font-size: 10px;
1600:     }
1601: 
1602:     .task-spec-container {
1603:         padding: var(--ne-spacing-sm);
1604:         font-size: 12px;
1605:     }
1606: 
1607:     .contract-qa-panel {
1608:         margin: var(--ne-spacing-sm);
1609:         padding: var(--ne-spacing-sm);
1610:     }
1611: }
1612: 
1613: /* ─── Desktop adjustments ─── */
1614: @media (min-width: 600px) {
1615:     .split-pane.right-pane {
1616:         flex: 0 0 38%;
1617:         min-width: 280px;
1618:     }
1619: 
1620:     .task-spec-container {
1621:         padding: var(--ne-spacing-md);
1622:         font-size: 13px;
1623:     }
1624: 
1625:     .contract-qa-panel {
1626:         margin: var(--ne-spacing-md);
1627:         padding: var(--ne-spacing-md);
1628:     }
1629: }
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
  10:         this.voiceState = 'IDLE';
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
  25:         // Smart contract state
  26:         this.smartContract = {
  27:             phase: 'draft', // draft, review, sorting, agreement, escrow, completed
  28:             fields: {
  29:                 title: null,
  30:                 description: null,
  31:                 budget: null,
  32:                 deadline: null,
  33:                 client: null,
  34:                 coder: null,
  35:                 status: 'draft'
  36:             },
  37:             progress: 0
  38:         };
  39:         
  40:         this.init();
  41:     }
  42: 
  43:     async init() {
  44:         if (window.Telegram?.WebApp) {
  45:             const tg = window.Telegram.WebApp;
  46:             tg.ready();
  47:             tg.expand();
  48: 
  49:             // Bot API 8.0+: requestFullscreen for desktop/immersive
  50:             if (typeof tg.requestFullscreen === 'function') {
  51:                 try {
  52:                     const fsResult = tg.requestFullscreen();
  53:                     if (fsResult && typeof fsResult.catch === 'function') {
  54:                         fsResult.catch(() => {
  55:                             // Already expanded via tg.expand() above
  56:                         });
  57:                     }
  58:                 } catch (e) {
  59:                     // requestFullscreen failed — already expanded
  60:                 }
  61:             }
  62: 
  63:             // Listen for fullscreen state changes
  64:             tg.onEvent('fullscreenChanged', () => {
  65:                 console.log('[TG] fullscreenChanged:', tg.isFullscreen);
  66:                 const fsBtn = document.getElementById('tg-fullscreen-btn');
  67:                 if (fsBtn) fsBtn.style.display = tg.isFullscreen ? 'none' : 'inline-block';
  68:             });
  69: 
  70:             // Handle fullscreen failure gracefully
  71:             tg.onEvent('fullscreenFailed', (reason) => {
  72:                 console.warn('[TG] fullscreenFailed:', reason);
  73:                 tg.expand(); // Fallback
  74:             });
  75: 
  76:             // Safe area insets — apply CSS padding to respect device notches
  77:             this.applySafeAreaInsets();
  78:             tg.onEvent('safeAreaChanged', () => this.applySafeAreaInsets());
  79:             tg.onEvent('contentSafeAreaChanged', () => this.applySafeAreaInsets());
  80:         }
  81:         this.userData = telegram.getUser();
  82:         this.updateHeader();
  83:         await this.loadCache();
  84:         this.loadContractState();
  85:         this.navigate('hermes');
  86: 
  87:         window.addEventListener('ton:statusChange', (e) => {
  88:             this.onTonStatusChange(e.detail);
  89:         });
  90: 
  91:         this.requestDataFromBot();
  92: 
  93:         // Fullscreen button handler (user gesture required on TG Desktop)
  94:         const fsBtn = document.getElementById('tg-fullscreen-btn');
  95:         if (fsBtn && window.Telegram?.WebApp) {
  96:             const tg = window.Telegram.WebApp;
  97:             if (typeof tg.requestFullscreen === 'function') {
  98:                 fsBtn.addEventListener('click', () => {
  99:                     const fsResult = tg.requestFullscreen();
 100:                     if (fsResult && typeof fsResult.catch === 'function') {
 101:                         fsResult.catch(e => {
 102:                             console.warn('[TG] Fullscreen blocked:', e);
 103:                             tg.expand(); // Fallback
 104:                         });
 105:                     } else {
 106:                         tg.expand(); // Fallback
 107:                     }
 108:                 });
 109:                 // Hide button if already in fullscreen
 110:                 if (tg.isFullscreen === true) {
 111:                     fsBtn.style.display = 'none';
 112:                 }
 113:             } else {
 114:                 fsBtn.style.display = 'none';
 115:             }
 116:         }
 117: 
 118:         // Priority 2-3: Voice input, Contract Q&A, Task Spec history
 119:         this.initVoiceInput();
 120:         this.loadTaskSpecHistory();
 121: 
 122:         const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
 123:         if (micBtn) micBtn.onclick = () => this.toggleVoiceRecording();
 124: 
 125:         const exportBtn = document.getElementById('exportTaskSpecBtn');
 126:         if (exportBtn) exportBtn.onclick = () => this.exportTaskSpec();
 127: 
 128:         const historyToggle = document.getElementById('toggleTaskHistoryBtn');
 129:         const historyPanel = document.getElementById('task-history-panel');
 130:         if (historyToggle && historyPanel) {
 131:             historyToggle.onclick = () => {
 132:                 historyPanel.classList.toggle('visible');
 133:                 telegram.haptic('light');
 134:             };
 135:         }
 136: 
 137:         this.renderContractQuestions([
 138:             { id: 'q1', text: 'Каков дедлайн исполнения смарт-контракта?' },
 139:             { id: 'q2', text: 'Укажите условия возврата средств при срыве сроков.' },
 140:             { id: 'q3', text: 'Требуется ли арбитраж третьей стороны?' }
 141:         ]);
 142:     }
 143: 
 144:     updateHeader() {
 145:         const nameEl = document.getElementById('user-name');
 146:         
 147:         if (this.userData) {
 148:             const name = this.userData.first_name || this.userData.username || 'Пользователь';
 149:             nameEl.textContent = name;
 150:         } else {
 151:             nameEl.textContent = 'Гость';
 152:         }
 153:     }
 154: 
 155:     applySafeAreaInsets() {
 156:         const tg = window.Telegram?.WebApp;
 157:         if (!tg) return;
 158: 
 159:         // Apply safe area insets as CSS custom properties
 160:         // Docs: https://docs.telegram-mini-apps.com/packages/tma-js-sdk/features/viewport
 161:         const root = document.documentElement;
 162:         if (tg.safeAreaInset) {
 163:             root.style.setProperty('--tg-safe-area-inset-top', `${tg.safeAreaInset.top}px`);
 164:             root.style.setProperty('--tg-safe-area-inset-bottom', `${tg.safeAreaInset.bottom}px`);
 165:             root.style.setProperty('--tg-safe-area-inset-left', `${tg.safeAreaInset.left}px`);
 166:             root.style.setProperty('--tg-safe-area-inset-right', `${tg.safeAreaInset.right}px`);
 167:         }
 168:         if (tg.contentSafeAreaInset) {
 169:             root.style.setProperty('--tg-content-safe-area-inset-top', `${tg.contentSafeAreaInset.top}px`);
 170:             root.style.setProperty('--tg-content-safe-area-inset-bottom', `${tg.contentSafeAreaInset.bottom}px`);
 171:         }
 172: 
 173:         // Use viewportStableHeight for layout (doesn't change during gestures)
 174:         if (tg.viewportStableHeight) {
 175:             root.style.setProperty('--tg-viewport-stable-height', `${tg.viewportStableHeight}px`);
 176:         }
 177:     }
 178: 
 179:     navigate(view) {
 180:         // Reset voice state when switching tabs
 181:         if (view !== 'hermes' && this.voiceState !== 'IDLE') {
 182:             this.resetVoiceState();
 183:         }
 184:         
 185:         this.currentView = view;
 186:         
 187:         document.querySelectorAll('.nav-btn').forEach(btn => {
 188:             btn.classList.toggle('active', btn.dataset.view === view);
 189:         });
 190:         
 191:         const main = document.getElementById('main-content');
 192:         main.innerHTML = '';
 193:         
 194:         // Show/hide chat input based on view (split-chat-input is inside left pane)
 195:         const chatInput = document.getElementById('chat-input-container');
 196:         if (chatInput) {
 197:             chatInput.style.display = view === 'hermes' ? 'flex' : 'none';
 198:         }
 199:         
 200:         // Also handle the split-layout chat input
 201:         const splitChatInput = document.querySelector('.split-chat-input');
 202:         if (splitChatInput) {
 203:             splitChatInput.style.display = view === 'hermes' ? 'flex' : 'none';
 204:         }
 205:         
 206:         // Hide fixed chat input container when not on hermes
 207:         const fixedChatInput = document.querySelector('.chat-input-container:not(.split-chat-input)');
 208:         if (fixedChatInput) {
 209:             fixedChatInput.style.display = view === 'hermes' ? 'flex' : 'none';
 210:         }
 211:         
 212:         switch(view) {
 213:             case 'hermes':
 214:                 this.renderHermesView(main);
 215:                 break;
 216:             case 'deals':
 217:                 this.renderDealsView(main);
 218:                 break;
 219:             case 'profile':
 220:                 this.renderProfileView(main);
 221:                 break;
 222:         }
 223:         
 224:         telegram.haptic('light');
 225:     }
 226: 
 227:     // -------------------------------------------------------------------------
 228:     // Hermes View (Voice Interface - Main Screen)
 229:     // -------------------------------------------------------------------------
 230: 
 231:     renderHermesView(container) {
 232:         const view = document.createElement('div');
 233:         view.className = 'view has-top-panel';
 234:         
 235:         view.innerHTML = `
 236:             <div class="split-layout">
 237:                 <!-- LEFT PANE: Hermes Chat -->
 238:                 <div class="split-pane left-pane">
 239:                     <div class="pane-glass">
 240:                         <div class="pane-header">
 241:                             <span class="pane-header-dot purple"></span>
 242:                             <span class="pane-header-icon">🎙️</span>
 243:                             <span class="pane-header-title">Гермес — Чат</span>
 244:                         </div>
 245:                         <div class="pane-content">
 246:                             <div class="chat-messages" id="chat-messages"></div>
 247:                             <!-- Chat input -->
 248:                             <div class="chat-input-container split-chat-input" id="chat-input-container">
 249:                                 <button class="attach-btn" id="attach-btn" onclick="app.showAttachMenu()">
 250:                                     <span>📎</span>
 251:                                 </button>
 252:                                 <input type="text" class="chat-input" id="chat-input" placeholder="Напишите сообщение..." />
 253:                                 <button class="send-btn" id="send-btn" onclick="app.sendTextMessage()">
 254:                                     <span>➤</span>
 255:                                 </button>
 256:                             </div>
 257:                         </div>
 258:                         <!-- Bottom nav: 4 buttons -->
 259:                         <div class="bottom-nav-left">
 260:                             <button class="nav-btn-left active" data-view="hermes" onclick="app.navigate('hermes')">
 261:                                 <span class="nav-icon">🎙️</span>
 262:                                 <span class="nav-label">Гермес</span>
 263:                             </button>
 264:                             <button class="nav-btn-left" data-view="deals" onclick="app.navigate('deals')">
 265:                                 <span class="nav-icon">🤝</span>
 266:                                 <span class="nav-label">Сделки</span>
 267:                             </button>
 268:                             <button class="nav-btn-left" data-view="profile" onclick="app.navigate('profile')">
 269:                                 <span class="nav-icon">👤</span>
 270:                                 <span class="nav-label">Профиль</span>
 271:                             </button>
 272:                             <button class="nav-btn-left" id="micButton" onclick="app.toggleVoiceRecording()">
 273:                                 <span class="nav-icon">🎤</span>
 274:                                 <span class="nav-label">Микрофон</span>
 275:                             </button>
 276:                         </div>
 277:                     </div>
 278:                 </div>
 279: 
 280:                 <!-- DIVIDER -->
 281:                 <div class="split-divider" id="split-divider"></div>
 282: 
 283:                 <!-- RIGHT PANE: Smart Contract -->
 284:                 <div class="split-pane right-pane">
 285:                     <div class="pane-glass">
 286:                         <div class="pane-header">
 287:                             <span class="pane-header-dot green"></span>
 288:                             <span class="pane-header-icon">📋</span>
 289:                             <span class="pane-header-title">Смарт-контракт</span>
 290:                         </div>
 291:                         <div class="pane-content" id="smart-contract-panel">
 292:                             <!-- Phase indicator -->
 293:                             <div id="contract-phases" class="contract-phases">
 294:                                 <div class="phase-step active" data-phase="draft">
 295:                                     <span class="phase-icon">📝</span>
 296:                                     <span class="phase-label">Составление</span>
 297:                                 </div>
 298:                                 <div class="phase-step" data-phase="review">
 299:                                     <span class="phase-icon">✅</span>
 300:                                     <span class="phase-label">Согласование</span>
 301:                                 </div>
 302:                                 <div class="phase-step" data-phase="sorting">
 303:                                     <span class="phase-icon">🔍</span>
 304:                                     <span class="phase-label">Подбор</span>
 305:                                 </div>
 306:                                 <div class="phase-step" data-phase="agreement">
 307:                                     <span class="phase-icon">🤝</span>
 308:                                     <span class="phase-label">Сделка</span>
 309:                                 </div>
 310:                                 <div class="phase-step" data-phase="escrow">
 311:                                     <span class="phase-icon">💰</span>
 312:                                     <span class="phase-label">Эскроу</span>
 313:                                 </div>
 314:                             </div>
 315:                             <!-- Contract fields (populated by Hermes) -->
 316:                             <div id="contract-fields" class="contract-fields">
 317:                                 <div class="contract-field" data-field="title">
 318:                                     <label class="field-label">Название задачи</label>
 319:                                     <div class="field-value" id="field-title">—</div>
 320:                                 </div>
 321:                                 <div class="contract-field" data-field="description">
 322:                                     <label class="field-label">Описание</label>
 323:                                     <div class="field-value" id="field-description">—</div>
 324:                                 </div>
 325:                                 <div class="contract-field" data-field="budget">
 326:                                     <label class="field-label">Бюджет (TON)</label>
 327:                                     <div class="field-value" id="field-budget">—</div>
 328:                                 </div>
 329:                                 <div class="contract-field" data-field="deadline">
 330:                                     <label class="field-label">Дедлайн</label>
 331:                                     <div class="field-value" id="field-deadline">—</div>
 332:                                 </div>
 333:                                 <div class="contract-field" data-field="client">
 334:                                     <label class="field-label">Клиент</label>
 335:                                     <div class="field-value" id="field-client">—</div>
 336:                                 </div>
 337:                                 <div class="contract-field" data-field="coder">
 338:                                     <label class="field-label">Нейрокодер</label>
 339:                                     <div class="field-value" id="field-coder">—</div>
 340:                                 </div>
 341:                                 <div class="contract-field" data-field="status">
 342:                                     <label class="field-label">Статус</label>
 343:                                     <div class="field-value" id="field-status">
 344:                                         <span class="status-badge draft">Черновик</span>
 345:                                     </div>
 346:                                 </div>
 347:                             </div>
 348:                         </div>
 349:                     </div>
 350:                 </div>
 351:             </div>
 352: 
 353:             <!-- Task history (overlay) -->
 354:             <div id="task-history-panel" class="task-history-panel">
 355:                 <div id="task-history-list"></div>
 356:             </div>
 357:         `;
 358:         
 359:         container.appendChild(view);
 360:         this.renderChatMessages();
 361:         this.initSplitDivider();
 362:         this.bindChatInputEvents();
 363:         this.renderContractPanel();
 364:     }
 365: 
 366:     // ─── Smart Contract Management ─────────────────────────────────────
 367:     
 368:     renderContractPanel() {
 369:         const panel = document.getElementById('smart-contract-panel');
 370:         if (!panel) return;
 371: 
 372:         // Update phase indicators
 373:         const phases = ['draft', 'review', 'sorting', 'agreement', 'escrow'];
 374:         const currentIdx = phases.indexOf(this.smartContract.phase);
 375:         
 376:         document.querySelectorAll('.phase-step').forEach(step => {
 377:             const phase = step.dataset.phase;
 378:             const idx = phases.indexOf(phase);
 379:             step.classList.remove('active', 'completed');
 380:             if (idx === currentIdx) step.classList.add('active');
 381:             else if (idx < currentIdx) step.classList.add('completed');
 382:         });
 383: 
 384:         // Update fields
 385:         const fields = this.smartContract.fields;
 386:         for (const [key, value] of Object.entries(fields)) {
 387:             const el = document.getElementById(`field-${key}`);
 388:             if (el) {
 389:                 if (key === 'status') {
 390:                     el.innerHTML = `<span class="status-badge ${value}">${this.getStatusLabel(value)}</span>`;
 391:                 } else {
 392:                     el.textContent = value || '—';
 393:                     el.classList.toggle('empty', !value);
 394:                 }
 395:             }
 396:         }
 397: 
 398:         // Update progress bar for escrow phase
 399:         let progressEl = document.querySelector('.escrow-progress');
 400:         if (this.smartContract.phase === 'escrow') {
 401:             if (!progressEl) {
 402:                 progressEl = document.createElement('div');
 403:                 progressEl.className = 'escrow-progress';
 404:                 progressEl.innerHTML = `
 405:                     <div class="escrow-progress-label">Прогресс исполнения</div>
 406:                     <div class="escrow-progress-bar">
 407:                         <div class="escrow-progress-fill" style="width: 0%"></div>
 408:                     </div>
 409:                     <div class="escrow-progress-percent">0%</div>
 410:                 `;
 411:                 panel.appendChild(progressEl);
 412:             }
 413:             const fill = progressEl.querySelector('.escrow-progress-fill');
 414:             const percent = progressEl.querySelector('.escrow-progress-percent');
 415:             if (fill) fill.style.width = `${this.smartContract.progress}%`;
 416:             if (percent) percent.textContent = `${this.smartContract.progress}%`;
 417:         } else if (progressEl) {
 418:             progressEl.remove();
 419:         }
 420:     }
 421: 
 422:     getStatusLabel(status) {
 423:         const labels = {
 424:             draft: 'Черновик',
 425:             review: 'На согласовании',
 426:             sorting: 'Подбор исполнителя',
 427:             agreement: 'Согласование',
 428:             escrow: 'В эскроу',
 429:             completed: 'Завершён',
 430:             disputed: 'Спор'
 431:         };
 432:         return labels[status] || status;
 433:     }
 434: 
 435:     updateContractField(field, value) {
 436:         if (this.smartContract.fields.hasOwnProperty(field)) {
 437:             this.smartContract.fields[field] = value;
 438:             this.renderContractPanel();
 439:             this.saveContractState();
 440:         }
 441:     }
 442: 
 443:     setContractPhase(phase) {
 444:         const validPhases = ['draft', 'review', 'sorting', 'agreement', 'escrow', 'completed'];
 445:         if (validPhases.includes(phase)) {
 446:             this.smartContract.phase = phase;
 447:             this.smartContract.fields.status = phase === 'completed' ? 'completed' : phase;
 448:             this.renderContractPanel();
 449:             this.saveContractState();
 450:         }
 451:     }
 452: 
 453:     updateContractProgress(percent) {
 454:         this.smartContract.progress = Math.max(0, Math.min(100, percent));
 455:         this.renderContractPanel();
 456:         this.saveContractState();
 457:     }
 458: 
 459:     saveContractState() {
 460:         try {
 461:             const data = JSON.stringify(this.smartContract);
 462:             if (window.Telegram?.WebApp?.CloudStorage) {
 463:                 Telegram.WebApp.CloudStorage.setItem('neuroescrow_contract', data, () => {});
 464:             } else {
 465:                 localStorage.setItem('neuroescrow_contract', data);
 466:             }
 467:         } catch (e) {
 468:             console.warn('[Contract] Save failed:', e);
 469:         }
 470:     }
 471: 
 472:     loadContractState() {
 473:         try {
 474:             let raw = null;
 475:             if (window.Telegram?.WebApp?.CloudStorage) {
 476:                 raw = new Promise((res, rej) => 
 477:                     Telegram.WebApp.CloudStorage.getItem('neuroescrow_contract', (err, val) => err ? rej(err) : res(val))
 478:                 );
 479:             } else {
 480:                 raw = localStorage.getItem('neuroescrow_contract');
 481:             }
 482:             if (raw) {
 483:                 const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
 484:                 if (data && data.fields) {
 485:                     this.smartContract = { ...this.smartContract, ...data };
 486:                 }
 487:             }
 488:         } catch (e) {
 489:             console.warn('[Contract] Load failed:', e);
 490:         }
 491:         this.renderContractPanel();
 492:     }
 493: 
 494:     bindChatInputEvents() {
 495:         // Enter key fix for chat input — prevent form submit / page reload
 496:         const chatInput = document.getElementById('chat-input');
 497:         if (chatInput) {
 498:             chatInput.addEventListener('keydown', (e) => {
 499:                 if (e.key === 'Enter' && !e.shiftKey) {
 500:                     e.preventDefault();
 501:                     this.sendTextMessage();
 502:                 }
 503:             });
 504:         }
 505: 
 506:         // Prevent any accidental form submit if input is wrapped in <form>
 507:         const chatContainer = document.getElementById('chat-input-container');
 508:         if (chatContainer) {
 509:             chatContainer.addEventListener('submit', (e) => e.preventDefault());
 510:         }
 511: 
 512:         // Ensure send button is type="button" not "submit"
 513:         const sendBtn = document.getElementById('send-btn');
 514:         if (sendBtn && !sendBtn.getAttribute('type')) {
 515:             sendBtn.setAttribute('type', 'button');
 516:         }
 517:     }
 518: 
 519:     initSplitDivider() {
 520:         const divider = document.getElementById('split-divider');
 521:         if (!divider) return;
 522: 
 523:         let isDragging = false;
 524:         let startX, startY, startWidth;
 525: 
 526:         const onMouseDown = (e) => {
 527:             isDragging = true;
 528:             divider.classList.add('dragging');
 529:             startX = e.clientX || e.touches?.[0]?.clientX || 0;
 530:             startY = e.clientY || e.touches?.[0]?.clientY || 0;
 531:             const leftPane = divider.previousElementSibling;
 532:             startWidth = leftPane?.getBoundingClientRect().width || 0;
 533:             document.addEventListener('mousemove', onMouseMove);
 534:             document.addEventListener('mouseup', onMouseUp);
 535:             document.addEventListener('touchmove', onTouchMove, { passive: false });
 536:             document.addEventListener('touchend', onTouchEnd);
 537:         };
 538: 
 539:         const onMouseMove = (e) => {
 540:             if (!isDragging) return;
 541:             const dx = (e.clientX || 0) - startX;
 542:             const container = divider.parentElement;
 543:             const totalWidth = container?.getBoundingClientRect().width || 1;
 544:             const newWidth = Math.max(200, Math.min(totalWidth - 200, startWidth + dx));
 545:             const leftPane = divider.previousElementSibling;
 546:             const rightPane = divider.nextElementSibling;
 547:             if (leftPane) leftPane.style.flex = `0 0 ${newWidth}px`;
 548:             if (rightPane) rightPane.style.flex = '1';
 549:         };
 550: 
 551:         const onMouseUp = () => {
 552:             isDragging = false;
 553:             divider.classList.remove('dragging');
 554:             document.removeEventListener('mousemove', onMouseMove);
 555:             document.removeEventListener('mouseup', onMouseUp);
 556:         };
 557: 
 558:         const onTouchMove = (e) => {
 559:             if (!isDragging) return;
 560:             e.preventDefault();
 561:             const dx = (e.touches?.[0]?.clientX || 0) - startX;
 562:             const container = divider.parentElement;
 563:             const totalWidth = container?.getBoundingClientRect().width || 1;
 564:             const newWidth = Math.max(200, Math.min(totalWidth - 200, startWidth + dx));
 565:             const leftPane = divider.previousElementSibling;
 566:             if (leftPane) leftPane.style.flex = `0 0 ${newWidth}px`;
 567:         };
 568: 
 569:         const onTouchEnd = () => {
 570:             isDragging = false;
 571:             divider.classList.remove('dragging');
 572:             document.removeEventListener('touchmove', onTouchMove);
 573:             document.removeEventListener('touchend', onTouchEnd);
 574:         };
 575: 
 576:         divider.addEventListener('mousedown', onMouseDown);
 577:         divider.addEventListener('touchstart', (e) => {
 578:             startX = e.touches?.[0]?.clientX || 0;
 579:             startY = e.touches?.[0]?.clientY || 0;
 580:             onMouseDown(e);
 581:         }, { passive: true });
 582:     }
 583: 
 584:     toggleVoice() {
 585:         // Explicit protection against multiple taps during processing
 586:         if (this.voiceState === 'PROCESSING' || this.isProcessing) {
 587:             return;
 588:         }
 589:         
 590:         if (this.voiceState === 'LISTENING') {
 591:             this.stopVoiceRecording();
 592:         } else {
 593:             this.voiceState = 'LISTENING';
 594:             this.updateVoiceButton();
 595:             this.startVoiceRecording();
 596:         }
 597:         
 598:         telegram.haptic('medium');
 599:     }
 600: 
 601:     async startVoiceRecording() {
 602:         try {
 603:             const tg = window.Telegram?.WebApp;
 604:             // Try native Telegram voice recording (Bot API 9.6+)
 605:             if (tg && typeof tg.requestVoiceMessage === 'function') {
 606:                 const result = await tg.requestVoiceMessage();
 607:                 
 608:                 if (result && result.file_id) {
 609:                     this.sendVoiceToBot(result.file_id, result.duration);
 610:                 } else {
 611:                     throw new Error('No file_id received');
 612:                 }
 613:             } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
 614:                 // Fallback to manual recording
 615:                 this.fallbackToManualRecording();
 616:             } else {
 617:                 telegram.showAlert('Запись голоса не поддерживается в вашем браузере. Используйте текстовый ввод.');
 618:             }
 619:         } catch (error) {
 620:             console.error('[Voice] Recording failed:', error.message);
 621:             this.handleVoiceError(error);
 622:         }
 623:     }
 624: 
 625:     stopVoiceRecording() {
 626:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
 627:             this.mediaRecorder.stop();
 628:         }
 629:         this.resetVoiceState();
 630:     }
 631: 
 632:     fallbackToManualRecording() {
 633:         navigator.mediaDevices.getUserMedia({ audio: true })
 634:             .then(stream => {
 635:                 this.mediaRecorder = new MediaRecorder(stream);
 636:                 this.audioChunks = [];
 637:                 
 638:                 this.mediaRecorder.ondataavailable = (e) => {
 639:                     this.audioChunks.push(e.data);
 640:                 };
 641:                 
 642:                 this.mediaRecorder.onstop = () => {
 643:                     const audioBlob = new Blob(this.audioChunks, { type: 'audio/ogg' });
 644:                     this.uploadVoiceBlob(audioBlob);
 645:                     stream.getTracks().forEach(track => track.stop());
 646:                 };
 647:                 
 648:                 this.mediaRecorder.start();
 649:                 console.log('[NeuroEscrow] Fallback recording started');
 650:             })
 651:             .catch(error => {
 652:                 this.handleVoiceError(error);
 653:             });
 654:     }
 655: 
 656:     uploadVoiceBlob(blob) {
 657:         // This would require bot-side endpoint for blob upload
 658:         // For now, just show error
 659:         this.handleVoiceError(new Error('Manual recording not yet implemented'));
 660:     }
 661: 
 662:     sendVoiceToBot(fileId, duration) {
 663:         this.voiceState = 'PROCESSING';
 664:         this.isProcessing = true;
 665:         this.updateVoiceButton();
 666:         this.setupResponseTimeout();
 667:         
 668:         const payload = {
 669:             action: 'voice_message',
 670:             file_id: fileId,
 671:             duration: duration,
 672:             timestamp: Date.now(),
 673:             user_id: telegram.getUserId()
 674:         };
 675:         
 676:         telegram.sendData(payload);
 677:         console.log('[NeuroEscrow] Voice sent to bot:', fileId);
 678:     }
 679: 
 680:     updateVoiceButton() {
 681:         const btn = document.getElementById('voice-btn');
 682:         const status = document.getElementById('voice-status');
 683:         
 684:         if (!btn) return;
 685:         
 686:         // Remove all state classes
 687:         btn.classList.remove('recording', 'processing');
 688:         
 689:         switch (this.voiceState) {
 690:             case 'IDLE':
 691:                 if (status) { status.textContent = ''; status.style.display = 'none'; }
 692:                 this.isRecording = false;
 693:                 break;
 694:                 
 695:             case 'LISTENING':
 696:                 btn.classList.add('recording');
 697:                 if (status) { status.textContent = 'Слушаю...'; status.style.display = 'block'; }
 698:                 this.isRecording = true;
 699:                 break;
 700:                 
 701:             case 'PROCESSING':
 702:                 btn.classList.add('processing');
 703:                 if (status) { status.textContent = 'Гермес обрабатывает...'; status.style.display = 'block'; }
 704:                 this.isRecording = false;
 705:                 break;
 706:         }
 707:     }
 708: 
 709:     setupResponseTimeout() {
 710:         if (this.responseTimeout) {
 711:             clearTimeout(this.responseTimeout);
 712:         }
 713:         
 714:         this.responseTimeout = setTimeout(() => {
 715:             if (this.voiceState === 'PROCESSING') {
 716:                 this.handleVoiceError(new Error('timeout'));
 717:             }
 718:         }, 30000);
 719:     }
 720: 
 721:     handleVoiceError(error) {
 722:         console.error('[NeuroEscrow] Voice error:', error);
 723:         
 724:         this.resetVoiceState();
 725:         
 726:         let message = 'Ошибка записи голоса';
 727:         
 728:         if (error.message.includes('permission')) {
 729:             message = 'Нет доступа к микрофону';
 730:         } else if (error.message.includes('timeout')) {
 731:             message = 'Превышено время ожидания';
 732:         } else if (error.message.includes('cancelled')) {
 733:             message = 'Запись отменена';
 734:         }
 735:         
 736:         telegram.showAlert(message);
 737:         telegram.hapticNotification('error');
 738:     }
 739: 
 740:     resetVoiceState() {
 741:         this.voiceState = 'IDLE';
 742:         this.isRecording = false;
 743:         this.isProcessing = false;
 744:         this.updateVoiceButton();
 745:         
 746:         if (this.responseTimeout) {
 747:             clearTimeout(this.responseTimeout);
 748:             this.responseTimeout = null;
 749:         }
 750:     }
 751: 
 752:     handleDraftCreated(draft) {
 753:         if (this.responseTimeout) {
 754:             clearTimeout(this.responseTimeout);
 755:         }
 756:         
 757:         // Check for duplicates
 758:         const existingIndex = this.deals.findIndex(d => d.id === draft.id);
 759:         if (existingIndex !== -1) {
 760:             this.deals[existingIndex] = { ...draft, type: 'draft', isNew: true };
 761:         } else {
 762:             this.deals.unshift({ ...draft, type: 'draft', isNew: true });
 763:         }
 764:         
 765:         this.resetVoiceState();
 766:         this.saveCache(); // Save immediately after adding draft
 767:         this.navigate('deals');
 768:         
 769:         telegram.hapticNotification('success');
 770:         telegram.showAlert('Черновик создан');
 771:         
 772:         console.log('[NeuroEscrow] Draft created:', draft.id);
 773:     }
 774: 
 775:     // -------------------------------------------------------------------------
 776:     // Deals View
 777:     // -------------------------------------------------------------------------
 778: 
 779:     renderDealsView(container) {
 780:         const view = document.createElement('div');
 781:         view.className = 'view';
 782:         
 783:         const deals = this.deals.length > 0 ? this.deals : this.getSampleDeals();
 784:         
 785:         view.innerHTML = `
 786:             <div class="split-layout">
 787:                 <div class="split-pane left-pane">
 788:                     <div class="pane-glass">
 789:                         <div class="pane-header">
 790:                             <span class="pane-header-dot purple"></span>
 791:                             <span class="pane-header-icon">🤝</span>
 792:                             <span class="pane-header-title">Сделки</span>
 793:                         </div>
 794:                         <div class="pane-content" style="padding:16px;">
 795:                             <h2 style="font-size:18px;margin-bottom:16px;font-weight:600;">Мои сделки</h2>
 796:                             ${deals.length === 0 ? this.emptyState('🤝', 'У вас пока нет сделок') : ''}
 797:                             <div id="deals-list">
 798:                                 ${deals.map(deal => deal.type === 'draft' ? this.renderDraftCard(deal) : this.dealCard(deal)).join('')}
 799:                             </div>
 800:                         </div>
 801:                         <div class="bottom-nav-left">
 802:                             <button class="nav-btn-left" data-view="hermes" onclick="app.navigate('hermes')">
 803:                                 <span class="nav-icon">🎙️</span>
 804:                                 <span class="nav-label">Гермес</span>
 805:                             </button>
 806:                             <button class="nav-btn-left active" data-view="deals" onclick="app.navigate('deals')">
 807:                                 <span class="nav-icon">🤝</span>
 808:                                 <span class="nav-label">Сделки</span>
 809:                             </button>
 810:                             <button class="nav-btn-left" data-view="profile" onclick="app.navigate('profile')">
 811:                                 <span class="nav-icon">👤</span>
 812:                                 <span class="nav-label">Профиль</span>
 813:                             </button>
 814:                             <button class="nav-btn-left" id="micButton" onclick="app.toggleVoiceRecording()">
 815:                                 <span class="nav-icon">🎤</span>
 816:                                 <span class="nav-label">Микрофон</span>
 817:                             </button>
 818:                         </div>
 819:                     </div>
 820:                 </div>
 821:                 <div class="split-divider" id="split-divider"></div>
 822:                 <div class="split-pane right-pane">
 823:                     <div class="pane-glass">
 824:                         <div class="pane-header">
 825:                             <span class="pane-header-dot green"></span>
 826:                             <span class="pane-header-icon">📋</span>
 827:                             <span class="pane-header-title">Смарт-контракт</span>
 828:                         </div>
 829:                         <div class="pane-content" id="smart-contract-panel-deals">
 830:                             <div id="contract-phases" class="contract-phases">
 831:                                 <div class="phase-step" data-phase="draft">
 832:                                     <span class="phase-icon">📝</span>
 833:                                     <span class="phase-label">Составление</span>
 834:                                 </div>
 835:                                 <div class="phase-step" data-phase="review">
 836:                                     <span class="phase-icon">✅</span>
 837:                                     <span class="phase-label">Согласование</span>
 838:                                 </div>
 839:                                 <div class="phase-step" data-phase="sorting">
 840:                                     <span class="phase-icon">🔍</span>
 841:                                     <span class="phase-label">Подбор</span>
 842:                                 </div>
 843:                                 <div class="phase-step" data-phase="agreement">
 844:                                     <span class="phase-icon">🤝</span>
 845:                                     <span class="phase-label">Сделка</span>
 846:                                 </div>
 847:                                 <div class="phase-step" data-phase="escrow">
 848:                                     <span class="phase-icon">💰</span>
 849:                                     <span class="phase-label">Эскроу</span>
 850:                                 </div>
 851:                             </div>
 852:                             <div id="contract-fields" class="contract-fields">
 853:                                 <div class="contract-field" data-field="title">
 854:                                     <label class="field-label">Название задачи</label>
 855:                                     <div class="field-value" id="field-title">—</div>
 856:                                 </div>
 857:                                 <div class="contract-field" data-field="description">
 858:                                     <label class="field-label">Описание</label>
 859:                                     <div class="field-value" id="field-description">—</div>
 860:                                 </div>
 861:                                 <div class="contract-field" data-field="budget">
 862:                                     <label class="field-label">Бюджет (TON)</label>
 863:                                     <div class="field-value" id="field-budget">—</div>
 864:                                 </div>
 865:                                 <div class="contract-field" data-field="deadline">
 866:                                     <label class="field-label">Дедлайн</label>
 867:                                     <div class="field-value" id="field-deadline">—</div>
 868:                                 </div>
 869:                                 <div class="contract-field" data-field="client">
 870:                                     <label class="field-label">Клиент</label>
 871:                                     <div class="field-value" id="field-client">—</div>
 872:                                 </div>
 873:                                 <div class="contract-field" data-field="coder">
 874:                                     <label class="field-label">Нейрокодер</label>
 875:                                     <div class="field-value" id="field-coder">—</div>
 876:                                 </div>
 877:                                 <div class="contract-field" data-field="status">
 878:                                     <label class="field-label">Статус</label>
 879:                                     <div class="field-value" id="field-status">
 880:                                         <span class="status-badge draft">Черновик</span>
 881:                                     </div>
 882:                                 </div>
 883:                             </div>
 884:                         </div>
 885:                     </div>
 886:                 </div>
 887:             </div>
 888:         `;
 889:         
 890:         container.appendChild(view);
 891:         this.initSplitDivider();
 892:         this.renderContractPanel();
 893:     }
 894: 
 895:     renderDraftCard(draft) {
 896:         const title = this.escapeHtml(draft.title || 'Без названия');
 897:         const description = this.escapeHtml(draft.description || '');
 898:         const budget = draft.budget || 'Не указан';
 899:         const deadline = draft.deadline || 'Не указан';
 900:         
 901:         return `
 902:             <div class="card draft-card" style="border-left:2px solid rgba(255, 255, 255, 0.34);">
 903:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
 904:                     <span style="font-size:12px;font-weight:600;color:rgba(255, 255, 255, 0.34);text-transform:uppercase;letter-spacing:0.5px;">Черновик</span>
 905:                     <span style="font-size:11px;color:var(--ne-light-gray);">${this.formatDate(draft.created_at)}</span>
 906:                 </div>
 907:                 <div class="card-title">${title}</div>
 908:                 <p style="font-size:13px;color:var(--ne-light-gray);margin:8px 0;">${description}</p>
 909:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
 910:                     <span>💰 ${budget}</span>
 911:                     <span>⏱️ ${deadline}</span>
 912:                 </div>
 913:                 <div style="display:flex;gap:8px;margin-top:12px;">
 914:                     <button class="btn btn-primary" onclick="app.editDraft('${draft.id}')" style="flex:1;">Редактировать</button>
 915:                     <button class="btn btn-secondary" onclick="app.publishDraft('${draft.id}')" style="flex:1;">Опубликовать</button>
 916:                 </div>
 917:             </div>
 918:         `;
 919:     }
 920: 
 921:     dealCard(deal) {
 922:         const statusColors = {
 923:             'draft': 'rgba(255, 255, 255, 0.34)',
 924:             'negotiating': '#dddddd',
 925:             'in_progress': '#dddddd',
 926:             'completed': 'rgba(255, 255, 255, 0.67)'
 927:         };
 928:         
 929:         const statusNames = {
 930:             'draft': 'Черновик',
 931:             'negotiating': 'Переговоры',
 932:             'in_progress': 'В работе',
 933:             'completed': 'Завершена'
 934:         };
 935:         
 936:         const color = statusColors[deal.status] || 'rgba(255, 255, 255, 0.34)';
 937:         const statusName = statusNames[deal.status] || deal.status;
 938:         
 939:         return `
 940:             <div class="card" style="border-left:2px solid ${color};">
 941:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
 942:                     <span style="font-size:12px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${statusName}</span>
 943:                     <span style="font-size:11px;color:var(--ne-light-gray);">#${deal.id}</span>
 944:                 </div>
 945:                 <div class="card-title">${deal.title}</div>
 946:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
 947:                     <span>💰 ${deal.budget} USDT</span>
 948:                     <span>👤 ${deal.counterparty}</span>
 949:                 </div>
 950:                 <div style="margin-top:12px;">
 951:                     <button class="btn btn-secondary" onclick="app.viewDeal('${deal.id}')">Открыть в боте</button>
 952:                 </div>
 953:             </div>
 954:         `;
 955:     }
 956: 
 957:     getSampleDeals() {
 958:         return [
 959:             { id: 'a1b2', title: 'Telegram бот для интернет-магазина', status: 'in_progress', budget: '500', counterparty: 'client_42' },
 960:             { id: 'c3d4', title: 'Парсер данных с сайта', status: 'completed', budget: '300', counterparty: 'client_17' },
 961:         ];
 962:     }
 963: 
 964:     viewDeal(dealId) {
 965:         telegram.sendData({ action: 'view_deal', deal_id: dealId });
 966:         telegram.showAlert('Открываю детали сделки в боте...');
 967:     }
 968: 
 969:     editDraft(draftId) {
 970:         telegram.sendData({ action: 'edit_draft', draft_id: draftId });
 971:         telegram.showAlert('Открываю редактор в боте...');
 972:     }
 973: 
 974:     publishDraft(draftId) {
 975:         telegram.sendData({ action: 'publish_draft', draft_id: draftId });
 976:         telegram.showAlert('Публикую черновик...');
 977:     }
 978: 
 979:     escapeHtml(text) {
 980:         const div = document.createElement('div');
 981:         div.textContent = text;
 982:         return div.innerHTML;
 983:     }
 984: 
 985:     formatDate(timestamp) {
 986:         if (!timestamp) return '';
 987:         const date = new Date(timestamp * 1000);
 988:         const now = new Date();
 989:         const diff = now - date;
 990:         
 991:         if (diff < 60000) return 'только что';
 992:         if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
 993:         if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
 994:         
 995:         return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
 996:     }
 997: 
 998:     // -------------------------------------------------------------------------
 999:     // Profile View
1000:     // -------------------------------------------------------------------------
1001: 
1002:     renderProfileView(container) {
1003:         const view = document.createElement('div');
1004:         view.className = 'view';
1005:         
1006:         view.innerHTML = `
1007:             <div class="split-layout">
1008:                 <div class="split-pane left-pane">
1009:                     <div class="pane-glass">
1010:                         <div class="pane-header">
1011:                             <span class="pane-header-dot purple"></span>
1012:                             <span class="pane-header-icon">👤</span>
1013:                             <span class="pane-header-title">Профиль</span>
1014:                         </div>
1015:                         <div class="pane-content" style="padding:16px;">
1016:                             <div class="card" style="text-align:center;padding:24px;">
1017:                                 <div style="font-size:32px;font-weight:700;margin-bottom:8px;">${this.balance.toFixed(2)} USDT</div>
1018:                                 <div style="font-size:13px;color:var(--ne-light-gray);margin-bottom:20px;">Ваш баланс</div>
1019:                                 <div style="display:flex;gap:8px;margin-bottom:16px;">
1020:                                     <button class="btn btn-primary" onclick="app.donate()" style="flex:1;">💝 Поддержать</button>
1021:                                     <button class="btn btn-secondary" onclick="app.leaveTip()" style="flex:1;">⭐ Чаевые</button>
1022:                                 </div>
1023:                                 <div style="font-size:11px;color:var(--ne-light-gray);margin-top:12px;">TON • USDT • Telegram Stars</div>
1024:                             </div>
1025:                             <div id="ton-connect" style="margin:16px 0;"></div>
1026:                             <div class="card">
1027:                                 <div class="card-title">Настройки</div>
1028:                                 <div class="form-group">
1029:                                     <label class="form-label">LLM Модель</label>
1030:                                     <select class="form-input" id="model-selector">
1031:                                         <option value="auto">Автоматически</option>
1032:                                         <option value="gpt-4">GPT-4</option>
1033:                                         <option value="claude">Claude</option>
1034:                                         <option value="grok">Grok</option>
1035:                                         <option value="custom">Своя модель</option>
1036:                                     </select>
1037:                                 </div>
1038:                             </div>
1039:                         </div>
1040:                         <div class="bottom-nav-left">
1041:                             <button class="nav-btn-left" data-view="hermes" onclick="app.navigate('hermes')">
1042:                                 <span class="nav-icon">🎙️</span>
1043:                                 <span class="nav-label">Гермес</span>
1044:                             </button>
1045:                             <button class="nav-btn-left" data-view="deals" onclick="app.navigate('deals')">
1046:                                 <span class="nav-icon">🤝</span>
1047:                                 <span class="nav-label">Сделки</span>
1048:                             </button>
1049:                             <button class="nav-btn-left active" data-view="profile" onclick="app.navigate('profile')">
1050:                                 <span class="nav-icon">👤</span>
1051:                                 <span class="nav-label">Профиль</span>
1052:                             </button>
1053:                             <button class="nav-btn-left" id="micButton" onclick="app.toggleVoiceRecording()">
1054:                                 <span class="nav-icon">🎤</span>
1055:                                 <span class="nav-label">Микрофон</span>
1056:                             </button>
1057:                         </div>
1058:                     </div>
1059:                 </div>
1060:                 <div class="split-divider" id="split-divider"></div>
1061:                 <div class="split-pane right-pane">
1062:                     <div class="pane-glass">
1063:                         <div class="pane-header">
1064:                             <span class="pane-header-dot green"></span>
1065:                             <span class="pane-header-icon">📋</span>
1066:                             <span class="pane-header-title">Смарт-контракт</span>
1067:                         </div>
1068:                         <div class="pane-content" id="smart-contract-panel-profile">
1069:                             <div id="contract-phases" class="contract-phases">
1070:                                 <div class="phase-step" data-phase="draft">
1071:                                     <span class="phase-icon">📝</span>
1072:                                     <span class="phase-label">Составление</span>
1073:                                 </div>
1074:                                 <div class="phase-step" data-phase="review">
1075:                                     <span class="phase-icon">✅</span>
1076:                                     <span class="phase-label">Согласование</span>
1077:                                 </div>
1078:                                 <div class="phase-step" data-phase="sorting">
1079:                                     <span class="phase-icon">🔍</span>
1080:                                     <span class="phase-label">Подбор</span>
1081:                                 </div>
1082:                                 <div class="phase-step" data-phase="agreement">
1083:                                     <span class="phase-icon">🤝</span>
1084:                                     <span class="phase-label">Сделка</span>
1085:                                 </div>
1086:                                 <div class="phase-step" data-phase="escrow">
1087:                                     <span class="phase-icon">💰</span>
1088:                                     <span class="phase-label">Эскроу</span>
1089:                                 </div>
1090:                             </div>
1091:                             <div id="contract-fields" class="contract-fields">
1092:                                 <div class="contract-field" data-field="title">
1093:                                     <label class="field-label">Название задачи</label>
1094:                                     <div class="field-value" id="field-title">—</div>
1095:                                 </div>
1096:                                 <div class="contract-field" data-field="description">
1097:                                     <label class="field-label">Описание</label>
1098:                                     <div class="field-value" id="field-description">—</div>
1099:                                 </div>
1100:                                 <div class="contract-field" data-field="budget">
1101:                                     <label class="field-label">Бюджет (TON)</label>
1102:                                     <div class="field-value" id="field-budget">—</div>
1103:                                 </div>
1104:                                 <div class="contract-field" data-field="deadline">
1105:                                     <label class="field-label">Дедлайн</label>
1106:                                     <div class="field-value" id="field-deadline">—</div>
1107:                                 </div>
1108:                                 <div class="contract-field" data-field="client">
1109:                                     <label class="field-label">Клиент</label>
1110:                                     <div class="field-value" id="field-client">—</div>
1111:                                 </div>
1112:                                 <div class="contract-field" data-field="coder">
1113:                                     <label class="field-label">Нейрокодер</label>
1114:                                     <div class="field-value" id="field-coder">—</div>
1115:                                 </div>
1116:                                 <div class="contract-field" data-field="status">
1117:                                     <label class="field-label">Статус</label>
1118:                                     <div class="field-value" id="field-status">
1119:                                         <span class="status-badge draft">Черновик</span>
1120:                                     </div>
1121:                                 </div>
1122:                             </div>
1123:                         </div>
1124:                     </div>
1125:                 </div>
1126:             </div>
1127:         `;
1128:         
1129:         container.appendChild(view);
1130:         this.initSplitDivider();
1131:         this.renderContractPanel();
1132:         
1133:         setTimeout(() => {
1134:             tonConnect.init('ton-connect');
1135:         }, 100);
1136:     }
1137: 
1138:     donate() {
1139:         telegram.showAlert('Выберите способ:\n\n⭐ Stars: 50, 100, 250, 500\n💎 TON: 1, 5, 10, 25\n💵 USDT: 5, 10, 25, 50');
1140:     }
1141: 
1142:     leaveTip() {
1143:         telegram.showAlert('Быстрые чаевые:\n\n10 ⭐ | 25 ⭐ | 50 ⭐ | 100 ⭐');
1144:     }
1145: 
1146:     onTonStatusChange(detail) {
1147:         console.log('[App] TON status changed:', detail);
1148:     }
1149: 
1150:     async loadCache() {
1151:         try {
1152:             const cached = await telegram.cloudGet('neuroescrow_data');
1153:             if (cached) {
1154:                 this.deals = cached.deals || [];
1155:                 this.balance = cached.balance || 0;
1156:                 this.chatMessages = cached.chatMessages || [];
1157:                 console.log('[App] Cache loaded');
1158:             }
1159:         } catch (e) {
1160:             console.log('[App] No cache found');
1161:         }
1162:     }
1163: 
1164:     async saveCache() {
1165:         const data = {
1166:             deals: this.deals,
1167:             balance: this.balance,
1168:             chatMessages: this.chatMessages,
1169:             timestamp: Date.now()
1170:         };
1171:         await telegram.cloudSet('neuroescrow_data', data);
1172:     }
1173: 
1174:     async loadSession(sessionId) {
1175:         const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1176:             ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1177:             : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1178: 
1179:         try {
1180:             const resp = await fetch(baseUrl + 'session/' + sessionId, { mode: 'cors' });
1181:             if (!resp.ok) return;
1182: 
1183:             const session = await resp.json();
1184:             const messages = session.messages || [];
1185: 
1186:             this.chatMessages = messages.map(msg => ({
1187:                 sender: msg.role === 'user' ? 'user' : 'hermes',
1188:                 text: msg.content || msg.text || '',
1189:                 timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()
1190:             }));
1191: 
1192:             this.renderChatMessages();
1193:             this.saveCache();
1194:         } catch (e) {
1195:             console.error('[App] Load session error:', e.message);
1196:         }
1197:     }
1198: 
1199:     async loadSessionsList() {
1200:         const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1201:             ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1202:             : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1203: 
1204:         try {
1205:             const resp = await fetch(baseUrl + 'sessions', { mode: 'cors' });
1206:             if (!resp.ok) return [];
1207:             return await resp.json();
1208:         } catch (e) {
1209:             console.error('[App] Load sessions error:', e.message);
1210:             return [];
1211:         }
1212:     }
1213: 
1214:     requestDataFromBot() {
1215:         telegram.sendData({ action: 'get_dashboard_data' });
1216:     }
1217: 
1218:     handleBotData(data) {
1219:         console.log('[App] Data from bot:', data);
1220:         
1221:         // Handle different event types
1222:         if (data.event === 'draft_created' && data.draft) {
1223:             this.handleDraftCreated(data.draft);
1224:             return;
1225:         }
1226:         
1227:         if (data.event === 'error') {
1228:             this.handleVoiceError(new Error(data.error || 'Unknown error'));
1229:             return;
1230:         }
1231: 
1232:         if (data.event === 'hermes_reply' && data.text) {
1233:             this.addChatMessage('hermes', data.text);
1234:             return;
1235:         }
1236: 
1237:         if (data.event === 'moderation_block') {
1238:             telegram.showAlert('⚠️ Ваш контент нарушает правила платформы');
1239:             return;
1240:         }
1241:         
1242:         // Handle dashboard data
1243:         if (data.deals) this.deals = data.deals;
1244:         if (data.balance !== undefined) this.balance = data.balance;
1245:         
1246:         this.saveCache();
1247:         
1248:         const main = document.getElementById('main-content');
1249:         main.innerHTML = '';
1250:         switch(this.currentView) {
1251:             case 'hermes': this.renderHermesView(main); break;
1252:             case 'deals': this.renderDealsView(main); break;
1253:             case 'profile': this.renderProfileView(main); break;
1254:         }
1255:     }
1256: 
1257:     emptyState(icon, text) {
1258:         return `
1259:             <div class="empty-state">
1260:                 <div class="empty-icon">${icon}</div>
1261:                 <div class="empty-text">${text}</div>
1262:             </div>
1263:         `;
1264:     }
1265: 
1266:     // -------------------------------------------------------------------------
1267:     // Chat Interface Methods
1268:     // -------------------------------------------------------------------------
1269: 
1270:     renderChatMessages() {
1271:         const container = document.getElementById('chat-messages');
1272:         if (!container) return;
1273: 
1274:         container.innerHTML = this.chatMessages.map((msg, idx) => {
1275:             const isLastHermes = idx === this.chatMessages.length - 1 && msg.sender === 'hermes' && msg.text === '';
1276:             const streamingClass = isLastHermes ? ' streaming' : '';
1277:             const isHermesComplete = msg.sender === 'hermes' && msg.text !== '' && !isLastHermes;
1278:             const feedbackHtml = isHermesComplete && !msg.feedback ? `
1279:                 <div class="feedback-buttons">
1280:                     <button class="feedback-btn" onclick="app.submitFeedback(${idx}, 'up')">👍</button>
1281:                     <button class="feedback-btn" onclick="app.submitFeedback(${idx}, 'down')">👎</button>
1282:                 </div>
1283:             ` : '';
1284:             return `
1285:             <div class="chat-message ${msg.sender}">
1286:                 <div class="message-bubble${streamingClass}">
1287:                     ${this.escapeHtml(msg.text)}
1288:                     <span class="msg-time">${this.formatTime(msg.timestamp)}</span>
1289:                     ${feedbackHtml}
1290:                 </div>
1291:             </div>
1292:         `;
1293:         }).join('');
1294: 
1295:         this.scrollToBottom();
1296:     }
1297: 
1298:     scrollToBottom() {
1299:         const container = document.getElementById('chat-messages');
1300:         if (!container) return;
1301:         requestAnimationFrame(() => {
1302:             container.scrollTop = container.scrollHeight;
1303:         });
1304:     }
1305: 
1306:     addChatMessage(sender, text) {
1307:         this.chatMessages.push({
1308:             sender,
1309:             text,
1310:             timestamp: Date.now()
1311:         });
1312:         this.renderChatMessages();
1313:         this.saveCache();
1314:     }
1315: 
1316:     showTypingIndicator() {
1317:         const container = document.getElementById('chat-messages');
1318:         if (!container) return;
1319:         const typing = document.createElement('div');
1320:         typing.className = 'typing-indicator';
1321:         typing.id = 'typing-indicator';
1322:         typing.innerHTML = '<span>Гермес печатает</span><div class="dot"></div><div class="dot"></div><div class="dot"></div>';
1323:         container.appendChild(typing);
1324:         container.scrollTop = container.scrollHeight;
1325:     }
1326: 
1327:     hideTypingIndicator() {
1328:         const typing = document.getElementById('typing-indicator');
1329:         if (typing) typing.remove();
1330:     }
1331: 
1332:     async sendTextMessage() {
1333:         const input = document.getElementById('chat-input');
1334:         if (!input || !input.value.trim()) return;
1335: 
1336:         const text = input.value.trim();
1337:         this.addChatMessage('user', text);
1338:         input.value = '';
1339: 
1340:         telegram.haptic('light');
1341: 
1342:         // Call Hermes backend
1343:         try {
1344:             const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1345:                 ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1346:                 : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1347: 
1348:             console.log('[Chat] Fetching:', baseUrl + 'chat');
1349: 
1350:             // Show typing indicator
1351:             this.showTypingIndicator();
1352: 
1353:             // Try streaming first
1354:             const streamUrl = baseUrl + 'chat/stream';
1355:             const response = await fetch(streamUrl, {
1356:                 method: 'POST',
1357:                 mode: 'cors',
1358:                 credentials: 'omit',
1359:                 headers: { 'Content-Type': 'application/json' },
1360:                 body: JSON.stringify({
1361:                     message: text,
1362:                     user_id: telegram.getUserId(),
1363:                     session_id: `tg_${telegram.getUserId()}`,
1364:                     persona: 'hermes'
1365:                 })
1366:             });
1367: 
1368:             console.log('[Chat] Response status:', response.status, response.statusText);
1369: 
1370:             // Hide typing indicator
1371:             this.hideTypingIndicator();
1372: 
1373:             const contentType = response.headers.get('content-type') || '';
1374: 
1375:             if (contentType.includes('text/event-stream')) {
1376:                 // Streaming response — typewriter effect
1377:                 const reader = response.body.getReader();
1378:                 const decoder = new TextDecoder();
1379:                 let fullText = '';
1380: 
1381:                 // Create empty hermes message bubble for streaming
1382:                 const msgIdx = this.chatMessages.length;
1383:                 this.chatMessages.push({ sender: 'hermes', text: '', timestamp: Date.now() });
1384:                 this.renderChatMessages();
1385: 
1386:                 while (true) {
1387:                     const { done, value } = await reader.read();
1388:                     if (done) break;
1389: 
1390:                     const chunk = decoder.decode(value, { stream: true });
1391:                     const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
1392: 
1393:                     for (const line of lines) {
1394:                         try {
1395:                             const parsed = JSON.parse(line.replace('data: ', ''));
1396:                             if (parsed.done) break;
1397:                             if (parsed.char !== undefined) {
1398:                                 fullText += parsed.char;
1399:                                 this.chatMessages[msgIdx].text = fullText;
1400:                                 this.renderChatMessages();
1401:                             }
1402:                         } catch { /* skip malformed SSE lines */ }
1403:                     }
1404:                 }
1405: 
1406:                 this.saveCache();
1407:             } else {
1408:                 // Fallback: regular JSON response
1409:                 const data = await response.json();
1410: 
1411:                 if (data.blocked) {
1412:                     this.addChatMessage('system', `⚠️ ${data.reason}`);
1413:                 } else if (data.response) {
1414:                     this.addChatMessage('hermes', data.response);
1415:                 } else if (data.error) {
1416:                     this.addChatMessage('system', `❌ Ошибка: ${data.error_message || data.error}`);
1417:                 }
1418:             }
1419:         } catch (error) {
1420:             console.error('[Chat] Fetch failed:', error.message);
1421:             this.hideTypingIndicator();
1422:             this.addChatMessage('system', '❌ Ошибка соединения с сервером');
1423:         }
1424:     }
1425: 
1426:     showAttachMenu() {
1427:         const menu = document.getElementById('attach-menu');
1428:         if (!menu) return;
1429: 
1430:         menu.style.display = menu.style.display === 'none' ? 'grid' : 'none';
1431:         telegram.haptic('light');
1432:     }
1433: 
1434:     hideAttachMenu() {
1435:         const menu = document.getElementById('attach-menu');
1436:         if (menu) menu.style.display = 'none';
1437:     }
1438: 
1439:     attachPhoto() {
1440:         this.hideAttachMenu();
1441:         const input = document.createElement('input');
1442:         input.type = 'file';
1443:         input.accept = 'image/*';
1444:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'photo');
1445:         input.click();
1446:     }
1447: 
1448:     attachVideo() {
1449:         this.hideAttachMenu();
1450:         const input = document.createElement('input');
1451:         input.type = 'file';
1452:         input.accept = 'video/*';
1453:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'video');
1454:         input.click();
1455:     }
1456: 
1457:     async recordVideo() {
1458:         this.hideAttachMenu();
1459:         try {
1460:             const stream = await navigator.mediaDevices.getUserMedia({
1461:                 video: { facingMode: this.currentFacingMode },
1462:                 audio: true
1463:             });
1464:             this.currentStream = stream;
1465:             this.showVideoRecorder(stream);
1466:         } catch (error) {
1467:             telegram.showAlert('Нет доступа к камере');
1468:         }
1469:     }
1470: 
1471:     showVideoRecorder(stream) {
1472:         const recorder = document.createElement('div');
1473:         recorder.className = 'video-recording';
1474:         recorder.innerHTML = `
1475:             <div class="video-preview">
1476:                 <video id="video-preview" autoplay playsinline muted></video>
1477:                 <div class="video-controls">
1478:                     <button class="camera-switch-btn" onclick="app.switchCamera()">🔄</button>
1479:                     <button class="video-record-btn" id="record-btn" onclick="app.toggleVideoRecording()"></button>
1480:                     <button class="camera-switch-btn" onclick="app.closeVideoRecorder()">✖️</button>
1481:                 </div>
1482:             </div>
1483:         `;
1484:         document.body.appendChild(recorder);
1485: 
1486:         const video = document.getElementById('video-preview');
1487:         video.srcObject = stream;
1488:     }
1489: 
1490:     async switchCamera() {
1491:         this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
1492:         if (this.currentStream) {
1493:             this.currentStream.getTracks().forEach(track => track.stop());
1494:         }
1495:         await this.recordVideo();
1496:     }
1497: 
1498:     toggleVideoRecording() {
1499:         const btn = document.getElementById('record-btn');
1500:         if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
1501:             this.startVideoRecording();
1502:             btn.classList.add('recording');
1503:         } else {
1504:             this.stopVideoRecording();
1505:             btn.classList.remove('recording');
1506:         }
1507:     }
1508: 
1509:     startVideoRecording() {
1510:         if (!this.currentStream) return;
1511: 
1512:         this.mediaRecorder = new MediaRecorder(this.currentStream);
1513:         this.audioChunks = [];
1514: 
1515:         this.mediaRecorder.ondataavailable = (e) => {
1516:             this.audioChunks.push(e.data);
1517:         };
1518: 
1519:         this.mediaRecorder.onstop = () => {
1520:             const videoBlob = new Blob(this.audioChunks, { type: 'video/webm' });
1521:             this.handleVideoUpload(videoBlob);
1522:         };
1523: 
1524:         this.mediaRecorder.start();
1525:     }
1526: 
1527:     stopVideoRecording() {
1528:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
1529:             this.mediaRecorder.stop();
1530:         }
1531:     }
1532: 
1533:     closeVideoRecorder() {
1534:         if (this.currentStream) {
1535:             this.currentStream.getTracks().forEach(track => track.stop());
1536:             this.currentStream = null;
1537:         }
1538:         const recorder = document.querySelector('.video-recording');
1539:         if (recorder) recorder.remove();
1540:     }
1541: 
1542:     async shareScreen() {
1543:         this.hideAttachMenu();
1544:         try {
1545:             const stream = await navigator.mediaDevices.getDisplayMedia({
1546:                 video: true
1547:             });
1548:             
1549:             const mediaRecorder = new MediaRecorder(stream);
1550:             const chunks = [];
1551: 
1552:             mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
1553:             mediaRecorder.onstop = () => {
1554:                 const blob = new Blob(chunks, { type: 'video/webm' });
1555:                 this.handleVideoUpload(blob);
1556:                 stream.getTracks().forEach(track => track.stop());
1557:             };
1558: 
1559:             mediaRecorder.start();
1560:             setTimeout(() => mediaRecorder.stop(), 30000); // 30 sec max
1561:         } catch (error) {
1562:             telegram.showAlert('Нет доступа к экрану');
1563:         }
1564:     }
1565: 
1566:     async handleFileUpload(file, type) {
1567:         if (!file) return;
1568: 
1569:         this.addChatMessage('user', `[📎 ${type === 'photo' ? 'Фото' : 'Видео'}]`);
1570: 
1571:         const reader = new FileReader();
1572:         reader.onload = async (e) => {
1573:             try {
1574:                 // Upload to backend and get URL
1575:                 const imageUrl = e.target.result; // Base64 data URL
1576: 
1577:                 // Call Hermes image analysis
1578:                 const response = await fetch('/analyze-image', {
1579:                     method: 'POST',
1580:                     headers: { 'Content-Type': 'application/json' },
1581:                     body: JSON.stringify({
1582:                         image_url: imageUrl,
1583:                         prompt: type === 'photo' ? 'Проанализируй это изображение' : 'Опиши это видео',
1584:                         user_id: telegram.getUserId(),
1585:                         session_id: `tg_${telegram.getUserId()}`
1586:                     })
1587:                 });
1588: 
1589:                 const data = await response.json();
1590: 
1591:                 if (data.response) {
1592:                     this.addChatMessage('hermes', data.response);
1593:                 } else if (data.error) {
1594:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
1595:                 }
1596:             } catch (error) {
1597:                 console.error('[App] Upload error:', error);
1598:                 this.addChatMessage('system', '❌ Ошибка загрузки файла');
1599:             }
1600:         };
1601:         reader.readAsDataURL(file);
1602:     }
1603: 
1604:     async handleVideoUpload(blob) {
1605:         this.addChatMessage('user', '[🎥 Видеозапись]');
1606:         this.closeVideoRecorder();
1607: 
1608:         const reader = new FileReader();
1609:         reader.onload = async (e) => {
1610:             try {
1611:                 const videoUrl = e.target.result;
1612: 
1613:                 // Call Hermes video analysis
1614:                 const response = await fetch('/analyze-image', {
1615:                     method: 'POST',
1616:                     headers: { 'Content-Type': 'application/json' },
1617:                     body: JSON.stringify({
1618:                         image_url: videoUrl,
1619:                         prompt: 'Проанализируй это видео',
1620:                         user_id: telegram.getUserId(),
1621:                         session_id: `tg_${telegram.getUserId()}`
1622:                     })
1623:                 });
1624: 
1625:                 const data = await response.json();
1626: 
1627:                 if (data.response) {
1628:                     this.addChatMessage('hermes', data.response);
1629:                 } else if (data.error) {
1630:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
1631:                 }
1632:             } catch (error) {
1633:                 console.error('[App] Video upload error:', error);
1634:                 this.addChatMessage('system', '❌ Ошибка загрузки видео');
1635:             }
1636:         };
1637:         reader.readAsDataURL(blob);
1638:     }
1639: 
1640:     formatTime(timestamp) {
1641:         const date = new Date(timestamp);
1642:         return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
1643:     }
1644: 
1645:     async submitFeedback(msgIdx, feedback) {
1646:         const msg = this.chatMessages[msgIdx];
1647:         if (!msg || msg.feedback) return;
1648: 
1649:         msg.feedback = feedback;
1650:         this.renderChatMessages();
1651: 
1652:         try {
1653:             const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1654:                 ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1655:                 : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1656: 
1657:             await fetch(baseUrl + 'feedback', {
1658:                 method: 'POST',
1659:                 mode: 'cors',
1660:                 credentials: 'omit',
1661:                 headers: { 'Content-Type': 'application/json' },
1662:                 body: JSON.stringify({
1663:                     message_id: msgIdx,
1664:                     feedback,
1665:                     user_id: telegram.getUserId(),
1666:                     session_id: `tg_${telegram.getUserId()}`,
1667:                     text: msg.text.substring(0, 200)
1668:                 })
1669:             });
1670: 
1671:             telegram.haptic('light');
1672:         } catch (error) {
1673:             console.error('[Feedback] Error:', error.message);
1674:         }
1675:     }
1676: 
1677:     updateTaskSpec(title, content) {
1678:         const specContainer = document.getElementById('task-spec');
1679:         const specContent = document.getElementById('task-spec-content');
1680:         if (!specContainer || !specContent) return;
1681: 
1682:         specContainer.classList.add('has-content');
1683:         specContent.innerHTML = `
1684:             <div class="task-spec-title">${this.escapeHtml(title)}</div>
1685:             <div>${this.escapeHtml(content)}</div>
1686:         `;
1687:     }
1688: 
1689:     clearTaskSpec() {
1690:         const specContainer = document.getElementById('task-spec');
1691:         const specContent = document.getElementById('task-spec-content');
1692:         if (!specContainer || !specContent) return;
1693: 
1694:         specContainer.classList.remove('has-content');
1695:         specContent.textContent = 'Ожидание ТЗ от Гермеса...';
1696:     }
1697: 
1698:     // ─── Голосовой ввод ТЗ ───────────────────────────────────────────────
1699:     initVoiceInput() {
1700:         const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
1701:         if (!SpeechRecognition) {
1702:             console.warn('[App] SpeechRecognition не поддерживается в этом браузере');
1703:             return;
1704:         }
1705:         this.recognition = new SpeechRecognition();
1706:         this.recognition.lang = 'ru-RU';
1707:         this.recognition.interimResults = true;
1708:         this.recognition.continuous = true;
1709: 
1710:         this.recognition.onresult = (event) => {
1711:             let interim = '';
1712:             let final = '';
1713:             for (let i = event.resultIndex; i < event.results.length; i++) {
1714:                 const transcript = event.results[i][0].transcript;
1715:                 if (event.results[i].isFinal) final += transcript + ' ';
1716:                 else interim += transcript;
1717:             }
1718:             const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1719:             if (input) {
1720:                 input.value = (this._voiceBaseText || '') + final + interim;
1721:             }
1722:         };
1723: 
1724:         this.recognition.onerror = (e) => console.warn('[App] Voice error:', e.error);
1725:         this.recognition.onend = () => {
1726:             this.isRecording = false;
1727:             const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
1728:             if (micBtn) micBtn.classList.remove('recording');
1729:         };
1730:     }
1731: 
1732:     toggleVoiceRecording() {
1733:         if (!this.recognition) return telegram.showAlert('Голосовой ввод не поддерживается');
1734:         const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
1735:         if (this.isRecording) {
1736:             this.recognition.stop();
1737:             this.isRecording = false;
1738:             if (micBtn) micBtn.classList.remove('recording');
1739:         } else {
1740:             const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1741:             this._voiceBaseText = input ? input.value + ' ' : '';
1742:             this.recognition.start();
1743:             this.isRecording = true;
1744:             if (micBtn) micBtn.classList.add('recording');
1745:             telegram.haptic('light');
1746:         }
1747:     }
1748: 
1749:     // ─── Панель смарт-контракта (вопросы Гермеса) ────────────────────────
1750:     renderContractQuestions(questions = []) {
1751:         const container = document.getElementById('contract-qa-container');
1752:         if (!container) return;
1753:         container.innerHTML = '';
1754:         if (!questions.length) {
1755:             container.innerHTML = '<div class="qa-empty">Нет активных вопросов от Гермеса</div>';
1756:             return;
1757:         }
1758:         questions.forEach((q, idx) => {
1759:             const wrap = document.createElement('div');
1760:             wrap.className = 'qa-item';
1761:             wrap.innerHTML = `
1762:                 <div class="qa-question">${idx + 1}. ${this.escapeHtml(q.text)}</div>
1763:                 <input type="text" class="qa-answer-input" placeholder="Ваш ответ..." data-qid="${q.id || idx}" />
1764:             `;
1765:             container.appendChild(wrap);
1766:         });
1767:         container.querySelectorAll('.qa-answer-input').forEach(inp => {
1768:             inp.addEventListener('change', () => this.saveContractAnswers());
1769:         });
1770:     }
1771: 
1772:     saveContractAnswers() {
1773:         const inputs = document.querySelectorAll('.qa-answer-input');
1774:         const answers = {};
1775:         inputs.forEach(inp => answers[inp.dataset.qid] = inp.value.trim());
1776:         this.contractAnswers = answers;
1777:         this.saveCache();
1778:     }
1779: 
1780:     // ─── История ТЗ ──────────────────────────────────────────────────────
1781:     async saveTaskSpecHistory(specText) {
1782:         if (!specText?.trim()) return;
1783:         const history = this.taskSpecHistory || [];
1784:         history.unshift({ text: specText, timestamp: Date.now() });
1785:         if (history.length > 20) history.pop();
1786:         this.taskSpecHistory = history;
1787:         try {
1788:             if (window.Telegram?.WebApp?.CloudStorage) {
1789:                 await new Promise((res, rej) => Telegram.WebApp.CloudStorage.setItem('task_spec_history', JSON.stringify(history), (err, ok) => err ? rej(err) : res(ok)));
1790:             } else {
1791:                 localStorage.setItem('task_spec_history', JSON.stringify(history));
1792:             }
1793:         } catch (e) { console.warn('[App] History save failed:', e); }
1794:     }
1795: 
1796:     async loadTaskSpecHistory() {
1797:         try {
1798:             let raw = null;
1799:             if (window.Telegram?.WebApp?.CloudStorage) {
1800:                 raw = await new Promise((res, rej) => Telegram.WebApp.CloudStorage.getItem('task_spec_history', (err, val) => err ? rej(err) : res(val)));
1801:             } else {
1802:                 raw = localStorage.getItem('task_spec_history');
1803:             }
1804:             this.taskSpecHistory = raw ? JSON.parse(raw) : [];
1805:         } catch (e) {
1806:             this.taskSpecHistory = [];
1807:         }
1808:         this.renderTaskSpecHistory();
1809:     }
1810: 
1811:     renderTaskSpecHistory() {
1812:         const list = document.getElementById('task-history-list');
1813:         if (!list) return;
1814:         list.innerHTML = '';
1815:         if (!this.taskSpecHistory?.length) {
1816:             list.innerHTML = '<div class="history-empty">История пуста</div>';
1817:             return;
1818:         }
1819:         this.taskSpecHistory.forEach((item, idx) => {
1820:             const el = document.createElement('div');
1821:             el.className = 'history-item';
1822:             const time = new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
1823:             el.innerHTML = `<span class="history-time">${time}</span><span class="history-text">${this.escapeHtml(item.text.slice(0, 60))}...</span>`;
1824:             el.onclick = () => {
1825:                 const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1826:                 if (input) input.value = item.text;
1827:                 telegram.haptic('light');
1828:             };
1829:             list.appendChild(el);
1830:         });
1831:     }
1832: 
1833:     // ─── Экспорт ТЗ ──────────────────────────────────────────────────────
1834:     exportTaskSpec() {
1835:         const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1836:         const spec = input?.value?.trim() || '';
1837:         const answers = this.contractAnswers || {};
1838:         if (!spec && !Object.keys(answers).length) return telegram.showAlert('Нет данных для экспорта');
1839: 
1840:         const payload = {
1841:             task_spec: spec,
1842:             contract_answers: answers,
1843:             exported_at: new Date().toISOString(),
1844:             user_id: telegram.getUserId?.() || 'unknown'
1845:         };
1846:         const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
1847:         const url = URL.createObjectURL(blob);
1848:         const a = document.createElement('a');
1849:         a.href = url;
1850:         a.download = `task_spec_${Date.now()}.json`;
1851:         document.body.appendChild(a);
1852:         a.click();
1853:         a.remove();
1854:         URL.revokeObjectURL(url);
1855:         telegram.haptic('success');
1856:     }
1857: }
1858: 
1859: let app;
1860: document.addEventListener('DOMContentLoaded', () => {
1861:     window.app = new NeuroEscrowApp();
1862:     app = window.app;
1863: });
1864: 
1865: window.addEventListener('message', (event) => {
1866:     if (event.data && event.data.type === 'bot_data' && app) {
1867:         app.handleBotData(event.data.payload);
1868:     }
1869: });
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
