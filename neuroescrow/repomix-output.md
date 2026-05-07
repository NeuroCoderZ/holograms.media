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
 14:     this.CODEBASE_COLLECTION = 'neuroescrow_codebase';
 15:     this.MEMORY_COLLECTION = 'neuroescrow_memory';
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
 36:         self.CODEBASE_COLLECTION = "neuroescrow_codebase"
 37:         self.MEMORY_COLLECTION = "neuroescrow_memory"
 38:         
 39:         self._initialized = True
 40:     
 41:     def _ensure_collection(self, collection_name: str, dimension: int = 1536):
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
  2:  * Mistral Embeddings - JavaScript Edition
  3:  * Uses codestral-embed-2505 (1536 dimensions)
  4:  */
  5: 
  6: export class MistralEmbeddings {
  7:   constructor(kvCache, env) {
  8:     this.apiKey = env?.MISTRAL_API_KEY;
  9:     if (!this.apiKey) {
 10:       throw new Error('MISTRAL_API_KEY not found in environment');
 11:     }
 12:     this.model = env?.EMBEDDING_MODEL || 'codestral-embed-2505';
 13:     this.dimension = parseInt(env?.EMBEDDING_DIMENSION || '1536');
 14:     this.kvCache = kvCache;
 15:   }
 16:   
 17:   getCacheKey(text) {
 18:     return `emb:${this.hashString(text).substring(0, 16)}`;
 19:   }
 20:   
 21:   hashString(str) {
 22:     let hash = 0;
 23:     for (let i = 0; i < str.length; i++) {
 24:       const char = str.charCodeAt(i);
 25:       hash = ((hash << 5) - hash) + char;
 26:       hash = hash & hash;
 27:     }
 28:     return Math.abs(hash).toString(16);
 29:   }
 30:   
 31:   async getFromCache(text) {
 32:     if (!this.kvCache) return null;
 33:     
 34:     try {
 35:       const cacheKey = this.getCacheKey(text);
 36:       const cached = await this.kvCache.get(cacheKey);
 37:       if (cached) {
 38:         return JSON.parse(cached);
 39:       }
 40:     } catch (error) {
 41:       // Ignore cache errors
 42:     }
 43:     
 44:     return null;
 45:   }
 46:   
 47:   async saveToCache(text, embedding) {
 48:     if (!this.kvCache) return;
 49:     
 50:     try {
 51:       const cacheKey = this.getCacheKey(text);
 52:       // Cache for 7 days
 53:       await this.kvCache.put(cacheKey, JSON.stringify(embedding), {
 54:         expirationTtl: 604800
 55:       });
 56:     } catch (error) {
 57:       // Ignore cache errors
 58:     }
 59:   }
 60:   
 61:   async embed(text) {
 62:     // Check cache
 63:     const cached = await this.getFromCache(text);
 64:     if (cached) return cached;
 65:     
 66:     // Call Mistral API
 67:     const response = await fetch('https://api.mistral.ai/v1/embeddings', {
 68:       method: 'POST',
 69:       headers: {
 70:         'Authorization': `Bearer ${this.apiKey}`,
 71:         'Content-Type': 'application/json'
 72:       },
 73:       body: JSON.stringify({
 74:         model: this.model,
 75:         input: [text]
 76:       })
 77:     });
 78:     
 79:     if (!response.ok) {
 80:       throw new Error(`Mistral Embeddings API error: ${response.status}`);
 81:     }
 82:     
 83:     const data = await response.json();
 84:     const embedding = data.data[0].embedding;
 85:     
 86:     // Save to cache
 87:     await this.saveToCache(text, embedding);
 88:     
 89:     return embedding;
 90:   }
 91:   
 92:   async embedBatch(texts) {
 93:     const embeddings = [];
 94:     const uncachedTexts = [];
 95:     const uncachedIndices = [];
 96:     
 97:     // Check cache for each text
 98:     for (let i = 0; i < texts.length; i++) {
 99:       const cached = await this.getFromCache(texts[i]);
100:       if (cached) {
101:         embeddings.push(cached);
102:       } else {
103:         embeddings.push(null);
104:         uncachedTexts.push(texts[i]);
105:         uncachedIndices.push(i);
106:       }
107:     }
108:     
109:     // Batch call for uncached texts
110:     if (uncachedTexts.length > 0) {
111:       const response = await fetch('https://api.mistral.ai/v1/embeddings', {
112:         method: 'POST',
113:         headers: {
114:           'Authorization': `Bearer ${this.apiKey}`,
115:           'Content-Type': 'application/json'
116:         },
117:         body: JSON.stringify({
118:           model: this.model,
119:           input: uncachedTexts
120:         })
121:       });
122:       
123:       if (!response.ok) {
124:         throw new Error(`Mistral Embeddings API error: ${response.status}`);
125:       }
126:       
127:       const data = await response.json();
128:       
129:       // Fill in uncached embeddings
130:       for (let i = 0; i < data.data.length; i++) {
131:         const embedding = data.data[i].embedding;
132:         const idx = uncachedIndices[i];
133:         embeddings[idx] = embedding;
134:         await this.saveToCache(uncachedTexts[i], embedding);
135:       }
136:     }
137:     
138:     return embeddings;
139:   }
140: }
</file>

<file path="backend/src/embeddings.py">
  1: """
  2: Mistral Embeddings with KV Cache
  3: Uses codestral-embed-2505 (1536 dimensions)
  4: """
  5: import os
  6: import hashlib
  7: import json
  8: from typing import List, Optional
  9: import httpx
 10: 
 11: 
 12: class MistralEmbeddings:
 13:     """Mistral embeddings client with KV caching"""
 14:     
 15:     def __init__(self, kv_cache=None):
 16:         self.api_key = os.getenv('MISTRAL_API_KEY')
 17:         if not self.api_key:
 18:             raise ValueError("MISTRAL_API_KEY must be set")
 19:         
 20:         self.model = os.getenv('EMBEDDING_MODEL', 'codestral-embed-2505')
 21:         self.dimension = int(os.getenv('EMBEDDING_DIMENSION', '1536'))
 22:         self.kv_cache = kv_cache
 23:         
 24:         self.base_url = "https://api.mistral.ai/v1/embeddings"
 25:         self.headers = {
 26:             "Authorization": f"Bearer {self.api_key}",
 27:             "Content-Type": "application/json"
 28:         }
 29:     
 30:     def _get_cache_key(self, text: str) -> str:
 31:         """Generate cache key from text"""
 32:         return f"emb:{hashlib.sha256(text.encode()).hexdigest()[:16]}"
 33:     
 34:     def _get_from_cache(self, text: str) -> Optional[List[float]]:
 35:         """Get embedding from KV cache"""
 36:         if not self.kv_cache:
 37:             return None
 38:         
 39:         try:
 40:             cache_key = self._get_cache_key(text)
 41:             cached = self.kv_cache.get(cache_key)
 42:             if cached:
 43:                 return json.loads(cached)
 44:         except Exception:
 45:             pass
 46:         
 47:         return None
 48:     
 49:     def _save_to_cache(self, text: str, embedding: List[float]):
 50:         """Save embedding to KV cache"""
 51:         if not self.kv_cache:
 52:             return
 53:         
 54:         try:
 55:             cache_key = self._get_cache_key(text)
 56:             # Cache for 7 days
 57:             self.kv_cache.put(cache_key, json.dumps(embedding), expiration_ttl=604800)
 58:         except Exception:
 59:             pass
 60:     
 61:     def embed(self, text: str) -> List[float]:
 62:         """Generate embedding for single text"""
 63:         # Check cache first
 64:         cached = self._get_from_cache(text)
 65:         if cached:
 66:             return cached
 67:         
 68:         # Call Mistral API
 69:         with httpx.Client() as client:
 70:             response = client.post(
 71:                 self.base_url,
 72:                 headers=self.headers,
 73:                 json={
 74:                     "model": self.model,
 75:                     "input": [text]
 76:                 },
 77:                 timeout=30.0
 78:             )
 79:             response.raise_for_status()
 80:             
 81:             data = response.json()
 82:             embedding = data['data'][0]['embedding']
 83:             
 84:             # Save to cache
 85:             self._save_to_cache(text, embedding)
 86:             
 87:             return embedding
 88:     
 89:     def embed_batch(self, texts: List[str]) -> List[List[float]]:
 90:         """Generate embeddings for multiple texts (batch)"""
 91:         embeddings = []
 92:         uncached_texts = []
 93:         uncached_indices = []
 94:         
 95:         # Check cache for each text
 96:         for i, text in enumerate(texts):
 97:             cached = self._get_from_cache(text)
 98:             if cached:
 99:                 embeddings.append(cached)
