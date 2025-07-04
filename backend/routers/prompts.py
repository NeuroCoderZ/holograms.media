from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from typing import List, Optional, Dict
import asyncpg
import logging

from backend.services.prompt_service import PromptService
from backend.core import models as core_models
from backend.auth import security
from backend.core.db.pg_connector import get_db_connection

logger = logging.getLogger(__name__)

router = APIRouter(
    # Prefix will be set in app.py, e.g., /api/v1/prompts
    tags=["Prompts"],
)

@router.post("/", response_model=core_models.UserPromptVersionDB, status_code=status.HTTP_201_CREATED)
async def create_prompt_version_endpoint(
    prompt_in: core_models.UserPromptVersionCreate,
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    prompt_service = PromptService(db_conn)
    created_prompt_version = await prompt_service.create_new_prompt_version(
        user_id=current_user.firebase_uid,
        prompt_data=prompt_in
    )
    if not created_prompt_version:
        logger.error(f"Router: Failed to create prompt version for user {current_user.firebase_uid}, title '{prompt_in.prompt_title}'.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create prompt version.")
    return created_prompt_version

@router.get("/titles/", response_model=List[core_models.UserPromptTitleInfo])
async def list_prompt_titles_endpoint(
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    prompt_service = PromptService(db_conn)
    titles = await prompt_service.list_user_prompt_titles(user_id=current_user.firebase_uid)
    return titles

@router.get("/{prompt_title}/versions/", response_model=List[core_models.UserPromptVersionDB])
async def list_versions_for_prompt_title_endpoint(
    prompt_title: str = Path(..., description="The title of the prompt to fetch versions for."),
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    skip: int = Query(0, ge=0, description="Number of records to skip."),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of records to return.")
):
    prompt_service = PromptService(db_conn)
    versions = await prompt_service.list_versions_for_prompt_title(
        prompt_title=prompt_title,
        user_id=current_user.firebase_uid,
        skip=skip,
        limit=limit
    )
    return versions

@router.get("/{prompt_title}/versions/latest/", response_model=core_models.UserPromptVersionDB)
async def get_latest_prompt_version_endpoint(
    prompt_title: str = Path(..., description="The title of the prompt."),
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    prompt_service = PromptService(db_conn)
    latest_version = await prompt_service.get_latest_prompt_version(
        prompt_title=prompt_title,
        user_id=current_user.firebase_uid
    )
    if not latest_version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No prompt found with title '{prompt_title}'.")
    return latest_version

@router.get("/{prompt_title}/versions/{version_number}", response_model=core_models.UserPromptVersionDB)
async def get_specific_prompt_version_endpoint(
    prompt_title: str = Path(..., description="The title of the prompt."),
    version_number: int = Path(..., description="The version number of the prompt."),
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    prompt_service = PromptService(db_conn)
    prompt_version = await prompt_service.get_prompt_version(
        prompt_title=prompt_title,
        version_number=version_number,
        user_id=current_user.firebase_uid
    )
    if not prompt_version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Prompt version not found for title '{prompt_title}' and version {version_number}.")
    return prompt_version

@router.get("/versions/{prompt_version_id}", response_model=core_models.UserPromptVersionDB)
async def get_prompt_version_by_id_endpoint(
    prompt_version_id: int = Path(..., description="The specific ID of the prompt version."),
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    prompt_service = PromptService(db_conn)
    prompt_version = await prompt_service.get_prompt_version_by_id(
        prompt_version_id=prompt_version_id,
        user_id=current_user.firebase_uid
    )
    if not prompt_version:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Prompt version with ID {prompt_version_id} not found.")
    return prompt_version

@router.delete("/versions/{prompt_version_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_prompt_version_endpoint(
    prompt_version_id: int = Path(..., description="The ID of the prompt version to delete."),
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    prompt_service = PromptService(db_conn)
    deleted = await prompt_service.delete_prompt_version(
        prompt_version_id=prompt_version_id,
        user_id=current_user.firebase_uid
    )
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt version not found or could not be deleted.")
    return None

@router.delete("/{prompt_title}/versions/", response_model=Dict[str, int])
async def delete_all_versions_for_prompt_title_endpoint(
    prompt_title: str = Path(..., description="The title of the prompt for which all versions will be deleted."),
    current_user: core_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    prompt_service = PromptService(db_conn)
    deleted_count = await prompt_service.delete_prompt_by_title(
        prompt_title=prompt_title,
        user_id=current_user.firebase_uid
    )
    return {"deleted_versions_count": deleted_count}
```
