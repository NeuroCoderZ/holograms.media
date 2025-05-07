---
title: Holograms Media
emoji: 💥
colorFrom: indigo
colorTo: blue
sdk: gradio
sdk_version: 5.29.0
python_version: 3.12
app_file: app.py
pinned: false
---

# Holograms Media
Interactive 3D Audio Visualizations with AI Assistant Tria.

Backend: FastAPI, frontend: static (frontend/), запуск через Gradio SDK.

- FastAPI endpoints: `/api/health`, `/api/chat`, ... (через Gradio mount на /api)
- Статика: `/static/`
- Главная: `/` (отдаёт frontend/index.html)
