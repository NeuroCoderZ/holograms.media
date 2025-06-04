# backend/app.py
from fastapi import FastAPI
from typing import List # Может понадобиться для моделей ответов, если где-то возвращается список напрямую

# --- Импорты роутеров ---
# Предполагается следующая структура и именование роутеров.
# Если фактические имена файлов или переменных 'router' в них другие, нужно будет скорректировать.

# Роутеры из backend.api.v1.endpoints (предпочтительный новый путь для API v1)
from backend.api.v1.endpoints.gesture_routes import router as public_gestures_router
from backend.api.v1.endpoints.public_holograms import router as public_holograms_router
from backend.api.v1.endpoints.tria_commands import router as tria_commands_router
# Добавьте сюда импорты других роутеров из backend.api.v1.endpoints по мере их создания
# например, для auth, chat, chunks, если они будут там

# Роутеры из backend.routers (возможно, более старая структура или для внутренних/специфических нужд)
# Убедитесь, что пути и префиксы не конфликтуют с роутерами из api.v1
from backend.routers.auth import router as legacy_auth_router # Пример, если есть и новый и старый
from backend.routers.chat import router as legacy_chat_router
from backend.routers.chat_sessions import router as legacy_chat_sessions_router
from backend.routers.gestures import router as legacy_user_me_gestures_router # Для /users/me/gestures
from backend.routers.holograms import router as legacy_user_holograms_router # Для /users/me/holograms
from backend.routers.interaction_chunks import router as legacy_interaction_chunks_router
from backend.routers.prompts import router as legacy_prompts_router
from backend.routers.tria import router as legacy_tria_router


# Инициализация FastAPI приложения
app = FastAPI(
    title="Holograms Media Backend API",
    description="Backend services for the Holograms Media Project, providing API endpoints for user interactions, media processing, and AI assistant Tria.",
    version="0.1.0", # Версия вашего API
    # Можно добавить docs_url и redoc_url, если стандартные /docs и /redoc не устраивают
    # docs_url="/api/v1/docs",
    # redoc_url="/api/v1/redoc",
)

# --- Регистрация Роутеров ---

# Префикс /api/v1 для всех основных API эндпоинтов
API_V1_PREFIX = "/api/v1"

# Роутеры из backend.api.v1.endpoints (новая структура)
app.include_router(public_gestures_router, prefix=API_V1_PREFIX, tags=["Gestures (User Specific)"]) # /users/{user_id}/gestures
app.include_router(public_holograms_router, prefix=API_V1_PREFIX, tags=["Holograms (User Specific)"]) # /users/{user_id}/holograms
app.include_router(tria_commands_router, prefix=f"{API_V1_PREFIX}/tria-commands", tags=["Tria Commands"]) # Более специфичный префикс

# Роутеры из backend.routers (старая структура или для /users/me/ и т.п.)
# Важно, чтобы их пути не пересекались с новыми без явного на то намерения.
app.include_router(legacy_auth_router, prefix=f"{API_V1_PREFIX}/auth", tags=["Authentication (Legacy)"])
app.include_router(legacy_chat_router, prefix=f"{API_V1_PREFIX}/chat", tags=["Chat (Legacy)"])
app.include_router(legacy_chat_sessions_router, prefix=f"{API_V1_PREFIX}/chat-sessions", tags=["Chat Sessions (Legacy)"])

# Роутеры для /users/me/* (из backend.routers)
# Предполагается, что эти роутеры уже имеют внутренние префиксы типа /users/me/gestures
app.include_router(legacy_user_me_gestures_router, prefix=API_V1_PREFIX, tags=["Current User Gestures (Legacy)"])
app.include_router(legacy_user_holograms_router, prefix=API_V1_PREFIX, tags=["Current User Holograms (Legacy)"])

app.include_router(legacy_interaction_chunks_router, prefix=f"{API_V1_PREFIX}/chunks", tags=["Interaction Chunks (Legacy)"])
app.include_router(legacy_prompts_router, prefix=f"{API_V1_PREFIX}/prompts", tags=["Prompts (Legacy)"])
app.include_router(legacy_tria_router, prefix=f"{API_V1_PREFIX}/tria-system", tags=["Tria System (Legacy)"])


# --- Корневой эндпоинт и Health Check ---
@app.get("/", tags=["Root"])
async def read_root():
    """
    Root endpoint for the API.
    Provides a welcome message.
    """
    return {"message": "Welcome to the Holograms Media API. Visit /docs for API documentation."}

@app.get("/api/v1/health", tags=["System"])
async def health_check():
    """
    Health check endpoint for the API.
    Confirms the API is running and accessible.
    """
    return {"status": "ok", "message": "Holograms Media API is running healthy!"}

# --- CORS Middleware (Раскомментируйте и настройте, если фронтенд будет на другом домене/порту) ---
# from fastapi.middleware.cors import CORSMiddleware
# origins = [
#     "http://localhost",          # Для локальной разработки фронтенда
#     "http://localhost:3000",     # Если фронтенд на порту 3000
#     "http://localhost:5000",     # Firebase Hosting Emulator
#     "https://holograms-media.web.app", # Ваш развернутый фронтенд
#     # Добавьте другие домены по необходимости
# ]
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"], # Разрешить все методы
#     allow_headers=["*"], # Разрешить все заголовки
# )

# --- Обработчики событий Startup и Shutdown (раскомментируйте, если нужны) ---
# @app.on_event("startup")
# async def startup_event():
#     """
#     Actions to perform when the FastAPI application starts.
#     E.g., initialize database connections, load ML models, etc.
#     """
#     # Например, можно здесь инициализировать пул соединений к БД, если используется
#     # await init_db_pool()
#     print("FastAPI application startup completed.")

# @app.on_event("shutdown")
# async def shutdown_event():
#     """
#     Actions to perform when the FastAPI application shuts down.
#     E.g., close database connections, clean up resources.
#     """
#     # Например, закрыть пул соединений к БД
#     # await close_db_pool()
#     print("FastAPI application shutdown completed.")

# --- Запуск Uvicorn сервера (для локальной разработки, если запускать этот файл напрямую) ---
# Обычно для Render.com или Docker это не нужно, так как они используют свой способ запуска (например, `uvicorn backend.app:app ...`)
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(
#         "backend.app:app", # Путь к экземпляру FastAPI 'app' в этом файле
#         host="0.0.0.0",    # Слушать на всех интерфейсах
#         port=8000,         # Стандартный порт для FastAPI
#         reload=True        # Включить автоперезагрузку при изменениях кода (только для разработки)
#     )