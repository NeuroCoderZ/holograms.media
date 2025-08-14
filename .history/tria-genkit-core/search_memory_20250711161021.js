// tria-genkit-core/search_memory.js - TRIA ANALYTICS ENGINE v1.5
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- КОНФИГУРАЦИЯ ---
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const SEARCH_LIMIT = 15;
const DEBUG_MODE = process.env.DEBUG_TRIA || false;

// API ключи для эмбеддингов
const GEMINI_API_KEYS = [
  'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g',
  'AIzaSyDOaH1Wxrnd9K7aeWVzSMaxvv0yeIVba5g'
];

let currentKeyIndex = 0;
let dbSchema = null;

// --- ДИАГНОСТИЧЕСКИЕ ФУНКЦИИ ---
function debugLog(category, message, data = null) {
  if (DEBUG_MODE || process.argv.includes('--debug')) {
    const timestamp = new Date().toISOString();
    console.log(`\x1b[90m[${timestamp}] [${category}]\x1b[0m ${message}`);
    if (data) {
      console.log(`\x1b[90m${JSON.stringify(data, null, 2)}\x1b[0m`);
    }
  }
}

function logSimilarityDistribution(similarities) {
  const sorted = similarities.sort((a, b) => b - a);
  const percentiles = {
    max: sorted[0] || 0,
    p95: sorted[Math.floor(sorted.length * 0.05)] || 0,
    p75: sorted[Math.floor(sorted.length * 0.25)] || 0,
    p50: sorted[Math.floor(sorted.length * 0.5)] || 0,
    p25: sorted[Math.floor(sorted.length * 0.75)] || 0,
    min: sorted[sorted.length - 1] || 0
  };

  console.log(`\x1b[36m📊 Similarity Distribution:\x1b[0m`);
  console.log(`   Max: ${percentiles.max.toFixed(4)}, 95%: ${percentiles.p95.toFixed(4)}, 75%: ${percentiles.p75.toFixed(4)}`);
  console.log(`   Median: ${percentiles.p50.toFixed(4)}, 25%: ${percentiles.p25.toFixed(4)}, Min: ${percentiles.min.toFixed(4)}`);

  return percentiles;
}

// --- УЛУЧШЕННЫЙ АНАЛИЗ КОНТЕНТА ---
function analyzeContentQuality(text) {
  // Агрессивные паттерны для низкокачественного контента
  const lowQualityPatterns = [
    // HTTP логи и серверные логи
    /INFO:\s+\d+\.\d+\.\d+\.\d+:\d+\s+-\s+"(GET|POST|PUT|DELETE)/i,
    /HTTP\/1\.[01]"\s+(200|404|500|301|302)/,
    /^\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/,

    // SVG и техническая разметка
    /<svg[^>]*>[\s\S]*<\/svg>/i,
    /path\s+d="[M|L|C|Z|H|V|\d|\s|,|\-|\.]+"/i,
    /viewBox="[\d\s\-\.]+"/i,
    /fill="#[a-f0-9]{3,6}"/i,

    // Файловые пути и URL
    /^\/[a-zA-Z0-9\/\-\_\.]+\.(js|css|html|json|png|jpg|svg)$/,
    /^https?:\/\/[^\s]+$/,

    // Чистые числовые данные и хеши
    /^[a-f0-9]{32,}$/i,
    /^\s*[\d\.\-\,\s]+$/,

    // HTML атрибуты и CSS без контекста
    /^(class|id|style|width|height|xmlns)="[^"]*"$/i,
    /^\s*[\{\}\[\]\(\)\;\,]+\s*$/,

    // Layout и позиционирование без смысла
    /^\s*\[Layout\]\s+Position\s+update:/i,
    /Vector3\(\s*[\d\.\-\,\s]+\)/i,
  ];

  // Паттерны высококачественного контента
  const highQualityPatterns = [
    // Документация и объяснения
    /(как|что|зачем|почему|для чего|каким образом)/i,
    /(function|method|class|объект|функция|метод)/i,
    /(initialize|init|setup|инициализ|настройка|установка)/i,

    // Код с логикой
    /(if|else|for|while|switch|если|иначе|цикл)/i,
    /(async|await|promise|then|catch|асинхронн)/i,

    // Техническое описание
    /(animation|render|display|анимация|рендер|отображ)/i,
    /(gesture|touch|input|жест|касание|ввод)/i,
    /(hologram|3d|webgl|three\.js|голограмм)/i,
  ];

  let qualityScore = 0.5; // Базовый скор

  // Штрафы за низкокачественный контент
  for (const pattern of lowQualityPatterns) {
    if (pattern.test(text)) {
      qualityScore -= 0.3;
      debugLog('QUALITY', `Low quality pattern matched: ${pattern}`, { text: text.substring(0, 100) });
    }
  }

  // Бонусы за высококачественный контент
  for (const pattern of highQualityPatterns) {
    if (pattern.test(text)) {
      qualityScore += 0.2;
    }
  }

  // Анализ структуры текста
  const length = text.length;
  const wordCount = (text.match(/\b\w+\b/g) || []).length;
  const letterRatio = (text.match(/[a-zA-Zа-яА-Я]/g) || []).length / length;
  const punctuationRatio = (text.match(/[.!?,:;]/g) || []).length / length;

  // Штрафы за плохую структуру
  if (length < 50) qualityScore -= 0.4;
  if (wordCount < 5) qualityScore -= 0.3;
  if (letterRatio < 0.3) qualityScore -= 0.4;
  if (punctuationRatio < 0.01) qualityScore -= 0.2;

  // Бонусы за хорошую структуру
  if (length > 200 && wordCount > 20) qualityScore += 0.2;
  if (letterRatio > 0.6) qualityScore += 0.1;

  return Math.max(0, Math.min(1, qualityScore));
}

