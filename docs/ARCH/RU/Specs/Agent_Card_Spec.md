# Agent Card Specification (.well-known/agent-card.json)

## Версия: 1.0.0
## Дата создания: 13.05.2026
## Статус: Draft (требует review перед имплементацией)
## Стандарт: MCP v1.2 + A2A Protocol Draft v0.9

---

## 🎯 Цель

Спецификация `agent-card.json` для автоматического обнаружения (discovery) и интеграции Hermes (Tria Cortex v2.6) с внешними AI-агентами через MCP и A2A Protocol.

**Расположение:**
```
https://holograms.media/.well-known/agent-card.json
```

---

## 📋 SCHEMA

### Full Agent Card

```json
{
  "name": "Hermes (Tria Cortex v2.6)",
  "version": "0.20.492",
  "description": "Post-symbolic multimodal agent for gesture/audio/intent resonance. Combines MediaPipe hand tracking, BasilaQ-128 audio spectrum analysis, and Enkephalon neural memory for non-symbolic AI interaction.",
  "agent_id": "hermes_tria_v2.6",
  "organization": {
    "name": "NeuroCoderZ",
    "url": "https://holograms.media",
    "contact": "neurocoderz@gmail.com"
  },
  "capabilities": [
    "rag",
    "gesture_analysis",
    "audio_cwt",
    "memory_recall",
    "funding",
    "xr_rendering"
  ],
  "modalities": [
    "text",
    "audio",
    "gesture",
    "3d_spatial"
  ],
  "endpoints": {
    "mcp": {
      "tools": "https://holograms.media/api/v1/mcp/tools",
      "resources": "https://holograms.media/api/v1/mcp/resources",
      "prompts": "https://holograms.media/api/v1/mcp/prompts",
      "execute": "https://holograms.media/api/v1/mcp/tools/execute"
    },
    "a2a": {
      "state": "https://holograms.media/api/v1/a2a/state",
      "handoff": "https://holograms.media/api/v1/a2a/handoff",
      "sync": "https://holograms.media/api/v1/a2a/sync"
    },
    "health": "https://neuroescrow-hermes.neurocoderz.workers.dev/health",
    "docs": "https://holograms.media/docs/api"
  },
  "auth": {
    "type": "bearer",
    "scopes": ["read", "execute", "admin"],
    "token_endpoint": "https://holograms.media/api/v1/auth/token",
    "oauth2": {
      "enabled": false,
      "authorization_endpoint": null,
      "token_endpoint": null,
      "scopes": []
    }
  },
  "limits": {
    "rpm": 10,
    "max_payload_kb": 50,
    "timeout_s": 10,
    "streaming_timeout_s": 20
  },
  "protocols": {
    "mcp": {
      "version": "1.2",
      "features": ["tools", "resources", "prompts", "streaming"]
    },
    "a2a": {
      "version": "0.9",
      "features": ["state_sync", "session_handoff", "crdt_merge"],
      "compatible": true
    }
  },
  "models": {
    "primary": {
      "name": "Mistral Medium 3.5",
      "id": "mistral-medium-3.5",
      "parameters": "128B",
      "context_window": 256000,
      "provider": "Mistral AI"
    },
    "embedding": {
      "name": "Gemini Embedding 2",
      "id": "gemini-embedding-2-preview",
      "dimensions": 3072,
      "provider": "Google DeepMind"
    },
    "architecture": {
      "name": "Mistral Small",
      "id": "mistral-small-latest",
      "provider": "Mistral AI"
    }
  },
  "data_sources": {
    "knowledge_base": {
      "type": "vector_db",
      "provider": "AstraDB",
      "collection": "tria_knowledge_gemini",
      "dimensions": 3072,
      "metric": "cosine",
      "document_count": 1523
    },
    "memory": {
      "type": "neural_memory",
      "provider": "Enkephalon (WASM)",
      "dimensions": 3072,
      "decay_rate": 0.001
    }
  },
  "specializations": {
    "gesture_recognition": {
      "description": "MediaPipe hand tracking → 63-dim landmarks → 3072-dim embeddings",
      "input": "21 hand landmarks (x, y, z)",
      "output": "Gesture ID + confidence + intent",
      "latency_ms": 50
    },
    "audio_spectrum": {
      "description": "BasilaQ-128 continuous wavelet transform (C0 to G9)",
      "input": "PCM audio (48kHz, mono)",
      "output": "128 semitone bins + dominant frequency + energy",
      "latency_ms": 16
    },
    "rag": {
      "description": "Semantic search in Holograms Media codebase + docs",
      "input": "Natural language query",
      "output": "Top-K results with similarity scores",
      "latency_ms": 500
    }
  },
  "a2a_compatible": true,
  "crdt_support": {
    "enabled": true,
    "types": ["gesture_deltas", "spectrum_deltas", "memory_deltas"],
    "merge_strategy": "last_write_wins"
  },
  "metadata": {
    "license": "MIT",
    "repository": "https://github.com/NeuroCoderZ/holograms.media",
    "documentation": "https://holograms.media/docs",
    "status": "production",
    "uptime_percent": 99.5,
    "last_updated": "2026-05-13T12:00:00Z"
  },
  "discovery": {
    "tags": ["multimodal", "gesture", "audio", "xr", "rag", "post-symbolic"],
    "categories": ["ai_agent", "multimodal_interface", "xr_platform"],
    "languages": ["ru", "en"]
  }
}
```

