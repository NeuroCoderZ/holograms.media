# Технологический Стек: Holograms.Media

## Frontend (Клиентская часть)
- **Основной фреймворк:** Vite (JavaScript)
- **Аудио-движок:** AudioWorklet с использованием Vite URL-импортов (`?url`) для надежной загрузки в production.
- **3D Рендеринг:** Three.js (с поддержкой WebGPU, WebGL, Canvas2D)
- **Высокая производительность:** WebAssembly (Rust/Cargo) для обработки аудио (CWT)
- **ИИ и Машинное обучение:** MediaPipe Hands, TensorFlow.js (для распознавания жестов)
- **Коммуникация:** WebRTC (P2P), Web Speech API (голосовое управление)
- **Управление состоянием:** Кастомная шина событий (EventBus) и паттерн State

## Backend (Серверная часть)
- **Фреймворк:** Python (FastAPI)
- **Стандарты API:** RESTful API, WebSockets (для жестов в реальном времени)
- **Интеграция ИИ:** Google Generative AI (контекст Mistral LLM), LangChain
- **Асинхронная обработка:** uvicorn, aiofiles

## Хранение данных
- **Основная база данных:** Astra DB (Cassandra/NoSQL)
- **Объектное хранилище:** Backblaze B2 (для медиа-файлов)
- **Развертывание и Edge:** Cloudflare Pages (Frontend), Koyeb (Backend)

## Инфраструктура и Инструменты
- **Контроль версий:** Git
- **Контейнеризация:** Docker (Dockerfile, cloudbuild.yaml)
- **CI/CD:** GitHub Actions (развертывание на Cloudflare/Koyeb)