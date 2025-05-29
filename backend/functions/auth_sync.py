import functions_framework
import firebase_admin
from firebase_admin import auth, credentials
import os
import logging
from google.cloud import secretmanager # For GCP Secret Manager
import json # For parsing JSON secrets
import asyncpg # For Neon database

# --- Configuration & Initialization ---
# Configure basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Environment checks and Firebase Admin SDK initialization
# Option 1: GOOGLE_APPLICATION_CREDENTIALS environment variable is set (typical for local dev or specific GCP setups)
# Option 2: Running in a GCP environment (Cloud Functions, Cloud Run) with a service account that has necessary permissions.
# Firebase Admin SDK will automatically find credentials in these cases.

try:
    # Check if Firebase app is already initialized to prevent re-initialization errors
    if not firebase_admin._apps:
        # Attempt to initialize Firebase Admin SDK.
        # If GOOGLE_APPLICATION_CREDENTIALS is set, it uses that.
        # Otherwise, on GCP, it uses the default service account.
        cred = credentials.ApplicationDefault()
        firebase_admin.initialize_app(cred)
        logger.info("Firebase Admin SDK initialized successfully.")
    else:
        logger.info("Firebase Admin SDK already initialized.")
except Exception as e:
    logger.error(f"Error initializing Firebase Admin SDK: {e}")
    # Depending on the desired behavior, you might want to raise the error
    # or handle it in a way that allows the function to (partially) run if possible.


# --- Database Connection ---
# Neon Database URL - prioritize environment variable, then GCP Secret Manager
NEON_DB_URL = os.environ.get('NEON_DATABASE_URL')

if not NEON_DB_URL:
    logger.info("NEON_DATABASE_URL not found in environment. Trying GCP Secret Manager...")
    try:
        client = secretmanager.SecretManagerServiceClient()
        secret_name = "NEON_DATABASE_URL_SECRET" # The name of the secret in Secret Manager
        project_id = os.environ.get("GCP_PROJECT") # or "GOOGLE_CLOUD_PROJECT" or your specific project ID

        if not project_id:
            logger.error("GCP_PROJECT environment variable not set. Cannot fetch secret.")
            # Handle missing project_id appropriately, maybe raise error or use a default
        else:
            resource_name = f"projects/{project_id}/secrets/{secret_name}/versions/latest"
            response = client.access_secret_version(name=resource_name)
            NEON_DB_URL = response.payload.data.decode("UTF-8")
            logger.info("Successfully fetched NEON_DATABASE_URL from GCP Secret Manager.")
    except Exception as e:
        logger.error(f"Error fetching NEON_DATABASE_URL from Secret Manager: {e}")
        # Set a default or raise an error if the DB URL is critical
        NEON_DB_URL = None # Or some fallback if appropriate

async def get_db_connection():
    if not NEON_DB_URL:
        logger.error("NEON_DATABASE_URL is not configured. Cannot connect to database.")
        raise ConnectionError("Database URL not configured.")
    try:
        conn = await asyncpg.connect(NEON_DB_URL)
        return conn
    except asyncpg.PostgresError as e:
        logger.error(f"Database connection error: {e}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during database connection: {e}")
        raise

# --- Cloud Function ---
@functions_framework.http
async def auth_sync(request):
    """
    HTTP Cloud Function to synchronize Firebase Auth user with backend database.
    Expects a POST request with an Authorization header containing the Firebase ID token.
    """
    if request.method != "POST":
        logger.warning(f"Received {request.method} request, expected POST.")
        return ("Only POST requests are accepted", 405)

    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        logger.warning("Missing or invalid Authorization header.")
        return ("Unauthorized: Missing or invalid ID token.", 401)

    id_token = auth_header.split("Bearer ")[1]

    conn = None  # Initialize conn to None for the finally block
    try:
        logger.info("Verifying Firebase ID token...")
        decoded_token = auth.verify_id_token(id_token)
        uid = decoded_token["uid"]
        email = decoded_token.get("email") # Email might not always be present
        # name = decoded_token.get("name", "") # Name might not always be present
        # photo_url = decoded_token.get("picture", "") # Profile picture

        logger.info(f"Token verified for UID: {uid}, Email: {email}")

        conn = await get_db_connection()
        logger.info("Database connection established.")

        # Check if user exists
        user_exists = await conn.fetchval("SELECT EXISTS(SELECT 1 FROM users WHERE user_id = $1)", uid)

        if user_exists:
            logger.info(f"User {uid} already exists. Updating last login (conceptual).")
            # Optional: Update last login time or other details
            # await conn.execute("UPDATE users SET updated_at = NOW() WHERE user_id = $1", uid)
            # For now, we just confirm existence.
            await conn.close()
            return ({"message": "User already exists, sync unnecessary or last login updated."}, 200)
        else:
            logger.info(f"User {uid} not found. Creating new user entry.")
            # User does not exist, create them
            await conn.execute(
                "INSERT INTO users (user_id, email) VALUES ($1, $2) ON CONFLICT (user_id) DO NOTHING",
                uid,
                email,
            )
            # ON CONFLICT is a safeguard, though SELECT EXISTS should prevent this path if user exists.
            logger.info(f"User {uid} created successfully.")
            await conn.close()
            return ({"message": "User synchronized successfully."}, 201)

    except firebase_admin.auth.FirebaseAuthError as e:
        logger.error(f"Firebase Auth Error: {e}")
        return ("Unauthorized: Invalid ID token or Firebase error.", 401)
    except ConnectionError as e: # Raised by get_db_connection if URL is missing
        logger.error(f"Database Configuration Error: {e}")
        return ("Server Error: Database not configured.", 500)
    except asyncpg.PostgresError as e:
        logger.error(f"Database operation error: {e}")
        return ("Server Error: Database operation failed.", 500)
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}", exc_info=True)
        return ("Internal Server Error", 500)
    finally:
        if conn and not conn.is_closed():
            try:
                await conn.close()
                logger.info("Database connection closed in finally block.")
            except Exception as e:
                logger.error(f"Error closing connection in finally block: {e}")

