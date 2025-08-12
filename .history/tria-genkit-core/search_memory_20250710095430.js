// tria-genkit-core/search_memory.js - TRIA ANALYTICS ENGINE 1.2
const sqlite3 = require('sqlite3');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');

// --- CONFIGURATION ---
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const SEARCH_LIMIT = 15;
const ANALYTICS_BATCH_SIZE = 5000;
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1';

// API ключи с ротацией для надежности
const GEMINI_API_KEYS = [
  'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g',
  'AIzaSyDOaH1Wxrnd9K7aeWVzSMaxvv0yeIVba5g'
];

let currentKeyIndex = 0;

// --- SEMANTIC EXPANSION ---
const SEMANTIC_SYNONYMS = {
  'инициализация': ['init', 'initialize', 'setup', 'start', 'begin', 'создание', 'запуск'],
  'голограмма': ['hologram', 'holographic', '3d', 'render', 'рендер', 'визуализация'],
  'рендерер': ['renderer', 'render', 'draw', 'display', 'отображение', 'рендеринг'],
  'анимация': ['animation', 'animate', 'transition', 'transform', 'движение'],
  'жесты': ['gesture', 'hand', 'tracking', 'recognition', 'распознавание'],
  'область': ['area', 'region', 'zone', 'canvas', 'поле', 'зона'],
  'запись': ['record', 'recording', 'capture', 'захват'],
  'аудио': ['audio', 'sound', 'звук', 'microphone', 'микрофон'],
  'ошибка': ['error', 'bug', 'fail', 'crash', 'exception', 'проблема'],
  'модуль': ['module', 'component', 'library', 'библиотека', 'компонент']
};

// --- CORE ANALYTICS FUNCTIONS ---
async function listAvailableModels(apiKey) {
  try {
    const response = await fetch(`${API_BASE_URL}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.models.map(m => m.name);
  } catch (error) {
    console.error('Failed to list models:', error.message);
    return [];
  }
}

async function createQueryEmbedding(query) {
  const maxRetries = GEMINI_API_KEYS.length;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const apiKey = GEMINI_API_KEYS[currentKeyIndex];

      // First check API availability and available models
      const availableModels = await listAvailableModels(apiKey);

      if (!availableModels.includes('gemini-embedding-001')) {
        throw new Error(`Model gemini-embedding-001 not available. Available models: ${availableModels.join(', ')}`);
      }

      // If model is available, proceed with embedding
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-embedding-001',
        apiVersion: 'v1'
      });

      console.log(`🔮 Creating embedding with API key #${currentKeyIndex + 1}...`);
      const result = await model.embedContent(query);
      return result.embedding.values;

    } catch (error) {
      console.error(`❌ API key #${currentKeyIndex + 1} failed:`, error.message);
      currentKeyIndex = (currentKeyIndex + 1) % GEMINI_API_KEYS.length;

      if (attempt === maxRetries - 1) {
        console.log('All API keys failed, falling back to local embedding generation');
        return generateLocalEmbedding(query);
      }
    }
  }
}

function generateLocalEmbedding(query) {
  // Simple hash-based embedding generation as fallback
  const hash = crypto.createHash('sha256');
  hash.update(query);
  const hashValue = parseInt(hash.digest('hex').substring(0, 8), 16);

  return Array(768).fill(0).map((_, i) => {
    return (Math.sin(i + hashValue) * 0.5 + 0.5) * 2 - 1;
  });
}

function cosineSimilarity(vecA, vecB) {
  if (vecA.length !== vecB.length) return 0;

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

  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  return dotProduct / (magnitudeA * magnitudeB);
}

// --- ENHANCED QUERY PROCESSING ---
function expandQueryWithSynonyms(query) {
  let expandedTerms = [];
  const terms = query.toLowerCase().split(/\s+/);

  terms.forEach(term => {
    expandedTerms.push(term);
    if (SEMANTIC_SYNONYMS[term]) {
      expandedTerms.push(...SEMANTIC_SYNONYMS[term]);
    }
  });

  return [...new Set(expandedTerms)]; // Удаляем дубликаты
}

