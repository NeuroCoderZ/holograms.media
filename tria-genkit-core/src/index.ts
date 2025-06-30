import * as path from 'path';
import * as fs from 'fs/promises';

import { genkit, z } from 'genkit';
import {
  googleAI,
  gemini15Flash,
  textEmbedding004,  // ✅ Из результата [2] - стабильная модель
} from '@genkit-ai/googleai';

import {
  devLocalVectorstore,
  devLocalIndexerRef,
  devLocalRetrieverRef,
} from '@genkit-ai/dev-local-vectorstore';

import { enableFirebaseTelemetry } from '@genkit-ai/firebase';

import { TextLoader } from 'langchain/document_loaders/fs/text';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { Document as LangDocument } from '@langchain/core/documents';
import { Document } from '@genkit-ai/ai/retriever';

/* ────────────────────────────────────────────────────────── */

// Отключаем телеметрию для CLI режима
if (process.env.NODE_ENV === 'production') {
  enableFirebaseTelemetry();
}

// ✅ ПРАВИЛЬНАЯ ИНИЦИАЛИЗАЦИЯ из результата [2]
export const ai = genkit({
  plugins: [
    googleAI(),  // Автоматически использует GEMINI_API_KEY или GOOGLE_API_KEY
    devLocalVectorstore([
      {
        indexName: 'holograms_media_knowledge',
        embedder: textEmbedding004,  // ✅ Стабильная модель из результата [2]
      },
    ]),
  ],
});

// ✅ Используем стабильные модели из результата [2]
const embeddingModel = textEmbedding004;
const generativeModel = gemini15Flash;

const indexer = devLocalIndexerRef('holograms_media_knowledge');
const retriever = devLocalRetrieverRef('holograms_media_knowledge');

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

