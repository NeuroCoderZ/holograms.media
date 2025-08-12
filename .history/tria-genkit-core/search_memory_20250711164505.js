// tria-genkit-core/search_memory.js - TRIA ANALYTICS ENGINE v1.7
// Критические исправления: фильтрация качества, нормализация скоров, пакетная обработка
const sqlite3 = require('sqlite3');
const path = require('path');

// === CONFIGURATION ===
const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');
const SEARCH_LIMIT = 15;
const ANALYTICS_BATCH_SIZE = 2500; // Реальная пакетная обработка
const DEBUG_MODE = true; // Включение отладочных логов

// === SEMANTIC EXPANSION ===
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

// === ENHANCED CONTENT QUALITY ANALYSIS ===
const BLACKLIST_PATTERNS = {
  // КРИТИЧЕСКИ важные паттерны для немедленной дисквалификации
  ABSOLUTE_NOISE: [
    /^INFO:\s+\d+\.\d+\.\d+\.\d+:\d+/,           // Серверные логи
    /^ERROR:\s+\d+\.\d+\.\d+\.\d+:\d+/,          // Ошибки сервера
    /HTTP\/1\.[01]\s+(200|404|500|302)/,         // HTTP статусы
    /GET\s+\/static\/[^\s]+\s+HTTP/,             // Статические запросы
    /POST\s+\/api\/[^\s]+\s+HTTP/,               // API запросы
    /^\s*#!/,                                     // Shebang строки
    /^\s*#.*gitignore/i,                         // .gitignore содержимое
    /^at\s+[^\s]+\s+\([^)]+:\d+:\d+\)/,         // Stack traces
    /^\s*at\s+Object\.<anonymous>/,              // JS stack traces
    /^Traceback\s+\(most\s+recent\s+call/,      // Python трейсы
    /uvicorn\.run|FastAPI|Starlette/i,           // Фреймворк логи
    /^\s*\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}/,     // Timestamp логи
    /^\[.*\]\s+\d{4}-\d{2}-\d{2}/,              // Bracketed timestamps
    /console\.(log|error|warn|info)/,            // Console методы
    /<svg[^>]*>.*<\/svg>/is,                     // SVG разметка
    /<path\s+d="[^"]*"/,                         // SVG пути
    /viewBox="[^"]*"/,                           // SVG viewBox
    /xmlns="[^"]*"/,                             // XML namespaces
    /fill="#[a-f0-9]{6}"/i,                      // Hex цвета
    /^\s*[{}()\[\];,]+\s*$/,                     // Только символы
    /^[a-f0-9\s\-\.]{40,}$/i,                    // Хеши и ID
  ],

  // Подозрительные паттерны (сильный штраф, но не дисквалификация)
  SUSPICIOUS_NOISE: [
    /node_modules|package\.json|yarn\.lock/i,    // Зависимости
    /\.git\/|\.vscode\/|\.idea\//,               // Служебные папки
    /webpack|vite|rollup|babel/i,                // Bundlers
    /^\s*import\s+.*from\s+['"][^'"]+['"];?\s*$/, // Простые импорты
    /^\s*const\s+\w+\s*=\s*require\(/,          // Простые require
    /^\s*module\.exports\s*=/,                   // Module exports
    /^\s*export\s+(default\s+)?/,                // ES6 exports
  ]
};

const QUALITY_PATTERNS = {
  // Высококачественный контент (положительные веса)
  DOCUMENTATION: { pattern: /README|документация|руководство|guide|tutorial/i, weight: 0.8 },
  CONVERSATION: { pattern: /(пользователь|ассистент|user|assistant):/i, weight: 0.7 },
  TECHNICAL_EXPLANATION: { pattern: /(объяснение|explanation|как\s+работает|how\s+it\s+works)/i, weight: 0.6 },
  CODE_LOGIC: { pattern: /(function\s+\w+|class\s+\w+|алгоритм|algorithm)/i, weight: 0.5 },

  // Специализированный контент проекта
  HOLOGRAM_TECH: { pattern: /(hologram|голограмм|three\.js|webgl|3d)/i, weight: 0.9 },
  GESTURE_TECH: { pattern: /(gesture|жест|MediaPipe|tracking|распознавание)/i, weight: 0.8 },
  AUDIO_TECH: { pattern: /(audio|аудио|wavelet|CWT|frequency|микрофон)/i, weight: 0.7 },
  INITIALIZATION: { pattern: /(init|инициализ|setup|настройка|configure)/i, weight: 0.6 },

  // Средне-качественный контент
  CONFIG_MEANINGFUL: { pattern: /(configuration|конфигурация|settings|параметры)/i, weight: 0.3 },
  ERROR_CONTEXT: { pattern: /(ошибка.*решение|error.*solution|fix|исправление)/i, weight: 0.4 },
};

