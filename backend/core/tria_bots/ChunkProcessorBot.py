import asyncpg
from typing import Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime
import logging # Import the logging module

from ..models.multimodal_models import AudiovisualGesturalChunkModel
from ..models.learning_log_models import TriaLearningLogModel
from ..crud_operations import create_audiovisual_gestural_chunk, create_tria_learning_log_entry

# Configure logging for this module
logger = logging.getLogger(__name__)

class ChunkProcessorBot:
    """
    The ChunkProcessorBot is responsible for handling the initial processing and storage
    of metadata for audiovisual and gestural interaction chunks. This bot acts as a crucial
    interface between file uploads (e.g., from Firebase Storage) and the database persistence layer.
    """
    def __init__(self):
        """
        Initializes the ChunkProcessorBot. Currently, no specific external configurations
        or service dependencies are required at this stage of initialization, as database
        connections are passed at method invocation.
        """
        pass

    async def process_chunk_metadata(self, db: asyncpg.Connection, chunk_metadata: Dict[str, Any]) -> AudiovisualGesturalChunkModel:
        """
        Processes the provided raw chunk metadata dictionary. It validates required fields,
        converts the dictionary into an `AudiovisualGesturalChunkModel` instance, and then
        persists this model to the PostgreSQL database via CRUD operations. It also logs
        the successful processing to the Tria learning log.

        Args:
            db (asyncpg.Connection): An active asynchronous database connection object.
            chunk_metadata (Dict[str, Any]): A dictionary containing the raw metadata for the chunk.
                                             Expected keys and their types are detailed below.

        Expected `chunk_metadata` keys:
            - `chunk_id` (str: UUID string): The unique identifier for the chunk. Used as `id` for the model.
            - `user_id` (str): The ID of the user who owns this chunk.
            - `chunk_type` (str): The type of the chunk (e.g., "audio", "video", "gesture").
            - `storage_ref` (str): The reference/path to the stored chunk in Firebase Storage (e.g., "gs://bucket/path/to/file").
            - `original_filename` (Optional[str]): The original filename provided by the user.
            - `mime_type` (Optional[str]): The MIME type of the chunk content.
            - `duration_seconds` (Optional[float]): Duration of the chunk in seconds.
            - `resolution_width` (Optional[int]): Width resolution for video chunks.
            - `resolution_height` (Optional[int]): Height resolution for video chunks.
            - `tria_processing_status` (Optional[str]): Current processing status by Tria (defaults to "pending").
            - `tria_extracted_features_json` (Optional[Dict[str, Any]]): JSON blob of extracted features by Tria.
            - `related_gesture_id` (Optional[str: UUID string]): Link to a related gesture chunk.
            - `related_hologram_id` (Optional[str: UUID string]): Link to a related hologram.
            - `custom_metadata_json` (Optional[Dict[str, Any]]): Any additional custom metadata as a JSON object.
            - `created_at` (Optional[str: ISO datetime string or datetime object]): Timestamp of creation.
            - `updated_at` (Optional[str: ISO datetime string or datetime object]): Timestamp of last update.

        Returns:
            AudiovisualGesturalChunkModel: The Pydantic model instance representing the successfully created chunk
                                         record in the database, including database-generated timestamps.

        Raises:
            ValueError: If any critical required fields (`chunk_id`, `user_id`, `chunk_type`, `storage_ref`) are missing or invalid.
            asyncpg.PostgresError: If a database-specific error occurs during the insertion operation.
            Exception: For any other unexpected errors during processing or model validation.
        """
        logger.info(f"ChunkProcessorBot received chunk_metadata for processing.")
        logger.debug(f"Received chunk_metadata: {chunk_metadata}")

        # --- Pre-validation of required fields ---
        # These fields are essential for creating a valid chunk record.
        required_fields = ["chunk_id", "user_id", "chunk_type", "storage_ref"]
        for field in required_fields:
            if field not in chunk_metadata or chunk_metadata[field] is None:
                error_msg = f"Missing or null required field in chunk_metadata: '{field}'. Aborting processing."
                logger.error(f"ValueError: {error_msg} for chunk_id: {chunk_metadata.get('chunk_id', 'N/A')}")
                raise ValueError(error_msg)

        try:
            # --- Construct Pydantic model data from dictionary ---
            # Convert UUID strings to UUID objects and handle optional fields gracefully.
            model_data = {
                "id": UUID(chunk_metadata["chunk_id"]), # The 'id' field in the model maps to 'chunk_id' in DB.
                "user_id": chunk_metadata["user_id"],
                "chunk_type": chunk_metadata["chunk_type"],
                "storage_ref": chunk_metadata["storage_ref"],
                "original_filename": chunk_metadata.get("original_filename"),
                "mime_type": chunk_metadata.get("mime_type"),
                "duration_seconds": chunk_metadata.get("duration_seconds"),
                "resolution_width": chunk_metadata.get("resolution_width"),
                "resolution_height": chunk_metadata.get("resolution_height"),
                "tria_processing_status": chunk_metadata.get("tria_processing_status", "pending"),
                "tria_extracted_features_json": chunk_metadata.get("tria_extracted_features_json"),
                "related_gesture_id": (UUID(chunk_metadata["related_gesture_id"]) 
                                       if chunk_metadata.get("related_gesture_id") else None),
                "related_hologram_id": (UUID(chunk_metadata["related_hologram_id"]) 
                                        if chunk_metadata.get("related_hologram_id") else None),
                "custom_metadata_json": chunk_metadata.get("custom_metadata_json", {}),
            }

            # Convert ISO datetime strings to datetime objects if provided. 
            # `replace("Z", "+00:00")` handles the 'Z' timezone suffix common in ISO 8601.
            created_at_val = chunk_metadata.get("created_at")
            if created_at_val:
                if isinstance(created_at_val, str):
                    model_data["created_at"] = datetime.fromisoformat(created_at_val.replace("Z", "+00:00"))
                elif isinstance(created_at_val, datetime):
                    model_data["created_at"] = created_at_val

            updated_at_val = chunk_metadata.get("updated_at")
            if updated_at_val:
                if isinstance(updated_at_val, str):
                    model_data["updated_at"] = datetime.fromisoformat(updated_at_val.replace("Z", "+00:00"))
                elif isinstance(updated_at_val, datetime):
                     model_data["updated_at"] = updated_at_val

            # Create an instance of the AudiovisualGesturalChunkModel.
            chunk_model_instance = AudiovisualGesturalChunkModel(**model_data)
            logger.info(f"AudiovisualGesturalChunkModel instance created for chunk ID: {chunk_model_instance.id}")

            # --- Persist chunk metadata to database ---
            saved_chunk_model = await create_audiovisual_gestural_chunk(db=db, chunk_create=chunk_model_instance)
            logger.info(f"Chunk metadata successfully saved to DB for ID: {saved_chunk_model.id}")

            # --- Log successful processing to TriaLearningLog ---
            # This creates a record of the bot's action in the learning log.
            try:
                log_details = {
                    "chunk_id": str(saved_chunk_model.id),
                    "user_id": saved_chunk_model.user_id,
                    "storage_ref": saved_chunk_model.storage_ref,
                    "chunk_type": saved_chunk_model.chunk_type
                }
                log_entry_data = {
                    "timestamp": datetime.utcnow(), # Use UTC for consistency
                    "event_type": "chunk_metadata_processed",
                    "bot_affected_id": self.__class__.__name__, # Use class name for bot ID
                    "summary_text": f"Successfully processed metadata for chunk: {saved_chunk_model.id}",
                    "custom_data": log_details,
                    "user_id": saved_chunk_model.user_id # Explicitly pass user_id for logging context
                }
                log_entry = TriaLearningLogModel(**log_entry_data)
                await create_tria_learning_log_entry(db=db, log_entry_create=log_entry)
                logger.info(f"Successfully created learning log entry for chunk {saved_chunk_model.id}")
            except Exception as log_e:
                # Log errors during learning log creation but do not prevent the main operation from succeeding.
                logger.error(f"Failed to create learning log entry for chunk {saved_chunk_model.id}: {log_e}")
            
            return saved_chunk_model

        except Exception as e:
            # Catch any exception during the main processing flow.
            chunk_id_for_error = chunk_metadata.get('chunk_id', 'Unknown chunk_id')
            storage_ref_for_error = chunk_metadata.get('storage_ref', 'Unknown storage_ref')
            error_message = f"Error processing chunk metadata for chunk_id '{chunk_id_for_error}' (storage_ref: '{storage_ref_for_error}'): {type(e).__name__} - {e}"
            logger.exception(error_message) # Logs the exception traceback

            # Optional: Log the failure to TriaLearningLog as well. This provides a comprehensive audit trail.
            # This block is commented out but shows how to add robust error logging.
            # try:
            #     failure_log_details = {
            #         "error_type": type(e).__name__,
            #         "error_message": str(e),
            #         "input_chunk_id": chunk_id_for_error,
            #         "storage_ref": storage_ref_for_error
            #     }
            #     log_entry = TriaLearningLogModel(
            #         timestamp=datetime.utcnow(),
            #         event_type="chunk_processing_failed",
            #         bot_affected_id=self.__class__.__name__,
            #         summary_text=f"Failed to process metadata for chunk: {chunk_id_for_error}",
            #         custom_data=failure_log_details,
            #         user_id=chunk_metadata.get("user_id")
            #     )
            #     await create_tria_learning_log_entry(db=db, log_entry_create=log_entry)
            #     logger.info(f"Successfully created failure log entry for chunk {chunk_id_for_error}")
            # except Exception as log_failure_e:
            #     logger.critical(f"CRITICAL: Failed to create failure log entry for chunk {chunk_id_for_error} after primary error: {log_failure_e}")

            raise # Re-raise the original exception to ensure the Cloud Function (caller) is notified of failure.