---

## 🔍 FIELD DESCRIPTIONS

### Core Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Human-readable agent name |
| `version` | string | ✅ | Semantic version (matches `version.txt`) |
| `description` | string | ✅ | Brief description (max 500 chars) |
| `agent_id` | string | ✅ | Unique identifier (lowercase, underscores) |
| `organization` | object | ✅ | Organization metadata |
| `capabilities` | array | ✅ | List of capabilities (enum) |
| `modalities` | array | ✅ | Supported modalities (enum) |
| `endpoints` | object | ✅ | API endpoints |
| `auth` | object | ✅ | Authentication configuration |
| `limits` | object | ✅ | Rate limits and constraints |
| `protocols` | object | ✅ | Supported protocols (MCP, A2A) |

### Capabilities (Enum)

```typescript
type Capability =
  | "rag"                  // Retrieval-Augmented Generation
  | "gesture_analysis"     // Hand gesture recognition
  | "audio_cwt"            // Continuous Wavelet Transform
  | "memory_recall"        // Neural memory retrieval
  | "funding"              // Payment processing
  | "xr_rendering"         // XR/AR/VR rendering
  | "text_generation"      // Text generation
  | "image_generation"     // Image generation
  | "code_execution"       // Code execution
  | "web_search"           // Web search
  | "file_operations";     // File read/write
```

### Modalities (Enum)

```typescript
type Modality =
  | "text"                 // Text input/output
  | "audio"                // Audio input/output
  | "image"                // Image input/output
  | "video"                // Video input/output
  | "gesture"              // Gesture input
  | "3d_spatial"           // 3D spatial data
  | "haptic";              // Haptic feedback
```

---

## 🔗 ENDPOINTS STRUCTURE

### MCP Endpoints

```json
{
  "mcp": {
    "tools": "https://holograms.media/api/v1/mcp/tools",
    "resources": "https://holograms.media/api/v1/mcp/resources",
    "prompts": "https://holograms.media/api/v1/mcp/prompts",
    "execute": "https://holograms.media/api/v1/mcp/tools/execute"
  }
}
```

**Required:** `tools`, `resources`, `prompts`  
**Optional:** `execute` (for streaming)

### A2A Endpoints

```json
{
  "a2a": {
    "state": "https://holograms.media/api/v1/a2a/state",
    "handoff": "https://holograms.media/api/v1/a2a/handoff",
    "sync": "https://holograms.media/api/v1/a2a/sync"
  }
}
```

