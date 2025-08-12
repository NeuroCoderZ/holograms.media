// tria-genkit-core/search_memory.js - ИСПРАВЛЕННАЯ ВЕРСИЯ
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const CACHE_DIR = path.resolve(__dirname, 'cache');
const SEARCH_LIMIT = 15;

// API ключи
const GEMINI_API_KEYS = [
  'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g',
  'AIzaSyDOaH1Wxrnd9K7aeWVzSMaxvv0yeIVba5g'
];

let currentKeyIndex = 0;
let dbSchema = null; // Кэшируем схему БД

// --- DATABASE SCHEMA DETECTION ---
async function detectDatabaseSchema() {
  if (dbSchema) return dbSchema;

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(holographic_memory)", [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        dbSchema = {};
        rows.forEach(row => {
          dbSchema[row.name] = row.type;
        });
        console.log(`✅ Detected ${Object.keys(dbSchema).length} columns in database`);
        db.close();
        resolve(dbSchema);
      }
    });
  });
}

// --- ENHANCED CONTENT FILTERING ---
function isHighQualityContent(text) {
  // Исключаем SVG разметку
  if (text.includes('<svg') || text.includes('<path') || text.includes('viewBox')) {
    return false;
  }

  // Исключаем только числовые координаты
  if (/^[\d\s,.-]+$/.test(text.trim())) {
    return false;
  }

  // Исключаем короткие технические фрагменты
  if (text.length < 50) {
    return false;
  }

  // Приоритет содержательному тексту
  const contentIndicators = [
    'gesture', 'hologram', 'анимация', 'animation',
    'function', 'class', 'const', 'async',
    'MediaPipe', 'Three.js', 'WebGL', 'canvas',
    'инициализация', 'рендеринг', 'область'
  ];

  return contentIndicators.some(indicator =>
    text.toLowerCase().includes(indicator.toLowerCase())
  );
}

function calculateContentScore(text, query) {
  let score = 0;

  // Базовый скор за длину
  if (text.length > 100) score += 0.2;
  if (text.length > 500) score += 0.3;

  // Бонус за ключевые слова из запроса
  const queryWords = query.toLowerCase().split(/\s+/);
  queryWords.forEach(word => {
    if (text.toLowerCase().includes(word)) {
      score += 0.2;
    }
  });

  // Бонус за техническую релевантность
  const technicalTerms = ['function', 'class', 'gesture', 'hologram', 'animation'];
  technicalTerms.forEach(term => {
    if (text.toLowerCase().includes(term)) {
      score += 0.1;
    }
  });

  // Штраф за SVG/HTML
  if (text.includes('<') || text.includes('path d=')) {
    score -= 0.5;
  }

  return Math.max(0, Math.min(1, score));
}

// --- EMBEDDING FUNCTIONS ---
async function createQueryEmbedding(query) {
  // Проверяем кэш
  const cachedEmbedding = getCachedEmbedding(query);
  if (cachedEmbedding) {
    return cachedEmbedding;
  }

  for (let attempt = 0; attempt < GEMINI_API_KEYS.length; attempt++) {
    try {
      const apiKey = GEMINI_API_KEYS[currentKeyIndex];
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

      console.log(`🔮 Creating embedding with API key #${currentKeyIndex + 1}...`);

      const result = await model.embedContent(query);
      const embedding = result.embedding.values;

      setCachedEmbedding(query, embedding);
      return embedding;

    } catch (error) {
      console.error(`❌ API key #${currentKeyIndex + 1} failed:`, error.message);
      currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;

      if (attempt === GEMINI_API_KEYS.length - 1) {
        throw new Error(`All API keys failed. Last error: ${error.message}`);
      }
    }
  }
}

