# backend/core/crud_operations.py
# CRUD operations for database interaction
"""This module provides Create, Read, Update, and Delete (CRUD) operations
for interacting with the PostgreSQL database. It encapsulates the SQL queries
and basic error handling for various data models used in the application.
"""

import asyncpg
from typing import Optional, Any, Dict, List
from uuid import uuid4, UUID
from datetime import datetime
import logging

# Import Pydantic models from their respective modules
from backend.core.models.user_models import UserInDB
from backend.core.models.multimodal_models import UserGestureModel
from backend.core.models.learning_log_models import TriaLearningLogModel
from backend.core.models.hologram_models import UserHologramResponseModel

# Configure logging for this module
logger = logging.getLogger(__name__)


async def get_user_by_firebase_uid(db: asyncpg.Connection, firebase_uid: str) -> Optional[UserInDB]:
    """
    Retrieves a user from the database by their Firebase UID.

    Args:
        db: An active asyncpg database connection.
        firebase_uid: The Firebase UID (maps to 'user_id' column in DB) of the user to retrieve.

    Returns:
        A UserInDB instance if the user is found, otherwise None.
        A locally generated UUID for the 'id' field is added if UserInDB expects it.
    
    Raises:
        asyncpg.PostgresError: If a database error occurs during the fetch operation.
    """
    sql = """
        SELECT user_id, email, created_at, updated_at
        FROM users
        WHERE user_id = $1;
    """
    logger.info(f"Attempting to retrieve user with Firebase UID: {firebase_uid}")
    try:
        row = await db.fetchrow(sql, firebase_uid)
        if row:
            user_data = dict(row)
            if 'user_id' in user_data and 'user_id_firebase' not in user_data:
                user_data['user_id_firebase'] = user_data.pop('user_id')
            
            if hasattr(UserInDB, 'id') and not 'id' in user_data: # If UserInDB expects an 'id' (e.g. from BaseUUIDModel)
                user_data['id'] = uuid4() # This ID is not from the 'users' table.

            user = UserInDB(**user_data)
            logger.info(f"User {firebase_uid} found in database.")
            return user
        else:
            logger.info(f"User with Firebase UID {firebase_uid} not found in database.")
            return None
    except asyncpg.PostgresError as e:
        logger.exception(f"Database error while fetching user by Firebase UID {firebase_uid}.")
        raise


async def create_tria_learning_log_entry(
    db: asyncpg.Connection, *, log_entry_create: TriaLearningLogModel
) -> TriaLearningLogModel:
    """
    Creates a new Tria learning log entry in the database.
    The `log_id` is auto-generated by the database.
    """
    sql = """
        INSERT INTO tria_learning_log (
            user_id, session_id, event_type, bot_affected_id, summary_text,
            prompt_text, tria_response_text, model_used, feedback_score, custom_data,
            timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING log_id, user_id, session_id, event_type, bot_affected_id, summary_text,
                  prompt_text, tria_response_text, model_used, feedback_score, custom_data,
                  timestamp;
    """
    logger.info(f"Attempting to create Tria learning log entry for user: {log_entry_create.user_id}, event: {log_entry_create.event_type}")
    try:
        row = await db.fetchrow(
            sql,
            log_entry_create.user_id,
            log_entry_create.session_id, # Assuming this can be str or UUID compatible with DB type
            log_entry_create.event_type,
            log_entry_create.bot_affected_id,
            log_entry_create.summary_text,
            log_entry_create.prompt_text,
            log_entry_create.tria_response_text,
            log_entry_create.model_used,
            log_entry_create.feedback_score,
            log_entry_create.custom_data, # Pydantic model has custom_data
            log_entry_create.timestamp,
        )
        if row:
            created_log = TriaLearningLogModel(**dict(row))
            logger.info(f"Tria learning log entry created with log_id: {created_log.log_id}")
            return created_log
        else:
            logger.error(f"TriaLearningLog entry creation failed, no data returned for user: {log_entry_create.user_id}")
            raise Exception("TriaLearningLog entry creation failed, no data returned.")
    except asyncpg.PostgresError as e:
        logger.exception(f"Database error while creating Tria learning log entry for user {log_entry_create.user_id}.")
        raise
    except Exception as e: # Catching broader exceptions for unexpected issues
        logger.exception(f"An unexpected error occurred while creating Tria learning log entry for user {log_entry_create.user_id}.")
        raise


async def create_audiovisual_gestural_chunk(
    db: asyncpg.Connection, *, chunk_create: None
) -> None:
    """
    Creates a new audiovisual/gestural chunk record in the database.
    """
    # This function was likely intended to use AudiovisualGesturalChunkModel,
    # but that model is currently causing import issues and is not used in this refactored context.
    # Keeping the function stubbed or removing it depends on future plans.
    # For now, stubbing with None types to allow import fix.
    logger.warning("create_audiovisual_gestural_chunk is called but is currently stubbed.")
    pass # Functionality needs to be re-evaluated or removed.


async def get_chunk_by_id(db: asyncpg.Connection, chunk_id: UUID) -> Optional[None]:
    """
    Retrieves an audiovisual/gestural chunk from the database by its ID.
    """
    # This function was likely intended to use AudiovisualGesturalChunkModel,
    # but that model is currently causing import issues and is not used in this refactored context.
    # Keeping the function stubbed or removing it depends on future plans.
    # For now, stubbing with None types to allow import fix.
    logger.warning("get_chunk_by_id is called but is currently stubbed.")
    return None # Functionality needs to be re-evaluated or removed.


# --- Функция для получения жестов пользователя (get_gestures_by_user_id) была здесь ---
# --- Она удалена, так как ее функциональность покрывается GestureRepository ---
# --- и использовала неконсистентную модель UserGestureModel для таблицы user_gestures.---

# --- Функция для получения голограмм пользователя (из ветки feature/backend-my-holograms-jules / PR #57) ---
# Эта функция была удалена, так как ее логика перенесена в HologramRepository.
# async def get_holograms_by_user_id(db: asyncpg.Connection, user_id: str) -> List[UserHologramResponseModel]:
#    ... (код функции)