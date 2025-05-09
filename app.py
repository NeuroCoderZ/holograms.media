# 1. Базовые импорты
import os
import uuid
import json
import re
from datetime import datetime
import traceback

# 2. Импорты FastAPI и Pydantic
from fastapi import FastAPI, Request, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, ValidationError
from typing import List, Dict, Any, Optional
import httpx
import asyncio
from pymongo.errors import PyMongoError, ConnectionFailure, OperationFailure, ConfigurationError # Добавлены特定ошибки
from dotenv import load_dotenv

# 3. Импорты остальных библиотек (перенесены сюда)
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from bson import ObjectId
from tenacity import retry, stop_after_attempt, wait_fixed
# Импорты для Langchain/LLM оставляем
from langchain_core.runnables import Runnable
from langchain_mistralai import ChatMistralAI
from langchain.tools import Tool
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage
from urllib.parse import urlparse # Для логирования URI


# ----------------------------------------------------------------------
# 4. ИНИЦИАЛИЗАЦИЯ FastAPI ПРИЛОЖЕНИЯ
# ----------------------------------------------------------------------

# --- Упрощенный Lifespan Handler (БЕЗ подключения к DB и инициализации LLM) ---
from contextlib import asynccontextmanager
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Lifespan] Старт (упрощенный)...")
    # Пока ничего не делаем при старте, чтобы гарантировать запуск Uvicorn
    yield # Позволяем приложению работать
    print("[Lifespan] Остановка (упрощенная)...")
    # Ничего не делаем при остановке

# --- Конец упрощенного Lifespan ---

# Инициализация FastAPI с упрощенным lifespan
app = FastAPI(lifespan=lifespan)

# Добавляем CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# ----------------------------------------------------------------------
# 5. ОПРЕДЕЛЕНИЕ Pydantic МОДЕЛЕЙ (без изменений)
# ----------------------------------------------------------------------

class TriaQuery(BaseModel):
    query: str

class JenkinsLogData(BaseModel):
    status: str
    build_url: str
    timestamp: str

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    model: Optional[str] = "mistral/mistral-small-latest"
    history: Optional[List[Dict[str, str]]] = []

class ChatResponse(BaseModel):
    response: str
    should_vocalize: bool = False
    metadata: Optional[Dict[str, Any]] = None

class ChatSaveRequest(BaseModel):
    chat_id: str
    message: ChatMessage

# ----------------------------------------------------------------------
# 6. Загрузка .env 
# ----------------------------------------------------------------------
load_dotenv(override=True) 

# ----------------------------------------------------------------------
# 7. Определение КОНСТАНТ и ГЛОБАЛЬНЫХ ПЕРЕМЕННЫХ
# ----------------------------------------------------------------------

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017") 
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "holograms_db")

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
CODESTRAL_API_KEY = os.getenv("CODESTRAL_API_KEY")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "mistralai/mistral-small-latest") # Обновлено на более общий формат и добавлено значение по умолчанию из env

chain: Optional[Runnable] = None
codestral_llm: Optional[ChatMistralAI] = None # Объявлена глобально
code_generator_tool: Optional[Tool] = None
read_file_tool: Optional[Tool] = None

PROJECT_ROOT = os.path.dirname(__file__) 
FRONTEND_DIR = os.path.abspath(os.path.join(PROJECT_ROOT, 'frontend')) 
INDEX_HTML_PATH = os.path.join(FRONTEND_DIR, 'index.html')

print(f"[DEBUG] PROJECT_ROOT: {PROJECT_ROOT}")
print(f"[DEBUG] FRONTEND_DIR: {FRONTEND_DIR}")
print(f"[DEBUG] INDEX_HTML_PATH: {INDEX_HTML_PATH}")


# ----------------------------------------------------------------------
# 8. Инициализация LLM и Инструментов
# ----------------------------------------------------------------------
print("[INFO] Попытка инициализации моделей и инструментов...")
# --- Инициализация Codestral LLM для Триа ---
print("[INFO] Попытка инициализации LLM (codestral_llm)...")
llm_api_key_to_use = None
llm_key_source = ""

if CODESTRAL_API_KEY:
    llm_api_key_to_use = CODESTRAL_API_KEY
    llm_key_source = "CODESTRAL_API_KEY"
