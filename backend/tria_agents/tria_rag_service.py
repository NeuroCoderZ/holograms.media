# backend/tria_agents/tria_rag_service.py
from pydantic import BaseModel
from typing import List, Dict, Any, Tuple, Optional
import time

class TriaRequest(BaseModel):
    query: str
    session_id: Optional[str] = None

class TriaResponse(BaseModel):
    answer: str
    sources: List[Dict[str, Any]] = []
    processing_time: float = 0.0

class QueryClassifier:
    """
    Классификатор запросов для маршрутизации между агентами Tria.
    """
    def __init__(self):
        # В будущем здесь будет Mistral/OpenAI классификатор
        self.keywords = {
            'frontend': ['css', 'js', 'html', 'react', 'ui', 'rendering', 'three.js', 'canvas'],
            'backend': ['python', 'fastapi', 'database', 'api', 'server', 'endpoint', 'koyeb'],
            'debug': ['error', 'fail', 'bug', 'fix', 'issue', 'not working', 'crash'],
            'architecture': ['design', 'structure', 'modular', 'concept', 'system'],
            'protocol': ['p2p', 'webrtc', 'soma', 'pulse', 'broadcast', 'collective']
        }

    def classify(self, query: str) -> Tuple[str, float]:
        query_lower = query.lower()
        
        scores: Dict[str, int] = {domain: 0 for domain in self.keywords}
        for domain, words in self.keywords.items():
            for word in words:
                if word in query_lower:
                    scores[domain] += 1
        
        # Находим домен с максимальным совпадением (max_domain: str)
        max_domain = max(scores, key=lambda d: scores[d])
        max_score = scores[max_domain]
        
        if max_score > 0:
            return max_domain, float(max_score) / 5.0
        
        return "general", 0.5
