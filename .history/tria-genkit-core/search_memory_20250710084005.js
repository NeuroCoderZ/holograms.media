// tria-genkit-core/search_memory.js - УЛУЧШЕННЫЙ СЕМАНТИЧЕСКИЙ ПОИСК
const sqlite3 = require('sqlite3');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- КОНФИГУРАЦИЯ ---
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const SEARCH_LIMIT = 15;

// API ключи с ротацией для надежности
const GEMINI_API_KEYS = [
  'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g',
  'AIzaSyDOaH1Wxrnd9K7aeWVzSMaxvv0yeIVba5g'
];

let currentKeyIndex = 0;

// --- УЛУЧШЕННЫЕ ФУНКЦИИ АНАЛИЗА КОНТЕНТА ---
function analyzeContentType(text) {
  const patterns = {
    code: /(?:function|class|const|let|var|import|export|async|await|\.js|\.ts|\.jsx)/i,
    html: /(?:<[^>]+>|<!DOCTYPE|<html|<head|<body)/i,
    css: /(?:\.[\w-]+\s*\{|@media|@keyframes|rgba?\(|css)/i,
    svg: /(?:<svg|<path|viewBox|xmlns|fill=|stroke=)/i,
    serverLog: /(?:INFO:|ERROR:|WARN:|DEBUG:|GET\s+\/|POST\s+\/|PUT\s+\/|DELETE\s+\/|404|200|500|HTTP\/1\.1)/i,
    config: /(?:vite\.config|package\.json|tsconfig|webpack|\.json)/i,
    documentation: /(?:README|CHANGELOG|\.md|documentation|guide|tutorial|как|что|зачем|почему)/i,
    conversation: /(?:user:|assistant:|human:|ai:|claude:|gemini:|пользователь:|ассистент:)/i,
    technical: /(?:API|SDK|library|framework|dependency|npm|yarn|библиотека|фреймворк)/i,
    hologram: /(?:hologram|голограмм|3d|three\.js|webgl|render|scene|mesh)/i,
    gesture: /(?:gesture|жест|tracking|detection|MediaPipe|hand|finger)/i,
    audio: /(?:audio|звук|микрофон|microphone|wavelet|CWT|frequency)/i
  };

  const analysis = {};
  for (const [type, pattern] of Object.entries(patterns)) {
    analysis[type] = pattern.test(text);
  }

  return analysis;
}

function calculateContentRelevance(text, semanticTags, contentType) {
  let relevance = 0.5; // базовый скор

  // Бонусы за тематический контент
  if (contentType.hologram) relevance += 0.3;
  if (contentType.gesture) relevance += 0.3;
  if (contentType.audio) relevance += 0.2;
  if (contentType.documentation) relevance += 0.2;
  if (contentType.conversation) relevance += 0.1;
  if (contentType.code && !contentType.html) relevance += 0.2;

  // Штрафы за техническую разметку
  if (contentType.svg) relevance -= 0.4;
  if (contentType.serverLog) relevance -= 0.5;
  if (contentType.html && text.includes('<path')) relevance -= 0.3;
  if (contentType.css && text.length < 200) relevance -= 0.2;

  // Бонусы за длину и структуру
  const length = text.length;
  if (length > 300) relevance += 0.1;
  if (length > 800) relevance += 0.1;
  if (length > 1500) relevance += 0.1;

  // Бонусы за семантические теги
  if (semanticTags && semanticTags.length > 0) {
    relevance += Math.min(0.2, semanticTags.length * 0.05);
  }

  return Math.max(0, Math.min(1, relevance));
}

function isHighQualityContent(text, semanticTags) {
  const contentType = analyzeContentType(text);

  // Автоматически исключаем низкокачественный контент
  if (contentType.serverLog) return false;
  if (contentType.svg && text.includes('<path d=')) return false;
  if (text.length < 50) return false;

  // Приоритет высококачественному контенту
  if (contentType.documentation) return true;
  if (contentType.conversation && text.length > 200) return true;
  if (contentType.hologram || contentType.gesture || contentType.audio) return true;
  if (contentType.code && !contentType.html && text.length > 100) return true;

  // Средний контент принимаем если достаточно длинный
  return text.length > 150;
}

// --- СЕМАНТИЧЕСКОЕ РАСШИРЕНИЕ ЗАПРОСОВ ---
function expandQuery(query) {
  const expansions = {
    'анимация': ['animation', 'animate', 'transition', 'transform', 'motion'],
    'жесты': ['gesture', 'hand', 'tracking', 'recognition', 'finger', 'touch'],
    'голограмма': ['hologram', 'holographic', '3d', 'render', 'three.js', 'webgl'],
    'область': ['area', 'region', 'zone', 'canvas', 'container', 'element'],
    'запись': ['record', 'capture', 'save', 'store', 'logging'],
    'аудио': ['audio', 'sound', 'microphone', 'speech', 'voice', 'music'],
    'визуализация': ['visualization', 'visual', 'display', 'render', 'draw'],
    'инициализация': ['initialization', 'init', 'setup', 'start', 'begin'],
    'рендеринг': ['rendering', 'render', 'draw', 'display', 'paint']
  };

  let expandedTerms = [query];

  Object.entries(expansions).forEach(([ru, enTerms]) => {
    if (query.toLowerCase().includes(ru)) {
      expandedTerms = expandedTerms.concat(enTerms);
    }
  });

  return expandedTerms.join(' ');
}

// --- ФУНКЦИИ ВЕКТОРНОГО ПОИСКА ---
async function createQueryEmbedding(query) {
  const maxRetries = GEMINI_API_KEYS.length;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const apiKey = GEMINI_API_KEYS[currentKeyIndex];
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

      console.log(`🔮 Creating embedding with API key #${currentKeyIndex + 1}...`);

      const result = await model.embedContent(query);
      return result.embedding.values;

    } catch (error) {
      console.error(`❌ API key #${currentKeyIndex + 1} failed:`, error.message);
      currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;

      if (attempt === maxRetries - 1) {
        throw new Error(`All API keys failed. Last error: ${error.message}`);
      }
    }
  }
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

// --- ГИБРИДНЫЙ ПОИСК ---
async function hybridSearch(query, options = {}) {
  const {
    limit = SEARCH_LIMIT,
    threshold = 0.6,
    ftsPrefilterLimit = 5000,
    qualityFilter = true
  } = options;

  console.log(`\n🔍 === TRIA HYBRID SEARCH ===`);
  console.log(`📝 Original Query: "${query}"`);

  // Семантическое расширение запроса
  const expandedQuery = expandQuery(query);
  console.log(`🔄 Expanded Query: "${expandedQuery}"`);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("❌ Database connection error:", err.message);
      throw err;
    }
  });

  // Шаг 1: FTS5 предварительная фильтрация
  console.log(`📋 Step 1: FTS5 prefiltering (limit: ${ftsPrefilterLimit})...`);

  const ftsQuery = buildFlexibleFTS5Query(expandedQuery);
  const ftsSql = `
    SELECT 
      hm.id, 
      hm.text, 
      hm.source,
      hm.timestamp,
      hm.embedding,
      hm.semantic_tags
    FROM memory_fts fts
    JOIN holographic_memory hm ON hm.id = fts.rowid
    WHERE fts.memory_fts MATCH ?
    ORDER BY bm25(fts) DESC
    LIMIT ?;
  `;

  return new Promise((resolve, reject) => {
    db.all(ftsSql, [ftsQuery, ftsPrefilterLimit], async (err, candidateRows) => {
      if (err) {
        console.error("❌ FTS5 prefilter error:", err.message);
        reject(err);
        return;
      }

      console.log(`✅ FTS5 found ${candidateRows.length} candidates`);

      if (candidateRows.length === 0) {
        console.log("⚠️ No FTS5 candidates found, falling back to vector-only search...");
        db.close();
        resolve(await vectorOnlySearch(query, options));
        return;
      }

      // Шаг 2: Векторный поиск по кандидатам
      console.log(`🧠 Step 2: Vector similarity calculation...`);

      try {
        const queryEmbedding = await createQueryEmbedding(query);

        const vectorResults = candidateRows.map(row => {
          try {
            const embedding = new Float32Array(row.embedding);
            const similarity = cosineSimilarity(queryEmbedding, Array.from(embedding));
            const contentType = analyzeContentType(row.text);
            const semanticTags = row.semantic_tags ? JSON.parse(row.semantic_tags) : [];

            return {
              id: row.id,
              text: row.text,
              source: row.source,
              timestamp: row.timestamp,
              semantic_tags: semanticTags,
              similarity: similarity,
              contentType: contentType,
              relevanceScore: calculateContentRelevance(row.text, semanticTags, contentType)
            };
          } catch (error) {
            console.warn(`⚠️ Skipping row ${row.id}: ${error.message}`);
            return null;
          }
        }).filter(Boolean);

        // Шаг 3: Интеллектуальная фильтрация и ранжирование
        let finalResults = vectorResults
          .filter(row => row.similarity > threshold)
          .filter(row => qualityFilter ? isHighQualityContent(row.text, row.semantic_tags) : true);

        // Комбинированный скор: векторное сходство + релевантность контента
        finalResults.forEach(row => {
          row.combinedScore = (row.similarity * 0.7) + (row.relevanceScore * 0.3);
        });

        finalResults = finalResults
          .sort((a, b) => b.combinedScore - a.combinedScore)
          .slice(0, limit)
          .map(row => ({
            ...row,
            adjusted_rank: row.combinedScore
          }));

        console.log(`✅ Final results: ${finalResults.length} high-quality matches`);

        db.close();
        resolve(finalResults);

      } catch (error) {
        console.error("❌ Vector search error:", error.message);
        db.close();
        reject(error);
      }
    });
  });
}