/* 1. ✅ ОСНОВНОЙ FLOW для создания эмбеддингов через CLI */
export const knowledgeBaseIndexer = ai.defineFlow(
  {
    name: 'knowledgeBaseIndexer',
    inputSchema: z.object({
      resumeFromBatch: z.number()
        .min(0)
        .max(1000)
        .optional()
        .default(0)
        .describe('Номер пакета для продолжения (0 = начать сначала)'),
      batchSize: z.number()
        .min(10)
        .max(100)
        .optional()
        .default(25)
        .describe('Размер пакета для обработки (меньше = стабильнее)'),
    }),
    outputSchema: z.string(),
  },
  async ({ resumeFromBatch = 0, batchSize = 25 }) => {
    const startTime = Date.now();
    const rootDir = path.resolve(process.cwd(), '../GoogleAIStudio');
    
    console.log('🚀 ЗАПУСК ИНДЕКСАЦИИ ЧЕРЕЗ GENKIT CLI');
    console.log(`🎯 Модель эмбеддингов: text-embedding-004 (768 размерностей)`);
    console.log(`📊 Параметры: resumeFromBatch=${resumeFromBatch}, batchSize=${batchSize}`);
    
    if (resumeFromBatch === 0) {
      console.log('📁 ЭТАП 1/4: Сканирование директории:', rootDir);
    } else {
      console.log(`🔄 ПРОДОЛЖЕНИЕ с пакета ${resumeFromBatch + 1}`);
    }

    // ✅ Рекурсивный сбор .txt файлов
    async function collectTxtFiles(dir: string): Promise<string[]> {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(
          entries.map(async (ent) => {
            const full = path.join(dir, ent.name);
            if (ent.isDirectory()) {
              return await collectTxtFiles(full);
            } else if (full.endsWith('.txt')) {
              return [full];
            } else {
              return [];
            }
          })
        );
        return files.flat();
      } catch (error) {
        console.error(`❌ Ошибка чтения директории ${dir}:`, error);
        return [];
      }
    }

    const filePaths = await collectTxtFiles(rootDir);
    if (filePaths.length === 0) {
      console.log('❌ .txt файлов не найдено. Проверьте путь к директории.');
      return '🔍 .txt файлов не найдено. Проверьте путь к директории.';
    }

    console.log(`✅ Найдено ${filePaths.length} .txt файлов`);

    // ✅ ЭТАП 2: Загрузка и обработка файлов
    let docs: LangDocument[] = [];
    const cacheFile = path.resolve(process.cwd(), 'chunks_cache.json');

    if (resumeFromBatch === 0) {
      console.log('🔄 ЭТАП 2/4: Загрузка и обработка файлов...');

      // Загрузка файлов с обработкой ошибок
      for (let i = 0; i < filePaths.length; i++) {
        const fp = filePaths[i];
        try {
          const loader = new TextLoader(fp);
          const loaded = await loader.load();
          docs.push(...loaded);
          
          const fileName = path.basename(fp);
          const progress = `[${i + 1}/${filePaths.length}]`;
          console.log(`📄 ${progress} ${fileName} (${loaded.length} документов)`);
        } catch (e) {
          const fileName = path.basename(fp);
          const progress = `[${i + 1}/${filePaths.length}]`;
          console.warn(`⚠️  ${progress} Пропуск ${fileName}: ${String(e).substring(0, 100)}`);
        }
      }

      console.log(`✅ Загружено ${docs.length} документов`);
      
      // ✅ ЭТАП 3: Разделение на чанки (оптимизировано для text-embedding-004)
      console.log('✂️  ЭТАП 3/4: Разделение текста на оптимальные чанки...');
      
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 7500,    // ✅ Оптимально для text-embedding-004 (2048 токенов)
        chunkOverlap: 750,  // 10% перекрытие
        separators: ['\n\n', '\n', '. ', '! ', '? ', ' ', ''],
      });
      
      const chunks = await splitter.splitDocuments(docs);
      console.log(`✅ Создано ${chunks.length} чанков (оптимизировано для text-embedding-004)`);
      
      // Сохранение чанков для Resume функциональности
      const chunksData = chunks.map((c) => ({
        pageContent: c.pageContent,
        metadata: { 
          ...c.metadata, 
          source: c.metadata?.source ?? 'unknown',
          chunkIndex: chunks.indexOf(c)
        }
      }));
      
      try {
        await fs.writeFile(cacheFile, JSON.stringify(chunksData, null, 2));
        console.log('💾 Чанки сохранены в chunks_cache.json для Resume функциональности');
      } catch (e) {
        console.warn('⚠️ Не удалось сохранить кэш чанков:', e);
      }
    } else {
      // Загрузка чанков из кэша для Resume
      console.log('📂 ЭТАП 2/4: Загрузка чанков из кэша...');
      try {
        const cachedData = await fs.readFile(cacheFile, 'utf-8');
        const chunksData = JSON.parse(cachedData);
        docs = chunksData; // Используем как массив для дальнейшей обработки
        console.log(`✅ Загружено ${chunksData.length} чанков из кэша`);
      } catch (e) {
        console.error('❌ Ошибка загрузки кэша чанков:', e);
        return 'Ошибка: кэш чанков не найден. Запустите с resumeFromBatch: 0';
      }
    }

    // Функция для извлечения метаданных из пути к файлу
    function extractMetadataFromFile(filePath: string) {
      const fileName = path.basename(filePath).toLowerCase();
      let learning_stage = 'general';
      let topic = 'general';
      let difficulty = 'intermediate';

      // Определяем learning_stage
      if (fileName.includes('onboarding') || fileName.includes('первое знакомство')) {
        learning_stage = 'onboarding';
        difficulty = 'beginner';
      } else if (fileName.includes('tria') || fileName.includes('триа')) {
        learning_stage = 'tria_creation';
        difficulty = 'advanced';
      } else if (fileName.includes('продвинутые')) {
        learning_stage = 'advanced';
      }

      // Определяем topic
      if (fileName.includes('gesture') || fileName.includes('жесты')) {
        topic = 'gestures';
      } else if (fileName.includes('backend') || fileName.includes('fastapi')) {
        topic = 'backend';
      } else if (fileName.includes('frontend') || fileName.includes('three.js')) {
        topic = 'frontend';
      } else if (fileName.includes('архитектура')) {
        topic = 'architecture';
        difficulty = 'expert';
      } else if (fileName.includes('ux') || fileName.includes('интерфейс')) {
        topic = 'ux_design';
      }

      return { learning_stage, topic, difficulty };
    }

    // Конвертация в Genkit Documents
    let genkitDocs: Document[];
    if (resumeFromBatch === 0) {
      const chunks = docs as LangDocument[];
      genkitDocs = chunks.map((c) => {
        const source = c.metadata?.source ?? 'unknown';
        const customMetadata = extractMetadataFromFile(source);
        return Document.fromText(c.pageContent, {
          ...c.metadata,
          ...customMetadata,
          source,
        });
      });
    } else {
      genkitDocs = (docs as any).map((c: any) => {
        const source = c.metadata?.source ?? 'unknown';
        const customMetadata = extractMetadataFromFile(source);
        return Document.fromText(c.pageContent, { ...c.metadata, ...customMetadata, source });
      });
    }

    // ✅ ЭТАП 4: Создание эмбеддингов через Genkit
    console.log('🧠 ЭТАП 4/4: Создание эмбеддингов через Genkit + text-embedding-004');
    
    const totalBatches = Math.ceil(genkitDocs.length / batchSize);
    const startBatch = resumeFromBatch;
    const remainingBatches = totalBatches - startBatch;
    
    console.log(`📊 Статистика индексации:`);
    console.log(`   • Всего чанков: ${genkitDocs.length}`);
    console.log(`   • Размер пакета: ${batchSize}`);
    console.log(`   • Всего пакетов: ${totalBatches}`);
    console.log(`   • Начинаем с пакета: ${startBatch + 1}`);
    console.log(`   • Осталось обработать: ${remainingBatches} пакетов`);
    
    const embeddingStart = Date.now();
    let processedBatches = 0;
    
    // ✅ Пакетная обработка с Genkit API
    for (let i = startBatch * batchSize; i < genkitDocs.length; i += batchSize) {
      const batch = genkitDocs.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      
      console.log(`📦 Пакет ${batchNumber}/${totalBatches} (${batch.length} чанков)`);
      
      // Показываем прогресс каждые 5 пакетов
      if (processedBatches > 0 && processedBatches % 5 === 0) {
        const elapsed = (Date.now() - embeddingStart) / 1000 / 60;
        const rate = processedBatches / elapsed;
        const remainingTime = (totalBatches - batchNumber) / rate;
        console.log(`   ⏱️ Скорость: ${rate.toFixed(2)} пакетов/мин`);
        console.log(`   ⏳ Примерное время до завершения: ${remainingTime.toFixed(1)} мин`);
      }
      
      try {
        // ✅ Использование Genkit indexer (из результата [2])
        await ai.index({ 
          indexer, 
          documents: batch 
        });
        
        const progress = ((batchNumber / totalBatches) * 100).toFixed(1);
        console.log(`✅ Пакет ${batchNumber} завершен (${progress}%)`);
        
        processedBatches++;
        
        // Контрольные точки каждые 10 пакетов
        if (batchNumber % 10 === 0) {
          console.log(`🎯 КОНТРОЛЬНАЯ ТОЧКА: ${batchNumber}/${totalBatches} пакетов завершено`);
          console.log(`💾 Для продолжения используйте: resumeFromBatch: ${batchNumber}`);
        }
        
        // Пауза между пакетами для стабильности
        if (batchNumber < totalBatches) {
          await new Promise(resolve => setTimeout(resolve, 500)); // Меньше паузы для стабильной модели
        }
        
      } catch (error) {
        console.error(`❌ ОШИБКА в пакете ${batchNumber}:`, error);
        console.log(`🔄 Для продолжения с этого места используйте:`);
        console.log(`   resumeFromBatch: ${batchNumber - 1}`);
        
        return `❌ Ошибка в пакете ${batchNumber}. Для продолжения: resumeFromBatch: ${batchNumber - 1}`;
      }
    }
    
    // Финальная статистика
    const embeddingTime = ((Date.now() - embeddingStart) / 1000 / 60).toFixed(1);
    const totalTime = ((Date.now() - startTime) / 1000 / 60).toFixed(1);
    
    console.log(`🎉 ИНДЕКСАЦИЯ ЗАВЕРШЕНА!`);
    console.log(`📊 Финальная статистика:`);
    console.log(`   • Общее время: ${totalTime} мин`);
    console.log(`   • Время создания эмбеддингов: ${embeddingTime} мин`);
    console.log(`   • Обработано чанков: ${genkitDocs.length}`);
    console.log(`   • Исходных файлов: ${filePaths.length}`);
    console.log(`   • Модель: text-embedding-004 (стабильная)`);
    console.log(`💾 База знаний сохранена в __db_holograms_media_knowledge.json`);
    console.log(`🚀 AI-учитель готов к работе!`);

    // Удаляем кэш чанков после успешного завершения
    try {
      await fs.unlink(cacheFile);
      console.log('🧹 Кэш чанков очищен');
    } catch (e) {
      // Игнорируем ошибку удаления
    }

    return `✅ Индексация завершена за ${totalTime} мин! ${genkitDocs.length} чанков из ${filePaths.length} файлов.`;
  },
);

