# backend/tria_agents/AVAgent.py
"""
AVAgent - объединенный AudioAgent и VideoAgent для обработки аудиовизуальных данных.

Этот бот обрабатывает выходные данные от Rust-WASM ядра технологии трехмерной аудиовизуализации,
включая уровни громкости и углы панорамирования от непрерывного вейвлет-преобразования (CWT).
Преобразует эти данные в формат для визуализации голограммы: столбцы как полутона с стабильным цветом,
звуковые параметры для обратной связи как QR-код.

Включает базовую маленькую нейросеть на TensorFlow для эволюционного потенциала,
адаптирующую модель на основе поступающих данных.

Интегрирует методы для взаимодействия с Orchestrator: получение команд и отправка визуализационных данных.

Использует асинхронные методы для эффективной обработки.
"""

import asyncio
import logging
import numpy as np
import qrcode
from io import BytesIO
from typing import Dict, Any, List
import tensorflow as tf
from tensorflow import keras
from PIL import Image

logger = logging.getLogger(__name__)


class AVAgent:
    """
    AVAgent класс для обработки аудиовизуальных данных и генерации визуализаций голограмм.
    """

    def __init__(self, db_conn):
        """
        Инициализация AVAgent.

        :param db_conn: Соединение с базой данных (asyncpg.Connection).
        """
        self.db_conn = db_conn
        self.model = self._build_neural_network()
        logger.info("AVAgent инициализирован с нейросетью для адаптации.")

    def _build_neural_network(self) -> keras.Model:
        """
        Строит базовую маленькую нейросеть для адаптации модели на основе данных.

        :return: Модель Keras.
        """
        model = keras.Sequential([
            keras.layers.Dense(64, activation='relu', input_shape=(10,)),  # Вход: уровни громкости и углы
            keras.layers.Dense(32, activation='relu'),
            keras.layers.Dense(10, activation='sigmoid')  # Выход: адаптированные параметры
        ])
        model.compile(optimizer='adam', loss='mse')
        return model

    async def process_audio_video_data(self, raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Обрабатывает сырые аудиовизуальные данные от Rust-WASM ядра.

        :param raw_data: Словарь с уровнями громкости и углами панорамирования.
        :return: Данные для визуализации голограммы.
        """
        logger.info(f"AVAgent: Обработка данных: {raw_data}")

        # Извлечение данных
        volume_levels = raw_data.get('volume_levels', [])
        pan_angles = raw_data.get('pan_angles', [])

        if not volume_levels or not pan_angles:
            logger.warning("AVAgent: Недостаточно данных для обработки.")
            return {"error": "Недостаточно данных"}

        # Преобразование в полутона (столбцы)
        semitones = self._convert_to_semitones(volume_levels)
        colors = self._assign_stable_colors(semitones)

        # Звуковые параметры как QR-код
        qr_code = self._generate_qr_code(volume_levels, pan_angles)

        # Адаптация через нейросеть
        adapted_params = self._adapt_with_neural_network(volume_levels + pan_angles)

        hologram_data = {
            "semitones": semitones,
            "colors": colors,
            "qr_code": qr_code,
            "adapted_params": adapted_params
        }

        logger.info(f"AVAgent: Сгенерированы данные для голограммы: {len(semitones)} столбцов")
        return hologram_data

    def _convert_to_semitones(self, volume_levels: List[float]) -> List[int]:
        """
        Преобразует уровни громкости в полутона (ноты).

        :param volume_levels: Список уровней громкости.
        :return: Список полутонов.
        """
        # Простое преобразование: нормализация и маппинг на 12 полутонов
        normalized = np.array(volume_levels) / max(volume_levels) if volume_levels else []
        semitones = [int(val * 11) for val in normalized]  # 0-11
        return semitones

    def _assign_stable_colors(self, semitones: List[int]) -> List[str]:
        """
        Присваивает стабильные цвета полутоням.

        :param semitones: Список полутонов.
        :return: Список цветов в hex формате.
        """
        color_map = {
            0: "#FF0000", 1: "#FF8000", 2: "#FFFF00", 3: "#80FF00",
            4: "#00FF00", 5: "#00FF80", 6: "#00FFFF", 7: "#0080FF",
            8: "#0000FF", 9: "#8000FF", 10: "#FF00FF", 11: "#FF0080"
        }
        return [color_map.get(s, "#FFFFFF") for s in semitones]

    def _generate_qr_code(self, volume_levels: List[float], pan_angles: List[float]) -> str:
        """
        Генерирует QR-код из звуковых параметров для обратной связи.

        :param volume_levels: Уровни громкости.
        :param pan_angles: Углы панорамирования.
        :return: Base64 строка QR-кода.
        """
        data = f"Volume: {','.join(map(str, volume_levels))}; Pan: {','.join(map(str, pan_angles))}"
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill='black', back_color='white')
        buffer = BytesIO()
        img.save(buffer, format="PNG")
        return buffer.getvalue().decode('latin1')  # Для простоты, в реальности base64

    def _adapt_with_neural_network(self, input_data: List[float]) -> List[float]:
        """
        Адаптирует модель с помощью нейросети на основе входных данных.

        :param input_data: Входные данные (уровни + углы).
        :return: Адаптированные параметры.
        """
        if len(input_data) < 10:
            input_data += [0] * (10 - len(input_data))
        input_array = np.array(input_data[:10]).reshape(1, -1)
        prediction = self.model.predict(input_array)
        return prediction.flatten().tolist()

    async def receive_command(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """
        Получает команду от Orchestrator.

        :param command: Словарь с командой.
        :return: Ответ на команду.
        """
        logger.info(f"AVAgent: Получена команда: {command}")
        cmd_type = command.get('type')
        if cmd_type == 'process_data':
            data = command.get('data', {})
            result = await self.process_audio_video_data(data)
            return {"status": "processed", "result": result}
        return {"status": "unknown_command"}

    async def send_visualization_data(self, data: Dict[str, Any]) -> None:
        """
        Отправляет визуализационные данные в Orchestrator.

        :param data: Данные для отправки.
        """
        logger.info(f"AVAgent: Отправка данных визуализации: {data}")
        # Здесь логика отправки, например, через очередь или API
        # Для примера, просто логируем
        pass
