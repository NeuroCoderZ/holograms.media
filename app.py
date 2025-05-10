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
from pymongo.errors import PyMongoError
from dotenv import load_dotenv

# 3. Импорты остальных библиотек (перенесены сюда)
from motor.motor_asyncio import AsyncIOMotorClient
from tenacity import retry, stop_after_attempt, wait_fixed
# Импорты для Langchain/LLM оставляем, но код инициализации закомментирован
from langchain_core.runnables import Runnable
from langchain_mistralai import ChatMistralAI
from langchain.tools import Tool
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage


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
# TODO: В продакшене allow_origins=["*"] ОПАСНО. Укажи конкретные домены фронтенда.
# Также проверь allow_methods и allow_headers, возможно нужно ограничить.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Временно разрешаем все для отладки на HF
    allow_credentials=True,
    allow_methods=["*"], # Временно разрешаем все
    allow_headers=["*"], # Временно разрешаем все
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
# 6. Загрузка .env (на всякий случай, если там есть что-то кроме DB/LLM ключей)
# ----------------------------------------------------------------------
load_dotenv(override=True) # Загружаем переменные, если есть .env файл

# ----------------------------------------------------------------------
# 7. Определение КОНСТАНТ и ГЛОБАЛЬНЫХ ПЕРЕМЕННЫХ
# ----------------------------------------------------------------------

# --- MongoDB (URI берется из окружения, db инициализируется позже) ---
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017") # Значение по умолчанию для локального запуска
MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "holograms_db")
# В этой версии db/client не инициализируются глобально, а получаются в роутах

# --- LLM Ключи и Модели (читаются из окружения) ---
# Проверь, что ты добавил эти ключи как Secrets в настройках HF Space
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
CODESTRAL_API_KEY = os.getenv("CODESTRAL_API_KEY")
DEFAULT_MODEL = "mistral/mistral-small-latest" # Используем Mistral по умолчанию для чата

# --- Переменные для LLM и инструментов (Инициализация ЗАКОММЕНТИРОВАНА) ---
# Эти переменные останутся None до тех пор, пока ты не раскомментируешья и не адаптируешья блок инициализации ниже
chain: Optional[Runnable] = None
codestral_llm: Optional[ChatMistralAI] = None
code_generator_tool: Optional[Tool] = None
read_file_tool: Optional[Tool] = None

# --- Прочие ---
# !!! ВАЖНО: Пути к статике скорректированы, так как app.py теперь в корне !!!
PROJECT_ROOT = os.path.dirname(__file__) # Корень проекта там же, где app.py
FRONTEND_DIR = os.path.abspath(os.path.join(PROJECT_ROOT, 'frontend')) # frontend/ относительно корня
INDEX_HTML_PATH = os.path.join(FRONTEND_DIR, 'index.html')

print(f"[DEBUG] PROJECT_ROOT: {PROJECT_ROOT}")
print(f"[DEBUG] FRONTEND_DIR: {FRONTEND_DIR}")
print(f"[DEBUG] INDEX_HTML_PATH: {INDEX_HTML_PATH}")


# ----------------------------------------------------------------------
# 8. Инициализация LLM и Инструментов
# ----------------------------------------------------------------------
print("[INFO] Попытка инициализации LLM (codestral_llm)...")
MISTRAL_API_KEY_VALUE = os.getenv("MISTRAL_API_KEY") # Получаем MISTRAL_API_KEY
CODESTRAL_API_KEY_VALUE = os.getenv("CODESTRAL_API_KEY") # Получаем CODESTRAL_API_KEY

api_key_to_use = None
key_source_message = ""

if CODESTRAL_API_KEY_VALUE:
    api_key_to_use = CODESTRAL_API_KEY_VALUE
    key_source_message = "using CODESTRAL_API_KEY"
elif MISTRAL_API_KEY_VALUE:
    api_key_to_use = MISTRAL_API_KEY_VALUE
    key_source_message = "using MISTRAL_API_KEY as fallback for codestral_llm"
    print("[INFO] CODESTRAL_API_KEY не найден, используется MISTRAL_API_KEY для codestral_llm.")