function debugLog(message, data = null) {
  if (DEBUG_MODE) {
    console.log(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}

// === КАРДИНАЛЬНО ПЕРЕРАБОТАННАЯ ОЦЕНКА КАЧЕСТВА ===
function analyzeContentQuality(text, source = '') {
  debugLog('Analyzing content quality', { textLength: text.length, source });

  // ЭТАП 1: НЕМЕДЛЕННАЯ ДИСКВАЛИФИКАЦИЯ
  for (const pattern of BLACKLIST_PATTERNS.ABSOLUTE_NOISE) {
    if (pattern.test(text)) {
      debugLog('Content DISQUALIFIED by blacklist pattern', { pattern: pattern.toString() });
      return {
        score: 0,
        category: 'DISQUALIFIED',
        reason: `Blacklisted pattern: ${pattern.toString().substring(0, 50)}...`,
        disqualified: true
      };
    }
  }

  // ЭТАП 2: БАЗОВЫЕ ПРОВЕРКИ КАЧЕСТВА
  const length = text.length;
  const wordCount = text.split(/\s+/).filter(word => word.length > 2).length;
  const lineCount = text.split('\n').length;

  // Слишком короткий контент
  if (length < 30 || wordCount < 5) {
    return {
      score: 0,
      category: 'TOO_SHORT',
      reason: `Content too short: ${length} chars, ${wordCount} words`,
      disqualified: true
    };
  }

  // Проверка соотношения букв к символам
  const letters = text.match(/[a-zA-Zа-яА-Я]/g) || [];
  const letterRatio = letters.length / length;

  if (letterRatio < 0.3) {
    debugLog('Content failed letter ratio test', { letterRatio });
    return {
      score: 0,
      category: 'LOW_LETTER_RATIO',
      reason: `Too few letters: ${letterRatio.toFixed(2)} ratio`,
      disqualified: true
    };
  }

  // ЭТАП 3: ШТРАФЫ ЗА ПОДОЗРИТЕЛЬНЫЙ КОНТЕНТ
  let qualityScore = 0.5; // Базовый скор
  let penalties = 0;

  for (const pattern of BLACKLIST_PATTERNS.SUSPICIOUS_NOISE) {
    if (pattern.test(text)) {
      penalties += 0.3;
      debugLog('Applied penalty for suspicious pattern', { pattern: pattern.toString() });
    }
  }

  // ЭТАП 4: БОНУСЫ ЗА КАЧЕСТВЕННЫЙ КОНТЕНТ
  let bonuses = 0;
  let matchedPatterns = [];

  Object.entries(QUALITY_PATTERNS).forEach(([key, { pattern, weight }]) => {
    if (pattern.test(text)) {
      bonuses += weight;
      matchedPatterns.push(key);
      debugLog('Applied bonus for quality pattern', { pattern: key, weight });
    }
  });

  // ЭТАП 5: ДОПОЛНИТЕЛЬНЫЕ ЭВРИСТИКИ
  // Бонус за длину и структуру
  if (length > 200) bonuses += 0.1;
  if (length > 500) bonuses += 0.1;
  if (length > 1000) bonuses += 0.2;

  // Бонус за диалоговую структуру
  if (text.includes('Вопрос:') || text.includes('Ответ:') || text.includes('Q:') || text.includes('A:')) {
    bonuses += 0.3;
  }

  // Штраф за повторяющиеся строки (логи)
  const lines = text.split('\n');
  const uniqueLines = new Set(lines);
  const repetitionRatio = 1 - (uniqueLines.size / lines.length);
  if (repetitionRatio > 0.5) {
    penalties += 0.4;
    debugLog('Applied penalty for repetitive content', { repetitionRatio });
  }

  // ФИНАЛЬНЫЙ РАСЧЕТ (НОРМАЛИЗОВАН 0-1)
  qualityScore = Math.max(0, Math.min(1, qualityScore + bonuses - penalties));

  let category;
  if (qualityScore >= 0.7) category = 'HIGH_QUALITY';
  else if (qualityScore >= 0.4) category = 'MEDIUM_QUALITY';
  else category = 'LOW_QUALITY';

  const result = {
    score: qualityScore,
    category,
    bonuses,
    penalties,
    matchedPatterns,
    disqualified: false,
    metrics: {
      length,
      wordCount,
      letterRatio,
      repetitionRatio
    }
  };

  debugLog('Content quality analysis complete', result);
  return result;
}

// === УЛУЧШЕННАЯ ФИЛЬТРАЦИЯ РЕЛЕВАНТНОСТИ ===
function isRelevantContent(text, source = '', strictMode = true) {
  const quality = analyzeContentQuality(text, source);

  // Немедленная дисквалификация
  if (quality.disqualified) {
    debugLog('Content marked as irrelevant - disqualified', { reason: quality.reason });
    return false;
  }

  // Строгий режим для поиска
  const minScore = strictMode ? 0.3 : 0.1;
  const isRelevant = quality.score >= minScore;

  debugLog('Relevance check', {
    score: quality.score,
    minScore,
    isRelevant,
    category: quality.category
  });

  return isRelevant;
}

// === НОРМАЛИЗОВАННАЯ СЕМАНТИЧЕСКАЯ ПОХОЖЕСТЬ ===
function calculateSemanticSimilarity(text, query, expandedTerms = []) {
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();

  let totalScore = 0;
  let maxPossibleScore = 0;

  // Точное совпадение фразы (высший приоритет)
  if (textLower.includes(queryLower)) {
    totalScore += 1.0;
  }
  maxPossibleScore += 1.0;

  // Совпадения отдельных слов из запроса
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
  queryWords.forEach(word => {
    if (textLower.includes(word)) {
      totalScore += 0.5;
    }
    maxPossibleScore += 0.5;
  });

  // Совпадения расширенных терминов (синонимы)
  expandedTerms.forEach(term => {
    if (term.length > 2 && textLower.includes(term.toLowerCase())) {
      totalScore += 0.2;
    }
    maxPossibleScore += 0.2;
  });

  // Нормализация в диапазон 0-1
  const normalizedScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
  const finalScore = Math.max(0, Math.min(1, normalizedScore));

  debugLog('Semantic similarity calculated', {
    totalScore,
    maxPossibleScore,
    normalizedScore: finalScore
  });

  return finalScore;
}

// === УЛУЧШЕННОЕ РАСШИРЕНИЕ ЗАПРОСОВ ===
function expandQuerySemantics(query) {
  const words = query.toLowerCase().split(/\s+/);
  let expandedTerms = [...words];

  words.forEach(word => {
    if (SEMANTIC_SYNONYMS[word]) {
      expandedTerms.push(...SEMANTIC_SYNONYMS[word]);
    }
  });

  // Удаляем дубликаты и короткие слова
  expandedTerms = [...new Set(expandedTerms)].filter(term => term.length > 2);

  debugLog('Query expansion', {
    originalQuery: query,
    expandedTerms: expandedTerms.length,
    terms: expandedTerms
  });

  return expandedTerms;
}

// === ПАКЕТНАЯ ОБРАБОТКА ПОИСКА ===
async function searchMemoryLocal(query, options = {}) {
  const {
    limit = SEARCH_LIMIT,
    threshold = 0.3,
    strictFiltering = true
  } = options;

  console.log(`🔍 === ЛОКАЛЬНЫЙ ПОИСК TRIA ===`);
  console.log(`📝 Запрос: "${query}"`);
  console.log(`📊 Пакетная обработка: ${ANALYTICS_BATCH_SIZE} записей за раз`);

  const expandedTerms = expandQuerySemantics(query);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    // Сначала получаем общее количество записей
    db.get("SELECT COUNT(*) as total FROM holographic_memory", (err, countResult) => {
      if (err) {
        reject(err);
        return;
      }

      const totalRecords = countResult.total;
      console.log(`📈 Всего записей для обработки: ${totalRecords.toLocaleString()}`);

      let allResults = [];
      let processedCount = 0;
      let batchNumber = 0;
      let skippedLowQuality = 0;
      let disqualifiedCount = 0;

      // Пакетная обработка с LIMIT/OFFSET
      const processBatch = (offset) => {
        batchNumber++;
        console.log(`🔄 Обработка пакета ${batchNumber} (записи ${offset + 1}-${Math.min(offset + ANALYTICS_BATCH_SIZE, totalRecords)})`);

        const sql = `
          SELECT id, text, source, timestamp
          FROM holographic_memory
          ORDER BY id
          LIMIT ? OFFSET ?
        `;

        db.all(sql, [ANALYTICS_BATCH_SIZE, offset], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          // Обработка текущего пакета
          const batchResults = [];

          rows.forEach(row => {
            try {
              // Фильтрация качества (критически важно!)
              if (!isRelevantContent(row.text, row.source, strictFiltering)) {
                const quality = analyzeContentQuality(row.text, row.source);
                if (quality.disqualified) {
                  disqualifiedCount++;
                } else {
                  skippedLowQuality++;
                }
                return;
              }

              // Расчет семантической похожести
              const semanticSimilarity = calculateSemanticSimilarity(row.text, query, expandedTerms);

              if (semanticSimilarity >= threshold) {
                const quality = analyzeContentQuality(row.text, row.source);

                // Комбинированный скор (нормализован 0-1)
                const combinedScore = (semanticSimilarity * 0.7) + (quality.score * 0.3);

                batchResults.push({
                  id: row.id,
                  text: row.text,
                  source: row.source,
                  timestamp: row.timestamp,
                  semanticSimilarity,
                  qualityScore: quality.score,
                  combinedScore,
                  category: quality.category
                });
              }
            } catch (error) {
              debugLog('Error processing row', { id: row.id, error: error.message });
            }
          });

          allResults.push(...batchResults);
          processedCount += rows.length;

          console.log(`✅ Пакет ${batchNumber} обработан: найдено ${batchResults.length} релевантных результатов`);

          // Проверяем, есть ли еще данные
          if (rows.length < ANALYTICS_BATCH_SIZE || offset + ANALYTICS_BATCH_SIZE >= totalRecords) {
            // Обработка завершена
            console.log(`🎯 Обработка завершена:`);
            console.log(`   📊 Всего обработано: ${processedCount.toLocaleString()} записей`);
            console.log(`   ✅ Найдено релевантных: ${allResults.length}`);
            console.log(`   🚫 Дисквалифицировано: ${disqualifiedCount}`);
            console.log(`   ⚠️  Пропущено низкого качества: ${skippedLowQuality}`);

            // Финальная сортировка и ограничение
            const finalResults = allResults
              .sort((a, b) => b.combinedScore - a.combinedScore)
              .slice(0, limit);

            db.close();
            resolve(finalResults);
          } else {
            // Обрабатываем следующий пакет
            setTimeout(() => processBatch(offset + ANALYTICS_BATCH_SIZE), 10);
          }
        });
      };

      // Начинаем с первого пакета
      processBatch(0);
    });
  });
}

