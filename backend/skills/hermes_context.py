# backend/skills/hermes_context.py
# HermesContext: Task Agent (Codebase, Docs, Stack)
# Retrieves relevant code/documentation for the agent's context
# Personal (Local) wins: User's own code patterns and documentation preferences
# Global fallback: General documentation and public codebase patterns

import logging
import os
from typing import Dict, Any, List, Optional
import json

logger = logging.getLogger(__name__)

class HermesContext:
    """
    HermesContext: The "memory" of Personal Tria for code/docs.
    Retrieves relevant files, documentation, and stack information.
    Philosophy: Personal (Local) wins - user's own codebase patterns are prioritized.
    """
    
    def __init__(self, user_id: str = "guest", codebase_path: str = "/app"):
        self.user_id = user_id
        self.codebase_path = codebase_path
        
        # Personal Tria: User's own documentation preferences
        self.user_docs_preferences = {
            "preferred_language": "russian",  # Personal: Russian docs first
            "code_style": "typescript",       # Personal: User's codebase style
            "framework": "three.js",          # Personal: User's framework
            "documentation_sources": ["local", "internal"]  # Personal wins over external
        }
        
        # Cache for frequently accessed files (Personal Tria cache)
        self.context_cache = {}
        self.max_cache_size = 50
        
        logger.info(f"HermesContext (Personal Tria): Initialized for user {user_id}")
    
    def retrieve_code_context(self, query: str, max_results: int = 5) -> Dict[str, Any]:
        """
        Retrieve relevant code snippets based on query.
        Personal wins: Check user's own codebase first.
        Global fallback: Check general patterns if not found locally.
        """
        logger.info(f"HermesContext: Retrieving code context for query: {query[:50]}...")
        
        # Mock implementation - in production would use vector search over codebase
        relevant_files = self._search_codebase(query)
        
        # Personal Tria: Filter by user's preferred code style
        filtered_files = [
            f for f in relevant_files 
            if self.user_docs_preferences["code_style"] in f.get("tags", [])
        ]
        
        # If no personal files found, use Global fallback
        if not filtered_files:
            filtered_files = relevant_files[:max_results]
            source = "global_fallback"
        else:
            source = "personal_tria"
        
        return {
            "query": query,
            "results": filtered_files[:max_results],
            "source": source,
            "personal_preference": self.user_docs_preferences["code_style"],
            "total_found": len(filtered_files)
        }
    
    def retrieve_documentation(self, topic: str, language: str = None) -> Dict[str, Any]:
        """
        Retrieve documentation for a topic.
        Personal wins: User's preferred language and sources first.
        """
        if language is None:
            language = self.user_docs_preferences["preferred_language"]
        
        # Mock documentation retrieval
        docs = {
            "three.js": {
                "russian": "Three.js - библиотека для 3D графики в браузере...",
                "english": "Three.js is a 3D graphics library..."
            },
            "fastapi": {
                "russian": "FastAPI - современный веб-фреймворк для Python...",
                "english": "FastAPI is a modern Python web framework..."
            }
        }
        
        # Personal wins: Return user's preferred language first
        result = docs.get(topic, {}).get(language, "Documentation not found")
        
        return {
            "topic": topic,
            "language": language,
            "content": result,
            "source": "personal_tria" if language == self.user_docs_preferences["preferred_language"] else "global_fallback"
        }
    
    def update_user_preferences(self, key: str, value: Any) -> Dict[str, Any]:
        """Update Personal Tria documentation preferences."""
        if key in self.user_docs_preferences:
            old_value = self.user_docs_preferences[key]
            self.user_docs_preferences[key] = value
            logger.info(f"HermesContext: Updated preference {key}: {old_value} -> {value}")
            return {
                "status": "success",
                "key": key,
                "old_value": old_value,
                "new_value": value
            }
        return {"status": "error", "message": f"Unknown preference: {key}"}
    
    def _search_codebase(self, query: str) -> List[Dict[str, Any]]:
        """
        Mock codebase search.
        In production: would use vector search over AstraDB collection of code embeddings.
        """
        # Simulated search results
        mock_results = [
            {"file": "js/hologramRenderer.js", "score": 0.95, "tags": ["three.js", "javascript"]},
            {"file": "backend/tria_agents/hermes_core.py", "score": 0.89, "tags": ["python", "fastapi"]},
            {"file": "docs/ARCH/RU/Guides/Glossary.md", "score": 0.82, "tags": ["documentation"]},
            {"file": "AGENTS.md", "score": 0.78, "tags": ["configuration"]}
        ]
        return mock_results
    
    def get_stack_info(self) -> Dict[str, Any]:
        """Get information about the current technology stack."""
        return {
            "frontend": "Three.js, WebGPU/WebGL",
            "backend": "FastAPI, Python",
            "database": "AstraDB (vector + tabular)",
            "llm_models": {
                "personal": "mistral-small-latest (Hermes)",
                "global": "gemini-3-flash-preview",
                "critic": "gemini-3.1-flash-lite-preview"
            },
            "personal_tria_preferences": self.user_docs_preferences
        }

# Initialize the agent
context_agent = HermesContext()