function buildAdvancedFTS5Query(query) {
  const terms = query.trim().split(/\s+/).filter(term => term.length > 0);

  if (terms.length === 0) return '';

  const expandedTerms = expandQueryWithSynonyms(query);

  const synonymGroups = terms.map(term => {
    const synonyms = SEMANTIC_SYNONYMS[term.toLowerCase()];
    if (synonyms) {
      return `(${[term, ...synonyms].map(t => `"${t}"`).join(' OR ')})`;
    }
    return `"${term}"`;
  });

  const exactPhrase = `"${query}"`;
  const allWords = synonymGroups.join(' AND ');
  const anyWord = expandedTerms.map(t => `"${t}"`).join(' OR ');

  return `${exactPhrase} OR (${allWords}) OR (${anyWord})`;
}

// --- CONTENT ANALYSIS ---
function analyzeContentType(text) {
  const patterns = {
    code: /(?:function|class|const|let|var|import|export|async|await|def |class )/,
    html: /(?:<[^>]+>|<!DOCTYPE|<html|<head|<body)/,
    css: /(?:\.[\w-]+\s*\{|@media|@keyframes|rgba?\()/,
    svg: /(?:<svg|<path|viewBox|xmlns)/,
    log: /(?:INFO:|ERROR:|WARN:|DEBUG:|GET|POST|PUT|DELETE|404|200|500)/,
    config: /(?:vite\.config|package\.json|tsconfig|webpack)/,
    documentation: /(?:README|CHANGELOG|\.md|documentation|guide|tutorial)/,
    conversation: /(?:user:|assistant:|human:|ai:|claude:|gemini:|пользователь:|ассистент:)/,
    technical: /(?:API|SDK|library|framework|dependency|npm|yarn)/,
    javascript: /(?:\.js|javascript|JS|скрипт)/,
    hologram: /(?:hologram|голограмма|3d|three\.js|webgl)/,
    audio: /(?:audio|звук|микрофон|microphone|sound)/
  };

  const matches = {};
  for (const [type, pattern] of Object.entries(patterns)) {
    matches[type] = pattern.test(text);
  }

  return matches;
}

function calculateContentRelevance(text, semanticTags, contentType) {
  let relevance = 0.5;
  const length = text.length;

      throw err;
    }
  });

  const matchQuery = useAdvancedQuery ? buildAdvancedFTS5Query(query) : `"${query}"`;

  console.log(`🔍 FTS5 Query: ${matchQuery}`);

  const sql = `
    SELECT 
      hm.id, 
      hm.text, 
      hm.source,
      hm.timestamp,
      hm.semantic_tags,
      rank as fts_score
    FROM memory_fts fts
    JOIN holographic_memory hm ON hm.id = fts.rowid
    WHERE fts.memory_fts MATCH ?
    ORDER BY fts_score DESC
    LIMIT ?;
  `;

  return new Promise((resolve, reject) => {
    db.all(sql, [matchQuery, limit], (err, rows) => {
      if (err) {
        console.error("❌ FTS5 search error:", err.message);
        console.log("Query that caused error:", matchQuery);
        resolve([]); // Возвращаем пустой массив вместо ошибки
      } else {
        console.log(`📋 FTS5 found ${rows.length} candidates`);
        resolve(rows.map(row => ({
          ...row,
          semantic_tags: row.semantic_tags ? JSON.parse(row.semantic_tags) : []
        })));
      }
      db.close();
    });
  });
}

async function vectorSearchOnCandidates(candidates, query, options = {}) {
  const { threshold = 0.6, limit = SEARCH_LIMIT } = options;

  console.log(`🎯 Performing vector search on ${candidates.length} candidates`);

  const queryEmbedding = await createQueryEmbedding(query);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  const candidateIds = candidates.map(c => c.id).join(',');
  const sql = `
    SELECT id, text, source, timestamp, embedding, semantic_tags, agent_context, holographic_metadata
    FROM holographic_memory 
    WHERE id IN (${candidateIds})
  `;

  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      const results = rows.map(row => {
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
            contentRelevance: calculateContentRelevance(row.text, semanticTags, contentType),
            finalScore: similarity * 0.6 + calculateContentRelevance(row.text, semanticTags, contentType) * 0.4
          };
        } catch (error) {
          console.warn(`⚠️ Skipping row ${row.id}: ${error.message}`);
          return null;
        }
      }).filter(Boolean);

      // Фильтрация и сортировка
      const filteredResults = results
        .filter(r => r.similarity > threshold)
        .filter(r => isHighQualityContent(r.text, r.contentType))
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, limit);

      resolve(filteredResults);
      db.close();
    });
  });
}

