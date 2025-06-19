````markdown name=PROJECT_CONTEXT.md
# PROJECT_CONTEXT.md - Контекст Проекта "Голографические Медиа" (Версия 31.1)

Этот документ описывает текущий практический контекст и статус проекта "Голографические Медиа". Он должен рассматриваться в свете общей концепции и философии, изложенной в `docs/00_OVERVIEW_AND_CONTEXT/CONCEPT_AND_PHILOSOPHY.md`.

## Текущее Состояние Проекта

Проект "Голографические Медиа" находится в активной фазе разработки MVP (Minimum Viable Product).
*Последнее обновление: July 30, 2024*

**Ключевые компоненты и их статус:**
*   **Фронтенд:** Модульная структура на чистом JavaScript (ES6), размещенная на **Firebase Hosting**. Ведется работа по стабилизации UI и визуализации голограммы (Three.js/WebGL).
*   **Бэкенд API и Вычисления:** Основной бэкенд API реализован на **FastAPI (Python)** и развернут на **Koyeb**. Этот сервис отвечает за основную бизнес-логику, обработку запросов и взаимодействие с другими компонентами.
*   **Хранилище Файлов (Чанков):** **Cloudflare R2** используется для хранения медиа-"чанков" (аудио, видео). Загрузка файлов в R2 осуществляется через FastAPI бэкенд на Koyeb.
*   **База Данных:** **Neon.tech PostgreSQL** (с расширением pgvector) используется для хранения метаданных, пользовательской информации, истории взаимодействий и данных для AI Триа.
*   **Аутентификация:** **Firebase Authentication** интегрирована для управления пользователями и защиты API.
*   **Серверная Логика Триа и Вспомогательные Задачи:** Часть логики AI "Триа", обработка событий и другие вспомогательные задачи могут быть реализованы с использованием **Firebase Cloud Functions (Python)**, которые тесно интегрируются с Firebase Authentication и другими сервисами Firebase. FastAPI на Koyeb остается основной точкой входа для большинства операций API.
*   **AI "Триа" (MVP):** Базовая логика ответов Триа разрабатывается с использованием LLM API (Mistral, Google Gemini), оркестрация планируется через Genkit, интегрированный в бэкенд-инфраструктуру.

*Ссылка на детальный план MVP:* [ULTIMATE ROAD TO MVP JUNE 9](docs/05_PLANNING_AND_TASKS/ULTIMATE_ROAD_TO_MVP_JUNE_9.md) (Примечание: этот план может требовать актуализации в свете текущих дат и прогресса).

## Цели Текущей Итерации (MVP Sprint)

**Основные цели текущей итерации (адаптировано из [ULTIMATE ROAD TO MVP JUNE 9](docs/05_PLANNING_AND_TASKS/ULTIMATE_ROAD_TO_MVP_JUNE_9.md)):**
1.  **Завершение и демонстрация всех основных функций MVP:**
    *   Аутентификация пользователей (Firebase Authentication).
    *   Загрузка медиа-"чанков" (Cloudflare R2 через FastAPI на Koyeb).
    *   Базовая обработка "чанков" и ответы от Триа (преимущественно через FastAPI на Koyeb, с возможным использованием Firebase Cloud Functions для вспомогательных операций + LLM API).
    *   Аудио-реактивная визуализация голограммы на фронтенде (Firebase Hosting).
    *   Сохранение и базовое извлечение пользовательских данных и истории из Neon.tech PostgreSQL.
2.  **Стабилизация и тестирование** всего цикла MVP, включая взаимодействие FastAPI на Koyeb, Cloudflare R2, Firebase (Hosting, Auth, Functions) и Neon.tech.
3.  **Актуализация ключевой документации** (`README.md`, `SYSTEM_INSTRUCTION_CURRENT.md`, `SYSTEM_ARCHITECTURE.MD`) для отражения текущей архитектуры.
4.  Обеспечение работы в рамках **бесплатных или экономичных квот** используемых сервисов (Koyeb, Cloudflare R2, Firebase, Neon.tech).

## Ключевые Технические Вызовы и Задачи (MVP Focus)

*   **Стабилизация Фронтенда:** Обеспечение надежной работы аудио-реактивной визуализации и UI на Firebase Hosting.
*   **Надежность Бэкенда:** Тщательное тестирование FastAPI на Koyeb и любых используемых Firebase Cloud Functions, обработка ошибок, оптимизация производительности.
*   **Интеграция Сервисов:** Бесшовная и безопасная работа всех компонентов: FastAPI на Koyeb, Cloudflare R2, Firebase Authentication, Firebase Hosting, Firebase Cloud Functions (если используются для основной логики), и Neon.tech PostgreSQL.
*   **Работа с Neon.tech PostgreSQL:** Эффективное использование pgvector (если применимо для MVP RAG), оптимизация запросов.
*   **Безопасность:** Корректная настройка правил безопасности Firebase, защита API-эндпоинтов (Cloud Functions и FastAPI).
*   **AI-Логика Триа для MVP:** Эффективный промпт-инжиниринг для прямых вызовов LLM, управление задержками.

