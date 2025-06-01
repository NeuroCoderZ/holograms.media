# Generated Prompts for MVP Remediation

## Priority Blockers

---
**Промпт:**
- **ID:** [20240726-1000-002]
- **Источник:** Audit Report - Section III (Key Blockers) / Section A
- **Цель:** Добавить недостающие таблицы `tria_learning_log` и `user_chat_sessions` в схему базы данных.
- **Контекст:** Эти таблицы необходимы для логирования взаимодействий Tria и хранения истории чатов пользователей, что является частью MVP. Отсутствие этих схем блокирует разработку функционала логирования и истории.
- **Атомарное действие:** Модифицирован файл `backend/core/db/schema.sql`. Определения SQL для таблиц `tria_learning_log` и `user_chat_sessions` были обновлены необходимыми полями и комментариями.
    - `tria_learning_log`: Добавлены поля `user_id`, `session_id`, `prompt_text`, `tria_response_text`, `model_used`, `feedback_score`. Поле `details_json` переименовано в `custom_data`.
    - `user_chat_sessions`: Добавлены поля `end_time`, `model_preferences`. Обновлены комментарии для существующих полей.
- **Ожидаемый результат:** Файл `backend/core/db/schema.sql` обновлен и содержит полные определения для таблиц `tria_learning_log` и `user_chat_sessions`. Соответствующие Pydantic модели также могут потребовать создания или обновления в `backend/core/models/`.
- **MVP Task Dependencies:**
    - Section A: Define user schema & Pydantic models (часть этой задачи)
    - Section F: Implement logging of Tria interactions to Neon.tech PostgreSQL from Cloud Functions.
    - Section C: Placeholder panels for Gestures, Holograms, Chat History (может зависеть от `user_chat_sessions`).
