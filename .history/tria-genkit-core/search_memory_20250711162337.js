// tria-genkit-core/search_memory.js - ПОЛНОСТЬЮ ЛОКАЛЬНАЯ ВЕРСИЯ
const sqlite3 = require('sqlite3');
const path = require('path');

const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');

// === ПОЛНОСТЬЮ ЛОКАЛЬНЫЙ ПОИСК БЕЗ API ===
async function searchMemoryLocal(query, options = {}) {
  const { limit = 15 } = options;

  console.log(`🔍 === ЛОКАЛЬНЫЙ ПОИСК (БЕЗ API) ===`);
  console.log(`📝 Запрос: "${query}"`);

  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READONLY);

  return new Promise((resolve, reject) => {
    // Простой LIKE поиск без внешних зависимостей
    const sql = `
            SELECT 
                id, text, source, timestamp
            FROM holographic_memory 
            WHERE (
                text LIKE ? OR 
                text LIKE ? OR 
                text LIKE ? OR
                source LIKE ?
            )
            AND LENGTH(text) > 50
            ORDER BY 
                CASE 
                    WHEN text LIKE ? THEN 1
                    WHEN text LIKE ? THEN 2
                    ELSE 3
                END,
                LENGTH(text) DESC
            LIMIT ?
        `;

    const terms = query.split(/\s+/);
    const searchPatterns = terms.map(term => `%${term}%`);
    const exactPattern = `%${query}%`;

    const params = [
      exactPattern,                    // Точное совпадение фразы
      searchPatterns[0] || exactPattern,  // Первое слово
      searchPatterns[1] || exactPattern,  // Второе слово  
      exactPattern,                    // В источнике
      exactPattern,                    // Для сортировки - точное
      searchPatterns[0] || exactPattern,  // Для сортировки - частичное
      limit
    ];

    db.all(sql, params, (err, rows) => {
      db.close();

      if (err) {
        reject(err);
        return;
      }

      // Фильтрация мусора
      const filteredRows = rows.filter(row => {
        const text = row.text.toLowerCase();
        return !text.includes('<path d=') &&
          !text.includes('info:') &&
          !text.includes('404 not found') &&
          !text.includes('http/1.1');
      });

      console.log(`✅ Найдено ${filteredRows.length} локальных результатов`);

      filteredRows.forEach((row, index) => {
        console.log(`\n[${index + 1}] ID: ${row.id}`);
        console.log(`📁 Источник: ${row.source}`);
        console.log(`📝 ${row.text.substring(0, 300)}...`);
        console.log('─'.repeat(60));
      });

      resolve(filteredRows);
    });
  });
}

// === ВХОД В СКРИПТ ===
const args = process.argv.slice(2);
const searchQuery = args.join(' ');

if (!searchQuery) {
  console.error('Использование: node search_memory.js "ваш запрос"');
  process.exit(1);
}

searchMemoryLocal(searchQuery).catch(console.error);
