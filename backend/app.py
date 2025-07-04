# backend/app.py
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from typing import List
import asyncio
from botocore.client import Config
from botocore.exceptions import ClientError

# Load environment variables from .env file before other imports
load_dotenv()

import firebase_admin
from firebase_admin import credentials
import os
import logging
import boto3

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Holograms Media Backend API",
    description="Backend services for the Holograms Media Project, providing API endpoints for user interactions, media processing, and AI assistant Tria.",
    version="0.1.0",
)

# --- Impors of routers ---
from backend.api.v1.endpoints.gesture_routes import router as public_gestures_router
from backend.routers.public_holograms import router as public_holograms_router
from backend.api.v1.endpoints.tria_commands import router as tria_commands_router
from backend.api.v1.endpoints.chunks import router as chunks_router

# from backend.routers.auth import router as legacy_auth_router
from backend.routers.chat import router as public_chat_router
# from backend.routers.chat import router as legacy_chat_router # This was the old one
from backend.routers.chat_sessions import router as legacy_chat_sessions_router
from backend.routers.gestures import router as legacy_user_me_gestures_router
from backend.routers.holograms import router as legacy_user_holograms_router
from backend.routers.interaction_chunks import router as legacy_interaction_chunks_router
from backend.routers.prompts import router as legacy_prompts_router
# from backend.routers.tria import router as legacy_tria_router
from backend.routers import gestures_ws # <-- НОВЫЙ ИМПОРТ

API_V1_PREFIX = "/api/v1"

app.include_router(public_gestures_router, prefix=API_V1_PREFIX, tags=["Gestures (User Specific)"])
app.include_router(public_holograms_router, prefix=API_V1_PREFIX, tags=["Holograms (User Specific)"])
app.include_router(tria_commands_router, prefix=f"{API_V1_PREFIX}/tria-commands", tags=["Tria Commands"])
app.include_router(chunks_router, prefix=API_V1_PREFIX, tags=["Chunks"])

# app.include_router(legacy_auth_router, prefix=f"{API_V1_PREFIX}/auth", tags=["Authentication (Legacy)"])
app.include_router(public_chat_router, prefix=f"{API_V1_PREFIX}/chat", tags=["Chat"])
# app.include_router(legacy_chat_router, prefix=f"{API_V1_PREFIX}/chat", tags=["Chat (Legacy)"]) # This was the old one
app.include_router(legacy_chat_sessions_router, prefix=f"{API_V1_PREFIX}/chat-sessions", tags=["Chat Sessions (Legacy)"])
app.include_router(legacy_user_me_gestures_router, prefix=API_V1_PREFIX, tags=["Current User Gestures (Legacy)"])
app.include_router(legacy_user_holograms_router, prefix=API_V1_PREFIX, tags=["Current User Holograms (Legacy)"])
app.include_router(legacy_interaction_chunks_router, prefix=f"{API_V1_PREFIX}/chunks", tags=["Interaction Chunks (Legacy)"])
app.include_router(legacy_prompts_router, prefix=f"{API_V1_PREFIX}/prompts", tags=["Prompts (Legacy)"])
# app.include_router(legacy_tria_router, prefix=f"{API_V1_PREFIX}/tria-system", tags=["Tria System (Legacy)"])

# Подключаем новый WebSocket роутер
# Обычно WebSocket роутеры не имеют префикса, так как путь определяется в самом роутере.
# Если WebSocket эндпоинт в gestures_ws.router определен как "/ws/v1/gesture-intent",
# то он будет доступен по этому пути относительно корня приложения.
app.include_router(gestures_ws.router)


@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Holograms Media API. Visit /docs for API documentation."}

@app.get("/healthz", tags=["System"])
async def health_check():
    return {"status": "ok", "message": "FastAPI is healthy"}

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
    logger.info("Starting up... Initializing resources.")
    
    # Initialize Firebase Admin SDK
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

    # Initialization of S3 client for Backblaze B2
    b2_endpoint_url = os.getenv("B2_ENDPOINT_URL")
    b2_access_key_id = os.getenv("B2_ACCESS_KEY_ID")
    b2_secret_access_key = os.getenv("B2_SECRET_ACCESS_KEY")
    
    if all([b2_endpoint_url, b2_access_key_id, b2_secret_access_key]):
        try:
            s3_config = Config(
                region_name='us-west-002', # Important to specify region for B2
                signature_version='s3v4'
            )
            s3_client = boto3.client(
                's3',
                endpoint_url=b2_endpoint_url,
                aws_access_key_id=b2_access_key_id,
                aws_secret_access_key=b2_secret_access_key,
                config=s3_config
            )
            app.state.s3_client = s3_client
            logger.info("Backblaze B2 S3 client initialized successfully.")
        except Exception as e:
            logger.error(f"Error initializing Backblaze B2 S3 client: {e}")
            app.state.s3_client = None
    else:
        logger.warning("One or more Backblaze B2 environment variables are missing. S3 client not initialized.")
        app.state.s3_client = None

    logger.info("FastAPI application startup event processing completed.")

@app.on_event("shutdown")
async def shutdown_event():
    """
    Releasing resources when the application stops.
    """
    logger.info("Shutting down... Releasing resources.")
    # Here can be code for closing the database connection pool
    # if app.state.db_pool:
    #     await app.state.db_pool.close()


