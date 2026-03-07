import logging
from typing import List, Dict, Any
from mistralai import Mistral
from backend.core.config import settings
from backend.core.models import ChatMessageDB

logger = logging.getLogger(__name__)

async def get_mistral_response(user_message: str, history: List[ChatMessageDB], system_instruction: str) -> str:
    """Gets response from Mistral Large using the official Python client."""
    if not settings.MISTRAL_API_KEY:
        logger.warning("MISTRAL_API_KEY is not set. Returning stub response.")
        return f"Триа [Mistral Stub]: ИИ-модуль не подключен."

    try:
        # Initialize the synchronous Mistral client (it also supports async)
        client = Mistral(api_key=settings.MISTRAL_API_KEY)
        
        # Mistral-large-latest supports ~128k tokens. 
        # Safely truncate system instruction to ~400k chars (~100k tokens)
        MAX_MISTRAL_CHARS = 400000 
        if len(system_instruction) > MAX_MISTRAL_CHARS:
            system_instruction = system_instruction[:MAX_MISTRAL_CHARS] + "\n...[TRUNCATED FOR MISTRAL]..."
            
        # Build the messages array starting with the system instruction
        messages = [
            {
                "role": "system",
                "content": system_instruction
            }
        ]
        
        for msg in history:
            role = "user" if msg.role == "user" else "assistant"
            messages.append({"role": role, "content": msg.message_content})
            
        messages.append({"role": "user", "content": user_message})

        # By user request, we must use mistral-large-latest
        response = await client.chat.stream_async(
            model="mistral-large-latest",
            messages=messages,
        )
        
        # Stream response
        full_text = ""
        async for chunk in response:
            if chunk.data.choices[0].delta.content is not None:
                full_text += chunk.data.choices[0].delta.content
                
        return full_text

    except Exception as e:
        logger.error(f"Error calling Mistral API: {e}")
        raise e
