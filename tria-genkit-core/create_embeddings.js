const path = require('path');
const fs = require('fs').promises;
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 🔥 ПРОСТОЙ СКРИПТ БЕЗ GENKIT - ТОЛЬКО ЭМБЕДДИНГИ
async function createEmbeddings() {
  const apiKey = 'AIzaSyBD7TCvB8z-WVdxKxNjy05E0Y1TfdRO23g';
  if (!apiKey) {
    throw new Error("API_KEY is not set.");
  }
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: 'gemini-embedding-exp-03-07' });

  // Сканирование файлов
  async function collectTxtFiles(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (ent) => {
        const full = path.join(dir, ent.name);
        return ent.isDirectory() ? await collectTxtFiles(full) :
               full.endsWith('.txt') ? [full] : [];
      })
    );
    return files.flat();
  }

  const files = await collectTxtFiles('../GoogleAIStudio');
  console.log(`🚀 Найдено ${files.length} файлов`);

  const embeddings = [];

  for (let i = 0; i < files.length; i++) {
    try {
      const content = await fs.readFile(files[i], 'utf-8');
      const chunks = content.match(/.{1,7000}/g) || [content];

      for (const chunk of chunks) {
        let retries = 3;
        let success = false;
        while (retries > 0 && !success) {
          try {
            const result = await model.embedContent({
              content: { role: 'user', parts: [{ text: chunk }] }
            });

            embeddings.push({
              text: chunk,
              embedding: result.embedding.values,
              source: files[i]
            });

            console.log(`✅ Обработан файл ${i + 1}/${files.length}`);
            success = true;
          } catch (error) {
            if (error.status === 429) {
              console.warn(`🚦 Слишком много запросов. Повторная попытка через ${6 - retries} секунд...`);
              await new Promise(resolve => setTimeout(resolve, (6 - retries) * 1000));
              retries--;
            } else {
              throw error;
            }
          }
        }
        if (!success) {
            console.error(`❌ Не удалось обработать чанк в файле ${files[i]} после нескольких попыток.`);
        }
      }
    } catch (error) {
      console.error(`❌ Ошибка в файле ${files[i]}:`, error);
    }
  }

  await fs.writeFile('embeddings_database.json', JSON.stringify(embeddings, null, 2));
  console.log(`🎉 Готово! Создано ${embeddings.length} эмбеддингов`);
}

// Запуск
createEmbeddings().catch(console.error);