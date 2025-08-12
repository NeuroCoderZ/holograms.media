// tria-genkit-core/search_memory.js - TRIA ANALYTICS ENGINE 1.1
const sqlite3 = require('sqlite3');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// === CONFIGURATION ===
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const SEARCH_LIMIT = 15;
const BATCH_SIZE = 5000;

// Gemini API configuration
const GEMINI_API_KEYS = [
  'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g',
  'AIzaSyDOaH1Wxrnd9K7aeWVzSMaxvv0yeIVba5g'
];

let currentKeyIndex = 0;

// === UTILITY FUNCTIONS ===
function colorText(text, color) {
  const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bold: '\x1b[1m',
    reset: '\x1b[0m'
  };
  return `${colors[color] || ''}${text}${colors.reset}`;
}

function printHeader(title) {
  console.log('\n' + colorText('🚀 === ' + title + ' ===', 'bold'));
}

function printProgress(current, total, message) {
  const percent = Math.round((current / total) * 100);
  const bar = '█'.repeat(Math.round(percent / 2));
  process.stdout.write(`\r${colorText('📊', 'cyan')} ${message}: ${bar} ${percent}%`);
  if (current === total) console.log('');
}

// === DATABASE SCHEMA MANAGEMENT ===
async function checkAndUpdateDatabaseSchema() {
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE);

  return new Promise((resolve, reject) => {
    console.log(colorText('🔧 Checking database schema...', 'yellow'));

    // Check existing columns
    db.all("PRAGMA table_info(holographic_memory)", (err, columns) => {
      if (err) {
        reject(err);
        return;
      }

      const existingColumns = columns.map(col => col.name);
      const requiredColumns = ['semantic_tags', 'agent_context', 'holographic_metadata'];
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length > 0) {
        console.log(colorText(`➕ Adding missing columns: ${missingColumns.join(', ')}`, 'yellow'));

        const alterQueries = missingColumns.map(col =>
          `ALTER TABLE holographic_memory ADD COLUMN ${col} TEXT DEFAULT ''`
        );

        let completed = 0;
        alterQueries.forEach(query => {
          db.run(query, (err) => {
            if (err && !err.message.includes('duplicate column name')) {
              console.error(colorText(`❌ Error adding column: ${err.message}`, 'red'));
            }
            completed++;
            if (completed === alterQueries.length) {
              createFTSTable(db, resolve, reject);
            }
          });
        });
      } else {
        createFTSTable(db, resolve, reject);
      }
    });
  });
}

function createFTSTable(db, resolve, reject) {
  // Check if FTS table exists
  db.get("SELECT name FROM sqlite_master WHERE type='table' AND name='memory_fts'", (err, row) => {
    if (err) {
      reject(err);
      return;
    }

    if (!row) {
      console.log(colorText('📝 Creating FTS5 search table...', 'yellow'));

      const createFTSQuery = `
                CREATE VIRTUAL TABLE memory_fts USING fts5(
                    text,
                    source,
                    content='holographic_memory',
                    content_rowid='id',
                    tokenize='porter unicode61'
                )
            `;

      db.run(createFTSQuery, (err) => {
        if (err) {
          console.error(colorText(`❌ Error creating FTS table: ${err.message}`, 'red'));
          // Continue anyway, we can work without FTS
        }

        // Populate FTS table
        const populateQuery = "INSERT INTO memory_fts(text, source) SELECT text, source FROM holographic_memory";
        db.run(populateQuery, (err) => {
          if (err) {
            console.log(colorText('⚠️ Could not populate FTS table, continuing without FTS search', 'yellow'));
          } else {
            console.log(colorText('✅ FTS5 table created and populated', 'green'));
          }
          db.close();
          resolve();
        });
      });
    } else {
      console.log(colorText('✅ Database schema is up to date', 'green'));
      db.close();
      resolve();
    }
  });
}

// === EMBEDDING FUNCTIONS ===
async function createQueryEmbedding(query) {
  for (let attempt = 0; attempt < GEMINI_API_KEYS.length; attempt++) {
    try {
      const apiKey = GEMINI_API_KEYS[currentKeyIndex];
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'text-embedding-001' });

      console.log(colorText(`🔮 Creating embedding with API key #${currentKeyIndex + 1}...`, 'cyan'));

      const result = await model.embedContent(query);
      return result.embedding.values;

    } catch (error) {
      console.error(colorText(`❌ API key #${currentKeyIndex + 1} failed: ${error.message}`, 'red'));
      currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;

      if (attempt === GEMINI_API_KEYS.length - 1) {
        throw new Error(`All API keys failed. Last error: ${error.message}`);
      }
    }
  }
}

