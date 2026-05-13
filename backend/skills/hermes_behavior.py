# backend/skills/hermes_behavior.py
# HermesBehavior: Task Agent (Gestures, Cicks, Predictions)
# Implements Hidden Markov Model (HMM) over gesture sequences
# Personal (Local) wins: Tracks user-specific patterns (e.g., "sweep" for navigation)
# Global fallback: Statistical archetypes from Global Tria (AstraDB)

import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class HermesBehavior:
    """
    HermesBehavior: The "eyes" of Personal Tria.
    Tracks gestures, clicks, BPM, and builds a predictive model (Markov Chain).
    Philosophy: Personal (Local) wins - user's own patterns override Global archetypes.
    """
    
    def __init__(self, user_id: str = "guest"):
        # Spam keywords (Personal Tria - user-specific)
        self.spam_keywords = ["spam", "buy obolos", "exploit"]
        
        # Markov Chain state: tracks last 10 gestures to predict next
        self.gesture_history: List[str] = []
        self.max_history = 10
        
        # User-specific preferences (Personal Tria Source Chain)
        # Example: user prefers "sweep" for navigation
        self.user_preferences: Dict[str, str] = {
            "navigation": "sweep",  # Personal wins over Global "swipe"
            "volume": "fist",       # Personal wins over Global "knock"
            "pause": "hold"          # Personal wins over Global "tap"
        }
        
        # Predictive state (what UI element to pre-load)
        self.next_predicted_action: Optional[str] = None
        self.user_id = user_id
        
        logger.info(f"HermesBehavior (Personal Tria): Initialized for user {user_id}")
    
    def verify_incoming_block(self, user_id: str, gesture_dna: List[float], metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Incoming patrol (Personal Tria -> Global Tria conflict resolution).
        Personal wins: If user has specific gesture mapping, use it.
        Global fallback: If no personal mapping, use Global Tria archetype.
        """
        logger.info(f"HermesBehavior: Verifying block from user {user_id}")
        
        # 1. Reputation check (Personal Tria state)
        reputation = metadata.get("reputation", 50.0)
        
        # 2. DNA validation (mock - would be real WASM validation)
        dna_valid = len(gesture_dna) == 128 if gesture_dna else False
        
        # 3. Spam filtering (Personal Tria - user-specific keywords)
        text_content = metadata.get("text_note", "").lower()
        is_spam = any(bad_word in text_content for bad_word in self.spam_keywords)
        
        if is_spam:
            logger.warning(f"HermesBehavior: Spam detected from {user_id}. Quarantined.")
            return {
                "status": "quarantine", 
                "reason": "Spam pattern detected in metadata",
                "utility_score_penalty": 5.0  # Personal Tria penalty
            }
        
        if reputation < 10.0:
            logger.warning(f"HermesBehavior: User {user_id} has critical low reputation.")
            return {
                "status": "rejected", 
                "reason": "Reputation too low for Global Broadcast",
                "utility_score_penalty": 10.0
            }
        
        # --- LOGIC UPDATE: If DNA is NOT provided, assume standard text chat ---
        if not gesture_dna:
            # It's a text-only message. Pass it through (subject to spam checks above).
            return {
                "status": "passed",
                "reason": "Standard Text Chat (No Gesture DNA required)",
                "utility_score_bonus": 0.01  # Small bonus for normal chat
            }
        
        # If DNA IS provided, it MUST be valid
        if not dna_valid and reputation < 80.0:
            logger.warning(f"HermesBehavior: Invalid DNA embedding from {user_id} without high trust.")
            return {
                "status": "rejected", 
                "reason": "Gesture DNA verification failed",
                "utility_score_penalty": 2.0,
                "predicted_action": self.next_predicted_action  # Still provide prediction
            }
        
        # --- MARKOV CHAIN: Update and Predict ---
        self._update_gesture_history(metadata.get("gesture_name", "unknown"))
        self._predict_next_action()
        
        # Valid block
        logger.info(f"HermesBehavior: Block accepted. Next predicted: {self.next_predicted_action}")
        return {
            "status": "passed",
            "reason": "Clear",
            "utility_score_bonus": 0.1,  # Bonus for valid block
            "predicted_action": self.next_predicted_action,
            "user_preference_navigation": self.user_preferences.get("navigation")
        }
    
    def _update_gesture_history(self, gesture_name: str):
        """Updates the Markov Chain state with latest gesture."""
        if gesture_name != "unknown":
            self.gesture_history.append(gesture_name)
            if len(self.gesture_history) > self.max_history:
                self.gesture_history.pop(0)
            logger.debug(f"HermesBehavior: Gesture history updated: {self.gesture_history[-3:]}")
    
    def _predict_next_action(self):
        """
        Builds Hidden Markov Model (HMM) over gesture sequences.
        Predicts next UI element to pre-load (before gesture completes).
        Personal wins: Uses user's own history.
        """
        if len(self.gesture_history) < 2:
            self.next_predicted_action = "UI:home"  # Default start
            return
        
        # Simple Markov Chain: What usually follows the last gesture?
        # In real implementation, this would be a proper HMM
        gesture_counts = {}
        for i in range(len(self.gesture_history) - 1):
            current = self.gesture_history[i]
            next_g = self.gesture_history[i + 1]
            if current not in gesture_counts:
                gesture_counts[current] = {}
            gesture_counts[current][next_g] = gesture_counts[current].get(next_g, 0) + 1
        
        last_gesture = self.gesture_history[-1]
        if last_gesture in gesture_counts:
            # Find most likely next gesture
            next_options = gesture_counts[last_gesture]
            predicted_gesture = max(next_options, key=next_options.get)
            
            # Map gesture to UI action (Personal Tria mapping)
            ui_mapping = {
                "sweep": "UI:navigate_forward",     # Personal: sweep = navigation
                "fist": "UI:volume_up",            # Personal: fist = volume
                "hold": "UI:pause_media",            # Personal: hold = pause
                "tap": "UI:select_item",
                "swipe": "UI:navigate_back"        # Global fallback: swipe
            }
            
            self.next_predicted_action = ui_mapping.get(predicted_gesture, "UI:unknown")
            logger.info(f"HermesBehavior: Predicted next action: {self.next_predicted_action}")
        else:
            self.next_predicted_action = "UI:home"
    
    def verify_outgoing_response(self, response_text: str) -> Dict[str, Any]:
        """
        Outgoing patrol (Tria -> External World/User).
        Checks LLM response for safety/privacy.
        """
        # PII (Personal Identifiable Information) check
        is_safe = True
        
        # Censorship filter
        if "PRIVATE_KEY" in response_text or "password=" in response_text:
            is_safe = False
        
        if not is_safe:
            return {
                "status": "blocked", 
                "filtered_text": "Tria (Patrol): Answer blocked by safety policy."
            }
        
        return {"status": "passed", "filtered_text": response_text}

# Initialize the agent
behavior_agent = HermesBehavior()