// --- FALLBACK: ТОЛЬКО ВЕКТОРНЫЙ ПОИСК ---
async function vectorOnlySearch(query, options = {}) {
  const {
    limit = SEARCH_LIMIT,
    threshold = 0.6,
    batchSize = 10000,
    qualityFilter = true
  } = options;

  console.log(`🧠 Vector-only search mode (batched processing)...`);

  const queryEmbedding = await createQueryEmbedding(query);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("❌ Database connection error:", err.message);
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
          console.error("❌ Batch processing error:", err.message);
          reject(err);
          return;
        }

        if (rows.length === 0) {
          // Финальная обработка
          console.log(`✅ Processed ${processedCount} embeddings`);

          let finalResults = allResults
            .filter(row => row.similarity > threshold)
            .filter(row => qualityFilter ? isHighQualityContent(row.text, row.semantic_tags) : true)
            .sort((a, b) => b.combinedScore - a.similarity)
            .slice(0, limit)
            .map(row => ({
              ...row,
              adjusted_rank: row.similarity
            }));

          console.log(`✅ Vector-only results: ${finalResults.length} matches`);
          db.close();
          resolve(finalResults);
          return;
        }

        // Обработка текущей пачки
        const batchResults = rows.map(row => {
          try {
            const embedding = new Float32Array(row.embedding);
            const similarity = cosineSimilarity(queryEmbedding, Array.from(embedding));
            const contentType = analyzeContentType(row.text);
            const semanticTags = row.semantic_tags ? JSON.parse(row.semantic_tags) : [];

            return {
              id: row.id,
              text: row.text,
              source: row.source,
              timestamp: row.timestamp,
              semantic_tags: semanticTags,
              similarity: similarity,
              contentType: contentType,
              combinedScore: similarity
            };
          } catch (error) {
            console.warn(`⚠️ Skipping row ${row.id}: ${error.message}`);
            return null;
          }
        }).filter(Boolean);

        allResults = allResults.concat(batchResults);
        processedCount += rows.length;

        if (processedCount % 25000 === 0) {
          console.log(`🔄 Processed ${processedCount} embeddings...`);
        }

        offset += batchSize;
        processBatch();
      });
    };

    processBatch();
  });
}