// === ИСПРАВЛЕННАЯ ФУНКЦИЯ АНАЛИЗА КОНЦЕПЦИЙ ===
async function findSimilarConcepts(query, options = {}) {
  const { limit = 20 } = options;

  console.log(`🧠 === АНАЛИЗ КОНЦЕПЦИЙ ===`);
  console.log(`📝 Анализируем концепции для: "${query}"`);

  const expandedTerms = expandQuerySemantics(query);
  const conceptFrequency = new Map();

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    console.log(`📊 Анализ истинной частоты терминов по всему корпусу...`);

    // Рассчитываем ИСТИННУЮ частоту каждого термина по всему корпусу
    let processedTerms = 0;

    const analyzeTermFrequency = (termIndex) => {
      if (termIndex >= expandedTerms.length) {
        // Анализ завершен
        const sortedConcepts = Array.from(conceptFrequency.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, limit);

        console.log(`✅ Анализ концепций завершен. Обработано терминов: ${expandedTerms.length}`);

        db.close();
        resolve({
          concepts: sortedConcepts,
          totalTermsAnalyzed: expandedTerms.length,
          corporaAnalyzed: true
        });
        return;
      }

      const term = expandedTerms[termIndex];

      // SQL для подсчета истинной частоты термина
      const sql = `
        SELECT COUNT(*) as frequency
        FROM holographic_memory
        WHERE LOWER(text) LIKE ?
      `;

      db.get(sql, [`%${term.toLowerCase()}%`], (err, result) => {
        if (err) {
          debugLog('Error analyzing term frequency', { term, error: err.message });
        } else {
          conceptFrequency.set(term, result.frequency);
          debugLog('Term frequency calculated', { term, frequency: result.frequency });
        }

        processedTerms++;
        console.log(`🔄 Проанализировано терминов: ${processedTerms}/${expandedTerms.length} (${term}: ${result?.frequency || 0})`);

        // Продолжаем со следующим термином
        setTimeout(() => analyzeTermFrequency(termIndex + 1), 5);
      });
    };

    // Начинаем анализ
    analyzeTermFrequency(0);
  });
}

