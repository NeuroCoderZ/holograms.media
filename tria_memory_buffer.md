# Tria Memory Buffer for holograms.media (Managed by Триа)

## Project Overview

- **Name**: holograms.media
- **Repo**: https://github.com/NeuroCoderZ/holograms.media (branch: main)
- **License**: GPL-3.0
- **Stack**:
  - Frontend: HTML, CSS (Flexbox, Grid), JS (Three.js r128, MediaPipe Hands ~0.4, TWEEN.js, Axios)
  - Backend: Python 3.12, FastAPI, MongoDB (Motor), LangChain (ChatMistralAI)
  - Infra: Ubuntu 24.04, Nginx, Git, Tmux, VS Code/Cursor + Remote-SSH, Jenkins 2.492.3
- **AI Tools**: Aider (v0.82.2+), Cursor AI (Джемини), AI "Триа"
- **Team**: НейроКодер (лидер), Джемини (Cursor AI), Мистраль, Клод, Агент Смит
- **Триа API**: `/tria/invoke` (active), `/tria/save_logs` (for logging)

## Current Focus

- Stabilize UI: hologram scale (1.0 without hands, min 0.8 with hands), margins (5% top/bottom)
- Fix CSS/JS bugs: remove debug elements, configure ESLint/Prettier (already added `lint` in `package.json`)
- Gestures: pinch for volume (logic missing)
- Jenkins: autocommits via GitHub Webhook, send logs to `/tria/save_logs`
- AI "Триа": connect `#triaButton` to `/tria/invoke`, collect data (gestures, voice)

## Current Issues

- **Jenkins**:
  - Webhook works (code 200), but builds are not triggering.
  - Branch set to `*/main`, trigger `GitHub hook trigger for GITScm polling` enabled.
  - Workspace cleared manually: `sudo rm -rf /var/lib/jenkins/workspace/holograms.media/*`.
  - Repository access verified (HTTPS with token in Jenkins credentials).

## Known Errors

- CORS issues (previously resolved, monitor for Web Speech API)
- GPG key errors in Jenkins (previously resolved)
- 403 Forbidden on Webhook (previously resolved)
- API авторизация исправлена: заменили `ChatOpenAI` на `ChatMistralAI` и используем валидный `MISTRAL_API_KEY`

## Environment Details

- **Server**: Ubuntu 24.04
- **Jenkins**: 2.492.3, port 8080, password: 3090cd531a0841f3a2bc4be624ddd8d0
- **Python**: 3.12 (venv at `/root/holograms.media/venv`)

## Last Actions

- [2025-05-02 16:30:00 UTC] Исправлена инициализация Codestral LLM: используется `ChatMistralAI` вместо `ChatOpenAI`.
- [2025-05-02 16:35:00 UTC] Тестирование API эндпоинта `/tria/invoke` прошло успешно: `curl -X POST "http://localhost:3000/tria/invoke" -H "Content-Type: application/json" -d '{"query": "Привет, кто ты?"}'`
- [2025-04-30 13:00:00 UTC] Checked Jenkins settings: branch `*/main`, trigger enabled.
- [2025-04-30 13:00:00 UTC] Cleared workspace manually.
- [2025-04-30 13:00:00 UTC] Verified repository access.

## Next Steps

- Улучшить логирование ошибок в функции `generate_code_tool`
- Исследовать возможность создания отдельного инструмента для общих запросов (не связанных с кодом)
- Investigate why Jenkins build is not triggering.
- Check Jenkins logs: `sudo journalctl -u jenkins --since "2025-04-30 13:00"`.
- Test with a new commit: `echo "Webhook test 7" >> test.txt && git add test.txt && git commit -m "test: Webhook test commit 7" && git push origin main`.
