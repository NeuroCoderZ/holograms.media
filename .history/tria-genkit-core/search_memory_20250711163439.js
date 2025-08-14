// tria-genkit-core/search_memory.js - TRIA ANALYTICS ENGINE 1.6 (ПОЛНОСТЬЮ ЛОКАЛЬНАЯ)
const sqlite3 = require('sqlite3');
const path = require('path');
const fs = require('fs');

// === КОНФИГУРАЦИЯ ===
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const SEARCH_LIMIT = 15;
const ANALYTICS_BATCH_SIZE = 5000;

// === ЦВЕТНОЙ ВЫВОД ===
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

function colorize(text, color) {
  return `${colors[color] || ''}${text}${colors.reset}`;
}

function printHeader(title) {
  console.log('\n' + colorize(`🚀 === ${title} ===`, 'bright'));
}

function printSubHeader(title) {
  console.log(colorize(`📋 ${title}`, 'cyan'));
}

// === СЕМАНТИЧЕСКИЙ АНАЛИЗ КОНТЕНТА ===
const CONTENT_PATTERNS = {
  // Высококачественный контент
  CODE_LOGIC: {
    patterns: [
      /function\s+\w+\s*\([^)]*\)\s*\{/,
      /class\s+\w+/,
      /const\s+\w+\s*=/,
      /async\s+function/,
      /export\s+(default\s+)?/
    ],
    weight: 0.8,
    description: 'Логика кода'
  },

  INITIALIZATION: {
    patterns: [
      /init(ialize)?/i,
      /setup/i,
      /create/i,
      /new\s+\w+/,
      /\.init\(/,
      /DOMContentLoaded/
    ],
    weight: 0.9,
    description: 'Инициализация'
  },

  HOLOGRAM_TECH: {
    patterns: [
      /hologram/i,
      /three\.js/i,
      /webgl/i,
      /renderer/i,
      /scene/i,
      /camera/i,
      /mesh/i
    ],
    weight: 0.9,
    description: 'Голографические технологии'
  },

  GESTURE_TECH: {
    patterns: [
      /gesture/i,
      /жест/i,
      /MediaPipe/i,
      /tracking/i,
      /recognition/i,
      /hand/i
    ],
    weight: 0.8,
    description: 'Технологии жестов'
  },

  AUDIO_TECH: {
    patterns: [
      /audio/i,
      /звук/i,
      /microphone/i,
      /CWT/i,
      /wavelet/i,
      /frequency/i
    ],
    weight: 0.7,
    description: 'Аудио технологии'
  },

  DOCUMENTATION: {
    patterns: [
      /документация/i,
      /инструкция/i,
      /как\s+\w+/i,
      /что\s+такое/i,
      /зачем/i,
      /почему/i
    ],
    weight: 0.6,
    description: 'Документация'
  },

  // Низкокачественный контент
  SERVER_LOGS: {
    patterns: [
      /INFO:\s+\d+\.\d+\.\d+\.\d+/,
      /HTTP\/1\.[01]/,
      /GET\s+\/static/,
      /404\s+Not\s+Found/i,
      /200\s+OK/i,
      /POST\s+\/api/
    ],
    weight: -1.0,
    description: 'Серверные логи'
  },

  SVG_MARKUP: {
    patterns: [
      /<svg/,
      /<path\s+d=/,
      /viewBox=/,
      /xmlns=/,
      /fill="#[a-f0-9]{6}"/i
    ],
    weight: -0.8,
    description: 'SVG разметка'
  },

  HTML_NOISE: {
    patterns: [
      /^<[^>]*>.*<\/[^>]*>$/s,
      /<div|<span|<button/,
      /class="[^"]*"/,
      /id="[^"]*"/
    ],
    weight: -0.6,
    description: 'HTML шум'
  },

  HASH_STRINGS: {
    patterns: [
      /^[a-f0-9]{32,}$/i,
      /^[A-Fa-f0-9\s\-]{50,}$/
    ],
    weight: -0.9,
    description: 'Хеш строки'
  }
};

