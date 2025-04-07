import os
import uuid
import json
import re
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from tenacity import retry, stop_after_attempt, wait_fixed
from langchain_core.runnables import Runnable
from langchain_community.chat_models.openrouter import ChatOpenRouter
from datetime import datetime
from dotenv import load_dotenv

# Загрузка переменных окружения из .env файла
load_dotenv(override=True)

# Инициализация FastAPI
app = FastAPI()

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Подключение к MongoDB с повторами ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://neurocoderz:89611236486@localhost:27017/holograms_db?authSource=admin&retryWrites=true&w=majority")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "holograms_db")
db = None  # Will be initialized in startup event
client = None # MongoDB Client

@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
async def connect_to_mongo():
    global client, db
    print("Попытка подключения к MongoDB...")
    client = AsyncIOMotorClient(MONGO_URI)
    db = client[MONGO_DB_NAME]
    # Проверка подключения
    await db.command('ping')
    print(f"MongoDB ({MONGO_DB_NAME}@{MONGO_URI}) подключён успешно")

@app.on_event("startup")
async def startup_db_client():
    try:
        await connect_to_mongo()
    except Exception as e:
        print(f"Критическая ошибка подключения к MongoDB после нескольких попыток: {e}")
        # db останется None

@app.on_event("shutdown")
async def shutdown_db_client():
    if client:
        client.close()
        print("Соединение с MongoDB закрыто.")


# --- OpenRouter Модель ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
DEFAULT_MODEL = "openrouter/deepseek/deepseek-r1:free"

class OpenRouterChat(Runnable):
    def __init__(self, model: str, api_key: str):
        self.model = model
        self.api_key = api_key
        if not api_key:
            print("Warning: OpenRouter API key not found")
            self.client = None
        else:
            try:
                self.client = ChatOpenRouter(
                    model=self.model,
                    openrouter_api_key=self.api_key,
                    base_url="https://openrouter.ai/api/v1",
                    temperature=0.7,
                    max_tokens=500
                )
            except Exception as e:
                print(f"OpenRouter client error: {e}")
                self.client = None

    def invoke(self, prompt: str, **kwargs) -> str:
        if not self.client:
            return "Error: OpenRouter client not initialized"
        try:
            response = self.client.invoke(prompt)
            return response.content or "Model returned empty response"
        except Exception as e:
            return f"Error calling OpenRouter: {str(e)}"

chain = OpenRouterChat(model=DEFAULT_MODEL, api_key=OPENROUTER_API_KEY)

# --- Маршруты FastAPI ---

# Путь к директории frontend
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
INDEX_HTML_PATH = os.path.join(FRONTEND_DIR, 'index.html')

@app.get("/health")
async def health_check():
    try:
        if db is None: return {"status": "error", "detail": "MongoDB not connected"}
        await db.command('ping')
        return {"status": "ok", "mongo": "connected"}
    except Exception as e: return {"status": "error", "detail": f"MongoDB ping failed: {str(e)}"}

@app.get("/")
async def get_index():
    if os.path.exists(INDEX_HTML_PATH): return FileResponse(INDEX_HTML_PATH, media_type="text/html")
    raise HTTPException(status_code=404, detail="index.html not found")

