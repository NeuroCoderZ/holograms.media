# MCP Endpoints Specification (Phase 7.5)

## Версия: 1.0.0
## Дата создания: 13.05.2026
## Статус: Draft (требует review перед имплементацией)
## Стандарт: Model Context Protocol v1.2

---

## 🎯 Цель

Спецификация MCP (Model Context Protocol) endpoints для интеграции Hermes (Tria Cortex v2.6) с внешними AI-агентами и A2A (Agent-to-Agent) протоколом.

**Возможности:**
- Экспорт инструментов (RAG, gesture analysis, audio CWT, memory recall)
- Предоставление ресурсов (BasilaQ spectra, gesture deltas, agent state)
- Шаблоны промптов для кросс-агентного взаимодействия
- Streaming для long-running операций

---

## 📋 BASE CONFIGURATION

### Base URL
```
Production: https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app/api/v1/mcp
Development: http://localhost:8000/api/v1/mcp
```

### Authentication

**Current (v1.0):** Bearer Token
```http
Authorization: Bearer <api_token>
```

**Roadmap (v2.0):** OAuth 2.1 with PKCE
```http
Authorization: Bearer <oauth_access_token>
X-MCP-Client-ID: <client_id>
```

### Rate Limits
- **Per Client:** 10 requests / minute
- **Global:** 100 requests / minute
- **Max Payload:** 50 KB
- **Timeout:** 10 seconds (20s for streaming)

### Headers
```http
Content-Type: application/json
Accept: application/json, text/event-stream
X-MCP-Version: 1.2
X-Request-ID: <uuid-v4>
```

---

## 🔧 ENDPOINT 1: GET /api/v1/mcp/tools

### Description
Возвращает список доступных инструментов (tools) для выполнения агентом.

### Request
```http
GET /api/v1/mcp/tools HTTP/1.1
Host: holograms.media
Authorization: Bearer <token>
X-MCP-Version: 1.2
```

### Response (Success)

**HTTP 200 OK**
```json
{
  "tools": [
    {
      "name": "rag_query",
      "description": "Semantic search in Holograms Media knowledge base (3072d embeddings)",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": {
            "type": "string",
            "description": "Natural language query",
            "minLength": 3,
            "maxLength": 500
          },
          "limit": {
            "type": "integer",
            "description": "Number of results (default: 5)",
            "minimum": 1,
            "maximum": 20,
            "default": 5
          },
          "filter": {
            "type": "object",
            "description": "Metadata filters (optional)",
            "properties": {
              "source": {"type": "string"},
              "type": {"type": "string", "enum": ["code_snippet", "documentation"]}
            }
          }
        },
        "required": ["query"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "results": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "content": {"type": "string"},
                "source": {"type": "string"},
                "similarity": {"type": "number", "minimum": 0, "maximum": 1}
              }
            }
          },
          "query_time_ms": {"type": "number"}
        }
      },
      "streaming": false
    },
    {
      "name": "gesture_analyze",
      "description": "Analyze hand gesture sequence using MediaPipe + Enkephalon (63-dim → 3072d)",
      "input_schema": {
        "type": "object",
        "properties": {
          "landmarks": {
            "type": "array",
            "description": "Array of 21 hand landmarks (x, y, z)",
            "items": {
              "type": "array",
              "items": {"type": "number"},
              "minItems": 3,
              "maxItems": 3
            },
            "minItems": 21,
            "maxItems": 21
          },
          "timestamp_ms": {
            "type": "integer",
            "description": "Timestamp in milliseconds"
          }
        },
        "required": ["landmarks", "timestamp_ms"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "gesture_id": {"type": "string"},
          "confidence": {"type": "number", "minimum": 0, "maximum": 1},
          "embedding": {
            "type": "array",
            "items": {"type": "number"},
            "minItems": 3072,
            "maxItems": 3072
          },
          "intent": {"type": "string"}
        }
      },
      "streaming": false
    },
    {
      "name": "audio_cwt",
      "description": "Continuous Wavelet Transform for audio spectrum (BasilaQ-128)",
      "input_schema": {
        "type": "object",
        "properties": {
          "audio_data": {
            "type": "string",
            "description": "Base64-encoded PCM audio (48kHz, mono)",
            "format": "base64"
          },
          "duration_ms": {
            "type": "integer",
            "description": "Audio duration in milliseconds",
            "minimum": 100,
            "maximum": 5000
          }
        },
        "required": ["audio_data", "duration_ms"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "spectrum": {
            "type": "array",
            "description": "128 semitone bins (C0 to G9)",
            "items": {"type": "number"},
            "minItems": 128,
            "maxItems": 128
          },
          "dominant_frequency_hz": {"type": "number"},
          "energy_db": {"type": "number"}
        }
      },
      "streaming": true
    },
    {
      "name": "memory_recall",
      "description": "Recall agent memory from Enkephalon (Personal Tria)",
      "input_schema": {
        "type": "object",
        "properties": {
          "user_id": {
            "type": "string",
            "description": "User identifier"
          },
          "context_window": {
            "type": "integer",
            "description": "Number of recent memories (default: 10)",
            "minimum": 1,
            "maximum": 50,
            "default": 10
          }
        },
        "required": ["user_id"]
      },
      "output_schema": {
        "type": "object",
        "properties": {
          "memories": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "timestamp": {"type": "string", "format": "date-time"},
                "content": {"type": "string"},
                "embedding": {
                  "type": "array",
                  "items": {"type": "number"},
                  "minItems": 3072,
                  "maxItems": 3072
                }
              }
            }
          }
        }
      },
      "streaming": false
    }
  ],
  "version": "1.2",
  "server": "Hermes (Tria Cortex v2.6)"
}
```