if not api_key_to_use:
    print(f"[WARN] Ни CODESTRAL_API_KEY, ни MISTRAL_API_KEY не найдены! codestral_llm не будет инициализирован.")
    codestral_llm = None
else:
    try:
        # Используем DEFAULT_MODEL, так как он более общий или может быть настроен через env.
        # Если для Codestral нужна специфичная модель, ее имя должно быть в DEFAULT_MODEL или CODESTRAL_MODEL_NAME
        model_to_use = os.getenv("CODESTRAL_MODEL_NAME", DEFAULT_MODEL)
        print(f"[DEBUG] Initializing ChatMistralAI for codestral_llm with model '{model_to_use}' {key_source_message}.")
        codestral_llm = ChatMistralAI(
            model_name=model_to_use,
            mistral_api_key=api_key_to_use,
            temperature=0.4,
        )
        print(f"[DEBUG] ChatMistralAI for codestral_llm initialized successfully {key_source_message}.")
    except Exception as e:
        print(f"[ERROR] Ошибка инициализации ChatMistralAI for codestral_llm {key_source_message}: {e}")
        traceback.print_exc() # Печатаем traceback первой ошибки
        # Если первая попытка (с CODESTRAL_API_KEY) не удалась, но MISTRAL_API_KEY есть и он ДРУГОЙ
        if api_key_to_use == CODESTRAL_API_KEY_VALUE and MISTRAL_API_KEY_VALUE and CODESTRAL_API_KEY_VALUE != MISTRAL_API_KEY_VALUE:
            print("[INFO] Повторная попытка инициализации codestral_llm с MISTRAL_API_KEY...")
            try:
                model_for_fallback = os.getenv("CODESTRAL_MODEL_NAME", DEFAULT_MODEL) # Используем ту же модель или DEFAULT_MODEL
                print(f"[DEBUG] Initializing ChatMistralAI for codestral_llm with model '{model_for_fallback}' using MISTRAL_API_KEY (fallback).")
                codestral_llm = ChatMistralAI(
                    model_name=model_for_fallback,
                    mistral_api_key=MISTRAL_API_KEY_VALUE, # Используем MISTRAL_API_KEY
                    temperature=0.4,
                )
                print("[DEBUG] ChatMistralAI for codestral_llm initialized successfully using MISTRAL_API_KEY (fallback).")
            except Exception as e_fallback:
                print(f"[ERROR] Ошибка повторной инициализации ChatMistralAI for codestral_llm с MISTRAL_API_KEY: {e_fallback}")
                traceback.print_exc()
                codestral_llm = None # Окончательная неудача
        else: # Если MISTRAL_API_KEY не было, или он такой же, или это была уже попытка с MISTRAL_API_KEY
            codestral_llm = None # Окончательная неудача