**Required:** `state`, `handoff`  
**Optional:** `sync` (for CRDT delta merge)

---

## 🔒 AUTH STRUCTURE

### Bearer Token (Current)

```json
{
  "auth": {
    "type": "bearer",
    "scopes": ["read", "execute", "admin"],
    "token_endpoint": "https://holograms.media/api/v1/auth/token"
  }
}
```

### OAuth 2.1 (Roadmap)

```json
{
  "auth": {
    "type": "oauth2",
    "scopes": ["read", "execute", "admin"],
    "authorization_endpoint": "https://holograms.media/oauth/authorize",
    "token_endpoint": "https://holograms.media/oauth/token",
    "oauth2": {
      "enabled": true,
      "grant_types": ["authorization_code", "client_credentials"],
      "pkce_required": true
    }
  }
}
```

---

## 📊 LIMITS STRUCTURE

```json
{
  "limits": {
    "rpm": 10,                    // Requests per minute
    "max_payload_kb": 50,         // Max request payload size
    "timeout_s": 10,              // Standard timeout
    "streaming_timeout_s": 20,    // Streaming timeout
    "max_concurrent": 5           // Max concurrent requests (optional)
  }
}
```

---

## 🤝 A2A COMPATIBILITY

### CRDT Support

```json
{
  "crdt_support": {
    "enabled": true,
    "types": ["gesture_deltas", "spectrum_deltas", "memory_deltas"],
    "merge_strategy": "last_write_wins"
  }
}
```

**Merge Strategies:**
- `last_write_wins` — Последняя запись побеждает (default)
- `operational_transform` — Operational Transformation (для текста)
- `vector_clock` — Vector clocks (для распределённых систем)

### State Sync

```json
{
  "a2a": {
    "state": "https://holograms.media/api/v1/a2a/state",
    "sync": "https://holograms.media/api/v1/a2a/sync"
  }
}
```

**State Format:**
```json
{
  "agent_id": "hermes_tria_v2.6",
  "session_id": "sess_abc123",
  "user_id": "usr_xyz789",
  "context": {
    "last_intent": "play_music",
    "conversation_history": ["Hello", "Play some jazz"],
    "gesture_state": {
      "last_gesture": "swipe_right",
      "confidence": 0.95
    },
    "audio_state": {
      "dominant_frequency_hz": 440.0,
      "energy_db": -12.5
    }
  },
  "timestamp": "2026-05-13T12:15:30Z"
}
```

---

## 🧪 VALIDATION

### JSON Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "version", "agent_id", "endpoints", "auth", "protocols"],
  "properties": {
    "name": {"type": "string", "minLength": 1, "maxLength": 100},
    "version": {"type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$"},
    "agent_id": {"type": "string", "pattern": "^[a-z0-9_]+$"},
    "capabilities": {
      "type": "array",
      "items": {"type": "string"},
      "minItems": 1
    },
    "endpoints": {
      "type": "object",
      "required": ["mcp", "health"],
      "properties": {
        "mcp": {
          "type": "object",
          "required": ["tools", "resources", "prompts"],
          "properties": {
            "tools": {"type": "string", "format": "uri"},
            "resources": {"type": "string", "format": "uri"},
            "prompts": {"type": "string", "format": "uri"}
          }
        },
        "health": {"type": "string", "format": "uri"}
      }
    },
    "auth": {
      "type": "object",
      "required": ["type", "scopes"],
      "properties": {
        "type": {"type": "string", "enum": ["bearer", "oauth2", "api_key"]},
        "scopes": {
          "type": "array",
          "items": {"type": "string"}
        }
      }
    },
    "protocols": {
      "type": "object",
      "required": ["mcp"],
      "properties": {
        "mcp": {
          "type": "object",
          "required": ["version"],
          "properties": {
            "version": {"type": "string"}
          }
        }
      }
    }
  }
}
```

### Validation Script

```python
# scripts/validate_agent_card.py
import json
import jsonschema
from pathlib import Path

