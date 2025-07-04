import * as path from 'path';
import * as fs from 'fs/promises';

import { genkit, z } from 'genkit';
import { googleAI, gemini, textEmbedding004 } from '@genkit-ai/googleai';
import { startFlowServer } from '@genkit-ai/express';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

// ✅ Правильные импорты для работы с pgvector
import postgres from 'postgres';
import pgvector from 'pgvector';

import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document as LangDocument, DocumentInterface } from '@langchain/core/documents';
import { Document } from '@genkit-ai/ai/retriever';

/* ────────────────────────────────────────────────────────── */

// ✅ Включаем телеметрию Firebase
if (process.env.NODE_ENV === 'production') {
  enableFirebaseTelemetry();
}

// ✅ Интерфейс для типизации данных из кэша
interface CachedChunk {
  pageContent: string;
  metadata: Record<string, any>;
}

// ✅ Интерфейс для ответа эмбеддинга Genkit (из результатов поиска [6])
interface EmbeddingResponse {
  embedding: number[];
  metadata?: Record<string, unknown>;
}

// ✅ ИНИЦИАЛИЗАЦИЯ GENKIT
export const ai = genkit({
  plugins: [
    googleAI(),
  ],
});

// ✅ Прямое подключение к вашей базе данных Neon
const sql = postgres(process.env.DATABASE_URL!);

const generativeModel = gemini('gemini-2.5-pro');

/* ────────────────────────────────────────────────────────── */

const SYSTEM_PROMPT = `Ты — ведущий AI-архитектор и учитель проекта "holograms.media".
Твоя задача — обучать пользователей работе с интерфейсом голографических медиа, 
консультировать по техническим вопросам и отвечать ИСКЛЮЧИТЕЛЬНО на основе 
контекста из базы знаний проекта.

Стиль ответов: дружелюбный учитель с практическими примерами.`;

const RAG_TEMPLATE = `### КОНТЕКСТ ИЗ БАЗЫ ЗНАНИЙ ###
{context}

### ВОПРОС ПОЛЬЗОВАТЕЛЯ ###
{question}

### ИНСТРУКЦИЯ ###
Дай развернутый обучающий ответ с примерами использования.`;

/* ─────────────────────────── FLOWS для CLI ─────────────────────────── */