// === УЛУЧШЕННАЯ КЛАСТЕРИЗАЦИЯ РЕЗУЛЬТАТОВ ===
function clusterResults(results) {
  const clusters = {
    'Высокое качество': { items: [], totalScore: 0 },
    'Среднее качество': { items: [], totalScore: 0 },
    'Техническая документация': { items: [], totalScore: 0 },
    'Диалоги и объяснения': { items: [], totalScore: 0 },
    'Код и реализация': { items: [], totalScore: 0 },
    'Конфигурация': { items: [], totalScore: 0 }
  };

  results.forEach(result => {
    const quality = analyzeContentQuality(result.text, result.source);

    // Определяем кластер на основе анализа качества
    let clusterName = 'Среднее качество';

    if (quality.score >= 0.7) {
      clusterName = 'Высокое качество';
    } else if (quality.matchedPatterns.includes('DOCUMENTATION')) {
      clusterName = 'Техническая документация';
    } else if (quality.matchedPatterns.includes('CONVERSATION')) {
      clusterName = 'Диалоги и объяснения';
    } else if (quality.matchedPatterns.includes('CODE_LOGIC')) {
      clusterName = 'Код и реализация';
    } else if (quality.matchedPatterns.includes('CONFIG_MEANINGFUL')) {
      clusterName = 'Конфигурация';
    }

    clusters[clusterName].items.push(result);
    clusters[clusterName].totalScore += result.combinedScore;
  });

  return clusters;
}

