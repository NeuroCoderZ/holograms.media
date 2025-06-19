<!-- This guide now primarily focuses on setting up and deploying Firebase Hosting for the TRIA frontend and configuring Firebase Authentication. Backend services (FastAPI application, Database, File Storage) are deployed on other platforms and covered in separate guides (e.g., koyeb_r2_deployment_guide.md for FastAPI on Koyeb and Cloudflare R2). This document covers auxiliary GCP services only if they directly support Firebase Hosting or Authentication. -->
# Firebase Hosting and Authentication Guide for TRIA

This guide provides step-by-step instructions for setting up Firebase Hosting for the TRIA frontend application and configuring Firebase Authentication.

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
    Select the features you need. For TRIA, this will primarily include:
    *   **Hosting:** To deploy the frontend application.
        *   When prompted for your public directory, use `frontend` (or your build output directory, e.g., `frontend/dist`).
        *   Configure as a single-page app if applicable.
    *   **Authentication:** (Set up via Firebase Console, `firebase init` helps link the project).
    *   **Emulators:** Useful for local development of hosting and auth rules. Download them if prompted.
    *   (Firestore and Functions might be selected if you plan to use Firestore for specific frontend-related data or have minor Cloud Functions directly supporting hosting/auth, but primary backend logic is on Koyeb).