"""

# --- Функции-инструменты для Триа (определение оставляем, они не выполняются при импорте) ---
async def generate_code_tool(task_description: str) -> str:
    # Здесь будет код вызова LLM для генерации кода
    if codestral_llm is None:
         return "Ошибка: LLM для генерации кода не инициализирован."
    try:
        messages = [
            SystemMessage(content="You are a helpful AI assistant that generates code based on user requests."),
            HumanMessage(content=f"Generate code for the following task: {task_description}")
        ]
        response = await codestral_llm.ainvoke(messages)
        return response.content
    except Exception as e:
        print(f"[ERROR] Error generating code: {e}")
        traceback.print_exc()
        return f"Произошла ошибка при генерации кода: {e}"

def read_file_tool(file_path: str) -> str:
    # Здесь будет код для чтения файла (нужно адаптировать для окружения HF Space)
    # Возможно, нужно ограничить доступ к файлам
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return f"Ошибка: Файл не найден по пути: {file_path}"
    except Exception as e:
        print(f"[ERROR] Error reading file {file_path}: {e}")
        traceback.print_exc()
        return f"Произошла ошибка при чтении файла: {e}"


# --- Создание объектов Tool для Триа (закомментировано) ---
# Эти объекты требуют инициализированных функций-инструментов
# if codestral_llm: # Создаем инструменты только если LLM успешно инициализирован
#     code_generator_tool = Tool(
#         name="code_generator",
#         func=generate_code_tool, # Для sync вызова (если используется func)
#         description="Use this tool to generate code based on a task description. Input should be a string describing the code needed.",
#         coroutine=generate_code_tool # Для async вызова
#     )
#     # Для file_reader, если он синхронный, func достаточно
#     read_file_tool = Tool(
#         name="file_reader",
#         func=read_file_tool,
#         description="Use this tool to read the content of a specified file path. Input should be the file path as a string."
#     )
# else:
#     print("[WARN] Инструменты агента Триа не будут инициализированы из-за ошибки LLM.")
#     code_generator_tool = None
#     read_file_tool = None


# --- Маршрутизатор для Триа (определение оставляем) ---
async def invoke_tria_agent(query: str) -> str:
    # Этот код пока будет возвращать ошибку, т.к. инструменты закомментированы выше
    # После раскомментирования инициализации инструментов, нужно будет дописать логику agent.invoke
    print(f"[TRIA INVOKE] Вызов tria_agent с запросом: {query}")
    if not code_generator_tool or not read_file_tool:
        print("[TRIA INVOKE ERROR] Инструменты агента Триа не инициализированы.")
        return "Ошибка: Инструменты агента Триа не инициализированы."

    # TODO: Дописать логику вызова Langchain Agent с инструментами

    return "Tria Agent: Логика агента пока не реализована." # Временно


print("[INFO] Инициализация моделей и инструментов (закомментированная часть) завершена.")
"""

# ----------------------------------------------------------------------
# 9. Определение Вспомогательных Функций для DB (НУЖНЫ для роутов)
# ----------------------------------------------------------------------

# --- Логика ПОДКЛЮЧЕНИЯ к MongoDB (вызывается при необходимости из роутов) ---
@retry(stop=stop_after_attempt(3), wait=wait_fixed(2))
async def get_db_client() -> AsyncIOMotorClient:
    """Возвращает ПОДКЛЮЧЕННЫЙ клиент MongoDB или выбрасывает исключение."""
    print("[DB Connect] Попытка получения клиента MongoDB...")
    # Убедись, что переменные MONGO_URI и MONGO_DB_NAME прочитаны из окружения (.env или Secrets)
    loaded_mongo_uri = MONGO_URI # Используем глобальную переменную, загруженную ранее
    if not loaded_mongo_uri:
         print("[DB Connect ERROR] !!! MONGO_URI не установлен в переменных окружения!")
         raise ValueError("MONGO_URI environment variable not set.")
    
    # Логирование части URI без пароля
    try:
        from urllib.parse import urlparse
        parsed_uri = urlparse(loaded_mongo_uri)
        safe_uri_display = f"{parsed_uri.scheme}://{parsed_uri.username}:<PASSWORD_HIDDEN>@{parsed_uri.hostname}{parsed_uri.path}"
        print(f"[DB Connect INFO] Connecting to MongoDB with URI (password hidden): {safe_uri_display}")
    except Exception as parse_err:
        print(f"[DB Connect WARN] Could not parse MONGO_URI for safe logging: {parse_err}")
        # В случае ошибки парсинга, просто продолжаем, основная логика не должна прерываться

    try:
        # Используем переменные окружения, прочитанные ранее
        # serverSelectionTimeoutMS=5000 устанавливает таймаут для поиска сервера
        # Добавляем retryWrites=true для автоматических повторных попыток записи
        local_client = AsyncIOMotorClient(
            loaded_mongo_uri, 
            serverSelectionTimeoutMS=5000,
            retryWrites=True,
            connectTimeoutMS=10000,
            socketTimeoutMS=20000
        )
        # Проверка связи с базой данных
        await local_client.admin.command('ping') # Используем 'ping' вместо 'ismaster' для большей совместимости
        print(f"[DB Connect] Клиент MongoDB ({MONGO_DB_NAME}@{parsed_uri.hostname if 'parsed_uri' in locals() else 'unknown_host'}) успешно получен и проверен.")
        return local_client
    except PyMongoError as mongo_specific_error:
        print(f"[DB Connect ERROR] !!! ОШИБКА ПОДКЛЮЧЕНИЯ/ПРОВЕРКИ MongoDB (PyMongoError): {mongo_specific_error}")
        traceback.print_exc()
        raise
    except Exception as e:
        print(f"[DB Connect ERROR] !!! ОШИБКА ПОДКЛЮЧЕНИЯ/ПРОВЕРКИ MongoDB: {e}")
        traceback.print_exc()
        raise # Повторяем попытку через tenacity или выбрасываем исключение

