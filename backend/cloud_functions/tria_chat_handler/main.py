import os
import json
import uuid 
import datetime 

from firebase_functions import https_fn, options as firebase_options
from firebase_admin import initialize_app, auth as firebase_auth 

# Initialize Firebase Admin SDK if not already initialized (for auth.verify_id_token)
if not initialize_app._apps:
    initialize_app()
    print("Firebase Admin SDK initialized in tria_chat_handler Cloud Function.")
else:
    print("Firebase Admin SDK already initialized in tria_chat_handler.")

from backend.core.tria_bots.ChatBot import ChatBot
from backend.core.models.learning_log_models import TriaLearningLogModel
from backend.core.crud_operations import create_tria_learning_log_entry
from backend.core.db.pg_connector import get_db_connection
import asyncpg

def get_env_var(var_name, is_critical=True):
    value = os.environ.get(var_name)
    if value is None and is_critical:
        print(f"FATAL: Environment variable {var_name} not set.")
        raise ValueError(f"Environment variable {var_name} not set.")
    return value

chatbot = ChatBot()

@https_fn.on_request(cors=https_fn.options.CorsOptions(cors_origins="*", cors_methods=["post"])) 
async def tria_chat_handler(req: https_fn.Request) -> https_fn.Response:
    """
    HTTP-triggered Cloud Function to handle Tria chat interactions.
    Expects JSON body: {"text": "user message"}.
    Firebase ID Token must be in Authorization: Bearer header.
    """
    if not chatbot.llm_service.api_key:
        print("Error: MISTRAL_API_KEY is not configured for the LLMService.")
        return https_fn.Response(
            json.dumps({"error": "LLM service not configured."}),
            status=503, 
            content_type="application/json"
        )

    if req.method != "POST":
        return https_fn.Response(
            json.dumps({"error": "Method not allowed. Use POST."}),
            status=405,
            content_type="application/json"
        )

    # 1. Verify Firebase ID Token and get user_id
    auth_header = req.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        print("Missing or malformed Authorization header.")
        return https_fn.Response(json.dumps({"status": "error", "message": "Authorization header missing or malformed."}), status=401, mimetype="application/json")

    id_token = auth_header.split(" ")[1]
    firebase_user_id = None
    try:
        # Verify the ID token (firebase-admin SDK is initialized globally above)
        decoded_token = await firebase_auth.verify_id_token(id_token) # This is a blocking call, ideally run in thread pool
        firebase_user_id = decoded_token["uid"]
    except Exception as e:
        print(f"Error verifying Firebase ID token: {e}")
        return https_fn.Response(json.dumps({"status": "error", "message": f"Invalid or expired token: {e}"}), status=403, mimetype="application/json")

    if not firebase_user_id:
        print("Firebase User ID could not be extracted from token.")
        return https_fn.Response(json.dumps({"status": "error", "message": "User ID could not be determined."}), status=400, mimetype="application/json")

    try:
        data = req.get_json(silent=False) 
        user_text = data.get("text")
    except Exception as e:
        print(f"Error parsing request JSON: {e}")
        return https_fn.Response(
            json.dumps({"error": "Invalid request data. Expected JSON: {'text': '...'}"}),
            status=400,
            content_type="application/json"
        )

    if not user_text:
        return https_fn.Response(
            json.dumps({"error": "Missing required 'text' field in request body."}),
            status=400,
            content_type="application/json"
        )

    print(f"Processing chat request for user '{firebase_user_id}': '{user_text}'")

    llm_response = "Sorry, I encountered an issue and couldn't generate a response." # Default
    log_summary = ""
    conn = None 

    try:
        llm_response = await chatbot.get_response(user_input=user_text, firebase_user_id=firebase_user_id)

        log_summary = f"User: {user_text[:100]}... | Tria: {llm_response[:100]}..."

        # Log the interaction to tria_learning_log
        log_entry_data = {
            "user_id": firebase_user_id,
            "session_id": None, # For MVP, session_id is not yet implemented
            "event_type": "tria_chat_interaction",
            "bot_affected_id": "ChatBot_MistralMedium_v1", # Example identifier
            "summary_text": log_summary,
            "prompt_text": user_text,
            "tria_response_text": llm_response,
            "model_used": chatbot.llm_service.default_model, # Get model from LLMService
            "feedback_score": None,
            "custom_data": {"request_timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()} # Example custom data
            # timestamp will be set by Pydantic's default_factory
        }

        log_model_instance = TriaLearningLogModel(**log_entry_data)

        conn = await get_db_connection()
        await create_tria_learning_log_entry(db=conn, log_entry_create=log_model_instance)
        print(f"Chat interaction logged for user {firebase_user_id}.")

    except asyncpg.PostgresError as db_error:
        print(f"Database error during chat interaction logging for user {firebase_user_id}: {db_error}")
    except Exception as e:
        print(f"Error during Tria chat processing for user {firebase_user_id}: {e}")
        if not llm_response.startswith("Error:") and not llm_response.startswith("I'm sorry"):
             print(f"Detailed error during Tria chat processing: {str(e)}") 
             llm_response = "An unexpected error occurred. Please try again later." 
    finally:
        if conn:
            await conn.close()
            print(f"Database connection closed for chat request of user {firebase_user_id}.")

    return https_fn.Response(
        json.dumps({"response": llm_response}),
        status=200, 
        content_type="application/json"
    )
