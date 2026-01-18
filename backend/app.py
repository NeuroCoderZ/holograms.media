# backend/app.py
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from typing import List
import asyncio
from botocore.client import Config
from botocore.exceptions import ClientError

# Load environment variables from .env file before other imports
load_dotenv()

import os
import logging
import boto3

# Tria-related imports


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Holograms Media Backend API",
    description="Backend services for the Holograms Media Project, providing API endpoints for user interactions, media processing, and AI assistant Tria.",
    version="1.0.0",
)

# --- Imports of routers ---
from backend.api.v1.endpoints.gesture_routes import router as public_gestures_router
from backend.routers.public_holograms import router as public_holograms_router
from backend.api.v1.endpoints.tria_commands import router as tria_commands_router
from backend.api.v1.endpoints.chunks import router as chunks_router
# from backend.routers.gestures import router as user_gestures_router
# from backend.routers.holograms import router as user_holograms_router
# from backend.routers.prompts import router as user_prompts_router
from backend.routers import gestures_ws
from backend.routers.signaling import router as signaling_router # New signaling router
from backend.routers.auth import router as auth_router # Import the new auth router
from backend.routers.chat_sessions import router as chat_sessions_router # <-- НОВЫЙ ИМПОРТ

API_V1_PREFIX = "/api/v1"

# --- Include routers ---
app.include_router(auth_router, prefix=API_V1_PREFIX, tags=["Authentication"]) # Add the new auth router
app.include_router(public_gestures_router, prefix=API_V1_PREFIX, tags=["Gestures (Public)"])
app.include_router(public_holograms_router, prefix=API_V1_PREFIX, tags=["Holograms (Public)"])
app.include_router(tria_commands_router, prefix=f"{API_V1_PREFIX}/tria", tags=["Tria Commands"])
app.include_router(chunks_router, prefix=API_V1_PREFIX, tags=["Chunks"])
app.include_router(chat_sessions_router, prefix=f"{API_V1_PREFIX}/chat", tags=["Chat Sessions"])
# app.include_router(user_gestures_router, prefix=f"{API_V1_PREFIX}/users/me/gestures", tags=["Current User Gestures"])
# app.include_router(user_holograms_router, prefix=f"{API_V1_PREFIX}/users/me/holograms", tags=["Current User Holograms"])
# app.include_router(user_prompts_router, prefix=f"{API_V1_PREFIX}/users/me/prompts", tags=["Current User Prompts"])
app.include_router(gestures_ws.router)
app.include_router(signaling_router) # Include the new signaling router


@app.get("/", tags=["Root"])
async def read_root():
    return {"message": "Welcome to the Holograms Media API. Visit /docs for API documentation."}

@app.get("/healthz", tags=["System"])
async def health_check():
    return {"status": "ok", "message": "FastAPI is healthy"}

# --- CORS Middleware ---
from fastapi.middleware.cors import CORSMiddleware
origins = [
    "http://localhost",
    "http://localhost:3000",
    "http://localhost:5173",  # Vite default
    "http://localhost:8000",
    "https://holograms.media",
    "https://holograms-media.web.app",
    "https://holograms-media-59398dd8.koyeb.app", # Production Backend
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    logger.info("--- Application Startup ---")

    

    b2_endpoint_url = os.getenv("B2_ENDPOINT_URL")
    b2_access_key_id = os.getenv("B2_ACCESS_KEY_ID")
    b2_secret_access_key = os.getenv("B2_SECRET_ACCESS_KEY")
    
    if all([b2_endpoint_url, b2_access_key_id, b2_secret_access_key]):
        try:
            s3_config = Config(region_name='us-west-002', signature_version='s3v4')
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

    # --- Initialize Database Pool ---
    from backend.core.db.pg_connector import create_db_pool
    app.state.db_pool = await create_db_pool()
    if app.state.db_pool:
        logger.info("Database pool added to app.state.")
    else:
        logger.warning("Database pool initialization FAILED. Database dependent routes will fail.")

    logger.info("FastAPI application startup event processing completed.")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("--- Application Shutdown ---")
    if hasattr(app.state, 'db_pool') and app.state.db_pool:
        await app.state.db_pool.close()
        logger.info("Database pool closed.")
    


async def upload_chunk_async(bucket_name: str, file_key: str, chunk_data: bytes, part_number: int, upload_id: str):
    if not getattr(app.state, 's3_client', None):
        logger.error("B2 S3 client not initialized in app state. Cannot upload chunk.")
        raise HTTPException(status_code=503, detail="Storage service is not available.")
    
    max_retries = 3
    for attempt in range(max_retries):
        try:
            logger.info(f"Attempt {attempt + 1} to upload part {part_number} for {file_key} to bucket {bucket_name} with upload ID {upload_id}")
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
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
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2 ** attempt)
    logger.error(f"All retries failed for part {part_number} of {file_key}. This should not happen if exceptions are re-raised.")
    return None


@app.post("/upload-chunk", tags=["Chunks"])
async def upload_chunk_endpoint(
    chunk: UploadFile = File(...),
    chunk_id: str = Form(...),
    file_id: str = Form(...),
    part_number: int = Form(...),
    upload_id: str = Form(...),
    b2_bucket_name: str = Form(...)
):
    if not getattr(app.state, 's3_client', None):
        logger.error("B2 S3 client not initialized. Cannot upload chunk.")
        raise HTTPException(status_code=503, detail="Storage service is not available.")

    try:
        logger.info(f"Received chunk {chunk_id} for file {file_id}, part {part_number}, upload_id {upload_id} to bucket {b2_bucket_name}.")
        chunk_data = await chunk.read()

        if not all([chunk_data, file_id, part_number, upload_id, b2_bucket_name]):
            logger.warning("Missing required parameters for chunk upload.")
            return {"success": False, "message": "Missing required parameters."}

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
        raise
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

