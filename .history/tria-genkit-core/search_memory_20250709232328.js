// tria-genkit-core/search_memory.js - УЛУЧШЕННАЯ ВЕРСИЯ С КЭШИРОВАНИЕМ
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const CACHE_DIR = path.resolve(__dirname, 'cache');
const SEARCH_LIMIT = 15;
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 часа

// API ключи с ротацией для надежности
const GEMINI_API_KEYS = [
  'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g',
  'AIzaSyDOaH1Wxrnd9K7aeWVzSMaxvv0yeIVba5g'
];

let currentKeyIndex = 0;

// --- CACHE MANAGEMENT ---
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`\x1b[33mCreated cache directory: ${CACHE_DIR}\x1b[0m`);
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

      // Проверяем срок действия кэша
      if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
        console.log(`\x1b[32mUsing cached embedding for query\x1b[0m`);
        return cached.embedding;
      } else {
        // Удаляем устаревший кэш
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
    console.log(`\x1b[33mCached embedding for future use\x1b[0m`);
  } catch (error) {
    console.warn(`Cache write error: ${error.message}`);
  }
}

function getCachedResults(query, options) {
  try {
    const cacheKey = getCacheKey(query + JSON.stringify(options));
    const cachePath = path.join(CACHE_DIR, `results_${cacheKey}.json`);

    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

      // Результаты кэшируем на более короткий срок (1 час)
      if (Date.now() - cached.timestamp < 60 * 60 * 1000) {
        console.log(`\x1b[32mUsing cached search results\x1b[0m`);
        return cached.results;
      } else {
        fs.unlinkSync(cachePath);
      }
    }
  } catch (error) {
    console.warn(`Results cache read error: ${error.message}`);
  }

  return null;
}

function setCachedResults(query, options, results) {
  try {
    const cacheKey = getCacheKey(query + JSON.stringify(options));
    const cachePath = path.join(CACHE_DIR, `results_${cacheKey}.json`);

    const cacheData = {
      query: query,
      options: options,
      results: results,
      timestamp: Date.now()
    };

    fs.writeFileSync(cachePath, JSON.stringify(cacheData));
  } catch (error) {
    console.warn(`Results cache write error: ${error.message}`);
  }
}

// --- ENHANCED VECTOR SEARCH FUNCTIONS ---
async function createQueryEmbedding(query) {
  // Проверяем кэш
  const cachedEmbedding = getCachedEmbedding(query);
  if (cachedEmbedding) {
    return cachedEmbedding;
  }

  const maxRetries = GEMINI_API_KEYS.length;
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const apiKey = GEMINI_API_KEYS[currentKeyIndex];
      const genAI = new GoogleGenerativeAI(apiKey);

      // Попробуем новую модель
      const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });

      console.log(`\x1b[33mCreating embedding with API key #${currentKeyIndex + 1} (model: text-embedding-004)...\x1b[0m`);

      const result = await model.embedContent(query);
      const embedding = result.embedding.values;

      // Кэшируем успешный результат
      setCachedEmbedding(query, embedding);

      return embedding;

    } catch (error) {
      lastError = error;
      console.error(`\x1b[31mAPI key #${currentKeyIndex + 1} failed:\x1b[0m`, error.message);

      // Если это 404 для модели, попробуем старую модель
      if (error.message.includes('text-embedding-004')) {
        try {
          const genAI = new GoogleGenerativeAI(GEMINI_API_KEYS[currentKeyIndex]);
          const model = genAI.getGenerativeModel({ model: 'embedding-001' });

          console.log(`\x1b[33mFallback to embedding-001 model...\x1b[0m`);

          const result = await model.embedContent(query);
          const embedding = result.embedding.values;

          setCachedEmbedding(query, embedding);
          return embedding;

        } catch (fallbackError) {
          console.error(`\x1b[31mFallback model also failed:\x1b[0m`, fallbackError.message);
        }
      }

      // Переключаемся на следующий ключ
      currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;

      if (attempt === maxRetries - 1) {
        throw new Error(`All API keys failed. Last error: ${lastError.message}`);
      }

      // Добавляем задержку перед повторной попыткой
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// --- ENHANCED FILTERING FUNCTIONS ---
function isRelevantContent(text) {
  // Исключаем техническую разметку и неинформативный контент
  const irrelevantPatterns = [
    /^<[^>]+>.*<\/[^>]+>$/s,      // HTML теги
    /path d="[^"]*"/,              // SVG пути
    /fill="#[a-f0-9]{6}"/,         // Цвета
    /viewBox="[^"]*"/,             // SVG viewBox
    /xmlns="[^"]*"/,               // XML namespace
    /^\s*\d+\.\d+\.\d+\.\d+/,     // IP адреса (логи)
    /INFO:\s+\d+\.\d+\.\d+\.\d+/,  // Логи сервера
    /GET \/static/,                // HTTP запросы
    /404 Not Found/,               // Ошибки 404
    /200 OK/,                      // HTTP статусы
    /HTTP\/1\.1/,                  // HTTP протокол
    /^[a-f0-9]{32}$/,             // MD5 хеши
    /^[a-f0-9]{64}$/,             // SHA256 хеши
    /^\s*[{}\[\](),;]+\s*$/,      // Только символы разметки
    /^[^a-zA-Zа-яА-Я]*$/          // Без букв (только символы)
  ];

  // Проверяем длину текста
  if (text.length < 20) {
    return false;
  }

  return !irrelevantPatterns.some(pattern => pattern.test(text));
}

