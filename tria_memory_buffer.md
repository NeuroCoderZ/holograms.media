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

## Environment Details

- **Server**: Ubuntu 24.04
- **Jenkins**: 2.492.3, port 8080, password: 3090cd531a0841f3a2bc4be624ddd8d0
- **Python**: 3.12 (venv at `/root/holograms.media/venv`)

## Last Actions

- [2025-04-30 13:00:00 UTC] Checked Jenkins settings: branch `*/main`, trigger enabled.
- [2025-04-30 13:00:00 UTC] Cleared workspace manually.
- [2025-04-30 13:00:00 UTC] Verified repository access.

## Next Steps

- Investigate why Jenkins build is not triggering.
- Check Jenkins logs: `sudo journalctl -u jenkins --since "2025-04-30 13:00"`.
- Test with a new commit: `echo "Webhook test 7" >> test.txt && git add test.txt && git commit -m "test: Webhook test commit 7" && git push origin main`.
  **Commit:** a73fb8b (Предполагаемый)

**Текущий статус:**

- Бэкенд (`backend.py`) работает на порту 3000.
- Эндпоинты `/tria/invoke` и `/tria/save_logs` доступны.
- CORS настроен для бэкенда.
- Фронтенд (`index.html`) имеет базовую структуру с кнопками. Логика `#triaButton` работает.
- Jenkins настроен, отправка логов на `/tria/save_logs` реализована. Автокоммиты через Webhook НЕ настроены.
- **Выполнен шаг рефакторинга UI**: Стандартизированы размеры кнопок левой панели и шрифты таймлайна/панели промпта в `frontend/style.css`.

**Выполненный Шаг (Рефакторинг UI - Часть 1):**

- **Цель:** Применить стандарты UI к кнопкам левой панели и шрифтам в `style.css`.
- **Изменения в `frontend/style.css`:**
  - `--button-size` установлен в `clamp(44px, 5vmin, 60px)`.
  - Ширина `.panel.left-panel` теперь корректно рассчитывается на основе `--button-size`. Убраны `min-width` и `max-width` для этой панели.
  - `.version-label` (метки версий) теперь `font-size: 11px !important; line-height: 1.4 !important;`.
  - `.version-text p` (текст промптов в таймлайне) теперь `font-size: 11px; line-height: 1.4;`.
  - Шрифты для `#topPromptInput`, `#modelSelect`, `#submitTopPrompt` установлены в `font-size: clamp(13px, 2vmin, 15px);`.
- **Результат:** Улучшена адаптивность и консистентность UI элементов.

**Следующие шаги (Приоритетные):**

1.  Исправить ошибку 405 для `/tria/save_logs` в `backend.py`.
2.  Настроить автокоммиты через GitHub Webhook в Jenkins.
3.  Реализовать голосовой ввод через `#micButton` (Web Speech API, вызов `/tria/invoke`).