100:             else:
101:                 embeddings.append(None)
102:                 uncached_texts.append(text)
103:                 uncached_indices.append(i)
104:         
105:         # Batch call for uncached texts
106:         if uncached_texts:
107:             with httpx.Client() as client:
108:                 response = client.post(
109:                     self.base_url,
110:                     headers=self.headers,
111:                     json={
112:                         "model": self.model,
113:                         "input": uncached_texts
114:                     },
115:                     timeout=60.0
116:                 )
117:                 response.raise_for_status()
118:                 
119:                 data = response.json()
120:                 
121:                 # Fill in uncached embeddings and save to cache
122:                 for i, emb_data in enumerate(data['data']):
123:                     embedding = emb_data['embedding']
124:                     idx = uncached_indices[i]
125:                     embeddings[idx] = embedding
126:                     self._save_to_cache(uncached_texts[i], embedding)
127:         
128:         return embeddings
129: 
130: 
131: def get_embeddings_client(kv_cache=None) -> MistralEmbeddings:
132:     """Get Mistral embeddings client"""
133:     return MistralEmbeddings(kv_cache=kv_cache)
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
 32: Твой стиль:
 33: - Профессиональный, но дружелюбный
 34: - Краткие и точные ответы
 35: - Используешь эмодзи умеренно
 36: - Всегда объясняешь технические детали простым языком`,
 37:       
 38:       client: `Ты — Гермес в режиме помощи клиенту.
 39: Фокус: помощь в создании сделки, объяснение условий, защита интересов клиента.`,
 40:       
 41:       creator: `Ты — Гермес в режиме помощи исполнителю.
 42: Фокус: помощь в выполнении заказа, проверка требований, защита от недобросовестных заказчиков.`
 43:     };
 44:     
 45:     return prompts[persona] || prompts.hermes;
 46:   }
 47:   
 48:   getSessionHistory(sessionId, limit = 10) {
 49:     if (!this.sessions.has(sessionId)) {
 50:       this.sessions.set(sessionId, []);
 51:     }
 52:     const history = this.sessions.get(sessionId);
 53:     return history.slice(-limit);
 54:   }
 55:   
 56:   addToSession(sessionId, role, content) {
 57:     if (!this.sessions.has(sessionId)) {
 58:       this.sessions.set(sessionId, []);
 59:     }
 60:     this.sessions.get(sessionId).push({
 61:       role,
 62:       content,
 63:       timestamp: new Date().toISOString()
 64:     });
 65:   }
 66:   
 67:   async buildContext(query, userId, sessionId) {
 68:     const contextParts = [];
 69:     
 70:     // Search codebase
 71:     const codebaseResults = await this.rag.searchCodebase(query, 3);
 72:     if (codebaseResults.length > 0) {
 73:       contextParts.push('📚 Релевантный код из базы:');
 74:       codebaseResults.forEach((result, i) => {
 75:         const filepath = result.filepath || 'unknown';
 76:         const text = (result.text || '').substring(0, 500);
 77:         const similarity = result.$similarity || 0;
 78:         contextParts.push(`\n${i + 1}. ${filepath} (similarity: ${similarity.toFixed(2)})\n\`\`\`\n${text}\n\`\`\``);
 79:       });
 80:     }
 81:     
 82:     // Search memory
 83:     const memoryResults = await this.rag.searchMemory(query, userId, 2);
 84:     if (memoryResults.length > 0) {
 85:       contextParts.push('\n\n🧠 Из долгосрочной памяти:');
 86:       memoryResults.forEach((result, i) => {
 87:         const content = result.content || '';
 88:         const timestamp = result.timestamp || '';
 89:         contextParts.push(`\n${i + 1}. [${timestamp}] ${content}`);
 90:       });
 91:     }
 92:     
 93:     return contextParts.join('');
 94:   }
 95:   
 96:   async chat(message, userId, sessionId, persona = 'hermes', imageUrl = null, useRag = true) {
 97:     // Moderate content
 98:     const moderation = moderateContent(message);
 99:     if (!moderation.safe) {
100:       return {
101:         response: `⚠️ Сообщение заблокировано: ${moderation.reason}`,
102:         blocked: true,
103:         reason: moderation.reason
104:       };
105:     }
106:     
107:     // Build context
108:     let context = '';
109:     if (useRag) {
110:       context = await this.buildContext(message, userId, sessionId);
111:     }
112:     
113:     // Get history
114:     const history = this.getSessionHistory(sessionId);
115:     
116:     // Build messages
117:     const messages = [
118:       { role: 'system', content: this.getSystemPrompt(persona) }
119:     ];
120:     
121:     if (context) {
122:       messages.push({
123:         role: 'system',
124:         content: `Контекст для ответа:\n${context}`
125:       });
126:     }
127:     
128:     // Add history
129:     history.forEach(msg => {
130:       messages.push({
131:         role: msg.role,
132:         content: msg.content
133:       });
134:     });
135:     
136:     // Add current message
137:     if (imageUrl) {
138:       messages.push({
139:         role: 'user',
140:         content: [
141:           { type: 'text', text: message },
142:           { type: 'image_url', image_url: { url: imageUrl } }
143:         ]
144:       });
145:     } else {
146:       messages.push({
147:         role: 'user',
148:         content: message
149:       });
150:     }
151:     
152:     // Call Mistral API
153:     try {
154:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
155:         method: 'POST',
156:         headers: {
157:           'Authorization': `Bearer ${this.apiKey}`,
158:           'Content-Type': 'application/json'
159:         },
160:         body: JSON.stringify({
161:           model: this.model,
162:           messages,
163:           temperature: 0.7,
164:           max_tokens: 2000
165:         })
166:       });
167:       
168:       if (!response.ok) {
169:         throw new Error(`Mistral API error: ${response.status}`);
170:       }
171:       
172:       const data = await response.json();
173:       const assistantMessage = data.choices[0].message.content;
174:       
175:       // Add to session
176:       this.addToSession(sessionId, 'user', message);
177:       this.addToSession(sessionId, 'assistant', assistantMessage);
178:       
179:       // Save to memory (substantial messages only)
180:       if (message.length > 50) {
181:         await this.rag.addMemory(
182:           userId,
183:           sessionId,
184:           `User: ${message}\nHermes: ${assistantMessage}`,
185:           'conversation'
186:         );
187:       }
188:       
189:       return {
190:         response: assistantMessage,
191:         blocked: false,
192:         context_used: !!context,
193:         tokens_used: data.usage?.total_tokens || 0
194:       };
195:       
196:     } catch (error) {
197:       return {
198:         response: `❌ Ошибка: ${error.message}`,
199:         error: true,
200:         error_message: error.message
201:       };
202:     }
203:   }
204:   
205:   async analyzeImage(imageUrl, prompt, userId, sessionId) {
206:     return this.chat(prompt, userId, sessionId, 'hermes', imageUrl, false);
207:   }
208:   
209:   async getSessionSummary(sessionId) {
210:     const history = this.getSessionHistory(sessionId, 100);
211:     
212:     if (history.length === 0) {
213:       return 'Нет истории сессии';
214:     }
215:     
216:     const conversation = history.map(msg => `${msg.role}: ${msg.content}`).join('\n');
217:     
218:     const messages = [
219:       {
220:         role: 'system',
221:         content: 'Создай краткое резюме этого разговора (2-3 предложения).'
222:       },
223:       {
224:         role: 'user',
225:         content: conversation
226:       }
227:     ];
228:     
229:     try {
230:       const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
231:         method: 'POST',
232:         headers: {
233:           'Authorization': `Bearer ${this.apiKey}`,
234:           'Content-Type': 'application/json'
235:         },
236:         body: JSON.stringify({
237:           model: this.model,
238:           messages,
239:           temperature: 0.5,
240:           max_tokens: 200
241:         })
242:       });
243:       
244:       const data = await response.json();
245:       return data.choices[0].message.content;
246:       
247:     } catch (error) {
248:       return `Ошибка создания резюме: ${error.message}`;
249:     }
250:   }
251:   
252:   clearSession(sessionId) {
253:     this.sessions.delete(sessionId);
254:   }
255: }
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
  4:  */
  5: 
  6: import { HermesAgent } from './hermes.js';
  7: import { HermesRAG } from './rag.js';
  8: 
  9: export default {
 10:   async fetch(request, env, ctx) {
 11:     const url = new URL(request.url);
 12:     
 13:     // CORS headers
 14:     const corsHeaders = {
 15:       'Access-Control-Allow-Origin': '*',
 16:       'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
 17:       'Access-Control-Allow-Headers': 'Content-Type',
 18:     };
 19:     
 20:     if (request.method === 'OPTIONS') {
 21:       return new Response(null, { headers: corsHeaders });
 22:     }
 23:     
 24:     try {
 25:       // Health check
 26:       if (url.pathname === '/health') {
 27:         const rag = new HermesRAG(env.CACHE, env);
 28:         const stats = await rag.getStats();
 29:         
 30:         return new Response(JSON.stringify({
 31:           status: 'healthy',
 32:           service: 'hermes-neuroescrow',
 33:           version: '1.0.0',
 34:           stats
 35:         }), {
 36:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 37:         });
 38:       }
 39:       
 40:       // Chat endpoint
 41:       if (url.pathname === '/chat' && request.method === 'POST') {
 42:         const data = await request.json();
 43:         const { message, user_id = 'anonymous', session_id = 'default', persona = 'hermes' } = data;
 44:         
 45:         if (!message) {
 46:           return new Response(JSON.stringify({ error: 'Message is required' }), {
 47:             status: 400,
 48:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 49:           });
 50:         }
 51:         
 52:         const hermes = new HermesAgent(env.CACHE, env);
 53:         const result = await hermes.chat(message, user_id, session_id, persona);
 54:         
 55:         return new Response(JSON.stringify(result), {
 56:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 57:         });
 58:       }
 59:       
 60:       // Image analysis
 61:       if (url.pathname === '/analyze-image' && request.method === 'POST') {
 62:         const data = await request.json();
 63:         const { image_url, prompt = 'Опиши это изображение', user_id = 'anonymous', session_id = 'default' } = data;
 64:         
 65:         if (!image_url) {
 66:           return new Response(JSON.stringify({ error: 'image_url is required' }), {
 67:             status: 400,
 68:             headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 69:           });
 70:         }
 71:         
 72:         const hermes = new HermesAgent(env.CACHE, env);
 73:         const result = await hermes.analyzeImage(image_url, prompt, user_id, session_id);
 74:         
 75:         return new Response(JSON.stringify(result), {
 76:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 77:         });
 78:       }
 79:       
 80:       // Stats
 81:       if (url.pathname === '/stats') {
 82:         const rag = new HermesRAG(env.CACHE, env);
 83:         const stats = await rag.getStats();
 84:         
 85:         return new Response(JSON.stringify(stats), {
 86:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 87:         });
 88:       }
 89:       
 90:       // Sessions list
 91:       if (url.pathname === '/sessions') {
 92:         // TODO: Implement sessions storage in KV
 93:         return new Response(JSON.stringify([]), {
 94:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 95:         });
 96:       }
 97:       
 98:       // Load session
 99:       if (url.pathname.startsWith('/session/') && request.method === 'GET') {
100:         const sessionId = url.pathname.split('/')[2];
101:         // TODO: Load from KV
102:         return new Response(JSON.stringify({ messages: [] }), {
103:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
104:         });
105:       }
106:       
107:       // Create session
108:       if (url.pathname === '/session' && request.method === 'POST') {
109:         const data = await request.json();
110:         const sessionId = crypto.randomUUID();
111:         // TODO: Save to KV
112:         return new Response(JSON.stringify({ session_id: sessionId }), {
113:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
114:         });
115:       }
116:       
117:       // Delete session
118:       if (url.pathname.startsWith('/session/') && request.method === 'DELETE') {
119:         const sessionId = url.pathname.split('/')[2];
120:         // TODO: Delete from KV
121:         return new Response(JSON.stringify({ ok: true }), {
122:           headers: { ...corsHeaders, 'Content-Type': 'application/json' }
123:         });
124:       }
125:       
126:       return new Response(JSON.stringify({ error: 'Not found' }), {
127:         status: 404,
128:         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
129:       });
130:       
131:     } catch (error) {
132:       return new Response(JSON.stringify({ error: error.message }), {
133:         status: 500,
134:         headers: { ...corsHeaders, 'Content-Type': 'application/json' }
135:       });
136:     }
137:   }
138: };
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
 44:     os.environ['EMBEDDING_MODEL'] = env.get('EMBEDDING_MODEL', 'codestral-embed-2505')
 45:     
 46:     # Get KV cache
 47:     kv_cache = env.get('CACHE')
 48:     
 49:     # Route handling
 50:     if request.method == "GET" and "/health" in request.url:
 51:         return await handle_health(kv_cache)
 52:     
 53:     elif request.method == "POST" and "/chat" in request.url:
 54:         return await handle_chat(request, kv_cache)
 55:     
 56:     elif request.method == "POST" and "/analyze-image" in request.url:
 57:         return await handle_analyze_image(request, kv_cache)
 58:     
 59:     elif request.method == "GET" and "/stats" in request.url:
 60:         return await handle_stats(kv_cache)
 61:     
 62:     elif request.method == "POST" and "/webhook" in request.url:
 63:         return await handle_telegram_webhook(request, kv_cache)
 64:     
 65:     else:
 66:         return Response(
 67:             json.dumps({"error": "Not found"}),
 68:             status=404
 69:         )
 70: 
 71: 
 72: async def handle_health(kv_cache) -> Response:
 73:     """Health check endpoint"""
 74:     try:
 75:         rag_system = rag.get_rag_system(kv_cache)
 76:         stats = rag_system.get_stats()
 77:         
 78:         return Response(json.dumps({
 79:             "status": "healthy",
 80:             "service": "hermes-neuroescrow",
 81:             "version": "1.0.0",
 82:             "stats": stats
 83:         }))
 84:     except Exception as e:
 85:         return Response(
 86:             json.dumps({
 87:                 "status": "unhealthy",
 88:                 "error": str(e)
 89:             }),
 90:             status=500
 91:         )
 92: 
 93: 
 94: async def handle_chat(request: Request, kv_cache) -> Response:
 95:     """Chat endpoint"""
 96:     try:
 97:         data = await request.json()
 98:         
 99:         message = data.get('message', '')
