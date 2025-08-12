// tria-genkit-core/search_memory.js - TRIA ANALYTICS ENGINE 1.3
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const crypto = require('crypto');

// --- CONFIGURATION ---
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const SEARCH_LIMIT = 15;
const ANALYTICS_BATCH_SIZE = 5000;
const API_BASE_URL = 'https://generativelanguage.googleapis.com/v1';

// API keys with rotation for reliability
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

  return [...new Set(expandedTerms)]; // Remove duplicates
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

  if (length > 200) relevance += 0.1;
  if (length > 500) relevance += 0.1;
  if (length > 1000) relevance += 0.1;

  if (contentType.documentation || contentType.conversation) relevance += 0.2;
  if (contentType.code && !contentType.html) relevance += 0.15;
  if (contentType.hologram || contentType.audio) relevance += 0.1;

  if (semanticTags && semanticTags.length > 0) {
    relevance += Math.min(0.2, semanticTags.length * 0.05);
  }

  if (contentType.svg) relevance -= 0.3;
  if (contentType.log) relevance -= 0.4;
  if (text.includes('<path d=')) relevance -= 0.3;

  return Math.max(0, Math.min(1, relevance));
}

function isHighQualityContent(text, contentType) {
  if (contentType.documentation || contentType.conversation) return true;
  if (contentType.code && !contentType.html && !contentType.svg) return true;
  if (contentType.hologram || contentType.audio) return true;

  if (contentType.log || contentType.svg) return false;
  if (text.includes('GET /static') || text.includes('404 Not Found')) return false;

  return text.length > 100;
}

