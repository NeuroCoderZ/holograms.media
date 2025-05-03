# 1. Базовые импорты
import os
import uuid
import json
import re
from datetime import datetime
import traceback # <<< Импортируем для вывода стектрейса

# 2. Импорты FastAPI и Pydantic
from fastapi import FastAPI, Request, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, ValidationError
from typing import List, Dict, Any, Optional
import motor.motor_asyncio
import httpx
import asyncio
from pymongo.errors import PyMongoError
from dotenv import load_dotenv

# ----------------------------------------------------------------------
# 3. ИНИЦИАЛИЗАЦИЯ FastAPI ПРИЛОЖЕНИЯ
# ----------------------------------------------------------------------
app = FastAPI()

# Добавляем CORS Middleware сразу после инициализации app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Разрешаем все источники (можно ограничить для продакшна)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------------------------------------------------------------
# 4. ОПРЕДЕЛЕНИЕ Pydantic МОДЕЛЕЙ
# ----------------------------------------------------------------------
class TriaQuery(BaseModel):
    query: str

# Модель для данных лога Jenkins
class JenkinsLogData(BaseModel):
    status: str
    build_url: str
    timestamp: str
    # received_at: datetime = Field(default_factory=datetime.now)

# Модели данных для Чата (перенесены сюда, ДО их использования)
# <<< Добавляем импорты для LangChain сообщений, используемых в /chat >>>
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = "mistral/mistral-small-latest" # Модель OpenRouter по умолчанию
    history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    response: str
    should_vocalize: bool = False
    metadata: Optional[Dict[str, Any]] = None

class ChatSaveRequest(BaseModel):
    chat_id: str
    message: ChatMessage

# (Добавьте сюда другие Pydantic модели, если они используются в роутах)

# ----------------------------------------------------------------------
# 5. ОПРЕДЕЛЕНИЕ РОУТОВ и ОБРАБОТЧИКОВ СОБЫТИЙ
# ----------------------------------------------------------------------

# --- Новый Lifespan Handler (Заменяет on_event) ---
from contextlib import asynccontextmanager

# <<< ИЗМЕНЕННАЯ ФУНКЦИЯ LIFESPAN С ДОПОЛНИТЕЛЬНЫМ ЛОГИРОВАНИЕМ >>>
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Код перед запуском приложения
    print("[Lifespan] Старт...")
    global db # Объявим db глобальной, чтобы проверить ее значение
    db = None # Сбрасываем db в None перед попыткой подключения
    try:
        print("[Lifespan] Вызов connect_to_mongo...")
        await connect_to_mongo() # Пытаемся подключиться
        if db is not None: # Проверяем, установилась ли переменная db
             print("[Lifespan] connect_to_mongo ЗАВЕРШЕН УСПЕШНО, db НЕ None.")
        else:
             print("[Lifespan] connect_to_mongo ЗАВЕРШЕН, НО db ОСТАЛАСЬ None!")
    except Exception as e:
        # Если connect_to_mongo выбросит исключение (даже после retry), поймаем его здесь
        print(f"[Lifespan] КРИТИЧЕСКАЯ ОШИБКА при вызове connect_to_mongo: {e}")
        traceback.print_exc() # Печатаем стектрейс ошибки DB
        db = None # Гарантируем, что db = None при ошибке

    print("[Lifespan] Инициализация LLM (если нужно)...")
    # global chain, codestral_llm # Раскомментируй, если инициализируешь здесь
    # chain = ...
    # codestral_llm = ...
    print("[Lifespan] Запуск приложения завершен.")
    yield # Приложение работает здесь
    # Код после остановки приложения
    print("[Lifespan] Остановка приложения...")
    await shutdown_db_client()
    print("[Lifespan] Остановка завершена.")
# <<< КОНЕЦ ИЗМЕНЕННОЙ ФУНКЦИИ LIFESPAN >>>

# Регистрируем lifespan handler
app.router.lifespan_context = lifespan
# -----------------------------------------------------

# --- Удаляем старые обертки on_event ---
# @app.on_event("startup")
# async def startup_event_wrapper():
#     await connect_to_mongo()
#
# @app.on_event("shutdown")
# async def shutdown_event_wrapper():
#     await shutdown_db_client()
# -----------------------------------------

