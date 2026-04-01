from typing import List, Optional, Dict, Any, Union
import uuid
import logging
import asyncio

from backend.repositories.chat_repository import ChatRepository
from backend.core.models import (
    UserChatSessionDB,
    UserChatSessionCreate,
    ChatMessageDB,
    ChatMessageCreate,
    ChatMessagePublic,
    ChatSessionWithHistory,
    UserInDB,
)
from backend.core.config import settings
from backend.llm.mistral_llm import get_mistral_response
from backend.llm.gemini_llm import get_gemini_response
from backend.llm.openclaw_llm import get_openclaw_response  # ADDED
from backend.skills.openclaw_patrol import patrol_agent
from backend.skills.openclaw_economist import economist_agent
from backend.tria_agents.tria_rag_service import tria_rag

from backend.tria_agents.tria_orchestrator import orchestrator
import json

logger = logging.getLogger(__name__)


def _build_conversation_context(history: List[ChatMessageDB], limit: int = 8) -> str:
    relevant_messages = history[-limit:] if history else []
    lines = []
    for message in relevant_messages:
        role = getattr(message, "role", "unknown")
        content = (getattr(message, "message_content", "") or "").strip()
        if not content:
            continue
        lines.append(f"{role}: {content[:1200]}")
    return "\n".join(lines)


# Основная функция интеграции: теперь делегируем всё Оркестратору (Supervisor Agent)
async def get_llm_response(
    user_message: str,
    history: List[ChatMessageDB],
    selected_model: Optional[str] = None,
    user_email: str = "",
    user_id: str = "guest",
) -> str:
    # Определяем стек моделей
    use_mistral = selected_model and "mistral" in selected_model.lower()
    model_stack = "mistral" if use_mistral else "gemini"

    # Mistral — через Orchestrator (с subagent mistral-small-latest)
    # Gemini — через Orchestrator (с subagent gemini-3.1-flash-lite-preview)
    # Оба стека используют Darwin Critic с двумя кандидатами
    logger.info(f"LLM: Using {model_stack} stack ({selected_model})")

    conversation_context = _build_conversation_context(history)

    response_text = await orchestrator.process_user_prompt(
        prompt=user_message,
        history=[{"role": m.role, "content": m.message_content} for m in history[-10:]],
        user_email=user_email,
        user_id=user_id,
        context=f"Selected model: {selected_model}, stack: {model_stack}",
    )

    model_label = "Mistral Large 3" if use_mistral else "Gemini 3 Flash"
    return f"[{model_label}] {response_text}"


