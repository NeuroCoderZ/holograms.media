// tria-genkit-core/search_memory.js - ЛОКАЛЬНАЯ ВЕРСИЯ 1.4
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// --- CONFIGURATION ---
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const CACHE_DIR = path.resolve(__dirname, 'cache');
const SEARCH_LIMIT = 15;
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 часа

console.log(`\x1b[1m\x1b[35m🧠 TRIA ANALYTICS ENGINE v1.4 - FULLY LOCAL\x1b[0m`);
console.log(`\x1b[33m📂 Database: ${DB_PATH}\x1b[0m`);
console.log(`\x1b[33m💾 Cache: ${CACHE_DIR}\x1b[0m\n`);

// --- CACHE MANAGEMENT ---
function ensureCacheDir() {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`\x1b[32m✅ Created cache directory\x1b[0m`);
  }
}

function getCacheKey(input) {
  return crypto.createHash('md5').update(JSON.stringify(input)).digest('hex');
}

function getCachedData(cacheKey, type = 'search') {
  try {
    const cachePath = path.join(CACHE_DIR, `${type}_${cacheKey}.json`);

    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

      if (Date.now() - cached.timestamp < CACHE_EXPIRY) {
        console.log(`\x1b[36m📦 Using cached ${type} data\x1b[0m`);
        return cached.data;
      } else {
        fs.unlinkSync(cachePath);
      }
    }
  } catch (error) {
    console.warn(`\x1b[33mCache read error: ${error.message}\x1b[0m`);
  }

  return null;
}

function setCachedData(cacheKey, data, type = 'search') {
  try {
    const cachePath = path.join(CACHE_DIR, `${type}_${cacheKey}.json`);

    const cacheData = {
      data: data,
      timestamp: Date.now()
    };

    fs.writeFileSync(cachePath, JSON.stringify(cacheData));
    console.log(`\x1b[32m💾 Cached ${type} data\x1b[0m`);
  } catch (error) {
    console.warn(`\x1b[33mCache write error: ${error.message}\x1b[0m`);
  }
}

