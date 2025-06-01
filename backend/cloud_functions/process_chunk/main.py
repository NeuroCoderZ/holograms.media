import os
import json
import uuid
import datetime
import logging # Import the logging module

# Firebase Functions specific imports
from firebase_functions import storage_fn, options as firebase_options

# Assuming 'backend' is in PYTHONPATH or discoverable during deployment
from backend.core.models.multimodal_models import AudiovisualGesturalChunkModel
from backend.core.db.pg_connector import get_db_connection
from backend.core.tria_bots.ChunkProcessorBot import ChunkProcessorBot
import asyncpg

# Configure basic logging for Cloud Functions
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Helper to get env vars (already provided in prompt)
def get_env_var(var_name):
    value = os.environ.get(var_name)
    if value is None:
        logger.critical(f"FATAL: Environment variable {var_name} not set.")
        raise ValueError(f"Environment variable {var_name} not set.")
    return value

@storage_fn.on_object_finalized()
async def process_chunk_storage(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]):
    """
    Storage-triggered Cloud Function to process a new chunk uploaded to Firebase Storage.
    Extracts metadata and passes it to ChunkProcessorBot for persistence.
    """
    logger.info("process_chunk_storage function started.")

    bucket = event.data.bucket
    name = event.data.name
    content_type = event.data.content_type
    time_created = event.data.time_created
    custom_metadata = event.data.metadata if event.data.metadata is not None else {}

    try:
        logger.info(f"Processing file: gs://{bucket}/{name}")
        logger.info(f"Content-Type: {content_type}")
        logger.info(f"Time Created: {time_created}")
        logger.info(f"Custom Metadata: {custom_metadata}")

        firebase_user_id = custom_metadata.get("firebaseUserId")
        original_filename = custom_metadata.get("originalFilename")

        if not firebase_user_id:
            logger.error(f"Error: firebaseUserId not found in custom metadata for {name}. Cannot process chunk.")
            return # No response needed for storage trigger, just log and exit

        if not name.startswith("user_uploads/"): 
            logger.warning(f"File {name} is not in user_uploads/. Skipping.")
            return # No response needed for storage trigger, just log and exit

        # Prepare chunk_metadata dictionary for ChunkProcessorBot
        chunk_id_str = str(uuid.uuid4())
        logger.info(f"Generated chunk_id: {chunk_id_str}")

        chunk_metadata = {
            "chunk_id": chunk_id_str,
            "user_id": firebase_user_id,
            "chunk_type": content_type.split('/')[0] if content_type else "unknown",
            "storage_ref": f"gs://{bucket}/{name}",
            "original_filename": original_filename if original_filename else name.split('/')[-1],
            "mime_type": content_type,
            "duration_seconds": None,
            "resolution_width": None,
            "resolution_height": None,
            "tria_processing_status": "pending_bot_processing",
            "tria_extracted_features_json": None,
            "related_gesture_id": None,
            "related_hologram_id": None,
            "custom_metadata_json": custom_metadata,
            "created_at": time_created.isoformat(),
            "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        }
        
        # Instantiate ChunkProcessorBot
        chunk_processor_bot = ChunkProcessorBot()
        logger.info("ChunkProcessorBot instantiated. Attempting DB connection.")

        conn = None
        try:
            conn = await get_db_connection()
            processed_chunk = await chunk_processor_bot.process_chunk_metadata(db=conn, chunk_metadata=chunk_metadata)
            logger.info(f"Chunk metadata for {name} successfully processed by ChunkProcessorBot with ID: {processed_chunk.id}")
            logger.info(f"Placeholder: Advanced Tria processing can be triggered for chunk {processed_chunk.id} by user {firebase_user_id}.")

        except asyncpg.PostgresError as e:
            logger.exception(f"Database error during ChunkProcessorBot operation for {name}.")
        except Exception as e:
            logger.exception(f"An unexpected error occurred during ChunkProcessorBot operation for {name}.")
        finally:
            if conn:
                await conn.close()
                logger.info(f"Database connection closed for {name}.")

    except Exception as e:
        logger.exception(f"An unhandled error occurred in process_chunk_storage for {name}.")
    
    logger.info(f"Finished processing gs://{bucket}/{name}")
    return None
