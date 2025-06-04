# backend/app.py
from fastapi import FastAPI
from typing import List
import firebase_admin
from firebase_admin import credentials
import os
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- Импорты роутеров ---
from backend.api.v1.endpoints.gesture_routes import router as public_gestures_router
from backend.api.v1.endpoints.public_holograms import router as public_holograms_router
from backend.api.v1.endpoints.tria_commands import router as tria_commands_router
from backend.api.v1.endpoints.chunks import router as chunks_router

from backend.routers.auth import router as legacy_auth_router
from backend.routers.chat import router as legacy_chat_router
from backend.routers.chat_sessions import router as legacy_chat_sessions_router
from backend.routers.gestures import router as legacy_user_me_gestures_router
from backend.routers.holograms import router as legacy_user_holograms_router
from backend.routers.interaction_chunks import router as legacy_interaction_chunks_router
from backend.routers.prompts import router as legacy_prompts_router
from backend.routers.tria import router as legacy_tria_router

app = FastAPI(
    title="Holograms Media Backend API",
    description="Backend services for the Holograms Media Project, providing API endpoints for user interactions, media processing, and AI assistant Tria.",
    version="0.1.0",
)

API_V1_PREFIX = "/api/v1"

app.include_router(public_gestures_router, prefix=API_V1_PREFIX, tags=["Gestures (User Specific)"])
app.include_router(public_holograms_router, prefix=API_V1_PREFIX, tags=["Holograms (User Specific)"])
app.include_router(tria_commands_router, prefix=f"{API_V1_PREFIX}/tria-commands", tags=["Tria Commands"])
app.include_router(chunks_router, prefix=API_V1_PREFIX, tags=["Chunks"])

app.include_router(legacy_auth_router, prefix=f"{API_V1_PREFIX}/auth", tags=["Authentication (Legacy)"])
app.include_router(legacy_chat_router, prefix=f"{API_V1_PREFIX}/chat", tags=["Chat (Legacy)"])
app.include_router(legacy_chat_sessions_router, prefix=f"{API_V1_PREFIX}/chat-sessions", tags=["Chat Sessions (Legacy)"])
app.include_router(legacy_user_me_gestures_router, prefix=API_V1_PREFIX, tags=["Current User Gestures (Legacy)"])
app.include_router(legacy_user_holograms_router, prefix=API_V1_PREFIX, tags=["Current User Holograms (Legacy)"])
app.include_router(legacy_interaction_chunks_router, prefix=f"{API_V1_PREFIX}/chunks", tags=["Interaction Chunks (Legacy)"])
app.include_router(legacy_prompts_router, prefix=f"{API_V1_PREFIX}/prompts", tags=["Prompts (Legacy)"])
app.include_router(legacy_tria_router, prefix=f"{API_V1_PREFIX}/tria-system", tags=["Tria System (Legacy)"])

@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Holograms Media API. Visit /docs for API documentation."}

@app.get("/api/v1/health", tags=["System"])
async def health_check():
    return {"status": "ok", "message": "Holograms Media API is running healthy!"}

# --- CORS Middleware ---
# from fastapi.middleware.cors import CORSMiddleware
# origins = [
#     "http://localhost",
#     "http://localhost:3000",
#     "http://localhost:5000",
#     "https://holograms-media.web.app",
# ]
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=origins,
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

@app.on_event("startup")
async def startup_event():
    logger.info("Attempting to initialize Firebase Admin SDK...")
    try:
        cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
        firebase_service_account_base64 = os.getenv("FIREBASE_SERVICE_ACCOUNT_BASE64")

        if not firebase_admin._apps: # Проверка, что приложение еще не инициализировано
            if cred_path:
                if os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                    logger.info("Firebase Admin SDK initialized via GOOGLE_APPLICATION_CREDENTIALS file.")
                else:
                    logger.warning(f"GOOGLE_APPLICATION_CREDENTIALS path does not exist: {cred_path}. Trying Base64 next.")
                    # Попробовать Base64, если путь к файлу неверен, но переменная установлена
                    if firebase_service_account_base64:
                         initialize_firebase_from_base64(firebase_service_account_base64, logger)
                    else:
                        logger.warning("FIREBASE_SERVICE_ACCOUNT_BASE64 not set. Firebase SDK not initialized.")
            elif firebase_service_account_base64:
                initialize_firebase_from_base64(firebase_service_account_base64, logger)
            else:
                logger.warning("Neither GOOGLE_APPLICATION_CREDENTIALS nor FIREBASE_SERVICE_ACCOUNT_BASE64 are set. Firebase SDK not initialized.")
        else:
            logger.info("Firebase Admin SDK already initialized.")
    except Exception as e:
        logger.error(f"Critical error during Firebase Admin SDK initialization in startup_event: {e}", exc_info=True)
    logger.info("FastAPI application startup event processing completed.")

def initialize_firebase_from_base64(base64_string, logger_instance):
    import base64
    import json
    try:
        decoded_service_account_bytes = base64.b64decode(base64_string)
        service_account_info_str = decoded_service_account_bytes.decode('utf-8')
        service_account_info = json.loads(service_account_info_str)
        cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(cred)
        logger_instance.info("Firebase Admin SDK initialized via FIREBASE_SERVICE_ACCOUNT_BASE64.")
    except Exception as e_b64:
        logger_instance.error(f"Error decoding or parsing FIREBASE_SERVICE_ACCOUNT_BASE64: {e_b64}", exc_info=True)
        logger_instance.warning("Firebase SDK not initialized from Base64 due to error.")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI application shutdown event processing completed.")