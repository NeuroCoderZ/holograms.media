# 1. Базовые импорты
import os
import uuid
import json
import re
from datetime import datetime

# 2. Импорты FastAPI и Pydantic
from fastapi import FastAPI, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# ----------------------------------------------------------------------
# 3. ИНИЦИАЛИЗАЦИЯ FastAPI ПРИЛОЖЕНИЯ
# ----------------------------------------------------------------------
app = FastAPI()

# ----------------------------------------------------------------------
# 4. ОПРЕДЕЛЕНИЕ Pydantic МОДЕЛЕЙ
# ----------------------------------------------------------------------
class TriaQuery(BaseModel):
    query: str

# (Добавьте сюда другие Pydantic модели, если они используются в роутах)

# ----------------------------------------------------------------------
# 5. ОПРЕДЕЛЕНИЕ РОУТОВ и ОБРАБОТЧИКОВ СОБЫТИЙ
# ----------------------------------------------------------------------

# Обертки для обработчиков событий, т.к. сами функции будут ниже
@app.on_event("startup")
async def startup_event_wrapper():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event_wrapper():
    await shutdown_db_client()

@app.get("/health")
async def health_check():
    # Зависит от `db`, который будет определен ниже
    if db is None:
        return {"status": "error", "detail": "MongoDB not connected"}
    try:
        await db.command('ping')
        return {"status": "ok", "mongo": "connected"}
    except Exception as e:
        return {"status": "error", "detail": f"MongoDB ping failed: {str(e)}"}

@app.get("/")
async def get_index():
    # Зависит от INDEX_HTML_PATH, определенного ниже
    if os.path.exists(INDEX_HTML_PATH):
        return FileResponse(INDEX_HTML_PATH, media_type="text/html")
    raise HTTPException(status_code=404, detail="index.html not found")

@app.post("/generate")
async def generate(request: Request):
    # Зависит от `db`, `DEFAULT_MODEL`, `chain`, `OpenRouterChat`, `OPENROUTER_API_KEY`
    if db is None: raise HTTPException(status_code=503, detail="Нет подключения к базе данных")
    try:
        data = await request.json()
        prompt_text = data.get("prompt")
        model_type = data.get("model", DEFAULT_MODEL)
        if not prompt_text: raise HTTPException(status_code=400, detail="Промпт не предоставлен")

        # Эта логика изменения `chain` глобально может быть проблематичной
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
        result_text = chain.invoke(prompt_to_send) # ИСПОЛЬЗУЕТ ГЛОБАЛЬНЫЙ chain
        cleaned_result = result_text.strip()

        generated_code = None
        code_match = re.search(r'```javascript\s*(.*?)\s*```', cleaned_result, re.DOTALL | re.IGNORECASE)
        if code_match:
            generated_code = code_match.group(1).strip()
            cleaned_result = cleaned_result[:code_match.start()].strip()
            print(f"Найден JS-код:\n{generated_code}")
        else: print("Блок JS-кода не найден.")

        try:
             await db.responses.insert_one({ # Используем await для motor
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
    # Зависит от `db`
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
    # Зависит от `db`
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
    # Зависит от `db`
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

@app.post("/tria/invoke")
async def tria_invoke(tria_query: TriaQuery):
    # Использует invoke_tria_agent, которая будет определена ниже
    try:
        response_text = await invoke_tria_agent(tria_query.query) # ЗАВИСИМОСТЬ
        return {"response": response_text}
    except HTTPException: # Перехватываем специфичные ошибки FastAPI/HTTP
        raise
    except Exception as e: # Перехватываем остальные ошибки
        print(f"Ошибка в /tria/invoke: {e}") # Логируем ошибку
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

# ----------------------------------------------------------------------
# 6. МОНТИРОВАНИЕ СТАТИКИ
# ----------------------------------------------------------------------
# Зависит от FRONTEND_DIR, определенного ниже
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
INDEX_HTML_PATH = os.path.join(FRONTEND_DIR, 'index.html') # Определяем здесь же
app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=False), name="static_files_root")