---

## 📦 ENDPOINT 2: GET /api/v1/mcp/resources

### Description
Возвращает список доступных ресурсов (resources) для экспорта данных агента.

### Request
```http
GET /api/v1/mcp/resources HTTP/1.1
Host: holograms.media
Authorization: Bearer <token>
X-MCP-Version: 1.2
```

### Response (Success)

**HTTP 200 OK**
```json
{
  "resources": [
    {
      "uri": "hermes://basilaq/spectra",
      "name": "BasilaQ Spectra",
      "description": "Real-time audio spectrum (128 semitones, 60 FPS)",
      "mime_type": "application/json",
      "access": "read",
      "schema": {
        "type": "object",
        "properties": {
          "timestamp_ms": {"type": "integer"},
          "spectrum": {
            "type": "array",
            "items": {"type": "number"},
            "minItems": 128,
            "maxItems": 128
          },
          "dominant_frequency_hz": {"type": "number"},
          "energy_db": {"type": "number"}
        }
      }
    },
    {
      "uri": "hermes://gestures/deltas",
      "name": "Gesture Deltas",
      "description": "Incremental gesture state changes (CRDT-compatible)",
      "mime_type": "application/json",
      "access": "read",
      "schema": {
        "type": "object",
        "properties": {
          "delta_id": {"type": "string"},
          "timestamp_ms": {"type": "integer"},
          "landmarks_diff": {
            "type": "array",
            "description": "Only changed landmarks (sparse array)",
            "items": {
              "type": "object",
              "properties": {
                "index": {"type": "integer", "minimum": 0, "maximum": 20},
                "x": {"type": "number"},
                "y": {"type": "number"},
                "z": {"type": "number"}
              }
            }
          }
        }
      }
    },
    {
      "uri": "hermes://rag/context",
      "name": "RAG Context Window",
      "description": "Current RAG context (last 5 queries + results)",
      "mime_type": "application/json",
      "access": "read",
      "schema": {
        "type": "object",
        "properties": {
          "queries": {
            "type": "array",
            "items": {
              "type": "object",
              "properties": {
                "query": {"type": "string"},
                "timestamp": {"type": "string", "format": "date-time"},
                "results_count": {"type": "integer"}
              }
            },
            "maxItems": 5
          }
        }
      }
    },
    {
      "uri": "hermes://agent/state",
      "name": "Agent State",
      "description": "Current agent state (for A2A session handoff)",
      "mime_type": "application/json",
      "access": "read",
      "schema": {
        "type": "object",
        "properties": {
          "agent_id": {"type": "string"},
          "session_id": {"type": "string"},
          "user_id": {"type": "string"},
          "context": {
            "type": "object",
            "properties": {
              "last_intent": {"type": "string"},
              "conversation_history": {
                "type": "array",
                "items": {"type": "string"},
                "maxItems": 10
              }
            }
          },
          "timestamp": {"type": "string", "format": "date-time"}
        }
      }
    }
  ],
  "version": "1.2",
  "server": "Hermes (Tria Cortex v2.6)"
}
```

---

## 💬 ENDPOINT 3: POST /api/v1/mcp/prompts

### Description
Возвращает шаблоны промптов с переменными для кросс-агентного взаимодействия.

### Request
```http
POST /api/v1/mcp/prompts HTTP/1.1
Host: holograms.media
Authorization: Bearer <token>
Content-Type: application/json
X-MCP-Version: 1.2

{
  "prompt_id": "gesture_intent_extraction",
  "variables": {
    "user_intent": "play music",
    "context_window": "User is in XR mode, hands visible"
  }
}
```

### Response (Success)

**HTTP 200 OK**
```json
{
  "prompt_id": "gesture_intent_extraction",
  "template": "You are analyzing a hand gesture sequence. User intent: {user_intent}. Context: {context_window}. Extract the semantic meaning of the gesture and map it to an action.",
  "rendered": "You are analyzing a hand gesture sequence. User intent: play music. Context: User is in XR mode, hands visible. Extract the semantic meaning of the gesture and map it to an action.",
  "variables": {
    "user_intent": "play music",
    "context_window": "User is in XR mode, hands visible"
  },
  "metadata": {
    "category": "gesture_analysis",
    "language": "en",
    "version": "1.0"
  }
}
```

### Available Prompts

