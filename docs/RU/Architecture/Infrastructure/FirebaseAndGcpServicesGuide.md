<!-- This guide now primarily focuses on setting up and deploying Firebase Hosting for the TRIA frontend and configuring Firebase Authentication. Backend services (FastAPI application, Database, File Storage) are deployed on other platforms and covered in separate guides (e.g., koyeb_r2_deployment_guide.md for FastAPI on Koyeb and Cloudflare R2). This document covers auxiliary GCP services only if they directly support Firebase Hosting or Authentication. -->
# Руководство по Firebase Hosting и Authentication для TRIA

**Дата Актуализации:** 2024-07-31

Это руководство предоставляет пошаговые инструкции по настройке Firebase Hosting для фронтенд-приложения TRIA и конфигурированию Firebase Authentication.

## 1. Предварительные Требования

Перед началом убедитесь, что у вас установлено и настроено следующее:

*   **Google Cloud SDK (`gcloud`):**
    *   Установка: [Документация Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
    *   После установки инициализируйте и аутентифицируйтесь:
        ```bash
        gcloud init
        gcloud auth login
        gcloud auth application-default login
        ```
*   **Firebase CLI (`firebase`):**
    *   Установка (требуется Node.js/npm):
        ```bash
        npm install -g firebase-tools
        ```
    *   После установки войдите в систему:
        ```bash
        firebase login
        ```
*   **Node.js и npm:**
    *   Установка: [Веб-сайт Node.js](https://nodejs.org/)
    *   Необходимы для Firebase CLI, Genkit (и потенциально для разработки фронтенда).
*   **Python:**
    *   Установка: [Веб-сайт Python](https://www.python.org/)
    *   Убедитесь, что `pip` доступен для управления пакетами Python.

## 2. Настройка Проекта Google Cloud

Вы можете использовать существующий проект GCP или создать новый.

*   **Создать новый проект GCP (Опционально):**
    ```bash
    gcloud projects create YOUR_PROJECT_ID --name="TRIA Project"
    ```
    Замените `YOUR_PROJECT_ID` вашим желаемым уникальным ID проекта.

*   **Установить проект по умолчанию для `gcloud`:**
    ```bash
    gcloud config set project YOUR_PROJECT_ID
    ```

*   **Связать Firebase с проектом GCP:**
    Обычно это делается при инициализации сервисов Firebase или может быть управляемо в консоли Firebase путем добавления Firebase к существующему проекту Google Cloud.
    ```bash
    firebase projects:addfirebase YOUR_PROJECT_ID
    ```
    В качестве альтернативы, во время `firebase init` вы можете связать его с существующим проектом GCP.

## 3. Настройка Firebase

*   **Войти в Firebase (если еще не сделано):**
    ```bash
    firebase login
    ```

*   **Инициализировать Firebase в директории вашего проекта:**
    Перейдите в корневую директорию вашего проекта (или соответствующую поддиректорию, если вы предпочитаете хранить конфигурацию Firebase отдельно).
    ```bash
    firebase init
    ```
    Выберите необходимые функции. Для TRIA это в основном будет включать:
    *   **Hosting:** Для развертывания фронтенд-приложения.
        *   Когда будет предложено указать вашу публичную директорию, используйте `frontend` (или директорию вывода сборки, например, `frontend/dist`).
        *   Сконфигурируйте как одностраничное приложение (single-page app), если применимо.
    *   **Authentication:** (Настраивается через консоль Firebase, `firebase init` помогает связать проект).
    *   **Emulators:** Полезно для локальной разработки правил хостинга и аутентификации. Загрузите их, если будет предложено.
    *   (Firestore и Functions могут быть выбраны, если вы планируете использовать Firestore для специфичных данных, связанных с фронтендом, или имеете небольшие Cloud Functions, непосредственно поддерживающие хостинг/аутентификацию, но основная логика бэкенда находится на Koyeb).

*   **Включить Firebase Authentication:**
    1.  Перейдите в [Консоль Firebase](https://console.firebase.google.com/).
    2.  Выберите ваш проект.
    3.  Перейдите в раздел **Authentication** (в меню Build).
    4.  Нажмите **Get started**.
    5.  Включите желаемые методы входа (например, Google Sign-In, Email/Password).

*   **Сконфигурировать Firebase в `.env.example` (для Фронтенда):**
    После настройки Firebase и регистрации вашего веб-приложения, ваш проект получит конфигурационные ключи Firebase. Они необходимы фронтенду для взаимодействия с сервисами Firebase.
    1.  Перейдите в настройки вашего проекта Firebase в консоли Firebase.
    2.  В разделе "Your apps" найдите конфигурацию вашего веб-приложения (она может выглядеть как `firebaseConfig = { ... }`).
    3.  Скопируйте эти значения в соответствующие переменные `VITE_FIREBASE_*` (или аналогичные, в зависимости от вашей настройки фронтенда) в файле `.env` вашего фронтенда (например, `frontend/.env`, созданный из `frontend/.env.example`).
        *   `VITE_FIREBASE_API_KEY`
        *   `VITE_FIREBASE_AUTH_DOMAIN`
        *   `VITE_FIREBASE_PROJECT_ID`
        *   `VITE_FIREBASE_MESSAGING_SENDER_ID`
        *   `VITE_FIREBASE_APP_ID`
        *   `VITE_FIREBASE_MEASUREMENT_ID` (опционально)
    *Примечание: `FIREBASE_STORAGE_BUCKET` намеренно опущен, так как Cloudflare R2 используется для основного хранения файлов.*

## 4. Настройка Cloud Pub/Sub (Только для Вспомогательного Использования)

Cloud Pub/Sub обычно является частью инфраструктуры бэкенда, которая сейчас в основном находится на Koyeb. Однако, если какие-либо специфичные для Firebase сервисы (например, очень специфичные Firebase Functions, напрямую связанные с событиями Auth) требуют Pub/Sub для асинхронных задач, его можно настроить здесь. Для основной асинхронной обработки приложения (например, обработка чанков) обратитесь к руководству по инфраструктуре бэкенда.

*   **Включить Pub/Sub API (если необходимо для вспомогательных функций Firebase):**
    ```bash
    gcloud services enable pubsub.googleapis.com
    ```

*   **Создать тему Pub/Sub (если необходимо):**
    Пример:
    ```bash
    gcloud pubsub topics create your-firebase-aux-topic
    ```

## 5. Настройка Cloud Functions (Только для Вспомогательного Использования)

Firebase Cloud Functions или Google Cloud Functions могут использоваться для легковесной логики бэкенда, непосредственно поддерживающей Firebase Hosting (например, SSR для специфичных маршрутов, не обрабатываемых основным бэкендом) или пользовательских событий Firebase Authentication. Основная логика бэкенда приложения находится на Koyeb.

*   Если вам необходимо развернуть вспомогательные Cloud Functions (например, для Firebase):
    *   Обратитесь к официальной документации Firebase/Google Cloud для развертывания функций.
    *   Убедитесь, что они настроены с соответствующими триггерами (HTTP, на основе событий) и необходимыми разрешениями.
    *   Приведенный ниже пример является общим и должен быть адаптирован. **Примечание:** Триггер `TRIA_CHUNK_PROCESSING_TOPIC` и переменные окружения базы данных, скорее всего, нерелевантны для функций, исключительно поддерживающих Hosting/Auth, и являются частью основного бэкенда (Koyeb).

*   **Общая команда `gcloud functions deploy` (для вспомогательных функций):**
    ```bash
    gcloud functions deploy YOUR_AUX_FUNCTION_NAME \
        --gen2 \
        --runtime=python311 # Или nodejs, и т.д.
        --region=YOUR_REGION \
        --source=./path/to/your/aux_function_code_directory \
        --entry-point=your_function_entry_point \
        # --trigger-http # Для функций, запускаемых по HTTP
        # --trigger-event=providers/google.firebase.auth/eventTypes/user.create # Пример триггера Auth
        --service-account=YOUR_SERVICE_ACCOUNT_EMAIL # Убедитесь, что этот SA имеет минимально необходимые роли
        # --set-env-vars=... # Только если необходимо для вспомогательной функции
    ```

## 6. Сервисный Аккаунт и IAM для Сервисов Firebase

Создайте выделенный сервисный аккаунт, если у вас есть вспомогательные Cloud Functions или другие сервисы GCP, непосредственно поддерживающие вашу настройку Firebase Hosting/Authentication. Этому сервисному аккаунту будут предоставлены минимально необходимые разрешения.
Для сервисных аккаунтов, связанных с основным бэкенд-приложением (FastAPI на Koyeb), обратитесь к `koyeb_r2_deployment_guide.md`.

*   **Создать сервисный аккаунт (для вспомогательных сервисов Firebase):**
    ```bash
    gcloud iam service-accounts create TRIA_AUX_SA \
        --description="Service account for TRIA auxiliary Firebase services" \
        --display-name="TRIA Firebase Aux SA"
    ```
    Замените `TRIA_AUX_SA` (например, `tria-firebase-aux-sa`).
    Email будет `TRIA_AUX_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com`.

*   **Предоставить роли сервисному аккаунту (для вспомогательных функций Firebase):**
    Предоставляйте только необходимые роли. Пример ролей для сервисного аккаунта, используемого вспомогательными Firebase Functions, которые могут взаимодействовать с Firebase Admin SDK или вызывать другие функции:
    ```bash
    # Firebase Admin (если используется Firebase Admin SDK для управления пользователями, кастомными токенами и т.д. во вспомогательных функциях)
    # Рассмотрите более гранулярные роли Firebase, если полный admin не нужен.
    # Пример: roles/firebase.developAdmin или roles/firebase.authAdmin
    gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
       --member="serviceAccount:TRIA_AUX_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
       --role="roles/firebase.admin" # Или более гранулярные роли Firebase, например firebase.developAdmin

    # Cloud Functions Invoker (если вспомогательные функции должны вызывать другие Cloud Functions)
    gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
        --member="serviceAccount:TRIA_AUX_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/cloudfunctions.invoker"

    # Secret Manager Secret Accessor (если вспомогательные функции должны получать доступ к секретам)
    # gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    #     --member="serviceAccount:TRIA_AUX_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    #     --role="roles/secretmanager.secretAccessor"
    ```
    Замените `TRIA_AUX_SA` (например, `tria-firebase-aux-sa`) и `YOUR_PROJECT_ID`.
    *Избегайте предоставления слишком широких ролей. Роли, связанные с Cloud SQL, основными темами Pub/Sub приложения, Cloud Storage (для пользовательских данных) или Vertex AI, обычно не требуются для сервисных аккаунтов, связанных *только* со вспомогательными функциями Firebase Hosting/Auth, и должны управляться как часть сервисного аккаунта основного бэкенда.*

*   **Создать и загрузить ключ сервисного аккаунта (JSON) (Если Необходимо):**
    Этот ключ обычно необходим только если вы запускаете сервисы вне GCP (например, локальные скрипты, которые должны действовать от имени этого сервисного аккаунта) или если Application Default Credentials не используются средой ваших вспомогательных функций. Firebase Functions часто используют сервисный аккаунт времени выполнения напрямую.
    ```bash
    # Только если необходимо для внешнего использования или специфичных сценариев аутентификации:
    gcloud iam service-accounts keys create ./tria-aux-service-account-key.json \
        --iam-account=TRIA_AUX_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com
    ```
    *   **ВАЖНО:** Защитите этот файл ключа. Не добавляйте его в ваш репозиторий.
    *   Если используется, установите путь к этому файлу ключа в вашей среде (например, `GOOGLE_APPLICATION_CREDENTIALS`).

## 7. Настройка Genkit

Genkit — это фреймворк для создания приложений на базе ИИ и в основном является частью основной инфраструктуры бэкенда (FastAPI на Koyeb). Обратитесь к документам по развертыванию и архитектуре бэкенда (например, `koyeb_r2_deployment_guide.md`) для получения подробной информации о настройке и развертывании Genkit. Это руководство, ориентированное на Firebase, не охватывает развертывание Genkit.

## 8. Развертывание на Cloud Run (Бэкенд FastAPI)

Основной бэкенд TRIA FastAPI развертывается на Koyeb, а не на Google Cloud Run. Инструкции по развертыванию бэкенда FastAPI, включая контейнеризацию и специфику Koyeb, см. в `docs/architecture/infrastructure/koyeb_r2_deployment_guide.md`.

Этот раздел о развертывании на Cloud Run намеренно удален из данного руководства, так как его фокус — на Firebase Hosting и Authentication.

---

**Помните заменять все значения-плейсхолдеры (например, `YOUR_PROJECT_ID`, `YOUR_REGION`, `TRIA_AUX_SA`) вашими актуальными конфигурационными значениями.**
Это руководство предоставляет сфокусированную отправную точку для Firebase Hosting и Authentication.
