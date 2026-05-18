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
854:     // Score each LLM — filter out those without API keys
855:     const candidates = Object.entries(LLM_POOL).map(([name, llm]) => {
856:       // Skip if no API key for this provider
857:       if (!this.apiKeys[llm.provider]) return null;
858:       if (llm.modality !== "text" && intent.suggested_modality === "text") return null;
859:       if (!llm.strengths.includes(intent.task_type) && llm.rank > 10) return null;
860: 
861:       const strengthScore = llm.strengths.includes(intent.task_type) ? 0.9 : 0.5;
862:       const expScore = expScores[name] || 0.5;
863:       const rankScore = llm.rank ? (20 - llm.rank) / 20 : 0.5;
864: 
865:       return {
866:         name,
867:         score: (strengthScore * 0.3) + (expScore * 0.4) + (rankScore * 0.3),
868:         llm
869:       };
870:     }).filter(Boolean).sort((a, b) => b.score - a.score);
871: 
872:     return {
873:       primary: candidates[0]?.name || "mistral_medium_3_5",
874:       secondary: candidates.slice(1, 3).map(c => c.name),
875:       all: candidates.slice(0, 5).map(c => c.name)
876:     };
877:   }
878: 
879:   async dispatchToLLMs(intent, llmSelection, message) {
880:     const tasks = [];
881: 
882:     // Primary LLM — always dispatch
883:     const primaryLLM = LLM_POOL[llmSelection.primary];
884:     tasks.push({
885:       llmName: llmSelection.primary,
886:       systemPrompt: this.getSystemPrompt(intent, primaryLLM),
887:       userMessage: message,
888:       maxTokens: 4000
889:     });
890: 
891:     // Secondary LLMs — only for complex tasks
892:     if (intent.complexity > 1.2 && llmSelection.secondary.length > 0) {
893:       for (const name of llmSelection.secondary.slice(0, 2)) {
894:         const llm = LLM_POOL[name];
895:         tasks.push({
896:           llmName: name,
897:           systemPrompt: this.getSystemPrompt(intent, llm),
898:           userMessage: message,
899:           maxTokens: 3000
900:         });
901:       }
902:     }
903: 
904:     return await this.dispatch.dispatchParallel(tasks);
905:   }
906: 
907:   getSystemPrompt(intent, llm) {
908:     const basePrompts = {
909:       contract_creation: `Ты — эксперт по созданию смарт-контрактов NeuroEscrow. Помоги клиенту структурировать ТЗ для нейрокодера. Задавай уточняющие вопросы, предлагай оптимальный стек технологий, оценивай реалистичность сроков и бюджета.`,
910:       information: `Ты — эксперт платформы NeuroEscrow. Отвечай на вопросы клиентов о смарт-контрактах, эскроу, нейрокодинге.`,
911:       conversation: `Ты — Гермес, AI-ассистент NeuroEscrow. Дружелюбно общайся с клиентом, помогай с созданием сделок.`,
912:       generation: `Ты — генеративный AI. Создавай контент (код, схемы, описания) для смарт-контрактов NeuroEscrow.`,
913:       support: `Ты — техподдержка NeuroEscrow. Помогай решать проблемы клиентов.`
914:     };
915: 
916:     const base = basePrompts[intent.intent] || basePrompts.conversation;
917:     return `${base}\n\nИспользуй модель: ${llm.model}. Отвечай на русском языке.`;
918:   }
919: 
920:   async getRates() {
921:     return await this.currencyCache.getAllRates();
922:   }
923: 
924:   getStats() {
925:     return {
926:       total_requests: this.totalRequests,
927:       total_tokens: this.totalTokens,
928:       total_cost_usd: Math.round(this.totalCostUSD * 10000) / 10000,
929:       llm_pool_size: Object.keys(LLM_POOL).length,
930:       providers: [...new Set(Object.values(LLM_POOL).map(l => l.provider))]
931:     };
932:   }
933: 
934:   getLLMPool() {
935:     return Object.entries(LLM_POOL).map(([name, llm]) => ({
936:       name,
937:       provider: llm.provider,
938:       rank: llm.rank,
939:       score: llm.score,
940:       priceInput: llm.priceInput,
941:       priceOutput: llm.priceOutput,
942:       context: llm.context,
943:       strengths: llm.strengths,
944:       speed: llm.speed,
945:       modality: llm.modality
946:     }));
947:   }
948: }
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
361:       // Fallback if router couldn't generate response (no API keys for selected LLMs)
362:       if (!result.spec.aggregated_response || result.spec.aggregated_response.trim() === '') {
363:         console.log('[Router] Empty response from router, falling back to Mistral');
364:         return await this.chatStandard(message, userId, sessionId, persona, null, true, true);
365:       }
366:       
367:       // Update contract state from router's intent
368:       if (result.intent.missing_fields) {
369:         this.updateContractPhase(sessionId);
370:       }
371:       
372:       // Extract contract fields from aggregated response
373:       const extractedFields = await this.extractContractFields(message, sessionId);
374:       if (extractedFields) {
375:         this.updateContractPhase(sessionId, extractedFields);
376:       }
377:       
378:       // Add to session
379:       this.addToSession(sessionId, 'user', message);
380:       this.addToSession(sessionId, 'assistant', result.spec.aggregated_response);
381:       
382:       return {
383:         response: result.spec.aggregated_response,
384:         blocked: false,
385:         context_used: false,
386:         tokens_used: result.spec.cost_summary.total_tokens,
387:         contract_fields: extractedFields,
388:         contract_state: this.getContractState(sessionId),
389:         cost_estimate: result.cost_estimate,
390:         intent: result.intent,
391:         llm_selection: result.llm_selection,
392:         rates: result.rates,
393:         router_mode: true
394:       };
395:     } catch (error) {
396:       console.warn('[Router] Failed, falling back to standard:', error.message);
397:       return await this.chatStandard(message, userId, sessionId, persona, null, true, true);
398:     }
399:   }
400:   
401:   async chatStandard(message, userId, sessionId, persona, imageUrl, useRag, extractContract) {
402:     // Build context
403:     let context = '';
404:     if (useRag) {
405:       context = await this.buildContext(message, userId, sessionId);
406:     }
407:     
408:     // Get history
409:     const history = this.getSessionHistory(sessionId);
410:     
411:     // Build messages with contract phase context
412:     const messages = [
413:       { role: 'system', content: this.getSystemPrompt(persona, sessionId) }
414:     ];
415:     
416:     if (context) {
417:       messages.push({
418:         role: 'system',
419:         content: `Контекст для ответа:\n${context}`
420:       });
421:     }
422:     
423:     // Add history
424:     history.forEach(msg => {
425:       messages.push({
426:         role: msg.role,
427:         content: msg.content
428:       });
429:     });
430:     
431:     // Add current message
432:     if (imageUrl) {
433:       messages.push({
434:         role: 'user',
435:         content: [
436:           { type: 'text', text: message },
437:           { type: 'image_url', image_url: { url: imageUrl } }
438:         ]
439:       });
440:     } else {
441:       messages.push({
442:         role: 'user',
443:         content: message
444:       });
445:     }
446:     
447:     // Call Mistral API
448:     try {
449:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
450:         method: 'POST',
451:         headers: {
452:           'Authorization': `Bearer ${this.apiKey}`,
453:           'Content-Type': 'application/json'
454:         },
455:         body: JSON.stringify({
456:           model: this.model,
457:           messages,
458:           temperature: 0.7,
459:           max_tokens: 2000
460:         })
461:       });
462:       
463:       if (!response.ok) {
464:         throw new Error(`Mistral API error: ${response.status}`);
465:       }
466:       
467:       const data = await response.json();
468:       let assistantMessage = data.choices[0].message.content;
469:       
470:       // Sanitize response: remove [Tria] and similar prefixes
471:       assistantMessage = assistantMessage.replace(/^\[(Tria|Hermes|AI|Bot)\]\s*/i, '').trim();
472:       
473:       // Extract contract fields if requested (parallel to memory save)
474:       let extractedFields = null;
475:       if (extractContract) {
476:         extractedFields = await this.extractContractFields(message, sessionId);
477:       }
478:       
479:       // Update contract state
480:       if (extractedFields) {
481:         this.updateContractPhase(sessionId, extractedFields);
482:       }
483:       
484:       // Add to session
485:       this.addToSession(sessionId, 'user', message);
486:       this.addToSession(sessionId, 'assistant', assistantMessage);
487:       
488:       // Save to memory (substantial messages only)
489:       if (message.length > 50) {
490:         await this.rag.addMemory(
491:           userId,
492:           sessionId,
493:           `User: ${message}\nHermes: ${assistantMessage}`,
494:           'conversation'
495:         );
496:       }
497:       
498:       return {
499:         response: assistantMessage,
500:         blocked: false,
501:         context_used: !!context,
502:         tokens_used: data.usage?.total_tokens || 0,
503:         contract_fields: extractedFields,
504:         contract_state: this.getContractState(sessionId),
505:         router_mode: false
506:       };
507:       
508:     } catch (error) {
509:       return {
510:         response: `❌ Ошибка: ${error.message}`,
511:         error: true,
512:         error_message: error.message
513:       };
514:     }
515:   }
516:   
517:   async analyzeImage(imageUrl, prompt, userId, sessionId) {
518:     return this.chat(prompt, userId, sessionId, 'hermes', imageUrl, false);
519:   }
520:   
521:   async getSessionSummary(sessionId) {
522:     const history = this.getSessionHistory(sessionId, 100);
523:     
524:     if (history.length === 0) {
525:       return 'Нет истории сессии';
526:     }
527:     
528:     const conversation = history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
529:     
530:     const messages = [
531:       {
532:         role: 'system',
533:         content: 'Создай краткое резюме этого разговора (2-3 предложения).'
534:       },
535:       {
536:         role: 'user',
537:         content: conversation
538:       }
539:     ];
540:     
541:     try {
542:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
543:         method: 'POST',
544:         headers: {
545:           'Authorization': `Bearer ${this.apiKey}`,
546:           'Content-Type': 'application/json'
547:         },
548:         body: JSON.stringify({
549:           model: this.model,
550:           messages,
551:           temperature: 0.5,
552:           max_tokens: 200
553:         })
554:       });
555:       
556:       const data = await response.json();
557:       return data.choices[0].message.content;
558:       
559:     } catch (error) {
560:       return `Ошибка создания резюме: ${error.message}`;
561:     }
562:   }
563:   
564:   async generateSpec(sessionId) {
565:     const state = this.getContractState(sessionId);
566:     const history = this.getSessionHistory(sessionId, 50);
567:     
568:     const specPrompt = `Ты — генератор структурированных спеков для NeuroEscrow.
569: Создай подробный черновик ТЗ для нейрокодера на основе диалога с клиентом.
570: 
571: Формат ответа — JSON:
572: {
573:   "title": "название проекта",
574:   "description": "подробное описание",
575:   "tech_stack": ["Flutter", "Firebase", "TON Connect"],
576:   "modules": ["модуль 1", "модуль 2"],
577:   "milestones": [{"name": "этап", "percent": 30, "days": 7}],
578:   "budget_ton": 100,
579:   "deadline_days": 30,
580:   "risks": ["риск 1", "риск 2"],
581:   "acceptance_criteria": ["критерий 1", "критерий 2"],
582:   "for_neurocoder": "инструкция для нейрокодера"
583: }`;
584: 
585:     const conversation = history.map(m => `${m.role}: ${m.content}`).join('\n');
586:     
587:     try {
588:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
589:         method: 'POST',
590:         headers: {
591:           'Authorization': `Bearer ${this.apiKey}`,
592:           'Content-Type': 'application/json'
593:         },
594:         body: JSON.stringify({
595:           model: this.model,
596:           messages: [
597:             { role: 'system', content: specPrompt },
598:             { role: 'user', content: `Поля контракта: ${JSON.stringify(state.fields)}\n\nДиалог:\n${conversation}` }
599:           ],
600:           temperature: 0.3,
601:           max_tokens: 3000,
602:           response_format: { type: 'json_object' }
603:         })
604:       });
605:       
606:       if (!response.ok) throw new Error(`API error: ${response.status}`);
607:       const data = await response.json();
608:       return JSON.parse(data.choices[0].message.content);
609:     } catch (error) {
610:       console.warn('[Spec] Generation failed:', error.message);
611:       return null;
612:     }
613:   }
614:   
615:   async assessSatisfaction(sessionId) {
616:     const history = this.getSessionHistory(sessionId, 10);
617:     if (history.length < 2) return { score: 0.5, reason: 'Недостаточно данных' };
618:     
619:     const conversation = history.map(m => `${m.role}: ${m.content}`).join('\n');
620:     
621:     try {
622:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
623:         method: 'POST',
624:         headers: {
625:           'Authorization': `Bearer ${this.apiKey}`,
626:           'Content-Type': 'application/json'
627:         },
628:         body: JSON.stringify({
629:           model: this.model,
630:           messages: [
631:             { role: 'system', content: SATISFACTION_PROMPT },
632:             { role: 'user', content: conversation }
633:           ],
634:           temperature: 0.1,
635:           max_tokens: 100,
636:           response_format: { type: 'json_object' }
637:         })
638:       });
639:       
640:       if (!response.ok) throw new Error(`API error: ${response.status}`);
641:       const data = await response.json();
642:       const parsed = JSON.parse(data.choices[0].message.content);
643:       
644:       const state = this.getContractState(sessionId);
645:       state.satisfaction_score = parsed.score || 0.5;
646:       
647:       return parsed;
648:     } catch (error) {
649:       return { score: 0.5, reason: error.message };
650:     }
651:   }
652:   
653:   clearSession(sessionId) {
654:     this.sessions.delete(sessionId);
655:   }
656: 
657:   async recordFeedback(userId, sessionId, messageId, feedback, text) {
658:     const logEntry = {
659:       user_id: userId,
660:       session_id: sessionId,
661:       message_id: messageId,
662:       feedback,
663:       text_preview: text.substring(0, 100),
664:       timestamp: new Date().toISOString()
665:     };
666: 
667:     console.log(`[FEEDBACK] ${feedback === 'up' ? '👍' : '👎'} user=${userId} session=${sessionId} msg=${messageId}`);
668: 
669:     // Store in KV for analytics
670:     if (this.kvCache) {
671:       try {
672:         const key = `feedback:${sessionId}:${messageId}`;
673:         await this.kvCache.put(key, JSON.stringify(logEntry), { expirationTtl: 86400 * 30 });
674:       } catch (e) {
675:         console.warn('[FEEDBACK] KV storage error:', e.message);
676:       }
677:     }
678: 
679:     return { ok: true, feedback };
680:   }
681: 
682:   getRagStats() {
683:     return {
684:       hits: this.ragHits,
685:       misses: this.ragMisses,
686:       hitRate: this.ragHits + this.ragMisses > 0
687:         ? (this.ragHits / (this.ragHits + this.ragMisses) * 100).toFixed(1) + '%'
688:         : 'N/A'
689:     };
690:   }
691: 
692:   async computeDOV({ semanticLabel, attentionRaw, computeFlops, userId }) {
693:     const astraEndpoint = this.env?.ASTRA_DB_ENDPOINT;
694:     const astraToken = this.env?.ASTRA_DB_TOKEN;
695:     if (!astraEndpoint || !astraToken) throw new Error('AstraDB credentials missing');
696: 
697:     // 1. Embedding смысла жеста (Gemini)
698:     const embedResp = await fetch(
699:       `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=${this.env?.GOOGLE_API_KEY}`,
700:       {
701:         method: 'POST',
702:         headers: { 'Content-Type': 'application/json' },
703:         body: JSON.stringify({
704:           model: 'models/gemini-embedding-2-preview',
705:           content: { parts: [{ text: semanticLabel }] },
706:           outputDimensionality: 3072
707:         })
708:       }
709:     );
710:     const embedData = await embedResp.json();
711:     const embedding = embedData.embedding?.values;
712:     if (!embedding) throw new Error('Embedding failed for semanticLabel');
713: 
714:     // 2. SemanticNovelty: поиск похожих смыслов в AstraDB
715:     const searchResp = await fetch(
716:       `${astraEndpoint}/api/json/v1/default_keyspace/gestures_semantic_3072`,
717:       {
718:         method: 'POST',
719:         headers: {
720:           'Content-Type': 'application/json',
721:           'Token': astraToken
722:         },
723:         body: JSON.stringify({
724:           find: {
725:             sort: { $vector: embedding },
726:             options: { limit: 20, includeSimilarity: true }
727:           }
728:         })
729:       }
730:     );
731:     const searchData = await searchResp.json();
732:     const docs = searchData.data?.documents || [];
733:     const N = docs.length || 1;
734:     const k = docs.filter(d => d.$similarity > 0.85).length;
735:     const semanticNovelty = Math.max(0, 1 - k / N);
736: 
737:     // 3. Нормализация метрик
738:     const attention = Math.min(1, Math.max(0, attentionRaw ?? 0.5));
739:     const compute = Math.min(1, (computeFlops ?? 0) / 1e9);
740: 
741:     // 4. Коэффициенты (пока дефолт, далее — DAO)
742:     const alpha = 0.35, beta = 0.30, gamma = 0.35;
743:     const dov = alpha * attention + beta * compute + gamma * semanticNovelty;
744: 
745:     // 5. Сохранение эмбеддинга смысла
746:     const docId = `${userId}_${Date.now()}`;
747:     await fetch(
748:       `${astraEndpoint}/api/json/v1/default_keyspace/gestures_semantic_3072`,
749:       {
750:         method: 'POST',
751:         headers: { 'Content-Type': 'application/json', 'Token': astraToken },
752:         body: JSON.stringify({
753:           insertOne: {
754:             document: {
755:               _id: docId,
756:               $vector: embedding,
757:               semanticLabel,
758:               userId,
759:               timestamp: new Date().toISOString()
760:             }
761:           }
762:         })
763:       }
764:     );
765: 
766:     // 6. Логирование DOV
767:     await fetch(
768:       `${astraEndpoint}/api/json/v1/default_keyspace/gestures_dov_log`,
769:       {
770:         method: 'POST',
771:         headers: { 'Content-Type': 'application/json', 'Token': astraToken },
772:         body: JSON.stringify({
773:           insertOne: {
774:             document: {
775:               _id: `dov_${docId}`,
776:               userId,
777:               semanticLabel,
778:               attention,
779:               compute,
780:               semanticNovelty,
781:               dov,
782:               alpha, beta, gamma,
783:               timestamp: new Date().toISOString()
784:             }
785:           }
786:         })
787:       }
788:     );
789: 
790:     return { dov, attention, compute, semanticNovelty, embedding: docId };
791:   }
792: }
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
411:       // ═══════════════════════════════════════════════════════════
412:       // TTS — Silero V5 (Russian SOTA) + VITS + Google fallback
413:       // ═══════════════════════════════════════════════════════════
414:       if (url.pathname === '/tts' && request.method === 'POST') {
415:         const data = await request.json();
416:         const { text, lang = 'ru', voice = 'xenia', engine = 'silero' } = data;
417:         console.log('[TTS] Request received:', { engine, textLen: text?.length, voice });
418: 
419:         if (!text || text.length > 1000) {
420:           return new Response(JSON.stringify({ error: 'text required, max 1000 chars' }), {
421:             status: 400,
422:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
423:           });
424:         }
425: 
426:         // Route to selected engine
427:         if (engine === 'silero') {
428:           try {
429:             return await handleSileroTTS(text, voice, corsHeaders);
430:           } catch (error) {
431:             console.error('[TTS] Silero failed, auto-fallback to VITS');
432:             try {
433:               return await handleVitsTTS(text, voice, corsHeaders);
434:             } catch (vitsError) {
435:               console.error('[TTS] VITS failed, auto-fallback to Google');
436:               return await handleGoogleTTS(text, corsHeaders);
437:             }
438:           }
439:         } else if (engine === 'vits') {
440:           return await handleVitsTTS(text, voice, corsHeaders);
441:         } else if (engine === 'google') {
442:           return await handleGoogleTTS(text, corsHeaders);
443:         }
444: 
445:         // Default: try Silero, fallback chain
446:         return await handleTTSPipeline(text, voice, corsHeaders);
447:       }
448: 
449:       return new Response(JSON.stringify({ error: 'Not found' }), {
450:         status: 404,
451:         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
452:       });
453: 
454:     } catch (error) {
455:       return new Response(JSON.stringify({ error: error.message }), {
456:         status: 500,
457:         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
458:       });
459:     }
460:   },
461: 
462:   // Scheduled handler for session cleanup (cron trigger)
463:   async scheduled(event, env, ctx) {
464:     ctx.waitUntil(cleanupExpiredSessions(env));
465:   }
466: };
467: 
468: // === KV Session Helpers ===
469: 
470: async function saveSession(env, sessionId, history) {
471:   if (!env.CACHE || !sessionId || sessionId === 'default') return;
472: 
473:   try {
474:     const key = `${SESSION_PREFIX}${sessionId}`;
475:     const existing = await env.CACHE.get(key);
476:     const session = existing ? JSON.parse(existing) : {
477:       id: sessionId,
478:       messages: [],
479:       created_at: new Date().toISOString()
480:     };
481: 
482:     session.messages = history.slice(-50); // Keep last 50 messages
483:     session.updated_at = new Date().toISOString();
484: 
485:     await env.CACHE.put(key, JSON.stringify(session), {
486:       expirationTtl: SESSION_TTL
487:     });
488:   } catch (error) {
489:     // KV errors are non-critical
490:   }
491: }
492: 
493: async function loadSession(env, sessionId) {
494:   if (!env.CACHE) return null;
495: 
496:   try {
497:     const key = `${SESSION_PREFIX}${sessionId}`;
498:     const data = await env.CACHE.get(key);
499:     return data ? JSON.parse(data) : null;
500:   } catch (error) {
501:     return null;
502:   }
503: }
504: 
505: async function listSessions(env) {
506:   if (!env.CACHE) return [];
507: 
508:   try {
509:     const list = await env.CACHE.list({ prefix: SESSION_PREFIX });
510:     return list.keys.map(key => ({
511:       id: key.name.replace(SESSION_PREFIX, ''),
512:       updated_at: key.metadata?.updated_at || null
513:     }));
514:   } catch (error) {
515:     return [];
516:   }
517: }
518: 
519: async function cleanupExpiredSessions(env) {
520:   if (!env.CACHE) return;
521: 
522:   try {
523:     const list = await env.CACHE.list({ prefix: SESSION_PREFIX });
524:     const now = Date.now();
525:     let cleaned = 0;
526: 
527:     for (const key of list.keys) {
528:       // KV with expirationTtl handles auto-cleanup,
529:       // but we can force-delete stale sessions older than 48h
530:       if (key.metadata?.updated_at) {
531:         const updated = new Date(key.metadata.updated_at).getTime();
532:         if (now - updated > 172800000) { // 48h
533:           await env.CACHE.delete(key.name);
534:           cleaned++;
535:         }
536:       }
537:     }
538: 
539:     console.log(`Session cleanup: ${cleaned} expired sessions removed`);
540:   } catch (error) {
541:     console.error(`Session cleanup error: ${error.message}`);
542:   }
543: }
544: 
545: // ═══════════════════════════════════════════════════════════
546: // TTS Engine Handlers
547: // ═══════════════════════════════════════════════════════════
548: 
549: async function handleSileroTTS(text, voice, corsHeaders) {
550:   console.log('[TTS] Silero START:', { textLen: text.length, voice });
551:   try {
552:     const sileroSpace = 'https://neurosenko-tts-silero.hf.space';
553:     const speakerVoice = voice === 'male' ? 'aidar' : (voice === 'xenia' ? 'xenia' : 'xenia');
554:     
555:     // Step 1: Queue prediction
556:     console.log('[TTS] Silero Step 1: POST /call/predict');
557:     const initResp = await fetch(`${sileroSpace}/call/predict`, {
558:       method: 'POST',
559:       headers: { 'Content-Type': 'application/json' },
560:       body: JSON.stringify({
561:         data: [text.substring(0, 1000), speakerVoice, 1.0, 1.0]
562:       })
563:     });
564: 
565:     console.log('[TTS] Silero Step 1 response:', initResp.status, initResp.statusText);
566:     
567:     if (!initResp.ok) {
568:       const errText = await initResp.text().catch(() => '');
569:       console.error('[TTS] Silero Step 1 error:', errText.substring(0, 500));
570:       throw new Error(`Silero queue failed: ${initResp.status} ${errText.substring(0, 200)}`);
571:     }
572:     
573:     const initData = await initResp.json();
574:     console.log('[TTS] Silero Step 1 data:', JSON.stringify(initData).substring(0, 200));
575:     const { event_id } = initData;
576:     
577:     if (!event_id) {
578:       console.error('[TTS] Silero no event_id:', initData);
579:       throw new Error('Silero returned no event_id');
580:     }
581:     
582:     // Step 2: Poll for result via SSE
583:     console.log('[TTS] Silero Step 2: GET /call/predict/', event_id);
584:     const streamResp = await fetch(`${sileroSpace}/call/predict/${event_id}`);
585:     console.log('[TTS] Silero Step 2 response:', streamResp.status, streamResp.statusText);
586:     
587:     const reader = streamResp.body.getReader();
588:     const decoder = new TextDecoder();
589:     let buffer = '';
590:     let audioUrl = null;
591:     let eventCount = 0;
592:     
593:     const timeout = setTimeout(() => {
594:       console.warn('[TTS] Silero timeout after 15s');
595:       reader.cancel();
596:     }, 15000);
597: 
598:     try {
599:       while (true) {
600:         const { value, done } = await reader.read();
601:         if (done) break;
602:         
603:         buffer += decoder.decode(value, { stream: true });
604:         const lines = buffer.split('\n');
605:         buffer = lines.pop() || '';
606:         
607:         for (const line of lines) {
608:           eventCount++;
609:           console.log(`[TTS] Silero SSE event #${eventCount}:`, line.substring(0, 100));
610:           
611:           if (line.startsWith('event: complete') || line.startsWith('event: completed')) {
612:             const dataIdx = lines.indexOf(line) + 1;
613:             if (dataIdx < lines.length && lines[dataIdx].startsWith('data:')) {
614:               const rawData = JSON.parse(lines[dataIdx].slice(5));
615:               console.log('[TTS] Silero complete data:', JSON.stringify(rawData).substring(0, 300));
616:               if (rawData && rawData.path) {
617:                 audioUrl = `${sileroSpace}/file=${rawData.path}`;
618:               }
619:             }
620:             break;
621:           }
622:         }
623:         if (audioUrl) break;
624:       }
625:     } finally {
626:       clearTimeout(timeout);
627:     }
628: 
629:     console.log('[TTS] Silero audioUrl:', audioUrl);
630:     if (!audioUrl) throw new Error('Silero TTS timeout - no audio URL');
631: 
632:     const audioResp = await fetch(audioUrl);
633:     console.log('[TTS] Silero audio download:', audioResp.status, audioResp.headers.get('content-type'));
634:     
635:     if (!audioResp.ok) throw new Error(`Silero audio download failed: ${audioResp.status}`);
636:     
637:     const audioBuffer = await audioResp.arrayBuffer();
638:     console.log('[TTS] Silero SUCCESS:', audioBuffer.byteLength, 'bytes');
639:     
640:     return new Response(audioBuffer, {
641:       headers: {
642:         ...corsHeaders,
643:         'Content-Type': 'audio/wav',
644:         'Cache-Control': 'public, max-age=3600'
645:       }
646:     });
647:   } catch (error) {
648:     console.error('[TTS] Silero error:', error.message);
649:     throw error;
650:   }
651: }
652: 
653: async function handleVitsTTS(text, voice, corsHeaders) {
654:   console.log('[TTS] VITS START:', { textLen: text.length, voice });
655:   try {
656:     const speakerId = voice === 'male' ? 1 : 0;
657:     const vitsSpace = 'https://utrobinmv-tts-ru-free-hf-vits-low-multispeaker.hf.space';
658:     
659:     console.log('[TTS] VITS Step 1: POST /call/predict');
660:     const initResp = await fetch(`${vitsSpace}/call/predict`, {
661:       method: 'POST',
662:       headers: { 'Content-Type': 'application/json' },
663:       body: JSON.stringify({ data: [text.substring(0, 1000), speakerId] })
664:     });
665: 
666:     console.log('[TTS] VITS Step 1 response:', initResp.status, initResp.statusText);
667:     
668:     if (!initResp.ok) {
669:       const errText = await initResp.text().catch(() => '');
670:       console.error('[TTS] VITS Step 1 error:', errText.substring(0, 500));
671:       throw new Error(`VITS queue failed: ${initResp.status} ${errText.substring(0, 200)}`);
672:     }
673:     
674:     const initData = await initResp.json();
675:     console.log('[TTS] VITS Step 1 data:', JSON.stringify(initData).substring(0, 200));
676:     const { event_id } = initData;
677:     
678:     if (!event_id) {
679:       console.error('[TTS] VITS no event_id:', initData);
680:       throw new Error('VITS returned no event_id');
681:     }
682:     
683:     console.log('[TTS] VITS Step 2: GET /call/predict/', event_id);
684:     const streamResp = await fetch(`${vitsSpace}/call/predict/${event_id}`);
685:     console.log('[TTS] VITS Step 2 response:', streamResp.status, streamResp.statusText);
686:     
687:     const reader = streamResp.body.getReader();
688:     const decoder = new TextDecoder();
689:     let buffer = '';
690:     let audioUrl = null;
691:     let eventCount = 0;
692:     
693:     const timeout = setTimeout(() => reader.cancel(), 15000);
694: 
695:     try {
696:       while (true) {
697:         const { value, done } = await reader.read();
698:         if (done) break;
699:         
700:         buffer += decoder.decode(value, { stream: true });
701:         const lines = buffer.split('\n');
702:         buffer = lines.pop() || '';
703:         
704:         for (const line of lines) {
705:           eventCount++;
706:           if (eventCount <= 5) {
707:             console.log(`[TTS] VITS SSE event #${eventCount}:`, line.substring(0, 100));
708:           }
709:           
710:           if (line.startsWith('event: complete') || line.startsWith('event: completed')) {
711:             const dataIdx = lines.indexOf(line) + 1;
712:             if (dataIdx < lines.length && lines[dataIdx].startsWith('data:')) {
713:               const rawData = JSON.parse(lines[dataIdx].slice(5));
714:               console.log('[TTS] VITS complete data:', JSON.stringify(rawData).substring(0, 300));
715:               if (rawData && rawData.path) {
716:                 audioUrl = `${vitsSpace}/file=${rawData.path}`;
717:               }
718:             }
719:             break;
720:           }
721:         }
722:         if (audioUrl) break;
723:       }
724:     } finally {
725:       clearTimeout(timeout);
726:     }
727: 
728:     console.log('[TTS] VITS audioUrl:', audioUrl);
729:     if (!audioUrl) throw new Error('VITS TTS timeout - no audio URL');
730: 
731:     const audioResp = await fetch(audioUrl);
732:     console.log('[TTS] VITS audio download:', audioResp.status, audioResp.headers.get('content-type'));
733:     
734:     if (!audioResp.ok) throw new Error(`VITS audio download failed: ${audioResp.status}`);
735:     
736:     const audioBuffer = await audioResp.arrayBuffer();
737:     console.log('[TTS] VITS SUCCESS:', audioBuffer.byteLength, 'bytes');
738:     
739:     return new Response(audioBuffer, {
740:       headers: {
741:         ...corsHeaders,
742:         'Content-Type': 'audio/wav',
743:         'Cache-Control': 'public, max-age=3600'
744:       }
745:     });
746:   } catch (error) {
747:     console.error('[TTS] VITS error:', error.message);
748:     throw error;
749:   }
750: }
751: 
752: async function handleGoogleTTS(text, corsHeaders) {
753:   console.log('[TTS] Google START:', { textLen: text.length });
754:   try {
755:     const chunks = text.match(/[^.!?]+[.!?]*/g) || [text];
756:     const audioSegments = [];
757:     
758:     for (let i = 0; i < chunks.length; i++) {
759:       const trimmed = chunks[i].trim();
760:       if (!trimmed) continue;
761:       
762:       const googleUrl = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=ru&q=${encodeURIComponent(trimmed.substring(0, 180))}`;
763:       console.log(`[TTS] Google chunk ${i + 1}:`, trimmed.substring(0, 50));
764:       
765:       const resp = await fetch(googleUrl, {
766:         headers: {
767:           'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
768:         }
769:       });
770:       
771:       console.log(`[TTS] Google chunk ${i + 1} response:`, resp.status, resp.headers.get('content-type'));
772:       
773:       if (resp.ok) {
774:         audioSegments.push(await resp.arrayBuffer());
775:       }
776:     }
777:     
778:     console.log('[TTS] Google segments:', audioSegments.length);
779:     if (audioSegments.length === 0) throw new Error('Google TTS failed - no segments');
780:     
781:     const totalLength = audioSegments.reduce((acc, val) => acc + val.byteLength, 0);
782:     const mergedAudio = new Uint8Array(totalLength);
783:     let offset = 0;
784:     for (const segment of audioSegments) {
785:       mergedAudio.set(new Uint8Array(segment), offset);
786:       offset += segment.byteLength;
787:     }
788:     
789:     console.log('[TTS] Google SUCCESS:', totalLength, 'bytes');
790:     return new Response(mergedAudio, {
791:       headers: {
792:         ...corsHeaders,
793:         'Content-Type': 'audio/mpeg',
794:         'Cache-Control': 'public, max-age=3600'
795:       }
796:     });
797:   } catch (error) {
798:     console.error('[TTS] Google error:', error.message);
799:     throw error;
800:   }
801: }
802: 
803: async function handleTTSPipeline(text, voice, corsHeaders) {
804:   console.log('[TTS] Pipeline START');
805:   // Try Silero first
806:   try {
807:     return await handleSileroTTS(text, voice, corsHeaders);
808:   } catch (error) {
809:     console.warn('[TTS] Silero failed, trying VITS:', error.message);
810:     
811:     // Fallback to VITS
812:     try {
813:       return await handleVitsTTS(text, voice, corsHeaders);
814:     } catch (vitsError) {
815:       console.warn('[TTS] VITS failed, trying Google:', vitsError.message);
816:       
817:       // Final fallback: Google
818:       try {
819:         return await handleGoogleTTS(text, corsHeaders);
820:       } catch (googleError) {
821:         console.error('[TTS] All providers failed:', googleError.message);
822:         return new Response(JSON.stringify({ error: 'All TTS providers failed' }), {
823:           status: 500,
824:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
825:         });
826:       }
827:     }
828:   }
829: }
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
 233:     max-width: 85%;
 234:     padding: 0;
 235:     border-radius: var(--glass-radius);
 236:     font-size: 14px;
 237:     line-height: 1.6;
 238:     word-wrap: break-word;
 239:     position: relative;
 240:     transition: var(--glass-transition);
 241:     overflow: hidden;
 242: }
 243: 
 244: /* Message content area */
 245: .message-content {
 246:     padding: 12px 16px 4px 16px;
 247: }
 248: 
 249: /* Message footer — time + feedback buttons, bottom-right */
 250: .message-footer {
 251:     display: flex;
 252:     align-items: center;
 253:     justify-content: flex-end;
 254:     gap: 8px;
 255:     padding: 4px 12px 8px 12px;
 256: }
 257: 
 258: /* Markdown rendering inside messages */
 259: .message-content p {
 260:     margin: 0 0 8px 0;
 261: }
 262: .message-content p:last-child {
 263:     margin-bottom: 0;
 264: }
 265: .message-content strong {
 266:     font-weight: 600;
 267: }
 268: .message-content em {
 269:     font-style: italic;
 270:     opacity: 0.9;
 271: }
 272: .message-content pre {
 273:     background: rgba(0, 0, 0, 0.3);
 274:     border-radius: 8px;
 275:     padding: 10px 12px;
 276:     margin: 8px 0;
 277:     overflow-x: auto;
 278:     font-size: 13px;
 279: }
 280: .message-content code {
 281:     background: rgba(0, 0, 0, 0.2);
 282:     border-radius: 4px;
 283:     padding: 1px 5px;
 284:     font-size: 13px;
 285:     font-family: 'JetBrains Mono', 'Fira Code', monospace;
 286: }
 287: .message-content pre code {
 288:     background: none;
 289:     padding: 0;
 290: }
 291: .message-content ul, .message-content ol {
 292:     margin: 6px 0;
 293:     padding-left: 20px;
 294: }
 295: .message-content li {
 296:     margin: 3px 0;
 297: }
 298: .message-content h2, .message-content h3, .message-content h4 {
 299:     margin: 10px 0 6px 0;
 300:     font-weight: 600;
 301: }
 302: .message-content h2 { font-size: 16px; }
 303: .message-content h3 { font-size: 15px; }
 304: .message-content h4 { font-size: 14px; }
 305: .message-content hr {
 306:     border: none;
 307:     border-top: 1px solid rgba(255, 255, 255, 0.1);
 308:     margin: 10px 0;
 309: }
 310: .message-content table {
 311:     width: 100%;
 312:     border-collapse: collapse;
 313:     margin: 8px 0;
 314:     font-size: 13px;
 315: }
 316: .message-content th, .message-content td {
 317:     border: 1px solid rgba(255, 255, 255, 0.15);
 318:     padding: 6px 10px;
 319:     text-align: left;
 320: }
 321: .message-content th {
 322:     background: rgba(255, 255, 255, 0.05);
 323:     font-weight: 600;
 324: }
 325: 
 326: /* User message: white glass with black text */
 327: .chat-message.user .message-bubble {
 328:     background: rgba(255, 255, 255, 0.92);
 329:     backdrop-filter: blur(12px) saturate(150%);
 330:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 331:     color: #000;
 332:     border: 1px solid rgba(255, 255, 255, 0.3);
 333:     border-bottom-right-radius: 4px;
 334:     box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
 335: }
 336: 
 337: .chat-message.user .message-content pre {
 338:     background: rgba(0, 0, 0, 0.06);
 339: }
 340: .chat-message.user .message-content code {
 341:     background: rgba(0, 0, 0, 0.06);
 342: }
 343: .chat-message.user .message-content hr {
 344:     border-top-color: rgba(0, 0, 0, 0.1);
 345: }
 346: .chat-message.user .message-content th,
 347: .chat-message.user .message-content td {
 348:     border-color: rgba(0, 0, 0, 0.12);
 349: }
 350: .chat-message.user .message-content th {
 351:     background: rgba(0, 0, 0, 0.04);
 352: }
 353: 
 354: /* Hermes message: black glass with white text */
 355: .chat-message.hermes .message-bubble {
 356:     background: rgba(0, 0, 0, 0.8);
 357:     backdrop-filter: blur(12px) saturate(150%);
 358:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 359:     color: var(--ne-white);
 360:     border: 1px solid rgba(255, 255, 255, 0.08);
 361:     border-bottom-left-radius: 4px;
 362:     box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);
 363: }
 364: 
 365: .chat-message.system .message-bubble {
 366:     background: rgba(255, 255, 255, 0.03);
 367:     backdrop-filter: blur(8px);
 368:     -webkit-backdrop-filter: blur(8px);
 369:     color: var(--ne-light-gray);
 370:     border: var(--glass-border);
 371:     border-radius: var(--glass-radius-sm);
 372:     font-size: 12px;
 373:     text-align: center;
 374: }
 375: 
 376: /* Message timestamp — inside footer, right-aligned */
 377: .msg-time {
 378:     font-size: 12px;
 379:     color: rgba(255, 255, 255, 0.5);
 380:     opacity: 1;
 381:     white-space: nowrap;
 382:     flex-shrink: 0;
 383:     line-height: 1;
 384: }
 385: 
 386: .chat-message.user .msg-time {
 387:     color: #555;
 388: }
 389: 
 390: /* Feedback buttons — inside footer */
 391: .message-feedback {
 392:     display: flex;
 393:     gap: 4px;
 394:     opacity: 0;
 395:     transition: opacity 0.2s;
 396: }
 397: 
 398: .chat-message.hermes:hover .message-feedback {
 399:     opacity: 1;
 400: }
 401: 
 402: .feedback-btn {
 403:     background: rgba(255, 255, 255, 0.06);
 404:     border: 1px solid rgba(255, 255, 255, 0.08);
 405:     border-radius: 8px;
 406:     padding: 2px 6px;
 407:     font-size: 14px;
 408:     line-height: 1;
 409:     cursor: pointer;
 410:     transition: var(--glass-transition);
 411:     color: var(--ne-light-gray);
 412: }
 413: 
 414: .feedback-btn:active {
 415:     transform: scale(0.95);
 416:     background: rgba(255, 255, 255, 0.12);
 417: }
 418: 
 419: .feedback-buttons {
 420:     display: flex;
 421:     gap: 6px;
 422:     flex-shrink: 0;
 423: }
 424: 
 425: /* Typing indicator */
 426: .typing-indicator {
 427:     display: flex;
 428:     align-items: center;
 429:     gap: 4px;
 430:     padding: 8px 16px;
 431:     font-size: 12px;
 432:     color: var(--ne-light-gray);
 433:     opacity: 0.7;
 434: }
 435: 
 436: .typing-indicator .dot {
 437:     width: 6px;
 438:     height: 6px;
 439:     border-radius: 50%;
 440:     background: var(--ne-purple);
 441:     animation: typing-bounce 1.4s infinite;
 442: }
 443: 
 444: .typing-indicator .dot:nth-child(2) { animation-delay: 0.2s; }
 445: .typing-indicator .dot:nth-child(3) { animation-delay: 0.4s; }
 446: 
 447: @keyframes typing-bounce {
 448:     0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
 449:     30% { transform: translateY(-4px); opacity: 1; }
 450: }
 451: 
 452: /* Streaming cursor */
 453: .message-bubble.streaming::after {
 454:     content: '▋';
 455:     animation: cursor-blink 0.8s infinite;
 456:     color: var(--ne-purple);
 457:     margin-left: 2px;
 458: }
 459: 
 460: @keyframes cursor-blink {
 461:     0%, 50% { opacity: 1; }
 462:     51%, 100% { opacity: 0; }
 463: }
 464: 
 465: /* ===== CHAT INPUT ===== */
 466: .chat-input-container {
 467:     position: fixed;
 468:     bottom: 64px;
 469:     left: 0;
 470:     right: 0;
 471:     background: rgba(0, 0, 0, 0.7);
 472:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 473:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 474:     border-top: var(--glass-border);
 475:     padding: var(--ne-spacing-sm) var(--ne-spacing-lg);
 476:     display: flex;
 477:     align-items: center;
 478:     gap: var(--ne-spacing-sm);
 479:     z-index: 100;
 480: }
 481: 
 482: /* Chat input inside split layout (desktop) */
 483: .split-pane.left-pane .chat-input-container {
 484:     position: sticky;
 485:     bottom: 0;
 486:     left: auto;
 487:     right: auto;
 488:     border-top: var(--glass-border);
 489:     border-right: none;
 490:     z-index: 10;
 491:     padding: var(--ne-spacing-sm) var(--ne-spacing-md);
 492: }
 493: 
 494: /* Hide fixed chat input when split layout is active (desktop) */
 495: @media (min-width: 600px) {
 496:     .chat-input-container:not(.split-chat-input) {
 497:         display: none !important;
 498:     }
 499: }
 500: 
 501: /* Show fixed chat input on mobile, hide split version */
 502: @media (max-width: 599px) {
 503:     .split-chat-input {
 504:         display: none !important;
 505:     }
 506: }
 507: 
 508: .attach-btn,
 509: .send-btn {
 510:     width: 40px;
 511:     height: 40px;
 512:     border-radius: 50%;
 513:     border: var(--glass-border-light);
 514:     background: var(--glass-bg-light);
 515:     backdrop-filter: blur(12px);
 516:     -webkit-backdrop-filter: blur(12px);
 517:     color: var(--ne-white);
 518:     display: flex;
 519:     align-items: center;
 520:     justify-content: center;
 521:     cursor: pointer;
 522:     transition: var(--glass-transition);
 523:     font-size: 18px;
 524:     flex-shrink: 0;
 525: }
 526: 
 527: .attach-btn:active,
 528: .send-btn:active {
 529:     transform: scale(0.92);
 530:     box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.4);
 531: }
 532: 
 533: .send-btn {
 534:     background: linear-gradient(135deg, var(--ne-purple), var(--ne-red));
 535:     border: none;
 536:     color: #fff;
 537: }
 538: 
 539: .chat-input {
 540:     flex: 1;
 541:     padding: 10px 16px;
 542:     border-radius: 20px;
 543:     border: var(--glass-border-light);
 544:     background: rgba(255, 255, 255, 0.06);
 545:     backdrop-filter: blur(8px);
 546:     -webkit-backdrop-filter: blur(8px);
 547:     color: var(--ne-white);
 548:     font-size: 14px;
 549:     outline: none;
 550:     transition: var(--glass-transition);
 551: }
 552: 
 553: .chat-input::placeholder {
 554:     color: rgba(255, 255, 255, 0.3);
 555: }
 556: 
 557: .chat-input:focus {
 558:     border-color: var(--ne-purple);
 559:     background: rgba(255, 255, 255, 0.08);
 560: }
 561: 
 562: /* ===== BOTTOM NAVIGATION (3 Glass Tabs) ===== */
 563: .bottom-nav {
 564:     display: none;
 565: }
 566: 
 567: /* ─── New bottom nav inside left pane ─── */
 568: .bottom-nav-left {
 569:     display: flex;
 570:     align-items: center;
 571:     gap: 4px;
 572:     padding: 6px 8px;
 573:     background: rgba(0, 0, 0, 0.6);
 574:     border-top: 1px solid rgba(255, 255, 255, 0.06);
 575:     flex-shrink: 0;
 576: }
 577: 
 578: .nav-btn-left {
 579:     flex: 1;
 580:     display: flex;
 581:     flex-direction: column;
 582:     align-items: center;
 583:     justify-content: center;
 584:     gap: 2px;
 585:     padding: 8px 4px;
 586:     border: none;
 587:     background: rgba(255, 255, 255, 0.03);
 588:     border-radius: 10px;
 589:     color: var(--ne-light-gray);
 590:     font-size: 10px;
 591:     cursor: pointer;
 592:     transition: var(--glass-transition);
 593:     position: relative;
 594: }
 595: 
 596: .nav-btn-left.active {
 597:     color: var(--ne-white);
 598:     background: rgba(139, 92, 246, 0.15);
 599: }
 600: 
 601: .nav-btn-left:active {
 602:     transform: scale(0.95);
 603: }
 604: 
 605: .nav-btn-left .nav-icon {
 606:     font-size: 18px;
 607:     line-height: 1;
 608: }
 609: 
 610: .nav-btn-left .nav-label {
 611:     font-weight: 500;
 612:     font-size: 9px;
 613: }
 614: 
 615: /* ─── Hide Telegram "Neuro" branding in top-right corner ─── */
 616: .telegram-branding,
 617: .tg-branding,
 618: [data-tg-branding] {
 619:     display: none !important;
 620: }
 621: 
 622: /* Hide Telegram watermark via overlay */
 623: body::after {
 624:     content: '';
 625:     position: fixed;
 626:     top: 0;
 627:     right: 0;
 628:     width: 80px;
 629:     height: 30px;
 630:     background: var(--ne-black);
 631:     z-index: 10000;
 632:     pointer-events: none;
 633: }
 634: 
 635: .nav-btn {
 636:     flex: 1;
 637:     display: flex;
 638:     flex-direction: column;
 639:     align-items: center;
 640:     justify-content: center;
 641:     gap: 2px;
 642:     padding: var(--ne-spacing-xs) 0;
 643:     border: none;
 644:     background: none;
 645:     color: var(--ne-light-gray);
 646:     font-size: 10px;
 647:     cursor: pointer;
 648:     transition: var(--glass-transition);
 649:     position: relative;
 650: }
 651: 
 652: /* Divider between tabs (inset groove) */
 653: .nav-btn:not(:last-child)::after {
 654:     content: '';
 655:     position: absolute;
 656:     right: 0;
 657:     top: 20%;
 658:     bottom: 20%;
 659:     width: 1px;
 660:     background: linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent);
 661: }
 662: 
 663: .nav-btn.active {
 664:     color: var(--ne-white);
 665: }
 666: 
 667: .nav-btn.active::before {
 668:     content: '';
 669:     position: absolute;
 670:     top: 0;
 671:     left: 20%;
 672:     right: 20%;
 673:     height: 2px;
 674:     background: linear-gradient(90deg, var(--ne-purple), var(--ne-red));
 675:     border-radius: 1px;
 676: }
 677: 
 678: .nav-btn:active {
 679:     box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
 680: }
 681: 
 682: .nav-icon {
 683:     font-size: 22px;
 684:     line-height: 1;
 685: }
 686: 
 687: .nav-label {
 688:     font-weight: 500;
 689: }
 690: 
 691: /* ===== BUTTONS (Glass) ===== */
 692: .btn {
 693:     display: inline-flex;
 694:     align-items: center;
 695:     justify-content: center;
 696:     gap: 6px;
 697:     padding: 10px 20px;
 698:     border-radius: var(--glass-radius);
 699:     border: var(--glass-border-light);
 700:     font-size: 14px;
 701:     font-weight: 500;
 702:     cursor: pointer;
 703:     transition: var(--glass-transition);
 704:     width: 100%;
 705:     background: var(--glass-bg-light);
 706:     backdrop-filter: blur(12px) saturate(150%);
 707:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 708:     color: var(--ne-white);
 709: }
 710: 
 711: .btn:active {
 712:     transform: scale(0.98);
 713:     box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3);
 714: }
 715: 
 716: .btn-primary {
 717:     background: linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(239, 68, 68, 0.2));
 718:     border-color: rgba(139, 92, 246, 0.3);
 719:     color: var(--ne-white);
 720: }
 721: 
 722: .btn-secondary {
 723:     background: var(--glass-bg);
 724:     color: var(--ne-white);
 725:     border-color: var(--glass-border);
 726: }
 727: 
 728: /* ===== FORMS ===== */
 729: .form-group {
 730:     margin-bottom: var(--ne-spacing-lg);
 731: }
 732: 
 733: .form-label {
 734:     display: block;
 735:     font-size: 13px;
 736:     font-weight: 500;
 737:     color: var(--ne-light-gray);
 738:     margin-bottom: var(--ne-spacing-sm);
 739:     text-transform: uppercase;
 740:     letter-spacing: 0.5px;
 741: }
 742: 
 743: .form-input {
 744:     width: 100%;
 745:     padding: 12px 14px;
 746:     border-radius: var(--glass-radius);
 747:     border: var(--glass-border-light);
 748:     background: rgba(255, 255, 255, 0.04);
 749:     backdrop-filter: blur(8px);
 750:     -webkit-backdrop-filter: blur(8px);
 751:     color: var(--ne-white);
 752:     font-size: 14px;
 753:     outline: none;
 754:     transition: var(--glass-transition);
 755: }
 756: 
 757: .form-input:focus {
 758:     border-color: var(--ne-purple);
 759:     background: rgba(255, 255, 255, 0.06);
 760: }
 761: 
 762: /* ===== CARDS ===== */
 763: .card {
 764:     background: var(--glass-bg);
 765:     backdrop-filter: blur(12px) saturate(150%);
 766:     -webkit-backdrop-filter: blur(12px) saturate(150%);
 767:     border: var(--glass-border);
 768:     border-radius: var(--glass-radius);
 769:     padding: var(--ne-spacing-lg);
 770:     margin-bottom: var(--ne-spacing-md);
 771: }
 772: 
 773: .draft-card {
 774:     background: rgba(255, 255, 255, 0.02);
 775:     border-left-width: 3px;
 776: }
 777: 
 778: .card-title {
 779:     font-size: 15px;
 780:     font-weight: 600;
 781:     margin-bottom: var(--ne-spacing-sm);
 782:     color: var(--ne-white);
 783: }
 784: 
 785: .card-subtitle {
 786:     font-size: 13px;
 787:     color: var(--ne-light-gray);
 788:     margin-bottom: var(--ne-spacing-md);
 789: }
 790: 
 791: /* ===== SCROLLBAR ===== */
 792: ::-webkit-scrollbar {
 793:     width: 4px;
 794: }
 795: 
 796: ::-webkit-scrollbar-track {
 797:     background: transparent;
 798: }
 799: 
 800: ::-webkit-scrollbar-thumb {
 801:     background: rgba(255, 255, 255, 0.12);
 802:     border-radius: 2px;
 803: }
 804: 
 805: ::-webkit-scrollbar-thumb:hover {
 806:     background: rgba(255, 255, 255, 0.2);
 807: }
 808: 
 809: /* ===== ANIMATIONS ===== */
 810: @keyframes fadeIn {
 811:     from { opacity: 0; transform: translateY(8px); }
 812:     to { opacity: 1; transform: translateY(0); }
 813: }
 814: 
 815: .view {
 816:     animation: fadeIn 0.25s ease-out;
 817:     flex: 1;
 818:     display: flex;
 819:     flex-direction: column;
 820:     min-height: 0;
 821:     overflow: hidden;
 822: }
 823: 
 824: .view.has-top-panel {
 825:     flex: 1;
 826:     display: flex;
 827:     flex-direction: column;
 828:     min-height: 0;
 829:     overflow: hidden;
 830: }
 831: 
 832: /* ===== EMPTY STATE ===== */
 833: .empty-state {
 834:     text-align: center;
 835:     padding: 48px 24px;
 836:     color: var(--ne-light-gray);
 837: }
 838: 
 839: .empty-icon {
 840:     font-size: 48px;
 841:     margin-bottom: var(--ne-spacing-md);
 842:     opacity: 0.5;
 843: }
 844: 
 845: .empty-text {
 846:     font-size: 14px;
 847: }
 848: 
 849: /* ===== ATTACH MENU ===== */
 850: .attach-menu {
 851:     position: fixed;
 852:     bottom: 100px;
 853:     left: var(--ne-spacing-lg);
 854:     right: var(--ne-spacing-lg);
 855:     background: rgba(0, 0, 0, 0.8);
 856:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 857:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
 858:     border: var(--glass-border-light);
 859:     border-radius: var(--glass-radius);
 860:     padding: var(--ne-spacing-sm);
 861:     display: grid;
 862:     grid-template-columns: repeat(2, 1fr);
 863:     gap: var(--ne-spacing-sm);
 864:     z-index: 102;
 865:     animation: fadeIn 0.2s ease-out;
 866: }
 867: 
 868: .attach-option {
 869:     display: flex;
 870:     flex-direction: column;
 871:     align-items: center;
 872:     gap: 6px;
 873:     padding: var(--ne-spacing-lg);
 874:     border-radius: var(--glass-radius-sm);
 875:     border: var(--glass-border);
 876:     background: var(--glass-bg);
 877:     color: var(--ne-white);
 878:     font-size: 12px;
 879:     cursor: pointer;
 880:     transition: var(--glass-transition);
 881: }
 882: 
 883: .attach-option:active {
 884:     transform: scale(0.95);
 885:     box-shadow: inset 0 2px 6px rgba(0, 0, 0, 0.3);
 886: }
 887: 
 888: .attach-icon {
 889:     font-size: 28px;
 890: }
 891: 
 892: /* ===== VIDEO RECORDING ===== */
 893: .video-recording {
 894:     position: fixed;
 895:     top: 0;
 896:     left: 0;
 897:     right: 0;
 898:     bottom: 0;
 899:     background: var(--ne-black);
 900:     z-index: 200;
 901:     display: flex;
 902:     flex-direction: column;
 903: }
 904: 
 905: .video-preview {
 906:     flex: 1;
 907:     position: relative;
 908:     background: var(--ne-black);
 909: }
 910: 
 911: .video-preview video {
 912:     width: 100%;
 913:     height: 100%;
 914:     object-fit: cover;
 915: }
 916: 
 917: .video-controls {
 918:     position: absolute;
 919:     bottom: 0;
 920:     left: 0;
 921:     right: 0;
 922:     padding: var(--ne-spacing-xl);
 923:     display: flex;
 924:     justify-content: center;
 925:     align-items: center;
 926:     gap: var(--ne-spacing-lg);
 927:     background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
 928: }
 929: 
 930: .video-record-btn {
 931:     width: 64px;
 932:     height: 64px;
 933:     border-radius: 50%;
 934:     border: 4px solid var(--ne-white);
 935:     background: transparent;
 936:     cursor: pointer;
 937:     transition: all 0.2s;
 938: }
 939: 
 940: .video-record-btn.recording {
 941:     background: var(--ne-red);
 942:     border-radius: 12px;
 943: }
 944: 
 945: .camera-switch-btn {
 946:     width: 48px;
 947:     height: 48px;
 948:     border-radius: 50%;
 949:     border: var(--glass-border);
 950:     background: rgba(0,0,0,0.5);
 951:     backdrop-filter: blur(8px);
 952:     -webkit-backdrop-filter: blur(8px);
 953:     color: var(--ne-white);
 954:     font-size: 24px;
 955:     cursor: pointer;
 956:     display: flex;
 957:     align-items: center;
 958:     justify-content: center;
 959: }
 960: 
 961: /* ===== RESPONSIVE ===== */
 962: @media (min-width: 768px) {
 963:     .app-main {
 964:         max-width: none !important;
 965:         margin: 0;
 966:     }
 967:     
 968:     .chat-input-container {
 969:         max-width: none;
 970:         left: 0;
 971:         transform: none;
 972:     }
 973:     
 974:     .attach-menu {
 975:         max-width: none;
 976:         left: var(--ne-spacing-lg);
 977:         transform: none;
 978:     }
 979: }
 980: 
 981: @media (min-width: 768px) {
 982:     html, body, #app, .app-main, .container, .tg-web-app {
 983:         max-width: none !important;
 984:         width: 100vw !important;
 985:         height: var(--tg-viewport-stable-height, 100dvh) !important;
 986:         margin: 0 !important;
 987:         padding: 0 !important;
 988:         overflow-x: hidden !important;
 989:     }
 990: }
 991: 
 992: /* ===== REDUCED TRANSPARENCY (Accessibility) ===== */
 993: @media (prefers-reduced-transparency: reduce) {
 994:     .message-bubble,
 995:     .chat-input-container,
 996:     .bottom-nav,
 997:     .btn,
 998:     .form-input {
 999:         backdrop-filter: none;
1000:         -webkit-backdrop-filter: none;
1001:     }
1002:     
1003:     .chat-message.user .message-bubble {
1004:         background: rgba(255, 255, 255, 0.95);
1005:     }
1006:     
1007:     .chat-message.hermes .message-bubble {
1008:         background: rgba(0, 0, 0, 0.95);
1009:     }
1010: }
1011: 
1012: /* ===== NEW UI STRUCTURE v0.20.511 ===== */
1013: /* Top control panel: mic (left) + task spec (right) */
1014: 
1015: .top-control-panel {
1016:     display: flex;
1017:     justify-content: space-between;
1018:     align-items: center;
1019:     gap: var(--ne-spacing-md);
1020:     padding: var(--ne-spacing-sm) var(--ne-spacing-lg);
1021:     background: var(--glass-bg);
1022:     backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
1023:     -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(var(--glass-saturate));
1024:     border-bottom: var(--glass-border);
1025:     min-height: 56px;
1026: }
1027: 
1028: .left-mic-panel {
1029:     display: flex;
1030:     align-items: center;
1031:     gap: var(--ne-spacing-sm);
1032: }
1033: 
1034: .mic-button {
1035:     width: 44px;
1036:     height: 44px;
1037:     border-radius: 50%;
1038:     background: var(--glass-bg-light);
1039:     border: var(--glass-border);
1040:     display: flex;
1041:     align-items: center;
1042:     justify-content: center;
1043:     cursor: pointer;
1044:     transition: var(--glass-transition);
1045:     font-size: 20px;
1046: }
1047: 
1048: .mic-button:hover {
1049:     background: rgba(255, 255, 255, 0.12);
1050:     border-color: rgba(255, 255, 255, 0.2);
1051: }
1052: 
1053: .mic-button.recording {
1054:     background: rgba(239, 68, 68, 0.2);
1055:     border-color: rgba(239, 68, 68, 0.4);
1056:     animation: pulse-recording 1.5s ease-in-out infinite;
1057: }
1058: 
1059: @keyframes pulse-recording {
1060:     0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
1061:     50% { box-shadow: 0 0 0 8px rgba(239, 68, 68, 0); }
1062: }
1063: 
1064: .right-contract-panel {
1065:     flex: 1;
1066:     max-width: 60%;
1067:     min-height: 40px;
1068: }
1069: 
1070: /* Phase indicator (step bar) */
1071: .contract-phases {
1072:     display: flex;
1073:     align-items: center;
1074:     justify-content: space-between;
1075:     padding: 12px 8px;
1076:     border-bottom: 1px solid rgba(255, 255, 255, 0.06);
1077:     flex-shrink: 0;
1078: }
1079: 
1080: .phase-step {
1081:     display: flex;
1082:     flex-direction: column;
1083:     align-items: center;
1084:     gap: 4px;
1085:     opacity: 0.3;
1086:     transition: opacity 0.3s, transform 0.3s;
1087:     position: relative;
1088: }
1089: 
1090: .phase-step.active {
1091:     opacity: 1;
1092: }
1093: 
1094: .phase-step.completed {
1095:     opacity: 0.6;
1096: }
1097: 
1098: .phase-step.completed .phase-icon::after {
1099:     content: '✓';
1100:     position: absolute;
1101:     top: -2px;
1102:     right: -6px;
1103:     font-size: 10px;
1104:     color: #00ff88;
1105:     background: rgba(0, 0, 0, 0.8);
1106:     border-radius: 50%;
1107:     width: 14px;
1108:     height: 14px;
1109:     display: flex;
1110:     align-items: center;
1111:     justify-content: center;
1112: }
1113: 
1114: .phase-icon {
1115:     font-size: 18px;
1116:     position: relative;
1117: }
1118: 
1119: .phase-label {
1120:     font-size: 9px;
1121:     color: var(--ne-light-gray);
1122:     text-align: center;
1123:     white-space: nowrap;
1124: }
1125: 
1126: .phase-step.active .phase-label {
1127:     color: var(--ne-white);
1128:     font-weight: 600;
1129: }
1130: 
1131: /* Connector lines between phases */
1132: .phase-step:not(:last-child)::after {
1133:     content: '';
1134:     position: absolute;
1135:     top: 14px;
1136:     right: -50%;
1137:     width: 100%;
1138:     height: 1px;
1139:     background: rgba(255, 255, 255, 0.1);
1140:     z-index: -1;
1141: }
1142: 
1143: .phase-step.completed:not(:last-child)::after {
1144:     background: rgba(0, 255, 136, 0.3);
1145: }
1146: 
1147: /* Contract fields */
1148: .contract-fields {
1149:     padding: 12px;
1150:     overflow-y: auto;
1151:     flex: 1;
1152: }
1153: 
1154: .contract-field {
1155:     margin-bottom: 12px;
1156:     padding-bottom: 12px;
1157:     border-bottom: 1px solid rgba(255, 255, 255, 0.04);
1158: }
1159: 
1160: .contract-field:last-child {
1161:     border-bottom: none;
1162:     margin-bottom: 0;
1163:     padding-bottom: 0;
1164: }
1165: 
1166: .field-label {
1167:     font-size: 10px;
1168:     font-weight: 600;
1169:     color: var(--ne-purple);
1170:     text-transform: uppercase;
1171:     letter-spacing: 0.5px;
1172:     margin-bottom: 4px;
1173:     display: block;
1174: }
1175: 
1176: .field-value {
1177:     font-size: 13px;
1178:     color: var(--ne-white);
1179:     line-height: 1.5;
1180:     min-height: 20px;
1181: }
1182: 
1183: .field-value.empty {
1184:     color: rgba(255, 255, 255, 0.2);
1185:     font-style: italic;
1186: }
1187: 
1188: /* Status badges */
1189: .status-badge {
1190:     display: inline-block;
1191:     padding: 3px 10px;
1192:     border-radius: 12px;
1193:     font-size: 11px;
1194:     font-weight: 600;
1195: }
1196: 
1197: .status-badge.draft {
1198:     background: rgba(255, 255, 255, 0.08);
1199:     color: var(--ne-light-gray);
1200: }
1201: 
1202: .status-badge.review {
1203:     background: rgba(139, 92, 246, 0.2);
1204:     color: #a78bfa;
1205: }
1206: 
1207: .status-badge.sorting {
1208:     background: rgba(59, 130, 246, 0.2);
1209:     color: #60a5fa;
1210: }
1211: 
1212: .status-badge.agreement {
1213:     background: rgba(245, 158, 11, 0.2);
1214:     color: #fbbf24;
1215: }
1216: 
1217: .status-badge.escrow {
1218:     background: rgba(0, 255, 136, 0.2);
1219:     color: #00ff88;
1220: }
1221: 
1222: .status-badge.completed {
1223:     background: rgba(0, 255, 136, 0.3);
1224:     color: #00ff88;
1225: }
1226: 
1227: .status-badge.disputed {
1228:     background: rgba(239, 68, 68, 0.2);
1229:     color: #ef4444;
1230: }
1231: 
1232: /* Progress bar for escrow phase */
1233: .escrow-progress {
1234:     margin-top: 16px;
1235:     padding: 12px;
1236:     background: rgba(0, 0, 0, 0.3);
1237:     border-radius: 8px;
1238:     border: 1px solid rgba(255, 255, 255, 0.06);
1239: }
1240: 
1241: .escrow-progress-label {
1242:     font-size: 11px;
1243:     color: var(--ne-light-gray);
1244:     margin-bottom: 8px;
1245: }
1246: 
1247: .escrow-progress-bar {
1248:     height: 6px;
1249:     background: rgba(255, 255, 255, 0.06);
1250:     border-radius: 3px;
1251:     overflow: hidden;
1252: }
1253: 
1254: .escrow-progress-fill {
1255:     height: 100%;
1256:     background: linear-gradient(90deg, var(--ne-purple), #00ff88);
1257:     border-radius: 3px;
1258:     transition: width 0.5s ease;
1259: }
1260: 
1261: .escrow-progress-percent {
1262:     font-size: 12px;
1263:     color: var(--ne-white);
1264:     margin-top: 6px;
1265:     text-align: right;
1266:     font-weight: 600;
1267: }
1268: 
1269: /* Vertical connectors */
1270: .vertical-connector {
1271:     position: absolute;
1272:     top: 0;
1273:     bottom: 0;
1274:     width: 1px;
1275:     background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.15), transparent);
1276:     pointer-events: none;
1277:     z-index: 0;
1278: }
1279: 
1280: .vertical-connector.left {
1281:     left: calc(var(--ne-spacing-lg) + 22px);
1282: }
1283: 
1284: .vertical-connector.right {
1285:     right: calc(var(--ne-spacing-lg) + 22px);
1286: }
1287: 
1288: /* Chat area with top panel spacing */
1289: .view.has-top-panel .chat-messages {
1290:     padding-top: var(--ne-spacing-sm);
1291: }
1292: 
1293: /* Task spec questions */
1294: .task-question {
1295:     margin-top: var(--ne-spacing-sm);
1296:     padding-top: var(--ne-spacing-sm);
1297:     border-top: 1px solid rgba(255, 255, 255, 0.06);
1298: }
1299: 
1300: .task-question p {
1301:     font-size: 12px;
1302:     color: var(--ne-silver);
1303:     margin-bottom: 4px;
1304: }
1305: 
1306: .task-question input {
1307:     width: 100%;
1308:     background: rgba(0, 0, 0, 0.3);
1309:     border: 1px solid rgba(255, 255, 255, 0.1);
1310:     border-radius: 6px;
1311:     padding: 6px 10px;
1312:     color: var(--ne-white);
1313:     font-size: 12px;
1314:     outline: none;
1315:     transition: var(--glass-transition);
1316: }
1317: 
1318: .task-question input:focus {
1319:     border-color: rgba(139, 92, 246, 0.5);
1320: }
1321: 
1322: /* ─── Панель вопросов смарт-контракта ─────────────────────────────── */
1323: .contract-qa-panel {
1324:     margin: var(--ne-spacing-md) var(--ne-spacing-lg);
1325:     padding: var(--ne-spacing-md);
1326:     background: var(--glass-bg);
1327:     border: var(--glass-border);
1328:     border-radius: var(--glass-radius-sm);
1329:     backdrop-filter: blur(8px);
1330:     -webkit-backdrop-filter: blur(8px);
1331: }
1332: 
1333: .qa-item {
1334:     margin-bottom: 10px;
1335:     padding-bottom: 10px;
1336:     border-bottom: 1px solid rgba(255,255,255,0.06);
1337: }
1338: 
1339: .qa-item:last-child { border-bottom: none; margin-bottom: 0; padding-bottom: 0; }
1340: 
1341: .qa-question {
1342:     font-size: 0.85rem;
1343:     color: #a0b4ff;
1344:     margin-bottom: 6px;
1345:     line-height: 1.4;
1346: }
1347: 
1348: .qa-answer-input {
1349:     width: 100%;
1350:     padding: 8px 10px;
1351:     background: rgba(0,0,0,0.3);
1352:     border: 1px solid rgba(255,255,255,0.1);
1353:     border-radius: 8px;
1354:     color: #fff;
1355:     font-size: 0.85rem;
1356:     outline: none;
1357:     transition: border-color 0.2s;
1358: }
1359: 
1360: .qa-answer-input:focus { border-color: #00ff88; }
1361: 
1362: .qa-empty { color: #666; font-size: 0.8rem; text-align: center; padding: 8px 0; }
1363: 
1364: /* ─── Голосовой ввод (пульсация) ──────────────────────────────────── */
1365: .mic-button.recording,
1366: #micButton.recording {
1367:     animation: pulse-recording 1.2s infinite ease-in-out;
1368:     border-color: #ff4d4d !important;
1369:     box-shadow: 0 0 12px rgba(255,77,77,0.4);
1370: }
1371: 
1372: @keyframes pulse-recording {
1373:     0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,77,77,0.5); }
1374:     70% { transform: scale(1.05); box-shadow: 0 0 0 8px rgba(255,77,77,0); }
1375:     100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,77,77,0); }
1376: }
1377: 
1378: /* ─── История ТЗ ──────────────────────────────────────────────────── */
1379: .task-history-panel {
1380:     position: fixed;
1381:     bottom: 80px;
1382:     left: 50%;
1383:     transform: translateX(-50%) translateY(20px);
1384:     width: 90%;
1385:     max-width: 400px;
1386:     max-height: 50vh;
1387:     background: rgba(18,18,24,0.95);
1388:     border: 1px solid rgba(255,255,255,0.1);
1389:     border-radius: 16px;
1390:     padding: 12px;
1391:     overflow-y: auto;
1392:     opacity: 0;
1393:     pointer-events: none;
1394:     transition: all 0.25s cubic-bezier(0.16,1,0.3,1);
1395:     z-index: 900;
1396:     backdrop-filter: blur(12px);
1397:     -webkit-backdrop-filter: blur(12px);
1398: }
1399: 
1400: .task-history-panel.visible {
1401:     opacity: 1;
1402:     pointer-events: auto;
1403:     transform: translateX(-50%) translateY(0);
1404: }
1405: 
1406: .task-history-panel .history-item {
1407:     display: flex;
1408:     gap: 8px;
1409:     padding: 8px;
1410:     border-radius: 8px;
1411:     cursor: pointer;
1412:     transition: background 0.15s;
1413: }
1414: 
1415: .task-history-panel .history-item:hover { background: rgba(255,255,255,0.06); }
1416: 
1417: .task-history-panel .history-time { color: #666; font-size: 0.75rem; min-width: 42px; }
1418: 
1419: .task-history-panel .history-text { color: #ccc; font-size: 0.8rem; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
1420: 
1421: .task-history-panel .history-empty { color: #555; text-align: center; padding: 16px 0; font-size: 0.8rem; }
1422: 
1423: /* ─── Кнопка экспорта ─────────────────────────────────────────────── */
1424: .export-btn-sm {
1425:     flex: 1;
1426:     padding: 6px 8px;
1427:     background: rgba(255,255,255,0.06);
1428:     border: 1px solid rgba(255,255,255,0.1);
1429:     border-radius: 8px;
1430:     color: var(--ne-light-gray);
1431:     font-size: 0.75rem;
1432:     cursor: pointer;
1433:     transition: var(--glass-transition);
1434: }
1435: 
1436: .export-btn-sm:hover {
1437:     background: rgba(255,255,255,0.12);
1438:     border-color: rgba(255,255,255,0.2);
1439: }
1440: 
1441: .export-btn-sm:active { transform: scale(0.97); }
1442: 
1443: .export-btn {
1444:     margin-top: 10px;
1445:     width: 100%;
1446:     padding: 10px;
1447:     background: linear-gradient(135deg, #00ff88 0%, #00b8ff 100%);
1448:     border: none;
1449:     border-radius: 10px;
1450:     color: #000;
1451:     font-weight: 600;
1452:     font-size: 0.85rem;
1453:     cursor: pointer;
1454:     transition: opacity 0.2s, transform 0.1s;
1455: }
1456: 
1457: .export-btn:active { transform: scale(0.98); opacity: 0.9; }
1458: 
1459: /* ═══════════════════════════════════════════════════════════════════
1460:    SPLIT-PANE LAYOUT (Android Studio style)
1461:    Left: Hermes chat  |  Right: Smart contract / ТЗ (лист А4)
1462:    Горизонтальный split ВСЕГДА — мобильные тоже
1463:    ══════════════════════════════════════════════════════════════════ */
1464: 
1465: /* Split container wrapper — всегда горизонтальный */
1466: .split-layout {
1467:     display: flex;
1468:     flex-direction: row;
1469:     flex: 1;
1470:     gap: 0;
1471:     min-height: 0;
1472:     overflow: hidden;
1473: }
1474: 
1475: /* Individual pane */
1476: .split-pane {
1477:     display: flex;
1478:     flex-direction: column;
1479:     min-height: 0;
1480:     overflow: hidden;
1481: }
1482: 
1483: /* Left pane: chat (dark) */
1484: .split-pane.left-pane {
1485:     flex: 1;
1486:     min-width: 0;
1487:     background: transparent;
1488:     padding: 8px;
1489:     padding-right: 4px;
1490: }
1491: 
1492: /* Right pane: contract (A4 paper style) */
1493: .split-pane.right-pane {
1494:     flex: 0 0 38%;
1495:     min-width: 200px;
1496:     background: transparent;
1497:     padding: 8px;
1498:     padding-left: 4px;
1499: }
1500: 
1501: /* Glass pane borders — Android Studio style */
1502: .split-pane .pane-glass {
1503:     flex: 1;
1504:     display: flex;
1505:     flex-direction: column;
1506:     background: rgba(20, 20, 28, 0.85);
1507:     backdrop-filter: blur(20px) saturate(150%);
1508:     -webkit-backdrop-filter: blur(20px) saturate(150%);
1509:     border: 1px solid rgba(255, 255, 255, 0.08);
1510:     border-radius: 12px;
1511:     overflow: hidden;
1512:     box-shadow:
1513:         0 0 0 1px rgba(255, 255, 255, 0.03),
1514:         0 4px 24px rgba(0, 0, 0, 0.4),
1515:         inset 0 1px 0 rgba(255, 255, 255, 0.05);
1516:     min-height: 0;
1517: }
1518: 
1519: .split-pane.left-pane .pane-glass {
1520:     background: rgba(10, 10, 14, 0.9);
1521: }
1522: 
1523: .split-pane.right-pane .pane-glass {
1524:     background: rgba(22, 22, 30, 0.9);
1525: }
1526: 
1527: /* Pane header (IDE-style tab bar) */
1528: .pane-header {
1529:     display: flex;
1530:     align-items: center;
1531:     gap: 8px;
1532:     padding: 8px 12px;
1533:     background: rgba(0, 0, 0, 0.6);
1534:     border-bottom: 1px solid rgba(255, 255, 255, 0.08);
1535:     flex-shrink: 0;
1536:     min-height: 36px;
1537: }
1538: 
1539: .pane-header-icon {
1540:     font-size: 14px;
1541:     opacity: 0.7;
1542: }
1543: 
1544: .pane-header-title {
1545:     font-size: 12px;
1546:     font-weight: 600;
1547:     color: var(--ne-light-gray);
1548:     text-transform: uppercase;
1549:     letter-spacing: 0.5px;
1550: }
1551: 
1552: .pane-header-dot {
1553:     width: 8px;
1554:     height: 8px;
1555:     border-radius: 50%;
1556: }
1557: 
1558: /* TTS toggle button in pane header */
1559: .tts-toggle-btn {
1560:     margin-left: auto;
1561:     background: none;
1562:     border: none;
1563:     font-size: 16px;
1564:     cursor: pointer;
1565:     opacity: 0.7;
1566:     transition: opacity 0.2s;
1567:     padding: 2px 6px;
1568:     line-height: 1;
1569: }
1570: .tts-toggle-btn:hover { opacity: 1; }
1571: .tts-toggle-btn:active { transform: scale(0.9); }
1572: 
1573: /* TTS engine selector button */
1574: .tts-engine-btn {
1575:     background: none;
1576:     border: none;
1577:     font-size: 14px;
1578:     cursor: pointer;
1579:     opacity: 0.7;
1580:     transition: opacity 0.2s;
1581:     padding: 2px 6px;
1582:     line-height: 1;
1583:     margin-left: 4px;
1584: }
1585: .tts-engine-btn:hover { opacity: 1; }
1586: .tts-engine-btn:active { transform: scale(0.9); }
1587: 
1588: /* TTS engine dropdown menu */
1589: .tts-engine-menu {
1590:     position: absolute;
1591:     top: 40px;
1592:     right: 10px;
1593:     background: rgba(20, 20, 30, 0.95);
1594:     border: 1px solid rgba(139, 92, 246, 0.3);
1595:     border-radius: 12px;
1596:     padding: 8px 0;
1597:     z-index: 1000;
1598:     display: flex;
1599:     flex-direction: column;
1600:     gap: 4px;
1601:     backdrop-filter: blur(10px);
1602:     box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
1603:     min-width: 180px;
1604: }
1605: 
1606: .tts-engine-item {
1607:     display: flex;
1608:     justify-content: space-between;
1609:     align-items: center;
1610:     padding: 10px 16px;
1611:     cursor: pointer;
1612:     transition: background 0.2s;
1613:     border-radius: 8px;
1614:     margin: 0 4px;
1615: }
1616: 
1617: .tts-engine-item:hover {
1618:     background: rgba(139, 92, 246, 0.2);
1619: }
1620: 
1621: .tts-engine-item:active {
1622:     transform: scale(0.98);
1623: }
1624: 
1625: .tts-engine-name {
1626:     color: #e2e8f0;
1627:     font-size: 14px;
1628:     font-weight: 500;
1629: }
1630: 
1631: .tts-engine-badge {
1632:     background: rgba(139, 92, 246, 0.3);
1633:     color: #a78bfa;
1634:     padding: 2px 8px;
1635:     border-radius: 12px;
1636:     font-size: 11px;
1637:     font-weight: 600;
1638:     letter-spacing: 0.5px;
1639: }
1640: 
1641: /* Per-message speak button */
1642: .speak-btn {
1643:     background: transparent;
1644:     border: none;
1645:     font-size: 16px;
1646:     cursor: pointer;
1647:     opacity: 0.5;
1648:     transition: opacity 0.2s, transform 0.1s;
1649:     padding: 0 2px;
1650:     line-height: 1;
1651:     filter: grayscale(0%);
1652: }
1653: .speak-btn:hover { opacity: 1; }
1654: .speak-btn:active { transform: scale(0.9); }
1655: .speak-btn.muted {
1656:     opacity: 0.3;
1657:     filter: grayscale(100%);
1658: }
1659: .speak-btn.muted:hover {
1660:     opacity: 0.6;
1661: }
1662: 
1663: /* Fix orphaned flex-shrink */
1664: .pane-header {
1665:     flex-shrink: 0;
1666: }
1667: 
1668: .pane-header-dot.purple { background: var(--ne-purple); }
1669: .pane-header-dot.red { background: var(--ne-red); }
1670: .pane-header-dot.green { background: #00ff88; }
1671: 
1672: /* Pane content area */
1673: .pane-content {
1674:     flex: 1;
1675:     overflow-y: auto;
1676:     overflow-x: hidden;
1677:     min-height: 0;
1678:     display: flex;
1679:     flex-direction: column;
1680: }
1681: 
1682: /* Left pane content: chat area */
1683: .split-pane.left-pane .pane-content {
1684:     position: relative;
1685: }
1686: 
1687: /* Resizable divider between panes */
1688: .split-divider {
1689:     flex-shrink: 0;
1690:     width: 4px;
1691:     background: transparent;
1692:     position: relative;
1693:     cursor: col-resize;
1694:     transition: background 0.2s;
1695:     z-index: 10;
1696:     align-self: stretch;
1697:     display: flex;
1698:     align-items: center;
1699:     justify-content: center;
1700: }
1701: 
1702: .split-divider::after {
1703:     content: '';
1704:     width: 2px;
1705:     height: 100%;
1706:     border-radius: 1px;
1707:     background: rgba(255, 255, 255, 0.06);
1708:     transition: background 0.2s;
1709: }
1710: 
1711: .split-divider:hover::after,
1712: .split-divider.dragging::after {
1713:     background: rgba(139, 92, 246, 0.4);
1714: }
1715: 
1716: /* ─── Right pane: A4 paper style ─── */
1717: .right-contract-panel {
1718:     flex: 1;
1719:     padding: var(--ne-spacing-md);
1720:     min-height: 0;
1721: }
1722: 
1723: .task-spec-container {
1724:     background: rgba(255, 255, 255, 0.03);
1725:     border: 1px solid rgba(255, 255, 255, 0.08);
1726:     border-radius: var(--glass-radius-sm);
1727:     padding: var(--ne-spacing-md);
1728:     font-size: 13px;
1729:     color: var(--ne-light-gray);
1730:     height: 100%;
1731:     overflow-y: auto;
1732:     transition: var(--glass-transition);
1733:     /* A4 paper feel */
1734:     box-shadow: 0 0 20px rgba(0, 0, 0, 0.3);
1735: }
1736: 
1737: .task-spec-container.has-content {
1738:     border-color: rgba(139, 92, 246, 0.3);
1739:     background: rgba(139, 92, 246, 0.04);
1740: }
1741: 
1742: .task-spec-title {
1743:     font-size: 11px;
1744:     font-weight: 600;
1745:     color: var(--ne-purple);
1746:     text-transform: uppercase;
1747:     letter-spacing: 0.5px;
1748:     margin-bottom: 8px;
1749:     padding-bottom: 6px;
1750:     border-bottom: 1px solid rgba(255, 255, 255, 0.06);
1751: }
1752: 
1753: .task-spec-content {
1754:     line-height: 1.6;
1755:     font-size: 13px;
1756: }
1757: 
1758: /* Contract Q&A panel inside right pane */
1759: .contract-qa-panel {
1760:     margin: var(--ne-spacing-md);
1761:     padding: var(--ne-spacing-md);
1762:     background: rgba(255, 255, 255, 0.02);
1763:     border: 1px solid rgba(255, 255, 255, 0.06);
1764:     border-radius: var(--glass-radius-sm);
1765:     backdrop-filter: blur(8px);
1766:     -webkit-backdrop-filter: blur(8px);
1767: }
1768: 
1769: /* ─── Top control panel inside left pane ─── */
1770: .split-pane.left-pane .top-control-panel {
1771:     background: rgba(0, 0, 0, 0.4);
1772:     border-bottom: 1px solid rgba(255, 255, 255, 0.06);
1773: }
1774: 
1775: /* ─── Chat input inside left pane ─── */
1776: .split-pane.left-pane .chat-input-container {
1777:     position: sticky;
1778:     bottom: 0;
1779:     left: auto;
1780:     right: auto;
1781:     border-top: 1px solid rgba(255, 255, 255, 0.06);
1782:     z-index: 10;
1783:     padding: 8px 12px;
1784:     background: rgba(0, 0, 0, 0.6);
1785:     backdrop-filter: blur(12px);
1786:     -webkit-backdrop-filter: blur(12px);
1787:     flex-shrink: 0;
1788: }
1789: 
1790: /* Hide fixed chat input when split layout is active */
1791: .chat-input-container:not(.split-chat-input) {
1792:     display: none !important;
1793: }
1794: 
1795: /* Show split chat input only on hermes view (handled by JS) */
1796: .split-chat-input {
1797:     display: flex;
1798: }
1799: 
1800: /* ─── Mobile adjustments ─── */
1801: @media (max-width: 599px) {
1802:     .split-pane.right-pane {
1803:         flex: 0 0 35%;
1804:         min-width: 140px;
1805:     }
1806: 
1807:     .pane-header-title {
1808:         font-size: 10px;
1809:     }
1810: 
1811:     .task-spec-container {
1812:         padding: var(--ne-spacing-sm);
1813:         font-size: 12px;
1814:     }
1815: 
1816:     .contract-qa-panel {
1817:         margin: var(--ne-spacing-sm);
1818:         padding: var(--ne-spacing-sm);
1819:     }
1820: }
1821: 
1822: /* ─── Desktop adjustments ─── */
1823: @media (min-width: 600px) {
1824:     .split-pane.right-pane {
1825:         flex: 0 0 38%;
1826:         min-width: 280px;
1827:     }
1828: 
1829:     .task-spec-container {
1830:         padding: var(--ne-spacing-md);
1831:         font-size: 13px;
1832:     }
1833: 
1834:     .contract-qa-panel {
1835:         margin: var(--ne-spacing-md);
1836:         padding: var(--ne-spacing-md);
1837:     }
1838: }
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
  25:         // TTS (Text-to-Speech) — auto-read Hermes messages
  26:         this.ttsEnabled = true;
  27:         this.ttsEngine = 'silero'; // silero, vits, google
  28:         this.ttsAudio = null;
  29:         this.currentSpeakIdx = null;
  30:         this.audioUnlocked = false;
  31:         
  32:         // Smart contract state
  33:         this.smartContract = {
  34:             phase: 'draft', // draft, review, sorting, agreement, escrow, completed
  35:             fields: {
  36:                 title: null,
  37:                 description: null,
  38:                 budget: null,
  39:                 deadline: null,
  40:                 client: null,
  41:                 coder: null,
  42:                 status: 'draft'
  43:             },
  44:             progress: 0
  45:         };
  46:         
  47:         this.init();
  48:     }
  49: 
  50:     async init() {
  51:         if (window.Telegram?.WebApp) {
  52:             const tg = window.Telegram.WebApp;
  53:             tg.ready();
  54:             tg.expand();
  55: 
  56:             // Bot API 8.0+: requestFullscreen for desktop/immersive
  57:             if (typeof tg.requestFullscreen === 'function') {
  58:                 try {
  59:                     const fsResult = tg.requestFullscreen();
  60:                     if (fsResult && typeof fsResult.catch === 'function') {
  61:                         fsResult.catch(() => {
  62:                             // Already expanded via tg.expand() above
  63:                         });
  64:                     }
  65:                 } catch (e) {
  66:                     // requestFullscreen failed — already expanded
  67:                 }
  68:             }
  69: 
  70:             // Listen for fullscreen state changes
  71:             tg.onEvent('fullscreenChanged', () => {
  72:                 console.log('[TG] fullscreenChanged:', tg.isFullscreen);
  73:                 const fsBtn = document.getElementById('tg-fullscreen-btn');
  74:                 if (fsBtn) fsBtn.style.display = tg.isFullscreen ? 'none' : 'inline-block';
  75:             });
  76: 
  77:             // Handle fullscreen failure gracefully
  78:             tg.onEvent('fullscreenFailed', (reason) => {
  79:                 console.warn('[TG] fullscreenFailed:', reason);
  80:                 tg.expand(); // Fallback
  81:             });
  82: 
  83:             // Safe area insets — apply CSS padding to respect device notches
  84:             this.applySafeAreaInsets();
  85:             tg.onEvent('safeAreaChanged', () => this.applySafeAreaInsets());
  86:             tg.onEvent('contentSafeAreaChanged', () => this.applySafeAreaInsets());
  87:         }
  88:         this.userData = telegram.getUser();
  89:         this.updateHeader();
  90:         this.updateTTSButton();
  91:         await this.loadCache();
  92:         this.loadContractState();
  93:         this.navigate('hermes');
  94: 
  95:         window.addEventListener('ton:statusChange', (e) => {
  96:             this.onTonStatusChange(e.detail);
  97:         });
  98: 
  99:         this.requestDataFromBot();
 100: 
 101:         // Fullscreen button handler (user gesture required on TG Desktop)
 102:         const fsBtn = document.getElementById('tg-fullscreen-btn');
 103:         if (fsBtn && window.Telegram?.WebApp) {
 104:             const tg = window.Telegram.WebApp;
 105:             if (typeof tg.requestFullscreen === 'function') {
 106:                 fsBtn.addEventListener('click', () => {
 107:                     const fsResult = tg.requestFullscreen();
 108:                     if (fsResult && typeof fsResult.catch === 'function') {
 109:                         fsResult.catch(e => {
 110:                             console.warn('[TG] Fullscreen blocked:', e);
 111:                             tg.expand(); // Fallback
 112:                         });
 113:                     } else {
 114:                         tg.expand(); // Fallback
 115:                     }
 116:                 });
 117:                 // Hide button if already in fullscreen
 118:                 if (tg.isFullscreen === true) {
 119:                     fsBtn.style.display = 'none';
 120:                 }
 121:             } else {
 122:                 fsBtn.style.display = 'none';
 123:             }
 124:         }
 125: 
 126:         // Priority 2-3: Voice input, Contract Q&A, Task Spec history
 127:         this.initVoiceInput();
 128:         this.loadTaskSpecHistory();
 129: 
 130:         const micBtn = document.getElementById('micButton') || document.querySelector('.left-mic-panel button');
 131:         if (micBtn) micBtn.onclick = () => this.toggleVoiceRecording();
 132: 
 133:         const exportBtn = document.getElementById('exportTaskSpecBtn');
 134:         if (exportBtn) exportBtn.onclick = () => this.exportTaskSpec();
 135: 
 136:         const historyToggle = document.getElementById('toggleTaskHistoryBtn');
 137:         const historyPanel = document.getElementById('task-history-panel');
 138:         if (historyToggle && historyPanel) {
 139:             historyToggle.onclick = () => {
 140:                 historyPanel.classList.toggle('visible');
 141:                 telegram.haptic('light');
 142:             };
 143:         }
 144: 
 145:         this.renderContractQuestions([
 146:             { id: 'q1', text: 'Каков дедлайн исполнения смарт-контракта?' },
 147:             { id: 'q2', text: 'Укажите условия возврата средств при срыве сроков.' },
 148:             { id: 'q3', text: 'Требуется ли арбитраж третьей стороны?' }
 149:         ]);
 150:     }
 151: 
 152:     updateHeader() {
 153:         const nameEl = document.getElementById('user-name');
 154:         
 155:         if (this.userData) {
 156:             const name = this.userData.first_name || this.userData.username || 'Пользователь';
 157:             nameEl.textContent = name;
 158:         } else {
 159:             nameEl.textContent = 'Гость';
 160:         }
 161:     }
 162: 
 163:     applySafeAreaInsets() {
 164:         const tg = window.Telegram?.WebApp;
 165:         if (!tg) return;
 166: 
 167:         // Apply safe area insets as CSS custom properties
 168:         // Docs: https://docs.telegram-mini-apps.com/packages/tma-js-sdk/features/viewport
 169:         const root = document.documentElement;
 170:         if (tg.safeAreaInset) {
 171:             root.style.setProperty('--tg-safe-area-inset-top', `${tg.safeAreaInset.top}px`);
 172:             root.style.setProperty('--tg-safe-area-inset-bottom', `${tg.safeAreaInset.bottom}px`);
 173:             root.style.setProperty('--tg-safe-area-inset-left', `${tg.safeAreaInset.left}px`);
 174:             root.style.setProperty('--tg-safe-area-inset-right', `${tg.safeAreaInset.right}px`);
 175:         }
 176:         if (tg.contentSafeAreaInset) {
 177:             root.style.setProperty('--tg-content-safe-area-inset-top', `${tg.contentSafeAreaInset.top}px`);
 178:             root.style.setProperty('--tg-content-safe-area-inset-bottom', `${tg.contentSafeAreaInset.bottom}px`);
 179:         }
 180: 
 181:         // Use viewportStableHeight for layout (doesn't change during gestures)
 182:         if (tg.viewportStableHeight) {
 183:             root.style.setProperty('--tg-viewport-stable-height', `${tg.viewportStableHeight}px`);
 184:         }
 185:     }
 186: 
 187:     navigate(view) {
 188:         // Reset voice state when switching tabs
 189:         if (view !== 'hermes' && this.voiceState !== 'IDLE') {
 190:             this.resetVoiceState();
 191:         }
 192:         
 193:         this.currentView = view;
 194:         
 195:         document.querySelectorAll('.nav-btn').forEach(btn => {
 196:             btn.classList.toggle('active', btn.dataset.view === view);
 197:         });
 198:         
 199:         const main = document.getElementById('main-content');
 200:         main.innerHTML = '';
 201:         
 202:         // Show/hide chat input based on view (split-chat-input is inside left pane)
 203:         const chatInput = document.getElementById('chat-input-container');
 204:         if (chatInput) {
 205:             chatInput.style.display = view === 'hermes' ? 'flex' : 'none';
 206:         }
 207:         
 208:         // Also handle the split-layout chat input
 209:         const splitChatInput = document.querySelector('.split-chat-input');
 210:         if (splitChatInput) {
 211:             splitChatInput.style.display = view === 'hermes' ? 'flex' : 'none';
 212:         }
 213:         
 214:         // Hide fixed chat input container when not on hermes
 215:         const fixedChatInput = document.querySelector('.chat-input-container:not(.split-chat-input)');
 216:         if (fixedChatInput) {
 217:             fixedChatInput.style.display = view === 'hermes' ? 'flex' : 'none';
 218:         }
 219:         
 220:         switch(view) {
 221:             case 'hermes':
 222:                 this.renderHermesView(main);
 223:                 break;
 224:             case 'deals':
 225:                 this.renderDealsView(main);
 226:                 break;
 227:             case 'profile':
 228:                 this.renderProfileView(main);
 229:                 break;
 230:         }
 231:         
 232:         telegram.haptic('light');
 233:     }
 234: 
 235:     // -------------------------------------------------------------------------
 236:     // Hermes View (Voice Interface - Main Screen)
 237:     // -------------------------------------------------------------------------
 238: 
 239:     renderHermesView(container) {
 240:         const view = document.createElement('div');
 241:         view.className = 'view has-top-panel';
 242:         
 243:         view.innerHTML = `
 244:             <div class="split-layout">
 245:                 <!-- LEFT PANE: Hermes Chat -->
 246:                 <div class="split-pane left-pane">
 247:                     <div class="pane-glass">
 248:                         <div class="pane-header">
 249:                             <span class="pane-header-dot purple"></span>
 250:                             <span class="pane-header-icon">🎙️</span>
 251:                             <span class="pane-header-title">Гермес — Чат</span>
 252:                             <button class="tts-toggle-btn" id="tts-toggle-btn" onclick="app.toggleTTS()" title="Голос Гермеса">
 253:                                 <span id="tts-icon">🔊</span>
 254:                             </button>
 255:                             <button class="tts-engine-btn" id="tts-engine-btn" onclick="app.toggleTTSMenu()" title="Выбор TTS-движка">
 256:                                 <span id="tts-engine-icon">⚙️</span>
 257:                             </button>
 258:                             <!-- TTS Engine Selector Dropdown -->
 259:                             <div class="tts-engine-menu" id="tts-engine-menu" style="display: none;">
 260:                                 <div class="tts-engine-item" onclick="app.setTTSEngine('silero')">
 261:                                     <span class="tts-engine-name">Silero V5</span>
 262:                                     <span class="tts-engine-badge">SOTA</span>
 263:                                 </div>
 264:                                 <div class="tts-engine-item" onclick="app.setTTSEngine('vits')">
 265:                                     <span class="tts-engine-name">VITS Russian</span>
 266:                                     <span class="tts-engine-badge">HF</span>
 267:                                 </div>
 268:                                 <div class="tts-engine-item" onclick="app.setTTSEngine('google')">
 269:                                     <span class="tts-engine-name">Google Translate</span>
 270:                                     <span class="tts-engine-badge">FAST</span>
 271:                                 </div>
 272:                             </div>
 273:                         </div>
 274:                         <div class="pane-content">
 275:                             <div class="chat-messages" id="chat-messages"></div>
 276:                             <!-- Chat input -->
 277:                             <div class="chat-input-container split-chat-input" id="chat-input-container">
 278:                                 <button class="attach-btn" id="attach-btn" onclick="app.showAttachMenu()">
 279:                                     <span>📎</span>
 280:                                 </button>
 281:                                 <input type="text" class="chat-input" id="chat-input" placeholder="Напишите сообщение..." />
 282:                                 <button class="send-btn" id="send-btn" onclick="app.sendTextMessage()">
 283:                                     <span>➤</span>
 284:                                 </button>
 285:                             </div>
 286:                         </div>
 287:                         <!-- Bottom nav: 4 buttons -->
 288:                         <div class="bottom-nav-left">
 289:                             <button class="nav-btn-left active" data-view="hermes" onclick="app.navigate('hermes')">
 290:                                 <span class="nav-icon">🎙️</span>
 291:                                 <span class="nav-label">Гермес</span>
 292:                             </button>
 293:                             <button class="nav-btn-left" data-view="deals" onclick="app.navigate('deals')">
 294:                                 <span class="nav-icon">🤝</span>
 295:                                 <span class="nav-label">Сделки</span>
 296:                             </button>
 297:                             <button class="nav-btn-left" data-view="profile" onclick="app.navigate('profile')">
 298:                                 <span class="nav-icon">👤</span>
 299:                                 <span class="nav-label">Профиль</span>
 300:                             </button>
 301:                             <button class="nav-btn-left" id="micButton" onclick="app.toggleVoiceRecording()">
 302:                                 <span class="nav-icon">🎤</span>
 303:                                 <span class="nav-label">Микрофон</span>
 304:                             </button>
 305:                         </div>
 306:                     </div>
 307:                 </div>
 308: 
 309:                 <!-- DIVIDER -->
 310:                 <div class="split-divider" id="split-divider"></div>
 311: 
 312:                 <!-- RIGHT PANE: Smart Contract -->
 313:                 <div class="split-pane right-pane">
 314:                     <div class="pane-glass">
 315:                         <div class="pane-header">
 316:                             <span class="pane-header-dot green"></span>
 317:                             <span class="pane-header-icon">📋</span>
 318:                             <span class="pane-header-title">Смарт-контракт</span>
 319:                         </div>
 320:                         <div class="pane-content" id="smart-contract-panel">
 321:                             <!-- Phase indicator -->
 322:                             <div id="contract-phases" class="contract-phases">
 323:                                 <div class="phase-step active" data-phase="draft">
 324:                                     <span class="phase-icon">📝</span>
 325:                                     <span class="phase-label">Составление</span>
 326:                                 </div>
 327:                                 <div class="phase-step" data-phase="review">
 328:                                     <span class="phase-icon">✅</span>
 329:                                     <span class="phase-label">Согласование</span>
 330:                                 </div>
 331:                                 <div class="phase-step" data-phase="sorting">
 332:                                     <span class="phase-icon">🔍</span>
 333:                                     <span class="phase-label">Подбор</span>
 334:                                 </div>
 335:                                 <div class="phase-step" data-phase="agreement">
 336:                                     <span class="phase-icon">🤝</span>
 337:                                     <span class="phase-label">Сделка</span>
 338:                                 </div>
 339:                                 <div class="phase-step" data-phase="escrow">
 340:                                     <span class="phase-icon">💰</span>
 341:                                     <span class="phase-label">Эскроу</span>
 342:                                 </div>
 343:                             </div>
 344:                             <!-- Contract fields (populated by Hermes) -->
 345:                             <div id="contract-fields" class="contract-fields">
 346:                                 <div class="contract-field" data-field="title">
 347:                                     <label class="field-label">Название задачи</label>
 348:                                     <div class="field-value" id="field-title">—</div>
 349:                                 </div>
 350:                                 <div class="contract-field" data-field="description">
 351:                                     <label class="field-label">Описание</label>
 352:                                     <div class="field-value" id="field-description">—</div>
 353:                                 </div>
 354:                                 <div class="contract-field" data-field="budget">
 355:                                     <label class="field-label">Бюджет (TON)</label>
 356:                                     <div class="field-value" id="field-budget">—</div>
 357:                                 </div>
 358:                                 <div class="contract-field" data-field="deadline">
 359:                                     <label class="field-label">Дедлайн</label>
 360:                                     <div class="field-value" id="field-deadline">—</div>
 361:                                 </div>
 362:                                 <div class="contract-field" data-field="client">
 363:                                     <label class="field-label">Клиент</label>
 364:                                     <div class="field-value" id="field-client">—</div>
 365:                                 </div>
 366:                                 <div class="contract-field" data-field="coder">
 367:                                     <label class="field-label">Нейрокодер</label>
 368:                                     <div class="field-value" id="field-coder">—</div>
 369:                                 </div>
 370:                                 <div class="contract-field" data-field="status">
 371:                                     <label class="field-label">Статус</label>
 372:                                     <div class="field-value" id="field-status">
 373:                                         <span class="status-badge draft">Черновик</span>
 374:                                     </div>
 375:                                 </div>
 376:                             </div>
 377:                         </div>
 378:                     </div>
 379:                 </div>
 380:             </div>
 381: 
 382:             <!-- Task history (overlay) -->
 383:             <div id="task-history-panel" class="task-history-panel">
 384:                 <div id="task-history-list"></div>
 385:             </div>
 386:         `;
 387:         
 388:         container.appendChild(view);
 389:         this.renderChatMessages();
 390:         this.initSplitDivider();
 391:         this.bindChatInputEvents();
 392:         this.renderContractPanel();
 393:     }
 394: 
 395:     // ─── Smart Contract Management ─────────────────────────────────────
 396:     
 397:     renderContractPanel() {
 398:         const panel = document.getElementById('smart-contract-panel');
 399:         if (!panel) return;
 400: 
 401:         // Update phase indicators
 402:         const phases = ['draft', 'review', 'sorting', 'agreement', 'escrow'];
 403:         const currentIdx = phases.indexOf(this.smartContract.phase);
 404:         
 405:         document.querySelectorAll('.phase-step').forEach(step => {
 406:             const phase = step.dataset.phase;
 407:             const idx = phases.indexOf(phase);
 408:             step.classList.remove('active', 'completed');
 409:             if (idx === currentIdx) step.classList.add('active');
 410:             else if (idx < currentIdx) step.classList.add('completed');
 411:         });
 412: 
 413:         // Update fields
 414:         const fields = this.smartContract.fields;
 415:         for (const [key, value] of Object.entries(fields)) {
 416:             const el = document.getElementById(`field-${key}`);
 417:             if (el) {
 418:                 if (key === 'status') {
 419:                     el.innerHTML = `<span class="status-badge ${value}">${this.getStatusLabel(value)}</span>`;
 420:                 } else {
 421:                     el.textContent = value || '—';
 422:                     el.classList.toggle('empty', !value);
 423:                 }
 424:             }
 425:         }
 426: 
 427:         // Update progress bar for escrow phase
 428:         let progressEl = document.querySelector('.escrow-progress');
 429:         if (this.smartContract.phase === 'escrow') {
 430:             if (!progressEl) {
 431:                 progressEl = document.createElement('div');
 432:                 progressEl.className = 'escrow-progress';
 433:                 progressEl.innerHTML = `
 434:                     <div class="escrow-progress-label">Прогресс исполнения</div>
 435:                     <div class="escrow-progress-bar">
 436:                         <div class="escrow-progress-fill" style="width: 0%"></div>
 437:                     </div>
 438:                     <div class="escrow-progress-percent">0%</div>
 439:                 `;
 440:                 panel.appendChild(progressEl);
 441:             }
 442:             const fill = progressEl.querySelector('.escrow-progress-fill');
 443:             const percent = progressEl.querySelector('.escrow-progress-percent');
 444:             if (fill) fill.style.width = `${this.smartContract.progress}%`;
 445:             if (percent) percent.textContent = `${this.smartContract.progress}%`;
 446:         } else if (progressEl) {
 447:             progressEl.remove();
 448:         }
 449:     }
 450: 
 451:     getStatusLabel(status) {
 452:         const labels = {
 453:             draft: 'Черновик',
 454:             review: 'На согласовании',
 455:             sorting: 'Подбор исполнителя',
 456:             agreement: 'Согласование',
 457:             escrow: 'В эскроу',
 458:             completed: 'Завершён',
 459:             disputed: 'Спор'
 460:         };
 461:         return labels[status] || status;
 462:     }
 463: 
 464:     updateContractField(field, value) {
 465:         if (this.smartContract.fields.hasOwnProperty(field)) {
 466:             this.smartContract.fields[field] = value;
 467:             this.renderContractPanel();
 468:             this.saveContractState();
 469:         }
 470:     }
 471:     
 472:     applyExtractedFields(fields, contractState = null) {
 473:         if (!fields || typeof fields !== 'object') return;
 474:         
 475:         let changed = false;
 476:         const fieldLabels = {
 477:             title: 'Название задачи',
 478:             description: 'Описание',
 479:             budget: 'Бюджет',
 480:             deadline: 'Дедлайн',
 481:             client: 'Клиент',
 482:             coder: 'Нейрокодер'
 483:         };
 484:         
 485:         for (const [field, value] of Object.entries(fields)) {
 486:             if (value && this.smartContract.fields.hasOwnProperty(field)) {
 487:                 const oldVal = this.smartContract.fields[field];
 488:                 if (!oldVal || oldVal !== value) {
 489:                     this.smartContract.fields[field] = value;
 490:                     changed = true;
 491:                     console.log(`[Contract] Auto-filled ${field}: ${value}`);
 492:                 }
 493:             }
 494:         }
 495:         
 496:         // If router sent contract_state, sync phase and completeness
 497:         if (contractState) {
 498:             this.smartContract.phase = contractState.phase || this.smartContract.phase;
 499:             this.smartContract.completeness = contractState.completeness || 0;
 500:             console.log(`[Contract] Phase: ${this.smartContract.phase}, Completeness: ${(this.smartContract.completeness * 100).toFixed(0)}%`);
 501:         }
 502:         
 503:         if (changed) {
 504:             this.renderContractPanel();
 505:             this.saveContractState();
 506:             
 507:             // Auto-advance phase if title and description are filled
 508:             if (this.smartContract.fields.title && this.smartContract.fields.description && this.smartContract.phase === 'draft') {
 509:                 this.setContractPhase('review');
 510:             }
 511:         }
 512:     }
 513: 
 514:     setContractPhase(phase) {
 515:         const validPhases = ['draft', 'review', 'sorting', 'agreement', 'escrow', 'completed'];
 516:         if (validPhases.includes(phase)) {
 517:             this.smartContract.phase = phase;
 518:             this.smartContract.fields.status = phase === 'completed' ? 'completed' : phase;
 519:             this.renderContractPanel();
 520:             this.saveContractState();
 521:         }
 522:     }
 523: 
 524:     updateContractProgress(percent) {
 525:         this.smartContract.progress = Math.max(0, Math.min(100, percent));
 526:         this.renderContractPanel();
 527:         this.saveContractState();
 528:     }
 529: 
 530:     saveContractState() {
 531:         try {
 532:             const data = JSON.stringify(this.smartContract);
 533:             if (window.Telegram?.WebApp?.CloudStorage) {
 534:                 Telegram.WebApp.CloudStorage.setItem('neuroescrow_contract', data, () => {});
 535:             } else {
 536:                 localStorage.setItem('neuroescrow_contract', data);
 537:             }
 538:         } catch (e) {
 539:             console.warn('[Contract] Save failed:', e);
 540:         }
 541:     }
 542: 
 543:     loadContractState() {
 544:         try {
 545:             let raw = null;
 546:             if (window.Telegram?.WebApp?.CloudStorage) {
 547:                 raw = new Promise((res, rej) => 
 548:                     Telegram.WebApp.CloudStorage.getItem('neuroescrow_contract', (err, val) => err ? rej(err) : res(val))
 549:                 );
 550:             } else {
 551:                 raw = localStorage.getItem('neuroescrow_contract');
 552:             }
 553:             if (raw) {
 554:                 const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
 555:                 if (data && data.fields) {
 556:                     this.smartContract = { ...this.smartContract, ...data };
 557:                 }
 558:             }
 559:         } catch (e) {
 560:             console.warn('[Contract] Load failed:', e);
 561:         }
 562:         this.renderContractPanel();
 563:     }
 564: 
 565:     bindChatInputEvents() {
 566:         // Enter key fix for chat input — prevent form submit / page reload
 567:         const chatInput = document.getElementById('chat-input');
 568:         if (chatInput) {
 569:             chatInput.addEventListener('keydown', (e) => {
 570:                 if (e.key === 'Enter' && !e.shiftKey) {
 571:                     e.preventDefault();
 572:                     this.sendTextMessage();
 573:                 }
 574:             });
 575:         }
 576: 
 577:         // Prevent any accidental form submit if input is wrapped in <form>
 578:         const chatContainer = document.getElementById('chat-input-container');
 579:         if (chatContainer) {
 580:             chatContainer.addEventListener('submit', (e) => e.preventDefault());
 581:         }
 582: 
 583:         // Ensure send button is type="button" not "submit"
 584:         const sendBtn = document.getElementById('send-btn');
 585:         if (sendBtn && !sendBtn.getAttribute('type')) {
 586:             sendBtn.setAttribute('type', 'button');
 587:         }
 588:     }
 589: 
 590:     initSplitDivider() {
 591:         const divider = document.getElementById('split-divider');
 592:         if (!divider) return;
 593: 
 594:         let isDragging = false;
 595:         let startX, startY, startWidth;
 596: 
 597:         const onMouseDown = (e) => {
 598:             isDragging = true;
 599:             divider.classList.add('dragging');
 600:             startX = e.clientX || e.touches?.[0]?.clientX || 0;
 601:             startY = e.clientY || e.touches?.[0]?.clientY || 0;
 602:             const leftPane = divider.previousElementSibling;
 603:             startWidth = leftPane?.getBoundingClientRect().width || 0;
 604:             document.addEventListener('mousemove', onMouseMove);
 605:             document.addEventListener('mouseup', onMouseUp);
 606:             document.addEventListener('touchmove', onTouchMove, { passive: false });
 607:             document.addEventListener('touchend', onTouchEnd);
 608:         };
 609: 
 610:         const onMouseMove = (e) => {
 611:             if (!isDragging) return;
 612:             const dx = (e.clientX || 0) - startX;
 613:             const container = divider.parentElement;
 614:             const totalWidth = container?.getBoundingClientRect().width || 1;
 615:             const newWidth = Math.max(200, Math.min(totalWidth - 200, startWidth + dx));
 616:             const leftPane = divider.previousElementSibling;
 617:             const rightPane = divider.nextElementSibling;
 618:             if (leftPane) leftPane.style.flex = `0 0 ${newWidth}px`;
 619:             if (rightPane) rightPane.style.flex = '1';
 620:         };
 621: 
 622:         const onMouseUp = () => {
 623:             isDragging = false;
 624:             divider.classList.remove('dragging');
 625:             document.removeEventListener('mousemove', onMouseMove);
 626:             document.removeEventListener('mouseup', onMouseUp);
 627:         };
 628: 
 629:         const onTouchMove = (e) => {
 630:             if (!isDragging) return;
 631:             e.preventDefault();
 632:             const dx = (e.touches?.[0]?.clientX || 0) - startX;
 633:             const container = divider.parentElement;
 634:             const totalWidth = container?.getBoundingClientRect().width || 1;
 635:             const newWidth = Math.max(200, Math.min(totalWidth - 200, startWidth + dx));
 636:             const leftPane = divider.previousElementSibling;
 637:             if (leftPane) leftPane.style.flex = `0 0 ${newWidth}px`;
 638:         };
 639: 
 640:         const onTouchEnd = () => {
 641:             isDragging = false;
 642:             divider.classList.remove('dragging');
 643:             document.removeEventListener('touchmove', onTouchMove);
 644:             document.removeEventListener('touchend', onTouchEnd);
 645:         };
 646: 
 647:         divider.addEventListener('mousedown', onMouseDown);
 648:         divider.addEventListener('touchstart', (e) => {
 649:             startX = e.touches?.[0]?.clientX || 0;
 650:             startY = e.touches?.[0]?.clientY || 0;
 651:             onMouseDown(e);
 652:         }, { passive: true });
 653:     }
 654: 
 655:     toggleVoice() {
 656:         // Explicit protection against multiple taps during processing
 657:         if (this.voiceState === 'PROCESSING' || this.isProcessing) {
 658:             return;
 659:         }
 660:         
 661:         if (this.voiceState === 'LISTENING') {
 662:             this.stopVoiceRecording();
 663:         } else {
 664:             this.voiceState = 'LISTENING';
 665:             this.updateVoiceButton();
 666:             this.startVoiceRecording();
 667:         }
 668:         
 669:         telegram.haptic('medium');
 670:     }
 671: 
 672:     async startVoiceRecording() {
 673:         // Auto-tap unlock: first user gesture enables audio playback
 674:         if (!this.audioUnlocked) {
 675:             this.unlockAudio();
 676:         }
 677: 
 678:         try {
 679:             const tg = window.Telegram?.WebApp;
 680:             // Try native Telegram voice recording (Bot API 9.6+)
 681:             if (tg && typeof tg.requestVoiceMessage === 'function') {
 682:                 const result = await tg.requestVoiceMessage();
 683:                 
 684:                 if (result && result.file_id) {
 685:                     this.sendVoiceToBot(result.file_id, result.duration);
 686:                 } else {
 687:                     throw new Error('No file_id received');
 688:                 }
 689:             } else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
 690:                 // Fallback to manual recording
 691:                 this.fallbackToManualRecording();
 692:             } else {
 693:                 telegram.showAlert('Запись голоса не поддерживается в вашем браузере. Используйте текстовый ввод.');
 694:             }
 695:         } catch (error) {
 696:             console.error('[Voice] Recording failed:', error.message);
 697:             this.handleVoiceError(error);
 698:         }
 699:     }
 700: 
 701:     async unlockAudio() {
 702:         // Play silent audio to unlock autoplay policy
 703:         try {
 704:             const ctx = new (window.AudioContext || window.webkitAudioContext)();
 705:             const oscillator = ctx.createOscillator();
 706:             const gain = ctx.createGain();
 707:             gain.gain.value = 0.0001; // Nearly silent
 708:             oscillator.connect(gain);
 709:             gain.connect(ctx.destination);
 710:             oscillator.start();
 711:             oscillator.stop(ctx.currentTime + 0.01);
 712:             this.audioUnlocked = true;
 713:             console.log('[Audio] Autoplay unlocked');
 714:         } catch (e) {
 715:             console.warn('[Audio] Unlock failed:', e.message);
 716:             this.audioUnlocked = false;
 717:         }
 718:     }
 719: 
 720:     stopVoiceRecording() {
 721:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
 722:             this.mediaRecorder.stop();
 723:         }
 724:         this.resetVoiceState();
 725:     }
 726: 
 727:     fallbackToManualRecording() {
 728:         navigator.mediaDevices.getUserMedia({ audio: true })
 729:             .then(stream => {
 730:                 this.mediaRecorder = new MediaRecorder(stream);
 731:                 this.audioChunks = [];
 732:                 
 733:                 this.mediaRecorder.ondataavailable = (e) => {
 734:                     this.audioChunks.push(e.data);
 735:                 };
 736:                 
 737:                 this.mediaRecorder.onstop = () => {
 738:                     const audioBlob = new Blob(this.audioChunks, { type: 'audio/ogg' });
 739:                     this.uploadVoiceBlob(audioBlob);
 740:                     stream.getTracks().forEach(track => track.stop());
 741:                 };
 742:                 
 743:                 this.mediaRecorder.start();
 744:                 console.log('[NeuroEscrow] Fallback recording started');
 745:             })
 746:             .catch(error => {
 747:                 this.handleVoiceError(error);
 748:             });
 749:     }
 750: 
 751:     uploadVoiceBlob(blob) {
 752:         // This would require bot-side endpoint for blob upload
 753:         // For now, just show error
 754:         this.handleVoiceError(new Error('Manual recording not yet implemented'));
 755:     }
 756: 
 757:     sendVoiceToBot(fileId, duration) {
 758:         this.voiceState = 'PROCESSING';
 759:         this.isProcessing = true;
 760:         this.updateVoiceButton();
 761:         this.setupResponseTimeout();
 762:         
 763:         const payload = {
 764:             action: 'voice_message',
 765:             file_id: fileId,
 766:             duration: duration,
 767:             timestamp: Date.now(),
 768:             user_id: telegram.getUserId()
 769:         };
 770:         
 771:         telegram.sendData(payload);
 772:         console.log('[NeuroEscrow] Voice sent to bot:', fileId);
 773:     }
 774: 
 775:     updateVoiceButton() {
 776:         const btn = document.getElementById('voice-btn');
 777:         const status = document.getElementById('voice-status');
 778:         
 779:         if (!btn) return;
 780:         
 781:         // Remove all state classes
 782:         btn.classList.remove('recording', 'processing');
 783:         
 784:         switch (this.voiceState) {
 785:             case 'IDLE':
 786:                 if (status) { status.textContent = ''; status.style.display = 'none'; }
 787:                 this.isRecording = false;
 788:                 break;
 789:                 
 790:             case 'LISTENING':
 791:                 btn.classList.add('recording');
 792:                 if (status) { status.textContent = 'Слушаю...'; status.style.display = 'block'; }
 793:                 this.isRecording = true;
 794:                 break;
 795:                 
 796:             case 'PROCESSING':
 797:                 btn.classList.add('processing');
 798:                 if (status) { status.textContent = 'Гермес обрабатывает...'; status.style.display = 'block'; }
 799:                 this.isRecording = false;
 800:                 break;
 801:         }
 802:     }
 803: 
 804:     setupResponseTimeout() {
 805:         if (this.responseTimeout) {
 806:             clearTimeout(this.responseTimeout);
 807:         }
 808:         
 809:         this.responseTimeout = setTimeout(() => {
 810:             if (this.voiceState === 'PROCESSING') {
 811:                 this.handleVoiceError(new Error('timeout'));
 812:             }
 813:         }, 30000);
 814:     }
 815: 
 816:     handleVoiceError(error) {
 817:         console.error('[NeuroEscrow] Voice error:', error);
 818:         
 819:         this.resetVoiceState();
 820:         
 821:         let message = 'Ошибка записи голоса';
 822:         
 823:         if (error.message.includes('permission')) {
 824:             message = 'Нет доступа к микрофону';
 825:         } else if (error.message.includes('timeout')) {
 826:             message = 'Превышено время ожидания';
 827:         } else if (error.message.includes('cancelled')) {
 828:             message = 'Запись отменена';
 829:         }
 830:         
 831:         telegram.showAlert(message);
 832:         telegram.hapticNotification('error');
 833:     }
 834: 
 835:     resetVoiceState() {
 836:         this.voiceState = 'IDLE';
 837:         this.isRecording = false;
 838:         this.isProcessing = false;
 839:         this.updateVoiceButton();
 840:         
 841:         if (this.responseTimeout) {
 842:             clearTimeout(this.responseTimeout);
 843:             this.responseTimeout = null;
 844:         }
 845:     }
 846: 
 847:     handleDraftCreated(draft) {
 848:         if (this.responseTimeout) {
 849:             clearTimeout(this.responseTimeout);
 850:         }
 851:         
 852:         // Check for duplicates
 853:         const existingIndex = this.deals.findIndex(d => d.id === draft.id);
 854:         if (existingIndex !== -1) {
 855:             this.deals[existingIndex] = { ...draft, type: 'draft', isNew: true };
 856:         } else {
 857:             this.deals.unshift({ ...draft, type: 'draft', isNew: true });
 858:         }
 859:         
 860:         this.resetVoiceState();
 861:         this.saveCache(); // Save immediately after adding draft
 862:         this.navigate('deals');
 863:         
 864:         telegram.hapticNotification('success');
 865:         telegram.showAlert('Черновик создан');
 866:         
 867:         console.log('[NeuroEscrow] Draft created:', draft.id);
 868:     }
 869: 
 870:     // -------------------------------------------------------------------------
 871:     // Deals View
 872:     // -------------------------------------------------------------------------
 873: 
 874:     renderDealsView(container) {
 875:         const view = document.createElement('div');
 876:         view.className = 'view';
 877:         
 878:         const deals = this.deals.length > 0 ? this.deals : this.getSampleDeals();
 879:         
 880:         view.innerHTML = `
 881:             <div class="split-layout">
 882:                 <div class="split-pane left-pane">
 883:                     <div class="pane-glass">
 884:                         <div class="pane-header">
 885:                             <span class="pane-header-dot purple"></span>
 886:                             <span class="pane-header-icon">🤝</span>
 887:                             <span class="pane-header-title">Сделки</span>
 888:                         </div>
 889:                         <div class="pane-content" style="padding:16px;">
 890:                             <h2 style="font-size:18px;margin-bottom:16px;font-weight:600;">Мои сделки</h2>
 891:                             ${deals.length === 0 ? this.emptyState('🤝', 'У вас пока нет сделок') : ''}
 892:                             <div id="deals-list">
 893:                                 ${deals.map(deal => deal.type === 'draft' ? this.renderDraftCard(deal) : this.dealCard(deal)).join('')}
 894:                             </div>
 895:                         </div>
 896:                         <div class="bottom-nav-left">
 897:                             <button class="nav-btn-left" data-view="hermes" onclick="app.navigate('hermes')">
 898:                                 <span class="nav-icon">🎙️</span>
 899:                                 <span class="nav-label">Гермес</span>
 900:                             </button>
 901:                             <button class="nav-btn-left active" data-view="deals" onclick="app.navigate('deals')">
 902:                                 <span class="nav-icon">🤝</span>
 903:                                 <span class="nav-label">Сделки</span>
 904:                             </button>
 905:                             <button class="nav-btn-left" data-view="profile" onclick="app.navigate('profile')">
 906:                                 <span class="nav-icon">👤</span>
 907:                                 <span class="nav-label">Профиль</span>
 908:                             </button>
 909:                             <button class="nav-btn-left" id="micButton" onclick="app.toggleVoiceRecording()">
 910:                                 <span class="nav-icon">🎤</span>
 911:                                 <span class="nav-label">Микрофон</span>
 912:                             </button>
 913:                         </div>
 914:                     </div>
 915:                 </div>
 916:                 <div class="split-divider" id="split-divider"></div>
 917:                 <div class="split-pane right-pane">
 918:                     <div class="pane-glass">
 919:                         <div class="pane-header">
 920:                             <span class="pane-header-dot green"></span>
 921:                             <span class="pane-header-icon">📋</span>
 922:                             <span class="pane-header-title">Смарт-контракт</span>
 923:                         </div>
 924:                         <div class="pane-content" id="smart-contract-panel-deals">
 925:                             <div id="contract-phases" class="contract-phases">
 926:                                 <div class="phase-step" data-phase="draft">
 927:                                     <span class="phase-icon">📝</span>
 928:                                     <span class="phase-label">Составление</span>
 929:                                 </div>
 930:                                 <div class="phase-step" data-phase="review">
 931:                                     <span class="phase-icon">✅</span>
 932:                                     <span class="phase-label">Согласование</span>
 933:                                 </div>
 934:                                 <div class="phase-step" data-phase="sorting">
 935:                                     <span class="phase-icon">🔍</span>
 936:                                     <span class="phase-label">Подбор</span>
 937:                                 </div>
 938:                                 <div class="phase-step" data-phase="agreement">
 939:                                     <span class="phase-icon">🤝</span>
 940:                                     <span class="phase-label">Сделка</span>
 941:                                 </div>
 942:                                 <div class="phase-step" data-phase="escrow">
 943:                                     <span class="phase-icon">💰</span>
 944:                                     <span class="phase-label">Эскроу</span>
 945:                                 </div>
 946:                             </div>
 947:                             <div id="contract-fields" class="contract-fields">
 948:                                 <div class="contract-field" data-field="title">
 949:                                     <label class="field-label">Название задачи</label>
 950:                                     <div class="field-value" id="field-title">—</div>
 951:                                 </div>
 952:                                 <div class="contract-field" data-field="description">
 953:                                     <label class="field-label">Описание</label>
 954:                                     <div class="field-value" id="field-description">—</div>
 955:                                 </div>
 956:                                 <div class="contract-field" data-field="budget">
 957:                                     <label class="field-label">Бюджет (TON)</label>
 958:                                     <div class="field-value" id="field-budget">—</div>
 959:                                 </div>
 960:                                 <div class="contract-field" data-field="deadline">
 961:                                     <label class="field-label">Дедлайн</label>
 962:                                     <div class="field-value" id="field-deadline">—</div>
 963:                                 </div>
 964:                                 <div class="contract-field" data-field="client">
 965:                                     <label class="field-label">Клиент</label>
 966:                                     <div class="field-value" id="field-client">—</div>
 967:                                 </div>
 968:                                 <div class="contract-field" data-field="coder">
 969:                                     <label class="field-label">Нейрокодер</label>
 970:                                     <div class="field-value" id="field-coder">—</div>
 971:                                 </div>
 972:                                 <div class="contract-field" data-field="status">
 973:                                     <label class="field-label">Статус</label>
 974:                                     <div class="field-value" id="field-status">
 975:                                         <span class="status-badge draft">Черновик</span>
 976:                                     </div>
 977:                                 </div>
 978:                             </div>
 979:                         </div>
 980:                     </div>
 981:                 </div>
 982:             </div>
 983:         `;
 984:         
 985:         container.appendChild(view);
 986:         this.initSplitDivider();
 987:         this.renderContractPanel();
 988:     }
 989: 
 990:     renderDraftCard(draft) {
 991:         const title = this.escapeHtml(draft.title || 'Без названия');
 992:         const description = this.escapeHtml(draft.description || '');
 993:         const budget = draft.budget || 'Не указан';
 994:         const deadline = draft.deadline || 'Не указан';
 995:         
 996:         return `
 997:             <div class="card draft-card" style="border-left:2px solid rgba(255, 255, 255, 0.34);">
 998:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
 999:                     <span style="font-size:12px;font-weight:600;color:rgba(255, 255, 255, 0.34);text-transform:uppercase;letter-spacing:0.5px;">Черновик</span>
1000:                     <span style="font-size:11px;color:var(--ne-light-gray);">${this.formatDate(draft.created_at)}</span>
1001:                 </div>
1002:                 <div class="card-title">${title}</div>
1003:                 <p style="font-size:13px;color:var(--ne-light-gray);margin:8px 0;">${description}</p>
1004:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
1005:                     <span>💰 ${budget}</span>
1006:                     <span>⏱️ ${deadline}</span>
1007:                 </div>
1008:                 <div style="display:flex;gap:8px;margin-top:12px;">
1009:                     <button class="btn btn-primary" onclick="app.editDraft('${draft.id}')" style="flex:1;">Редактировать</button>
1010:                     <button class="btn btn-secondary" onclick="app.publishDraft('${draft.id}')" style="flex:1;">Опубликовать</button>
1011:                 </div>
1012:             </div>
1013:         `;
1014:     }
1015: 
1016:     dealCard(deal) {
1017:         const statusColors = {
1018:             'draft': 'rgba(255, 255, 255, 0.34)',
1019:             'negotiating': '#dddddd',
1020:             'in_progress': '#dddddd',
1021:             'completed': 'rgba(255, 255, 255, 0.67)'
1022:         };
1023:         
1024:         const statusNames = {
1025:             'draft': 'Черновик',
1026:             'negotiating': 'Переговоры',
1027:             'in_progress': 'В работе',
1028:             'completed': 'Завершена'
1029:         };
1030:         
1031:         const color = statusColors[deal.status] || 'rgba(255, 255, 255, 0.34)';
1032:         const statusName = statusNames[deal.status] || deal.status;
1033:         
1034:         return `
1035:             <div class="card" style="border-left:2px solid ${color};">
1036:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
1037:                     <span style="font-size:12px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${statusName}</span>
1038:                     <span style="font-size:11px;color:var(--ne-light-gray);">#${deal.id}</span>
1039:                 </div>
1040:                 <div class="card-title">${deal.title}</div>
1041:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
1042:                     <span>💰 ${deal.budget} USDT</span>
1043:                     <span>👤 ${deal.counterparty}</span>
1044:                 </div>
1045:                 <div style="margin-top:12px;">
1046:                     <button class="btn btn-secondary" onclick="app.viewDeal('${deal.id}')">Открыть в боте</button>
1047:                 </div>
1048:             </div>
1049:         `;
1050:     }
1051: 
1052:     getSampleDeals() {
1053:         return [
1054:             { id: 'a1b2', title: 'Telegram бот для интернет-магазина', status: 'in_progress', budget: '500', counterparty: 'client_42' },
1055:             { id: 'c3d4', title: 'Парсер данных с сайта', status: 'completed', budget: '300', counterparty: 'client_17' },
1056:         ];
1057:     }
1058: 
1059:     viewDeal(dealId) {
1060:         telegram.sendData({ action: 'view_deal', deal_id: dealId });
1061:         telegram.showAlert('Открываю детали сделки в боте...');
1062:     }
1063: 
1064:     editDraft(draftId) {
1065:         telegram.sendData({ action: 'edit_draft', draft_id: draftId });
1066:         telegram.showAlert('Открываю редактор в боте...');
1067:     }
1068: 
1069:     publishDraft(draftId) {
1070:         telegram.sendData({ action: 'publish_draft', draft_id: draftId });
1071:         telegram.showAlert('Публикую черновик...');
1072:     }
1073: 
1074:     escapeHtml(text) {
1075:         const div = document.createElement('div');
1076:         div.textContent = text;
1077:         return div.innerHTML;
1078:     }
1079: 
1080:     formatDate(timestamp) {
1081:         if (!timestamp) return '';
1082:         const date = new Date(timestamp * 1000);
1083:         const now = new Date();
1084:         const diff = now - date;
1085:         
1086:         if (diff < 60000) return 'только что';
1087:         if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
1088:         if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
1089:         
1090:         return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
1091:     }
1092: 
1093:     // -------------------------------------------------------------------------
1094:     // Profile View
1095:     // -------------------------------------------------------------------------
1096: 
1097:     renderProfileView(container) {
1098:         const view = document.createElement('div');
1099:         view.className = 'view';
1100:         
1101:         view.innerHTML = `
1102:             <div class="split-layout">
1103:                 <div class="split-pane left-pane">
1104:                     <div class="pane-glass">
1105:                         <div class="pane-header">
1106:                             <span class="pane-header-dot purple"></span>
1107:                             <span class="pane-header-icon">👤</span>
1108:                             <span class="pane-header-title">Профиль</span>
1109:                         </div>
1110:                         <div class="pane-content" style="padding:16px;">
1111:                             <div class="card" style="text-align:center;padding:24px;">
1112:                                 <div style="font-size:32px;font-weight:700;margin-bottom:8px;">${this.balance.toFixed(2)} USDT</div>
1113:                                 <div style="font-size:13px;color:var(--ne-light-gray);margin-bottom:20px;">Ваш баланс</div>
1114:                                 <div style="display:flex;gap:8px;margin-bottom:16px;">
1115:                                     <button class="btn btn-primary" onclick="app.donate()" style="flex:1;">💝 Поддержать</button>
1116:                                     <button class="btn btn-secondary" onclick="app.leaveTip()" style="flex:1;">⭐ Чаевые</button>
1117:                                 </div>
1118:                                 <div style="font-size:11px;color:var(--ne-light-gray);margin-top:12px;">TON • USDT • Telegram Stars</div>
1119:                             </div>
1120:                             <div id="ton-connect" style="margin:16px 0;"></div>
1121:                             <div class="card">
1122:                                 <div class="card-title">Настройки</div>
1123:                                 <div class="form-group">
1124:                                     <label class="form-label">LLM Модель</label>
1125:                                     <select class="form-input" id="model-selector">
1126:                                         <option value="auto">Автоматически</option>
1127:                                         <option value="gpt-4">GPT-4</option>
1128:                                         <option value="claude">Claude</option>
1129:                                         <option value="grok">Grok</option>
1130:                                         <option value="custom">Своя модель</option>
1131:                                     </select>
1132:                                 </div>
1133:                             </div>
1134:                         </div>
1135:                         <div class="bottom-nav-left">
1136:                             <button class="nav-btn-left" data-view="hermes" onclick="app.navigate('hermes')">
1137:                                 <span class="nav-icon">🎙️</span>
1138:                                 <span class="nav-label">Гермес</span>
1139:                             </button>
1140:                             <button class="nav-btn-left" data-view="deals" onclick="app.navigate('deals')">
1141:                                 <span class="nav-icon">🤝</span>
1142:                                 <span class="nav-label">Сделки</span>
1143:                             </button>
1144:                             <button class="nav-btn-left active" data-view="profile" onclick="app.navigate('profile')">
1145:                                 <span class="nav-icon">👤</span>
1146:                                 <span class="nav-label">Профиль</span>
1147:                             </button>
1148:                             <button class="nav-btn-left" id="micButton" onclick="app.toggleVoiceRecording()">
1149:                                 <span class="nav-icon">🎤</span>
1150:                                 <span class="nav-label">Микрофон</span>
1151:                             </button>
1152:                         </div>
1153:                     </div>
1154:                 </div>
1155:                 <div class="split-divider" id="split-divider"></div>
1156:                 <div class="split-pane right-pane">
1157:                     <div class="pane-glass">
1158:                         <div class="pane-header">
1159:                             <span class="pane-header-dot green"></span>
1160:                             <span class="pane-header-icon">📋</span>
1161:                             <span class="pane-header-title">Смарт-контракт</span>
1162:                         </div>
1163:                         <div class="pane-content" id="smart-contract-panel-profile">
1164:                             <div id="contract-phases" class="contract-phases">
1165:                                 <div class="phase-step" data-phase="draft">
1166:                                     <span class="phase-icon">📝</span>
1167:                                     <span class="phase-label">Составление</span>
1168:                                 </div>
1169:                                 <div class="phase-step" data-phase="review">
1170:                                     <span class="phase-icon">✅</span>
1171:                                     <span class="phase-label">Согласование</span>
1172:                                 </div>
1173:                                 <div class="phase-step" data-phase="sorting">
1174:                                     <span class="phase-icon">🔍</span>
1175:                                     <span class="phase-label">Подбор</span>
1176:                                 </div>
1177:                                 <div class="phase-step" data-phase="agreement">
1178:                                     <span class="phase-icon">🤝</span>
1179:                                     <span class="phase-label">Сделка</span>
1180:                                 </div>
1181:                                 <div class="phase-step" data-phase="escrow">
1182:                                     <span class="phase-icon">💰</span>
1183:                                     <span class="phase-label">Эскроу</span>
1184:                                 </div>
1185:                             </div>
1186:                             <div id="contract-fields" class="contract-fields">
1187:                                 <div class="contract-field" data-field="title">
1188:                                     <label class="field-label">Название задачи</label>
1189:                                     <div class="field-value" id="field-title">—</div>
1190:                                 </div>
1191:                                 <div class="contract-field" data-field="description">
1192:                                     <label class="field-label">Описание</label>
1193:                                     <div class="field-value" id="field-description">—</div>
1194:                                 </div>
1195:                                 <div class="contract-field" data-field="budget">
1196:                                     <label class="field-label">Бюджет (TON)</label>
1197:                                     <div class="field-value" id="field-budget">—</div>
1198:                                 </div>
1199:                                 <div class="contract-field" data-field="deadline">
1200:                                     <label class="field-label">Дедлайн</label>
1201:                                     <div class="field-value" id="field-deadline">—</div>
1202:                                 </div>
1203:                                 <div class="contract-field" data-field="client">
1204:                                     <label class="field-label">Клиент</label>
1205:                                     <div class="field-value" id="field-client">—</div>
1206:                                 </div>
1207:                                 <div class="contract-field" data-field="coder">
1208:                                     <label class="field-label">Нейрокодер</label>
1209:                                     <div class="field-value" id="field-coder">—</div>
1210:                                 </div>
1211:                                 <div class="contract-field" data-field="status">
1212:                                     <label class="field-label">Статус</label>
1213:                                     <div class="field-value" id="field-status">
1214:                                         <span class="status-badge draft">Черновик</span>
1215:                                     </div>
1216:                                 </div>
1217:                             </div>
1218:                         </div>
1219:                     </div>
1220:                 </div>
1221:             </div>
1222:         `;
1223:         
1224:         container.appendChild(view);
1225:         this.initSplitDivider();
1226:         this.renderContractPanel();
1227:         
1228:         setTimeout(() => {
1229:             tonConnect.init('ton-connect');
1230:         }, 100);
1231:     }
1232: 
1233:     donate() {
1234:         telegram.showAlert('Выберите способ:\n\n⭐ Stars: 50, 100, 250, 500\n💎 TON: 1, 5, 10, 25\n💵 USDT: 5, 10, 25, 50');
1235:     }
1236: 
1237:     leaveTip() {
1238:         telegram.showAlert('Быстрые чаевые:\n\n10 ⭐ | 25 ⭐ | 50 ⭐ | 100 ⭐');
1239:     }
1240: 
1241:     onTonStatusChange(detail) {
1242:         console.log('[App] TON status changed:', detail);
1243:     }
1244: 
1245:     async loadCache() {
1246:         try {
1247:             // Try localStorage first (5-10MB limit, more reliable)
1248:             const localData = localStorage.getItem('neuroescrow_data');
1249:             if (localData) {
1250:                 const parsed = JSON.parse(localData);
1251:                 this.deals = parsed.deals || [];
1252:                 this.balance = parsed.balance || 0;
1253:                 this.chatMessages = parsed.chatMessages || [];
1254:                 console.log('[App] Cache loaded from localStorage:', this.chatMessages.length, 'messages');
1255:             }
1256: 
1257:             // Also try Telegram CloudStorage as backup
1258:             const cached = await telegram.cloudGet('neuroescrow_data');
1259:             if (cached && (!localData || cached.chatMessages?.length > this.chatMessages.length)) {
1260:                 this.deals = cached.deals || [];
1261:                 this.balance = cached.balance || 0;
1262:                 this.chatMessages = cached.chatMessages || [];
1263:                 console.log('[App] Cache loaded from Telegram Cloud:', this.chatMessages.length, 'messages');
1264:             }
1265:         } catch (e) {
1266:             console.warn('[App] Cache load error:', e.message);
1267:         }
1268:     }
1269: 
1270:     async saveCache() {
1271:         // Keep only last 50 messages to avoid storage limits
1272:         const maxMessages = 50;
1273:         const messagesToSave = this.chatMessages.length > maxMessages
1274:             ? this.chatMessages.slice(-maxMessages)
1275:             : this.chatMessages;
1276: 
1277:         const data = {
1278:             deals: this.deals,
1279:             balance: this.balance,
1280:             chatMessages: messagesToSave,
1281:             timestamp: Date.now()
1282:         };
1283:         
1284:         // Primary: localStorage (5-10MB limit)
1285:         try {
1286:             localStorage.setItem('neuroescrow_data', JSON.stringify(data));
1287:             console.log('[App] Cache saved to localStorage:', messagesToSave.length, 'messages');
1288:         } catch (e) {
1289:             console.error('[App] localStorage save failed:', e.message);
1290:         }
1291:         
1292:         // Secondary: Telegram CloudStorage (4KB limit — may fail for large data)
1293:         try {
1294:             await telegram.cloudSet('neuroescrow_data', data);
1295:             console.log('[App] Cache saved to Telegram Cloud');
1296:         } catch (e) {
1297:             console.warn('[App] CloudStorage save skipped (limit):', e.message);
1298:         }
1299:     }
1300: 
1301:     async loadSession(sessionId) {
1302:         const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1303:             ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1304:             : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1305: 
1306:         try {
1307:             const resp = await fetch(baseUrl + 'session/' + sessionId, { mode: 'cors' });
1308:             if (!resp.ok) return;
1309: 
1310:             const session = await resp.json();
1311:             const messages = session.messages || [];
1312: 
1313:             this.chatMessages = messages.map(msg => ({
1314:                 sender: msg.role === 'user' ? 'user' : 'hermes',
1315:                 text: msg.content || msg.text || '',
1316:                 timestamp: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()
1317:             }));
1318: 
1319:             this.renderChatMessages();
1320:             this.saveCache();
1321:         } catch (e) {
1322:             console.error('[App] Load session error:', e.message);
1323:         }
1324:     }
1325: 
1326:     async loadSessionsList() {
1327:         const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1328:             ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1329:             : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1330: 
1331:         try {
1332:             const resp = await fetch(baseUrl + 'sessions', { mode: 'cors' });
1333:             if (!resp.ok) return [];
1334:             return await resp.json();
1335:         } catch (e) {
1336:             console.error('[App] Load sessions error:', e.message);
1337:             return [];
1338:         }
1339:     }
1340: 
1341:     requestDataFromBot() {
1342:         telegram.sendData({ action: 'get_dashboard_data' });
1343:     }
1344: 
1345:     handleBotData(data) {
1346:         console.log('[App] Data from bot:', data);
1347:         
1348:         // Handle different event types
1349:         if (data.event === 'draft_created' && data.draft) {
1350:             this.handleDraftCreated(data.draft);
1351:             return;
1352:         }
1353:         
1354:         if (data.event === 'error') {
1355:             this.handleVoiceError(new Error(data.error || 'Unknown error'));
1356:             return;
1357:         }
1358: 
1359:         if (data.event === 'hermes_reply' && data.text) {
1360:             this.addChatMessage('hermes', data.text);
1361:             return;
1362:         }
1363: 
1364:         if (data.event === 'moderation_block') {
1365:             telegram.showAlert('⚠️ Ваш контент нарушает правила платформы');
1366:             return;
1367:         }
1368:         
1369:         // Handle dashboard data
1370:         if (data.deals) this.deals = data.deals;
1371:         if (data.balance !== undefined) this.balance = data.balance;
1372:         
1373:         this.saveCache();
1374:         
1375:         const main = document.getElementById('main-content');
1376:         main.innerHTML = '';
1377:         switch(this.currentView) {
1378:             case 'hermes': this.renderHermesView(main); break;
1379:             case 'deals': this.renderDealsView(main); break;
1380:             case 'profile': this.renderProfileView(main); break;
1381:         }
1382:     }
1383: 
1384:     emptyState(icon, text) {
1385:         return `
1386:             <div class="empty-state">
1387:                 <div class="empty-icon">${icon}</div>
1388:                 <div class="empty-text">${text}</div>
1389:             </div>
1390:         `;
1391:     }
1392: 
1393:     // -------------------------------------------------------------------------
1394:     // Chat Interface Methods
1395:     // -------------------------------------------------------------------------
1396: 
1397:     // Simple Markdown renderer — converts **bold**, *italic*, lists, line breaks
1398:     renderMarkdown(text) {
1399:         if (!text) return '';
1400:         let html = text;
1401:         
1402:         // Escape HTML first (security)
1403:         html = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
1404:         
1405:         // Code blocks (``` ... ```)
1406:         html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
1407:         
1408:         // Inline code (`...`)
1409:         html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
1410:         
1411:         // Headers
1412:         html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
1413:         html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
1414:         html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
1415:         
1416:         // Bold (**text** or __text__)
1417:         html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
1418:         html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');
1419:         
1420:         // Italic (*text* or _text_)
1421:         html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
1422:         html = html.replace(/_(.+?)_/g, '<em>$1</em>');
1423:         
1424:         // Strikethrough (~~text~~)
1425:         html = html.replace(/~~(.+?)~~/g, '<del>$1</del>');
1426:         
1427:         // Horizontal rules
1428:         html = html.replace(/^---$/gm, '<hr>');
1429:         html = html.replace(/^\*\*\*$/gm, '<hr>');
1430:         
1431:         // Unordered lists (- item or * item)
1432:         html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
1433:         html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
1434:         
1435:         // Ordered lists (1. item)
1436:         html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
1437:         
1438:         // Line breaks (double newline → paragraph, single → br)
1439:         html = html.replace(/\n\n/g, '</p><p>');
1440:         html = html.replace(/\n/g, '<br>');
1441:         html = '<p>' + html + '</p>';
1442:         
1443:         // Clean up empty paragraphs
1444:         html = html.replace(/<p><\/p>/g, '');
1445:         html = html.replace(/<p><br>/g, '<p>');
1446:         
1447:         return html;
1448:     }
1449: 
1450:     renderChatMessages() {
1451:         const container = document.getElementById('chat-messages');
1452:         if (!container) return;
1453: 
1454:         container.innerHTML = this.chatMessages.map((msg, idx) => {
1455:             const isLastHermes = idx === this.chatMessages.length - 1 && msg.sender === 'hermes' && msg.text === '';
1456:             const streamingClass = isLastHermes ? ' streaming' : '';
1457:             const isHermesComplete = msg.sender === 'hermes' && msg.text !== '' && !isLastHermes;
1458:             const feedbackHtml = isHermesComplete && !msg.feedback ? `
1459:                 <div class="feedback-buttons">
1460:                     <button class="feedback-btn" onclick="app.submitFeedback(${idx}, 'up')">👍</button>
1461:                     <button class="feedback-btn" onclick="app.submitFeedback(${idx}, 'down')">👎</button>
1462:                 </div>
1463:             ` : '';
1464:             const speakBtn = isHermesComplete ? `<button class="speak-btn" onclick="app.toggleSpeakMessage(${idx})" title="Прослушать">🔊</button>` : '';
1465:             const timeHtml = `<span class="msg-time">${this.formatTime(msg.timestamp)}</span>`;
1466:             
1467:             return `
1468:             <div class="chat-message ${msg.sender}">
1469:                 <div class="message-bubble${streamingClass}">
1470:                     <div class="message-content">${this.renderMarkdown(msg.text)}</div>
1471:                     <div class="message-footer">
1472:                         ${speakBtn}
1473:                         ${feedbackHtml}
1474:                         ${timeHtml}
1475:                     </div>
1476:                 </div>
1477:             </div>
1478:         `;
1479:         }).join('');
1480: 
1481:         this.scrollToBottom();
1482:     }
1483: 
1484:     async speakMessage(idx, autoPlay = false) {
1485:         if (!this.ttsEnabled) return;
1486:         
1487:         const msg = this.chatMessages[idx];
1488:         if (!msg || !msg.text) return;
1489: 
1490:         // Clean markdown for TTS
1491:         const cleanText = msg.text
1492:             .replace(/[#*_~`]/g, '')
1493:             .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
1494:             .replace(/```[\s\S]*?```/g, 'код')
1495:             .replace(/<[^>]+>/g, '')
1496:             .substring(0, 5000);
1497: 
1498:         // Pause recognition while speaking
1499:         if (this.recognition && this.isRecording) {
1500:             try { this.recognition.stop(); } catch {}
1501:         }
1502: 
1503:         // Stop any current audio
1504:         if (this.ttsAudio) {
1505:             this.ttsAudio.pause();
1506:             this.ttsAudio = null;
1507:         }
1508: 
1509:         // Try hybrid neural TTS via Worker (Silero V5 + VITS + Google fallback)
1510:         try {
1511:             const engine = this.ttsEngine || 'silero';
1512:             console.log(`[TTS] Trying ${engine} neural TTS:`, cleanText.substring(0, 50) + '...');
1513:             const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1514:                 ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1515:                 : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1516:             
1517:             // Split long text into chunks (limit: 1000 chars)
1518:             const chunks = this.splitTextForTTS(cleanText, 1000);
1519:             const audioBlobs = [];
1520: 
1521:             for (const chunk of chunks) {
1522:                 const resp = await fetch(baseUrl + 'tts', {
1523:                     method: 'POST',
1524:                     headers: { 'Content-Type': 'application/json' },
1525:                     body: JSON.stringify({
1526:                         text: chunk,
1527:                         lang: 'ru',
1528:                         voice: 'xenia',
1529:                         engine: engine
1530:                     })
1531:                 });
1532: 
1533:                 console.log(`[TTS] Response status: ${resp.status}, content-type: ${resp.headers.get('content-type')}`);
1534:                 
1535:                 if (!resp.ok) {
1536:                     const errText = await resp.text().catch(() => '');
1537:                     console.error('[TTS] Error response:', errText.substring(0, 500));
1538:                     throw new Error(`TTS failed: ${resp.status}`);
1539:                 }
1540:                 
1541:                 const blob = await resp.blob();
1542:                 console.log(`[TTS] Chunk ${chunks.indexOf(chunk) + 1}: ${blob.size} bytes, type: ${blob.type}`);
1543:                 audioBlobs.push(blob);
1544:             }
1545: 
1546:             // Combine all audio chunks
1547:             const combinedBlob = new Blob(audioBlobs, { type: 'audio/wav' });
1548:             const url = URL.createObjectURL(combinedBlob);
1549:             
1550:             this.ttsAudio = new Audio(url);
1551:             this.ttsAudio.volume = 1.0;
1552:             
1553:             this.ttsAudio.onended = () => {
1554:                 URL.revokeObjectURL(url);
1555:                 this.ttsAudio = null;
1556:                 if (this.isRecording && this.recognition) {
1557:                     try { this.recognition.start(); } catch {}
1558:                 }
1559:                 this.updateSpeakButton(idx, false);
1560:             };
1561:             
1562:             this.ttsAudio.onerror = (e) => {
1563:                 console.error('[TTS] Audio error:', e);
1564:                 URL.revokeObjectURL(url);
1565:                 this.ttsAudio = null;
1566:                 this.updateSpeakButton(idx, false);
1567:                 if (this.isRecording && this.recognition) {
1568:                     try { this.recognition.start(); } catch {}
1569:                 }
1570:             };
1571: 
1572:             this.updateSpeakButton(idx, true);
1573:             await this.ttsAudio.play();
1574:             if (!autoPlay) telegram.haptic('light');
1575: 
1576:         } catch (error) {
1577:             console.error('[TTS] Neural TTS failed:', error.message);
1578:             this.updateSpeakButton(idx, false);
1579:             if (this.isRecording && this.recognition) {
1580:                 try { this.recognition.start(); } catch {}
1581:             }
1582:         }
1583:     }
1584: 
1585:     splitTextForTTS(text, maxLength) {
1586:         if (text.length <= maxLength) return [text];
1587:         
1588:         const chunks = [];
1589:         const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
1590:         let currentChunk = '';
1591:         
1592:         for (const sentence of sentences) {
1593:             const trimmed = sentence.trim();
1594:             if (!trimmed) continue;
1595:             
1596:             if ((currentChunk + trimmed).length > maxLength && currentChunk) {
1597:                 chunks.push(currentChunk.trim());
1598:                 currentChunk = trimmed;
1599:             } else {
1600:                 currentChunk += (currentChunk ? ' ' : '') + trimmed;
1601:             }
1602:         }
1603:         
1604:         if (currentChunk) chunks.push(currentChunk.trim());
1605:         return chunks;
1606:     }
1607: 
1608:     toggleSpeakMessage(idx) {
1609:         if (this.ttsAudio && !this.ttsAudio.paused && this.currentSpeakIdx === idx) {
1610:             this.ttsAudio.pause();
1611:             this.ttsAudio = null;
1612:             this.currentSpeakIdx = null;
1613:             this.updateSpeakButton(idx, false);
1614:             if (this.isRecording && this.recognition) {
1615:                 try { this.recognition.start(); } catch {}
1616:             }
1617:             return;
1618:         }
1619: 
1620:         if (this.ttsAudio) {
1621:             this.ttsAudio.pause();
1622:             this.ttsAudio = null;
1623:             if (this.currentSpeakIdx !== null) {
1624:                 this.updateSpeakButton(this.currentSpeakIdx, false);
1625:             }
1626:         }
1627: 
1628:         this.currentSpeakIdx = idx;
1629:         this.speakMessage(idx, false);
1630:     }
1631: 
1632:     updateSpeakButton(idx, isPlaying) {
1633:         const container = document.getElementById('chat-messages');
1634:         if (!container) return;
1635:         const buttons = container.querySelectorAll('.speak-btn');
1636:         if (buttons[idx]) {
1637:             buttons[idx].classList.toggle('muted', !isPlaying);
1638:             buttons[idx].textContent = isPlaying ? '⏸' : '🔊';
1639:             buttons[idx].title = isPlaying ? 'Остановить' : 'Прослушать';
1640:         }
1641:     }
1642: 
1643:     toggleTTS() {
1644:         this.ttsEnabled = !this.ttsEnabled;
1645:         if (!this.ttsEnabled) {
1646:             if (this.ttsAudio) {
1647:                 this.ttsAudio.pause();
1648:                 this.ttsAudio = null;
1649:             }
1650:             if (this.currentSpeakIdx !== null) {
1651:                 this.updateSpeakButton(this.currentSpeakIdx, false);
1652:                 this.currentSpeakIdx = null;
1653:             }
1654:         }
1655:         this.updateTTSButton();
1656:         telegram.haptic('light');
1657:     }
1658: 
1659:     updateTTSButton() {
1660:         const icon = document.getElementById('tts-icon');
1661:         if (icon) icon.textContent = this.ttsEnabled ? '🔊' : '🔇';
1662:     }
1663: 
1664:     toggleTTSMenu() {
1665:         const menu = document.getElementById('tts-engine-menu');
1666:         if (!menu) return;
1667:         
1668:         const isVisible = menu.style.display === 'flex';
1669:         menu.style.display = isVisible ? 'none' : 'flex';
1670:         telegram.haptic('light');
1671:         
1672:         // Close menu after 5 seconds
1673:         if (!isVisible) {
1674:             setTimeout(() => {
1675:                 if (menu.style.display === 'flex') {
1676:                     menu.style.display = 'none';
1677:                 }
1678:             }, 5000);
1679:         }
1680:     }
1681: 
1682:     setTTSEngine(engine) {
1683:         this.ttsEngine = engine;
1684:         this.updateTTSEngineButton();
1685:         this.toggleTTSMenu(); // Close menu
1686:         telegram.haptic('medium');
1687:         
1688:         // Test with current message if available
1689:         if (this.currentSpeakIdx !== null) {
1690:             this.toggleSpeakMessage(this.currentSpeakIdx);
1691:         }
1692:     }
1693: 
1694:     updateTTSEngineButton() {
1695:         const icon = document.getElementById('tts-engine-icon');
1696:         if (icon) {
1697:             const icons = { silero: '🧠', vits: '🎭', google: '🌐' };
1698:             icon.textContent = icons[this.ttsEngine] || '⚙️';
1699:         }
1700:     }
1701: 
1702:     scrollToBottom() {
1703:         const container = document.getElementById('chat-messages');
1704:         if (!container) return;
1705:         requestAnimationFrame(() => {
1706:             container.scrollTop = container.scrollHeight;
1707:         });
1708:     }
1709: 
1710:     addChatMessage(sender, text) {
1711:         this.chatMessages.push({
1712:             sender,
1713:             text,
1714:             timestamp: Date.now()
1715:         });
1716:         this.renderChatMessages();
1717:         this.saveCache();
1718:         
1719:         // Try auto-speak Hermes messages with neural TTS
1720:         if (sender === 'hermes' && this.ttsEnabled && text) {
1721:             const idx = this.chatMessages.length - 1;
1722:             setTimeout(() => {
1723:                 this.speakMessage(idx, true);
1724:             }, 500);
1725:         }
1726:     }
1727: 
1728:     showTypingIndicator() {
1729:         const container = document.getElementById('chat-messages');
1730:         if (!container) return;
1731:         const typing = document.createElement('div');
1732:         typing.className = 'typing-indicator';
1733:         typing.id = 'typing-indicator';
1734:         typing.innerHTML = '<span>Гермес печатает</span><div class="dot"></div><div class="dot"></div><div class="dot"></div>';
1735:         container.appendChild(typing);
1736:         container.scrollTop = container.scrollHeight;
1737:     }
1738: 
1739:     hideTypingIndicator() {
1740:         const typing = document.getElementById('typing-indicator');
1741:         if (typing) typing.remove();
1742:     }
1743: 
1744:     async sendTextMessage() {
1745:         const input = document.getElementById('chat-input');
1746:         if (!input || !input.value.trim()) return;
1747: 
1748:         // Auto-tap unlock on first text send
1749:         if (!this.audioUnlocked) {
1750:             this.unlockAudio();
1751:         }
1752: 
1753:         const text = input.value.trim();
1754:         this.addChatMessage('user', text);
1755:         input.value = '';
1756: 
1757:         telegram.haptic('light');
1758: 
1759:         // Call Hermes backend
1760:         try {
1761:             const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
1762:                 ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
1763:                 : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
1764: 
1765:             console.log('[Chat] Fetching:', baseUrl + 'chat');
1766: 
1767:             // Show typing indicator
1768:             this.showTypingIndicator();
1769: 
1770:             // Try streaming first
1771:             const streamUrl = baseUrl + 'chat/stream';
1772:             const response = await fetch(streamUrl, {
1773:                 method: 'POST',
1774:                 mode: 'cors',
1775:                 credentials: 'omit',
1776:                 headers: { 'Content-Type': 'application/json' },
1777:                 body: JSON.stringify({
1778:                     message: text,
1779:                     user_id: telegram.getUserId(),
1780:                     session_id: `tg_${telegram.getUserId()}`,
1781:                     persona: 'hermes',
1782:                     use_router: true
1783:                 })
1784:             });
1785: 
1786:             console.log('[Chat] Response status:', response.status, response.statusText);
1787: 
1788:             // Hide typing indicator
1789:             this.hideTypingIndicator();
1790: 
1791:             const contentType = response.headers.get('content-type') || '';
1792: 
1793:             if (contentType.includes('text/event-stream')) {
1794:                 // Streaming response — typewriter effect
1795:                 const reader = response.body.getReader();
1796:                 const decoder = new TextDecoder();
1797:                 let fullText = '';
1798: 
1799:                 // Create empty hermes message bubble for streaming
1800:                 const msgIdx = this.chatMessages.length;
1801:                 this.chatMessages.push({ sender: 'hermes', text: '', timestamp: Date.now() });
1802:                 this.renderChatMessages();
1803: 
1804:                 while (true) {
1805:                     const { done, value } = await reader.read();
1806:                     if (done) break;
1807: 
1808:                     const chunk = decoder.decode(value, { stream: true });
1809:                     const lines = chunk.split('\n').filter(l => l.startsWith('data: '));
1810: 
1811:                     for (const line of lines) {
1812:                         try {
1813:                             const parsed = JSON.parse(line.replace('data: ', ''));
1814:                             if (parsed.done) {
1815:                                 // Handle contract fields from final event
1816:                                 if (parsed.contract_fields) {
1817:                                     this.applyExtractedFields(parsed.contract_fields, parsed.contract_state);
1818:                                 }
1819:                                 // Handle cost estimate
1820:                                 if (parsed.cost_estimate) {
1821:                                     console.log('[Cost]', parsed.cost_estimate.cost.ton, 'TON |', parsed.cost_estimate.cost.usd, 'USD');
1822:                                 }
1823:                                 break;
1824:                             }
1825:                             if (parsed.char !== undefined) {
1826:                                 fullText += parsed.char;
1827:                                 this.chatMessages[msgIdx].text = fullText;
1828:                                 this.renderChatMessages();
1829:                             }
1830:                         } catch { /* skip malformed SSE lines */ }
1831:                     }
1832:                 }
1833: 
1834:                 this.saveCache();
1835:             } else {
1836:                 // Fallback: regular JSON response
1837:                 const data = await response.json();
1838: 
1839:                 if (data.blocked) {
1840:                     this.addChatMessage('system', `⚠️ ${data.reason}`);
1841:                 } else if (data.response) {
1842:                     this.addChatMessage('hermes', data.response);
1843:                     
1844:                     // Auto-fill contract fields if extracted
1845:                     if (data.contract_fields) {
1846:                         this.applyExtractedFields(data.contract_fields, data.contract_state);
1847:                     }
1848:                     
1849:                     // Log cost if router mode
1850:                     if (data.cost_estimate) {
1851:                         console.log('[Router]', data.cost_estimate.cost.ton, 'TON |', data.cost_estimate.cost.usd, 'USD');
1852:                     }
1853:                 } else if (data.error) {
1854:                     this.addChatMessage('system', `❌ Ошибка: ${data.error_message || data.error}`);
1855:                 }
1856:             }
1857:         } catch (error) {
1858:             console.error('[Chat] Fetch failed:', error.message);
1859:             this.hideTypingIndicator();
1860:             this.addChatMessage('system', '❌ Ошибка соединения с сервером');
1861:         }
1862:     }
1863: 
1864:     showAttachMenu() {
1865:         const menu = document.getElementById('attach-menu');
1866:         if (!menu) return;
1867: 
1868:         menu.style.display = menu.style.display === 'none' ? 'grid' : 'none';
1869:         telegram.haptic('light');
1870:     }
1871: 
1872:     hideAttachMenu() {
1873:         const menu = document.getElementById('attach-menu');
1874:         if (menu) menu.style.display = 'none';
1875:     }
1876: 
1877:     attachPhoto() {
1878:         this.hideAttachMenu();
1879:         const input = document.createElement('input');
1880:         input.type = 'file';
1881:         input.accept = 'image/*';
1882:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'photo');
1883:         input.click();
1884:     }
1885: 
1886:     attachVideo() {
1887:         this.hideAttachMenu();
1888:         const input = document.createElement('input');
1889:         input.type = 'file';
1890:         input.accept = 'video/*';
1891:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'video');
1892:         input.click();
1893:     }
1894: 
1895:     async recordVideo() {
1896:         this.hideAttachMenu();
1897:         try {
1898:             const stream = await navigator.mediaDevices.getUserMedia({
1899:                 video: { facingMode: this.currentFacingMode },
1900:                 audio: true
1901:             });
1902:             this.currentStream = stream;
1903:             this.showVideoRecorder(stream);
1904:         } catch (error) {
1905:             telegram.showAlert('Нет доступа к камере');
1906:         }
1907:     }
1908: 
1909:     showVideoRecorder(stream) {
1910:         const recorder = document.createElement('div');
1911:         recorder.className = 'video-recording';
1912:         recorder.innerHTML = `
1913:             <div class="video-preview">
1914:                 <video id="video-preview" autoplay playsinline muted></video>
1915:                 <div class="video-controls">
1916:                     <button class="camera-switch-btn" onclick="app.switchCamera()">🔄</button>
1917:                     <button class="video-record-btn" id="record-btn" onclick="app.toggleVideoRecording()"></button>
1918:                     <button class="camera-switch-btn" onclick="app.closeVideoRecorder()">✖️</button>
1919:                 </div>
1920:             </div>
1921:         `;
1922:         document.body.appendChild(recorder);
1923: 
1924:         const video = document.getElementById('video-preview');
1925:         video.srcObject = stream;
1926:     }
1927: 
1928:     async switchCamera() {
1929:         this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
1930:         if (this.currentStream) {
1931:             this.currentStream.getTracks().forEach(track => track.stop());
1932:         }
1933:         await this.recordVideo();
1934:     }
1935: 
1936:     toggleVideoRecording() {
1937:         const btn = document.getElementById('record-btn');
1938:         if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
1939:             this.startVideoRecording();
1940:             btn.classList.add('recording');
1941:         } else {
1942:             this.stopVideoRecording();
1943:             btn.classList.remove('recording');
1944:         }
1945:     }
1946: 
1947:     startVideoRecording() {
1948:         if (!this.currentStream) return;
1949: 
1950:         this.mediaRecorder = new MediaRecorder(this.currentStream);
1951:         this.audioChunks = [];
1952: 
1953:         this.mediaRecorder.ondataavailable = (e) => {
1954:             this.audioChunks.push(e.data);
1955:         };
1956: 
1957:         this.mediaRecorder.onstop = () => {
1958:             const videoBlob = new Blob(this.audioChunks, { type: 'video/webm' });
1959:             this.handleVideoUpload(videoBlob);
1960:         };
1961: 
1962:         this.mediaRecorder.start();
1963:     }
1964: 
1965:     stopVideoRecording() {
1966:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
1967:             this.mediaRecorder.stop();
1968:         }
1969:     }
1970: 
1971:     closeVideoRecorder() {
1972:         if (this.currentStream) {
1973:             this.currentStream.getTracks().forEach(track => track.stop());
1974:             this.currentStream = null;
1975:         }
1976:         const recorder = document.querySelector('.video-recording');
1977:         if (recorder) recorder.remove();
1978:     }
1979: 
1980:     async shareScreen() {
1981:         this.hideAttachMenu();
1982:         try {
1983:             const stream = await navigator.mediaDevices.getDisplayMedia({
1984:                 video: true
1985:             });
1986:             
1987:             const mediaRecorder = new MediaRecorder(stream);
1988:             const chunks = [];
1989: 
1990:             mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
1991:             mediaRecorder.onstop = () => {
1992:                 const blob = new Blob(chunks, { type: 'video/webm' });
1993:                 this.handleVideoUpload(blob);
1994:                 stream.getTracks().forEach(track => track.stop());
1995:             };
1996: 
1997:             mediaRecorder.start();
1998:             setTimeout(() => mediaRecorder.stop(), 30000); // 30 sec max
1999:         } catch (error) {
2000:             telegram.showAlert('Нет доступа к экрану');
2001:         }
2002:     }
2003: 
2004:     async handleFileUpload(file, type) {
2005:         if (!file) return;
2006: 
2007:         this.addChatMessage('user', `[📎 ${type === 'photo' ? 'Фото' : 'Видео'}]`);
2008: 
2009:         const reader = new FileReader();
2010:         reader.onload = async (e) => {
2011:             try {
2012:                 // Upload to backend and get URL
2013:                 const imageUrl = e.target.result; // Base64 data URL
2014: 
2015:                 // Call Hermes image analysis
2016:                 const response = await fetch('/analyze-image', {
2017:                     method: 'POST',
2018:                     headers: { 'Content-Type': 'application/json' },
2019:                     body: JSON.stringify({
2020:                         image_url: imageUrl,
2021:                         prompt: type === 'photo' ? 'Проанализируй это изображение' : 'Опиши это видео',
2022:                         user_id: telegram.getUserId(),
2023:                         session_id: `tg_${telegram.getUserId()}`
2024:                     })
2025:                 });
2026: 
2027:                 const data = await response.json();
2028: 
2029:                 if (data.response) {
2030:                     this.addChatMessage('hermes', data.response);
2031:                 } else if (data.error) {
2032:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
2033:                 }
2034:             } catch (error) {
2035:                 console.error('[App] Upload error:', error);
2036:                 this.addChatMessage('system', '❌ Ошибка загрузки файла');
2037:             }
2038:         };
2039:         reader.readAsDataURL(file);
2040:     }
2041: 
2042:     async handleVideoUpload(blob) {
2043:         this.addChatMessage('user', '[🎥 Видеозапись]');
2044:         this.closeVideoRecorder();
2045: 
2046:         const reader = new FileReader();
2047:         reader.onload = async (e) => {
2048:             try {
2049:                 const videoUrl = e.target.result;
2050: 
2051:                 // Call Hermes video analysis
2052:                 const response = await fetch('/analyze-image', {
2053:                     method: 'POST',
2054:                     headers: { 'Content-Type': 'application/json' },
2055:                     body: JSON.stringify({
2056:                         image_url: videoUrl,
2057:                         prompt: 'Проанализируй это видео',
2058:                         user_id: telegram.getUserId(),
2059:                         session_id: `tg_${telegram.getUserId()}`
2060:                     })
2061:                 });
2062: 
2063:                 const data = await response.json();
2064: 
2065:                 if (data.response) {
2066:                     this.addChatMessage('hermes', data.response);
2067:                 } else if (data.error) {
2068:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
2069:                 }
2070:             } catch (error) {
2071:                 console.error('[App] Video upload error:', error);
2072:                 this.addChatMessage('system', '❌ Ошибка загрузки видео');
2073:             }
2074:         };
2075:         reader.readAsDataURL(blob);
2076:     }
2077: 
2078:     formatTime(timestamp) {
2079:         const date = new Date(timestamp);
2080:         return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
2081:     }
2082: 
2083:     async submitFeedback(msgIdx, feedback) {
2084:         const msg = this.chatMessages[msgIdx];
2085:         if (!msg || msg.feedback) return;
2086: 
2087:         msg.feedback = feedback;
2088:         this.renderChatMessages();
2089: 
2090:         try {
2091:             const baseUrl = (window.Telegram?.WebApp?.initDataUnsafe?.web_app?.url)
2092:                 ? new URL('/', window.Telegram.WebApp.initDataUnsafe.web_app.url).href
2093:                 : 'https://neuroescrow-hermes.neurocoderz.workers.dev/';
2094: 
2095:             await fetch(baseUrl + 'feedback', {
2096:                 method: 'POST',
2097:                 mode: 'cors',
2098:                 credentials: 'omit',
2099:                 headers: { 'Content-Type': 'application/json' },
2100:                 body: JSON.stringify({
2101:                     message_id: msgIdx,
2102:                     feedback,
2103:                     user_id: telegram.getUserId(),
2104:                     session_id: `tg_${telegram.getUserId()}`,
2105:                     text: msg.text.substring(0, 200)
2106:                 })
2107:             });
2108: 
2109:             telegram.haptic('light');
2110:         } catch (error) {
2111:             console.error('[Feedback] Error:', error.message);
2112:         }
2113:     }
2114: 
2115:     updateTaskSpec(title, content) {
2116:         const specContainer = document.getElementById('task-spec');
2117:         const specContent = document.getElementById('task-spec-content');
2118:         if (!specContainer || !specContent) return;
2119: 
2120:         specContainer.classList.add('has-content');
2121:         specContent.innerHTML = `
2122:             <div class="task-spec-title">${this.escapeHtml(title)}</div>
2123:             <div>${this.escapeHtml(content)}</div>
2124:         `;
2125:     }
2126: 
2127:     clearTaskSpec() {
2128:         const specContainer = document.getElementById('task-spec');
2129:         const specContent = document.getElementById('task-spec-content');
2130:         if (!specContainer || !specContent) return;
2131: 
2132:         specContainer.classList.remove('has-content');
2133:         specContent.textContent = 'Ожидание ТЗ от Гермеса...';
2134:     }
2135: 
2136:     // ─── Голосовой ввод с автоотправкой (VAD — Voice Activity Detection) ──
2137:     // Best practice: silence-based auto-send after final result + 1.5s pause
2138:     // Source: Web Speech API patterns used by Otter.ai, AssemblyAI, Whisper
2139:     initVoiceInput() {
2140:         const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
2141:         if (!SpeechRecognition) {
2142:             console.warn('[App] SpeechRecognition не поддерживается в этом браузере');
2143:             return;
2144:         }
2145:         this.recognition = new SpeechRecognition();
2146:         this.recognition.lang = 'ru-RU';
2147:         this.recognition.interimResults = true;
2148:         this.recognition.continuous = true;
2149:         this.recognition.maxAlternatives = 1;
2150: 
2151:         // Silence detection timer — auto-send after 1.5s of no new speech
2152:         this._voiceSendTimer = null;
2153:         this._voiceAutoSendDelay = 1500; // 1.5s silence = send
2154:         this._voiceLastResultTime = 0;
2155:         this._voiceAccumulatedText = '';
2156: 
2157:         this.recognition.onresult = (event) => {
2158:             let interim = '';
2159:             let final = '';
2160:             for (let i = event.resultIndex; i < event.results.length; i++) {
2161:                 const transcript = event.results[i][0].transcript;
2162:                 if (event.results[i].isFinal) final += transcript + ' ';
2163:                 else interim += transcript;
2164:             }
2165: 
2166:             const input = document.getElementById('chat-input');
2167:             if (input) {
2168:                 const baseText = this._voiceAccumulatedText || '';
2169:                 input.value = baseText + final + interim;
2170:             }
2171: 
2172:             // Reset silence timer on any new result
2173:             this._voiceLastResultTime = Date.now();
2174: 
2175:             // If we got a final result, start/restart the auto-send timer
2176:             if (final.trim()) {
2177:                 this._voiceAccumulatedText += final;
2178:                 this._clearVoiceSendTimer();
2179:                 this._voiceSendTimer = setTimeout(() => {
2180:                     this._autoSendVoice();
2181:                 }, this._voiceAutoSendDelay);
2182:             }
2183:         };
2184: 
2185:         this.recognition.onerror = (e) => {
2186:             console.warn('[App] Voice error:', e.error);
2187:             // Auto-restart on non-fatal errors (no-speech, aborted)
2188:             if (this.isRecording && e.error !== 'not-allowed') {
2189:                 try { this.recognition.start(); } catch { /* already started */ }
2190:             }
2191:         };
2192: 
2193:         this.recognition.onend = () => {
2194:             // Auto-restart if still in recording mode (continuous listening)
2195:             if (this.isRecording) {
2196:                 try {
2197:                     this.recognition.start();
2198:                 } catch {
2199:                     this.isRecording = false;
2200:                     this._clearVoiceSendTimer();
2201:                     const micBtn = document.getElementById('micButton');
2202:                     if (micBtn) micBtn.classList.remove('recording');
2203:                 }
2204:             } else {
2205:                 // User stopped — send any accumulated text
2206:                 if (this._voiceAccumulatedText.trim()) {
2207:                     this._autoSendVoice();
2208:                 }
2209:                 this._clearVoiceSendTimer();
2210:                 const micBtn = document.getElementById('micButton');
2211:                 if (micBtn) micBtn.classList.remove('recording');
2212:             }
2213:         };
2214:     }
2215: 
2216:     _clearVoiceSendTimer() {
2217:         if (this._voiceSendTimer) {
2218:             clearTimeout(this._voiceSendTimer);
2219:             this._voiceSendTimer = null;
2220:         }
2221:     }
2222: 
2223:     _autoSendVoice() {
2224:         const input = document.getElementById('chat-input');
2225:         const text = (this._voiceAccumulatedText || '').trim();
2226:         if (!text) return;
2227: 
2228:         // Clear accumulated text and timer
2229:         this._voiceAccumulatedText = '';
2230:         this._clearVoiceSendTimer();
2231: 
2232:         // Update input and send
2233:         if (input) input.value = text;
2234:         this.sendTextMessage();
2235: 
2236:         telegram.haptic('medium');
2237:     }
2238: 
2239:     toggleVoiceRecording() {
2240:         if (!this.recognition) return telegram.showAlert('Голосовой ввод не поддерживается');
2241:         const micBtn = document.getElementById('micButton');
2242:         if (this.isRecording) {
2243:             // User tapped to stop — will trigger onend → auto-send
2244:             this.recognition.stop();
2245:             this.isRecording = false;
2246:         } else {
2247:             const input = document.getElementById('chat-input');
2248:             this._voiceAccumulatedText = input ? input.value + ' ' : '';
2249:             this._voiceLastResultTime = Date.now();
2250:             this.recognition.start();
2251:             this.isRecording = true;
2252:             if (micBtn) micBtn.classList.add('recording');
2253:             telegram.haptic('light');
2254:         }
2255:     }
2256: 
2257:     // ─── Панель смарт-контракта (вопросы Гермеса) ────────────────────────
2258:     renderContractQuestions(questions = []) {
2259:         const container = document.getElementById('contract-qa-container');
2260:         if (!container) return;
2261:         container.innerHTML = '';
2262:         if (!questions.length) {
2263:             container.innerHTML = '<div class="qa-empty">Нет активных вопросов от Гермеса</div>';
2264:             return;
2265:         }
2266:         questions.forEach((q, idx) => {
2267:             const wrap = document.createElement('div');
2268:             wrap.className = 'qa-item';
2269:             wrap.innerHTML = `
2270:                 <div class="qa-question">${idx + 1}. ${this.escapeHtml(q.text)}</div>
2271:                 <input type="text" class="qa-answer-input" placeholder="Ваш ответ..." data-qid="${q.id || idx}" />
2272:             `;
2273:             container.appendChild(wrap);
2274:         });
2275:         container.querySelectorAll('.qa-answer-input').forEach(inp => {
2276:             inp.addEventListener('change', () => this.saveContractAnswers());
2277:         });
2278:     }
2279: 
2280:     saveContractAnswers() {
2281:         const inputs = document.querySelectorAll('.qa-answer-input');
2282:         const answers = {};
2283:         inputs.forEach(inp => answers[inp.dataset.qid] = inp.value.trim());
2284:         this.contractAnswers = answers;
2285:         this.saveCache();
2286:     }
2287: 
2288:     // ─── История ТЗ ──────────────────────────────────────────────────────
2289:     async saveTaskSpecHistory(specText) {
2290:         if (!specText?.trim()) return;
2291:         const history = this.taskSpecHistory || [];
2292:         history.unshift({ text: specText, timestamp: Date.now() });
2293:         if (history.length > 20) history.pop();
2294:         this.taskSpecHistory = history;
2295:         try {
2296:             if (window.Telegram?.WebApp?.CloudStorage) {
2297:                 await new Promise((res, rej) => Telegram.WebApp.CloudStorage.setItem('task_spec_history', JSON.stringify(history), (err, ok) => err ? rej(err) : res(ok)));
2298:             } else {
2299:                 localStorage.setItem('task_spec_history', JSON.stringify(history));
2300:             }
2301:         } catch (e) { console.warn('[App] History save failed:', e); }
2302:     }
2303: 
2304:     async loadTaskSpecHistory() {
2305:         try {
2306:             let raw = null;
2307:             if (window.Telegram?.WebApp?.CloudStorage) {
2308:                 raw = await new Promise((res, rej) => Telegram.WebApp.CloudStorage.getItem('task_spec_history', (err, val) => err ? rej(err) : res(val)));
2309:             } else {
2310:                 raw = localStorage.getItem('task_spec_history');
2311:             }
2312:             this.taskSpecHistory = raw ? JSON.parse(raw) : [];
2313:         } catch (e) {
2314:             this.taskSpecHistory = [];
2315:         }
2316:         this.renderTaskSpecHistory();
2317:     }
2318: 
2319:     renderTaskSpecHistory() {
2320:         const list = document.getElementById('task-history-list');
2321:         if (!list) return;
2322:         list.innerHTML = '';
2323:         if (!this.taskSpecHistory?.length) {
2324:             list.innerHTML = '<div class="history-empty">История пуста</div>';
2325:             return;
2326:         }
2327:         this.taskSpecHistory.forEach((item, idx) => {
2328:             const el = document.createElement('div');
2329:             el.className = 'history-item';
2330:             const time = new Date(item.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
2331:             el.innerHTML = `<span class="history-time">${time}</span><span class="history-text">${this.escapeHtml(item.text.slice(0, 60))}...</span>`;
2332:             el.onclick = () => {
2333:                 const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
2334:                 if (input) input.value = item.text;
2335:                 telegram.haptic('light');
2336:             };
2337:             list.appendChild(el);
2338:         });
2339:     }
2340: 
2341:     // ─── Экспорт ТЗ ──────────────────────────────────────────────────────
2342:     exportTaskSpec() {
2343:         const input = document.getElementById('task-spec-input') || document.getElementById('chat-input');
2344:         const spec = input?.value?.trim() || '';
2345:         const answers = this.contractAnswers || {};
2346:         if (!spec && !Object.keys(answers).length) return telegram.showAlert('Нет данных для экспорта');
2347: 
2348:         const payload = {
2349:             task_spec: spec,
2350:             contract_answers: answers,
2351:             exported_at: new Date().toISOString(),
2352:             user_id: telegram.getUserId?.() || 'unknown'
2353:         };
2354:         const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
2355:         const url = URL.createObjectURL(blob);
2356:         const a = document.createElement('a');
2357:         a.href = url;
2358:         a.download = `task_spec_${Date.now()}.json`;
2359:         document.body.appendChild(a);
2360:         a.click();
2361:         a.remove();
2362:         URL.revokeObjectURL(url);
2363:         telegram.haptic('success');
2364:     }
2365: }
2366: 
2367: let app;
2368: document.addEventListener('DOMContentLoaded', () => {
2369:     window.app = new NeuroEscrowApp();
2370:     app = window.app;
2371: });
2372: 
2373: window.addEventListener('message', (event) => {
2374:     if (event.data && event.data.type === 'bot_data' && app) {
2375:         app.handleBotData(event.data.payload);
2376:     }
2377: });
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
