# Holograms Media

**Holograms Media** — это мультимодальная XR-платформа нового поколения. Мы создаем осязаемый интерфейс к информации, превращая звук и жесты в живую 3D-голограмму.

> *"Наш проект — это бунт против плоского мира текстовых интерфейсов."*

## 🚀 Ключевые возможности
- **Интуитивный Язык Жестов:** Управляйте звуком как физическим объектом с помощью MediaPipe Hands.
- **High-Performance Audio:** Спектральный анализ в реальном времени (CWT) на базе Rust/WASM.
- **Мультиплатформенность:** Адаптивные режимы для Desktop, Mobile и погружение в XR (Cochlear Cylinder).
- **AI Tria:** Коллективный интеллект, понимающий "язык движений" через векторные эмбеддинги.

## 🛠 Технологический Стек
### Frontend
- **3D & UI:** Three.js, Vite, Vanilla JS (ES Modules).
- **CV & AI:** MediaPipe Hands, TWEEN.js.
- **Audio:** AudioWorklet, Custom Rust/WASM CWT Engine.

### Backend
- **Core:** FastAPI (Python), Koyeb.
- **Data:** AstraDB (Vector Search), Backblaze B2 (Object Storage).
- **Networking:** WebRTC (NetHoloGlyph), WebSockets.

## 🏗 Структура и Разработка
- **main**: Production (holograms.media).
- **dev**: Development (dev.holograms.media).
- `conductor/`: Локальная база знаний и треки задач.

## 🚦 Как запустить
1. `npm install`
2. `npm run dev` — для запуска фронтенда.
3. Бэкенд настраивается отдельно в папке `/backend`.

---
*Developed by **NeuroCoder** & Tria Collective Intelligence.*
