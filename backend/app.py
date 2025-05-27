import os
import json
import re
from datetime import datetime
import traceback

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, ValidationError
from typing import List, Dict, Any, Optional
import httpx
import asyncio
from dotenv import load_dotenv

import asyncpg
from backend.db import pg_connector, crud_operations
from langchain_core.runnables import Runnable
from langchain_mistralai import ChatMistralAI
from langchain.tools import Tool
from langchain_core.messages import SystemMessage, HumanMessage, AIMessage

from backend.routers import auth as auth_router
from backend.routers import gestures as gestures_router
from backend.routers import holograms as holograms_router
from backend.routers import chat_sessions as chat_sessions_router
from backend.routers import prompts as prompts_router
from backend.routers import interaction_chunks as interaction_chunks_router # New router

# Corrected import for InteractionChunkDB
from backend.models.interaction_chunk_model import InteractionChunkDB

# ----------------------------------------------------------------------
# 4. ИНИЦИАЛИЗАЦИЯ FastAPI ПРИЛОЖЕНИЯ
# ----------------------------------------------------------------------
from google.cloud import pubsub_v1 # Added for Pub/Sub
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[Lifespan] Application startup...")
    # Initialize PostgreSQL Pool
    try:
        await pg_connector.init_pg_pool()
        print("[Lifespan] PostgreSQL connection pool initialized successfully.")
        if not pg_connector._pool:
            print("[Lifespan WARN] PostgreSQL pool not available after init_pg_pool().")
    except Exception as e:
        print(f"[Lifespan ERROR] Error during PostgreSQL pool initialization: {e}")
        # Depending on policy, might want to raise to prevent app start without DB
        # For now, log and continue to Pub/Sub setup.
    
    # Initialize Google Cloud Pub/Sub Publisher Client
    app.state.pubsub_publisher_client = None
    app.state.pubsub_topic_path = None
    try:
        google_cloud_project = os.getenv("GOOGLE_CLOUD_PROJECT")
        pubsub_topic_name = os.getenv("PUB_SUB_TOPIC_CHUNK_PROCESSING")

        if google_cloud_project and pubsub_topic_name:
            publisher_client = pubsub_v1.PublisherClient()
            topic_path = publisher_client.topic_path(google_cloud_project, pubsub_topic_name)
            app.state.pubsub_publisher_client = publisher_client
            app.state.pubsub_topic_path = topic_path
            print(f"[Lifespan] Google Cloud Pub/Sub Publisher client initialized for topic: {topic_path}")
        else:
            print("[Lifespan WARN] GOOGLE_CLOUD_PROJECT or PUB_SUB_TOPIC_CHUNK_PROCESSING not set. Pub/Sub client NOT initialized.")
            
    except Exception as e:
        print(f"[Lifespan ERROR] Error initializing Google Cloud Pub/Sub client: {e}")
        traceback.print_exc()
        # App can still run without Pub/Sub, but publishing will fail.
        
    yield # Application is running

    print("[Lifespan] Application shutdown...")
    # Close PostgreSQL Pool
    try:
        await pg_connector.close_pg_pool()
        print("[Lifespan] PostgreSQL connection pool closed successfully.")
    except Exception as e:
        print(f"[Lifespan ERROR] Failed to close PostgreSQL pool: {e}")

    # Close Pub/Sub client (if it has a close method, typically managed by context or gRPC)
    if hasattr(app.state.pubsub_publisher_client, 'close'):
        try:
            # For newer versions of google-cloud-pubsub, client might not have explicit close()
            # or it's handled by underlying gRPC channels.
            # publisher_client.close() # If applicable
            print("[Lifespan] Pub/Sub client closed (if applicable).")
        except Exception as e:
            print(f"[Lifespan ERROR] Failed to close Pub/Sub client: {e}")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(gestures_router.router)
app.include_router(holograms_router.router)
app.include_router(chat_sessions_router.router)
app.include_router(prompts_router.router)
app.include_router(interaction_chunks_router.router) # Include the new router

# ----------------------------------------------------------------------
# 5. ОПРЕДЕЛЕНИЕ Pydantic МОДЕЛЕЙ
# ----------------------------------------------------------------------

