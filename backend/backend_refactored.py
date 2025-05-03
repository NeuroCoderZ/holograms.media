# 1. Базовые импорты
import os
import uuid
import json
import re
from datetime import datetime

# 2. Импорты FastAPI и Pydantic
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, ValidationError

# 3. Импорты для LangChain и Mistral
from langchain_core.runnables import Runnable
from langchain_mistralai import ChatMistralAI
from langchain.tools import Tool
from langchain_openai import ChatOpenAI
from motor.motor_asyncio import AsyncIOMotorClient
from tenacity import retry, stop_after_attempt, wait_fixed
from dotenv import load_dotenv

# ----------------------------------------------------------------------
# 4. Определение Pydantic МОДЕЛЕЙ
# ----------------------------------------------------------------------
class TriaQuery(BaseModel):
    query: str

# Модель для данных лога Jenkins
class JenkinsLogData(BaseModel):
    status: str
    build_url: str
    timestamp: str

# ----------------------------------------------------------------------
# 5. Загрузка .env
# ----------------------------------------------------------------------
load_dotenv(override=True)

# ----------------------------------------------------------------------
# 6. Определение КОНСТАНТ
# ----------------------------------------------------------------------
# --- MongoDB ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://neurocoderz:89611236486@localhost:27017/holograms_db?authSource=admin&retryWrites=true&w=majority")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "holograms_db")

# --- OpenRouter LLM (для /generate) ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
DEFAULT_MODEL = "openrouter/deepseek/deepseek-r1:free"

# --- Codestral LLM (для Триа) ---
MISTRAL_API_KEY_USED = os.getenv("MISTRAL_API_KEY")
CODESTRAL_MODEL_NAME = "codestral-latest"

# --- Прочие ---
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
INDEX_HTML_PATH = os.path.join(FRONTEND_DIR, 'index.html')

# ----------------------------------------------------------------------
# 7. ИНИЦИАЛИЗАЦИЯ FastAPI ПРИЛОЖЕНИЯ - до инициализации других компонентов!
# ----------------------------------------------------------------------
app = FastAPI()

# Добавляем CORS Middleware сразу после инициализации app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене заменить на конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------
# 8. Объявление глобальных переменных - будут инициализированы позже
# ----------------------------------------------------------------------
db = None
client = None
chain = None
codestral_llm = None
code_generator_tool = None
read_file_tool = None

# ----------------------------------------------------------------------
# 9. ОПРЕДЕЛЕНИЕ ФУНКЦИЙ-ИНСТРУМЕНТОВ для Триа И ВСПОМОГАТЕЛЬНЫХ ФУНКЦИЙ
# ----------------------------------------------------------------------

