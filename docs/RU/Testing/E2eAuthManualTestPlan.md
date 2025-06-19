# План Ручного End-to-End Тестирования Аутентификации (MVP)

**ID Промпта:** [20240726-1026-028]
**Цель:** Убедиться, что полный поток аутентификации пользователя, включая регистрацию, вход и синхронизацию данных с PostgreSQL, работает корректно.

---

## Предварительные условия

Для успешного выполнения этого плана тестирования убедитесь, что:

1.  Firebase проект настроен (Firebase Authentication, Cloud Functions, Firebase Hosting).
2.  Cloud Functions `auth_sync` и `tria_chat_handler` (если она использует верификацию токена) развернуты или запущены локально в эмуляторе Firebase.
3.  База данных Neon.tech PostgreSQL доступна, и схема таблицы `users` создана (см. `backend/core/db/schema.sql`).
4.  Переменная окружения `NEON_DATABASE_URL` правильно сконфигурирована для Firebase Functions.
5.  Frontend приложение развернуто (или запущено локально).
6.  У вас есть доступ к:
    *   Консоли Firebase (для проверки пользователей Auth и логов Cloud Functions).
    *   Инструментам для просмотра данных в PostgreSQL (например, pgAdmin, DBeaver, или CLI Neon.tech).
    *   Браузеру с включенной консолью разработчика.

---

## Тестовые шаги

| Шаг | Действие | Ожидаемый результат | Место проверки | Необходимые инструменты/данные |
| :-- | :------- | :----------------- | :------------- | :------------------------------ |
| **1: Регистрация нового пользователя** | | | | |
| 1.1 | Открыть Frontend приложение в браузере. | Приложение загружается, отображается UI для входа/регистрации. | Браузер | URL Frontend приложения |
| 1.2 | Нажать кнопку "Sign In with Google" (или аналогичную). | Появится всплывающее окно аутентификации Google. | Браузер | Тестовый аккаунт Google, не зарегистрированный ранее в Firebase Auth данного проекта |
| 1.3 | Выбрать Google аккаунт для регистрации. | <ol><li>Firebase Auth успешно регистрирует нового пользователя.</li><li>Frontend UI обновляется, отображая статус "Signed in as: <User Name/Email>".</li><li>В консоли браузера (DevTools) будет сообщение от `auth.js` о получении токена и попытке отправки на бэкенд ("Auth.js: Received token. Attempting to send to backend auth_sync function.").</li></ol> | Браузер, Консоль браузера | Тестовый аккаунт Google |
| 1.4 | Проверить логи Cloud Function `auth_sync`. | <ol><li>Функция `auth_sync` была вызвана.</li><li>В логах `auth_sync` есть запись о `Received auth_sync_user request.`.</li><li>В логах `auth_sync` есть запись `Token verified for UID: <Firebase UID>`.</li><li>В логах `auth_sync` есть запись `User with Firebase UID <Firebase UID> not found. Creating new user.` (или аналогичная).</li><li>В логах `auth_sync` есть запись `New user created with Firebase UID: <Firebase UID>`.</li><li>Статус ответа функции HTTP 201.</li></ol> | Консоль Firebase -> Functions -> Logs для `auth_sync` | Доступ к логам Firebase Functions |
| 1.5 | Проверить базу данных Neon.tech PostgreSQL. | <ol><li>В таблице `users` появилась новая запись.</li><li>`user_id` новой записи соответствует Firebase UID пользователя.</li><li>`email` новой записи соответствует email пользователя.</li><li>`created_at` и `updated_at` заполнены корректно.</li></ol> | Инструмент для просмотра БД PostgreSQL (pgAdmin, DBeaver, psql) | Доступ к БД Neon.tech |
| **2: Выход из системы** | | | | |
| 2.1 | Нажать кнопку "Sign Out" на Frontend. | <ol><li>Пользователь успешно выходит из Firebase Auth.</li><li>Frontend UI обновляется, отображая статус "No user signed in.".</li><li>В консоли браузера сообщение "Auth.js: User signed out or no token received.".</li></ol> | Браузер, Консоль браузера | |
| **3: Вход существующего пользователя** | | | | |
| 3.1 | Нажать кнопку "Sign In with Google". | Появится всплывающее окно аутентификации Google. | Браузер | Тот же Google аккаунт, который использовался для регистрации в шаге 1.2 |
| 3.2 | Выбрать тот же Google аккаунт, что и для регистрации. | <ol><li>Firebase Auth успешно аутентифицирует пользователя.</li><li>Frontend UI обновляется, отображая статус "Signed in as: <User Name/Email>".</li><li>В консоли браузера сообщение от `auth.js` о получении токена и попытке отправки на бэкенд.</li></ol> | Браузер, Консоль браузера | |
| 3.3 | Проверить логи Cloud Function `auth_sync`. | <ol><li>Функция `auth_sync` была вызвана.</li><li>В логах `auth_sync` есть запись `Token verified for UID: <Firebase UID>`.</li><li>В логах `auth_sync` есть запись `User with Firebase UID <Firebase UID> already exists and is synced.` (или аналогичная).</li><li>Статус ответа функции HTTP 200.</li></ol> | Консоль Firebase -> Functions -> Logs для `auth_sync` | |
| 3.4 | Проверить базу данных Neon.tech PostgreSQL. | <ol><li>В таблице `users` нет новой записи для этого пользователя.</li><li>Запись для данного `user_id` существует, и ее поля (например, `updated_at`) могли быть обновлены, если это реализовано в `auth_sync` (для MVP это не обязательно, но полезно).</li></ol> | Инструмент для просмотра БД PostgreSQL | |

