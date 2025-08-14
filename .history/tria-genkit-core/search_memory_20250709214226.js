// tria-genkit-core/search_memory.js - ВЕКТОРНЫЙ ПОИСК
const sqlite3 = require('sqlite3');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const SEARCH_LIMIT = 15;

// API ключи с ротацией для надежности
const GEMINI_API_KEYS = [
  'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g',
  'AIzaSyDOaH1Wxrnd9K7aeWVzSMaxvv0yeIVba5g'
];

let currentKeyIndex = 0;

// --- VECTOR SEARCH FUNCTIONS ---
async function createQueryEmbedding(query) {
  const maxRetries = GEMINI_API_KEYS.length;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const apiKey = GEMINI_API_KEYS[currentKeyIndex];
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'text-embedding-001' });

      console.log(`Creating embedding with API key #${currentKeyIndex + 1}...`);

      const result = await model.embedContent(query);
      return result.embedding.values;

    } catch (error) {
      console.error(`API key #${currentKeyIndex + 1} failed:`, error.message);

      // Переключаемся на следующий ключ
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

// --- VECTOR SEARCH IMPLEMENTATION ---
async function searchMemoryVector(query, options = {}) {
  const {
    limit = SEARCH_LIMIT,
    threshold = 0.6,
    filterLogs = true,
    batchSize = 10000
  } = options;

  if (!query || query.trim().length === 0) {
    console.error("\x1b[31mError: Search query cannot be empty.\x1b[0m");
    return [];
  }

  // Создаем эмбеддинг запроса
  console.log('\x1b[33mCreating query embedding...\x1b[0m');
  const queryEmbedding = await createQueryEmbedding(query);
  console.log(`\x1b[32mQuery embedding created (${queryEmbedding.length} dimensions)\x1b[0m`);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("\x1b[31mError connecting to the database:\x1b[0m", err.message);
      throw err;
    }
  });

  // Получаем все эмбеддинги пачками для оптимизации памяти
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
          console.error("\x1b[31mError during search:\x1b[0m", err.message);
          reject(err);
          return;
        }

        if (rows.length === 0) {
          // Обработка завершена
          console.log(`\x1b[32mProcessed ${processedCount} embeddings\x1b[0m`);

          // Сортируем и фильтруем результаты
          const finalResults = allResults
            .filter(row => row.similarity > threshold)
            .filter(row => filterLogs ? !isServerLog(row.text) : true)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
            .map(row => ({
              ...row,
              adjusted_rank: row.similarity
            }));

          resolve(finalResults);
          db.close();
          return;
        }

        // Обрабатываем текущую пачку
        const batchResults = rows.map(row => {
          try {
            // Преобразуем BLOB обратно в массив
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
            console.warn(`Skipping row ${row.id}: ${error.message}`);
            return null;
          }
        }).filter(Boolean);

        allResults = allResults.concat(batchResults);
        processedCount += rows.length;

        // Показываем прогресс
        if (processedCount % 5000 === 0) {
          console.log(`\x1b[36mProcessed ${processedCount} embeddings...\x1b[0m`);
        }

        offset += batchSize;
        processBatch(); // Обрабатываем следующую пачку
      });
    };

    processBatch();
  });
}

// --- UTILITY FUNCTIONS ---
function isServerLog(text) {
  const logPatterns = [
    /INFO:\s+\d+\.\d+\.\d+\.\d+:\d+/,
    /GET \/static/,
    /404 Not Found/,
    /200 OK/,
    /HTTP\/1\.1/,
    /POST \/api/
  ];

  return logPatterns.some(pattern => pattern.test(text));
}

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
  // Дополнительная фильтрация логов в выводе
  const filteredRows = rows.filter(row => !isServerLog(row.text));

  if (filteredRows.length === 0 && rows.length > 0) {
    console.log('\x1b[33mВсе результаты - серверные логи. Показываю исходные результаты:\x1b[0m\n');
    filteredRows.push(...rows.slice(0, 5)); // Показываем первые 5
  }

  if (filteredRows.length === 0) {
    console.log('\x1b[33mНо найденных релевантных результатов.\x1b[0m');
    return;
  }

  filteredRows.forEach((row, index) => {
    const scoreLabel = row.similarity ?
      `Similarity: ${row.similarity.toFixed(4)}` :
      `Rank: ${row.adjusted_rank.toFixed(4)}`;

    console.log(`\x1b[1m\x1b[36m[${index + 1}] ID: ${row.id} | Source: ${row.source} | ${scoreLabel}\x1b[0m`);
    console.log(`\x1b[2m${highlight(row.text, originalQuery)}\x1b[0m\n`);
    console.log('--------------------------------------------------\n');
  });
}

// --- FTS5 FALLBACK ---
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
        resolve(rows);
      }
      db.close();
    });
  });
}

// --- MAIN SEARCH FUNCTION ---
async function searchMemory(query, options = {}) {
  const { useVector = true, threshold = 0.6, filterLogs = true } = options;

  try {
    console.log(`\n\x1b[1m\x1b[34m--- Searching Tria Memory Core for: "${query}" ---\x1b[0m`);
    console.log(`\x1b[33mUsing ${useVector ? 'VECTOR' : 'FTS5'} search...\x1b[0m\n`);

    const results = useVector ?
      await searchMemoryVector(query, { ...options, threshold, filterLogs }) :
      await searchMemoryFTS5(query, options);

    if (results.length === 0) {
      console.log("\x1b[33mNo relevant memories found.\x1b[0m");

      if (useVector) {
        console.log("Trying FTS5 fallback...");
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
      console.log(`\x1b[32mFound ${results.length} relevant memories (similarity > ${threshold}):\x1b[0m\n`);
      displayResults(results, query);
    }
  } catch (error) {
    console.error("\x1b[31mVector search failed:\x1b[0m", error.message);

    // Fallback на FTS5 при ошибке
    if (useVector) {
      console.log("\x1b[33mFalling back to FTS5 search...\x1b[0m");
      await searchMemory(query, { ...options, useVector: false });
    }
  }
}

// --- SCRIPT EXECUTION ---
const args = process.argv.slice(2);
const searchQuery = args.join(' ');

if (!searchQuery) {
  console.error('\x1b[31mUsage: node search_memory.js "your search query"\x1b[0m');
  process.exit(1);
}

// Проверка наличия зависимостей
try {
  require('@google/generative-ai');
} catch (error) {
  console.error('\x1b[31mМссing dependency. Install with: npm install @google/generative-ai\x1b[0m');
  process.exit(1);
}

searchMemory(searchQuery);
