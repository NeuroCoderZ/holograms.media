"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.knowledgeBaseStatus = exports.testKnowledgeBase = exports.askKnowledgeBase = exports.knowledgeBaseIndexer = exports.ai = void 0;
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const genkit_1 = require("genkit");
const googleai_1 = require("@genkit-ai/googleai");
const dev_local_vectorstore_1 = require("@genkit-ai/dev-local-vectorstore");
const firebase_1 = require("@genkit-ai/firebase");
const text_1 = require("langchain/document_loaders/fs/text");
const text_splitter_1 = require("langchain/text_splitter");
const retriever_1 = require("@genkit-ai/ai/retriever");
/* ────────────────────────────────────────────────────────── */
// Отключаем телеметрию для CLI режима
if (process.env.NODE_ENV === 'production') {
    (0, firebase_1.enableFirebaseTelemetry)();
}
// ✅ ПРАВИЛЬНАЯ ИНИЦИАЛИЗАЦИЯ из результата [2]
exports.ai = (0, genkit_1.genkit)({
    plugins: [
        (0, googleai_1.googleAI)(), // Автоматически использует GEMINI_API_KEY или GOOGLE_API_KEY
        (0, dev_local_vectorstore_1.devLocalVectorstore)([
            {
                indexName: 'holograms_media_knowledge',
                embedder: googleai_1.textEmbedding004, // ✅ Стабильная модель из результата [2]
            },
        ]),
    ],
});
// ✅ Используем стабильные модели из результата [2]
const embeddingModel = googleai_1.textEmbedding004;
const generativeModel = googleai_1.gemini15Flash;
const indexer = (0, dev_local_vectorstore_1.devLocalIndexerRef)('holograms_media_knowledge');
const retriever = (0, dev_local_vectorstore_1.devLocalRetrieverRef)('holograms_media_knowledge');
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
exports.knowledgeBaseIndexer = exports.ai.defineFlow({
    name: 'knowledgeBaseIndexer',
    inputSchema: genkit_1.z.object({
        resumeFromBatch: genkit_1.z.number()
            .min(0)
            .max(1000)
            .optional()
            .default(0)
            .describe('Номер пакета для продолжения (0 = начать сначала)'),
        batchSize: genkit_1.z.number()
            .min(10)
            .max(100)
            .optional()
            .default(25)
            .describe('Размер пакета для обработки (меньше = стабильнее)'),
    }),
    outputSchema: genkit_1.z.string(),
}, async ({ resumeFromBatch = 0, batchSize = 25 }) => {
    const startTime = Date.now();
    const rootDir = path.resolve(process.cwd(), '../GoogleAIStudio');
    console.log('🚀 ЗАПУСК ИНДЕКСАЦИИ ЧЕРЕЗ GENKIT CLI');
    console.log(`🎯 Модель эмбеддингов: text-embedding-004 (768 размерностей)`);
    console.log(`📊 Параметры: resumeFromBatch=${resumeFromBatch}, batchSize=${batchSize}`);
    if (resumeFromBatch === 0) {
        console.log('📁 ЭТАП 1/4: Сканирование директории:', rootDir);
    }
    else {
        console.log(`🔄 ПРОДОЛЖЕНИЕ с пакета ${resumeFromBatch + 1}`);
    }
    // ✅ Рекурсивный сбор .txt файлов
    async function collectTxtFiles(dir) {
        try {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            const files = await Promise.all(entries.map(async (ent) => {
                const full = path.join(dir, ent.name);
                if (ent.isDirectory()) {
                    return await collectTxtFiles(full);
                }
                else if (full.endsWith('.txt')) {
                    return [full];
                }
                else {
                    return [];
                }
            }));
            return files.flat();
        }
        catch (error) {
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
    let docs = [];
    const cacheFile = path.resolve(process.cwd(), 'chunks_cache.json');
    if (resumeFromBatch === 0) {
        console.log('🔄 ЭТАП 2/4: Загрузка и обработка файлов...');
        // Загрузка файлов с обработкой ошибок
        for (let i = 0; i < filePaths.length; i++) {
            const fp = filePaths[i];
            try {
                const loader = new text_1.TextLoader(fp);
                const loaded = await loader.load();
                docs.push(...loaded);
                const fileName = path.basename(fp);
                const progress = `[${i + 1}/${filePaths.length}]`;
                console.log(`📄 ${progress} ${fileName} (${loaded.length} документов)`);
            }
            catch (e) {
                const fileName = path.basename(fp);
                const progress = `[${i + 1}/${filePaths.length}]`;
                console.warn(`⚠️  ${progress} Пропуск ${fileName}: ${String(e).substring(0, 100)}`);
            }
        }
        console.log(`✅ Загружено ${docs.length} документов`);
        // ✅ ЭТАП 3: Разделение на чанки (оптимизировано для text-embedding-004)
        console.log('✂️  ЭТАП 3/4: Разделение текста на оптимальные чанки...');
        const splitter = new text_splitter_1.RecursiveCharacterTextSplitter({
            chunkSize: 4000, // ✅ Оптимально для text-embedding-004 (2048 токенов)
            chunkOverlap: 400, // 10% перекрытие
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
        }
        catch (e) {
            console.warn('⚠️ Не удалось сохранить кэш чанков:', e);
        }
    }
    else {
        // Загрузка чанков из кэша для Resume
        console.log('📂 ЭТАП 2/4: Загрузка чанков из кэша...');
        try {
            const cachedData = await fs.readFile(cacheFile, 'utf-8');
            const chunksData = JSON.parse(cachedData);
            docs = chunksData; // Используем как массив для дальнейшей обработки
            console.log(`✅ Загружено ${chunksData.length} чанков из кэша`);
        }
        catch (e) {
            console.error('❌ Ошибка загрузки кэша чанков:', e);
            return 'Ошибка: кэш чанков не найден. Запустите с resumeFromBatch: 0';
        }
    }
    // Конвертация в Genkit Documents
    let genkitDocs;
    if (resumeFromBatch === 0) {
        const chunks = docs;
        genkitDocs = chunks.map((c) => retriever_1.Document.fromText(c.pageContent, {
            ...c.metadata,
            source: c.metadata?.source ?? 'unknown',
        }));
    }
    else {
        genkitDocs = docs.map((c) => retriever_1.Document.fromText(c.pageContent, c.metadata || { source: 'unknown' }));
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
            await exports.ai.index({
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
        }
        catch (error) {
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
    }
    catch (e) {
        // Игнорируем ошибку удаления
    }
    return `✅ Индексация завершена за ${totalTime} мин! ${genkitDocs.length} чанков из ${filePaths.length} файлов.`;
});
/* 2. ✅ AI-учитель с RAG поиском */
exports.askKnowledgeBase = exports.ai.defineFlow({
    name: 'askKnowledgeBase',
    inputSchema: genkit_1.z.object({
        query: genkit_1.z.string().describe('Вопрос по проекту holograms.media'),
        contextChunks: genkit_1.z.number()
            .min(1)
            .max(20)
            .optional()
            .default(8)
            .describe('Количество релевантных фрагментов для контекста'),
    }),
    outputSchema: genkit_1.z.string(),
}, async ({ query, contextChunks = 8 }) => {
    console.log(`🔍 Поиск в базе знаний: "${query}"`);
    console.log(`📊 Будет использовано до ${contextChunks} фрагментов`);
    // ✅ Поиск через Genkit retriever (из результата [2])
    const hits = await exports.ai.retrieve({
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
• Используйте более общие термины проекта

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
    const { text } = await exports.ai.generate({
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
});
/* 3. ✅ Быстрый тест системы */
exports.testKnowledgeBase = exports.ai.defineFlow({
    name: 'testKnowledgeBase',
    inputSchema: genkit_1.z.void(),
    outputSchema: genkit_1.z.string(),
}, async () => {
    const testQueries = [
        "Как устроена архитектура holograms.media?",
        "Что такое Agent Tria?",
        "Как работает управление жестами?",
        "Расскажи о backend на FastAPI"
    ];
    console.log('🧪 Тестирование качества поиска...');
    const results = [];
    for (const query of testQueries) {
        console.log(`🔍 Тест: "${query}"`);
        const hits = await exports.ai.retrieve({
            retriever,
            query,
            options: { k: 3 },
        });
        if (hits.length > 0) {
            const sources = [...new Set(hits.map(h => path.basename(h.metadata?.source || 'unknown', '.txt')))];
            results.push(`✅ "${query}" → ${hits.length} результатов из [${sources.join(', ')}]`);
            console.log(`   ✅ Найдено ${hits.length} релевантных фрагментов`);
        }
        else {
            results.push(`❌ "${query}" → нет результатов`);
            console.log(`   ❌ Результаты не найдены`);
        }
    }
    console.log('🎯 Тестирование завершено!');
    return `🧪 ТЕСТ КАЧЕСТВА RAG СИСТЕМЫ:\n\n${results.join('\n\n')}\n\n🚀 Модель: text-embedding-004 (стабильная)`;
});
/* 4. ✅ Статус базы знаний */
exports.knowledgeBaseStatus = exports.ai.defineFlow({
    name: 'knowledgeBaseStatus',
    inputSchema: genkit_1.z.void(),
    outputSchema: genkit_1.z.object({
        isIndexed: genkit_1.z.boolean(),
        totalDocuments: genkit_1.z.number(),
        lastIndexed: genkit_1.z.string().optional(),
        cacheExists: genkit_1.z.boolean(),
        embeddingModel: genkit_1.z.string(),
        dimensions: genkit_1.z.number(),
    }),
}, async () => {
    // Проверяем существование файла базы данных
    const dbPath = path.resolve(process.cwd(), '__db_holograms_media_knowledge.json');
    let isIndexed = false;
    let totalDocuments = 0;
    let lastIndexed;
    try {
        const stats = await fs.stat(dbPath);
        isIndexed = true;
        lastIndexed = stats.mtime.toISOString();
        // Подсчет документов в базе
        const dbContent = await fs.readFile(dbPath, 'utf-8');
        const dbData = JSON.parse(dbContent);
        totalDocuments = Array.isArray(dbData) ? dbData.length : Object.keys(dbData).length;
    }
    catch (e) {
        // База не существует
    }
    // Проверяем существование кэша чанков
    const cachePath = path.resolve(process.cwd(), 'chunks_cache.json');
    let cacheExists = false;
    try {
        await fs.stat(cachePath);
        cacheExists = true;
    }
    catch (e) {
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
});
/* ✅ ЗАПУСК СЕРВЕРА для CLI доступа (из результата [1]) */
console.log('🚀 Genkit flows зарегистрированы для CLI доступа');
console.log('📋 Доступные команды:');
console.log('   genkit flow:run knowledgeBaseIndexer \'{"resumeFromBatch": 0, "batchSize": 25}\'');
console.log('   genkit flow:run askKnowledgeBase \'{"query": "ваш вопрос"}\'');
console.log('   genkit flow:run testKnowledgeBase');
console.log('   genkit flow:run knowledgeBaseStatus');
