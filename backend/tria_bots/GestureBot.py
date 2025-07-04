# backend/tria_bots/GestureBot.py
import asyncpg
import logging

logger = logging.getLogger(__name__)

class GestureBot:
    def __init__(self, db_conn: asyncpg.Connection):
        self.db_conn = db_conn
        logger.info("GestureBot initialized (stub).")

    async def analyze_raw_gesture(self, raw_gesture_data: dict) -> dict:
        """
        Анализирует сырые данные жеста и определяет "намерение".
        На данном этапе это простая заглушка, которая извлекает данные из raw_gesture_data.
        """
        intent_type = raw_gesture_data.get("intent", "unknown")
        # В будущем здесь будет ML-модель для анализа landmarks, если они будут приходить в raw_gesture_data
        # или если этот бот будет получать landmarks напрямую.

        # Формируем "вектор намерения" (пока просто словарь) на основе данных,
        # которые приходят от фронтенда (согласно предыдущим шагам, это intent и context).
        intent_vector = {
            "type": intent_type,
            "intensity": raw_gesture_data.get("intensity", 0.5), # Фронтенд пока не шлет intensity, можно добавить
            "target_context": raw_gesture_data.get("context", {}) # context приходит от фронтенда
        }
        logger.info(f"GestureBot: Analyzed raw_gesture_data. Intent vector: {intent_vector}")
        return intent_vector