100:         user_id = data.get('user_id', 'anonymous')
101:         session_id = data.get('session_id', 'default')
102:         persona = data.get('persona', 'hermes')
103:         
104:         if not message:
105:             return Response(
106:                 json.dumps({"error": "Message is required"}),
107:                 status=400
108:             )
109:         
110:         # Get Hermes agent
111:         hermes_agent = hermes.get_hermes_agent(kv_cache)
112:         
113:         # Process message
114:         result = hermes_agent.chat(
115:             message=message,
116:             user_id=user_id,
117:             session_id=session_id,
118:             persona=persona
119:         )
120:         
121:         return Response(json.dumps(result))
122:     
123:     except Exception as e:
124:         return Response(
125:             json.dumps({"error": str(e)}),
126:             status=500
127:         )
128: 
129: 
130: async def handle_analyze_image(request: Request, kv_cache) -> Response:
131:     """Image analysis endpoint"""
132:     try:
133:         data = await request.json()
134:         
135:         image_url = data.get('image_url', '')
136:         prompt = data.get('prompt', 'Опиши это изображение')
137:         user_id = data.get('user_id', 'anonymous')
138:         session_id = data.get('session_id', 'default')
139:         
140:         if not image_url:
141:             return Response(
142:                 json.dumps({"error": "image_url is required"}),
143:                 status=400
144:             )
145:         
146:         # Get Hermes agent
147:         hermes_agent = hermes.get_hermes_agent(kv_cache)
148:         
149:         # Analyze image
150:         result = hermes_agent.analyze_image(
151:             image_url=image_url,
152:             prompt=prompt,
153:             user_id=user_id,
154:             session_id=session_id
155:         )
156:         
157:         return Response(json.dumps(result))
158:     
159:     except Exception as e:
160:         return Response(
161:             json.dumps({"error": str(e)}),
162:             status=500
163:         )
164: 
165: 
166: async def handle_stats(kv_cache) -> Response:
167:     """Stats endpoint"""
168:     try:
169:         rag_system = rag.get_rag_system(kv_cache)
170:         stats = rag_system.get_stats()
171:         
172:         return Response(json.dumps(stats))
173:     
174:     except Exception as e:
175:         return Response(
176:             json.dumps({"error": str(e)}),
177:             status=500
178:         )
179: 
180: 
181: async def handle_telegram_webhook(request: Request, kv_cache) -> Response:
182:     """Telegram webhook handler"""
183:     try:
184:         data = await request.json()
185:         
186:         # Extract message from Telegram update
187:         message = data.get('message', {})
188:         text = message.get('text', '')
189:         user_id = str(message.get('from', {}).get('id', 'unknown'))
190:         chat_id = message.get('chat', {}).get('id')
191:         
192:         if not text or not chat_id:
193:             return Response(json.dumps({"ok": True}))
194:         
195:         # Get Hermes agent
196:         hermes_agent = hermes.get_hermes_agent(kv_cache)
197:         
198:         # Process message
199:         result = hermes_agent.chat(
200:             message=text,
201:             user_id=user_id,
202:             session_id=f"tg_{chat_id}"
203:         )
204:         
205:         # Send response back to Telegram
206:         # TODO: Implement Telegram API call to send message
207:         
208:         return Response(json.dumps({"ok": True}))
209:     
210:     except Exception as e:
211:         return Response(
212:             json.dumps({"error": str(e)}),
213:             status=500
214:         )
215: 
216: 
217: # Cloudflare Workers entry point
218: async def on_fetch(request, env):
219:     """Workers fetch handler"""
220:     return await handle_request(request, env)
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
 3:  * Uses Mistral Codestral Embed + AstraDB
 4:  */
 5: 
 6: import { MistralEmbeddings } from './embeddings.js';
 7: import { AstraDBConnector } from './astra.js';
 8: 
 9: export class HermesRAG {
10:   constructor(kvCache, env) {
11:     this.embeddings = new MistralEmbeddings(kvCache, env);
12:     this.astra = new AstraDBConnector(env);
13:     this.chunkSize = 2000;
14:     this.chunkOverlap = 700;
15:   }
16:   
17:   async searchCodebase(query, limit = 4, language = null, filename = null) {
18:     const queryEmbedding = await this.embeddings.embed(query);
19:     
20:     const filter = {};
21:     if (language) filter.language = language;
22:     if (filename) filter.filename = filename;
23:     
24:     return await this.astra.vectorSearch(
25:       this.astra.CODEBASE_COLLECTION,
26:       queryEmbedding,
27:       limit,
28:       Object.keys(filter).length > 0 ? filter : null,
29:       true
30:     );
31:   }
32:   
33:   async addMemory(userId, sessionId, content, memoryType = 'conversation') {
34:     const embedding = await this.embeddings.embed(content);
35:     
36:     const document = {
37:       user_id: userId,
38:       session_id: sessionId,
39:       content,
40:       memory_type: memoryType,
41:       timestamp: new Date().toISOString()
42:     };
43:     
44:     return await this.astra.insertDocument(
45:       this.astra.MEMORY_COLLECTION,
46:       document,
47:       embedding
48:     );
49:   }
50:   
51:   async searchMemory(query, userId = null, limit = 3) {
52:     const queryEmbedding = await this.embeddings.embed(query);
53:     
54:     const filter = {};
55:     if (userId) filter.user_id = userId;
56:     
57:     return await this.astra.vectorSearch(
58:       this.astra.MEMORY_COLLECTION,
59:       queryEmbedding,
60:       limit,
61:       Object.keys(filter).length > 0 ? filter : null
62:     );
63:   }
64:   
65:   async getStats() {
66:     return {
67:       codebase: await this.astra.getStats(this.astra.CODEBASE_COLLECTION),
68:       memory: await this.astra.getStats(this.astra.MEMORY_COLLECTION)
69:     };
70:   }
71: }
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
 20:         # Chunking parameters (2026 best practices for codestral-embed-2505)
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
 32:     height: 100%;
 33:     overflow: hidden;
 34: }
 35: 
 36: #app {
 37:     display: flex;
 38:     flex-direction: column;
 39:     height: 100vh;
 40:     height: 100dvh;
 41: }
 42: 
 43: /* Header */
 44: .app-header {
 45:     background: var(--ne-black);
 46:     border-bottom: 1px solid var(--ne-border);
 47:     padding: var(--ne-spacing-md) var(--ne-spacing-lg);
 48:     flex-shrink: 0;
 49: }
 50: 
 51: .header-content {
 52:     display: flex;
 53:     justify-content: space-between;
 54:     align-items: center;
 55: }
 56: 
 57: .app-header h1 {
 58:     font-size: 18px;
 59:     font-weight: 600;
 60:     color: var(--ne-white);
 61:     letter-spacing: -0.5px;
 62: }
 63: 
 64: .user-info {
 65:     font-size: 13px;
 66:     color: var(--ne-light-gray);
 67: }
 68: 
 69: /* Main Content */
 70: .app-main {
 71:     flex: 1;
 72:     overflow-y: auto;
 73:     overflow-x: hidden;
 74:     padding: var(--ne-spacing-lg);
 75:     padding-bottom: 80px;
 76:     -webkit-overflow-scrolling: touch;
 77: }
 78: 
 79: /* Voice Interface (Main Screen) */
 80: .voice-interface {
 81:     display: flex;
 82:     flex-direction: column;
 83:     align-items: center;
 84:     justify-content: center;
 85:     min-height: 60vh;
 86:     text-align: center;
 87: }
 88: 
 89: .voice-button {
 90:     width: 120px;
 91:     height: 120px;
 92:     border-radius: 50%;
 93:     background: var(--ne-dark-gray);
 94:     border: 2px solid var(--ne-border);
 95:     display: flex;
 96:     align-items: center;
 97:     justify-content: center;
 98:     cursor: pointer;
 99:     transition: all 0.3s ease;
100:     margin-bottom: var(--ne-spacing-xl);
101:     position: relative;
102: }
103: 
104: .voice-button::before {
105:     content: '';
106:     position: absolute;
107:     width: 100%;
108:     height: 100%;
109:     border-radius: 50%;
110:     border: 2px solid var(--ne-white);
111:     opacity: 0;
112:     transition: opacity 0.3s ease;
113: }
114: 
115: .voice-button:active {
116:     transform: scale(0.95);
117: }
118: 
119: .voice-button.recording {
120:     border-color: var(--ne-white);
121:     animation: pulse 1.5s ease-in-out infinite;
122: }
123: 
124: .voice-button.recording::before {
125:     opacity: 0.3;
126:     animation: ripple 1.5s ease-out infinite;
127: }
128: 
129: @keyframes pulse {
130:     0%, 100% { transform: scale(1); }
131:     50% { transform: scale(1.05); }
132: }
133: 
134: @keyframes ripple {
135:     0% {
136:         transform: scale(1);
137:         opacity: 0.3;
138:     }
139:     100% {
140:         transform: scale(1.4);
141:         opacity: 0;
142:     }
143: }
144: 
145: .voice-icon {
146:     font-size: 48px;
147: }
148: 
149: .voice-hint {
150:     font-size: 14px;
151:     color: var(--ne-light-gray);
152:     margin-top: var(--ne-spacing-md);
153: }
154: 
155: .voice-status {
156:     font-size: 13px;
157:     color: var(--ne-white);
158:     margin-top: var(--ne-spacing-sm);
159:     min-height: 20px;
160: }
161: 
162: /* Bottom Navigation */
163: .bottom-nav {
164:     position: fixed;
165:     bottom: 0;
166:     left: 0;
167:     right: 0;
168:     display: flex;
169:     justify-content: space-around;
170:     background: var(--ne-black);
171:     border-top: 1px solid var(--ne-border);
172:     padding: var(--ne-spacing-sm) 0 calc(var(--ne-spacing-sm) + env(safe-area-inset-bottom));
173: }
174: 
175: .nav-btn {
176:     display: flex;
177:     flex-direction: column;
178:     align-items: center;
179:     gap: 2px;
180:     padding: var(--ne-spacing-xs) var(--ne-spacing-lg);
181:     border: none;
182:     background: none;
183:     color: var(--ne-light-gray);
184:     font-size: 11px;
185:     cursor: pointer;
186:     transition: color 0.2s;
187: }
188: 
189: .nav-btn.active {
190:     color: var(--ne-white);
191: }
192: 
193: .nav-icon {
194:     font-size: 22px;
195:     line-height: 1;
196: }
197: 
198: .nav-label {
199:     font-weight: 500;
200: }
201: 
202: /* Cards */
203: .card {
204:     background: var(--ne-dark-gray);
205:     border: 1px solid var(--ne-border);
206:     border-radius: 8px;
207:     padding: var(--ne-spacing-lg);
208:     margin-bottom: var(--ne-spacing-md);
209: }
210: 
211: .draft-card {
212:     background: rgba(255, 255, 255, 0.03);
213:     border-left-width: 3px;
214: }
215: 
216: .card-title {
217:     font-size: 15px;
218:     font-weight: 600;
219:     margin-bottom: var(--ne-spacing-sm);
220:     color: var(--ne-white);
221: }
222: 
223: .card-subtitle {
224:     font-size: 13px;
225:     color: var(--ne-light-gray);
226:     margin-bottom: var(--ne-spacing-md);
227: }
228: 
229: /* Buttons */
230: .btn {
231:     display: inline-flex;
232:     align-items: center;
233:     justify-content: center;
234:     gap: 6px;
235:     padding: 10px 20px;
236:     border-radius: 6px;
237:     border: 1px solid var(--ne-border);
238:     font-size: 14px;
239:     font-weight: 500;
240:     cursor: pointer;
241:     transition: all 0.2s;
242:     width: 100%;
243:     background: var(--ne-dark-gray);
244:     color: var(--ne-white);
245: }
246: 
247: .btn:active {
248:     transform: scale(0.98);
249: }
250: 
251: .btn-primary {
252:     background: var(--ne-white);
253:     color: var(--ne-black);
254:     border-color: var(--ne-white);
255: }
256: 
257: .btn-secondary {
258:     background: var(--ne-dark-gray);
259:     color: var(--ne-white);
260:     border-color: var(--ne-border);
261: }
262: 
263: .btn-success {
264:     background: var(--ne-white);
265:     color: var(--ne-black);
266:     border-color: var(--ne-white);
267: }
268: 
269: /* Forms */
270: .form-group {
271:     margin-bottom: var(--ne-spacing-lg);
272: }
273: 
274: .form-label {
275:     display: block;
276:     font-size: 13px;
277:     font-weight: 500;
278:     color: var(--ne-light-gray);
279:     margin-bottom: var(--ne-spacing-sm);
280:     text-transform: uppercase;
281:     letter-spacing: 0.5px;
282: }
283: 
284: .form-input {
285:     width: 100%;
286:     padding: 12px 14px;
287:     border-radius: 6px;
288:     border: 1px solid var(--ne-border);
289:     background: var(--ne-dark-gray);
290:     color: var(--ne-white);
291:     font-size: 14px;
292:     outline: none;
293:     transition: border-color 0.2s;
294: }
295: 
296: .form-input:focus {
297:     border-color: var(--ne-light-gray);
298: }
299: 
300: /* Empty State */
301: .empty-state {
302:     text-align: center;
303:     padding: 48px 24px;
304:     color: var(--ne-light-gray);
305: }
306: 
307: .empty-icon {
308:     font-size: 48px;
309:     margin-bottom: var(--ne-spacing-md);
310:     opacity: 0.5;
311: }
312: 
313: .empty-text {
314:     font-size: 14px;
315: }
316: 
317: /* Scrollbar */
318: ::-webkit-scrollbar {
319:     width: 4px;
320: }
321: 
322: ::-webkit-scrollbar-track {
323:     background: transparent;
324: }
325: 
326: ::-webkit-scrollbar-thumb {
327:     background: var(--ne-light-gray);
328:     border-radius: 2px;
329: }
330: 
331: /* Animations */
332: @keyframes fadeIn {
333:     from { opacity: 0; transform: translateY(8px); }
334:     to { opacity: 1; transform: translateY(0); }
335: }
336: 
337: .view {
338:     animation: fadeIn 0.25s ease-out;
339: }
340: 
341: /* Chat Interface */
342: .chat-messages {
343:     display: flex;
344:     flex-direction: column;
345:     gap: var(--ne-spacing-md);
346:     padding: var(--ne-spacing-lg) 0;
347:     max-height: 50vh;
348:     overflow-y: auto;
349: }
350: 
351: .chat-message {
352:     display: flex;
353:     flex-direction: column;
354:     gap: 4px;
355:     animation: fadeIn 0.3s ease-out;
356: }
357: 
358: .chat-message.user {
359:     align-items: flex-end;
360: }
361: 
362: .chat-message.hermes {
363:     align-items: flex-start;
364: }
365: 
366: .chat-message.system {
367:     align-items: center;
368: }
369: 
370: .message-bubble {
371:     max-width: 75%;
372:     padding: 10px 14px;
373:     border-radius: 16px;
374:     font-size: 14px;
375:     line-height: 1.4;
376:     word-wrap: break-word;
377: }
378: 
379: .chat-message.user .message-bubble {
380:     background: var(--ne-white);
381:     color: var(--ne-black);
382:     border-bottom-right-radius: 4px;
383: }
384: 
385: .chat-message.hermes .message-bubble {
386:     background: var(--ne-dark-gray);
387:     color: var(--ne-white);
388:     border: 1px solid var(--ne-border);
389:     border-bottom-left-radius: 4px;
390: }
391: 
392: .chat-message.system .message-bubble {
393:     background: rgba(255, 255, 255, 0.05);
394:     color: var(--ne-light-gray);
395:     border: 1px solid var(--ne-border);
396:     border-radius: 12px;
397:     font-size: 12px;
398:     text-align: center;
399: }
400: 
401: .message-time {
402:     font-size: 11px;
403:     color: var(--ne-light-gray);
404:     padding: 0 8px;
405: }
406: 
407: .message-media {
408:     max-width: 75%;
409:     border-radius: 12px;
410:     overflow: hidden;
411:     border: 1px solid var(--ne-border);
412: }
413: 
414: .message-media img,
415: .message-media video {
416:     width: 100%;
417:     display: block;
418: }
419: 
420: /* Chat Input Container */
421: .chat-input-container {
422:     position: fixed;
423:     bottom: 60px;
424:     left: 0;
425:     right: 0;
426:     background: var(--ne-black);
427:     border-top: 1px solid var(--ne-border);
428:     padding: var(--ne-spacing-sm) var(--ne-spacing-lg);
429:     display: flex;
430:     align-items: center;
431:     gap: var(--ne-spacing-sm);
432:     z-index: 100;
433: }
434: 
435: .attach-btn,
436: .send-btn {
437:     width: 36px;
438:     height: 36px;
439:     border-radius: 50%;
440:     border: 1px solid var(--ne-border);
441:     background: var(--ne-dark-gray);
442:     color: var(--ne-white);
443:     display: flex;
444:     align-items: center;
445:     justify-content: center;
446:     cursor: pointer;
447:     transition: all 0.2s;
448:     font-size: 18px;
449:     flex-shrink: 0;
450: }
451: 
452: .attach-btn:active,
453: .send-btn:active {
454:     transform: scale(0.9);
455: }
456: 
457: .send-btn {
458:     background: var(--ne-white);
459:     color: var(--ne-black);
460:     border-color: var(--ne-white);
461: }
462: 
463: .chat-input {
464:     flex: 1;
465:     padding: 10px 14px;
466:     border-radius: 18px;
467:     border: 1px solid var(--ne-border);
468:     background: var(--ne-dark-gray);
469:     color: var(--ne-white);
470:     font-size: 14px;
471:     outline: none;
472:     transition: border-color 0.2s;
473: }
474: 
475: .chat-input:focus {
476:     border-color: var(--ne-light-gray);
477: }
478: 
479: /* Attach Menu */
480: .attach-menu {
481:     position: fixed;
482:     bottom: 100px;
483:     left: var(--ne-spacing-lg);
484:     right: var(--ne-spacing-lg);
485:     background: var(--ne-dark-gray);
486:     border: 1px solid var(--ne-border);
487:     border-radius: 12px;
488:     padding: var(--ne-spacing-sm);
489:     display: grid;
490:     grid-template-columns: repeat(2, 1fr);
491:     gap: var(--ne-spacing-sm);
492:     z-index: 101;
493:     animation: fadeIn 0.2s ease-out;
494: }
495: 
496: .attach-option {
497:     display: flex;
498:     flex-direction: column;
499:     align-items: center;
500:     gap: 6px;
501:     padding: var(--ne-spacing-lg);
502:     border-radius: 8px;
503:     border: 1px solid var(--ne-border);
504:     background: var(--ne-black);
505:     color: var(--ne-white);
506:     font-size: 12px;
507:     cursor: pointer;
508:     transition: all 0.2s;
509: }
510: 
511: .attach-option:active {
512:     transform: scale(0.95);
513: }
514: 
515: .attach-icon {
516:     font-size: 28px;
517: }
518: 
519: /* Video Recording Interface */
520: .video-recording {
521:     position: fixed;
522:     top: 0;
523:     left: 0;
524:     right: 0;
525:     bottom: 0;
526:     background: var(--ne-black);
527:     z-index: 200;
528:     display: flex;
529:     flex-direction: column;
530: }
531: 
532: .video-preview {
533:     flex: 1;
534:     position: relative;
535:     background: var(--ne-black);
536: }
537: 
538: .video-preview video {
539:     width: 100%;
540:     height: 100%;
541:     object-fit: cover;
542: }
543: 
544: .video-controls {
545:     position: absolute;
546:     bottom: 0;
547:     left: 0;
548:     right: 0;
549:     padding: var(--ne-spacing-xl);
550:     display: flex;
551:     justify-content: center;
552:     align-items: center;
553:     gap: var(--ne-spacing-lg);
554:     background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
555: }
556: 
557: .video-record-btn {
558:     width: 64px;
559:     height: 64px;
560:     border-radius: 50%;
561:     border: 4px solid var(--ne-white);
562:     background: transparent;
563:     cursor: pointer;
564:     transition: all 0.2s;
565: }
566: 
567: .video-record-btn.recording {
568:     background: #ff0000;
569:     border-radius: 12px;
570: }
571: 
572: .camera-switch-btn {
573:     width: 48px;
574:     height: 48px;
575:     border-radius: 50%;
576:     border: 1px solid var(--ne-border);
577:     background: rgba(0,0,0,0.5);
578:     color: var(--ne-white);
579:     font-size: 24px;
580:     cursor: pointer;
581:     display: flex;
582:     align-items: center;
583:     justify-content: center;
584: }
585: 
586: /* Responsive */
587: @media (min-width: 768px) {
588:     .app-main {
589:         max-width: 600px;
590:         margin: 0 auto;
591:     }
592:     
593:     .chat-input-container {
594:         max-width: 600px;
595:         left: 50%;
596:         transform: translateX(-50%);
597:     }
598:     
599:     .attach-menu {
600:         max-width: 568px;
601:         left: 50%;
602:         transform: translateX(-50%);
603:     }
604: }
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
11: </head>
12: <body>
13:     <div id="app">
14:         <!-- Header -->
15:         <header class="app-header">
16:             <div class="header-content">
17:                 <h1>NeuroEscrow</h1>
18:                 <div class="user-info">
19:                     <span id="user-name">Загрузка...</span>
20:                 </div>
21:             </div>
22:         </header>
23: 
24:         <!-- Main Content -->
25:         <main class="app-main" id="main-content">
26:             <!-- Views will be rendered here -->
27:         </main>
28: 
29:         <!-- Chat Input (Fixed at bottom, only visible on Hermes tab) -->
30:         <div class="chat-input-container" id="chat-input-container" style="display:none;">
31:             <button class="attach-btn" id="attach-btn" onclick="app.showAttachMenu()">
32:                 <span>📎</span>
33:             </button>
34:             <input type="text" class="chat-input" id="chat-input" placeholder="Напишите сообщение..." />
35:             <button class="send-btn" id="send-btn" onclick="app.sendTextMessage()">
36:                 <span>➤</span>
37:             </button>
38:         </div>
39: 
40:         <!-- Attach Menu -->
41:         <div class="attach-menu" id="attach-menu" style="display:none;">
42:             <button class="attach-option" onclick="app.attachPhoto()">
43:                 <span class="attach-icon">📷</span>
44:                 <span>Фото</span>
45:             </button>
46:             <button class="attach-option" onclick="app.attachVideo()">
47:                 <span class="attach-icon">🎥</span>
48:                 <span>Видео</span>
49:             </button>
50:             <button class="attach-option" onclick="app.recordVideo()">
51:                 <span class="attach-icon">📹</span>
52:                 <span>Записать видео</span>
53:             </button>
54:             <button class="attach-option" onclick="app.shareScreen()">
55:                 <span class="attach-icon">🖥️</span>
56:                 <span>Экран</span>
57:             </button>
58:         </div>
59: 
60:         <!-- Bottom Navigation -->
61:         <nav class="bottom-nav">
62:             <button class="nav-btn active" data-view="hermes" onclick="app.navigate('hermes')">
63:                 <span class="nav-icon">🎙️</span>
64:                 <span class="nav-label">Гермес</span>
65:             </button>
66:             <button class="nav-btn" data-view="deals" onclick="app.navigate('deals')">
67:                 <span class="nav-icon">🤝</span>
68:                 <span class="nav-label">Сделки</span>
69:             </button>
70:             <button class="nav-btn" data-view="profile" onclick="app.navigate('profile')">
71:                 <span class="nav-icon">👤</span>
72:                 <span class="nav-label">Профиль</span>
73:             </button>
74:         </nav>
75:     </div>
76: 
77:     <!-- Scripts -->
78:     <script src="js/telegram.js"></script>
79:     <script src="js/tonconnect.js"></script>
80:     <script src="js/charts.js"></script>
81:     <script src="js/app.js"></script>
82: </body>
83: </html>
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
 26:         this.userData = telegram.getUser();
 27:         this.updateHeader();
 28:         await this.loadCache();
 29:         this.navigate('hermes');
 30:         
 31:         window.addEventListener('ton:statusChange', (e) => {
 32:             this.onTonStatusChange(e.detail);
 33:         });
 34:         
 35:         this.requestDataFromBot();
 36:     }
 37: 
 38:     updateHeader() {
 39:         const nameEl = document.getElementById('user-name');
 40:         
 41:         if (this.userData) {
 42:             const name = this.userData.first_name || this.userData.username || 'Пользователь';
 43:             nameEl.textContent = name;
 44:         } else {
 45:             nameEl.textContent = 'Гость';
 46:         }
 47:     }
 48: 
 49:     navigate(view) {
 50:         // Reset voice state when switching tabs
 51:         if (view !== 'hermes' && this.voiceState !== 'IDLE') {
 52:             this.resetVoiceState();
 53:         }
 54:         
 55:         this.currentView = view;
 56:         
 57:         document.querySelectorAll('.nav-btn').forEach(btn => {
 58:             btn.classList.toggle('active', btn.dataset.view === view);
 59:         });
 60:         
 61:         const main = document.getElementById('main-content');
 62:         main.innerHTML = '';
 63:         
 64:         // Show/hide chat input based on view
 65:         const chatInput = document.getElementById('chat-input-container');
 66:         if (chatInput) {
 67:             chatInput.style.display = view === 'hermes' ? 'flex' : 'none';
 68:         }
 69:         
 70:         switch(view) {
 71:             case 'hermes':
 72:                 this.renderHermesView(main);
 73:                 break;
 74:             case 'deals':
 75:                 this.renderDealsView(main);
 76:                 break;
 77:             case 'profile':
 78:                 this.renderProfileView(main);
 79:                 break;
 80:         }
 81:         
 82:         telegram.haptic('light');
 83:     }
 84: 
 85:     // -------------------------------------------------------------------------
 86:     // Hermes View (Voice Interface - Main Screen)
 87:     // -------------------------------------------------------------------------
 88: 
 89:     renderHermesView(container) {
 90:         const view = document.createElement('div');
 91:         view.className = 'view';
 92:         
 93:         view.innerHTML = `
 94:             <div class="voice-interface">
 95:                 <button class="voice-button" id="voice-btn" onclick="app.toggleVoice()">
 96:                     <span class="voice-icon">🎙️</span>
 97:                 </button>
 98:                 <div style="font-size:16px;font-weight:600;margin-bottom:8px;">Гермес</div>
 99:                 <div class="voice-hint">Нажмите и говорите</div>
100:                 <div class="voice-status" id="voice-status"></div>
101:                 <div style="font-size:13px;color:var(--ne-light-gray);margin-top:24px;max-width:300px;">
102:                     Опишите задачу голосом. Гермес поможет сформулировать и найдёт подходящего нейрокодера.
103:                 </div>
104:             </div>
105:             <div class="chat-messages" id="chat-messages"></div>
106:         `;
107:         
108:         container.appendChild(view);
109:         this.renderChatMessages();
110:     }
111: 
112:     toggleVoice() {
113:         // Explicit protection against multiple taps during processing
114:         if (this.voiceState === 'PROCESSING' || this.isProcessing) {
115:             return;
116:         }
117:         
118:         if (this.voiceState === 'LISTENING') {
119:             this.stopVoiceRecording();
120:         } else {
121:             this.voiceState = 'LISTENING';
122:             this.updateVoiceButton();
123:             this.startVoiceRecording();
124:         }
125:         
126:         telegram.haptic('medium');
127:     }
128: 
129:     async startVoiceRecording() {
130:         try {
131:             // Try native Telegram voice recording (Bot API 9.6+)
132:             if (typeof tg.requestVoiceMessage === 'function') {
133:                 const result = await tg.requestVoiceMessage();
134:                 
135:                 if (result && result.file_id) {
136:                     this.sendVoiceToBot(result.file_id, result.duration);
137:                 } else {
138:                     throw new Error('No file_id received');
139:                 }
140:             } else {
141:                 // Fallback to manual recording
142:                 this.fallbackToManualRecording();
143:             }
144:         } catch (error) {
145:             console.error('[NeuroEscrow] Voice recording failed:', error);
146:             this.handleVoiceError(error);
147:         }
148:     }
149: 
150:     stopVoiceRecording() {
151:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
152:             this.mediaRecorder.stop();
153:         }
154:         this.resetVoiceState();
155:     }
156: 
157:     fallbackToManualRecording() {
158:         navigator.mediaDevices.getUserMedia({ audio: true })
159:             .then(stream => {
160:                 this.mediaRecorder = new MediaRecorder(stream);
161:                 this.audioChunks = [];
162:                 
163:                 this.mediaRecorder.ondataavailable = (e) => {
164:                     this.audioChunks.push(e.data);
165:                 };
166:                 
167:                 this.mediaRecorder.onstop = () => {
168:                     const audioBlob = new Blob(this.audioChunks, { type: 'audio/ogg' });
169:                     this.uploadVoiceBlob(audioBlob);
170:                     stream.getTracks().forEach(track => track.stop());
171:                 };
172:                 
173:                 this.mediaRecorder.start();
174:                 console.log('[NeuroEscrow] Fallback recording started');
175:             })
176:             .catch(error => {
177:                 this.handleVoiceError(error);
178:             });
179:     }
180: 
181:     uploadVoiceBlob(blob) {
182:         // This would require bot-side endpoint for blob upload
183:         // For now, just show error
184:         this.handleVoiceError(new Error('Manual recording not yet implemented'));
185:     }
186: 
187:     sendVoiceToBot(fileId, duration) {
188:         this.voiceState = 'PROCESSING';
189:         this.isProcessing = true;
190:         this.updateVoiceButton();
191:         this.setupResponseTimeout();
192:         
193:         const payload = {
194:             action: 'voice_message',
195:             file_id: fileId,
196:             duration: duration,
197:             timestamp: Date.now(),
198:             user_id: telegram.getUserId()
199:         };
200:         
201:         telegram.sendData(payload);
202:         console.log('[NeuroEscrow] Voice sent to bot:', fileId);
203:     }
204: 
205:     updateVoiceButton() {
206:         const btn = document.getElementById('voice-btn');
207:         const status = document.getElementById('voice-status');
208:         
209:         if (!btn || !status) return;
210:         
211:         // Remove all state classes
212:         btn.classList.remove('recording', 'processing');
213:         
214:         switch (this.voiceState) {
215:             case 'IDLE':
216:                 status.textContent = '';
217:                 status.style.display = 'none';
218:                 this.isRecording = false;
219:                 break;
220:                 
221:             case 'LISTENING':
222:                 btn.classList.add('recording');
223:                 status.textContent = 'Слушаю...';
224:                 status.style.display = 'block';
225:                 this.isRecording = true;
226:                 break;
227:                 
228:             case 'PROCESSING':
229:                 btn.classList.add('processing');
230:                 status.textContent = 'Гермес обрабатывает...';
231:                 status.style.display = 'block';
232:                 this.isRecording = false;
233:                 break;
234:         }
235:     }
236: 
237:     setupResponseTimeout() {
238:         if (this.responseTimeout) {
239:             clearTimeout(this.responseTimeout);
240:         }
241:         
242:         this.responseTimeout = setTimeout(() => {
243:             if (this.voiceState === 'PROCESSING') {
244:                 this.handleVoiceError(new Error('timeout'));
245:             }
246:         }, 30000);
247:     }
248: 
249:     handleVoiceError(error) {
250:         console.error('[NeuroEscrow] Voice error:', error);
251:         
252:         this.resetVoiceState();
253:         
254:         let message = 'Ошибка записи голоса';
255:         
256:         if (error.message.includes('permission')) {
257:             message = 'Нет доступа к микрофону';
258:         } else if (error.message.includes('timeout')) {
259:             message = 'Превышено время ожидания';
260:         } else if (error.message.includes('cancelled')) {
261:             message = 'Запись отменена';
262:         }
263:         
264:         telegram.showAlert(message);
265:         telegram.hapticNotification('error');
266:     }
267: 
268:     resetVoiceState() {
269:         this.voiceState = 'IDLE';
270:         this.isRecording = false;
271:         this.isProcessing = false;
272:         this.updateVoiceButton();
273:         
274:         if (this.responseTimeout) {
275:             clearTimeout(this.responseTimeout);
276:             this.responseTimeout = null;
277:         }
278:     }
279: 
280:     handleDraftCreated(draft) {
281:         if (this.responseTimeout) {
282:             clearTimeout(this.responseTimeout);
283:         }
284:         
285:         // Check for duplicates
286:         const existingIndex = this.deals.findIndex(d => d.id === draft.id);
287:         if (existingIndex !== -1) {
288:             this.deals[existingIndex] = { ...draft, type: 'draft', isNew: true };
289:         } else {
290:             this.deals.unshift({ ...draft, type: 'draft', isNew: true });
291:         }
292:         
293:         this.resetVoiceState();
294:         this.saveCache(); // Save immediately after adding draft
295:         this.navigate('deals');
296:         
297:         telegram.hapticNotification('success');
298:         telegram.showAlert('Черновик создан');
299:         
300:         console.log('[NeuroEscrow] Draft created:', draft.id);
301:     }
302: 
303:     // -------------------------------------------------------------------------
304:     // Deals View
305:     // -------------------------------------------------------------------------
306: 
307:     renderDealsView(container) {
308:         const view = document.createElement('div');
309:         view.className = 'view';
310:         
311:         const deals = this.deals.length > 0 ? this.deals : this.getSampleDeals();
312:         
313:         view.innerHTML = `
314:             <h2 style="font-size:18px;margin-bottom:16px;font-weight:600;">Мои сделки</h2>
315:             ${deals.length === 0 ? this.emptyState('🤝', 'У вас пока нет сделок') : ''}
316:             <div id="deals-list">
317:                 ${deals.map(deal => deal.type === 'draft' ? this.renderDraftCard(deal) : this.dealCard(deal)).join('')}
318:             </div>
319:         `;
320:         
321:         container.appendChild(view);
322:     }
323: 
324:     renderDraftCard(draft) {
325:         const title = this.escapeHtml(draft.title || 'Без названия');
326:         const description = this.escapeHtml(draft.description || '');
327:         const budget = draft.budget || 'Не указан';
328:         const deadline = draft.deadline || 'Не указан';
329:         
330:         return `
331:             <div class="card draft-card" style="border-left:2px solid rgba(255, 255, 255, 0.34);">
332:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
333:                     <span style="font-size:12px;font-weight:600;color:rgba(255, 255, 255, 0.34);text-transform:uppercase;letter-spacing:0.5px;">Черновик</span>
334:                     <span style="font-size:11px;color:var(--ne-light-gray);">${this.formatDate(draft.created_at)}</span>
335:                 </div>
336:                 <div class="card-title">${title}</div>
337:                 <p style="font-size:13px;color:var(--ne-light-gray);margin:8px 0;">${description}</p>
338:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
339:                     <span>💰 ${budget}</span>
340:                     <span>⏱️ ${deadline}</span>
341:                 </div>
342:                 <div style="display:flex;gap:8px;margin-top:12px;">
343:                     <button class="btn btn-primary" onclick="app.editDraft('${draft.id}')" style="flex:1;">Редактировать</button>
344:                     <button class="btn btn-secondary" onclick="app.publishDraft('${draft.id}')" style="flex:1;">Опубликовать</button>
345:                 </div>
346:             </div>
347:         `;
348:     }
349: 
350:     dealCard(deal) {
351:         const statusColors = {
352:             'draft': 'rgba(255, 255, 255, 0.34)',
353:             'negotiating': '#dddddd',
354:             'in_progress': '#dddddd',
355:             'completed': 'rgba(255, 255, 255, 0.67)'
356:         };
357:         
358:         const statusNames = {
359:             'draft': 'Черновик',
360:             'negotiating': 'Переговоры',
361:             'in_progress': 'В работе',
362:             'completed': 'Завершена'
363:         };
364:         
365:         const color = statusColors[deal.status] || 'rgba(255, 255, 255, 0.34)';
366:         const statusName = statusNames[deal.status] || deal.status;
367:         
368:         return `
369:             <div class="card" style="border-left:2px solid ${color};">
370:                 <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
371:                     <span style="font-size:12px;font-weight:600;color:${color};text-transform:uppercase;letter-spacing:0.5px;">${statusName}</span>
372:                     <span style="font-size:11px;color:var(--ne-light-gray);">#${deal.id}</span>
373:                 </div>
374:                 <div class="card-title">${deal.title}</div>
375:                 <div style="display:flex;gap:16px;margin-top:12px;font-size:13px;color:var(--ne-light-gray);">
376:                     <span>💰 ${deal.budget} USDT</span>
377:                     <span>👤 ${deal.counterparty}</span>
378:                 </div>
379:                 <div style="margin-top:12px;">
380:                     <button class="btn btn-secondary" onclick="app.viewDeal('${deal.id}')">Открыть в боте</button>
381:                 </div>
382:             </div>
383:         `;
384:     }
385: 
386:     getSampleDeals() {
387:         return [
388:             { id: 'a1b2', title: 'Telegram бот для интернет-магазина', status: 'in_progress', budget: '500', counterparty: 'client_42' },
389:             { id: 'c3d4', title: 'Парсер данных с сайта', status: 'completed', budget: '300', counterparty: 'client_17' },
390:         ];
391:     }
392: 
393:     viewDeal(dealId) {
394:         telegram.sendData({ action: 'view_deal', deal_id: dealId });
395:         telegram.showAlert('Открываю детали сделки в боте...');
396:     }
397: 
398:     editDraft(draftId) {
399:         telegram.sendData({ action: 'edit_draft', draft_id: draftId });
400:         telegram.showAlert('Открываю редактор в боте...');
401:     }
402: 
403:     publishDraft(draftId) {
404:         telegram.sendData({ action: 'publish_draft', draft_id: draftId });
405:         telegram.showAlert('Публикую черновик...');
406:     }
407: 
408:     escapeHtml(text) {
409:         const div = document.createElement('div');
410:         div.textContent = text;
411:         return div.innerHTML;
412:     }
413: 
414:     formatDate(timestamp) {
415:         if (!timestamp) return '';
416:         const date = new Date(timestamp * 1000);
417:         const now = new Date();
418:         const diff = now - date;
419:         
420:         if (diff < 60000) return 'только что';
421:         if (diff < 3600000) return `${Math.floor(diff / 60000)} мин назад`;
422:         if (diff < 86400000) return `${Math.floor(diff / 3600000)} ч назад`;
423:         
424:         return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
425:     }
426: 
427:     // -------------------------------------------------------------------------
428:     // Profile View
429:     // -------------------------------------------------------------------------
430: 
431:     renderProfileView(container) {
432:         const view = document.createElement('div');
433:         view.className = 'view';
434:         
435:         view.innerHTML = `
436:             <div class="card" style="text-align:center;padding:24px;">
437:                 <div style="font-size:32px;font-weight:700;margin-bottom:8px;">${this.balance.toFixed(2)} USDT</div>
438:                 <div style="font-size:13px;color:var(--ne-light-gray);margin-bottom:20px;">Ваш баланс</div>
439:                 
440:                 <div style="display:flex;gap:8px;margin-bottom:16px;">
441:                     <button class="btn btn-primary" onclick="app.donate()" style="flex:1;">
442:                         💝 Поддержать
443:                     </button>
444:                     <button class="btn btn-secondary" onclick="app.leaveTip()" style="flex:1;">
445:                         ⭐ Чаевые
446:                     </button>
447:                 </div>
448:                 
449:                 <div style="font-size:11px;color:var(--ne-light-gray);margin-top:12px;">
450:                     TON • USDT • Telegram Stars
451:                 </div>
452:             </div>
453:             
454:             <div id="ton-connect" style="margin:16px 0;"></div>
455:             
456:             <div class="card">
457:                 <div class="card-title">Настройки</div>
458:                 <div class="form-group">
459:                     <label class="form-label">LLM Модель</label>
460:                     <select class="form-input" id="model-selector">
461:                         <option value="auto">Автоматически</option>
462:                         <option value="gpt-4">GPT-4</option>
463:                         <option value="claude">Claude</option>
464:                         <option value="grok">Grok</option>
465:                         <option value="custom">Своя модель</option>
466:                     </select>
467:                 </div>
468:             </div>
469:         `;
470:         
471:         container.appendChild(view);
472:         
473:         setTimeout(() => {
474:             tonConnect.init('ton-connect');
475:         }, 100);
476:     }
477: 
478:     donate() {
479:         telegram.showAlert('Выберите способ:\n\n⭐ Stars: 50, 100, 250, 500\n💎 TON: 1, 5, 10, 25\n💵 USDT: 5, 10, 25, 50');
480:     }
481: 
482:     leaveTip() {
483:         telegram.showAlert('Быстрые чаевые:\n\n10 ⭐ | 25 ⭐ | 50 ⭐ | 100 ⭐');
484:     }
485: 
486:     onTonStatusChange(detail) {
487:         console.log('[App] TON status changed:', detail);
488:     }
489: 
490:     async loadCache() {
491:         try {
492:             const cached = await telegram.cloudGet('neuroescrow_data');
493:             if (cached) {
494:                 this.deals = cached.deals || [];
495:                 this.balance = cached.balance || 0;
496:                 this.chatMessages = cached.chatMessages || [];
497:                 console.log('[App] Cache loaded');
498:             }
499:         } catch (e) {
500:             console.log('[App] No cache found');
501:         }
502:     }
503: 
504:     async saveCache() {
505:         const data = {
506:             deals: this.deals,
507:             balance: this.balance,
508:             chatMessages: this.chatMessages,
509:             timestamp: Date.now()
510:         };
511:         await telegram.cloudSet('neuroescrow_data', data);
512:     }
513: 
514:     requestDataFromBot() {
515:         telegram.sendData({ action: 'get_dashboard_data' });
516:     }
517: 
518:     handleBotData(data) {
519:         console.log('[App] Data from bot:', data);
520:         
521:         // Handle different event types
522:         if (data.event === 'draft_created' && data.draft) {
523:             this.handleDraftCreated(data.draft);
524:             return;
525:         }
526:         
527:         if (data.event === 'error') {
528:             this.handleVoiceError(new Error(data.error || 'Unknown error'));
529:             return;
530:         }
531: 
532:         if (data.event === 'hermes_reply' && data.text) {
533:             this.addChatMessage('hermes', data.text);
534:             return;
535:         }
536: 
537:         if (data.event === 'moderation_block') {
538:             telegram.showAlert('⚠️ Ваш контент нарушает правила платформы');
539:             return;
540:         }
541:         
542:         // Handle dashboard data
543:         if (data.deals) this.deals = data.deals;
544:         if (data.balance !== undefined) this.balance = data.balance;
545:         
546:         this.saveCache();
547:         
548:         const main = document.getElementById('main-content');
549:         main.innerHTML = '';
550:         switch(this.currentView) {
551:             case 'hermes': this.renderHermesView(main); break;
552:             case 'deals': this.renderDealsView(main); break;
553:             case 'profile': this.renderProfileView(main); break;
554:         }
555:     }
556: 
557:     emptyState(icon, text) {
558:         return `
559:             <div class="empty-state">
560:                 <div class="empty-icon">${icon}</div>
561:                 <div class="empty-text">${text}</div>
562:             </div>
563:         `;
564:     }
565: 
566:     // -------------------------------------------------------------------------
567:     // Chat Interface Methods
568:     // -------------------------------------------------------------------------
569: 
570:     renderChatMessages() {
571:         const container = document.getElementById('chat-messages');
572:         if (!container) return;
573: 
574:         container.innerHTML = this.chatMessages.map(msg => `
575:             <div class="chat-message ${msg.sender}">
576:                 <div class="message-bubble">${this.escapeHtml(msg.text)}</div>
577:                 <div class="message-time">${this.formatTime(msg.timestamp)}</div>
578:             </div>
579:         `).join('');
580: 
581:         container.scrollTop = container.scrollHeight;
582:     }
583: 
584:     addChatMessage(sender, text) {
585:         this.chatMessages.push({
586:             sender,
587:             text,
588:             timestamp: Date.now()
589:         });
590:         this.renderChatMessages();
591:         this.saveCache();
592:     }
593: 
594:     async sendTextMessage() {
595:         const input = document.getElementById('chat-input');
596:         if (!input || !input.value.trim()) return;
597: 
598:         const text = input.value.trim();
599:         this.addChatMessage('user', text);
600:         input.value = '';
601: 
602:         telegram.haptic('light');
603: 
604:         // Call Hermes backend
605:         try {
606:             const response = await fetch('/chat', {
607:                 method: 'POST',
608:                 headers: { 'Content-Type': 'application/json' },
609:                 body: JSON.stringify({
610:                     message: text,
611:                     user_id: telegram.getUserId(),
612:                     session_id: `tg_${telegram.getUserId()}`,
613:                     persona: 'hermes'
614:                 })
615:             });
616: 
617:             const data = await response.json();
618: 
619:             if (data.blocked) {
620:                 this.addChatMessage('system', `⚠️ ${data.reason}`);
621:             } else if (data.response) {
622:                 this.addChatMessage('hermes', data.response);
623:             } else if (data.error) {
624:                 this.addChatMessage('system', `❌ Ошибка: ${data.error_message}`);
625:             }
626:         } catch (error) {
627:             console.error('[App] Chat error:', error);
628:             this.addChatMessage('system', '❌ Ошибка соединения с сервером');
629:         }
630:     }
631: 
632:     showAttachMenu() {
633:         const menu = document.getElementById('attach-menu');
634:         if (!menu) return;
635: 
636:         menu.style.display = menu.style.display === 'none' ? 'grid' : 'none';
637:         telegram.haptic('light');
638:     }
639: 
640:     hideAttachMenu() {
641:         const menu = document.getElementById('attach-menu');
642:         if (menu) menu.style.display = 'none';
643:     }
644: 
645:     attachPhoto() {
646:         this.hideAttachMenu();
647:         const input = document.createElement('input');
648:         input.type = 'file';
649:         input.accept = 'image/*';
650:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'photo');
651:         input.click();
652:     }
653: 
654:     attachVideo() {
655:         this.hideAttachMenu();
656:         const input = document.createElement('input');
657:         input.type = 'file';
658:         input.accept = 'video/*';
659:         input.onchange = (e) => this.handleFileUpload(e.target.files[0], 'video');
660:         input.click();
661:     }
662: 
663:     async recordVideo() {
664:         this.hideAttachMenu();
665:         try {
666:             const stream = await navigator.mediaDevices.getUserMedia({
667:                 video: { facingMode: this.currentFacingMode },
668:                 audio: true
669:             });
670:             this.currentStream = stream;
671:             this.showVideoRecorder(stream);
672:         } catch (error) {
673:             telegram.showAlert('Нет доступа к камере');
674:         }
675:     }
676: 
677:     showVideoRecorder(stream) {
678:         const recorder = document.createElement('div');
679:         recorder.className = 'video-recording';
680:         recorder.innerHTML = `
681:             <div class="video-preview">
682:                 <video id="video-preview" autoplay playsinline muted></video>
683:                 <div class="video-controls">
684:                     <button class="camera-switch-btn" onclick="app.switchCamera()">🔄</button>
685:                     <button class="video-record-btn" id="record-btn" onclick="app.toggleVideoRecording()"></button>
686:                     <button class="camera-switch-btn" onclick="app.closeVideoRecorder()">✖️</button>
687:                 </div>
688:             </div>
689:         `;
690:         document.body.appendChild(recorder);
691: 
692:         const video = document.getElementById('video-preview');
693:         video.srcObject = stream;
694:     }
695: 
696:     async switchCamera() {
697:         this.currentFacingMode = this.currentFacingMode === 'user' ? 'environment' : 'user';
698:         if (this.currentStream) {
699:             this.currentStream.getTracks().forEach(track => track.stop());
700:         }
701:         await this.recordVideo();
702:     }
703: 
704:     toggleVideoRecording() {
705:         const btn = document.getElementById('record-btn');
706:         if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
707:             this.startVideoRecording();
708:             btn.classList.add('recording');
709:         } else {
710:             this.stopVideoRecording();
711:             btn.classList.remove('recording');
712:         }
713:     }
714: 
715:     startVideoRecording() {
716:         if (!this.currentStream) return;
717: 
718:         this.mediaRecorder = new MediaRecorder(this.currentStream);
719:         this.audioChunks = [];
720: 
721:         this.mediaRecorder.ondataavailable = (e) => {
722:             this.audioChunks.push(e.data);
723:         };
724: 
725:         this.mediaRecorder.onstop = () => {
726:             const videoBlob = new Blob(this.audioChunks, { type: 'video/webm' });
727:             this.handleVideoUpload(videoBlob);
728:         };
729: 
730:         this.mediaRecorder.start();
731:     }
732: 
733:     stopVideoRecording() {
734:         if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
735:             this.mediaRecorder.stop();
736:         }
737:     }
738: 
739:     closeVideoRecorder() {
740:         if (this.currentStream) {
741:             this.currentStream.getTracks().forEach(track => track.stop());
742:             this.currentStream = null;
743:         }
744:         const recorder = document.querySelector('.video-recording');
745:         if (recorder) recorder.remove();
746:     }
747: 
748:     async shareScreen() {
749:         this.hideAttachMenu();
750:         try {
751:             const stream = await navigator.mediaDevices.getDisplayMedia({
752:                 video: true
753:             });
754:             
755:             const mediaRecorder = new MediaRecorder(stream);
756:             const chunks = [];
757: 
758:             mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
759:             mediaRecorder.onstop = () => {
760:                 const blob = new Blob(chunks, { type: 'video/webm' });
761:                 this.handleVideoUpload(blob);
762:                 stream.getTracks().forEach(track => track.stop());
763:             };
764: 
765:             mediaRecorder.start();
766:             setTimeout(() => mediaRecorder.stop(), 30000); // 30 sec max
767:         } catch (error) {
768:             telegram.showAlert('Нет доступа к экрану');
769:         }
770:     }
771: 
772:     async handleFileUpload(file, type) {
773:         if (!file) return;
774: 
775:         this.addChatMessage('user', `[📎 ${type === 'photo' ? 'Фото' : 'Видео'}]`);
776: 
777:         const reader = new FileReader();
778:         reader.onload = async (e) => {
779:             try {
780:                 // Upload to backend and get URL
781:                 const imageUrl = e.target.result; // Base64 data URL
782: 
783:                 // Call Hermes image analysis
784:                 const response = await fetch('/analyze-image', {
785:                     method: 'POST',
786:                     headers: { 'Content-Type': 'application/json' },
787:                     body: JSON.stringify({
788:                         image_url: imageUrl,
789:                         prompt: type === 'photo' ? 'Проанализируй это изображение' : 'Опиши это видео',
790:                         user_id: telegram.getUserId(),
791:                         session_id: `tg_${telegram.getUserId()}`
792:                     })
793:                 });
794: 
795:                 const data = await response.json();
796: 
797:                 if (data.response) {
798:                     this.addChatMessage('hermes', data.response);
799:                 } else if (data.error) {
800:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
801:                 }
802:             } catch (error) {
803:                 console.error('[App] Upload error:', error);
804:                 this.addChatMessage('system', '❌ Ошибка загрузки файла');
805:             }
806:         };
807:         reader.readAsDataURL(file);
808:     }
809: 
810:     async handleVideoUpload(blob) {
811:         this.addChatMessage('user', '[🎥 Видеозапись]');
812:         this.closeVideoRecorder();
813: 
814:         const reader = new FileReader();
815:         reader.onload = async (e) => {
816:             try {
817:                 const videoUrl = e.target.result;
818: 
819:                 // Call Hermes video analysis
820:                 const response = await fetch('/analyze-image', {
821:                     method: 'POST',
822:                     headers: { 'Content-Type': 'application/json' },
823:                     body: JSON.stringify({
824:                         image_url: videoUrl,
825:                         prompt: 'Проанализируй это видео',
826:                         user_id: telegram.getUserId(),
827:                         session_id: `tg_${telegram.getUserId()}`
828:                     })
829:                 });
830: 
831:                 const data = await response.json();
832: 
833:                 if (data.response) {
834:                     this.addChatMessage('hermes', data.response);
835:                 } else if (data.error) {
836:                     this.addChatMessage('system', `❌ Ошибка анализа: ${data.error_message}`);
837:                 }
838:             } catch (error) {
839:                 console.error('[App] Video upload error:', error);
840:                 this.addChatMessage('system', '❌ Ошибка загрузки видео');
841:             }
842:         };
843:         reader.readAsDataURL(blob);
844:     }
845: 
846:     formatTime(timestamp) {
847:         const date = new Date(timestamp);
848:         return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
849:     }
850: }
851: 
852: let app;
853: document.addEventListener('DOMContentLoaded', () => {
854:     app = new NeuroEscrowApp();
855: });
856: 
857: window.addEventListener('message', (event) => {
858:     if (event.data && event.data.type === 'bot_data' && app) {
859:         app.handleBotData(event.data.payload);
860:     }
861: });
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
