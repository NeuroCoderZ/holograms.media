from fastapi import APIRouter, Depends, HTTPException, status, Request
import asyncpg
import json
import traceback

from backend.repositories.interaction_chunk_repository import InteractionChunkRepository
from backend.core.db.pg_connector import get_db_connection
from backend.core.models.interaction_chunk_model import InteractionChunkCreate, InteractionChunkDB
from backend.core.models.user_models import UserInDB
from backend.auth import security

router = APIRouter(
    tags=["Interaction Chunks"],
)

def get_interaction_chunk_repo(db_conn: asyncpg.Connection = Depends(get_db_connection)) -> InteractionChunkRepository:
    return InteractionChunkRepository(db_conn)

@router.post("/submit", response_model=InteractionChunkDB, status_code=status.HTTP_21_CREATED)
async def submit_interaction_chunk(
    request: Request,
    chunk_create_data: InteractionChunkCreate,
    current_user: UserInDB = Depends(security.get_current_active_user),
    repo: InteractionChunkRepository = Depends(get_interaction_chunk_repo)
):
    """
    Receives an interaction chunk from the client, saves its metadata to the database via the repository,
    and publishes a message to Pub/Sub for further processing.
    """
    if not current_user.user_id:
        print("[SUBMIT CHUNK ERROR] User ID missing from current_user object.")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User authentication error: User ID not found."
        )

    print(f"[SUBMIT CHUNK INFO] Received chunk from user: {current_user.user_id}, session: {chunk_create_data.session_id}")

    try:
        created_chunk = await repo.create_chunk(
            user_id=current_user.user_id,
            chunk_create=chunk_create_data
        )
        if not created_chunk:
            print(f"[SUBMIT CHUNK ERROR] Failed to create interaction chunk in DB for user: {current_user.user_id}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save interaction chunk."
            )

        print(f"[SUBMIT CHUNK INFO] Interaction chunk {created_chunk.id} saved successfully for user: {current_user.user_id}")

        # Publish message to Pub/Sub
        publisher_client = request.app.state.pubsub_publisher_client
        topic_path = request.app.state.pubsub_topic_path

        if publisher_client and topic_path:
            message_data = {
                "chunk_id": str(created_chunk.id), # Assuming id is int, convert to str for JSON if needed
                "user_id": current_user.user_id,
                "session_id": created_chunk.session_id,
                "timestamp": created_chunk.timestamp.isoformat()
            }
            message_json = json.dumps(message_data)
            message_bytes = message_json.encode("utf-8")

            try:
                publish_future = publisher_client.publish(topic_path, data=message_bytes)

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
        else:
            print("[SUBMIT CHUNK WARN] Pub/Sub client or topic not configured. Skipping message publishing.")

        return created_chunk

    except asyncpg.PostgresError as pg_err:
        print(f"[SUBMIT CHUNK DB ERROR] PostgreSQL error while saving chunk for user {current_user.user_id}: {pg_err}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database error while saving interaction chunk."
        )
    except Exception as e:
        print(f"[SUBMIT CHUNK ERROR] Unexpected error while saving chunk for user {current_user.user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An unexpected error occurred."
        )