# ----------------------------------------------------------------------
# 7. Импорты остальных библиотек
# ----------------------------------------------------------------------
from motor.motor_asyncio import AsyncIOMotorClient
from tenacity import retry, stop_after_attempt, wait_fixed
from langchain_core.runnables import Runnable
from langchain_openai import ChatOpenAI
from langchain.tools import Tool
# Убраны неиспользуемые импорты langchain agents и pydantic_v1
# from langchain_core.pydantic_v1 import BaseModel as PydanticBaseModel, Field # Заменено на pydantic
# from langchain_core.prompts import ChatPromptTemplate
# from langchain.agents import AgentExecutor, create_openai_tools_agent
from dotenv import load_dotenv

# ----------------------------------------------------------------------
# 8. Загрузка .env
# ----------------------------------------------------------------------
load_dotenv(override=True)

# ----------------------------------------------------------------------
# 9. Определение КОНСТАНТ и ГЛОБАЛЬНЫХ ПЕРЕМЕННЫХ
# ----------------------------------------------------------------------
# --- MongoDB ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://neurocoderz:89611236486@localhost:27017/holograms_db?authSource=admin&retryWrites=true&w=majority")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "holograms_db")
db: AsyncIOMotorClient = None # Указываем тип для ясности
client: AsyncIOMotorClient = None

# --- OpenRouter LLM (для /generate) ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
DEFAULT_MODEL = "openrouter/deepseek/deepseek-r1:free"
chain: Runnable = None # Будет инициализирован ниже

# --- Codestral LLM (для Триа) ---
CODESTRAL_API_KEY = os.getenv("CODESTRAL_API_KEY", "LAwz9uT0ZiOvOJmUmkfCoEoXGvbsAbfC")
codestral_llm: ChatOpenAI = None # Указываем тип

# --- Прочие ---
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# ----------------------------------------------------------------------
# 10. Инициализация LLM и Инструментов
# ----------------------------------------------------------------------

# --- OpenRouter Инициализация ---
class OpenRouterChat(Runnable):
    def __init__(self, model: str, api_key: str):
        self.model = model
        self.api_key = api_key
        if not api_key:
            print("Warning: OpenRouter API key not found")
            self.client = None
        else:
            try:
                # Используем ChatOpenAI напрямую, если она нужна только здесь
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
            # Предполагаем синхронный вызов для старого эндпоинта /generate
            response = self.client.invoke(prompt)
            return response.content or "Model returned empty response"
        except Exception as e:
            return f"Error calling OpenRouter: {str(e)}"

chain = OpenRouterChat(model=DEFAULT_MODEL, api_key=OPENROUTER_API_KEY)

# --- Codestral Инициализация ---
if not CODESTRAL_API_KEY:
    print("ПРЕДУПРЕЖДЕНИЕ: CODESTRAL_API_KEY не найден!")
    # codestral_llm остается None
else:
    try:
        codestral_llm = ChatOpenAI(
            model_name='codestral-latest',
            openai_api_key=CODESTRAL_API_KEY,
            base_url="https://api.mistral.ai/v1",
            temperature=0.4,
            max_tokens=2048
        )
    except Exception as e:
        print(f"Ошибка инициализации Codestral LLM: {e}")
        codestral_llm = None

# --- Функции-инструменты для Триа ---
async def generate_code_tool(task_description: str) -> str:
    if not codestral_llm:
        return "Ошибка: Codestral LLM не инициализирован"
    try:
        prompt = f"System: Ты - AI ассистент, генерирующий Python код. Напиши только сам код без объяснений и markdown-форматирования ```python ... ```.\nUser: {task_description}"
        result = await codestral_llm.ainvoke(prompt) # Используем await для асинхронного вызова
        return result.content
    except Exception as e:
        return f"Ошибка при генерации кода: {str(e)}"

