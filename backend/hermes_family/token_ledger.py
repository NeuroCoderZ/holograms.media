"""
Token Ledger v1 — Zero-Budget Token Control
In-memory tracking + Telegram webhook alerts at 75%/90% thresholds.
Manual LLM swap via .env (no auto-failover — human decision).

A4 Phase
"""

import os
import time
import logging
import httpx
from typing import Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class TokenUsage(BaseModel):
    """Single usage record"""
    model: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    timestamp: float


class TokenLedger:
    """
    In-memory token usage tracker with Telegram alerting.

    Architecture: Ручное переключение LLM → человеческий контроль.
    CrewAI → оркестратор, а не автопилот.
    """

    # Free tier daily limits (approximate)
    DAILY_LIMITS = {
        "mistral-medium-3.5": 33_000_000,      # ~1B tokens/month / 30 days
        "mistral-small-latest": 33_000_000,     # Same pool
        "gemini-embedding-2-preview": 1_500_000, # 1500 req/min * ~2K tokens
        "cloudflare/llama-3.3-70b": 10_000_000, # 10K Neurons/day
    }

    ALERT_THRESHOLDS = [0.75, 0.90, 0.95]

    def __init__(self, telegram_bot_token: str = None, telegram_chat_id: str = None):
        self.telegram_bot_token = telegram_bot_token or os.getenv("TELEGRAM_BOT_TOKEN", "")
        self.telegram_chat_id = telegram_chat_id or os.getenv("TOKEN_LEDGER_CHAT_ID", "")

        # In-memory daily tracking: {model: [TokenUsage, ...]}
        self._daily: dict[str, list[TokenUsage]] = {}
        self._last_reset: float = time.time()
        self._alerted_thresholds: dict[str, set] = {}  # Prevent duplicate alerts

    def _reset_if_new_day(self):
        """Reset daily counters if 24h have passed"""
        if time.time() - self._last_reset > 86400:
            self._daily.clear()
            self._alerted_thresholds.clear()
            self._last_reset = time.time()
            logger.info("TokenLedger: Daily counters reset")

    def record(self, model: str, prompt_tokens: int, completion_tokens: int) -> dict:
        """
        Record token usage and check thresholds.
        Returns usage summary with alert status.
        """
        self._reset_if_new_day()

        usage = TokenUsage(
            model=model,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            timestamp=time.time()
        )

        if model not in self._daily:
            self._daily[model] = []
        self._daily[model].append(usage)

        # Calculate daily total for this model
        daily_total = sum(u.total_tokens for u in self._daily[model])
        limit = self.DAILY_LIMITS.get(model, 33_000_000)
        percentage = daily_total / limit

        # Check alert thresholds
        alert_triggered = False
        if model not in self._alerted_thresholds:
            self._alerted_thresholds[model] = set()

        for threshold in self.ALERT_THRESHOLDS:
            if percentage >= threshold and threshold not in self._alerted_thresholds[model]:
                self._alerted_thresholds[model].add(threshold)
                alert_triggered = True
                logger.warning(
                    f"TokenLedger ALERT: {model} at {percentage:.1%} "
                    f"({daily_total:,}/{limit:,})"
                )
                # Fire Telegram alert (fire-and-forget)
                self._send_telegram_alert(model, daily_total, limit, percentage)

        return {
            "model": model,
            "daily_used": daily_total,
            "daily_limit": limit,
            "percentage": round(percentage, 4),
            "alert": alert_triggered,
        }

    def get_status(self) -> dict:
        """Get current daily usage status for all models"""
        self._reset_if_new_day()

        status = {}
        for model, usages in self._daily.items():
            daily_total = sum(u.total_tokens for u in usages)
            limit = self.DAILY_LIMITS.get(model, 33_000_000)
            status[model] = {
                "daily_used": daily_total,
                "daily_limit": limit,
                "percentage": round(daily_total / limit, 4),
                "requests_today": len(usages),
            }

        return {
            "timestamp": time.time(),
            "models": status,
            "active_llm": os.getenv("HERMES_MAIN_LLM", "mistral-medium-3.5"),
        }

    def _send_telegram_alert(self, model: str, used: int, limit: int, percentage: float):
        """Send Telegram alert (non-blocking, best-effort)"""
        if not self.telegram_bot_token or not self.telegram_chat_id:
            logger.info("TokenLedger: Telegram not configured, skipping alert")
            return

        emoji = "\ud83d\udd34" if percentage >= 0.95 else "\ud83d\udfe1" if percentage >= 0.90 else "\ud83d\udfe2"
        text = (
            f"{emoji} <b>Token Ledger Alert</b>\n\n"
            f"Model: <code>{model}</code>\n"
            f"Used: {used:,} / {limit:,}\n"
            f"Usage: {percentage:.1%}\n\n"
        )

        if percentage >= 0.90:
            text += "\u26a0\ufe0f Рекомендуется переключить LLM через .env"
        else:
            text += "Внимание: приближение к лимиту free-tier"

        try:
            url = f"https://api.telegram.org/bot{self.telegram_bot_token}/sendMessage"
            httpx.post(url, json={
                "chat_id": self.telegram_chat_id,
                "text": text,
                "parse_mode": "HTML"
            }, timeout=5.0)
        except Exception as e:
            logger.error(f"TokenLedger: Failed to send Telegram alert: {e}")


# Singleton instance
_ledger: Optional[TokenLedger] = None


def get_token_ledger() -> TokenLedger:
    """Get or create TokenLedger singleton"""
    global _ledger
    if _ledger is None:
        _ledger = TokenLedger()
    return _ledger
