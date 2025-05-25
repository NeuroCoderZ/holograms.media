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
# from pymongo.errors import PyMongoError # Removed
from dotenv import load_dotenv

# 3. Импорты остальных библиотек (перенесены сюда)
import asyncpg # Added for PostgreSQL
from backend.db import pg_connector, crud_operations # Added for PostgreSQL
# from tenacity import retry, stop_after_attempt, wait_fixed # Removed
# Импорты для Langchain/LLM оставляем, но код инициализации закомментирован
from langchain_core.runnables import Runnable
from langchain_mistralai import ChatMistralAI
from langchain.tools import Tool
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage


# ----------------------------------------------------------------------
# 4. ИНИЦИАЛИЗАЦИЯ FastAPI ПРИЛОЖЕНИЯ
# ----------------------------------------------------------------------

# --- Lifespan Handler with PostgreSQL Integration ---
from contextlib import asynccontextmanager
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Lifespan] Application startup...")
    try:
        await pg_connector.init_pg_pool()
        print("[Lifespan] PostgreSQL connection pool initialized successfully.")
    except Exception as e:
        print(f"[Lifespan ERROR] Failed to initialize PostgreSQL pool: {e}")
        # Depending on the application's needs, you might want to prevent startup
        # or handle this more gracefully. For now, just logging.
    yield # Allow the application to run
    print("[Lifespan] Application shutdown...")
    try:
        await pg_connector.close_pg_pool()
        print("[Lifespan] PostgreSQL connection pool closed successfully.")
    except Exception as e:
        print(f"[Lifespan ERROR] Failed to close PostgreSQL pool: {e}")

# --- End Lifespan Handler ---

# Initialize FastAPI with the updated lifespan
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

# class ChatSaveRequest(BaseModel): # Removed
#     chat_id: str
#     message: ChatMessage

# ----------------------------------------------------------------------
# 6. Загрузка .env (на всякий случай, если там есть что-то кроме DB/LLM ключей)
# ----------------------------------------------------------------------
load_dotenv(override=True) # Загружаем переменные, если есть .env файл

# ----------------------------------------------------------------------
# 7. Определение КОНСТАНТ и ГЛОБАЛЬНЫХ ПЕРЕМЕННЫХ
# ----------------------------------------------------------------------

# --- LLM Ключи и Модели (читаются из окружения) ---
# Проверь, что ты добавил эти ключи как Secrets в настройках HF Space
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
CODESTRAL_API_KEY = os.getenv("CODESTRAL_API_KEY")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "mistral-small-latest") # Используем Mistral по умолчанию для чата

# --- Переменные для LLM и инструментов (Инициализация ЗАКОММЕНТИРОВАНА) ---
# Эти переменные останутся None до тех пор, пока ты не раскомментируешья и не адаптируешья блок инициализации ниже
chain: Optional[Runnable] = None
codestral_llm: Optional[ChatMistralAI] = None
code_generator_tool: Optional[Tool] = None
read_file_tool: Optional[Tool] = None

# --- Прочие ---
# Определяем корень проекта относительно текущего файла app.py
# __file__ будет /app/backend/app.py в контейнере
# os.path.dirname(__file__) -> /app/backend
# os.path.abspath(os.path.join(os.path.dirname(__file__), '..')) -> /app (это будет наш корень проекта в контейнере)
APP_PY_DIR = os.path.dirname(__file__)
PROJECT_ROOT_IN_CONTAINER = os.path.abspath(os.path.join(APP_PY_DIR, '..'))

FRONTEND_DIR = os.path.join(PROJECT_ROOT_IN_CONTAINER, 'frontend')
INDEX_HTML_PATH = os.path.join(FRONTEND_DIR, 'index.html')