# --- OpenRouter Класс для /generate ---
class OpenRouterChat(Runnable):
    def __init__(self, model: str, api_key: str):
        self.model = model
        self.api_key = api_key
        if not api_key:
            print("Warning: OpenRouter API key not found")
            self.client = None
        else:
            try:
                self.client = ChatOpenAI(
                    model=self.model,
                    openai_api_key=self.api_key,
                    base_url="https://openrouter.ai/api/v1",
                    temperature=0.7,
                    max_tokens=1500
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

# --- Функции-инструменты для Триа ---
async def generate_code_tool(task_description: str) -> str:
    print(f"[DEBUG] generate_code_tool called. codestral_llm is {'initialized' if codestral_llm else 'None'}")
    if not codestral_llm:
        return "Ошибка: Codestral LLM (ChatMistralAI) не инициализирован (ключ не найден или ошибка инициализации)."
    try:
        messages = [
            ("system", "Ты - AI ассистент, генерирующий Python код. Напиши только сам код без объяснений и markdown-форматирования ```python ... ```."),
            ("user", task_description)
        ]
        result = await codestral_llm.ainvoke(messages)
        return result.content
    except Exception as e:
        print(f"[ERROR] Ошибка вызова codestral_llm.ainvoke: {e}")
        error_details = getattr(e, 'response', None)
        if error_details and hasattr(error_details, 'json'):
             try:
                 details_json = error_details.json()
                 return f"Ошибка генерации кода (API Error): {details_json.get('message', str(e))}"
             except:
                 pass
        return f"Ошибка генерации кода: {str(e)}"

def read_file_tool(file_path: str) -> str:
    try:
        normalized_path = os.path.normpath(file_path)
        if normalized_path.startswith("..") or os.path.isabs(normalized_path):
             return "Ошибка: Недопустимый путь к файлу (выход за пределы корня или абсолютный путь)."

        abs_path = os.path.abspath(os.path.join(PROJECT_ROOT, normalized_path))

        if not abs_path.startswith(PROJECT_ROOT):
            return "Ошибка: Попытка доступа к файлу вне корневой директории проекта"

        forbidden_dirs = ['.git', '.venv', 'node_modules', '__pycache__']
        path_components = set(abs_path.split(os.sep))
        if any(forbidden in path_components for forbidden in forbidden_dirs):
             return f"Ошибка: Доступ к файлу в запрещенной директории ({', '.join(path_components.intersection(forbidden_dirs))})"

        if not os.path.isfile(abs_path):
            return f"Ошибка: Файл не найден или не является файлом: {file_path}"

        with open(abs_path, 'r', encoding='utf-8') as file:
            content = file.read()
            MAX_FILE_SIZE = 1024 * 100 # 100 KB
            if len(content) > MAX_FILE_SIZE:
                return f"Ошибка: Файл слишком большой (>{MAX_FILE_SIZE // 1024} KB)."
            return content
    except FileNotFoundError:
        return f"Ошибка: Файл не найден: {file_path}"
    except Exception as e:
        return f"Ошибка при чтении файла '{file_path}': {str(e)}"

# --- Логика подключения к MongoDB ---
@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
async def connect_to_mongo():
    global client, db
    if client is None:
        print("Попытка подключения к MongoDB...")
        try:
            client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
            await client.admin.command('ismaster')
            db = client[MONGO_DB_NAME]
            print(f"MongoDB ({MONGO_DB_NAME}@{MONGO_URI}) подключён успешно")
        except Exception as e:
            print(f"Ошибка подключения к MongoDB: {e}")
            client = None
            db = None
            raise

async def shutdown_db_client():
    global client, db
    if client:
        client.close()
        client = None
        db = None
        print("Соединение с MongoDB закрыто.")

# --- Маршрутизатор для Триа ---
async def invoke_tria_agent(query: str) -> str:
    try:
        query_lower = query.lower()

        if query_lower.startswith("прочитай файл "):
            path = query[len("прочитай файл "):].strip()
            return read_file_tool.run(path)

        elif query_lower.startswith("напиши код для "):
            description = query[len("напиши код для "):].strip()
            return await code_generator_tool.arun(description)

        else:
            general_prompt = f"Ответь на следующий запрос пользователя как AI-ассистент: {query}"
            return await code_generator_tool.arun(general_prompt)

    except Exception as e:
        print(f"[ERROR] Ошибка внутри invoke_tria_agent: {e}")
        return f"Ошибка при обработке запроса агентом: {str(e)}"

# ----------------------------------------------------------------------
# 10. ОПРЕДЕЛЕНИЕ РОУТОВ - сначала объявляем все маршруты до инициализации тяжелых моделей!
# ----------------------------------------------------------------------

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    # Инициализация тяжелых моделей будет происходить после запуска сервера
    await initialize_models_and_tools()

@app.on_event("shutdown")
async def shutdown_event():
    await shutdown_db_client()

@app.get("/health")
async def health_check():
    if db is None:
        return {"status": "error", "detail": "MongoDB not connected"}
    try:
        await db.command('ping')
        return {"status": "ok", "mongo": "connected"}
    except Exception as e:
        return {"status": "error", "detail": f"MongoDB ping failed: {str(e)}"}

@app.get("/")
async def get_index():
    if os.path.exists(INDEX_HTML_PATH):
        return FileResponse(INDEX_HTML_PATH, media_type="text/html")
    raise HTTPException(status_code=404, detail="index.html not found")

@app.post("/generate")
async def generate(request: Request):
    if db is None: raise HTTPException(status_code=503, detail="Нет подключения к базе данных")
    try:
        data = await request.json()
        prompt_text = data.get("prompt")
        model_type = data.get("model", DEFAULT_MODEL)
        if not prompt_text: raise HTTPException(status_code=400, detail="Промпт не предоставлен")

        global chain
        if model_type != chain.model:
            chain = OpenRouterChat(model=model_type, api_key=OPENROUTER_API_KEY)

        system_instruction = """
        You are an AI assistant helping modify the 3D scene of the Holograms Media web application.
        Your task is to generate a SHORT JavaScript code snippet based on the user's request to achieve their goal. Focus on modifying properties of existing objects.
        Available Context:
        You are working inside a JavaScript function where the following global variables are accessible:
        - `scene`: A THREE.Scene object.
        - `mainSequencerGroup`: A THREE.Group object containing the main visualization (left and right sequencers). You should primarily modify its properties (position, rotation, scale) or its children.
        - `THREE`: The Three.js library namespace (r128).
        Assume `mainSequencerGroup` might contain children like `leftSequencerGroup`, `rightSequencerGroup`, and an array `columns` with `{ left: THREE.Group, right: THREE.Group, ... }`.
        TWEEN.js might be available globally.
        Code Requirements:
        - Use only pure JavaScript (ES6+).
        - Use only Three.js r128 methods and properties.
        - DO NOT declare new global variables.
        - DO NOT use `document.getElementById` or direct DOM manipulation unless explicitly requested for UI changes.
        - Keep the code SHORT and focused on the specific request.
        Response Format:
        1. FIRST, provide a BRIEF text explanation (1-2 sentences) of what the code will do.
        2. THEN, provide ONLY the JavaScript code itself, enclosed in a ```javascript ... ``` block.
        3. DO NOT add anything else to the response.
        """

        prompt_to_send = f"{system_instruction}\nUser Request: \"{prompt_text}\"\n\nExplanation and Code:"
        result_text = chain.invoke(prompt_to_send)
        cleaned_result = result_text.strip()

        generated_code = None
        code_match = re.search(r'```javascript\s*(.*?)\s*```', cleaned_result, re.DOTALL | re.IGNORECASE)
        if code_match:
            generated_code = code_match.group(1).strip()
            cleaned_result = cleaned_result[:code_match.start()].strip()
            print(f"Найден JS-код:\n{generated_code}")
        else: print("Блок JS-кода не найден.")

        try:
             await db.responses.insert_one({
                "prompt": prompt_text, "prompt_sent": prompt_to_send, "result": cleaned_result,
                "generated_code": generated_code, "model_used": model_type, "timestamp": datetime.now()
             })
        except Exception as db_error: print(f"Ошибка сохранения в db.responses: {db_error}")

        return {"result": cleaned_result, "generatedCode": generated_code}

    except Exception as e:
        print(f"Ошибка в /generate: {e}")
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

@app.post("/branches")
async def create_branch_version(request: Request):
    if db is None: raise HTTPException(status_code=503, detail="Нет подключения к базе данных")
    try:
        data = await request.json(); version_id = str(uuid.uuid4())
        branch = data.get("branch"); prompt = data.get("prompt")
        if not branch or not prompt: raise HTTPException(status_code=400, detail="Поля 'branch' и 'prompt' обязательны")

        await db.hologram_versions.insert_one({
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
        cursor = db.hologram_versions.find(
            {"branch": branch},
            {"_id": 0, "version_id": 1, "branch": 1, "created_at": 1, "prompt": 1}
        ).sort("created_at", -1)
        versions = await cursor.to_list(length=None)
        return {"versions": versions}
    except Exception as e:
        print(f"Ошибка в GET /branches/{branch}: {e}")
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

@app.put("/branches/{branch}/switch")
async def switch_branch_version(branch: str, request: Request):
    if db is None: raise HTTPException(status_code=503, detail="Нет подключения к базе данных")
    try:
        data = await request.json(); version_id = data.get("version_id")
        if not version_id: raise HTTPException(status_code=400, detail="Поле 'version_id' обязательно")

        version = await db.hologram_versions.find_one(
            {"branch": branch, "version_id": version_id},
            {"_id": 0, "scene_state": 1, "files": 1, "customData": 1}
        )
        if not version: raise HTTPException(status_code=404, detail="Версия не найдена")
        return version
    except Exception as e:
        print(f"Ошибка в PUT /branches/{branch}/switch: {e}")
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

# ВАЖНО: Определение роута /tria/invoke ПЕРЕД инициализацией моделей и инструментов
@app.post("/tria/invoke")
async def tria_invoke(tria_query: TriaQuery):
    try:
        response_text = await invoke_tria_agent(tria_query.query)
        return {"response": response_text}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Ошибка в /tria/invoke: {e}")
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

@app.post("/tria/save_logs")
async def save_logs(request: Request):
    try:
        raw_log_data = await request.json()
        log_data = JenkinsLogData(**raw_log_data)
    except json.JSONDecodeError:
        print("[ERROR] Invalid JSON received in /tria/save_logs")
        raise HTTPException(status_code=400, detail="Invalid JSON received")
    except ValidationError as e:
        print(f"[ERROR] Validation error in /tria/save_logs: {e.errors()}")
        raise HTTPException(status_code=422, detail=f"Invalid log data format: {e.errors()}")

    if db is None:
        print("[ERROR] Cannot save Jenkins log, DB not connected yet.")
        raise HTTPException(status_code=503, detail="Database connection is not available yet")

    log_dict = log_data.model_dump()
    log_dict["received_at"] = datetime.now()

    try:
        insert_result = await db.jenkins_logs.insert_one(log_dict)
        print(f"[INFO] Saved Jenkins log, id: {insert_result.inserted_id}")
        return {"status": "logs saved", "id": str(insert_result.inserted_id)}
    except Exception as e:
        print(f"[ERROR] Failed to save Jenkins log: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save logs due to an internal error: {str(e)}")

# ----------------------------------------------------------------------
# 11. МОНТИРОВАНИЕ СТАТИКИ - после определения всех роутов
# ----------------------------------------------------------------------
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=False), name="static_files_root")

# ----------------------------------------------------------------------
# 12. АСИНХРОННАЯ ИНИЦИАЛИЗАЦИЯ МОДЕЛЕЙ и ИНСТРУМЕНТОВ - вызывается из startup_event
# ----------------------------------------------------------------------
async def initialize_models_and_tools():
    global chain, codestral_llm, code_generator_tool, read_file_tool
    
    print("[INFO] Начало инициализации моделей и инструментов...")
    
    # --- Инициализация OpenRouter для /generate ---
    chain = OpenRouterChat(model=DEFAULT_MODEL, api_key=OPENROUTER_API_KEY)
    
    # --- Инициализация Codestral LLM для Триа ---
    if not MISTRAL_API_KEY_USED:
        print("[WARN] MISTRAL_API_KEY не найден в .env!")
    else:
        try:
            print(f"[DEBUG] Initializing ChatMistralAI with model '{CODESTRAL_MODEL_NAME}'")
            codestral_llm = ChatMistralAI(
                model=CODESTRAL_MODEL_NAME,
                api_key=MISTRAL_API_KEY_USED,
                temperature=0.4,
            )
            print("[DEBUG] ChatMistralAI initialized successfully.")
        except Exception as e:
            print(f"[ERROR] Ошибка инициализации ChatMistralAI: {e}")
            codestral_llm = None

    # --- Создание объектов Tool для Триа ---
    code_generator_tool = Tool(
        name="code_generator",
        func=generate_code_tool,
        description="Генерирует Python код по текстовому описанию задачи.",
        coroutine=generate_code_tool
    )

    read_file_tool = Tool(
        name="file_reader",
        func=read_file_tool,
        description="Читает содержимое файла по указанному пути (относительно корня проекта)."
    )
    
    print("[INFO] Инициализация моделей и инструментов завершена.")

# ----------------------------------------------------------------------
# 13. Блок if __name__ == "__main__":
# ----------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    print("Запуск Uvicorn для локальной разработки...")
    uvicorn.run(app, host="0.0.0.0", port=3000) 