// === УТИЛИТЫ ОТОБРАЖЕНИЯ ===
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

function displayResults(results, query) {
  if (results.length === 0) {
    console.log(colorText('📭 Релевантные результаты не найдены', 'yellow'));
    return;
  }

  console.log(colorText(`\n🎯 Найдено ${results.length} релевантных результатов:\n`, 'bold'));

  results.forEach((result, index) => {
    const qualityColor = result.category === 'HIGH_QUALITY' ? 'green' :
      result.category === 'MEDIUM_QUALITY' ? 'yellow' : 'red';

    console.log(colorText(`[${index + 1}] ID: ${result.id}`, 'cyan'));
    console.log(colorText(`📁 Источник: ${path.basename(result.source)}`, 'white'));
    console.log(colorText(`📊 Семантическое сходство: ${result.semanticSimilarity.toFixed(3)}`, 'magenta'));
    console.log(colorText(`✨ Качество: ${result.qualityScore.toFixed(3)} (${result.category})`, qualityColor));
    console.log(colorText(`🎯 Общий скор: ${result.combinedScore.toFixed(3)}`, 'bold'));

    // Показываем первые 200 символов с подсветкой
    let displayText = result.text.substring(0, 200);
    if (result.text.length > 200) displayText += '...';

    // Простая подсветка ключевых слов
    const queryWords = query.split(/\s+/);
    queryWords.forEach(word => {
      if (word.length > 2) {
        const regex = new RegExp(`(${word})`, 'gi');
        displayText = displayText.replace(regex, colorText('$1', 'green'));
      }
    });

    console.log(colorText(displayText, 'white'));
    console.log(colorText('─'.repeat(80), 'blue'));
    console.log('');
  });
}

