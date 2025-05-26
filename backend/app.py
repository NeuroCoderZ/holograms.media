# 1. Базовые импорты
import os
# import uuid # Removed as it's no longer used directly in app.py
import json
import re
from datetime import datetime
import traceback

# 2. Импорты FastAPI и Pydantic
from fastapi import FastAPI, Request, HTTPException # Response removed as it might be unused
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
from backend.db import pg_connector, crud_operations # Ensure crud_operations is imported
# from tenacity import retry, stop_after_attempt, wait_fixed # Removed
# Импорты для Langchain/LLM оставляем, но код инициализации закомментирован
from langchain_core.runnables import Runnable
from langchain_mistralai import ChatMistralAI
from langchain.tools import Tool
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

# Router Imports
from backend.routers import auth as auth_router
from backend.routers import gestures as gestures_router
from backend.routers import holograms as holograms_router
from backend.routers import chat_sessions as chat_sessions_router
from backend.routers import prompts as prompts_router


# ----------------------------------------------------------------------
# 4. ИНИЦИАЛИЗАЦИЯ FastAPI ПРИЛОЖЕНИЯ
# ----------------------------------------------------------------------

# --- Lifespan Handler with PostgreSQL Integration ---
from contextlib import asynccontextmanager
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Lifespan] Application startup...")
    db_conn_for_seeding = None # Connection for seeding
    try:
        await pg_connector.init_pg_pool()
        print("[Lifespan] PostgreSQL connection pool initialized successfully.")
        
        # Acquire a connection directly for seeding (not using Depends here)
        if pg_connector._pool: # Check if pool was initialized
            print("[Lifespan] Attempting to acquire DB connection for initial user seeding...")
            db_conn_for_seeding = await pg_connector._pool.acquire() 
            if db_conn_for_seeding:
                print("[Lifespan] DB connection acquired. Running initial user seeding...")
                await crud_operations.create_initial_users(db_conn_for_seeding)
            else:
                print("[Lifespan WARN] Could not acquire DB connection for seeding. Initial users may not be created.")
        else:
            print("[Lifespan WARN] PostgreSQL pool not available. Skipping initial user seeding.")

    except Exception as e:
        print(f"[Lifespan ERROR] Error during startup or seeding: {e}")
        # Depending on the application's needs, you might want to prevent startup
        # or handle this more gracefully. For now, just logging.
    finally:
        if db_conn_for_seeding:
            await pg_connector._pool.release(db_conn_for_seeding) # Release direct connection
            print("[Lifespan] DB connection for seeding released.")
    
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

# Include Routers
app.include_router(auth_router.router)
app.include_router(gestures_router.router)
app.include_router(holograms_router.router)
app.include_router(chat_sessions_router.router)
app.include_router(prompts_router.router)

# ----------------------------------------------------------------------
# 5. ОПРЕДЕЛЕНИЕ Pydantic МОДЕЛЕЙ (Obsolete chat models removed)
# ----------------------------------------------------------------------

class TriaQuery(BaseModel):
    query: str

class JenkinsLogData(BaseModel):
    status: str
    build_url: str
    timestamp: str

# Obsolete ChatMessage, ChatRequest, ChatResponse models are removed.
# Their functionalities are now handled by models in backend.models.chat_models
# and the corresponding chat_sessions_router.

# class ChatSaveRequest(BaseModel): # Already Removed
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

# Obsolete /api/chat_history/{session_id} endpoint removed.
# Functionality is now part of backend.routers.chat_sessions.router

# Obsolete /chat endpoint removed.
# Functionality is now part of backend.routers.chat_sessions.router


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