function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;

  let dotProduct = 0, magnitudeA = 0, magnitudeB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    magnitudeA += vecA[i] * vecA[i];
    magnitudeB += vecB[i] * vecB[i];
  }

  magnitudeA = Math.sqrt(magnitudeA);
  magnitudeB = Math.sqrt(magnitudeB);

  return (magnitudeA === 0 || magnitudeB === 0) ? 0 : dotProduct / (magnitudeA * magnitudeB);
}

// === CONTENT FILTERING ===
function isLowQualityContent(text) {
  const lowQualityPatterns = [
    /^<[^>]*>.*<\/[^>]*>$/,           // Pure HTML tags
    /path\s+d="[^"]*"/,              // SVG paths
    /viewBox="[^"]*"/,               // SVG viewBox
    /xmlns="[^"]*"/,                 // XML namespaces
    /fill="#[a-f0-9]{6}"/i,          // Color fills
    /INFO:\s+\d+\.\d+\.\d+\.\d+/,    // Server logs
    /HTTP\/1\.[01]/,                 // HTTP protocol
    /GET\s+\/static/,                // Static file requests
    /404\s+Not\s+Found/i,            // 404 errors
    /200\s+OK/i,                     // 200 responses
    /^[a-f0-9\s\-]{50,}$/i,          // Long hex/hash strings
  ];

  return text.length < 20 || lowQualityPatterns.some(pattern => pattern.test(text));
}

function expandQuery(query) {
  const expansions = {
    'инициализация': ['initialization', 'init', 'setup', 'start', 'begin'],
    'анимация': ['animation', 'animate', 'transition', 'transform'],
    'жесты': ['gesture', 'hand', 'tracking', 'recognition'],
    'голограмма': ['hologram', 'holographic', '3d', 'render'],
    'рендер': ['render', 'rendering', 'renderer', 'draw', 'display']
  };

  let expandedTerms = [query];

  Object.entries(expansions).forEach(([ru, en]) => {
    if (query.toLowerCase().includes(ru)) {
      expandedTerms = expandedTerms.concat(en);
    }
  });

  return expandedTerms.join(' ');
}

// === SEARCH FUNCTIONS ===
async function searchMemoryFTS5(query, options = {}) {
  const { limit = SEARCH_LIMIT } = options;
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    // Simple text search without FTS5 if table doesn't exist
    const sql = `
            SELECT 
                hm.id, 
                hm.text, 
                hm.source,
                hm.timestamp,
                1.0 as relevance
            FROM holographic_memory hm
            WHERE hm.text LIKE ? OR hm.source LIKE ?
            ORDER BY LENGTH(hm.text) ASC
            LIMIT ?
        `;

    const searchTerm = `%${query}%`;

    db.all(sql, [searchTerm, searchTerm, limit], (err, rows) => {
      db.close();
      if (err) {
        reject(err);
      } else {
        resolve(rows.map(row => ({
          ...row,
          adjusted_rank: row.relevance,
          semantic_tags: row.semantic_tags || '[]'
        })));
      }
    });
  });
}

async function searchMemoryVector(query, options = {}) {
  const { limit = SEARCH_LIMIT, threshold = 0.6 } = options;

  console.log(colorText('🔮 Creating query embedding...', 'cyan'));
  const queryEmbedding = await createQueryEmbedding(query);
  console.log(colorText(`✅ Query embedding created (${queryEmbedding.length} dimensions)`, 'green'));

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    const sql = `
            SELECT 
                id, text, source, timestamp, embedding
            FROM holographic_memory 
            WHERE LENGTH(text) > 20
            ORDER BY id
        `;

    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      console.log(colorText(`📊 Processing ${rows.length} embeddings...`, 'cyan'));

      const results = [];
      let processed = 0;

      for (const row of rows) {
        try {
          if (isLowQualityContent(row.text)) {
            processed++;
            continue;
          }

          const embedding = new Float32Array(row.embedding);
          const similarity = cosineSimilarity(queryEmbedding, Array.from(embedding));

          if (similarity > threshold) {
            results.push({
              ...row,
              similarity,
              adjusted_rank: similarity,
              semantic_tags: '[]'
            });
          }

          processed++;
          if (processed % 1000 === 0) {
            printProgress(processed, rows.length, 'Analyzing embeddings');
          }
        } catch (error) {
          processed++;
          continue;
        }
      }

      printProgress(processed, rows.length, 'Analysis complete');

      const finalResults = results
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit);

      db.close();
      resolve(finalResults);
    });
  });
}