function isServerLog(text) {
  const logPatterns = [
    /INFO:\s+\d+\.\d+\.\d+\.\d+:\d+/,
    /GET \/static/,
    /404 Not Found/,
    /200 OK/,
    /HTTP\/1\.1/,
    /POST \/api/,
    /^\s*\d{4}-\d{2}-\d{2}/,      // Даты
    /^\s*\[\d{4}-\d{2}-\d{2}/,    // Логи с датами
    /ERROR:/,
    /WARNING:/,
    /DEBUG:/
  ];

  return logPatterns.some(pattern => pattern.test(text));
}

function expandQuery(query) {
  const queryExpansions = {
    'анимация': ['animation', 'animate', 'transition', 'transform', 'движение'],
    'жесты': ['gesture', 'hand', 'tracking', 'recognition', 'палец', 'рука'],
    'голограмма': ['hologram', 'holographic', '3d', 'render', 'visualization'],
    'область': ['area', 'region', 'zone', 'canvas', 'поле', 'зона'],
    'инициализация': ['init', 'initialize', 'setup', 'start', 'запуск'],
    'рендеринг': ['render', 'rendering', 'draw', 'display', 'отображение'],
    'сцена': ['scene', 'stage', 'canvas', 'viewport']
  };

  let expandedQuery = query;
  Object.entries(queryExpansions).forEach(([ru, synonyms]) => {
    if (query.toLowerCase().includes(ru)) {
      expandedQuery += ' ' + synonyms.join(' ');
    }
  });

  return expandedQuery;
}

function calculateRelevanceScore(row, query) {
  let score = row.similarity || 0;

  // Бонус за релевантные источники
  const relevantSources = [
    'script.js',
    'main.js',
    'hologram',
    'gesture',
    'animation',
    'render'
  ];

  if (relevantSources.some(src => row.source.toLowerCase().includes(src))) {
    score += 0.1;
  }

  // Штраф за техническую разметку
  if (!isRelevantContent(row.text)) {
    score -= 0.3;
  }

  // Бонус за соответствие ключевым словам
  const queryWords = query.toLowerCase().split(/\s+/);
  const textWords = row.text.toLowerCase();

  queryWords.forEach(word => {
    if (textWords.includes(word)) {
      score += 0.05;
    }
  });

  return Math.max(0, Math.min(1, score));
}

// --- ENHANCED VECTOR SEARCH IMPLEMENTATION ---
async function searchMemoryVector(query, options = {}) {
  const {
    limit = SEARCH_LIMIT,
    threshold = 0.5,  // Понижен порог для большего количества результатов
    filterLogs = true,
    batchSize = 5000,  // Уменьшен для лучшей производительности
    useCache = true
  } = options;

  if (!query || query.trim().length === 0) {
    console.error("\x1b[31mError: Search query cannot be empty.\x1b[0m");
    return [];
  }

  // Проверяем кэш результатов
  if (useCache) {
    const cachedResults = getCachedResults(query, options);
    if (cachedResults) {
      return cachedResults;
    }
  }

  // Расширяем запрос для лучшего поиска
  const expandedQuery = expandQuery(query);
  console.log(`\x1b[36mExpanded query: "${expandedQuery}"\x1b[0m`);

  // Создаем эмбеддинг запроса
  console.log('\x1b[33mCreating query embedding...\x1b[0m');
  const queryEmbedding = await createQueryEmbedding(expandedQuery);
  console.log(`\x1b[32mQuery embedding created (${queryEmbedding.length} dimensions)\x1b[0m`);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("\x1b[31mError connecting to the database:\x1b[0m", err.message);
      throw err;
    }
  });

  const sql = `
        SELECT 
            hm.id, 
            hm.text, 
            hm.source,
            hm.timestamp,
            hm.embedding,
            hm.semantic_tags
        FROM holographic_memory hm
        WHERE length(hm.text) > 20
        ORDER BY hm.id
        LIMIT ? OFFSET ?;
    `;

  return new Promise((resolve, reject) => {
    let allResults = [];
    let offset = 0;
    let processedCount = 0;

    const processBatch = () => {
      db.all(sql, [batchSize, offset], (err, rows) => {
        if (err) {
          console.error("\x1b[31mError during search:\x1b[0m", err.message);
          reject(err);
          return;
        }

        if (rows.length === 0) {
          console.log(`\x1b[32mProcessed ${processedCount} embeddings\x1b[0m`);

          // Улучшенная обработка результатов
          const processedResults = allResults
            .map(row => ({
              ...row,
              relevanceScore: calculateRelevanceScore(row, query)
            }))
            .filter(row => row.relevanceScore > threshold)
            .filter(row => filterLogs ? !isServerLog(row.text) : true)
            .filter(row => isRelevantContent(row.text))
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, limit)
            .map(row => ({
              ...row,
              adjusted_rank: row.relevanceScore,
              similarity: row.similarity
            }));

          // Кэшируем результаты
          if (useCache) {
            setCachedResults(query, options, processedResults);
          }

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
              semantic_tags: row.semantic_tags,
              similarity: similarity
            };
          } catch (error) {
            console.warn(`\x1b[33mSkipping row ${row.id}: ${error.message}\x1b[0m`);
            return null;
          }
        }).filter(Boolean);

        allResults = allResults.concat(batchResults);
        processedCount += rows.length;

        if (processedCount % 10000 === 0) {
          console.log(`\x1b[36mProcessed ${processedCount} embeddings...\x1b[0m`);
        }

        offset += batchSize;
        processBatch();
      });
    };

    processBatch();
  });
}

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