@app.get("/health")
async def health_check():
    # Зависит от `db`, который будет определен ниже
    if db is None:
        # Возвращаем 503, если база недоступна при старте
        # raise HTTPException(status_code=503, detail="MongoDB connection not established during startup")
        # Или просто статус ошибки
        return JSONResponse(status_code=503, content={"status": "error", "detail": "MongoDB not connected"})

    try:
        # Дополнительно проверяем пинг перед ответом OK
        await db.command('ping')
        return {"status": "ok", "mongo": "connected"}
    except Exception as e:
        print(f"[Health Check ERROR] MongoDB ping failed: {e}") # Логируем ошибку пинга
        return JSONResponse(status_code=503, content={"status": "error", "detail": f"MongoDB ping failed: {str(e)}"})


@app.get("/")
async def get_index():
    # Зависит от INDEX_HTML_PATH, определенного ниже
    if os.path.exists(INDEX_HTML_PATH):
        return FileResponse(INDEX_HTML_PATH, media_type="text/html")
    print(f"[ERROR] index.html not found at path: {INDEX_HTML_PATH}")
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
        # TODO: Пересмотреть инициализацию chain, возможно, делать ее по запросу
        global chain
        # --- УДАЛЕНА ЛОГИКА С OpenRouterChat ---
        # if model_type != chain.model:
        #     chain = OpenRouterChat(model=model_type, api_key=OPENROUTER_API_KEY)
        # ----------------------------------------
        # Используем codestral_llm для генерации (если подходит) или другую модель
        # Пока оставим заглушку, т.к. chain не инициализирован
        if chain is None:
             raise HTTPException(status_code=501, detail="Генерация JS кода через /generate временно не настроена (chain is None)")

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
        traceback.print_exc() # Логируем стектрейс
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
        traceback.print_exc()
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
        traceback.print_exc()
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
        traceback.print_exc()
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
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Внутренняя ошибка сервера: {str(e)}")

# --- Перемещенный эндпоинт для сохранения логов Jenkins ---
@app.post("/tria/save_logs")
async def save_logs(request: Request): # <<< Принимаем Request вместо модели
    """Принимает данные лога Jenkins, читает JSON и валидирует Pydantic."""
    try:
        # Явно читаем тело запроса как JSON
        raw_log_data = await request.json()
        # Валидируем полученный словарь с помощью Pydantic модели
        log_data = JenkinsLogData(**raw_log_data)
    except json.JSONDecodeError:
        print("[ERROR] Invalid JSON received in /tria/save_logs")
        raise HTTPException(status_code=400, detail="Invalid JSON received")
    except ValidationError as e:
        print(f"[ERROR] Validation error in /tria/save_logs: {e.errors()}")
        # Возвращаем детали ошибки валидации клиенту
        raise HTTPException(status_code=422, detail=f"Invalid log data format: {e.errors()}")

    # --- Дальнейшая логика --- 
    if db is None:
        print("[ERROR] Cannot save Jenkins log, DB not connected yet (called from route definition).")
        raise HTTPException(status_code=503, detail="Database connection is not available yet")

    # Добавляем отметку времени получения сервером
    log_entry = log_data.dict()
    log_entry['received_at'] = datetime.now()

    try:
        # Используем `await` для асинхронной операции с `motor`
        result = await db.jenkins_logs.insert_one(log_entry)
        print(f"[INFO] Jenkins log saved successfully, ID: {result.inserted_id}")
        return JSONResponse(status_code=201, content={"message": "Log saved", "id": str(result.inserted_id)})
    except PyMongoError as e:
        print(f"[ERROR] MongoDB error saving Jenkins log: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save log to database: {e}")
    except Exception as e:
        # Ловим другие возможные ошибки при работе с базой
        print(f"[ERROR] Unexpected error saving Jenkins log: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail="Unexpected error while saving log")

# ----------------------------------------------------------------------
# 6. МОНТИРОВАНИЕ СТАТИКИ
# ----------------------------------------------------------------------
# Зависит от FRONTEND_DIR, определенного ниже
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'frontend'))
INDEX_HTML_PATH = os.path.join(FRONTEND_DIR, 'index.html') # Определяем здесь же
# Монтируем статические файлы на /static, чтобы избежать конфликтов с API роутами
# Убедимся, что директория существует перед монтированием
if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR, html=False), name="static_files")
    print(f"Статика успешно смонтирована из: {FRONTEND_DIR}")
else:
    print(f"[CRITICAL ERROR] Директория для статики НЕ НАЙДЕНА: {FRONTEND_DIR}")


