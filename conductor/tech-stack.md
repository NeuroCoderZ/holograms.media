# Technology Stack: Holograms.Media

## Frontend
- **Core Framework:** Vite (JavaScript)
- **3D Rendering:** Three.js (с поддержкой WebGPU, WebGL, Canvas2D)
- **High Performance:** WebAssembly (Rust/Cargo) для обработки аудио (CWT)
- **AI & ML:** MediaPipe Hands, TensorFlow.js (для распознавания жестов)
- **Communication:** WebRTC (P2P), Web Speech API (голосовое управление)
- **State Management:** Custom EventBus & State pattern

## Backend
- **Framework:** Python (FastAPI)
- **API Standards:** RESTful API, WebSockets (для жестов в реальном времени)
- **AI Integration:** Google Generative AI (Mistral LLM context), LangChain
- **Asynchronous Processing:** uvicorn, aiofiles

## Storage & Database
- **Primary Database:** Astra DB (Cassandra/NoSQL)
- **Object Storage:** Backblaze B2 (для медиа-файлов)
- **Deployment & Edge:** Cloudflare Pages (Frontend), Koyeb (Backend)

## Infrastructure & Tools
- **Version Control:** Git
- **Containerization:** Docker (Dockerfile, cloudbuild.yaml)
- **CI/CD:** GitHub Actions (Cloudflare/Koyeb deployments)