// --- ENHANCED DISPLAY FUNCTIONS ---
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

  rows.forEach((row, index) => {
    const scoreLabel = row.similarity ?
      `Relevance: ${row.relevanceScore?.toFixed(4) || row.similarity.toFixed(4)}` :
      `Rank: ${row.adjusted_rank.toFixed(4)}`;

    console.log(`\x1b[1m\x1b[36m[${index + 1}] ID: ${row.id} | Source: ${row.source} | ${scoreLabel}\x1b[0m`);

    // Обрезаем длинный текст для лучшей читаемости
    const displayText = row.text.length > 300 ?
      row.text.substring(0, 300) + '...' :
      row.text;

    console.log(`\x1b[2m${highlight(displayText, originalQuery)}\x1b[0m\n`);
    console.log('--------------------------------------------------\n');
  });
}

// --- ENHANCED FTS5 FALLBACK ---
function sanitizeFTS5Query(query) {
  query = query.trim();
  const escapedQuery = query.replace(/"/g, '""');
  return `"${escapedQuery}"`;
}

function buildFlexibleFTS5Query(query) {
  const terms = query.trim().split(/\s+/).filter(term => term.length > 0);

  if (terms.length === 0) return '';

  if (terms.length === 1) {
    return sanitizeFTS5Query(terms[0]);
  }

  const phraseSearch = sanitizeFTS5Query(query);
  const individualTerms = terms.map(term => sanitizeFTS5Query(term)).join(' OR ');

  return `${phraseSearch} OR (${individualTerms})`;
}

async function searchMemoryFTS5(query, options = {}) {
  const { limit = SEARCH_LIMIT, useFlexibleSearch = true } = options;

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("\x1b[31mError connecting to the database:\x1b[0m", err.message);
      throw err;
    }
  });

  let matchQuery;
  if (useFlexibleSearch) {
    matchQuery = buildFlexibleFTS5Query(query);
  } else {
    matchQuery = sanitizeFTS5Query(query);
  }

  const sql = `
        SELECT 
            hm.id, 
            hm.text, 
            hm.source,
            hm.timestamp,
            rank,
            CASE 
                WHEN hm.text LIKE '%' || ? || '%' THEN rank * 2
                ELSE rank
            END as adjusted_rank
        FROM memory_fts fts
        JOIN holographic_memory hm ON hm.id = fts.rowid
        WHERE fts.memory_fts MATCH ?
        AND length(hm.text) > 20
        ORDER BY adjusted_rank DESC
        LIMIT ?;
    `;

  return new Promise((resolve, reject) => {
    const originalQuery = query.trim();

    db.all(sql, [originalQuery, matchQuery, limit], (err, rows) => {
      if (err) {
        console.error("\x1b[31mError during FTS5 search:\x1b[0m", err.message);
        reject(err);
      } else {
        // Фильтруем результаты FTS5
        const filteredRows = rows.filter(row => isRelevantContent(row.text));
        resolve(filteredRows);
      }
      db.close();
    });
  });
}