class ChatService:
    def __init__(self, db: Any):
        self.repo = ChatRepository(db)

    async def create_new_chat_session(
        self, user_id: str, session_title: Optional[str] = None
    ) -> Optional[UserChatSessionDB]:
        """Renamed session_in to session_title for directness, matching my planned version."""
        if not session_title:
            session_title = f"Chat Session - {uuid.uuid4().hex[:8]}"
        session_in_create = UserChatSessionCreate(session_title=session_title)
        logger.info(
            f"Service: Creating chat session for user {user_id} with title '{session_title}'."
        )
        created_session = await self.repo.create_chat_session(
            user_id=user_id, session_in=session_in_create
        )
        if created_session:
            logger.info(
                f"Service: Chat session {created_session.id} created for user {user_id}."
            )
        else:
            logger.error(f"Service: Failed to create chat session for user {user_id}.")
        return created_session

    async def list_user_chat_sessions(
        self, user_id: str, skip: int = 0, limit: int = 100
    ) -> List[UserChatSessionDB]:
        logger.info(
            f"Service: Listing chat sessions for user {user_id} (skip={skip}, limit={limit})."
        )
        return await self.repo.get_chat_sessions_by_user_id(
            user_id=user_id, skip=skip, limit=limit
        )

    async def get_specific_user_chat_session(
        self, session_id: int, user_id: str
    ) -> Optional[UserChatSessionDB]:
        logger.info(f"Service: Getting chat session {session_id} for user {user_id}.")
        return await self.repo.get_chat_session_by_id(
            session_id=session_id, user_id=user_id
        )

    async def update_chat_session_title(
        self, session_id: int, user_id: str, title: str
    ) -> Optional[UserChatSessionDB]:
        """
        Updates the title of a chat session, if it belongs to the user.
        """
        logger.info(
            f"Service: Updating title for session {session_id} (user: {user_id}) to '{title}'."
        )
        # Repository method get_chat_session_by_id checks ownership
        session = await self.repo.get_chat_session_by_id(
            session_id=session_id, user_id=user_id
        )
        if not session:
            logger.warning(
                f"Service: Session {session_id} not found or not owned by user {user_id} for title update."
            )
            return None
        return await self.repo.update_chat_session_title(
            session_id=session_id, user_id=user_id, title=title
        )

    async def delete_specific_user_chat_session(
        self, session_id: int, user_id: str
    ) -> bool:
        logger.info(f"Service: Deleting session {session_id} for user {user_id}.")
        deleted = await self.repo.delete_chat_session(
            session_id=session_id, user_id=user_id
        )
        if deleted:
            logger.info(
                f"Service: Session {session_id} deleted successfully for user {user_id}."
            )
        else:
            logger.warning(
                f"Service: Session {session_id} not found or not deleted for user {user_id}."
            )
        return deleted

    async def get_messages_for_session(
        self, session_id: int, user_id: str, skip: int = 0, limit: int = 100
    ) -> List[ChatMessageDB]:  # Changed limit default, added skip
        logger.info(
            f"Service: Getting messages for session {session_id} (user: {user_id}), skip={skip}, limit={limit}."
        )
        # Repository method now checks user_id and supports pagination
        return await self.repo.get_messages_by_session_id(
            session_id=session_id, user_id=user_id, skip=skip, limit=limit
        )

    async def add_message_to_session(
        self,
        session_id: int,
        user: Union[UserInDB, Dict[str, Any]],  # Allow both types
        message_content: str,
        role: str = "user",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Optional[ChatMessagePublic]:
        # Safe extraction of user_id
        if isinstance(user, dict):
            user_id = user.get("user_id") or user.get("id")
        else:
            user_id = getattr(user, "user_id", None) or getattr(user, "id", None)

        if not user_id:
            logger.error(f"Service: Could not extract user_id from user object: {user}")
            return None

        logger.info(
            f"Service: Adding message to session {session_id} (user: {user_id}), role: {role}."
        )

        patrol_report = {}
        # --- OPENCLAW: ВХОДНОЙ ПАТРУЛЬ ---
        if role == "user":
            gesture_dna = metadata.get("gesture_dna") if metadata else None
            patrol_report = patrol_agent.verify_incoming_block(
                user_id, gesture_dna, metadata or {"text_note": message_content}
            )

            if patrol_report.get("status") in ["quarantine", "rejected"]:
                penalty = patrol_report.get("utility_score_penalty", 0.0)
                logger.warning(
                    f"OpenClaw Patrol blocked message from {user_id}. Penalty: {penalty}"
                )
                # Возвращаем системное сообщение о блокировке
                rejection_msg = ChatMessageCreate(
                    user_chat_session_id=session_id,
                    role="system",
                    message_content=f"🛡️ OpenClaw Patrol: Запрос отклонен. Причина: {patrol_report.get('reason')}",
                    metadata={
                        "patrol_report": patrol_report,
                        "utility_score_penalty": penalty,
                        "type": "security_block",
                    },
                )
                saved_rejection = await self.repo.add_message_to_history(
                    message_in=rejection_msg, user_id=user_id
                )
                return (
                    ChatMessagePublic(**saved_rejection.dict())
                    if saved_rejection
                    else None
                )

        # --- OPENCLAW: ЭКОНОМИСТ (Интерцепция) ---
        if role == "user" and any(
            trigger in message_content.lower()
            for trigger in ["оценка", "баланс", "цена", "obolos", "gas", "экономик"]
        ):
            # Мокаем compute_requested из длины сообщения или метаданных
            compute_req = (
                metadata.get("compute_requested", len(message_content) * 10)
                if metadata
                else len(message_content) * 10
            )
            econ_report = economist_agent.analyze_transaction(
                compute_req,
                user_reputation=metadata.get("reputation", 50.0) if metadata else 50.0,
            )

            # Сохраняем сообщение пользователя
            msg_create = ChatMessageCreate(
                user_chat_session_id=session_id,
                role=role,
                message_content=message_content,
                metadata=metadata or {},
            )
            await self.repo.add_message_to_history(
                message_in=msg_create, user_id=user_id
            )

            # Возвращаем ответ от Экономиста напрямую, минуя LLM
            econ_response_text = f"📊 **Отчет Экономиста:**\nСтоимость (Obolos): {econ_report['total_cost_obolos']:.8f}\nЗагрузка сети: {econ_report['network_load']}\nРекомендация: {econ_report['recommendation']}"
            econ_msg = ChatMessageCreate(
                user_chat_session_id=session_id,
                role="assistant",
                message_content=econ_response_text,
                metadata={"agent": "openclaw_economist", "report": econ_report},
            )
            saved_econ = await self.repo.add_message_to_history(
                message_in=econ_msg, user_id=user_id
            )
            return ChatMessagePublic(**saved_econ.dict()) if saved_econ else None

        # Construct ChatMessageCreate before passing to repository
        message_in_create = ChatMessageCreate(
            user_chat_session_id=session_id,
            role=role,
            message_content=message_content,
            metadata=metadata or {},
        )

        # Repository's add_message_to_history now takes ChatMessageCreate and user_id for check
        user_saved_message = await self.repo.add_message_to_history(
            message_in=message_in_create, user_id=user_id
        )

        if not user_saved_message:
            logger.warning(
                f"Service: Failed to save user message to session {session_id} for user {user_id}."
            )
            return None  # Indicates failure to save user message

        # If the message is from the user, then get LLM response
        if role == "user":
            logger.info(
                f"Service: User message saved (ID: {user_saved_message.id}), now getting LLM response."
            )
            history_for_llm = await self.repo.get_messages_by_session_id(
                session_id=session_id, user_id=user_id, limit=20
            )  # Get recent history

            try:
                # Safe extraction of user_email
                if isinstance(user, dict):
                    user_email = user.get("email") or ""
                else:
                    user_email = getattr(user, "email", "")

                # E-1: Прокидываем в оркестратор
                llm_response_content = await get_llm_response(
                    message_content,
                    history_for_llm,
                    user_email=user_email,
                    user_id=user_id,
                )
            except Exception as e:
                logger.error(f"Service: LLM call failed for session {session_id}: {e}")
                # Optionally save a system error message to chat
                error_message_in = ChatMessageCreate(
                    user_chat_session_id=session_id,
                    role="system",
                    message_content=f"Error: Could not get AI response. Details: {str(e)[:100]}...",
                    metadata={"error": True, "source": "llm_service_error"},
                )
                await self.repo.add_message_to_history(
                    message_in=error_message_in, user_id=user_id
                )  # System messages associated with user
                # Depending on desired behavior, could return user_saved_message or raise an error to be caught by router
                return ChatMessagePublic(
                    **user_saved_message.dict()
                )  # Return the user's message if LLM fails

            # --- OPENCLAW: ВЫХОДНОЙ ПАТРУЛЬ ---
            out_patrol_report = patrol_agent.verify_outgoing_response(
                llm_response_content
            )
            final_response_content = out_patrol_report.get(
                "filtered_text", llm_response_content
            )

            assistant_message_in = ChatMessageCreate(
                user_chat_session_id=session_id,
                role="assistant",
                message_content=final_response_content,
                metadata={
                    "llm_model_name": "simulated_tria_v1_stub",
                    "patrol_check": out_patrol_report.get("status"),
                },
            )
            assistant_saved_message = await self.repo.add_message_to_history(
                message_in=assistant_message_in, user_id=user_id
            )  # user_id for audit, though RLS won't apply to assistant messages in same way

            if not assistant_saved_message:
                logger.error(
                    f"Service: User message saved, but failed to save assistant response for session {session_id}."
                )
                # Return user's message as a partial success, or handle error more explicitly
                return ChatMessagePublic(**user_saved_message.dict())

            return ChatMessagePublic(**assistant_saved_message.dict())
        else:
            # If message role is not 'user' (e.g. 'system'), just return the saved message
            return ChatMessagePublic(**user_saved_message.dict())

    async def stream_message_to_session(
        self,
        session_id: int,
        user: Union[UserInDB, Dict[str, Any]],
        message_content: str,
        metadata: Optional[Dict[str, Any]] = None,
    ):
        """
        Streams AI response and saves history to AstraDB upon completion.
        """
        # 1. Identify User
        if isinstance(user, dict):
            user_id = user.get("user_id") or user.get("id")
            user_email = user.get("email") or ""
        else:
            user_id = getattr(user, "user_id", None) or getattr(user, "id", None)
            user_email = getattr(user, "email", "")

        if not user_id:
            yield (
                "data: "
                + json.dumps({"error": "Auth error: User ID not found."})
                + "\n\n"
            )
            return

        # 2. Save User Message
        msg_create = ChatMessageCreate(
            user_chat_session_id=session_id,
            role="user",
            message_content=message_content,
            metadata=metadata or {},
        )
        await self.repo.add_message_to_history(message_in=msg_create, user_id=user_id)

        # 3. Stream and Accumulate
        full_response = ""
        history_for_llm = await self.repo.get_messages_by_session_id(
            session_id=session_id, user_id=user_id, limit=12
        )
        conversation_context = _build_conversation_context(history_for_llm)
        try:
            # Transform history to list of dicts for the orchestrator
            history_list = [
                {"role": m.role, "content": m.message_content} for m in history_for_llm
            ]

            async for token in orchestrator.stream_user_prompt(
                prompt=message_content,
                user_email=user_email,
                history=history_list,
                user_id=user_id,
            ):
                full_response += token
                yield "data: " + json.dumps({"token": token}) + "\n\n"
        except Exception as e:
            logger.error(f"Streaming failed: {e}")
            yield "data: " + json.dumps({"error": str(e)}) + "\n\n"
        finally:
            if not full_response.strip():
                full_response = "Триа не смогла сформировать ответ. Попробуйте переформулировать запрос или повторить отправку."
                yield "data: " + json.dumps({"token": full_response}) + "\n\n"

            # 4. Save Assistant Response to History
            if full_response:
                assistant_msg = ChatMessageCreate(
                    user_chat_session_id=session_id,
                    role="assistant",
                    message_content=full_response,
                    metadata={"llm_model": "gemini-3-flash", "streamed": True},
                )
                await self.repo.add_message_to_history(
                    message_in=assistant_msg, user_id=user_id
                )
                logger.info(f"Stream finished and saved to session {session_id}")
            yield "data: " + json.dumps({"done": True}) + "\n\n"

    async def get_session_with_history(
        self,
        session_id: int,
        user_id: str,
        message_skip: int = 0,
        message_limit: int = 100,
    ) -> Optional[ChatSessionWithHistory]:
        logger.info(
            f"Service: Getting session {session_id} with history for user {user_id}."
        )
        data = await self.repo.get_session_with_history(
            session_id=session_id,
            user_id=user_id,
            message_skip=message_skip,
            message_limit=message_limit,
        )
        if data and data.get("session"):
            return ChatSessionWithHistory(
                id=data["session"].id,
                user_id=data["session"].user_id,
                session_title=data["session"].session_title,
                created_at=data["session"].created_at,
                updated_at=data["session"].updated_at,
                messages=[
                    ChatMessagePublic(**message.dict()) for message in data["messages"]
                ],
            )
        return None
