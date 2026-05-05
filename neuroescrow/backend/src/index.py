"""
Cloudflare Workers Entry Point for Hermes
Handles Telegram webhooks and Mini App requests
"""
import json
import os
import sys

# Add src directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))

import hermes
import rag


class Request:
    """Simple request wrapper for Workers"""
    def __init__(self, method: str, url: str, headers: dict, body: str = ""):
        self.method = method
        self.url = url
        self.headers = headers
        self._body = body
    
    async def json(self):
        return json.loads(self._body) if self._body else {}


class Response:
    """Simple response wrapper for Workers"""
    def __init__(self, body: str, status: int = 200, headers: dict = None):
        self.body = body
        self.status = status
        self.headers = headers or {"Content-Type": "application/json"}


async def handle_request(request: Request, env: Dict[str, Any]) -> Response:
    """Main request handler"""
    
    # Set environment variables from Workers env
    os.environ['MISTRAL_API_KEY'] = env.get('MISTRAL_API_KEY', '')
    os.environ['ASTRA_DB_TOKEN'] = env.get('ASTRA_DB_TOKEN', '')
    os.environ['ASTRA_DB_ENDPOINT'] = env.get('ASTRA_DB_ENDPOINT', '')
    os.environ['MODEL_NAME'] = env.get('MODEL_NAME', 'mistral-medium-3.5')
    os.environ['EMBEDDING_MODEL'] = env.get('EMBEDDING_MODEL', 'codestral-embed-2505')
    
    # Get KV cache
    kv_cache = env.get('CACHE')
    
    # Route handling
    if request.method == "GET" and "/health" in request.url:
        return await handle_health(kv_cache)
    
    elif request.method == "POST" and "/chat" in request.url:
        return await handle_chat(request, kv_cache)
    
    elif request.method == "POST" and "/analyze-image" in request.url:
        return await handle_analyze_image(request, kv_cache)
    
    elif request.method == "GET" and "/stats" in request.url:
        return await handle_stats(kv_cache)
    
    elif request.method == "POST" and "/webhook" in request.url:
        return await handle_telegram_webhook(request, kv_cache)
    
    else:
        return Response(
            json.dumps({"error": "Not found"}),
            status=404
        )


async def handle_health(kv_cache) -> Response:
    """Health check endpoint"""
    try:
        rag_system = rag.get_rag_system(kv_cache)
        stats = rag_system.get_stats()
        
        return Response(json.dumps({
            "status": "healthy",
            "service": "hermes-neuroescrow",
            "version": "1.0.0",
            "stats": stats
        }))
    except Exception as e:
        return Response(
            json.dumps({
                "status": "unhealthy",
                "error": str(e)
            }),
            status=500
        )


async def handle_chat(request: Request, kv_cache) -> Response:
    """Chat endpoint"""
    try:
        data = await request.json()
        
        message = data.get('message', '')
        user_id = data.get('user_id', 'anonymous')
        session_id = data.get('session_id', 'default')
        persona = data.get('persona', 'hermes')
        
        if not message:
            return Response(
                json.dumps({"error": "Message is required"}),
                status=400
            )
        
        # Get Hermes agent
        hermes_agent = hermes.get_hermes_agent(kv_cache)
        
        # Process message
        result = hermes_agent.chat(
            message=message,
            user_id=user_id,
            session_id=session_id,
            persona=persona
        )
        
        return Response(json.dumps(result))
    
    except Exception as e:
        return Response(
            json.dumps({"error": str(e)}),
            status=500
        )


async def handle_analyze_image(request: Request, kv_cache) -> Response:
    """Image analysis endpoint"""
    try:
        data = await request.json()
        
        image_url = data.get('image_url', '')
        prompt = data.get('prompt', 'Опиши это изображение')
        user_id = data.get('user_id', 'anonymous')
        session_id = data.get('session_id', 'default')
        
        if not image_url:
            return Response(
                json.dumps({"error": "image_url is required"}),
                status=400
            )
        
        # Get Hermes agent
        hermes_agent = hermes.get_hermes_agent(kv_cache)
        
        # Analyze image
        result = hermes_agent.analyze_image(
            image_url=image_url,
            prompt=prompt,
            user_id=user_id,
            session_id=session_id
        )
        
        return Response(json.dumps(result))
    
    except Exception as e:
        return Response(
            json.dumps({"error": str(e)}),
            status=500
        )


async def handle_stats(kv_cache) -> Response:
    """Stats endpoint"""
    try:
        rag_system = rag.get_rag_system(kv_cache)
        stats = rag_system.get_stats()
        
        return Response(json.dumps(stats))
    
    except Exception as e:
        return Response(
            json.dumps({"error": str(e)}),
            status=500
        )


async def handle_telegram_webhook(request: Request, kv_cache) -> Response:
    """Telegram webhook handler"""
    try:
        data = await request.json()
        
        # Extract message from Telegram update
        message = data.get('message', {})
        text = message.get('text', '')
        user_id = str(message.get('from', {}).get('id', 'unknown'))
        chat_id = message.get('chat', {}).get('id')
        
        if not text or not chat_id:
            return Response(json.dumps({"ok": True}))
        
        # Get Hermes agent
        hermes_agent = hermes.get_hermes_agent(kv_cache)
        
        # Process message
        result = hermes_agent.chat(
            message=text,
            user_id=user_id,
            session_id=f"tg_{chat_id}"
        )
        
        # Send response back to Telegram
        # TODO: Implement Telegram API call to send message
        
        return Response(json.dumps({"ok": True}))
    
    except Exception as e:
        return Response(
            json.dumps({"error": str(e)}),
            status=500
        )


# Cloudflare Workers entry point
async def on_fetch(request, env):
    """Workers fetch handler"""
    return await handle_request(request, env)