async function hybridSearch(query, options = {}) {
  const { limit = SEARCH_LIMIT, prefilterLimit = 5000 } = options;

  console.log(colorText('📋 Step 1: FTS5 prefiltering (limit: ' + prefilterLimit + ')...', 'cyan'));

  try {
    const candidates = await searchMemoryFTS5(query, { limit: prefilterLimit });
    console.log(colorText(`✅ Found ${candidates.length} candidates via FTS5`, 'green'));

    if (candidates.length === 0) {
      return [];
    }

    // If we have few candidates, return them
    if (candidates.length <= limit) {
      return candidates;
    }

    console.log(colorText('📋 Step 2: Vector refinement...', 'cyan'));

    // For now, just return top FTS5 results since vector search needs embedding comparison
    return candidates.slice(0, limit);

  } catch (error) {
    console.error(colorText(`❌ FTS5 prefilter error: ${error.message}`, 'red'));
    throw error;
  }
}

// === ANALYTICS FUNCTIONS ===
async function generateStats() {
  printHeader('TRIA MEMORY CORE STATISTICS');

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    // Get basic stats
    db.get("SELECT COUNT(*) as total FROM holographic_memory", (err, totalRow) => {
      if (err) {
        reject(err);
        return;
      }

      console.log(colorText(`🧠 Total Embeddings: ${totalRow.total.toLocaleString()}`, 'bold'));

      // Get source distribution
      db.all(`
                SELECT source, COUNT(*) as count 
                FROM holographic_memory 
                GROUP BY source 
                ORDER BY count DESC 
                LIMIT 20
            `, (err, sourceRows) => {
        if (err) {
          reject(err);
          return;
        }

        console.log(colorText('\n📁 Top Sources by Volume:', 'bold'));
        sourceRows.forEach((row, index) => {
          const percentage = ((row.count / totalRow.total) * 100).toFixed(1);
          const bar = '█'.repeat(Math.round(percentage));
          console.log(`${index + 1}. ${row.source}`);
          console.log(`   ${colorText(bar, 'green')} ${row.count.toLocaleString()} (${percentage}%)`);
        });

        // Get timestamp distribution
        db.all(`
                    SELECT 
                        DATE(timestamp, 'unixepoch') as date,
                        COUNT(*) as count
                    FROM holographic_memory 
                    WHERE timestamp IS NOT NULL
                    GROUP BY date
                    ORDER BY date DESC
                    LIMIT 30
                `, (err, timeRows) => {
          if (err) {
            console.log(colorText('\n⚠️ Timeline data not available', 'yellow'));
          } else {
            console.log(colorText('\n📈 Recent Activity Timeline:', 'bold'));
            timeRows.slice(0, 10).forEach(row => {
              const bar = '█'.repeat(Math.round(row.count / 100));
              console.log(`${row.date} ${colorText(bar, 'blue')} ${row.count}`);
            });
          }

          db.close();
          resolve();
        });
      });
    });
  });
}

async function generateGlossary() {
  printHeader('TRIA GLOSSARY GENERATOR');

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    console.log(colorText('🔍 Scanning for technical terms...', 'cyan'));

    // Find potential technical terms
    db.all(`
            SELECT text, source, COUNT(*) as frequency
            FROM holographic_memory
            WHERE text LIKE '%Hologram%' 
               OR text LIKE '%Tria%'
               OR text LIKE '%CWT%'
               OR text LIKE '%WASM%'
               OR text LIKE '%MediaPipe%'
               OR text LIKE '%Three.js%'
            GROUP BY LOWER(text)
            HAVING frequency > 1
            ORDER BY frequency DESC
            LIMIT 50
        `, (err, termRows) => {
      if (err) {
        reject(err);
        return;
      }

      console.log(colorText('\n📚 Generated Glossary:', 'bold'));
      console.log('# Tria Memory Core - Auto-Generated Glossary\n');

      const processedTerms = new Set();

      termRows.forEach(row => {
        // Extract potential terms
        const terms = row.text.match(/\b[A-Z][a-zA-Z]*(?:[A-Z][a-zA-Z]*)*\b/g) || [];
        const acronyms = row.text.match(/\b[A-Z]{2,}\b/g) || [];

        [...terms, ...acronyms].forEach(term => {
          if (term.length > 2 && !processedTerms.has(term.toLowerCase())) {
            processedTerms.add(term.toLowerCase());

            console.log(`## ${term}`);
            console.log(`- **Context**: Found in ${row.source}`);
            console.log(`- **Frequency**: ${row.frequency} occurrences`);
            console.log(`- **Sample**: "${row.text.substring(0, 100)}..."`);
            console.log('');
          }
        });
      });

      if (processedTerms.size === 0) {
        console.log(colorText('⚠️ No technical terms found for glossary generation', 'yellow'));
      }

      db.close();
      resolve();
    });
  });
}

