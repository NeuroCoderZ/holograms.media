// tria-genkit-core/create_modern_embeddings.js

const fs = require('fs').promises;
const path = require('path');
const { GoogleGenerativeAIEmbeddings } = require('@langchain/google-genai');
const { RecursiveCharacterTextSplitter } = require('langchain/text_splitter'); // For smart chunking

// --- КОНФИГУРАЦИЯ ---
// Замените эти значения на ваши реальные API-ключи Google Gemini.
// Вы можете добавить несколько ключей для ротации в случае превышения лимитов.
const API_KEYS = [
  'AIzaSyDOaH1Wxrnd9K7aeWVzSMaxvv0yeIVba5g',
  'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g', // Добавьте больше ключей по необходимости
];

const INPUT_DIR = path.resolve(__dirname, '../GoogleAIStudio'); // Путь к директории с исходными текстовыми файлами
const OUTPUT_FILE = path.resolve(__dirname, 'holographic_memory_v1.json');
const BATCH_SIZE = 10; // Количество чанков для обработки за одну партию перед сохранением
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIMENSIONALITY = 3072;
const CHUNK_SIZE = 1000; // Примерный размер чанка
const CHUNK_OVERLAP = 200; // Перекрытие между чанками

let currentApiKeyIndex = 0;

function getEmbeddingsClient() {
  if (API_KEYS.length === 0 || API_KEYS[currentApiKeyIndex] === 'YOUR_GEMINI_API_KEY_1') {
    console.error('Ошибка: API-ключи не настроены. Пожалуйста, замените "YOUR_GEMINI_API_KEY_X" на ваши реальные ключи.');
    process.exit(1);
  }
  return new GoogleGenerativeAIEmbeddings({
    apiKey: API_KEYS[currentApiKeyIndex],
    model: EMBEDDING_MODEL,
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: EMBEDDING_DIMENSIONALITY,
  });
}

async function rotateApiKeyAndRetry(func) {
  currentApiKeyIndex = (currentApiKeyIndex + 1) % API_KEYS.length;
  console.warn(`Переключение на следующий API-ключ. Текущий индекс: ${currentApiKeyIndex}`);
  if (currentApiKeyIndex === 0) {
    console.error('Все API-ключи были использованы. Пожалуйста, проверьте лимиты или добавьте больше ключей.');
    throw new Error('Все API-ключи исчерпаны.');
  }
  return await func();
}

// Вспомогательные функции для метаданных (заглушки)
function calculateRelevance(chunk) {
  return Math.min(1.0, chunk.length / 500);
}

function extractTags(chunk) {
  const tags = [];
  if (chunk.toLowerCase().includes('tria')) tags.push('Tria');
  if (chunk.toLowerCase().includes('wasm')) tags.push('WASM');
  if (chunk.toLowerCase().includes('refactoring')) tags.push('refactoring');
  return tags.length > 0 ? tags : ['general'];
}

function isVisualizable(chunk) {
  return chunk.toLowerCase().includes('scene') || chunk.toLowerCase().includes('3d');
}

function hasAudioContent(chunk) {
  return chunk.toLowerCase().includes('audio') || chunk.toLowerCase().includes('sound');
}

function extractSpatialData(chunk) {
  return null;
}

