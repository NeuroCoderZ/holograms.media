```python
# backend/core/tria_bots/ChunkProcessorBot.py

import asyncpg
from typing import Dict, Any, Optional
from uuid import UUID, uuid4
from datetime import datetime

from ..models.multimodal_models import AudiovisualGesturalChunkModel
from ..models.learning_log_models import TriaLearningLogModel # For optional logging
from ..crud_operations import create_audiovisual_gestural_chunk, create_tria_learning_log_entry # For optional logging

class ChunkProcessorBot:
    '''
    A bot responsible for processing and storing metadata of audiovisual gestural chunks.
    It receives chunk metadata, validates it against the AudiovisualGesturalChunkModel,
    and then persists it to the database.
    '''
    def __init__(self):
        '''
        Initializes the ChunkProcessorBot.
        Currently, no specific configuration is required at initialization.
        '''
        pass

    async def process_chunk_metadata(self, db: asyncpg.Connection, chunk_metadata: Dict[str, Any]) -> AudiovisualGesturalChunkModel:
        '''
        Processes the provided chunk metadata, creates an AudiovisualGesturalChunkModel instance,
        and saves it to the database.

        Args:
            db: An active asyncpg.Connection to the database.
            chunk_metadata: A dictionary containing the metadata for the chunk.
                            Expected keys include:
                            - chunk_id (str: UUID) - Will be used as 'id' for the model.
                            - user_id (str)
                            - chunk_type (str)
                            - storage_ref (str)
                            - original_filename (Optional[str])
                            - mime_type (Optional[str])
                            - duration_seconds (Optional[float])
                            - resolution_width (Optional[int])
                            - resolution_height (Optional[int])
                            - tria_processing_status (Optional[str], defaults to "pending")
                            - tria_extracted_features_json (Optional[Dict[str, Any]])
                            - related_gesture_id (Optional[str: UUID])
                            - related_hologram_id (Optional[str: UUID])
                            - custom_metadata_json (Optional[Dict[str, Any]])
                            - created_at (Optional[str: ISO datetime string or datetime object])
                            - updated_at (Optional[str: ISO datetime string or datetime object])

        Returns:
            The created AudiovisualGesturalChunkModel instance as returned by CRUD operations.

        Raises:
            ValueError: If 'chunk_id', 'user_id', 'chunk_type', or 'storage_ref' are missing.
            Exception: Can re-raise exceptions from database operations or model validation.
        '''
        print(f"ChunkProcessorBot received chunk_metadata: {chunk_metadata}")

        required_fields = ["chunk_id", "user_id", "chunk_type", "storage_ref"]
        for field in required_fields:
            if field not in chunk_metadata or chunk_metadata[field] is None:
                # This check is outside the main try...except block for clarity,
                # as it's a precondition failure.
                error_msg = f"Missing required field in chunk_metadata: {field}"
                print(f"ValueError: {error_msg} for chunk_id: {chunk_metadata.get('chunk_id', 'N/A')}")
                # Optionally log this specific validation error to TriaLearningLog before raising
                # For now, just print and raise as per primary instruction.
                raise ValueError(error_msg)

        try:
            model_data = {
                "id": UUID(chunk_metadata["chunk_id"]),
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
            "related_gesture_id": UUID(chunk_metadata["related_gesture_id"]) if chunk_metadata.get("related_gesture_id") else None,
            "related_hologram_id": UUID(chunk_metadata["related_hologram_id"]) if chunk_metadata.get("related_hologram_id") else None,
                "custom_metadata_json": chunk_metadata.get("custom_metadata_json", {}),
            }

            # Handle optional datetime fields if they are passed
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

            chunk_model_instance = AudiovisualGesturalChunkModel(**model_data)

            saved_chunk_model = await create_audiovisual_gestural_chunk(db=db, chunk_create=chunk_model_instance)

            # Log this event to TriaLearningLog
        try:
            log_details = {
                "chunk_id": str(saved_chunk_model.id),
                "user_id": saved_chunk_model.user_id, # user_id is TEXT, so direct use is fine
                "storage_ref": saved_chunk_model.storage_ref,
                "chunk_type": saved_chunk_model.chunk_type
            }
            # Ensure TriaLearningLogModel is correctly imported and used
            # The model might have default for user_id, session_id etc. if not explicitly set here
            log_entry_data = {
                "timestamp": datetime.utcnow(), # Compatible with DB default (now() AT TIME ZONE 'utc')
                "event_type": "chunk_metadata_processed",
                "bot_affected_id": self.__class__.__name__, # Using class name for bot_affected_id
                "summary_text": f"Successfully processed metadata for chunk: {saved_chunk_model.id}",
                "custom_data": log_details, # Renamed from details_json to custom_data as per schema change
                "user_id": saved_chunk_model.user_id # Explicitly pass user_id if available and relevant for the log
                # session_id, prompt_text, tria_response_text, model_used, feedback_score are optional or may not apply here
            }

            # Filter out None values from log_entry_data to use model defaults
            # This is important if TriaLearningLogModel has non-nullable fields that are not being set here
            # but have defaults in the model or DB.
            # However, for fields like user_id, it's better to set them if available.
            # For custom_data, an empty dict is fine if log_details is empty, but here it's populated.

            log_entry = TriaLearningLogModel(**log_entry_data)
            await create_tria_learning_log_entry(db=db, log_entry_create=log_entry)
            print(f"Successfully created learning log entry for chunk {saved_chunk_model.id}")
        except Exception as log_e:
            print(f"Failed to create learning log entry for chunk {saved_chunk_model.id}: {log_e}")
            # Decide if this error should affect the main operation. For MVP, just print.

            return saved_chunk_model

        except Exception as e:
            chunk_id_for_error = chunk_metadata.get('chunk_id', 'Unknown chunk_id')
            storage_ref_for_error = chunk_metadata.get('storage_ref', 'Unknown storage_ref')
            error_message = f"Error processing chunk metadata for chunk_id '{chunk_id_for_error}' (storage_ref: '{storage_ref_for_error}'): {type(e).__name__} - {e}"
            print(error_message)

            # Optional: Log the failure to TriaLearningLog as well.
            # This demonstrates a more robust logging strategy where processing failures are also recorded.
            # try:
            #     failure_log_details = {
            #         "error_type": type(e).__name__,
            #         "error_message": str(e),
            #         "input_chunk_id": chunk_id_for_error, # from input metadata
            #         "storage_ref": storage_ref_for_error  # from input metadata
            #     }
            #     log_entry = TriaLearningLogModel(
            #         timestamp=datetime.utcnow(),
            #         event_type="chunk_processing_failed",
            #         bot_affected_id=self.__class__.__name__,
            #         summary_text=f"Failed to process metadata for chunk: {chunk_id_for_error}",
            #         custom_data=failure_log_details,
            #         user_id=chunk_metadata.get("user_id") # Log user_id if available
            #     )
            #     await create_tria_learning_log_entry(db=db, log_entry_create=log_entry)
            #     print(f"Successfully created failure log entry for chunk {chunk_id_for_error}")
            # except Exception as log_failure_e:
            #     print(f"Critical: Failed to create failure log entry for chunk {chunk_id_for_error} after primary error: {log_failure_e}")

            raise # Re-raise the original exception to notify the caller
```