// === СХЕМА БАЗЫ ДАННЫХ ===
async function analyzeSchema() {
  console.log(colorText('🔧 === АНАЛИЗ СХЕМЫ БАЗЫ ДАННЫХ ===', 'bold'));

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    db.all("PRAGMA table_info(holographic_memory)", (err, columns) => {
      if (err) {
        reject(err);
        return;
      }

      console.log(colorText('\n📋 Структура таблицы holographic_memory:', 'cyan'));
      columns.forEach(col => {
        console.log(`  ${col.name}: ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.pk ? ' PRIMARY KEY' : ''}`);
      });

      // Получаем статистику
      db.get("SELECT COUNT(*) as total FROM holographic_memory", (err, stats) => {
        if (err) {
          console.log(colorText('⚠️ Не удалось получить статистику', 'yellow'));
        } else {
          console.log(colorText(`\n📊 Всего записей: ${stats.total.toLocaleString()}`, 'green'));
        }

        // Проверяем размер базы
        db.get("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()", (err, sizeInfo) => {
          if (!err && sizeInfo) {
            const sizeMB = (sizeInfo.size / 1024 / 1024).toFixed(2);
            console.log(colorText(`💾 Размер базы данных: ${sizeMB} MB`, 'cyan'));
          }

          db.close();
          resolve();
        });
      });
    });
  });
}

// === СТАТИСТИКА КОРПУСА ===
async function generateCorpusStats() {
  console.log(colorText('📊 === СТАТИСТИКА КОРПУСА TRIA ===', 'bold'));

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    // Общая статистика
    db.get("SELECT COUNT(*) as total FROM holographic_memory", (err, totalStats) => {
      if (err) {
        reject(err);
        return;
      }

      console.log(colorText(`🧠 Всего записей в памяти Tria: ${totalStats.total.toLocaleString()}`, 'bold'));

      // Пакетный анализ качества контента
      console.log(colorText('\n🔍 Анализ качества контента (пакетная обработка)...', 'cyan'));

      let qualityStats = {
        HIGH_QUALITY: 0,
        MEDIUM_QUALITY: 0,
        LOW_QUALITY: 0,
        DISQUALIFIED: 0
      };

      let processedCount = 0;

      const analyzeQualityBatch = (offset) => {
        const sql = `
          SELECT text, source
          FROM holographic_memory
          ORDER BY id
          LIMIT ? OFFSET ?
        `;

        db.all(sql, [ANALYTICS_BATCH_SIZE, offset], (err, rows) => {
          if (err) {
            reject(err);
            return;
          }

          // Анализируем качество каждой записи в пакете
          rows.forEach(row => {
            const quality = analyzeContentQuality(row.text, row.source);
            if (quality.disqualified) {
              qualityStats.DISQUALIFIED++;
            } else {
              qualityStats[quality.category]++;
            }
          });

          processedCount += rows.length;
          console.log(`🔄 Проанализировано: ${processedCount.toLocaleString()}/${totalStats.total.toLocaleString()}`);

          // Проверяем, нужно ли продолжить
          if (rows.length < ANALYTICS_BATCH_SIZE) {
            // Анализ завершен
            console.log(colorText('\n📈 Распределение качества контента:', 'bold'));

            Object.entries(qualityStats).forEach(([category, count]) => {
              const percentage = ((count / totalStats.total) * 100).toFixed(1);
              const bar = '█'.repeat(Math.round(percentage / 2));

              let color = 'white';
              if (category === 'HIGH_QUALITY') color = 'green';
              else if (category === 'MEDIUM_QUALITY') color = 'yellow';
              else if (category === 'LOW_QUALITY') color = 'magenta';
              else if (category === 'DISQUALIFIED') color = 'red';

              console.log(colorText(`${category}: ${bar} ${count.toLocaleString()} (${percentage}%)`, color));
            });

            // Статистика по источникам
            getSourceStats(db, resolve);
          } else {
            // Продолжаем со следующим пакетом
            setTimeout(() => analyzeQualityBatch(offset + ANALYTICS_BATCH_SIZE), 10);
          }
        });
      };

      analyzeQualityBatch(0);
    });
  });
}