// --- УТИЛИТЫ FTS5 ---
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

  // Комбинированный подход: фразовый поиск + отдельные термы
  const phraseSearch = sanitizeFTS5Query(query);
  const individualTerms = terms
    .map(term => sanitizeFTS5Query(term))
    .join(' OR ');

  return `(${phraseSearch}) OR (${individualTerms})`;
}

// --- ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ ---
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
    console.log('\x1b[33m❌ No relevant results found.\x1b[0m');
    return;
  }

  console.log(`\n📊 === SEARCH RESULTS ===`);
  console.log(`Found ${rows.length} relevant memories:\n`);

  rows.forEach((row, index) => {
    const scoreLabel = row.similarity
      ? `Score: ${row.adjusted_rank.toFixed(4)}`
      : `Rank: ${row.adjusted_rank.toFixed(4)}`;

    const contentTypeLabels = [];
    if (row.contentType) {
      Object.entries(row.contentType).forEach(([type, found]) => {
        if (found) contentTypeLabels.push(type);
      });
    }

    const typeLabel = contentTypeLabels.length > 0
      ? ` [${contentTypeLabels.slice(0, 3).join(', ')}]`
      : '';

    console.log(`\x1b[1m\x1b[36m[${index + 1}] ID: ${row.id} | ${scoreLabel}${typeLabel}\x1b[0m`);
    console.log(`\x1b[2m📁 Source: ${row.source}\x1b[0m`);

    if (row.semantic_tags && row.semantic_tags.length > 0) {
      console.log(`\x1b[2m🏷️  Tags: ${row.semantic_tags.join(', ')}\x1b[0m`);
    }

    console.log(`\x1b[2m${highlight(row.text, originalQuery)}\x1b[0m\n`);
    console.log('━'.repeat(60) + '\n');
  });
}

