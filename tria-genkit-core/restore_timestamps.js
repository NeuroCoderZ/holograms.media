const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.resolve(__dirname, '..', 'frontend', 'public', 'data', 'holographic_memory.db');

async function restoreTimestamps() {
  const db = new sqlite3.Database(DB_PATH);
  const records = await new Promise((resolve, reject) => {
  db.all('SELECT id, source, text FROM holographic_memory ORDER BY id', (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});
  const update = db.prepare(
    'UPDATE holographic_memory SET timestamp = ? WHERE id = ?'
  );

  for (const rec of records) {
    let ts = extractDateFromFilename(rec.source)
          || await extractDateFromStats(rec.source)
          || extractDateFromContent(rec.text)
          || estimateDateById(rec.id, records.length);
    if (ts) update.run(ts, rec.id);
  }

  update.finalize();
  db.close();
  console.log('✅ Восстановление временных меток завершено');
}

// Примеры helper-функций:
function extractDateFromFilename(src) {
  const m = src.match(/(\d{4}-\d{2}-\d{2})/);
  return m ? Date.parse(m[1])/1000 : null;
}
async function extractDateFromStats(src) {
  try {
    return (await fs.stat(src)).mtime.getTime()/1000;
  } catch { return null; }
}
function extractDateFromContent(text) {
  const m = text.match(/\d{2}\.\d{2}\.\d{4}/);
  return m ? Date.parse(m[0].split('.').reverse().join('-'))/1000 : null;
}
function estimateDateById(id, total) {
  const start = Date.parse('2024-01-01')/1000;
  const end = Date.parse('2025-07-10')/1000;
  return Math.floor(start + (end - start) * (id/total));
}

restoreTimestamps();