# Эндпоинт для генерации
@app.post("/generate")
async def generate(request: Request):
    if db is None: raise HTTPException(status_code=503, detail="Нет подключения к базе данных")
    try:
        data = await request.json()
        prompt_text = data.get("prompt")
        model_type = data.get("model", DEFAULT_MODEL)
        if not prompt_text: raise HTTPException(status_code=400, detail="Промпт не предоставлен")

        # Update chain with requested model
        global chain
        if model_type != chain.model:
            chain = OpenRouterChat(model=model_type, api_key=OPENROUTER_API_KEY)

        prompt_with_instruction = (
            f"Based on the user request \"{prompt_text}\", generate a short JavaScript code snippet "
            f"using Three.js (assume 'scene' and 'mainSequencerGroup' variables exist) to achieve the goal. "
            f"Focus on modifying properties of 'mainSequencerGroup' or objects within it. "
            f"Return ONLY the JavaScript code block itself, like this:\n"
            f"```javascript\n// Your code\n```\n"
            f"Also provide a brief explanation BEFORE the code block."
        )
        result_text = chain.invoke(prompt_with_instruction)
        cleaned_result = result_text.strip()

        generated_code = None
        code_match = re.search(r'```javascript\s*(.*?)\s*```', cleaned_result, re.DOTALL | re.IGNORECASE)
        if code_match:
            generated_code = code_match.group(1).strip()
            cleaned_result = cleaned_result[:code_match.start()].strip()
            print(f"Найден JS-код:\n{generated_code}")
        else: print("Блок JS-кода не найден.")

        try: # Опциональное сохранение в БД
             db.responses.insert_one({ "prompt": prompt_text, "prompt_sent": prompt_with_instruction, "result": cleaned_result, "generated_code": generated_code, "model_used": model_type, "timestamp": datetime.now() })
        except Exception as db_error: print(f"Ошибка сохранения в db.responses: {db_error}")

        return {"result": cleaned_result, "generatedCode": generated_code}

    except Exception as e:
        print(f"Ошибка в /generate: {e}")
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

# Эндпоинты для версий
@app.post("/branches")
async def create_branch_version(request: Request):
    if db is None: raise HTTPException(status_code=503, detail="Нет подключения к базе данных")
    try:
        data = await request.json(); version_id = str(uuid.uuid4())
        branch = data.get("branch"); prompt = data.get("prompt")
        if not branch or not prompt: raise HTTPException(status_code=400, detail="Поля 'branch' и 'prompt' обязательны")

        await db.hologram_versions.insert_one({ # Используем await для motor
            "version_id": version_id, "branch": branch, "prompt": prompt,
            "model": data.get("model", "default"), "files": data.get("files", {}),
            "scene_state": data.get("scene_state", {}), "customData": data.get("customData", {}),
            "created_at": datetime.now()
        })
        return {"version_id": version_id}
    except Exception as e:
        print(f"Ошибка в POST /branches: {e}")
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

@app.get("/branches/{branch}")
async def get_branch_versions(branch: str):
    if db is None: raise HTTPException(status_code=503, detail="Нет подключения к базе данных")
    try:
        # --- ИСПРАВЛЕНИЕ ЗДЕСЬ ---
        cursor = db.hologram_versions.find(
            {"branch": branch},
            {"_id": 0, "version_id": 1, "branch": 1, "created_at": 1, "prompt": 1}
        ).sort("created_at", -1)
        versions = await cursor.to_list(length=None) # Используем await cursor.to_list()
        # -------------------------
        return {"versions": versions}
    except Exception as e:
        print(f"Ошибка в GET /branches/{branch}: {e}")
        # --- ИСПРАВЛЕНИЕ ЗДЕСЬ: Возвращаем правильный JSON или ошибку ---
        # return [{"error": f"Внутренняя ошибка сервера: {str(e)}"}, 500] # Неправильно
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")
        # ---------------------------------------------------------------

@app.put("/branches/{branch}/switch")
async def switch_branch_version(branch: str, request: Request):
    if db is None: raise HTTPException(status_code=503, detail="Нет подключения к базе данных")
    try:
        data = await request.json(); version_id = data.get("version_id")
        if not version_id: raise HTTPException(status_code=400, detail="Поле 'version_id' обязательно")

        version = await db.hologram_versions.find_one( # Используем await для motor
            {"branch": branch, "version_id": version_id},
            {"_id": 0, "scene_state": 1, "files": 1, "customData": 1}
        )
        if not version: raise HTTPException(status_code=404, detail="Версия не найдена")
        return version
    except Exception as e:
        print(f"Ошибка в PUT /branches/{branch}/switch: {e}")
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

# Монтируем статику ПОСЛЕ API
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=False), name="static_files_root")

# Запуск для локальной отладки (не используется сервисом)
if __name__ == "__main__":
    import uvicorn
    print("Запуск Uvicorn для локальной разработки...")
    # Запускаем приложение синхронно, т.к. Mongo подключается в startup event
    uvicorn.run("backend:app", host="0.0.0.0", port=3000, reload=True)