elif MISTRAL_API_KEY:
    llm_api_key_to_use = MISTRAL_API_KEY
    llm_key_source = "MISTRAL_API_KEY (fallback)"
    print("[INFO] CODESTRAL_API_KEY не найден, используется MISTRAL_API_KEY для codestral_llm.")

if not llm_api_key_to_use:
    print("[WARN] Ни CODESTRAL_API_KEY, ни MISTRAL_API_KEY не найдены для инициализации codestral_llm!")
    codestral_llm = None
else:
    try:
        actual_model_for_codestral = os.getenv("CODESTRAL_MODEL_NAME", DEFAULT_MODEL)
        print(f"[DEBUG] Initializing ChatMistralAI for codestral_llm with model '{actual_model_for_codestral}' using {llm_key_source}")
        codestral_llm = ChatMistralAI(
            model_name=actual_model_for_codestral,
            mistral_api_key=llm_api_key_to_use,
            temperature=0.4,
        )
        print(f"[DEBUG] ChatMistralAI for codestral_llm (using {llm_key_source}) initialized successfully.")
    except Exception as e:
        print(f"[ERROR] Ошибка инициализации ChatMistralAI for codestral_llm (using {llm_key_source}): {e}")
        # Если первая попытка (с CODESTRAL_API_KEY) не удалась, и есть MISTRAL_API_KEY, пробуем его
        if llm_key_source == "CODESTRAL_API_KEY" and MISTRAL_API_KEY and CODESTRAL_API_KEY != MISTRAL_API_KEY:
            print("[INFO] Попытка инициализации codestral_llm с MISTRAL_API_KEY как fallback...")
            try:
                print(f"[DEBUG] Initializing ChatMistralAI for codestral_llm with model '{DEFAULT_MODEL}' using MISTRAL_API_KEY (fallback)")
                codestral_llm = ChatMistralAI(
                    model_name=DEFAULT_MODEL,
                    mistral_api_key=MISTRAL_API_KEY,
                    temperature=0.4,
                )
                print("[DEBUG] ChatMistralAI for codestral_llm (using MISTRAL_API_KEY fallback) initialized successfully.")
            except Exception as e_fallback:
                print(f"[ERROR] Ошибка инициализации ChatMistralAI for codestral_llm с MISTRAL_API_KEY (fallback): {e_fallback}")
                traceback.print_exc()
                codestral_llm = None
        else:
            traceback.print_exc()
            codestral_llm = None

# --- Функции-инструменты для Триа (оставляем закомментированными) ---
"""
async def generate_code_tool(task_description: str) -> str:
    # ... (код остался без изменений, закомментирован) ...
def read_file_tool(file_path: str) -> str:
    # ... (код остался без изменений, закомментирован) ...
"""

# --- Создание объектов Tool для Триа (оставляем закомментированными) ---
"""
# if codestral_llm: 
#     code_generator_tool = Tool(...)
#     read_file_tool = Tool(...)
# else:
#     print("[WARN] Инструменты агента Триа не будут инициализированы из-за ошибки LLM.")
#     code_generator_tool = None
#     read_file_tool = None
"""

# --- Маршрутизатор для Триа (оставляем закомментированным) ---
"""
async def invoke_tria_agent(query: str) -> str:
    # ... (код остался без изменений, закомментирован) ...
"""
print("[INFO] Инициализация LLM (основная часть) завершена. Инструменты и агент Триа закомментированы.")


# ----------------------------------------------------------------------
# 9. Определение Вспомогательных Функций для DB
# ----------------------------------------------------------------------

