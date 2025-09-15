const fs = require('fs');

//  ОБРАТНЫЙ СОРТИРОВЩИК: ОСТАВЛЯЕМ СТАРЫЕ, УДАЛЯЕМ НОВЫЕ
function reverseSortEmbeddings() {
  const INPUT_FILE = './embeddings_database.json';
  const OUTPUT_OLD_ONLY = './embeddings_old_768d_only.json';
  const OUTPUT_NEW_ARCHIVE = './embeddings_new_3072d_archive.json';
  
  console.log(' Обратная сортировка: оставляем старые (768D), архивируем новые (3072D)');
  
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ Файл ${INPUT_FILE} не найден!`);
    return;
  }
  
  const allEmbeddings = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(` Всего загружено: ${allEmbeddings.length} эмбеддингов`);
  
  const oldEmbeddings768D = [];
  const newEmbeddings3072D = [];
  const unknownEmbeddings = [];
  
  for (const emb of allEmbeddings) {
    if (!emb.embedding || !Array.isArray(emb.embedding)) {
      unknownEmbeddings.push(emb);
      continue;
    }
    
    const size = emb.embedding.length;
    
    if (size === 768) {
      oldEmbeddings768D.push(emb); // ОСТАВЛЯЕМ
    } else if (size === 3072) {
      newEmbeddings3072D.push(emb); // АРХИВИРУЕМ
    } else {
      unknownEmbeddings.push(emb);
    }
  }
  
  console.log('\n Результаты обратной сортировки:');
  console.log(`✅ Старых эмбеддингов (768D) оставляем: ${oldEmbeddings768D.length}`);
  console.log(` Новых эмбеддингов (3072D) архивируем: ${newEmbeddings3072D.length}`);
  console.log(`❓ Неизвестных эмбеддингов: ${unknownEmbeddings.length}`);
  
  // Сохранение результатов
  if (oldEmbeddings768D.length > 0) {
    fs.writeFileSync(OUTPUT_OLD_ONLY, JSON.stringify(oldEmbeddings768D, null, 2));
    console.log(`✅ Старые эмбеддинги сохранены: ${OUTPUT_OLD_ONLY}`);
  }
  
  if (newEmbeddings3072D.length > 0) {
    fs.writeFileSync(OUTPUT_NEW_ARCHIVE, JSON.stringify(newEmbeddings3072D, null, 2));
    console.log(` Новые эмбеддинги заархивированы: ${OUTPUT_NEW_ARCHIVE}`);
  }
  
  console.log('\n Для завершения замены выполните:');
  console.log(`mv ${OUTPUT_OLD_ONLY} ${INPUT_FILE}`);
  
  return {
    oldCount: oldEmbeddings768D.length,
    newCount: newEmbeddings3072D.length,
    unknownCount: unknownEmbeddings.length
  };
}

try {
  const results = reverseSortEmbeddings();
  console.log('\n Обратная сортировка завершена!');
} catch (error) {
  console.error('❌ Ошибка:', error.message);
}