const SEMANTIC_CLUSTERS = {
  'ИНИЦИАЛИЗАЦИЯ': ['init', 'initialize', 'setup', 'create', 'start', 'begin', 'запуск', 'создание'],
  'РЕНДЕРИНГ': ['render', 'renderer', 'rendering', 'draw', 'display', 'paint', 'рендер'],
  'ГОЛОГРАММЫ': ['hologram', 'holographic', '3d', 'three.js', 'webgl', 'scene'],
  'ЖЕСТЫ': ['gesture', 'hand', 'finger', 'tracking', 'recognition', 'жест'],
  'АУДИО': ['audio', 'sound', 'microphone', 'speech', 'voice', 'звук', 'микрофон'],
  'АНИМАЦИЯ': ['animation', 'animate', 'transition', 'transform', 'анимация', 'движение'],
  'ИНТЕРФЕЙС': ['ui', 'interface', 'button', 'panel', 'menu', 'интерфейс', 'кнопка'],
  'ОШИБКИ': ['error', 'bug', 'exception', 'fail', 'crash', 'ошибка', 'проблема']
};

// === АНАЛИЗ И ФИЛЬТРАЦИЯ КОНТЕНТА ===
function analyzeContentQuality(text) {
  let totalScore = 0;
  let matchedPatterns = [];

  // Проверяем каждую категорию паттернов
  for (const [category, config] of Object.entries(CONTENT_PATTERNS)) {
    const matches = config.patterns.filter(pattern => pattern.test(text));
    if (matches.length > 0) {
      totalScore += config.weight;
      matchedPatterns.push({
        category,
        description: config.description,
        weight: config.weight,
        matches: matches.length
      });
    }
  }

  // Бонусы за длину и структуру
  const length = text.length;
  if (length > 300) totalScore += 0.1;
  if (length > 800) totalScore += 0.1;
  if (length > 1500) totalScore += 0.1;

  // Штраф за слишком короткий контент
  if (length < 50) totalScore -= 0.5;

  return {
    score: Math.max(-1, Math.min(1, totalScore)),
    patterns: matchedPatterns,
    length: length
  };
}

function classifyContent(text) {
  const analysis = analyzeContentQuality(text);

  if (analysis.score >= 0.6) return 'HIGH_QUALITY';
  if (analysis.score >= 0.2) return 'MEDIUM_QUALITY';
  if (analysis.score >= -0.2) return 'LOW_QUALITY';
  return 'NOISE';
}

function isRelevantContent(text, minScore = 0.1) {
  const analysis = analyzeContentQuality(text);
  return analysis.score >= minScore && text.length >= 30;
}

// === СЕМАНТИЧЕСКОЕ РАСШИРЕНИЕ ЗАПРОСОВ ===
function expandQuerySemantics(query) {
  const expandedTerms = new Set();
  const queryLower = query.toLowerCase();

  // Добавляем исходные термы
  query.split(/\s+/).forEach(term => expandedTerms.add(term.toLowerCase()));

  // Добавляем семантически связанные термы
  for (const [cluster, terms] of Object.entries(SEMANTIC_CLUSTERS)) {
    const hasMatch = terms.some(term => queryLower.includes(term));
    if (hasMatch) {
      terms.forEach(term => expandedTerms.add(term));
    }
  }

  return Array.from(expandedTerms);
}

function calculateSemanticSimilarity(text, queryTerms) {
  const textLower = text.toLowerCase();
  let similarity = 0;
  let matchCount = 0;

  queryTerms.forEach(term => {
    if (textLower.includes(term)) {
      matchCount++;
      // Бонус за точное совпадение
      const exactMatches = (textLower.match(new RegExp(term, 'g')) || []).length;
      similarity += exactMatches * 0.1;
    }
  });

  // Нормализация по количеству терминов
  return matchCount > 0 ? similarity + (matchCount / queryTerms.length) * 0.5 : 0;
}

// === КЛАСТЕРИЗАЦИЯ РЕЗУЛЬТАТОВ ===
function clusterResults(results, query) {
  const clusters = {
    'ИНИЦИАЛИЗАЦИЯ': [],
    'РЕНДЕРИНГ': [],
    'ЖЕСТЫ': [],
    'АУДИО': [],
    'ДОКУМЕНТАЦИЯ': [],
    'ДРУГОЕ': []
  };

  results.forEach(result => {
    const text = result.text.toLowerCase();
    let assigned = false;

    // Определяем кластер на основе содержимого
    for (const [clusterName, terms] of Object.entries(SEMANTIC_CLUSTERS)) {
      if (terms.some(term => text.includes(term))) {
        if (clusters[clusterName]) {
          clusters[clusterName].push(result);
        } else {
          clusters['ДРУГОЕ'].push(result);
        }
        assigned = true;
        break;
      }
    }

    if (!assigned) {
      clusters['ДРУГОЕ'].push(result);
    }
  });

  return clusters;
}