// --- ADAPTIVE VECTOR SEARCH ---
async function searchMemoryVector(query, options = {}) {
  const { limit = SEARCH_LIMIT, threshold = 0.4, batchSize = 5000 } = options;

  // Определяем схему БД
  const schema = await detectDatabaseSchema();

  // Создаем адаптивный SQL запрос на основе доступных колонок
  const availableColumns = Object.keys(schema);
  const selectColumns = [
    'hm.id', 'hm.text', 'hm.source', 'hm.timestamp', 'hm.embedding'
  ];

  // Добавляем опциональные колонки, если они существуют
  if (availableColumns.includes('semantic_tags')) {
    selectColumns.push('hm.semantic_tags');
  }
  if (availableColumns.includes('agent_context')) {
    selectColumns.push('hm.agent_context');
  }

  const sql = `
        SELECT ${selectColumns.join(', ')}
        FROM holographic_memory hm
        WHERE length(hm.text) > 50
        ORDER BY hm.id
        LIMIT ? OFFSET ?;
    `;

  console.log(`📝 Query: "${query}"`);
  console.log(`🎯 Threshold: ${threshold}`);

  const queryEmbedding = await createQueryEmbedding(query);
  console.log(`✅ Query embedding created (${queryEmbedding.length} dimensions)`);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("❌ Database connection error:", err.message);
      throw err;
    }
  });

  return new Promise((resolve, reject) => {
    let allResults = [];
    let offset = 0;
    let processedCount = 0;

    const processBatch = () => {
      db.all(sql, [batchSize, offset], (err, rows) => {
        if (err) {
          console.error("❌ Search error:", err.message);
          reject(err);
          return;
        }

        if (rows.length === 0) {
          console.log(`✅ Processed ${processedCount} embeddings`);

          // Улучшенная обработка результатов
          const processedResults = allResults
            .filter(row => isHighQualityContent(row.text))
            .map(row => ({
              ...row,
              contentScore: calculateContentScore(row.text, query),
              finalScore: row.similarity * 0.6 + calculateContentScore(row.text, query) * 0.4
            }))
            .filter(row => row.finalScore > threshold)
            .sort((a, b) => b.finalScore - a.finalScore)
            .slice(0, limit);

          resolve(processedResults);
          db.close();
          return;
        }

        // Обрабатываем пачку
        const batchResults = rows.map(row => {
          try {
            const embedding = new Float32Array(row.embedding);
            const similarity = cosineSimilarity(queryEmbedding, Array.from(embedding));

            return {
              id: row.id,
              text: row.text,
              source: row.source,
              timestamp: row.timestamp,
              similarity: similarity,
              semantic_tags: row.semantic_tags || null,
              agent_context: row.agent_context || null
            };
          } catch (error) {
            return null;
          }
        }).filter(Boolean);

        allResults = allResults.concat(batchResults);
        processedCount += rows.length;

        if (processedCount % 10000 === 0) {
          console.log(`📊 Processed ${processedCount} embeddings...`);
        }

        offset += batchSize;
        processBatch();
      });
    };

    processBatch();
  });
}

// --- ENHANCED FTS5 SEARCH ---
async function searchMemoryFTS5(query, options = {}) {
  const { limit = SEARCH_LIMIT } = options;

  const schema = await detectDatabaseSchema();
  const availableColumns = Object.keys(schema);

  const selectColumns = [
    'hm.id', 'hm.text', 'hm.source', 'hm.timestamp'
  ];

  if (availableColumns.includes('semantic_tags')) {
    selectColumns.push('hm.semantic_tags');
  }

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  const escapedQuery = `"${query.replace(/"/g, '""')}"`;

  const sql = `
        SELECT 
            ${selectColumns.join(', ')},
            rank
        FROM memory_fts fts
        JOIN holographic_memory hm ON hm.id = fts.rowid
        WHERE fts.memory_fts MATCH ?
        AND length(hm.text) > 50
        ORDER BY rank DESC
        LIMIT ?;
    `;

  return new Promise((resolve, reject) => {
    db.all(sql, [escapedQuery, limit * 3], (err, rows) => {
      if (err) {
        console.error("❌ FTS5 search error:", err.message);
        reject(err);
      } else {
        // Фильтруем и оцениваем результаты FTS5
        const filteredResults = rows
          .filter(row => isHighQualityContent(row.text))
          .map(row => ({
            ...row,
            contentScore: calculateContentScore(row.text, query),
            adjusted_rank: Math.abs(row.rank)
          }))
          .sort((a, b) => b.contentScore - a.contentScore)
          .slice(0, limit);

        resolve(filteredResults);
      }
      db.close();
    });
  });
}

// --- CACHE FUNCTIONS ---
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

function getCacheKey(query) {
  return crypto.createHash('md5').update(query.trim().toLowerCase()).digest('hex');
}

