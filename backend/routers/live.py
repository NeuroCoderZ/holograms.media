# backend/routers/live.py
import asyncio
import base64
import logging
import os
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google import genai
from google.genai import types

from backend.tria_agents.tria_orchestrator import orchestrator

router = APIRouter(prefix="/ws/v1/tria", tags=["Live"])
logger = logging.getLogger(__name__)

# Constants
MODEL_ID = "gemini-2.0-flash-exp"

@router.websocket("/live")
async def live_audio_stream(websocket: WebSocket):
    await websocket.accept()
    logger.info("Live WebSocket session started.")

    client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    
    config = types.LiveConnectConfig(
        model=MODEL_ID,
        system_instruction="Ты Триа. Отвечай голосом. Твои ответы должны быть живыми и эмоциональными.",
        generation_config=types.GenerationConfig(
            response_modalities=["AUDIO", "TEXT"],
            candidate_count=1,
            temperature=0.7
        )
    )

    try:
        async with client.aio.live.connect(model=MODEL_ID, config=config) as session:
            
            async def receive_from_frontend():
                try:
                    while True:
                        # Receive JSON from frontend: {"audio": "base64_pcm", "text": "optional"}
                        data = await websocket.receive_json()
                        if "audio" in data:
                            audio_bytes = base64.b64decode(data["audio"])
                            await session.send(input=audio_bytes, end_of_turn=False)
                        if "text" in data:
                            await session.send(input=data["text"], end_of_turn=True)
                except WebSocketDisconnect:
                    logger.info("Frontend WebSocket disconnected.")
                except Exception as e:
                    logger.error(f"Error in receive_from_frontend: {e}")

            async def send_to_frontend():
                try:
                    async for message in session.receive():
                        payload = {}
                        if message.server_content:
                            model_turn = message.server_content.model_turn
                            if model_turn:
                                for part in model_turn.parts:
                                    if part.inline_data:
                                        # Audio data (PCM 16kHz)
                                        payload["audio"] = base64.b64encode(part.inline_data.data).decode('utf-8')
                                    if part.text:
                                        payload["text"] = part.text
                        
                        if payload:
                            await websocket.send_json(payload)
                except Exception as e:
                    logger.error(f"Error in send_to_frontend: {e}")

            async def inject_subagent_context():
                """
                Background research task. 
                In a real scenario, this would wait for a trigger from the stream 
                then send context to Gemini.
                """
                # This is a placeholder for the autonomous research loop
                await asyncio.sleep(5)
                # await session.send(input="Context from research...", end_of_turn=False)

            # Run all tasks concurrently
            await asyncio.gather(
                receive_from_frontend(),
                send_to_frontend(),
                inject_subagent_context()
            )

    except Exception as e:
        logger.error(f"Live API Session error: {e}")
    finally:
        try:
            await websocket.close()
        except:
            pass
