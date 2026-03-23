
import os
from pathlib import Path
from dotenv import load_dotenv

# ВАЖНО: Загружаем env ДО импорта сервисов
env_path = Path(__file__).parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(env_path)
    print(f"✅ Loaded environment from {env_path}")
else:
    print(f"⚠️ {env_path} not found!")

# Теперь можно импортировать
import asyncio
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from backend.tria_agents.tria_rag_service import tria_rag

async def test_rag():
    print(f"🔑 Google API Key loaded: {'Yes' if os.getenv('GOOGLE_API_KEY') else 'No'}")
    print("🔍 Testing RAG query: 'Что такое архитектура проекта?'")
    
    context = await tria_rag.get_relevant_context("Что такое архитектура проекта?", limit=3)
    
    if context:
        print("\n✅ Успех! Найден релевантный контекст из tria_knowledge_gemini:")
        print("-" * 30)
        print(context[:1500] + "...")
        print("-" * 30)
    else:
        print("\n❌ Контекст не найден. Проверьте содержимое коллекции или similarity threshold.")

if __name__ == "__main__":
    asyncio.run(test_rag())
