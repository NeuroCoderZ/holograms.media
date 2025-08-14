#!/usr/bin/env python3
"""
Скрипт для дозаписи недостающих эмбеддингов в файл holographic_memory_v1.json
с использованием Google Gemini API и поддержкой ротации API-ключей.

Автор: Holographic Media Team
Версия: 3.0 (Исправленная)
"""

import json
import time
import logging
import os
from typing import Dict, List, Optional
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
    """Основной класс для дозаписи эмбеддингов в существующий JSON-файл."""
    
    def __init__(self, config_path: str = "config.json"):
        """
        Инициализация процессора эмбеддингов.
        
        Args:
            config_path: Путь к файлу конфигурации.
        """
        self.config = self._load_config(config_path)
        self.api_keys = self._load_api_keys()
        self.current_key_index = 0
        
        # Настройка API
        self._setup_api()
        
    def _load_config(self, config_path: str) -> dict:
        """Загрузка конфигурации"""
        default_config = {
            "embedding_model": "gemini-embedding-001",  # ✅ Правильная модель
            "embedding_dimensionality": 3072,
            "output_file": "holographic_memory_v1.json",
            "batch_size": 100,
            "save_every": 1,
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
                logger.info(f"Используется модель: {default_config['embedding_model']}")
            except Exception as e:
                logger.warning(f"Ошибка загрузки конфигурации: {e}. Используется по умолчанию.")
        
        return default_config
        
    def _load_api_keys(self) -> List[str]:
        """Загрузка API-ключей из файла api_keys.txt."""
        api_keys = []
        api_keys_file = "api_keys.txt"
        
        if os.path.exists(api_keys_file):
            try:
                with open(api_keys_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#'):
                            api_keys.append(line)
                logger.info(f"Загружено {len(api_keys)} API-ключей из {api_keys_file}")
            except Exception as e:
                logger.error(f"Ошибка загрузки API-ключей: {e}")
        
        if not api_keys:
            env_key = os.getenv("GEMINI_API_KEY")
            if env_key:
                api_keys = [env_key]
                logger.info("Использован API-ключ из переменной окружения GEMINI_API_KEY")
        
        if not api_keys:
            raise ValueError("Не найдены API-ключи! Создайте api_keys.txt или установите GEMINI_API_KEY")
            
        return api_keys
        
    def _setup_api(self):
        """Настройка API с текущим ключом."""
        if self.api_keys:
            genai.configure(api_key=self.api_keys[self.current_key_index])
            logger.info(f"Используется API-ключ с индексом {self.current_key_index + 1}")
            
    def _rotate_api_key(self):
        """Ротация API-ключа при достижении лимита."""
        if len(self.api_keys) > 1:
            self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
            self._setup_api()
            logger.warning(f"API-ключ ротирован. Используется индекс {self.current_key_index + 1}")
            return True
        logger.error("Невозможно ротировать API-ключ: доступен только один ключ.")
        return False
        
    def _load_data(self) -> Dict:
        """Загрузка данных из JSON-файла."""
        output_file = self.config["output_file"]
        logger.info(f"Загрузка данных из файла: {output_file}")
        
        if not os.path.exists(output_file):
            raise FileNotFoundError(f"Входной файл не найден: {output_file}")
        
        try:
            with open(output_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Ошибка парсинга JSON файла {output_file}: {e}")
            raise
        
        if "chunks" not in data or not isinstance(data["chunks"], list):
            raise ValueError("JSON файл должен содержать ключ \"chunks\" с массивом.")
        
        logger.info(f"Загружено {len(data['chunks'])} чанков.")
        return data
    
    def _save_data(self, data: Dict):
        """Сохранение данных в JSON-файл с резервной копией."""
        output_file = self.config["output_file"]
        try:
            # Создание резервной копии
            backup_file = f"{output_file}.backup"
            if os.path.exists(output_file):
                os.rename(output_file, backup_file)
                
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.info(f"Данные успешно сохранены в {output_file}")
            
            # Удаление резервной копии после успешного сохранения
            if os.path.exists(backup_file):
                os.remove(backup_file)
                
        except Exception as e:
            logger.error(f"Ошибка сохранения данных: {e}")
            # Восстановление из резервной копии
            backup_file = f"{output_file}.backup"
            if os.path.exists(backup_file):
                os.rename(backup_file, output_file)
                logger.info("Данные восстановлены из резервной копии.")
            raise
    
    def _find_missing_embeddings_indices(self, data: Dict) -> List[int]:
        """Поиск индексов чанков с отсутствующими или пустыми эмбеддингами."""
        missing_indices = []
        for i, chunk_entry in enumerate(data["chunks"]):
            embedding = chunk_entry.get('embedding')
            if not embedding or (isinstance(embedding, list) and len(embedding) == 0):
                missing_indices.append(i)
        logger.info(f"Найдено {len(missing_indices)} чанков с отсутствующими эмбеддингами.")
        return missing_indices
    
    def _generate_embedding_for_chunk(self, text: str) -> Optional[List[float]]:
        """Генерация эмбеддинга для одного текстового чанка."""
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
                
                # Проверка на ошибки лимитов и авторизации
                if any(keyword in error_msg for keyword in ['quota', 'limit', 'rate', 'auth', 'key', 'resource exhausted']):
                    if self._rotate_api_key():
                        continue
                
                if attempt < self.config["max_retries"] - 1:
                    delay = self.config["retry_delay"] * (2 ** attempt)
                    logger.info(f"Пауза {delay:.1f} секунд перед повторной попыткой...")
                    time.sleep(delay)
                else:
                    logger.error(f"Не удалось сгенерировать эмбеддинг после {self.config['max_retries']} попыток.")
                    return None
        return None

    def fill_embeddings(self):  # ✅ Исправлено: добавлен параметр self
        """Основной метод для дозаписи эмбеддингов."""
        logger.info("Начало дозаписи недостающих эмбеддингов.")
        
        try:
            data = self._load_data()
            missing_indices = self._find_missing_embeddings_indices(data)
            
            if not missing_indices:
                logger.info("Все чанки уже содержат эмбеддинги. Дозапись не требуется.")
                return
            
            total_missing = len(missing_indices)
            processed_count = 0
            
            logger.info(f"Начинаем обработку {total_missing} недостающих эмбеддингов...")
            
            for i, chunk_index in enumerate(missing_indices):
                chunk_entry = data["chunks"][chunk_index]
                text_to_embed = chunk_entry.get("text")
                
                if not text_to_embed:
                    logger.warning(f"Чанк {chunk_index} не содержит текста. Пропускаем.")
                    continue
                
                logger.info(f"Обрабатываем чанк {chunk_index} ({i+1}/{total_missing})...")
                embedding = self._generate_embedding_for_chunk(text_to_embed)
                
                if embedding:
                    chunk_entry["embedding"] = embedding
                    chunk_entry["timestamp"] = datetime.now().isoformat()
                    processed_count += 1
                    logger.info(f"✅ [{processed_count}/{total_missing}] Эмбеддинг для чанка {chunk_index} сгенерирован.")
                    
                    # Сохранение после каждого успешного эмбеддинга
                    if processed_count % self.config["save_every"] == 0:
                        self._save_data(data)
                        logger.info(f"💾 Промежуточное сохранение после {processed_count} чанков.")
                else:
                    logger.error(f"❌ Не удалось сгенерировать эмбеддинг для чанка {chunk_index}. Пропускаем.")
                
                # Небольшая пауза между запросами
                time.sleep(0.1)
            
            # Финальное сохранение
            self._save_data(data)
            logger.info(f"🎉 Дозапись завершена! Успешно обработано {processed_count} из {total_missing} недостающих эмбеддингов.")
            
        except Exception as e:
            logger.error(f"Критическая ошибка в процессе дозаписи: {e}")
            raise

def main():
    """Главная функция."""
    try:
        logger.info("🚀 Запуск процесса дозаписи эмбеддингов...")
        filler = EmbeddingFiller()
        filler.fill_embeddings()
        logger.info("✅ Процесс завершен успешно!")
        
    except KeyboardInterrupt:
        logger.info("⚠️ Дозапись прервана пользователем.")
        
    except Exception as e:
        logger.error(f"💥 Дозапись завершена с ошибкой: {e}")
        exit(1)

if __name__ == "__main__":
    main()
