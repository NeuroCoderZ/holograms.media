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
 16:   }
 17:   
 18:   async insertDocument(collectionName, document, vector = null) {
 19:     const url = `${this.endpoint}/api/json/v1/default_keyspace/${collectionName}`;
 20:     
 21:     const payload = {
 22:       insertOne: {
 23:         document: {
 24:           ...document,
 25:           ...(vector ? { $vector: vector } : {})
 26:         }
 27:       }
 28:     };
 29:     
 30:     const response = await fetch(url, {
 31:       method: 'POST',
 32:       headers: {
 33:         'Token': this.token,
 34:         'Content-Type': 'application/json'
 35:       },
 36:       body: JSON.stringify(payload)
 37:     });
 38:     
 39:     if (!response.ok) {
 40:       throw new Error(`AstraDB insert error: ${response.status}`);
 41:     }
 42:     
 43:     const data = await response.json();
 44:     return data.status?.insertedIds?.[0];
 45:   }
 46:   
 47:   async vectorSearch(collectionName, queryVector, limit = 5, filter = null, includeSimilarity = true) {
 48:     const url = `${this.endpoint}/api/json/v1/default_keyspace/${collectionName}`;
 49:     
 50:     const payload = {
 51:       find: {
 52:         sort: { $vector: queryVector },
 53:         options: {
 54:           limit,
 55:           includeSimilarity
 56:         }
 57:       }
 58:     };
 59:     
 60:     if (filter) {
 61:       payload.find.filter = filter;
 62:     }
 63:     
 64:     const response = await fetch(url, {
 65:       method: 'POST',
 66:       headers: {
 67:         'Token': this.token,
 68:         'Content-Type': 'application/json'
 69:       },
 70:       body: JSON.stringify(payload)
 71:     });
 72:     
 73:     if (!response.ok) {
 74:       throw new Error(`AstraDB search error: ${response.status}`);
 75:     }
 76:     
 77:     const data = await response.json();
 78:     return data.data?.documents || [];
 79:   }
 80:   
 81:   async deleteByFilter(collectionName, filter) {
 82:     const url = `${this.endpoint}/api/json/v1/default_keyspace/${collectionName}`;
 83:     
 84:     const payload = {
 85:       deleteMany: { filter }
 86:     };
 87:     
 88:     const response = await fetch(url, {
 89:       method: 'POST',
 90:       headers: {
 91:         'Token': this.token,
 92:         'Content-Type': 'application/json'
 93:       },
 94:       body: JSON.stringify(payload)
 95:     });
 96:     
 97:     if (!response.ok) {
 98:       throw new Error(`AstraDB delete error: ${response.status}`);
 99:     }
100:     
101:     const data = await response.json();
102:     return data.status?.deletedCount || 0;
103:   }
104:   
105:   async getStats(collectionName) {
106:     const url = `${this.endpoint}/api/json/v1/default_keyspace/${collectionName}`;
107:     
108:     const payload = {
109:       countDocuments: {}
110:     };
111:     
112:     const response = await fetch(url, {
113:       method: 'POST',
114:       headers: {
115:         'Token': this.token,
116:         'Content-Type': 'application/json'
117:       },
118:       body: JSON.stringify(payload)
119:     });
120:     
121:     if (!response.ok) {
122:       return {
123:         collection: collectionName,
124:         document_count: 0,
125:         status: 'error'
126:       };
127:     }
128:     
129:     const data = await response.json();
130:     const count = data.status?.count || 0;
131:     
132:     return {
133:       collection: collectionName,
134:       document_count: count,
135:       status: 'healthy'
136:     };
137:   }
138: }
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
  9: export class HermesAgent {
 10:   constructor(kvCache, env) {
 11:     this.apiKey = env?.MISTRAL_API_KEY;
 12:     if (!this.apiKey) {
 13:       throw new Error('MISTRAL_API_KEY not found in environment');
 14:     }
 15:     this.model = env?.MODEL_NAME || 'mistral-medium-3.5';
 16:     this.rag = new HermesRAG(kvCache, env);
 17:     this.sessions = new Map();
 18:     this.kvCache = kvCache;
 19:   }
 20:   
 21:   getSystemPrompt(persona = 'hermes') {
 22:     const prompts = {
 23:       hermes: `Ты — Гермес, интеллектуальный агент-посредник NeuroEscrow.
 24: 
 25: Твои возможности:
 26: - Глубокое понимание кодовой базы NeuroEscrow через RAG
 27: - Помощь в создании и проверке смарт-контрактов
 28: - Анализ фото и видео (документы, товары)
 29: - Ведение переговоров между сторонами сделки
 30: - Модерация контента и блокировка нарушителей
 31: 
 32: ВАЖНО:
 33: - Отвечай ТОЛЬКО на последнее сообщение пользователя.
 34: - Не используй устаревший контекст из предыдущих сессий.
 35: - Если вопрос неясен или не относится к предоставленному контексту — уточни у пользователя.
 36: - Не галлюцинируй: если не знаешь ответа — скажи об этом.
 37: - Отвечай кратко и строго по теме последнего сообщения.
 38: - Не упоминай технические ограничения API, лимиты моделей, сторонние технологии (CWT, нетгологлифы), если пользователь не спросил о них напрямую.
 39: - Никогда не начинай ответ с префиксов типа "[Tria]", "[Hermes]", "[AI]" или подобных.
 40: 
 41: Твой стиль:
 42: - Профессиональный, но дружелюбный
 43: - Краткие и точные ответы
 44: - Используешь эмодзи умеренно
 45: - Всегда объясняешь технические детали простым языком
 46: - Отвечай на русском языке, без использования markdown (**, *, #), с правильной пунктуацией, абзацами и отступами. Используй естественный русский стиль.`,
 47:       
 48:       client: `Ты — Гермес в режиме помощи клиенту.
 49: Фокус: помощь в создании сделки, объяснение условий, защита интересов клиента.`,
 50:       
 51:       creator: `Ты — Гермес в режиме помощи исполнителю.
 52: Фокус: помощь в выполнении заказа, проверка требований, защита от недобросовестных заказчиков.`
 53:     };
 54:     
 55:     return prompts[persona] || prompts.hermes;
 56:   }
 57:   
 58:   getSessionHistory(sessionId, limit = 10) {
 59:     if (!this.sessions.has(sessionId)) {
 60:       this.sessions.set(sessionId, []);
 61:     }
 62:     const history = this.sessions.get(sessionId);
 63:     return history.slice(-limit);
 64:   }
 65:   
 66:   addToSession(sessionId, role, content) {
 67:     if (!this.sessions.has(sessionId)) {
 68:       this.sessions.set(sessionId, []);
 69:     }
 70:     this.sessions.get(sessionId).push({
 71:       role,
 72:       content,
 73:       timestamp: new Date().toISOString()
 74:     });
 75:   }
 76:   
 77:   async buildContext(query, userId, sessionId) {
 78:     // Skip RAG for short messages (greetings, etc.)
 79:     if (!query || query.trim().length < 15) return '';
 80: 
 81:     const contextParts = [];
 82: 
 83:     // Search codebase with similarity threshold
 84:     const codebaseResults = await this.rag.searchCodebase(query, 5);
 85:     const filteredCodebase = codebaseResults.filter(r => (r.$similarity || 0) >= 0.65);
 86:     if (filteredCodebase.length > 0) {
 87:       contextParts.push('📚 Релевантный код из базы:');
 88:       filteredCodebase.forEach((result, i) => {
 89:         const filepath = result.filepath || 'unknown';
 90:         const text = (result.text || '').substring(0, 500);
 91:         const similarity = result.$similarity || 0;
 92:         contextParts.push(`\n${i + 1}. ${filepath} (similarity: ${similarity.toFixed(2)})\n\`\`\`\n${text}\n\`\`\``);
 93:       });
 94:     }
 95: 
 96:     // Search memory with similarity threshold
 97:     const memoryResults = await this.rag.searchMemory(query, userId, 4);
 98:     const filteredMemory = memoryResults.filter(r => (r.$similarity || 0) >= 0.65);
 99:     if (filteredMemory.length > 0) {
100:       contextParts.push('\n\n🧠 Из долгосрочной памяти:');
101:       filteredMemory.forEach((result, i) => {
102:         const content = result.content || '';
103:         const timestamp = result.timestamp || '';
104:         contextParts.push(`\n${i + 1}. [${timestamp}] ${content}`);
105:       });
106:     }
107:     
108:     return contextParts.join('');
109:   }
110:   
111:   async chat(message, userId, sessionId, persona = 'hermes', imageUrl = null, useRag = true) {
112:     // Moderate content
113:     const moderation = moderateContent(message);
114:     if (!moderation.safe) {
115:       return {
116:         response: `⚠️ Сообщение заблокировано: ${moderation.reason}`,
117:         blocked: true,
118:         reason: moderation.reason
119:       };
120:     }
121:     
122:     // Build context
123:     let context = '';
124:     if (useRag) {
125:       context = await this.buildContext(message, userId, sessionId);
126:     }
127:     
128:     // Get history
129:     const history = this.getSessionHistory(sessionId);
130:     
131:     // Build messages
132:     const messages = [
133:       { role: 'system', content: this.getSystemPrompt(persona) }
134:     ];
135:     
136:     if (context) {
137:       messages.push({
138:         role: 'system',
139:         content: `Контекст для ответа:\n${context}`
140:       });
141:     }
142:     
143:     // Add history
144:     history.forEach(msg => {
145:       messages.push({
146:         role: msg.role,
147:         content: msg.content
148:       });
149:     });
150:     
151:     // Add current message
152:     if (imageUrl) {
153:       messages.push({
154:         role: 'user',
155:         content: [
156:           { type: 'text', text: message },
157:           { type: 'image_url', image_url: { url: imageUrl } }
158:         ]
159:       });
160:     } else {
161:       messages.push({
162:         role: 'user',
163:         content: message
164:       });
165:     }
166:     
167:     // Call Mistral API
168:     try {
169:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
170:         method: 'POST',
171:         headers: {
172:           'Authorization': `Bearer ${this.apiKey}`,
173:           'Content-Type': 'application/json'
174:         },
175:         body: JSON.stringify({
176:           model: this.model,
177:           messages,
178:           temperature: 0.7,
179:           max_tokens: 2000
180:         })
181:       });
182:       
183:       if (!response.ok) {
184:         throw new Error(`Mistral API error: ${response.status}`);
185:       }
186:       
187:       const data = await response.json();
188:       let assistantMessage = data.choices[0].message.content;
189:       
190:       // Sanitize response: remove [Tria] and similar prefixes
191:       assistantMessage = assistantMessage.replace(/^\[(Tria|Hermes|AI|Bot)\]\s*/i, '').trim();
192:       
193:       // Add to session
194:       this.addToSession(sessionId, 'user', message);
195:       this.addToSession(sessionId, 'assistant', assistantMessage);
196:       
197:       // Save to memory (substantial messages only)
198:       if (message.length > 50) {
199:         await this.rag.addMemory(
200:           userId,
201:           sessionId,
202:           `User: ${message}\nHermes: ${assistantMessage}`,
203:           'conversation'
204:         );
205:       }
206:       
207:       return {
208:         response: assistantMessage,
209:         blocked: false,
210:         context_used: !!context,
211:         tokens_used: data.usage?.total_tokens || 0
212:       };
213:       
214:     } catch (error) {
215:       return {
216:         response: `❌ Ошибка: ${error.message}`,
217:         error: true,
218:         error_message: error.message
219:       };
220:     }
221:   }
222:   
223:   async analyzeImage(imageUrl, prompt, userId, sessionId) {
224:     return this.chat(prompt, userId, sessionId, 'hermes', imageUrl, false);
225:   }
226:   
227:   async getSessionSummary(sessionId) {
228:     const history = this.getSessionHistory(sessionId, 100);
229:     
230:     if (history.length === 0) {
231:       return 'Нет истории сессии';
232:     }
233:     
234:     const conversation = history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
235:     
236:     const messages = [
237:       {
238:         role: 'system',
239:         content: 'Создай краткое резюме этого разговора (2-3 предложения).'
240:       },
241:       {
242:         role: 'user',
243:         content: conversation
244:       }
245:     ];
246:     
247:     try {
248:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
249:         method: 'POST',
250:         headers: {
251:           'Authorization': `Bearer ${this.apiKey}`,
252:           'Content-Type': 'application/json'
253:         },
254:         body: JSON.stringify({
255:           model: this.model,
256:           messages,
257:           temperature: 0.5,
258:           max_tokens: 200
259:         })
260:       });
261:       
262:       const data = await response.json();
263:       return data.choices[0].message.content;
264:       
265:     } catch (error) {
266:       return `Ошибка создания резюме: ${error.message}`;
267:     }
268:   }
269:   
270:   clearSession(sessionId) {
271:     this.sessions.delete(sessionId);
272:   }
273: }
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
 85:       // Image analysis
 86:       if (url.pathname === '/analyze-image' && request.method === 'POST') {
 87:         const data = await request.json();
 88:         const { image_url, prompt = 'Опиши это изображение', user_id = 'anonymous', session_id = 'default' } = data;
 89: 
 90:         if (!image_url) {
 91:           return new Response(JSON.stringify({ error: 'image_url is required' }), {
 92:             status: 400,
 93:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 94:           });
 95:         }
 96: 
 97:         const hermes = new HermesAgent(env.CACHE, env);
 98:         const result = await hermes.analyzeImage(image_url, prompt, user_id, session_id);
 99: 
100:         return new Response(JSON.stringify(result), {
101:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
102:         });
103:       }
104: 
105:       // Stats
106:       if (url.pathname === '/stats') {
107:         const rag = new HermesRAG(env.CACHE, env);
108:         const stats = await rag.getStats();
109: 
110:         return new Response(JSON.stringify(stats), {
111:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
112:         });
113:       }
114: 
115:       // Sessions list
116:       if (url.pathname === '/sessions') {
117:         const sessions = await listSessions(env);
118:         return new Response(JSON.stringify(sessions), {
119:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
120:         });
121:       }
122: 
123:       // Load session
124:       if (url.pathname.startsWith('/session/') && request.method === 'GET') {
125:         const sessionId = url.pathname.split('/')[2];
126:         const session = await loadSession(env, sessionId);
127:         return new Response(JSON.stringify(session || { messages: [] }), {
128:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
129:         });
130:       }
131: 
132:       // Create session
133:       if (url.pathname === '/session' && request.method === 'POST') {
134:         const data = await request.json();
135:         const sessionId = data?.session_id || crypto.randomUUID();
136:         const session = {
137:           id: sessionId,
138:           messages: [],
139:           created_at: new Date().toISOString(),
140:           updated_at: new Date().toISOString()
141:         };
142:         await env.CACHE.put(
143:           `${SESSION_PREFIX}${sessionId}`,
144:           JSON.stringify(session),
145:           { expirationTtl: SESSION_TTL }
146:         );
147:         return new Response(JSON.stringify({ session_id: sessionId }), {
148:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
149:         });
150:       }
151: 
152:       // Delete session
153:       if (url.pathname.startsWith('/session/') && request.method === 'DELETE') {
154:         const sessionId = url.pathname.split('/')[2];
155:         await env.CACHE.delete(`${SESSION_PREFIX}${sessionId}`);
156:         return new Response(JSON.stringify({ ok: true }), {
157:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
158:         });
159:       }
160: 
161:       // Telegram webhook endpoint
162:       if (url.pathname === '/webhook/telegram' && request.method === 'POST') {
163:         const update = await request.json();
164:         const hermes = new HermesAgent(env.CACHE, env);
165:         const result = await handleTelegramUpdate(update, env, hermes);
166:         return new Response(JSON.stringify(result), {
167:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
168:         });
169:       }
170: 
171:       return new Response(JSON.stringify({ error: 'Not found' }), {
172:         status: 404,
173:         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
174:       });
175: 
176:     } catch (error) {
177:       return new Response(JSON.stringify({ error: error.message }), {
178:         status: 500,
179:         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
180:       });
181:     }
182:   },
183: 
184:   // Scheduled handler for session cleanup (cron trigger)
185:   async scheduled(event, env, ctx) {
186:     ctx.waitUntil(cleanupExpiredSessions(env));
187:   }
188: };
189: 
190: // === KV Session Helpers ===
191: 
192: async function saveSession(env, sessionId, history) {
193:   if (!env.CACHE || !sessionId || sessionId === 'default') return;
194: 
195:   try {
196:     const key = `${SESSION_PREFIX}${sessionId}`;
197:     const existing = await env.CACHE.get(key);
198:     const session = existing ? JSON.parse(existing) : {
199:       id: sessionId,
200:       messages: [],
201:       created_at: new Date().toISOString()
202:     };
203: 
204:     session.messages = history.slice(-50); // Keep last 50 messages
205:     session.updated_at = new Date().toISOString();
206: 
207:     await env.CACHE.put(key, JSON.stringify(session), {
208:       expirationTtl: SESSION_TTL
209:     });
210:   } catch (error) {
211:     // KV errors are non-critical
212:   }
213: }
214: 
215: async function loadSession(env, sessionId) {
216:   if (!env.CACHE) return null;
217: 
218:   try {
219:     const key = `${SESSION_PREFIX}${sessionId}`;
220:     const data = await env.CACHE.get(key);
221:     return data ? JSON.parse(data) : null;
222:   } catch (error) {
223:     return null;
224:   }
225: }
226: 
227: async function listSessions(env) {
228:   if (!env.CACHE) return [];
229: 
230:   try {
231:     const list = await env.CACHE.list({ prefix: SESSION_PREFIX });
232:     return list.keys.map(key => ({
233:       id: key.name.replace(SESSION_PREFIX, ''),
234:       updated_at: key.metadata?.updated_at || null
235:     }));
236:   } catch (error) {
237:     return [];
238:   }
239: }
240: 
241: async function cleanupExpiredSessions(env) {
242:   if (!env.CACHE) return;
243: 
244:   try {
245:     const list = await env.CACHE.list({ prefix: SESSION_PREFIX });
246:     const now = Date.now();
247:     let cleaned = 0;
248: 
249:     for (const key of list.keys) {
250:       // KV with expirationTtl handles auto-cleanup,
251:       // but we can force-delete stale sessions older than 48h
252:       if (key.metadata?.updated_at) {
253:         const updated = new Date(key.metadata.updated_at).getTime();
254:         if (now - updated > 172800000) { // 48h
255:           await env.CACHE.delete(key.name);
256:           cleaned++;
257:         }
258:       }
259:     }
260: 
261:     console.log(`Session cleanup: ${cleaned} expired sessions removed`);
262:   } catch (error) {
263:     console.error(`Session cleanup error: ${error.message}`);
264:   }
265: }
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
  1: /* NeuroEscrow — Minimalist Dark Theme (holograms.media + X style) */
  2: 
  3: :root {
  4:     /* Colors from holograms.media */
  5:     --ne-black: #000000;
  6:     --ne-dark-gray: rgba(255, 255, 255, 0.05);
  7:     --ne-gray: rgba(255, 255, 255, 0.1);
  8:     --ne-light-gray: rgba(255, 255, 255, 0.34);
  9:     --ne-white: #dddddd;
 10:     --ne-accent: #dddddd; /* Changed from green to white */
 11:     --ne-border: rgba(255, 255, 255, 0.1);
 12:     
 13:     /* Spacing */
 14:     --ne-spacing-xs: 4px;
 15:     --ne-spacing-sm: 8px;
 16:     --ne-spacing-md: 12px;
 17:     --ne-spacing-lg: 16px;
 18:     --ne-spacing-xl: 24px;
 19: }
 20: 
 21: * {
 22:     margin: 0;
 23:     padding: 0;
 24:     box-sizing: border-box;
 25:     -webkit-tap-highlight-color: transparent;
 26: }
 27: 
 28: html, body {
 29:     font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
 30:     background: var(--ne-black);
 31:     color: var(--ne-white);
 32:     height: var(--tg-viewport-stable-height, 100dvh);
 33:     width: 100vw;
 34:     margin: 0;
 35:     padding: 0;
 36:     overflow-x: hidden;
 37: }
 38: 
 39: #app {
 40:     display: flex;
 41:     flex-direction: column;
 42:     height: var(--tg-viewport-stable-height, 100dvh);
 43:     width: 100vw;
 44: }
 45: 
 46: /* Header */
 47: .app-header {
 48:     background: var(--ne-black);
 49:     border-bottom: 1px solid var(--ne-border);
 50:     padding: var(--ne-spacing-md) var(--ne-spacing-lg);
 51:     flex-shrink: 0;
 52: }
 53: 
 54: .header-content {
 55:     display: flex;
 56:     justify-content: space-between;
 57:     align-items: center;
 58: }
 59: 
 60: .app-header h1 {
 61:     font-size: 18px;
 62:     font-weight: 600;
 63:     color: var(--ne-white);
 64:     letter-spacing: -0.5px;
 65: }
 66: 
 67: .user-info {
 68:     font-size: 13px;
 69:     color: var(--ne-light-gray);
 70: }
 71: 
 72: /* Main Content */
 73: .app-main {
 74:     flex: 1;
 75:     overflow-y: auto;
 76:     overflow-x: hidden;
 77:     padding: var(--ne-spacing-lg);
 78:     padding-bottom: 80px;
 79:     -webkit-overflow-scrolling: touch;
 80: }
 81: 
 82: /* Voice Interface (Main Screen) */
 83: .voice-interface {
 84:     display: flex;
 85:     flex-direction: column;
 86:     align-items: center;
 87:     justify-content: center;
 88:     min-height: 60vh;
 89:     text-align: center;
 90: }
 91: 
 92: .voice-button {
 93:     width: 120px;
 94:     height: 120px;
 95:     border-radius: 50%;
 96:     background: var(--ne-dark-gray);
 97:     border: 2px solid var(--ne-border);
 98:     display: flex;
 99:     align-items: center;
100:     justify-content: center;
101:     cursor: pointer;
102:     transition: all 0.3s ease;
103:     margin-bottom: var(--ne-spacing-xl);
104:     position: relative;
105: }
106: 
107: .voice-button::before {
108:     content: '';
109:     position: absolute;
110:     width: 100%;
111:     height: 100%;
112:     border-radius: 50%;
113:     border: 2px solid var(--ne-white);
114:     opacity: 0;
115:     transition: opacity 0.3s ease;
116: }
117: 
118: .voice-button:active {
119:     transform: scale(0.95);
120: }
121: 
122: .voice-button.recording {
123:     border-color: var(--ne-white);
124:     animation: pulse 1.5s ease-in-out infinite;
125: }
126: 
127: .voice-button.recording::before {
128:     opacity: 0.3;
129:     animation: ripple 1.5s ease-out infinite;
130: }
131: 
132: @keyframes pulse {
133:     0%, 100% { transform: scale(1); }
134:     50% { transform: scale(1.05); }
135: }
136: 
137: @keyframes ripple {
138:     0% {
139:         transform: scale(1);
140:         opacity: 0.3;
141:     }
142:     100% {
143:         transform: scale(1.4);
144:         opacity: 0;
145:     }
146: }
147: 
148: .voice-icon {
149:     font-size: 48px;
150: }
151: 
152: .voice-hint {
153:     font-size: 14px;
154:     color: var(--ne-light-gray);
155:     margin-top: var(--ne-spacing-md);
156: }
157: 
158: .voice-status {
159:     font-size: 13px;
160:     color: var(--ne-white);
161:     margin-top: var(--ne-spacing-sm);
162:     min-height: 20px;
163: }
164: 
165: /* Bottom Navigation */
166: .bottom-nav {
167:     position: fixed;
168:     bottom: 0;
169:     left: 0;
170:     right: 0;
171:     display: flex;
172:     justify-content: space-around;
173:     background: var(--ne-black);
174:     border-top: 1px solid var(--ne-border);
175:     padding: var(--ne-spacing-sm) 0 calc(var(--ne-spacing-sm) + env(safe-area-inset-bottom));
176: }
177: 
178: .nav-btn {
179:     display: flex;
180:     flex-direction: column;
181:     align-items: center;
182:     gap: 2px;
183:     padding: var(--ne-spacing-xs) var(--ne-spacing-lg);
184:     border: none;
185:     background: none;
186:     color: var(--ne-light-gray);
187:     font-size: 11px;
188:     cursor: pointer;
189:     transition: color 0.2s;
190: }
191: 
192: .nav-btn.active {
193:     color: var(--ne-white);
194: }
195: 
196: .nav-icon {
197:     font-size: 22px;
198:     line-height: 1;
199: }
200: 
201: .nav-label {
202:     font-weight: 500;
203: }
204: 
205: /* Cards */
206: .card {
207:     background: var(--ne-dark-gray);
208:     border: 1px solid var(--ne-border);
209:     border-radius: 8px;
210:     padding: var(--ne-spacing-lg);
211:     margin-bottom: var(--ne-spacing-md);
212: }
213: 
214: .draft-card {
215:     background: rgba(255, 255, 255, 0.03);
216:     border-left-width: 3px;
217: }
218: 
219: .card-title {
220:     font-size: 15px;
221:     font-weight: 600;
222:     margin-bottom: var(--ne-spacing-sm);
223:     color: var(--ne-white);
224: }
225: 
226: .card-subtitle {
227:     font-size: 13px;
228:     color: var(--ne-light-gray);
229:     margin-bottom: var(--ne-spacing-md);
230: }
231: 
232: /* Buttons */
233: .btn {
234:     display: inline-flex;
235:     align-items: center;
236:     justify-content: center;
237:     gap: 6px;
238:     padding: 10px 20px;
239:     border-radius: 6px;
240:     border: 1px solid var(--ne-border);
241:     font-size: 14px;
242:     font-weight: 500;
243:     cursor: pointer;
244:     transition: all 0.2s;
245:     width: 100%;
246:     background: var(--ne-dark-gray);
247:     color: var(--ne-white);
248: }
249: 
250: .btn:active {
251:     transform: scale(0.98);
252: }
253: 
254: .btn-primary {
255:     background: var(--ne-white);
256:     color: var(--ne-black);
257:     border-color: var(--ne-white);
258: }
259: 
260: .btn-secondary {
261:     background: var(--ne-dark-gray);
262:     color: var(--ne-white);
263:     border-color: var(--ne-border);
264: }
265: 
266: .btn-success {
267:     background: var(--ne-white);
268:     color: var(--ne-black);
269:     border-color: var(--ne-white);
270: }
271: 
272: /* Forms */
273: .form-group {
274:     margin-bottom: var(--ne-spacing-lg);
275: }
276: 
277: .form-label {
278:     display: block;
279:     font-size: 13px;
280:     font-weight: 500;
281:     color: var(--ne-light-gray);
282:     margin-bottom: var(--ne-spacing-sm);
283:     text-transform: uppercase;
284:     letter-spacing: 0.5px;
285: }
286: 
287: .form-input {
288:     width: 100%;
289:     padding: 12px 14px;
290:     border-radius: 6px;
291:     border: 1px solid var(--ne-border);
292:     background: var(--ne-dark-gray);
293:     color: var(--ne-white);
294:     font-size: 14px;
295:     outline: none;
296:     transition: border-color 0.2s;
297: }
298: 
299: .form-input:focus {
300:     border-color: var(--ne-light-gray);
301: }
302: 
303: /* Empty State */
304: .empty-state {
305:     text-align: center;
306:     padding: 48px 24px;
307:     color: var(--ne-light-gray);
308: }
309: 
310: .empty-icon {
311:     font-size: 48px;
312:     margin-bottom: var(--ne-spacing-md);
313:     opacity: 0.5;
314: }
315: 
316: .empty-text {
317:     font-size: 14px;
318: }
319: 
320: /* Scrollbar */
321: ::-webkit-scrollbar {
322:     width: 4px;
323: }
324: 
325: ::-webkit-scrollbar-track {
326:     background: transparent;
327: }
328: 
329: ::-webkit-scrollbar-thumb {
330:     background: var(--ne-light-gray);
331:     border-radius: 2px;
332: }
333: 
334: /* Animations */
335: @keyframes fadeIn {
336:     from { opacity: 0; transform: translateY(8px); }
337:     to { opacity: 1; transform: translateY(0); }
338: }
339: 
340: .view {
341:     animation: fadeIn 0.25s ease-out;
342: }
343: 
344: /* Chat Interface */
345: .chat-messages {
346:     display: flex;
347:     flex-direction: column;
348:     gap: var(--ne-spacing-md);
349:     padding: var(--ne-spacing-lg) 0;
350:     max-height: 50vh;
351:     overflow-y: auto;
352:     padding-bottom: 120px;
353: }
354: 
355: .chat-message {
356:     display: flex;
357:     flex-direction: column;
358:     gap: 4px;
359:     animation: fadeIn 0.3s ease-out;
360: }
361: 
362: .chat-message.user {
363:     align-items: flex-end;
364: }
365: 
366: .chat-message.hermes {
367:     align-items: flex-start;
368: }
369: 
370: .chat-message.system {
371:     align-items: center;
372: }
373: 
374: .message-bubble {
375:     max-width: 75%;
376:     padding: 10px 14px;
377:     border-radius: 16px;
378:     font-size: 14px;
379:     line-height: 1.4;
380:     word-wrap: break-word;
381:     position: relative;
382: }
383: 
384: .chat-message.user .message-bubble {
385:     background: var(--ne-white);
386:     color: var(--ne-black);
387:     border-bottom-right-radius: 4px;
388: }
389: 
390: .chat-message.hermes .message-bubble {
391:     background: var(--ne-dark-gray);
392:     color: var(--ne-white);
393:     border: 1px solid var(--ne-border);
394:     border-bottom-left-radius: 4px;
395: }
396: 
397: .chat-message.system .message-bubble {
398:     background: rgba(255, 255, 255, 0.05);
399:     color: var(--ne-light-gray);
400:     border: 1px solid var(--ne-border);
401:     border-radius: 12px;
402:     font-size: 12px;
403:     text-align: center;
404: }
405: 
406: .message-time {
407:     font-size: 10px;
408:     color: var(--ne-light-gray);
409:     padding: 0 8px;
410:     opacity: 0.6;
411:     text-align: right;
412: }
413: 
414: /* Typing indicator */
415: .typing-indicator {
416:     display: flex;
417:     align-items: center;
418:     gap: 4px;
419:     padding: 8px 14px;
420:     font-size: 12px;
421:     color: var(--ne-light-gray);
422: }
423: 
424: .typing-indicator .dot {
425:     width: 6px;
426:     height: 6px;
427:     border-radius: 50%;
428:     background: var(--ne-light-gray);
429:     animation: typing-bounce 1.4s infinite;
430: }
431: 
432: .typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
433: .typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }
434: 
435: @keyframes typing-bounce {
436:     0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
437:     30% { transform: translateY(-4px); opacity: 1; }
438: }
439: 
440: .message-media {
441:     max-width: 75%;
442:     border-radius: 12px;
443:     overflow: hidden;
444:     border: 1px solid var(--ne-border);
445: }
446: 
447: .message-media img,
448: .message-media video {
449:     width: 100%;
450:     display: block;
451: }
452: 
453: /* Chat Input Container */
454: .chat-input-container {
455:     position: fixed;
456:     bottom: 60px;
457:     left: 0;
458:     right: 0;
459:     background: var(--ne-black);
460:     border-top: 1px solid var(--ne-border);
461:     padding: var(--ne-spacing-sm) var(--ne-spacing-lg);
462:     display: flex;
463:     align-items: center;
464:     gap: var(--ne-spacing-sm);
465:     z-index: 100;
466: }
467: 
468: .attach-btn,
469: .send-btn {
470:     width: 36px;
471:     height: 36px;
472:     border-radius: 50%;
473:     border: 1px solid var(--ne-border);
474:     background: var(--ne-dark-gray);
475:     color: var(--ne-white);
476:     display: flex;
477:     align-items: center;
478:     justify-content: center;
479:     cursor: pointer;
480:     transition: all 0.2s;
481:     font-size: 18px;
482:     flex-shrink: 0;
483: }
484: 
485: .attach-btn:active,
486: .send-btn:active {
487:     transform: scale(0.9);
488: }
489: 
490: .send-btn {
491:     background: var(--ne-white);
492:     color: var(--ne-black);
493:     border-color: var(--ne-white);
494: }
495: 
496: .chat-input {
497:     flex: 1;
498:     padding: 10px 14px;
499:     border-radius: 18px;
500:     border: 1px solid var(--ne-border);
501:     background: var(--ne-dark-gray);
502:     color: var(--ne-white);
503:     font-size: 14px;
504:     outline: none;
505:     transition: border-color 0.2s;
506: }
507: 
508: .chat-input:focus {
509:     border-color: var(--ne-light-gray);
510: }
511: 
512: /* Attach Menu */
513: .attach-menu {
514:     position: fixed;
515:     bottom: 100px;
516:     left: var(--ne-spacing-lg);
517:     right: var(--ne-spacing-lg);
518:     background: var(--ne-dark-gray);
519:     border: 1px solid var(--ne-border);
520:     border-radius: 12px;
521:     padding: var(--ne-spacing-sm);
522:     display: grid;
523:     grid-template-columns: repeat(2, 1fr);
524:     gap: var(--ne-spacing-sm);
525:     z-index: 101;
526:     animation: fadeIn 0.2s ease-out;
527: }
528: 
529: .attach-option {
530:     display: flex;
531:     flex-direction: column;
532:     align-items: center;
533:     gap: 6px;
534:     padding: var(--ne-spacing-lg);
535:     border-radius: 8px;
536:     border: 1px solid var(--ne-border);
537:     background: var(--ne-black);
538:     color: var(--ne-white);
539:     font-size: 12px;
540:     cursor: pointer;
541:     transition: all 0.2s;
542: }
543: 
544: .attach-option:active {
545:     transform: scale(0.95);
546: }
547: 
548: .attach-icon {
549:     font-size: 28px;
550: }
551: 
552: /* Video Recording Interface */
553: .video-recording {
554:     position: fixed;
555:     top: 0;
556:     left: 0;
557:     right: 0;
558:     bottom: 0;
559:     background: var(--ne-black);
560:     z-index: 200;
561:     display: flex;
562:     flex-direction: column;
563: }
564: 
565: .video-preview {
566:     flex: 1;
567:     position: relative;
568:     background: var(--ne-black);
569: }
570: 
571: .video-preview video {
572:     width: 100%;
573:     height: 100%;
574:     object-fit: cover;
575: }
576: 
577: .video-controls {
578:     position: absolute;
579:     bottom: 0;
580:     left: 0;
581:     right: 0;
582:     padding: var(--ne-spacing-xl);
583:     display: flex;
584:     justify-content: center;
585:     align-items: center;
586:     gap: var(--ne-spacing-lg);
587:     background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
588: }
589: 
590: .video-record-btn {
591:     width: 64px;
592:     height: 64px;
593:     border-radius: 50%;
594:     border: 4px solid var(--ne-white);
595:     background: transparent;
596:     cursor: pointer;
597:     transition: all 0.2s;
598: }
599: 
600: .video-record-btn.recording {
601:     background: #ff0000;
602:     border-radius: 12px;
603: }
604: 
605: .camera-switch-btn {
606:     width: 48px;
607:     height: 48px;
608:     border-radius: 50%;
609:     border: 1px solid var(--ne-border);
610:     background: rgba(0,0,0,0.5);
611:     color: var(--ne-white);
612:     font-size: 24px;
613:     cursor: pointer;
614:     display: flex;
615:     align-items: center;
616:     justify-content: center;
617: }
618: 
619: /* Responsive */
620: @media (min-width: 768px) {
621:     .app-main {
622:         max-width: none !important;
623:         margin: 0;
624:     }
625:     
626:     .chat-input-container {
627:         max-width: none;
628:         left: 0;
629:         transform: none;
630:     }
631:     
632:     .attach-menu {
633:         max-width: none;
634:         left: var(--ne-spacing-lg);
635:         transform: none;
636:     }
637: }
638: 
639: /* Telegram Mini App Desktop Fullscreen Override */
640: @media (min-width: 768px) {
641:     html, body, #app, .app-main, .container, .tg-web-app {
642:         max-width: none !important;
643:         width: 100vw !important;
644:         height: var(--tg-viewport-stable-height, 100dvh) !important;
645:         margin: 0 !important;
646:         padding: 0 !important;
647:         overflow-x: hidden !important;
648:     }
649: }
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
 21:         
 22:         this.init();
 23:     }
 24: 
 25:     async init() {
 26:         if (window.Telegram?.WebApp) {
 27:             const tg = window.Telegram.WebApp;
 28:             tg.ready();
 29:             // Bot API 8.0+: requestFullscreen for desktop/immersive, fallback to expand()
 30:             if (typeof tg.requestFullscreen === 'function') {
 31:                 tg.requestFullscreen();
 32:             } else {
 33:                 tg.expand();
 34:             }
 35:         }
 36:         this.userData = telegram.getUser();
 37:         this.updateHeader();
 38:         await this.loadCache();
 39:         this.navigate('hermes');
 40:         
 41:         window.addEventListener('ton:statusChange', (e) => {
 42:             this.onTonStatusChange(e.detail);
 43:         });
 44:         
 45:         this.requestDataFromBot();
 46: 
 47:         // Fullscreen button handler (user gesture required on TG Desktop)
 48:         const fsBtn = document.getElementById('tg-fullscreen-btn');
 49:         if (fsBtn && window.Telegram?.WebApp) {
 50:             const tg = window.Telegram.WebApp;
 51:             if (typeof tg.requestFullscreen === 'function') {
 52:                 fsBtn.addEventListener('click', () => {
 53:                     tg.requestFullscreen().catch(e => console.warn('[TG] Fullscreen blocked:', e));
 54:                 });
 55:                 // Hide button if already in fullscreen
 56:                 if (tg.isFullscreen === true) {
 57:                     fsBtn.style.display = 'none';
 58:                 }
 59:                 // Listen for fullscreen changes
 60:                 tg.onEvent('fullscreenChanged', () => {
 61:                     if (fsBtn) fsBtn.style.display = tg.isFullscreen ? 'none' : 'inline-block';
 62:                 });
 63:             } else {
 64:                 fsBtn.style.display = 'none';
 65:             }
 66:         }
 67: 
 68:         // Enter key fix for chat input — prevent form submit / page reload
 69:         const chatInput = document.getElementById('chat-input');
 70:         if (chatInput) {
 71:             chatInput.addEventListener('keydown', (e) => {
 72:                 if (e.key === 'Enter' && !e.shiftKey) {
 73:                     e.preventDefault();
 74:                     this.sendTextMessage();
 75:                 }
 76:             });
 77:         }
 78: 
 79:         // Prevent any accidental form submit if input is wrapped in <form>
 80:         const chatContainer = document.getElementById('chat-input-container');
 81:         if (chatContainer) {
 82:             chatContainer.addEventListener('submit', (e) => e.preventDefault());
 83:         }
 84: 
 85:         // Ensure send button is type="button" not "submit"
 86:         const sendBtn = document.getElementById('send-btn');
 87:         if (sendBtn && !sendBtn.getAttribute('type')) {
 88:             sendBtn.setAttribute('type', 'button');
 89:         }
 90:     }
 91: 
 92:     updateHeader() {
 93:         const nameEl = document.getElementById('user-name');
 94:         
 95:         if (this.userData) {
 96:             const name = this.userData.first_name || this.userData.username || 'Пользователь';
 97:             nameEl.textContent = name;
 98:         } else {
 99:             nameEl.textContent = 'Гость';
100:         }
101:     }
102: 
103:     navigate(view) {
104:         // Reset voice state when switching tabs
105:         if (view !== 'hermes' && this.voiceState !== 'IDLE') {
106:             this.resetVoiceState();
107:         }
108:         
109:         this.currentView = view;
110:         
111:         document.querySelectorAll('.nav-btn').forEach(btn => {
112:             btn.classList.toggle('active', btn.dataset.view === view);
113:         });
114:         
115:         const main = document.getElementById('main-content');
116:         main.innerHTML = '';
117:         
118:         // Show/hide chat input based on view
119:         const chatInput = document.getElementById('chat-input-container');
120:         if (chatInput) {
121:             chatInput.style.display = view === 'hermes' ? 'flex' : 'none';
122:         }
123:         
124:         switch(view) {
125:             case 'hermes':
126:                 this.renderHermesView(main);
127:                 break;
128:             case 'deals':
129:                 this.renderDealsView(main);
130:                 break;
131:             case 'profile':
132:                 this.renderProfileView(main);
133:                 break;
134:         }
135:         
136:         telegram.haptic('light');
137:     }
138: 
139:     // -------------------------------------------------------------------------
140:     // Hermes View (Voice Interface - Main Screen)
141:     // -------------------------------------------------------------------------
142: 
143:     renderHermesView(container) {
144:         const view = document.createElement('div');
145:         view.className = 'view';
146:         
147:         view.innerHTML = `
148:             <div class="voice-interface">
149:                 <button class="voice-button" id="voice-btn" onclick="app.toggleVoice()">
150:                     <span class="voice-icon">🎙️</span>
151:                 </button>
152:                 <div style="font-size:16px;font-weight:600;margin-bottom:8px;">Гермес</div>
153:                 <div class="voice-hint">Нажмите и говорите</div>
154:                 <div class="voice-status" id="voice-status"></div>
155:                 <div style="font-size:13px;color:var(--ne-light-gray);margin-top:24px;max-width:300px;">
156:                     Опишите задачу голосом. Гермес поможет сформулировать и найдёт подходящего нейрокодера.
157:                 </div>
158:             </div>
159:             <div class="chat-messages" id="chat-messages"></div>
160:         `;
161:         
162:         container.appendChild(view);
163:         this.renderChatMessages();
164:     }
165: 
166:     toggleVoice() {
167:         // Explicit protection against multiple taps during processing
168:         if (this.voiceState === 'PROCESSING' || this.isProcessing) {
169:             return;
170:         }
171:         
172:         if (this.voiceState === 'LISTENING') {
173:             this.stopVoiceRecording();
174:         } else {
175:             this.voiceState = 'LISTENING';
176:             this.updateVoiceButton();
177:             this.startVoiceRecording();
178:         }
179:         
180:         telegram.haptic('medium');
181:     }
182: 
183:     async startVoiceRecording() {
184:         try {
185:             // Try native Telegram voice recording (Bot API 9.6+)
186:             if (typeof tg.requestVoiceMessage === 'function') {
187:                 const result = await tg.requestVoiceMessage();
188:                 
189:                 if (result && result.file_id) {
190:                     this.sendVoiceToBot(result.file_id, result.duration);
191:                 } else {
192:                     throw new Error('No file_id received');
193:                 }
194:             } else {
195:                 // Fallback to manual recording
196:                 this.fallbackToManualRecording();
197:             }
198:         } catch (error) {
199:             console.error('[NeuroEscrow] Voice recording failed:', error);
200:             this.handleVoiceError(error);
201:         }
202:     }
203: 
204:     stopVoiceRecording() {
205:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
206:             this.mediaRecorder.stop();
207:         }
208:         this.resetVoiceState();
209:     }
210: 
211:     fallbackToManualRecording() {
212:         navigator.mediaDevices.getUserMedia({ audio: true })
213:             .then(stream => {
214:                 this.mediaRecorder = new MediaRecorder(stream);
215:                 this.audioChunks = [];
216:                 
217:                 this.mediaRecorder.ondataavailable = (e) => {
218:                     this.audioChunks.push(e.data);
219:                 };
220:                 
221:                 this.mediaRecorder.onstop = () => {
222:                     const audioBlob = new Blob(this.audioChunks, { type: 'audio/ogg' });
223:                     this.uploadVoiceBlob(audioBlob);
224:                     stream.getTracks().forEach(track => track.stop());
225:                 };
226:                 
227:                 this.mediaRecorder.start();
228:                 console.log('[NeuroEscrow] Fallback recording started');
229:             })
230:             .catch(error => {
231:                 this.handleVoiceError(error);
232:             });
233:     }
234: 
235:     uploadVoiceBlob(blob) {
236:         // This would require bot-side endpoint for blob upload
237:         // For now, just show error
238:         this.handleVoiceError(new Error('Manual recording not yet implemented'));
239:     }
240: 
241:     sendVoiceToBot(fileId, duration) {
242:         this.voiceState = 'PROCESSING';
243:         this.isProcessing = true;
244:         this.updateVoiceButton();
245:         this.setupResponseTimeout();
246:         
247:         const payload = {
248:             action: 'voice_message',
249:             file_id: fileId,
250:             duration: duration,
251:             timestamp: Date.now(),
252:             user_id: telegram.getUserId()
253:         };
254:         
255:         telegram.sendData(payload);
256:         console.log('[NeuroEscrow] Voice sent to bot:', fileId);
257:     }
258: 
259:     updateVoiceButton() {
260:         const btn = document.getElementById('voice-btn');
261:         const status = document.getElementById('voice-status');
262:         
263:         if (!btn || !status) return;
264:         
265:         // Remove all state classes
266:         btn.classList.remove('recording', 'processing');
267:         
268:         switch (this.voiceState) {
269:             case 'IDLE':
270:                 status.textContent = '';
271:                 status.style.display = 'none';
272:                 this.isRecording = false;
273:                 break;
274:                 
275:             case 'LISTENING':
276:                 btn.classList.add('recording');
277:                 status.textContent = 'Слушаю...';
278:                 status.style.display = 'block';
279:                 this.isRecording = true;
280:                 break;
281:                 
282:             case 'PROCESSING':
283:                 btn.classList.add('processing');
284:                 status.textContent = 'Гермес обрабатывает...';
285:                 status.style.display = 'block';
286:                 this.isRecording = false;
287:                 break;
288:         }
289:     }
290: 
291:     setupResponseTimeout() {
292:         if (this.responseTimeout) {
293:             clearTimeout(this.responseTimeout);
294:         }
295:         
296:         this.responseTimeout = setTimeout(() => {
297:             if (this.voiceState === 'PROCESSING') {
298:                 this.handleVoiceError(new Error('timeout'));
299:             }
300:         }, 30000);
301:     }
302: 
303:     handleVoiceError(error) {
304:         console.error('[NeuroEscrow] Voice error:', error);
305:         
306:         this.resetVoiceState();
307:         
308:         let message = 'Ошибка записи голоса';
309:         
310:         if (error.message.includes('permission')) {
311:             message = 'Нет доступа к микрофону';
312:         } else if (error.message.includes('timeout')) {
313:             message = 'Превышено время ожидания';
314:         } else if (error.message.includes('cancelled')) {
315:             message = 'Запись отменена';
316:         }
317:         
318:         telegram.showAlert(message);
319:         telegram.hapticNotification('error');
320:     }
321: 
322:     resetVoiceState() {
323:         this.voiceState = 'IDLE';
324:         this.isRecording = false;
325:         this.isProcessing = false;
326:         this.updateVoiceButton();
327:         
328:         if (this.responseTimeout) {
329:             clearTimeout(this.responseTimeout);
330:             this.responseTimeout = null;
331:         }
332:     }
333: 
334:     handleDraftCreated(draft) {
335:         if (this.responseTimeout) {
336:             clearTimeout(this.responseTimeout);
337:         }
338:         
339:         // Check for duplicates
340:         const existingIndex = this.deals.findIndex(d => d.id === draft.id);
341:         if (existingIndex !== -1) {
342:             this.deals[existingIndex] = { ...draft, type: 'draft', isNew: true };
343:         } else {
344:             this.deals.unshift({ ...draft, type: 'draft', isNew: true });
345:         }
346:         
347:         this.resetVoiceState();
348:         this.saveCache(); // Save immediately after adding draft
349:         this.navigate('deals');
350:         
351:         telegram.hapticNotification('success');
352:         telegram.showAlert('Черновик создан');
353:         
354:         console.log('[NeuroEscrow] Draft created:', draft.id);
355:     }
356: 
357:     // -------------------------------------------------------------------------
358:     // Deals View
359:     // -------------------------------------------------------------------------
360: 
361:     renderDealsView(container) {
362:         const view = document.createElement('div');
363:         view.className = 'view';
364:         
365:         const deals = this.deals.length > 0 ? this.deals : this.getSampleDeals();
366:         
367:         view.innerHTML = `
368:             <h2 style="font-size:18px;margin-bottom:16px;font-weight:600;">Мои сделки</h2>
369:             ${deals.length === 0 ? this.emptyState('🤝', 'У вас пока нет сделок') : ''}
370:             <div id="deals-list">
371:                 ${deals.map(deal => deal.type === 'draft' ? this.renderDraftCard(deal) : this.dealCard(deal)).join('')}
372:             </div>
373:         `;
374:         
375:         container.appendChild(view);
376:     }
377: 
378:     renderDraftCard(draft) {
379:         const title = this.escapeHtml(draft.title || 'Без названия');
380:         const description = this.escapeHtml(draft.description || '');
381:         const budget = draft.budget || 'Не указан';
382:         const deadline = draft.deadline || 'Не указан';
383:         
384:         return `
385:             <div class="card draft-card" style="border-left:2px solid rgba(255, 255, 255, 0.34);">
386:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
387:                     <span style="font-size:12px;font-weight:600;color:rgba(255, 255, 255, 0.34);text-transform:uppercase;letter-spacing:0.5px;">Черновик</span>
388:                     <span style="font-size:11px;color:var(--ne-light-gray);">${this.formatDate(draft.created_at)}</span>
389:                 </div>
390:                 <div class="card-title">${title}</div>
391:                 <p style="font-size:13px;color:var(--ne-light-gray);margin:8px 0;">${description}</p>
392:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
393:                     <span>💰 ${budget}</span>
394:                     <span>⏱️ ${deadline}</span>
395:                 </div>
396:                 <div style="display:flex;gap:8px;margin-top:12px;">
397:                     <button class="btn btn-primary" onclick="app.editDraft('${draft.id}')" style="flex:1;">Редактировать</button>
398:                     <button class="btn btn-secondary" onclick="app.publishDraft('${draft.id}')" style="flex:1;">Опубликовать</button>
399:                 </div>
400:             </div>
401:         `;
402:     }
403: 
404:     dealCard(deal) {
405:         const statusColors = {
406:             'draft': 'rgba(255, 255, 255, 0.34)',
407:             'negotiating': '#dddddd',
408:             'in_progress': '#dddddd',
409:             'completed': 'rgba(255, 255, 255, 0.67)'
410:         };
411:         
412:         const statusNames = {
413:             'draft': 'Черновик',
414:             'negotiating': 'Переговоры',
415:             'in_progress': 'В работе',
416:             'completed': 'Завершена'
417:         };
418:         
419:         const color = statusColors[deal.status] || 'rgba(255, 255, 255, 0.34)';
420:         const statusName = statusNames[deal.status] || deal.status;
421:         
422:         return `
423:             <div class="card" style="border-left:2px solid ${color};">
424:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
425:                     <span style="font-size:12px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${statusName}</span>
426:                     <span style="font-size:11px;color:var(--ne-light-gray);">#${deal.id}</span>
427:                 </div>
428:                 <div class="card-title">${deal.title}</div>
429:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
430:                     <span>💰 ${deal.budget} USDT</span>
431:                     <span>👤 ${deal.counterparty}</span>
432:                 </div>
433:                 <div style="margin-top:12px;">
434:                     <button class="btn btn-secondary" onclick="app.viewDeal('${deal.id}')">Открыть в боте</button>
435:                 </div>
436:             </div>
437:         `;
438:     }
439: 
440:     getSampleDeals() {
441:         return [
442:             { id: 'a1b2', title: 'Telegram бот для интернет-магазина', status: 'in_progress', budget: '500', counterparty: 'client_42' },
443:             { id: 'c3d4', title: 'Парсер данных с сайта', status: 'completed', budget: '300', counterparty: 'client_17' },
444:         ];
445:     }
446: 
447:     viewDeal(dealId) {
448:         telegram.sendData({ action: 'view_deal', deal_id: dealId });
449:         telegram.showAlert('Открываю детали сделки в боте...');
450:     }
451: 
452:     editDraft(draftId) {
453:         telegram.sendData({ action: 'edit_draft', draft_id: draftId });
454:         telegram.showAlert('Открываю редактор в боте...');
455:     }
456: 
457:     publishDraft(draftId) {
458:         telegram.sendData({ action: 'publish_draft', draft_id: draftId });
459:         telegram.showAlert('Публикую черновик...');
460:     }
461: 
462:     escapeHtml(text) {
463:         const div = document.createElement('div');
464:         div.textContent = text;
465:         return div.innerHTML;
466:     }
467: 
468:     formatDate(timestamp) {
469:         if (!timestamp) return '';
470:         const date = new Date(timestamp * 1000);
471:         const now = new Date();
472:         const diff = now - date;
473:         
474:         if (diff < 60000) return 'только что';
475:         if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
476:         if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
477:         
478:         return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
479:     }
480: 
481:     // -------------------------------------------------------------------------
482:     // Profile View
483:     // -------------------------------------------------------------------------
484: 
485:     renderProfileView(container) {
486:         const view = document.createElement('div');
487:         view.className = 'view';
488:         
489:         view.innerHTML = `
490:             <div class="card" style="text-align:center;padding:24px;">
491:                 <div style="font-size:32px;font-weight:700;margin-bottom:8px;">${this.balance.toFixed(2)} USDT</div>
492:                 <div style="font-size:13px;color:var(--ne-light-gray);margin-bottom:20px;">Ваш баланс</div>
493:                 
494:                 <div style="display:flex;gap:8px;margin-bottom:16px;">
495:                     <button class="btn btn-primary" onclick="app.donate()" style="flex:1;">
496:                         💝 Поддержать
497:                     </button>
498:                     <button class="btn btn-secondary" onclick="app.leaveTip()" style="flex:1;">
499:                         ⭐ Чаевые
500:                     </button>
501:                 </div>
502:                 
503:                 <div style="font-size:11px;color:var(--ne-light-gray);margin-top:12px;">
504:                     TON • USDT • Telegram Stars
505:                 </div>
506:             </div>
507:             
508:             <div id="ton-connect" style="margin:16px 0;"></div>
509:             
510:             <div class="card">
511:                 <div class="card-title">Настройки</div>
512:                 <div class="form-group">
513:                     <label class="form-label">LLM Модель</label>
514:                     <select class="form-input" id="model-selector">
515:                         <option value="auto">Автоматически</option>
516:                         <option value="gpt-4">GPT-4</option>
517:                         <option value="claude">Claude</option>
518:                         <option value="grok">Grok</option>
519:                         <option value="custom">Своя модель</option>
520:                     </select>
521:                 </div>
522:             </div>
523:         `;
524:         
525:         container.appendChild(view);
526:         
527:         setTimeout(() => {
528:             tonConnect.init('ton-connect');
529:         }, 100);
530:     }
531: 
532:     donate() {
533:         telegram.showAlert('Выберите способ:\n\n⭐ Stars: 50, 100, 250, 500\n💎 TON: 1, 5, 10, 25\n💵 USDT: 5, 10, 25, 50');
534:     }
535: 
536:     leaveTip() {
537:         telegram.showAlert('Быстрые чаевые:\n\n10 ⭐ | 25 ⭐ | 50 ⭐ | 100 ⭐');
538:     }
539: 
540:     onTonStatusChange(detail) {
541:         console.log('[App] TON status changed:', detail);
542:     }
543: 
544:     async loadCache() {
545:         try {
546:             const cached = await telegram.cloudGet('neuroescrow_data');
547:             if (cached) {
548:                 this.deals = cached.deals || [];
549:                 this.balance = cached.balance || 0;
550:                 this.chatMessages = cached.chatMessages || [];
551:                 console.log('[App] Cache loaded');
552:             }
553:         } catch (e) {
554:             console.log('[App] No cache found');
555:         }
556:     }
557: 
558:     async saveCache() {
559:         const data = {
560:             deals: this.deals,
561:             balance: this.balance,
562:             chatMessages: this.chatMessages,
563:             timestamp: Date.now()
564:         };
565:         await telegram.cloudSet('neuroescrow_data', data);
566:     }
567: 
568:     requestDataFromBot() {
569:         telegram.sendData({ action: 'get_dashboard_data' });
570:     }
571: 
572:     handleBotData(data) {
573:         console.log('[App] Data from bot:', data);
574:         
575:         // Handle different event types
576:         if (data.event === 'draft_created' && data.draft) {
577:             this.handleDraftCreated(data.draft);
578:             return;
579:         }
580:         
581:         if (data.event === 'error') {
582:             this.handleVoiceError(new Error(data.error || 'Unknown error'));
583:             return;
584:         }
585: 
586:         if (data.event === 'hermes_reply' && data.text) {
587:             this.addChatMessage('hermes', data.text);
588:             return;
589:         }
590: 
591:         if (data.event === 'moderation_block') {
592:             telegram.showAlert('⚠️ Ваш контент нарушает правила платформы');
593:             return;
594:         }
595:         
596:         // Handle dashboard data
597:         if (data.deals) this.deals = data.deals;
598:         if (data.balance !== undefined) this.balance = data.balance;
599:         
600:         this.saveCache();
601:         
602:         const main = document.getElementById('main-content');
603:         main.innerHTML = '';
604:         switch(this.currentView) {
605:             case 'hermes': this.renderHermesView(main); break;
606:             case 'deals': this.renderDealsView(main); break;
607:             case 'profile': this.renderProfileView(main); break;
608:         }
609:     }
610: 
611:     emptyState(icon, text) {
612:         return `
613:             <div class="empty-state">
614:                 <div class="empty-icon">${icon}</div>
615:                 <div class="empty-text">${text}</div>
616:             </div>
617:         `;
618:     }
619: 
620:     // -------------------------------------------------------------------------
621:     // Chat Interface Methods
622:     // -------------------------------------------------------------------------
623: 
624:     renderChatMessages() {
625:         const container = document.getElementById('chat-messages');
626:         if (!container) return;
627: 
628:         container.innerHTML = this.chatMessages.map(msg => `
629:             <div class="chat-message ${msg.sender}">
630:                 <div class="message-bubble">
631:                     ${this.escapeHtml(msg.text)}
632:                     <span class="msg-time">${this.formatTime(msg.timestamp)}</span>
633:                 </div>
634:             </div>
635:         `).join('');
636: 
637:         container.scrollTop = container.scrollHeight;
638:     }
639: 
640:     addChatMessage(sender, text) {
641:         this.chatMessages.push({
642:             sender,
643:             text,
644:             timestamp: Date.now()
645:         });
646:         this.renderChatMessages();
647:         this.saveCache();
648:     }
649: 
650:     showTypingIndicator() {
651:         const container = document.getElementById('chat-messages');
652:         if (!container) return;
653:         const typing = document.createElement('div');
654:         typing.className = 'typing-indicator';
655:         typing.id = 'typing-indicator';
656:         typing.innerHTML = '<span>Гермес печатает</span><div class="dot"></div><div class="dot"></div><div class="dot"></div>';
657:         container.appendChild(typing);
658:         container.scrollTop = container.scrollHeight;
659:     }
660: 
661:     hideTypingIndicator() {
662:         const typing = document.getElementById('typing-indicator');
663:         if (typing) typing.remove();
664:     }
665: 
666:     async sendTextMessage() {
667:         const input = document.getElementById('chat-input');
668:         if (!input || !input.value.trim()) return;
669: 
670:         const text = input.value.trim();
671:         this.addChatMessage('user', text);
672:         input.value = '';
673: 
674:         telegram.haptic('light');
675: 
676:         // Call Hermes backend
677:         try {
678:             const workerUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
679:                 ? new URL('/chat', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
680:                 : 'https://neuroescrow-hermes.neurocoderz.workers.dev/chat';
681: 
682:             console.log('[Chat] Fetching:', workerUrl);
683: 
684:             // Show typing indicator
685:             this.showTypingIndicator();
686: 
687:             const response = await fetch(workerUrl, {
688:                 method: 'POST',
689:                 mode: 'cors',
690:                 credentials: 'omit',
691:                 headers: { 'Content-Type': 'application/json' },
692:                 body: JSON.stringify({
693:                     message: text,
694:                     user_id: telegram.getUserId(),
695:                     session_id: `tg_${telegram.getUserId()}`,
696:                     persona: 'hermes'
697:                 })
698:             });
699: 
700:             console.log('[Chat] Response status:', response.status, response.statusText);
701: 
702:             // Hide typing indicator immediately
703:             this.hideTypingIndicator();
704: 
705:             const data = await response.json();
706: 
707:             // Update DOM synchronously
708:             if (data.blocked) {
709:                 this.addChatMessage('system', `⚠️ ${data.reason}`);
710:             } else if (data.response) {
711:                 this.addChatMessage('hermes', data.response);
712:             } else if (data.error) {
713:                 this.addChatMessage('system', `❌ Ошибка: ${data.error_message || data.error}`);
714:             }
715:         } catch (error) {
716:             console.error('[Chat] Fetch failed:', error.message, error.stack);
717:             this.hideTypingIndicator();
718:             this.addChatMessage('system', '❌ Ошибка соединения с сервером');
719:         }
720:     }
721: 
722:     showAttachMenu() {
723:         const menu = document.getElementById('attach-menu');
724:         if (!menu) return;
725: 
726:         menu.style.display = menu.style.display === 'none' ? 'grid' : 'none';
727:         telegram.haptic('light');
728:     }
729: 
730:     hideAttachMenu() {
731:         const menu = document.getElementById('attach-menu');
732:         if (menu) menu.style.display = 'none';
733:     }
734: 
735:     attachPhoto() {
736:         this.hideAttachMenu();
737:         const input = document.createElement('input');
738:         input.type = 'file';
739:         input.accept = 'image/*';
740:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'photo');
741:         input.click();
742:     }
743: 
744:     attachVideo() {
745:         this.hideAttachMenu();
746:         const input = document.createElement('input');
747:         input.type = 'file';
748:         input.accept = 'video/*';
749:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'video');
750:         input.click();
751:     }
752: 
753:     async recordVideo() {
754:         this.hideAttachMenu();
755:         try {
756:             const stream = await navigator.mediaDevices.getUserMedia({
757:                 video: { facingMode: this.currentFacingMode },
758:                 audio: true
759:             });
760:             this.currentStream = stream;
761:             this.showVideoRecorder(stream);
762:         } catch (error) {
763:             telegram.showAlert('Нет доступа к камере');
764:         }
765:     }
766: 
767:     showVideoRecorder(stream) {
768:         const recorder = document.createElement('div');
769:         recorder.className = 'video-recording';
770:         recorder.innerHTML = `
771:             <div class="video-preview">
772:                 <video id="video-preview" autoplay playsinline muted></video>
773:                 <div class="video-controls">
774:                     <button class="camera-switch-btn" onclick="app.switchCamera()">🔄</button>
775:                     <button class="video-record-btn" id="record-btn" onclick="app.toggleVideoRecording()"></button>
776:                     <button class="camera-switch-btn" onclick="app.closeVideoRecorder()">✖️</button>
777:                 </div>
778:             </div>
779:         `;
780:         document.body.appendChild(recorder);
781: 
782:         const video = document.getElementById('video-preview');
783:         video.srcObject = stream;
784:     }
785: 
786:     async switchCamera() {
787:         this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
788:         if (this.currentStream) {
789:             this.currentStream.getTracks().forEach(track => track.stop());
790:         }
791:         await this.recordVideo();
792:     }
793: 
794:     toggleVideoRecording() {
795:         const btn = document.getElementById('record-btn');
796:         if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
797:             this.startVideoRecording();
798:             btn.classList.add('recording');
799:         } else {
800:             this.stopVideoRecording();
801:             btn.classList.remove('recording');
802:         }
803:     }
804: 
805:     startVideoRecording() {
806:         if (!this.currentStream) return;
807: 
808:         this.mediaRecorder = new MediaRecorder(this.currentStream);
809:         this.audioChunks = [];
810: 
811:         this.mediaRecorder.ondataavailable = (e) => {
812:             this.audioChunks.push(e.data);
813:         };
814: 
815:         this.mediaRecorder.onstop = () => {
816:             const videoBlob = new Blob(this.audioChunks, { type: 'video/webm' });
817:             this.handleVideoUpload(videoBlob);
818:         };
819: 
820:         this.mediaRecorder.start();
821:     }
822: 
823:     stopVideoRecording() {
824:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
825:             this.mediaRecorder.stop();
826:         }
827:     }
828: 
829:     closeVideoRecorder() {
830:         if (this.currentStream) {
831:             this.currentStream.getTracks().forEach(track => track.stop());
832:             this.currentStream = null;
833:         }
834:         const recorder = document.querySelector('.video-recording');
835:         if (recorder) recorder.remove();
836:     }
837: 
838:     async shareScreen() {
839:         this.hideAttachMenu();
840:         try {
841:             const stream = await navigator.mediaDevices.getDisplayMedia({
842:                 video: true
843:             });
844:             
845:             const mediaRecorder = new MediaRecorder(stream);
846:             const chunks = [];
847: 
848:             mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
849:             mediaRecorder.onstop = () => {
850:                 const blob = new Blob(chunks, { type: 'video/webm' });
851:                 this.handleVideoUpload(blob);
852:                 stream.getTracks().forEach(track => track.stop());
853:             };
854: 
855:             mediaRecorder.start();
856:             setTimeout(() => mediaRecorder.stop(), 30000); // 30 sec max
857:         } catch (error) {
858:             telegram.showAlert('Нет доступа к экрану');
859:         }
860:     }
861: 
862:     async handleFileUpload(file, type) {
863:         if (!file) return;
864: 
865:         this.addChatMessage('user', `[📎 ${type === 'photo' ? 'Фото' : 'Видео'}]`);
866: 
867:         const reader = new FileReader();
868:         reader.onload = async (e) => {
869:             try {
870:                 // Upload to backend and get URL
871:                 const imageUrl = e.target.result; // Base64 data URL
872: 
873:                 // Call Hermes image analysis
874:                 const response = await fetch('/analyze-image', {
875:                     method: 'POST',
876:                     headers: { 'Content-Type': 'application/json' },
877:                     body: JSON.stringify({
878:                         image_url: imageUrl,
879:                         prompt: type === 'photo' ? 'Проанализируй это изображение' : 'Опиши это видео',
880:                         user_id: telegram.getUserId(),
881:                         session_id: `tg_${telegram.getUserId()}`
882:                     })
883:                 });
884: 
885:                 const data = await response.json();
886: 
887:                 if (data.response) {
888:                     this.addChatMessage('hermes', data.response);
889:                 } else if (data.error) {
890:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
891:                 }
892:             } catch (error) {
893:                 console.error('[App] Upload error:', error);
894:                 this.addChatMessage('system', '❌ Ошибка загрузки файла');
895:             }
896:         };
897:         reader.readAsDataURL(file);
898:     }
899: 
900:     async handleVideoUpload(blob) {
901:         this.addChatMessage('user', '[🎥 Видеозапись]');
902:         this.closeVideoRecorder();
903: 
904:         const reader = new FileReader();
905:         reader.onload = async (e) => {
906:             try {
907:                 const videoUrl = e.target.result;
908: 
909:                 // Call Hermes video analysis
910:                 const response = await fetch('/analyze-image', {
911:                     method: 'POST',
912:                     headers: { 'Content-Type': 'application/json' },
913:                     body: JSON.stringify({
914:                         image_url: videoUrl,
915:                         prompt: 'Проанализируй это видео',
916:                         user_id: telegram.getUserId(),
917:                         session_id: `tg_${telegram.getUserId()}`
918:                     })
919:                 });
920: 
921:                 const data = await response.json();
922: 
923:                 if (data.response) {
924:                     this.addChatMessage('hermes', data.response);
925:                 } else if (data.error) {
926:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
927:                 }
928:             } catch (error) {
929:                 console.error('[App] Video upload error:', error);
930:                 this.addChatMessage('system', '❌ Ошибка загрузки видео');
931:             }
932:         };
933:         reader.readAsDataURL(blob);
934:     }
935: 
936:     formatTime(timestamp) {
937:         const date = new Date(timestamp);
938:         return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
939:     }
940: }
941: 
942: let app;
943: document.addEventListener('DOMContentLoaded', () => {
944:     app = new NeuroEscrowApp();
945: });
946: 
947: window.addEventListener('message', (event) => {
948:     if (event.data && event.data.type === 'bot_data' && app) {
949:         app.handleBotData(event.data.payload);
950:     }
951: });
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
