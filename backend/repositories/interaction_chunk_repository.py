import asyncpg
from typing import Optional
import logging

from backend.core.models.interaction_chunk_model import InteractionChunkCreate, InteractionChunkDB

logger = logging.getLogger(__name__)

class InteractionChunkRepository:
    def __init__(self, conn: asyncpg.Connection):
        self.conn = conn

    async def create_chunk(self, user_id: str, chunk_create: InteractionChunkCreate) -> Optional[InteractionChunkDB]:
        # The user_id from the authenticated user overrides any user_id in the payload.
        chunk_create.user_id = user_id

        sql = """
            INSERT INTO interaction_chunks (
                timestamp, user_id, session_id, audio_data_ref, video_data_ref,
                hand_landmarks, gesture_classification_client, gesture_confidence_client,
                speech_transcription_client, environment_context, user_feedback_rating,
                user_feedback_text, user_flagged_issue, tria_processed_flag,
                processing_tags, metadata, raw_data_blob
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            )
            RETURNING id, timestamp, user_id, session_id, audio_data_ref, video_data_ref,
                      hand_landmarks, gesture_classification_client, gesture_confidence_client,
                      speech_transcription_client, environment_context, user_feedback_rating,
                      user_feedback_text, user_flagged_issue, tria_processed_flag,
                      processing_tags, metadata, raw_data_blob,
                      -- DB-specific fields that are null on creation
                      gesture_classification_server, gesture_confidence_server,
                      speech_transcription_server, audio_embedding_ref,
                      video_embedding_ref, gesture_embedding_ref;
        """
        try:
            row = await self.conn.fetchrow(
                sql,
                chunk_create.timestamp,
                chunk_create.user_id,
                chunk_create.session_id,
                chunk_create.audio_data_ref,
                chunk_create.video_data_ref,
                chunk_create.hand_landmarks,
                chunk_create.gesture_classification_client,
                chunk_create.gesture_confidence_client,
                chunk_create.speech_transcription_client,
                chunk_create.environment_context,
                chunk_create.user_feedback_rating,
                chunk_create.user_feedback_text,
                chunk_create.user_flagged_issue,
                chunk_create.tria_processed_flag,
                chunk_create.processing_tags,
                chunk_create.metadata,
                chunk_create.raw_data_blob
            )
            return InteractionChunkDB(**dict(row)) if row else None
        except asyncpg.PostgresError as e:
            logger.error(f"DB error in InteractionChunkRepository.create_chunk for user {user_id}: {e}")
            raise
        except Exception as e:
            logger.error(f"Unexpected error in InteractionChunkRepository.create_chunk for user {user_id}: {e}")
            raise
