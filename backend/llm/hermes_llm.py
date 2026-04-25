# backend/llm/hermes_llm.py
import logging
import httpx
from typing import List, Optional, Dict, Any
from backend.core.config import settings
from backend.core.models import ChatMessageDB

logger = logging.getLogger(__name__)

# Hermes Agent OpenAI-compatible API
# Documentation: https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server
# Default port: 8642
HERMES_BASE_URL = getattr(settings, 'HERMES_BASE_URL', 'http://127.0.0.1:8642/v1')

async def get_hermes_response(
    prompt: str,
    model: str = "mistral-small-latest",
    history: List[ChatMessageDB] = None,
    system_instruction: str = "Ты Триа, персональный ИИ-ассистент голографической системы."
) -> str:
    """Gets response using Hermes Agent OpenAI-compatible API."""
    api_key = getattr(settings, 'HERMES_API_KEY', None)
    if not api_key:
        return "[Hermes Error] HERMES_API_KEY not set"

    messages = [{"role": "system", "content": system_instruction}]
    
    if history:
        for msg in history[-10:]:
            role = "user" if msg.role == "user" else "assistant"
            messages.append({"role": role, "content": msg.message_content})
    
    messages.append({"role": "user", "content": prompt})

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{HERMES_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.7,
                    "stream": False
                }
            )
            
            if response.status_code != 200:
                logger.error(f"Hermes API error: {response.status_code} - {response.text}")
                return f"[Hermes Error] API returned {response.status_code}"
            
            data = response.json()
            return data["choices"][0]["message"]["content"]
            
    except Exception as e:
        logger.error(f"Hermes request failed: {e}")
        return f"[Hermes Error] {str(e)}"