def validate_agent_card():
    # Load agent card
    card_path = Path("public/.well-known/agent-card.json")
    with open(card_path) as f:
        card = json.load(f)
    
    # Load schema
    schema_path = Path("docs/ARCH/RU/Specs/agent-card-schema.json")
    with open(schema_path) as f:
        schema = json.load(f)
    
    # Validate
    try:
        jsonschema.validate(card, schema)
        print("✅ Agent card is valid")
        return True
    except jsonschema.ValidationError as e:
        print(f"❌ Validation error: {e.message}")
        return False

if __name__ == "__main__":
    validate_agent_card()
```

---

## 🚀 DEPLOYMENT

### File Location

```
public/.well-known/agent-card.json
```

**CORS Headers:**
```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, OPTIONS
Access-Control-Allow-Headers: Content-Type
Cache-Control: public, max-age=3600
```

### Cloudflare Pages Configuration

```toml
# public/_headers
/.well-known/agent-card.json
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, OPTIONS
  Cache-Control: public, max-age=3600
  Content-Type: application/json
```

### Auto-Update Script

```javascript
// scripts/update-agent-card.js
const fs = require('fs');
const path = require('path');

// Read version from version.txt
const version = fs.readFileSync('version.txt', 'utf8').trim();

// Read agent card
const cardPath = path.join('public', '.well-known', 'agent-card.json');
const card = JSON.parse(fs.readFileSync(cardPath, 'utf8'));

// Update version and timestamp
card.version = version;
card.metadata.last_updated = new Date().toISOString();

// Write back
fs.writeFileSync(cardPath, JSON.stringify(card, null, 2));

console.log(`✅ Agent card updated to version ${version}`);
```

**Integration in `scripts/deploy.js`:**
```javascript
// After version bump
execSync('node scripts/update-agent-card.js', { stdio: 'inherit' });
```

---

## 🧪 TESTING

### Discovery Test

```bash
# Test agent card accessibility
curl -I https://holograms.media/.well-known/agent-card.json

# Expected response:
# HTTP/2 200
# Content-Type: application/json
# Access-Control-Allow-Origin: *
```

### Validation Test

```bash
# Validate JSON schema
python scripts/validate_agent_card.py

# Expected output:
# ✅ Agent card is valid
```

### Integration Test

```python
# tests/test_agent_card.py
import pytest
import httpx

@pytest.mark.asyncio
async def test_agent_card_discovery():
    async with httpx.AsyncClient() as client:
        response = await client.get("https://holograms.media/.well-known/agent-card.json")
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json"
        
        card = response.json()
        assert "name" in card
        assert "version" in card
        assert "endpoints" in card
        assert "mcp" in card["endpoints"]

@pytest.mark.asyncio
async def test_mcp_endpoints_reachable():
    async with httpx.AsyncClient() as client:
        # Get agent card
        card_response = await client.get("https://holograms.media/.well-known/agent-card.json")
        card = card_response.json()
        
        # Test MCP tools endpoint
        tools_url = card["endpoints"]["mcp"]["tools"]
        tools_response = await client.get(tools_url, headers={
            "Authorization": "Bearer test_token"
        })
        
        assert tools_response.status_code in [200, 401]  # 401 if auth required
```

---

## 📚 REFERENCES

- [MCP v1.2 Specification](https://modelcontextprotocol.io/docs/spec/v1.2)
- [A2A Protocol Draft v0.9](https://github.com/google/a2a-protocol)
- [JSON Schema Draft 07](https://json-schema.org/draft-07/schema)
- [RFC 8615 - Well-Known URIs](https://www.rfc-editor.org/rfc/rfc8615.html)

---

**Последнее обновление:** 13.05.2026  
**Автор:** Claude 4.5 Sonnet (Foundation & Safety Sprint v0.20.493)  
**Статус:** Draft (требует review)
