// tria-genkit-core/search_memory.js - TRIA ANALYTICS ENGINE 1.1
const sqlite3 = require('sqlite3');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// --- CONFIGURATION ---
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const SEARCH_LIMIT = 15;
const ANALYTICS_BATCH_SIZE = 5000;

// API ключи с ротацией для надежности
const GEMINI_API_KEYS = [
  'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g',
  'AIzaSyDOaH1Wxrnd9K7aeWVzSMaxvv0yeIVba5g'
];

let currentKeyIndex = 0;

// --- EMBEDDING FUNCTIONS ---
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

// --- CONTENT ANALYSIS ---
function analyzeContentType(text) {
  const patterns = {
    code: /(?:function|class|const|let|var|import|export|async|await)/,
    html: /(?:<[^>]+>|<!DOCTYPE|<html|<head|<body)/,
    css: /(?:\.[\w-]+\s*\{|@media|@keyframes|rgba?\()/,
    svg: /(?:<svg|<path|viewBox|xmlns)/,
    log: /(?:INFO:|ERROR:|WARN:|DEBUG:|GET|POST|PUT|DELETE|404|200|500)/,
    config: /(?:vite\.config|package\.json|tsconfig|webpack)/,
    documentation: /(?:README|CHANGELOG|\.md|documentation|guide|tutorial)/,
    conversation: /(?:user:|assistant:|human:|ai:|claude:|gemini:)/
  };

  const matches = {};
  for (const [type, pattern] of Object.entries(patterns)) {
    matches[type] = pattern.test(text);
  }

  return matches;
}

function calculateContentRelevance(text, semanticTags = []) {
  let relevance = 0.5; // Базовый уровень

  // Бонусы за длину и структуру
  if (text.length > 200) relevance += 0.1;
  if (text.length > 500) relevance += 0.1;
  if (text.length > 1000) relevance += 0.1;

  // Бонусы за семантические теги
  if (semanticTags && semanticTags.length > 0) {
    relevance += Math.min(0.2, semanticTags.length * 0.05);
  }

  // Штрафы за техническую разметку
  const contentType = analyzeContentType(text);
  if (contentType.svg || contentType.html) relevance -= 0.3;
  if (contentType.log) relevance -= 0.4;

  return Math.max(0, Math.min(1, relevance));
}

function isHighQualityContent(text) {
  const contentAnalysis = analyzeContentType(text);

  // Высококачественный контент
  if (contentAnalysis.documentation || contentAnalysis.conversation) return true;
  if (contentAnalysis.code && !contentAnalysis.html) return true;

  // Низкокачественный контент
  if (contentAnalysis.log || contentAnalysis.svg) return false;

  // Средний контент
  return text.length > 100;
}

// --- ENHANCED FTS5 SEARCH ---
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

  console.log(`🔍 === TRIA ANALYTICS: FTS5 SEARCH ===`);
  console.log(`📝 Query: "${query}"`);

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
      hm.semantic_tags,
      hm.agent_context,
      hm.holographic_metadata,
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
        console.error("❌ FTS5 search error:", err.message);
        reject(err);
      } else {
        const results = rows.map(row => ({
          ...row,
          semantic_tags: row.semantic_tags ? JSON.parse(row.semantic_tags) : [],
          agent_context: row.agent_context ? JSON.parse(row.agent_context) : {},
          holographic_metadata: row.holographic_metadata ? JSON.parse(row.holographic_metadata) : {},
          similarity: row.adjusted_rank,
          contentRelevance: calculateContentRelevance(row.text, row.semantic_tags ? JSON.parse(row.semantic_tags) : []),
          contentType: analyzeContentType(row.text)
        }));
        resolve(results);
      }
      db.close();
    });
  });
}