```json
{
  "prompts": [
    {
      "id": "gesture_intent_extraction",
      "description": "Extract semantic intent from gesture sequence",
      "variables": ["user_intent", "context_window"]
    },
    {
      "id": "rag_query_refinement",
      "description": "Refine user query for better RAG results",
      "variables": ["original_query", "domain"]
    },
    {
      "id": "audio_spectrum_interpretation",
      "description": "Interpret BasilaQ spectrum for musical analysis",
      "variables": ["spectrum_data", "genre_hint"]
    },
    {
      "id": "a2a_session_handoff",
      "description": "Prepare agent state for session handoff to another agent",
      "variables": ["target_agent_id", "handoff_reason", "context_summary"]
    }
  ]
}
```

---

## 🌊 STREAMING (Server-Sent Events)

### Endpoint: POST /api/v1/mcp/tools/execute

**For tools with `streaming: true` (e.g., `audio_cwt`)**

### Request
```http
POST /api/v1/mcp/tools/execute HTTP/1.1
Host: holograms.media
Authorization: Bearer <token>
Content-Type: application/json
Accept: text/event-stream
X-MCP-Version: 1.2

{
  "tool": "audio_cwt",
  "input": {
    "audio_data": "base64_encoded_audio...",
    "duration_ms": 2000
  }
}
```

### Response (Streaming)

**HTTP 200 OK**
```http
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive

event: progress
data: {"percent": 25, "message": "Processing frame 1/4"}

event: progress
data: {"percent": 50, "message": "Processing frame 2/4"}

event: result
data: {"spectrum": [0.1, 0.2, ...], "dominant_frequency_hz": 440.0, "energy_db": -12.5}

event: done
data: {"status": "completed", "total_time_ms": 1850}
```

---

## 🔒 SECURITY

### 1. Bearer Token Generation

```python
import secrets
import hashlib

def generate_mcp_token(client_id: str, secret_key: str) -> str:
    """
    Generate MCP Bearer token.
    """
    nonce = secrets.token_hex(16)
    payload = f"{client_id}:{nonce}"
    signature = hashlib.sha256(f"{payload}:{secret_key}".encode()).hexdigest()
    
    return f"mcp_{payload}_{signature}"
```

### 2. Token Validation

```python
def validate_mcp_token(token: str, secret_key: str) -> bool:
    """
    Validate MCP Bearer token.
    """
    if not token.startswith("mcp_"):
        return False
    
    parts = token[4:].split("_")
    if len(parts) != 2:
        return False
    
    payload, signature = parts
    expected_signature = hashlib.sha256(f"{payload}:{secret_key}".encode()).hexdigest()
    
    return hmac.compare_digest(signature, expected_signature)
```

### 3. Rate Limiting

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/api/v1/mcp/tools")
@limiter.limit("10/minute")
async def get_tools(request: Request):
    # ...
```

---

## 🧪 TESTING

### Unit Tests

```python
# tests/test_mcp_endpoints.py
import pytest
from fastapi.testclient import TestClient

def test_get_tools(client: TestClient):
    response = client.get("/api/v1/mcp/tools", headers={
        "Authorization": "Bearer valid_token",
        "X-MCP-Version": "1.2"
    })
    
    assert response.status_code == 200
    assert "tools" in response.json()
    assert len(response.json()["tools"]) >= 4

def test_get_resources(client: TestClient):
    response = client.get("/api/v1/mcp/resources", headers={
        "Authorization": "Bearer valid_token",
        "X-MCP-Version": "1.2"
    })
    
    assert response.status_code == 200
    assert "resources" in response.json()

def test_execute_tool_rag_query(client: TestClient):
    response = client.post("/api/v1/mcp/tools/execute", json={
        "tool": "rag_query",
        "input": {
            "query": "How does BasilaQ work?",
            "limit": 5
        }
    }, headers={
        "Authorization": "Bearer valid_token",
        "X-MCP-Version": "1.2"
    })
    
    assert response.status_code == 200
    assert "results" in response.json()
    assert response.json()["query_time_ms"] < 1000

def test_unauthorized_access(client: TestClient):
    response = client.get("/api/v1/mcp/tools")
    assert response.status_code == 401
```

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] Создать FastAPI router `backend/api/v1/endpoints/mcp.py`
- [ ] Добавить `MCP_SECRET_KEY` в `.env.production`
- [ ] Настроить rate limiting (Redis/Cloudflare)
- [ ] Добавить мониторинг (Sentry, Datadog)
- [ ] Написать unit tests (coverage ≥80%)
- [ ] Security audit (OWASP Top 10)
- [ ] Load testing (100 req/s)
- [ ] Документация OpenAPI (Swagger UI)
- [ ] Создать `.well-known/agent-card.json`
- [ ] Интеграция с A2A Protocol (Phase 8)

---

**Последнее обновление:** 13.05.2026  
**Автор:** Claude 4.5 Sonnet (Foundation & Safety Sprint v0.20.493)  
**Статус:** Draft (требует review)