// --- CONTENT ANALYSIS ENGINE ---
function analyzeContentType(text) {
  const patterns = {
    code: /(?:function|class|const|let|var|import|export|async|await|if\s*\(|for\s*\()/,
    html: /(?:<[^>]+>|<!DOCTYPE|<html|<head|<body)/,
    css: /(?:\.[\w-]+\s*\{|@media|@keyframes|rgba?\(|#[0-9a-fA-F]{3,6})/,
    svg: /(?:<svg|<path|viewBox|xmlns|d="|fill="|stroke=)/,
    log: /(?:INFO:|ERROR:|WARN:|DEBUG:|GET\s+\/|POST\s+\/|404|200|500|HTTP\/)/,
    config: /(?:vite\.config|package\.json|tsconfig|webpack|\.config\.|\.json)/,
    documentation: /(?:README|CHANGELOG|\.md|documentation|guide|tutorial|docs\/)/,
    conversation: /(?:user:|assistant:|human:|ai:|claude:|gemini:|prompt:|response:)/,
    technical: /(?:API|SDK|library|framework|dependency|npm|yarn|node_modules)/,
    javascript: /(?:console\.log|document\.|window\.|addEventListener|querySelector)/,
    error: /(?:Error:|Exception:|Stack trace:|at\s+\w+\.|TypeError:|ReferenceError:)/
  };

  const matches = {};
  let totalMatches = 0;

  for (const [type, pattern] of Object.entries(patterns)) {
    matches[type] = pattern.test(text);
    if (matches[type]) totalMatches++;
  }

  // Определяем доминирующий тип контента
  matches.dominantType = totalMatches === 0 ? 'text' :
    Object.entries(matches).filter(([, value]) => value)[0][0];

  return matches;
}

function calculateContentQuality(text, source = '') {
  let quality = 0.5; // Базовый уровень
  const length = text.length;
  const contentType = analyzeContentType(text);

  // Бонусы за длину и информативность
  if (length > 100) quality += 0.1;
  if (length > 300) quality += 0.1;
  if (length > 800) quality += 0.1;

  // Бонусы за тип контента
  if (contentType.documentation) quality += 0.3;
  if (contentType.conversation) quality += 0.2;
  if (contentType.code && !contentType.log) quality += 0.2;
  if (contentType.technical) quality += 0.1;

  // Штрафы за низкокачественный контент
  if (contentType.svg) quality -= 0.4;
  if (contentType.log) quality -= 0.5;
  if (contentType.html && text.includes('<path')) quality -= 0.3;
  if (contentType.error) quality -= 0.2;

  // Бонусы за источник
  const filename = path.basename(source).toLowerCase();
  if (filename.includes('readme') || filename.includes('doc')) quality += 0.2;
  if (filename.includes('conversation') || filename.includes('chat')) quality += 0.1;
  if (filename.includes('log')) quality -= 0.3;

  return Math.max(0, Math.min(1, quality));
}

function extractSemanticTerms(text) {
  const terms = new Set();

  // CamelCase термы
  const camelCase = text.match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)+\b/g) || [];
  camelCase.forEach(term => terms.add(term));

  // ACRONYMS
  const acronyms = text.match(/\b[A-Z]{2,}\b/g) || [];
  acronyms.forEach(term => terms.add(term));

  // Технические термины
  const techTerms = text.match(/\b(?:API|SDK|CSS|HTML|JS|WASM|WebGL|Three\.js|React|Vue|Angular|Node\.js)\b/gi) || [];
  techTerms.forEach(term => terms.add(term.toLowerCase()));

  return Array.from(terms);
}

// --- ADVANCED FTS5 SEARCH ENGINE ---
function buildAdvancedFTS5Query(query) {
  const terms = query.trim().split(/\s+/).filter(term => term.length > 0);

  if (terms.length === 0) return '';

  const escapeTerm = (term) => {
    // Экранируем специальные символы FTS5
    const escaped = term.replace(/["\\]/g, '\\$&');
    return `"${escaped}"`;
  };

  if (terms.length === 1) {
    return escapeTerm(terms[0]);
  }

  // Создаем многоуровневый запрос для максимальной релевантности
  const exactPhrase = escapeTerm(query);
  const allTermsAnd = terms.map(term => escapeTerm(term)).join(' AND ');
  const anyTermOr = terms.map(term => escapeTerm(term)).join(' OR ');
  const prefixSearch = terms.map(term => `${escapeTerm(term)}*`).join(' OR ');

  // Приоритеты: точная фраза > все слова > любое слово > префиксы
  return `(${exactPhrase}) OR (${allTermsAnd}) OR (${anyTermOr}) OR (${prefixSearch})`;
}

async function searchMemoryFTS5(query, options = {}) {
  const {
    limit = SEARCH_LIMIT,
    qualityFilter = true,
    includeMetadata = true,
    minQuality = 0.3
  } = options;

  console.log(`\x1b[1m\x1b[34m🔍 === FTS5 SEARCH ENGINE ===\x1b[0m`);
  console.log(`\x1b[36m📝 Query: "${query}"\x1b[0m`);

  // Проверяем кэш
  const cacheKey = getCacheKey({ query, options });
  const cachedResults = getCachedData(cacheKey, 'search');
  if (cachedResults) {
    return cachedResults;
  }

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error(`\x1b[31m❌ Database connection error: ${err.message}\x1b[0m`);
      throw err;
    }
  });

  const matchQuery = buildAdvancedFTS5Query(query);
  console.log(`\x1b[33m🔍 FTS5 Query: ${matchQuery}\x1b[0m`);

  const sql = `
        SELECT 
            hm.id, 
            hm.text, 
            hm.source,
            hm.timestamp,
            bm25(fts) as relevance_score,
            rank
        FROM memory_fts fts
        JOIN holographic_memory hm ON hm.id = fts.rowid
        WHERE fts.memory_fts MATCH ?
        ORDER BY bm25(fts) DESC
        LIMIT ?;
    `;

  return new Promise((resolve, reject) => {
    db.all(sql, [matchQuery, limit * 3], (err, rows) => {
      if (err) {
        console.error(`\x1b[31m❌ FTS5 search error: ${err.message}\x1b[0m`);
        reject(err);
        return;
      }

      console.log(`\x1b[32m✅ Found ${rows.length} raw results\x1b[0m`);

      // Обогащаем результаты аналитикой
      const enrichedResults = rows.map(row => {
        const contentType = analyzeContentType(row.text);
        const quality = calculateContentQuality(row.text, row.source);
        const semanticTerms = extractSemanticTerms(row.text);

        return {
          ...row,
          contentType: contentType,
          quality: quality,
          semanticTerms: semanticTerms,
          finalScore: (row.relevance_score * 0.7) + (quality * 0.3),
          summary: row.text.length > 200 ?
            row.text.substring(0, 200) + '...' :
            row.text
        };
      });

      // Фильтрация и сортировка
      let finalResults = enrichedResults;

      if (qualityFilter) {
        finalResults = finalResults.filter(row => row.quality >= minQuality);
        console.log(`\x1b[33m🔬 Quality filter: ${finalResults.length} results passed\x1b[0m`);
      }

      // Исключаем техническую разметку
      finalResults = finalResults.filter(row =>
        !row.contentType.svg &&
        !row.contentType.log &&
        !(row.contentType.html && row.text.includes('<path'))
      );

      // Сортируем по финальному скору
      finalResults.sort((a, b) => b.finalScore - a.finalScore);
      finalResults = finalResults.slice(0, limit);

      console.log(`\x1b[32m🎯 Final results: ${finalResults.length}\x1b[0m`);

      // Кэшируем результаты
      setCachedData(cacheKey, finalResults, 'search');

      resolve(finalResults);
      db.close();
    });
  });
}

// --- CORPUS ANALYTICS ENGINE ---
async function analyzeCorpusStatistics() {
  console.log(`\x1b[1m\x1b[35m📊 === CORPUS ANALYTICS ===\x1b[0m`);

  const cacheKey = getCacheKey('corpus_stats');
  const cachedStats = getCachedData(cacheKey, 'stats');
  if (cachedStats) {
    displayCorpusStats(cachedStats);
    return cachedStats;
  }

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  const queries = {
    total: `SELECT COUNT(*) as count FROM holographic_memory`,

    sources: `
            SELECT source, COUNT(*) as count 
            FROM holographic_memory 
            GROUP BY source 
            ORDER BY count DESC 
            LIMIT 15
        `,

    timeline: `
            SELECT 
                DATE(timestamp) as date, 
                COUNT(*) as count 
            FROM holographic_memory 
            WHERE timestamp IS NOT NULL
            GROUP BY DATE(timestamp) 
            ORDER BY date DESC 
            LIMIT 30
        `,

    size_distribution: `
            SELECT 
                CASE 
                    WHEN LENGTH(text) < 100 THEN 'Short (0-100)'
                    WHEN LENGTH(text) < 500 THEN 'Medium (100-500)'
                    WHEN LENGTH(text) < 1000 THEN 'Long (500-1000)'
                    ELSE 'Very Long (1000+)'
                END as size_category,
                COUNT(*) as count
            FROM holographic_memory 
            GROUP BY size_category
            ORDER BY count DESC
        `
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

  // Добавляем анализ содержимого
  results.contentAnalysis = await analyzeContentTypes();

  setCachedData(cacheKey, results, 'stats');
  displayCorpusStats(results);

  return results;
}

async function analyzeContentTypes() {
  console.log(`\x1b[33m🔍 Analyzing content types...\x1b[0m`);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    db.all(`SELECT text, source FROM holographic_memory LIMIT 5000`, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const typeStats = {
        code: 0,
        documentation: 0,
        conversation: 0,
        configuration: 0,
        logs: 0,
        other: 0
      };

      rows.forEach(row => {
        const contentType = analyzeContentType(row.text);

        if (contentType.code) typeStats.code++;
        else if (contentType.documentation) typeStats.documentation++;
        else if (contentType.conversation) typeStats.conversation++;
        else if (contentType.config) typeStats.configuration++;
        else if (contentType.log) typeStats.logs++;
        else typeStats.other++;
      });

      resolve(typeStats);
      db.close();
    });
  });
}

