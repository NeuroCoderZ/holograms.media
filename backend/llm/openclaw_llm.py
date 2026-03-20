# backend/llm/openclaw_llm.py
import logging
import httpx
from typing import List, Optional, Dict, Any
from backend.core.config import settings
from backend.core.models import ChatMessageDB

logger = logging.getLogger(__name__)

# OpenClaw usually provides an OpenAI-compatible API
# Documentation: https://openclaw.ai/
# Running locally in the same container via start.sh
OPENCLAW_BASE_URL = "http://127.0.0.1:18789/v1"

async def get_openclaw_response(
    prompt: str,
    model: str = "gemini-3.1-flash-lite-preview",
    history: List[ChatMessageDB] = None,
    system_instruction: str = "Ты Триа, персональный ИИ-ассистент."
) -> str:
    """Gets response using OpenClaw OpenAI-compatible API."""
    if not settings.OPENCLAW_GATEWAY_TOKEN:
        return "[OpenClaw Error] OPENCLAW_GATEWAY_TOKEN not set"

    messages = [{"role": "system", "content": system_instruction}]
    
    if history:
        for msg in history[-10:]:
            role = "user" if msg.role == "user" else "assistant"
            messages.append({"role": role, "content": msg.message_content})
            
    messages.append({"role": "user", "content": prompt})

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{OPENCLAW_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENCLAW_GATEWAY_TOKEN}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.7
                }
            )
            
            if response.status_code != 200:
                logger.error(f"OpenClaw API error: {response.status_code} - {response.text}")
                return f"[OpenClaw Error] API returned {response.status_code}"
                
            data = response.json()
            return data["choices"][0]["message"]["content"]

    except Exception as e:
        logger.error(f"OpenClaw request failed: {e}")
        return f"[OpenClaw Error] {str(e)}"