async def get_database() -> AsyncIOMotorDatabase:
    """Возвращает объект базы данных MongoDB."""
    print("[DB Connect] Попытка подключения к MongoDB...")
    loaded_mongo_uri = os.getenv("MONGO_URI") # Получаем URI здесь, чтобы использовать актуальное значение
    if not loaded_mongo_uri:
        print("[DB Connect ERROR] !!! MONGO_URI не установлен в переменных окружения!")
        raise ValueError("MONGO_URI environment variable not set.")
    
    try:
        parsed_uri = urlparse(loaded_mongo_uri)
        print(f"[DB Connect DEBUG] MONGO_URI loaded. Scheme: {parsed_uri.scheme}, Host: {parsed_uri.hostname}, User: {parsed_uri.username}")
    except Exception as parse_err:
        print(f"[DB Connect DEBUG] MONGO_URI loaded, but failed to parse for logging: {parse_err}")

    try:
        local_client = AsyncIOMotorClient(loaded_mongo_uri, serverSelectionTimeoutMS=5000)
        await local_client.admin.command('ping')
        # Логируем хост из URI, чтобы не светить пароль
        uri_to_log = loaded_mongo_uri.split('@')[-1] if '@' in loaded_mongo_uri else loaded_mongo_uri
        print(f"[DB Connect] Успешное подключение к MongoDB ({MONGO_DB_NAME}@{uri_to_log}).")
        return local_client[MONGO_DB_NAME]
    except ConfigurationError as ce:
        print(f"[DB Connect ERROR] !!! Ошибка конфигурации MongoDB: {ce}")
        traceback.print_exc()
        raise
    except OperationFailure as ofe: 
        print(f"[DB Connect ERROR] !!! Ошибка операции MongoDB (возможно, аутентификация): {ofe.details}")
        traceback.print_exc()
        raise
    except ConnectionFailure as cf:
        print(f"[DB Connect ERROR] !!! Ошибка соединения с MongoDB: {cf}")
        traceback.print_exc()
        raise
    except Exception as e:
        print(f"[DB Connect ERROR] !!! Общая ошибка подключения к MongoDB: {e}")
        traceback.print_exc()
        raise

# ----------------------------------------------------------------------
# 10. ОПРЕДЕЛЕНИЕ РОУТОВ
# ----------------------------------------------------------------------

@app.get("/health")
async def health_check():
    print("[Health Check] Endpoint called.")
    mongo_status = "disconnected"
    db_name_to_report = "N/A"
    try:
        db_local = await get_database() 
        await db_local.command('ping') 
        mongo_status = "connected"
        db_name_to_report = MONGO_DB_NAME
        print("[Health Check] MongoDB ping successful.")
        return {"status": "ok", "mongo": mongo_status, "db_name": db_name_to_report}
    except Exception as e:
        print(f"[Health Check ERROR] MongoDB connection/ping failed: {e}")
        # Не выбрасываем HTTPException здесь, чтобы сам /health всегда отвечал 200, но с информацией об ошибке
        return {"status": "error", "mongo": mongo_status, "db_name": db_name_to_report, "error_details": str(e)}


@app.head("/health")
async def health_check_head():
    return Response(status_code=200)

@app.get("/")
async def read_index():
    if os.path.exists(INDEX_HTML_PATH):
        return FileResponse(INDEX_HTML_PATH, media_type="text/html")
    else:
        print(f"[ERROR /] index.html НЕ НАЙДЕН по пути: {INDEX_HTML_PATH}")
        raise HTTPException(status_code=404, detail="index.html not found")

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest): # Переименовал, чтобы не конфликтовать с модулем chat
    print(f"[CHAT DEBUG] /chat endpoint called with model: {request.model}")

    if codestral_llm is None: 
        print("[CHAT ERROR] LLM не инициализирован!")
        # Возвращаем корректный JSON ответ об ошибке, если модель не готова
        # Вместо HTTPException, чтобы фронтенд мог это обработать как данные
        return JSONResponse(
            status_code=503,
            content={"response": "Ошибка: Модель ИИ (LLM) не доступна в данный момент. Пожалуйста, попробуйте позже.", "should_vocalize": False, "metadata": {"error": "LLM_NOT_INITIALIZED"}}
        )

    messages = [SystemMessage(content="You are Tria, an AI assistant for the Holograms.media project. Provide concise and helpful responses. If asked to generate code, use the code_generator tool if available.")]
    for msg in request.history:
        if msg['role'] == 'user':
            messages.append(HumanMessage(content=msg['content']))
        elif msg['role'] == 'assistant':
            messages.append(AIMessage(content=msg['content']))
    messages.append(HumanMessage(content=request.message))
    print(f"[CHAT DEBUG] Prepared {len(messages)} messages for LLM.")

    try:
        print("[CHAT DEBUG] Attempting codestral_llm.ainvoke...")
        llm_response_obj = await codestral_llm.ainvoke(messages) # llm_response_obj это AIMessage
        response_content = llm_response_obj.content
        print(f"[CHAT DEBUG] ChatMistralAI response received (first 100 chars): {response_content[:100]}...")
        should_vocalize = False 
        chat_id_to_return = None # Переименовал, чтобы не конфликтовать с chat_id в других местах

        try:
            db_local = await get_database() 
            chat_id_val = str(uuid.uuid4()) 
            chat_collection_for_saving = db_local["chat_history"]
            chat_document = {
                "chat_id": chat_id_val,
                "timestamp": datetime.now(),
                "model": request.model,
                "user_message": request.message,
                "tria_response": response_content,
                "full_history_sent_to_llm": [msg.dict() for msg in messages] 
            }
            insert_result = await chat_collection_for_saving.insert_one(chat_document)
            if insert_result.inserted_id:
                chat_id_to_return = chat_id_val
                print(f"[CHAT DB] Чат успешно сохранен с ID: {chat_id_to_return}")
            else:
                print("[CHAT DB ERROR] Ошибка сохранения чата, ID не получен.")
        except Exception as db_error:
            print(f"[CHAT DB ERROR] Ошибка при сохранении чата в MongoDB: {db_error}")
            traceback.print_exc()
            # Не прерываем ответ LLM из-за ошибки БД, но логируем
            response_content += "\n\n(Примечание: произошла ошибка при сохранении этого сообщения в истории.)"


        return ChatResponse(response=response_content, should_vocalize=should_vocalize, metadata={"chat_id": chat_id_to_return} if chat_id_to_return else None)

    except HTTPException as he: # Перехватываем HTTPException явно, если они были брошены где-то выше
         raise he
    except Exception as e:
        traceback.print_exc()
        error_details = str(e)
        # Возвращаем JSON с ошибкой вместо HTTPException для более контролируемой обработки на фронте
        return JSONResponse(
            status_code=500,
            content={"response": f"Внутренняя ошибка сервера при обработке чат-запроса: {error_details[:200]}...", "should_vocalize": False, "metadata": {"error": "LLM_INVOKE_FAILED"}}
        )