function displayCorpusStats(stats) {
  const total = stats.total[0].count;

  console.log(`\n\x1b[1m🧠 TRIA MEMORY CORE ANALYSIS\x1b[0m`);
  console.log(`${'='.repeat(60)}`);
  console.log(`\x1b[32m📈 Total Memories: ${total.toLocaleString()}\x1b[0m`);

  console.log(`\n\x1b[1m📁 TOP SOURCES BY VOLUME:\x1b[0m`);
  stats.sources.forEach((row, i) => {
    const percentage = ((row.count / total) * 100).toFixed(1);
    const source = path.basename(row.source);
    const bar = '█'.repeat(Math.floor(percentage / 2));
    console.log(`${i + 1: 2}.\x1b[36m${ source.padEnd(30) }\x1b[0m ${ bar } ${ row.count.toLocaleString() }(${ percentage } %)`);
    });

    console.log(`\n\x1b[1m📊 CONTENT SIZE DISTRIBUTION: \x1b[0m`);
    stats.size_distribution.forEach(row => {
        const percentage = ((row.count / total) * 100).toFixed(1);
        const bar = '▓'.repeat(Math.floor(percentage / 2));
        console.log(`\x1b[33m${ row.size_category.padEnd(20) }\x1b[0m ${ bar } ${ row.count.toLocaleString() }(${ percentage } %)`);
    });

    console.log(`\n\x1b[1m🎯 CONTENT TYPE ANALYSIS: \x1b[0m`);
    Object.entries(stats.contentAnalysis).forEach(([type, count]) => {
        const percentage = ((count / 5000) * 100).toFixed(1);
        const bar = '░'.repeat(Math.floor(percentage / 2));
        console.log(`\x1b[35m${ type.padEnd(15) }\x1b[0m ${ bar } ${ count.toLocaleString() }(${ percentage } %)`);
    });

    console.log(`\n\x1b[1m📅 RECENT ACTIVITY(Last 10 days): \x1b[0m`);
    stats.timeline.slice(0, 10).forEach(row => {
        const bar = '▒'.repeat(Math.floor(row.count / 100));
        console.log(`\x1b[32m${ row.date }\x1b[0m ${ bar } ${ row.count.toLocaleString() }`);
    });
}