function getCachedEmbedding(query) {
  try {
    const cacheKey = getCacheKey(query);
    const cachePath = path.join(CACHE_DIR, `embedding_${cacheKey}.json`);

    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      const isExpired = Date.now() - cached.timestamp > 24 * 60 * 60 * 1000;

      if (!isExpired) {
        console.log('📦 Using cached embedding');
        return cached.embedding;
      } else {
        fs.unlinkSync(cachePath);
      }
    }
  } catch (error) {
    console.warn(`Cache read error: ${error.message}`);
  }

  return null;
}

function setCachedEmbedding(query, embedding) {
  try {
    const cacheKey = getCacheKey(query);
    const cachePath = path.join(CACHE_DIR, `embedding_${cacheKey}.json`);

    const cacheData = {
      query: query,
      embedding: embedding,
      timestamp: Date.now()
    };

    fs.writeFileSync(cachePath, JSON.stringify(cacheData));
    console.log('💾 Cached embedding for future use');
  } catch (error) {
    console.warn(`Cache write error: ${error.message}`);
  }
}

// --- UTILITY FUNCTIONS ---
function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new Error('Vector dimensions must match');
  }

  let dotProduct = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }

  return dotProduct / (magnitudeA * magnitudeB);
}

function highlight(text, query) {
  const terms = query.split(/\s+/).filter(Boolean);
  let highlightedText = text;

  terms.forEach(term => {
    const regex = new RegExp(`(${term})`, 'gi');
    highlightedText = highlightedText.replace(regex, '\x1b[32m$1\x1b[0m');
  });

  return highlightedText;
}

function displayResults(rows, originalQuery) {
  if (rows.length === 0) {
    console.log('\x1b[33mНет найденных релевантных результатов.\x1b[0m');
    return;
  }

  console.log(`\n🎯 Found ${rows.length} high-quality results:\n`);

  rows.forEach((row, index) => {
    const scoreLabel = row.finalScore ?
      `Quality: ${row.finalScore.toFixed(4)}` :
      `Rank: ${row.adjusted_rank?.toFixed(4) || 'N/A'}`;

    const source = path.basename(row.source);

    console.log(`\x1b[1m\x1b[36m[${index + 1}] ID: ${row.id} | ${source} | ${scoreLabel}\x1b[0m`);

    // Умная обрезка текста
    const displayText = row.text.length > 200 ?
      row.text.substring(0, 200) + '...' :
      row.text;

    console.log(`\x1b[2m${highlight(displayText, originalQuery)}\x1b[0m\n`);
    console.log('─'.repeat(80) + '\n');
  });
}

// --- MAIN SEARCH FUNCTION ---
async function searchMemory(query, options = {}) {
  const { useVector = true } = options;

  ensureCacheDir();

  try {
    console.log(`\n🔍 === TRIA MEMORY SEARCH ===`);

    let results;

    if (useVector) {
      results = await searchMemoryVector(query, options);
    } else {
      results = await searchMemoryFTS5(query, options);
    }

    displayResults(results, query);

    if (results.length === 0 && useVector) {
      console.log("🔄 Trying FTS5 fallback...");
      const fallbackResults = await searchMemoryFTS5(query, options);
      displayResults(fallbackResults, query);
    }

  } catch (error) {
    console.error(`❌ Search failed: ${error.message}`);

    if (useVector) {
      console.log("🔄 Falling back to FTS5...");
      await searchMemory(query, { ...options, useVector: false });
    }
  }
}

// --- SCHEMA INSPECTION COMMAND ---
async function showDatabaseSchema() {
  try {
    const schema = await detectDatabaseSchema();
    console.log('\n📋 Database Schema:');
    console.log('═'.repeat(50));
    Object.entries(schema).forEach(([column, type]) => {
      console.log(`${column}: ${type}`);
    });
  } catch (error) {
    console.error('Error inspecting schema:', error.message);
  }
}

// --- SCRIPT EXECUTION ---
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--schema')) {
    await showDatabaseSchema();
    return;
  }

  const query = args.filter(arg => !arg.startsWith('--')).join(' ');

  if (!query) {
    console.error('❌ Usage: node search_memory.js "your search query"');
    console.error('   Options: --schema (show database structure)');
    process.exit(1);
  }

  // Проверка зависимостей
  try {
    require('@google/generative-ai');
    console.log('✅ All dependencies found');
  } catch (error) {
    console.error('❌ Missing dependency: npm install @google/generative-ai');
    process.exit(1);
  }

  await searchMemory(query);
}

main().catch(console.error);