async def get_database():
    """Возвращает кортеж (db, client) с подключенной базой данных и клиентом MongoDB.
    Клиент должен быть закрыт после использования через close_db_client()."""
    client = await get_db_client()
    db = client[MONGO_DB_NAME]
    return db, client

async def close_db_client(local_client: Optional[AsyncIOMotorClient]):
    """Закрывает соединение с MongoDB, если клиент существует."""
    if local_client:
        local_client.close()
        print("[DB Shutdown] Соединение с MongoDB закрыто.")

# ----------------------------------------------------------------------
# 10. ОПРЕДЕЛЕНИЕ РОУТОВ (с получением DB внутри)
# ----------------------------------------------------------------------

@app.get("/health")
async def health_check():
    """Проверка состояния приложения и подключения к MongoDB."""
    print("[Health Check] Endpoint called.")
    local_client_for_health: Optional[AsyncIOMotorClient] = None
    try:
        db_local, local_client_for_health = await get_database() # Используем новую переменную для клиента
        await db_local.command('ping') # Пингуем конкретную базу
        print("[Health Check] MongoDB ping successful.")
        return {"status": "ok", "mongo": "connected", "db_name": MONGO_DB_NAME}
    except Exception as e:
        print(f"[Health Check ERROR] MongoDB connection/ping failed: {e}")
        # Не показываем детали ошибки клиенту в health check
        # В зависимости от требований к health check, можно вернуть 503 или просто статус non-ok
        raise HTTPException(status_code=503, detail=f"Service Unavailable: MongoDB connection failed ({e})")
    finally:
        # Важно закрывать соединение после каждого запроса в этой модели
        if local_client_for_health:
            await close_db_client(local_client_for_health)
            print("[Health Check] MongoDB connection closed successfully.")
        else:
            print("[Health Check] No MongoDB connection to close.")


