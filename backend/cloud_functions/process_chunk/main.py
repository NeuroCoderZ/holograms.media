import os
import json
import uuid
import datetime

# Firebase Functions specific imports
from firebase_functions import storage_fn, options as firebase_options
# from firebase_admin import initialize_app # Usually initialized globally if needed elsewhere
# initialize_app()

# Set global options if needed, e.g., region.
# firebase_options.set_global_options(region=firebase_options.SupportedRegion.EUROPE_WEST1) # Example

# Assuming 'backend' is in PYTHONPATH or discoverable during deployment
from backend.core.models.multimodal_models import AudiovisualGesturalChunkModel
from backend.core.crud_operations import create_audiovisual_gestural_chunk
from backend.core.db.pg_connector import get_db_connection # Using direct connection, not pool for now
import asyncpg

# Helper to get env vars (already provided in prompt)
def get_env_var(var_name):
    value = os.environ.get(var_name)
    if value is None:
        # For Cloud Functions, direct error might be better than raising ValueError
        # as it helps in logs.
        print(f"FATAL: Environment variable {var_name} not set.")
        raise ValueError(f"Environment variable {var_name} not set.")
    return value

@storage_fn.on_object_finalized()
async def process_chunk_storage(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]):
    """
    Storage-triggered Cloud Function to process a new chunk uploaded to Firebase Storage.
    Extracts metadata and saves it to PostgreSQL.
    """
    
    bucket = event.data.bucket
    name = event.data.name  # Full path: user_uploads/firebase_user_id/chunkid_filename.ext
    content_type = event.data.content_type # MIME type
    time_created = event.data.time_created # datetime object
    # custom_metadata is under event.data.metadata for storage_fn
    custom_metadata = event.data.metadata if event.data.metadata is not None else {}

    print(f"Processing file: gs://{bucket}/{name}")
    print(f"Content-Type: {content_type}")
    print(f"Time Created: {time_created}")
    print(f"Custom Metadata: {custom_metadata}")

    firebase_user_id = custom_metadata.get("firebaseUserId")
    original_filename = custom_metadata.get("originalFilename")
    # client_timestamp_str = custom_metadata.get("clientTimestamp") # Available if needed

    if not firebase_user_id:
        print(f"Error: firebaseUserId not found in custom metadata for {name}. Cannot process chunk.")
        # This is a critical error, so we stop.
        return

    if not name.startswith("user_uploads/"): # Basic check to process only relevant files
        print(f"File {name} is not in user_uploads/. Skipping.")
        return

    # Construct AudiovisualGesturalChunkModel
    # The 'id' field in AudiovisualGesturalChunkModel is the primary key (chunk_id in DB)
    # It should be generated here before creating the model instance.
    chunk_model_id = uuid.uuid4()

    chunk_data = {
        "id": chunk_model_id,
        "user_id": firebase_user_id, # This is str (Firebase UID) as per recent model changes
        "chunk_type": content_type.split('/')[0] if content_type else "unknown", # e.g., 'audio' or 'video'
        "storage_ref": f"gs://{bucket}/{name}",
        "original_filename": original_filename if original_filename else name.split('/')[-1],
        "mime_type": content_type,
        "duration_seconds": None,  # Placeholder
        "resolution_width": None,  # Placeholder
        "resolution_height": None, # Placeholder
        "tria_processing_status": "pending_metadata_registration", # More specific initial status
        "tria_extracted_features_json": None,
        "related_gesture_id": None,
        "related_hologram_id": None,
        "custom_metadata_json": custom_metadata, # Store all received custom metadata
        # created_at and updated_at are handled by BaseUUIDModel's default_factory
        # or by the database if the model fields were Optional with no default_factory.
        # AudiovisualGesturalChunkModel inherits from BaseUUIDModel which provides these.
    }
    
    try:
        # Pydantic model instantiation might require created_at, updated_at if not optional
        # BaseUUIDModel likely provides default_factory for these.
        chunk_model_instance = AudiovisualGesturalChunkModel(**chunk_data)
    except Exception as e:
        print(f"Error creating AudiovisualGesturalChunkModel instance for {name}: {e}")
        print(f"Data used: {chunk_data}")
        return # Stop processing

    conn = None
    try:
        # Get DB connection (using the non-pooling version for now)
        # NEON_DATABASE_URL must be set in the Cloud Function's environment variables.
        # For production, ensure pg_connector.py is robust (handles retries, etc.)
        # and ideally uses a connection pool.
        conn = await get_db_connection()

        await create_audiovisual_gestural_chunk(db=conn, chunk_create=chunk_model_instance)
        print(f"Chunk metadata for {name} saved to database with ID: {chunk_model_id}")

        # Placeholder for Tria processing
        # This could involve publishing a Pub/Sub message with chunk_id and user_id,
        # or calling another service/function.
        print(f"Placeholder: Basic Tria processing can be triggered for chunk {chunk_model_id} by user {firebase_user_id}.")

    except Exception as e:
        print(f"Error during database operation or Tria trigger for {name}: {e}")
        # Consider more sophisticated error handling:
        # - Retries for transient DB errors.
        # - Moving the file to an error/quarantine bucket if processing fails permanently.
        # - Logging to a dedicated error monitoring service.
    finally:
        if conn:
            await conn.close() # Close the connection
            print(f"Database connection closed for {name}.")

    print(f"Successfully processed gs://{bucket}/{name}")
    # Cloud Functions should typically return None or a Promise for ack/nack.
    # For background functions, returning None is fine for success.
    return None