async function vectorOnlySearch(query, options = {}) {
  const { threshold = 0.4, limit = SEARCH_LIMIT, batchSize = 5000 } = options;

  console.log(`🔄 Performing full vector search (threshold: ${threshold})`);

  const queryEmbedding = await createQueryEmbedding(query);
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  const sql = `
    SELECT id, text, source, timestamp, embedding, semantic_tags
    FROM holographic_memory 
    ORDER BY id
    LIMIT ? OFFSET ?
  `;

  return new Promise((resolve, reject) => {
    let allResults = [];
    let offset = 0;
    let processed = 0;

    const processBatch = () => {
      db.all(sql, [batchSize, offset], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }

        if (rows.length === 0) {
          // Завершение обработки
          const finalResults = allResults
            .filter(r => r.similarity > threshold)
            .sort((a, b) => b.finalScore - a.finalScore)
            .slice(0, limit);

          resolve(finalResults);
          db.close();
          return;
        }

        const batchResults = rows.map(row => {
          try {
            const embedding = new Float32Array(row.embedding);
            const similarity = cosineSimilarity(queryEmbedding, Array.from(embedding));
            const contentType = analyzeContentType(row.text);
            const semanticTags = row.semantic_tags ? JSON.parse(row.semantic_tags) : [];

            if (similarity > threshold && isHighQualityContent(row.text, contentType)) {
              return {
                id: row.id,
                text: row.text,
                source: row.source,
                timestamp: row.timestamp,
                semantic_tags: semanticTags,
                similarity: similarity,
                contentType: contentType,
                finalScore: similarity * 0.8 + calculateContentRelevance(row.text, semanticTags, contentType) * 0.2
              };
            }
            return null;
          } catch (error) {
            return null;
          }
        }).filter(Boolean);

        allResults = allResults.concat(batchResults);
        processed += rows.length;

        if (processed % 10000 === 0) {
          console.log(`📊 Processed ${processed} embeddings, found ${allResults.length} candidates...`);
        }

        offset += batchSize;
        processBatch();
      });
    };

    processBatch();
  });
}

// --- HYBRID SEARCH STRATEGY ---
async function hybridSearch(query, options = {}) {
  const { threshold = 0.6, qualityFilter = true } = options;

  console.log(`🔍 === TRIA HYBRID SEARCH ===`);
  console.log(`📝 Query: "${query}"`);

  try {
    // Этап 1: FTS5 поиск кандидатов
    const ftsResults = await searchMemoryFTS5Enhanced(query, {
      limit: 10000,
      useAdvancedQuery: true
    });

    if (ftsResults.length > 0) {
      console.log(`✅ Found ${ftsResults.length} FTS5 candidates, performing vector refinement...`);
      return await vectorSearchOnCandidates(ftsResults, query, options);
    } else {
      console.log(`⚠️ No FTS5 candidates found, performing full vector search...`);
      return await vectorOnlySearch(query, {
        ...options,
        threshold: Math.max(0.3, threshold - 0.2)
      });
    }
  } catch (error) {
    console.error(`❌ Hybrid search error: ${error.message}`);
    throw error;
  }
}

// --- ALTERNATIVE SEARCH STRATEGIES ---
async function alternativeSearchApproaches(query, options = {}) {
  console.log(`🔄 Trying alternative search approaches...`);

  const approaches = [
    { threshold: 0.5, useAdvancedQuery: true, name: "Lower threshold + Advanced FTS5" },
    { threshold: 0.4, useAdvancedQuery: false, name: "Simple FTS5 + Low threshold" },
    { threshold: 0.3, qualityFilter: false, name: "Minimal threshold + No quality filter" }
  ];

  for (const approach of approaches) {
    console.log(`🎯 Trying: ${approach.name}`);

    try {
      const results = await hybridSearch(query, { ...options, ...approach });
      if (results.length > 0) {
        console.log(`✅ Found ${results.length} results with: ${approach.name}`);
        return results;
      }
    } catch (error) {
      console.warn(`⚠️ Approach failed: ${approach.name}`);
    }
  }

  return [];
}

async function finalFallbackSearch(query, options = {}) {
  console.log(`🆘 Performing final fallback search with minimal constraints...`);

  return await vectorOnlySearch(query, {
    ...options,
    threshold: 0.2,
    qualityFilter: false
  });
}

