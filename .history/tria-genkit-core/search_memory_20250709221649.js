// tria-genkit-core/search_memory.js - TRIA ANALYTICS ENGINE
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

// --- CORE ANALYTICS FUNCTIONS ---
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

// --- ENHANCED CONTENT ANALYSIS ---
function analyzeContentType(text) {
  const patterns = {
    code: /(?:function|class|const|let|var|import|export|async|await)/,
    html: /(?:<[^>]+>|<!DOCTYPE|<html|<head|<body)/,
    css: /(?:\.[\w-]+\s*\{|@media|@keyframes|rgba?\()/,
    svg: /(?:<svg|<path|viewBox|xmlns)/,
    log: /(?:INFO:|ERROR:|WARN:|DEBUG:|GET|POST|PUT|DELETE|404|200|500)/,
    config: /(?:vite\.config|package\.json|tsconfig|webpack)/,
    documentation: /(?:README|CHANGELOG|\.md|documentation|guide|tutorial)/,
    conversation: /(?:user:|assistant:|human:|ai:|claude:|gemini:)/,
    technical: /(?:API|SDK|library|framework|dependency|npm|yarn)/
  };

  const matches = {};
  for (const [type, pattern] of Object.entries(patterns)) {
    matches[type] = pattern.test(text);
  }

  return matches;
}

function calculateContentRelevance(text, semanticTags) {
  let relevance = 0;
  const length = text.length;

  // Бонусы за длину и структуру
  if (length > 200) relevance += 0.2;
  if (length > 500) relevance += 0.2;
  if (length > 1000) relevance += 0.1;

  // Бонусы за семантические теги
  if (semanticTags && semanticTags.length > 0) {
    relevance += Math.min(0.3, semanticTags.length * 0.1);
  }

  // Штрафы за техническую разметку
  if (text.includes('<svg') || text.includes('<path')) relevance -= 0.3;
  if (text.includes('INFO:') || text.includes('GET /')) relevance -= 0.4;

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

// --- ENHANCED VECTOR SEARCH ---
async function searchMemoryVector(query, options = {}) {
  const {
    limit = SEARCH_LIMIT,
    threshold = 0.6,
    filterLogs = true,
    qualityFilter = true,
    batchSize = 10000,
    includeMetadata = true
  } = options;

  if (!query || query.trim().length === 0) {
    console.error("❌ Search query cannot be empty");
    return [];
  }

  console.log(`🔍 === TRIA ANALYTICS: SEMANTIC SEARCH ===`);
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

// --- ADVANCED FTS5 SEARCH ---
function buildAdvancedFTS5Query(query) {
  const terms = query.trim().split(/\s+/).filter(term => term.length > 0);

  if (terms.length === 0) return '';

  // Экранирование специальных символов FTS5
  const escapeTerm = (term) => {
    return `"${term.replace(/"/g, '""')}"`;
  };

  if (terms.length === 1) {
    return escapeTerm(terms[0]);
  }

  // Создаем комбинированный запрос
  const phraseSearch = escapeTerm(query);
  const fuzzyTerms = terms.map(term => escapeTerm(term)).join(' OR ');
  const exactTerms = terms.map(term => escapeTerm(term)).join(' AND ');

  return `(${phraseSearch}) OR (${exactTerms}) OR (${fuzzyTerms})`;
}

async function searchMemoryFTS5(query, options = {}) {
  const { limit = SEARCH_LIMIT, includeMetadata = true } = options;

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error("❌ Database connection error:", err.message);
      throw err;
    }
  });

  const matchQuery = buildAdvancedFTS5Query(query);
  console.log(`🔍 FTS5 Query: ${matchQuery}`);

  const sql = `
    SELECT 
      hm.id, 
      hm.text, 
      hm.source,
      hm.timestamp,
      hm.semantic_tags,
      hm.agent_context,
      hm.holographic_metadata,
      bm25(fts) as relevance_score
    FROM memory_fts fts
    JOIN holographic_memory hm ON hm.id = fts.rowid
    WHERE fts.memory_fts MATCH ?
    ORDER BY relevance_score DESC
    LIMIT ?;
  `;

  return new Promise((resolve, reject) => {
    db.all(sql, [matchQuery, limit], (err, rows) => {
      if (err) {
        console.error("❌ FTS5 search error:", err.message);
        reject(err);
      } else {
        const results = rows.map(row => ({
          ...row,
          semantic_tags: row.semantic_tags ? JSON.parse(row.semantic_tags) : [],
          agent_context: row.agent_context ? JSON.parse(row.agent_context) : {},
          holographic_metadata: row.holographic_metadata ? JSON.parse(row.holographic_metadata) : {},
          finalScore: row.relevance_score
        }));
        resolve(results);
      }
      db.close();
    });
  });
}

// --- ANALYTICS FUNCTIONS ---
async function analyzeMemoryDistribution() {
  console.log(`📊 === TRIA ANALYTICS: MEMORY DISTRIBUTION ===`);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  const queries = {
    totalCount: `SELECT COUNT(*) as total FROM holographic_memory`,
    sourceDistribution: `SELECT source, COUNT(*) as count FROM holographic_memory GROUP BY source ORDER BY count DESC LIMIT 10`,
    tagDistribution: `SELECT semantic_tags, COUNT(*) as count FROM holographic_memory WHERE semantic_tags IS NOT NULL GROUP BY semantic_tags ORDER BY count DESC LIMIT 10`,
    timeDistribution: `SELECT DATE(timestamp) as date, COUNT(*) as count FROM holographic_memory GROUP BY DATE(timestamp) ORDER BY date DESC LIMIT 10`
  };

  const results = {};

  for (const [key, query] of Object.entries(queries)) {
    results[key] = await new Promise((resolve, reject) => {
      db.all(query, [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  db.close();

  console.log(`📈 Total Memories: ${results.totalCount[0].total}`);
  console.log(`📂 Top Sources:`);
  results.sourceDistribution.forEach((row, i) => {
    console.log(`   ${i + 1}. ${path.basename(row.source)}: ${row.count} memories`);
  });

  console.log(`🏷️ Top Tags:`);
  results.tagDistribution.forEach((row, i) => {
    console.log(`   ${i + 1}. ${row.semantic_tags}: ${row.count} memories`);
  });

  return results;
}

async function findSimilarConcepts(concept, options = {}) {
  const { limit = 20, threshold = 0.7 } = options;

  console.log(`🔍 === CONCEPT ANALYSIS: "${concept}" ===`);

  const results = await searchMemoryVector(concept, {
    limit,
    threshold,
    qualityFilter: true,
    filterLogs: true
  });

  const conceptMap = {};
  results.forEach(result => {
    const tags = result.semantic_tags || [];
    tags.forEach(tag => {
      if (!conceptMap[tag]) conceptMap[tag] = 0;
      conceptMap[tag] += result.finalScore;
    });
  });

  const sortedConcepts = Object.entries(conceptMap)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  console.log(`🧠 Related Concepts:`);
  sortedConcepts.forEach(([concept, score], i) => {
    console.log(`   ${i + 1}. ${concept}: ${score.toFixed(3)}`);
  });

  return { results, concepts: sortedConcepts };
}

// --- ENHANCED DISPLAY FUNCTIONS ---
function displayAnalyticsResults(results, query, type = 'search') {
  if (!results || results.length === 0) {
    console.log(`❌ No results found for "${query}"`);
    return;
  }

  console.log(`\n🎯 === RESULTS FOR: "${query}" ===`);
  console.log(`📊 Found ${results.length} relevant memories\n`);

  results.forEach((result, index) => {
    const score = result.finalScore || result.similarity || 0;
    const contentTypes = result.contentType || analyzeContentType(result.text);
    const activeTypes = Object.entries(contentTypes)
      .filter(([, active]) => active)
      .map(([type]) => type)
      .join(', ');

    console.log(`\x1b[1m\x1b[36m[${index + 1}] ID: ${result.id}\x1b[0m`);
    console.log(`📁 Source: ${path.basename(result.source)}`);
    console.log(`📊 Score: ${score.toFixed(4)} | Content: ${activeTypes || 'general'}`);

    if (result.semantic_tags && result.semantic_tags.length > 0) {
      console.log(`🏷️ Tags: ${result.semantic_tags.join(', ')}`);
    }

    // Умная обрезка текста
    let displayText = result.text;
    if (displayText.length > 300) {
      displayText = displayText.substring(0, 300) + '...';
    }

    console.log(`📝 ${displayText.replace(/\n/g, ' ')}`);
    console.log(`⏰ ${new Date(result.timestamp).toLocaleString()}`);
    console.log('─'.repeat(80));
  });
}

// --- MAIN FUNCTIONS ---
async function searchMemory(query, options = {}) {
  const { useVector = true, mode = 'search' } = options;

  try {
    let results;

    if (useVector) {
      results = await searchMemoryVector(query, options);
    } else {
      results = await searchMemoryFTS5(query, options);
    }

    if (mode === 'analytics') {
      const conceptAnalysis = await findSimilarConcepts(query, options);
      displayAnalyticsResults(conceptAnalysis.results, query, 'analytics');
      return conceptAnalysis;
    } else {
      displayAnalyticsResults(results, query, 'search');
      return results;
    }

  } catch (error) {
    console.error(`❌ Search failed: ${error.message}`);

    if (useVector) {
      console.log(`🔄 Falling back to FTS5 search...`);
      return await searchMemory(query, { ...options, useVector: false });
    }

    throw error;
  }
}

// --- COMMAND LINE INTERFACE ---
function showHelp() {
  console.log(`
🔮 === TRIA ANALYTICS ENGINE ===

Usage: node search_memory.js [command] [options] "query"

Commands:
  search "query"           - Semantic search (default)
  fts5 "query"            - Full-text search only
  analyze "concept"       - Deep concept analysis
  stats                   - Memory distribution statistics
  help                    - Show this help

Options:
  --threshold=0.7         - Similarity threshold (0.0-1.0)
  --limit=15              - Maximum results
  --no-filter             - Disable quality filtering
  --include-logs          - Include server logs
  --metadata              - Show full metadata

Examples:
  node search_memory.js "hologram animation"
  node search_memory.js analyze "gesture recognition"
  node search_memory.js fts5 "MediaPipe initialization"
  node search_memory.js stats
  `);
}

// --- SCRIPT EXECUTION ---
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help') {
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

  const command = args[0];
  let query = '';
  let options = {
    threshold: 0.6,
    limit: 15,
    filterLogs: true,
    qualityFilter: true,
    useVector: true
  };

  // Парсинг аргументов
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--threshold=')) {
      options.threshold = parseFloat(arg.split('=')[1]);
    } else if (arg.startsWith('--limit=')) {
      options.limit = parseInt(arg.split('=')[1]);
    } else if (arg === '--no-filter') {
      options.qualityFilter = false;
    } else if (arg === '--include-logs') {
      options.filterLogs = false;
    } else if (arg === '--metadata') {
      options.includeMetadata = true;
    } else if (!arg.startsWith('--')) {
      query = args.slice(i).join(' ');
      break;
    }
  }

  switch (command) {
    case 'search':
      if (!query) {
        console.error('❌ Query required for search');
        process.exit(1);
      }
      await searchMemory(query, options);
      break;

    case 'fts5':
      if (!query) {
        console.error('❌ Query required for FTS5 search');
        process.exit(1);
      }
      await searchMemory(query, { ...options, useVector: false });
      break;

    case 'analyze':
      if (!query) {
        console.error('❌ Concept required for analysis');
        process.exit(1);
      }
      await searchMemory(query, { ...options, mode: 'analytics' });
      break;

    case 'stats':
      await analyzeMemoryDistribution();
      break;

    default:
      // Если первый аргумент не команда, считаем его запросом
      query = args.join(' ');
      await searchMemory(query, options);
  }
}

main().catch(console.error);
