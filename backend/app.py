# backend/app.py
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form
from typing import List
import asyncio # Added for B2
from botocore.client import Config # Added for B2
from botocore.exceptions import ClientError # Added for verify_chunk

# Load environment variables from .env file before other imports
load_dotenv()

import firebase_admin
from firebase_admin import credentials
import os
import logging
import boto3 # Retained for B2 client

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- Global R2 Client (Commented out for B2 integration) ---
# s3_client = None
# r2_bucket_name = None

# --- Global B2 Client ---
B2_ACCESS_KEY_ID = os.getenv("B2_ACCESS_KEY_ID")
B2_SECRET_ACCESS_KEY = os.getenv("B2_SECRET_ACCESS_KEY")
B2_ENDPOINT_URL = "https://s3.us-west-002.backblaze.com" # Specific B2 endpoint

if B2_ACCESS_KEY_ID and B2_SECRET_ACCESS_KEY:
    s3 = boto3.client(
        service_name='s3',
        aws_access_key_id=B2_ACCESS_KEY_ID,
        aws_secret_access_key=B2_SECRET_ACCESS_KEY,
        endpoint_url=B2_ENDPOINT_URL,
        config=Config(signature_version='s3v4') # Required for B2
    )
    logger.info("Backblaze B2 client initialized successfully.")
else:
    s3 = None
    logger.warning("Backblaze B2 client not initialized. Missing B2_ACCESS_KEY_ID or B2_SECRET_ACCESS_KEY environment variables.")


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

    # logger.info("Attempting to initialize Cloudflare R2 client...")
    # global s3_client, r2_bucket_name # s3_client now refers to B2 client
    # try:
    #     r2_endpoint_url = os.getenv("R2_ENDPOINT_URL")
    #     r2_access_key_id = os.getenv("R2_ACCESS_KEY_ID")
    #     r2_secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")
    #     r2_bucket_name_env = os.getenv("R2_BUCKET_NAME")

    #     if not all([r2_endpoint_url, r2_access_key_id, r2_secret_access_key, r2_bucket_name_env]):
    #         missing_vars = []
    #         if not r2_endpoint_url: missing_vars.append("R2_ENDPOINT_URL")
    #         if not r2_access_key_id: missing_vars.append("R2_ACCESS_KEY_ID")
    #         if not r2_secret_access_key: missing_vars.append("R2_SECRET_ACCESS_KEY")
    #         if not r2_bucket_name_env: missing_vars.append("R2_BUCKET_NAME")
    #         logger.warning(f"Cloudflare R2 client not initialized. Missing environment variables: {', '.join(missing_vars)}")
    #     else:
    #         # s3_client_r2 = boto3.client( # Keep separate if needed, or ensure s3 (B2 client) is not overwritten
    #         #     service_name='s3',
    #         #     endpoint_url=r2_endpoint_url,
    #         #     aws_access_key_id=r2_access_key_id,
    #         #     aws_secret_access_key=r2_secret_access_key,
    #         #     region_name='auto' # Cloudflare R2 specific, region is often 'auto' or not strictly required
    #         # )
    #         # r2_bucket_name = r2_bucket_name_env
    #         # logger.info(f"Cloudflare R2 client initialized successfully for bucket: {r2_bucket_name}")
    #         pass # R2 initialization is now commented out

    # except Exception as e:
    #     logger.error(f"Critical error during Cloudflare R2 client initialization: {e}", exc_info=True)
    #     # s3_client = None # Ensure client is None if initialization failed - this would affect B2 client
    #     # r2_bucket_name = None

    logger.info("FastAPI application startup event processing completed.")


async def upload_chunk_async(bucket_name: str, file_key: str, chunk_data: bytes, part_number: int, upload_id: str):
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
                lambda: s3.upload_part(
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
    # This part should ideally not be reached if retries are handled correctly.
    # If it is, it means all retries failed and the exception was not re-raised, which is a logic error.
    # However, to satisfy linters/compilers that might see a path without a return:
    logger.error(f"All retries failed for part {part_number} of {file_key}. This should not happen if exceptions are re-raised.")
    # Consider raising a specific error here if this state is reachable.
    # For example: raise RuntimeError(f"Failed to upload part {part_number} after {max_retries} retries")
    return None # Should not be reached if an exception is raised on final retry failure


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
    if not s3:
        logger.error("B2 S3 client not initialized. Cannot upload chunk.")
        return {"success": False, "message": "B2 S3 client not available."}

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

    except Exception as e:
        logger.error(f"Error processing chunk upload for {chunk_id} (Part {part_number}), file {file_id}: {e}", exc_info=True)
        return {"success": False, "message": "An internal error occurred while processing the chunk upload."}


async def verify_chunk(chunk_id: str, original_data: bytes, b2_bucket_name: str, file_id: str) -> bool:
    """
    Verifies if a chunk uploaded to B2 matches the original data.
    Note: The key in B2 should match how it was stored, e.g. if upload_chunk_endpoint uses `file_id` as key,
    this function should also use `file_id` (or the specific part of it that forms the object key).
    Assuming the object key for a chunk in B2 is `file_id` and not `f'chunk-{chunk_id}'` as per
    the `upload_chunk_endpoint` which uses `s3_file_key = file_id`.
    If chunks are stored with keys like `chunk-<chunk_id>` this needs adjustment.
    For this implementation, using `file_id` as the S3 object key, which implies
    that `verify_chunk` might be intended to verify the whole object after all parts are combined,
    or it assumes `chunk_id` maps directly to the S3 object key if chunks are stored individually and not as parts of a multipart upload.
    Let's assume `file_id` is the actual S3 object key for the chunk for now as per instruction "object with key f'chunk-{chunk_id}'".
    This seems to conflict with `upload_chunk_endpoint` which uses `file_id` as the `Key` for `upload_part`.
    Re-interpreting: the request likely means the `chunk_id` is part of the S3 key, not the `file_id`.
    Let's use the S3 key format `f'{file_id}_chunk_{chunk_id}'` or simply `chunk_id` if it's unique.
    The original instruction was "f'chunk-{chunk_id}'", let's stick to that for the key.
    """
    if not s3:
        logger.error("B2 S3 client not initialized. Cannot verify chunk.")
        return False

    s3_object_key = f"chunk-{chunk_id}" # As per original instruction for this function
    # However, `upload_chunk_endpoint` uses `file_id` as the `Key` in `s3.upload_part`.
    # If this is for verifying a part of a multipart upload, get_object won't work on a part directly.
    # This function seems more suited to verify a standalone object named 'chunk-<chunk_id>'.
    # Let's proceed with `s3_object_key = chunk_id` if `chunk_id` is the full key,
    # or adjust if `chunk_id` is just an identifier that needs to be combined with `file_id`.
    # Given the parameter `file_id` is also passed, it might be that the key is `file_id` and we are verifying the whole object.
    # Let's use `file_id` as the key, assuming `chunk_id` is for logging/tracking this specific verification request.
    # Re-reading: "object with key f'chunk-{chunk_id}'". This is specific.

    logger.info(f"Verifying chunk with S3 key: {s3_object_key} in bucket {b2_bucket_name}")

    try:
        response = await asyncio.to_thread(
            s3.get_object,
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

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("FastAPI application shutdown event processing completed.")