async function createEmbeddings() {
  let allEmbeddings = [];
  let processedFileCount = 0;
  let processedChunkCount = 0;

  // Попытка загрузить существующий прогресс
  try {
    const existingData = await fs.readFile(OUTPUT_FILE, 'utf8');
    allEmbeddings = JSON.parse(existingData);
    console.log(`Возобновление работы: Загружено ${allEmbeddings.length} существующих эмбеддингов.`);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.log('Файл прогресса не найден, начинаем с нуля.');
    } else {
      console.error('Ошибка при загрузке файла прогресса:', error);
    }
  }

  const files = await fs.readdir(INPUT_DIR);
  const textFiles = files.filter(file => file.endsWith('.txt') || file.endsWith('.md'));

  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
  });

  for (const fileName of textFiles) {
    const filePath = path.join(INPUT_DIR, fileName);
    console.log(`Обработка файла: ${filePath}`);

    let fileContent;
    try {
      fileContent = await fs.readFile(filePath, 'utf8');
    } catch (error) {
      console.error(`Ошибка чтения файла ${filePath}:`, error);
      continue;
    }

    const chunks = await textSplitter.splitText(fileContent);
    let fileEmbeddings = [];

    // Проверяем, были л�� уже обработаны все чанки этого файла
    const existingFileEmbeddings = allEmbeddings.filter(emb => emb.source === filePath);
    if (existingFileEmbeddings.length === chunks.length) {
      console.log(`Все чанки для файла ${fileName} уже обработаны. Пропускаем.`);
      processedFileCount++;
      processedChunkCount += chunks.length;
      continue;
    }

    for (let j = 0; j < chunks.length; j++) {
      const chunk = chunks[j];

      // Проверяем, был ли этот конкретный чанк уже обработан
      const isChunkProcessed = existingFileEmbeddings.some(emb => emb.chunkIndex === j && emb.text === chunk);
      if (isChunkProcessed) {
        console.log(`Чанк ${j + 1}/${chunks.length} для файла ${fileName} уже обработан. Пропускаем.`);
        fileEmbeddings.push(existingFileEmbeddings.find(emb => emb.chunkIndex === j && emb.text === chunk));
        processedChunkCount++;
        continue;
      }

      let embeddingValues;
      try {
        const embeddingsClient = getEmbeddingsClient();
        const result = await embeddingsClient.embedDocuments([chunk]);
        embeddingValues = result[0]; // LangChain returns an array of embeddings
      } catch (error) {
        console.error(`Ошибка при создании эмбеддинга для чанка ${j + 1} файла ${fileName}:`, error);
        try {
          embeddingValues = await rotateApiKeyAndRetry(async () => {
            const embeddingsClient = getEmbeddingsClient();
            const result = await embeddingsClient.embedDocuments([chunk]);
            return result[0];
          });
        } catch (retryError) {
          console.error(`Повторная попытка не удалась для чанка ${j + 1} файла ${fileName}:`, retryError);
          continue;
        }
      }

      const enrichedEmbedding = {
        text: chunk,
        embedding: embeddingValues,
        source: filePath,
        chunkIndex: j,
        timestamp: new Date().toISOString(),
        model: EMBEDDING_MODEL,
        agentContext: {
          memoryType: 'historical_dialogue',
          synthesisRelevance: calculateRelevance(chunk),
          topologyWeight: 1.0,
        },
        semanticTags: extractTags(chunk),
        holographicMetadata: {
          visualizable: isVisualizable(chunk),
          audioRelevant: hasAudioContent(chunk),
          spatialContext: extractSpatialData(chunk),
        },
      };
      fileEmbeddings.push(enrichedEmbedding);
      processedChunkCount++;

      console.log(`Обработан чанк ${j + 1}/${chunks.length} из файла ${fileName}. Всего чанков: ${processedChunkCount}`);

      if (fileEmbeddings.length % BATCH_SIZE === 0 || j === chunks.length - 1) {
        // Добавляем обработанные чанки этого файла к общим эмбеддингам
        // Удаляем старые эмбеддинги для этого файла, если они были, и добавляем новые
        allEmbeddings = allEmbeddings.filter(emb => emb.source !== filePath).concat(fileEmbeddings);
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(allEmbeddings, null, 2));
        console.log(`Прогресс сохранен. Всего эмбеддингов: ${allEmbeddings.length}`);
      }
    }
    processedFileCount++;
    console.log(`Файл ${fileName} обработан. Всего файлов: ${processedFileCount}`);
  }

  await fs.writeFile(OUTPUT_FILE, JSON.stringify(allEmbeddings, null, 2));
  console.log(`Генерация эмбеддингов завершена. Итоговый файл: ${OUTPUT_FILE}`);
  console.log(`Всего обработано файлов: ${processedFileCount}, всего чанков: ${processedChunkCount}`);
}

createEmbeddings().catch(console.error);
