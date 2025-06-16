<!-- TODO: REVIEW FOR DEPRECATION - This guide now focuses on Firebase and auxiliary GCP services. The backend deployment is primarily covered in koyeb_r2_deployment_guide.md. Review remaining sections for relevance. -->
# Google Cloud Platform (GCP) and Firebase Deployment Guide for TRIA

This guide provides step-by-step instructions for deploying the TRIA application backend and related services on Google Cloud Platform and Firebase.

## 1. Prerequisites

Before you begin, ensure you have the following installed and configured:

*   **Google Cloud SDK (`gcloud`):**
    *   Installation: [Google Cloud SDK Documentation](https://cloud.google.com/sdk/docs/install)
    *   After installation, initialize and authenticate:
        ```bash
        gcloud init
        gcloud auth login
        gcloud auth application-default login
        ```
*   **Firebase CLI (`firebase`):**
    *   Installation (requires Node.js/npm):
        ```bash
        npm install -g firebase-tools
        ```
    *   After installation, log in:
        ```bash
        firebase login
        ```
*   **Node.js and npm:**
    *   Installation: [Node.js Website](https://nodejs.org/)
    *   Needed for Firebase CLI, Genkit (and potentially frontend development).
*   **Python:**
    *   Installation: [Python Website](https://www.python.org/)
    *   Ensure `pip` is available for managing Python packages.

## 2. Google Cloud Project Setup

You can use an existing GCP project or create a new one.

*   **Create a new GCP project (Optional):**
    ```bash
    gcloud projects create YOUR_PROJECT_ID --name="TRIA Project"
    ```
    Replace `YOUR_PROJECT_ID` with your desired unique project ID.

*   **Set the default project for `gcloud`:**
    ```bash
    gcloud config set project YOUR_PROJECT_ID
    ```

*   **Link Firebase to the GCP project:**
    This is typically done when initializing Firebase services or can be managed in the Firebase console by adding Firebase to an existing Google Cloud project.
    ```bash
    firebase projects:addfirebase YOUR_PROJECT_ID
    ```
    Alternatively, during `firebase init`, you can associate it with an existing GCP project.

## 3. Firebase Setup

*   **Login to Firebase (if not already done):**
    ```bash
    firebase login
    ```

*   **Initialize Firebase in your project directory:**
    Navigate to your project's root directory (or a relevant sub-directory if you prefer to keep Firebase configuration separate).
    ```bash
    firebase init
    ```
    Select the features you need. For TRIA, this will likely include:
    *   **Firestore:** For NoSQL database capabilities (if used by TRIA features).
    *   **Functions:** For serverless backend logic (Genkit might deploy here or to Cloud Functions directly).
    *   **Hosting:** To deploy the frontend application.
        *   When prompted for your public directory, use `frontend` (or your build output directory, e.g., `frontend/dist`).
        *   Configure as a single-page app if applicable.
    *   **Storage:** For user uploads, hologram assets, etc.
    *   **Emulators:** Useful for local development. Download them if prompted.

*   **Enable Firebase Authentication:**
    1.  Go to the [Firebase Console](https://console.firebase.google.com/).
    2.  Select your project.
    3.  Navigate to **Authentication** (under Build).
    4.  Click **Get started**.
    5.  Enable desired sign-in methods (e.g., Google Sign-In, Email/Password).

*   **Configure Firebase in `.env.example`:**
    After setting up Firebase, your project will have Firebase configuration keys.
    1.  Go to your Firebase project settings in the Firebase console.
    2.  Under "Your apps", find your web app configuration (it might look like `firebaseConfig = { ... }`).
    3.  Copy these values into the corresponding `FIREBASE_*` variables in your `.env` file (created from `.env.example`).
        *   `FIREBASE_API_KEY`
        *   `FIREBASE_AUTH_DOMAIN`
        *   `FIREBASE_PROJECT_ID`
        *   `FIREBASE_STORAGE_BUCKET`
        *   `FIREBASE_MESSAGING_SENDER_ID`
        *   `FIREBASE_APP_ID`
        *   `FIREBASE_MEASUREMENT_ID` (optional)

## 5. Cloud Pub/Sub Setup

Used for asynchronous task processing, like triggering Genkit flows.

*   **Enable the Pub/Sub API:**
    ```bash
    gcloud services enable pubsub.googleapis.com
    ```

*   **Create a Pub/Sub topic:**
    The topic name should match `PUB_SUB_TOPIC_CHUNK_PROCESSING` from `.env.example`.
    ```bash
    gcloud pubsub topics create TRIA_CHUNK_PROCESSING_TOPIC
    ```
    Replace `TRIA_CHUNK_PROCESSING_TOPIC` (e.g., `tria-chunk-processing-topic`).

## 6. Cloud Functions Setup (Python runtime)

You might need Cloud Functions to:
*   Act as triggers for Genkit flows (e.g., from Pub/Sub messages).
*   Wrap existing Python logic (like `crud_operations.py`) for serverless execution.

*   **Example `gcloud functions deploy` command:**
    This is a generic example. You'll need to adapt it based on your function's specifics.
    ```bash
    gcloud functions deploy YOUR_FUNCTION_NAME \
        --gen2 \
        --runtime=python311 \
        --region=YOUR_REGION \
        --source=./path/to/your/function_code_directory \
        --entry-point=your_function_entry_point \
        --trigger-topic=TRIA_CHUNK_PROCESSING_TOPIC \
        # --trigger-http # For HTTP triggered functions
        --service-account=YOUR_SERVICE_ACCOUNT_EMAIL \
        --set-env-vars=DATABASE_URL="postgresql+psycopg2://USER:PASS@/DBNAME?host=/cloudsql/PROJECT:REGION:INSTANCE"
        # Add other necessary environment variables
    ```
    *   Replace `YOUR_FUNCTION_NAME`, `YOUR_REGION`, `./path/to/your/function_code_directory`, `your_function_entry_point`, `TRIA_CHUNK_PROCESSING_TOPIC`.
    *   `--service-account`: Use the email of the service account created in the next step.
    *   `--set-env-vars`: Set environment variables required by your function, such as database connection strings or API keys. For Cloud SQL, the `DATABASE_URL` format shown uses the Cloud SQL Proxy socket path.

## 7. Service Account and IAM

Create a dedicated service account for your backend services (Cloud Run, Cloud Functions) to grant them necessary permissions securely.

*   **Create a service account:**
    ```bash
    gcloud iam service-accounts create TRIA_BACKEND_SA \
        --description="Service account for TRIA backend services" \
        --display-name="TRIA Backend SA"
    ```
    Replace `TRIA_BACKEND_SA` (e.g., `tria-backend-sa`).
    The email will be `TRIA_BACKEND_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com`.

*   **Grant roles to the service account:**
    Grant necessary roles to the service account.
    ```bash
    # Cloud SQL Client (to connect to Cloud SQL)
    gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
        --member="serviceAccount:TRIA_BACKEND_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/cloudsql.client"

    # Pub/Sub Publisher (to publish messages, if needed)
    gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
        --member="serviceAccount:TRIA_BACKEND_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/pubsub.publisher"

    # Pub/Sub Subscriber (for Cloud Functions triggered by Pub/Sub)
    # This is often granted automatically when deploying a Pub/Sub triggered function with the SA,
    # but can be granted explicitly if needed.
    # gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    #     --member="serviceAccount:TRIA_BACKEND_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    #     --role="roles/pubsub.subscriber"


    # Cloud Storage Object Admin (to read/write to Firebase Storage buckets)
    gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
        --member="serviceAccount:TRIA_BACKEND_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/storage.objectAdmin"

    # Firebase Admin (if using Firebase Admin SDK for user management, custom tokens, etc.)
    # Check Firebase documentation for specific roles if needed, e.g., roles/firebase.admin
    # gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    #    --member="serviceAccount:TRIA_BACKEND_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    #    --role="roles/firebase.admin" # Or more granular Firebase roles

    # Cloud Functions Invoker (if Genkit or other services need to invoke Cloud Functions)
    gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
        --member="serviceAccount:TRIA_BACKEND_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/cloudfunctions.invoker"

    # Vertex AI User (if Genkit uses Vertex AI for models)
    gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
        --member="serviceAccount:TRIA_BACKEND_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/aiplatform.user"

    # Secret Manager Secret Accessor (if you store secrets in Secret Manager)
    # gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    #     --member="serviceAccount:TRIA_BACKEND_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    #     --role="roles/secretmanager.secretAccessor"
    ```
    Remember to replace `TRIA_BACKEND_SA` and `YOUR_PROJECT_ID`.

*   **Create and download a service account key (JSON):**
    This key is used by backend services running outside GCP (e.g., local development) or when Application Default Credentials are not sufficient.
    ```bash
    gcloud iam service-accounts keys create ./tria-service-account-key.json \
        --iam-account=TRIA_BACKEND_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com
    ```
    *   **IMPORTANT:** Secure this key file. Do not commit it to your repository.
    *   Set the path to this key file in your `.env` file for the `GOOGLE_APPLICATION_CREDENTIALS` variable, e.g., `GOOGLE_APPLICATION_CREDENTIALS="/path/to/your/tria-service-account-key.json"`.
    *   When running on GCP services like Cloud Run or Cloud Functions, they can typically use the attached service account directly without needing a JSON key file, if the service account is correctly assigned during deployment.

## 8. Genkit Setup (Placeholder)

Genkit is a framework for building AI-powered applications. Detailed Genkit deployment will depend on how it's integrated.

*   Genkit flows might be deployed as:
    *   Firebase Functions
    *   Google Cloud Functions
    *   Part of the FastAPI backend on Cloud Run.
*   If Genkit flows are exposed via HTTP endpoints (e.g., for processing interaction chunks), their URLs will need to be configured in the `.env` file:
    *   `GENKIT_FLOW_HTTP_TRIGGER_URL_PROCESS_INTERACTION_CHUNK`
    *   `CLOUD_FUNCTION_TRIGGER_URL_CHUNK_PROCESSING` (if a Cloud Function triggers Genkit)
*   The service account (`TRIA_BACKEND_SA`) will need permissions to run Genkit flows and access any GCP services Genkit uses (like Vertex AI).

*(Detailed Genkit deployment steps will be added as the Genkit integration is finalized.)*

## 9. Cloud Run Deployment (FastAPI Backend - Placeholder)

The FastAPI backend (located in the `backend/` directory) will be containerized using the `Dockerfile` and deployed to Cloud Run.

*   **Build and Push Docker Image:**
    You'll typically build the Docker image and push it to Google Artifact Registry or Google Container Registry.
    ```bash
    # Enable Artifact Registry API
    gcloud services enable artifactregistry.googleapis.com

    # Create a Docker repository in Artifact Registry
    gcloud artifacts repositories create tria-repo \
        --repository-format=docker \
        --location=YOUR_REGION \
        --description="TRIA Docker repository"

    # Configure Docker to use gcloud as a credential helper
    gcloud auth configure-docker YOUR_REGION-docker.pkg.dev

    # Build the image (from the root of the project where Dockerfile is)
    docker build -t YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/tria-repo/tria-backend:latest -f Dockerfile .

    # Push the image
    docker push YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/tria-repo/tria-backend:latest
    ```

*   **Deploy to Cloud Run:**
    ```bash
    gcloud run deploy tria-backend-service \
        --image=YOUR_REGION-docker.pkg.dev/YOUR_PROJECT_ID/tria-repo/tria-backend:latest \
        --platform=managed \
        --region=YOUR_REGION \
        --service-account=TRIA_BACKEND_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com \
        --allow-unauthenticated \
        # --port=8000 # Or your backend's configured port
        --set-env-vars=^::^POSTGRES_USER="your_db_user"::POSTGRES_PASSWORD="your_db_pass"::POSTGRES_DB="holograms_db"::CLOUD_SQL_INSTANCE_CONNECTION_NAME="project:region:instance" # Add all other env vars from .env
        # For Cloud SQL, also ensure the Cloud SQL connection is configured:
        --add-cloudsql-instances=YOUR_PROJECT_ID:YOUR_REGION:TRIA_INSTANCE_NAME
    ```
    *   Replace placeholders.
    *   `--allow-unauthenticated`: For public access. Configure authentication as needed.
    *   `--set-env-vars`: Pass environment variables. Use the `^::^` delimiter for multiple variables. **It's highly recommended to use Secret Manager for sensitive values like database passwords instead of setting them directly as environment variables.**
    *   `--add-cloudsql-instances`: This makes the Cloud SQL Proxy available to your Cloud Run service.

*(Detailed Cloud Run deployment steps, including CI/CD integration, will be refined.)*

---

**Remember to replace all placeholder values (e.g., `YOUR_PROJECT_ID`, `TRIA_INSTANCE_NAME`, `YOUR_REGION`, `TRIA_DB_USER`, `TRIA_CHUNK_PROCESSING_TOPIC`, `TRIA_BACKEND_SA`) with your actual configuration values.**
This guide provides a comprehensive starting point. Depending on the specific evolution of TRIA, some steps might need adjustment.
