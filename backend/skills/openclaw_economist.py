# backend/skills/openclaw_economist.py

"""
OpenClaw Skill: Economist
Роль: Управляет экономикой Obolos, стоимостью compute (Gas) и прогнозированием.
Вызывается Глобальной Триа, когда пользователь спрашивает о балансе или когда нужно рассчитать контракт.
"""

import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

class OpenClawEconomist:
    def __init__(self):
        self.base_gas_fee = 0.000001
        self.current_network_load = 0.45 # Мок текущей нагрузки сети (0.0 - 1.0)

    def analyze_transaction(self, compute_requested: int, user_reputation: float) -> Dict[str, Any]:
        """Расчет стоимости транзакции/жеста в Obolos на основе нагрузки и репутации"""
        
        # Динамическое ценообразование: чем выше нагрузка, тем дороже compute
        load_multiplier = 1.0 + (self.current_network_load ** 2)
        
        # Скидка за высокую репутацию (от 0 до 20%)
        reputation_discount = min(0.2, (user_reputation / 100) * 0.2)
        
        final_gas_price = self.base_gas_fee * load_multiplier * (1.0 - reputation_discount)
        total_cost = compute_requested * final_gas_price

        return {
            "compute_requested": compute_requested,
            "network_load": f"{self.current_network_load * 100:.1f}%",
            "gas_price": final_gas_price,
            "total_cost_obolos": total_cost,
            "recommendation": "Выгодно отправить блок сейчас." if self.current_network_load < 0.6 else "Сеть перегружена, лучше подождать."
        }

    def generate_report(self, user_balance: float) -> str:
        """Сгенерировать финансовый совет для пользователя"""
        if user_balance < 0.0001:
            return "Агент-Экономист: Ваш баланс критически низок. Рекомендую сдать простаивающий GPU в аренду в режиме 'Концерт'."
        elif user_balance > 1.0:
            return "Агент-Экономист: Вы накопили достаточно Obolos для перехода в Earth_0! Желаете разблокировать расширенные пространства?"
        else:
            return "Агент-Экономист: Баланс стабилен. Продолжайте генерировать качественные жесты."

economist_agent = OpenClawEconomist()
