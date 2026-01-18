# backend/tria_bots/LiveCodeAnalyzer.py
import logging
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from backend.tria_agents.tria_context import ContextManager

logger = logging.getLogger(__name__)

class CodeChangeHandler(FileSystemEventHandler):
    """Handles file system events from watchdog."""
    def __init__(self, context_manager: ContextManager):
        self.context_manager = context_manager
        logger.info("CodeChangeHandler initialized.")

    def on_any_event(self, event):
        # This method is called for any event (created, deleted, modified, moved)
        if event.is_directory:
            return
        
        # We are interested in changes to key source files
        if event.src_path.endswith(('.py', '.js', '.html', '.css', '.md')):
            logger.info(f"LiveCodeAnalyzer: Detected change in '{event.src_path}' ({event.event_type}).")
            
            # Notify the ContextManager about the change
            # In a real system, we might batch changes or provide more details
            change_details = {
                "file_path": event.src_path,
                "event_type": event.event_type
            }
            self.context_manager.update_project_state([change_details])

class LiveCodeAnalyzer:
    """Monitors the codebase for changes and triggers re-evaluation."""
    def __init__(self, context_manager: ContextManager, path_to_watch: str):
        self.context_manager = context_manager
        self.path_to_watch = path_to_watch
        self.observer = Observer()
        logger.info(f"LiveCodeAnalyzer initialized to watch: {self.path_to_watch}")

    def start(self):
        """Starts the file system observer in a separate thread."""
        event_handler = CodeChangeHandler(self.context_manager)
        self.observer.schedule(event_handler, self.path_to_watch, recursive=True)
        self.observer.start()
        logger.info("LiveCodeAnalyzer has started monitoring for code changes.")

    def stop(self):
        """Stops the file system observer."""
        self.observer.stop()
        self.observer.join()
        logger.info("LiveCodeAnalyzer has stopped monitoring.")

# Example of how to run this (would be integrated into the main application lifecycle)
async def main_loop(orchestrator):
    codebase_root = "/home/neurocoderz/holograms.media/"
    analyzer = LiveCodeAnalyzer(orchestrator.context_manager, codebase_root)
    analyzer.start()
    try:
        while True:
            # Keep the main thread alive to let the observer run
            time.sleep(1)
    except KeyboardInterrupt:
        analyzer.stop()

# This main block is for demonstration and testing.
# In the actual application, the TriaOrchestrator would create and start the LiveCodeAnalyzer.
if __name__ == '__main__':
    # This is a simplified setup for testing the analyzer.
    # In the real app, the orchestrator would already be initialized.
    from tria_orchestrator import TriaOrchestrator
    
    logging.basicConfig(level=logging.INFO)
    
    # Create a dummy orchestrator to get its context manager
    test_orchestrator = TriaOrchestrator()
    
    # Run the main loop
    try:
        asyncio.run(main_loop(test_orchestrator))
    except KeyboardInterrupt:
        logger.info("Shutting down analyzer test.")