class TriaQuery(BaseModel):
    query: str

class JenkinsLogData(BaseModel):
    status: str
    build_url: str
    timestamp: str

# ----------------------------------------------------------------------
# 6. Загрузка .env
# ----------------------------------------------------------------------
load_dotenv(override=True)

# ----------------------------------------------------------------------
# 7. Определение КОНСТАНТ и ГЛОБАЛЬНЫХ ПЕРЕМЕННЫХ
# ----------------------------------------------------------------------

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY")
CODESTRAL_API_KEY = os.getenv("CODESTRAL_API_KEY")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "mistral-small-latest")

chain: Optional[Runnable] = None
codestral_llm: Optional[ChatMistralAI] = None
code_generator_tool: Optional[Tool] = None
read_file_tool: Optional[Tool] = None

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
MISTRAL_API_KEY_VALUE = os.getenv("MISTRAL_API_KEY")
CODESTRAL_API_KEY_VALUE = os.getenv("CODESTRAL_API_KEY")
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
        traceback.print_exc()
        if api_key_to_use == CODESTRAL_API_KEY_VALUE and MISTRAL_API_KEY_VALUE and CODESTRAL_API_KEY_VALUE != MISTRAL_API_KEY_VALUE:
            print("[INFO] Повторная попытка инициализации codestral_llm с MISTRAL_API_KEY...")
            try:
                model_for_fallback = os.getenv("CODESTRAL_MODEL_NAME", DEFAULT_MODEL)
                print(f"[DEBUG] Initializing ChatMistralAI for codestral_llm with model '{model_for_fallback}' using MISTRAL_API_KEY (fallback).")
                codestral_llm = ChatMistralAI(
                    model_name=model_for_fallback,
                    mistral_api_key=MISTRAL_API_KEY_VALUE,
                    temperature=0.4,
                )
                print("[DEBUG] ChatMistralAI for codestral_llm initialized successfully using MISTRAL_API_KEY (fallback).")
            except Exception as e_fallback:
                print(f"[ERROR] Ошибка повторной инициализации ChatMistralAI for codestral_llm с MISTRAL_API_KEY: {e_fallback}")
                traceback.print_exc()
                codestral_llm = None
        else:
            codestral_llm = None

# --- Функции-инструменты для Триа (определение оставляем, они не выполняются при импорте) ---
async def generate_code_tool(task_description: str) -> str:
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
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return f"Ошибка: Файл не найден по пути: {file_path}"
    except Exception as e:
        print(f"[ERROR] Error reading file {file_path}: {e}")
        traceback.print_exc()
        return f"Произошла ошибка при чтении файла: {e}"

print("[INFO] Инициализация моделей и инструментов (закомментированная часть) завершена.")

# ----------------------------------------------------------------------
# 9. Определение Вспомогательных Функций для DB (MongoDB related - REMOVED)
# ----------------------------------------------------------------------

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

# --- Заглушки для остальных роутов (реализация аналогична примеру выше) ---

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

# ----------------------------------------------------------------------
# 11. МОНТИРОВАНИЕ СТАТИКИ
# ----------------------------------------------------------------------

if os.path.isdir(FRONTEND_DIR):
    app.mount("/static", StaticFiles(directory=FRONTEND_DIR, html=False), name="static_files")
    print(f"[INFO] Статика успешно смонтирована из: {FRONTEND_DIR} на /static")
else:
    print(f"[CRITICAL ERROR] Директория для статики НЕ НАЙДЕНА: {FRONTEND_DIR}")

# 12. Добавление Gradio для MCP-поддержки
import gradio as gr
import spaces

async def process_request(input_text):
    return f"Получен запрос: {input_text}"

with gr.Blocks() as gradio_blocks_instance:
    gr.Markdown("## Holograms Media API")
    input_box = gr.Textbox(label="Запрос")
    output_box = gr.Textbox(label="Ответ")
    gr.Button("Отправить").click(
        fn=process_request,
        inputs=input_box,
        outputs=output_box
    )

app = gr.mount_gradio_app(app, gradio_blocks_instance, path="/gradio")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
