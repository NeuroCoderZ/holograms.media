# backend/tria_bots/tria_context.py
from collections import deque
from typing import Dict, Any, List, Optional
import logging
import hashlib
import os

logger = logging.getLogger(__name__)

class SessionContext:
    def __init__(self):
        self.conversation_history = deque(maxlen=10) # Last N messages
        self.active_topics = set()
        self.user_preferences = {}
        self.current_focus = 'general' # e.g., 'frontend', 'backend', 'debug'
        self.last_query_type = 'general'
        self.last_response_sources = []
        logger.info("SessionContext initialized.")

    def add_interaction(self, query: str, response: str, query_type: str, sources: List[Dict[str, Any]]):
        self.conversation_history.append({'query': query, 'response': response, 'type': query_type})
        self.last_query_type = query_type
        self.last_response_sources = sources
        # TODO: Implement extraction of active topics and updating user_preferences
        logger.debug(f"Added interaction to session history. Current length: {len(self.conversation_history)}")

class ProjectStateTracker:
    def __init__(self, codebase_root: str = "/home/neurocoderz/holograms.media/"):
        self.codebase_root = codebase_root
        self.last_code_hash = self._calculate_codebase_hash() # Initial hash
        self.last_kb_update_timestamp = None
        self.significant_changes_pending = False
        logger.info(f"ProjectStateTracker initialized for codebase: {self.codebase_root}")

    def _calculate_codebase_hash(self) -> str:
        # Simple hash of file contents for change detection
        hasher = hashlib.sha256()
        for root, _, files in os.walk(self.codebase_root):
            for file_name in sorted(files): # Sort for consistent hash
                file_path = os.path.join(root, file_name)
                if os.path.isfile(file_path) and not file_name.startswith('.') and not "__pycache__" in file_path:
                    try:
                        with open(file_path, 'rb') as f:
                            for chunk in iter(lambda: f.read(4096), b""):
                                hasher.update(chunk)
                    except Exception as e:
                        logger.warning(f"Could not hash file {file_path}: {e}")
        return hasher.hexdigest()

    def check_for_changes(self) -> bool:
        current_hash = self._calculate_codebase_hash()
        if current_hash != self.last_code_hash:
            self.last_code_hash = current_hash
            self.significant_changes_pending = True
            logger.info("ProjectStateTracker: Codebase changes detected.")
            return True
        return False

    def apply_changes(self, changes: List[Dict[str, Any]]):
        # This method would be called by LiveCodeAnalyzer (Phase 4.2)
        # For now, just mark that changes are pending if any are applied
        if changes:
            self.significant_changes_pending = True
            logger.info(f"ProjectStateTracker: Applied {len(changes)} changes. Pending reindex: {self.significant_changes_pending}")

    def should_reindex(self) -> bool:
        # Logic to determine if KB reindexing is needed based on changes
        return self.significant_changes_pending

    def mark_reindexed(self):
        self.significant_changes_pending = False
        self.last_kb_update_timestamp = time.time()
        logger.info("ProjectStateTracker: Knowledge Base reindexed.")

class ContextManager:
    def __init__(self, codebase_root: str = "/home/neurocoderz/holograms.media/"):
        self.session_contexts: Dict[str, SessionContext] = {}
        self.project_state = ProjectStateTracker(codebase_root)
        logger.info("ContextManager initialized.")

    def get_context(self, session_id: str) -> SessionContext:
        if session_id not in self.session_contexts:
            self.session_contexts[session_id] = SessionContext()
            logger.info(f"Created new session context for ID: {session_id}")
        return self.session_contexts[session_id]

    def update_session_context(self, session_id: str, query: str, response: str, query_type: str, sources: List[Dict[str, Any]]):
        session_context = self.get_context(session_id)
        session_context.add_interaction(query, response, query_type, sources)
        logger.info(f"Updated session context for ID: {session_id}")

    def update_project_state(self, changes: List[Dict[str, Any]]):
        self.project_state.apply_changes(changes)
        if self.project_state.should_reindex():
            logger.warning("Project state indicates need for Knowledge Base reindexing!")
            # Here, you would trigger a background task for reindexing the KB

    def get_project_state(self) -> ProjectStateTracker:
        return self.project_state

    def notify_sessions_about_change(self, change: Dict[str, Any]):
        # TODO: Implement logic to notify relevant sessions about codebase changes
        logger.info(f"Notifying sessions about change: {change}")