// --- INTELLIGENT GLOSSARY GENERATOR ---
async function generateIntelligentGlossary() {
    console.log(`\x1b[1m\x1b[35m📚 === INTELLIGENT GLOSSARY GENERATOR ===\x1b[0m`);
    
    const cacheKey = getCacheKey('glossary');
    const cachedGlossary = getCachedData(cacheKey, 'glossary');
    if (cachedGlossary) {
        displayGlossary(cachedGlossary);
        return cachedGlossary;
    }

    // Извлекаем потенциальные термины из всего корпуса
    console.log(`\x1b[33m🔍 Extracting semantic terms from corpus...\x1b[0m`);
    
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);
    
    const termMap = new Map();
    
    return new Promise((resolve, reject) => {
        const batchSize = 2000;
        let offset = 0;
        
        const processBatch = () => {
            db.all(
                `SELECT text, source FROM holographic_memory ORDER BY id LIMIT ? OFFSET ? `,
                [batchSize, offset],
                (err, rows) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    
                    if (rows.length === 0) {
                        // Обработка завершена
                        const glossary = generateGlossaryFromTerms(termMap);
                        setCachedData(cacheKey, glossary, 'glossary');
                        displayGlossary(glossary);
                        resolve(glossary);
                        db.close();
                        return;
                    }
                    
                    rows.forEach(row => {
                        const terms = extractSemanticTerms(row.text);
                        terms.forEach(term => {
                            if (!termMap.has(term)) {
                                termMap.set(term, {
                                    count: 0,
                                    contexts: [],
                                    sources: new Set()
                                });
                            }
                            
                            const termData = termMap.get(term);
                            termData.count++;
                            termData.sources.add(row.source);
                            
                            // Добавляем контекст (небольшой фрагмент вокруг термина)
                            const termIndex = row.text.indexOf(term);
                            if (termIndex !== -1 && termData.contexts.length < 3) {
                                const start = Math.max(0, termIndex - 50);
                                const end = Math.min(row.text.length, termIndex + term.length + 50);
                                const context = row.text.substring(start, end);
                                termData.contexts.push(context);
                            }
                        });
                    });
                    
                    offset += batchSize;
                    console.log(`\x1b[36m📊 Processed ${ offset } records...\x1b[0m`);
                    processBatch();
                }
            );
        };
        
        processBatch();
    });
}