@app.get("/")
async def read_index():
    """Отдает основной index.html."""
    if os.path.exists(INDEX_HTML_PATH):
        return FileResponse(INDEX_HTML_PATH, media_type="text/html")
    else:
        print(f"[ERROR /] index.html НЕ НАЙДЕН по пути: {INDEX_HTML_PATH}")
        raise HTTPException(status_code=404, detail="index.html not found")

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    print(f"[CHAT DEBUG] /chat endpoint called with model: {request.model}")
    local_client_for_chat: Optional[AsyncIOMotorClient] = None
    db_save_error_note = ""

    # ----- ПРОВЕРКА LLM (Оставляем, т.к. инициализация закомментирована) -----
    # TODO: Раскомментировать инициализацию LLM выше и убрать эту заглушку
    if codestral_llm is None: # Проверяем инициализированную переменную LLM
        print("[CHAT ERROR] LLM не инициализирован!")
        # Здесь можно было бы попытаться инициализировать LLM, если он не None,
        # но это лучше делать в lifespan или отдельной функции с кешированием,
        # а не при каждом запросе. Пока просто возвращаем ошибку.
        raise HTTPException(status_code=503, detail="LLM Service not available. API keys might be missing or initialization failed.")

    # Формируем историю сообщений для LLM
    # TODO: Добавь нужный системный промпт для Триа
    messages = [SystemMessage(content="You are Tria, an AI assistant for the Holograms.media project. Provide concise and helpful responses. If asked to generate code, use the code_generator tool if available.")]

    # Добавляем историю из запроса
    for msg in request.history:
        if msg['role'] == 'user':
            messages.append(HumanMessage(content=msg['content']))
        elif msg['role'] == 'assistant':
            messages.append(AIMessage(content=msg['content'])) # Используем AIMessage для ответов ассистента
        # Пропускаем другие роли, если есть

    # Добавляем текущее сообщение пользователя
    messages.append(HumanMessage(content=request.message))

    print(f"[CHAT DEBUG] Prepared {len(messages)} messages for LLM.")
    # print(f"[CHAT DEBUG] Messages: {messages}") # Отладочный вывод, осторожно с чувствительными данными

    try:
        # Вызов LLM
        print("[CHAT DEBUG] Attempting codestral_llm.ainvoke...")
        # !!! ВАЖНО: Здесь вызывается ainvoke на codestral_llm, который сейчас None !!!
        # Этот роут будет выдавать 503 ошибку до тех пор, пока блок инициализации LLM не будет раскомментирован и исправлен.
        # Убедись, что API ключи добавлены как Secrets в HF Space перед раскомментированием.
        response = await codestral_llm.ainvoke(messages)
        response_content = response.content
        print(f"[CHAT DEBUG] ChatMistralAI response received (first 100 chars): {response_content[:100]}...")
        should_vocalize = False # TODO: Определить логику озвучивания
        chat_id = None

        # Сохранение в БД
        try:
            db_local, local_client_for_chat = await get_database() # Используем новую функцию get_database()
            chat_id_val = str(uuid.uuid4()) # Генерируем UUID для чата
            chat_collection_for_saving = db_local["chat_history"]

            # Готовим документ для вставки. Сохраняем полную историю, отправленную в LLM,
            # текущее сообщение пользователя и ответ ассистента.
            chat_document = {
                "chat_id": chat_id_val,
                "timestamp": datetime.now(),
                "model": request.model,
                "user_message": request.message,
                "tria_response": response_content,
                "full_history_sent_to_llm": [msg.dict() for msg in messages] # Сохраняем всю историю как список словарей
            }
            
            print(f"[CHAT DB DEBUG] Attempting insert into {chat_collection_for_saving.name}. Doc ID: {chat_document.get('chat_id')}")
            await chat_collection_for_saving.insert_one(chat_document)
            chat_id = chat_id_val # Передаем сгенерированный ID в ответ
            print(f"[CHAT DB INFO] Chat history saved successfully. Chat ID: {chat_id}")

        except PyMongoError as mongo_error:
            print(f"[CHAT DB ERROR] MongoDB error while saving chat history: {mongo_error}")
            traceback.print_exc()
            db_save_error_note = " (Примечание: Ошибка при сохранении истории чата в базу данных)"
            # Ошибка сохранения в БД не должна блокировать успешный ответ LLM
            # chat_id останется None в этом случае
        except Exception as db_error:
            print(f"[CHAT DB ERROR] Unexpected error while saving chat history: {db_error}")
            traceback.print_exc()
            db_save_error_note = " (Примечание: Ошибка при сохранении истории чата в базу данных)"
            # Ошибка сохранения в БД не должна блокировать успешный ответ LLM
            # chat_id останется None в этом случае

        final_response_content = response_content
        if db_save_error_note:
            final_response_content += db_save_error_note

        return ChatResponse(response=final_response_content, should_vocalize=should_vocalize, metadata={"chat_id": chat_id} if chat_id else None)

    except HTTPException as he:
         # Если это наша HTTPException (например, 503 от проверки LLM), просто пробрасываем ее
         raise he
    except Exception as e:
        # Ловим все остальные ошибки при вызове LLM или обработке ответа
        traceback.print_exc()
        error_details = str(e)
        # Возвращаем общую ошибку сервера, не раскрывая слишком много внутренних деталей
        raise HTTPException(status_code=500, detail=f"Internal Server Error: Failed to process chat request. Details: {error_details[:200]}...") # Обрезаем детали

    finally:
        # Важно закрывать соединение с БД в конце обработки запроса
        if local_client_for_chat:
            await close_db_client(local_client_for_chat)
            print("[CHAT DB INFO] MongoDB connection closed successfully.")
        else:
            print("[CHAT DB INFO] No MongoDB connection to close.")


