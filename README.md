---
title: Holograms Media
emoji: 💥
colorFrom: indigo
colorTo: blue
sdk: docker
app_file: app.py
app_port: 7860
pinned: false
license: mit
---

# Holograms Media
Interactive 3D Audio Visualizations with AI Assistant Tria.

Backend: FastAPI, frontend: static (frontend/), запуск через Gradio SDK.

- FastAPI endpoints: `/api/health`, `/api/chat`, ... (через Gradio mount на /api)
- Статика: `/static/`
- Главная: `/` (отдаёт frontend/index.html)
