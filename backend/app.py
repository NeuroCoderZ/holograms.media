# backend/app.py
from fastapi import FastAPI
from typing import List
import firebase_admin
from firebase_admin import credentials
import os
import logging
import boto3 # Added for R2 client

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- Global R2 Client ---
s3_client = None
r2_bucket_name = None

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

        if not firebase_admin._apps:  # Check if the app hasn't been initialized yet
            if cred_path:
                logger.info(f"GOOGLE_APPLICATION_CREDENTIALS found: {cred_path}")
                if os.path.exists(cred_path):
                    cred = credentials.Certificate(cred_path)
                    firebase_admin.initialize_app(cred)
                    logger.info("Firebase Admin SDK initialized successfully using GOOGLE_APPLICATION_CREDENTIALS file.")
                else:
                    logger.warning(f"GOOGLE_APPLICATION_CREDENTIALS file path does not exist: {cred_path}. Will attempt to use FIREBASE_SERVICE_ACCOUNT_BASE64 if available.")
                    if firebase_service_account_base64:
                        logger.info("FIREBASE_SERVICE_ACCOUNT_BASE64 found, attempting initialization.")
                        initialize_firebase_from_base64(firebase_service_account_base64, logger)
                    else:
                        logger.warning("FIREBASE_SERVICE_ACCOUNT_BASE64 not set. Firebase Admin SDK not initialized.")
            elif firebase_service_account_base64:
                logger.info("FIREBASE_SERVICE_ACCOUNT_BASE64 found, attempting initialization.")
                initialize_firebase_from_base64(firebase_service_account_base64, logger)
            else:
                logger.warning("Neither GOOGLE_APPLICATION_CREDENTIALS nor FIREBASE_SERVICE_ACCOUNT_BASE64 environment variables are set. Firebase Admin SDK not initialized.")
        else:
            logger.info("Firebase Admin SDK already initialized.")
    except Exception as e:
        logger.error(f"Critical error during Firebase Admin SDK initialization: {e}", exc_info=True)

    logger.info("Attempting to initialize Cloudflare R2 client...")
    global s3_client, r2_bucket_name
    try:
        r2_endpoint_url = os.getenv("R2_ENDPOINT_URL")
        r2_access_key_id = os.getenv("R2_ACCESS_KEY_ID")
        r2_secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")
        r2_bucket_name_env = os.getenv("R2_BUCKET_NAME")

        if not all([r2_endpoint_url, r2_access_key_id, r2_secret_access_key, r2_bucket_name_env]):
            missing_vars = []
            if not r2_endpoint_url: missing_vars.append("R2_ENDPOINT_URL")
            if not r2_access_key_id: missing_vars.append("R2_ACCESS_KEY_ID")
            if not r2_secret_access_key: missing_vars.append("R2_SECRET_ACCESS_KEY")
            if not r2_bucket_name_env: missing_vars.append("R2_BUCKET_NAME")
            logger.warning(f"Cloudflare R2 client not initialized. Missing environment variables: {', '.join(missing_vars)}")
        else:
            s3_client = boto3.client(
                service_name='s3',
                endpoint_url=r2_endpoint_url,
                aws_access_key_id=r2_access_key_id,
                aws_secret_access_key=r2_secret_access_key,
                region_name='auto' # Cloudflare R2 specific, region is often 'auto' or not strictly required
            )
            r2_bucket_name = r2_bucket_name_env
            logger.info(f"Cloudflare R2 client initialized successfully for bucket: {r2_bucket_name}")
            # Test connection by listing buckets (optional, can be removed if causing issues/slowdown)
            # try:
            #     s3_client.list_buckets() # This is a common way to test S3-compatible connection
            #     logger.info("Successfully connected to R2 endpoint and listed buckets.")
            # except Exception as r2_conn_test_e:
            #     logger.error(f"R2 client initialized, but failed to test connection (e.g. list_buckets): {r2_conn_test_e}", exc_info=True)

    except Exception as e:
        logger.error(f"Critical error during Cloudflare R2 client initialization: {e}", exc_info=True)
        s3_client = None # Ensure client is None if initialization failed
        r2_bucket_name = None

    logger.info("FastAPI application startup event processing completed.")

def initialize_firebase_from_base64(base64_string, logger_instance):
    import base64
    import json
    try:
        logger_instance.info("Attempting to decode FIREBASE_SERVICE_ACCOUNT_BASE64...")
        decoded_service_account_bytes = base64.b64decode(base64_string)
        service_account_info_str = decoded_service_account_bytes.decode('utf-8')
        service_account_info = json.loads(service_account_info_str)
        cred = credentials.Certificate(service_account_info)
        firebase_admin.initialize_app(cred)
        logger_instance.info("Firebase Admin SDK initialized successfully using FIREBASE_SERVICE_ACCOUNT_BASE64.")
    except json.JSONDecodeError as e_json:
        logger_instance.error(f"JSONDecodeError while parsing FIREBASE_SERVICE_ACCOUNT_BASE64: {e_json}", exc_info=True)
        logger_instance.warning("Firebase Admin SDK not initialized from Base64 due to JSON parsing error.")
    except base64.binascii.Error as e_b64_decode:
        logger_instance.error(f"Base64 Decode Error for FIREBASE_SERVICE_ACCOUNT_BASE64: {e_b64_decode}", exc_info=True)
        logger_instance.warning("Firebase Admin SDK not initialized from Base64 due to decoding error.")
    except Exception as e_b64_general:
        logger_instance.error(f"An unexpected error occurred while initializing Firebase from Base64: {e_b64_general}", exc_info=True)
        logger_instance.warning("Firebase Admin SDK not initialized from Base64 due to an unexpected error.")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI application shutdown event processing completed.")