# <<< ЗАГЛУШКИ для остальных роутов, использующих DB или LLM/инструменты >>>
# Эти роуты временно возвращают 501 Not Implemented.
# Тебе нужно будет реализовать их логику, включая блоки try/finally для get_db_client(),
# аналогично роутам /health и /chat, и раскомментировать/адаптировать LLM/Tool логику.

@app.post("/generate")
async def generate_content(request: Request):
     print("[WARN] /generate endpoint called (Not Implemented).")
     # TODO: Реализовать логику генерации контента, возможно с использованием LLM/инструментов
     raise HTTPException(status_code=501, detail="Endpoint /generate Not Implemented Yet")

@app.post("/branches")
async def create_branch_version(request: Request):
    print("[WARN] /branches POST endpoint called (Not Implemented).")
    # TODO: Реализовать логику создания версий веток, включая работу с DB
    raise HTTPException(status_code=501, detail="Endpoint /branches POST Not Implemented Yet")

@app.get("/branches/{branch}")
async def get_branch_versions(branch: str):
    print(f"[WARN] /branches/{branch} GET endpoint called (Not Implemented).")
    # TODO: Реализовать логику получения версий ветки, включая работу с DB
    raise HTTPException(status_code=501, detail=f"Endpoint /branches/{branch} GET Not Implemented Yet")

@app.put("/branches/{branch}/switch")
async def switch_branch_version(branch: str, request: Request):
    print(f"[WARN] /branches/{branch}/switch PUT endpoint called (Not Implemented).")
    # TODO: Реализовать логику переключения версий ветки, включая работу с DB
    raise HTTPException(status_code=501, detail=f"Endpoint /branches/{branch}/switch PUT Not Implemented Yet")

@app.post("/tria/save_logs")
async def save_logs(request: Request):
    print("[WARN] /tria/save_logs endpoint called (Not Implemented).")
    # TODO: Реализовать логику сохранения логов (например, логов взаимодействия с Триа), включая работу с DB
    raise HTTPException(status_code=501, detail="Endpoint /tria/save_logs Not Implemented Yet")

@app.post("/tria/invoke")
async def tria_invoke(tria_query: TriaQuery):
    print("[WARN] /tria/invoke endpoint called (Not Implemented).")
    # TODO: Раскомментировать инициализацию LLM/инструментов и реализовать здесь вызов агента Триа
    # if not codestral_llm or not code_generator_tool or not read_file_tool:
    #     raise HTTPException(status_code=503, detail="Tria Agent components not initialized.")
    # # ... вызов invoke_tria_agent(tria_query.query) ...
    raise HTTPException(status_code=501, detail="Endpoint /tria/invoke Not Implemented Yet (LLM/Tools not initialized or logic not implemented)")

# Роут /chat/save помечен как deprecated, так как сохранение происходит внутри /chat
@app.post("/chat/save")
async def save_chat_message(request: ChatSaveRequest):
    print("[WARN] /chat/save endpoint called, but saving logic is now within /chat (Deprecated Endpoint).")
    raise HTTPException(status_code=501, detail="Endpoint /chat/save is deprecated. Chat saving is handled automatically by the /chat endpoint.")


# ----------------------------------------------------------------------
# 11. МОНТИРОВАНИЕ СТАТИКИ
# ----------------------------------------------------------------------

# Монтирование статики
if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR, html=False), name="static_files")
    print(f"[INFO] Статика успешно смонтирована из: {FRONTEND_DIR} на /static")
else:
    print(f"[CRITICAL ERROR] Директория для статики НЕ НАЙДЕНА: {FRONTEND_DIR}")