function generateGlossaryFromTerms(termMap) {
    // Фильтруем и сортируем термины по важности
    const filteredTerms = Array.from(termMap.entries())
        .filter(([term, data]) => {
            // Фильтруем по минимальной частоте и длине
            return data.count >= 3 && term.length >= 3 && term.length <= 50;
        })
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 50); // Топ 50 терминов

    const glossary = filteredTerms.map(([term, data]) => ({
        term: term,
        count: data.count,
        sources: Array.from(data.sources).length,
        contexts: data.contexts,
        definition: generateTermDefinition(term, data.contexts)
    }));

    return glossary;
}

function generateTermDefinition(term, contexts) {
    // Простая логика генерации определения на основе контекстов
    if (contexts.length === 0) return `Technical term found ${ term }`;
    
    const context = contexts[0];
    
    // Попытка выделить определение из контекста
    if (context.includes('=') || context.includes(':')) {
        return `Programming element or configuration related to ${ term }`;
    }
    
    if (context.toLowerCase().includes('error') || context.toLowerCase().includes('problem')) {
        return `Term related to error handling or debugging: ${ term }`;
    }
    
    if (context.toLowerCase().includes('function') || context.toLowerCase().includes('method')) {
        return `Function or method in the codebase: ${ term }`;
    }
    
    return `Technical term: ${ term }.Context: ${ context.substring(0, 100) }...`;
}

function displayGlossary(glossary) {
    console.log(`\n\x1b[1m📖 TRIA INTELLIGENT GLOSSARY\x1b[0m`);
    console.log(`${ '='.repeat(60) }`);
    console.log(`\x1b[33mGenerated from ${ glossary.length } most significant terms\x1b[0m\n`);
    
    glossary.forEach((entry, index) => {
        console.log(`\x1b[1m\x1b[36m${ index + 1}. ${ entry.term } \x1b[0m`);
        console.log(`   \x1b[32mOccurrences: \x1b[0m ${ entry.count } | \x1b[32mSources: \x1b[0m ${ entry.sources } `);
        console.log(`   \x1b[33mDefinition: \x1b[0m ${ entry.definition } `);
        console.log('');
    });
}

// --- ENHANCED DISPLAY ENGINE ---
function displaySearchResults(results, query) {
    if (!results || results.length === 0) {
        console.log(`\x1b[31m❌ No results found for "${query}"\x1b[0m`);
        return;
    }

    console.log(`\n\x1b[1m\x1b[32m🎯 === SEARCH RESULTS ===\x1b[0m`);
    console.log(`\x1b[36m📝 Query: "${query}"\x1b[0m`);
    console.log(`\x1b[32m📊 Found: ${ results.length } high - quality results\x1b[0m\n`);

    results.forEach((result, index) => {
        const source = path.basename(result.source);
        const contentType = result.contentType.dominantType || 'text';
        const qualityEmoji = result.quality > 0.7 ? '🟢' : result.quality > 0.4 ? '🟡' : '🔴';
        
        console.log(`\x1b[1m\x1b[36m[${ index + 1 }] ${ qualityEmoji } ID: ${ result.id } \x1b[0m`);
        console.log(`\x1b[33m📁 Source: ${ source } | Type: ${ contentType } | Score: ${ result.finalScore.toFixed(3) } \x1b[0m`);
        
        if (result.semanticTerms && result.semanticTerms.length > 0) {
            console.log(`\x1b[35m🏷️  Terms: ${ result.semanticTerms.slice(0, 5).join(', ') } \x1b[0m`);
        }

        // Подсвеченный текст
        const highlightedText = highlightSearchTerms(result.summary, query);
        console.log(`\x1b[2m📄 ${ highlightedText } \x1b[0m`);
        
        console.log(`\x1b[90m⏰ ${ new Date(result.timestamp).toLocaleString() } \x1b[0m`);
        console.log(`${ '─'.repeat(80) } \n`);
    });
}