/* 2. ✅ AI-учитель с RAG поиском */
export const askKnowledgeBase = ai.defineFlow(
  {
    name: 'askKnowledgeBase',
    inputSchema: z.object({
      query: z.string().describe('Вопрос по проекту holograms.media'),
      contextChunks: z.number()
        .min(1)
        .max(20)
        .optional()
        .default(8)
        .describe('Количество релевантных фрагментов для контекста'),
    }),
    outputSchema: z.string(),
  },
  async ({ query, contextChunks = 8 }) => {
    console.log(`🔍 Поиск в базе знаний: "${query}"`);
    console.log(`📊 Будет использовано до ${contextChunks} фрагментов`);
    
    // ✅ Поиск через Genkit retriever (из результата [2])
    const hits = await ai.retrieve({
      retriever,
      query,
      options: { k: contextChunks },
    });

    if (!hits.length) {
      console.log('❌ Контекст не найден');
      return `ℹ️  По запросу "${query}" не найдено релевантной информации в базе знаний. 

🔍 Возможные причины:
• База знаний еще не проиндексирована (запустите knowledgeBaseIndexer)
• Попробуйте переформулировать вопрос
• Используйте более общие термимы проекта

💡 Совет: Спросите об архитектуре, компонентах, или API проекта holograms.media`;
    }

    console.log(`✅ Найдено ${hits.length} релевантных фрагментов`);
    
    // Показываем источники для отладки
    const sources = [...new Set(hits.map(h => h.metadata?.source || 'unknown'))];
    console.log(`📄 Источники: ${sources.slice(0, 3).map(s => path.basename(s, '.txt')).join(', ')}${sources.length > 3 ? ` и еще ${sources.length - 3}` : ''}`);
    
    console.log('🧠 Генерация обучающего ответа через Gemini 1.5 Flash...');

    // Структурированный контекст
    const contextTxt = hits.map((d, i) => {
      const source = d.metadata?.source ? path.basename(d.metadata.source, '.txt') : 'unknown';
      return `[Источник ${i + 1}: ${source}]\n${d.text}`;
    }).join('\n\n═══════════════════════════════════════\n\n');
    
    const prompt = RAG_TEMPLATE
      .replace('{context}', contextTxt)
      .replace('{question}', query);

    // ✅ Генерация ответа через Genkit (из результата [2])
    const { text } = await ai.generate({
      model: generativeModel,
      prompt: `${SYSTEM_PROMPT}\n\n${prompt}`,
      config: { 
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });

    console.log('✅ Обучающий ответ сгенерирован');
    console.log(`📝 Длина ответа: ${text.length} символов`);
    console.log(`🎯 Использовано источников: ${sources.length}`);
    
    return text;
  },
);

/* 3. ✅ Быстрый тест системы */
export const testKnowledgeBase = ai.defineFlow(
  {
    name: 'testKnowledgeBase',
    inputSchema: z.void(),
    outputSchema: z.string(),
  },
  async () => {
    const testQueries = [
      "Как устроена архитектура holograms.media?",
      "Что такое Agent Tria?",
      "Как работает управление жестами?",
      "Расскажи о backend на FastAPI"
    ];
    
    console.log('🧪 Тестирование качества поиска...');
    
    const results: string[] = [];
    for (const query of testQueries) {
      console.log(`🔍 Тест: "${query}"`);
      
      const hits = await ai.retrieve({
        retriever,
        query,
        options: { k: 3 },
      });
      
      if (hits.length > 0) {
        const sources = [...new Set(hits.map(h => path.basename(h.metadata?.source || 'unknown', '.txt')))];
        results.push(`✅ "${query}" → ${hits.length} результатов из [${sources.join(', ')}]`);
        console.log(`   ✅ Найдено ${hits.length} релевантных фрагментов`);
      } else {
        results.push(`❌ "${query}" → нет результатов`);
        console.log(`   ❌ Результаты не найдены`);
      }
    }
    
    console.log('🎯 Тестирование завершено!');
    
    return `🧪 ТЕСТ КАЧЕСТВА RAG СИСТЕМЫ:\n\n${results.join('\n\n')}\n\n🚀 Модель: text-embedding-004 (стабильная)`;
  },
);

/* 4. ✅ Статус базы знаний */
export const knowledgeBaseStatus = ai.defineFlow(
  {
    name: 'knowledgeBaseStatus',
    inputSchema: z.void(),
    outputSchema: z.object({
      isIndexed: z.boolean(),
      totalDocuments: z.number(),
      lastIndexed: z.string().optional(),
      cacheExists: z.boolean(),
      embeddingModel: z.string(),
      dimensions: z.number(),
    }),
  },
  async () => {
    // Проверяем существование файла базы данных
    const dbPath = path.resolve(process.cwd(), '__db_holograms_media_knowledge.json');
    let isIndexed = false;
    let totalDocuments = 0;
    let lastIndexed: string | undefined;
    
    try {
      const stats = await fs.stat(dbPath);
      isIndexed = true;
      lastIndexed = stats.mtime.toISOString();
      
      // Подсчет документов в базе
      const dbContent = await fs.readFile(dbPath, 'utf-8');
      const dbData = JSON.parse(dbContent);
      totalDocuments = Array.isArray(dbData) ? dbData.length : Object.keys(dbData).length;
    } catch (e) {
      // База не существует
    }
    
    // Проверяем существование кэша чанков
    const cachePath = path.resolve(process.cwd(), 'chunks_cache.json');
    let cacheExists = false;
    try {
      await fs.stat(cachePath);
      cacheExists = true;
    } catch (e) {
      // Кэш не существует
    }
    
    return {
      isIndexed,
      totalDocuments,
      lastIndexed,
      cacheExists,
      embeddingModel: 'text-embedding-004',
      dimensions: 768,
    };
  },
);

/* ✅ ЗАПУСК СЕРВЕРА для CLI доступа (из результата [1]) */

console.log('🚀 Genkit flows зарегистрированы для CLI доступа');
console.log('📋 Доступные команды:');
console.log('   genkit flow:run knowledgeBaseIndexer \'{"resumeFromBatch": 0, "batchSize": 25}\'');
console.log('   genkit flow:run askKnowledgeBase \'{"query": "ваш вопрос"}\'');
console.log('   genkit flow:run testKnowledgeBase');
console.log('   genkit flow:run knowledgeBaseStatus');