---

## Предложения по улучшению логирования для E2E тестирования (для реализации в бэкенд-коде)

Чтобы еще больше упростить отладку и тестирование, можно добавить следующие точки логирования в бэкенд-компоненты:

### `backend/cloud_functions/auth_sync/main.py`

*   **Перед `auth_header = req.headers.get("Authorization")` (строка ~40):**
    ```python
    print("auth_sync: Attempting to extract Authorization header.")
    ```
*   **После успешного `decoded_token = auth_service.verify_firebase_token(id_token)` (строка ~60):**
    ```python
    print(f"auth_sync: Token successfully verified for email: {decoded_token.get('email', 'N/A')}")
    ```
*   **Перед `existing_user = await get_user_by_firebase_uid(db_conn, firebase_uid=firebase_uid)` (строка ~78):**
    ```python
    print(f"auth_sync: Checking for existing user with Firebase UID: {firebase_uid}")
    ```
*   **Внутри `if not existing_user:` блока, перед созданием `UserCreate` (строка ~82):**
    ```python
    print(f"auth_sync: User {firebase_uid} does not exist in DB. Preparing to create new record.")
    ```
*   **После `new_user = await create_user(db_conn, user_create=user_to_create_model)` (строка ~90):**
    ```python
    print(f"auth_sync: New user record created for Firebase UID: {new_user.user_id_firebase}")
    ```
*   **В `else` блоке, если пользователь найден (строка ~94):**
    ```python
    print(f"auth_sync: User {existing_user.user_id_firebase} found in DB. Synchronization confirmed.")
    ```

### `backend/core/auth_service.py`

*   **В начале `verify_firebase_token` (строка ~30):**
    ```python
    print("AuthService: Attempting to verify Firebase ID token.")
    ```
*   **Перед `decoded_token = auth.verify_id_token(id_token_string)` (строка ~38):**
    ```python
    print("AuthService: Calling firebase_admin.auth.verify_id_token...")
    ```
*   **В `except` блоках `InvalidIdTokenError`, `ExpiredIdTokenError`, `RevokedIdTokenError` (строки ~40-48):**
    Убедиться, что `print` (или `logger.error`) сообщения включают детали ошибки, как сейчас, это уже хорошо.

Эти дополнительные логирующие сообщения предоставят более детальную трассировку выполнения запроса через бэкенд, что будет очень полезно при отладке и подтверждении E2E потока аутентификации.