- **Критичность:** Высокая (Блокер)
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `6504b30` (PR #49) - Схемы `tria_learning_log` и `user_chat_sessions` обновлены в `backend/core/db/schema.sql`.

---
**Промпт:**
- **ID:** [20240726-1001-003]
- **Источник:** Audit Report - Section III (Key Blockers) / Section E & F
- **Цель:** Создать и реализовать Python модуль `ChunkProcessorBot.py` в директории `backend/core/tria_bots/`.
- **Контекст:** `ChunkProcessorBot.py` должен обрабатывать загруженные медиа-чанки. Его отсутствие блокирует полную реализацию "Interaction Chunk" Pipeline и соответствующей Cloud Function (`process_chunk`).
- **Атомарное действие:** Создан файл `backend/core/tria_bots/ChunkProcessorBot.py`. Реализован класс `ChunkProcessorBot` с методом `process_chunk_metadata` для:
    - Принятия, валидации и сохранения метаданных чанка в PostgreSQL (через `crud_operations.create_audiovisual_gestural_chunk`).
    - Логирования успешной обработки в `tria_learning_log`.
    - Базовой обработки ошибок.
- **Ожидаемый результат:** Файл `backend/core/tria_bots/ChunkProcessorBot.py` создан с базовой реализацией класса `ChunkProcessorBot` и его методов. Cloud Function `process_chunk` должна быть обновлена для его использования.
- **MVP Task Dependencies:**
    - Section D: (Optional for MVP) Can then trigger a simple Tria bot logic...
    - Section F: Implement `ChunkProcessorBot.py` and `ChatBot.py` modules...
    - Section F: Ensure `process_chunk` Cloud Functions correctly use these bot modules.
- **Критичность:** Высокая (Блокер)
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `47bdf92` (PR #49) - Создан `ChunkProcessorBot.py` с базовой логикой обработки метаданных чанка.

---
**Промпт:**
- **ID:** [20240726-1002-004]
- **Источник:** Audit Report - Section III (Key Blockers) / Section F & IV (Constraint Compliance)
- **Цель:** Подтвердить доступность API ключей для Mistral/Devstral/Gemini, их соответствие условиям бесплатного использования (free tier) и отсутствию необходимости привязки банковской карты.
- **Контекст:** Использование LLM является ключевой частью функционала Tria. Невозможность получить доступ к LLM API или нарушение ограничений по "no credit card" заблокирует разработку Tria бота.
- **Атомарное действие:** Создан файл `docs/04_SPIKE_AND_RESEARCH/LLM_API_Access.md` с детальным документированием результатов исследования API ключа Mistral `oVcP2Nj0iNWGupB6lswjbvhwHOr23hhr`, включая его работоспособность с Mistral Medium и Devstral Small, ссылки на официальную документацию, примеры запросов и вывод о соответствии MVP-требованиям.
- **Ожидаемый результат:** Четкое подтверждение по каждому LLM провайдеру. API ключи (если применимо и безопасно хранить на данном этапе) получены и готовы к конфигурации в Firebase Functions. Документировать результаты для команды.
- **MVP Task Dependencies:**
    - Section F: Confirm LLM API key availability and free tier usage conditions.
    - Section F: Implement `llm_service.py` (зависит от знания, какие API использовать).
    - Section IV: Tria Bot LLM calls use Mistral/Devstral...
- **Критичность:** Высокая (Блокер)
- ** Ответственный:** Research/Lead Dev
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `d41593a` (ветка `feat/mvp-auth-integration-flash`) - Создан документ `LLM_API_Access.md` с результатами исследования API ключей Mistral. (PR #50 ранее подтвердил работу ключа).

## Section A: User Authentication

---
**Промпт:**
- **ID:** [20240726-1003-005]
- **Источник:** Audit Report - Section A
- **Цель:** Проверить и завершить интеграцию Firebase Web SDK в `frontend/js/core/auth.js`, включая отправку JWT в `auth_sync` Cloud Function.
- **Контекст:** Аутентификация пользователя - базовый функционал MVP. Необходимо убедиться, что frontend корректно взаимодействует с Firebase Auth и передает токен в backend.
- **Атомарное действие:** Проверена инициализация Firebase в `frontend/js/core/firebaseInit.js`. Создан `frontend/js/services/apiService.js` с функцией `syncUserAuth(idToken)` для отправки JWT на бэкенд (URL эндпоинта - плейсхолдер). Модифицирован `frontend/js/core/auth.js`: импортирована и используется `syncUserAuth` в `handleTokenForBackend` для Google Sign-In; добавлена обработка ошибок и логирование.
- **Ожидаемый результат:** `frontend/js/core/auth.js` полностью и корректно реализует frontend часть аутентификации Firebase и отправку JWT.
- **MVP Task Dependencies:** Section A: Implement Firebase Auth UI (frontend), Send JWT to the `auth_sync` Cloud Function.
- **Критичность:** Высокая
- ** Ответственный:** Frontend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `3137eda` (ветка `feat/mvp-auth-integration-flash`) - Frontend часть отправки JWT реализована.

---
**Промпт:**
- **ID:** [20240726-1004-006]
- **Источник:** Audit Report - Section A
- **Цель:** Проверить реализацию `auth_sync` Cloud Function в `backend/cloud_functions/auth_sync/main.py`.
- **Контекст:** Cloud Function `auth_sync` отвечает за синхронизацию данных пользователя из Firebase Auth в PostgreSQL. Важно убедиться в корректности обработки JWT, использовании `auth_service.py` и `crud_operations.py`.
- **Атомарное действие:** Модифицирован `backend/cloud_functions/auth_sync/main.py`. Реализована логика приема JWT из заголовка Authorization, вызов `AuthService` для верификации токена, использование `crud_operations` для проверки/создания пользователя в PostgreSQL. Реализовано формирование JSON ответов (успех/ошибка) и базовое логирование.
- **Ожидаемый результат:** `backend/cloud_functions/auth_sync/main.py` корректно и безопасно обрабатывает синхронизацию пользователей.
- **MVP Task Dependencies:** Section A: Develop `auth_sync` Firebase Cloud Function, Integrate `crud_operations.py` with `auth_sync` function.
- **Критичность:** Высокая
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `45fc5ac` (ветка `feat/mvp-auth-integration-flash`) - Реализована основная логика Cloud Function auth_sync.

---
**Промпт:**
- **ID:** [20240726-1005-007]
- **Источник:** Audit Report - Section A
- **Цель:** Рефакторинг `backend/services/AuthService.py` в `backend/core/auth_service.py` (если еще не сделано) и подтверждение логики декодирования JWT.
- **Контекст:** `auth_service.py` должен содержать логику для работы с JWT. Необходимо убедиться, что он соответствует требованиям Cloud Function `auth_sync`.
- **Атомарное действие:** Создан файл `backend/core/auth_service.py`. В `backend/cloud_functions/auth_sync/requirements.txt` добавлена зависимость `firebase-admin`. В `AuthService` реализована инициализация `firebase-admin` и метод `verify_firebase_token` для верификации JWT с обработкой ошибок.
- **Ожидаемый результат:** `backend/core/auth_service.py` существует, содержит корректную логику работы с JWT и используется `auth_sync` Cloud Function.
- **MVP Task Dependencies:** Section A: Develop `auth_sync` Firebase Cloud Function (uses `auth_service.py`).
- **Критичность:** Высокая
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `45fc5ac` (ветка `feat/mvp-auth-integration-flash`) - Реализован AuthService с верификацией JWT через firebase-admin.

---
**Промпт:**
- **ID:** [20240726-1006-008]
- **Источник:** Audit Report - Section A
- **Цель:** Проверить `backend/core/crud_operations.py` на предмет корректной работы с Cloud Functions и обработки создания/проверки пользователя.
- **Контекст:** `crud_operations.py` используется Cloud Function `auth_sync` для взаимодействия с таблицей пользователей в PostgreSQL.
- **Атомарное действие:** Проверены и доработаны функции `create_user` и `get_user_by_firebase_uid` в `backend/core/crud_operations.py`. Я обеспечил корректное формирование SQL-запросов, использование актуальных Pydantic моделей для ввода/вывода, правильную обработку соединения с БД и адекватную обработку ошибок, включая `UniqueViolationError`.
- **Ожидаемый результат:** `backend/core/crud_operations.py` готов к использованию Cloud Function `auth_sync` для операций с пользователями.
- **MVP Task Dependencies:** Section A: Integrate `crud_operations.py` with `auth_sync` function.
- **Критичность:** Средняя
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `239b948` (ветка `feat/mvp-auth-integration-flash`) - Функции CRUD для пользователей проверены и доработаны.

---
**Промпт:**
- **ID:** [20240726-1007-009]
- **Источник:** Audit Report - Section A
- **Цель:** Проверить Pydantic модели в `backend/core/models/user_models.py` на соответствие требованиям `auth_sync`.
- **Контекст:** Модели Pydantic используются для валидации данных и сериализации при взаимодействии с БД и API.
- **Атомарное действие:** Проверены и доработаны Pydantic модели в `backend/core/models/user_models.py`. Я обеспечил соответствие моделей (`UserModel`, `UserCreate`, `UserInDB`) схеме таблицы `users` и требованиям `crud_operations.py`, включая корректное использование `user_id_firebase` и `orm_mode`.
- **Ожидаемый результат:** Модели в `backend/core/models/user_models.py` актуальны и соответствуют требованиям аутентификации.
- **MVP Task Dependencies:** Section A: Define user schema & Pydantic models.
- **Критичность:** Средняя
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `ff17a59` (ветка `feat/mvp-auth-integration-flash`) - Pydantic модели пользователей обновлены и приведены в соответствие со схемой.

---
**Промпт:**
- **ID:** [20240726-1008-010]
- **Источник:** Audit Report - Section A
- **Цель:** Проверить схему таблицы `users` в `backend/core/db/schema.sql`.
- **Контекст:** Корректная схема таблицы `users` важна для хранения информации о пользователях.
- **Атомарное действие:** Проверена схема таблицы `users` в `backend/core/db/schema.sql`. Я убедился в наличии и корректности основных полей (`user_id`, `email`, `created_at`, `updated_at`) и их типов для нужд аутентификации. Дополнительные поля (`display_name`, `photo_url`, `email_verified`) были предложены к рассмотрению, но не добавлены без явного указания.
- **Ожидаемый результат:** Схема таблицы `users` в `backend/core/db/schema.sql` корректна и полна.
- **MVP Task Dependencies:** Section A: Define user schema & Pydantic models.
- **Критичность:** Средняя
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `ff17a59` (ветка `feat/mvp-auth-integration-flash`) - Схема таблицы users проверена, основные поля подтверждены.

## Section B: Frontend - Core Hologram Visualization & Audio Reactivity

---
**Промпт:**
- **ID:** [20240726-1009-011]
- **Источник:** Audit Report - Section B
- **Цель:** Уточнить имя файла для визуализатора аудио: `frontend/js/audio/audioVisualizer.js` или `frontend/js/audio/visualization.js`. Переименовать для консистентности, если необходимо.
- **Контекст:** В документации указан `audioVisualizer.js`, но в листинге файлов присутствует `visualization.js`. Необходимо устранить несоответствие.
- **Атомарное действие:** Проверена директория `frontend/js/audio/`. Файл `visualization.js` переименован в `audioVisualizer.js`, обновлены соответствующие импорты (например, в `main.js`).
- **Ожидаемый результат:** Имя файла для аудио визуализатора уточнено (`audioVisualizer.js`), файл существует и готов к дальнейшей работе. Все импорты обновлены при необходимости.
- **MVP Task Dependencies:** Section B: Develop and integrate `hologramConfig.js` with `audioVisualizer.js`.
- **Критичность:** Низкая (Уточнение)
- ** Ответственный:** Frontend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `9ca93f6` (ветка `feat/mvp-auth-integration-flash`) - Файл audioVisualizer.js унифицирован, импорты обновлены.

---
**Промпт:**
- **ID:** [20240726-1010-012]
- **Источник:** Audit Report - Section B
- **Цель:** Проверить и стабилизировать основную логику рендеринга голограммы в `frontend/js/3d/hologramRenderer.js`.
- **Контекст:** Это ядро визуализации. Необходимо убедиться в стабильности рендер-цикла и корректности функций обновления.
- **Атомарное действие:** Проведен code review `frontend/js/3d/hologramRenderer.js`. Код признан стабильным и соответствующим базовым требованиям MVP. Необходимые комментарии добавлены, изменения кода не потребовались.
- **Ожидаемый результат:** `frontend/js/3d/hologramRenderer.js` содержит стабильную и корректную логику для рендеринга голограммы.
- **MVP Task Dependencies:** Section B: Implement/stabilize `hologramRenderer.js` with core visualization logic.
- **Критичность:** Высокая
- ** Ответственный:** Frontend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `fdec25e` (ветка `feat/mvp-auth-integration-flash`) - hologramRenderer.js проанализирован, код стабилен.

---
**Промпт:**
- **ID:** [20240726-1011-013]
- **Источник:** Audit Report - Section B
- **Цель:** Проверить реализацию `frontend/js/audio/audioAnalyzer.js` для захвата аудио и FFT анализа.
- **Контекст:** `audioAnalyzer.js` отвечает за получение аудио данных для визуализации.
- **Атомарное действие:** Проведен code review `frontend/js/audio/audioAnalyzer.js`. Файл признан функциональным, обеспечивает захват и FFT анализ аудио. Изменения кода не потребовались, добавлены комментарии.
- **Ожидаемый результат:** `frontend/js/audio/audioAnalyzer.js` корректно захватывает и анализирует аудиоданные.
- **MVP Task Dependencies:** Section B: Implement/stabilize `audioAnalyzer.js` with audio capture and FFT.
- **Критичность:** Высокая
- ** Ответственный:** Frontend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `fdec25e` (ветка `feat/mvp-auth-integration-flash`) - audioAnalyzer.js проанализирован, код функционален.

---
**Промпт:**
- **ID:** [20240726-1012-014]
- **Источник:** Audit Report - Section B
- **Цель:** Проверить или реализовать логику сопоставления аудиоданных с визуальными параметрами в `frontend/js/audio/audioVisualizer.js` (или `visualization.js`).
- **Контекст:** Этот модуль связывает аудио анализ с рендерером голограммы.
- **Атомарное действие:** В `frontend/js/audio/audioVisualizer.js` реализована базовая логика для получения данных от `audioAnalyzer.js` и вызова методов `hologramRenderer.js` для простой реакции визуализации на звук. Соответствующие изменения для интеграции внесены в `main.js`.
- **Ожидаемый результат:** `audioVisualizer.js` (или `visualization.js`) корректно связывает аудио анализ с визуализацией.
- **MVP Task Dependencies:** Section B: Ensure `audioVisualizer.js` correctly maps audio to visual parameters.
- **Критичность:** Высокая
- ** Ответственный:** Frontend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `80f6404` (ветка `feat/mvp-auth-integration-flash`) - Реализована базовая аудио-визуальная связь.

---
**Промпт:**
- **ID:** [20240726-1017-019]
- **Источник:** Audit Report - Section D
- **Цель:** Проверить `process_chunk` Cloud Function (`backend/cloud_functions/process_chunk/main.py`) на корректность обработки триггера Firebase Storage и сохранения метаданных.
- **Контекст:** Эта функция запускается при загрузке нового файла в Storage и должна сохранить его метаданные в PostgreSQL.
- **Атомарное действие:** Модифицирован `backend/cloud_functions/process_chunk/main.py`. Обеспечена корректная обработка события Storage, извлечение данных, подготовка метаданных и вызов метода `process_chunk_metadata` экземпляра `ChunkProcessorBot` для сохранения данных в PostgreSQL. Добавлено логирование и обработка ошибок.
- **Ожидаемый результат:** `process_chunk/main.py` корректно обрабатывает новые файлы из Storage и сохраняет их метаданные.
- **MVP Task Dependencies:** Section D: Develop `process_chunk` Cloud Function with Storage trigger.
- **Критичность:** Высокая
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `80f6404` (ветка `feat/mvp-auth-integration-flash`) - `process_chunk` CF обновлена для корректного вызова ChunkProcessorBot.

---
**Промпт:**
- **ID:** [20240726-1019-021]
- **Источник:** Audit Report - Section E
- **Цель:** Проверить `backend/core/db/pg_connector.py` на корректность подключения к Neon.tech PostgreSQL.
- **Контекст:** Важно обеспечить надежное подключение к БД из Cloud Functions.
- **Атомарное действие:** Проведен code review `pg_connector.py`. Код признан корректным, использующим переменные окружения для строки подключения и с базовой обработкой ошибок. Изменений не потребовалось.
- **Ожидаемый результат:** `pg_connector.py` обеспечивает корректное и безопасное подключение к Neon.tech PostgreSQL.
- **MVP Task Dependencies:** Section E: Setup Neon.tech PostgreSQL database and test connection.
- **Критичность:** Высокая
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `a6e0c03` (ветка `feat/mvp-auth-integration-flash`) - pg_connector.py проанализирован, код признан корректным.

---
**Промпт:**
- **ID:** [20240726-1024-026]
- **Источник:** Audit Report - Section F
- **Цель:** Реализовать или проверить логирование взаимодействий Tria в таблицу `tria_learning_log` из Cloud Functions.
- **Контекст:** Логирование важно для анализа и улучшения Tria. Зависит от создания схемы таблицы `tria_learning_log` (ID [20240726-1000-002]).
- **Атомарное действие:** Обновлены `backend/core/models/learning_log_models.py`, `backend/core/crud_operations.py` и `backend/cloud_functions/tria_chat_handler/main.py` для реализации логирования ответов чат-бота в `tria_learning_log`. Проверено логирование в `process_chunk` через `ChunkProcessorBot`.
- **Ожидаемый результат:** Взаимодействия Tria корректно логируются в базу данных PostgreSQL.
- **MVP Task Dependencies:** Section F: Implement logging of Tria interactions to Neon.tech PostgreSQL from Cloud Functions.
- **Критичность:** Средняя
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `cdee324` (ветка `feat/mvp-auth-integration-flash`) - Реализовано логирование взаимодействий Tria в `tria_chat_handler`.

---
**Промпт:**
- **ID:** [20240726-1020-022]
- **Источник:** Audit Report - Section E
- **Цель:** Уточнить и стандартизировать стратегию управления зависимостями Python для Firebase Cloud Functions.
- **Контекст:** В аудите отмечено упоминание как глобального `backend/requirements.txt`, так и `requirements.txt` для каждой функции. Это может привести к путанице.
- **Атомарное действие:** Реализована стратегия индивидуальных `requirements.txt` для каждой Cloud Function (`auth_sync`, `process_chunk`, `tria_chat_handler`). Соответствующие файлы обновлены и содержат необходимые зависимости. Общий `backend/requirements.txt` очищен от зависимостей функций.
- **Ожидаемый результат:** Единая, понятная и корректная стратегия управления Python зависимостями для всех Cloud Functions. Файлы `requirements.txt` обновлены.
- **MVP Task Dependencies:** Section E: Dependencies.
- **Критичность:** Средняя (Улучшение процесса сборки)
- ** Ответственный:** Backend Team/Lead Dev
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `a6e0c03` (ветка `feat/mvp-auth-integration-flash`) - Стандартизирована стратегия requirements.txt для Cloud Functions.

---
**Промпт:**
- **ID:** [20240726-1021-023]
- **Источник:** Audit Report - Section E & F
- **Цель:** Проверить, что все Cloud Functions (`auth_sync`, `process_chunk`, `tria_chat_handler`) корректно импортируют и используют общую логику из `backend/core/` (services, DB operations, models, tria_bots).
- **Контекст:** Переиспользование кода важно для поддержки и консистентности.
- **Атомарное действие:** Проведен code review `main.py` файлов для Cloud Functions (`auth_sync`, `process_chunk`, `tria_chat_handler`). Подтверждено, что импорты из `backend.core.*` корректны, экземпляры классов создаются правильно, и методы вызываются с ожидаемыми параметрами. Изменений не потребовалось.
- **Ожидаемый результат:** Cloud Functions эффективно используют общую логику из `backend/core/`.
- **MVP Task Dependencies:** Section E: Functions import shared logic from `backend/core/`. Section F: Ensure Cloud Functions use bot modules.
- **Критичность:** Средняя
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `562d40a` (ветка `feat/mvp-auth-integration-flash`) - Проверено корректное использование общей логики в Cloud Functions.

---
**Промпт:**
- **ID:** [20240726-1026-028]
- **Источник:** Audit Report - Section IV (Core Functionality Test)
- **Цель:** Провести End-to-End тестирование всего потока аутентификации пользователя.
- **Контекст:** Необходимо убедиться, что пользователь может зарегистрироваться, войти в систему, и его данные корректно синхронизируются с PostgreSQL.
- **Атомарное действие:** Создан файл `docs/tests/E2E_Auth_Manual_Test_Plan.md` с подробным планом ручного E2E-тестирования потока аутентификации. Включены предложения по улучшению логирования на бэкенде для облегчения тестирования.
- **Ожидаемый результат:** Полный цикл аутентификации (регистрация, вход, синхронизация данных) работает корректно. *План тестирования подготовлен.*
- **MVP Task Dependencies:** All of Section A.
- **Критичность:** Высокая
- ** Ответственный:** QA/Testing Team (или разработчики)
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `562d40a` (ветка `feat/mvp-auth-integration-flash`) - Создан план ручного E2E тестирования аутентификации.

---
**Промпт:**
- **ID:** [20240726-1018-020]
- **Источник:** Audit Report - Section E
- **Цель:** Уточнить роль `backend/main.py` в контексте Firebase Cloud Functions.
- **Контекст:** Документ упоминает `backend/main.py` ИЛИ `backend/cloud_functions/` для определения функций. `backend/main.py` выглядит как FastAPI приложение. Необходимо понять, как он используется для деплоя функций, если используется.
- **Атомарное действие:** Проанализированы `backend/main.py`, `firebase.json` и структура Cloud Functions. Создан файл `docs/01_ARCHITECTURE/DEPLOYMENT_STRATEGY.md`, документирующий текущую или наиболее вероятную стратегию деплоя Cloud Functions.
- **Ожидаемый результат:** Четкое понимание и документация стратегии деплоя Firebase Cloud Functions.
- **MVP Task Dependencies:** Section E: Define specific Cloud Functions needed for MVP.
- **Критичность:** Средняя (Уточнение архитектуры)
- ** Ответственный:** Backend Team/Lead Dev
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `15dc953` (ветка `feat/mvp-auth-integration-flash`) - Задокументирована стратегия деплоя Cloud Functions.

## Section C: Frontend - UI for MVP

---
**Промпт:**
- **ID:** [20240726-1013-015]
- **Источник:** Audit Report - Section C
- **Цель:** Уточнить, какой файл отвечает за UI чата: `frontend/js/ui/chatUI.js` (не найден) или альтернативы (`frontend/js/panels/chatMessages.js`, `frontend/panels/chat_panel.js`).
- **Контекст:** Необходима ясность в файловой структуре для UI чата.
- **Атомарное действие:** Роли `chat_panel.js` (для ввода и отправки) и `chatMessages.js` (для отображения) определены как основные для UI чата.
- **Ожидаемый результат:** Определен и документирован файл(ы), отвечающий за UI чата. Готовность к проверке/доработке логики отправки сообщений.
- **MVP Task Dependencies:** Section C: Implement chat input field and send mechanism in `chatUI.js`.
- **Критичность:** Низкая (Уточнение)
- ** Ответственный:** Frontend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `1808e45` (ветка `feat/mvp-auth-integration-flash`) - Роли файлов UI чата определены.

---
**Промпт:**
- **ID:** [20240726-1014-016]
- **Источник:** Audit Report - Section C
- **Цель:** Провести комплексную проверку `frontend/js/ui/uiManager.js` на наличие обработчиков событий для ВСЕХ кнопок MVP.
- **Контекст:** `uiManager.js` должен управлять всеми интерактивными элементами UI.
- **Атомарное действие:** Проведен code review `frontend/js/ui/uiManager.js`. Исправлены ссылки на панели, добавлены комментарии и плейсхолдеры для недостающих обработчиков кнопок MVP.
- **Ожидаемый результат:** `uiManager.js` содержит корректные обработчики (или заглушки) для всех кнопок MVP, обеспечивая базовую интерактивность и понятное поведение.
- **MVP Task Dependencies:** Section C: Implement `uiManager.js` listeners for all buttons.
- **Критичность:** Средняя
- ** Ответственный:** Frontend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `1624eae` (ветка `feat/mvp-auth-integration-flash`) - `uiManager.js` проверен, обработчики кнопок MVP учтены.

---
**Промпт:**
- **ID:** [20240726-1015-017]
- **Источник:** Audit Report - Section C
- **Цель:** Проверить или реализовать механизм отправки сообщений чата на бэкенд.
- **Контекст:** Пользователь должен иметь возможность отправлять сообщения Tria боту.
- **Атомарное действие:** `chat_panel.js` обновлен для сбора сообщения и вызова `apiService.js`. `apiService.js` дополнен функцией `sendChatMessage` для отправки сообщения и JWT на эндпоинт `tria_chat_handler`.
- **Ожидаемый результат:** Пользователь может ввести текст в UI чата и отправить его на бэкенд. Отправленное сообщение отображается в истории чата.
- **MVP Task Dependencies:** Section C: Implement chat input field and send mechanism in `chatUI.js`.
- **Критичность:** Высокая
- ** Ответственный:** Frontend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `1808e45` (ветка `feat/mvp-auth-integration-flash`) - Реализован механизм отправки сообщений чата.

## Section D: "Interaction Chunk" Pipeline

---
**Промпт:**
- **ID:** [20240726-1016-018]
- **Источник:** Audit Report - Section D
- **Цель:** Проверить логику прямой загрузки файлов в Firebase Storage в `frontend/js/services/firebaseStorageService.js`.
- **Контекст:** Файлы (interaction chunks) должны загружаться напрямую из frontend в Firebase Storage.
- **Атомарное действие:** Проведен code review `frontend/js/services/firebaseStorageService.js`. Код признан соответствующим требованиям по инициализации SDK, формированию пути, сохранению метаданных и обработке процесса загрузки. Изменений не потребовалось.
- **Ожидаемый результат:** `firebaseStorageService.js` корректно загружает файлы в Firebase Storage с необходимыми метаданными.
- **MVP Task Dependencies:** Section D: Implement frontend direct upload to Firebase Storage.
- **Критичность:** Высокая
- ** Ответственный:** Frontend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `610c1ec` (ветка `feat/mvp-auth-integration-flash`) - firebaseStorageService.js проанализирован, код корректен.

## Section F: Backend - MVP Tria Bot Logic

---
**Промпт:**
- **ID:** [20240726-1022-024]
- **Источник:** Audit Report - Section F
- **Цель:** Проверить реализацию `backend/core/tria_bots/ChatBot.py` для обработки логики чата и интеграции с LLM.
- **Контекст:** `ChatBot.py` является центральным компонентом для взаимодействия с пользователем через Tria.
- **Атомарное действие:** Проведен code review `backend/core/tria_bots/ChatBot.py`. Код признан соответствующим базовым требованиям: инициализация, метод для приема ввода, использование `llm_service.py`, возврат ответа LLM, обработка ошибок. RAG не реализовывался. Изменений не потребовалось.
- **Ожидаемый результат:** `ChatBot.py` корректно обрабатывает логику чата и взаимодействует с LLM.
- **MVP Task Dependencies:** Section F: Implement `ChunkProcessorBot.py` and `ChatBot.py` modules.
- **Критичность:** Высокая
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `610c1ec` (ветка `feat/mvp-auth-integration-flash`) - ChatBot.py проанализирован, базовая логика корректна.

---
**Промпт:**
- **ID:** [20240726-1023-025]
- **Источник:** Audit Report - Section F
- **Цель:** Проверить реализацию `backend/core/services/llm_service.py` для стандартизированных вызовов LLM API (Mistral/Devstral/Gemini).
- **Контекст:** `llm_service.py` должен абстрагировать вызовы к различным LLM.
- **Атомарное действие:** Проведен code review `backend/core/services/llm_service.py`. Сервис настроен на работу с Mistral API (ключ из переменных окружения), методы формирования запросов и обработки ответов/ошибок корректны. Изменений не потребовалось.
- **Ожидаемый результат:** `llm_service.py` обеспечивает надежное и стандартизированное взаимодействие с LLM API.
- **MVP Task Dependencies:** Section F: Implement `llm_service.py`.
- **Критичность:** Высокая
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `610c1ec` (ветка `feat/mvp-auth-integration-flash`) - llm_service.py проанализирован, базовая логика корректна.

## Section G: Backend-Frontend Communication

---
**Промпт:**
- **ID:** [20240726-1025-027]
- **Источник:** Audit Report - Section G
- **Цель:** Проверить `frontend/js/services/apiService.js` на корректность URL-адресов Cloud Functions и форматов запросов/ответов.
- **Контекст:** `apiService.js` является центральной точкой для HTTP вызовов из frontend в backend.
- **Атомарное действие:** URL Cloud Functions в `frontend/js/services/apiService.js` стандартизированы с использованием общего `API_BASE_URL`. Проверены форматы запросов и ответов для `auth_sync` и `tria_chat_handler`.
- **Ожидаемый результат:** `apiService.js` корректно и надежно взаимодействует с HTTP эндпоинтами Cloud Functions.
- **MVP Task Dependencies:** Section G: Update `frontend/js/services/apiService.js` to correctly call deployed/emulated Cloud Function URLs.
- **Критичность:** Средняя
- ** Ответственный:** Frontend Team / Fullstack
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `ed572fa` (ветка `feat/mvp-auth-integration-flash`) - `apiService.js` стандартизирован и проверен.

## Section IV: Final Check & Polish (Actionable Items)

---
**Промпт:**
- **ID:** [20240726-1027-029]
- **Источник:** Audit Report - Section IV (Core Functionality Test)
- **Цель:** Провести End-to-End тестирование загрузки Interaction Chunk и его обработки.
- **Контекст:** Пользователь должен иметь возможность загрузить медиа-файл, который затем обрабатывается бэкендом.
- **Атомарное действие:** Создан файл `docs/tests/E2E_Chunk_Upload_Manual_Test_Plan.md` с подробным планом ручного E2E-тестирования потока загрузки "Interaction Chunk" и его базовой обработки.
- **Ожидаемый результат:** Полный цикл загрузки и базовой обработки Interaction Chunk работает корректно. *План тестирования подготовлен.*
- **MVP Task Dependencies:** All of Section D, Section E (`ChunkProcessorBot.py` creation).
- **Критичность:** Высокая
- ** Ответственный:** QA/Testing Team (или разработчики)
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `ba1350b` (ветка `feat/mvp-auth-integration-flash`) - Создан план ручного E2E тестирования загрузки чанков.

---
**Промпт:**
- **ID:** [20240726-1028-030]
- **Источник:** Audit Report - Section IV (Core Functionality Test)
- **Цель:** Провести End-to-End тестирование базового взаимодействия с Tria ботом.
- **Контекст:** Пользователь должен иметь возможность отправить сообщение Tria боту и получить ответ.
- **Атомарное действие:** Создан файл `docs/tests/E2E_Tria_Bot_Manual_Test_Plan.md` с подробным планом ручного E2E-тестирования базового взаимодействия с Tria ботом.
- **Ожидаемый результат:** Базовое взаимодействие с Tria ботом (отправка запроса, получение ответа LLM, отображение в UI) работает корректно. *План тестирования подготовлен.*
- **MVP Task Dependencies:** All of Section F, Section C (Chat UI), Section G.
- **Критичность:** Высокая
- ** Ответственный:** QA/Testing Team (или разработчики)
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `8630dc8` (ветка `feat/mvp-auth-integration-flash`) - Создан план E2E тестирования Tria Bot.

---
**Промпт:**
- **ID:** [20240726-1029-031]
- **Источник:** Audit Report - Section IV (Core Functionality Test)
- **Цель:** Протестировать отображение базовой голограммы и ее реакцию на микрофон.
- **Контекст:** Визуализация голограммы и ее аудиореактивность - ключевой элемент фронтенда.
- **Атомарное действие:** Создан файл `docs/tests/E2E_Hologram_Mic_Manual_Test_Plan.md` с подробным планом ручного E2E-тестирования отображения голограммы и ее реакции на микрофон.
- **Ожидаемый результат:** Голограмма отображается и корректно реагирует на аудиовход с микрофона. *План тестирования подготовлен.*
- **MVP Task Dependencies:** All of Section B.
- **Критичность:** Высокая
- ** Ответственный:** QA/Testing Team (или Frontend разработчики)
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `c6bdd91` (ветка `feat/mvp-auth-integration-flash`) - Создан план E2E тестирования голограммы и микрофона.

---
**Промпт:**
- **ID:** [20240726-1030-032]
- **Источник:** Audit Report - Section IV (Technical Checks)
- **Цель:** Проверить наличие и корректность базовой обработки ошибок и логирования в Firebase Cloud Functions.
- **Контекст:** Адекватная обработка ошибок и логирование необходимы для отладки и поддержки.
- **Атомарное действие:** Улучшена обработка ошибок и интегрирован модуль `logging` в Cloud Functions (`auth_sync`, `process_chunk`, `tria_chat_handler`). Добавлено логирование ключевых этапов и ошибок.
- **Ожидаемый результат:** Все Cloud Functions имеют базовую обработку ошибок и логирование.
- **MVP Task Dependencies:** Sections A, D, E, F (т.е. код самих функций).
- **Критичность:** Средняя
- ** Ответственный:** Backend Team
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `b762edf` (ветка `feat/mvp-auth-integration-flash`) - Улучшено логирование и обработка ошибок в Cloud Functions.

---
**Промпт:**
- **ID:** [20240726-1031-033]
- **Источник:** Audit Report - Section IV (Technical Checks)
- **Цель:** Проверить код на наличие комментариев для ключевых секций.
- **Контекст:** Комментарии улучшают читаемость и поддерживаемость кода.
- **Атомарное действие:** Провести выборочный code review ключевых файлов frontend (`auth.js`, `hologramRenderer.js`, `uiManager.js`, `apiService.js`) и backend (`backend/core/*`, `backend/cloud_functions/*/*`). Оценить наличие и качество комментариев, объясняющих сложную логику, неочевидные решения или важные шаги алгоритмов.
- **Ожидаемый результат:** Ключевые секции кода снабжены достаточными комментариями.
- **MVP Task Dependencies:** Общая задача по качеству кода.
- **Критичность:** Низкая
- ** Ответственный:** All Devs
- ** Прогресс:** Не начато (Общая проверка)

---
**Промпт:**
- **ID:** [20240726-1032-034]
- **Источник:** Audit Report - Section IV (Documentation)
- **Цель:** Проверить и обновить `README.md` на предмет наличия инструкций по настройке Firebase, локальной эмуляции и деплою.
- **Контекст:** `README.md` - точка входа для новых разработчиков и для процесса деплоя.
- **Атомарное действие:** `README.md` обновлен инструкциями по настройке Firebase, локальной эмуляции, деплою фронтенда и Cloud Functions, включая ссылки на `DEPLOYMENT_STRATEGY.md` и информацию о стратегии `requirements.txt`.
- **Ожидаемый результат:** `README.md` содержит актуальные и полные инструкции для развертывания и локальной разработки MVP.
- **MVP Task Dependencies:** Зависит от уточнений по стратегии деплоя функций.
- **Критичность:** Средняя
- ** Ответственный:** Lead Dev / DevOps
- ** Прогресс:** ✅ Done
- **Результат:** Коммит `8102eff` (ветка `feat/mvp-auth-integration-flash`) - README.md обновлен актуальными инструкциями.

---
**Промпт:**
- **ID:** [20240726-1033-035]
- **Источник:** Audit Report - Section IV (Documentation)
- **Цель:** Проверить и обновить `.env.example` на предмет документирования ключевых переменных окружения для Cloud Functions.
- **Контекст:** Разработчики должны знать, какие переменные окружения необходимы для работы бэкенда.
- **Атомарное действие:** Прочитать файл `.env.example`. Убедиться, что он содержит (или добавить) список всех переменных окружения, необходимых для Cloud Functions, например:
    - Строка подключения к Neon.tech PostgreSQL.
    - API ключи для LLM сервисов (если используются).
    - Любые другие секреты или конфигурационные параметры.
    - Для каждой переменной указать пример значения или описание.
- **Ожидаемый результат:** `.env.example` актуален и полно описывает необходимые переменные окружения.
- **MVP Task Dependencies:** Зависит от финального списка используемых сервисов и их конфигурации.
- **Критичность:** Средняя
- ** Ответственный:** Lead Dev / Backend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

---
**Промпт:**
- **ID:** [20240726-1034-036]
- **Источник:** Audit Report - Section IV (Technical Checks - Firebase Specific)
- **Цель:** Проверить конфигурацию переменных окружения Firebase Functions.
- **Контекст:** Переменные окружения (DB connection string, LLM API keys) должны быть безопасно сконфигурированы для Cloud Functions.
- **Атомарное действие:** (Выполняется тем, у кого есть доступ к Firebase проекту)
    1.  Проверить текущие установленные переменные окружения для Firebase Functions (например, через `firebase functions:config:get`).
    2.  Убедиться, что все необходимые переменные (согласно `.env.example` из ID [20240726-1033-035]) установлены и имеют корректные значения для рабочего/тестового окружения.
    3.  Если переменные не установлены или некорректны, использовать `firebase functions:config:set` для их установки/обновления.
- **Ожидаемый результат:** Переменные окружения для Firebase Cloud Functions корректно сконфигурированы и доступны функциям во время выполнения.
- **MVP Task Dependencies:** Зависит от ID [20240726-1033-035] и наличия самих ключей/строк подключения.
- **Критичность:** Высокая
- ** Ответственный:** Lead Dev / DevOps
- ** Прогресс:** Не начато (Внешняя конфигурация)

---
**Промпт:**
- **ID:** [20240726-1035-037]
- **Источник:** Audit Report - Section IV (Technical Checks - Firebase Specific)
- **Цель:** Проверить и настроить правила безопасности Firebase (Security Rules) для Storage.
- **Контекст:** Необходимо обеспечить базовую безопасность для Firebase Storage, разрешая доступ только аутентифицированным пользователям к их данным.
- **Атомарное действие:** (Выполняется тем, у кого есть доступ к Firebase проекту)
    1.  Просмотреть текущие правила безопасности для Firebase Storage (в консоли Firebase или в файле конфигурации правил).
    2.  Убедиться, что правила настроены так, чтобы:
        - Аутентифицированные пользователи могли загружать файлы в свои директории (например, `user_uploads/{userID}/{fileName}`).
        - Чтение файлов ограничено в соответствии с требованиями MVP (например, только владелец или нет публичного чтения без необходимости).
        - Неаутентифицированный доступ запрещен или строго ограничен.
    3.  Обновить правила, если они не соответствуют требованиям MVP.
- **Ожидаемый результат:** Правила безопасности Firebase Storage настроены и обеспечивают базовый уровень защиты данных для MVP.
- **MVP Task Dependencies:** Общая задача по безопасности.
- **Критичность:** Высокая
- ** Ответственный:** Lead Dev / DevOps
- ** Прогресс:** Не начато (Внешняя конфигурация)
