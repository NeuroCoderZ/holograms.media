#!/usr/bin/env python3
"""
Улучшенный скрипт для дозаписи эмбеддингов с интеллектуальным обнаружением изменений
"""

import json
import os
import hashlib
import time
import logging
from pathlib import Path
from typing import Dict, List, Optional, Set
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

class EmbeddingGenerator:
    def __init__(self, config_path: str = "config.json"):
        """Инициализация генератора эмбеддингов"""
        self.config = self._load_config(config_path)
        self.api_keys = self._load_api_keys()
        self.current_key_index = 0
        self.file_hashes = {}
        self.processed_files = set()
        
        # Настройка API
        self._setup_api()
        
    def _load_config(self, config_path: str) -> dict:
        """Загрузка конфигурации"""
        default_config = {
            "chunk_size": 1000,
            "chunk_overlap": 200,
            "embedding_model": "models/embedding-001",
            "embedding_dimensionality": 768,
            "source_dir": "GoogleAIStudio",
            "output_file": "holographic_memory_v1.json",
            "file_hashes_cache": "file_hashes.json",
            "save_every": 10,
            "max_retries": 3,
            "retry_delay": 1.0,
            "supported_extensions": [".txt", ".md", ".py", ".js", ".json"]
        }
        
        if os.path.exists(config_path):
            try:
                with open(config_path, 'r', encoding='utf-8') as f:
                    user_config = json.load(f)
                default_config.update(user_config)
                logger.info(f"Конфигурация загружена из {config_path}")
            except Exception as e:
                logger.warning(f"Ошибка загрузки конфигурации: {e}. Используется по умолчанию.")
        
        return default_config
        
    def _load_api_keys(self) -> List[str]:
        """Унифицированная загрузка API-ключей"""
        api_keys = []
        
        # Пытаемся загрузить из api_keys.txt
        if os.path.exists("api_keys.txt"):
            try:
                with open("api_keys.txt", 'r', encoding='utf-8') as f:
                    api_keys = [line.strip() for line in f if line.strip()]
                logger.info(f"Загружено {len(api_keys)} API-ключей из api_keys.txt")
            except Exception as e:
                logger.error(f"Ошибка загрузки API-ключей: {e}")
        
        # Fallback на переменную окружения
        if not api_keys:
            env_key = os.getenv("GEMINI_API_KEY")
            if env_key:
                api_keys = [env_key]
                logger.info("Использован API-ключ из переменной окружения")
        
        if not api_keys:
            raise ValueError("Не найдены API-ключи! Создайте api_keys.txt или установите GEMINI_API_KEY")
            
        return api_keys
        
    def _setup_api(self):
        """Настройка API с текущим ключом"""
        if self.api_keys:
            genai.configure(api_key=self.api_keys[self.current_key_index])
            logger.info(f"Используется API-ключ #{self.current_key_index + 1}")
            
    def _rotate_api_key(self):
        """Ротация API-ключей при ошибках"""
        if len(self.api_keys) > 1:
            self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
            self._setup_api()
            logger.info(f"Переключение на API-ключ #{self.current_key_index + 1}")
            return True
        return False
        
    def _calculate_file_hash(self, file_path: str) -> str:
        """Вычисление хеша файла для отслеживания изменений"""
        hash_sha256 = hashlib.sha256()
        try:
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            return hash_sha256.hexdigest()
        except Exception as e:
            logger.error(f"Ошибка вычисления хеша для {file_path}: {e}")
            return ""
            
    def _load_file_hashes(self) -> Dict[str, str]:
        """Загрузка кеша хешей файлов"""
        cache_file = self.config["file_hashes_cache"]
        if os.path.exists(cache_file):
            try:
                with open(cache_file, 'r', encoding='utf-8') as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Ошибка загрузки кеша хешей: {e}")
        return {}
        
    def _save_file_hashes(self):
        """Сохранение кеша хешей файлов"""
        cache_file = self.config["file_hashes_cache"]
        try:
            with open(cache_file, 'w', encoding='utf-8') as f:
                json.dump(self.file_hashes, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Ошибка сохранения кеша хешей: {e}")
            
    def _detect_file_changes(self) -> Dict[str, str]:
        """Обнаружение новых/измененных файлов"""
        cached_hashes = self._load_file_hashes()
        current_hashes = {}
        changed_files = {}
        
        source_dir = Path(self.config["source_dir"])
        if not source_dir.exists():
            logger.error(f"Директория {source_dir} не существует")
            return {}
            
        # Сканируем все файлы
        for file_path in source_dir.rglob("*"):
            if file_path.is_file() and file_path.suffix in self.config["supported_extensions"]:
                rel_path = str(file_path.relative_to(source_dir))
                current_hash = self._calculate_file_hash(str(file_path))
                current_hashes[rel_path] = current_hash
                
                # Проверяем изменения
                if rel_path not in cached_hashes or cached_hashes[rel_path] != current_hash:
                    changed_files[rel_path] = str(file_path)
                    logger.info(f"Обнаружен {'новый' if rel_path not in cached_hashes else 'измененный'} файл: {rel_path}")
        
        # Обнаруживаем удаленные файлы
        deleted_files = set(cached_hashes.keys()) - set(current_hashes.keys())
        for deleted_file in deleted_files:
            logger.info(f"Файл удален: {deleted_file}")
            
        self.file_hashes = current_hashes
        return changed_files
        
    def _chunk_text(self, text: str, filename: str) -> List[Dict]:
        """Разбивка текста на чанки"""
        chunks = []
        chunk_size = self.config["chunk_size"]
        chunk_overlap = self.config["chunk_overlap"]
        
        if len(text) <= chunk_size:
            chunks.append({
                "text": text,
                "source": filename,
                "chunk_index": 0,
                "embedding": None
            })
        else:
            start = 0
            chunk_index = 0
            while start < len(text):
                end = start + chunk_size
                chunk_text = text[start:end]
                
                chunks.append({
                    "text": chunk_text,
                    "source": filename,
                    "chunk_index": chunk_index,
                    "embedding": None
                })
                
                start = end - chunk_overlap
                chunk_index += 1
                
        return chunks
        
    def _generate_embedding(self, text: str) -> Optional[List[float]]:
        """Генерация эмбеддинга с обработкой ошибок и ротацией ключей"""
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
                
                # Ротация ключей при ошибках квоты или авторизации
                if any(keyword in error_msg for keyword in ['quota', 'limit', 'rate', 'auth', 'key']):
                    if self._rotate_api_key():
                        continue
                        
                # Увеличиваем задержку между попытками
                if attempt < self.config["max_retries"] - 1:
                    time.sleep(self.config["retry_delay"] * (2 ** attempt))
                    
        logger.error(f"Не удалось сгенерировать эмбеддинг после {self.config['max_retries']} попыток")
        return None
        
    def _load_existing_data(self) -> Dict:
        """Загрузка существующих данных"""
        output_file = self.config["output_file"]
        if os.path.exists(output_file):
            try:
                with open(output_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                logger.info(f"Загружены существующие данные из {output_file}")
                return data
            except Exception as e:
                logger.error(f"Ошибка загрузки существующих данных: {e}")
                
        return {
            "metadata": {
                "created_at": datetime.now().isoformat(),
                "model": self.config["embedding_model"],
                "dimensionality": self.config["embedding_dimensionality"],
                "chunk_size": self.config["chunk_size"],
                "chunk_overlap": self.config["chunk_overlap"]
            },
            "chunks": []
        }
        
    def _save_data(self, data: Dict):
        """Сохранение данных"""
        output_file = self.config["output_file"]
        try:
            # Создаем резервную копию
            if os.path.exists(output_file):
                backup_file = f"{output_file}.backup"
                os.rename(output_file, backup_file)
                
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                
            logger.info(f"Данные сохранены в {output_file}")
            
        except Exception as e:
            logger.error(f"Ошибка сохранения данных: {e}")
            # Восстанавливаем из резервной копии
            backup_file = f"{output_file}.backup"
            if os.path.exists(backup_file):
                os.rename(backup_file, output_file)
                
    def process_files(self):
        """Основная функция обработки файлов"""
        logger.info("Начало обработки файлов")
        
        # Обнаруживаем изменения
        changed_files = self._detect_file_changes()
        
        if not changed_files:
            logger.info("Изменений в файлах не обнаружено")
            return
            
        # Загружаем существующие данные
        data = self._load_existing_data()
        
        # Удаляем старые чанки для измененных файлов
        existing_chunks = []
        for chunk in data["chunks"]:
            if chunk["source"] not in changed_files:
                existing_chunks.append(chunk)
        data["chunks"] = existing_chunks
        
        # Обрабатываем измененные файлы
        new_chunks = []
        for rel_path, full_path in changed_files.items():
            logger.info(f"Обработка файла: {rel_path}")
            
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                file_chunks = self._chunk_text(content, rel_path)
                new_chunks.extend(file_chunks)
                
            except Exception as e:
                logger.error(f"Ошибка чтения файла {rel_path}: {e}")
                continue
                
        # Генерируем эмбеддинги
        logger.info(f"Начинаем генерацию эмбеддингов для {len(new_chunks)} чанков")
        
        for i, chunk in enumerate(new_chunks):
            embedding = self._generate_embedding(chunk["text"])
            if embedding:
                chunk["embedding"] = embedding
                data["chunks"].append(chunk)
                
                if (i + 1) % self.config["save_every"] == 0:
                    self._save_data(data)
                    logger.info(f"Промежуточное сохранение: {i + 1}/{len(new_chunks)}")
                    
        # Финальное сохранение
        self._save_data(data)
        self._save_file_hashes()
        
        logger.info(f"Обработка завершена. Обработано {len(new_chunks)} чанков.")
        
def main():
    """Основная функция"""
    try:
        generator = EmbeddingGenerator()
        generator.process_files()
        
    except Exception as e:
        logger.error(f"Критическая ошибка: {e}")
        return 1
        
    return 0

if __name__ == "__main__":
    exit(main())