// === КОСИНУСНОЕ СХОДСТВО (ЛОКАЛЬНАЯ РЕАЛИЗАЦИЯ) ===
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

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

  return (magnitudeA === 0 || magnitudeB === 0) ? 0 : dotProduct / (magnitudeA * magnitudeB);
}

// === ЛОКАЛЬНЫЙ ВЕКТОРНЫЙ ПОИСК ===
async function searchMemoryLocal(query, options = {}) {
  const {
    limit = SEARCH_LIMIT,
    threshold = 0.1,
    qualityFilter = true,
    clusterResults: enableClustering = false
  } = options;

  printHeader('ЛОКАЛЬНЫЙ ПОИСК (БЕЗ API)');
  console.log(colorize(`📝 Запрос: "${query}"`, 'cyan'));

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
      console.error(colorize(`❌ Ошибка подключения к БД: ${err.message}`, 'red'));
      throw err;
    }
  });

  // Семантическое расширение запроса
  const expandedTerms = expandQuerySemantics(query);
  console.log(colorize(`🔍 Расширенные термы: ${expandedTerms.slice(0, 10).join(', ')}`, 'yellow'));

  const sql = `
        SELECT id, text, source, timestamp, embedding
        FROM holographic_memory 
        WHERE LENGTH(text) > 30
        ORDER BY id
    `;

  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) {
        reject(err);
        return;
      }

      console.log(colorize(`📊 Анализ ${rows.length} записей...`, 'yellow'));

      const results = [];
      let processed = 0;
      let highQuality = 0;

      for (const row of rows) {
        try {
          // Фильтрация по качеству контента
          if (qualityFilter && !isRelevantContent(row.text, 0.1)) {
            processed++;
            continue;
          }

          // Семантический анализ
          const contentAnalysis = analyzeContentQuality(row.text);
          const semanticSim = calculateSemanticSimilarity(row.text, expandedTerms);

          // Комбинированный скор
          const combinedScore = (contentAnalysis.score * 0.4) + (semanticSim * 0.6);

          if (combinedScore > threshold) {
            results.push({
              id: row.id,
              text: row.text,
              source: row.source,
              timestamp: row.timestamp,
              contentAnalysis: contentAnalysis,
              semanticSimilarity: semanticSim,
              combinedScore: combinedScore,
              classification: classifyContent(row.text)
            });

            if (contentAnalysis.score > 0.5) highQuality++;
          }

          processed++;
          if (processed % 10000 === 0) {
            process.stdout.write(colorize(`\r📈 Обработано: ${processed}/${rows.length}`, 'cyan'));
          }
        } catch (error) {
          processed++;
          continue;
        }
      }

      console.log(colorize(`\n✅ Обработка завершена: ${results.length} релевантных результатов (${highQuality} высокого качества)`, 'green'));

      // Сортировка по комбинированному скору
      const finalResults = results
        .sort((a, b) => b.combinedScore - a.combinedScore)
        .slice(0, limit);

      db.close();
      resolve({
        results: finalResults,
        stats: {
          totalProcessed: processed,
          totalFound: results.length,
          highQualityCount: highQuality,
          clusters: enableClustering ? clusterResults(finalResults, query) : null
        }
      });
    });
  });
}

// === АНАЛИТИЧЕСКИЕ ФУНКЦИИ ===
async function generateCorpusStats() {
  printHeader('СТАТИСТИКА БАЗЫ ЗНАНИЙ ТРИА');

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    // Базовая статистика
    db.get("SELECT COUNT(*) as total FROM holographic_memory", (err, totalRow) => {
      if (err) {
        reject(err);
        return;
      }

      console.log(colorize(`🧠 Общее количество записей: ${totalRow.total.toLocaleString()}`, 'bright'));

      // Статистика по источникам
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

        printSubHeader('Топ источников по объему');
        sourceRows.forEach((row, index) => {
          const percentage = ((row.count / totalRow.total) * 100).toFixed(1);
          const bar = '█'.repeat(Math.round(percentage / 2));
          const filename = path.basename(row.source);
          console.log(`${colorize((index + 1).toString().padStart(2), 'yellow')}. ${filename}`);
          console.log(`    ${colorize(bar, 'green')} ${row.count.toLocaleString()} (${percentage}%)`);
        });

        // Анализ качества контента
        db.all(`
                    SELECT text, source
                    FROM holographic_memory 
                    ORDER BY RANDOM()
                    LIMIT 1000
                `, (err, sampleRows) => {
          if (err) {
            console.log(colorize('⚠️ Анализ качества недоступен', 'yellow'));
          } else {
            printSubHeader('Анализ качества контента (выборка 1000 записей)');

            const qualityStats = {
              HIGH_QUALITY: 0,
              MEDIUM_QUALITY: 0,
              LOW_QUALITY: 0,
              NOISE: 0
            };

            sampleRows.forEach(row => {
              const classification = classifyContent(row.text);
              qualityStats[classification]++;
            });

            Object.entries(qualityStats).forEach(([quality, count]) => {
              const percentage = ((count / sampleRows.length) * 100).toFixed(1);
              const bar = '█'.repeat(Math.round(percentage / 2));
              console.log(`${colorize(quality.padEnd(15), 'cyan')}: ${colorize(bar, 'blue')} ${count} (${percentage}%)`);
            });
          }

          db.close();
          resolve();
        });
      });
    });
  });
}