function isHighQualityContent(text) {
  const qualityScore = analyzeContentQuality(text);
  const threshold = 0.3; // Агрессивный порог

  debugLog('QUALITY', `Content quality: ${qualityScore.toFixed(3)}`, {
    text: text.substring(0, 100),
    passed: qualityScore >= threshold
  });

  return qualityScore >= threshold;
}

// --- ВЕКТОРНЫЕ ОПЕРАЦИИ ---
async function createQueryEmbedding(query) {
  const maxRetries = GEMINI_API_KEYS.length;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const apiKey = GEMINI_API_KEYS[currentKeyIndex];
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

      console.log(`🔮 Creating embedding with API key #${currentKeyIndex + 1}...`);
      debugLog('EMBEDDING', `Attempting with key ${currentKeyIndex + 1}`, { query });

      const result = await model.embedContent(query);
      const embedding = result.embedding.values;

      debugLog('EMBEDDING', `Success: ${embedding.length} dimensions`, {
        firstFew: embedding.slice(0, 5),
        magnitude: Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0))
      });

      return embedding;

    } catch (error) {
      console.error(`❌ API key #${currentKeyIndex + 1} failed:`, error.message);
      debugLog('EMBEDDING', `API Error`, { error: error.message, attempt, keyIndex: currentKeyIndex });

      currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;

      if (attempt === maxRetries - 1) {
        throw new Error(`All API keys failed. Last error: ${error.message}`);
      }
    }
  }
}

function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    debugLog('SIMILARITY', `Dimension mismatch: ${vecA.length} vs ${vecB.length}`);
    throw new Error(`Vector dimensions must match: ${vecA.length} vs ${vecB.length}`);
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
    debugLog('SIMILARITY', 'Zero magnitude vector detected');
    return 0;
  }

  const similarity = dotProduct / (magnitudeA * magnitudeB);

  // Логируем только экстремальные значения
  if (similarity > 0.7 || similarity < -0.1) {
    debugLog('SIMILARITY', `Extreme similarity: ${similarity.toFixed(4)}`);
  }

  return similarity;
}

// --- СХЕМА БАЗЫ ДАННЫХ ---
async function getDbSchema() {
  if (dbSchema) return dbSchema;

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(holographic_memory)", [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        dbSchema = rows.map(row => row.name);
        debugLog('SCHEMA', 'Database schema detected', { columns: dbSchema });
        resolve(dbSchema);
      }
      db.close();
    });
  });
}