// --- ENHANCED SEARCH FUNCTIONS ---
async function searchMemoryFTS5Enhanced(query, options = {}) {
  const { limit = 10000, useAdvancedQuery = true } = options;
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

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

  return new Promise((resolve) => {
    db.all(sql, [matchQuery, limit], (err, rows) => {
      if (err) {
        console.error("❌ FTS5 search error:", err.message);
        resolve([]);
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

  try {
    const queryEmbedding = await createQueryEmbedding(query);
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);
    const candidateIds = candidates.map(c => c.id).join(',');

    const sql = `
      SELECT id, text, source, timestamp, embedding, semantic_tags
      FROM holographic_memory
      WHERE id IN (${candidateIds})
    `;

    return new Promise((resolve) => {
      db.all(sql, [], (err, rows) => {
        if (err) {
          console.error("❌ Vector search error:", err.message);
          resolve([]);
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

        const filteredResults = results
          .filter(r => r.similarity > threshold)
          .filter(r => isHighQualityContent(r.text, r.contentType))
          .sort((a, b) => b.finalScore - a.finalScore)
          .slice(0, limit);

        resolve(filteredResults);
        db.close();
      });
    });
  } catch (error) {
    console.error("❌ Vector search failed:", error.message);
    return [];
  }
}

async function vectorOnlySearch(query, options = {}) {
  const { threshold = 0.4, limit = SEARCH_LIMIT, batchSize = 5000 } = options;
  console.log(`🔄 Performing full vector search (threshold: ${threshold})`);

  try {
    const queryEmbedding = await createQueryEmbedding(query);
    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

    const sql = `
      SELECT id, text, source, timestamp, embedding, semantic_tags
      FROM holographic_memory
      ORDER BY id
      LIMIT ? OFFSET ?
    `;

    return new Promise((resolve) => {
      let allResults = [];
      let offset = 0;
      let processed = 0;

      const processBatch = () => {
        db.all(sql, [batchSize, offset], (err, rows) => {
          if (err) {
            console.error("❌ Batch processing error:", err.message);
            resolve([]);
            return;
          }

          if (rows.length === 0) {
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
  } catch (error) {
    console.error("❌ Vector search failed:", error.message);
    return [];
  }
}

// --- HYBRID SEARCH STRATEGY ---
async function hybridSearch(query, options = {}) {
  const { threshold = 0.6, qualityFilter = true } = options;
  console.log(`🔍 === TRIA HYBRID SEARCH ===`);
  console.log(`📝 Query: "${query}"`);

  try {
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
    return [];
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

// --- FALLBACK SEARCH ---
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

    let displayText = result.text;
    if (displayText.length > 500) {
      displayText = displayText.substring(0, 500) + '...';
    }

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
  return new Promise(async (resolve) => {
    console.log('🧠 === TRIA MEMORY CORE ANALYSIS ===\n');

    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

    try {
      // Общая статистика
      const stats = await new Promise((resolve) => {
        db.get(`
          SELECT
            COUNT(*) as total_embeddings,
            COUNT(DISTINCT source) as unique_sources,
            MIN(timestamp) as earliest_entry,
            MAX(timestamp) as latest_entry
          FROM holographic_memory
        `, [], (err, stats) => {
          if (err) {
            console.error('Error getting stats:', err);
            resolve(null);
            return;
          }
          resolve(stats);
        });
      });

      if (stats) {
        console.log(`📊 Total Embeddings: ${stats.total_embeddings.toLocaleString()}`);
        console.log(`📁 Unique Sources: ${stats.unique_sources}`);
        console.log(`📅 Time Range: ${stats.earliest_entry} → ${stats.latest_entry}\n`);
      }

      // Топ источников
      const sources = await new Promise((resolve) => {
        db.all(`
          SELECT source, COUNT(*) as count
          FROM holographic_memory
          GROUP BY source
          ORDER BY count DESC
          LIMIT 15
        `, [], (err, sources) => {
          if (err) {
            console.error('Error getting sources:', err);
            resolve([]);
            return;
          }
          resolve(sources);
        });
      });

      if (sources.length > 0) {
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
      const tagRows = await new Promise((resolve) => {
        db.all(`
          SELECT semantic_tags
          FROM holographic_memory
          WHERE semantic_tags IS NOT NULL AND semantic_tags != '[]'
          LIMIT 10000
        `, [], (err, tagRows) => {
          if (err) {
            console.error('Error getting tags:', err);
            resolve([]);
            return;
          }
          resolve(tagRows);
        });
      });

      if (tagRows.length > 0) {
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
    } catch (error) {
      console.error('Error in corpus analysis:', error);
      db.close();
      resolve();
    }
  });
}

async function generateGlossary() {
  return new Promise(async (resolve) => {
    console.log('📚 === TRIA KNOWLEDGE GLOSSARY GENERATOR ===\n');
    console.log('🔍 Scanning memory for technical terms...\n');

    const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

    try {
      const rows = await new Promise((resolve) => {
        db.all(`
          SELECT text, semantic_tags, source
          FROM holographic_memory
          WHERE text LIKE '%function%'
             OR text LIKE '%class %'
             OR text LIKE '%interface%'
             OR text LIKE '%API%'
             OR semantic_tags LIKE '%Tria%'
             OR semantic_tags LIKE '%WASM%'
          LIMIT 1000
        `, [], (err, rows) => {
          if (err) {
            console.error('Error getting terms:', err);
            resolve([]);
            return;
          }
          resolve(rows);
        });
      });

      const detectedTerms = new Set();

      rows.forEach(row => {
        // Из семантических тегов
        if (row.semantic_tags) {
          try {
            const tags = JSON.parse(row.semantic_tags);
            tags.forEach(tag => {
              if (tag.length > 2) detectedTerms.add(tag);
            });
          } catch (e) {}
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
      console.log('*Auto-generated from memory embeddings*\n');
      console.log('---\n');

      const keyTerms = ['Tria', 'WASM', 'CWT', 'HologramRenderer', 'MemoryBot', 'AudioBot'];

      for (const term of keyTerms) {
        if (detectedTerms.has(term)) {
          console.log(`## ${term}\n`);

          try {
            const results = await hybridSearch(term, { limit: 3, threshold: 0.5 });

