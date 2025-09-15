const sqlite3 = require('sqlite3').verbose();
const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter');

// --- КОНФИГУРАЦИЯ ---
const API_KEY = 'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g'; // Ваш подтвержденный валидный API ключ
const INPUT_DIR = path.resolve(__dirname, '../GoogleAIStudio'); // Путь к директории с исходными текстовыми файлами
const DB_PATH = path.resolve(__dirname, '../frontend/public/data', 'holographic_memory.db'); // Путь к базе данных
const EMBEDDING_MODEL = 'models/embedding-001'; // Корректное имя модели для v1 API
const API_VERSION = 'v1';
const EMBEDDING_DIMENSIONALITY = 768; // Корректная размерность для models/embedding-001
const CHUNK_SIZE = 1000; // Размер чанка
const CHUNK_OVERLAP = 200; // Перекрытие между чанками
const BATCH_SIZE = 10; // Количество чанков для обработки за один API-вызов

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---

// Продвинутая функция извлечения тегов (заглушка, будет доработана Perplexity)
function extractAdvancedTags(text) {
  const tags = new Set();
  // Базовый пример, заменить на продвинутую логику Perplexity
  if (text.toLowerCase().includes('tria')) tags.add('tria');
  if (text.toLowerCase().includes('hologram')) tags.add('hologram');
  if (text.toLowerCase().includes('gesture')) tags.add('gesture');
  if (text.toLowerCase().includes('api')) tags.add('api');
  return Array.from(tags);
}

// Функция для получения соединения с базой данных
async function getDb() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve(db);
    });
  });
}

// Функция для инициализации схемы базы данных
async function initializeDb(db) {
  await db.run('DROP TABLE IF EXISTS holographic_memory;');
  await db.run('DROP TABLE IF EXISTS memory_fts;');
  await db.run(`
    CREATE TABLE IF NOT EXISTS holographic_memory (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      embedding BLOB,
      source TEXT NOT NULL,
      chunkIndex INTEGER,
      timestamp INTEGER,
      model TEXT,
      agent_context TEXT,
      semantic_tags TEXT,
      holographic_metadata TEXT
    );
  `);
  await db.run(`
    CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
      text,
      source,
      semantic_tags,
      content='holographic_memory',
      content_rowid='id'
    );
  `);
  // Триггеры для синхронизации FTS5
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS holographic_memory_ai AFTER INSERT ON holographic_memory BEGIN
      INSERT INTO memory_fts(rowid, text, source, semantic_tags) VALUES (new.id, new.text, new.source, new.semantic_tags);
    END;
  `);
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS holographic_memory_ad AFTER DELETE ON holographic_memory BEGIN
      INSERT INTO memory_fts(memory_fts, rowid, text, source, semantic_tags) VALUES('delete', old.id, old.text, old.source, old.semantic_tags);
    END;
  `);
  await db.run(`
    CREATE TRIGGER IF NOT EXISTS holographic_memory_au AFTER UPDATE ON holographic_memory BEGIN
      INSERT INTO memory_fts(memory_fts, rowid, text, source, semantic_tags) VALUES('delete', old.id, old.text, old.source, old.semantic_tags);
      INSERT INTO memory_fts(rowid, text, source, semantic_tags) VALUES (new.id, new.text, new.source, new.semantic_tags);
    END;
  `);
  console.log('✅ Схема базы данных инициализирована.');
}