# ----------------------------------------------------------------------
# 7. Импорты остальных библиотек
# ----------------------------------------------------------------------
from motor.motor_asyncio import AsyncIOMotorClient
from tenacity import retry, stop_after_attempt, wait_fixed
from langchain_core.runnables import Runnable
from langchain_mistralai import ChatMistralAI
from langchain.tools import Tool
from dotenv import load_dotenv

# ----------------------------------------------------------------------
# 8. Загрузка .env
# ----------------------------------------------------------------------
load_dotenv(override=True)

# ----------------------------------------------------------------------
# 9. Определение КОНСТАНТ и ГЛОБАЛЬНЫХ ПЕРЕМЕННЫХ
# ----------------------------------------------------------------------
# --- MongoDB ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "holograms_db")
db = None # Инициализируем как None, устанавливается в lifespan
client = None # Инициализируем как None, устанавливается в connect_to_mongo
# chat_collection инициализируется в /chat эндпоинте

# --- OpenRouter LLM (для /generate) ---
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
DEFAULT_MODEL = "openrouter/deepseek/deepseek-r1:free"
chain: Runnable = None # Будет инициализирован ниже (или удален, если /generate не нужен)

# --- Codestral LLM (для Триа) ---
# Используем рабочий MISTRAL_API_KEY, т.к. CODESTRAL_API_KEY невалиден
MISTRAL_API_KEY_USED = os.getenv("MISTRAL_API_KEY") # Загружаем рабочий ключ
CODESTRAL_MODEL_NAME = "codestral-latest" # Целевая модель
codestral_llm: ChatMistralAI = None # Обновлен тип

# --- Прочие ---
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

# ----------------------------------------------------------------------
# 10. Инициализация LLM и Инструментов
# ----------------------------------------------------------------------

# --- OpenRouter Инициализация (УДАЛЕНО, т.к. переходим на ChatMistralAI для чата) ---

# --- Codestral Инициализация (с ChatMistralAI) ---
if not MISTRAL_API_KEY_USED:
    print("ПРЕДУПРЕЖДЕНИЕ: Рабочий MISTRAL_API_KEY не найден в .env!")
    # codestral_llm остается None
else:
    try:
        print(f"[DEBUG] Initializing ChatMistralAI with model '{CODESTRAL_MODEL_NAME}' and key {MISTRAL_API_KEY_USED[:4]}...{MISTRAL_API_KEY_USED[-4:]}")
        codestral_llm = ChatMistralAI(
            model=CODESTRAL_MODEL_NAME,
            api_key=MISTRAL_API_KEY_USED,
            # base_url="https://api.mistral.ai/v1", # Обычно не нужен для ChatMistralAI
            temperature=0.4,
            # max_tokens=2048 # max_tokens обычно не задается при инициализации, а при вызове
        )
        print("[DEBUG] ChatMistralAI initialized successfully.")
    except Exception as e:
        print(f"[ERROR] Ошибка инициализации ChatMistralAI: {e}")
        traceback.print_exc() # Логируем стектрейс
        codestral_llm = None

# --- Функции-инструменты для Триа ---
async def generate_code_tool(task_description: str) -> str:
    # Использует глобальный codestral_llm, который теперь ChatMistralAI
    print(f"[DEBUG] generate_code_tool called. codestral_llm is {'initialized' if codestral_llm else 'None'}")
    if not codestral_llm:
        return "Ошибка: Codestral LLM (ChatMistralAI) не инициализирован (ключ не найден или ошибка инициализации)."
    try:
        # Формируем сообщение для Mistral API
        messages = [
            ("system", "Ты - AI ассистент, генерирующий Python код. Напиши только сам код без объяснений и markdown-форматирования ```python ... ```."),
            ("user", task_description)
        ]
        # Используем асинхронный вызов
        result = await codestral_llm.ainvoke(messages)
        return result.content
    except Exception as e:
        print(f"[ERROR] Ошибка вызова codestral_llm.ainvoke: {e}") # Логируем ошибку вызова
        traceback.print_exc() # Логируем стектрейс
        # Попробуем извлечь детали ошибки, если возможно
        error_details = getattr(e, 'response', None)
        if error_details and hasattr(error_details, 'json'):
             try:
                 details_json = error_details.json()
                 return f"Ошибка генерации кода (API Error): {details_json.get('message', str(e))}"
             except:
                 pass # Если не удалось получить json
        return f"Ошибка генерации кода: {str(e)}"

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
        print(f"[ERROR] Ошибка при чтении файла '{file_path}': {e}")
        traceback.print_exc()
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
# <<< ИЗМЕНЕННАЯ ФУНКЦИЯ connect_to_mongo С ЛОГОМ ОШИБКИ >>>
@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
async def connect_to_mongo():
    global client, db
    # Подключаемся только если еще не подключены (хотя lifespan должен вызываться 1 раз)
    if client is None:
        print("[DB Connect] Попытка подключения к MongoDB...")
        try:
            client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000) # Таймаут подключения
            # The ismaster command is cheap and does not require auth.
            await client.admin.command('ismaster') # Проверка связи и аутентификации
            db = client[MONGO_DB_NAME]
            print(f"[DB Connect] MongoDB ({MONGO_DB_NAME}@{MONGO_URI}) подключён успешно")
        except Exception as e:
            print(f"[DB Connect ERROR] !!! ОШИБКА ПОДКЛЮЧЕНИЯ MongoDB: {e}") # Печатаем саму ошибку
            traceback.print_exc() # Печатаем стектрейс
            client = None # Сбрасываем клиента при ошибке
            db = None
            raise # Повторяем попытку через tenacity
