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
        Легковесный эвристический классификатор жестов на основе MediaPipe landmarks.
        Заменяет TensorFlow.js, который был удалён для стабильности деплоя.
        
        Поддерживаемые жесты: wave, pinch, point, open_palm, unknown.
        """
        import math
        
        landmarks = gesture_data.get("landmarks", [])
        if not landmarks or len(landmarks) < 21:
            return "unknown"
        
        try:
            # Безопасное извлечение координат ключевых точек
            def get_point(idx):
                if idx < len(landmarks) and isinstance(landmarks[idx], dict):
                    return landmarks[idx].get("x", 0), landmarks[idx].get("y", 0)
                return 0, 0
            
            def distance(p1, p2):
                return math.sqrt((p1[0] - p2[0])**2 + (p1[1] - p2[1])**2)
            
            wrist = get_point(0)
            thumb_tip = get_point(4)
            index_tip = get_point(8)
            middle_tip = get_point(12)
            ring_tip = get_point(16)
            pinky_tip = get_point(20)
            index_mcp = get_point(5)
            
            # Эвристика: wave = движение запястья по X (высокая скорость)
            velocity_x = gesture_data.get("velocity_x", 0)
            if abs(velocity_x) > 0.5:
                return "wave"
            
            # Эвристика: pinch = расстояние thumb-index < порога
            pinch_dist = distance(thumb_tip, index_tip)
            if pinch_dist < 0.08:
                return "pinch"
            
            # Эвристика: point = index выше MCP, остальные пальцы загнуты
            index_extended = index_tip[1] < index_mcp[1]  # Y инвертирован в screen space
            others_folded = all(
                get_point(tip)[1] > get_point(mcp)[1] 
                for tip, mcp in [(12, 9), (16, 13), (20, 17)]
            )
            if index_extended and others_folded:
                return "point"
            
            # Эвристика: open_palm = все пальцы раскрыты
            all_extended = all(
                get_point(tip)[1] < get_point(mcp)[1] 
                for tip, mcp in [(8, 5), (12, 9), (16, 13), (20, 17)]
            )
            if all_extended:
                return "open_palm"
            
        except (IndexError, TypeError, KeyError) as e:
            logger.warning(f"GestureAgent: Error in heuristic classification: {e}")
        
        return "unknown"


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