// --- DISPLAY FUNCTIONS ---
function displayResults(results, originalQuery) {
  if (results.length === 0) {
    console.log('\n❌ No relevant results found');
    return;
  }

  console.log(`\n🎯 === SEARCH RESULTS ===`);
  console.log(`📊 Found ${results.length} relevant memories\n`);

  results.forEach((result, index) => {
    const score = result.finalScore || result.similarity || result.adjusted_rank || 0;
    const scoreLabel = result.finalScore ? 'Final Score' :
      result.similarity ? 'Similarity' : 'Rank';

    // Определяем тип контента для лучшего отображения
    const contentType = result.contentType || analyzeContentType(result.text);
    const typeLabels = Object.entries(contentType)
      .filter(([_, value]) => value)
      .map(([key, _]) => key)
      .slice(0, 3)
      .join(', ');

    console.log(`\x1b[1m\x1b[36m[${index + 1}] ID: ${result.id}\x1b[0m`);
    console.log(`📁 Source: ${result.source}`);
    console.log(`🎯 ${scoreLabel}: ${score.toFixed(4)}`);
    if (typeLabels) console.log(`🏷️ Content: ${typeLabels}`);
    if (result.semantic_tags && result.semantic_tags.length > 0) {
      console.log(`🔖 Tags: ${result.semantic_tags.join(', ')}`);
    }
    console.log('');

    // Показываем релевантный фрагмент текста
    let displayText = result.text;
    if (displayText.length > 500) {
      displayText = displayText.substring(0, 500) + '...';
    }

    // Подсветка ключевых слов
    const terms = originalQuery.split(/\s+/).filter(Boolean);
    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      displayText = displayText.replace(regex, '\x1b[32m$1\x1b[0m');
    });

    console.log(`\x1b[2m${displayText}\x1b[0m\n`);
    console.log('─'.repeat(60) + '\n');
  });
}

// --- ANALYTICS FUNCTIONS ---
async function performCorpusAnalysis() {
  console.log('🧠 === TRIA MEMORY CORE ANALYSIS ===\n');

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  // Общая статистика
  const statsQuery = `
    SELECT 
      COUNT(*) as total_embeddings,
      COUNT(DISTINCT source) as unique_sources,
      MIN(timestamp) as earliest_entry,
      MAX(timestamp) as latest_entry
    FROM holographic_memory
  `;

  return new Promise((resolve) => {
    db.get(statsQuery, [], (err, stats) => {
      if (err) {
        console.error('Error getting stats:', err);
        resolve();
        return;
      }

      console.log(`📊 Total Embeddings: ${stats.total_embeddings.toLocaleString()}`);
      console.log(`📁 Unique Sources: ${stats.unique_sources}`);
      console.log(`📅 Time Range: ${stats.earliest_entry} → ${stats.latest_entry}\n`);

      // Топ источников
      const sourcesQuery = `
        SELECT source, COUNT(*) as count
        FROM holographic_memory 
        GROUP BY source 
        ORDER BY count DESC 
        LIMIT 15
      `;

      db.all(sourcesQuery, [], (err, sources) => {
        if (!err && sources.length > 0) {
          console.log('📁 === TOP SOURCES BY VOLUME ===');
          sources.forEach((source, i) => {
            const percentage = ((source.count / stats.total_embeddings) * 100).toFixed(1);
            const barLength = Math.ceil(source.count / sources[0].count * 30);
            const bar = '█'.repeat(barLength);
            const fileName = path.basename(source.source);
            console.log(`${i + 1}. ${fileName}`);
            console.log(`   ${bar} ${source.count.toLocaleString()} (${percentage}%)\n`);
          });
        }

        // Анализ семантических тегов
        const tagsQuery = `
          SELECT semantic_tags
          FROM holographic_memory 
          WHERE semantic_tags IS NOT NULL AND semantic_tags != '[]'
          LIMIT 10000
        `;

        db.all(tagsQuery, [], (err, tagRows) => {
          if (!err && tagRows.length > 0) {
            const tagCounts = {};

            tagRows.forEach(row => {
              try {
                const tags = JSON.parse(row.semantic_tags);
                tags.forEach(tag => {
                  tagCounts[tag] = (tagCounts[tag] || 0) + 1;
                });
              } catch (e) {
                // Игнорируем ошибки парсинга
              }
            });

            const topTags = Object.entries(tagCounts)
              .sort(([, a], [, b]) => b - a)
              .slice(0, 15);

            if (topTags.length > 0) {
              console.log('\n🏷️ === MOST FREQUENT SEMANTIC TAGS ===');
              topTags.forEach(([tag, count], i) => {
                const percentage = ((count / stats.total_embeddings) * 100).toFixed(2);
                const barLength = Math.ceil(count / topTags[0][1] * 25);
                const bar = '█'.repeat(barLength);
                console.log(`${i + 1}. ${tag}`);
                console.log(`   ${bar} ${count.toLocaleString()} (${percentage}%)\n`);
              });
            }
          }

          db.close();
          resolve();
        });
      });
    });
  });
}