async function generateSemanticMap(query) {
  printHeader(`СЕМАНТИЧЕСКАЯ КАРТА: "${query}"`);

  const searchResult = await searchMemoryLocal(query, {
    limit: 50,
    clusterResults: true
  });

  if (searchResult.stats.clusters) {
    printSubHeader('Кластеризация результатов');

    Object.entries(searchResult.stats.clusters).forEach(([cluster, results]) => {
      if (results.length > 0) {
        console.log(colorize(`📂 ${cluster}: ${results.length} результатов`, 'magenta'));
        results.slice(0, 3).forEach(result => {
          const score = result.combinedScore.toFixed(3);
          const filename = path.basename(result.source);
          console.log(`   ${colorize(score, 'yellow')} - ${filename}`);
        });
        if (results.length > 3) {
          console.log(colorize(`   ... и еще ${results.length - 3} результатов`, 'cyan'));
        }
        console.log('');
      }
    });
  }

  return searchResult;
}

async function findSimilarConcepts(query) {
  printHeader(`ПОИСК ПОХОЖИХ КОНЦЕПЦИЙ: "${query}"`);

  const expandedTerms = expandQuerySemantics(query);
  console.log(colorize(`🔗 Связанные термы: ${expandedTerms.join(', ')}`, 'cyan'));

  // Поиск по каждому связанному терму
  const conceptResults = {};

  for (const term of expandedTerms.slice(0, 5)) {
    try {
      const result = await searchMemoryLocal(term, { limit: 5, qualityFilter: true });
      if (result.results.length > 0) {
        conceptResults[term] = result.results.length;
      }
    } catch (error) {
      continue;
    }
  }

  printSubHeader('Частота концепций в базе знаний');
  const sortedConcepts = Object.entries(conceptResults)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  sortedConcepts.forEach(([concept, count]) => {
    const bar = '█'.repeat(Math.round(count / 2));
    console.log(`${colorize(concept.padEnd(20), 'yellow')}: ${colorize(bar, 'green')} ${count}`);
  });

  return conceptResults;
}