// --- ГЛАВНАЯ ФУНКЦИЯ ПОИСКА ---
async function searchMemory(query, options = {}) {
  const {
    useVector = true,
    threshold = 0.6,
    qualityFilter = true,
    hybridMode = true
  } = options;

  try {
    console.log(`\n🚀 === TRIA MEMORY CORE SEARCH ===`);
    console.log(`🔍 Query: "${query}"`);
    console.log(`⚙️  Mode: ${hybridMode ? 'HYBRID' : (useVector ? 'VECTOR' : 'FTS5')}`);
    console.log(`🎯 Threshold: ${threshold}, Quality Filter: ${qualityFilter}\n`);

    let results;

    if (hybridMode && useVector) {
      results = await hybridSearch(query, { ...options, threshold, qualityFilter });
    } else if (useVector) {
      results = await vectorOnlySearch(query, { ...options, threshold, qualityFilter });
    } else {
      // FTS5 fallback
      results = await searchMemoryFTS5(query, options);
    }

    displayResults(results, query);

    if (results.length === 0 && hybridMode) {
      console.log("\n🔄 Trying pure FTS5 fallback...");
      const fallbackResults = await searchMemoryFTS5(query, options);
      displayResults(fallbackResults, query);
    }

  } catch (error) {
    console.error("\n❌ SEARCH FAILED:", error.message);
    console.error("Stack:", error.stack);

    // Финальный fallback на FTS5
    if (options.useVector !== false) {
      console.log("\n🆘 Emergency fallback to FTS5...");
      await searchMemory(query, { ...options, useVector: false, hybridMode: false });
    }
  }
}

// --- FTS5 FALLBACK ---
async function searchMemoryFTS5(query, options = {}) {
  const { limit = SEARCH_LIMIT, useFlexibleSearch = true } = options;

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("❌ Database connection error:", err.message);
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
      bm25(fts) as rank,
      CASE 
        WHEN hm.text LIKE '%' || ? || '%' THEN bm25(fts) * 2
        ELSE bm25(fts)
      END as adjusted_rank
    FROM memory_fts fts
    JOIN holographic_memory hm ON hm.id = fts.rowid
    WHERE fts.memory_fts MATCH ?
    ORDER BY adjusted_rank DESC
    LIMIT ?;
  `;

  return new Promise((resolve, reject) => {
    const originalQuery = query.trim();

    db.all(sql, [originalQuery, matchQuery, limit], (err, rows) => {
      if (err) {
        console.error("❌ FTS5 search error:", err.message);
        reject(err);
      } else {
        // Добавляем анализ контента для FTS5 результатов
        const enhancedRows = rows.map(row => ({
          ...row,
          contentType: analyzeContentType(row.text),
          semantic_tags: []
        }));
        resolve(enhancedRows);
      }
      db.close();
    });
  });
}

// --- ВЫПОЛНЕНИЕ СКРИПТА ---
const args = process.argv.slice(2);
const searchQuery = args.join(' ');

if (!searchQuery) {
  console.error(`
🚀 TRIA MEMORY CORE SEARCH ENGINE

Usage: node search_memory.js "your search query"

Examples:
  node search_memory.js "инициализация hologram renderer"
  node search_memory.js "как анимируется область для записи жестов"
  node search_memory.js "3d rendering three.js setup"
  
🔧 Advanced options available in code (threshold, quality filter, etc.)
  `);
  process.exit(1);
}

// Проверка зависимостей
try {
  require('@google/generative-ai');
} catch (error) {
  console.error('❌ Missing dependency. Install with: npm install @google/generative-ai');
  process.exit(1);
}

searchMemory(searchQuery);
