import logging
import json
from typing import List, Dict, Any, Optional
import httpx
from backend.core.config import settings
from backend.core.models import ChatMessageDB

logger = logging.getLogger(__name__)

MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions"


async def get_mistral_response(
    prompt: str = "",
    system_instruction: str = "",
    tools: Optional[Any] = None,
    model_id: Optional[str] = None,
    user_message: str = "",
    history: Optional[List[ChatMessageDB]] = None,
) -> str:
    """Gets response from Mistral via direct HTTP API (SDK-independent)."""
    if not settings.MISTRAL_API_KEY:
        logger.warning("MISTRAL_API_KEY is not set. Returning stub response.")
        return f"Триа [Mistral Stub]: ИИ-модуль не подключен."

    # Support both calling conventions
    msg = user_message or prompt

    try:
        model = model_id or "mistral-large-latest"

        MAX_CHARS = 400000
        sys_instr = (
            system_instruction[:MAX_CHARS]
            if len(system_instruction) > MAX_CHARS
            else system_instruction
        )

        messages = []
        if sys_instr:
            messages.append({"role": "system", "content": sys_instr})

        if history:
            for msg_item in history:
                role = "user" if msg_item.role == "user" else "assistant"
                messages.append({"role": role, "content": msg_item.message_content})

        messages.append({"role": "user", "content": msg})

        # Direct HTTP streaming — no SDK dependency
        headers = {
            "Authorization": f"Bearer {settings.MISTRAL_API_KEY}",
            "Content-Type": "application/json",
            "Accept": "text/event-stream",
        }

        payload = {
            "model": model,
            "messages": messages,
            "stream": True,
        }

        full_text = ""
        async with httpx.AsyncClient(timeout=120.0) as client:
            async with client.stream(
                "POST", MISTRAL_API_URL, headers=headers, json=payload
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data_str = line[6:]
                        if data_str.strip() == "[DONE]":
                            break
                        try:
                            data = json.loads(data_str)
                            delta = data.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content")
                            if content:
                                full_text += content
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue

        return full_text

    except Exception as e:
        logger.error(f"Error calling Mistral API: {e}")
        raise e