// --- УЛУЧШЕННЫЙ ВЕКТОРНЫЙ ПОИСК ---
async function searchMemoryVector(query, options = {}) {
  const {
    limit = SEARCH_LIMIT,
    threshold = 0.1,  // Понижен для диагностики
    batchSize = 5000
  } = options;

  if (!query || query.trim().length === 0) {
    console.error("❌ Search query cannot be empty");
    return [];
  }

  console.log(`🔍 === TRIA ANALYTICS: VECTOR SEARCH v1.5 ===`);
  console.log(`📝 Query: "${query}"`);
  console.log(`🎯 Threshold: ${threshold}, Batch: ${batchSize}`);

  // Создаем эмбеддинг запроса
  const queryEmbedding = await createQueryEmbedding(query);
  console.log(`✅ Query embedding ready (${queryEmbedding.length} dimensions)`);

  // Получаем схему БД
  const schema = await getDbSchema();

  // Строим адаптивный SQL запрос
  const availableColumns = ['id', 'text', 'source', 'timestamp', 'embedding'];
  const optionalColumns = ['semantic_tags', 'agent_context', 'holographic_metadata'];

  const selectColumns = availableColumns.concat(
    optionalColumns.filter(col => schema.includes(col))
  );

  const sql = `
    SELECT ${selectColumns.map(col => `hm.${col}`).join(', ')}
    FROM holographic_memory hm
    WHERE hm.embedding IS NOT NULL 
    AND length(hm.text) > 30
    ORDER BY hm.id
    LIMIT ? OFFSET ?;
  `;

  debugLog('SQL', 'Vector search query', { sql, columns: selectColumns });

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    let allResults = [];
    let offset = 0;
    let processedCount = 0;
    let validEmbeddings = 0;
    let similarityScores = [];

    const processBatch = () => {
      db.all(sql, [batchSize, offset], (err, rows) => {
        if (err) {
          console.error("❌ Vector search error:", err.message);
          reject(err);
          return;
        }

        if (rows.length === 0) {
          console.log(`✅ Processed ${processedCount} entries, ${validEmbeddings} valid embeddings`);

          // Анализируем распределение similarity
          if (similarityScores.length > 0) {
            const stats = logSimilarityDistribution(similarityScores);

            // Адаптивная калибровка порога
            let adaptiveThreshold = threshold;
            if (stats.max < 0.3) {
              adaptiveThreshold = Math.max(0.05, stats.p75);
              console.log(`📊 Adaptive threshold: ${adaptiveThreshold.toFixed(4)} (was ${threshold})`);
            }

            // Фильтрация и ранжирование результатов
            let filteredResults = allResults
              .filter(row => row.similarity > adaptiveThreshold)
              .filter(row => isHighQualityContent(row.text))
              .map(row => {
                const qualityScore = analyzeContentQuality(row.text);
                return {
                  ...row,
                  qualityScore: qualityScore,
                  finalScore: row.similarity * 0.7 + qualityScore * 0.3
                };
              })
              .sort((a, b) => b.finalScore - a.finalScore)
              .slice(0, limit);

            console.log(`🎯 Found ${filteredResults.length} high-quality results (threshold: ${adaptiveThreshold.toFixed(4)})`);

            if (filteredResults.length === 0 && similarityScores.length > 100) {
              console.log(`⚠️ No results passed quality filter. Top similarities:`);
              const topSimilar = allResults
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 3);
              topSimilar.forEach((row, i) => {
                console.log(`   ${i + 1}. Sim: ${row.similarity.toFixed(4)}, Quality: ${analyzeContentQuality(row.text).toFixed(3)}`);
                console.log(`      Text: ${row.text.substring(0, 100)}...`);
              });
            }

            resolve(filteredResults);
          } else {
            console.log("❌ No valid embeddings found in database");
            resolve([]);
          }

          db.close();
          return;
        }

        // Обрабатываем пачку
        const batchResults = rows.map(row => {
          try {
            if (!row.embedding) {
              debugLog('EMBEDDING', `No embedding for row ${row.id}`);
              return null;
            }

            const embedding = new Float32Array(row.embedding);
            if (embedding.length === 0) {
              debugLog('EMBEDDING', `Empty embedding for row ${row.id}`);
              return null;
            }

            const similarity = cosineSimilarity(queryEmbedding, Array.from(embedding));
            validEmbeddings++;
            similarityScores.push(similarity);

            return {
              id: row.id,
              text: row.text,
              source: row.source,
              timestamp: row.timestamp,
              similarity: similarity,
              semantic_tags: row.semantic_tags,
              agent_context: row.agent_context,
              holographic_metadata: row.holographic_metadata
            };
          } catch (error) {
            debugLog('PROCESSING', `Error processing row ${row.id}`, { error: error.message });
            return null;
          }
        }).filter(Boolean);

        allResults = allResults.concat(batchResults);
        processedCount += rows.length;

        if (processedCount % 10000 === 0) {
          console.log(`📊 Processed ${processedCount} entries (${validEmbeddings} valid)`);
        }

        offset += batchSize;
        processBatch();
      });
    };

    processBatch();
  });
}