function highlightSearchTerms(text, query) {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    let highlightedText = text;

    terms.forEach(term => {
        const regex = new RegExp(`(${ term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') })`, 'gi');
        highlightedText = highlightedText.replace(regex, '\x1b[43m\x1b[30m$1\x1b[0m\x1b[2m');
    });

    return highlightedText;
}

// --- TOPIC DISCOVERY ENGINE ---
async function discoverTopics() {
    console.log(`\x1b[1m\x1b[35m🔍 === TOPIC DISCOVERY ===\x1b[0m`);
    
    const cacheKey = getCacheKey('topics');
    const cachedTopics = getCachedData(cacheKey, 'topics');
    if (cachedTopics) {
        displayTopics(cachedTopics);
        return cachedTopics;
    }

    // Извлекаем часто встречающиеся термины как основу для топиков
    const frequentTerms = await extractFrequentTerms();
    
    // Группируем термины в топики по семантической близости
    const topics = groupTermsIntoTopics(frequentTerms);
    
    setCachedData(cacheKey, topics, 'topics');
    displayTopics(topics);
    
    return topics;
}

async function extractFrequentTerms() {
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);
    
    return new Promise((resolve, reject) => {
        // Извлекаем термины из выборки записей
        db.all(
            `SELECT text FROM holographic_memory ORDER BY RANDOM() LIMIT 10000`,
            [],
            (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                const termFreq = new Map();
                
                rows.forEach(row => {
                    const terms = extractSemanticTerms(row.text);
                    terms.forEach(term => {
                        termFreq.set(term, (termFreq.get(term) || 0) + 1);
                    });
                });
                
                // Возвращаем топ-100 терминов
                const topTerms = Array.from(termFreq.entries())
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 100);
                
                resolve(topTerms);
                db.close();
            }
        );
    });
}

function groupTermsIntoTopics(terms) {
    // Простая группировка по первой букве и семантической близости
    const topics = [
        {
            name: "Development & Programming",
            keywords: terms.filter(([term]) => 
                /^(js|css|html|react|vue|angular|node|npm|api|sdk)/i.test(term)
            ).slice(0, 10)
        },
        {
            name: "3D Graphics & Rendering",
            keywords: terms.filter(([term]) => 
                /^(three|webgl|hologram|render|3d|mesh|scene|camera)/i.test(term)
            ).slice(0, 10)
        },
        {
            name: "Audio & Signal Processing",
            keywords: terms.filter(([term]) => 
                /^(audio|sound|cwt|wavelet|frequency|signal)/i.test(term)
            ).slice(0, 10)
        },
        {
            name: "AI & Machine Learning",
            keywords: terms.filter(([term]) => 
                /^(ai|ml|neural|embedding|vector|semantic|tria)/i.test(term)
            ).slice(0, 10)
        },
        {
            name: "System & Configuration",
            keywords: terms.filter(([term]) => 
                /^(config|system|server|database|sqlite|vite)/i.test(term)
            ).slice(0, 10)
        }
    ];
    
    return topics.filter(topic => topic.keywords.length > 0);
}

function displayTopics(topics) {
    console.log(`\n\x1b[1m🧠 DISCOVERED TOPICS\x1b[0m`);
    console.log(`${ '='.repeat(60) } `);
    
    topics.forEach((topic, index) => {
        console.log(`\n\x1b[1m\x1b[35m${ index + 1 }. ${ topic.name } \x1b[0m`);
        console.log(`\x1b[33m   Keywords: \x1b[0m`);
        
        topic.keywords.forEach(([term, freq]) => {
            const bar = '▓'.repeat(Math.min(20, Math.floor(freq / 5)));
            console.log(`   \x1b[36m${ term.padEnd(20) } \x1b[0m ${ bar } (${ freq })`);
        });
    });
}

// --- MAIN SEARCH FUNCTION ---
async function searchMemory(query, options = {}) {
    try {
        ensureCacheDir();
        const results = await searchMemoryFTS5(query, options);
        displaySearchResults(results, query);
        return results;
    } catch (error) {
        console.error(`\x1b[31m❌ Search failed: ${ error.message } \x1b[0m`);
        throw error;
    }
}

