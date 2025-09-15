const path = require('path');
const fs = require('fs').promises;
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 🔥 ПРОСТОЙ СКРИПТ БЕЗ GENKIT - ТОЛЬКО ЭМБЕДДИНГИ
async function createEmbeddings004() {
  const API_KEYS = [
    'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g', // NeuroCoder
    'AIzaSyDOaH1Wxrnd9K7aeWVzSMaxvv0yeIVba5g'  // NeoRhythmmm
  ];
  
  let currentKeyIndex = 0;
  let client = new GoogleGenerativeAI(API_KEYS[currentKeyIndex]);
  let model = client.getGenerativeModel({ model: 'text-embedding-004' }); // 004 модель!
  
  const EMBEDDINGS_FILE = './embeddings_database.json';
  const PROGRESS_FILE = './processing_progress.json';
  const CHUNK_SIZE = 6000;
  const BASE_DELAY = 2000; // Всего 2 секунды - 004 позволяет!
  const MAX_RETRIES = 10;

  // Переключение API ключей
  function switchToNextKey() {
    currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
    const newKey = API_KEYS[currentKeyIndex];
    console.log(` Переключение на API ключ #${currentKeyIndex + 1}`);
    
    client = new GoogleGenerativeAI(newKey);
    model = client.getGenerativeModel({ model: 'text-embedding-004' });
    return newKey;
  }

  // Загрузка существующих данных
  async function loadExistingData() {
    let existingEmbeddings = [];
    let fileChunkCounts = {};
    
    try {
      const data = await fs.readFile(EMBEDDINGS_FILE, 'utf-8');
      existingEmbeddings = JSON.parse(data);
      
      // Учитываем только СТАРЫЕ эмбеддинги (768D)
      const old768Embeddings = existingEmbeddings.filter(emb => 
        emb.embedding && emb.embedding.length === 768
      );
      
      old768Embeddings.forEach(emb => {
        const fileName = path.basename(emb.source);
        fileChunkCounts[fileName] = (fileChunkCounts[fileName] || 0) + 1;
      });
      
      console.log(`✅ Загружено ${old768Embeddings.length} старых эмбеддингов (768D)`);
      console.log(` Обработанные файлы: ${Object.keys(fileChunkCounts).length}`);
      
      return { existingEmbeddings: old768Embeddings, fileChunkCounts };
    } catch (error) {
      console.log('ℹ️ Начинаем с нуля');
      return { existingEmbeddings: [], fileChunkCounts: {} };
    }
  }

  // Сканирование файлов (та же функция)
  async function collectTxtFiles(dir) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(
        entries.map(async (ent) => {
          const full = path.join(dir, ent.name);
          return ent.isDirectory() ? await collectTxtFiles(full) :
                 full.endsWith('.txt') ? [full] : [];
        })
      );
      return files.flat();
    } catch (error) {
      console.error(`❌ Ошибка сканирования папки ${dir}:`, error.message);
      return [];
    }
  }

  // Умное чанкование (та же функция)
  function createChunks(text, maxSize = CHUNK_SIZE) {
    if (text.length <= maxSize) {
      return [text];
    }
    const chunks = [];
    let currentPos = 0;
    while (currentPos < text.length) {
      let endPos = Math.min(currentPos + maxSize, text.length);
      // Попытка найти конец предложения или абзаца
      let chunk = text.substring(currentPos, endPos);
      let lastSentenceEnd = Math.max(chunk.lastIndexOf('.'), chunk.lastIndexOf('!'), chunk.lastIndexOf('?'));
      let lastParagraphEnd = chunk.lastIndexOf('\n\n');

      if (endPos < text.length && lastSentenceEnd > chunk.length * 0.8) { // Если конец предложения близко к концу чанка
        endPos = currentPos + lastSentenceEnd + 1;
      } else if (endPos < text.length && lastParagraphEnd > chunk.length * 0.8) { // Если конец абзаца близко
        endPos = currentPos + lastParagraphEnd + 2;
      }
      
      chunks.push(text.substring(currentPos, endPos));
      currentPos = endPos;
    }
    return chunks;
  }

  // Генерация эмбеддинга с text-embedding-004
  async function generateEmbedding004(text) {
    let attempts = 0;
    
    while (attempts < MAX_RETRIES) {
      attempts++;
      try {
        const result = await model.embedContent({
          content: { role: 'user', parts: [{ text: text }] }
        });
        return result.embedding.values;
      } catch (error) {
        console.error(`❌ Попытка ${attempts}/${MAX_RETRIES} не удалась: ${error.message}`);
        if (error.status === 429 || error.message.includes('rate limit') || error.message.includes('quota')) {
          console.warn(`🚦 Слишком много запросов. Переключение ключа и повторная попытка...`);
          switchToNextKey();
        } else if (error.message.includes('Failed to fetch') || error.code === 'ECONNRESET') {
          console.warn(`🌐 Сетевая ошибка. Повторная попытка...`);
        } else {
          // Для других ошибок, которые не являются rate limit или сетевыми, выбрасываем ошибку
          throw error;
        }
        
        if (attempts >= MAX_RETRIES) {
          throw new Error(`Не удалось создать эмбеддинг после ${MAX_RETRIES} попыток: ${error.message}`);
        }
        
        await delay(BASE_DELAY * attempts);
      }
    }
  }

  // Вспомогательная функция задержки
  async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Сохранение функций (те же)
  async function saveProgress(currentFileIndex, totalFiles, currentChunk, totalChunks, embeddingsCount) {
    const progressData = {
      currentFileIndex,
      totalFiles,
      currentChunk,
      totalChunks,
      embeddingsCount,
      model: 'text-embedding-004',
      currentApiKey: currentKeyIndex + 1,
      timestamp: new Date().toISOString(),
      percentage: Math.round((currentFileIndex / totalFiles) * 100)
    };
    
    await fs.writeFile(PROGRESS_FILE, JSON.stringify(progressData, null, 2));
  }

  async function saveEmbeddings(embeddings) {
    await fs.writeFile(EMBEDDINGS_FILE, JSON.stringify(embeddings, null, 2));
  }

  // ОСНОВНАЯ ЛОГИКА
  console.log(' Начало быстрой обработки с text-embedding-004...');
  console.log(` Доступно API ключей: ${API_KEYS.length}`);
  console.log(` Модель: text-embedding-004 (768D, быстрая)`);
  
  const { existingEmbeddings, fileChunkCounts } = await loadExistingData();
  const files = await collectTxtFiles('../GoogleAIStudio');
  
  if (files.length === 0) {
    console.log('❌ Файлы .txt не найдены');
    return;
  }

  console.log(` Найдено ${files.length} файлов`);
  
  let embeddings = [...existingEmbeddings];
  let processedFilesCount = Object.keys(fileChunkCounts).length;
  
  console.log(` Статус: ${processedFilesCount} файлов обработано, ${embeddings.length} эмбеддингов (768D)`);

  for (let i = 0; i < files.length; i++) {
    const filePath = files[i];
    const fileName = path.basename(filePath);

    if (fileChunkCounts[fileName]) {
      console.log(`⏭️ Пропускаем файл ${fileName} (уже обработан)`);
      continue;
    }

    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const chunks = createChunks(content);
      
      console.log(` Обработка файла ${i + 1}/${files.length}: ${fileName} (${chunks.length} чанков)`);

      for (let j = 0; j < chunks.length; j++) {
        const chunk = chunks[j];
        try {
          const embedding = await generateEmbedding004(chunk);
          embeddings.push({
            text: chunk,
            embedding: embedding,
            source: filePath,
            chunkIndex: j,
            timestamp: new Date().toISOString(),
            model: 'text-embedding-004'
          });
          
          console.log(`✅ Чанк ${j + 1}/${chunks.length} обработан`);

          // Промежуточное сохранение каждые 10 чанков
          if ((j + 1) % 10 === 0) {
            await saveEmbeddings(embeddings);
            await saveProgress(i, files.length, j + 1, chunks.length, embeddings.length);
            console.log(`💾 Прогресс сохранен (${embeddings.length} эмбеддингов)`);
          }

        } catch (chunkError) {
          console.error(`❌ Ошибка обработки чанка ${j + 1} в файле ${fileName}:`, chunkError.message);
          // Сохраняем прогресс даже при ошибке чанка
          await saveEmbeddings(embeddings);
          await saveProgress(i, files.length, j, chunks.length, embeddings.length);
          console.log(`💾 Прогресс сохранен после ошибки чанка (${embeddings.length} эмбеддингов)`);
          // Продолжаем со следующим чанком или файлом
        }
      }
      fileChunkCounts[fileName] = chunks.length; // Отмечаем файл как полностью обработанный
      processedFilesCount++;

      await saveEmbeddings(embeddings); // Сохраняем после каждого файла
      await saveProgress(i + 1, files.length, 0, 0, embeddings.length); // Обновляем прогресс файла
      console.log(`✅ Файл ${fileName} полностью обработан. Всего файлов: ${processedFilesCount}/${files.length}`);

    } catch (fileError) {
      console.error(`❌ Ошибка чтения или обработки файла ${fileName}:`, fileError.message);
      // Сохраняем прогресс при ошибке файла
      await saveEmbeddings(embeddings);
      await saveProgress(i, files.length, 0, 0, embeddings.length);
      console.log(`💾 Прогресс сохранен после ошибки файла (${embeddings.length} эмбеддингов)`);
    }
  }

  await saveEmbeddings(embeddings);
  await fs.unlink(PROGRESS_FILE).catch(() => {}); // Удаляем файл прогресса после завершения
  console.log(`🎉 Готово! Создано ${embeddings.length} эмбеддингов`);
}

// Обработка сигнала завершения (Ctrl+C)
process.on('SIGINT', async () => {
  console.log('\n Остановка. Прогресс сохранен.');
  process.exit(0);
});

createEmbeddings004().catch(console.error);