// --- УЛУЧШЕННЫЙ FTS5 ПОИСК ---
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

  console.log(`🔍 === TRIA ANALYTICS: FTS5 SEARCH v1.5 ===`);
  console.log(`📝 Query: "${query}"`);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  const matchQuery = useFlexibleSearch ?
    buildFlexibleFTS5Query(query) :
    sanitizeFTS5Query(query);

  debugLog('FTS5', 'Query constructed', { original: query, fts5: matchQuery });

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
    AND length(hm.text) > 30
    ORDER BY adjusted_rank DESC
    LIMIT ?;
  `;

  return new Promise((resolve, reject) => {
    const originalQuery = query.trim();

    db.all(sql, [originalQuery, matchQuery, limit * 3], (err, rows) => {
      if (err) {
        console.error("❌ FTS5 search error:", err.message);
        reject(err);
        return;
      }

      console.log(`📊 FTS5 raw results: ${rows.length}`);

      // Агрессивная фильтрация для FTS5
      const filteredRows = rows
        .filter(row => isHighQualityContent(row.text))
        .map(row => ({
          ...row,
          qualityScore: analyzeContentQuality(row.text),
          similarity: Math.abs(row.adjusted_rank) / 10, // Нормализация для совместимости
          finalScore: Math.abs(row.adjusted_rank) / 10
        }))
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, limit);

      console.log(`✅ FTS5 filtered results: ${filteredRows.length}`);

      if (filteredRows.length === 0 && rows.length > 0) {
        console.log(`⚠️ All FTS5 results filtered out. Sample raw results:`);
        rows.slice(0, 3).forEach((row, i) => {
          console.log(`   ${i + 1}. Quality: ${analyzeContentQuality(row.text).toFixed(3)}`);
          console.log(`      Text: ${row.text.substring(0, 100)}...`);
        });
      }

      resolve(filteredRows);
      db.close();
    });
  });
}

// --- УЛУЧШЕННЫЙ ВЫВОД РЕЗУЛЬТАТОВ ---
function highlight(text, query) {
  const terms = query.split(/\s+/).filter(Boolean);
  let highlightedText = text;

  terms.forEach(term => {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    highlightedText = highlightedText.replace(regex, '\x1b[32m$1\x1b[0m');
  });

  return highlightedText;
}

function displayResults(rows, originalQuery, searchType = 'VECTOR') {
  if (rows.length === 0) {
    console.log('\x1b[33mНет найденных релевантных результатов.\x1b[0m');
    return;
  }

  console.log(`\n🎯 === ${searchType} RESULTS ===`);
  console.log(`📝 Query: "${originalQuery}"`);
  console.log(`📊 Found: ${rows.length} high-quality results\n`);

  rows.forEach((row, index) => {
    const similarityLabel = row.similarity ?
      `Similarity: ${row.similarity.toFixed(4)}` :
      `Rank: ${Math.abs(row.adjusted_rank || 0).toFixed(4)}`;

    const qualityLabel = row.qualityScore ?
      ` | Quality: ${row.qualityScore.toFixed(3)}` : '';

    const scoreLabel = row.finalScore ?
      ` | Final: ${row.finalScore.toFixed(4)}` : '';

    console.log(`\x1b[1m\x1b[36m[${index + 1}] ID: ${row.id} | ${path.basename(row.source)}\x1b[0m`);
    console.log(`\x1b[33m📊 ${similarityLabel}${qualityLabel}${scoreLabel}\x1b[0m`);

    // Показываем релевантный отрывок
    const displayText = row.text.length > 400 ?
      row.text.substring(0, 400) + '...' :
      row.text;

    console.log(`\x1b[2m${highlight(displayText, originalQuery)}\x1b[0m\n`);
    console.log('─'.repeat(80));
  });
}

// --- ГЛАВНАЯ ФУНКЦИЯ ПОИСКА ---
async function searchMemory(query, options = {}) {
  const {
    useVector = true,
    threshold = 0.1,  // Понижен по умолчанию
    filterLogs = true
  } = options;

  try {
    console.log(`\n\x1b[1m\x1b[34m🧠 TRIA MEMORY CORE v1.5 🧠\x1b[0m`);
    console.log(`\x1b[33mQuery: "${query}"\x1b[0m`);
    console.log(`\x1b[33mMode: ${useVector ? 'VECTOR + FTS5 FALLBACK' : 'FTS5 ONLY'}\x1b[0m\n`);

    let results = [];

    if (useVector) {
      try {
        results = await searchMemoryVector(query, { ...options, threshold });

        if (results.length > 0) {
          displayResults(results, query, 'VECTOR');
          return results;
        } else {
          console.log(`\x1b[33m⚠️ Vector search found no results. Trying FTS5 fallback...\x1b[0m\n`);
        }
      } catch (vectorError) {
        console.error(`\x1b[31m❌ Vector search failed: ${vectorError.message}\x1b[0m`);
        console.log(`\x1b[33m🔄 Falling back to FTS5 search...\x1b[0m\n`);
      }
    }

    // FTS5 fallback или direct FTS5
    results = await searchMemoryFTS5(query, options);
    displayResults(results, query, 'FTS5');

    return results;

  } catch (error) {
    console.error(`\x1b[31m❌ Search completely failed: ${error.message}\x1b[0m`);
    debugLog('ERROR', 'Complete search failure', { error: error.stack });
    return [];
  }
}

// --- КОМАНДА СХЕМЫ БД ---
async function showDatabaseSchema() {
  console.log(`\n\x1b[1m\x1b[34m📊 TRIA DATABASE SCHEMA\x1b[0m`);

  try {
    const schema = await getDbSchema();

    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

    // Получаем детальную информацию о колонках
    db.all("PRAGMA table_info(holographic_memory)", [], (err, columns) => {
      if (err) {
        console.error("❌ Schema error:", err.message);
        return;
      }

      console.log(`\n📋 Table: holographic_memory`);
      console.log(`📊 Columns: ${columns.length}\n`);

      columns.forEach(col => {
        const nullable = col.notnull ? 'NOT NULL' : 'NULLABLE';
        const defaultVal = col.dflt_value ? `DEFAULT: ${col.dflt_value}` : '';
        console.log(`   ${col.name.padEnd(20)} | ${col.type.padEnd(10)} | ${nullable} ${defaultVal}`);
      });

      // Получаем статистику записей
      db.get("SELECT COUNT(*) as total FROM holographic_memory", [], (err, row) => {
        if (!err) {
          console.log(`\n📈 Total records: ${row.total.toLocaleString()}`);
        }

        db.get("SELECT COUNT(*) as with_embeddings FROM holographic_memory WHERE embedding IS NOT NULL", [], (err, row) => {
          if (!err) {
            console.log(`🔮 Records with embeddings: ${row.with_embeddings.toLocaleString()}`);
          }
          db.close();
        });
      });
    });

  } catch (error) {
    console.error("❌ Schema analysis failed:", error.message);
  }
}

// --- CLI ОБРАБОТКА ---
function showHelp() {
  console.log(`
\x1b[1m\x1b[34m🧠 TRIA ANALYTICS ENGINE v1.5 🧠\x1b[0m

\x1b[33mUSAGE:\x1b[0m
  node search_memory.js "query"                    # Vector search with FTS5 fallback
  node search_memory.js --fts5 "query"            # FTS5 search only
  node search_memory.js --schema                  # Show database schema
  node search_memory.js --debug "query"           # Debug mode with detailed logs
  node search_memory.js --help                    # Show this help

\x1b[33mOPTIONS:\x1b[0m
  --threshold 0.2    # Set similarity threshold (default: 0.1)
  --limit 20         # Set result limit (default: 15)
  --debug           # Enable debug logging
  --fts5            # Force FTS5 search only
  --schema          # Show database schema info

\x1b[33mEXAMPLES:\x1b[0m
  node search_memory.js "hologram animation three.js"
  node search_memory.js --fts5 "gesture tracking"
  node search_memory.js --debug --threshold 0.05 "rendering"
  node search_memory.js --schema
  `);
}

// --- ВЫПОЛНЕНИЕ СКРИПТА ---
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    return;
  }

  if (args.includes('--schema')) {
    await showDatabaseSchema();
    return;
  }

  // Проверка зависимостей
  try {
    require('@google/generative-ai');
    console.log('\x1b[32m✅ All dependencies found\x1b[0m');
  } catch (error) {
    console.error('\x1b[31m❌ Missing dependency. Install with: npm install @google/generative-ai\x1b[0m');
    process.exit(1);
  }

  // Извлечение параметров
  const options = {
    useVector: !args.includes('--fts5'),
    threshold: 0.1,
    limit: 15
  };

  // Парсинг числовых параметров
  const thresholdIndex = args.indexOf('--threshold');
  if (thresholdIndex !== -1 && args[thresholdIndex + 1]) {
    options.threshold = parseFloat(args[thresholdIndex + 1]);
  }

  const limitIndex = args.indexOf('--limit');
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    options.limit = parseInt(args[limitIndex + 1]);
  }

  // Извлечение запроса
  const query = args
    .filter(arg => !arg.startsWith('--'))
    .filter((arg, index) => {
      const prevArg = args[args.indexOf(arg) - 1];
      return !['--threshold', '--limit'].includes(prevArg);
    })
    .join(' ');

  if (!query) {
    console.error('\x1b[31m❌ Search query is required\x1b[0m');
    showHelp();
    process.exit(1);
  }

  await searchMemory(query, options);
}

// Запуск с обработкой ошибок
main().catch(error => {
  console.error('\x1b[31m💀 Fatal error:\x1b[0m', error);
  process.exit(1);
});
