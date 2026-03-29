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

MODEL_ID = "gemini-3-flash-preview"

@router.websocket("/live")
async def live_audio_stream(websocket: WebSocket):
    await websocket.accept()
    logger.info("Live WebSocket session started.")

    # Добавляем auth (получаем user_id)
    from backend.core.auth import decode_access_token
    user_id = "guest"
    token = websocket.query_params.get("token")
    if token:
        try:
            payload = decode_access_token(token)
            user_id = payload.get("sub", "guest")
        except Exception as e:
            logger.warning(f"[LiveAPI] Auth failed: {e}")

    # Очередь для передачи контекста субагента в Live сессию
    research_queue: asyncio.Queue = asyncio.Queue(maxsize=2)

    client_live = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
    
    config = types.LiveConnectConfig(
        response_modalities=["AUDIO", "TEXT"],
        system_instruction=types.Content(
            parts=[types.Part(text=(
                "Ты Триа — голосовой AI-ассистент holograms.media. "
                "Отвечай кратко и ёмко, на русском языке. "
                "Используй предоставленный исследовательский контекст в ответах."
            ))]
        ),
        input_audio_transcription={},   # Активируем STT для голоса пользователя
        output_audio_transcription={},  # Оставляем STT для ответа Триа
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Charon")
            )
        )
    )

    try:
        async with client_live.aio.live.connect(model=MODEL_ID, config=config) as session:
            
            async def receive_from_frontend():
                try:
                    while True:
                        # Receive JSON from frontend: {"audio": "base64_pcm", "text": "optional"}
                        data = await websocket.receive_json()
                        if "audio" in data:
                            audio_bytes = base64.b64decode(data["audio"])
                            await session.send_realtime_input(
                                audio=types.Blob(
                                    data=audio_bytes,
                                    mime_type="audio/pcm;rate=16000"
                                )
                            )
                        if "text" in data:
                            await session.send_client_content(
                                turns={"role": "user", "parts": [{"text": data["text"]}]},
                                turn_complete=True
                            )
                        if "end_of_turn" in data and data["end_of_turn"]:
                            # Сигнал что пользователь закончил говорить — запускаем субагент
                            utterance = data.get("utterance_text", "")
                            if utterance and research_queue.empty():
                                asyncio.create_task(
                                    _run_subagent_research_task(
                                        utterance, user_id, research_queue
                                    )
                                )
                except WebSocketDisconnect:
                    logger.info("Frontend WebSocket disconnected.")
                except Exception as e:
                    logger.error(f"Error in receive_from_frontend: {e}")

            async def send_to_frontend():
                try:
                    async for message in session.receive():
                        payload = {}
                        if message.server_content:
                            # 1. Обработка транскрипции ВВОДА пользователя
                            if message.server_content.input_transcription:
                                it = message.server_content.input_transcription
                                payload["input_transcript"] = it.text
                                payload["is_final"] = it.is_final

                            # 2. Обработка ОТВЕТА модели
                            model_turn = message.server_content.model_turn
                            if model_turn:
                                for part in model_turn.parts:
                                    if part.inline_data:
                                        payload["audio"] = base64.b64encode(part.inline_data.data).decode('utf-8')
                                        payload["audio_sample_rate"] = 24000
                                    if part.text:
                                        payload["text"] = part.text
                            
                            # 3. Обработка транскрипции ОТВЕТА модели
                            if message.server_content.output_transcription:
                                payload["transcript"] = message.server_content.output_transcription.text
                        
                        if payload:
                            await websocket.send_json(payload)
                except Exception as e:
                    logger.error(f"Error in send_to_frontend: {e}")

            async def inject_subagent_context():
                """
                Реальная инжекция контекста от субагента в Live-сессию.
                Ждёт результата из research_queue и отправляет через send_client_content.
                """
                while True:
                    try:
                        knowledge_pack = await asyncio.wait_for(
                            research_queue.get(), timeout=30.0
                        )
                        logger.info(f"[LiveAPI] Injecting subagent context: {len(knowledge_pack)} chars")
                        context_msg = (
                            f"[СИСТЕМНЫЙ КОНТЕКСТ — используй эти факты в следующем ответе, "
                            f"не зачитывай этот блок пользователю]: {knowledge_pack[:1000]}"
                        )
                        await session.send_client_content(
                            turns={"role": "user", "parts": [{"text": context_msg}]},
                            turn_complete=False
                        )
                    except asyncio.TimeoutError:
                        continue
                    except Exception as e:
                        logger.error(f"[LiveAPI] Context injection error: {e}")
                        await asyncio.sleep(1)

            async def _run_subagent_research_task(utterance: str, user_id: str, result_queue: asyncio.Queue):
                try:
                    research_pack = await orchestrator._get_subagent_context(utterance, user_id)
                    if not result_queue.full():
                        await result_queue.put(research_pack)
                except Exception as e:
                    logger.error(f"[LiveAPI] Subagent task error: {e}")

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
