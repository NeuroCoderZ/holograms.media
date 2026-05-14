# backend/api/v1/endpoints/chunks.py
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, Path, Body, Request
from typing import Any, List
from pydantic import BaseModel, Field
import logging
import os
import uuid
from backend.core.tria_agents.ChunkProcessorAgent import ChunkProcessorAgent
from backend.auth.security import get_current_active_user # Assuming this is your dependency for auth
from backend.core.models.user_models import UserInDB # Assuming this is your user model

# Можно настроить более детальное логирование, если нужно
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter()

# Pydantic models for the new endpoint
class PresignedUrlRequest(BaseModel):
    filename: str = Field(..., example="myvideo.mp4")
    content_type: str = Field(..., example="video/mp4")

class PresignedUrlResponse(BaseModel):
    url: str
    fields: dict
    object_key: str


from backend.core.config import settings
from backend.core.db.astra_connector import get_db

@router.post("/generate-upload-url", response_model=PresignedUrlResponse, tags=["Chunks"])
async def generate_upload_url(
    request: Request,
    request_data: PresignedUrlRequest,
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Generate a presigned POST URL for uploading a file directly to Cloudflare R2.
    """
    s3_client = request.app.state.s3_client
    r2_bucket_name = settings.R2_BUCKET_NAME

    if not s3_client:
        logger.error("S3 client not initialized. R2 service unavailable.")
        raise HTTPException(status_code=503, detail="R2 service is unavailable due to server configuration error.")

    if not r2_bucket_name:
        logger.error("R2_BUCKET_NAME not configured.")
        raise HTTPException(status_code=503, detail="R2 bucket name not configured.")

    # Generate a unique object key
    file_extension = os.path.splitext(request_data.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    object_key = f"user_uploads/{current_user.user_id}/{unique_filename}"

    try:
        presigned_post = s3_client.generate_presigned_post(
            Bucket=r2_bucket_name,
            Key=object_key,
            Fields={"Content-Type": request_data.content_type},
            Conditions=[{"Content-Type": request_data.content_type}],
            ExpiresIn=3600
        )
        logger.info(f"Generated presigned POST URL for {object_key} for user {current_user.user_id}")
        return PresignedUrlResponse(
            url=presigned_post['url'],
            fields=presigned_post['fields'],
            object_key=object_key
        )
    except Exception as e:
        logger.error(f"Failed to generate presigned URL for user {current_user.user_id}. Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to generate presigned URL: {str(e)}")

@router.post("/upload_chunk/{user_id}", tags=["Chunks"])
async def upload_chunk(
    request: Request,
    user_id: str = Path(..., title="The ID of the user uploading the chunk"),
    file: UploadFile = File(...),
    db: Any = Depends(get_db),
    current_user: UserInDB = Depends(get_current_active_user)
):
    """
    Endpoint to upload a media chunk for a specific user to R2 and trigger metadata processing.
    """
    s3_client = request.app.state.s3_client
    r2_bucket_name = settings.R2_BUCKET_NAME

    if not s3_client:
        logger.error("S3 client not initialized. R2 service unavailable.")
        raise HTTPException(status_code=503, detail="R2 service is unavailable.")

    logger.info(f"Received chunk upload for user_id: {user_id}")

    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    object_key = f"user_chunks/{user_id}/{unique_filename}"

    try:
        file_content = await file.read()
        file_size = len(file_content)
        
        s3_client.put_object(
            Bucket=r2_bucket_name,
            Key=object_key,
            Body=file_content,
            ContentType=file.content_type
        )
        logger.info(f"Successfully uploaded chunk to R2: {object_key}")
    except Exception as e:
        logger.error(f"Failed to upload chunk to R2 for user {user_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload file to R2: {str(e)}")

    try:
        chunk_processor = ChunkProcessorAgent()
        chunk_metadata = {
            "chunk_id": str(uuid.uuid4()), # Need a UUID for chunk_id
            "user_id": user_id,
            "chunk_type": "audio" if "audio" in (file.content_type or "") else "video",
            "storage_ref": object_key,
            "original_filename": file.filename,
            "mime_type": file.content_type,
            "size": file_size,
        }
        # Pass DB to the processor
        await chunk_processor.process_chunk_metadata(db, chunk_metadata)
        logger.info(f"Successfully submitted chunk metadata for {object_key}.")
    except Exception as e:
        logger.error(f"Failed to process chunk metadata for {object_key}: {e}", exc_info=True)

    return {
        "message": "Chunk uploaded successfully. Metadata processing initiated.",
        "user_id": user_id,
        "original_filename": file.filename,
        "stored_filename": unique_filename,
        "storage_key": object_key,
        "content_type": file.content_type,
        "size": file_size
    }

# Можно добавить другие эндпоинты, связанные с чанками, если необходимо
# Например, получение списка чанков, удаление и т.д.
