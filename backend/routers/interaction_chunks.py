from fastapi import APIRouter, Depends, HTTPException, status, Request # Added Request
import asyncpg
import json # Added for Pub/Sub message serialization
import traceback # For logging Pub/Sub errors

from backend.core import crud_operations
from backend.db.pg_connector import get_db_connection
from backend.core.models.interaction_chunk_model import InteractionChunkCreate, InteractionChunkDB
from backend.core.models.user_models import UserInDB
from backend.auth import security 

router = APIRouter(
    prefix="/api/v1/interaction_chunks",
    tags=["Interaction Chunks"],
)

@router.post("/submit", response_model=InteractionChunkDB, status_code=status.HTTP_201_CREATED)
async def submit_interaction_chunk(
    request: Request, # Added Request to access app.state
    chunk_create_data: InteractionChunkCreate,
    current_user: UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Receives an interaction chunk from the client, saves its metadata to the database,
    and publishes a message to Pub/Sub for further processing.
    Audio and video data are assumed to be uploaded to Cloud Storage by the client,
    and their paths/references are included in `chunk_create_data.audio_data_ref`
    and `chunk_create_data.video_data_ref`.
    """
    if not current_user.firebase_uid:
        # This should ideally not happen if get_current_active_user ensures firebase_uid is present
        print("[SUBMIT CHUNK ERROR] Firebase UID missing from current_user object.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="User authentication error: Firebase UID not found."
        )

    # The user_id field in InteractionChunkCreate might be Optional.
    # We will use the authenticated user's firebase_uid.
    # If chunk_create_data.user_id is set, we could validate it matches current_user.firebase_uid
    # or simply ignore it and always use current_user.firebase_uid.
    # For now, we'll ensure the chunk's user_id is set to the authenticated user's ID.
    
    # Override or ensure user_id in chunk_create_data is the authenticated user's firebase_uid
    # The InteractionChunkCreate model has user_id as Optional[str].
    # The CRUD operation create_audiovisual_gestural_chunk takes firebase_uid as a separate first argument.
    # So, we don't strictly need to set chunk_create_data.user_id here if the CRUD function uses the passed firebase_uid.
    
    print(f"[SUBMIT CHUNK INFO] Received chunk from user: {current_user.firebase_uid}, session: {chunk_create_data.session_id}")
    print(f"[SUBMIT CHUNK DEBUG] Audio ref: {chunk_create_data.audio_data_ref}, Video ref: {chunk_create_data.video_data_ref}")

    try:
        created_chunk = await crud_operations.create_audiovisual_gestural_chunk(
            conn=db_conn,
            firebase_uid=current_user.firebase_uid,
            chunk_create=chunk_create_data
        )
        if not created_chunk:
            print(f"[SUBMIT CHUNK ERROR] Failed to create interaction chunk in DB for user: {current_user.firebase_uid}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save interaction chunk."
            )
        
        print(f"[SUBMIT CHUNK INFO] Interaction chunk {created_chunk.id} saved successfully for user: {current_user.firebase_uid}")
        print(f"[SUBMIT CHUNK INFO] Interaction chunk {created_chunk.id} saved successfully for user: {current_user.firebase_uid}")
        
        # Publish message to Pub/Sub
        publisher_client = request.app.state.pubsub_publisher_client
        topic_path = request.app.state.pubsub_topic_path

        if publisher_client and topic_path:
            message_data = {
                "chunk_id": created_chunk.id,
                "firebase_uid": current_user.firebase_uid,
                "session_id": created_chunk.session_id, # Include session_id if useful for Genkit
                "timestamp": created_chunk.timestamp.isoformat() # Include timestamp
            }
            message_json = json.dumps(message_data)
            message_bytes = message_json.encode("utf-8")
            
            try:
                publish_future = publisher_client.publish(topic_path, data=message_bytes)
                # Wait for publish to complete (optional, can be done asynchronously)
                # For MVP, let's make it non-blocking but get the result to log.
                # Using publish_future.result(timeout=...) would block.
                # For now, simple fire-and-forget with callback for logging.
                def callback(future):
                    try:
                        message_id = future.result()
                        print(f"[SUBMIT CHUNK INFO] Published Pub/Sub message ID: {message_id} for chunk_id: {created_chunk.id}")
                    except Exception as e_pub:
                        print(f"[SUBMIT CHUNK ERROR] Failed to publish Pub/Sub message for chunk_id {created_chunk.id}: {e_pub}")
                        traceback.print_exc()
                
                publish_future.add_done_callback(callback)
                
            except Exception as e:
                print(f"[SUBMIT CHUNK ERROR] Error publishing to Pub/Sub for chunk_id {created_chunk.id}: {e}")
                traceback.print_exc()
                # Do not fail the request if Pub/Sub publish fails, but log critically.
        else:
            print("[SUBMIT CHUNK WARN] Pub/Sub client or topic not configured. Skipping message publishing.")
            
        return created_chunk

    except asyncpg.PostgresError as pg_err:
        print(f"[SUBMIT CHUNK DB ERROR] PostgreSQL error while saving chunk for user {current_user.firebase_uid}: {pg_err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database error while saving interaction chunk."
        )
    except Exception as e:
        print(f"[SUBMIT CHUNK ERROR] Unexpected error while saving chunk for user {current_user.firebase_uid}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )
