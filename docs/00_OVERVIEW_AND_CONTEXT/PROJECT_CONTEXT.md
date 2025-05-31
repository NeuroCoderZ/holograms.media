````markdown name=PROJECT_CONTEXT.md
# PROJECT_CONTEXT.md - Контекст Проекта "Голографические Медиа" (Версия 31.0)

## Текущее Состояние Проекта (Акцент на Firebase MVP)

Проект "Голографические Медиа" находится в активной фазе разработки MVP (Minimum Viable Product) с использованием экосистемы Google Cloud/Firebase. Основные усилия направлены на реализацию ключевых функций, описанных в [ULTIMATE ROAD TO MVP JUNE 9](docs/05_PLANNING_AND_TASKS/ULTIMATE_ROAD_TO_MVP_JUNE_9.md).

**Ключевые компоненты и их статус:**
*   **Инфраструктура:** Полностью развернута на Firebase (Hosting, Cloud Functions, Authentication, Storage) и Neon.tech (PostgreSQL с pgvector).
*   **Бэкенд:** Логика реализуется как набор Firebase Cloud Functions (Python), расположенных в `backend/` (основной файл `main.py` или поддиректория `cloud_functions/`) с общей логикой в `backend/core/`.
*   **Фронтенд:** Модульная структура на чистом JavaScript (ES6), размещенная на Firebase Hosting. Ведется работа по стабилизации UI и визуализации голограммы (Three.js/WebGL).
*   **Аутентификация:** Firebase Authentication интегрирована для управления пользователями.
*   **Хранение Данных:** Firebase Storage для медиа-"чанков", Neon.tech PostgreSQL для метаданных, пользовательской информации и данных Триа.
*   **AI "Триа" (MVP):** Базовая логика ответов реализуется в Cloud Functions с прямыми вызовами LLM API (Mistral, Google Gemini). Планируется переход на Genkit для оркестрации.

## Цели Текущей Итерации (MVP Sprint)

**Основные цели текущей итерации (согласно [ULTIMATE ROAD TO MVP JUNE 9](docs/05_PLANNING_AND_TASKS/ULTIMATE_ROAD_TO_MVP_JUNE_9.md)):**
1.  **Завершение и демонстрация всех основных функций MVP:**
    *   Аутентификация пользователей (Firebase Authentication).
    *   Загрузка медиа-"чанков" (Firebase Storage, триггеры Cloud Functions).
    *   Базовая обработка "чанков" и ответы от Триа (Cloud Functions + LLM API).
    *   Аудио-реактивная визуализация голограммы на фронтенде (Firebase Hosting).
    *   Сохранение и базовое извлечение пользовательских данных и истории из Neon.tech PostgreSQL.
2.  **Стабилизация и тестирование** всего цикла MVP на платформе Firebase.
3.  **Актуализация ключевой документации** (`README.md`, `SYSTEM_INSTRUCTION_CURRENT.md`, `SYSTEM_ARCHITECTURE.md`) для отражения Firebase-архитектуры.
4.  Обеспечение работы в рамках **бесплатных квот** Firebase и Neon.tech без необходимости привязки банковской карты.

## Ключевые Технические Вызовы и Задачи (MVP Focus)

*   **Стабилизация Фронтенда:** Обеспечение надежной работы аудио-реактивной визуализации и UI на Firebase Hosting.
*   **Надежность Firebase Cloud Functions:** Тщательное тестирование функций, обработка ошибок, оптимизация "холодных стартов" где это критично для UX.
*   **Интеграция Сервисов Firebase:** Бесшовная и безопасная работа Firebase Authentication, Storage, Hosting и Cloud Functions.
*   **Работа с Neon.tech PostgreSQL:** Эффективное использование pgvector (если применимо для MVP RAG), оптимизация запросов из Cloud Functions.
*   **Безопасность:** Корректная настройка правил безопасности Firebase (Storage, Firestore/PostgreSQL доступ из Cloud Functions), защита Cloud Functions API-эндпоинтов.
*   **AI-Логика Триа для MVP:** Эффективный промпт-инжиниринг для прямых вызовов LLM, управление задержками.

Полный список задач и их статус отслеживаются в [GitHub Issues](https://github.com/NeuroCoderZ/holograms.media/issues) и [GitHub Projects](https://github.com/NeuroCoderZ/holograms.media/projects).

## Последние Ключевые Изменения и Прогресс (Фокус на Firebase MVP)

*   **[Дата] Перевод Системной Инструкции на Firebase:** Документ `SYSTEM_INSTRUCTION_CURRENT.md` (v31.0) полностью обновлен для отражения Firebase-архитектуры, инструментов и планов MVP.
*   **[Дата] Обновление Архитектуры Системы:** Документ `SYSTEM_ARCHITECTURE.md` актуализирован, описывая потоки данных и компоненты в контексте Firebase Cloud Functions, Neon.tech и др.
*   **[Дата] Утверждение Плана MVP:** Документ `ULTIMATE_ROAD_TO_MVP_JUNE_9.md` принят как основной операционный план.
*   **[Дата] Настройка Firebase Проекта:** Создан и сконфигурирован проект Firebase (Hosting, Functions, Auth, Storage).
*   **[Дата] Первичная реализация Cloud Functions:** Разработаны первые Cloud Functions для аутентификации и обработки чанков.
*   (Раздел будет пополняться по мере выполнения задач из MVP-плана)

## Архитектура и Модули (Кратко – Firebase MVP)

Проект использует модульную структуру, адаптированную для Firebase.
*   **Бэкенд (Firebase Cloud Functions):**
    *   **Функции:** Логика размещена в `backend/main.py` или в отдельных файлах в `backend/cloud_functions/`.
    *   **Общая логика:** Модули в `backend/core/` (для работы с БД Neon.tech, LLM API, бизнес-логика ботов Триа).
    *   **База данных:** Neon.tech PostgreSQL с pgvector.
    *   **Аутентификация:** Firebase Authentication.
    *   **Хранилище файлов:** Firebase Storage.
*   **Фронтенд (Firebase Hosting):**
    *   Чистый JavaScript (ES6 Modules), HTML5, CSS3.
    *   `frontend/js/main.js` как точка входа.
    *   `frontend/js/core/`: Ядро фронтенда (состояние, события).
    *   `frontend/js/3d/`: Three.js/WebGL для визуализации.
    *   `frontend/js/services/`: Взаимодействие с Firebase (Auth, Storage, Cloud Functions через `apiService.js`).
    *   `frontend/js/ui/`: UI-компоненты и менеджеры.
    *   `frontend/js/audio/`: Web Audio API.

Более детально архитектура описана в [SYSTEM_ARCHITECTURE.md](docs/01_ARCHITECTURE/SYSTEM_ARCHITECTURE.md) и [MODULE_CATALOG.md](docs/01_ARCHITECTURE/MODULE_CATALOG.md).
Ключевые аспекты текущей реализации и планы зафиксированы в [SYSTEM_INSTRUCTION_CURRENT.md](docs/03_SYSTEM_INSTRUCTIONS_AI/SYSTEM_INSTRUCTION_CURRENT.md).

## СЛЕДУЮЩИЕ ШАГИ (MVP)

1.  **Завершение разработки всех функций MVP** согласно [ULTIMATE_ROAD_TO_MVP_JUNE_9.md](docs/05_PLANNING_AND_TASKS/ULTIMATE_ROAD_TO_MVP_JUNE_9.md).
2.  **Комплексное тестирование** на Firebase Local Emulator Suite и в облачной среде Firebase.
3.  **Отладка и оптимизация** для обеспечения стабильной работы MVP.
4.  **Подготовка демонстрационных материалов** и финальной версии `README.md`.
5.  **Проверка соответствия** всем "Definition of Done" для MVP.

## Среда Разработки и Развертывания (Firebase Ecosystem)

*   **Основная IDE:** Firebase Studio (Project IDX).
*   **Локальная разработка/тестирование:** Firebase Local Emulator Suite.
*   **Удаленный репозиторий:** GitHub (`github.com/NeuroCoderZ/holograms.media`).
*   **CI/CD:** GitHub Actions для автоматического развертывания на Firebase Hosting и Firebase Cloud Functions.
*   **Продакшн (MVP):**
    *   Frontend: Firebase Hosting.
    *   Backend: Firebase Cloud Functions (Python).
    *   Database: Neon.tech PostgreSQL.
    *   Storage: Firebase Storage.

## Команда

*   **НейроКодер (Александр):** Руководитель проекта, основной разработчик, архитектор системы, постановщик задач.
*   **AI-ассистенты (Gemini, Claude, Copilot Chat и др.):** Инструменты для генерации кода, анализа, рефакторинга и обновления документации, используемые НейроКодером.
*   **(Возможно) Jules:** Консультант по аудио подсистеме (концептуально, если его наработки используются).

---

*Последнее обновление: 09 Июля 2024 г.*
````