---
name: holograms-media-streaming
description: "Implementation of real-time character-by-character chat streaming for Tria. Uses FastAPI StreamingResponse (SSE) and ReadableStream (Frontend)."
---

# Tria Real-time Streaming (Phase 20.6)

This skill describes the exact protocol for implementing Server-Sent Events (SSE) in the Holograms Media architecture.

## Backend: FastAPI `StreamingResponse`

To implement streaming, use a generator that yields tokens.

```python
from fastapi.responses import StreamingResponse
import json

async def generate_chat_stream(response_iterator):
    """
    Generator for SSE. Each yield should follow the event-stream format.
    """
    for choice in response_iterator:
        token = choice.text or ""
        # SSE format: "data: <json>\n\n"
        yield f"data: {json.dumps({'token': token})}\n\n"
    
    yield "data: [DONE]\n\n"

@app.post("/api/tria/chat/stream")
async def chat_stream(request: ChatRequest):
    # Get iterator from LLM (e.g., Gemini or Mistral)
    response_iterator = llm.stream_chat(request.message)
    return StreamingResponse(
        generate_chat_stream(response_iterator),
        media_type="text/event-stream"
    )
```

## Frontend: `ReadableStream` Consumption

Use `fetch` and `getReader()` to process chunks as they arrive.

```javascript
async function* getChatStream(response) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') return;
                try {
                    const parsed = JSON.parse(data);
                    yield parsed.token;
                } catch (e) {
                    console.error("Error parsing stream chunk:", e);
                }
            }
        }
    }
}
```

## Key Constraints (BasilaQ-256)
- **Fluidity**: Characters should appear with a slight "typing" delay if needed, but the raw stream should be as fast as possible.
- **Persistence**: Save the full message to AstraDB only *after* the stream is finished to avoid partial writes.

