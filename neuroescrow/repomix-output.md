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
backend/src/hermes_router.js
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

<file path="backend/src/hermes_router.js">
  1: /**
  2:  * Hermes Router — Meta-Agent LLM Orchestrator
  3:  * 
  4:  * Гермес НЕ генерирует сам. Гермес маршрутизирует запросы к лучшим LLM,
  5:  * оценивает стоимость, накапливает опыт и агрегирует ответы.
  6:  * 
  7:  * Architecture:
  8:  *   Client Intent → Router → LLM Pool → Aggregator → Structured Spec
  9:  * 
 10:  * Date: 18.05.2026
 11:  * Source: Code Arena WebDev Rankings (May 14, 2026)
 12:  */
 13: 
 14: // ═══════════════════════════════════════════════════════════
 15: // LLM POOL — актуальный рейтинг Code Arena WebDev
 16: // ═══════════════════════════════════════════════════════════
 17: 
 18: const LLM_POOL = {
 19:   // TIER 1 — Элита (критические задачи, сложные архитектуры)
 20:   claude_opus_4_7_thinking: {
 21:     provider: "anthropic",
 22:     model: "claude-opus-4-7-20260505",
 23:     rank: 1,
 24:     score: 1567,
 25:     priceInput: 15,    // $/M input tokens
 26:     priceOutput: 75,   // $/M output tokens
 27:     context: 1_000_000,
 28:     strengths: ["complex_architecture", "critical_code_review", "deep_reasoning"],
 29:     speed: "slow",
 30:     modality: "text"
 31:   },
 32:   claude_opus_4_7: {
 33:     provider: "anthropic",
 34:     model: "claude-opus-4-7-20260505",
 35:     rank: 2,
 36:     score: 1559,
 37:     priceInput: 15,
 38:     priceOutput: 75,
 39:     context: 1_000_000,
 40:     strengths: ["complex_architecture", "legal_terms", "contract_draft"],
 41:     speed: "medium",
 42:     modality: "text"
 43:   },
 44:   claude_opus_4_6_thinking: {
 45:     provider: "anthropic",
 46:     model: "claude-opus-4-6-20251001",
 47:     rank: 3,
 48:     score: 1546,
 49:     priceInput: 15,
 50:     priceOutput: 75,
 51:     context: 1_000_000,
 52:     strengths: ["deep_reasoning", "multi_step_planning"],
 53:     speed: "slow",
 54:     modality: "text"
 55:   },
 56:   claude_opus_4_6: {
 57:     provider: "anthropic",
 58:     model: "claude-opus-4-6-20251001",
 59:     rank: 4,
 60:     score: 1541,
 61:     priceInput: 15,
 62:     priceOutput: 75,
 63:     context: 1_000_000,
 64:     strengths: ["architecture", "code_generation"],
 65:     speed: "medium",
 66:     modality: "text"
 67:   },
 68: 
 69:   // TIER 2 — Сильные (баланс цена/качество)
 70:   glm_5_1: {
 71:     provider: "zhipu",
 72:     model: "glm-5.1",
 73:     rank: 5,
 74:     score: 1532,
 75:     priceInput: 1.40,
 76:     priceOutput: 4.40,
 77:     context: 202_800,
 78:     strengths: ["tech_architecture", "code_gen", "budget_friendly"],
 79:     speed: "fast",
 80:     modality: "text"
 81:   },
 82:   claude_sonnet_4_6: {
 83:     provider: "anthropic",
 84:     model: "claude-sonnet-4-6-20260505",
 85:     rank: 6,
 86:     score: 1524,
 87:     priceInput: 3,
 88:     priceOutput: 15,
 89:     context: 1_000_000,
 90:     strengths: ["general_coding", "conversation", "fast_response"],
 91:     speed: "fast",
 92:     modality: "text"
 93:   },
 94:   kimi_k2_6: {
 95:     provider: "moonshot",
 96:     model: "kimi-k2.6",
 97:     rank: 7,
 98:     score: 1519,
 99:     priceInput: 0.95,
100:     priceOutput: 4,
101:     context: 262_100,
102:     strengths: ["code_gen", "cost_effective"],
103:     speed: "fast",
104:     modality: "text"
105:   },
106: 
107:   // TIER 3 — Доступные (массовые запросы, агентские задачи)
108:   gpt_5_5_xhigh: {
109:     provider: "openai",
110:     model: "gpt-5.5-xhigh",
111:     rank: 9,
112:     score: 1501,
113:     priceInput: 2.50,
114:     priceOutput: 15,
115:     context: 1_100_000,
116:     strengths: ["codex_harness", "automated_coding"],
117:     speed: "medium",
118:     modality: "text"
119:   },
120:   qwen3_6_max_preview: {
121:     provider: "alibaba",
122:     model: "qwen3.6-max-preview",
123:     rank: 10,
124:     score: 1491,
125:     priceInput: 1.04,
126:     priceOutput: 6.24,
127:     context: 262_100,
128:     strengths: ["general_tasks", "multilingual", "cost_effective"],
129:     speed: "fast",
130:     modality: "text"
131:   },
132:   qwen3_6_plus: {
133:     provider: "alibaba",
134:     model: "qwen3.6-plus",
135:     rank: 15,
136:     score: 1460,
137:     priceInput: 0.33,
138:     priceOutput: 1.95,
139:     context: 1_000_000,
140:     strengths: ["agent_tasks", "default_router", "budget_friendly"],
141:     speed: "fast",
142:     modality: "text"
143:   },
144:   deepseek_v4_pro_thinking: {
145:     provider: "deepseek",
146:     model: "deepseek-v4-pro-thinking",
147:     rank: 16,
148:     score: 1458,
149:     priceInput: 0.43,
150:     priceOutput: 0.87,
151:     context: 1_000_000,
152:     strengths: ["reasoning", "code_gen", "ultra_budget"],
153:     speed: "medium",
154:     modality: "text"
155:   },
156: 
157:   // FALLBACK — Mistral (текущий дефолт)
158:   mistral_medium_3_5: {
159:     provider: "mistral",
160:     model: "mistral-medium-3.5",
161:     rank: null,
162:     score: 1400,
163:     priceInput: 0.40,
164:     priceOutput: 2.00,
165:     context: 256_000,
166:     strengths: ["conversation", "general_coding", "fallback"],
167:     speed: "fast",
168:     modality: "text"
169:   },
170: 
171:   // MULTIMODAL
172:   gemini_2_0_flash: {
173:     provider: "google",
174:     model: "gemini-2.0-flash",
175:     rank: null,
176:     score: null,
177:     priceInput: 0.10,
178:     priceOutput: 0.40,
179:     context: 1_000_000,
180:     strengths: ["image_gen", "video_analysis", "multimodal"],
181:     speed: "fast",
182:     modality: "multimodal"
183:   }
184: };
185: 
186: // ═══════════════════════════════════════════════════════════
187: // CURRENCY RATES — актуальные курсы (прямые API источники)
188: // ═══════════════════════════════════════════════════════════
189: 
190: const RATE_SOURCES = {
191:   ton_usd: {
192:     url: "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd",
193:     path: "the-open-network.usd",
194:     fallback: 5.0,
195:     ttl: 60_000  // 1 минута
196:   },
197:   usd_rub: {
198:     url: "https://api.exchangerate-api.com/v4/latest/USD",
199:     path: "rates.RUB",
200:     fallback: 90.0,
201:     ttl: 300_000  // 5 минут
202:   },
203:   ton_rub: {
204:     derived: true,  // ton_usd * usd_rub
205:     ttl: 60_000
206:   }
207: };
208: 
209: class CurrencyCache {
210:   constructor(kv) {
211:     this.kv = kv;
212:     this.memory = new Map();
213:   }
214: 
215:   async getRate(key) {
216:     // Memory cache
217:     const cached = this.memory.get(key);
218:     if (cached && Date.now() - cached.ts < (RATE_SOURCES[key]?.ttl || 60_000)) {
219:       return cached.value;
220:     }
221: 
222:     // KV cache
223:     if (this.kv) {
224:       try {
225:         const raw = await this.kv.get(`rate:${key}`);
226:         if (raw) {
227:           const data = JSON.parse(raw);
228:           if (Date.now() - data.ts < (RATE_SOURCES[key]?.ttl || 60_000)) {
229:             this.memory.set(key, data);
230:             return data.value;
231:           }
232:         }
233:       } catch { /* KV error, continue */ }
234:     }
235: 
236:     // Fetch fresh
237:     const value = await this.fetchRate(key);
238:     this.memory.set(key, { value, ts: Date.now() });
239:     return value;
240:   }
241: 
242:   async fetchRate(key) {
243:     const source = RATE_SOURCES[key];
244:     if (!source) return source?.fallback || 1;
245: 
246:     if (source.derived) {
247:       const tonUsd = await this.getRate("ton_usd");
248:       const usdRub = await this.getRate("usd_rub");
249:       return tonUsd * usdRub;
250:     }
251: 
252:     try {
253:       const resp = await fetch(source.url, { cf: { cacheTtl: 60 } });
254:       if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
255:       const data = await resp.json();
256:       
257:       // Navigate path
258:       let value = data;
259:       for (const part of source.path.split(".")) {
260:         value = value?.[part];
261:       }
262:       
263:       if (!value || typeof value !== "number") throw new Error("Invalid rate data");
264: 
265:       // Save to KV
266:       if (this.kv) {
267:         try {
268:           await this.kv.put(`rate:${key}`, JSON.stringify({ value, ts: Date.now() }), { expirationTtl: 600 });
269:         } catch { /* KV error */ }
270:       }
271: 
272:       return value;
273:     } catch (error) {
274:       console.warn(`[Rates] Failed to fetch ${key}:`, error.message);
275:       return source.fallback;
276:     }
277:   }
278: 
279:   async getAllRates() {
280:     const [tonUsd, usdRub] = await Promise.all([
281:       this.getRate("ton_usd"),
282:       this.getRate("usd_rub")
283:     ]);
284:     return {
285:       ton_usd: tonUsd,
286:       usd_rub: usdRub,
287:       ton_rub: tonUsd * usdRub,
288:       updated_at: new Date().toISOString()
289:     };
290:   }
291: }
292: 
293: // ═══════════════════════════════════════════════════════════
294: // COST ESTIMATOR — токены → USD → TON
295: // ═══════════════════════════════════════════════════════════
296: 
297: const TOKEN_ESTIMATES = {
298:   intent_classification: 300,
299:   simple_question: 800,
300:   contract_draft: 4000,
301:   tech_architecture: 6000,
302:   legal_terms: 5000,
303:   image_generation: 1500,
304:   code_review: 10000,
305:   multi_llm_consult: 15000,
306:   spec_generation: 8000
307: };
308: 
309: class CostEstimator {
310:   constructor(currencyCache) {
311:     this.rates = currencyCache;
312:   }
313: 
314:   async estimate(task, complexity = 1.0, llmName = "mistral_medium_3_5") {
315:     const llm = LLM_POOL[llmName] || LLM_POOL.mistral_medium_3_5;
316:     const baseTokens = TOKEN_ESTIMATES[task] || 1000;
317:     const inputTokens = Math.round(baseTokens * complexity);
318:     const outputTokens = Math.round(inputTokens * 0.6); // ~60% output ratio
319:     const totalTokens = inputTokens + outputTokens;
320: 
321:     // Cost in USD
322:     const inputCost = (inputTokens / 1_000_000) * llm.priceInput;
323:     const outputCost = (outputTokens / 1_000_000) * llm.priceOutput;
324:     const totalUsd = inputCost + outputCost;
325: 
326:     // Convert to TON
327:     const tonUsd = await this.rates.getRate("ton_usd");
328:     const totalTon = totalUsd / tonUsd;
329: 
330:     return {
331:       llm: llmName,
332:       task,
333:       complexity,
334:       tokens: {
335:         input: inputTokens,
336:         output: outputTokens,
337:         total: totalTokens
338:       },
339:       cost: {
340:         usd: Math.round(totalUsd * 10000) / 10000,
341:         ton: Math.round(totalTon * 10000) / 10000,
342:         perToken: Math.round((totalUsd / totalTokens) * 1000000) / 1000000
343:       },
344:       rates: {
345:         ton_usd: tonUsd
346:       }
347:     };
348:   }
349: 
350:   async estimateMultiLLM(task, complexity = 1.0, llmNames) {
351:     const estimates = {};
352:     for (const name of llmNames) {
353:       estimates[name] = await this.estimate(task, complexity, name);
354:     }
355:     return estimates;
356:   }
357: }
358: 
359: // ═══════════════════════════════════════════════════════════
360: // EXPERIENCE DB — трекинг качества LLM через AstraDB
361: // ═══════════════════════════════════════════════════════════
362: 
363: class ExperienceDB {
364:   constructor(astraEndpoint, astraToken) {
365:     this.endpoint = astraEndpoint;
366:     this.token = astraToken;
367:     this.collection = "hermes_llm_experience";
368:   }
369: 
370:   async getTaskScores(task) {
371:     if (!this.endpoint || !this.token) return {};
372: 
373:     try {
374:       const resp = await fetch(
375:         `${this.endpoint}/api/json/v1/default_keyspace/${this.collection}`,
376:         {
377:           method: "POST",
378:           headers: { "Content-Type": "application/json", "Token": this.token },
379:           body: JSON.stringify({
380:             find: { filter: { task } },
381:             options: { limit: 20 }
382:           })
383:         }
384:       );
385:       const data = await resp.json();
386:       const docs = data.data?.documents || [];
387: 
388:       // Aggregate scores per LLM
389:       const scores = {};
390:       for (const doc of docs) {
391:         const llm = doc.llmName;
392:         if (!scores[llm]) scores[llm] = { total: 0, count: 0 };
393:         scores[llm].total += doc.qualityScore || 0.5;
394:         scores[llm].count++;
395:       }
396: 
397:       // Average
398:       const result = {};
399:       for (const [llm, data] of Object.entries(scores)) {
400:         result[llm] = data.total / data.count;
401:       }
402:       return result;
403:     } catch {
404:       return {};
405:     }
406:   }
407: 
408:   async updateScore(task, llmName, qualityScore, metadata = {}) {
409:     if (!this.endpoint || !this.token) return;
410: 
411:     try {
412:       const docId = `exp_${task}_${llmName}_${Date.now()}`;
413:       await fetch(
414:         `${this.endpoint}/api/json/v1/default_keyspace/${this.collection}`,
415:         {
416:           method: "POST",
417:           headers: { "Content-Type": "application/json", "Token": this.token },
418:           body: JSON.stringify({
419:             insertOne: {
420:               document: {
421:                 _id: docId,
422:                 task,
423:                 llmName,
424:                 qualityScore,
425:                 metadata,
426:                 timestamp: new Date().toISOString()
427:               }
428:             }
429:           })
430:         }
431:       );
432:     } catch (error) {
433:       console.warn("[Experience] Failed to update:", error.message);
434:     }
435:   }
436: 
437:   async getBestLLM(task) {
438:     const scores = await this.getTaskScores(task);
439:     let bestName = null;
440:     let bestScore = 0;
441: 
442:     for (const [name, score] of Object.entries(scores)) {
443:       if (score > bestScore) {
444:         bestScore = score;
445:         bestName = name;
446:       }
447:     }
448: 
449:     return { llmName: bestName, score: bestScore };
450:   }
451: }
452: 
453: // ═══════════════════════════════════════════════════════════
454: // INTENT ROUTER — классификация намерений клиента
455: // ═══════════════════════════════════════════════════════════
456: 
457: const INTENT_PROMPT = `Ты — классификатор интенций клиента платформы NeuroEscrow.
458: Проанализируй сообщение и определи:
459: 
460: 1. intent: "contract_creation" | "information" | "conversation" | "generation" | "support"
461: 2. confidence: 0.0-1.0
462: 3. task_type: "tech_architecture" | "legal_terms" | "contract_draft" | "simple_question" | "image_generation" | "code_review" | "multi_llm_consult" | "spec_generation"
463: 4. complexity: 0.1-2.0 (насколько задача сложная)
464: 5. missing_contract_fields: массив полей которые ещё не заполнены ["title", "budget", "deadline", "description", "tech_stack", "payment_terms"]
465: 6. suggested_modality: "text" | "image" | "code" | "search"
466: 7. suggested_llms: массив рекомендуемых LLM из пула (максимум 3)
467: 
468: Верни ТОЛЬКО JSON без markdown. Пример:
469: {"intent":"contract_creation","confidence":0.9,"task_type":"contract_draft","complexity":1.2,"missing_contract_fields":["budget","deadline"],"suggested_modality":"text","suggested_llms":["claude_opus_4_7","glm_5_1","mistral_medium_3_5"]}`;
470: 
471: class IntentRouter {
472:   constructor(apiKey) {
473:     this.apiKey = apiKey;
474:     this.model = "mistral-medium-3.5";
475:   }
476: 
477:   async classify(message, contractState = {}) {
478:     const contextHint = contractState.phase
479:       ? `\nТекущая фаза контракта: ${contractState.phase}. Заполненные поля: ${JSON.stringify(contractState.fields || {})}`
480:       : "";
481: 
482:     try {
483:       const resp = await fetch("https://api.mistral.ai/v1/chat/completions", {
484:         method: "POST",
485:         headers: {
486:           "Authorization": `Bearer ${this.apiKey}`,
487:           "Content-Type": "application/json"
488:         },
489:         body: JSON.stringify({
490:           model: this.model,
491:           messages: [
492:             { role: "system", content: INTENT_PROMPT },
493:             { role: "user", content: `Сообщение клиента: ${message}${contextHint}` }
494:           ],
495:           temperature: 0.1,
496:           max_tokens: 300,
497:           response_format: { type: "json_object" }
498:         })
499:       });
500: 
501:       if (!resp.ok) throw new Error(`API error: ${resp.status}`);
502:       const data = await resp.json();
503:       const parsed = JSON.parse(data.choices[0].message.content);
504: 
505:       return {
506:         intent: parsed.intent || "conversation",
507:         confidence: parsed.confidence || 0.5,
508:         task_type: parsed.task_type || "simple_question",
509:         complexity: parsed.complexity || 1.0,
510:         missing_fields: parsed.missing_contract_fields || [],
511:         suggested_modality: parsed.suggested_modality || "text",
512:         suggested_llms: parsed.suggested_llms || ["mistral_medium_3_5"],
513:         raw: parsed
514:       };
515:     } catch (error) {
516:       console.warn("[Intent] Classification failed:", error.message);
517:       return {
518:         intent: "conversation",
519:         confidence: 0.5,
520:         task_type: "simple_question",
521:         complexity: 1.0,
522:         missing_fields: [],
523:         suggested_modality: "text",
524:         suggested_llms: ["mistral_medium_3_5"],
525:         error: error.message
526:       };
527:     }
528:   }
529: }
530: 
531: // ═══════════════════════════════════════════════════════════
532: // MULTI-LLM DISPATCH — параллельные запросы к разным LLM
533: // ═══════════════════════════════════════════════════════════
534: 
535: const PROVIDER_ENDPOINTS = {
536:   anthropic: {
537:     url: "https://api.anthropic.com/v1/messages",
538:     headers: (apiKey) => ({
539:       "x-api-key": apiKey,
540:       "anthropic-version": "2023-06-01",
541:       "content-type": "application/json"
542:     }),
543:     formatRequest: (model, messages, maxTokens) => ({
544:       model,
545:       max_tokens: maxTokens || 4000,
546:       messages: messages.map(m => ({ role: m.role === "system" ? "assistant" : m.role, content: m.content }))
547:     }),
548:     parseResponse: (data) => data.content?.[0]?.text || ""
549:   },
550:   mistral: {
551:     url: "https://api.mistral.ai/v1/chat/completions",
552:     headers: (apiKey) => ({
553:       "Authorization": `Bearer ${apiKey}`,
554:       "Content-Type": "application/json"
555:     }),
556:     formatRequest: (model, messages, maxTokens) => ({
557:       model,
558:       messages,
559:       max_tokens: maxTokens || 4000,
560:       temperature: 0.7
561:     }),
562:     parseResponse: (data) => data.choices?.[0]?.message?.content || ""
563:   },
564:   openai: {
565:     url: "https://api.openai.com/v1/chat/completions",
566:     headers: (apiKey) => ({
567:       "Authorization": `Bearer ${apiKey}`,
568:       "Content-Type": "application/json"
569:     }),
570:     formatRequest: (model, messages, maxTokens) => ({
571:       model,
572:       messages,
573:       max_tokens: maxTokens || 4000,
574:       temperature: 0.7
575:     }),
576:     parseResponse: (data) => data.choices?.[0]?.message?.content || ""
577:   },
578:   google: {
579:     url: (apiKey, model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
580:     headers: () => ({ "Content-Type": "application/json" }),
581:     formatRequest: (model, messages, maxTokens) => ({
582:       contents: messages.map(m => ({ role: m.role === "system" ? "user" : m.role, parts: [{ text: m.content }] })),
583:       generationConfig: { maxOutputTokens: maxTokens || 4000, temperature: 0.7 }
584:     }),
585:     parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text || ""
586:   },
587:   alibaba: {
588:     url: "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
589:     headers: (apiKey) => ({
590:       "Authorization": `Bearer ${apiKey}`,
591:       "Content-Type": "application/json"
592:     }),
593:     formatRequest: (model, messages, maxTokens) => ({
594:       model,
595:       messages,
596:       max_tokens: maxTokens || 4000,
597:       temperature: 0.7
598:     }),
599:     parseResponse: (data) => data.choices?.[0]?.message?.content || ""
600:   },
601:   deepseek: {
602:     url: "https://api.deepseek.com/v1/chat/completions",
603:     headers: (apiKey) => ({
604:       "Authorization": `Bearer ${apiKey}`,
605:       "Content-Type": "application/json"
606:     }),
607:     formatRequest: (model, messages, maxTokens) => ({
608:       model,
609:       messages,
610:       max_tokens: maxTokens || 4000,
611:       temperature: 0.7
612:     }),
613:     parseResponse: (data) => data.choices?.[0]?.message?.content || ""
614:   },
615:   zhipu: {
616:     url: "https://open.bigmodel.cn/api/paas/v4/chat/completions",
617:     headers: (apiKey) => ({
618:       "Authorization": `Bearer ${apiKey}`,
619:       "Content-Type": "application/json"
620:     }),
621:     formatRequest: (model, messages, maxTokens) => ({
622:       model,
623:       messages,
624:       max_tokens: maxTokens || 4000,
625:       temperature: 0.7
626:     }),
627:     parseResponse: (data) => data.choices?.[0]?.message?.content || ""
628:   },
629:   moonshot: {
630:     url: "https://api.moonshot.cn/v1/chat/completions",
631:     headers: (apiKey) => ({
632:       "Authorization": `Bearer ${apiKey}`,
633:       "Content-Type": "application/json"
634:     }),
635:     formatRequest: (model, messages, maxTokens) => ({
636:       model,
637:       messages,
638:       max_tokens: maxTokens || 4000,
639:       temperature: 0.7
640:     }),
641:     parseResponse: (data) => data.choices?.[0]?.message?.content || ""
642:   }
643: };
644: 
645: class MultiLLMDispatch {
646:   constructor(apiKeys) {
647:     this.keys = apiKeys; // { anthropic: "...", openai: "...", google: "...", ... }
648:   }
649: 
650:   async dispatch(llmName, systemPrompt, userMessage, maxTokens = 4000) {
651:     const llm = LLM_POOL[llmName];
652:     if (!llm) throw new Error(`Unknown LLM: ${llmName}`);
653: 
654:     const provider = PROVIDER_ENDPOINTS[llm.provider];
655:     if (!provider) throw new Error(`Unknown provider: ${llm.provider}`);
656: 
657:     const apiKey = this.keys[llm.provider];
658:     if (!apiKey) throw new Error(`No API key for ${llm.provider}`);
659: 
660:     const url = typeof provider.url === "function" ? provider.url(apiKey, llm.model) : provider.url;
661:     const headers = provider.headers(apiKey);
662:     const body = provider.formatRequest(llm.model, [
663:       { role: "system", content: systemPrompt },
664:       { role: "user", content: userMessage }
665:     ], maxTokens);
666: 
667:     const startTime = Date.now();
668:     const resp = await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
669:     const latency = Date.now() - startTime;
670: 
671:     if (!resp.ok) {
672:       const errorText = await resp.text().catch(() => "");
673:       throw new Error(`${llm.provider} API error: ${resp.status} ${errorText}`);
674:     }
675: 
676:     const data = await resp.json();
677:     const content = provider.parseResponse(data);
678:     const tokensUsed = data.usage?.total_tokens || 0;
679: 
680:     return {
681:       llmName,
682:       provider: llm.provider,
683:       content,
684:       tokens: tokensUsed,
685:       latency,
686:       rank: llm.rank,
687:       score: llm.score
688:     };
689:   }
690: 
691:   async dispatchParallel(tasks) {
692:     // tasks = [{ llmName, systemPrompt, userMessage, maxTokens }]
693:     const results = await Promise.allSettled(
694:       tasks.map(t => this.dispatch(t.llmName, t.systemPrompt, t.userMessage, t.maxTokens))
695:     );
696: 
697:     const fulfilled = results
698:       .filter(r => r.status === "fulfilled")
699:       .map(r => r.value);
700: 
701:     const rejected = results
702:       .filter(r => r.status === "rejected")
703:       .map(r => r.reason);
704: 
705:     return { fulfilled, rejected };
706:   }
707: }
708: 
709: // ═══════════════════════════════════════════════════════════
710: // RESPONSE AGGREGATOR — сбор ответов в единый структурированный спец
711: // ═══════════════════════════════════════════════════════════
712: 
713: class ResponseAggregator {
714:   async aggregate(results, intent, contractState) {
715:     const spec = {
716:       version: "1.0",
717:       generated_at: new Date().toISOString(),
718:       intent,
719:       contract_state: contractState,
720:       consultations: [],
721:       aggregated_response: "",
722:       recommendations: [],
723:       cost_summary: {
724:         total_tokens: 0,
725:         total_usd: 0,
726:         total_ton: 0,
727:         llms_used: []
728:       }
729:     };
730: 
731:     for (const result of results.fulfilled || []) {
732:       spec.consultations.push({
733:         llm: result.llmName,
734:         provider: result.provider,
735:         rank: result.rank,
736:         score: result.score,
737:         tokens: result.tokens,
738:         latency: result.latency,
739:         content_preview: result.content.substring(0, 200)
740:       });
741: 
742:       spec.cost_summary.total_tokens += result.tokens;
743:       spec.cost_summary.llms_used.push(result.llmName);
744:     }
745: 
746:     // Generate aggregated response using best LLM
747:     if (results.fulfilled?.length > 0) {
748:       const best = results.fulfilled.reduce((a, b) => (b.score || 0) > (a.score || 0) ? b : a);
749:       spec.aggregated_response = best.content;
750:       spec.primary_llm = best.llmName;
751:     }
752: 
753:     // Extract recommendations
754:     if (results.fulfilled?.length > 1) {
755:       const allContent = results.fulfilled.map(r => r.content).join("\n\n---\n\n");
756:       spec.recommendations = this.extractRecommendations(allContent);
757:     }
758: 
759:     return spec;
760:   }
761: 
762:   extractRecommendations(content) {
763:     // Simple extraction: look for bullet points, numbered lists
764:     const lines = content.split("\n");
765:     const recs = [];
766:     for (const line of lines) {
767:       const trimmed = line.trim();
768:       if (/^[\d\*\-\•]+\s/.test(trimmed) && trimmed.length > 10 && trimmed.length < 300) {
769:         recs.push(trimmed.replace(/^[\d\*\-\•]+\s*/, ""));
770:       }
771:     }
772:     return recs.slice(0, 10);
773:   }
774: }
775: 
776: // ═══════════════════════════════════════════════════════════
777: // HERMES ROUTER — главный класс (Facade)
778: // ═══════════════════════════════════════════════════════════
779: 
780: export class HermesRouter {
781:   constructor(env) {
782:     this.apiKeys = {
783:       mistral: env?.MISTRAL_API_KEY,
784:       anthropic: env?.ANTHROPIC_API_KEY,
785:       openai: env?.OPENAI_API_KEY,
786:       google: env?.GOOGLE_API_KEY,
787:       alibaba: env?.DASHSCOPE_API_KEY,
788:       deepseek: env?.DEEPSEEK_API_KEY,
789:       zhipu: env?.ZHIPU_API_KEY,
790:       moonshot: env?.MOONSHOT_API_KEY
791:     };
792: 
793:     this.currencyCache = new CurrencyCache(env?.CACHE);
794:     this.costEstimator = new CostEstimator(this.currencyCache);
795:     this.experienceDB = new ExperienceDB(env?.ASTRA_DB_ENDPOINT, env?.ASTRA_DB_TOKEN);
796:     this.intentRouter = new IntentRouter(env?.MISTRAL_API_KEY);
797:     this.dispatch = new MultiLLMDispatch(this.apiKeys);
798:     this.aggregator = new ResponseAggregator();
799: 
800:     // Stats
801:     this.totalRequests = 0;
802:     this.totalCostUSD = 0;
803:     this.totalTokens = 0;
804:   }
805: 
806:   async processRequest(message, contractState = {}) {
807:     this.totalRequests++;
808: 
809:     // 1. Classify intent
810:     const intent = await this.intentRouter.classify(message, contractState);
811: 
812:     // 2. Select best LLM(s)
813:     const llmSelection = await this.selectLLMs(intent);
814: 
815:     // 3. Estimate cost
816:     const costEstimate = await this.costEstimator.estimate(
817:       intent.task_type,
818:       intent.complexity,
819:       llmSelection.primary
820:     );
821: 
822:     // 4. Dispatch to LLM(s)
823:     const dispatchResults = await this.dispatchToLLMs(intent, llmSelection, message);
824: 
825:     // 5. Aggregate response
826:     const spec = await this.aggregator.aggregate(dispatchResults, intent, contractState);
827: 
828:     // 6. Update experience
829:     for (const result of dispatchResults.fulfilled || []) {
830:       await this.experienceDB.updateScore(
831:         intent.task_type,
832:         result.llmName,
833:         0.7, // Default score, will be updated by feedback
834:         { latency: result.latency, tokens: result.tokens }
835:       );
836:     }
837: 
838:     // 7. Update stats
839:     this.totalTokens += spec.cost_summary.total_tokens;
840: 
841:     return {
842:       intent,
843:       cost_estimate: costEstimate,
844:       spec,
845:       llm_selection: llmSelection,
846:       rates: await this.currencyCache.getAllRates()
847:     };
848:   }
849: 
850:   async selectLLMs(intent) {
851:     // Get experience-based scores
852:     const expScores = await this.experienceDB.getTaskScores(intent.task_type);
853: 
854:     // Score each LLM
855:     const candidates = Object.entries(LLM_POOL).map(([name, llm]) => {
856:       if (llm.modality !== "text" && intent.suggested_modality === "text") return null;
857:       if (!llm.strengths.includes(intent.task_type) && llm.rank > 10) return null;
858: 
859:       const strengthScore = llm.strengths.includes(intent.task_type) ? 0.9 : 0.5;
860:       const expScore = expScores[name] || 0.5;
861:       const rankScore = llm.rank ? (20 - llm.rank) / 20 : 0.5;
862: 
863:       return {
864:         name,
865:         score: (strengthScore * 0.3) + (expScore * 0.4) + (rankScore * 0.3),
866:         llm
867:       };
868:     }).filter(Boolean).sort((a, b) => b.score - a.score);
869: 
870:     return {
871:       primary: candidates[0]?.name || "mistral_medium_3_5",
872:       secondary: candidates.slice(1, 3).map(c => c.name),
873:       all: candidates.slice(0, 5).map(c => c.name)
874:     };
875:   }
876: 
877:   async dispatchToLLMs(intent, llmSelection, message) {
878:     const tasks = [];
879: 
880:     // Primary LLM — always dispatch
881:     const primaryLLM = LLM_POOL[llmSelection.primary];
882:     tasks.push({
883:       llmName: llmSelection.primary,
884:       systemPrompt: this.getSystemPrompt(intent, primaryLLM),
885:       userMessage: message,
886:       maxTokens: 4000
887:     });
888: 
889:     // Secondary LLMs — only for complex tasks
890:     if (intent.complexity > 1.2 && llmSelection.secondary.length > 0) {
891:       for (const name of llmSelection.secondary.slice(0, 2)) {
892:         const llm = LLM_POOL[name];
893:         tasks.push({
894:           llmName: name,
895:           systemPrompt: this.getSystemPrompt(intent, llm),
896:           userMessage: message,
897:           maxTokens: 3000
898:         });
899:       }
900:     }
901: 
902:     return await this.dispatch.dispatchParallel(tasks);
903:   }
904: 
905:   getSystemPrompt(intent, llm) {
906:     const basePrompts = {
907:       contract_creation: `Ты — эксперт по созданию смарт-контрактов NeuroEscrow. Помоги клиенту структурировать ТЗ для нейрокодера. Задавай уточняющие вопросы, предлагай оптимальный стек технологий, оценивай реалистичность сроков и бюджета.`,
908:       information: `Ты — эксперт платформы NeuroEscrow. Отвечай на вопросы клиентов о смарт-контрактах, эскроу, нейрокодинге.`,
909:       conversation: `Ты — Гермес, AI-ассистент NeuroEscrow. Дружелюбно общайся с клиентом, помогай с созданием сделок.`,
910:       generation: `Ты — генеративный AI. Создавай контент (код, схемы, описания) для смарт-контрактов NeuroEscrow.`,
911:       support: `Ты — техподдержка NeuroEscrow. Помогай решать проблемы клиентов.`
912:     };
913: 
914:     const base = basePrompts[intent.intent] || basePrompts.conversation;
915:     return `${base}\n\nИспользуй модель: ${llm.model}. Отвечай на русском языке.`;
916:   }
917: 
918:   async getRates() {
919:     return await this.currencyCache.getAllRates();
920:   }
921: 
922:   getStats() {
923:     return {
924:       total_requests: this.totalRequests,
925:       total_tokens: this.totalTokens,
926:       total_cost_usd: Math.round(this.totalCostUSD * 10000) / 10000,
927:       llm_pool_size: Object.keys(LLM_POOL).length,
928:       providers: [...new Set(Object.values(LLM_POOL).map(l => l.provider))]
929:     };
930:   }
931: 
932:   getLLMPool() {
933:     return Object.entries(LLM_POOL).map(([name, llm]) => ({
934:       name,
935:       provider: llm.provider,
936:       rank: llm.rank,
937:       score: llm.score,
938:       priceInput: llm.priceInput,
939:       priceOutput: llm.priceOutput,
940:       context: llm.context,
941:       strengths: llm.strengths,
942:       speed: llm.speed,
943:       modality: llm.modality
944:     }));
945:   }
946: }
</file>

<file path="backend/src/hermes.js">
  1: /**
  2:  * Hermes Agent - JavaScript Edition
  3:  * Powered by Mistral Medium 3.5 + Multi-LLM Router Architecture
  4:  * Date: 18.05.2026
  5:  */
  6: 
  7: import { HermesRAG } from './rag.js';
  8: import { moderateContent } from './moderation.js';
  9: import { HermesRouter } from './hermes_router.js';
 10: 
 11: const RAG_CONFIG = {
 12:   similarityThreshold: 0.7,
 13:   maxCodebaseResults: 5,
 14:   maxMemoryResults: 4,
 15:   minQueryLength: 15,
 16:   logHits: true,
 17:   logMisses: true
 18: };
 19: 
 20: // ═══════════════════════════════════════════════════════════
 21: // CONTRACT STATE MACHINE — ведение клиента по фазам
 22: // ═══════════════════════════════════════════════════════════
 23: 
 24: const CONTRACT_PHASES = {
 25:   draft: {
 26:     goal: "Собрать ТЗ",
 27:     required_fields: ["title", "description"],
 28:     anchor_phrases: ["опишите задачу", "что нужно сделать", "какой результат ожидается", "расскажите подробнее о проекте"],
 29:     exit_condition: (fields) => fields.title && fields.description,
 30:     next: "review",
 31:     prompt_addition: "Сейчас фаза СОСТАВЛЕНИЯ. Собирай ТЗ. Задавай уточняющие вопросы о задаче, результате, требованиях."
 32:   },
 33:   review: {
 34:     goal: "Уточнить детали",
 35:     required_fields: ["budget", "deadline", "tech_stack"],
 36:     anchor_phrases: ["какой бюджет", "какие сроки", "какие технологии предпочитаете", "подходит ли описание", "что добавить или убрать"],
 37:     exit_condition: (fields) => fields.budget && fields.deadline,
 38:     next: "agreement",
 39:     prompt_addition: "Сейчас фаза СОГЛАСОВАНИЯ. Уточняй бюджет, сроки, технологии. Предлагай оптимальные решения."
 40:   },
 41:   sorting: {
 42:     goal: "Подбор исполнителя",
 43:     required_fields: ["tech_stack", "requirements"],
 44:     anchor_phrases: ["подберу нейрокодера", "какие требования к исполнителю", "предпочтения по стеку"],
 45:     exit_condition: (fields) => fields.tech_stack,
 46:     next: "agreement",
 47:     prompt_addition: "Сейчас фаза ПОДБОРА. Помоги выбрать исполнителя по квалификации и рейтингу."
 48:   },
 49:   agreement: {
 50:     goal: "Согласовать условия",
 51:     required_fields: ["payment_terms", "milestones"],
 52:     anchor_phrases: ["условия оплаты", "этапы работы", "готовы создать контракт", "штрафы за просрочку"],
 53:     exit_condition: (fields) => fields.payment_terms,
 54:     next: "escrow",
 55:     prompt_addition: "Сейчас фаза СДЕЛКИ. Согласовывай условия оплаты, этапы, штрафы."
 56:   },
 57:   escrow: {
 58:     goal: "Активация эскроу",
 59:     required_fields: ["depositor", "beneficiary", "amount"],
 60:     anchor_phrases: ["внесите токены в эскроу", "контракт активирован", "отслеживание исполнения"],
 61:     exit_condition: (fields) => fields.amount,
 62:     next: "completed",
 63:     prompt_addition: "Сейчас фаза ЭСКРОУ. Помоги клиенту внести токены и отслеживать исполнение."
 64:   }
 65: };
 66: 
 67: // ═══════════════════════════════════════════════════════════
 68: // SATISFACTION SCORER — оценка удовлетворённости клиента
 69: // ═══════════════════════════════════════════════════════════
 70: 
 71: const SATISFACTION_PROMPT = `Оцени удовлетворённость клиента по шкале 0.0-1.0 на основе диалога.
 72: Критерии:
 73: - 0.8-1.0: клиент доволен, все вопросы решены
 74: - 0.5-0.8: клиент заинтересован, но есть уточнения
 75: - 0.0-0.5: клиент недоволен или запутан
 76: 
 77: Верни ТОЛЬКО число: {"score": 0.75, "reason": "краткое объяснение"}`;
 78: 
 79: export class HermesAgent {
 80:   constructor(kvCache, env) {
 81:     this.apiKey = env?.MISTRAL_API_KEY;
 82:     if (!this.apiKey) {
 83:       throw new Error('MISTRAL_API_KEY not found in environment');
 84:     }
 85:     this.model = env?.MODEL_NAME || 'mistral-medium-3.5';
 86:     this.rag = new HermesRAG(kvCache, env);
 87:     this.sessions = new Map();
 88:     this.kvCache = kvCache;
 89:     this.ragHits = 0;
 90:     this.ragMisses = 0;
 91:     this.env = env;
 92:     
 93:     // Router Architecture
 94:     this.router = env?.MISTRAL_API_KEY ? new HermesRouter(env) : null;
 95:     
 96:     // Contract state per session
 97:     this.contractStates = new Map();
 98:   }
 99:   
100:   getContractState(sessionId) {
101:     if (!this.contractStates.has(sessionId)) {
102:       this.contractStates.set(sessionId, {
103:         phase: 'draft',
104:         fields: {
105:           title: null,
106:           description: null,
107:           budget: null,
108:           deadline: null,
109:           client: null,
110:           coder: null,
111:           tech_stack: null,
112:           payment_terms: null,
113:           milestones: null
114:         },
115:         completeness: 0,
116:         satisfaction_score: 0.5,
117:         history: []
118:       });
119:     }
120:     return this.contractStates.get(sessionId);
121:   }
122:   
123:   updateContractPhase(sessionId, newFields = {}) {
124:     const state = this.getContractState(sessionId);
125:     
126:     // Update fields
127:     for (const [key, value] of Object.entries(newFields)) {
128:       if (value && state.fields.hasOwnProperty(key)) {
129:         state.fields[key] = value;
130:       }
131:     }
132:     
133:     // Calculate completeness
134:     const allFields = Object.values(state.fields).filter(v => v !== null).length;
135:     const totalFields = Object.keys(state.fields).length;
136:     state.completeness = allFields / totalFields;
137:     
138:     // Check phase exit condition
139:     const phaseConfig = CONTRACT_PHASES[state.phase];
140:     if (phaseConfig && phaseConfig.exit_condition(state.fields)) {
141:       const oldPhase = state.phase;
142:       state.phase = phaseConfig.next;
143:       console.log(`[Contract] Phase transition: ${oldPhase} → ${state.phase}`);
144:     }
145:     
146:     return state;
147:   }
148:   
149:   getAnchorPhrases(sessionId) {
150:     const state = this.getContractState(sessionId);
151:     const phaseConfig = CONTRACT_PHASES[state.phase];
152:     return phaseConfig?.anchor_phrases || [];
153:   }
154:   
155:   getSystemPrompt(persona = 'hermes', sessionId = null) {
156:     const basePrompts = {
157:       hermes: `Ты — Гермес, AI-ассистент платформы NeuroEscrow. Ты помогаешь клиентам и нейрокодерам с безопасными сделками через эскроу-смарт-контракты на блокчейне TON.
158: 
159: Твои основные функции:
160: - Создание и проверка смарт-контрактов для эскроу
161: - Анализ документов, товаров по фото/видео
162: - Ведение переговоров между сторонами сделки
163: - Модерация контента и блокировка мошенников
164: - Подбор нейрокодеров по квалификации и рейтингу
165: - Отслеживание исполнения контрактов
166: 
167: Жизненный цикл сделки:
168: 1. Составление — сбор ТЗ от клиента
169: 2. Согласование — утверждение и публикация на доске
170: 3. Подбор — сортировка нейрокодеров по рейтингу
171: 4. Сделка — согласование деталей с исполнителем  
172: 5. Эскроу — клиент заводит токены, отслеживание исполнения`,
173:       
174:       client: `Ты — Гермес, помощник в NeuroEscrow. Фокус: помощь клиенту в создании безопасных сделок. Жизненный цикл: составление → согласование → подбор → сделка → эскроу.`,
175:       
176:       creator: `Ты — Гермес, помощник в NeuroEscrow. Фокус: помощь нейрокодеру-исполнителю. Помогай с поиском заданий, оценкой ТЗ и ведением сделок.`
177:     };
178:     
179:     let prompt = basePrompts[persona] || basePrompts.hermes;
180:     
181:     // Add contract phase context
182:     if (sessionId) {
183:       const state = this.getContractState(sessionId);
184:       const phaseConfig = CONTRACT_PHASES[state.phase];
185:       if (phaseConfig) {
186:         prompt += `\n\nТЕКУЩАЯ ФАЗА: ${state.phase.toUpperCase()} — ${phaseConfig.goal}`;
187:         prompt += `\n${phaseConfig.prompt_addition}`;
188:         prompt += `\nЗаполненные поля: ${JSON.stringify(state.fields)}`;
189:         prompt += `\nПолнота контракта: ${(state.completeness * 100).toFixed(0)}%`;
190:         prompt += `\nОпорные фразы для этой фазы: ${phaseConfig.anchor_phrases.join(', ')}`;
191:         prompt += `\nТвоя задача — вести клиента к заполнению всех полей контракта. Используй опорные фразы чтобы удерживать фокус.`;
192:       }
193:     }
194:     
195:     prompt += `\n\nОтвечай дружелюбно и профессионально. Если у тебя есть контекст из RAG — используй его. Если нет — отвечай на основе своих знаний как AI-ассистент NeuroEscrow.`;
196:     
197:     return prompt;
198:   }
199:   
200:   getSessionHistory(sessionId, limit = 10) {
201:     if (!this.sessions.has(sessionId)) {
202:       this.sessions.set(sessionId, []);
203:     }
204:     const history = this.sessions.get(sessionId);
205:     return history.slice(-limit);
206:   }
207:   
208:   addToSession(sessionId, role, content) {
209:     if (!this.sessions.has(sessionId)) {
210:       this.sessions.set(sessionId, []);
211:     }
212:     this.sessions.get(sessionId).push({
213:       role,
214:       content,
215:       timestamp: new Date().toISOString()
216:     });
217:   }
218:   
219:   async buildContext(query, userId, sessionId) {
220:     // Skip RAG for short messages (greetings, etc.)
221:     if (!query || query.trim().length < RAG_CONFIG.minQueryLength) return '';
222: 
223:     const contextParts = [];
224: 
225:     // Search codebase with similarity threshold
226:     const codebaseResults = await this.rag.searchCodebase(query, RAG_CONFIG.maxCodebaseResults);
227:     const filteredCodebase = codebaseResults.filter(r => (r.$similarity || 0) >= RAG_CONFIG.similarityThreshold);
228:     if (filteredCodebase.length > 0) {
229:       contextParts.push('📚 Релевантный код из базы:');
230:       filteredCodebase.forEach((result, i) => {
231:         const filepath = result.filepath || 'unknown';
232:         const text = (result.text || '').substring(0, 500);
233:         const similarity = result.$similarity || 0;
234:         contextParts.push(`\n${i + 1}. ${filepath} (similarity: ${similarity.toFixed(2)})\n\`\`\`\n${text}\n\`\`\``);
235:       });
236:     }
237: 
238:     // Search memory with similarity threshold
239:     const memoryResults = await this.rag.searchMemory(query, userId, RAG_CONFIG.maxMemoryResults);
240:     const filteredMemory = memoryResults.filter(r => (r.$similarity || 0) >= RAG_CONFIG.similarityThreshold);
241:     if (filteredMemory.length > 0) {
242:       contextParts.push('\n\n🧠 Из долгосрочной памяти:');
243:       filteredMemory.forEach((result, i) => {
244:         const content = result.content || '';
245:         const timestamp = result.timestamp || '';
246:         contextParts.push(`\n${i + 1}. [${timestamp}] ${content}`);
247:       });
248:     }
249: 
250:     // Log hit/miss
251:     const hasContext = contextParts.length > 0;
252:     if (hasContext) {
253:       this.ragHits++;
254:       if (RAG_CONFIG.logHits) {
255:         console.log(`[RAG] HIT session=${sessionId} query="${query.substring(0, 30)}..." codebase=${filteredCodebase.length} memory=${filteredMemory.length}`);
256:       }
257:     } else {
258:       this.ragMisses++;
259:       if (RAG_CONFIG.logMisses) {
260:         console.log(`[RAG] MISS session=${sessionId} query="${query.substring(0, 30)}..."`);
261:       }
262:     }
263:     
264:     return contextParts.join('');
265:   }
266:   
267:   async extractContractFields(message, sessionId) {
268:     const history = this.getSessionHistory(sessionId);
269:     const contextMessages = history.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n');
270:     
271:     const messages = [
272:       {
273:         role: 'system',
274:         content: `Ты — экстрактор данных смарт-контракта. Извлеки из диалога пользователя поля контракта в формате JSON.
275:         
276: Правила:
277: - Возвращай ТОЛЬКО JSON без markdown, без пояснений
278: - Поля которые не найдены — оставляй null
279: - budget — число (TON), deadline — строка YYYY-MM-DD или относительная ("2 недели")
280: - title — краткое название задачи (до 80 символов)
281: - description — описание задачи (до 500 символов)
282: - client — имя клиента если упомянуто
283: - coder — имя исполнителя если упомянуто
284: 
285: Формат ответа:
286: {"title": null, "description": null, "budget": null, "deadline": null, "client": null, "coder": null}`
287:       }
288:     ];
289:     
290:     if (contextMessages) {
291:       messages.push({ role: 'user', content: `Контекст диалога:\n${contextMessages}` });
292:     }
293:     messages.push({ role: 'user', content: `Текущее сообщение: ${message}` });
294:     
295:     try {
296:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
297:         method: 'POST',
298:         headers: {
299:           'Authorization': `Bearer ${this.apiKey}`,
300:           'Content-Type': 'application/json'
301:         },
302:         body: JSON.stringify({
303:           model: this.model,
304:           messages,
305:           temperature: 0.1,
306:           max_tokens: 300,
307:           response_format: { type: 'json_object' }
308:         })
309:       });
310:       
311:       if (!response.ok) return null;
312:       
313:       const data = await response.json();
314:       const raw = data.choices[0].message.content;
315:       
316:       // Parse and validate
317:       const parsed = JSON.parse(raw);
318:       const validFields = ['title', 'description', 'budget', 'deadline', 'client', 'coder'];
319:       const result = {};
320:       
321:       for (const field of validFields) {
322:         result[field] = parsed[field] || null;
323:       }
324:       
325:       // Check if we got any meaningful data
326:       const hasData = Object.values(result).some(v => v !== null);
327:       return hasData ? result : null;
328:       
329:     } catch (error) {
330:       console.warn('[Contract Extract] Failed:', error.message);
331:       return null;
332:     }
333:   }
334:   
335:   async chat(message, userId, sessionId, persona = 'hermes', imageUrl = null, useRag = true, extractContract = false, useRouter = false) {
336:     // Moderate content
337:     const moderation = moderateContent(message);
338:     if (!moderation.safe) {
339:       return {
340:         response: `⚠️ Сообщение заблокировано: ${moderation.reason}`,
341:         blocked: true,
342:         reason: moderation.reason
343:       };
344:     }
345:     
346:     // Router mode — multi-LLM orchestration
347:     if (useRouter && this.router) {
348:       return await this.chatWithRouter(message, userId, sessionId, persona);
349:     }
350:     
351:     // Standard mode — single LLM (Mistral)
352:     return await this.chatStandard(message, userId, sessionId, persona, imageUrl, useRag, extractContract);
353:   }
354:   
355:   async chatWithRouter(message, userId, sessionId, persona) {
356:     const contractState = this.getContractState(sessionId);
357:     
358:     try {
359:       const result = await this.router.processRequest(message, contractState);
360:       
361:       // Update contract state from router's intent
362:       if (result.intent.missing_fields) {
363:         this.updateContractPhase(sessionId);
364:       }
365:       
366:       // Extract contract fields from aggregated response
367:       const extractedFields = await this.extractContractFields(message, sessionId);
368:       if (extractedFields) {
369:         this.updateContractPhase(sessionId, extractedFields);
370:       }
371:       
372:       // Add to session
373:       this.addToSession(sessionId, 'user', message);
374:       this.addToSession(sessionId, 'assistant', result.spec.aggregated_response);
375:       
376:       return {
377:         response: result.spec.aggregated_response,
378:         blocked: false,
379:         context_used: false,
380:         tokens_used: result.spec.cost_summary.total_tokens,
381:         contract_fields: extractedFields,
382:         contract_state: this.getContractState(sessionId),
383:         cost_estimate: result.cost_estimate,
384:         intent: result.intent,
385:         llm_selection: result.llm_selection,
386:         rates: result.rates,
387:         router_mode: true
388:       };
389:     } catch (error) {
390:       console.warn('[Router] Failed, falling back to standard:', error.message);
391:       return await this.chatStandard(message, userId, sessionId, persona, null, true, true);
392:     }
393:   }
394:   
395:   async chatStandard(message, userId, sessionId, persona, imageUrl, useRag, extractContract) {
396:     // Build context
397:     let context = '';
398:     if (useRag) {
399:       context = await this.buildContext(message, userId, sessionId);
400:     }
401:     
402:     // Get history
403:     const history = this.getSessionHistory(sessionId);
404:     
405:     // Build messages with contract phase context
406:     const messages = [
407:       { role: 'system', content: this.getSystemPrompt(persona, sessionId) }
408:     ];
409:     
410:     if (context) {
411:       messages.push({
412:         role: 'system',
413:         content: `Контекст для ответа:\n${context}`
414:       });
415:     }
416:     
417:     // Add history
418:     history.forEach(msg => {
419:       messages.push({
420:         role: msg.role,
421:         content: msg.content
422:       });
423:     });
424:     
425:     // Add current message
426:     if (imageUrl) {
427:       messages.push({
428:         role: 'user',
429:         content: [
430:           { type: 'text', text: message },
431:           { type: 'image_url', image_url: { url: imageUrl } }
432:         ]
433:       });
434:     } else {
435:       messages.push({
436:         role: 'user',
437:         content: message
438:       });
439:     }
440:     
441:     // Call Mistral API
442:     try {
443:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
444:         method: 'POST',
445:         headers: {
446:           'Authorization': `Bearer ${this.apiKey}`,
447:           'Content-Type': 'application/json'
448:         },
449:         body: JSON.stringify({
450:           model: this.model,
451:           messages,
452:           temperature: 0.7,
453:           max_tokens: 2000
454:         })
455:       });
456:       
457:       if (!response.ok) {
458:         throw new Error(`Mistral API error: ${response.status}`);
459:       }
460:       
461:       const data = await response.json();
462:       let assistantMessage = data.choices[0].message.content;
463:       
464:       // Sanitize response: remove [Tria] and similar prefixes
465:       assistantMessage = assistantMessage.replace(/^\[(Tria|Hermes|AI|Bot)\]\s*/i, '').trim();
466:       
467:       // Extract contract fields if requested (parallel to memory save)
468:       let extractedFields = null;
469:       if (extractContract) {
470:         extractedFields = await this.extractContractFields(message, sessionId);
471:       }
472:       
473:       // Update contract state
474:       if (extractedFields) {
475:         this.updateContractPhase(sessionId, extractedFields);
476:       }
477:       
478:       // Add to session
479:       this.addToSession(sessionId, 'user', message);
480:       this.addToSession(sessionId, 'assistant', assistantMessage);
481:       
482:       // Save to memory (substantial messages only)
483:       if (message.length > 50) {
484:         await this.rag.addMemory(
485:           userId,
486:           sessionId,
487:           `User: ${message}\nHermes: ${assistantMessage}`,
488:           'conversation'
489:         );
490:       }
491:       
492:       return {
493:         response: assistantMessage,
494:         blocked: false,
495:         context_used: !!context,
496:         tokens_used: data.usage?.total_tokens || 0,
497:         contract_fields: extractedFields,
498:         contract_state: this.getContractState(sessionId),
499:         router_mode: false
500:       };
501:       
502:     } catch (error) {
503:       return {
504:         response: `❌ Ошибка: ${error.message}`,
505:         error: true,
506:         error_message: error.message
507:       };
508:     }
509:   }
510:   
511:   async analyzeImage(imageUrl, prompt, userId, sessionId) {
512:     return this.chat(prompt, userId, sessionId, 'hermes', imageUrl, false);
513:   }
514:   
515:   async getSessionSummary(sessionId) {
516:     const history = this.getSessionHistory(sessionId, 100);
517:     
518:     if (history.length === 0) {
519:       return 'Нет истории сессии';
520:     }
521:     
522:     const conversation = history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
523:     
524:     const messages = [
525:       {
526:         role: 'system',
527:         content: 'Создай краткое резюме этого разговора (2-3 предложения).'
528:       },
529:       {
530:         role: 'user',
531:         content: conversation
532:       }
533:     ];
534:     
535:     try {
536:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
537:         method: 'POST',
538:         headers: {
539:           'Authorization': `Bearer ${this.apiKey}`,
540:           'Content-Type': 'application/json'
541:         },
542:         body: JSON.stringify({
543:           model: this.model,
544:           messages,
545:           temperature: 0.5,
546:           max_tokens: 200
547:         })
548:       });
549:       
550:       const data = await response.json();
551:       return data.choices[0].message.content;
552:       
553:     } catch (error) {
554:       return `Ошибка создания резюме: ${error.message}`;
555:     }
556:   }
557:   
558:   async generateSpec(sessionId) {
559:     const state = this.getContractState(sessionId);
560:     const history = this.getSessionHistory(sessionId, 50);
561:     
562:     const specPrompt = `Ты — генератор структурированных спеков для NeuroEscrow.
563: Создай подробный черновик ТЗ для нейрокодера на основе диалога с клиентом.
564: 
565: Формат ответа — JSON:
566: {
567:   "title": "название проекта",
568:   "description": "подробное описание",
569:   "tech_stack": ["Flutter", "Firebase", "TON Connect"],
570:   "modules": ["модуль 1", "модуль 2"],
571:   "milestones": [{"name": "этап", "percent": 30, "days": 7}],
572:   "budget_ton": 100,
573:   "deadline_days": 30,
574:   "risks": ["риск 1", "риск 2"],
575:   "acceptance_criteria": ["критерий 1", "критерий 2"],
576:   "for_neurocoder": "инструкция для нейрокодера"
577: }`;
578: 
579:     const conversation = history.map(m => `${m.role}: ${m.content}`).join('\n');
580:     
581:     try {
582:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
583:         method: 'POST',
584:         headers: {
585:           'Authorization': `Bearer ${this.apiKey}`,
586:           'Content-Type': 'application/json'
587:         },
588:         body: JSON.stringify({
589:           model: this.model,
590:           messages: [
591:             { role: 'system', content: specPrompt },
592:             { role: 'user', content: `Поля контракта: ${JSON.stringify(state.fields)}\n\nДиалог:\n${conversation}` }
593:           ],
594:           temperature: 0.3,
595:           max_tokens: 3000,
596:           response_format: { type: 'json_object' }
597:         })
598:       });
599:       
600:       if (!response.ok) throw new Error(`API error: ${response.status}`);
601:       const data = await response.json();
602:       return JSON.parse(data.choices[0].message.content);
603:     } catch (error) {
604:       console.warn('[Spec] Generation failed:', error.message);
605:       return null;
606:     }
607:   }
608:   
609:   async assessSatisfaction(sessionId) {
610:     const history = this.getSessionHistory(sessionId, 10);
611:     if (history.length < 2) return { score: 0.5, reason: 'Недостаточно данных' };
612:     
613:     const conversation = history.map(m => `${m.role}: ${m.content}`).join('\n');
614:     
615:     try {
616:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
617:         method: 'POST',
618:         headers: {
619:           'Authorization': `Bearer ${this.apiKey}`,
620:           'Content-Type': 'application/json'
621:         },
622:         body: JSON.stringify({
623:           model: this.model,
624:           messages: [
625:             { role: 'system', content: SATISFACTION_PROMPT },
626:             { role: 'user', content: conversation }
627:           ],
628:           temperature: 0.1,
629:           max_tokens: 100,
630:           response_format: { type: 'json_object' }
631:         })
632:       });
633:       
634:       if (!response.ok) throw new Error(`API error: ${response.status}`);
635:       const data = await response.json();
636:       const parsed = JSON.parse(data.choices[0].message.content);
637:       
638:       const state = this.getContractState(sessionId);
639:       state.satisfaction_score = parsed.score || 0.5;
640:       
641:       return parsed;
642:     } catch (error) {
643:       return { score: 0.5, reason: error.message };
644:     }
645:   }
646:   
647:   clearSession(sessionId) {
648:     this.sessions.delete(sessionId);
649:   }
650: 
651:   async recordFeedback(userId, sessionId, messageId, feedback, text) {
652:     const logEntry = {
653:       user_id: userId,
654:       session_id: sessionId,
655:       message_id: messageId,
656:       feedback,
657:       text_preview: text.substring(0, 100),
658:       timestamp: new Date().toISOString()
659:     };
660: 
661:     console.log(`[FEEDBACK] ${feedback === 'up' ? '👍' : '👎'} user=${userId} session=${sessionId} msg=${messageId}`);
662: 
663:     // Store in KV for analytics
664:     if (this.kvCache) {
665:       try {
666:         const key = `feedback:${sessionId}:${messageId}`;
667:         await this.kvCache.put(key, JSON.stringify(logEntry), { expirationTtl: 86400 * 30 });
668:       } catch (e) {
669:         console.warn('[FEEDBACK] KV storage error:', e.message);
670:       }
671:     }
672: 
673:     return { ok: true, feedback };
674:   }
675: 
676:   getRagStats() {
677:     return {
678:       hits: this.ragHits,
679:       misses: this.ragMisses,
680:       hitRate: this.ragHits + this.ragMisses > 0
681:         ? (this.ragHits / (this.ragHits + this.ragMisses) * 100).toFixed(1) + '%'
682:         : 'N/A'
683:     };
684:   }
685: 
686:   async computeDOV({ semanticLabel, attentionRaw, computeFlops, userId }) {
687:     const astraEndpoint = this.env?.ASTRA_DB_ENDPOINT;
688:     const astraToken = this.env?.ASTRA_DB_TOKEN;
689:     if (!astraEndpoint || !astraToken) throw new Error('AstraDB credentials missing');
690: 
691:     // 1. Embedding смысла жеста (Gemini)
692:     const embedResp = await fetch(
693:       `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${this.env?.GOOGLE_API_KEY}`,
694:       {
695:         method: 'POST',
696:         headers: { 'Content-Type': 'application/json' },
697:         body: JSON.stringify({
698:           model: 'models/gemini-embedding-2-preview',
699:           content: { parts: [{ text: semanticLabel }] },
700:           outputDimensionality: 3072
701:         })
702:       }
703:     );
704:     const embedData = await embedResp.json();
705:     const embedding = embedData.embedding?.values;
706:     if (!embedding) throw new Error('Embedding failed for semanticLabel');
707: 
708:     // 2. SemanticNovelty: поиск похожих смыслов в AstraDB
709:     const searchResp = await fetch(
710:       `${astraEndpoint}/api/json/v1/default_keyspace/gestures_semantic_3072`,
711:       {
712:         method: 'POST',
713:         headers: {
714:           'Content-Type': 'application/json',
715:           'Token': astraToken
716:         },
717:         body: JSON.stringify({
718:           find: {
719:             sort: { $vector: embedding },
720:             options: { limit: 20, includeSimilarity: true }
721:           }
722:         })
723:       }
724:     );
725:     const searchData = await searchResp.json();
726:     const docs = searchData.data?.documents || [];
727:     const N = docs.length || 1;
728:     const k = docs.filter(d => d.$similarity > 0.85).length;
729:     const semanticNovelty = Math.max(0, 1 - k / N);
730: 
731:     // 3. Нормализация метрик
732:     const attention = Math.min(1, Math.max(0, attentionRaw ?? 0.5));
733:     const compute = Math.min(1, (computeFlops ?? 0) / 1e9);
734: 
735:     // 4. Коэффициенты (пока дефолт, далее — DAO)
736:     const alpha = 0.35, beta = 0.30, gamma = 0.35;
737:     const dov = alpha * attention + beta * compute + gamma * semanticNovelty;
738: 
739:     // 5. Сохранение эмбеддинга смысла
740:     const docId = `${userId}_${Date.now()}`;
741:     await fetch(
742:       `${astraEndpoint}/api/json/v1/default_keyspace/gestures_semantic_3072`,
743:       {
744:         method: 'POST',
745:         headers: { 'Content-Type': 'application/json', 'Token': astraToken },
746:         body: JSON.stringify({
747:           insertOne: {
748:             document: {
749:               _id: docId,
750:               $vector: embedding,
751:               semanticLabel,
752:               userId,
753:               timestamp: new Date().toISOString()
754:             }
755:           }
756:         })
757:       }
758:     );
759: 
760:     // 6. Логирование DOV
761:     await fetch(
762:       `${astraEndpoint}/api/json/v1/default_keyspace/gestures_dov_log`,
763:       {
764:         method: 'POST',
765:         headers: { 'Content-Type': 'application/json', 'Token': astraToken },
766:         body: JSON.stringify({
767:           insertOne: {
768:             document: {
769:               _id: `dov_${docId}`,
770:               userId,
771:               semanticLabel,
772:               attention,
773:               compute,
774:               semanticNovelty,
775:               dov,
776:               alpha, beta, gamma,
777:               timestamp: new Date().toISOString()
778:             }
779:           }
780:         })
781:       }
782:     );
783: 
784:     return { dov, attention, compute, semanticNovelty, embedding: docId };
785:   }
786: }
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
 72:         const { message, user_id = 'anonymous', session_id = 'default', persona = 'hermes', use_router = false } = data;
 73: 
 74:         const hermes = new HermesAgent(env.CACHE, env);
 75:         const result = await hermes.chat(message, user_id, session_id, persona, null, true, true, use_router);
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
111:               const result = await hermes.chat(message, user_id, session_id, persona, null, true, true);
112:               const text = result.response || '';
113:               
114:               // Send character by character
115:               for (let i = 0; i < text.length; i++) {
116:                 controller.enqueue(`data: ${JSON.stringify({ char: text[i], index: i, done: false })}\n\n`);
117:               }
118:               
119:               // Send contract fields in final event if extracted
120:               const finalEvent = { done: true, session_id };
121:               if (result.contract_fields) {
122:                 finalEvent.contract_fields = result.contract_fields;
123:               }
124:               controller.enqueue(`data: ${JSON.stringify(finalEvent)}\n\n`);
125:               controller.close();
126:               
127:               // Persist session
128:               ctx.waitUntil(saveSession(env, session_id, hermes.getSessionHistory(session_id)));
129:             } catch (error) {
130:               controller.enqueue(`data: ${JSON.stringify({ error: error.message, done: true })}\n\n`);
131:               controller.close();
132:             }
133:           }
134:         });
135: 
136:         return new Response(stream, {
137:           headers: {
138:             ...corsHeaders,
139:             'Content-Type': 'text/event-stream',
140:             'Cache-Control': 'no-cache',
141:             'Connection': 'keep-alive'
142:           }
143:         });
144:       }
145: 
146:       // Image analysis
147:       if (url.pathname === '/analyze-image' && request.method === 'POST') {
148:         const data = await request.json();
149:         const { image_url, prompt = 'Опиши это изображение', user_id = 'anonymous', session_id = 'default' } = data;
150: 
151:         if (!image_url) {
152:           return new Response(JSON.stringify({ error: 'image_url is required' }), {
153:             status: 400,
154:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
155:           });
156:         }
157: 
158:         const hermes = new HermesAgent(env.CACHE, env);
159:         const result = await hermes.analyzeImage(image_url, prompt, user_id, session_id);
160: 
161:         return new Response(JSON.stringify(result), {
162:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
163:         });
164:       }
165: 
166:       // Feedback endpoint
167:       if (url.pathname === '/feedback' && request.method === 'POST') {
168:         const data = await request.json();
169:         const { message_id, feedback, user_id = 'anonymous', session_id = 'default', text = '' } = data;
170: 
171:         if (!feedback || !['up', 'down'].includes(feedback)) {
172:           return new Response(JSON.stringify({ error: 'feedback must be "up" or "down"' }), {
173:             status: 400,
174:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
175:           });
176:         }
177: 
178:         const hermes = new HermesAgent(env.CACHE, env);
179:         const result = await hermes.recordFeedback(user_id, session_id, message_id, feedback, text);
180: 
181:         return new Response(JSON.stringify(result), {
182:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
183:         });
184:       }
185: 
186:       // DOV Semantic Counter endpoint
187:       if (url.pathname === '/gesture/dov' && request.method === 'POST') {
188:         const contentType = request.headers.get('content-type') || '';
189:         let data;
190:         try {
191:           data = contentType.includes('application/json')
192:             ? await request.json()
193:             : JSON.parse(await request.text());
194:         } catch (e) {
195:           return new Response(
196:             JSON.stringify({ error: 'Invalid JSON', details: e.message }),
197:             { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
198:           );
199:         }
200: 
201:         const { semanticLabel, attentionRaw, computeFlops, userId } = data;
202:         if (!semanticLabel || typeof semanticLabel !== 'string') {
203:           return new Response(
204:             JSON.stringify({ error: 'semanticLabel required' }),
205:             { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
206:           );
207:         }
208: 
209:         try {
210:           const hermes = new HermesAgent(env.CACHE, env);
211:           const result = await hermes.computeDOV({
212:             semanticLabel: semanticLabel.slice(0, 200),
213:             attentionRaw: Number(attentionRaw) || 0.5,
214:             computeFlops: Number(computeFlops) || 0,
215:             userId: userId || 'anonymous'
216:           });
217:           return new Response(
218:             JSON.stringify({ ok: true, ...result }),
219:             { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
220:           );
221:         } catch (e) {
222:           return new Response(
223:             JSON.stringify({ error: 'DOV computation failed', details: e.message }),
224:             { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
225:           );
226:         }
227:       }
228: 
229:       // Stats
230:       if (url.pathname === '/stats') {
231:         const rag = new HermesRAG(env.CACHE, env);
232:         const stats = await rag.getStats();
233: 
234:         return new Response(JSON.stringify(stats), {
235:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
236:         });
237:       }
238: 
239:       // Sessions list
240:       if (url.pathname === '/sessions') {
241:         const sessions = await listSessions(env);
242:         return new Response(JSON.stringify(sessions), {
243:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
244:         });
245:       }
246: 
247:       // Load session
248:       if (url.pathname.startsWith('/session/') && request.method === 'GET') {
249:         const sessionId = url.pathname.split('/')[2];
250:         const session = await loadSession(env, sessionId);
251:         return new Response(JSON.stringify(session || { messages: [] }), {
252:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
253:         });
254:       }
255: 
256:       // Create session
257:       if (url.pathname === '/session' && request.method === 'POST') {
258:         const data = await request.json();
259:         const sessionId = data?.session_id || crypto.randomUUID();
260:         const session = {
261:           id: sessionId,
262:           messages: [],
263:           created_at: new Date().toISOString(),
264:           updated_at: new Date().toISOString()
265:         };
266:         await env.CACHE.put(
267:           `${SESSION_PREFIX}${sessionId}`,
268:           JSON.stringify(session),
269:           { expirationTtl: SESSION_TTL }
270:         );
271:         return new Response(JSON.stringify({ session_id: sessionId }), {
272:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
273:         });
274:       }
275: 
276:       // Delete session
277:       if (url.pathname.startsWith('/session/') && request.method === 'DELETE') {
278:         const sessionId = url.pathname.split('/')[2];
279:         await env.CACHE.delete(`${SESSION_PREFIX}${sessionId}`);
280:         return new Response(JSON.stringify({ ok: true }), {
281:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
282:         });
283:       }
284: 
285:       // Telegram webhook endpoint
286:       if (url.pathname === '/webhook/telegram' && request.method === 'POST') {
287:         const update = await request.json();
288:         const hermes = new HermesAgent(env.CACHE, env);
289:         const result = await handleTelegramUpdate(update, env, hermes);
290:         return new Response(JSON.stringify(result), {
291:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
292:         });
293:       }
294: 
295:       // ═══════════════════════════════════════════════════════════
296:       // NEW ENDPOINTS — Hermes Router Architecture
297:       // ═══════════════════════════════════════════════════════════
298: 
299:       // LLM Pool — список доступных моделей
300:       if (url.pathname === '/llm-pool' && request.method === 'GET') {
301:         const { HermesRouter } = await import('./hermes_router.js');
302:         const router = new HermesRouter(env);
303:         return new Response(JSON.stringify({
304:           llm_pool: router.getLLMPool(),
305:           stats: router.getStats()
306:         }), {
307:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
308:         });
309:       }
310: 
311:       // Currency Rates — актуальные курсы
312:       if (url.pathname === '/rates' && request.method === 'GET') {
313:         const { HermesRouter } = await import('./hermes_router.js');
314:         const router = new HermesRouter(env);
315:         const rates = await router.getRates();
316:         return new Response(JSON.stringify(rates), {
317:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
318:         });
319:       }
320: 
321:       // Cost Estimate — оценка стоимости запроса
322:       if (url.pathname === '/cost-estimate' && request.method === 'POST') {
323:         const data = await request.json();
324:         const { task = 'simple_question', complexity = 1.0, llm = 'mistral_medium_3_5' } = data;
325: 
326:         const { HermesRouter } = await import('./hermes_router.js');
327:         const router = new HermesRouter(env);
328:         const estimate = await router.costEstimator.estimate(task, complexity, llm);
329: 
330:         return new Response(JSON.stringify(estimate), {
331:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
332:         });
333:       }
334: 
335:       // Contract State — состояние контракта сессии
336:       if (url.pathname === '/contract-state' && request.method === 'GET') {
337:         const sessionId = url.searchParams.get('session_id') || 'default';
338:         const hermes = new HermesAgent(env.CACHE, env);
339:         const state = hermes.getContractState(sessionId);
340: 
341:         return new Response(JSON.stringify(state), {
342:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
343:         });
344:       }
345: 
346:       // Generate Spec — генерация структурированного ТЗ
347:       if (url.pathname === '/spec' && request.method === 'POST') {
348:         const data = await request.json();
349:         const { session_id = 'default' } = data;
350: 
351:         const hermes = new HermesAgent(env.CACHE, env);
352:         const spec = await hermes.generateSpec(session_id);
353: 
354:         if (!spec) {
355:           return new Response(JSON.stringify({ error: 'Spec generation failed' }), {
356:             status: 500,
357:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
358:           });
359:         }
360: 
361:         return new Response(JSON.stringify(spec), {
362:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
363:         });
364:       }
365: 
366:       // Satisfaction Assessment — оценка удовлетворённости
367:       if (url.pathname === '/satisfaction' && request.method === 'POST') {
368:         const data = await request.json();
369:         const { session_id = 'default' } = data;
370: 
371:         const hermes = new HermesAgent(env.CACHE, env);
372:         const assessment = await hermes.assessSatisfaction(session_id);
373: 
374:         return new Response(JSON.stringify(assessment), {
375:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
376:         });
377:       }
378: 
379:       // Intent Classification — классификация намерения
380:       if (url.pathname === '/intent' && request.method === 'POST') {
381:         const data = await request.json();
382:         const { message, session_id = 'default' } = data;
383: 
384:         if (!message) {
385:           return new Response(JSON.stringify({ error: 'message required' }), {
386:             status: 400,
387:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
388:           });
389:         }
390: 
391:         const { HermesRouter } = await import('./hermes_router.js');
392:         const router = new HermesRouter(env);
393:         const hermes = new HermesAgent(env.CACHE, env);
394:         const contractState = hermes.getContractState(session_id);
395:         const intent = await router.intentRouter.classify(message, contractState);
396: 
397:         return new Response(JSON.stringify(intent), {
398:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
399:         });
400:       }
401: 
402:       // Router Stats — статистика роутера
403:       if (url.pathname === '/router-stats' && request.method === 'GET') {
404:         const { HermesRouter } = await import('./hermes_router.js');
405:         const router = new HermesRouter(env);
406:         return new Response(JSON.stringify(router.getStats()), {
407:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
408:         });
409:       }
410: 
411:       return new Response(JSON.stringify({ error: 'Not found' }), {
412:         status: 404,
413:         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
414:       });
415: 
416:     } catch (error) {
417:       return new Response(JSON.stringify({ error: error.message }), {
418:         status: 500,
419:         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
420:       });
421:     }
422:   },
423: 
424:   // Scheduled handler for session cleanup (cron trigger)
425:   async scheduled(event, env, ctx) {
426:     ctx.waitUntil(cleanupExpiredSessions(env));
427:   }
428: };
429: 
430: // === KV Session Helpers ===
431: 
432: async function saveSession(env, sessionId, history) {
433:   if (!env.CACHE || !sessionId || sessionId === 'default') return;
434: 
435:   try {
436:     const key = `${SESSION_PREFIX}${sessionId}`;
437:     const existing = await env.CACHE.get(key);
438:     const session = existing ? JSON.parse(existing) : {
439:       id: sessionId,
440:       messages: [],
441:       created_at: new Date().toISOString()
442:     };
443: 
444:     session.messages = history.slice(-50); // Keep last 50 messages
445:     session.updated_at = new Date().toISOString();
446: 
447:     await env.CACHE.put(key, JSON.stringify(session), {
448:       expirationTtl: SESSION_TTL
449:     });
450:   } catch (error) {
451:     // KV errors are non-critical
452:   }
453: }
454: 
455: async function loadSession(env, sessionId) {
456:   if (!env.CACHE) return null;
457: 
458:   try {
459:     const key = `${SESSION_PREFIX}${sessionId}`;
460:     const data = await env.CACHE.get(key);
461:     return data ? JSON.parse(data) : null;
462:   } catch (error) {
463:     return null;
464:   }
465: }
466: 
467: async function listSessions(env) {
468:   if (!env.CACHE) return [];
469: 
470:   try {
471:     const list = await env.CACHE.list({ prefix: SESSION_PREFIX });
472:     return list.keys.map(key => ({
473:       id: key.name.replace(SESSION_PREFIX, ''),
474:       updated_at: key.metadata?.updated_at || null
475:     }));
476:   } catch (error) {
477:     return [];
478:   }
479: }
480: 
481: async function cleanupExpiredSessions(env) {
482:   if (!env.CACHE) return;
483: 
484:   try {
485:     const list = await env.CACHE.list({ prefix: SESSION_PREFIX });
486:     const now = Date.now();
487:     let cleaned = 0;
488: 
489:     for (const key of list.keys) {
490:       // KV with expirationTtl handles auto-cleanup,
491:       // but we can force-delete stale sessions older than 48h
492:       if (key.metadata?.updated_at) {
493:         const updated = new Date(key.metadata.updated_at).getTime();
494:         if (now - updated > 172800000) { // 48h
495:           await env.CACHE.delete(key.name);
496:           cleaned++;
497:         }
498:       }
499:     }
500: 
501:     console.log(`Session cleanup: ${cleaned} expired sessions removed`);
502:   } catch (error) {
503:     console.error(`Session cleanup error: ${error.message}`);
504:   }
505: }
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
 443:     applyExtractedFields(fields, contractState = null) {
 444:         if (!fields || typeof fields !== 'object') return;
 445:         
 446:         let changed = false;
 447:         const fieldLabels = {
 448:             title: 'Название задачи',
 449:             description: 'Описание',
 450:             budget: 'Бюджет',
 451:             deadline: 'Дедлайн',
 452:             client: 'Клиент',
 453:             coder: 'Нейрокодер'
 454:         };
 455:         
 456:         for (const [field, value] of Object.entries(fields)) {
 457:             if (value && this.smartContract.fields.hasOwnProperty(field)) {
 458:                 const oldVal = this.smartContract.fields[field];
 459:                 if (!oldVal || oldVal !== value) {
 460:                     this.smartContract.fields[field] = value;
 461:                     changed = true;
 462:                     console.log(`[Contract] Auto-filled ${field}: ${value}`);
 463:                 }
 464:             }
 465:         }
 466:         
 467:         // If router sent contract_state, sync phase and completeness
 468:         if (contractState) {
 469:             this.smartContract.phase = contractState.phase || this.smartContract.phase;
 470:             this.smartContract.completeness = contractState.completeness || 0;
 471:             console.log(`[Contract] Phase: ${this.smartContract.phase}, Completeness: ${(this.smartContract.completeness * 100).toFixed(0)}%`);
 472:         }
 473:         
 474:         if (changed) {
 475:             this.renderContractPanel();
 476:             this.saveContractState();
 477:             
 478:             // Auto-advance phase if title and description are filled
 479:             if (this.smartContract.fields.title && this.smartContract.fields.description && this.smartContract.phase === 'draft') {
 480:                 this.setContractPhase('review');
 481:             }
 482:         }
 483:     }
 484: 
 485:     setContractPhase(phase) {
 486:         const validPhases = ['draft', 'review', 'sorting', 'agreement', 'escrow', 'completed'];
 487:         if (validPhases.includes(phase)) {
 488:             this.smartContract.phase = phase;
 489:             this.smartContract.fields.status = phase === 'completed' ? 'completed' : phase;
 490:             this.renderContractPanel();
 491:             this.saveContractState();
 492:         }
 493:     }
 494: 
 495:     updateContractProgress(percent) {
 496:         this.smartContract.progress = Math.max(0, Math.min(100, percent));
 497:         this.renderContractPanel();
 498:         this.saveContractState();
 499:     }
 500: 
 501:     saveContractState() {
 502:         try {
 503:             const data = JSON.stringify(this.smartContract);
 504:             if (window.Telegram?.WebApp?.CloudStorage) {
 505:                 Telegram.WebApp.CloudStorage.setItem('neuroescrow_contract', data, () => {});
 506:             } else {
 507:                 localStorage.setItem('neuroescrow_contract', data);
 508:             }
 509:         } catch (e) {
 510:             console.warn('[Contract] Save failed:', e);
 511:         }
 512:     }
 513: 
 514:     loadContractState() {
 515:         try {
 516:             let raw = null;
 517:             if (window.Telegram?.WebApp?.CloudStorage) {
 518:                 raw = new Promise((res, rej) => 
 519:                     Telegram.WebApp.CloudStorage.getItem('neuroescrow_contract', (err, val) => err ? rej(err) : res(val))
 520:                 );
 521:             } else {
 522:                 raw = localStorage.getItem('neuroescrow_contract');
 523:             }
 524:             if (raw) {
 525:                 const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
 526:                 if (data && data.fields) {
 527:                     this.smartContract = { ...this.smartContract, ...data };
 528:                 }
 529:             }
 530:         } catch (e) {
 531:             console.warn('[Contract] Load failed:', e);
 532:         }
 533:         this.renderContractPanel();
 534:     }
 535: 
 536:     bindChatInputEvents() {
 537:         // Enter key fix for chat input — prevent form submit / page reload
 538:         const chatInput = document.getElementById('chat-input');
 539:         if (chatInput) {
 540:             chatInput.addEventListener('keydown', (e) => {
 541:                 if (e.key === 'Enter' && !e.shiftKey) {
 542:                     e.preventDefault();
 543:                     this.sendTextMessage();
 544:                 }
 545:             });
 546:         }
 547: 
 548:         // Prevent any accidental form submit if input is wrapped in <form>
 549:         const chatContainer = document.getElementById('chat-input-container');
 550:         if (chatContainer) {
 551:             chatContainer.addEventListener('submit', (e) => e.preventDefault());
 552:         }
 553: 
 554:         // Ensure send button is type="button" not "submit"
 555:         const sendBtn = document.getElementById('send-btn');
 556:         if (sendBtn && !sendBtn.getAttribute('type')) {
 557:             sendBtn.setAttribute('type', 'button');
 558:         }
 559:     }
 560: 
 561:     initSplitDivider() {
 562:         const divider = document.getElementById('split-divider');
 563:         if (!divider) return;
 564: 
 565:         let isDragging = false;
 566:         let startX, startY, startWidth;
 567: 
 568:         const onMouseDown = (e) => {
 569:             isDragging = true;
 570:             divider.classList.add('dragging');
 571:             startX = e.clientX || e.touches?.[0]?.clientX || 0;
 572:             startY = e.clientY || e.touches?.[0]?.clientY || 0;
 573:             const leftPane = divider.previousElementSibling;
 574:             startWidth = leftPane?.getBoundingClientRect().width || 0;
 575:             document.addEventListener('mousemove', onMouseMove);
 576:             document.addEventListener('mouseup', onMouseUp);
 577:             document.addEventListener('touchmove', onTouchMove, { passive: false });
 578:             document.addEventListener('touchend', onTouchEnd);
 579:         };
 580: 
 581:         const onMouseMove = (e) => {
 582:             if (!isDragging) return;
 583:             const dx = (e.clientX || 0) - startX;
 584:             const container = divider.parentElement;
 585:             const totalWidth = container?.getBoundingClientRect().width || 1;
 586:             const newWidth = Math.max(200, Math.min(totalWidth - 200, startWidth + dx));
 587:             const leftPane = divider.previousElementSibling;
 588:             const rightPane = divider.nextElementSibling;
 589:             if (leftPane) leftPane.style.flex = `0 0 ${newWidth}px`;
 590:             if (rightPane) rightPane.style.flex = '1';
 591:         };
 592: 
 593:         const onMouseUp = () => {
 594:             isDragging = false;
 595:             divider.classList.remove('dragging');
 596:             document.removeEventListener('mousemove', onMouseMove);
 597:             document.removeEventListener('mouseup', onMouseUp);
 598:         };
 599: 
 600:         const onTouchMove = (e) => {
 601:             if (!isDragging) return;
 602:             e.preventDefault();
 603:             const dx = (e.touches?.[0]?.clientX || 0) - startX;
 604:             const container = divider.parentElement;
 605:             const totalWidth = container?.getBoundingClientRect().width || 1;
 606:             const newWidth = Math.max(200, Math.min(totalWidth - 200, startWidth + dx));
 607:             const leftPane = divider.previousElementSibling;
 608:             if (leftPane) leftPane.style.flex = `0 0 ${newWidth}px`;
 609:         };
 610: 
 611:         const onTouchEnd = () => {
 612:             isDragging = false;
 613:             divider.classList.remove('dragging');
 614:             document.removeEventListener('touchmove', onTouchMove);
 615:             document.removeEventListener('touchend', onTouchEnd);
 616:         };
 617: 
 618:         divider.addEventListener('mousedown', onMouseDown);
 619:         divider.addEventListener('touchstart', (e) => {
 620:             startX = e.touches?.[0]?.clientX || 0;
 621:             startY = e.touches?.[0]?.clientY || 0;
 622:             onMouseDown(e);
 623:         }, { passive: true });
 624:     }
 625: 
 626:     toggleVoice() {
 627:         // Explicit protection against multiple taps during processing
 628:         if (this.voiceState === 'PROCESSING' || this.isProcessing) {
 629:             return;
 630:         }
 631:         
 632:         if (this.voiceState === 'LISTENING') {
 633:             this.stopVoiceRecording();
 634:         } else {
 635:             this.voiceState = 'LISTENING';
 636:             this.updateVoiceButton();
 637:             this.startVoiceRecording();
 638:         }
 639:         
 640:         telegram.haptic('medium');
 641:     }
 642: 
 643:     async startVoiceRecording() {
 644:         try {
 645:             const tg = window.Telegram?.WebApp;
 646:             // Try native Telegram voice recording (Bot API 9.6+)
 647:             if (tg && typeof tg.requestVoiceMessage === 'function') {
 648:                 const result = await tg.requestVoiceMessage();
 649:                 
 650:                 if (result && result.file_id) {
 651:                     this.sendVoiceToBot(result.file_id, result.duration);
 652:                 } else {
 653:                     throw new Error('No file_id received');
 654:                 }
 655:             } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
 656:                 // Fallback to manual recording
 657:                 this.fallbackToManualRecording();
 658:             } else {
 659:                 telegram.showAlert('Запись голоса не поддерживается в вашем браузере. Используйте текстовый ввод.');
 660:             }
 661:         } catch (error) {
 662:             console.error('[Voice] Recording failed:', error.message);
 663:             this.handleVoiceError(error);
 664:         }
 665:     }
 666: 
 667:     stopVoiceRecording() {
 668:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
 669:             this.mediaRecorder.stop();
 670:         }
 671:         this.resetVoiceState();
 672:     }
 673: 
 674:     fallbackToManualRecording() {
 675:         navigator.mediaDevices.getUserMedia({ audio: true })
 676:             .then(stream => {
 677:                 this.mediaRecorder = new MediaRecorder(stream);
 678:                 this.audioChunks = [];
 679:                 
 680:                 this.mediaRecorder.ondataavailable = (e) => {
 681:                     this.audioChunks.push(e.data);
 682:                 };
 683:                 
 684:                 this.mediaRecorder.onstop = () => {
 685:                     const audioBlob = new Blob(this.audioChunks, { type: 'audio/ogg' });
 686:                     this.uploadVoiceBlob(audioBlob);
 687:                     stream.getTracks().forEach(track => track.stop());
 688:                 };
 689:                 
 690:                 this.mediaRecorder.start();
 691:                 console.log('[NeuroEscrow] Fallback recording started');
 692:             })
 693:             .catch(error => {
 694:                 this.handleVoiceError(error);
 695:             });
 696:     }
 697: 
 698:     uploadVoiceBlob(blob) {
 699:         // This would require bot-side endpoint for blob upload
 700:         // For now, just show error
 701:         this.handleVoiceError(new Error('Manual recording not yet implemented'));
 702:     }
 703: 
 704:     sendVoiceToBot(fileId, duration) {
 705:         this.voiceState = 'PROCESSING';
 706:         this.isProcessing = true;
 707:         this.updateVoiceButton();
 708:         this.setupResponseTimeout();
 709:         
 710:         const payload = {
 711:             action: 'voice_message',
 712:             file_id: fileId,
 713:             duration: duration,
 714:             timestamp: Date.now(),
 715:             user_id: telegram.getUserId()
 716:         };
 717:         
 718:         telegram.sendData(payload);
 719:         console.log('[NeuroEscrow] Voice sent to bot:', fileId);
 720:     }
 721: 
 722:     updateVoiceButton() {
 723:         const btn = document.getElementById('voice-btn');
 724:         const status = document.getElementById('voice-status');
 725:         
 726:         if (!btn) return;
 727:         
 728:         // Remove all state classes
 729:         btn.classList.remove('recording', 'processing');
 730:         
 731:         switch (this.voiceState) {
 732:             case 'IDLE':
 733:                 if (status) { status.textContent = ''; status.style.display = 'none'; }
 734:                 this.isRecording = false;
 735:                 break;
 736:                 
 737:             case 'LISTENING':
 738:                 btn.classList.add('recording');
 739:                 if (status) { status.textContent = 'Слушаю...'; status.style.display = 'block'; }
 740:                 this.isRecording = true;
 741:                 break;
 742:                 
 743:             case 'PROCESSING':
 744:                 btn.classList.add('processing');
 745:                 if (status) { status.textContent = 'Гермес обрабатывает...'; status.style.display = 'block'; }
 746:                 this.isRecording = false;
 747:                 break;
 748:         }
 749:     }
 750: 
 751:     setupResponseTimeout() {
 752:         if (this.responseTimeout) {
 753:             clearTimeout(this.responseTimeout);
 754:         }
 755:         
 756:         this.responseTimeout = setTimeout(() => {
 757:             if (this.voiceState === 'PROCESSING') {
 758:                 this.handleVoiceError(new Error('timeout'));
 759:             }
 760:         }, 30000);
 761:     }
 762: 
 763:     handleVoiceError(error) {
 764:         console.error('[NeuroEscrow] Voice error:', error);
 765:         
 766:         this.resetVoiceState();
 767:         
 768:         let message = 'Ошибка записи голоса';
 769:         
 770:         if (error.message.includes('permission')) {
 771:             message = 'Нет доступа к микрофону';
 772:         } else if (error.message.includes('timeout')) {
 773:             message = 'Превышено время ожидания';
 774:         } else if (error.message.includes('cancelled')) {
 775:             message = 'Запись отменена';
 776:         }
 777:         
 778:         telegram.showAlert(message);
 779:         telegram.hapticNotification('error');
 780:     }
 781: 
 782:     resetVoiceState() {
 783:         this.voiceState = 'IDLE';
 784:         this.isRecording = false;
 785:         this.isProcessing = false;
 786:         this.updateVoiceButton();
 787:         
 788:         if (this.responseTimeout) {
 789:             clearTimeout(this.responseTimeout);
 790:             this.responseTimeout = null;
 791:         }
 792:     }
 793: 
 794:     handleDraftCreated(draft) {
 795:         if (this.responseTimeout) {
 796:             clearTimeout(this.responseTimeout);
 797:         }
 798:         
 799:         // Check for duplicates
 800:         const existingIndex = this.deals.findIndex(d => d.id === draft.id);
 801:         if (existingIndex !== -1) {
 802:             this.deals[existingIndex] = { ...draft, type: 'draft', isNew: true };
 803:         } else {
 804:             this.deals.unshift({ ...draft, type: 'draft', isNew: true });
 805:         }
 806:         
 807:         this.resetVoiceState();
 808:         this.saveCache(); // Save immediately after adding draft
 809:         this.navigate('deals');
 810:         
 811:         telegram.hapticNotification('success');
 812:         telegram.showAlert('Черновик создан');
 813:         
 814:         console.log('[NeuroEscrow] Draft created:', draft.id);
 815:     }
 816: 
 817:     // -------------------------------------------------------------------------
 818:     // Deals View
 819:     // -------------------------------------------------------------------------
 820: 
 821:     renderDealsView(container) {
 822:         const view = document.createElement('div');
 823:         view.className = 'view';
 824:         
 825:         const deals = this.deals.length > 0 ? this.deals : this.getSampleDeals();
 826:         
 827:         view.innerHTML = `
 828:             <div class="split-layout">
 829:                 <div class="split-pane left-pane">
 830:                     <div class="pane-glass">
 831:                         <div class="pane-header">
 832:                             <span class="pane-header-dot purple"></span>
 833:                             <span class="pane-header-icon">🤝</span>
 834:                             <span class="pane-header-title">Сделки</span>
 835:                         </div>
 836:                         <div class="pane-content" style="padding:16px;">
 837:                             <h2 style="font-size:18px;margin-bottom:16px;font-weight:600;">Мои сделки</h2>
 838:                             ${deals.length === 0 ? this.emptyState('🤝', 'У вас пока нет сделок') : ''}
 839:                             <div id="deals-list">
 840:                                 ${deals.map(deal => deal.type === 'draft' ? this.renderDraftCard(deal) : this.dealCard(deal)).join('')}
 841:                             </div>
 842:                         </div>
 843:                         <div class="bottom-nav-left">
 844:                             <button class="nav-btn-left" data-view="hermes" onclick="app.navigate('hermes')">
 845:                                 <span class="nav-icon">🎙️</span>
 846:                                 <span class="nav-label">Гермес</span>
 847:                             </button>
 848:                             <button class="nav-btn-left active" data-view="deals" onclick="app.navigate('deals')">
 849:                                 <span class="nav-icon">🤝</span>
 850:                                 <span class="nav-label">Сделки</span>
 851:                             </button>
 852:                             <button class="nav-btn-left" data-view="profile" onclick="app.navigate('profile')">
 853:                                 <span class="nav-icon">👤</span>
 854:                                 <span class="nav-label">Профиль</span>
 855:                             </button>
 856:                             <button class="nav-btn-left" id="micButton" onclick="app.toggleVoiceRecording()">
 857:                                 <span class="nav-icon">🎤</span>
 858:                                 <span class="nav-label">Микрофон</span>
 859:                             </button>
 860:                         </div>
 861:                     </div>
 862:                 </div>
 863:                 <div class="split-divider" id="split-divider"></div>
 864:                 <div class="split-pane right-pane">
 865:                     <div class="pane-glass">
 866:                         <div class="pane-header">
 867:                             <span class="pane-header-dot green"></span>
 868:                             <span class="pane-header-icon">📋</span>
 869:                             <span class="pane-header-title">Смарт-контракт</span>
 870:                         </div>
 871:                         <div class="pane-content" id="smart-contract-panel-deals">
 872:                             <div id="contract-phases" class="contract-phases">
 873:                                 <div class="phase-step" data-phase="draft">
 874:                                     <span class="phase-icon">📝</span>
 875:                                     <span class="phase-label">Составление</span>
 876:                                 </div>
 877:                                 <div class="phase-step" data-phase="review">
 878:                                     <span class="phase-icon">✅</span>
 879:                                     <span class="phase-label">Согласование</span>
 880:                                 </div>
 881:                                 <div class="phase-step" data-phase="sorting">
 882:                                     <span class="phase-icon">🔍</span>
 883:                                     <span class="phase-label">Подбор</span>
 884:                                 </div>
 885:                                 <div class="phase-step" data-phase="agreement">
 886:                                     <span class="phase-icon">🤝</span>
 887:                                     <span class="phase-label">Сделка</span>
 888:                                 </div>
 889:                                 <div class="phase-step" data-phase="escrow">
 890:                                     <span class="phase-icon">💰</span>
 891:                                     <span class="phase-label">Эскроу</span>
 892:                                 </div>
 893:                             </div>
 894:                             <div id="contract-fields" class="contract-fields">
 895:                                 <div class="contract-field" data-field="title">
 896:                                     <label class="field-label">Название задачи</label>
 897:                                     <div class="field-value" id="field-title">—</div>
 898:                                 </div>
 899:                                 <div class="contract-field" data-field="description">
 900:                                     <label class="field-label">Описание</label>
 901:                                     <div class="field-value" id="field-description">—</div>
 902:                                 </div>
 903:                                 <div class="contract-field" data-field="budget">
 904:                                     <label class="field-label">Бюджет (TON)</label>
 905:                                     <div class="field-value" id="field-budget">—</div>
 906:                                 </div>
 907:                                 <div class="contract-field" data-field="deadline">
 908:                                     <label class="field-label">Дедлайн</label>
 909:                                     <div class="field-value" id="field-deadline">—</div>
 910:                                 </div>
 911:                                 <div class="contract-field" data-field="client">
 912:                                     <label class="field-label">Клиент</label>
 913:                                     <div class="field-value" id="field-client">—</div>
 914:                                 </div>
 915:                                 <div class="contract-field" data-field="coder">
 916:                                     <label class="field-label">Нейрокодер</label>
 917:                                     <div class="field-value" id="field-coder">—</div>
 918:                                 </div>
 919:                                 <div class="contract-field" data-field="status">
 920:                                     <label class="field-label">Статус</label>
 921:                                     <div class="field-value" id="field-status">
 922:                                         <span class="status-badge draft">Черновик</span>
 923:                                     </div>
 924:                                 </div>
 925:                             </div>
 926:                         </div>
 927:                     </div>
 928:                 </div>
 929:             </div>
 930:         `;
 931:         
 932:         container.appendChild(view);
 933:         this.initSplitDivider();
 934:         this.renderContractPanel();
 935:     }
 936: 
 937:     renderDraftCard(draft) {
 938:         const title = this.escapeHtml(draft.title || 'Без названия');
 939:         const description = this.escapeHtml(draft.description || '');
 940:         const budget = draft.budget || 'Не указан';
 941:         const deadline = draft.deadline || 'Не указан';
 942:         
 943:         return `
 944:             <div class="card draft-card" style="border-left:2px solid rgba(255, 255, 255, 0.34);">
 945:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
 946:                     <span style="font-size:12px;font-weight:600;color:rgba(255, 255, 255, 0.34);text-transform:uppercase;letter-spacing:0.5px;">Черновик</span>
 947:                     <span style="font-size:11px;color:var(--ne-light-gray);">${this.formatDate(draft.created_at)}</span>
 948:                 </div>
 949:                 <div class="card-title">${title}</div>
 950:                 <p style="font-size:13px;color:var(--ne-light-gray);margin:8px 0;">${description}</p>
 951:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
 952:                     <span>💰 ${budget}</span>
 953:                     <span>⏱️ ${deadline}</span>
 954:                 </div>
 955:                 <div style="display:flex;gap:8px;margin-top:12px;">
 956:                     <button class="btn btn-primary" onclick="app.editDraft('${draft.id}')" style="flex:1;">Редактировать</button>
 957:                     <button class="btn btn-secondary" onclick="app.publishDraft('${draft.id}')" style="flex:1;">Опубликовать</button>
 958:                 </div>
 959:             </div>
 960:         `;
 961:     }
 962: 
 963:     dealCard(deal) {
 964:         const statusColors = {
 965:             'draft': 'rgba(255, 255, 255, 0.34)',
 966:             'negotiating': '#dddddd',
 967:             'in_progress': '#dddddd',
 968:             'completed': 'rgba(255, 255, 255, 0.67)'
 969:         };
 970:         
 971:         const statusNames = {
 972:             'draft': 'Черновик',
 973:             'negotiating': 'Переговоры',
 974:             'in_progress': 'В работе',
 975:             'completed': 'Завершена'
 976:         };
 977:         
 978:         const color = statusColors[deal.status] || 'rgba(255, 255, 255, 0.34)';
 979:         const statusName = statusNames[deal.status] || deal.status;
 980:         
 981:         return `
 982:             <div class="card" style="border-left:2px solid ${color};">
 983:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
 984:                     <span style="font-size:12px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${statusName}</span>
 985:                     <span style="font-size:11px;color:var(--ne-light-gray);">#${deal.id}</span>
 986:                 </div>
 987:                 <div class="card-title">${deal.title}</div>
 988:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
 989:                     <span>💰 ${deal.budget} USDT</span>
 990:                     <span>👤 ${deal.counterparty}</span>
 991:                 </div>
 992:                 <div style="margin-top:12px;">
 993:                     <button class="btn btn-secondary" onclick="app.viewDeal('${deal.id}')">Открыть в боте</button>
 994:                 </div>
 995:             </div>
 996:         `;
 997:     }
 998: 
 999:     getSampleDeals() {
1000:         return [
1001:             { id: 'a1b2', title: 'Telegram бот для интернет-магазина', status: 'in_progress', budget: '500', counterparty: 'client_42' },
1002:             { id: 'c3d4', title: 'Парсер данных с сайта', status: 'completed', budget: '300', counterparty: 'client_17' },
1003:         ];
1004:     }
1005: 
1006:     viewDeal(dealId) {
1007:         telegram.sendData({ action: 'view_deal', deal_id: dealId });
1008:         telegram.showAlert('Открываю детали сделки в боте...');
1009:     }
1010: 
1011:     editDraft(draftId) {
1012:         telegram.sendData({ action: 'edit_draft', draft_id: draftId });
1013:         telegram.showAlert('Открываю редактор в боте...');
1014:     }
1015: 
1016:     publishDraft(draftId) {
1017:         telegram.sendData({ action: 'publish_draft', draft_id: draftId });
1018:         telegram.showAlert('Публикую черновик...');
1019:     }
1020: 
1021:     escapeHtml(text) {
1022:         const div = document.createElement('div');
1023:         div.textContent = text;
1024:         return div.innerHTML;
1025:     }
1026: 
1027:     formatDate(timestamp) {
1028:         if (!timestamp) return '';
1029:         const date = new Date(timestamp * 1000);
1030:         const now = new Date();
1031:         const diff = now - date;
1032:         
1033:         if (diff < 60000) return 'только что';
1034:         if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
1035:         if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
1036:         
1037:         return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
1038:     }
1039: 
1040:     // -------------------------------------------------------------------------
1041:     // Profile View
1042:     // -------------------------------------------------------------------------
1043: 
1044:     renderProfileView(container) {
1045:         const view = document.createElement('div');
1046:         view.className = 'view';
1047:         
1048:         view.innerHTML = `
1049:             <div class="split-layout">
1050:                 <div class="split-pane left-pane">
1051:                     <div class="pane-glass">
1052:                         <div class="pane-header">
1053:                             <span class="pane-header-dot purple"></span>
1054:                             <span class="pane-header-icon">👤</span>
1055:                             <span class="pane-header-title">Профиль</span>
1056:                         </div>
1057:                         <div class="pane-content" style="padding:16px;">
1058:                             <div class="card" style="text-align:center;padding:24px;">
1059:                                 <div style="font-size:32px;font-weight:700;margin-bottom:8px;">${this.balance.toFixed(2)} USDT</div>
1060:                                 <div style="font-size:13px;color:var(--ne-light-gray);margin-bottom:20px;">Ваш баланс</div>
1061:                                 <div style="display:flex;gap:8px;margin-bottom:16px;">
1062:                                     <button class="btn btn-primary" onclick="app.donate()" style="flex:1;">💝 Поддержать</button>
1063:                                     <button class="btn btn-secondary" onclick="app.leaveTip()" style="flex:1;">⭐ Чаевые</button>
1064:                                 </div>
1065:                                 <div style="font-size:11px;color:var(--ne-light-gray);margin-top:12px;">TON • USDT • Telegram Stars</div>
1066:                             </div>
1067:                             <div id="ton-connect" style="margin:16px 0;"></div>
1068:                             <div class="card">
1069:                                 <div class="card-title">Настройки</div>
1070:                                 <div class="form-group">
1071:                                     <label class="form-label">LLM Модель</label>
1072:                                     <select class="form-input" id="model-selector">
1073:                                         <option value="auto">Автоматически</option>
1074:                                         <option value="gpt-4">GPT-4</option>
1075:                                         <option value="claude">Claude</option>
1076:                                         <option value="grok">Grok</option>
1077:                                         <option value="custom">Своя модель</option>
1078:                                     </select>
1079:                                 </div>
1080:                             </div>
1081:                         </div>
1082:                         <div class="bottom-nav-left">
1083:                             <button class="nav-btn-left" data-view="hermes" onclick="app.navigate('hermes')">
1084:                                 <span class="nav-icon">🎙️</span>
1085:                                 <span class="nav-label">Гермес</span>
1086:                             </button>
1087:                             <button class="nav-btn-left" data-view="deals" onclick="app.navigate('deals')">
1088:                                 <span class="nav-icon">🤝</span>
1089:                                 <span class="nav-label">Сделки</span>
1090:                             </button>
1091:                             <button class="nav-btn-left active" data-view="profile" onclick="app.navigate('profile')">
1092:                                 <span class="nav-icon">👤</span>
1093:                                 <span class="nav-label">Профиль</span>
1094:                             </button>
1095:                             <button class="nav-btn-left" id="micButton" onclick="app.toggleVoiceRecording()">
1096:                                 <span class="nav-icon">🎤</span>
1097:                                 <span class="nav-label">Микрофон</span>
1098:                             </button>
1099:                         </div>
1100:                     </div>
1101:                 </div>
1102:                 <div class="split-divider" id="split-divider"></div>
1103:                 <div class="split-pane right-pane">
1104:                     <div class="pane-glass">
1105:                         <div class="pane-header">
1106:                             <span class="pane-header-dot green"></span>
1107:                             <span class="pane-header-icon">📋</span>
1108:                             <span class="pane-header-title">Смарт-контракт</span>
1109:                         </div>
1110:                         <div class="pane-content" id="smart-contract-panel-profile">
1111:                             <div id="contract-phases" class="contract-phases">
1112:                                 <div class="phase-step" data-phase="draft">
1113:                                     <span class="phase-icon">📝</span>
1114:                                     <span class="phase-label">Составление</span>
1115:                                 </div>
1116:                                 <div class="phase-step" data-phase="review">
1117:                                     <span class="phase-icon">✅</span>
1118:                                     <span class="phase-label">Согласование</span>
1119:                                 </div>
1120:                                 <div class="phase-step" data-phase="sorting">
1121:                                     <span class="phase-icon">🔍</span>
1122:                                     <span class="phase-label">Подбор</span>
1123:                                 </div>
1124:                                 <div class="phase-step" data-phase="agreement">
1125:                                     <span class="phase-icon">🤝</span>
1126:                                     <span class="phase-label">Сделка</span>
1127:                                 </div>
1128:                                 <div class="phase-step" data-phase="escrow">
1129:                                     <span class="phase-icon">💰</span>
1130:                                     <span class="phase-label">Эскроу</span>
1131:                                 </div>
1132:                             </div>
1133:                             <div id="contract-fields" class="contract-fields">
1134:                                 <div class="contract-field" data-field="title">
1135:                                     <label class="field-label">Название задачи</label>
1136:                                     <div class="field-value" id="field-title">—</div>
1137:                                 </div>
1138:                                 <div class="contract-field" data-field="description">
1139:                                     <label class="field-label">Описание</label>
1140:                                     <div class="field-value" id="field-description">—</div>
1141:                                 </div>
1142:                                 <div class="contract-field" data-field="budget">
1143:                                     <label class="field-label">Бюджет (TON)</label>
1144:                                     <div class="field-value" id="field-budget">—</div>
1145:                                 </div>
1146:                                 <div class="contract-field" data-field="deadline">
1147:                                     <label class="field-label">Дедлайн</label>
1148:                                     <div class="field-value" id="field-deadline">—</div>
1149:                                 </div>
1150:                                 <div class="contract-field" data-field="client">
1151:                                     <label class="field-label">Клиент</label>
1152:                                     <div class="field-value" id="field-client">—</div>
1153:                                 </div>
1154:                                 <div class="contract-field" data-field="coder">
1155:                                     <label class="field-label">Нейрокодер</label>
1156:                                     <div class="field-value" id="field-coder">—</div>
1157:                                 </div>
1158:                                 <div class="contract-field" data-field="status">
1159:                                     <label class="field-label">Статус</label>
1160:                                     <div class="field-value" id="field-status">
1161:                                         <span class="status-badge draft">Черновик</span>
1162:                                     </div>
1163:                                 </div>
1164:                             </div>
1165:                         </div>
1166:                     </div>
1167:                 </div>
1168:             </div>
1169:         `;
1170:         
1171:         container.appendChild(view);
1172:         this.initSplitDivider();
1173:         this.renderContractPanel();
1174:         
1175:         setTimeout(() => {
1176:             tonConnect.init('ton-connect');
1177:         }, 100);
1178:     }
1179: 
1180:     donate() {
1181:         telegram.showAlert('Выберите способ:\n\n⭐ Stars: 50, 100, 250, 500\n💎 TON: 1, 5, 10, 25\n💵 USDT: 5, 10, 25, 50');
1182:     }
1183: 
1184:     leaveTip() {
1185:         telegram.showAlert('Быстрые чаевые:\n\n10 ⭐ | 25 ⭐ | 50 ⭐ | 100 ⭐');
1186:     }
1187: 
1188:     onTonStatusChange(detail) {
1189:         console.log('[App] TON status changed:', detail);
1190:     }
1191: 
1192:     async loadCache() {
1193:         try {
1194:             const cached = await telegram.cloudGet('neuroescrow_data');
1195:             if (cached) {
1196:                 this.deals = cached.deals || [];
1197:                 this.balance = cached.balance || 0;
1198:                 this.chatMessages = cached.chatMessages || [];
1199:                 console.log('[App] Cache loaded');
1200:             }
1201:         } catch (e) {
1202:             console.log('[App] No cache found');
1203:         }
1204:     }
1205: 
1206:     async saveCache() {
1207:         const data = {
1208:             deals: this.deals,
1209:             balance: this.balance,
1210:             chatMessages: this.chatMessages,
1211:             timestamp: Date.now()
1212:         };
1213:         await telegram.cloudSet('neuroescrow_data', data);
1214:     }
1215: 
1216:     async loadSession(sessionId) {
1217:         const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1218:             ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1219:             : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1220: 
1221:         try {
1222:             const resp = await fetch(baseUrl + 'session/' + sessionId, { mode: 'cors' });
1223:             if (!resp.ok) return;
1224: 
1225:             const session = await resp.json();
1226:             const messages = session.messages || [];
1227: 
1228:             this.chatMessages = messages.map(msg => ({
1229:                 sender: msg.role === 'user' ? 'user' : 'hermes',
1230:                 text: msg.content || msg.text || '',
1231:                 timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()
1232:             }));
1233: 
1234:             this.renderChatMessages();
1235:             this.saveCache();
1236:         } catch (e) {
1237:             console.error('[App] Load session error:', e.message);
1238:         }
1239:     }
1240: 
1241:     async loadSessionsList() {
1242:         const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1243:             ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1244:             : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1245: 
1246:         try {
1247:             const resp = await fetch(baseUrl + 'sessions', { mode: 'cors' });
1248:             if (!resp.ok) return [];
1249:             return await resp.json();
1250:         } catch (e) {
1251:             console.error('[App] Load sessions error:', e.message);
1252:             return [];
1253:         }
1254:     }
1255: 
1256:     requestDataFromBot() {
1257:         telegram.sendData({ action: 'get_dashboard_data' });
1258:     }
1259: 
1260:     handleBotData(data) {
1261:         console.log('[App] Data from bot:', data);
1262:         
1263:         // Handle different event types
1264:         if (data.event === 'draft_created' && data.draft) {
1265:             this.handleDraftCreated(data.draft);
1266:             return;
1267:         }
1268:         
1269:         if (data.event === 'error') {
1270:             this.handleVoiceError(new Error(data.error || 'Unknown error'));
1271:             return;
1272:         }
1273: 
1274:         if (data.event === 'hermes_reply' && data.text) {
1275:             this.addChatMessage('hermes', data.text);
1276:             return;
1277:         }
1278: 
1279:         if (data.event === 'moderation_block') {
1280:             telegram.showAlert('⚠️ Ваш контент нарушает правила платформы');
1281:             return;
1282:         }
1283:         
1284:         // Handle dashboard data
1285:         if (data.deals) this.deals = data.deals;
1286:         if (data.balance !== undefined) this.balance = data.balance;
1287:         
1288:         this.saveCache();
1289:         
1290:         const main = document.getElementById('main-content');
1291:         main.innerHTML = '';
1292:         switch(this.currentView) {
1293:             case 'hermes': this.renderHermesView(main); break;
1294:             case 'deals': this.renderDealsView(main); break;
1295:             case 'profile': this.renderProfileView(main); break;
1296:         }
1297:     }
1298: 
1299:     emptyState(icon, text) {
1300:         return `
1301:             <div class="empty-state">
1302:                 <div class="empty-icon">${icon}</div>
1303:                 <div class="empty-text">${text}</div>
1304:             </div>
1305:         `;
1306:     }
1307: 
1308:     // -------------------------------------------------------------------------
1309:     // Chat Interface Methods
1310:     // -------------------------------------------------------------------------
1311: 
1312:     renderChatMessages() {
1313:         const container = document.getElementById('chat-messages');
1314:         if (!container) return;
1315: 
1316:         container.innerHTML = this.chatMessages.map((msg, idx) => {
1317:             const isLastHermes = idx === this.chatMessages.length - 1 && msg.sender === 'hermes' && msg.text === '';
1318:             const streamingClass = isLastHermes ? ' streaming' : '';
1319:             const isHermesComplete = msg.sender === 'hermes' && msg.text !== '' && !isLastHermes;
1320:             const feedbackHtml = isHermesComplete && !msg.feedback ? `
1321:                 <div class="feedback-buttons">
1322:                     <button class="feedback-btn" onclick="app.submitFeedback(${idx}, 'up')">👍</button>
1323:                     <button class="feedback-btn" onclick="app.submitFeedback(${idx}, 'down')">👎</button>
1324:                 </div>
1325:             ` : '';
1326:             return `
1327:             <div class="chat-message ${msg.sender}">
1328:                 <div class="message-bubble${streamingClass}">
1329:                     ${this.escapeHtml(msg.text)}
1330:                     <span class="msg-time">${this.formatTime(msg.timestamp)}</span>
1331:                     ${feedbackHtml}
1332:                 </div>
1333:             </div>
1334:         `;
1335:         }).join('');
1336: 
1337:         this.scrollToBottom();
1338:     }
1339: 
1340:     scrollToBottom() {
1341:         const container = document.getElementById('chat-messages');
1342:         if (!container) return;
1343:         requestAnimationFrame(() => {
1344:             container.scrollTop = container.scrollHeight;
1345:         });
1346:     }
1347: 
1348:     addChatMessage(sender, text) {
1349:         this.chatMessages.push({
1350:             sender,
1351:             text,
1352:             timestamp: Date.now()
1353:         });
1354:         this.renderChatMessages();
1355:         this.saveCache();
1356:     }
1357: 
1358:     showTypingIndicator() {
1359:         const container = document.getElementById('chat-messages');
1360:         if (!container) return;
1361:         const typing = document.createElement('div');
1362:         typing.className = 'typing-indicator';
1363:         typing.id = 'typing-indicator';
1364:         typing.innerHTML = '<span>Гермес печатает</span><div class="dot"></div><div class="dot"></div><div class="dot"></div>';
1365:         container.appendChild(typing);
1366:         container.scrollTop = container.scrollHeight;
1367:     }
1368: 
1369:     hideTypingIndicator() {
1370:         const typing = document.getElementById('typing-indicator');
1371:         if (typing) typing.remove();
1372:     }
1373: 
1374:     async sendTextMessage() {
1375:         const input = document.getElementById('chat-input');
1376:         if (!input || !input.value.trim()) return;
1377: 
1378:         const text = input.value.trim();
1379:         this.addChatMessage('user', text);
1380:         input.value = '';
1381: 
1382:         telegram.haptic('light');
1383: 
1384:         // Call Hermes backend
1385:         try {
1386:             const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1387:                 ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1388:                 : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1389: 
1390:             console.log('[Chat] Fetching:', baseUrl + 'chat');
1391: 
1392:             // Show typing indicator
1393:             this.showTypingIndicator();
1394: 
1395:             // Try streaming first
1396:             const streamUrl = baseUrl + 'chat/stream';
1397:             const response = await fetch(streamUrl, {
1398:                 method: 'POST',
1399:                 mode: 'cors',
1400:                 credentials: 'omit',
1401:                 headers: { 'Content-Type': 'application/json' },
1402:                 body: JSON.stringify({
1403:                     message: text,
1404:                     user_id: telegram.getUserId(),
1405:                     session_id: `tg_${telegram.getUserId()}`,
1406:                     persona: 'hermes',
1407:                     use_router: true
1408:                 })
1409:             });
1410: 
1411:             console.log('[Chat] Response status:', response.status, response.statusText);
1412: 
1413:             // Hide typing indicator
1414:             this.hideTypingIndicator();
1415: 
1416:             const contentType = response.headers.get('content-type') || '';
1417: 
1418:             if (contentType.includes('text/event-stream')) {
1419:                 // Streaming response — typewriter effect
1420:                 const reader = response.body.getReader();
1421:                 const decoder = new TextDecoder();
1422:                 let fullText = '';
1423: 
1424:                 // Create empty hermes message bubble for streaming
1425:                 const msgIdx = this.chatMessages.length;
1426:                 this.chatMessages.push({ sender: 'hermes', text: '', timestamp: Date.now() });
1427:                 this.renderChatMessages();
1428: 
1429:                 while (true) {
1430:                     const { done, value } = await reader.read();
1431:                     if (done) break;
1432: 
1433:                     const chunk = decoder.decode(value, { stream: true });
1434:                     const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
1435: 
1436:                     for (const line of lines) {
1437:                         try {
1438:                             const parsed = JSON.parse(line.replace('data: ', ''));
1439:                             if (parsed.done) {
1440:                                 // Handle contract fields from final event
1441:                                 if (parsed.contract_fields) {
1442:                                     this.applyExtractedFields(parsed.contract_fields, parsed.contract_state);
1443:                                 }
1444:                                 // Handle cost estimate
1445:                                 if (parsed.cost_estimate) {
1446:                                     console.log('[Cost]', parsed.cost_estimate.cost.ton, 'TON |', parsed.cost_estimate.cost.usd, 'USD');
1447:                                 }
1448:                                 break;
1449:                             }
1450:                             if (parsed.char !== undefined) {
1451:                                 fullText += parsed.char;
1452:                                 this.chatMessages[msgIdx].text = fullText;
1453:                                 this.renderChatMessages();
1454:                             }
1455:                         } catch { /* skip malformed SSE lines */ }
1456:                     }
1457:                 }
1458: 
1459:                 this.saveCache();
1460:             } else {
1461:                 // Fallback: regular JSON response
1462:                 const data = await response.json();
1463: 
1464:                 if (data.blocked) {
1465:                     this.addChatMessage('system', `⚠️ ${data.reason}`);
1466:                 } else if (data.response) {
1467:                     this.addChatMessage('hermes', data.response);
1468:                     
1469:                     // Auto-fill contract fields if extracted
1470:                     if (data.contract_fields) {
1471:                         this.applyExtractedFields(data.contract_fields, data.contract_state);
1472:                     }
1473:                     
1474:                     // Log cost if router mode
1475:                     if (data.cost_estimate) {
1476:                         console.log('[Router]', data.cost_estimate.cost.ton, 'TON |', data.cost_estimate.cost.usd, 'USD');
1477:                     }
1478:                 } else if (data.error) {
1479:                     this.addChatMessage('system', `❌ Ошибка: ${data.error_message || data.error}`);
1480:                 }
1481:             }
1482:         } catch (error) {
1483:             console.error('[Chat] Fetch failed:', error.message);
1484:             this.hideTypingIndicator();
1485:             this.addChatMessage('system', '❌ Ошибка соединения с сервером');
1486:         }
1487:     }
1488: 
1489:     showAttachMenu() {
1490:         const menu = document.getElementById('attach-menu');
1491:         if (!menu) return;
1492: 
1493:         menu.style.display = menu.style.display === 'none' ? 'grid' : 'none';
1494:         telegram.haptic('light');
1495:     }
1496: 
1497:     hideAttachMenu() {
1498:         const menu = document.getElementById('attach-menu');
1499:         if (menu) menu.style.display = 'none';
1500:     }
1501: 
1502:     attachPhoto() {
1503:         this.hideAttachMenu();
1504:         const input = document.createElement('input');
1505:         input.type = 'file';
1506:         input.accept = 'image/*';
1507:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'photo');
1508:         input.click();
1509:     }
1510: 
1511:     attachVideo() {
1512:         this.hideAttachMenu();
1513:         const input = document.createElement('input');
1514:         input.type = 'file';
1515:         input.accept = 'video/*';
1516:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'video');
1517:         input.click();
1518:     }
1519: 
1520:     async recordVideo() {
1521:         this.hideAttachMenu();
1522:         try {
1523:             const stream = await navigator.mediaDevices.getUserMedia({
1524:                 video: { facingMode: this.currentFacingMode },
1525:                 audio: true
1526:             });
1527:             this.currentStream = stream;
1528:             this.showVideoRecorder(stream);
1529:         } catch (error) {
1530:             telegram.showAlert('Нет доступа к камере');
1531:         }
1532:     }
1533: 
1534:     showVideoRecorder(stream) {
1535:         const recorder = document.createElement('div');
1536:         recorder.className = 'video-recording';
1537:         recorder.innerHTML = `
1538:             <div class="video-preview">
1539:                 <video id="video-preview" autoplay playsinline muted></video>
1540:                 <div class="video-controls">
1541:                     <button class="camera-switch-btn" onclick="app.switchCamera()">🔄</button>
1542:                     <button class="video-record-btn" id="record-btn" onclick="app.toggleVideoRecording()"></button>
1543:                     <button class="camera-switch-btn" onclick="app.closeVideoRecorder()">✖️</button>
1544:                 </div>
1545:             </div>
1546:         `;
1547:         document.body.appendChild(recorder);
1548: 
1549:         const video = document.getElementById('video-preview');
1550:         video.srcObject = stream;
1551:     }
1552: 
1553:     async switchCamera() {
1554:         this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
1555:         if (this.currentStream) {
1556:             this.currentStream.getTracks().forEach(track => track.stop());
1557:         }
1558:         await this.recordVideo();
1559:     }
1560: 
1561:     toggleVideoRecording() {
1562:         const btn = document.getElementById('record-btn');
1563:         if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
1564:             this.startVideoRecording();
1565:             btn.classList.add('recording');
1566:         } else {
1567:             this.stopVideoRecording();
1568:             btn.classList.remove('recording');
1569:         }
1570:     }
1571: 
1572:     startVideoRecording() {
1573:         if (!this.currentStream) return;
1574: 
1575:         this.mediaRecorder = new MediaRecorder(this.currentStream);
1576:         this.audioChunks = [];
1577: 
1578:         this.mediaRecorder.ondataavailable = (e) => {
1579:             this.audioChunks.push(e.data);
1580:         };
1581: 
1582:         this.mediaRecorder.onstop = () => {
1583:             const videoBlob = new Blob(this.audioChunks, { type: 'video/webm' });
1584:             this.handleVideoUpload(videoBlob);
1585:         };
1586: 
1587:         this.mediaRecorder.start();
1588:     }
1589: 
1590:     stopVideoRecording() {
1591:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
1592:             this.mediaRecorder.stop();
1593:         }
1594:     }
1595: 
1596:     closeVideoRecorder() {
1597:         if (this.currentStream) {
1598:             this.currentStream.getTracks().forEach(track => track.stop());
1599:             this.currentStream = null;
1600:         }
1601:         const recorder = document.querySelector('.video-recording');
1602:         if (recorder) recorder.remove();
1603:     }
1604: 
1605:     async shareScreen() {
1606:         this.hideAttachMenu();
1607:         try {
1608:             const stream = await navigator.mediaDevices.getDisplayMedia({
1609:                 video: true
1610:             });
1611:             
1612:             const mediaRecorder = new MediaRecorder(stream);
1613:             const chunks = [];
1614: 
1615:             mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
1616:             mediaRecorder.onstop = () => {
1617:                 const blob = new Blob(chunks, { type: 'video/webm' });
1618:                 this.handleVideoUpload(blob);
1619:                 stream.getTracks().forEach(track => track.stop());
1620:             };
1621: 
1622:             mediaRecorder.start();
1623:             setTimeout(() => mediaRecorder.stop(), 30000); // 30 sec max
1624:         } catch (error) {
1625:             telegram.showAlert('Нет доступа к экрану');
1626:         }
1627:     }
1628: 
1629:     async handleFileUpload(file, type) {
1630:         if (!file) return;
1631: 
1632:         this.addChatMessage('user', `[📎 ${type === 'photo' ? 'Фото' : 'Видео'}]`);
1633: 
1634:         const reader = new FileReader();
1635:         reader.onload = async (e) => {
1636:             try {
1637:                 // Upload to backend and get URL
1638:                 const imageUrl = e.target.result; // Base64 data URL
1639: 
1640:                 // Call Hermes image analysis
1641:                 const response = await fetch('/analyze-image', {
1642:                     method: 'POST',
1643:                     headers: { 'Content-Type': 'application/json' },
1644:                     body: JSON.stringify({
1645:                         image_url: imageUrl,
1646:                         prompt: type === 'photo' ? 'Проанализируй это изображение' : 'Опиши это видео',
1647:                         user_id: telegram.getUserId(),
1648:                         session_id: `tg_${telegram.getUserId()}`
1649:                     })
1650:                 });
1651: 
1652:                 const data = await response.json();
1653: 
1654:                 if (data.response) {
1655:                     this.addChatMessage('hermes', data.response);
1656:                 } else if (data.error) {
1657:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
1658:                 }
1659:             } catch (error) {
1660:                 console.error('[App] Upload error:', error);
1661:                 this.addChatMessage('system', '❌ Ошибка загрузки файла');
1662:             }
1663:         };
1664:         reader.readAsDataURL(file);
1665:     }
1666: 
1667:     async handleVideoUpload(blob) {
1668:         this.addChatMessage('user', '[🎥 Видеозапись]');
1669:         this.closeVideoRecorder();
1670: 
1671:         const reader = new FileReader();
1672:         reader.onload = async (e) => {
1673:             try {
1674:                 const videoUrl = e.target.result;
1675: 
1676:                 // Call Hermes video analysis
1677:                 const response = await fetch('/analyze-image', {
1678:                     method: 'POST',
1679:                     headers: { 'Content-Type': 'application/json' },
1680:                     body: JSON.stringify({
1681:                         image_url: videoUrl,
1682:                         prompt: 'Проанализируй это видео',
1683:                         user_id: telegram.getUserId(),
1684:                         session_id: `tg_${telegram.getUserId()}`
1685:                     })
1686:                 });
1687: 
1688:                 const data = await response.json();
1689: 
1690:                 if (data.response) {
1691:                     this.addChatMessage('hermes', data.response);
1692:                 } else if (data.error) {
1693:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
1694:                 }
1695:             } catch (error) {
1696:                 console.error('[App] Video upload error:', error);
1697:                 this.addChatMessage('system', '❌ Ошибка загрузки видео');
1698:             }
1699:         };
1700:         reader.readAsDataURL(blob);
1701:     }
1702: 
1703:     formatTime(timestamp) {
1704:         const date = new Date(timestamp);
1705:         return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
1706:     }
1707: 
1708:     async submitFeedback(msgIdx, feedback) {
1709:         const msg = this.chatMessages[msgIdx];
1710:         if (!msg || msg.feedback) return;
1711: 
1712:         msg.feedback = feedback;
1713:         this.renderChatMessages();
1714: 
1715:         try {
1716:             const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1717:                 ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1718:                 : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1719: 
1720:             await fetch(baseUrl + 'feedback', {
1721:                 method: 'POST',
1722:                 mode: 'cors',
1723:                 credentials: 'omit',
1724:                 headers: { 'Content-Type': 'application/json' },
1725:                 body: JSON.stringify({
1726:                     message_id: msgIdx,
1727:                     feedback,
1728:                     user_id: telegram.getUserId(),
1729:                     session_id: `tg_${telegram.getUserId()}`,
1730:                     text: msg.text.substring(0, 200)
1731:                 })
1732:             });
1733: 
1734:             telegram.haptic('light');
1735:         } catch (error) {
1736:             console.error('[Feedback] Error:', error.message);
1737:         }
1738:     }
1739: 
1740:     updateTaskSpec(title, content) {
1741:         const specContainer = document.getElementById('task-spec');
1742:         const specContent = document.getElementById('task-spec-content');
1743:         if (!specContainer || !specContent) return;
1744: 
1745:         specContainer.classList.add('has-content');
1746:         specContent.innerHTML = `
1747:             <div class="task-spec-title">${this.escapeHtml(title)}</div>
1748:             <div>${this.escapeHtml(content)}</div>
1749:         `;
1750:     }
1751: 
1752:     clearTaskSpec() {
1753:         const specContainer = document.getElementById('task-spec');
1754:         const specContent = document.getElementById('task-spec-content');
1755:         if (!specContainer || !specContent) return;
1756: 
1757:         specContainer.classList.remove('has-content');
1758:         specContent.textContent = 'Ожидание ТЗ от Гермеса...';
1759:     }
1760: 
1761:     // ─── Голосовой ввод ТЗ ───────────────────────────────────────────────
1762:     initVoiceInput() {
1763:         const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
1764:         if (!SpeechRecognition) {
1765:             console.warn('[App] SpeechRecognition не поддерживается в этом браузере');
1766:             return;
1767:         }
1768:         this.recognition = new SpeechRecognition();
1769:         this.recognition.lang = 'ru-RU';
1770:         this.recognition.interimResults = true;
1771:         this.recognition.continuous = true;
1772: 
1773:         this.recognition.onresult = (event) => {
1774:             let interim = '';
1775:             let final = '';
1776:             for (let i = event.resultIndex; i < event.results.length; i++) {
1777:                 const transcript = event.results[i][0].transcript;
1778:                 if (event.results[i].isFinal) final += transcript + ' ';
1779:                 else interim += transcript;
1780:             }
1781:             const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1782:             if (input) {
1783:                 input.value = (this._voiceBaseText || '') + final + interim;
1784:             }
1785:         };
1786: 
1787:         this.recognition.onerror = (e) => console.warn('[App] Voice error:', e.error);
1788:         this.recognition.onend = () => {
1789:             this.isRecording = false;
1790:             const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
1791:             if (micBtn) micBtn.classList.remove('recording');
1792:         };
1793:     }
1794: 
1795:     toggleVoiceRecording() {
1796:         if (!this.recognition) return telegram.showAlert('Голосовой ввод не поддерживается');
1797:         const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
1798:         if (this.isRecording) {
1799:             this.recognition.stop();
1800:             this.isRecording = false;
1801:             if (micBtn) micBtn.classList.remove('recording');
1802:         } else {
1803:             const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1804:             this._voiceBaseText = input ? input.value + ' ' : '';
1805:             this.recognition.start();
1806:             this.isRecording = true;
1807:             if (micBtn) micBtn.classList.add('recording');
1808:             telegram.haptic('light');
1809:         }
1810:     }
1811: 
1812:     // ─── Панель смарт-контракта (вопросы Гермеса) ────────────────────────
1813:     renderContractQuestions(questions = []) {
1814:         const container = document.getElementById('contract-qa-container');
1815:         if (!container) return;
1816:         container.innerHTML = '';
1817:         if (!questions.length) {
1818:             container.innerHTML = '<div class="qa-empty">Нет активных вопросов от Гермеса</div>';
1819:             return;
1820:         }
1821:         questions.forEach((q, idx) => {
1822:             const wrap = document.createElement('div');
1823:             wrap.className = 'qa-item';
1824:             wrap.innerHTML = `
1825:                 <div class="qa-question">${idx + 1}. ${this.escapeHtml(q.text)}</div>
1826:                 <input type="text" class="qa-answer-input" placeholder="Ваш ответ..." data-qid="${q.id || idx}" />
1827:             `;
1828:             container.appendChild(wrap);
1829:         });
1830:         container.querySelectorAll('.qa-answer-input').forEach(inp => {
1831:             inp.addEventListener('change', () => this.saveContractAnswers());
1832:         });
1833:     }
1834: 
1835:     saveContractAnswers() {
1836:         const inputs = document.querySelectorAll('.qa-answer-input');
1837:         const answers = {};
1838:         inputs.forEach(inp => answers[inp.dataset.qid] = inp.value.trim());
1839:         this.contractAnswers = answers;
1840:         this.saveCache();
1841:     }
1842: 
1843:     // ─── История ТЗ ──────────────────────────────────────────────────────
1844:     async saveTaskSpecHistory(specText) {
1845:         if (!specText?.trim()) return;
1846:         const history = this.taskSpecHistory || [];
1847:         history.unshift({ text: specText, timestamp: Date.now() });
1848:         if (history.length > 20) history.pop();
1849:         this.taskSpecHistory = history;
1850:         try {
1851:             if (window.Telegram?.WebApp?.CloudStorage) {
1852:                 await new Promise((res, rej) => Telegram.WebApp.CloudStorage.setItem('task_spec_history', JSON.stringify(history), (err, ok) => err ? rej(err) : res(ok)));
1853:             } else {
1854:                 localStorage.setItem('task_spec_history', JSON.stringify(history));
1855:             }
1856:         } catch (e) { console.warn('[App] History save failed:', e); }
1857:     }
1858: 
1859:     async loadTaskSpecHistory() {
1860:         try {
1861:             let raw = null;
1862:             if (window.Telegram?.WebApp?.CloudStorage) {
1863:                 raw = await new Promise((res, rej) => Telegram.WebApp.CloudStorage.getItem('task_spec_history', (err, val) => err ? rej(err) : res(val)));
1864:             } else {
1865:                 raw = localStorage.getItem('task_spec_history');
1866:             }
1867:             this.taskSpecHistory = raw ? JSON.parse(raw) : [];
1868:         } catch (e) {
1869:             this.taskSpecHistory = [];
1870:         }
1871:         this.renderTaskSpecHistory();
1872:     }
1873: 
1874:     renderTaskSpecHistory() {
1875:         const list = document.getElementById('task-history-list');
1876:         if (!list) return;
1877:         list.innerHTML = '';
1878:         if (!this.taskSpecHistory?.length) {
1879:             list.innerHTML = '<div class="history-empty">История пуста</div>';
1880:             return;
1881:         }
1882:         this.taskSpecHistory.forEach((item, idx) => {
1883:             const el = document.createElement('div');
1884:             el.className = 'history-item';
1885:             const time = new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
1886:             el.innerHTML = `<span class="history-time">${time}</span><span class="history-text">${this.escapeHtml(item.text.slice(0, 60))}...</span>`;
1887:             el.onclick = () => {
1888:                 const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1889:                 if (input) input.value = item.text;
1890:                 telegram.haptic('light');
1891:             };
1892:             list.appendChild(el);
1893:         });
1894:     }
1895: 
1896:     // ─── Экспорт ТЗ ──────────────────────────────────────────────────────
1897:     exportTaskSpec() {
1898:         const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
1899:         const spec = input?.value?.trim() || '';
1900:         const answers = this.contractAnswers || {};
1901:         if (!spec && !Object.keys(answers).length) return telegram.showAlert('Нет данных для экспорта');
1902: 
1903:         const payload = {
1904:             task_spec: spec,
1905:             contract_answers: answers,
1906:             exported_at: new Date().toISOString(),
1907:             user_id: telegram.getUserId?.() || 'unknown'
1908:         };
1909:         const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
1910:         const url = URL.createObjectURL(blob);
1911:         const a = document.createElement('a');
1912:         a.href = url;
1913:         a.download = `task_spec_${Date.now()}.json`;
1914:         document.body.appendChild(a);
1915:         a.click();
1916:         a.remove();
1917:         URL.revokeObjectURL(url);
1918:         telegram.haptic('success');
1919:     }
1920: }
1921: 
1922: let app;
1923: document.addEventListener('DOMContentLoaded', () => {
1924:     window.app = new NeuroEscrowApp();
1925:     app = window.app;
1926: });
1927: 
1928: window.addEventListener('message', (event) => {
1929:     if (event.data && event.data.type === 'bot_data' && app) {
1930:         app.handleBotData(event.data.payload);
1931:     }
1932: });
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
