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
# motor.motor_asyncio импортируется ниже явно
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
# Эти переменные останутся None до тех пор, пока ты не раскомментируешь и не адаптируешь блок инициализации ниже
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
# 8. Инициализация LLM и Инструментов (ЗАКОММЕНТИРОВАНА)
# ----------------------------------------------------------------------
# Этот блок нужно будет раскомментировать и адаптировать ПОСЛЕ успешного запуска
# и после добавления API ключей как Secrets в HF Space
"""
print("[INFO] Попытка инициализации моделей и инструментов (закомментировано)...")
# --- Инициализация Codestral LLM для Триа ---
# Используем MISTRAL_API_KEY для ChatMistralAI
if not MISTRAL_API_KEY:
    print("[WARN] MISTRAL_API_KEY не найден в переменных окружения!")
else:
    try:
        print(f"[DEBUG] Initializing ChatMistralAI with model '{DEFAULT_MODEL}'")
        codestral_llm = ChatMistralAI(
            model=DEFAULT_MODEL,
            api_key=MISTRAL_API_KEY,
            temperature=0.4,
        )
        print("[DEBUG] ChatMistralAI initialized successfully.")
    except Exception as e:
        print(f"[ERROR] Ошибка инициализации ChatMistralAI: {e}")
        traceback.print_exc()
        codestral_llm = None

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
    if not MONGO_URI:
         print("[DB Connect ERROR] !!! MONGO_URI не установлен в переменных окружения!")
         raise ValueError("MONGO_URI environment variable not set.")
         
    try:
        # Используем переменные окружения, прочитанные ранее
        # serverSelectionTimeoutMS=5000 устанавливает таймаут для поиска сервера
        local_client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        # Проверка связи с базой данных
        await local_client.admin.command('ismaster')
        print(f"[DB Connect] Клиент MongoDB ({MONGO_DB_NAME}@{MONGO_URI}) успешно получен и проверен.")
        return local_client
    except Exception as e:
        print(f"[DB Connect ERROR] !!! ОШИБКА ПОДКЛЮЧЕНИЯ/ПРОВЕРКИ MongoDB по адресу {MONGO_URI}: {e}")
        traceback.print_exc()
        raise # Повторяем попытку через tenacity или выбрасываем исключение

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
    local_client: Optional[AsyncIOMotorClient] = None
    try:
        local_client = await get_db_client() # Пытаемся получить клиента
        # Если get_db_client() успешно отработал, соединение активно
        # Дополнительная команда для проверки конкретной DB
        db_local = local_client[MONGO_DB_NAME]
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
        await close_db_client(local_client)


@app.get("/")
async def read_index():
    """Отдает основной index.html."""
    print(f"[GET /] Attempting to serve index.html from {INDEX_HTML_PATH}")
    if os.path.exists(INDEX_HTML_PATH):
        return FileResponse(INDEX_HTML_PATH, media_type="text/html")
    else:
        print(f"[ERROR] index.html not found at path: {INDEX_HTML_PATH}")
        # Убедись, что папка frontend и index.html в ней присутствуют в репозитории
        # и путь FRONTEND_DIR в коде app.py корректен относительно корня репозитория
        raise HTTPException(status_code=404, detail=f"index.html not found at {INDEX_HTML_PATH}")

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    print(f"[CHAT DEBUG] /chat endpoint called with model: {request.model}")

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

    local_client: Optional[AsyncIOMotorClient] = None # Для блока finally

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
            local_client = await get_db_client() # Получаем клиента ПЕРЕД операцией сохранения
            db_local = local_client[MONGO_DB_NAME]
            chat_id_val = str(uuid.uuid4()) # Генерируем UUID для чата
            chat_collection_for_saving = db_local["chat_history"]
            print(f"[CHAT DEBUG] Attempting to save chat to DB collection 'chat_history'...")

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

            await chat_collection_for_saving.insert_one(chat_document)
            print(f"[CHAT DEBUG] Chat interaction saved to DB (chat_id: {chat_id_val}).")
            chat_id = chat_id_val # Передаем сгенерированный ID в ответ
        except Exception as db_error:
            print(f"[CHAT WARN] Failed to save chat interaction to DB: {db_error}")
            traceback.print_exc()
            # Ошибка сохранения в БД не должна блокировать успешный ответ LLM

        return ChatResponse(response=response_content, should_vocalize=should_vocalize, metadata={"chat_id": chat_id} if chat_id else None)

    except HTTPException as he:
         # Если это наша HTTPException (например, 503 от проверки LLM), просто пробрасываем ее
         raise he
    except Exception as e:
        # Ловим все остальные ошибки при вызове LLM или обработке ответа
        print(f"[CHAT CRITICAL ERROR] Exception during LLM invocation or processing: {e}")
        traceback.print_exc()
        error_details = str(e)
        # Возвращаем общую ошибку сервера, не раскрывая слишком много внутренних деталей
        raise HTTPException(status_code=500, detail=f"Internal Server Error: Failed to process chat request. Details: {error_details[:200]}...") # Обрезаем детали

    finally:
        # Важно закрывать соединение с БД в конце обработки запроса
        await close_db_client(local_client)


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

# Удаляем монтирование статики, так как Gradio обрабатывает её самостоятельно

# Обработчик для корня "/" отдается выше функцией read_index

# ----------------------------------------------------------------------
# 12. Блок if name == "__main__": (Закомментирован для HF Spaces)
# ----------------------------------------------------------------------
# Этот блок нужен только для запуска приложения локально как скрипта Python.
# Hugging Face Spaces запускает приложение по-своему (через Uvicorn, который вызывает app:app),
# поэтому этот блок должен быть закомментирован или отсутствовать.
#
# if __name__ == "__main__":
#     import uvicorn
#     print("[INFO] Running locally with uvicorn...")
#     # Используем порт 8080, который обычно используется на HF
#     uvicorn.run(app, host="0.0.0.0", port=8080)
#

# --- Конец файла app.py ---