
import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
import sys

# Добавляем путь
sys.path.insert(0, str(Path(__file__).parent.parent))

# Загружаем настройки
env_path = Path(__file__).parent.parent / '.env.local'
load_dotenv(env_path)

from backend.tria_agents.tria_orchestrator import orchestrator

async def test_full_tria_response():
    query = "Как реализована работа с CWT анализатором в AudioWorklet?"
    print(f"🤖 Запрос к Триа: '{query}'\n")
    
    # Это вызов Оркестратора, который делает ВСЁ: 
    # 1. Понимает, что нужно искать в RAG
    # 2. Вызывает search_tria_knowledge (наш RAG)
    # 3. Берет результат и формирует ответ через Gemini 3 Flash
    try:
        response = await orchestrator.process_user_prompt(
            prompt=query,
            user_email=os.getenv("DEV_USERS", "").split(",")[0] # Берем первого дева
        )
        print("💡 Ответ Триа:")
        print(response)
    except Exception as e:
        print(f"❌ Ошибка: {e}")

if __name__ == "__main__":
    asyncio.run(test_full_tria_response())
