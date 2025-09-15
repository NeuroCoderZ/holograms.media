import json
import sqlite3
import numpy as np
import os
from pathlib import Path

def migrate_embeddings_to_sqlite(json_file: str, db_file: str):
    """
    Конвертирует большой JSON-файл с эмбеддингами в оптимизированную базу данных SQLite,
    включая FTS5-индекс для быстрого текстового поиска.
    """
    print(f"Начинаем миграцию из '{json_file}' в '{db_file}'...")

    # Убедимся, что целевая директория существует
    db_path = Path(db_file)
    db_dir = db_path.parent
    db_dir.mkdir(parents=True, exist_ok=True)
    print(f"Целевая директория '{db_dir}' проверена/создана.")

    # 1. Создаем соединение с SQLite
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()

    # 2. Определяем схему таблицы в соответствии с планом
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS holographic_memory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            embedding BLOB NOT NULL,
            source TEXT,
            timestamp TEXT,
            agentContext TEXT,
            semanticTags TEXT,
            holographicMetadata TEXT
        )
    ''')
    print("Схема таблицы 'holographic_memory' создана/проверена.")

    # 3. Создаем виртуальную таблицу FTS5 для полнотекстового поиска
    cursor.execute('''
        DROP TABLE IF EXISTS memory_fts;
    ''')
    cursor.execute('''
        CREATE VIRTUAL TABLE memory_fts USING fts5(
            text,
            source,
            semanticTags,
            content='holographic_memory',
            content_rowid='id'
        );
    ''')
    print("Виртуальная таблица 'memory_fts' для поиска создана.")

    # 4. Читаем исходный JSON-файл
    print("Загрузка данных из JSON-файла...")
    with open(json_file, 'r', encoding='utf-8') as f:
        embeddings_data = json.load(f)

    total_records = len(embeddings_data)
    print(f"Загружено {total_records} записей из JSON.")

    # 5. Вставляем данные партиями (batch-режим)
    batch_size = 1000
    
    for i in range(0, total_records, batch_size):
        batch_records = embeddings_data[i:i+batch_size]
        batch_values = []

        for record in batch_records:
            # Конвертируем список embedding в numpy-массив, а затем в бинарный BLOB
            embedding_blob = np.array(record.get('embedding', []), dtype=np.float32).tobytes()

            # Готовим кортеж данных для вставки
            batch_values.append((
                record.get('text', ''),
                embedding_blob,
                record.get('source', ''),
                str(record.get('timestamp', '')), # Убедимся, что timestamp это строка
                json.dumps(record.get('agentContext', {})),
                json.dumps(record.get('semanticTags', [])),
                json.dumps(record.get('holographicMetadata', {}))
            ))

        cursor.executemany('''
            INSERT INTO holographic_memory
            (text, embedding, source, timestamp, agentContext, semanticTags, holographicMetadata)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', batch_values)
        
        print(f"Обработано {i + len(batch_records)} / {total_records} записей...")

    # Заполняем FTS-таблицу после вставки всех данных
    print("Заполнение FTS-индекса...")
    cursor.execute('''
        INSERT INTO memory_fts(rowid, text, source, semanticTags)
        SELECT id, text, source, semanticTags FROM holographic_memory;
    ''')
    print("FTS-индекс заполнен.")

    # 6. Создаем индексы для часто запрашиваемых полей
    print("Создание индексов для 'source' и 'timestamp' для ускорения запросов...")
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_source ON holographic_memory(source)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_timestamp ON holographic_memory(timestamp)')
    print("Индексы успешно созданы.")

    # 7. Фиксируем финальные изменения и закрываем соединение
    conn.commit()
    conn.close()

    print(f"\n✅ Миграция завершена! База данных создана по пути: {db_file}")
    print(f"Всего перенесено записей: {total_records}")


if __name__ == "__main__":
    # Определяем пути относительно корня проекта
    project_root = Path(__file__).parent.parent
    json_input_file = project_root / 'tria-genkit-core' / 'holographic_memory_v1.json'
    sqlite_output_file = project_root / 'frontend' / 'public' / 'data' / 'holographic_memory.db'

    # Проверяем, что исходный файл существует, перед началом работы
    if not json_input_file.exists():
        print(f"❌ ОШИБКА: Исходный JSON-файл не найден по пути '{json_input_file}'")
        print("Пожалуйста, убедитесь, что файл существует и скрипт запускается из корневой директории проекта.")
    else:
        migrate_embeddings_to_sqlite(str(json_input_file), str(sqlite_output_file))
