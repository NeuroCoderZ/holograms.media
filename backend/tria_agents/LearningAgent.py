# backend/tria_agents/LearningAgent.py
# Removed asyncpg
from typing import Any
import logging

logger = logging.getLogger(__name__)

class LearningAgent:
    def __init__(self, db: Any):
        self.db = db
        logger.info("LearningAgent initialized with Astra DB.")

    async def process_interaction_for_learning(self, learning_data: dict):
        # TODO: Здесь будет логика сохранения "триплета" (Жест -> Контекст -> Результат)
        # в таблицу tria_learning_log для последующего дообучения моделей.
        logger.info(f"LearningAgent: Logged training example for user {learning_data.get('user_id', 'unknown')}")
        # На данном этапе агент просто логгирует получение данных.
        pass