*   **Enable Firebase Authentication:**
    1.  Go to the [Firebase Console](https://console.firebase.google.com/).
    2.  Select your project.
    3.  Navigate to **Authentication** (under Build).
    4.  Click **Get started**.
    5.  Enable desired sign-in methods (e.g., Google Sign-In, Email/Password).

*   **Configure Firebase in `.env.example` (for Frontend):**
    After setting up Firebase and registering your web app, your project will have Firebase configuration keys. These are needed by the frontend to interact with Firebase services.
    1.  Go to your Firebase project settings in the Firebase console.
    2.  Under "Your apps", find your web app configuration (it might look like `firebaseConfig = { ... }`).
    3.  Copy these values into the corresponding `VITE_FIREBASE_*` (or similar, depending on your frontend setup) variables in your frontend's `.env` file (e.g., `frontend/.env` created from `frontend/.env.example`).
        *   `VITE_FIREBASE_API_KEY`
        *   `VITE_FIREBASE_AUTH_DOMAIN`
        *   `VITE_FIREBASE_PROJECT_ID`
        *   `VITE_FIREBASE_MESSAGING_SENDER_ID`
        *   `VITE_FIREBASE_APP_ID`
        *   `VITE_FIREBASE_MEASUREMENT_ID` (optional)
    *Note: `FIREBASE_STORAGE_BUCKET` is intentionally omitted as Cloudflare R2 is used for primary file storage.*

## 5. Cloud Pub/Sub Setup (Auxiliary Use Only)

Cloud Pub/Sub is generally part of the backend infrastructure, which is now primarily on Koyeb. However, if any Firebase-specific services (e.g., very specific Firebase Functions directly tied to Auth events) require Pub/Sub for asynchronous tasks, it can be configured here. For the main application's asynchronous processing (like chunk processing), refer to the backend infrastructure guide.

*   **Enable the Pub/Sub API (if needed for Firebase auxiliary functions):**
    ```bash
    gcloud services enable pubsub.googleapis.com
    ```

*   **Create a Pub/Sub topic (if needed):**
    Example:
    ```bash
    gcloud pubsub topics create your-firebase-aux-topic
    ```

## 6. Cloud Functions Setup (Auxiliary Use Only)

Firebase Cloud Functions or Google Cloud Functions might be used for lightweight backend logic directly supporting Firebase Hosting (e.g., SSR for specific routes not handled by the main backend) or Firebase Authentication custom events. The main application backend logic resides on Koyeb.

*   If you need to deploy auxiliary Cloud Functions (e.g., for Firebase):
    *   Refer to official Firebase/Google Cloud documentation for deploying functions.
    *   Ensure they are configured with appropriate triggers (HTTP, event-based) and necessary permissions.
    *   The example below is generic and should be adapted. **Note:** The `TRIA_CHUNK_PROCESSING_TOPIC` trigger and database environment variables are likely irrelevant for functions solely supporting Hosting/Auth and are part of the main backend (Koyeb).

*   **Generic `gcloud functions deploy` command (for auxiliary functions):**
    ```bash
    gcloud functions deploy YOUR_AUX_FUNCTION_NAME \
        --gen2 \
        --runtime=python311 # Or nodejs, etc.
        --region=YOUR_REGION \
        --source=./path/to/your/aux_function_code_directory \
        --entry-point=your_function_entry_point \
        # --trigger-http # For HTTP triggered functions
        # --trigger-event=providers/google.firebase.auth/eventTypes/user.create # Example Auth trigger
        --service-account=YOUR_SERVICE_ACCOUNT_EMAIL # Ensure this SA has minimal necessary roles
        # --set-env-vars=... # Only if needed by the auxiliary function
    ```

## 7. Service Account and IAM for Firebase Services

Create a dedicated service account if you have auxiliary Cloud Functions or other GCP services directly supporting your Firebase Hosting/Authentication setup. This service account will be granted minimal necessary permissions.
For service accounts related to the main backend application (FastAPI on Koyeb), refer to the `koyeb_r2_deployment_guide.md`.

*   **Create a service account (for auxiliary Firebase services):**
    ```bash
    gcloud iam service-accounts create TRIA_AUX_SA \
        --description="Service account for TRIA auxiliary Firebase services" \
        --display-name="TRIA Firebase Aux SA"
    ```
    Replace `TRIA_AUX_SA` (e.g., `tria-firebase-aux-sa`).
    The email will be `TRIA_AUX_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com`.

*   **Grant roles to the service account (for auxiliary Firebase functions):**
    Grant only the necessary roles. Example roles for a service account used by auxiliary Firebase Functions that might interact with Firebase Admin SDK or invoke other functions:
    ```bash
    # Firebase Admin (if using Firebase Admin SDK for user management, custom tokens, etc. in auxiliary functions)
    # Consider more granular Firebase roles if full admin is not needed.
    # Example: roles/firebase.developAdmin or roles/firebase.authAdmin
    gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
       --member="serviceAccount:TRIA_AUX_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
       --role="roles/firebase.admin" # Or more granular Firebase roles like firebase.developAdmin

    # Cloud Functions Invoker (if auxiliary functions need to invoke other Cloud Functions)
    gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
        --member="serviceAccount:TRIA_AUX_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
        --role="roles/cloudfunctions.invoker"

    # Secret Manager Secret Accessor (if auxiliary functions need to access secrets)
    # gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
    #     --member="serviceAccount:TRIA_AUX_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
    #     --role="roles/secretmanager.secretAccessor"
    ```
    Replace `TRIA_AUX_SA` (e.g., `tria-firebase-aux-sa`) and `YOUR_PROJECT_ID`.
    *Avoid granting overly broad roles. Roles related to Cloud SQL, main application Pub/Sub topics, Cloud Storage (for user data), or Vertex AI are typically not needed for service accounts related *only* to Firebase Hosting/Auth auxiliary functions and should be managed as part of the main backend's service account.*

*   **Create and download a service account key (JSON) (If Needed):**
    This key is generally only needed if you are running services outside of GCP (e.g., local scripts that need to act as this service account) or if Application Default Credentials are not being used by your auxiliary function environment. Firebase Functions often use the runtime service account directly.
    ```bash
    # Only if necessary for external use or specific auth scenarios:
    gcloud iam service-accounts keys create ./tria-aux-service-account-key.json \
        --iam-account=TRIA_AUX_SA@YOUR_PROJECT_ID.iam.gserviceaccount.com
    ```
    *   **IMPORTANT:** Secure this key file. Do not commit it to your repository.
    *   If used, set the path to this key file in your environment (e.g., `GOOGLE_APPLICATION_CREDENTIALS`).

## 8. Genkit Setup

Genkit is a framework for building AI-powered applications and is primarily part of the main backend infrastructure (FastAPI on Koyeb). Refer to the backend deployment and architecture documents (e.g., `koyeb_r2_deployment_guide.md`) for details on Genkit setup and deployment. This Firebase-focused guide does not cover Genkit deployment.

## 9. Cloud Run Deployment (FastAPI Backend)

The main TRIA FastAPI backend is deployed on Koyeb, not Google Cloud Run. For deployment instructions for the FastAPI backend, including containerization and Koyeb specifics, please refer to the `docs/architecture/infrastructure/koyeb_r2_deployment_guide.md`.

This section on Cloud Run deployment is intentionally removed from this guide as its focus is on Firebase Hosting and Authentication.

---

**Remember to replace all placeholder values (e.g., `YOUR_PROJECT_ID`, `YOUR_REGION`, `TRIA_AUX_SA`) with your actual configuration values.**
This guide provides a focused starting point for Firebase Hosting and Authentication.
