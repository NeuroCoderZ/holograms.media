"""
scripts/migrate_gemini_embeddings.py

Запуск миграции Gemini Embedding 2 с использованием GOOGLE_API_KEY из .env.local

Использование:
    python scripts/migrate_gemini_embeddings.py
    
Скрипт автоматически:
1. Читает GOOGLE_API_KEY из .env.local
2. Подключается к AstraDB
3. Создает новую коллекцию tria_knowledge_gemini (1536d)
4. Парсит repomix-context.xml
5. Генерирует эмбеддинги через Gemini Embedding 2
6. Сохраняет в AstraDB
"""

import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# Загружаем .env.local
env_path = Path(__file__).parent.parent / '.env.local'
print(f"📖 Loading .env.local from: {env_path}")
load_dotenv(env_path)

GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY')
if not GOOGLE_API_KEY:
    print("❌ GOOGLE_API_KEY not found in .env.local!")
    print("Please add: GOOGLE_API_KEY=your_key_here")
    sys.exit(1)

print(f"✅ GOOGLE_API_KEY loaded (length: {len(GOOGLE_API_KEY)})")

# Добавляем backend в path для импортов
sys.path.insert(0, str(Path(__file__).parent.parent / 'backend'))

# Импортируем основной скрипт миграции
from scripts.migrate_to_gemini_embedding2 import migrate_to_gemini

if __name__ == '__main__':
    print("🚀 Starting Gemini Embedding 2 Migration...")
    print(f"📁 Using .env.local from: {env_path}")
    asyncio.run(migrate_to_gemini())