# <<< КОНЕЦ ИЗМЕНЕННОЙ ФУНКЦИИ connect_to_mongo >>>

async def shutdown_db_client():
    global client, db
    if client:
        client.close()
        client = None
        db = None
        print("[DB Shutdown] Соединение с MongoDB закрыто.")

# --- Маршрутизатор для Триа ---
async def invoke_tria_agent(query: str) -> str:
    # Зависит от code_generator_tool и read_file_tool
    try:
        query_lower = query.lower()

        if query_lower.startswith("прочитай файл "):
            path = query[len("прочитай файл "):].strip()
            # Используем синхронный вызов run, так как read_file_tool синхронный
            return read_file_tool.run(path)

        elif query_lower.startswith("напиши код для "):
            description = query[len("напиши код для "):].strip()
            # Используем асинхронный вызов arun, так как generate_code_tool асинхронный
            return await code_generator_tool.arun(description)

        else:
            # Общий запрос также обрабатываем через code_generator_tool
            general_prompt = f"Ответь на следующий запрос пользователя как AI-ассистент: {query}"
            # Передаем как описание задачи для генератора кода/текста
            return await code_generator_tool.arun(general_prompt)

    except Exception as e:
        print(f"[ERROR] Ошибка внутри invoke_tria_agent: {e}")
        traceback.print_exc()
        return f"Ошибка при обработке запроса агентом: {str(e)}"

# ----------------------------------------------------------------------
# 12. Блок if __name__ == "__main__":
# ----------------------------------------------------------------------
# if __name__ == "__main__":
    # Этот блок не должен выполняться при запуске через `uvicorn backend.backend:app`
    # Оставим для возможности прямого запуска для отладки, если потребуется
    # import uvicorn
    # print("Запуск Uvicorn напрямую для локальной разработки (НЕ РЕКОМЕНДУЕТСЯ)...")
    # Запуск без reload, т.к. startup/shutdown логика может конфликтовать с reload
    # uvicorn.run(app, host="0.0.0.0", port=3000) # Передаем сам объект app

