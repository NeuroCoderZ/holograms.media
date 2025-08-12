#!/usr/bin/env python3
"""
fill_missing_embeddings.py

Скрипт для дозаписи недостающих эмбеддингов в файл holographic_memory_v1.json
с использованием Google Generative AI API и поддержкой ротации API-ключей.

Автор: Holographic Media Team
Версия: 1.0
"""

import json
import logging
import time
import os
from typing import List, Dict, Any, Optional
from pathlib import Path
import google.generativeai as genai
from google.generativeai.types import EmbedContentResponse
from google.api_core.exceptions import ResourceExhausted, GoogleAPIError
import sys

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('fill_embeddings.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class EmbeddingProcessor:
    """Основной класс для обработки эмбеддингов."""
    
    def __init__(self, 
                 input_file: str, 
                 api_keys_file: str = 'api_keys.txt',
                 batch_size: int = 100,
                 save_every: int = 1):
        """
        Инициализация процессора эмбеддингов.
        
        Args:
            input_file: Путь к файлу с данными
            api_keys_file: Файл с API-ключами
            batch_size: Размер батча для обработки
            save_every: Сохранять после каждых N батчей
        """
        self.input_file = Path(input_file)
        self.api_keys_file = Path(api_keys_file)
        self.batch_size = batch_size
        self.save_every = save_every
        
        # Загрузка API-ключей
        self.api_keys = self._load_api_keys()
        self.current_key_index = 0
        
        # Настройка начального API-ключа
        self._set_current_api_key()
        
        # Статистика
        self.total_records = 0
        self.missing_embeddings = 0
        self.processed_batches = 0
        self.failed_batches = 0
        
        logger.info(f"Инициализация завершена. Загружено {len(self.api_keys)} API-ключей")
    
    def _load_api_keys(self) -> List[str]:
        """Загрузка API-ключей из файла."""
        if not self.api_keys_file.exists():
            raise FileNotFoundError(f"Файл с API-ключами не найден: {self.api_keys_file}")
        
        with open(self.api_keys_file, 'r', encoding='utf-8') as f:
            keys = [line.strip() for line in f if line.strip()]
        
        if not keys:
            raise ValueError("Файл с API-ключами пуст")
        
        return keys
    
    def _set_current_api_key(self):
        """Установка текущего API-ключа."""
        current_key = self.api_keys[self.current_key_index]
        genai.configure(api_key=current_key)
        logger.info(f"Используется API-ключ с индексом {self.current_key_index}")
    
    def _rotate_api_key(self):
        """Ротация API-ключа при достижении лимита."""
        self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
        self._set_current_api_key()
        logger.warning(f"API-ключ ротирован. Используется индекс {self.current_key_index}")
    
    def _load_data(self) -> List[Dict[str, Any]]:
        """Загрузка данных из JSON-файла."""
        logger.info(f"Загрузка данных из файла: {self.input_file}")
        
        if not self.input_file.exists():
            raise FileNotFoundError(f"Входной файл не найден: {self.input_file}")
        
        with open(self.input_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        if not isinstance(data, list):
            raise ValueError("Данные в файле должны быть массивом")
        
        self.total_records = len(data)
        logger.info(f"Загружено {self.total_records} записей")
        
        return data
    
    def _save_data(self, data: List[Dict[str, Any]]):
        """Сохранение данных в JSON-файл."""
        logger.info(f"Сохранение данных в файл: {self.input_file}")
        
        # Создание резервной копии
        backup_file = self.input_file.with_suffix('.backup.json')
        if self.input_file.exists():
            self.input_file.replace(backup_file)
        
        try:
            with open(self.input_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            logger.info("Данные успешно сохранены")
        except Exception as e:
            logger.error(f"Ошибка сохранения данных: {e}")
            # Восстановление из резервной копии
            if backup_file.exists():
                backup_file.replace(self.input_file)
                logger.info("Данные восстановлены из резервной копии")
            raise
    
    def _find_missing_embeddings(self, data: List[Dict[str, Any]]) -> List[int]:
        """Поиск записей с пустыми эмбеддингами."""
        missing_indices = []
        
        for i, record in enumerate(data):
            embedding = record.get('embedding', [])
            if not embedding or len(embedding) == 0:
                missing_indices.append(i)
        
        self.missing_embeddings = len(missing_indices)
        logger.info(f"Найдено {self.missing_embeddings} записей с пустыми эмбеддингами")
        
        return missing_indices
    
    def _create_batches(self, indices: List[int]) -> List[List[int]]:
        """Создание батчей для обработки."""
        batches = []
        for i in range(0, len(indices), self.batch_size):
            batch = indices[i:i + self.batch_size]
            batches.append(batch)
        
        logger.info(f"Создано {len(batches)} батчей по {self.batch_size} записей")
        return batches
    
    def _generate_embeddings_batch(self, texts: List[str]) -> Optional[List[List[float]]]:
        """Генерация эмбеддингов для батча текстов."""
        max_retries = 3
        base_delay = 1.0
        
        for attempt in range(max_retries):
            try:
                # Вызов API для генерации эмбеддингов
                response = genai.embed_content(
                    model="models/gemini-embedding-001",
                    content=texts,
                    task_type="search_document",
                    output_dimensionality=3072
                )
                
                # Извлечение эмбеддингов из ответа
                embeddings = []
                if hasattr(response, 'embeddings'):
                    for emb in response.embeddings:
                        embeddings.append(emb.values)
                elif hasattr(response, 'embedding'):
                    # Для случая одного эмбеддинга
                    embeddings.append(response.embedding)
                else:
                    logger.error("Неожиданный формат ответа API")
                    return None
                
                if len(embeddings) != len(texts):
                    logger.error(f"Количество эмбеддингов ({len(embeddings)}) не совпадает с количеством текстов ({len(texts)})")
                    return None
                
                return embeddings
                
            except ResourceExhausted as e:
                logger.warning(f"Достигнут лимит квоты: {e}")
                self._rotate_api_key()
                
                # Задержка перед повторной попыткой
                delay = base_delay * (2 ** attempt)
                logger.info(f"Пауза {delay} секунд перед повторной попыткой...")
                time.sleep(delay)
                
            except GoogleAPIError as e:
                logger.error(f"Ошибка Google API (попытка {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    logger.info(f"Пауза {delay} секунд перед повторной попыткой...")
                    time.sleep(delay)
                else:
                    logger.error("Все попытки исчерпаны")
                    return None
                    
            except Exception as e:
                logger.error(f"Неожиданная ошибка (попытка {attempt + 1}): {e}")
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    time.sleep(delay)
                else:
                    return None
        
        return None
    
    def _process_batch(self, data: List[Dict[str, Any]], batch_indices: List[int]) -> bool:
        """Обработка одного батча."""
        # Извлечение текстов для эмбеддинга
        texts = []
        for idx in batch_indices:
            text = data[idx].get('text', '')
            if not text:
                logger.warning(f"Пустой текст в записи {idx}")
                text = "Пустой текст"
            texts.append(text)
        
        # Генерация эмбеддингов
        embeddings = self._generate_embeddings_batch(texts)
        
        if embeddings is None:
            logger.error(f"Не удалось сгенерировать эмбеддинги для батча")
            return False
        
        # Обновление данных
        for i, idx in enumerate(batch_indices):
            data[idx]['embedding'] = embeddings[i]
        
        return True
    
    def process(self):
        """Основной метод обработки."""
        logger.info("Начало обработки недостающих эмбеддингов")
        
        try:
            # Загрузка данных
            data = self._load_data()
            
            # Поиск записей с пустыми эмбеддингами
            missing_indices = self._find_missing_embeddings(data)
            
            if not missing_indices:
                logger.info("Все записи уже содержат эмбеддинги. Обработка не требуется.")
                return
            
            # Создание батчей
            batches = self._create_batches(missing_indices)
            
            logger.info(f"Начало обработки {len(batches)} батчей...")
            
            # Обработка каждого батча
            for batch_num, batch_indices in enumerate(batches, 1):
                logger.info(f"Обработка батча {batch_num}/{len(batches)} ({len(batch_indices)} записей)...")
                
                success = self._process_batch(data, batch_indices)
                
                if success:
                    self.processed_batches += 1
                    logger.info(f"Батч {batch_num} обработан успешно")
                else:
                    self.failed_batches += 1
                    logger.error(f"Ошибка обработки батча {batch_num}")
                    continue
                
                # Сохранение прогресса
                if batch_num % self.save_every == 0:
                    self._save_data(data)
                    logger.info(f"Прогресс сохранен после батча {batch_num}")
                
                # Небольшая пауза между батчами
                time.sleep(0.1)
            
            # Финальное сохранение
            self._save_data(data)
            
            # Статистика
            logger.info("=== ИТОГОВАЯ СТАТИСТИКА ===")
            logger.info(f"Всего записей: {self.total_records}")
            logger.info(f"Записей с пустыми эмбеддингами: {self.missing_embeddings}")
            logger.info(f"Успешно обработано батчей: {self.processed_batches}")
            logger.info(f"Неуспешных батчей: {self.failed_batches}")
            logger.info(f"Прогресс: {(self.processed_batches / len(batches) * 100):.1f}%")
            
        except Exception as e:
            logger.error(f"Критическая ошибка: {e}")
            raise


def main():
    """Главная функция."""
    # Путь к файлу с данными
    input_file = "/home/neurocoderz/Projects/Holograms.Media/GitHub/holograms.media-main/tria-genkit-core/holographic_memory_v1.json"
    
    # Проверка существования файла
    if not os.path.exists(input_file):
        logger.error(f"Файл не найден: {input_file}")
        return
    
    # Создание процессора
    processor = EmbeddingProcessor(
        input_file=input_file,
        api_keys_file='api_keys.txt',
        batch_size=100,
        save_every=1  # Сохранять после каждого батча
    )
    
    try:
        # Запуск обработки
        processor.process()
        logger.info("Обработка завершена успешно!")
        
    except KeyboardInterrupt:
        logger.info("Обработка прервана пользователем")
        
    except Exception as e:
        logger.error(f"Обработка завершена с ошибкой: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
