# backend/services/research_service.py
import os
import logging
import asyncio
from typing import List, Dict, Any, Optional
import httpx

logger = logging.getLogger(__name__)

class ResearchService:
    """
    ResearchService: Обеспечивает "Deep Research" через внешние поисковые API (Tavily, Exa).
    Позволяет Триа выходить за пределы своей базы знаний (тренировочные данные) 
    и получать актуальную техническую информацию.
    """
    def __init__(self):
        self.tavily_api_key = os.getenv("TAVILY_API_KEY", "").strip()
        self.exa_api_key = os.getenv("EXA_API_KEY", "").strip()
        self.client = httpx.AsyncClient(timeout=30.0)

    async def search_web(self, query: str, search_depth: str = "advanced", max_results: int = 5) -> str:
        """
        Выполняет поиск в веб-пространстве.
        """
        if not self.tavily_api_key:
            logger.warning("[ResearchService] TAVILY_API_KEY missing. Falling back to internal RAG.")
            return ""

        try:
            url = "https://api.tavily.com/search"
            payload = {
                "api_key": self.tavily_api_key,
                "query": query,
                "search_depth": search_depth,
                "include_answer": True,
                "max_results": max_results
            }
            
            response = await self.client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()
            
            answer = data.get("answer", "")
            results = data.get("results", [])
            
            formatted_results = []
            for res in results:
                formatted_results.append(f"Source: {res.get('url')}\nTitle: {res.get('title')}\nSnippet: {res.get('content')}")
            
            final_report = f"Summary: {answer}\n\n" + "\n\n---\n\n".join(formatted_results)
            logger.info(f"[ResearchService] Web search completed for: {query[:50]}...")
            return final_report
            
        except Exception as e:
            logger.error(f"[ResearchService] Search failed: {e}")
            return f"Error during deep research: {str(e)}"

    async def close(self):
        await self.client.aclose()

research_service = ResearchService()