// --- MAIN SEARCH FUNCTION ---
async function searchMemory(query, options = {}) {
  const {
    useVector = true,
    threshold = 0.5,
    filterLogs = true,
    useCache = true
  } = options;

  // Инициализируем кэш
  ensureCacheDir();

  try {
    console.log(`\n\x1b[1m\x1b[34m--- Searching Tria Memory Core for: "${query}" ---\x1b[0m`);
    console.log(`\x1b[33mUsing ${useVector ? 'VECTOR' : 'FTS5'} search...\x1b[0m`);
    if (useCache) {
      console.log(`\x1b[33mCache enabled (dir: ${CACHE_DIR})\x1b[0m`);
    }
    console.log();

    const results = useVector ?
      await searchMemoryVector(query, { ...options, threshold, filterLogs, useCache }) :
      await searchMemoryFTS5(query, options);

    if (results.length === 0) {
      console.log("\x1b[33mNo relevant memories found.\x1b[0m");

      if (useVector) {
        console.log("\x1b[33mTrying FTS5 fallback...\x1b[0m");
        const fallbackResults = await searchMemoryFTS5(query, {
          ...options,
          useFlexibleSearch: true
        });

        if (fallbackResults.length > 0) {
          console.log(`\x1b[32mFound ${fallbackResults.length} results with FTS5:\x1b[0m\n`);
          displayResults(fallbackResults, query);
        } else {
          console.log("\x1b[33mNo results found with FTS5 either.\x1b[0m");
        }
      }
    } else {
      console.log(`\x1b[32mFound ${results.length} relevant memories (relevance > ${threshold}):\x1b[0m\n`);
      displayResults(results, query);
    }
  } catch (error) {
    console.error("\x1b[31mVector search failed:\x1b[0m", error.message);
    console.error(`\x1b[31mError details:\x1b[0m`, error.stack);

    // Улучшенный fallback на FTS5
    if (useVector) {
      console.log("\x1b[33mFalling back to FTS5 search...\x1b[0m");
      try {
        await searchMemory(query, { ...options, useVector: false });
      } catch (fallbackError) {
        console.error("\x1b[31mFTS5 fallback also failed:\x1b[0m", fallbackError.message);
        process.exit(1);
      }
    }
  }
}

// --- SCRIPT EXECUTION ---
const args = process.argv.slice(2);
const searchQuery = args.join(' ');

if (!searchQuery) {
  console.error('\x1b[31mUsage: node search_memory.js "your search query"\x1b[0m');
  console.error('\x1b[33mExample: node search_memory.js "анимация жестов голограмма"\x1b[0m');
  process.exit(1);
}

// Проверка наличия зависимостей
try {
  require('@google/generative-ai');
  console.log('\x1b[32mAll dependencies found\x1b[0m');
} catch (error) {
  console.error('\x1b[31mMissing dependency. Install with: npm install @google/generative-ai\x1b[0m');
  process.exit(1);
}

// Запуск поиска
searchMemory(searchQuery);