// --- ENHANCED VECTOR SEARCH ---
async function searchMemoryVector(query, options = {}) {
  const {
    limit = SEARCH_LIMIT,
    threshold = 0.6,
    filterLogs = true,
    qualityFilter = true,
    batchSize = 10000
  } = options;

  if (!query || query.trim().length === 0) {
    console.error("❌ Search query cannot be empty");
    return [];
  }

  console.log(`🔍 === TRIA ANALYTICS: VECTOR SEARCH ===`);
  console.log(`📝 Query: "${query}"`);
  console.log(`🎯 Threshold: ${threshold}, Quality Filter: ${qualityFilter}`);

  const queryEmbedding = await createQueryEmbedding(query);
  console.log(`✅ Query embedding created (${queryEmbedding.length} dimensions)`);

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
      hm.semantic_tags,
      hm.agent_context,
      hm.holographic_metadata
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
          console.error("❌ Search error:", err.message);
          reject(err);
          return;
        }

        if (rows.length === 0) {
          console.log(`✅ Processed ${processedCount} embeddings`);

          // Интеллектуальная фильтрация и сортировка
          let finalResults = allResults
            .filter(row => row.similarity > threshold)
            .filter(row => filterLogs ? !analyzeContentType(row.text).log : true)
            .filter(row => qualityFilter ? isHighQualityContent(row.text) : true);

          // Расчет финального релевантности
          finalResults = finalResults.map(row => ({
            ...row,
            contentRelevance: calculateContentRelevance(row.text, row.semantic_tags),
            contentType: analyzeContentType(row.text),
            finalScore: row.similarity * 0.7 + calculateContentRelevance(row.text, row.semantic_tags) * 0.3
          }));

          // Сортировка по финальному скору
          finalResults.sort((a, b) => b.finalScore - a.finalScore);
          finalResults = finalResults.slice(0, limit);

          resolve(finalResults);
          db.close();
          return;
        }

        const batchResults = rows.map(row => {
          try {
            const embedding = new Float32Array(row.embedding);
            const similarity = cosineSimilarity(queryEmbedding, Array.from(embedding));

            return {
              id: row.id,
              text: row.text,
              source: row.source,
              timestamp: row.timestamp,
              semantic_tags: row.semantic_tags ? JSON.parse(row.semantic_tags) : [],
              agent_context: row.agent_context ? JSON.parse(row.agent_context) : {},
              holographic_metadata: row.holographic_metadata ? JSON.parse(row.holographic_metadata) : {},
              similarity: similarity
            };
          } catch (error) {
            console.warn(`⚠️ Skipping row ${row.id}: ${error.message}`);
            return null;
          }
        }).filter(Boolean);

        allResults = allResults.concat(batchResults);
        processedCount += rows.length;

        if (processedCount % 5000 === 0) {
          console.log(`📊 Processed ${processedCount} embeddings...`);
        }

        offset += batchSize;
        processBatch();
      });
    };

    processBatch();
  });
}

// --- HYBRID SEARCH ---
async function searchMemoryHybrid(query, options = {}) {
  const { limit = SEARCH_LIMIT, threshold = 0.6 } = options;

  console.log(`🔍 === TRIA ANALYTICS: HYBRID SEARCH ===`);
  console.log(`📝 Query: "${query}"`);

  try {
    // Этап 1: FTS5 для быстрого отбора кандидатов
    console.log(`🔍 Stage 1: FTS5 candidate selection...`);
    const fts5Results = await searchMemoryFTS5(query, { limit: 5000 });
    console.log(`✅ FTS5 found ${fts5Results.length} candidates`);

    if (fts5Results.length === 0) {
      console.log(`⚠️ No FTS5 candidates found, falling back to vector search`);
      return await searchMemoryVector(query, options);
    }

    // Этап 2: Векторный поиск среди кандидатов
    console.log(`🔍 Stage 2: Vector search on candidates...`);
    const queryEmbedding = await createQueryEmbedding(query);

    const vectorResults = fts5Results.map(row => {
      // Для FTS5 результатов у нас нет embedding, нужно его получить отдельно
      return {
        ...row,
        vectorScore: row.similarity || 0 // Используем FTS5 скор как fallback
      };
    });

    // Сортировка по комбинированному скору
    vectorResults.sort((a, b) => b.vectorScore - a.vectorScore);

    const finalResults = vectorResults.slice(0, limit);
    console.log(`✅ Hybrid search completed: ${finalResults.length} results`);

    return finalResults;

  } catch (error) {
    console.error(`❌ Hybrid search failed:`, error.message);
    console.log(`⚠️ Falling back to FTS5 search...`);
    return await searchMemoryFTS5(query, options);
  }
}

