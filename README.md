---
title: Holograms Media
emoji: ✴️
colorFrom: indigo
colorTo: blue
sdk: docker # или gradio, если используется напрямую, но Dockerfile указывает на FastAPI
app_file: app.py
app_port: 7860 # Порт, который слушает Uvicorn внутри контейнера Docker
pinned: false
license: mit
---

# Holograms Media (holograms.media)

**Interactive 3D Audio Visualizations with AI Assistant Tria.**

[![Status](https://img.shields.io/badge/status-alpha_development-orange.svg)](https://github.com/NeuroCoderZ/holograms.media)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/NeuroCoderZ/holograms.media.svg)](https://GitHub.com/NeuroCoderZ/holograms.media/issues/)
[![GitHub stars](https://img.shields.io/github/stars/NeuroCoderZ/holograms.media.svg)](https://GitHub.com/NeuroCoderZ/holograms.media/stargazers/)

**Live Demo (Experimental):** [https://huggingface.co/spaces/NeuroCoderZ/holograms-media](https://huggingface.co/spaces/NeuroCoderZ/holograms.media)
**(Target Domain: https://holograms.media - In Progress)**

## 🌟 Обзор Проекта

**Holograms Media** — это open-source (MIT License) исследовательская и девелоперская платформа, нацеленная на создание новой парадигмы человеко-машинной и человеко-человеческой коммуникации. В основе лежит интерактивное взаимодействие с динамическими **3D-аудиовизуализациями ("голограммами")** звука.

**Ключевые особенности и цели:**

*   **Мультимодальный интерфейс:** Управление через жесты, голос и, в перспективе, биометрию.
*   **AI-Ассистент "Триа":** Эволюционирующий AI, стремящийся к саморазвитию ("Триа соберет себя сама") для помощи в творчестве, анализе и взаимодействии.
*   **Высокоточная аудиовизуализация:** Переход к вейвлет-анализу и WebAssembly для детализированного представления звука (130+ полутонов).
*   **Новый язык коммуникации:** Разработка интуитивных аудиовизуальных и жестовых паттернов.
*   **Иммерсивность:** Планируется глубокая интеграция с WebXR/WebGPU.
*   **Децентрализация (R&D):** Исследование концепции "Инфокойн" для токеномики и экономики внимания.

Мы верим в силу открытого исходного кода и совместной разработки для построения будущего, где технологии расширяют границы человеческого восприятия.

## 🚀 Текущий Статус (Версия ~0.1.x - Alpha)

Проект находится в активной стадии разработки и экспериментов.

*   **Backend:** FastAPI (Python) с подключением к MongoDB Atlas и интеграцией LLM (Mistral API).
*   **Frontend:** JavaScript, Three.js для 3D-визуализации. Идет активный рефакторинг на модульную структуру.
*   **Развертывание:** Hugging Face Spaces (Docker).

**Основные работающие компоненты (на момент последнего обновления README):**
*   Базовая 3D-визуализация (пирамида) отображается.
*   Интеграция с LLM "Триа" для чата работает, история сохраняется в MongoDB.
*   Некоторые элементы UI (кнопки управления панелями) функционируют.

**Ближайшие цели:**
1.  Завершение стабилизации фронтенда (устранение JS ошибок, восстановление работы всех UI элементов).
2.  Начало активного рефакторинга `script.js` на модули.
3.  Реализация базового каркаса для области жестов (Issue #11).
4.  Улучшение UI/UX (скроллинг чата и т.д.).

Полный список задач и их статус можно посмотреть на [доске проекта GitHub Projects](https://github.com/NeuroCoderZ/holograms.media/projects) и в разделе [Issues](https://github.com/NeuroCoderZ/holograms.media/issues).

## 🛠 Технологический Стек

*   **Бэкенд:** Python 3.12, FastAPI, Uvicorn, Motor (MongoDB async driver), LangChain, `langchain-mistralai`.
*   **Фронтенд:** JavaScript (ES6 Modules), Three.js, Web Audio API, Web Speech API, HTML5, CSS3.
*   **База данных:** MongoDB Atlas.
*   **Развертывание:** Docker, Hugging Face Spaces (Gradio SDK используется для запуска).
*   **AI Модели:** Mistral API (через `ChatMistralAI`).
*   **Инструменты разработки:** Trae IDE (Claude 3.x, Gemini 2.5 Pro), Git, GitHub.
*   **Целевые/R&D технологии:** WebAssembly, Вейвлет-анализ, WebXR, WebGPU, TypeScript, React/Vue/Svelte, PyTorch, Векторные БД, Kubernetes, Блокчейн.

## 🏁 Начало Работы (Локальная Разработка)

1.  **Клонируйте репозиторий:**
    ```bash
    git clone https://github.com/NeuroCoderZ/holograms.media.git
    cd holograms.media
    ```
2.  **Настройте виртуальное окружение Python** (рекомендуется Python 3.12+):
    ```bash
    python -m venv venv
    # Windows
    venv\Scripts\activate
    # macOS/Linux
    source venv/bin/activate
    ```
3.  **Установите зависимости Python:**
    ```bash
    pip install -r requirements.txt
    ```
4.  **Создайте файл `.env`** в корне проекта и добавьте в него необходимые секреты:
    ```env
    MONGO_URI="mongodb+srv://<username>:<password>@<your_atlas_cluster_url>/holograms_db?retryWrites=true&w=majority&appName=Cluster0"
    MISTRAL_API_KEY="sk-your_mistral_api_key"
    # CODESTRAL_API_KEY="your_codestral_api_key" # Если используется отдельно
    # DEFAULT_MODEL="mistral-small-latest" # Можно переопределить модель по умолчанию
    ```
    Замените `<...>` на ваши реальные значения. `MONGO_DB_NAME` по умолчанию `holograms_db`.
5.  **Убедитесь, что ваш IP-адрес добавлен в Network Access List вашего кластера MongoDB Atlas.**
6.  **Запустите FastAPI сервер локально:**
    ```bash
    uvicorn app:app --host 0.0.0.0 --port 8000 --reload
    ```
7.  Откройте в браузере `http://localhost:8000`.

## 🤝 Участие в Проекте (Contributing)

Мы приветствуем контрибьюторов! Если вы заинтересованы в участии:
1.  Ознакомьтесь с открытыми задачами в разделе [Issues](https://github.com/NeuroCoderZ/holograms.media/issues).
2.  Создайте форк репозитория.
3.  Создайте новую ветку для вашей фичи или исправления (`git checkout -b feature/AmazingFeature` или `fix/SomeBug`).
4.  Внесите изменения и сделайте коммиты.
5.  Создайте Pull Request в основную ветку `main`.

Пожалуйста, следуйте принятому стилю кода и оставляйте осмысленные сообщения коммитов.

## 📜 Лицензия

Этот проект лицензирован под лицензией MIT - см. файл [LICENSE](LICENSE) для подробностей.

## 📞 Контакты

*   Telegram-чат проекта: https://t.me/+WjtL4ipr-yljNGRi

---
P.S. Этот README.md будет регулярно обновляться по мере развития проекта.
