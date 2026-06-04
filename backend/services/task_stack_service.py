import logging
from typing import List, Dict
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class TaskStackService:
    """
    Manages the "Task Stack" for Триа (Triple-A).
    Analyzes gap between Source code and User intentions to generate 
    monetized tasks for the founder/developer.
    """
    def __init__(self):
        self.tasks = []

    async def analyze_gap_and_generate_tasks(self, source_quants: List[Dict], user_snapshots: List[Dict]) -> List[Dict]:
        """
        Hyperbrain Evolution Logic (v0.20.125):
        Analyzes the "Evolutionary Pressure" from 120Hz ticks.
        Differentiates between Macro (>1s) and Micro (<1s) events.
        """
        new_tasks = []
        
        for snapshot in user_snapshots:
            data_frames = snapshot.get("data", [])
            session_duration = len(data_frames) / 120.0  # seconds
            
            # Value Titration: Extracting "Evolutionary Pressure"
            # We look for high-frequency micro-events (<0.2s) that show high intent
            micro_intent_score = 0
            macro_gestures_count = 0
            
            pinch_streak = 0
            for frame in data_frames:
                gestures = frame.get("gestures", {})
                is_pincing = (gestures.get("left", {}).get("isPinching") or 
                              gestures.get("right", {}).get("isPinching"))
                
                if is_pincing:
                    pinch_streak += 1
                else:
                    # If we had a short burst (Micro-event < 0.5s)
                    if 5 < pinch_streak < 60:
                        micro_intent_score += 1
                    # If we had a sustained gesture (Macro-event > 1s)
                    elif pinch_streak >= 120:
                        macro_gestures_count += 1
                    pinch_streak = 0

            # Logic: If many micro-intents occur, it signals a need for higher precision
            # in BasilaQ-256 (Hyperbrain Sync requirement)
            if micro_intent_score > 5:
                task_id = str(uuid.uuid4())
                task = {
                    "id": task_id,
                    "title": "Hyperbrain Sync: High-Frequency Micro-Intent Optimization",
                    "description": f"Detected {micro_intent_score} micro-events (<0.5s) in a {session_duration:.1f}s session. "
                                   "Optimize BasilaQ-256 high-frequency response (G10/25kHz) for rapid intent switching.",
                    "price": 350.0,
                    "status": "available",
                    "created_at": datetime.utcnow().isoformat(),
                    "priority": "critical",
                    "layer": "limbic" # Layer 0: Reactive
                }
                new_tasks.append(task)
            
            if macro_gestures_count > 0:
                task_id = str(uuid.uuid4())
                task = {
                    "id": task_id,
                    "title": "Macro-Gesture Consolidation",
                    "description": f"Detected {macro_gestures_count} sustained gestures (>1s). "
                                   "Synchronize long-term memory (HoloChain) with these emerging behavioral patterns.",
                    "price": 150.0,
                    "status": "available",
                    "created_at": datetime.utcnow().isoformat(),
                    "priority": "medium",
                    "layer": "cognitive" # Layer 1: Conscious
                }
                new_tasks.append(task)

        self.tasks.extend(new_tasks)
        return new_tasks

    def get_available_tasks(self) -> List[Dict]:
        """Returns all currently available tasks in the stack."""
        return [t for t in self.tasks if t["status"] == "available"]

    def claim_task(self, task_id: str, user_id: str) -> bool:
        """Claims a task for a specific developer."""
        for task in self.tasks:
            if task["id"] == task_id and task["status"] == "available":
                task["status"] = "in_progress"
                task["claimed_by"] = user_id
                return True
        return False

# Global instance
task_stack = TaskStackService()
