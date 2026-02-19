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

# Astra-related imports
from backend.core.db.astra_connector import get_astra_db, get_astra_client


logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="Holograms Media Backend API",
    description="Backend services for the Holograms Media Project, providing API endpoints for user interactions, media processing, and AI assistant Tria.",
    version="1.0.0",
)

# Tria Cortex v2.6.5: Forcing CI/CD trigger with robust window check.

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
from backend.routers.chat_sessions import router as chat_sessions_router
from backend.api.v1.endpoints.wallet import router as wallet_router

API_V1_PREFIX = "/api/v1"

# --- Include routers ---
app.include_router(auth_router, prefix=API_V1_PREFIX, tags=["Authentication"])
app.include_router(public_gestures_router, prefix=API_V1_PREFIX, tags=["Gestures (Public)"])
app.include_router(public_holograms_router, prefix=API_V1_PREFIX, tags=["Holograms (Public)"])
app.include_router(tria_commands_router, prefix=f"{API_V1_PREFIX}/tria", tags=["Tria Commands"])
app.include_router(chunks_router, prefix=API_V1_PREFIX, tags=["Chunks"])
app.include_router(chat_sessions_router, prefix=f"{API_V1_PREFIX}/chat", tags=["Chat Sessions"])
app.include_router(wallet_router, prefix=f"{API_V1_PREFIX}/wallet", tags=["Wallet"])
# app.include_router(user_gestures_router, prefix=f"{API_V1_PREFIX}/users/me/gestures", tags=["Current User Gestures"])
# app.include_router(user_holograms_router, prefix=f"{API_V1_PREFIX}/users/me/holograms", tags=["Current User Holograms"])
# app.include_router(user_prompts_router, prefix=f"{API_V1_PREFIX}/users/me/prompts", tags=["Current User Prompts"])
app.include_router(gestures_ws.router)
app.include_router(signaling_router) # Include the new signaling router


@app.get("/healthz", tags=["System"])
async def health_check():
    return {"status": "ok", "message": "FastAPI is healthy"}

# --- Static Files Serving ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Mount directories for frontend assets
# Assumption: app.py is in backend/ and the root is one level up
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Serve root files (index.html, style.css, favicon.ico, manifest.json)
@app.get("/")
async def serve_index():
    index_path = os.path.join(base_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {"message": "Holograms Media API is running (Frontend index.html not found, but API is healthy)"}

@app.get("/style.css")
async def serve_style():
    return FileResponse(os.path.join(base_dir, "style.css"))

@app.get("/favicon.ico")
async def serve_favicon():
    return FileResponse(os.path.join(base_dir, "favicon.ico"))

@app.get("/manifest.json")
async def serve_manifest():
    return FileResponse(os.path.join(base_dir, "manifest.json"))

@app.get("/sw.js")
async def serve_sw():
    return FileResponse(os.path.join(base_dir, "sw.js"))

# Mount subdirectories
app.mount("/js", StaticFiles(directory=os.path.join(base_dir, "js")), name="js")
app.mount("/css", StaticFiles(directory=os.path.join(base_dir, "css")), name="css")
app.mount("/public", StaticFiles(directory=os.path.join(base_dir, "public")), name="public")
app.mount("/icons", StaticFiles(directory=os.path.join(base_dir, "icons")), name="icons")
app.mount("/holocore", StaticFiles(directory=os.path.join(base_dir, "holocore")), name="holocore")

# Compatibility alias for /wasm -> /public/wasm or similar if needed
# The frontend uses /js/wasm/ or /wasm/
app.mount("/wasm", StaticFiles(directory=os.path.join(base_dir, "public", "wasm")), name="wasm_root")

from backend.core.config import settings

# --- CORS Middleware ---
from fastapi.middleware.cors import CORSMiddleware
origins = settings.CORS_ORIGINS
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

    
    # --- Initialize Backblaze B2 ---
    b2_endpoint_url = settings.B2_ENDPOINT_URL
    b2_access_key_id = settings.B2_ACCESS_KEY_ID
    b2_secret_access_key = settings.B2_SECRET_ACCESS_KEY
    
    if all([b2_endpoint_url, b2_access_key_id, b2_secret_access_key]):
        try:
            # Region is usually part of the endpoint for B2 S3 API, but Boto3 requires one.
            # 'us-west-002' is a common default, but we can make it more flexible if needed.
            s3_config = Config(region_name='us-west-002', signature_version='s3v4')
            s3_client = boto3.client(
                's3',
                endpoint_url=b2_endpoint_url,
                aws_access_key_id=b2_access_key_id,
                aws_secret_access_key=b2_secret_access_key,
                config=s3_config
            )
            app.state.s3_client = s3_client
            logger.info("Backblaze B2 S3 client initialized successfully using settings.")
        except Exception as e:
            logger.error(f"Error initializing Backblaze B2 S3 client: {e}")
            app.state.s3_client = None
    else:
        logger.warning("One or more Backblaze B2 settings are missing. S3 client not initialized.")
        app.state.s3_client = None

    # --- Initialize Astra DB ---
    try:
        astra_client = get_astra_client()
        if astra_client:
            app.state.astra_db = get_astra_db(astra_client)
            if app.state.astra_db:
                logger.info("Astra DB initialized successfully in app.state.")
            else:
                logger.warning("Astra DB initialization FAILED. Database dependent routes will fail.")
        else:
            logger.warning("Astra DataAPIClient FAILED to initialize. Database dependent routes will fail.")
    except Exception as e:
        logger.error(f"Critical error during Astra DB initialization: {e}")
        app.state.astra_db = None

    logger.info("FastAPI application startup event processing completed.")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("--- Application Shutdown ---")
    # Astra DataAPIClient doesn't require explicit closing like a pool in many cases,
    # but we can clear the state if needed.
    if hasattr(app.state, 'astra_db'):
        del app.state.astra_db
        logger.info("Astra DB connection state cleared.")
    


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