print(f"[DEBUG] (Corrected) PROJECT_ROOT_IN_CONTAINER: {PROJECT_ROOT_IN_CONTAINER}")
print(f"[DEBUG] (Corrected) FRONTEND_DIR: {FRONTEND_DIR}")
print(f"[DEBUG] (Corrected) INDEX_HTML_PATH: {INDEX_HTML_PATH}")


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
# 9. Определение Вспомогательных Функций для DB (MongoDB related - REMOVED)
# ----------------------------------------------------------------------
# All MongoDB helper functions (get_db_client, get_database, close_db_client) are removed.
# PostgreSQL connections are handled by pg_connector.

# ----------------------------------------------------------------------
# 10. ОПРЕДЕЛЕНИЕ РОУТОВ
# ----------------------------------------------------------------------

@app.get("/health")
async def health_check():
    """Проверка состояния приложения и подключения к PostgreSQL."""
    print("[Health Check] Endpoint called.")
    conn: Optional[asyncpg.Connection] = None
    try:
        conn = await pg_connector.get_pg_connection()
        # Perform a simple query to check connectivity
        result = await conn.fetchval("SELECT 1")
        if result == 1:
            print("[Health Check] PostgreSQL connection successful.")
            return {"status": "ok", "postgres": "connected"}
        else:
            print("[Health Check ERROR] PostgreSQL connection test query failed.")
            raise HTTPException(status_code=503, detail="Service Unavailable: PostgreSQL connection query failed")
    except asyncpg.PostgresError as e_pg:
        error_message = f"PostgreSQL connection error: {e_pg}"
        print(f"[Health Check ERROR] {error_message}")
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=f"Service Unavailable: {error_message}")
    except Exception as e:
        error_message = f"Unknown error connecting to PostgreSQL: {e}"
        print(f"[Health Check ERROR] {error_message}")
        traceback.print_exc()
        raise HTTPException(status_code=503, detail=f"Service Unavailable: {error_message}")
    finally:
        if conn:
            try:
                await pg_connector.release_pg_connection(conn)
                print("[Health Check] PostgreSQL connection released successfully.")
            except Exception as e_release:
                print(f"[Health Check ERROR] Failed to release PostgreSQL connection: {e_release}")


@app.get("/")
async def read_index():
    """Отдает основной index.html."""
    if os.path.exists(INDEX_HTML_PATH):
        return FileResponse(INDEX_HTML_PATH, media_type="text/html")
    else:
        print(f"[ERROR /] index.html НЕ НАЙДЕН по пути: {INDEX_HTML_PATH}")
        raise HTTPException(status_code=404, detail="index.html not found")