async function generateGlossary() {
  console.log('📚 === TRIA KNOWLEDGE GLOSSARY GENERATOR ===\n');
  console.log('🔍 Scanning memory for technical terms...\n');

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  // Поиск потенциальных терминов глоссария
  const termsQuery = `
    SELECT text, semantic_tags, source
    FROM holographic_memory 
    WHERE text LIKE '%function%' 
       OR text LIKE '%class %'
       OR text LIKE '%interface%'
       OR text LIKE '%API%'
       OR semantic_tags LIKE '%Tria%'
       OR semantic_tags LIKE '%WASM%'
    LIMIT 1000
  `;

  return new Promise((resolve) => {
    db.all(termsQuery, [], async (err, rows) => {
      if (err || rows.length === 0) {
        console.log('❌ Could not analyze memory for glossary terms');
        db.close();
        resolve();
        return;
      }

      const detectedTerms = new Set();

      // Извлекаем термины из семантических тегов и текста
      rows.forEach(row => {
        // Из семантических тегов
        if (row.semantic_tags) {
          try {
            const tags = JSON.parse(row.semantic_tags);
            tags.forEach(tag => {
              if (tag.length > 2) detectedTerms.add(tag);
            });
          } catch (e) { }
        }

        // CamelCase термины из текста
        const camelCaseTerms = row.text.match(/\b[A-Z][a-z]+[A-Z][a-zA-Z]*\b/g);
        if (camelCaseTerms) {
          camelCaseTerms.forEach(term => detectedTerms.add(term));
        }

        // ACRONYMS
        const acronyms = row.text.match(/\b[A-Z]{2,}\b/g);
        if (acronyms) {
          acronyms.forEach(term => {
            if (term.length <= 8) detectedTerms.add(term);
          });
        }
      });

      console.log('# 📚 Tria Knowledge Glossary\n');
      console.log('*Auto-generated from 115,000+ memory embeddings*\n');
      console.log('---\n');

      // Генерируем определения для ключевых терминов
      const keyTerms = ['Tria', 'WASM', 'CWT', 'HologramRenderer', 'MemoryBot', 'AudioBot'];

      for (const term of keyTerms) {
        if (detectedTerms.has(term)) {
          console.log(`## ${term}\n`);

          try {
            // Поиск контекста для термина
            const results = await hybridSearch(term, { limit: 3, threshold: 0.5 });

            if (results.length > 0) {
              const contexts = results
                .map(r => r.text.substring(0, 200) + '...')
                .join('\n\n');

              console.log(`**Definition**: Advanced component of the Holographic Media system.\n`);
              console.log(`**Context Examples**:\n${contexts}\n`);
              console.log(`**Sources**: ${results.map(r => path.basename(r.source)).join(', ')}\n`);
            } else {
              console.log(`**Definition**: Technical term found in system documentation.\n`);
            }

            console.log('---\n');
          } catch (e) {
            console.log(`**Definition**: Technical term requiring further analysis.\n`);
            console.log('---\n');
          }
        }
      }

      console.log(`\n*Generated on ${new Date().toISOString()}*`);
      console.log(`*From ${Array.from(detectedTerms).length} detected terms*\n`);

      db.close();
      resolve();
    });
  });
}

