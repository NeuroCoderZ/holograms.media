
import os
from pathlib import Path
from dotenv import load_dotenv
import asyncio
import sys

# Загружаем настройки
env_path = Path(__file__).parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(env_path)

sys.path.insert(0, str(Path(__file__).parent.parent))
from backend.tria_agents.tria_rag_service import tria_rag

async def test_rag():
    query = "Как реализована работа с CWT анализатором в AudioWorklet?"
    print(f"\n🔍 Testing RAG query: '{query}'")
    
    try:
        context = await tria_rag.get_relevant_context(query, limit=3)
        
        if context:
            print("\n✅ Успех! Найден технический контекст:")
            print("-" * 30)
            print(context)
            print("-" * 30)
        else:
            print("\n❌ Контекст не найден.")
    except Exception as e:
        print(f"\n❌ Ошибка: {e}")

if __name__ == "__main__":
    asyncio.run(test_rag())
