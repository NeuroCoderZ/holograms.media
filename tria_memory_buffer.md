# Tria Memory Buffer for holograms.media (Managed by Триа)

## Project Overview

- **Name**: holograms.media
- **Repo**: https://github.com/NeuroCoderZ/holograms.media (branch: main)
- **License**: GPL-3.0
- **Stack**:
  - Frontend: HTML, CSS (Flexbox, Grid), JS (Three.js r128, MediaPipe Hands ~0.4, TWEEN.js, Axios)
  - Backend: Python 3.12, FastAPI, MongoDB (Motor), LangChain (ChatMistralAI)
  - Infra: Ubuntu 24.04, Nginx, Git, Tmux, VS Code/Cursor + Remote-SSH, Jenkins 2.492.3
- **AI Tools**: Aider (v0.82.2+), Cursor AI (Claude 3.7 Sonnet), AI "Триа"
- **Team**: НейроКодер (лидер), Клод (Cursor AI), Мистраль, Джемини, Агент Смит
- **Триа API**: `/tria/invoke` (active), `/tria/save_logs` (active)

## Current Focus

- Рефакторинг фронтенда: переход на модульную структуру JS (script.js -> отдельные функциональные модули)
- SEO-оптимизация: базовые файлы и мета-теги готовы, требуется ручная регистрация в Google Search Console / Яндекс.Вебмастер
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
  - Jenkinsfile создан, но необходимо настроить Job в Jenkins, указав путь до репозитория.

## Known Errors

- CORS issues (previously resolved, monitor for Web Speech API)
- GPG key errors in Jenkins (previously resolved)
- 403 Forbidden on Webhook (previously resolved)
- API авторизация исправлена: заменили `ChatOpenAI` на `ChatMistralAI` и используем валидный `MISTRAL_API_KEY`
- Ошибка 405 Method Not Allowed: исправлена через рефакторинг структуры backend.py с применением паттерна отложенной инициализации

## Environment Details

- **Server**: Ubuntu 24.04
- **Jenkins**: 2.492.3, port 8080, password: 3090cd531a0841f3a2bc4be624ddd8d0
- **Python**: 3.12 (venv at `/root/holograms.media/venv`)

## Last Actions

- [2025-05-06 15:30:00 UTC] Создан модуль chatMessages.js для работы с чатом и синтезом речи. Добавлены функции initializeChatMessages, addMessageToChat и speak. Обновлены script.js (добавлена функция sendPrompt) и style.css (улучшены стили для чат-сообщений). Реализована мини-кнопка "Вставить в Промпт" с переключением на вид таймлайна.
- [2025-05-05 16:30:00 UTC] Реализована JavaScript-логика для переключения между 4-мя видами правой панели и управления связанными полями ввода в новом модуле rightPanelManager.js. Обновлены импорты в script.js и index.html. Завершен Шаг 4 плана рефакторинга.
- [2025-05-04 16:30:00 UTC] Создана новая структура правой панели с четырьмя видами (Таймлайн, Чат, Жесты, Голограммы) и добавлены кнопки переключения между ними. Обновлены CSS-стили для новых элементов и заменено одно поле ввода на два разных (для промптов и чата). Завершен Шаг 3 плана рефакторинга.
- [2025-05-04 15:30:00 UTC] Начат рефакторинг фронтенда на модули: переименован старый script.js в script_old_legacy.js, создан новый script.js, выполнена стандартизация UI в HTML/CSS (удалены несуществующие импорты, стандартизированы размеры и шрифты).
- [2025-05-01 19:00:00 UTC] Завершена базовая SEO-оптимизация: созданы/обновлены robots.txt, sitemap.xml и мета-теги в index.html. Требуется ручная регистрация в Google Search Console и Яндекс.Вебмастер.
- [2025-05-03 14:30:00 UTC] Создан Jenkinsfile с базовым CI-пайплайном, включая этап отправки логов в `/tria/save_logs`.
- [2025-05-03 14:35:00 UTC] Эндпоинт `/tria/save_logs` протестирован и работает корректно: `curl -X POST http://localhost:3000/tria/save_logs -H 'Content-Type: application/json' -d '{"status": "SUCCESS", "build_url": "http://jenkins.example.com/job/holograms-media/1", "timestamp": "2025-05-01T10:00:00.000Z"}'`
- [2025-05-03 10:45:00 UTC] Выполнен рефакторинг backend.py: перемещены импорты вверх, отложена инициализация LLM в startup_event для решения ошибки 405 Method Not Allowed.
- [2025-05-02 16:30:00 UTC] Исправлена инициализация Codestral LLM: используется `ChatMistralAI` вместо `ChatOpenAI`.
- [2025-05-02 16:35:00 UTC] Тестирование API эндпоинта `/tria/invoke` прошло успешно: `curl -X POST "http://localhost:3000/tria/invoke" -H "Content-Type: application/json" -d '{"query": "Привет, кто ты?"}'`

## Next Steps

- Следующий шаг рефакторинга фронтенда (Шаг 6):
  - Создать модуль speechInput.js для микрофонного ввода (Web Speech API) и обработки голосовых команд
  - Реализовать полноценное распознавание речи через Web Speech API для #micButton
  - Интегрировать распознавание голоса с существующей логикой отправки запросов
  - Создать модуль gestureRecognizer.js для работы с MediaPipe Hands
- Улучшения для модуля chatMessages.js:
  - Добавить сохранение истории чата в localStorage
  - Реализовать функционал для очистки истории
  - Добавить визуальные эффекты при озвучивании текста
- Ручная регистрация в Google Search Console и Яндекс.Вебмастер:
  - Создать аккаунты (если нет)
  - Добавить сайт holograms.media
  - Подтвердить права на сайт (через добавление мета-тега или файла)
  - Отправить sitemap.xml на индексацию
- Настроить Jenkins Job:
  - Создать Pipeline Job в Jenkins, указав путь до репозитория с Jenkinsfile
  - Настроить webhook в GitHub для автоматического запуска сборки
  - Обновить секцию Send Build Status в Jenkinsfile для корректной работы с MongoDB
