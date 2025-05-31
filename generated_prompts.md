```markdown
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
- **Результат:** Коммит `[COMMIT_SHA_PLACEHOLDER]` (ветка `feat/update-db-schemas`) - Схемы `tria_learning_log` и `user_chat_sessions` обновлены в `backend/core/db/schema.sql`.

---
**Промпт:**
- **ID:** [20240726-1001-003]
- **Источник:** Audit Report - Section III (Key Blockers) / Section E & F
- **Цель:** Создать и реализовать Python модуль `ChunkProcessorBot.py` в директории `backend/core/tria_bots/`.
- **Контекст:** `ChunkProcessorBot.py` должен обрабатывать загруженные медиа-чанки. Его отсутствие блокирует полную реализацию "Interaction Chunk" Pipeline и соответствующей Cloud Function (`process_chunk`).
- **Атомарное действие:** Создать файл `backend/core/tria_bots/ChunkProcessorBot.py`. Реализовать в нем класс `ChunkProcessorBot` с методами для:
    - Принятия метаданных чанка.
    - Логирования метаданных в PostgreSQL (через `crud_operations.py`).
    - Выполнения базового анализа или подтверждения обработки (согласно MVP).
- **Ожидаемый результат:** Файл `backend/core/tria_bots/ChunkProcessorBot.py` создан с базовой реализацией класса `ChunkProcessorBot` и его методов. Cloud Function `process_chunk` должна быть обновлена для его использования.
- **MVP Task Dependencies:**
    - Section D: (Optional for MVP) Can then trigger a simple Tria bot logic...
    - Section F: Implement `ChunkProcessorBot.py` and `ChatBot.py` modules...
    - Section F: Ensure `process_chunk` Cloud Functions correctly use these bot modules.
- **Критичность:** Высокая (Блокер)
- ** Ответственный:** Backend Team
- ** Прогресс:** Не начато

---
**Промпт:**
- **ID:** [20240726-1002-004]
- **Источник:** Audit Report - Section III (Key Blockers) / Section F & IV (Constraint Compliance)
- **Цель:** Подтвердить доступность API ключей для Mistral/Devstral/Gemini, их соответствие условиям бесплатного использования (free tier) и отсутствию необходимости привязки банковской карты.
- **Контекст:** Использование LLM является ключевой частью функционала Tria. Невозможность получить доступ к LLM API или нарушение ограничений по "no credit card" заблокирует разработку Tria бота.
- **Атомарное действие:** Провести исследование и получить подтверждение от провайдеров LLM (Mistral/Devstral/Gemini) относительно:
    1.  Наличия free tier.
    2.  Условий использования free tier (лимиты запросов, и т.д.).
    3.  Отсутствия требования привязки банковской карты для free tier.
    4.  Процедуры получения API ключей.
- **Ожидаемый результат:** Четкое подтверждение по каждому LLM провайдеру. API ключи (если применимо и безопасно хранить на данном этапе) получены и готовы к конфигурации в Firebase Functions. Документировать результаты для команды.
- **MVP Task Dependencies:**
    - Section F: Confirm LLM API key availability and free tier usage conditions.
    - Section F: Implement `llm_service.py` (зависит от знания, какие API использовать).
    - Section IV: Tria Bot LLM calls use Mistral/Devstral/Gemini...
- **Критичность:** Высокая (Блокер)
- ** Ответственный:** Research/Lead Dev
- ** Прогресс:** Не начато (в аудите "Pending External Verification")

## Section A: User Authentication

---
**Промпт:**
- **ID:** [20240726-1003-005]
- **Источник:** Audit Report - Section A
- **Цель:** Проверить и завершить интеграцию Firebase Web SDK в `frontend/js/core/auth.js`, включая отправку JWT в `auth_sync` Cloud Function.
- **Контекст:** Аутентификация пользователя - базовый функционал MVP. Необходимо убедиться, что frontend корректно взаимодействует с Firebase Auth и передает токен в backend.
- **Атомарное действие:** Провести code review файла `frontend/js/core/auth.js`. Убедиться, что:
    1.  Инициализация Firebase Auth выполнена корректно.
    2.  Процессы регистрации и входа пользователя обрабатываются.
    3.  JWT токен получается после успешной аутентификации.
    4.  JWT токен отправляется на соответствующий HTTP эндпоинт Cloud Function `auth_sync` (через `apiService.js`).
- **Ожидаемый результат:** `frontend/js/core/auth.js` полностью и корректно реализует frontend часть аутентификации Firebase и отправку JWT.
- **MVP Task Dependencies:** Section A: Implement Firebase Auth UI (frontend), Send JWT to the `auth_sync` Cloud Function.
- **Критичность:** Высокая
- ** Ответственный:** Frontend Team
- ** Прогресс:** Частично выполнено (Нуждается в проверке)

---
**Промпт:**
- **ID:** [20240726-1004-006]
- **Источник:** Audit Report - Section A
- **Цель:** Проверить реализацию `auth_sync` Cloud Function в `backend/cloud_functions/auth_sync/main.py`.
- **Контекст:** Cloud Function `auth_sync` отвечает за синхронизацию данных пользователя из Firebase Auth в PostgreSQL. Важно убедиться в корректности обработки JWT, использовании `auth_service.py` и `crud_operations.py`.
- **Атомарное действие:** Провести code review `backend/cloud_functions/auth_sync/main.py`. Проверить:
    1.  Корректность получения JWT из HTTP запроса.
    2.  Правильность вызова `auth_service.py` (или его рефакторенной версии) для верификации JWT и извлечения информации о пользователе.
    3.  Корректность использования `crud_operations.py` для проверки существования пользователя и его создания/обновления в PostgreSQL.
    4.  Отправку корректного ответа (успех/ошибка) на frontend.
    5.  Обработку ошибок.
- **Ожидаемый результат:** `backend/cloud_functions/auth_sync/main.py` корректно и безопасно обрабатывает синхронизацию пользователей.
- **MVP Task Dependencies:** Section A: Develop `auth_sync` Firebase Cloud Function, Integrate `crud_operations.py` with `auth_sync` function.
- **Критичность:** Высокая
- ** Ответственный:** Backend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

---
**Промпт:**
- **ID:** [20240726-1005-007]
- **Источник:** Audit Report - Section A
- **Цель:** Рефакторинг `backend/services/AuthService.py` в `backend/core/auth_service.py` (если еще не сделано) и подтверждение логики декодирования JWT.
- **Контекст:** `auth_service.py` должен содержать логику для работы с JWT. Необходимо убедиться, что он соответствует требованиям Cloud Function `auth_sync`.
- **Атомарное действие:**
    1.  Если существует `backend/services/AuthService.py` и он актуален, переместить/рефакторить его в `backend/core/auth_service.py`.
    2.  Провести code review `backend/core/auth_service.py`. Убедиться, что он корректно декодирует JWT, полученный от Firebase Auth, и извлекает необходимую информацию о пользователе (UID, email).
    3.  Обеспечить совместимость с `backend/cloud_functions/auth_sync/main.py`.
- **Ожидаемый результат:** `backend/core/auth_service.py` существует, содержит корректную логику работы с JWT и используется `auth_sync` Cloud Function.
- **MVP Task Dependencies:** Section A: Develop `auth_sync` Firebase Cloud Function (uses `auth_service.py`).
- **Критичность:** Высокая
- ** Ответственный:** Backend Team
- ** Прогресс:** Частично выполнено (Нуждается в проверке/рефакторинге)

---
**Промпт:**
- **ID:** [20240726-1006-008]
- **Источник:** Audit Report - Section A
- **Цель:** Проверить `backend/core/crud_operations.py` на предмет корректной работы с Cloud Functions и обработки создания/проверки пользователя.
- **Контекст:** `crud_operations.py` используется Cloud Function `auth_sync` для взаимодействия с таблицей пользователей в PostgreSQL.
- **Атомарное действие:** Провести code review `backend/core/crud_operations.py`. Убедиться, что:
    1.  Функции для создания нового пользователя и проверки существующего пользователя реализованы корректно.
    2.  Эти функции могут быть безопасно вызваны из Cloud Function (учитывая контекст выполнения, обработку сессий БД и т.д.).
    3.  Соответствует Pydantic моделям из `backend/core/models/user_models.py`.
- **Ожидаемый результат:** `backend/core/crud_operations.py` готов к использованию Cloud Function `auth_sync` для операций с пользователями.
- **MVP Task Dependencies:** Section A: Integrate `crud_operations.py` with `auth_sync` function.
- **Критичность:** Средняя
- ** Ответственный:** Backend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

---
**Промпт:**
- **ID:** [20240726-1007-009]
- **Источник:** Audit Report - Section A
- **Цель:** Проверить Pydantic модели в `backend/core/models/user_models.py` на соответствие требованиям `auth_sync`.
- **Контекст:** Модели Pydantic используются для валидации данных и сериализации при взаимодействии с БД и API.
- **Атомарное действие:** Провести code review `backend/core/models/user_models.py`. Убедиться, что модели пользователя (`UserCreate`, `UserInDB` и т.п.) соответствуют данным, получаемым от Firebase, и структуре таблицы `users` в `schema.sql`.
- **Ожидаемый результат:** Модели в `backend/core/models/user_models.py` актуальны и соответствуют требованиям аутентификации.
- **MVP Task Dependencies:** Section A: Define user schema & Pydantic models.
- **Критичность:** Средняя
- ** Ответственный:** Backend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

---
**Промпт:**
- **ID:** [20240726-1008-010]
- **Источник:** Audit Report - Section A
- **Цель:** Проверить схему таблицы `users` в `backend/core/db/schema.sql`.
- **Контекст:** Корректная схема таблицы `users` важна для хранения информации о пользователях.
- **Атомарное действие:** Провести code review файла `backend/core/db/schema.sql`. Убедиться, что определение таблицы `users` содержит все необходимые поля (например, `user_id` (Primary Key, соответствует Firebase UID), `email`, `created_at`, `updated_at` и т.д.) и типы данных корректны.
- **Ожидаемый результат:** Схема таблицы `users` в `backend/core/db/schema.sql` корректна и полна.
- **MVP Task Dependencies:** Section A: Define user schema & Pydantic models.
- **Критичность:** Средняя
- ** Ответственный:** Backend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

## Section B: Frontend - Core Hologram Visualization & Audio Reactivity

---
**Промпт:**
- **ID:** [20240726-1009-011]
- **Источник:** Audit Report - Section B
- **Цель:** Уточнить имя файла для визуализатора аудио: `frontend/js/audio/audioVisualizer.js` или `frontend/js/audio/visualization.js`. Переименовать для консистентности, если необходимо.
- **Контекст:** В документации указан `audioVisualizer.js`, но в листинге файлов присутствует `visualization.js`. Необходимо устранить несоответствие.
- **Атомарное действие:**
    1.  Определить, какой из файлов (`frontend/js/audio/audioVisualizer.js` или `frontend/js/audio/visualization.js`) содержит или должен содержать логику связывания аудио анализа с визуальными параметрами.
    2.  Если `visualization.js` — это нужный файл, рассмотреть переименование в `audioVisualizer.js` для соответствия документации или обновить документацию.
    3.  Если `audioVisualizer.js` должен быть создан, создать его.
- **Ожидаемый результат:** Имя файла для аудио визуализатора уточнено и используется консистентно. Файл существует и готов к дальнейшей разработке/проверке.
- **MVP Task Dependencies:** Section B: Develop and integrate `hologramConfig.js` with `audioVisualizer.js`.
- **Критичность:** Низкая (Уточнение)
- ** Ответственный:** Frontend Team
- ** Прогресс:** Не начато (Уточнение файла)

---
**Промпт:**
- **ID:** [20240726-1010-012]
- **Источник:** Audit Report - Section B
- **Цель:** Проверить и стабилизировать основную логику рендеринга голограммы в `frontend/js/3d/hologramRenderer.js`.
- **Контекст:** Это ядро визуализации. Необходимо убедиться в стабильности рендер-цикла и корректности функций обновления.
- **Атомарное действие:** Провести code review `frontend/js/3d/hologramRenderer.js`. Проверить:
    1.  Стабильность и эффективность рендер-цикла.
    2.  Корректность функций создания/обновления визуального объекта (например, `createHolographicSphere`, `updateHologramAppearance`).
    3.  Настройку шейдерных материалов (если используются).
    4.  Динамическую реакцию на параметры (интенсивность, частота) для изменения масштаба, цвета, деформации.
    5.  Интеграцию концепций из PR #40 (если применимо и отслеживаемо).
- **Ожидаемый результат:** `frontend/js/3d/hologramRenderer.js` содержит стабильную и корректную логику для рендеринга голограммы.
- **MVP Task Dependencies:** Section B: Implement/stabilize `hologramRenderer.js` with core visualization logic.
- **Критичность:** Высокая
- ** Ответственный:** Frontend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

---
**Промпт:**
- **ID:** [20240726-1011-013]
- **Источник:** Audit Report - Section B
- **Цель:** Проверить реализацию `frontend/js/audio/audioAnalyzer.js` для захвата аудио и FFT анализа.
- **Контекст:** `audioAnalyzer.js` отвечает за получение аудио данных для визуализации.
- **Атомарное действие:** Провести code review `frontend/js/audio/audioAnalyzer.js`. Проверить:
    1.  Корректность инкапсулированного доступа к микрофону (`navigator.mediaDevices.getUserMedia`).
    2.  Надежность реализации FFT.
    3.  Наличие и корректность опционального усреднения/сглаживания данных FFT.
    4.  Интеграцию концепций из PR #40 (если применимо).
- **Ожидаемый результат:** `frontend/js/audio/audioAnalyzer.js` корректно захватывает и анализирует аудиоданные.
- **MVP Task Dependencies:** Section B: Implement/stabilize `audioAnalyzer.js` with audio capture and FFT.
- **Критичность:** Высокая
- ** Ответственный:** Frontend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

---
**Промпт:**
- **ID:** [20240726-1012-014]
- **Источник:** Audit Report - Section B
- **Цель:** Проверить или реализовать логику сопоставления аудиоданных с визуальными параметрами в `frontend/js/audio/audioVisualizer.js` (или `visualization.js`).
- **Контекст:** Этот модуль связывает аудио анализ с рендерером голограммы.
- **Атомарное действие:** Провести code review или реализовать в `frontend/js/audio/audioVisualizer.js` (или `visualization.js`):
    1.  Логику, которая получает данные FFT из `audioAnalyzer.js`.
    2.  Использует настройки из `frontend/js/config/hologramConfig.js`.
    3.  Вызывает функции обновления в `hologramRenderer.js` для изменения визуальных параметров голограммы.
- **Ожидаемый результат:** `audioVisualizer.js` (или `visualization.js`) корректно связывает аудио анализ с визуализацией.
- **MVP Task Dependencies:** Section B: Ensure `audioVisualizer.js` correctly maps audio to visual parameters.
- **Критичность:** Высокая
- ** Ответственный:** Frontend Team
- ** Прогресс:** В процессе (Нуждается в проверке, возможно неверное имя файла)

## Section C: Frontend - UI for MVP

---
**Промпт:**
- **ID:** [20240726-1013-015]
- **Источник:** Audit Report - Section C
- **Цель:** Уточнить, какой файл отвечает за UI чата: `frontend/js/ui/chatUI.js` (не найден) или альтернативы (`frontend/js/panels/chatMessages.js`, `frontend/panels/chat_panel.js`).
- **Контекст:** Необходима ясность в файловой структуре для UI чата.
- **Атомарное действие:**
    1.  Исследовать `frontend/js/panels/chatMessages.js` и `frontend/panels/chat_panel.js`.
    2.  Определить, какой из них (или оба) реализует функционал отображения сообщений чата и поля ввода.
    3.  Если функционал разнесен, понять, как они взаимодействуют.
    4.  Принять решение: использовать существующие файлы (обновив документацию) или создать `frontend/js/ui/chatUI.js` и перенести/консолидировать логику.
- **Ожидаемый результат:** Определен и документирован файл(ы), отвечающий за UI чата. Готовность к проверке/доработке логики отправки сообщений.
- **MVP Task Dependencies:** Section C: Implement chat input field and send mechanism in `chatUI.js`.
- **Критичность:** Низкая (Уточнение)
- ** Ответственный:** Frontend Team
- ** Прогресс:** Не начато (Уточнение файла)

---
**Промпт:**
- **ID:** [20240726-1014-016]
- **Источник:** Audit Report - Section C
- **Цель:** Провести комплексную проверку `frontend/js/ui/uiManager.js` на наличие обработчиков событий для ВСЕХ кнопок MVP.
- **Контекст:** `uiManager.js` должен управлять всеми интерактивными элементами UI.
- **Атомарное действие:** Провести code review `frontend/js/ui/uiManager.js`. Проверить наличие и корректность обработчиков для кнопок:
    - MVP Critical: "Mic", "Tria (Chat Input)", "My Gestures", "My Holograms", "Chat History".
    - Other Buttons: "Load Audio", "Play", "Pause", "Stop", "Fullscreen", "XR", "Gesture Record", "Hologram List", "Scan", "Bluetooth", "Telegram", "GitHub", "Install PWA".
    - Проверить логику для критичных кнопок (переключение `audioAnalyzer.js`, отправка сообщения Tria, открытие панелей).
    - Проверить, что остальные кнопки логируют в консоль или показывают "Not Implemented".
    - Проверить наличие обработчика для поля ввода файла (chunk upload).
- **Ожидаемый результат:** `uiManager.js` содержит корректные обработчики для всех кнопок MVP, обеспечивая базовую интерактивность.
- **MVP Task Dependencies:** Section C: Implement `uiManager.js` listeners for all buttons.
- **Критичность:** Средняя
- ** Ответственный:** Frontend Team
- ** Прогресс:** В процессе (Нуждается в комплексной проверке)

---
**Промпт:**
- **ID:** [20240726-1015-017]
- **Источник:** Audit Report - Section C
- **Цель:** Проверить или реализовать механизм отправки сообщений чата на бэкенд.
- **Контекст:** Пользователь должен иметь возможность отправлять сообщения Tria боту.
- **Атомарное действие:** В файле, ответственном за UI чата (см. ID [20240726-1013-015]):
    1.  Убедиться, что есть поле ввода для текста сообщения и кнопка отправки.
    2.  Реализовать/проверить JavaScript код, который при отправке:
        - Собирает текст сообщения.
        - Вызывает соответствующий метод в `apiService.js` для отправки сообщения на `tria_chat_handler` Cloud Function.
        - Очищает поле ввода.
        - Отображает отправленное сообщение в UI чата.
- **Ожидаемый результат:** Пользователь может ввести текст в UI чата и отправить его на бэкенд. Отправленное сообщение отображается в истории чата.
- **MVP Task Dependencies:** Section C: Implement chat input field and send mechanism in `chatUI.js`.
- **Критичность:** Высокая
- ** Ответственный:** Frontend Team
- ** Прогресс:** В процессе (Нуждается в проверке, возможно неверное имя файла)

## Section D: "Interaction Chunk" Pipeline

---
**Промпт:**
- **ID:** [20240726-1016-018]
- **Источник:** Audit Report - Section D
- **Цель:** Проверить логику прямой загрузки файлов в Firebase Storage в `frontend/js/services/firebaseStorageService.js`.
- **Контекст:** Файлы (interaction chunks) должны загружаться напрямую из frontend в Firebase Storage.
- **Атомарное действие:** Провести code review `frontend/js/services/firebaseStorageService.js`. Убедиться, что:
    1.  Файл корректно выбирается пользователем (эта часть может быть в `uiManager.js`).
    2.  Сервис правильно инициализирует Firebase Storage SDK.
    3.  Путь для загрузки в Firebase Storage формируется корректно (например, `user_uploads/<user_id>/<chunk_id>`).
    4.  Метаданные файла (имя, тип, timestamp клиента) сохраняются как метаданные объекта Firebase Storage.
    5.  Процесс загрузки обрабатывается с обратной связью для пользователя (прогресс, успех, ошибка).
- **Ожидаемый результат:** `firebaseStorageService.js` корректно загружает файлы в Firebase Storage с необходимыми метаданными.
- **MVP Task Dependencies:** Section D: Implement frontend direct upload to Firebase Storage.
- **Критичность:** Высокая
- ** Ответственный:** Frontend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

---
**Промпт:**
- **ID:** [20240726-1017-019]
- **Источник:** Audit Report - Section D
- **Цель:** Проверить `process_chunk` Cloud Function (`backend/cloud_functions/process_chunk/main.py`) на корректность обработки триггера Firebase Storage и сохранения метаданных.
- **Контекст:** Эта функция запускается при загрузке нового файла в Storage и должна сохранить его метаданные в PostgreSQL.
- **Атомарное действие:** Провести code review `backend/cloud_functions/process_chunk/main.py`. Проверить:
    1.  Корректность настройки триггера Firebase Storage (проверяется при деплое, но код должен быть готов).
    2.  Правильность извлечения данных о файле из события триггера (путь, имя, метаданные).
    3.  Извлечение User ID из пути файла или метаданных.
    4.  Использование `crud_operations.py` для сохранения метаданных в таблицу `audiovisual_gestural_chunks` в PostgreSQL.
    5.  Обработку ошибок и логирование.
    6.  (Если `ChunkProcessorBot.py` уже создан) корректный вызов `ChunkProcessorBot.py`.
- **Ожидаемый результат:** `process_chunk/main.py` корректно обрабатывает новые файлы из Storage и сохраняет их метаданные.
- **MVP Task Dependencies:** Section D: Develop `process_chunk` Cloud Function with Storage trigger.
- **Критичность:** Высокая
- ** Ответственный:** Backend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

## Section E: Backend - Core Logic in Firebase Cloud Functions

---
**Промпт:**
- **ID:** [20240726-1018-020]
- **Источник:** Audit Report - Section E
- **Цель:** Уточнить роль `backend/main.py` в контексте Firebase Cloud Functions.
- **Контекст:** Документ упоминает `backend/main.py` ИЛИ `backend/cloud_functions/` для определения функций. `backend/main.py` выглядит как FastAPI приложение. Необходимо понять, как он используется для деплоя функций, если используется.
- **Атомарное действие:**
    1.  Проанализировать `backend/main.py` и конфигурацию деплоя Firebase Functions (например, `firebase.json` или скрипты деплоя).
    2.  Определить, деплоятся ли функции из `backend/cloud_functions/` индивидуально, или `backend/main.py` (FastAPI) адаптирован для запуска как одна большая Cloud Function, хостящая разные эндпоинты.
    3.  Документировать принятую стратегию для ясности команды.
- **Ожидаемый результат:** Четкое понимание и документация стратегии деплоя Firebase Cloud Functions.
- **MVP Task Dependencies:** Section E: Define specific Cloud Functions needed for MVP.
- **Критичность:** Средняя (Уточнение архитектуры)
- ** Ответственный:** Backend Team/Lead Dev
- ** Прогресс:** Не начато (Уточнение архитектуры)

---
**Промпт:**
- **ID:** [20240726-1019-021]
- **Источник:** Audit Report - Section E
- **Цель:** Проверить `backend/core/db/pg_connector.py` на корректность подключения к Neon.tech PostgreSQL.
- **Контекст:** Важно обеспечить надежное подключение к БД из Cloud Functions.
- **Атомарное действие:** Провести code review `backend/core/db/pg_connector.py`. Убедиться, что:
    1.  Используются корректные переменные окружения для строки подключения (согласно конфигурации Firebase Functions).
    2.  Соединение устанавливается и закрывается корректно.
    3.  Обрабатываются возможные ошибки подключения.
    4.  (Если возможно на данном этапе) Провести тестовое подключение к Neon.tech из локального окружения с использованием этого коннектора.
- **Ожидаемый результат:** `pg_connector.py` обеспечивает корректное и безопасное подключение к Neon.tech PostgreSQL.
- **MVP Task Dependencies:** Section E: Setup Neon.tech PostgreSQL database and test connection.
- **Критичность:** Высокая
- ** Ответственный:** Backend Team
- ** Прогресс:** Частично выполнено (Нуждается в проверке и тестировании)

---
**Промпт:**
- **ID:** [20240726-1020-022]
- **Источник:** Audit Report - Section E
- **Цель:** Уточнить и стандартизировать стратегию управления зависимостями Python для Firebase Cloud Functions.
- **Контекст:** В аудите отмечено упоминание как глобального `backend/requirements.txt`, так и `requirements.txt` для каждой функции. Это может привести к путанице.
- **Атомарное действие:**
    1.  Проанализировать текущие `requirements.txt` файлы (глобальный и в директориях функций, например, `backend/cloud_functions/auth_sync/requirements.txt`).
    2.  Принять решение о единой стратегии:
        - Использовать только индивидуальные `requirements.txt` для каждой функции (рекомендуется для изоляции зависимостей).
        - Использовать общий `backend/requirements.txt` (если функции деплоятся как часть одного большого сервиса, например, через FastAPI в `backend/main.py`).
    3.  Обновить файлы `requirements.txt` согласно принятой стратегии, удалив дублирование или неиспользуемые файлы.
    4.  Убедиться, что все необходимые зависимости для `auth_sync`, `process_chunk`, `tria_chat_handler` и используемых ими модулей из `backend/core` указаны.
- **Ожидаемый результат:** Единая, понятная и корректная стратегия управления Python зависимостями для всех Cloud Functions. Файлы `requirements.txt` обновлены.
- **MVP Task Dependencies:** Section E: Dependencies.
- **Критичность:** Средняя (Улучшение процесса сборки)
- ** Ответственный:** Backend Team/Lead Dev
- ** Прогресс:** Не начато (Уточнение стратегии)

---
**Промпт:**
- **ID:** [20240726-1021-023]
- **Источник:** Audit Report - Section E & F
- **Цель:** Проверить, что все Cloud Functions (`auth_sync`, `process_chunk`, `tria_chat_handler`) корректно импортируют и используют общую логику из `backend/core/` (services, DB operations, models, tria_bots).
- **Контекст:** Переиспользование кода важно для поддержки и консистентности.
- **Атомарное действие:** Провести code review `main.py` файлов в каждой директории Cloud Function (`backend/cloud_functions/*/main.py`). Убедиться, что:
    1.  Импорты из `backend.core.*` (например, `backend.core.crud_operations`, `backend.core.services.llm_service`, `backend.core.tria_bots.ChatBot`) корректны.
    2.  Экземпляры необходимых классов создаются правильно.
    3.  Методы этих классов вызываются с ожидаемыми параметрами.
- **Ожидаемый результат:** Cloud Functions эффективно используют общую логику из `backend/core/`.
- **MVP Task Dependencies:** Section E: Functions import shared logic from `backend/core/`. Section F: Ensure Cloud Functions use bot modules.
- **Критичность:** Средняя
- ** Ответственный:** Backend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

## Section F: Backend - MVP Tria Bot Logic

---
**Промпт:**
- **ID:** [20240726-1022-024]
- **Источник:** Audit Report - Section F
- **Цель:** Проверить реализацию `backend/core/tria_bots/ChatBot.py` для обработки логики чата и интеграции с LLM.
- **Контекст:** `ChatBot.py` является центральным компонентом для взаимодействия с пользователем через Tria.
- **Атомарное действие:** Провести code review `backend/core/tria_bots/ChatBot.py`. Убедиться, что:
    1.  Класс `ChatBot` корректно инициализируется.
    2.  Есть метод для приема текстового ввода от пользователя.
    3.  Этот метод использует `llm_service.py` для взаимодействия с LLM (отправка промпта, получение ответа).
    4.  Реализована базовая RAG логика (если это входит в MVP) с использованием данных из PostgreSQL (через `crud_operations.py`).
    5.  Метод возвращает ответ LLM.
    6.  Обрабатываются возможные ошибки от `llm_service.py`.
- **Ожидаемый результат:** `ChatBot.py` корректно обрабатывает логику чата и взаимодействует с LLM.
- **MVP Task Dependencies:** Section F: Implement `ChunkProcessorBot.py` and `ChatBot.py` modules.
- **Критичность:** Высокая
- ** Ответственный:** Backend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

---
**Промпт:**
- **ID:** [20240726-1023-025]
- **Источник:** Audit Report - Section F
- **Цель:** Проверить реализацию `backend/core/services/llm_service.py` для стандартизированных вызовов LLM API (Mistral/Devstral/Gemini).
- **Контекст:** `llm_service.py` должен абстрагировать вызовы к различным LLM.
- **Атомарное действие:** Провести code review `backend/core/services/llm_service.py`. Убедиться, что:
    1.  Сервис может работать с одним или несколькими LLM провайдерами (в зависимости от результатов [20240726-1002-004]).
    2.  API ключи получается безопасно (например, из переменных окружения Firebase Functions).
    3.  Методы для отправки запросов к LLM реализованы корректно (формирование запроса, обработка ответа).
    4.  Обрабатываются ошибки API (например, лимиты, недоступность).
    5.  Предоставляет унифицированный интерфейс для `ChatBot.py` и потенциально для `ChunkProcessorBot.py`.
- **Ожидаемый результат:** `llm_service.py` обеспечивает надежное и стандартизированное взаимодействие с LLM API.
- **MVP Task Dependencies:** Section F: Implement `llm_service.py`.
- **Критичность:** Высокая
- ** Ответственный:** Backend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

---
**Промпт:**
- **ID:** [20240726-1024-026]
- **Источник:** Audit Report - Section F
- **Цель:** Реализовать или проверить логирование взаимодействий Tria в таблицу `tria_learning_log` из Cloud Functions.
- **Контекст:** Логирование важно для анализа и улучшения Tria. Зависит от создания схемы таблицы `tria_learning_log` (ID [20240726-1000-002]).
- **Атомарное действие:** После создания схемы `tria_learning_log`:
    1.  В `backend/cloud_functions/tria_chat_handler/main.py` (и, возможно, в `process_chunk/main.py`):
        - После получения ответа от Tria бота (`ChatBot.py` или `ChunkProcessorBot.py`), вызвать `crud_operations.py`.
        - Сохранить в `tria_learning_log` информацию о взаимодействии: ID пользователя, ID сессии (если применимо), текст запроса пользователя, текст ответа Tria, временную метку.
    2.  Убедиться, что Pydantic модель для `tria_learning_log` существует и используется.
- **Ожидаемый результат:** Взаимодействия Tria корректно логируются в базу данных PostgreSQL.
- **MVP Task Dependencies:** Section F: Implement logging of Tria interactions to Neon.tech PostgreSQL from Cloud Functions. (Заблокировано ID [20240726-1000-002])
- **Критичность:** Средняя
- ** Ответственный:** Backend Team
- ** Прогресс:** Не начато (Заблокировано)

## Section G: Backend-Frontend Communication

---
**Промпт:**
- **ID:** [20240726-1025-027]
- **Источник:** Audit Report - Section G
- **Цель:** Проверить `frontend/js/services/apiService.js` на корректность URL-адресов Cloud Functions и форматов запросов/ответов.
- **Контекст:** `apiService.js` является центральной точкой для HTTP вызовов из frontend в backend.
- **Атомарное действие:** Провести code review `frontend/js/services/apiService.js`. Убедиться, что:
    1.  URL-адреса для HTTP-триггерных Cloud Functions (`auth_sync`, `tria_chat_handler`) указаны корректно (возможно, через переменные окружения frontend или конфигурационный файл).
    2.  Форматы тел запросов (payloads) для этих функций соответствуют ожиданиям на стороне бэкенда (сигнатуры функций в `main.py` соответсвующих Cloud Functions).
    3.  Обработка ответов от Cloud Functions (JSON) корректна.
    4.  Обрабатываются ошибки HTTP запросов.
- **Ожидаемый результат:** `apiService.js` корректно и надежно взаимодействует с HTTP эндпоинтами Cloud Functions.
- **MVP Task Dependencies:** Section G: Update `frontend/js/services/apiService.js` to correctly call deployed/emulated Cloud Function URLs.
- **Критичность:** Средняя
- ** Ответственный:** Frontend Team / Fullstack
- ** Прогресс:** В процессе (Нуждается в проверке)

## Section IV: Final Check & Polish (Actionable Items)

---
**Промпт:**
- **ID:** [20240726-1026-028]
- **Источник:** Audit Report - Section IV (Core Functionality Test)
- **Цель:** Провести End-to-End тестирование всего потока аутентификации пользователя.
- **Контекст:** Необходимо убедиться, что пользователь может зарегистрироваться, войти в систему, и его данные корректно синхронизируются с PostgreSQL.
- **Атомарное действие:** Выполнить следующие шаги тестирования:
    1.  На frontend, используя UI, зарегистрировать нового пользователя.
    2.  Проверить, что пользователь успешно аутентифицирован в Firebase Auth (например, через Firebase Console).
    3.  Проверить, что Cloud Function `auth_sync` была вызвана.
    4.  Проверить в базе данных Neon.tech PostgreSQL, что данные нового пользователя (UID, email) были корректно сохранены в таблице `users`.
    5.  Выйти из системы.
    6.  Войти в систему с учетными данными ранее созданного пользователя.
    7.  Проверить, что вход успешен.
- **Ожидаемый результат:** Полный цикл аутентификации (регистрация, вход, синхронизация данных) работает корректно.
- **MVP Task Dependencies:** All of Section A.
- **Критичность:** Высокая
- ** Ответственный:** QA/Testing Team (или разработчики)
- ** Прогресс:** Не начато (Зависит от завершения задач в Section A)

---
**Промпт:**
- **ID:** [20240726-1027-029]
- **Источник:** Audit Report - Section IV (Core Functionality Test)
- **Цель:** Провести End-to-End тестирование загрузки Interaction Chunk и его обработки.
- **Контекст:** Пользователь должен иметь возможность загрузить медиа-файл, который затем обрабатывается бэкендом.
- **Атомарное действие:** Выполнить следующие шаги тестирования:
    1.  На frontend, используя UI, загрузить тестовый аудио/видео файл.
    2.  Проверить, что файл успешно загружен в Firebase Storage (в правильную директорию, с метаданными).
    3.  Проверить, что Cloud Function `process_chunk` была вызвана триггером Firebase Storage.
    4.  Проверить в базе данных Neon.tech PostgreSQL, что метаданные чанка (путь в Storage, User ID, etc.) были корректно сохранены в таблице `audiovisual_gestural_chunks`.
    5.  (Если `ChunkProcessorBot.py` реализован) Проверить, что базовая логика бота была выполнена (например, созданы доп. логи или записи в БД).
- **Ожидаемый результат:** Полный цикл загрузки и базовой обработки Interaction Chunk работает корректно.
- **MVP Task Dependencies:** All of Section D, Section E (`ChunkProcessorBot.py` creation).
- **Критичность:** Высокая
- ** Ответственный:** QA/Testing Team (или разработчики)
- ** Прогресс:** Не начато (Зависит от завершения задач в Section D и E)

---
**Промпт:**
- **ID:** [20240726-1028-030]
- **Источник:** Audit Report - Section IV (Core Functionality Test)
- **Цель:** Провести End-to-End тестирование базового взаимодействия с Tria ботом.
- **Контекст:** Пользователь должен иметь возможность отправить сообщение Tria боту и получить ответ.
- **Атомарное действие:** Выполнить следующие шаги тестирования:
    1.  На frontend, используя UI чата, отправить текстовое сообщение.
    2.  Проверить, что Cloud Function `tria_chat_handler` была вызвана.
    3.  Проверить, что `ChatBot.py` и `llm_service.py` были задействованы (через логи или отладку, если возможно).
    4.  Убедиться, что LLM API вернул ответ (зависит от ID [20240726-1002-004]).
    5.  Проверить, что ответ Tria бота отобразился в UI чата.
    6.  (Если реализовано логирование) Проверить, что взаимодействие было записано в таблицу `tria_learning_log` (зависит от ID [20240726-1000-002] и [20240726-1024-026]).
- **Ожидаемый результат:** Базовое взаимодействие с Tria ботом (отправка запроса, получение ответа LLM, отображение в UI) работает корректно.
- **MVP Task Dependencies:** All of Section F, Section C (Chat UI), Section G.
- **Критичность:** Высокая
- ** Ответственный:** QA/Testing Team (или разработчики)
- ** Прогресс:** Не начато (Зависит от многих компонентов)

---
**Промпт:**
- **ID:** [20240726-1029-031]
- **Источник:** Audit Report - Section IV (Core Functionality Test)
- **Цель:** Протестировать отображение базовой голограммы и ее реакцию на микрофон.
- **Контекст:** Визуализация голограммы и ее аудиореактивность - ключевой элемент фронтенда.
- **Атомарное действие:** Выполнить следующие шаги тестирования:
    1.  Открыть frontend приложение в браузере.
    2.  Убедиться, что на странице отображается базовая 3D визуализация (голограмма).
    3.  Предоставить доступ к микрофону, когда будет запрошен.
    4.  Говорить в микрофон или воспроизводить звук.
    5.  Наблюдать за визуализацией голограммы – она должна реагировать на звук (изменение формы, цвета, интенсивности и т.д.).
    6.  Проверить работу кнопки "Mic" для включения/выключения анализа аудио.
- **Ожидаемый результат:** Голограмма отображается и корректно реагирует на аудиовход с микрофона.
- **MVP Task Dependencies:** All of Section B.
- **Критичность:** Высокая
- ** Ответственный:** QA/Testing Team (или Frontend разработчики)
- ** Прогресс:** Не начато (Зависит от завершения задач в Section B)

---
**Промпт:**
- **ID:** [20240726-1030-032]
- **Источник:** Audit Report - Section IV (Technical Checks)
- **Цель:** Проверить наличие и корректность базовой обработки ошибок и логирования в Firebase Cloud Functions.
- **Контекст:** Адекватная обработка ошибок и логирование необходимы для отладки и поддержки.
- **Атомарное действие:** Провести code review `main.py` файлов для каждой Cloud Function (`auth_sync`, `process_chunk`, `tria_chat_handler`). Проверить:
    1.  Наличие блоков `try...except` для ожидаемых ошибок (например, ошибки API, ошибки БД, неверные входные данные).
    2.  Логирование ошибок (например, с использованием стандартного модуля `logging` Python или специфичных для Firebase логгеров).
    3.  Логирование ключевых этапов выполнения функции для отладки.
    4.  Возврат осмысленных кодов ошибок/сообщений на frontend в случае сбоя.
- **Ожидаемый результат:** Все Cloud Functions имеют базовую обработку ошибок и логирование.
- **MVP Task Dependencies:** Sections A, D, E, F (т.е. код самих функций).
- **Критичность:** Средняя
- ** Ответственный:** Backend Team
- ** Прогресс:** В процессе (Нуждается в проверке)

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
- **Атомарное действие:** Прочитать `README.md`. Убедиться, что в нем есть (или добавить) четкие инструкции по:
    1.  Настройке Firebase проекта (включение Auth, Storage, Functions, Hosting).
    2.  Установке Firebase CLI.
    3.  Запуску локального эмулятора Firebase (`firebase emulators:start`).
    4.  Деплою frontend (`firebase deploy --only hosting`).
    5.  Деплою Cloud Functions (`firebase deploy --only functions`), включая информацию о выбранной стратегии (см. ID [20240726-1018-020] и [20240726-1020-022]).
- **Ожидаемый результат:** `README.md` содержит актуальные и полные инструкции для развертывания и локальной разработки MVP.
- **MVP Task Dependencies:** Зависит от уточнений по стратегии деплоя функций.
- **Критичность:** Средняя
- ** Ответственный:** Lead Dev / DevOps
- ** Прогресс:** В процессе (Нуждается в проверке)

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
        - Аутентифицированные пользователи могли загружать файлы в свои директории (например, `user_uploads/{'{userID}'}/{fileName}`).
        - Чтение файлов ограничено в соответствии с требованиями MVP (например, только владелец или нет публичного чтения без необходимости).
        - Неаутентифицированный доступ запрещен или строго ограничен.
    3.  Обновить правила, если они не соответствуют требованиям MVP.
- **Ожидаемый результат:** Правила безопасности Firebase Storage настроены и обеспечивают базовый уровень защиты данных для MVP.
- **MVP Task Dependencies:** Общая задача по безопасности.
- **Критичность:** Высокая
- ** Ответственный:** Lead Dev / DevOps
- ** Прогресс:** Не начато (Внешняя конфигурация)

```