@app.get("/api/chat_history/{session_id}") # Path parameter for session_id
async def get_chat_history(session_id: str): # Function name updated
    """Retrieves chat history for a given session_id from PostgreSQL."""
    print(f"[API Chat History] GET /api/chat_history/{session_id} called")
    if not session_id: # Should be caught by FastAPI path param validation, but good practice
        print("[API Chat History ERROR] session_id is missing.")
        raise HTTPException(status_code=400, detail="session_id path parameter is required")

    conn: Optional[asyncpg.Connection] = None
    try:
        conn = await pg_connector.get_pg_connection()
        print(f"[API Chat History] Acquired PostgreSQL connection for session {session_id}.")
        
        history_records = await crud_operations.get_chat_history(conn, session_id=session_id, limit=100) # Increased limit
        print(f"[API Chat History] Fetched {len(history_records)} messages for session {session_id}.")
        
        messages = [
            {
                "role": row['role'], 
                "content": row['message_content'], 
                "timestamp": row['timestamp'].isoformat() if row['timestamp'] else None
            } for row in history_records
        ]
        # Return in descending order (newest first) as per get_chat_history logic
        return {"messages": messages, "session_id": session_id, "count": len(messages)}

    except asyncpg.PostgresError as e_pg:
        error_message = f"Failed to retrieve chat history for session {session_id}: {e_pg}"
        print(f"[API Chat History ERROR] {error_message}")
        traceback.print_exc()
        # Optionally log this to application_logs table as well
        raise HTTPException(status_code=500, detail=error_message)
    except Exception as e:
        error_message = f"Unexpected error retrieving chat history for session {session_id}: {e}"
        print(f"[API Chat History ERROR] {error_message}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=error_message)
    finally:
        if conn:
            try:
                await pg_connector.release_pg_connection(conn)
                print(f"[API Chat History] PostgreSQL connection released for session {session_id}.")
            except Exception as e_release:
                print(f"[API Chat History ERROR] Failed to release PostgreSQL connection: {e_release}")


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    print(f"[CHAT DEBUG] /chat endpoint called with model: {request.model}")
    # MongoDB client removed
    db_save_error_note = ""
    pg_conn: Optional[asyncpg.Connection] = None # For PostgreSQL
    db_chat_message_id: Optional[int] = None
    session_id = str(uuid.uuid4()) # Generate a unique session ID for this chat

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
    response = await codestral_llm.ainvoke(messages) # LLM call
        response_content = response.content
        print(f"[CHAT DEBUG] ChatMistralAI response received (first 100 chars): {response_content[:100]}...")
        should_vocalize = False # TODO: Определить логику озвучивания

    # Сохранение в PostgreSQL
        try:
        pg_conn = await pg_connector.get_pg_connection()
        print(f"[CHAT DB INFO] Acquired PostgreSQL connection for session {session_id}.")

        # Сохраняем сообщение пользователя
        await crud_operations.add_chat_message(
            pg_conn, 
            session_id=session_id, 
            role="user", 
            message_content=request.message,
            metadata={"model": request.model, "llm_history_count": len(request.history)}
        )
        
        # Сохраняем ответ ассистента
        db_chat_message_id = await crud_operations.add_chat_message(
            pg_conn, 
            session_id=session_id, 
            role="assistant", 
            message_content=response_content,
            metadata={"model": request.model, "raw_llm_response_length": len(response_content)}
        )
        print(f"[CHAT DB INFO] Chat messages for session {session_id} saved. Assistant msg ID: {db_chat_message_id}")

    except asyncpg.PostgresError as e_pg:
        print(f"[CHAT DB ERROR] PostgreSQL error while saving chat history for session {session_id}: {e_pg}")
            traceback.print_exc()
        db_save_error_note = " (DB Error: Failed to save chat. Incident logged.)"
        # Логируем ошибку БД в application_logs
        log_conn_err_pg: Optional[asyncpg.Connection] = None
        try:
            log_conn_err_pg = await pg_connector.get_pg_connection()
            await crud_operations.log_application_event(
                log_conn_err_pg, 
                level='ERROR', 
                source_component='chat_db_pg', 
                message=f'PostgresError saving chat for session {session_id}', 
                details={'error': str(e_pg), 'traceback': traceback.format_exc(limit=5)}
            )
        except Exception as log_e_pg:
            print(f"[CHAT DB LOG ERROR] Failed to log PostgresError to application_logs: {log_e_pg}")
        finally:
            if log_conn_err_pg:
                await pg_connector.release_pg_connection(log_conn_err_pg)
                
    except Exception as e_db_main:
        print(f"[CHAT DB ERROR] Unexpected error while saving chat history to PostgreSQL for session {session_id}: {e_db_main}")
            traceback.print_exc()
        db_save_error_note = " (DB Error: Failed to save chat. Incident logged.)"
        # Логируем общую ошибку БД в application_logs
        log_conn_err_main: Optional[asyncpg.Connection] = None
        try:
            log_conn_err_main = await pg_connector.get_pg_connection()
            await crud_operations.log_application_event(
                log_conn_err_main, 
                level='ERROR', 
                source_component='chat_db_general', 
                message=f'General error saving chat for session {session_id}', 
                details={'error': str(e_db_main), 'traceback': traceback.format_exc(limit=5)}
            )
        except Exception as log_e_main:
            print(f"[CHAT DB LOG ERROR] Failed to log general DB error to application_logs: {log_e_main}")
        finally:
            if log_conn_err_main:
                await pg_connector.release_pg_connection(log_conn_err_main)

        final_response_content = response_content
        if db_save_error_note:
            final_response_content += db_save_error_note

    return ChatResponse(
        response=final_response_content, 
        should_vocalize=should_vocalize, 
        metadata={
            "chat_id": session_id, # chat_id is now session_id
            "assistant_message_id": str(db_chat_message_id) if db_chat_message_id else None
        }
    )

    except HTTPException as he:
         # Если это наша HTTPException (например, 503 от проверки LLM), просто пробрасываем ее
         raise he
    except Exception as e:
        # Ловим все остальные ошибки при вызове LLM или обработке ответа
        print(f"[CHAT GENERAL ERROR] Exception during LLM call or general processing for session {session_id}: {e}")
        traceback.print_exc()
        error_details = str(e)

        # Логируем НЕ-HTTP исключение в application_logs
        if not isinstance(e, HTTPException): # Только если это не уже обработанная HTTP ошибка
            log_conn_general_ex: Optional[asyncpg.Connection] = None
            try:
                log_conn_general_ex = await pg_connector.get_pg_connection()
                await crud_operations.log_application_event(
                    log_conn_general_ex,
                    level='ERROR',
                    source_component='chat_llm_or_general',
                    message=f'General error in /chat endpoint for session {session_id}',
                    details={'error': error_details, 'traceback': traceback.format_exc(limit=5), 'request_model': request.model}
                )
                print(f"[CHAT GENERAL ERROR LOG] Logged general error for session {session_id} to application_logs.")
            except Exception as log_ex_general:
                print(f"[CHAT GENERAL ERROR LOG FAIL] Failed to log general error to application_logs: {log_ex_general}")
            finally:
                if log_conn_general_ex:
                    await pg_connector.release_pg_connection(log_conn_general_ex)
        
        # Возвращаем общую ошибку сервера, не раскрывая слишком много внутренних деталей
        raise HTTPException(status_code=500, detail=f"Internal Server Error: Failed to process chat request. Details: {error_details[:200]}...")

    finally:
        # Важно закрывать соединение с PostgreSQL в конце обработки запроса
        if pg_conn:
            try:
                await pg_connector.release_pg_connection(pg_conn)
                print(f"[CHAT DB INFO] PostgreSQL connection released for session {session_id}.")
            except Exception as e_release_pg:
                print(f"[CHAT DB ERROR] Failed to release PostgreSQL connection for session {session_id}: {e_release_pg}")


# <<< ЗАГЛУШКИ для остальных роутов, использующих DB или LLM/инструменты >>>
# Эти роуты временно возвращают 501 Not Implemented.
# Тебе нужно будет реализовать их логику, включая работу с PostgreSQL,
# аналогично роутам /health и /chat, и раскомментировать/адаптировать LLM/Tool логику.

@app.post("/generate")
async def generate_content(request: Request):
     print("[WARN] /generate endpoint called (Not Implemented).")
     # TODO: Реализовать логику генерации контента, возможно с использованием LLM/инструментов и PostgreSQL
     raise HTTPException(status_code=501, detail="Endpoint /generate Not Implemented Yet")

@app.post("/branches")
async def create_branch_version(request: Request):
    print("[WARN] /branches POST endpoint called (Not Implemented).")
    # TODO: Реализовать логику создания версий веток, включая работу с PostgreSQL
    raise HTTPException(status_code=501, detail="Endpoint /branches POST Not Implemented Yet")

@app.get("/branches/{branch}")
async def get_branch_versions(branch: str):
    print(f"[WARN] /branches/{branch} GET endpoint called (Not Implemented).")
    # TODO: Реализовать логику получения версий ветки, включая работу с PostgreSQL
    raise HTTPException(status_code=501, detail=f"Endpoint /branches/{branch} GET Not Implemented Yet")

@app.put("/branches/{branch}/switch")
async def switch_branch_version(branch: str, request: Request):
    print(f"[WARN] /branches/{branch}/switch PUT endpoint called (Not Implemented).")
    # TODO: Реализовать логику переключения версий ветки, включая работу с PostgreSQL
    raise HTTPException(status_code=501, detail=f"Endpoint /branches/{branch}/switch PUT Not Implemented Yet")

@app.post("/tria/save_logs")
async def save_logs(request: Request):
    print("[WARN] /tria/save_logs endpoint called (Not Implemented).")
    # TODO: Реализовать логику сохранения логов (например, логов взаимодействия с Триа), включая работу с PostgreSQL (application_logs)
    raise HTTPException(status_code=501, detail="Endpoint /tria/save_logs Not Implemented Yet")

@app.post("/tria/invoke")
async def tria_invoke(tria_query: TriaQuery):
    print("[WARN] /tria/invoke endpoint called (Not Implemented).")
    # TODO: Раскомментировать инициализацию LLM/инструментов и реализовать здесь вызов агента Триа
    # if not codestral_llm or not code_generator_tool or not read_file_tool:
    #     raise HTTPException(status_code=503, detail="Tria Agent components not initialized.")
    # # ... вызов invoke_tria_agent(tria_query.query) ...
    raise HTTPException(status_code=501, detail="Endpoint /tria/invoke Not Implemented Yet (LLM/Tools not initialized or logic not implemented)")

# Роут /chat/save УДАЛЕН, так как сохранение происходит внутри /chat (and ChatSaveRequest model removed)


# ----------------------------------------------------------------------
# 11. МОНТИРОВАНИЕ СТАТИКИ
# ----------------------------------------------------------------------

# Монтирование статики
if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR, html=False), name="static_files")
    print(f"[INFO] Статика успешно смонтирована из: {FRONTEND_DIR} на /static")