# --- Example for local testing (requires NEON_DATABASE_URL and GOOGLE_APPLICATION_CREDENTIALS to be set) ---
if __name__ == "__main__":
    # This section is for local simulation and won't run in Cloud Functions.
    # To test this locally:
    # 1. Set NEON_DATABASE_URL environment variable.
    # 2. Set GOOGLE_APPLICATION_CREDENTIALS to point to your Firebase service account key JSON file.
    # 3. Obtain a Firebase ID token for a test user.
    # 4. Run this script: python backend/functions/auth_sync.py
    # 5. Send a POST request to http://localhost:8080 (or the port Functions Framework uses)
    #    with 'Authorization: Bearer <YOUR_ID_TOKEN>' header.
    #    Example using curl:
    #    curl -X POST -H "Authorization: Bearer YOUR_ID_TOKEN" http://localhost:8080

    logger.info("Local test mode: Simulating Cloud Function environment.")
    
    # Check if NEON_DATABASE_URL is set for local testing
    if not NEON_DB_URL:
        logger.warning("NEON_DATABASE_URL is not set. Database operations will fail.")
        # You might want to set a default test URL for local dev if appropriate,
        # or simply let it fail to highlight the missing configuration.
        # Example: NEON_DB_URL = "postgresql://user:pass@host:port/db" 
        # For this example, we'll rely on it being set externally.

    # The Functions Framework normally handles running the server.
    # For direct script execution, this __main__ block is more for informational purposes
    # or for setting up specific local test harnesses if needed.
    # To truly test with the framework locally, you'd use:
    # functions-framework-python --target auth_sync --source backend/functions/auth_sync.py --port 8080 --debug
    
    print("To test the function locally, run:")
    print("functions-framework-python --target auth_sync --source backend/functions/auth_sync.py --port 8080 --debug")
    print("Then send a POST request with an Authorization: Bearer <ID_TOKEN> header.")
    print("Ensure NEON_DATABASE_URL and GOOGLE_APPLICATION_CREDENTIALS are set in your environment.")

    # Example of how to simulate a request if you wanted to run the function logic directly (more complex):
    # class MockRequest:
    #     def __init__(self, headers, method="POST"):
    #         self.headers = headers
    #         self.method = method
    #
    # async def run_local_test():
    #     # Replace with a real ID token for testing
    #     test_token = "YOUR_FIREBASE_ID_TOKEN" 
    #     if test_token == "YOUR_FIREBASE_ID_TOKEN":
    #         print("Please replace YOUR_FIREBASE_ID_TOKEN with a real token to test.")
    #         return
    #
    #     mock_request = MockRequest(headers={"Authorization": f"Bearer {test_token}"})
    #     
    #     # Ensure environment variables are set before running this
    #     if not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    #         print("GOOGLE_APPLICATION_CREDENTIALS not set. Firebase Admin SDK might not initialize.")
    #         # return # Optionally exit if critical
    #     if not NEON_DB_URL:
    #         print("NEON_DATABASE_URL not set. Database operations will fail.")
    #         # return # Optionally exit if critical
    #
    #     print("Attempting to run auth_sync function logic...")
    #     response_body, status_code = await auth_sync(mock_request)
    #     print(f"Local test response: {status_code} - {response_body}")
    #
    # if os.environ.get("RUN_LOCAL_TEST_LOGIC"): # Set this env var to try the direct call
    #    import asyncio
    #    asyncio.run(run_local_test())
