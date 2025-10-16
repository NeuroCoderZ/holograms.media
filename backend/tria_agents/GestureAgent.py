# backend/tria_bots/GestureBot.py
"""
GestureBot - бот для обработки жестов пользователя.

Этот бот предсказывает текущие жесты пользователя для вызова сохраненных жестов и голограмм из списков,
регулирует параметры AVBot на основе предсказаний, использует маленькую нейросеть на TensorFlow.js для предсказаний,
интегрирует методы для взаимодействия с Orchestrator (получение данных от камеры, отправка команд на AVBot и списки).
Использует асинхронные методы и документирован на русском языке.
"""

import asyncpg
import logging
import asyncio
import subprocess
import json
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class GestureBot:
    """
    Класс GestureBot для обработки и предсказания жестов.
    """

    def __init__(self, db_conn: asyncpg.Connection, av_bot=None, orchestrator=None):
        """
        Инициализация GestureBot.

        :param db_conn: Соединение с базой данных.
        :param av_bot: Ссылка на AVBot для регулировки параметров.
        :param orchestrator: Ссылка на Orchestrator для взаимодействия.
        """
        self.db_conn = db_conn
        self.av_bot = av_bot
        self.orchestrator = orchestrator
        logger.info("GestureBot инициализирован.")

    async def analyze_raw_gesture(self, raw_gesture_data: dict) -> dict:
        """
        Анализирует сырые данные жестов и формирует вектор намерения с предсказанием.

        :param raw_gesture_data: Сырые данные жеста.
        :return: Вектор намерения с предсказанием.
        """
        # Предсказать жест с помощью TF.js
        predicted_gesture = await self._predict_gesture(raw_gesture_data)
        
        # Вызвать сохраненные жесты или голограммы на основе предсказания
        await self._invoke_saved_gestures(predicted_gesture)
        
        # Регулировать параметры AVBot
        await self._adjust_av_bot(predicted_gesture)
        
        intent_vector = {
            "type": raw_gesture_data.get("intent", "unknown"),
            "intensity": raw_gesture_data.get("intensity", 0.5),
            "target_context": raw_gesture_data.get("context", {}),
            "predicted_gesture": predicted_gesture
        }
        logger.info(f"GestureBot: Анализированы данные, вектор намерения: {intent_vector}")
        return intent_vector

    async def _predict_gesture(self, gesture_data: dict) -> str:
        """
        Предсказывает класс жеста с помощью TensorFlow.js.

        :param gesture_data: Данные жеста.
        :return: Предсказанный класс жеста.
        """
        try:
            # Вызвать Node.js скрипт для предсказания
            result = await asyncio.get_event_loop().run_in_executor(
                None,
                subprocess.run,
                ['node', 'backend/tria_bots/tfjs_adapter.js', json.dumps(gesture_data)],
                {'capture_output': True, 'text': True}
            )
            prediction = json.loads(result.stdout.strip())['prediction']
            gesture_classes = ['wave', 'point', 'fist']
            return gesture_classes[prediction]
        except Exception as e:
            logger.error(f"Ошибка предсказания жеста: {e}")
            return 'unknown'

    async def _invoke_saved_gestures(self, predicted_gesture: str) -> None:
        """
        Вызывает сохраненные жесты или голограммы на основе предсказания.

        :param predicted_gesture: Предсказанный жест.
        """
        # Логика вызова из базы данных или списков
        # Например, запрос к базе для получения связанных голограмм
        try:
            query = "SELECT * FROM saved_gestures WHERE gesture_type = $1"
            rows = await self.db_conn.fetch(query, predicted_gesture)
            for row in rows:
                logger.info(f"Вызван сохраненный жест: {row['name']}")
                # Дополнительная логика вызова
        except Exception as e:
            logger.error(f"Ошибка вызова сохраненных жестов: {e}")

    async def _adjust_av_bot(self, predicted_gesture: str) -> None:
        """
        Регулирует параметры AVBot на основе предсказания.

        :param predicted_gesture: Предсказанный жест.
        """
        if self.av_bot:
            command = {
                "type": "adjust_params",
                "gesture": predicted_gesture,
                "params": {"volume": 0.8 if predicted_gesture == 'wave' else 0.5}  # Пример
            }
            await self.av_bot.receive_command(command)
            logger.info(f"Отправлена команда на AVBot: {command}")

    async def receive_camera_data(self, camera_data: dict) -> None:
        """
        Получает данные от камеры через Orchestrator.

        :param camera_data: Данные от камеры.
        """
        # Обработать данные камеры, например, передать в анализ
        logger.info(f"Получены данные от камеры: {camera_data}")
        # Можно вызвать analyze_raw_gesture с этими данными

    async def send_command_to_av_bot(self, command: dict) -> None:
        """
        Отправляет команду на AVBot.

        :param command: Команда для AVBot.
        """
        if self.av_bot:
            await self.av_bot.receive_command(command)
            logger.info(f"Отправлена команда на AVBot: {command}")

    async def get_saved_lists(self) -> List[dict]:
        """
        Получает списки сохраненных жестов и голограмм.

        :return: Список сохраненных элементов.
        """
        try:
            query = "SELECT * FROM saved_gestures"
            rows = await self.db_conn.fetch(query)
            return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Ошибка получения списков: {e}")
            return []