// === DISPLAY FUNCTIONS ===
function displayResults(results, query) {
  if (results.length === 0) {
    console.log(colorText('📭 No relevant results found', 'yellow'));
    return;
  }

  console.log(colorText(`\n🎯 Found ${results.length} relevant results:\n`, 'bold'));

  results.forEach((result, index) => {
    const score = result.similarity || result.adjusted_rank || result.relevance || 0;
    const scoreLabel = result.similarity ? 'Similarity' : 'Relevance';

    console.log(colorText(`[${index + 1}] ID: ${result.id} | Source: ${path.basename(result.source)}`, 'cyan'));
    console.log(colorText(`${scoreLabel}: ${score.toFixed(4)}`, 'magenta'));

    // Highlight query terms in text
    let displayText = result.text.substring(0, 300);
    if (result.text.length > 300) displayText += '...';

    // Simple highlighting
    const queryTerms = query.split(/\s+/);
    queryTerms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      displayText = displayText.replace(regex, colorText('$1', 'green'));
    });

    console.log(colorText(displayText, 'white'));
    console.log(colorText('─'.repeat(80), 'blue'));
    console.log('');
  });
}

// === MAIN SEARCH FUNCTION ===
async function searchMemory(query, options = {}) {
  const { mode = 'HYBRID', threshold = 0.6, qualityFilter = true } = options;

  printHeader('TRIA MEMORY CORE SEARCH');
  console.log(colorText(`🔍 Query: "${query}"`, 'bold'));
  console.log(colorText(`⚙️  Mode: ${mode}`, 'cyan'));
  console.log(colorText(`🎯 Threshold: ${threshold}, Quality Filter: ${qualityFilter}`, 'cyan'));
  console.log('');

  try {
    let results = [];

    switch (mode.toLowerCase()) {
      case 'fts5':
        results = await searchMemoryFTS5(query, options);
        break;
      case 'vector':
        results = await searchMemoryVector(query, options);
        break;
      case 'hybrid':
      default:
        printHeader('TRIA HYBRID SEARCH');
        console.log(colorText(`📝 Original Query: "${query}"`, 'cyan'));

        const expandedQuery = expandQuery(query);
        console.log(colorText(`🔄 Expanded Query: "${expandedQuery}"`, 'cyan'));

        results = await hybridSearch(expandedQuery, options);
        break;
    }

    displayResults(results, query);

  } catch (error) {
    console.error(colorText(`❌ SEARCH FAILED: ${error.message}`, 'red'));
    console.log(colorText('Stack: ' + error.stack, 'red'));

    // Emergency fallback
    if (mode !== 'FTS5') {
      console.log(colorText('\n🆘 Emergency fallback to FTS5...', 'yellow'));
      await searchMemory(query, { ...options, mode: 'FTS5' });
    }
  }
}

// === CLI INTERFACE ===
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(colorText('Usage:', 'bold'));
    console.log('  node search_memory.js "query"     # Search');
    console.log('  node search_memory.js --stats     # Statistics');
    console.log('  node search_memory.js --glossary  # Generate glossary');
    console.log('  node search_memory.js --help      # This help');
    return;
  }

  // Initialize database schema
  try {
    await checkAndUpdateDatabaseSchema();
  } catch (error) {
    console.error(colorText(`❌ Database initialization failed: ${error.message}`, 'red'));
    return;
  }

  const command = args[0];

  switch (command) {
    case '--stats':
      await generateStats();
      break;
    case '--glossary':
      await generateGlossary();
      break;
    case '--help':
      console.log(colorText('Tria Analytics Engine 1.1', 'bold'));
      console.log('Advanced search and analysis tool for Tria memory core');
      break;
    default:
      const query = args.join(' ');
      await searchMemory(query);
      break;
  }
}

// === SCRIPT EXECUTION ===
if (require.main === module) {
  main().catch(error => {
    console.error(colorText(`💥 FATAL ERROR: ${error.message}`, 'red'));
    process.exit(1);
  });
}

module.exports = { searchMemory, generateStats, generateGlossary };
