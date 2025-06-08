from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from backend.core.services.llm_service import LLMService

# Pydantic model for the request body
class PublicChatMessage(BaseModel):
    message: str

# Create an API router
router = APIRouter()

# Instantiate the LLMService
llm_service = LLMService()

@router.post("/public_chat", tags=["Chat"])
async def public_chat_endpoint(payload: PublicChatMessage):
    """
    Endpoint for handling public chat messages.
    Receives a message from the user and returns a response from the public LLM bot.
    """
    try:
        response = await llm_service.get_public_bot_response(payload.message)
        return {"response": response}
    except Exception as e:
        # Log the exception e for debugging
        print(f"Error in public_chat_endpoint: {e}") # Replace with proper logging in a real application
        raise HTTPException(status_code=500, detail="An internal server error occurred.")

# Example of how this router might be included in a main FastAPI app (e.g., in app.py or main.py)
# from fastapi import FastAPI
# app = FastAPI()
# app.include_router(router, prefix="/api/v1/chat", tags=["Chat Endpoints"])
# The above is just a comment to illustrate usage, not functional code here.