// === ОТОБРАЖЕНИЕ РЕЗУЛЬТАТОВ ===
function displayResults(searchResult, query, options = {}) {
  const {
    showAnalysis = false,
    showClusters = false,
    maxResults = SEARCH_LIMIT
  } = options;

  const { results, stats } = searchResult;

  if (results.length === 0) {
    console.log(colorize('❌ Локальных результатов не найдено', 'yellow'));
    return;
  }

  console.log(colorize(`✅ Найдено ${results.length} локальных результатов`, 'green'));

  if (showAnalysis) {
    printSubHeader('Статистика поиска');
    console.log(`📊 Обработано записей: ${stats.totalProcessed.toLocaleString()}`);
    console.log(`🎯 Релевантных найдено: ${stats.totalFound}`);
    console.log(`⭐ Высокого качества: ${stats.highQualityCount}`);
    console.log('');
  }

  // Группировка по качеству
  const qualityGroups = {
    HIGH_QUALITY: results.filter(r => r.classification === 'HIGH_QUALITY'),
    MEDIUM_QUALITY: results.filter(r => r.classification === 'MEDIUM_QUALITY'),
    LOW_QUALITY: results.filter(r => r.classification === 'LOW_QUALITY')
  };

  Object.entries(qualityGroups).forEach(([quality, groupResults]) => {
    if (groupResults.length === 0) return;

    const qualityColor = quality === 'HIGH_QUALITY' ? 'green' :
      quality === 'MEDIUM_QUALITY' ? 'yellow' : 'cyan';

    console.log(colorize(`\n📁 ${quality} (${groupResults.length} результатов):`, qualityColor));

    groupResults.slice(0, maxResults).forEach((result, index) => {
      const score = result.combinedScore.toFixed(3);
      const filename = path.basename(result.source);

      console.log(colorize(`[${index + 1}] ID: ${result.id}`, 'cyan'));
      console.log(colorize(`📁 Источник: ${filename}`, 'white'));
      console.log(colorize(`📊 Скор: ${score} | Семантика: ${result.semanticSimilarity.toFixed(3)}`, 'magenta'));

      if (showAnalysis && result.contentAnalysis.patterns.length > 0) {
        const patterns = result.contentAnalysis.patterns
          .map(p => p.description)
          .slice(0, 3)
          .join(', ');
        console.log(colorize(`🏷️ Паттерны: ${patterns}`, 'yellow'));
      }

      // Подсветка ключевых терминов
      let displayText = result.text.substring(0, 400);
      if (result.text.length > 400) displayText += '...';

      // Простая подсветка
      const queryTerms = query.split(/\s+/);
      queryTerms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        displayText = displayText.replace(regex, colorize('$1', 'green'));
      });

      console.log(colorize(`📝 ${displayText}`, 'white'));
      console.log(colorize('─'.repeat(80), 'blue'));
      console.log('');
    });
  });

  if (showClusters && stats.clusters) {
    printSubHeader('Кластеризация результатов');
    Object.entries(stats.clusters).forEach(([cluster, clusterResults]) => {
      if (clusterResults.length > 0) {
        console.log(colorize(`📂 ${cluster}: ${clusterResults.length} результатов`, 'magenta'));
      }
    });
  }
}

// === ОСНОВНАЯ ФУНКЦИЯ ПОИСКА ===
async function searchMemory(query, options = {}) {
  if (!query || query.trim().length === 0) {
    console.error(colorize('Использование: node search_memory.js "ваш запрос"', 'red'));
    process.exit(1);
  }

  try {
    const searchResult = await searchMemoryLocal(query, options);
    displayResults(searchResult, query, options);
    return searchResult;
  } catch (error) {
    console.error(colorize(`❌ Ошибка поиска: ${error.message}`, 'red'));
    console.error(colorize(`Стек: ${error.stack}`, 'red'));
    process.exit(1);
  }
}

// === CLI ИНТЕРФЕЙС ===
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(colorize('Tria Analytics Engine 1.6 - Полностью Локальная Версия', 'bright'));
    console.log(colorize('Использование:', 'cyan'));
    console.log('  node search_memory.js "запрос"           # Локальный поиск');
    console.log('  node search_memory.js --stats            # Статистика базы');
    console.log('  node search_memory.js --map "запрос"     # Семантическая карта');
    console.log('  node search_memory.js --concepts "запрос" # Похожие концепции');
    console.log('  node search_memory.js --analysis "запрос" # Детальный анализ');
    return;
  }

  const command = args[0];

  switch (command) {
    case '--stats':
      await generateCorpusStats();
      break;

    case '--map':
      if (args[1]) {
        await generateSemanticMap(args.slice(1).join(' '));
      } else {
        console.error(colorize('Требуется запрос для семантической карты', 'red'));
      }
      break;

    case '--concepts':
      if (args[1]) {
        await findSimilarConcepts(args.slice(1).join(' '));
      } else {
        console.error(colorize('Требуется запрос для поиска концепций', 'red'));
      }
      break;

    case '--analysis':
      if (args[1]) {
        const query = args.slice(1).join(' ');
        await searchMemory(query, {
          showAnalysis: true,
          showClusters: true,
          qualityFilter: true
        });
      } else {
        console.error(colorize('Требуется запрос для анализа', 'red'));
      }
      break;

    default:
      const query = args.join(' ');
      await searchMemory(query, { qualityFilter: true });
      break;
  }
}

// === ЭКСПОРТ И ВЫПОЛНЕНИЕ ===
if (require.main === module) {
  main().catch(error => {
    console.error(colorize(`💥 Критическая ошибка: ${error.message}`, 'red'));
    process.exit(1);
  });
}

module.exports = {
  searchMemory,
  generateCorpusStats,
  generateSemanticMap,
  findSimilarConcepts
};