// Функция для вставки эмбеддингов в базу данных
async function insertEmbedding(db, data) {
  const stmt = await db.prepare(`
    INSERT INTO holographic_memory (text, embedding, source, chunkIndex, timestamp, model, agent_context, semantic_tags, holographic_metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  await stmt.run(
    data.text,
    Buffer.from(new Float32Array(data.embedding).buffer), // Хранить как BLOB
    data.source,
    data.chunkIndex,
    data.timestamp,
    data.model,
    JSON.stringify(data.agentContext),
    JSON.stringify(data.semanticTags),
    JSON.stringify(data.holographicMetadata)
  );
  await stmt.finalize();
}

// --- ОСНОВНАЯ ЛОГИКА ГЕНЕРАЦИИ ЭМБЕДДИНГОВ ---
async function regenerateEmbeddings() {
  const db = await getDb();
  await initializeDb(db);

  const genAI = new GoogleGenerativeAI(API_KEY, { apiVersion: API_VERSION });
  const model = genAI.getGenerativeModel({
    model: EMBEDDING_MODEL,
    apiVersion: API_VERSION
  });

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  const files = await fs.readdir(INPUT_DIR);
  const textFiles = files.filter(file => file.endsWith('.txt') || file.endsWith('.md'));

  let totalChunksProcessed = 0;
  let totalFilesProcessed = 0;

  for (const fileName of textFiles) {
    const filePath = path.join(INPUT_DIR, fileName);
    console.log(`\n🔄 Обработка файла: ${filePath}`);

    let fileContent;
    try {
      fileContent = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error(`❌ Ошибка чтения файла ${filePath}:`, error.message);
      continue;
    }

    const chunks = await textSplitter.splitText(fileContent);
    console.log(`   Найдено ${chunks.length} чанков.`);

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const textsToEmbed = batch.map(chunk => chunk);

      try {
        console.log(`   🔮 Создание эмбеддингов для пакета ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(chunks.length / BATCH_SIZE)}...`);
        const result = await model.embedContent({ parts: textsToEmbed.map(text => ({ text })) });
        const embeddings = result.embedding.values; // Это будет плоский массив всех эмбеддингов

        // Предполагается, что result.embedding.values - это плоский массив всех эмбеддингов для пакета
        // И каждый эмбеддинг имеет размерность EMBEDDING_DIMENSIONALITY
        for (let j = 0; j < batch.length; j++) {
          const chunk = batch[j];
          const embeddingValues = embeddings.slice(j * EMBEDDING_DIMENSIONALITY, (j + 1) * EMBEDDING_DIMENSIONALITY);

          const enrichedEmbedding = {
            text: chunk,
            embedding: embeddingValues,
            source: filePath,
            chunkIndex: i + j,
            timestamp: Math.floor(new Date().getTime() / 1000), // Текущая временная метка
            model: EMBEDDING_MODEL,
            agentContext: {
              memoryType: 'historical_dialogue',
              synthesisRelevance: Math.min(1.0, chunk.length / 500), // Базовая релевантность
              topologyWeight: 1.0,
            },
            semanticTags: extractAdvancedTags(chunk), // Использовать продвинутый экстрактор тегов
            holographicMetadata: {
              visualizable: chunk.toLowerCase().includes('scene') || chunk.toLowerCase().includes('3d'),
              audioRelevant: chunk.toLowerCase().includes('audio') || chunk.toLowerCase().includes('sound'),
              spatialContext: null, // Заглушка
            },
          };
          await insertEmbedding(db, enrichedEmbedding);
          totalChunksProcessed++;
        }
        console.log(`   ✅ Пакет обработан. Всего чанков: ${totalChunksProcessed}`);

      } catch (error) {
        console.error(`❌ Ошибка создания эмбеддингов для пакета (файл: ${fileName}, пакет: ${Math.floor(i / BATCH_SIZE) + 1}):`, error.message);
        // Реализовать логику повторных попыток, если необходимо, или пропустить пакет
        console.warn('   Пропуск текущего пакета из-за ошибки.');
      }
    }
    totalFilesProcessed++;
    console.log(`✅ Файл ${fileName} обработан. Всего файлов: ${totalFilesProcessed}`);
  }

  db.close();
  console.log(`\n🎉 Перегенерация эмбеддингов завершена. Всего обработано файлов: ${totalFilesProcessed}, всего эмбеддингов: ${totalChunksProcessed}`);
}

regenerateEmbeddings().catch(console.error);