#!/usr/bin/env python3
"""
Скрипт для дозаписи недостающих эмбеддингов в файл holographic_memory_v1.json
с поддержкой формата массива (созданного create_modern_embeddings.js)

Автор: Holographic Media Team
Версия: 4.0 (Адаптирован для формата массива)
"""

import json
import time
import logging
import os
from typing import List, Optional
import google.generativeai as genai
from datetime import datetime

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('embedding_generation.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class EmbeddingFiller:
    """Класс для дозаписи эмбеддингов в JSON-массив."""
    
    def __init__(self, config_path: str = "config.json"):
        self.config = self._load_config(config_path)
        self.api_keys = self._load_api_keys()
        self.current_key_index = 0
        self._setup_api()
        
    def _load_config(self, config_path: str) -> dict:
        """Загрузка конфигурации"""
        default_config = {
            "embedding_model": "gemini-embedding-001",
            "embedding_dimensionality": 3072,
            "output_file": "holographic_memory_v1.json",
            "save_every": 50,  # Сохранять каждые 50 эмбеддингов
            "max_retries": 3,
            "retry_delay": 1.0
        }
        
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                # Принудительно устанавливаем правильную модель
                user_config["embedding_model"] = "gemini-embedding-001"
                default_config.update(user_config)
                logger.info(f"Конфигурация загружена из {config_path}")
            except Exception as e:
                logger.warning(f"Ошибка загрузки конфигурации: {e}")
        
        return default_config
        
    def _load_api_keys(self) -> List[str]:
        """Загрузка API-ключей"""
        api_keys = []
        
        if os.path.exists("api_keys.txt"):
            try:
                with open("api_keys.txt", 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#'):
                            api_keys.append(line)
                logger.info(f"Загружено {len(api_keys)} API-ключей")
            except Exception as e:
                logger.error(f"Ошибка загрузки API-ключей: {e}")
        
        if not api_keys:
            env_key = os.getenv("GEMINI_API_KEY")
            if env_key:
                api_keys = [env_key]
                logger.info("Использован API-ключ из переменной окружения")
        
        if not api_keys:
            raise ValueError("Не найдены API-ключи!")
            
        return api_keys
        
    def _setup_api(self):
        """Настройка API"""
        genai.configure(api_key=self.api_keys[self.current_key_index])
        logger.info(f"Используется API-ключ #{self.current_key_index + 1}")
            
    def _rotate_api_key(self):
        """Ротация API-ключа"""
        if len(self.api_keys) > 1:
            self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
            self._setup_api()
            logger.warning(f"API-ключ ротирован на #{self.current_key_index + 1}")
            return True
        return False
        
    def _load_data(self) -> List[dict]:
        """Загрузка данных из JSON-файла (формат массива)"""
        output_file = self.config["output_file"]
        logger.info(f"Загрузка данных из файла: {output_file}")
        
        if not os.path.exists(output_file):
            raise FileNotFoundError(f"Файл не найден: {output_file}")
        
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Ошибка парсинга JSON: {e}")
            raise
        
        if not isinstance(data, list):
            raise ValueError("JSON файл должен содержать массив записей")
        
        logger.info(f"Загружено {len(data)} записей")
        return data
    
    def _save_data(self, data: List[dict]):
        """Сохранение данных с резервной копией"""
        output_file = self.config["output_file"]
        try:
            # Создание резервной копии
            backup_file = f"{output_file}.backup"
            if os.path.exists(output_file):
                os.rename(output_file, backup_file)
                
            # Сохранение с отступами для читаемости
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            
            logger.info(f"Данные сохранены в {output_file}")
            
            # Удаление резервной копии после успешного сохранения
            if os.path.exists(backup_file):
                os.remove(backup_file)
                
        except Exception as e:
            logger.error(f"Ошибка сохранения: {e}")
            # Восстановление из резервной копии
            backup_file = f"{output_file}.backup"
            if os.path.exists(backup_file):
                os.rename(backup_file, output_file)
                logger.info("Данные восстановлены из резервной копии")
            raise
    
    def _find_missing_embeddings(self, data: List[dict]) -> List[int]:
        """Поиск записей с пустыми эмбеддингами"""
        missing_indices = []
        
        for i, record in enumerate(data):
            embedding = record.get('embedding')
            if not embedding or (isinstance(embedding, list) and len(embedding) == 0):
                missing_indices.append(i)
        
        logger.info(f"Найдено {len(missing_indices)} записей с пустыми эмбеддингами")
        return missing_indices
    
    def _generate_embedding(self, text: str) -> Optional[List[float]]:
        """Генерация эмбеддинга"""
        for attempt in range(self.config["max_retries"]):
            try:
                response = genai.embed_content(
                    model=self.config["embedding_model"],
                    content=text,
                    task_type="retrieval_document"
                )
                return response['embedding']
                
            except Exception as e:
                error_msg = str(e).lower()
                logger.warning(f"Ошибка генерации эмбеддинга (попытка {attempt + 1}): {e}")
                
                # Проверка на ошибки лимитов
                if any(keyword in error_msg for keyword in 
                       ['quota', 'limit', 'rate', 'auth', 'key', 'resource exhausted', '429']):
                    if self._rotate_api_key():
                        continue
                
                if attempt < self.config["max_retries"] - 1:
                    delay = self.config["retry_delay"] * (2 ** attempt)
                    logger.info(f"Пауза {delay:.1f} секунд...")
                    time.sleep(delay)
                    
        logger.error("Не удалось сгенерировать эмбеддинг")
        return None

    def fill_embeddings(self):
        """Основной метод дозаписи эмбеддингов"""
        logger.info("🚀 Начало дозаписи эмбеддингов")
        
        try:
            data = self._load_data()
            missing_indices = self._find_missing_embeddings(data)
            
            if not missing_indices:
                logger.info("✅ Все записи уже содержат эмбеддинги")
                return
            
            total_missing = len(missing_indices)
            processed_count = 0
            
            logger.info(f"📊 Начинаем обработку {total_missing} недостающих эмбеддингов")
            
            for i, record_index in enumerate(missing_indices):
                record = data[record_index]
                text = record.get("text", "")
                
                if not text:
                    logger.warning(f"⚠️ Запись {record_index} не содержит текста")
                    continue
                
                logger.info(f"🔄 Обрабатываем запись {record_index} ({i+1}/{total_missing})")
                
                embedding = self._generate_embedding(text)
                
                if embedding:
                    record["embedding"] = embedding
                    record["timestamp"] = datetime.now().isoformat()
                    processed_count += 1
                    
                    logger.info(f"✅ [{processed_count}/{total_missing}] Эмбеддинг для записи {record_index} создан")
                    
                    # Периодическое сохранение
                    if processed_count % self.config["save_every"] == 0:
                        self._save_data(data)
                        logger.info(f"💾 Промежуточное сохранение: {processed_count} записей")
                else:
                    logger.error(f"❌ Не удалось создать эмбеддинг для записи {record_index}")
                
                # Небольшая пауза между запросами
                time.sleep(0.1)
            
            # Финальное сохранение
            self._save_data(data)
            logger.info(f"🎉 Дозапись завершена! Обработано {processed_count} из {total_missing} записей")
            
        except Exception as e:
            logger.error(f"💥 Критическая ошибка: {e}")
            raise

def main():
    """Главная функция"""
    try:
        logger.info("🚀 Запуск процесса дозаписи эмбеддингов")
        filler = EmbeddingFiller()
        filler.fill_embeddings()
        logger.info("✅ Процесс завершен успешно!")
        
    except KeyboardInterrupt:
        logger.info("⚠️ Процесс прерван пользователем")
        
    except Exception as e:
        logger.error(f"💥 Ошибка: {e}")
        exit(1)

if __name__ == "__main__":
    main()
