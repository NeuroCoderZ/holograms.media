from fastapi import APIRouter, Depends, HTTPException, status, Query, Path
from typing import List, Optional, Dict, Any # Ensure List, Optional, Dict, Any are imported
import asyncpg

from backend.core import crud_operations
from backend.core.models import prompt_models, user_models # For UserInDB type hint
from backend.auth import security
from backend.db.pg_connector import get_db_connection

router = APIRouter(
    prefix="/users/me/prompts",
    tags=["User Prompt Versions"],
)

@router.post("/", response_model=prompt_models.UserPromptVersion, status_code=status.HTTP_201_CREATED)
async def create_new_user_prompt_version(
    prompt_in: prompt_models.PromptVersionCreate,
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Save a new version of a prompt for the user.
    The version number is determined automatically by incrementing the last version for that (user, prompt_title).
    """
    try:
        print(f"[PROMPT ROUTER INFO] User {current_user.firebase_uid} creating prompt version for title: {prompt_in.prompt_title}") # Use firebase_uid
        created_prompt_version = await crud_operations.create_user_prompt_version(
            conn=db_conn, user_id=current_user.firebase_uid, prompt_in=prompt_in # Use firebase_uid
        )
        if not created_prompt_version:
            print(f"[PROMPT ROUTER WARN] Prompt version creation failed for user {current_user.firebase_uid}, title: {prompt_in.prompt_title}.")
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Could not create prompt version. It might be a duplicate if versioning logic failed or another database error occurred.")
        print(f"[PROMPT ROUTER INFO] Prompt version '{created_prompt_version.prompt_title}' v{created_prompt_version.version_number} (ID: {created_prompt_version.id}) created for user {current_user.firebase_uid}.")
        return created_prompt_version
    except HTTPException: 
        raise
    except Exception as e: 
        print(f"[PROMPT ROUTER ERROR] Error creating user prompt version for user {current_user.firebase_uid}, title {prompt_in.prompt_title}: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal server error creating prompt version.")

@router.get("/", response_model=List[Dict[str, Any]]) 
async def list_user_prompt_titles_with_meta( 
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    List all unique prompt titles for the current authenticated user,
    along with a count of versions and the last updated timestamp for each title.
    NOTE: The CRUD operation for this (get_distinct_user_prompt_titles_with_meta) is not yet implemented.
    This endpoint will currently return a 501 Not Implemented error.
    """
    print(f"[PROMPT ROUTER INFO] User {current_user.firebase_uid} listing prompt titles with meta.") # Use firebase_uid
    # try:
    #     if hasattr(crud_operations, "get_distinct_user_prompt_titles_with_meta"):
    #         titles_info = await crud_operations.get_distinct_user_prompt_titles_with_meta(
    #             conn=db_conn, user_id=current_user.firebase_uid # Use firebase_uid
    #         )
    #         print(f"[PROMPT ROUTER INFO] Found {len(titles_info)} distinct prompt titles for user {current_user.firebase_uid}.")
    #         return titles_info
    #     else:
    print(f"[PROMPT ROUTER WARN] CRUD function 'get_distinct_user_prompt_titles_with_meta' not implemented. User: {current_user.firebase_uid}.")
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Functionality to list grouped prompt titles is not available.")
            
    # except Exception as e:
    #     print(f"[PROMPT ROUTER ERROR] Error listing user prompt titles for user {current_user.firebase_uid}: {e}")
    #     raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error fetching prompt titles.")

@router.get("/{prompt_title}/versions", response_model=List[prompt_models.UserPromptVersion])
async def list_versions_for_prompt_title(
    prompt_title: str = Path(..., min_length=1, max_length=255, description="The title of the prompt to fetch versions for."),
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection),
    skip: int = Query(0, ge=0, description="Number of version records to skip for pagination."),
    limit: int = Query(100, ge=1, le=200, description="Maximum number of version records to return.")
):
    """
    List all versions for a specific prompt title for the current user, ordered by version number descending.
    """
    print(f"[PROMPT ROUTER INFO] User {current_user.firebase_uid} listing versions for prompt title: '{prompt_title}'. Skip: {skip}, Limit: {limit}") # Use firebase_uid
    versions = await crud_operations.get_user_prompt_versions_by_title(
        conn=db_conn, user_id=current_user.firebase_uid, prompt_title=prompt_title, skip=skip, limit=limit # Use firebase_uid
    )
    print(f"[PROMPT ROUTER INFO] Found {len(versions)} versions for prompt title '{prompt_title}' for user {current_user.firebase_uid}.")
    return versions

@router.get("/versions/{version_id}", response_model=prompt_models.UserPromptVersion)
async def get_specific_prompt_version_by_id( 
    version_id: int = Path(..., description="The ID of the specific prompt version to retrieve."),
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Get a specific prompt version by its ID for the current authenticated user.
    """
    print(f"[PROMPT ROUTER INFO] User {current_user.firebase_uid} fetching prompt version ID: {version_id}") # Use firebase_uid
    prompt_version = await crud_operations.get_user_prompt_version_by_id(
        conn=db_conn, prompt_version_id=version_id, user_id=current_user.firebase_uid # Use firebase_uid
    )
    if not prompt_version:
        print(f"[PROMPT ROUTER WARN] Prompt version ID: {version_id} not found for user {current_user.firebase_uid}.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt version not found.")
    print(f"[PROMPT ROUTER INFO] Prompt version ID: {version_id} found for user {current_user.firebase_uid}.")
    return prompt_version

@router.delete("/versions/{version_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_specific_prompt_version_by_id( 
    version_id: int = Path(..., description="The ID of the specific prompt version to delete."),
    current_user: user_models.UserInDB = Depends(security.get_current_active_user),
    db_conn: asyncpg.Connection = Depends(get_db_connection)
):
    """
    Delete a specific prompt version by its ID for the current authenticated user.
    """
    print(f"[PROMPT ROUTER INFO] User {current_user.firebase_uid} deleting prompt version ID: {version_id}") # Use firebase_uid
    deleted = await crud_operations.delete_user_prompt_version(
        conn=db_conn, prompt_version_id=version_id, user_id=current_user.firebase_uid # Use firebase_uid
    )
    if not deleted:
        print(f"[PROMPT ROUTER WARN] Prompt version ID: {version_id} not found or not owned by user {current_user.firebase_uid} for deletion.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Prompt version not found or not owned by user.")
    print(f"[PROMPT ROUTER INFO] Prompt version ID: {version_id} deleted successfully for user {current_user.firebase_uid}.")
    return None 
```
