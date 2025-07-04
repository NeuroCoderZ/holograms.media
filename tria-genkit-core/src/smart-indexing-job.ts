// tria-genkit-core/src/smart-indexing-job.ts
import * as path from 'path';
import * as fs from 'fs/promises';
import { genkit } from 'genkit';
import { googleAI, textEmbedding004 } from '@genkit-ai/googleai';
import postgres from 'postgres';
import pgvector from 'pgvector';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { glob } from 'glob';
import crypto from 'crypto';

const ai = genkit({
  plugins: [googleAI()],
});

const sql = postgres(process.env.DATABASE_URL!);

interface ProcessingReport {
  processedFiles: string[];
  newEmbeddings: number;
  updatedEmbeddings: number;
  skippedFiles: string[];
  errors: string[];
  startTime: string;
  endTime: string;
  totalTime: string;
}

async function runSmartIndexing() {
  console.log('🧠 Запуск умной индексации векторов...');
  
  const report: ProcessingReport = {
    processedFiles: [],
    newEmbeddings: 0,
    updatedEmbeddings: 0,
    skippedFiles: [],
    errors: [],
    startTime: new Date().toISOString(),
    endTime: '',
    totalTime: ''
  };

  const startTime = Date.now();
  
  try {
    // Создание таблиц
    await initializeDatabase();
    
    // Получение списка файлов для обработки
    const filesToProcess = await getFilesToProcess();
    console.log(`📁 Найдено файлов для обработки: ${filesToProcess.length}`);
    
    const batchSize = parseInt(process.env.BATCH_SIZE || '10');
    
    // Обработка файлов батчами
    for (let i = 0; i < filesToProcess.length; i += batchSize) {
      const batch = filesToProcess.slice(i, i + batchSize);
      console.log(`📦 Обработка batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(filesToProcess.length/batchSize)}`);
      
      await Promise.all(batch.map(async (filePath) => {
        try {
          const result = await processFile(filePath);
          report.processedFiles.push(filePath);
          report.newEmbeddings += result.newChunks;
          report.updatedEmbeddings += result.updatedChunks;
        } catch (error) {
          console.error(`❌ Ошибка при обработке ${filePath}:`, error);
          report.errors.push(`${filePath}: ${error.message}`);
        }
      }));
      
      // Пауза между батчами
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    report.endTime = new Date().toISOString();
    report.totalTime = `${Math.round((Date.now() - startTime) / 1000)}s`;
    
    // Сохранение отчета
    await saveReport(report);
    
    console.log('🎉 Умная индексация завершена!');
    console.log(`📊 Статистика: ${report.newEmbeddings} новых, ${report.updatedEmbeddings} обновленных эмбеддингов`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }
}

async function initializeDatabase() {
  console.log('🗄️ Инициализация базы данных...');
  
  await sql`CREATE EXTENSION IF NOT EXISTS vector`;
  
  // Основная таблица эмбеддингов
  await sql`
    CREATE TABLE IF NOT EXISTS holograms_media_embeddings (
      id SERIAL PRIMARY KEY,
      file_path TEXT NOT NULL,
      chunk_hash TEXT NOT NULL,
      content TEXT NOT NULL,
      embedding VECTOR(768),
      metadata JSONB,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(file_path, chunk_hash)
    );
  `;
  
  // Таблица метаданных файлов
  await sql`
    CREATE TABLE IF NOT EXISTS file_metadata (
      file_path TEXT PRIMARY KEY,
      file_hash TEXT NOT NULL,
      last_modified TIMESTAMP NOT NULL,
      chunk_count INTEGER DEFAULT 0,
      processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  
  // Индексы для быстрого поиска
  await sql`CREATE INDEX IF NOT EXISTS idx_embeddings_file_path ON holograms_media_embeddings(file_path);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON holograms_media_embeddings USING ivfflat (embedding vector_cosine_ops);`;
}

async function getFilesToProcess(): Promise<string[]> {
  const changedFiles = process.env.CHANGED_FILES?.split(',').filter(f => f.trim()) || [];
  const forceRebuild = process.env.FORCE_REBUILD === 'true';
  
  let filesToProcess: string[] = [];
  
  if (changedFiles.length > 0 && !forceRebuild) {
    // Обрабатываем только измененные файлы
    filesToProcess = changedFiles.filter(f => f.match(/\.(md|js|py|txt|json)$/));
    console.log('📝 Режим инкрементального обновления');
  } else {
    // Сканируем все файлы в указанных директориях
    const patterns = [
      'data/**/*.{md,txt,json}',
      'frontend/**/*.js',
      'backend/**/*.py',
      'tria-genkit-core/src/**/*.ts'
    ];
    
    for (const pattern of patterns) {
      const files = await glob(pattern, { 
        cwd: process.cwd(),
        ignore: ['node_modules/**', '.git/**', 'dist/**', 'build/**']
      });
      filesToProcess.push(...files);
    }
    
    console.log('🔄 Режим полного сканирования');
  }
  
  console.log(`📋 Файлов к обработке: ${filesToProcess.length}`);
  return filesToProcess;
}

async function processFile(filePath: string) {
  const absolutePath = path.resolve(filePath);
  
  // Проверяем существование файла
  const stats = await fs.stat(absolutePath);
  const content = await fs.readFile(absolutePath, 'utf-8');
  
  // Вычисляем хеш файла
  const fileHash = crypto.createHash('md5').update(content).digest('hex');
  
  // Проверяем, изменился ли файл
  const existingFile = await sql`
    SELECT file_hash, processed_at FROM file_metadata 
    WHERE file_path = ${filePath}
  `;
  
  const forceRebuild = process.env.FORCE_REBUILD === 'true';
  
  if (existingFile.length > 0 && existingFile[0].file_hash === fileHash && !forceRebuild) {
    console.log(`⏭️ Пропускаем ${filePath} (не изменился)`);
    return { newChunks: 0, updatedChunks: 0 };
  }
  
  console.log(`🔄 Обрабатываем ${filePath}...`);
  
  // Удаляем старые эмбеддинги для этого файла
  await sql`DELETE FROM holograms_media_embeddings WHERE file_path = ${filePath}`;
  
  // Создаем чанки
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });
  
  const chunks = await splitter.splitText(content);
  console.log(`📄 ${filePath}: создано ${chunks.length} чанков`);
  
  let processedChunks = 0;
  
  // Обрабатываем чанки
  for (const [index, chunk] of chunks.entries()) {
    if (chunk.trim().length === 0) continue;
    
    const chunkHash = crypto.createHash('md5')
      .update(`${filePath}:${index}:${chunk}`)
      .digest('hex');
    
    // Генерируем эмбеддинг
    const embeddingResponse = await ai.embed({
      embedder: textEmbedding004,
      content: chunk,
    });
    
    const embedding = Array.isArray(embeddingResponse) 
      ? embeddingResponse[0].embedding 
      : embeddingResponse.embedding;
    
    const formattedEmbedding = pgvector.toSql(embedding);
    
    // Метаданные
    const metadata = {
      file_path: filePath,
      chunk_index: index,
      chunk_size: chunk.length,
      file_type: path.extname(filePath),
      processed_at: new Date().toISOString()
    };
    
    // Сохраняем в базу
    await sql`
      INSERT INTO holograms_media_embeddings 
      (file_path, chunk_hash, content, embedding, metadata)
      VALUES (${filePath}, ${chunkHash}, ${chunk}, ${formattedEmbedding}, ${metadata})
      ON CONFLICT (file_path, chunk_hash) 
      DO UPDATE SET 
        content = EXCLUDED.content,
        embedding = EXCLUDED.embedding,
        metadata = EXCLUDED.metadata,
        updated_at = CURRENT_TIMESTAMP
    `;
    
    processedChunks++;
  }
  
  // Обновляем метаданные файла
  await sql`
    INSERT INTO file_metadata (file_path, file_hash, last_modified, chunk_count)
    VALUES (${filePath}, ${fileHash}, ${stats.mtime}, ${processedChunks})
    ON CONFLICT (file_path)
    DO UPDATE SET 
      file_hash = EXCLUDED.file_hash,
      last_modified = EXCLUDED.last_modified,
      chunk_count = EXCLUDED.chunk_count,
      processed_at = CURRENT_TIMESTAMP
  `;
  
  console.log(`✅ ${filePath}: обработано ${processedChunks} чанков`);
  return { newChunks: processedChunks, updatedChunks: 0 };
}

async function saveReport(report: ProcessingReport) {
  const reportPath = path.resolve('embedding-report.json');
  const logPath = path.resolve('processing-log.txt');
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  
  const logContent = [
    `=== EMBEDDING PIPELINE REPORT ===`,
    `Start Time: ${report.startTime}`,
    `End Time: ${report.endTime}`,
    `Total Time: ${report.totalTime}`,
    ``,
    `📊 STATISTICS:`,
    `- Processed Files: ${report.processedFiles.length}`,
    `- New Embeddings: ${report.newEmbeddings}`,
    `- Updated Embeddings: ${report.updatedEmbeddings}`,
    `- Skipped Files: ${report.skippedFiles.length}`,
    `- Errors: ${report.errors.length}`,
    ``,
    `📁 PROCESSED FILES:`,
    ...report.processedFiles.map(f => `✅ ${f}`),
    ``,
    `⚠️ ERRORS:`,
    ...report.errors.map(e => `❌ ${e}`),
  ].join('\n');
  
  await fs.writeFile(logPath, logContent);
  
  console.log(`📋 Отчет сохранен: ${reportPath}`);
}

// Запуск
runSmartIndexing()
  .then(() => {
    console.log('✅ Умная индексация завершена успешно');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
