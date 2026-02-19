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
import math
# import qrcode # REMOVED: Offloading to frontend
# from PIL import Image # REMOVED

logger = logging.getLogger(__name__)


class AVAgent:
    """
    AVAgent класс для обработки аудиовизуальных данных и генерации визуализаций голограмм.
    Оптимизирован для работы без тяжелых ML-библиотек (Koyeb Efficiency).
    """

    def __init__(self, db_conn):
        """
        Инициализация AVAgent.

        :param db_conn: Соединение с базой данных (asyncpg.Connection).
        """
        self.db_conn = db_conn
        # Нейросеть удалена для экономии памяти. Теперь используем эвристическую адаптацию.
        logger.info("AVAgent инициализирован (режим легкой эвристики).")

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

        # Адаптация через эвристику (замена нейросети)
        adapted_params = self._adapt_with_heuristic(volume_levels + pan_angles)

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
        Преобразует уровни громкости в полутона (ноты). Чистый Python.

        :param volume_levels: Список уровней громкости.
        :return: Список полутонов.
        """
        if not volume_levels:
            return []
            
        max_vol = max(volume_levels)
        if max_vol == 0:
            return [0] * len(volume_levels)
            
        # Замена numpy на списковое включение
        semitones = [int((v / max_vol) * 11) for v in volume_levels]  # 0-11
        return semitones

    def _assign_stable_colors(self, semitones: List[int]) -> List[str]:
        """
        Присваивает стабильные цвета полутоням.
        """
        color_map = {
            0: "#FF0000", 1: "#FF8000", 2: "#FFFF00", 3: "#80FF00",
            4: "#00FF00", 5: "#00FF80", 6: "#00FFFF", 7: "#0080FF",
            8: "#0000FF", 9: "#8000FF", 10: "#FF00FF", 11: "#FF0080"
        }
        return [color_map.get(s, "#FFFFFF") for s in semitones]

    def _generate_qr_code(self, volume_levels: List[float], pan_angles: List[float]) -> str:
        """
        Возвращает данные для генерации QR-кода на фронтенде.
        Оптимизировано: сервер больше не генерирует изображения.
        """
        # Санитизация данных: ограничиваем точность и длину
        vol_str = ",".join([f"{v:.2f}" for v in volume_levels[:64]])
        pan_str = ",".join([f"{p:.2f}" for p in pan_angles[:64]])
        data = f"V:{vol_str};P:{pan_str}"
        return data # Фронтенд превратит это в QR через qrcode.js

    def _adapt_with_heuristic(self, input_data: List[float]) -> List[float]:
        """
        Улучшенная эвристическая адаптация с защитой от насыщения.
        Использует адаптивный коэффициент наклона.
        """
        if not input_data:
            return [0.0] * 10
            
        if len(input_data) < 10:
            input_data += [0.0] * (10 - len(input_data))
        
        # Динамический коэффициент: если среднее значение высокое, делаем сигмоиду положе
        avg_val = sum(map(abs, input_data)) / len(input_data)
        k = 0.5 if avg_val < 10 else (5.0 / avg_val)
        
        def sigmoid(x, k_factor):
            # Защита от переполнения exp
            val = x * k_factor
            if val > 20: return 1.0
            if val < -20: return 0.0
            return 1 / (1 + math.exp(-val))

        adapted = [sigmoid(x, k) for x in input_data[:10]]
        return adapted

    async def receive_command(self, command: Dict[str, Any]) -> Dict[str, Any]:
        """
        Получает команду от Orchestrator.
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
        """
        logger.info(f"AVAgent: Отправка данных визуализации: {data}")
        pass