# <<< ЗАГЛУШКИ для остальных роутов >>>
@app.post("/generate")
async def generate_content(request: Request):
     print("[WARN] /generate endpoint called (Not Implemented).")
     raise HTTPException(status_code=501, detail="Endpoint /generate Not Implemented Yet")

@app.post("/branches")
async def create_branch_version(request: Request):
    print("[WARN] /branches POST endpoint called (Not Implemented).")
    raise HTTPException(status_code=501, detail="Endpoint /branches POST Not Implemented Yet")

@app.get("/branches/{branch}")
async def get_branch_versions(branch: str):
    print(f"[WARN] /branches/{branch} GET endpoint called (Not Implemented).")
    raise HTTPException(status_code=501, detail=f"Endpoint /branches/{branch} GET Not Implemented Yet")

@app.put("/branches/{branch}/switch")
async def switch_branch_version(branch: str, request: Request):
    print(f"[WARN] /branches/{branch}/switch PUT endpoint called (Not Implemented).")
    raise HTTPException(status_code=501, detail=f"Endpoint /branches/{branch}/switch PUT Not Implemented Yet")

@app.post("/tria/save_logs")
async def save_logs(request: Request):
    print("[WARN] /tria/save_logs endpoint called (Not Implemented).")
    raise HTTPException(status_code=501, detail="Endpoint /tria/save_logs Not Implemented Yet")

@app.post("/tria/invoke")
async def tria_invoke(tria_query: TriaQuery):
    print("[WARN] /tria/invoke endpoint called (Not Implemented).")
    raise HTTPException(status_code=501, detail="Endpoint /tria/invoke Not Implemented Yet (LLM/Tools not initialized or logic not implemented)")

@app.post("/chat/save") # Оставляем как есть, так как логика сохранения теперь внутри /chat
async def save_chat_message(request: ChatSaveRequest):
    print("[WARN] /chat/save endpoint called, but saving logic is now within /chat (Deprecated Endpoint).")
    raise HTTPException(status_code=501, detail="Endpoint /chat/save is deprecated. Chat saving is handled automatically by the /chat endpoint.")


# ----------------------------------------------------------------------
# 11. МОНТИРОВАНИЕ СТАТИКИ
# ----------------------------------------------------------------------

if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR, html=False), name="static_files")
    print(f"[INFO] Статика успешно смонтирована из: {FRONTEND_DIR} на /static")
else:
    print(f"[CRITICAL ERROR] Директория для статики НЕ НАЙДЕНА: {FRONTEND_DIR}")