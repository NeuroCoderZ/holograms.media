#!/usr/bin/env python3
"""
fix_and_continue_embeddings.py

Скрипт для восстановления поврежденного JSON файла из backup
и продолжения дозаписи эмбеддингов безопасным способом.
"""

import json
import os
import shutil
import time
import logging
from typing import List, Dict, Optional
from datetime import datetime
import google.generativeai as genai

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fix_embeddings.log'),
        logging.StreamHandler()
    ]
)
log = logging.getLogger(__name__)

# Конфигурация
JSON_FILE = "holographic_memory_v1.json"
BACKUP_FILE = "holographic_memory_v1.json.backup"
API_KEYS_FILE = "api_keys.txt"
BATCH_SIZE = 50  # Уменьшено для стабильности
SAVE_EVERY = 100  # Сохранять каждые 100 записей
MAX_RETRIES = 3
RETRY_DELAY = 2.0

class SafeEmbeddingFixer:
    def __init__(self):
        self.api_keys = self._load_api_keys()
        self.current_key_index = 0
        self._setup_api()
        
    def _load_api_keys(self) -> List[str]:
        """Загрузка API-ключей"""
        if os.path.exists(API_KEYS_FILE):
            with open(API_KEYS_FILE, 'r') as f:
                keys = [line.strip() for line in f if line.strip()]
            log.info(f"Загружено {len(keys)} API-ключей")
            return keys
        raise ValueError("Файл api_keys.txt не найден!")
    
    def _setup_api(self):
        """Настройка API"""
        genai.configure(api_key=self.api_keys[self.current_key_index])
        log.info(f"Используется API-ключ #{self.current_key_index + 1}")
    
    def _rotate_api_key(self) -> bool:
        """Ротация API-ключа"""
        if len(self.api_keys) > 1:
            self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
            self._setup_api()
            log.warning(f"Переключение на API-ключ #{self.current_key_index + 1}")
            return True
        return False
    
    def restore_from_backup(self) -> bool:
        """Восстановление основного файла из backup"""
        if not os.path.exists(BACKUP_FILE):
            log.error("Backup файл не найден!")
            return False
        
        try:
            log.info("🔄 Восстановление из backup файла...")
            
            # Проверяем целостность backup
            with open(BACKUP_FILE, 'r', encoding='utf-8') as f:
                backup_data = json.load(f)
            
            log.info(f"✅ Backup файл валиден, содержит {len(backup_data)} записей")
            
            # Создаем новый backup текущего состояния
            if os.path.exists(JSON_FILE):
                shutil.copy2(JSON_FILE, f"{JSON_FILE}.corrupted")
                log.info("Поврежденный файл сохранен как .corrupted")
            
            # Восстанавливаем из backup
            shutil.copy2(BACKUP_FILE, JSON_FILE)
            log.info("✅ Файл восстановлен из backup")
            return True
            
        except Exception as e:
            log.error(f"Ошибка восстановления из backup: {e}")
            return False
    
    def _safe_save(self, data: List[Dict]) -> bool:
        """Безопасное сохранение с atomic write"""
        temp_file = f"{JSON_FILE}.tmp"
        
        try:
            # Записываем во временный файл
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            # Создаем backup текущего состояния
            if os.path.exists(JSON_FILE):
                shutil.copy2(JSON_FILE, BACKUP_FILE)
            
            # Атомарная замена
            os.replace(temp_file, JSON_FILE)
            log.info("💾 Данные безопасно сохранены")
            return True
            
        except Exception as e:
            log.error(f"Ошибка сохранения: {e}")
            if os.path.exists(temp_file):
                os.remove(temp_file)
            return False
    
    def _generate_embedding_batch(self, texts: List[str]) -> Optional[List[List[float]]]:
        """Генерация batch эмбеддингов"""
        for attempt in range(MAX_RETRIES):
            try:
                if len(texts) == 1:
                    # Для одного текста
                    response = genai.embed_content(
                        model="gemini-embedding-001",
                        content=texts[0],
                        task_type="retrieval_document"
                    )
                    return [response['embedding']]
                else:
                    # Для batch
                    response = genai.embed_content(
                        model="gemini-embedding-001",
                        content=texts,
                        task_type="retrieval_document"
                    )
                    return [emb['values'] for emb in response['embeddings']]
                    
            except Exception as e:
                error_msg = str(e).lower()
                log.warning(f"Ошибка генерации batch (попытка {attempt + 1}): {e}")
                
                if any(keyword in error_msg for keyword in ['quota', 'limit', 'rate', '429']):
                    if self._rotate_api_key():
                        continue
                
                if attempt < MAX_RETRIES - 1:
                    delay = RETRY_DELAY * (2 ** attempt)
                    log.info(f"Пауза {delay:.1f} секунд...")
                    time.sleep(delay)
        
        return None
    
    def process_missing_embeddings(self):
        """Основной процесс дозаписи эмбеддингов"""
        log.info("🚀 Начало процесса дозаписи эмбеддингов")
        
        # Загружаем данные
        with open(JSON_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        log.info(f"📊 Всего записей: {len(data)}")
        
        # Находим пустые эмбеддинги
        missing_indices = []
        for i, record in enumerate(data):
            embedding = record.get('embedding', [])
            if not embedding or len(embedding) == 0:
                missing_indices.append(i)
        
        if not missing_indices:
            log.info("✅ Все эмбеддинги уже заполнены")
            return
        
        log.info(f"🔍 Найдено {len(missing_indices)} записей без эмбеддингов")
        
        processed = 0
        failed = 0
        
        # Обрабатываем по одной записи для максимальной надежности
        for i, record_idx in enumerate(missing_indices):
            record = data[record_idx]
            text = record.get('text', '')
            
            if not text:
                log.warning(f"Пустой текст в записи {record_idx}")
                continue
            
            log.info(f"🔄 Обрабатываем запись {record_idx} ({i+1}/{len(missing_indices)})")
            
            # Генерируем эмбеддинг
            embeddings = self._generate_embedding_batch([text])
            
            if embeddings and len(embeddings) > 0:
                record['embedding'] = embeddings[0]
                record['timestamp'] = datetime.now().isoformat()
                processed += 1
                
                log.info(f"✅ Эмбеддинг создан для записи {record_idx}")
                
                # Сохраняем каждые SAVE_EVERY записей
                if processed % SAVE_EVERY == 0:
                    if self._safe_save(data):
                        log.info(f"💾 Сохранено после {processed} записей")
                    else:
                        log.error("❌ Ошибка сохранения! Прерываем процесс")
                        break
            else:
                failed += 1
                log.error(f"❌ Не удалось создать эмбеддинг для записи {record_idx}")
                
                # Если много неудач подряд - останавливаемся
                if failed >= 10:
                    log.error("Слишком много неудач. Останавливаем процесс")
                    break
            
            # Небольшая пауза между запросами
            time.sleep(0.2)
        
        # Финальное сохранение
        if self._safe_save(data):
            log.info(f"🎉 Процесс завершен! Обработано: {processed}, неудач: {failed}")
        else:
            log.error("❌ Ошибка финального сохранения!")

def main():
    """Главная функция"""
    fixer = SafeEmbeddingFixer()
    
    # Этап 1: Восстановление из backup
    if not fixer.restore_from_backup():
        log.error("Не удалось восстановить файл из backup")
        return
    
    # Этап 2: Дозапись эмбеддингов
    try:
        fixer.process_missing_embeddings()
        log.info("✅ Все операции завершены успешно")
    except KeyboardInterrupt:
        log.info("⚠️ Процесс прерван пользователем")
    except Exception as e:
        log.error(f"💥 Критическая ошибка: {e}")

if __name__ == "__main__":
    main()
