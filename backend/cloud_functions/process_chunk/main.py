import os
import json
import uuid
import datetime

# Firebase Functions specific imports
from firebase_functions import storage_fn, options as firebase_options

# Assuming 'backend' is in PYTHONPATH or discoverable during deployment
from backend.core.models.multimodal_models import AudiovisualGesturalChunkModel
from backend.core.db.pg_connector import get_db_connection # Using direct connection, not pool for now
from backend.core.tria_bots.ChunkProcessorBot import ChunkProcessorBot # Import the bot
import asyncpg

# Helper to get env vars (already provided in prompt)
def get_env_var(var_name):
    value = os.environ.get(var_name)
    if value is None:
        print(f"FATAL: Environment variable {var_name} not set.")
        raise ValueError(f"Environment variable {var_name} not set.")
    return value

@storage_fn.on_object_finalized()
async def process_chunk_storage(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]):
    """
    Storage-triggered Cloud Function to process a new chunk uploaded to Firebase Storage.
    Extracts metadata and passes it to ChunkProcessorBot for persistence.
    """
    
    bucket = event.data.bucket
    name = event.data.name  # Full path: user_uploads/firebase_user_id/chunkid_filename.ext
    content_type = event.data.content_type # MIME type
    time_created = event.data.time_created # datetime object
    custom_metadata = event.data.metadata if event.data.metadata is not None else {}

    print(f"Processing file: gs://{bucket}/{name}")
    print(f"Content-Type: {content_type}")
    print(f"Time Created: {time_created}")
    print(f"Custom Metadata: {custom_metadata}")

    firebase_user_id = custom_metadata.get("firebaseUserId")
    original_filename = custom_metadata.get("originalFilename")

    if not firebase_user_id:
        print(f"Error: firebaseUserId not found in custom metadata for {name}. Cannot process chunk.")
        return

    if not name.startswith("user_uploads/"): 
        print(f"File {name} is not in user_uploads/. Skipping.")
        return

    # Prepare chunk_metadata dictionary for ChunkProcessorBot
    # ChunkProcessorBot expects 'chunk_id' as a string UUID
    chunk_id_str = str(uuid.uuid4()) # Generate a UUID for the chunk

    chunk_metadata = {
        "chunk_id": chunk_id_str, # Passed as string UUID
        "user_id": firebase_user_id,
        "chunk_type": content_type.split('/')[0] if content_type else "unknown",
        "storage_ref": f"gs://{bucket}/{name}",
        "original_filename": original_filename if original_filename else name.split('/')[-1],
        "mime_type": content_type,
        "duration_seconds": None,  # Placeholder
        "resolution_width": None,  # Placeholder
        "resolution_height": None, # Placeholder
        "tria_processing_status": "pending_bot_processing", # More specific initial status
        "tria_extracted_features_json": None,
        "related_gesture_id": None,
        "related_hologram_id": None,
        "custom_metadata_json": custom_metadata,
        "created_at": time_created.isoformat(), # Pass as ISO string
        "updated_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    }
    
    # Instantiate ChunkProcessorBot
    chunk_processor_bot = ChunkProcessorBot()

    conn = None
    try:
        conn = await get_db_connection()
        # Call the bot's method to process and save the chunk metadata
        processed_chunk = await chunk_processor_bot.process_chunk_metadata(db=conn, chunk_metadata=chunk_metadata)
        print(f"Chunk metadata for {name} successfully processed by ChunkProcessorBot with ID: {processed_chunk.id}")

        # Placeholder for further Tria processing (e.g., Pub/Sub, other services)
        print(f"Placeholder: Advanced Tria processing can be triggered for chunk {processed_chunk.id} by user {firebase_user_id}.")

    except Exception as e:
        print(f"Error during ChunkProcessorBot operation for {name}: {e}")
    finally:
        if conn:
            await conn.close()
            print(f"Database connection closed for {name}.")

    print(f"Finished processing gs://{bucket}/{name}")
    return None
