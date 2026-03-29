# Том 2: Системная Архитектура v3.0
**Статус:** Технический стандарт (March 2026)

---

## 1. Концептуальная схема
Система Holograms Media построена по принципу **Distributed Cognitive Mesh**. Это гибридное решение, объединяющее локальные вычисления на NPU/GPU и облачную оркестрацию.

## 2. Frontend: Мультимодальное Ядро
Центральной шиной обмена сообщениями является **EventBus**. 

### 2.1. Стек технологий
*   **Рендеринг:** Three.js (v0.165+). Приоритетный рендерер: **WebGPU** (с фоллбэком на WebGL).
*   **Захват Интенций:** MediaPipe Hands (21 точка кисти @ 60-120 Гц).
*   **Аудио-анализ:** Pure WASM (C-core) + AudioWorklet. Анализ спектра BasilaQ-128.
*   **Локальный ИИ:** ONNX Runtime Web с поддержкой WebGPU для мгновенного резонанса жестов.

### 2.2. Потоки данных
1.  **Audio Stream:** `MicrophoneManager` -> `AudioWorklet` -> `WASM CWT` -> `eventBus ('audio:spectralData')` -> `HologramRenderer`.
2.  **Gesture Stream:** `MediaPipe` -> `GestureManager` -> `GestureDNA` (биометрия) -> `eventBus ('gesture:intent')`.

## 3. Backend: Оркестратор Триа
Бэкенд развернут в **Koyeb** (Docker-контейнеры) и написан на **FastAPI**.

### 3.1. База знаний (RAG)
*   **Хранилище:** AstraDB (Vector Search).
*   **Эмбеддинги:** `gemini-embedding-2-preview` (Dimension: 3072).
*   **Синхронизация:** Скрипт `sync_knowledge_base.py` выполняет инкрементальное обновление базы при каждом деплое.

### 3.2. LLM Оркестрация
*   **Supervisor:** `gemini-3-flash-preview` (управляет сессиями и мыслительным процессом).
*   **Sub-agents:** `gemini-3.1-flash-lite-preview` (фоновое исследование, критика, генерация кода).

## 4. Инфраструктура и P2P
*   **Сигналинг:** WebSocket-сервер `dev.holograms.media` для WebRTC-рукопожатий.
*   **P2P Протокол:** NetHoloGlyph. Обмен 1-битными квантами QJL для эхолокации в Рою.
*   **Хранилище Медиа:** Cloudflare R2 / Backblaze B2 (Soma-блоки и ассеты голограмм).

---
**"Архитектура следует за интенцией. Код — это геометрия резонанса."**
_Approved by Architecture Review Board._