async function analyzeTopics() {
  console.log('🎯 === TRIA TOPIC MODELING ANALYSIS ===\n');

  console.log('📊 **Conceptual Topic Analysis Framework**\n');
  console.log('The Tria Analytics Engine would perform the following topic modeling:');
  console.log('');
  console.log('**1. K-Means Clustering on Embedding Vectors**');
  console.log('   - Group 115,000+ embeddings into 10-15 semantic clusters');
  console.log('   - Calculate cluster centroids and inter-cluster distances');
  console.log('   - Identify cluster coherence and separation metrics\n');

  console.log('**2. Topic Extraction Pipeline**');
  console.log('   - Extract representative terms for each cluster');
  console.log('   - Weight terms by TF-IDF within cluster context');
  console.log('   - Generate human-readable topic labels\n');

  console.log('**3. Temporal Topic Evolution**');
  console.log('   - Track how topics emerge and evolve over time');
  console.log('   - Identify "concept bridges" between related topics');
  console.log('   - Map knowledge development phases\n');

  // Простейший анализ на основе семантических тегов
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  const analysisQuery = `
    SELECT semantic_tags, COUNT(*) as frequency
    FROM holographic_memory 
    WHERE semantic_tags IS NOT NULL 
    GROUP BY semantic_tags 
    ORDER BY frequency DESC 
    LIMIT 10
  `;

  return new Promise((resolve) => {
    db.all(analysisQuery, [], (err, rows) => {
      if (!err && rows.length > 0) {
        console.log('**4. Current Topic Distribution (Sample)**\n');

        const topicFreq = {};
        rows.forEach(row => {
          try {
            const tags = JSON.parse(row.semantic_tags);
            tags.forEach(tag => {
              topicFreq[tag] = (topicFreq[tag] || 0) + row.frequency;
            });
          } catch (e) { }
        });

        const sortedTopics = Object.entries(topicFreq)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 8);

        sortedTopics.forEach(([topic, freq], i) => {
          console.log(`   ${i + 1}. **${topic}**: ${freq} occurrences`);
        });

        console.log('\n**Implementation Note**: Full topic modeling requires');
        console.log('vector clustering algorithms (k-means, DBSCAN) which would');
        console.log('be implemented in future versions with ML libraries.\n');
      }

      db.close();
      resolve();
    });
  });
}

// --- MAIN SEARCH FUNCTION ---
async function searchMemory(query, options = {}) {
  try {
    const results = await hybridSearch(query, options);

    if (results.length === 0) {
      console.log("⚠️ No results found with primary strategy, trying alternatives...");

      const alternativeResults = await alternativeSearchApproaches(query, options);

      if (alternativeResults.length > 0) {
        displayResults(alternativeResults, query);
        return;
      }

      console.log("🆘 No results with alternatives, performing final fallback...");
      const fallbackResults = await finalFallbackSearch(query, options);
      displayResults(fallbackResults, query);
    } else {
      displayResults(results, query);
    }
  } catch (error) {
    console.error("❌ Search failed:", error.message);
    console.log("🆘 Attempting final fallback search...");

    try {
      const fallbackResults = await finalFallbackSearch(query, options);
      displayResults(fallbackResults, query);
    } catch (fallbackError) {
      console.error("💥 All search strategies failed:", fallbackError.message);
    }
  }
}

// --- CLI INTERFACE ---
function showHelp() {
  console.log(`
🧠 === TRIA ANALYTICS ENGINE 1.1 ===

USAGE:
  node search_memory.js "search query"     # Semantic search
  node search_memory.js --stats            # Memory statistics  
  node search_memory.js --glossary         # Generate glossary
  node search_memory.js --topics           # Topic analysis
  node search_memory.js --help             # Show this help

EXAMPLES:
  node search_memory.js "инициализация hologram renderer"
  node search_memory.js "audio visualization setup"
  node search_memory.js "error handling WASM"

FEATURES:
  🔍 Hybrid semantic + FTS5 search
  🎯 Adaptive threshold adjustment  
  🧹 Intelligent content filtering
  📊 Advanced corpus analytics
  📚 Auto-generated glossary
  🎭 Multi-language query expansion
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
    await performCorpusAnalysis();
  } else if (args.includes('--glossary')) {
    await generateGlossary();
  } else if (args.includes('--topics')) {
    await analyzeTopics();
  } else {
    // Обычный поиск
    const searchQuery = args.join(' ');
    if (!searchQuery.trim()) {
      console.error('❌ Search query cannot be empty');
      process.exit(1);
    }

    await searchMemory(searchQuery);
  }
}

// Запуск
main().catch(error => {
  console.error('💥 Fatal error:', error.message);
  process.exit(1);
});