def read_file_tool(file_path: str) -> str:
    # Зависит от PROJECT_ROOT
    try:
        normalized_path = os.path.normpath(file_path)
        # Убедимся, что путь относителен и не выходит за пределы корня
        if normalized_path.startswith("..") or os.path.isabs(normalized_path):
             return "Ошибка: Недопустимый путь к файлу (выход за пределы корня или абсолютный путь)."

        abs_path = os.path.abspath(os.path.join(PROJECT_ROOT, normalized_path))

        # Проверка безопасности
        if not abs_path.startswith(PROJECT_ROOT):
            return "Ошибка: Попытка доступа к файлу вне корневой директории проекта"

        # Проверка на запрещенные директории
        forbidden_dirs = ['.git', '.venv', 'node_modules', '__pycache__']
        # Проверяем компоненты пути
        path_components = set(abs_path.split(os.sep))
        if any(forbidden in path_components for forbidden in forbidden_dirs):
             return f"Ошибка: Доступ к файлу в запрещенной директории ({', '.join(path_components.intersection(forbidden_dirs))})"

        if not os.path.isfile(abs_path):
            return f"Ошибка: Файл не найден или не является файлом: {file_path}"

        with open(abs_path, 'r', encoding='utf-8') as file:
            content = file.read()
            # Ограничим размер возвращаемого контента для безопасности
            MAX_FILE_SIZE = 1024 * 100 # 100 KB
            if len(content) > MAX_FILE_SIZE:
                return f"Ошибка: Файл слишком большой (>{MAX_FILE_SIZE // 1024} KB)."
            return content
    except FileNotFoundError:
        return f"Ошибка: Файл не найден: {file_path}"
    except Exception as e:
        return f"Ошибка при чтении файла '{file_path}': {str(e)}"


# --- Создание объектов Tool для Триа ---
# Убедимся, что функции определены ДО создания Tool
code_generator_tool = Tool(
    name="code_generator",
    func=generate_code_tool, # func должен быть синхронным, но у нас только async
    description="Генерирует Python код по текстовому описанию задачи. Вход: описание задачи. Выход: строка с кодом.",
    coroutine=generate_code_tool # Указываем асинхронную функцию здесь
)

read_file_tool = Tool(
    name="file_reader",
    func=read_file_tool, # Эта функция синхронная
    description="Читает содержимое файла по указанному пути (относительно корня проекта). Вход: относительный путь к файлу. Выход: содержимое файла или сообщение об ошибке."
    # coroutine не нужен, так как func синхронный
)

# ----------------------------------------------------------------------
# 11. Определение вспомогательных функций
# ----------------------------------------------------------------------

# --- Логика подключения к MongoDB ---
@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
async def connect_to_mongo():
    global client, db
    if client is None: # Подключаемся только если еще не подключены
        print("Попытка подключения к MongoDB...")
        try:
            client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000) # Таймаут подключения
            # The ismaster command is cheap and does not require auth.
            await client.admin.command('ismaster')
            db = client[MONGO_DB_NAME]
            print(f"MongoDB ({MONGO_DB_NAME}@{MONGO_URI}) подключён успешно")
        except Exception as e:
            print(f"Ошибка подключения к MongoDB: {e}")
            client = None # Сбрасываем клиента при ошибке
            db = None
            raise # Повторяем попытку через tenacity

async def shutdown_db_client():
    global client, db
    if client:
        client.close()
        client = None
        db = None
        print("Соединение с MongoDB закрыто.")

# --- Маршрутизатор для Триа ---
async def invoke_tria_agent(query: str) -> str:
    # Зависит от code_generator_tool и read_file_tool
    try:
        query_lower = query.lower()

        if query_lower.startswith("прочитай файл "):
            path = query[len("прочитай файл "):].strip()
            # Используем синхронный вызов, т.к. read_file_tool синхронный
            return read_file_tool.run(path)

        elif query_lower.startswith("напиши код для "):
            description = query[len("напиши код для "):].strip()
             # Используем асинхронный вызов
            return await code_generator_tool.arun(description)

        else:
            # Общий запрос также обрабатываем генератором кода/ответов
            return await code_generator_tool.arun(f"Ответь на следующий запрос пользователя как AI-ассистент: {query}")

    except Exception as e:
        print(f"Ошибка внутри invoke_tria_agent: {e}")
        return f"Ошибка при обработке запроса агентом: {str(e)}"


# ----------------------------------------------------------------------
# 12. Блок if __name__ == "__main__":
# ----------------------------------------------------------------------
if __name__ == "__main__":
    # Этот блок не должен выполняться при запуске через `uvicorn backend.backend:app`
    # Оставим для возможности прямого запуска для отладки, если потребуется
    import uvicorn
    print("Запуск Uvicorn напрямую для локальной разработки (НЕ РЕКОМЕНДУЕТСЯ)...")
    # Запуск без reload, т.к. startup/shutdown логика может конфликтовать с reload
    uvicorn.run(app, host="0.0.0.0", port=3000) # Передаем сам объект app 