// --- COMMAND LINE INTERFACE ---
function showHelp() {
    console.log(`
\x1b[1m\x1b[35m🧠 TRIA ANALYTICS ENGINE v1.4 - FULLY LOCAL\x1b[0m
${ '='.repeat(60) }

\x1b[1mUSAGE: \x1b[0m
  node search_memory.js "query"          # Smart FTS5 search
  node search_memory.js--stats          # Corpus statistics  
  node search_memory.js--glossary       # Generate intelligent glossary
  node search_memory.js--topics         # Discover main topics
  node search_memory.js--clear - cache    # Clear all cached data
  node search_memory.js--help           # Show this help

\x1b[1mOPTIONS: \x1b[0m
--limit 20         # Set result limit(default: 15)
--min - quality 0.5  # Set minimum quality threshold(default: 0.3)
--no - filter        # Disable quality filtering
--include - logs     # Include server logs in results
--verbose          # Detailed output

\x1b[1mEXAMPLES: \x1b[0m
  node search_memory.js "hologram animation three.js"
  node search_memory.js "gesture recognition MediaPipe" --limit 10
  node search_memory.js "WASM loading error" --min - quality 0.6
  node search_memory.js--stats
  node search_memory.js--glossary

\x1b[1mFEATURES: \x1b[0m
  ⚡ Lightning - fast FTS5 search engine
  🧠 Intelligent content quality analysis  
  💾 Smart caching system for performance
  📊 Advanced corpus analytics
  📚 AI - powered glossary generation
  🔍 Semantic topic discovery
  🎯 Content type classification
  `);
}

// --- UTILITY FUNCTIONS ---
function clearCache() {
    try {
        if (fs.existsSync(CACHE_DIR)) {
            const files = fs.readdirSync(CACHE_DIR);
            files.forEach(file => {
                fs.unlinkSync(path.join(CACHE_DIR, file));
            });
            console.log(`\x1b[32m✅ Cleared ${ files.length } cache files\x1b[0m`);
        } else {
            console.log(`\x1b[33m⚠️  Cache directory doesn't exist\x1b[0m`);
        }
    } catch (error) {
  console.error(`\x1b[31m❌ Error clearing cache: ${error.message}\x1b[0m`);
}
}

// --- SCRIPT EXECUTION ---
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    showHelp();
    return;
  }

  // Инициализация
  ensureCacheDir();

  // Обработка команд
  if (args.includes('--stats')) {
    await analyzeCorpusStatistics();
    return;
  }

  if (args.includes('--glossary')) {
    await generateIntelligentGlossary();
    return;
  }

  if (args.includes('--topics')) {
    await discoverTopics();
    return;
  }

  if (args.includes('--clear-cache')) {
    clearCache();
    return;
  }

  // Извлечение опций
  const options = {};

  const limitIndex = args.indexOf('--limit');
  if (limitIndex !== -1 && args[limitIndex + 1]) {
    options.limit = parseInt(args[limitIndex + 1]);
  }

  const qualityIndex = args.indexOf('--min-quality');
  if (qualityIndex !== -1 && args[qualityIndex + 1]) {
    options.minQuality = parseFloat(args[qualityIndex + 1]);
  }

  if (args.includes('--no-filter')) options.qualityFilter = false;
  if (args.includes('--include-logs')) options.includeMetadata = true;
  if (args.includes('--verbose')) options.verbose = true;

  // Извлечение запроса
  const query = args.filter(arg =>
    !arg.startsWith('--') &&
    !['--limit', '--min-quality'].includes(args[args.indexOf(arg) - 1])
  ).join(' ');

  if (!query) {
    console.error(`\x1b[31m❌ Search query is required\x1b[0m`);
    showHelp();
    process.exit(1);
  }

  await searchMemory(query, options);
}

// Запуск приложения
main().catch(error => {
  console.error(`\x1b[31m💥 Fatal error: ${error.message}\x1b[0m`);
  console.error(error.stack);
  process.exit(1);
});
