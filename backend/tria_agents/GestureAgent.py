# backend/tria_agents/GestureAgent.py
"""
GestureAgent - агент для обработки жестов пользователя.

Этот агент предсказывает текущие жесты пользователя для вызова сохраненных жестов и голограмм из списков,
регулирует параметры AVAgent на основе предсказаний, использует маленькую нейросеть на TensorFlow.js для предсказаний,
интегрирует методы для взаимодействия с Orchestrator (получение данных от камеры, отправка команд на AVAgent и списки).
Использует асинхронные методы и документирован на русском языке.
"""

# Removed asyncpg
import logging
import asyncio
import subprocess
import json
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

class GestureAgent:
    """
    Класс GestureAgent для обработки и предсказания жестов.
    """

    def __init__(self, db: Any, av_agent=None, orchestrator=None):
        self.db = db
        self.av_agent = av_agent
        self.orchestrator = orchestrator
        logger.info("GestureAgent инициализирован.")

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
        
        # Регулировать параметры AVAgent
        await self._adjust_av_agent(predicted_gesture)
        
        intent_vector = {
            "type": raw_gesture_data.get("intent", "unknown"),
            "intensity": raw_gesture_data.get("intensity", 0.5),
            "target_context": raw_gesture_data.get("context", {}),
            "predicted_gesture": predicted_gesture
        }
        logger.info(f"GestureAgent: Анализированы данные, вектор намерения: {intent_vector}")
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
                ['node', 'backend/tria_agents/tfjs_adapter.js', json.dumps(gesture_data)],
                {'capture_output': True, 'text': True}
            )
            if result.returncode != 0:
                logger.warning(f"TFJS Agent failed to start (exit code {result.returncode}). Stderr: {result.stderr}")
                logger.warning("WARNING: TFJS Agent failed to start. Continuing without it.")
                return 'unknown'
                
            prediction = json.loads(result.stdout.strip())['prediction']
            gesture_classes = ['wave', 'point', 'fist']
            return gesture_classes[prediction]
        except Exception as e:
            logger.error(f"Ошибка предсказания жеста: {e}")
            logger.warning("WARNING: TFJS Agent failed to start. Continuing without it.")
            return 'unknown'

    async def _invoke_saved_gestures(self, predicted_gesture: str) -> None:
        """
        Вызывает сохраненные жесты или голограммы на основе предсказания.

        :param predicted_gesture: Предсказанный жест.
        """
        # Логика вызова из базы данных или списков
        # Например, запрос к базе для получения связанных голограмм
        # TODO: Implement Astra DB retrieval for saved gestures
        logger.info(f"Checking for saved gestures for prediction: {predicted_gesture}")

    async def _adjust_av_agent(self, predicted_gesture: str) -> None:
        """
        Регулирует параметры AVAgent на основе предсказания.

        :param predicted_gesture: Предсказанный жест.
        """
        if self.av_agent:
            command = {
                "type": "adjust_params",
                "gesture": predicted_gesture,
                "params": {"volume": 0.8 if predicted_gesture == 'wave' else 0.5}  # Пример
            }
            await self.av_agent.receive_command(command)
            logger.info(f"Отправлена команда на AVAgent: {command}")

    async def receive_camera_data(self, camera_data: dict) -> None:
        """
        Получает данные от камеры через Orchestrator.

        :param camera_data: Данные от камеры.
        """
        # Обработать данные камеры, например, передать в анализ
        logger.info(f"Получены данные от камеры: {camera_data}")
        # Можно вызвать analyze_raw_gesture с этими данными

    async def send_command_to_av_agent(self, command: dict) -> None:
        """
        Отправляет команду на AVAgent.

        :param command: Команда для AVAgent.
        """
        if self.av_agent:
            await self.av_agent.receive_command(command)
            logger.info(f"Отправлена команда на AVAgent: {command}")

    async def get_saved_lists(self) -> List[dict]:
        """
        Получает списки сохраненных жестов и голограмм.

        :return: Список сохраненных элементов.
        """
        # TODO: Implement Astra DB retrieval for saved lists
        return []
