---
name: holograms-media-tria
description: Архитектура Триа, LLM модели, стриминг, оркестратор.
---

# Tria AI Rules

## 🔒 MODEL LOCK
- Основная: `gemini-3-flash-preview` (через Hermes Behavior & Context Agents)
- Архитектура: `mistral-small-latest` (только ArchitectureAgent)
- **Эмбеддинги: `gemini-embedding-2-preview` (dimension 3072, Matryoshka)**
- НЕ менять без указания НейроКодера.
- **⛔ НЕ использовать `text-embedding-004/005` для эмбеддингов!**

## Поток обработки сообщения
Hermes Behavior (входящий) → TriaOrchestrator → LLM stream → накопить → сохранить в AstraDB → Hermes Context (исходящий)

## Стриминг (chat_service.py → stream_message_to_session)
- Стримить токены немедленно через SSE (`yield "data: {...}\n\n"`)
- Сохранять полный ответ в AstraDB ТОЛЬКО после завершения стрима (в `finally`)
- Никаких задержек на бэкенде — скорость вывода регулируется фронтендом

## Frontend (js/ai/chat.js)
- Скорость печати: символьная очередь `charQueue + setTimeout(flushQueue, 18)`
- TYPING_DELAY_MS = 18 (≈55 символов/сек)
