import logging
from typing import Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class AttentionEconomyService:
    """
    Attention Economy: Rewards users for providing high-quality training data (HoloQuants).
    Tokens (AT) are used to prioritize future gesture recognition and system evolution.
    """
    def __init__(self):
        # In production, this would be a database table (user_id -> balance)
        self.wallets = {}

    def calculate_reward(self, snapshot_data: Dict) -> float:
        """
        Calculates the Attention Token reward for a given snapshot.
        Multiplier based on:
        - Frame count (Volume)
        - Gesture presence (Interaction Quality)
        """
        data = snapshot_data.get("data", [])
        frame_count = len(data)
        
        # Base reward: 1 AT per 120 frames (approx 1 second of data)
        base_reward = frame_count / 120.0
        
        # Multiplier for gestures (Proof of Effort)
        gesture_count = 0
        for frame in data:
            if frame.get("gestures") and (frame["gestures"].get("left") or frame["gestures"].get("right")):
                gesture_count += 1
        
        gesture_bonus = (gesture_count / frame_count) * 2.0 if frame_count > 0 else 0
        
        total_reward = base_reward * (1.0 + gesture_bonus)
        return round(total_reward, 2)

    def add_reward(self, user_email: str, amount: float) -> float:
        """Adds tokens to the user's wallet."""
        if user_email not in self.wallets:
            self.wallets[user_email] = 0.0
        
        self.wallets[user_email] += amount
        logger.info(f"[AttentionEconomy] Rewarded {user_email} with {amount} AT. New balance: {self.wallets[user_email]}")
        return self.wallets[user_email]

    def get_balance(self, user_email: str) -> float:
        """Returns the current balance for a user."""
        return self.wallets.get(user_email, 0.0)

# Global instance
attention_tokens = AttentionEconomyService()