export const knowledgeBaseIndexer = ai.defineFlow(
  {
    name: 'knowledgeBaseIndexer',
    inputSchema: z.object({
      resumeFromBatch: z.number()
        .min(0)
        .max(200000)
        .optional()
        .default(0)
        .describe('Номер пакета для продолжения (0 = начать сначала)'),
      batchSize: z.number()
        .min(1)
        .max(50)
        .optional()
        .default(5)
        .describe('Размер пакета для отправки в базу'),
      autoRetry: z.boolean()
        .optional()
        .default(true)
        .describe('Автоматически продолжать при ошибках'),
    }),
    outputSchema: z.string(),
  },
  async ({ resumeFromBatch = 0, batchSize = 5, autoRetry = true }) => {
    const startTime = Date.now();
    const rootDir = path.resolve(process.cwd(), '../GoogleAIStudio');

    const cacheFile = path.resolve(process.cwd(), 'chunks_cache_2025.json');
    const progressFile = path.resolve(process.cwd(), 'indexing_progress_2025.json');

    console.log('🚀 ЗАПУСК ИНДЕКСАЦИИ в pgvector (Neon.tech)');
    console.log(`🎯 Модель эмбеддингов: text-embedding-004 (768 размерностей)`);
    console.log(`📊 Параметры: resumeFromBatch=${resumeFromBatch}, batchSize=${batchSize}, autoRetry=${autoRetry}`);

    let savedProgress: any = null;
    try {
      const progressData = await fs.readFile(progressFile, 'utf-8');
      savedProgress = JSON.parse(progressData);
      console.log(`📂 Найден прогресс: завершено ${savedProgress.completedBatches}/${savedProgress.totalBatches} пакетов`);
    } catch (e) {
      console.log('📂 Прогресс не найден, начинаем с нуля');
    }

    let chunks: DocumentInterface[] = [];
    const canResumeFromCache = resumeFromBatch > 0 || (savedProgress && savedProgress.completedBatches > 0);

    if (!canResumeFromCache) {
      console.log('📁 ЭТАП 1/4: Сканирование директории:', rootDir);

      async function collectTxtFiles(dir: string): Promise<string[]> {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          const files = await Promise.all(
            entries.map(async (ent) => {
              const full = path.join(dir, ent.name);
              return ent.isDirectory() ? await collectTxtFiles(full) : full.endsWith('.txt') ? [full] : [];
            })
          );
          return files.flat();
        } catch (error) {
          console.error(`❌ Ошибка чтения директории ${dir}:`, error);
          return [];
        }
      }
      const filePaths = await collectTxtFiles(rootDir);
      if (filePaths.length === 0) return '🔍 .txt файлов не найдено.';

      console.log(`✅ Найдено ${filePaths.length} .txt файлов`);
      console.log('🔄 ЭТАП 2/4: Загрузка и обработка файлов...');

      let docs: LangDocument[] = [];
      for (let i = 0; i < filePaths.length; i++) {
        const fp = filePaths[i];
        try {
          const loader = new TextLoader(fp);
          const loaded = await loader.load();
          docs.push(...loaded);
        } catch (e) {
          console.warn(`⚠️ Пропуск ${path.basename(fp)}: ${String(e).substring(0, 100)}`);
        }
      }

      console.log('✂️  ЭТАП 3/4: Разделение текста на оптимальные чанки...');
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 80,
      });
      chunks = await splitter.splitDocuments(docs);
      console.log(`✅ Создано ${chunks.length} чанков`);

      const chunksData: CachedChunk[] = chunks.map(c => ({
        pageContent: c.pageContent,
        metadata: c.metadata,
      }));
      await fs.writeFile(cacheFile, JSON.stringify(chunksData, null, 2));
      console.log('💾 Чанки сохранены в chunks_cache_2025.json');
    } else {
      console.log('📂 Загрузка чанков из кэша...');
      try {
        const cachedData = await fs.readFile(cacheFile, 'utf-8');
        const chunksData: CachedChunk[] = JSON.parse(cachedData);
        chunks = chunksData.map((c: CachedChunk) => new LangDocument({ pageContent: c.pageContent, metadata: c.metadata }));
        console.log(`✅ Загружено ${chunks.length} чанков из кэша`);
      } catch (e) {
        console.error('❌ Ошибка загрузки кэша чанков. Запустите с resumeFromBatch: 0');
        return 'Ошибка: кэш чанков не найден.';
      }
    }

    function extractMetadataFromFile(filePath: string) {
      const fileName = path.basename(filePath).toLowerCase();
      let learning_stage = 'general', topic = 'general', difficulty = 'intermediate';
      let gesture_affordances = ['navigate', 'select', 'grab']; // Базовый набор аффордансов

      if (fileName.includes('onboarding')) {
        learning_stage = 'onboarding';
        difficulty = 'beginner';
      }
      if (fileName.includes('tria')) {
        learning_stage = 'tria_creation';
        topic = 'ai_core';
        difficulty = 'advanced';
      }
      // Добавляем специфичные аффордансы
      if (fileName.includes('gesture') || fileName.includes('жесты')) {
          topic = 'gestures'; // Обновляем топик, если еще не установлен
          gesture_affordances.push('sculpt', 'define');
      } else if (fileName.includes('3d') || fileName.includes('hologram') || fileName.includes('голограмм')) {
          topic = topic === 'general' ? '3d_rendering' : topic; // Обновляем топик, если еще не установлен
          gesture_affordances.push('rotate', 'scale', 'transform'); // Добавим 'transform'
      } else if (fileName.includes('code') || fileName.includes('script') || fileName.includes('код')) {
          topic = topic === 'general' ? 'coding' : topic;
          gesture_affordances.push('debug', 'refactor');
      }

      // Убираем дубликаты аффордансов, если они могли случайно добавиться
      gesture_affordances = [...new Set(gesture_affordances)];

      return { learning_stage, topic, difficulty, gesture_affordances };
    }

    const genkitDocs = chunks.map(c => {
      const source = c.metadata?.source ?? 'unknown';
      const customMetadata = extractMetadataFromFile(source); // Теперь содержит gesture_affordances
      return Document.fromText(c.pageContent, {
        source: path.basename(source), // Оставляем только имя файла как источник
        // Остальные метаданные берем из customMetadata
        learning_stage: customMetadata.learning_stage,
        topic: customMetadata.topic,
        difficulty: customMetadata.difficulty,
        gesture_affordances: customMetadata.gesture_affordances, // Добавляем аффордансы
      });
    });

    console.log(`✅ DIAGNOSTICS: Total genkitDocs created: ${genkitDocs.length}. First doc metadata example:`, genkitDocs[0]?.metadata);

    console.log('🧠 ЭТАП 4/4: Создание эмбеддингов в pgvector');

    // ✅ Создаем расширение и таблицу если не существует
    await sql`CREATE EXTENSION IF NOT EXISTS vector`;
    await sql`
        CREATE TABLE IF NOT EXISTS holograms_media_embeddings (
            id SERIAL PRIMARY KEY,
            content TEXT,
            embedding VECTOR(768),
            metadata JSONB
        );
    `;

    const totalBatches = Math.ceil(genkitDocs.length / batchSize);
    const startBatch = resumeFromBatch;

    console.log(`📊 Статистика индексации:`);
    console.log(`   • Всего чанков: ${genkitDocs.length}`);
    console.log(`   • Размер пакета: ${batchSize}`);
    console.log(`   • Всего пакетов: ${totalBatches}`);

    let embeddingStart = Date.now();
    let processedBatches = 0;
    let consecutiveErrors = 0;

    for (let i = startBatch * batchSize; i < genkitDocs.length; i += batchSize) {
      const batchDocs = genkitDocs.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;

      console.log(`📦 Пакет ${batchNumber}/${totalBatches}`);

      if (processedBatches > 0 && processedBatches % 100 === 0) {
        const elapsed = (Date.now() - embeddingStart) / 1000 / 60;
        const rate = processedBatches / elapsed;
        const remainingTime = (totalBatches - batchNumber) / rate;
        console.log(`   ⏱️ Скорость: ${rate.toFixed(2)} пакетов/мин`);
        console.log(`   ⏳ Примерное время до завершения: ${remainingTime.toFixed(1)} мин`);
      }

      try {
        // ✅ Обрабатываем каждый документ по отдельности с ПРАВИЛЬНОЙ типизацией
        for (const doc of batchDocs) {
          // ✅ Проверяем что текст не пустой
          if (!doc.text || doc.text.trim().length === 0) {
            console.warn(`⚠️ Пропуск пустого документа`);
            continue;
          }

          // ✅ Создаем эмбеддинг через Genkit с правильной типизацией
          const embeddingResponse = await ai.embed({
            embedder: textEmbedding004,
            content: doc.text,
          }) as EmbeddingResponse | EmbeddingResponse[]; // ✅ Правильная типизация

          // ✅ Извлекаем массив чисел из ответа (исправлены строки 255 и 344)
          let embeddingVector: number[];
          
          if (Array.isArray(embeddingResponse)) {
            // Если ответ - массив объектов, берем первый
            embeddingVector = embeddingResponse[0].embedding;
          } else if (embeddingResponse && typeof embeddingResponse === 'object' && 'embedding' in embeddingResponse) {
            // Если ответ - объект с полем embedding
            embeddingVector = embeddingResponse.embedding;
          } else {
            throw new Error(`Неожиданный формат ответа эмбеддинга: ${JSON.stringify(embeddingResponse).substring(0, 100)}`);
          }

          // ✅ Проверяем что получили валидный массив чисел
          if (!Array.isArray(embeddingVector) || embeddingVector.length !== 768) {
            throw new Error(`Неверный размер вектора: ${embeddingVector ? embeddingVector.length : 'null'}, ожидалось 768`);
          }

          // ✅ Проверяем что все элементы - числа (из результатов поиска [1])
          if (!embeddingVector.every(val => typeof val === 'number' && !isNaN(val))) {
            throw new Error(`Вектор содержит не-числовые значения`);
          }

          // ✅ Используем pgvector.toSql для правильного форматирования
          const formattedEmbedding = pgvector.toSql(embeddingVector);

          // ✅ Вставляем в базу данных
          await sql`
            INSERT INTO holograms_media_embeddings (content, embedding, metadata)
            VALUES (${doc.text}, ${formattedEmbedding}, ${doc.metadata as any})
          `;
        }
        
        processedBatches++;
        consecutiveErrors = 0;

        const progressData = {
          totalBatches,
          completedBatches: batchNumber,
          lastSuccessfulBatch: batchNumber,
          embeddingModel: 'text-embedding-004',
        };
        await fs.writeFile(progressFile, JSON.stringify(progressData, null, 2));
        console.log(`✅ Пакет ${batchNumber}/${totalBatches} сохранен в pgvector`);

        if (batchNumber < totalBatches) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        consecutiveErrors++;
        console.error(`❌ ОШИБКА в пакете ${batchNumber}:`, error);

        if (autoRetry && consecutiveErrors < 3) {
          const retryDelay = consecutiveErrors * 5000;
          console.log(`🔄 Автовосстановление через ${retryDelay / 1000}с...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          i -= batchSize;
          continue;
        } else {
          console.log(`❌ Остановка после ${consecutiveErrors} ошибок.`);
          return `❌ Ошибка в пакете ${batchNumber}. Для продолжения: resumeFromBatch: ${batchNumber - 1}`;
        }
      }
    }

    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    console.log(`🎉 ИНДЕКСАЦИЯ ЗАВЕРШЕНА!`);
    console.log(`   • Общее время: ${totalTime} мин`);

    try {
      await fs.unlink(cacheFile);
      await fs.unlink(progressFile);
      console.log('🧹 Временные файлы очищены');
    } catch (e) {}

    return `✅ Индексация завершена за ${totalTime} мин!`;
  },
);

export const askKnowledgeBase = ai.defineFlow(
  {
    name: 'askKnowledgeBase',
    inputSchema: z.object({
      query: z.string().describe('Вопрос по проекту holograms.media'),
      contextChunks: z.number().optional().default(8),
    }),
    outputSchema: z.string(),
  },
  async ({ query, contextChunks = 8 }: { query: string; contextChunks?: number }) => {
    // ✅ Прямой поиск в базе данных с правильной типизацией (исправлена строка 344)
    const queryEmbeddingResponse = await ai.embed({
      embedder: textEmbedding004,
      content: query,
    }) as EmbeddingResponse | EmbeddingResponse[]; // ✅ Правильная типизация

    // ✅ Правильно извлекаем вектор
    let queryEmbedding: number[];
    if (Array.isArray(queryEmbeddingResponse)) {
      queryEmbedding = queryEmbeddingResponse[0].embedding;
    } else if (queryEmbeddingResponse && typeof queryEmbeddingResponse === 'object' && 'embedding' in queryEmbeddingResponse) {
      queryEmbedding = queryEmbeddingResponse.embedding;
    } else {
      throw new Error(`Неожиданный формат ответа эмбеддинга для поиска`);
    }

    const formattedQueryEmbedding = pgvector.toSql(queryEmbedding);

    const results = await sql<Array<{ content: string; metadata: Record<string, any> }>>`
      SELECT content, metadata
      FROM holograms_media_embeddings
      ORDER BY embedding <-> ${formattedQueryEmbedding}
      LIMIT ${contextChunks}
    `;

    if (!results.length) return `ℹ️ По запросу "${query}" не найдено информации.`;
    
    const contextTxt = results.map((row: { content: string; metadata: Record<string, any> }, i: number) => 
      `[Источник ${i + 1}]\n${row.content}`
    ).join('\n\n---\n\n');
    
    const prompt = RAG_TEMPLATE.replace('{context}', contextTxt).replace('{question}', query);
    
    const result = await ai.generate({
      model: generativeModel,
      prompt: `${SYSTEM_PROMPT}\n\n${prompt}`,
      config: { temperature: 0.3 },
    });
    
    return result.text;
  },
);

export const testKnowledgeBase = ai.defineFlow(
  { name: 'testKnowledgeBase', inputSchema: z.void(), outputSchema: z.string() },
  async () => {
    return "Test not implemented yet.";
  }
);

export const knowledgeBaseStatus = ai.defineFlow(
  { name: 'knowledgeBaseStatus', inputSchema: z.void(), outputSchema: z.any() },
  async () => {
    try {
      const count = await sql`SELECT COUNT(*) as count FROM holograms_media_embeddings`;
      return { 
        status: "Connected to pgvector",
        totalDocuments: count[0]?.count || 0,
        embeddingModel: 'text-embedding-004',
        dimensions: 768 
      };
    } catch (e) {
      return { 
        status: "Database connection error",
        error: String(e)
      };
    }
  }
);

export const resumeIndexing = ai.defineFlow(
  { name: 'resumeIndexing', inputSchema: z.void(), outputSchema: z.string() },
  async () => {
    const progressFile = path.resolve(process.cwd(), 'indexing_progress_2025.json');
    try {
      const progressData = await fs.readFile(progressFile, 'utf-8');
      const progress = JSON.parse(progressData);
      const nextBatch = progress.lastSuccessfulBatch;
      return `🔄 Используйте команду:\ngenkit flow:run knowledgeBaseIndexer '{"resumeFromBatch": ${nextBatch}, "batchSize": 5}'`;
    } catch (e) {
      return `ℹ️ Прогресс не найден. Начните с начала:\ngenkit flow:run knowledgeBaseIndexer '{"resumeFromBatch": 0, "batchSize": 5}'`;
    }
  },
);

console.log('🚀 Genkit 1.14.0 flows зарегистрированы');
startFlowServer({
  flows: [
    knowledgeBaseIndexer,
    resumeIndexing,
    askKnowledgeBase,
    testKnowledgeBase,
    knowledgeBaseStatus,
  ],
});