async def upload_chunk_async(bucket_name: str, file_key: str, chunk_data: bytes, part_number: int, upload_id: str):
    if not getattr(app.state, 's3_client', None):
        logger.error("B2 S3 client not initialized in app state. Cannot upload chunk.")
        raise HTTPException(status_code=503, detail="Storage service is not available.")
    
    """
    Asynchronously uploads a part (chunk) to S3 using multipart upload.
    Retries added for robustness.
    """
    max_retries = 3
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempt {attempt + 1} to upload part {part_number} for {file_key} to bucket {bucket_name} with upload ID {upload_id}")
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,  # Uses the default ThreadPoolExecutor
                lambda: app.state.s3_client.upload_part(
                    Bucket=bucket_name,
                    Key=file_key,
                    PartNumber=part_number,
                    UploadId=upload_id,
                    Body=chunk_data
                )
            )
            logger.info(f"Successfully uploaded part {part_number} for {file_key}. ETag: {response.get('ETag')}")
            return {"ETag": response.get("ETag"), "PartNumber": part_number}
        except Exception as e:
            logger.error(f"Error uploading part {part_number} for {file_key} (attempt {attempt + 1}/{max_retries}): {e}", exc_info=True)
            if attempt == max_retries - 1: # Last attempt
                raise # Re-raise the exception if all retries fail
            await asyncio.sleep(2 ** attempt) # Exponential backoff
    logger.error(f"All retries failed for part {part_number} of {file_key}. This should not happen if exceptions are re-raised.")
    return None


@app.post("/upload-chunk", tags=["Chunks"])
async def upload_chunk_endpoint(
    chunk: UploadFile = File(...),
    chunk_id: str = Form(...), # e.g., "video_xyz.mp4_chunk_1_of_10.ts"
    file_id: str = Form(...), # e.g., "video_xyz.mp4" (original filename or a unique ID for the full file)
    part_number: int = Form(...),
    upload_id: str = Form(...), # S3 multipart upload ID
    b2_bucket_name: str = Form(...) # Bucket name passed from frontend
):
    """
    Endpoint to upload a single chunk of a larger file to Backblaze B2.
    This is part of a multipart upload process.
    """
    if not getattr(app.state, 's3_client', None):
        logger.error("B2 S3 client not initialized. Cannot upload chunk.")
        raise HTTPException(status_code=503, detail="Storage service is not available.")

    try:
        logger.info(f"Received chunk {chunk_id} for file {file_id}, part {part_number}, upload_id {upload_id} to bucket {b2_bucket_name}.")
        chunk_data = await chunk.read()

        # Validate inputs (basic example)
        if not all([chunk_data, file_id, part_number, upload_id, b2_bucket_name]):
            logger.warning("Missing required parameters for chunk upload.")
            return {"success": False, "message": "Missing required parameters."}

        # The file_key for S3 will be the file_id (e.g., original filename or unique ID)
        s3_file_key = file_id

        upload_response = await upload_chunk_async(
            bucket_name=b2_bucket_name,
            file_key=s3_file_key,
            chunk_data=chunk_data,
            part_number=part_number,
            upload_id=upload_id
        )

        if upload_response and upload_response.get("ETag"):
            logger.info(f"Chunk {chunk_id} (Part {part_number}) for file {s3_file_key} uploaded successfully to B2 bucket {b2_bucket_name}.")
            return {
                "success": True,
                "message": f"Chunk {part_number} uploaded successfully.",
                "ETag": upload_response["ETag"],
                "PartNumber": part_number,
                "file_id": s3_file_key,
                "upload_id": upload_id
            }
        else:
            logger.error(f"Upload of chunk {chunk_id} (Part {part_number}) for file {s3_file_key} failed or did not return ETag.")
            return {"success": False, "message": f"Failed to upload chunk {part_number}."}

    except HTTPException:
        raise # Re-raise HTTPException as it's an expected error type
    except Exception as e:
        logger.error(f"Error processing chunk upload for {chunk_id} (Part {part_number}), file {file_id}: {e}", exc_info=True)
        return {"success": False, "message": "An internal error occurred while processing the chunk upload."}


async def verify_chunk(chunk_id: str, original_data: bytes, b2_bucket_name: str, file_id: str) -> bool:
    if not getattr(app.state, 's3_client', None):
        logger.error("B2 S3 client not initialized in app state. Cannot verify chunk.")
        return False

    s3_object_key = f"chunk-{chunk_id}"

    logger.info(f"Verifying chunk with S3 key: {s3_object_key} in bucket {b2_bucket_name}")

    try:
        response = await asyncio.to_thread(
            app.state.s3_client.get_object,
            Bucket=b2_bucket_name,
            Key=s3_object_key
        )
        retrieved_data = await asyncio.to_thread(response['Body'].read)

        if retrieved_data == original_data:
            logger.info(f"Verification successful for S3 key {s3_object_key}.")
            return True
        else:
            logger.warning(f"Verification failed for S3 key {s3_object_key}. Data mismatch.")
            return False
    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code")
        if error_code == "NoSuchKey":
            logger.error(f"NoSuchKey error verifying S3 key {s3_object_key} in bucket {b2_bucket_name}: {e}", exc_info=True)
        else:
            logger.error(f"ClientError verifying S3 key {s3_object_key} in bucket {b2_bucket_name}: {e}", exc_info=True)
        return False
    except Exception as e:
        logger.error(f"Unexpected error verifying S3 key {s3_object_key} in bucket {b2_bucket_name}: {e}", exc_info=True)
        return False

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