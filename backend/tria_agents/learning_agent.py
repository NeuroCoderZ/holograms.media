# backend/tria_agents/LearningAgent.py
# Mathetes: Агент Обучения (The Disciple)
# Отвечает за прием Soma-блоков, валидацию и сохранение в AstraDB.

import logging
from typing import Dict, Any, Optional
from backend.core.models.learning_log_models import TriaLearningLogModel
from backend.core.crud_operations import create_tria_learning_log_entry
from uuid import uuid4

logger = logging.getLogger(__name__)

class LearningAgent:
    """
    Mathetes (Disciple): Агент, который "учится" у пользователя.
    Принимает Soma-блоки (Pneuma + Sarx), валидирует и сохраняет их.
    """

    def __init__(self, db_session: Any):
        self.db = db_session

    async def process_soma_block(self, user_id: str, soma_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Принимает Soma-блок от клиента (через WebSocket или API).
        
        Args:
            user_id: ID пользователя (NeuroCoderZ).
            soma_data: JSON-структура Soma (pneuma, sarx, ...).
        
        Returns:
            Статус операции и начисленные Obolos (utility score).
        """
        try:
            # 1. Валидация структуры
            pneuma = soma_data.get("pneuma")
            sarx = soma_data.get("sarx")
            
            if not pneuma or not sarx:
                logger.warning(f"Mathetes: Invalid Soma block structure from {user_id}")
                return {"status": "error", "message": "Invalid Soma structure"}

            # 2. Извлечение полезности (Obolos)
            utility_score = sarx.get("utility_score", 0.0)
            
            # 3. Сохранение в AstraDB (через Learning Log, пока нет выделенной таблицы Soma)
            # В Phase 1 мы пишем это в tria_learning_logs как "MNESIS_BLOCK"
            
            log_entry = TriaLearningLogModel(
                log_id=str(uuid4()),
                user_id=user_id,
                session_id=soma_data.get("session_id", "unknown"),
                event_type="MNESIS_SOMA_BLOCK",
                agent_affected_id="enkephalon_v1",
                summary_text=f"Soma Block: {pneuma.get('id')} | Utility: {utility_score:.4f}",
                prompt_text=f"PrevHash: {pneuma.get('prev_block_hash')}", # Meta info
                tria_response_text="Mathetes accepted block.",
                model_used="Hebbian-WASM",
                feedback_score=int(utility_score * 100), # Mapping float to int score
                custom_data=soma_data, # Полный дамп блока
                timestamp=None # Auto-fill
            )
            
            await create_tria_learning_log_entry(self.db, log_entry_create=log_entry)
            
            logger.info(f"Mathetes: Accepted Soma block {pneuma.get('id')} from {user_id}. Utility: {utility_score}")
            
            return {
                "status": "success",
                "block_id": pneuma.get("id"),
                "obolos_reward": utility_score,
                "server_timestamp": log_entry.timestamp
            }

        except Exception as e:
            logger.error(f"Mathetes: Error processing Soma block: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    async def raise_exchange_score(self, user_id: str, target_user_id: str, pattern_quality: float = 0.5) -> Dict[str, Any]:
        """
        Holoca-style: Personal Tria (Source Chain) value grows with exchange.
        When user shares a gesture/pattern with others, their utility_score increases
        proportionally to the quality of the shared pattern.
        
        Args:
            user_id: The user who is sharing (Personal Tria).
            target_user_id: The recipient of the shared pattern.
            pattern_quality: 0.0 to 1.0 (how good is the shared pattern).
        
        Returns:
            Updated utility_score and Obolos earned.
        """
        try:
            # 1. Base raise: Exchange = +0.1 base reward
            base_raise = 0.1
            
            # 2. Quality multiplier (proportional to pattern quality)
            quality_multiplier = 1.0 + (pattern_quality * 2.0)  # Range: 1.0 to 3.0
            
            # 3. Calculate new utility_score raise
            raise_amount = base_raise * quality_multiplier
            
            # 4. Log this exchange event
            log_entry = TriaLearningLogModel(
                log_id=str(uuid4()),
                user_id=user_id,
                session_id=f"exchange_to_{target_user_id}",
                event_type="EXCHANGE_RAISE",
                agent_affected_id="mathetes_v1",
                summary_text=f"Exchange Reward: Shared pattern with {target_user_id}. Quality: {pattern_quality:.2f}",
                prompt_text=f"Pattern Quality: {pattern_quality}",
                tria_response_text=f"Mathetes: Utility increased by {raise_amount:.4f}.",
                model_used="Hebbian-WASM",
                feedback_score=int(raise_amount * 100),
                custom_data={
                    "base_raise": base_raise,
                    "quality_multiplier": quality_multiplier,
                    "pattern_quality": pattern_quality,
                    "target_user": target_user_id
                },
                timestamp=None
            )
            
            await create_tria_learning_log_entry(self.db, log_entry_create=log_entry)
            
            logger.info(f"Mathetes: User {user_id} shared pattern with {target_user_id}. Utility raised by {raise_amount:.4f}")
            
            # 5. Bonus: If target user accepts, extra raise (confirmation of quality)
            return {
                "status": "success",
                "base_raise": base_raise,
                "quality_multiplier": quality_multiplier,
                "total_raise": raise_amount,
                "obolos_reward": raise_amount, # 1 Obolos per 1.0 utility
                "message": f"Personal Tria value increased by {raise_amount:.4f} through exchange."
            }
            
        except Exception as e:
            logger.error(f"Mathetes: Error raising exchange score: {e}", exc_info=True)
            return {"status": "error", "message": str(e)}

    # Legacy method wrapper for compatibility
    async def log_learning_event(self, user_id: str, event_data: Dict[str, Any]):
        return await self.process_soma_block(user_id, event_data)
