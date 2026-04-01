import logging
from typing import List, Dict, Any, Optional
from mistralai import Mistral
from backend.core.config import settings
from backend.core.models import ChatMessageDB

logger = logging.getLogger(__name__)


async def get_mistral_response(
    prompt: str = "",
    system_instruction: str = "",
    tools: Optional[Any] = None,
    model_id: Optional[str] = None,
    user_message: str = "",
    history: Optional[List[ChatMessageDB]] = None,
) -> str:
    """Gets response from Mistral using the official Python client.
    Compatible signature with get_gemini_response for orchestrator use.
    """
    # Support both calling conventions
    msg = user_message or prompt
    if not settings.MISTRAL_API_KEY:
        logger.warning("MISTRAL_API_KEY is not set. Returning stub response.")
        return f"Триа [Mistral Stub]: ИИ-модуль не подключен."

    try:
        client = Mistral(api_key=settings.MISTRAL_API_KEY)

        model = model_id or "mistral-large-latest"

        MAX_MISTRAL_CHARS = 400000
        if len(system_instruction) > MAX_MISTRAL_CHARS:
            system_instruction = (
                system_instruction[:MAX_MISTRAL_CHARS] + "\n...[TRUNCATED]..."
            )

        messages = (
            [{"role": "system", "content": system_instruction}]
            if system_instruction
            else []
        )

        if history:
            for msg_item in history:
                role = "user" if msg_item.role == "user" else "assistant"
                messages.append({"role": role, "content": msg_item.message_content})

        messages.append({"role": "user", "content": msg})

        response = await client.chat.stream_async(
            model=model,
            messages=messages,
        )

        full_text = ""
        async for chunk in response:
            if chunk.data.choices and chunk.data.choices[0].delta.content is not None:
                full_text += chunk.data.choices[0].delta.content

        return full_text

    except Exception as e:
        logger.error(f"Error calling Mistral API: {e}")
        raise e