Полный список задач и их статус отслеживаются в [GitHub Issues](https://github.com/NeuroCoderZ/holograms.media/issues) и [GitHub Projects](https://github.com/NeuroCoderZ/holograms.media/projects).

## Последние Ключевые Изменения и Прогресс (Фокус на Firebase MVP)

*   **[Дата] Перевод Системной Инструкции на Firebase:** Документ `SYSTEM_INSTRUCTION_CURRENT.md` (v31.0) полностью обновлен для отражения Firebase-архитектуры, инструментов и планов MVP.
*   **[Дата] Обновление Архитектуры Системы:** Документ `SYSTEM_ARCHITECTURE.md` актуализирован, описывая потоки данных и компоненты в контексте Firebase Cloud Functions, Neon.tech и др.
*   **[Дата] Утверждение Плана MVP:** Документ `ULTIMATE_ROAD_TO_MVP_JUNE_9.md` принят как основной операционный план.
*   **[Дата] Настройка Firebase Проекта:** Создан и сконфигурирован проект Firebase (Hosting, Functions, Auth, Storage).
*   **[Дата] Первичная реализация Cloud Functions:** Разработаны первые Cloud Functions для аутентификации и обработки чанков.
*   **[Дата] Интеграция Cloudflare R2:** Добавлен FastAPI эндпоинт в `backend/app.py` для загрузки чанков в Cloudflare R2, развернуто на Koyeb. Соответствующая документация обновлена.
*   (Раздел будет пополняться по мере выполнения задач из MVP-плана)

## Архитектура и Модули (Кратко)

Проект использует модульную структуру, адаптированную для текущего технологического стека.
*   **Бэкенд (Основной - FastAPI на Koyeb; Вспомогательный - Firebase Cloud Functions):**
    *   **FastAPI (Koyeb):** Основная бизнес-логика, API эндпоинты, обработка чанков, загрузка в Cloudflare R2 (`backend/app.py`).
    *   **Firebase Cloud Functions:** Могут использоваться для задач, тесно связанных с Firebase (например, триггеры Auth, специфические уведомления Firebase), или для части логики Триа, если это целесообразно.
    *   **Общая логика:** Модули в `backend/core/` (для работы с БД Neon.tech, LLM API, бизнес-логика ботов Триа).
    *   **База данных:** Neon.tech PostgreSQL с pgvector.
    *   **Аутентификация:** Firebase Authentication (проверка токенов на бэкенде).
    *   **Хранилище файлов (чанков):** Cloudflare R2.
*   **Фронтенд (Firebase Hosting):**
    *   Чистый JavaScript (ES6 Modules), HTML5, CSS3.
    *   `frontend/js/main.js` как точка входа.
    *   `frontend/js/core/`: Ядро фронтенда (состояние, события).
    *   `frontend/js/3d/`: Three.js/WebGL для визуализации.
    *   `frontend/js/services/`: Взаимодействие с FastAPI на Koyeb (через `apiService.js`) и Firebase (Auth).
    *   `frontend/js/ui/`: UI-компоненты и менеджеры.
    *   `frontend/js/audio/`: Web Audio API.

Более детально архитектура описана в [SYSTEM_ARCHITECTURE.MD](docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md) и [MODULE_CATALOG.MD](docs/01_ARCHITECTURE/MODULE_CATALOG.md).
Ключевые аспекты текущей реализации и планы зафиксированы в [SYSTEM_INSTRUCTION_CURRENT.md](docs/03_SYSTEM_INSTRUCTIONS_AI/SYSTEM_INSTRUCTION_CURRENT.md).

## СЛЕДУЮЩИЕ ШАГИ (MVP)

1.  **Завершение разработки всех функций MVP** согласно [ULTIMATE_ROAD_TO_MVP_JUNE_9.md](docs/05_PLANNING_AND_TASKS/ULTIMATE_ROAD_TO_MVP_JUNE_9.md).
2.  **Комплексное тестирование** всей системы: Frontend на Firebase Hosting, Backend на Koyeb, Cloudflare R2, Neon.tech DB, Firebase Auth и Functions.
3.  **Отладка и оптимизация** для обеспечения стабильной работы MVP.
4.  **Подготовка демонстрационных материалов** и финальной версии `README.md`.
5.  **Проверка соответствия** всем "Definition of Done" для MVP.

## Среда Разработки и Развертывания

*   **Основная IDE:** Firebase Studio (Project IDX) или VS Code.
*   **Локальная разработка/тестирование:** Firebase Local Emulator Suite (для Hosting, Auth, Functions), локальный запуск FastAPI.
*   **Удаленный репозиторий:** GitHub (`github.com/NeuroCoderZ/holograms.media`).
*   **CI/CD:** GitHub Actions для автоматического развертывания на Firebase Hosting и Koyeb.
*   **Продакшн (MVP):**
    *   Frontend: Firebase Hosting.
    *   Backend (API, основная логика): FastAPI на Koyeb (Python).
    *   Backend (вспомогательные задачи/триггеры Firebase): Firebase Cloud Functions (Python).
    *   Database: Neon.tech PostgreSQL.
    *   Storage (чанков): Cloudflare R2.
    *   Authentication: Firebase Authentication.

## Команда

*   **НейроКодер (Александр):** Руководитель проекта, основной разработчик, архитектор системы, постановщик задач.
*   **AI-ассистенты (Gemini, Claude, Copilot Chat и др.):** Инструменты для генерации кода, анализа, рефакторинга и обновления документации, используемые НейроКодером.
*   **(Возможно) Jules:** Консультант по аудио подсистеме (концептуально, если его наработки используются).

---

*Последнее обновление: July 30, 2024*
````