# Эндпоинт для обработки запросов чата
@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Обрабатывает сообщение чата, используя ChatMistralAI."""
    print(f"[CHAT DEBUG] /chat endpoint called with model: {request.model}")

    # ----- УЛУЧШЕННАЯ ПРОВЕРКА LLM -----
    global codestral_llm # Убедимся, что используем глобальную переменную
    if codestral_llm is None:
        print("[CHAT ERROR] ChatMistralAI (codestral_llm) is not initialized! Check .env and MISTRAL_API_KEY_USED.")
        # Вместо 500 возвращаем 503, т.к. сервис LLM недоступен
        raise HTTPException(status_code=503, detail="LLM Service (Mistral) not available. Check API key in .env.")
    # -------------------------------------

    # ----- ПРОВЕРКА БАЗЫ ДАННЫХ -----
    if db is None:
        print("[CHAT ERROR] db is None! Cannot save chat history.")
        # Можно либо вернуть ошибку 503, либо продолжить без сохранения
        # Пока продолжим без сохранения, но с предупреждением
        # raise HTTPException(status_code=503, detail="Database connection is not available for saving chat history.")

    # Формируем историю для API в формате LangChain
    messages = [
        SystemMessage(content="Ты - Tria, интерактивный ИИ-ассистент для платформы Holograms Media. Отвечай кратко, информативно и дружелюбно.")
    ]
    if request.history:
        for msg in request.history:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            if role == "user":
                messages.append(HumanMessage(content=content))
            elif role == "assistant" or role == "tria":
                 # Добавляем предыдущие ответы ассистента
                 messages.append(AIMessage(content=content)) # Используем AIMessage

    messages.append(HumanMessage(content=request.message)) # Добавляем текущее сообщение пользователя
    print(f"[CHAT DEBUG] Prepared {len(messages)} messages for LLM.")

    try:
        # Используем асинхронный вызов .ainvoke
        print("[CHAT DEBUG] Attempting codestral_llm.ainvoke...")
        response = await codestral_llm.ainvoke(messages)
        response_content = response.content
        print(f"[CHAT DEBUG] ChatMistralAI response received: {response_content[:100]}...")

        # Определяем, нужно ли озвучивать (пока всегда нет)
        should_vocalize = False
        chat_id = None # Инициализируем chat_id

        # Сохранение в БД (только если db доступна)
        if db is not None:
            try:
                chat_id = str(uuid.uuid4()) # Генерируем ID для этого обмена
                # <<< ИСПРАВЛЕНО ИМЯ КОЛЛЕКЦИИ >>>
                chat_collection_for_saving = db["chat_history"] # Сохраняем все в одну коллекцию
                # <<< ------------------------ >>>
                print(f"[CHAT DEBUG] Attempting to save chat to DB collection 'chat_history'...")
                await chat_collection_for_saving.insert_one({
                    "chat_id": chat_id, # Сохраняем ID сессии/обмена
                    "timestamp": datetime.now(),
                    "model": request.model, # Сохраняем запрошенную модель
                    "user_message": request.message,
                    "tria_response": response_content,
                    "history_sent": request.history # Сохраняем историю, отправленную в запросе
                })
                print(f"[CHAT DEBUG] Chat interaction saved to DB (chat_id: {chat_id}).")
            except Exception as db_error:
                print(f"[CHAT WARN] Failed to save chat interaction to DB: {db_error}")
                traceback.print_exc()
                # Не прерываем основной ответ из-за ошибки сохранения
        else:
             print("[CHAT WARN] db is None, skipping chat saving.")


        return ChatResponse(response=response_content, should_vocalize=should_vocalize, metadata={"chat_id": chat_id} if chat_id else None)

    except Exception as e:
        print(f"[CHAT CRITICAL ERROR] Exception during LLM invocation or DB save: {e}")
        traceback.print_exc() # Печатаем стектрейс
        error_details = str(e)
        raise HTTPException(status_code=500, detail=f"Error interacting with LLM or saving chat: {error_details}")

@app.post("/chat/save")
async def save_chat_message(request: ChatSaveRequest):
    # Этот эндпоинт сейчас не используется фронтендом, т.к. сохранение идет в /chat
    # Можно оставить его как есть или вернуть ошибку "Not Implemented"
    print("[WARN] /chat/save endpoint called, but saving logic is now within /chat.")
    raise HTTPException(status_code=501, detail="Endpoint deprecated, saving handled by /chat")

    # --- Старая логика (можно удалить) ---
    # if db is None:
    #     print("[ERROR] DB not connected, cannot save chat message via /chat/save.")
    #     raise HTTPException(status_code=503, detail="Database connection not available")
    #
    # try:
    #     chat_collection_to_save = db[f"chat_{request.chat_id}"] # Использовал старую логику с ID в имени
    #     message_data = request.message.dict()
    #     if not message_data.get('timestamp'):
    #          message_data['timestamp'] = datetime.now().isoformat()
    #     if isinstance(message_data.get('timestamp'), datetime):
    #          message_data['timestamp'] = message_data['timestamp'].isoformat()
    #
    #     await chat_collection_to_save.insert_one(message_data)
    #     print(f"[INFO] Message saved to collection via /chat/save: chat_{request.chat_id}")
    #     return {"status": "success", "message": "Message saved (via /chat/save)"}
    # except PyMongoError as e:
    #     print(f"[ERROR] MongoDB error saving message via /chat/save to chat {request.chat_id}: {e}")
    #     raise HTTPException(status_code=500, detail=f"Database error: {e}")
    # except Exception as e:
    #     print(f"[ERROR] Unexpected error saving message via /chat/save to chat {request.chat_id}: {e}")
    #     traceback.print_exc()
    #     raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")