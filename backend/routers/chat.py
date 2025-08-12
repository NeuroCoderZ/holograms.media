# backend/routers/chat.py
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
import logging

from backend.core.tria_bots.ChatBot import ChatBot
from backend.core import models as core_models
from backend.auth import security

logger = logging.getLogger(__name__)

router = APIRouter()

# Pydantic model for the request body
class ChatRequest(BaseModel):
    text: str

# Pydantic model for the response body
class ChatResponse(BaseModel):
    response: str

@router.post(
    "/", 
    response_model=ChatResponse, 
    summary="Send a message to Tria ChatBot",
    description="Receives a user's message, gets a response from the Tria ChatBot, and returns it."
)
async def handle_chat_message(
    request: ChatRequest,
    current_user: core_models.UserInDB = Depends(security.get_current_active_user)
):
    """
    Handles a chat message from the user.
    - Verifies user authentication.
    - Passes the user's message to the ChatBot.
    - Returns the bot's response.
    """
    logger.info(f"Received chat message from user: {current_user.firebase_uid}")
    
    if not request.text:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The 'text' field cannot be empty."
        )

    try:
        # Initialize the ChatBot
        chatbot = ChatBot()
        
        # Get the response from the bot
        bot_response = await chatbot.get_response(
            user_input=request.text,
            firebase_user_id=current_user.firebase_uid
        )
        
        logger.info(f"Sending response to user {current_user.firebase_uid}: {bot_response[:100]}...")
        
        return ChatResponse(response=bot_response)

    except Exception as e:
        logger.exception(f"An unexpected error occurred while handling chat for user {current_user.firebase_uid}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="An internal error occurred while processing the chat message."
        )