else:
    print(f"[CRITICAL ERROR] Директория для статики НЕ НАЙДЕНА: {FRONTEND_DIR}")

# 12. Добавление Gradio для MCP-поддержки
import gradio as gr
import spaces  # Для декоратора @spaces.GPU

# Сначала определяем и создаем объект Gradio Blocks
# Простая функция для проверки
async def process_request(input_text):
    return f"Получен запрос: {input_text}"

# Создаём Gradio Blocks для API
with gr.Blocks() as gradio_blocks_instance: # Даем имя экземпляру
    gr.Markdown("## Holograms Media API")
    input_box = gr.Textbox(label="Запрос")
    output_box = gr.Textbox(label="Ответ")
    gr.Button("Отправить").click(
        fn=process_request,
        inputs=input_box,
        outputs=output_box
    )

# Декоратор @spaces.GPU применяется к функции, которая будет использовать GPU,
# но сам mount_gradio_app должен получать уже созданный экземпляр Blocks.
# В данном простом случае Gradio напрямую GPU не использует, но декоратор
# важен для корректной работы в среде Hugging Face Spaces, если GPU потребуется позже.
# Если GPU не нужен для Gradio, декоратор можно убрать или применить к FastAPI, если он его использует.
# Пока оставим как есть, предполагая, что это стандартная практика для Spaces.

# Монтируем СОЗДАННЫЙ экземпляр Gradio Blocks
app = gr.mount_gradio_app(app, gradio_blocks_instance, path="/gradio") # Используем gradio_blocks_instance

if __name__ == "__main__":
    import uvicorn
    # При локальном запуске порт 7860 часто используется Gradio по умолчанию,
    # но так как мы монтируем Gradio в FastAPI, которое запускается на 8000 (или другом порту),
    # Uvicorn должен запускать основное FastAPI приложение.
    # FastAPI (app) теперь включает в себя Gradio по пути /gradio.
    uvicorn.run(app, host="0.0.0.0", port=8000) # Или ваш обычный порт для FastAPI