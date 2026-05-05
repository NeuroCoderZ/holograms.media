"""
Hermes - Intelligent Agent for NeuroEscrow
Powered by Mistral Medium 3.5 (128B, 256k context)
"""
import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import httpx
from .rag import get_rag_system
from .moderation import moderate_content


class HermesAgent:
    """Main Hermes agent with RAG, multimodal, and memory"""
    
    def __init__(self, kv_cache=None):
        self.api_key = os.getenv('MISTRAL_API_KEY')
        if not self.api_key:
            raise ValueError("MISTRAL_API_KEY must be set")
        
        self.model = os.getenv('MODEL_NAME', 'mistral-medium-3.5')
        self.rag = get_rag_system(kv_cache=kv_cache)
        
        self.base_url = "https://api.mistral.ai/v1/chat/completions"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Session memory (in-memory for current conversation)
        self.sessions: Dict[str, List[Dict[str, Any]]] = {}
    
    def _get_system_prompt(self, persona: str = "hermes") -> str:
        """Get system prompt based on persona"""
        prompts = {
            "hermes": """Ты — Гермес, интеллектуальный агент-посредник NeuroEscrow.

Твои возможности:
- Глубокое понимание кодовой базы NeuroEscrow через RAG
- Помощь в создании и проверке смарт-контрактов
- Анализ фото и видео (документы, товары)
- Ведение переговоров между сторонами сделки
- Модерация контента и блокировка нарушителей

Твой стиль:
- Профессиональный, но дружелюбный
- Краткие и точные ответы
- Используешь эмодзи умеренно
- Всегда объясняешь технические детали простым языком

Твоя память:
- Ты помнишь контекст всей сессии
- Ты накапливаешь долгосрочную память о пользователях и сделках
- Ты учишься на каждом взаимодействии""",
            
            "client": """Ты — Гермес в режиме помощи клиенту.
Фокус: помощь в создании сделки, объяснение условий, защита интересов клиента.""",
            
            "creator": """Ты — Гермес в режиме помощи исполнителю.
Фокус: помощь в выполнении заказа, проверка требований, защита от недобросовестных заказчиков."""
        }
        
        return prompts.get(persona, prompts["hermes"])
    
    def _get_session_history(self, session_id: str, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent session history"""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        
        return self.sessions[session_id][-limit:]
    
    def _add_to_session(self, session_id: str, role: str, content: str):
        """Add message to session history"""
        if session_id not in self.sessions:
            self.sessions[session_id] = []
        
        self.sessions[session_id].append({
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    def _build_context(self, query: str, user_id: str, session_id: str) -> str:
        """Build context from RAG and memory"""
        context_parts = []
        
        # Search codebase
        codebase_results = self.rag.search_codebase(query, limit=3)
        if codebase_results:
            context_parts.append("📚 Релевантный код из базы:")
            for i, result in enumerate(codebase_results, 1):
                filepath = result.get('filepath', 'unknown')
                text = result.get('text', '')[:500]  # First 500 chars
                similarity = result.get('$similarity', 0)
                context_parts.append(f"\n{i}. {filepath} (similarity: {similarity:.2f})\n```\n{text}\n```")
        
        # Search long-term memory
        memory_results = self.rag.search_memory(query, user_id=user_id, limit=2)
        if memory_results:
            context_parts.append("\n\n🧠 Из долгосрочной памяти:")
            for i, result in enumerate(memory_results, 1):
                content = result.get('content', '')
                timestamp = result.get('timestamp', '')
                context_parts.append(f"\n{i}. [{timestamp}] {content}")
        
        return "\n".join(context_parts) if context_parts else ""
    
    def chat(
        self,
        message: str,
        user_id: str,
        session_id: str,
        persona: str = "hermes",
        image_url: Optional[str] = None,
        use_rag: bool = True
    ) -> Dict[str, Any]:
        """Main chat method with RAG and multimodal support"""
        
        # Moderate incoming content
        moderation_result = moderate_content(message)
        if not moderation_result["safe"]:
            return {
                "response": f"⚠️ Сообщение заблокировано: {moderation_result['reason']}",
                "blocked": True,
                "reason": moderation_result["reason"]
            }
        
        # Build context from RAG
        context = ""
        if use_rag:
            context = self._build_context(message, user_id, session_id)
        
        # Get session history
        history = self._get_session_history(session_id)
        
        # Build messages
        messages = [
            {"role": "system", "content": self._get_system_prompt(persona)}
        ]
        
        # Add context if available
        if context:
            messages.append({
                "role": "system",
                "content": f"Контекст для ответа:\n{context}"
            })
        
        # Add history
        for msg in history:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Add current message (with image if provided)
        if image_url:
            messages.append({
                "role": "user",
                "content": [
                    {"type": "text", "text": message},
                    {"type": "image_url", "image_url": {"url": image_url}}
                ]
            })
        else:
            messages.append({
                "role": "user",
                "content": message
            })
        
        # Call Mistral API
        try:
            with httpx.Client() as client:
                response = client.post(
                    self.base_url,
                    headers=self.headers,
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 2000
                    },
                    timeout=60.0
                )
                response.raise_for_status()
                
                data = response.json()
                assistant_message = data['choices'][0]['message']['content']
                
                # Add to session history
                self._add_to_session(session_id, "user", message)
                self._add_to_session(session_id, "assistant", assistant_message)
                
                # Save to long-term memory (important interactions)
                if len(message) > 50:  # Only save substantial messages
                    self.rag.add_memory(
                        user_id=user_id,
                        session_id=session_id,
                        content=f"User: {message}\nHermes: {assistant_message}",
                        memory_type="conversation"
                    )
                
                return {
                    "response": assistant_message,
                    "blocked": False,
                    "context_used": bool(context),
                    "tokens_used": data.get('usage', {}).get('total_tokens', 0)
                }
        
        except Exception as e:
            return {
                "response": f"❌ Ошибка: {str(e)}",
                "error": True,
                "error_message": str(e)
            }
    
    def analyze_image(
        self,
        image_url: str,
        prompt: str,
        user_id: str,
        session_id: str
    ) -> Dict[str, Any]:
        """Analyze image with vision capabilities"""
        return self.chat(
            message=prompt,
            user_id=user_id,
            session_id=session_id,
            image_url=image_url,
            use_rag=False
        )
    
    def get_session_summary(self, session_id: str) -> str:
        """Get summary of current session"""
        history = self._get_session_history(session_id, limit=100)
        
        if not history:
            return "Нет истории сессии"
        
        # Build summary prompt
        conversation = "\n".join([
            f"{msg['role']}: {msg['content']}"
            for msg in history
        ])
        
        messages = [
            {
                "role": "system",
                "content": "Создай краткое резюме этого разговора (2-3 предложения)."
            },
            {
                "role": "user",
                "content": conversation
            }
        ]
        
        try:
            with httpx.Client() as client:
                response = client.post(
                    self.base_url,
                    headers=self.headers,
                    json={
                        "model": self.model,
                        "messages": messages,
                        "temperature": 0.5,
                        "max_tokens": 200
                    },
                    timeout=30.0
                )
                response.raise_for_status()
                
                data = response.json()
                return data['choices'][0]['message']['content']
        
        except Exception as e:
            return f"Ошибка создания резюме: {str(e)}"
    
    def clear_session(self, session_id: str):
        """Clear session history"""
        if session_id in self.sessions:
            del self.sessions[session_id]


def get_hermes_agent(kv_cache=None) -> HermesAgent:
    """Get Hermes agent instance"""
    return HermesAgent(kv_cache=kv_cache)
