
import os
from pathlib import Path
from dotenv import load_dotenv

# ВАЖНО: Загружаем env ПЕРВЫМ ДЕЛОМ
env_path = Path(__file__).parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment from {env_path}")

# Теперь импортируем настройки
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from backend.core.config import settings

print(f"📡 Astra DB ID: {settings.ASTRA_DB_ID}")
print(f"📡 Astra DB Endpoint: {settings.ASTRA_DB_API_ENDPOINT}")
print(f"📡 Astra DB Keyspace: {settings.ASTRA_DB_KEYSPACE}")
print(f"🔑 Google API Key: {'Set' if settings.GOOGLE_API_KEY else 'NOT SET'}")

import asyncio
from backend.tria_agents.tria_rag_service import tria_rag

async def test_rag():
    print("\n🔍 Testing RAG query: 'Что такое архитектура проекта?'")
    try:
        context = await tria_rag.get_relevant_context("Что такое архитектура проекта?", limit=3)
        
        if context:
            print("\n✅ Успех! Найден релевантный контекст:")
            print("-" * 30)
            print(context[:1000] + "...")
            print("-" * 30)
        else:
            print("\n❌ Контекст не найден. Возможно, база пуста или similarity слишком низкий.")
    except Exception as e:
        print(f"\n❌ Ошибка во время теста: {e}")

if __name__ == "__main__":
    asyncio.run(test_rag())