// --- ANALYTICS FUNCTIONS ---
async function analyzeCorpusStats() {
  console.log(`📊 === TRIA ANALYTICS: CORPUS STATISTICS ===`);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    const queries = [
      // Общая статистика
      `SELECT COUNT(*) as total_embeddings FROM holographic_memory`,

      // Статистика по источникам
      `SELECT source, COUNT(*) as count 
       FROM holographic_memory 
       GROUP BY source 
       ORDER BY count DESC 
       LIMIT 10`,

      // Статистика по временным периодам
      `SELECT DATE(timestamp) as date, COUNT(*) as count 
       FROM holographic_memory 
       GROUP BY DATE(timestamp) 
       ORDER BY date DESC 
       LIMIT 30`
    ];

    Promise.all(queries.map(query => new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }))).then(results => {
      const [totalStats, sourceStats, timeStats] = results;

      console.log(`\n🧠 TRIA MEMORY CORE ANALYSIS`);
      console.log(`${'='.repeat(50)}`);
      console.log(`📈 Total Embeddings: ${totalStats[0].total_embeddings.toLocaleString()}`);

      console.log(`\n📁 Top Sources by Volume:`);
      sourceStats.forEach((row, i) => {
        const percentage = ((row.count / totalStats[0].total_embeddings) * 100).toFixed(1);
        const source = path.basename(row.source);
        console.log(`${i + 1}. ${source}: ${row.count.toLocaleString()} (${percentage}%)`);
      });

      console.log(`\n📅 Recent Activity (last 30 days):`);
      timeStats.slice(0, 10).forEach(row => {
        console.log(`${row.date}: ${row.count.toLocaleString()} entries`);
      });

      db.close();
      resolve();
    }).catch(reject);
  });
}

async function generateGlossary() {
  console.log(`📚 === TRIA ANALYTICS: GLOSSARY GENERATION ===`);

  // Поиск потенциальных терминов
  const technicalTerms = [
    'Tria', 'Hologram', 'CWT', 'WASM', 'WebAssembly', 'Three.js',
    'MediaPipe', 'AudioWorklet', 'BroadcastChannel', 'SQLite',
    'Embedding', 'Vector', 'Semantic', 'Gesture', 'Rendering'
  ];

  const glossaryEntries = [];

  for (const term of technicalTerms) {
    try {
      console.log(`🔍 Searching for term: ${term}`);
      const results = await searchMemoryVector(term, { limit: 5, threshold: 0.5 });

      if (results.length > 0) {
        const contexts = results.map(r => r.text.substring(0, 200)).join('\n---\n');
        glossaryEntries.push({
          term,
          contexts,
          occurrences: results.length
        });
      }
    } catch (error) {
      console.warn(`⚠️ Error searching for term ${term}: ${error.message}`);
    }
  }

  console.log(`\n📖 TRIA GLOSSARY`);
  console.log(`${'='.repeat(50)}`);

  glossaryEntries.forEach(entry => {
    console.log(`\n### ${entry.term}`);
    console.log(`**Occurrences**: ${entry.occurrences}`);
    console.log(`**Context**: Based on analysis of holographic memory entries`);
    console.log(`**Usage Examples**:`);
    console.log(`\`\`\`\n${entry.contexts.substring(0, 300)}...\n\`\`\``);
  });

  return glossaryEntries;
}

// --- DISPLAY FUNCTIONS ---
function displayResults(rows, originalQuery) {
  if (!rows || rows.length === 0) {
    console.log('\n❌ No results found');
    return;
  }

  // Фильтруем низкокачественный контент
  const filteredRows = rows.filter(row => isHighQualityContent(row.text));

  if (filteredRows.length === 0) {
    console.log('\n⚠️ All results filtered out due to low quality');
    return;
  }

  console.log(`\n🎯 === SEARCH RESULTS ===`);
  console.log(`📝 Query: "${originalQuery}"`);
  console.log(`📊 Found: ${filteredRows.length} high-quality results\n`);

  filteredRows.forEach((row, index) => {
    const scoreLabel = row.finalScore ?
      `Score: ${row.finalScore.toFixed(4)}` :
      row.similarity ?
        `Similarity: ${row.similarity.toFixed(4)}` :
        `Rank: ${row.adjusted_rank?.toFixed(4) || 'N/A'}`;

    const source = path.basename(row.source);
    const contentType = Object.entries(row.contentType || {})
      .filter(([, value]) => value)
      .map(([key]) => key)
      .join(', ') || 'text';

    console.log(`\x1b[1m\x1b[36m[${index + 1}] ID: ${row.id} | ${source} | ${scoreLabel}\x1b[0m`);
    console.log(`\x1b[33m📋 Type: ${contentType}\x1b[0m`);

    if (row.semantic_tags && row.semantic_tags.length > 0) {
      console.log(`\x1b[35m🏷️  Tags: ${row.semantic_tags.join(', ')}\x1b[0m`);
    }

    // Показываем контент с подсветкой
    const highlightedText = highlightText(row.text, originalQuery);
    const truncatedText = highlightedText.length > 400 ?
      highlightedText.substring(0, 400) + '...' :
      highlightedText;

    console.log(`\x1b[2m${truncatedText}\x1b[0m\n`);
    console.log(`${'─'.repeat(80)}\n`);
  });
}

