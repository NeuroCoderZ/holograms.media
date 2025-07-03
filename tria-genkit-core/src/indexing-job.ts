// tria-genkit-core/src/indexing-job.ts
import * as path from 'path';
import * as fs from 'fs/promises';
import { genkit, z } from 'genkit';
import { googleAI, gemini, textEmbedding004 } from '@genkit-ai/googleai';
import postgres from 'postgres';
import pgvector from 'pgvector';
import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document as LangDocument } from '@langchain/core/documents';
import { Document } from '@genkit-ai/ai/retriever';

// ✅ КОНСТАНТА: Общее количество чанков (из предыдущих запусков)
const TOTAL_CHUNKS = 130372;

// Настройка Genkit для облачного выполнения
const ai = genkit({
  plugins: [googleAI()],
});

const sql = postgres(process.env.DATABASE_URL!);

async function runCloudIndexing() {
  console.log('🚀 Запуск облачной индексации векторов...');
  console.log(`📊 Параметры: resumeFromBatch=${process.env.RESUME_FROM_BATCH}, batchSize=${process.env.BATCH_SIZE}`);
  
  const resumeFromBatch = parseInt(process.env.RESUME_FROM_BATCH || '0');
  const batchSize = parseInt(process.env.BATCH_SIZE || '5');
  
  try {
    // Создание таблицы в pgvector
    console.log('🧠 Создание таблицы в pgvector...');
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    await sql`
        CREATE TABLE IF NOT EXISTS holograms_media_embeddings (
            id SERIAL PRIMARY KEY,
            content TEXT,
            embedding VECTOR(768),
            metadata JSONB
        );
    `;
    
    // ✅ СНАЧАЛА ВСЕГДА ПРОВЕРЯЕМ СОСТОЯНИЕ БАЗЫ
    const processedCount = await sql`SELECT COUNT(*) as count FROM holograms_media_embeddings`;
    const alreadyProcessed = parseInt(processedCount[0]?.count || '0');
    const expectedForThisBatch = resumeFromBatch * batchSize;
    const correctBatch = Math.floor(alreadyProcessed / batchSize);
    
    console.log(`📊 В базе уже: ${alreadyProcessed} записей`);
    console.log(`📊 Ожидается для batch ${resumeFromBatch}: ${expectedForThisBatch} записей`);
    console.log(`📊 Правильный batch для продолжения: ${correctBatch}`);
    console.log(`📊 Всего нужно обработать: ${TOTAL_CHUNKS} чанков`);
    
    // ✅ ПРОВЕРКА 1: Вся работа уже завершена
    if (alreadyProcessed >= TOTAL_CHUNKS) {
      console.log('🎉 ВСЯ ИНДЕКСАЦИЯ УЖЕ ЗАВЕРШЕНА!');
      console.log(`📊 Итого в базе данных: ${alreadyProcessed}/${TOTAL_CHUNKS} записей`);
      process.exit(0);
    }
    
    // ✅ ПРОВЕРКА 2: Указан неправильный batch
    if (Math.abs(correctBatch - resumeFromBatch) > 10) {
      console.log(`⚠️ НЕПРАВИЛЬНЫЙ BATCH!`);
      console.log(`❌ Указан resumeFromBatch: ${resumeFromBatch}`);
      console.log(`✅ Нужен resumeFromBatch: ${correctBatch}`);
      console.log(`💡 Перезапустите workflow с правильным batch!`);
      process.exit(1);
    }
    
    // Загружаем чанки из файла (в GitHub Actions)
    const chunksPath = path.resolve(__dirname, '../chunks_cache.json');
    
    let chunks: any[] = [];
    
    if (await fs.access(chunksPath).then(() => true).catch(() => false)) {
      console.log('📂 Загрузка чанков из кэша...');
      const cachedData = await fs.readFile(chunksPath, 'utf-8');
      chunks = JSON.parse(cachedData);
      console.log(`✅ Загружено ${chunks.length} чанков из кэша`);
      
      // ✅ ОБНОВЛЯЕМ КОНСТАНТУ если кэш содержит другое количество
      if (chunks.length !== TOTAL_CHUNKS) {
        console.log(`⚠️ Количество чанков в кэше (${chunks.length}) отличается от ожидаемого (${TOTAL_CHUNKS})`);
      }
    } else {
      console.log('📂 Кэш не найден');
      
      // ✅ ПРОВЕРКА 3: Можем ли продолжить без кэша
      if (alreadyProcessed < expectedForThisBatch) {
        console.log('❌ Данных в базе меньше чем должно быть. Нужен кэш файл.');
        console.log('💡 Запустите workflow с параметром uploadChunksCache: true');
        process.exit(1);
      }
      
      // ✅ ПРОВЕРКА 4: Если данных достаточно, но нет кэша - создаем фиктивный массив
      console.log('✅ Данных в базе достаточно, создаем фиктивный массив чанков...');
      chunks = new Array(TOTAL_CHUNKS).fill({ pageContent: '', metadata: {} });
      console.log(`✅ Создан фиктивный массив из ${chunks.length} элементов`);
    }
    
    const genkitDocs = chunks.map(c => Document.fromText(c.pageContent || '', c.metadata || {}));
    
    const totalBatches = Math.ceil(genkitDocs.length / batchSize);
    console.log(`📊 Всего пакетов: ${totalBatches}, начинаем с ${resumeFromBatch}`);
    console.log(`📊 Прогресс: ${alreadyProcessed}/${genkitDocs.length} (${(alreadyProcessed/genkitDocs.length*100).toFixed(1)}%)`);
    
    let processedBatches = 0;
    
    for (let i = resumeFromBatch * batchSize; i < genkitDocs.length; i += batchSize) {
      const batchDocs = genkitDocs.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`📦 Пакет ${batchNumber}/${totalBatches} (${batchDocs.length} документов)`);
      
      // ✅ ПРОПУСКАЕМ ПУСТЫЕ ЧАНКИ (из фиктивного массива)
      const validDocs = batchDocs.filter(doc => doc.text && doc.text.trim().length > 0);
      
      if (validDocs.length === 0) {
        console.log('⚠️ Пакет содержит только пустые документы, пропускаем...');
        processedBatches++;
        continue;
      }
      
      for (const doc of validDocs) {
        const embeddingResponse = await ai.embed({
          embedder: textEmbedding004,
          content: doc.text,
        });
        
        let embeddingVector: number[];
        if (Array.isArray(embeddingResponse)) {
          embeddingVector = embeddingResponse[0].embedding;
        } else if (embeddingResponse && 'embedding' in embeddingResponse) {
          embeddingVector = (embeddingResponse as any).embedding;
        } else {
          throw new Error(`Неожиданный формат эмбеддинга`);
        }
        
        const formattedEmbedding = pgvector.toSql(embeddingVector);
        
        await sql`
          INSERT INTO holograms_media_embeddings (content, embedding, metadata)
          VALUES (${doc.text}, ${formattedEmbedding}, ${doc.metadata as any})
        `;
      }
      
      processedBatches++;
      
      if (processedBatches % 100 === 0) {
        const currentProgress = ((batchNumber / totalBatches) * 100).toFixed(1);
        console.log(`✅ Обработано ${processedBatches} пакетов (${currentProgress}%)`);
        
        // ✅ ПЕРИОДИЧЕСКАЯ ПРОВЕРКА ПРОГРЕССА
        const currentCount = await sql`SELECT COUNT(*) as count FROM holograms_media_embeddings`;
        const currentTotal = parseInt(currentCount[0]?.count || '0');
        console.log(`📊 Текущий прогресс: ${currentTotal}/${genkitDocs.length} записей`);
      }
      
      // Пауза между пакетами
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('🎉 Индексация завершена успешно!');
    
    // Проверяем финальное количество записей
    const finalCount = await sql`SELECT COUNT(*) as count FROM holograms_media_embeddings`;
    const finalTotal = parseInt(finalCount[0]?.count || '0');
    console.log(`📊 Итого в базе данных: ${finalTotal}/${genkitDocs.length} записей`);
    
    if (finalTotal >= genkitDocs.length) {
      console.log('🎉 ВСЯ ИНДЕКСАЦИЯ ПОЛНОСТЬЮ ЗАВЕРШЕНА!');
    } else {
      console.log(`⚠️ Осталось обработать: ${genkitDocs.length - finalTotal} записей`);
    }
    
  } catch (error) {
    console.error('❌ Ошибка при индексации:', error);
    process.exit(1);
  }
}

// Запуск
runCloudIndexing()
  .then(() => {
    console.log('✅ Задача завершена');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  });
