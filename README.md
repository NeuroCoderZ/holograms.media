---
title: Holograms Media
emoji: ✴️
colorFrom: gray  # Темно-серый (допустимое значение: gray)
colorTo: purple  # Сине-фиолетовый (BlueViolet) - близко к чистому фиолетовому (допустимое значение: purple)
sdk: docker
app_file: app.py
app_port: 7860
pinned: false
license: mit
---


# Holograms Media (holograms.media)

**Интерактивные 3D Аудиовизуализации с AI-Ассистентом "Триа".**

[![Status](https://img.shields.io/badge/status-alpha_development-orange.svg)](https://github.com/NeuroCoderZ/holograms.media)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub issues](https://img.shields.io/github/issues/NeuroCoderZ/holograms.media.svg)](https://GitHub.com/NeuroCoderZ/holograms.media/issues/)
[![GitHub stars](https://img.shields.io/github/stars/NeuroCoderZ/holograms.media.svg)](https://GitHub.com/NeuroCoderZ/holograms.media/stargazers/)

**Live Demo (Экспериментальное развертывание):** [https://huggingface.co/spaces/NeuroCoderZ/holograms-media](https://huggingface.co/spaces/NeuroCoderZ/holograms-media)
**(Целевой домен: https://holograms.media - в процессе настройки)**

## 🌟 Обзор Проекта

**Holograms Media** — это open-source (MIT License) исследовательская и девелоперская платформа, нацеленная на создание новой парадигмы человеко-машинной и человеко-человеческой коммуникации. В основе лежит интерактивное взаимодействие с динамическими **3D-аудиовизуализациями ("голограммами")** звука и, в перспективе, других форм информации.

**Ключевые особенности и долгосрочные цели:**

*   **Мультимодальный интерфейс:** Управление через жесты (включая РЖЯ/ASL, кастомные системы, акустическую локацию), голос, мимику и биометрию.
*   **AI-Ассистент "Триа":** Эволюционирующий AI ("Триа соберет себя сама"), помогающий в творчестве, анализе и взаимодействии, обучающийся на принципах "медленного обучения".
*   **Высокоточная аудиовизуализация:** Переход к вейвлет-анализу (130+ полутонов) и WebAssembly для производительности.
*   **Новый язык коммуникации:** Создание интуитивных аудиовизуальных и жестовых паттернов, минимизируя текстовую информацию.
*   **Иммерсивность:** Глубокая интеграция с WebXR и WebGPU.
*   **Децентрализация (R&D):** Исследование концепции **"ГолоГраф"** (ранее "Инфокойн") для токеномики, "жестового/интеллектуального майнинга" и экономики внимания.

Мы верим в силу открытого исходного кода и совместной разработки для построения будущего, где технологии расширяют границы человеческого восприятия.

## Project Structure Overview

This project is organized into several key top-level directories, reflecting its modular architecture and long-term vision:

-   **`/frontend`**: Contains all client-side code for the Holographic Media application. This includes the user interface (UI), 3D rendering pipelines (including WebGL, WebGPU, and WebXR placeholders), audio processing, and multimodal input handling (gestures, voice).
-   **`/backend`**: Houses the server-side application built with FastAPI. It includes API endpoints, data models, database interaction layers (PostgreSQL with pgvector), and the core logic for the "Tria" AI assistant bot network.
-   **`/nethologlyph`**: Dedicated to the "NetHoloGlyph" protocol, defining data structures and communication mechanisms for exchanging holographic symbols, gestural commands, and Tria AI states between clients and the server, or peer-to-peer.
-   **`/holograph`**: Contains all components related to the "HoloGraph" decentralized economy. This includes smart contracts (e.g., for the HoloGraph Token (HGT) and DAO governance), tokenomics documentation, and concepts for "intellectual mining."
-   **`/research`**: A directory for research and development into future technologies that are part of the project's long-term vision. This includes explorations into neurointerface integration, neuromorphic computing for AI tasks, and quantum algorithms for specific computational challenges.

Each of these directories contains its own `README.md` with more detailed information about its specific structure and purpose.

## 🚀 Текущий Статус (Версия ~0.1.8 - Alpha, коммит `41be695` или новее)

Проект находится в активной стадии разработки и стабилизации базового функционала.

*   **Backend (`app.py`):** FastAPI (Python), LLM (Mistral API через ChatMistralAI) инициализируется, эндпоинт `/chat` работает и сохраняет историю в MongoDB Atlas. Заглушка для `/api/chat_history` добавлена.
*   **Frontend:** JavaScript (ES6 Modules), Three.js. Основные JS-файлы загружаются без 404. **Критическая ошибка `Uncaught TypeError: Assignment to constant variable` в `script.js` (строка ~1139) блокирует отображение голограммы.** Идет активный рефакторинг `script.js` на модули.
*   **Развертывание:** Hugging Face Spaces (Docker).

**Основные работающие компоненты:**
*   Бэкенд полностью функционален для чата с Триа и сохранения истории.
*   Фронтенд загружается, базовый UI (панели, некоторые кнопки) частично работает.
*   Кнопка скрытия/показа панелей работает.
*   Кнопка "Чат" не переключает вид из-за JS ошибки.

**Ближайшие цели (Приоритеты):**
1.  **КРИТИЧНО:** Устранить ошибку `TypeError: Assignment to constant variable` в `script.js`.
2.  **РЕФАКТОРИНГ `script.js`:** Продолжить вынос UI-логики в `uiManager.js` и логики Three.js в `sceneSetup.js`.
3.  Восстановить работоспособность кнопки "Чат".
4.  Исправить логику кнопки "Триа" и URL для `/tria/invoke`.
5.  Уменьшить избыточный вывод `console.log`.

Полный список задач: [GitHub Issues](https://github.com/NeuroCoderZ/holograms.media/issues) и [Projects](https://github.com/NeuroCoderZ/holograms.media/projects).

## 🛠 Технологический Стек (Ключевые)

*   **Бэкенд:** Python 3.12, FastAPI, Uvicorn, Motor, LangChain, `langchain-mistralai`.
*   **Фронтенд:** JavaScript (ES6 Modules), Three.js, Web Audio API, Web Speech API, HTML5, CSS3.
*   **База данных:** MongoDB Atlas.
*   **AI Модели:** Mistral API.
*   **Инструменты разработки:** Trae IDE (Claude 3.x, Gemini 2.5 Pro), Git, GitHub.
*   **Целевые/R&D:** WebAssembly, Вейвлеты, WebXR/WebGPU, TypeScript, React/Vue/Svelte, PyTorch, Векторные БД, Kubernetes, Блокчейн "ГолоГраф".

## 🏁 Начало Работы (Локальная Разработка)

1.  **Клонируйте репозиторий:**
    ```bash
    git clone https://github.com/NeuroCoderZ/holograms.media.git
    cd holograms.media
    ```
2.  **Настройте виртуальное окружение Python** (3.12+):
    ```bash
    python -m venv venv
    # Windows: venv\Scripts\activate | macOS/Linux: source venv/bin/activate
    ```
3.  **Установите зависимости:** `pip install -r requirements.txt`
4.  **Создайте `.env` файл** в корне с вашими `MONGO_URI` и `MISTRAL_API_KEY`.
    ```env
    MONGO_URI="mongodb+srv://<user>:<password>@<cluster>/holograms_db?retryWrites=true&w=majority&appName=Cluster0"
    MISTRAL_API_KEY="sk-yourkey"
    # CODESTRAL_API_KEY="yourkey" # (Если есть)
    # DEFAULT_MODEL="mistral-small-latest"
    ```
5.  **Разрешите доступ вашему IP в MongoDB Atlas Network Access List.**
6.  **Запустите сервер:** `uvicorn app:app --host 0.0.0.0 --port 8000 --reload`
7.  Откройте `http://localhost:8000`.

## 🤝 Участие в Проекте

Мы приветствуем вклад! Ознакомьтесь с [Issues](https://github.com/NeuroCoderZ/holograms.media/issues), создайте форк, ветку и Pull Request.

## 📜 Лицензия

MIT License - см. [LICENSE](LICENSE).

## 📞 Контакты

*   Telegram-чат проекта: [https://t.me/+WjtL4ipr-yljNGRi](https://t.me/+WjtL4ipr-yljNGRi)
*   Telegram-канал проекта: [https://t.me/+-AixvGk1dGdiZTAy](https://t.me/+-AixvGk1dGdiZTAy)

---
P.S. Этот README.md активно обновляется. Следите за изменениями!