# backend/skills/openclaw_patrol.py

"""
OpenClaw Skill: Patrol Agent (Патрульный / Шреддер)
Роль: Фильтрует входящие и исходящие пакеты. Проверяет Reputation пользователя, детектирует спам-блоки.
Выступает в роли "Интеллектуального Шлагбаума" на границе Глобальной Триа.
"""

import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class OpenClawPatrol:
    def __init__(self):
        # Базовая эвристика детектирования спама
        self.spam_keywords = ["scam", "spam", "buy obolos", "exploit"]
        
    def verify_incoming_block(self, user_id: str, gesture_dna: List[float], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Входной патруль (Персональная Триа -> Глобальная Триа).
        Проверяет, пропустить ли блок от пользователя.
        """
        logger.info(f"OpenClaw Patrol: Verifying block from user {user_id}")
        
        # 1. Проверка Reputation
        reputation = metadata.get("reputation", 50.0)
        
        # 2. Проверка DNA (mock - тут могла бы быть полноценная нейросеть)
        dna_valid = len(gesture_dna) == 128 if gesture_dna else False
        
        # 3. Фильтрация текста/метаданных
        text_content = metadata.get("text_note", "").lower()
        is_spam = any(bad_word in text_content for bad_word in self.spam_keywords)
        
        if is_spam:
            logger.warning(f"Patrol: Spam detected from {user_id}. Block quarantined.")
            return {"status": "quarantine", "reason": "Spam pattern detected in metadata", "utility_score_penalty": 5.0}
            
        if reputation < 10.0:
            logger.warning(f"Patrol: User {user_id} has critical low reputation.")
            return {"status": "rejected", "reason": "Reputation too low for Global Broadcast", "utility_score_penalty": 0.0}
            
        # --- LOGIC UPDATE: Allow standard chat without gestures ---
        # If there is no gesture DNA provided, we assume it's a standard text chat message.
        # We only strictly enforce DNA validation if DNA was actually claimed to be present or for critical ops.
        if not gesture_dna:
            # It's a text-only message. Pass it through (subject to spam checks above).
            return {
                "status": "passed",
                "reason": "Standard Text Chat (No Gesture DNA required)",
                "utility_score_bonus": 0.01
            }

        # If DNA IS provided, it MUST be valid
        if not dna_valid and reputation < 80.0:
            logger.warning(f"Patrol: Invalid DNA embedding from {user_id} without high trust.")
            return {"status": "rejected", "reason": "Gesture DNA verification failed", "utility_score_penalty": 2.0}

        # Блок признан валидным
        return {
            "status": "passed",
            "reason": "Clear",
            "utility_score_bonus": 0.1 # Небольшая награда за валидный блок
        }

    def verify_outgoing_response(self, response_text: str) -> Dict[str, Any]:
        """
        Выходной патруль (Триа -> Внешний мир/Пользователь).
        Проверяет ответ LLM на безопасность.
        """
        # Тут может быть проверка на PII (Personal Identifiable Information) 
        # или другие политики безопасности
        is_safe = True
        
        # Заглушка фильтрации
        if "PRIVATE_KEY" in response_text or "password=" in response_text:
            is_safe = False
            
        if not is_safe:
            return {"status": "blocked", "filtered_text": "Триа (Патруль): Ответ заблокирован политикой безопасности."}
            
        return {"status": "passed", "filtered_text": response_text}

patrol_agent = OpenClawPatrol()