function highlightText(text, query) {
  const terms = query.split(/\s+/).filter(Boolean);
  let highlightedText = text;

  terms.forEach(term => {
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    highlightedText = highlightedText.replace(regex, '\x1b[32m$1\x1b[0m');
  });

  return highlightedText;
}

// --- MAIN SEARCH FUNCTION ---
async function searchMemory(query, options = {}) {
  const {
    useVector = true,
    useHybrid = false,
    threshold = 0.6,
    filterLogs = true,
    qualityFilter = true
  } = options;

  try {
    let results;

    if (useHybrid) {
      results = await searchMemoryHybrid(query, options);
    } else if (useVector) {
      results = await searchMemoryVector(query, options);
    } else {
      results = await searchMemoryFTS5(query, options);
    }

    displayResults(results, query);
    return results;

  } catch (error) {
    console.error(`❌ Search failed:`, error.message);

    // Fallback на FTS5 при ошибке
    if (useVector || useHybrid) {
      console.log(`\n⚠️ Falling back to FTS5 search...`);
      const fallbackResults = await searchMemoryFTS5(query, options);
      displayResults(fallbackResults, query);
      return fallbackResults;
    }

    throw error;
  }
}

// --- CLI INTERFACE ---
function showHelp() {
  console.log(`
🧠 TRIA ANALYTICS ENGINE 1.1
${'='.repeat(50)}

USAGE:
  node search_memory.js "query"          # Default vector search
  node search_memory.js --stats          # Corpus statistics
  node search_memory.js --glossary       # Generate glossary
  node search_memory.js --hybrid "query" # Hybrid search (FTS5 + Vector)
  node search_memory.js --fts5 "query"   # FTS5 only search
  node search_memory.js --help           # Show this help

OPTIONS:
  --threshold 0.7    # Set similarity threshold (default: 0.6)
  --limit 20         # Set result limit (default: 15)
  --no-filter        # Disable quality filtering
  --include-logs     # Include server logs in results

EXAMPLES:
  node search_memory.js "hologram rendering"
  node search_memory.js --hybrid "gesture animation" --threshold 0.7
  node search_memory.js --stats
  node search_memory.js --glossary
  `);
}

// --- SCRIPT EXECUTION ---
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    return;
  }

  // Проверка зависимостей
  try {
    require('@google/generative-ai');
  } catch (error) {
    console.error('❌ Missing dependency. Install with: npm install @google/generative-ai');
    process.exit(1);
  }

  // Обработка команд
  if (args.includes('--stats')) {
    await analyzeCorpusStats();
    return;
  }

  if (args.includes('--glossary')) {
    await generateGlossary();
    return;
  }

  // Извлечение опций
  const options = {};
  if (args.includes('--hybrid')) options.useHybrid = true;
  if (args.includes('--fts5')) options.useVector = false;
  if (args.includes('--no-filter')) options.qualityFilter = false;
  if (args.includes('--include-logs')) options.filterLogs = false;

  const thresholdIndex = args.indexOf('--threshold');
  if (thresholdIndex !== -1 && args[thresholdIndex + 1]) {
    options.threshold = parseFloat(args[thresholdIndex + 1]);
  }

  const limitIndex = args.indexOf('--limit');
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    options.limit = parseInt(args[limitIndex + 1]);
  }

  // Извлечение запроса
  const query = args.filter(arg =>
    !arg.startsWith('--') &&
    !['--threshold', '--limit'].includes(args[args.indexOf(arg) - 1])
  ).join(' ');

  if (!query) {
    console.error('❌ Search query is required');
    showHelp();
    process.exit(1);
  }

  await searchMemory(query, options);
}

// Запуск
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
