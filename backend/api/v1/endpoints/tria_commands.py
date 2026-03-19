# File: backend/api/v1/endpoints/tria_commands.py
from backend.models.tria_models import TriaPromptRequest, TriaPromptResponse
from backend.llm.gemini_llm import LLM_CONTEXT
from backend.auth.security import get_current_active_user
from fastapi import APIRouter, Request, HTTPException, Depends
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/prompt", response_model=TriaPromptResponse, tags=["Tria AI"])
async def handle_tria_prompt(
    request: Request, 
    prompt_data: TriaPromptRequest,
    current_user = Depends(get_current_active_user)
):
    """
    Receives a user prompt, forwards it to the TriaOrchestrator,
    and returns Tria's response.
    """
    try:
        logger.info(f"Received prompt for Tria: '{prompt_data.prompt}'")
        
        tria_orchestrator = request.app.state.tria_orchestrator
        if not tria_orchestrator:
             raise HTTPException(status_code=503, detail="Tria service is not available.")
        
        # Pass global project context and user email for role-based routing
        tria_response_text = await tria_orchestrator.process_user_prompt(
            prompt_data.prompt, 
            context=LLM_CONTEXT,
            user_email=current_user.get("email", "")
        )
        
        if tria_response_text is None:
             raise HTTPException(status_code=500, detail="Tria returned an empty response.")


        logger.info(f"Tria response: '{tria_response_text}'")

        return TriaPromptResponse(
            response=tria_response_text,
            session_id=prompt_data.session_id
        )

    except HTTPException as http_exc:
        # Просто перебрасываем HTTP исключения дальше
        raise http_exc
    except Exception as e:
        logger.error(f"An unexpected error occurred while processing Tria prompt: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An internal error occurred: {e}")