function getSourceStats(db, resolve) {
  console.log(colorText('\n📁 Топ источников по объему:', 'bold'));

  db.all(`
    SELECT source, COUNT(*) as count
    FROM holographic_memory
    GROUP BY source
    ORDER BY count DESC
    LIMIT 15
  `, (err, sourceStats) => {
    if (err) {
      console.log(colorText('⚠️ Не удалось получить статистику источников', 'yellow'));
    } else {
      sourceStats.forEach((row, index) => {
        const filename = path.basename(row.source);
        console.log(`${index + 1}. ${filename}: ${row.count.toLocaleString()} записей`);
      });
    }

    db.close();
    resolve();
  });
}

// === ГЛАВНАЯ ФУНКЦИЯ ===
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(colorText('📖 Tria Analytics Engine v1.7 - Использование:', 'bold'));
    console.log('  node search_memory.js "запрос"           # Локальный поиск');
    console.log('  node search_memory.js --schema           # Анализ схемы БД');
    console.log('  node search_memory.js --stats            # Статистика корпуса');
    console.log('  node search_memory.js --concepts "запрос" # Анализ концепций');
    console.log('  node search_memory.js --analysis "запрос" # Полный анализ');
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case '--schema':
        await analyzeSchema();
        break;

      case '--stats':
        await generateCorpusStats();
        break;

      case '--concepts':
        if (args.length < 2) {
          console.log(colorText('❌ Укажите запрос для анализа концепций', 'red'));
          return;
        }
        const conceptQuery = args.slice(1).join(' ');
        const conceptResults = await findSimilarConcepts(conceptQuery);

        console.log(colorText('\n🎯 Результаты анализа концепций:', 'bold'));
        console.log(colorText(`📊 Проанализировано терминов: ${conceptResults.totalTermsAnalyzed}`, 'cyan'));
        console.log(colorText('🔤 Частота концепций в корпусе:', 'cyan'));

        conceptResults.concepts.slice(0, 15).forEach(([concept, frequency]) => {
          const bar = '█'.repeat(Math.min(50, Math.round(frequency / 100)));
          console.log(`${concept}: ${colorText(bar, 'green')} ${frequency.toLocaleString()}`);
        });
        break;

      case '--analysis':
        if (args.length < 2) {
          console.log(colorText('❌ Укажите запрос для полного анализа', 'red'));
          return;
        }
        const analysisQuery = args.slice(1).join(' ');

        console.log(colorText('🔬 === ПОЛНЫЙ АНАЛИЗ TRIA ===', 'bold'));

        const searchResults = await searchMemoryLocal(analysisQuery, { limit: 20 });
        displayResults(searchResults, analysisQuery);

        if (searchResults.length > 0) {
          console.log(colorText('\n📊 Кластеризация результатов:', 'bold'));
          const clusters = clusterResults(searchResults);

          Object.entries(clusters).forEach(([clusterName, cluster]) => {
            if (cluster.items.length > 0) {
              const avgScore = (cluster.totalScore / cluster.items.length).toFixed(3);
              console.log(colorText(`${clusterName}: ${cluster.items.length} результатов (ср. скор: ${avgScore})`, 'cyan'));
            }
          });
        }
        break;

      default:
        // Обычный поиск
        const query = args.join(' ');
        const results = await searchMemoryLocal(query);
        displayResults(results, query);
        break;
    }
  } catch (error) {
    console.error(colorText(`💥 Ошибка: ${error.message}`, 'red'));
    if (DEBUG_MODE) {
      console.error(colorText(`Stack trace: ${error.stack}`, 'red'));
    }
  }
}

// === ЗАПУСК ===
if (require.main === module) {
  main().catch(error => {
    console.error(colorText(`💥 КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'red'));
    process.exit(1);
  });
}

module.exports = {
  searchMemoryLocal,
  analyzeContentQuality,
  isRelevantContent,
  findSimilarConcepts,
  generateCorpusStats
};
