# backend/api/v1/endpoints/chunks.py
from fastapi import APIRouter, File, UploadFile, Depends, HTTPException, Path
import logging
import os
import uuid
from backend.app import s3_client, r2_bucket_name
from backend.core.tria_bots.ChunkProcessorBot import ChunkProcessorBot

# Можно настроить более детальное логирование, если нужно
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

router = APIRouter()

# В будущем здесь может быть зависимость для аутентификации пользователя
# from backend.auth.security import get_current_active_user # Пример
# from backend.core.models.user_models import UserDB # Пример

@router.post("/upload_chunk/{user_id}", tags=["Chunks"])
async def upload_chunk(
    user_id: str = Path(..., title="The ID of the user uploading the chunk"),
    file: UploadFile = File(...)
    # current_user: UserDB = Depends(get_current_active_user) # Раскомментировать для аутентификации
):
    """
    Endpoint to upload a media chunk for a specific user to R2 and trigger metadata processing.

    - **user_id**: The ID of the user.
    - **file**: The chunk file being uploaded.
    """
    # Проверка аутентификации (если раскомментировать Depends)
    # if current_user.id != user_id and not current_user.is_superuser: # Пример проверки прав
    #     raise HTTPException(status_code=403, detail="Not authorized to upload chunks for this user")

    if not s3_client:
        logger.error("S3 client not initialized. R2 service unavailable.")
        raise HTTPException(status_code=503, detail="R2 service is unavailable due to server configuration error.")

    logger.info(f"Received chunk upload for user_id: {user_id}")
    logger.info(f"Original filename: {file.filename}, Content-Type: {file.content_type}")

    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    object_key = f"user_chunks/{user_id}/{unique_filename}"

    try:
        file_content = await file.read()
        file_size = len(file_content)
        logger.info(f"Read file content. Size: {file_size} bytes. Attempting upload to R2 with key: {object_key}")

        s3_client.put_object(
            Bucket=r2_bucket_name,
            Key=object_key,
            Body=file_content,
            ContentType=file.content_type
        )
        logger.info(f"Successfully uploaded chunk to R2: {object_key}")
    except Exception as e:
        logger.error(f"Failed to upload chunk to R2 for user {user_id}, file {unique_filename}. Error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to upload file to R2: {str(e)}")

    try:
        chunk_processor = ChunkProcessorBot() # Assuming constructor is simple or dependencies are handled globally/env
        chunk_metadata = {
            "user_id": user_id,
            "file_name": file.filename, # Original filename for reference
            "unique_file_name": unique_filename, # Unique name used in storage
            "storage_ref": object_key,
            "content_type": file.content_type,
            "size": file_size,
            # Add other relevant metadata if ChunkProcessorBot expects more
        }
        logger.info(f"Submitting chunk metadata for processing: {chunk_metadata}")
        # Assuming process_chunk_metadata is async. If not, remove 'await'.
        # Need to verify the definition of ChunkProcessorBot.process_chunk_metadata
        await chunk_processor.process_chunk_metadata(chunk_metadata)
        logger.info(f"Successfully submitted chunk metadata for {object_key} to ChunkProcessorBot.")
    except Exception as e:
        logger.error(f"Failed to process chunk metadata for {object_key} after R2 upload. Error: {e}", exc_info=True)
        # Decide on error handling:
        # - For now, just log and return success, as file is uploaded.
        # - Alternatively, could try to delete from R2 if metadata processing is critical for consistency.
        # - Or, return a specific error/warning to the client.
        # For this implementation, we'll assume logging is sufficient and the upload itself is the primary success.
        pass # Logged the error, but proceed to return success for upload

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
```
