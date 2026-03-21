---
name: holograms-media-tria
description: Архитектура Триа, LLM модели, стриминг, оркестратор.
---

# Tria AI Rules

## 🔒 MODEL LOCK
- Основная: `gemini-3-flash-preview` (через OpenClaw или напрямую)
- Архитектура: `mistral-small-latest` (только ArchitectureAgent)
- НЕ менять без указания НейроКодера.

## Поток обработки сообщения
OpenClaw Patrol (входящий) → TriaOrchestrator → LLM stream → накопить → сохранить в AstraDB → OpenClaw Patrol (исходящий)

## Стриминг (chat_service.py → stream_message_to_session)
- Стримить токены немедленно через SSE (`yield "data: {...}\n\n"`)
- Сохранять полный ответ в AstraDB ТОЛЬКО после завершения стрима (в `finally`)
- Никаких задержек на бэкенде — скорость вывода регулируется фронтендом

## Frontend (js/ai/chat.js)
- Скорость печати: символьная очередь `charQueue + setTimeout(flushQueue, 18)`
- TYPING_DELAY_MS = 18 (≈55 символов/сек)
