from firebase_functions import https_fn
# from firebase_admin import initialize_app # Should be initialized once, centrally if possible
# initialize_app() # Or ensure it's initialized if this function is deployed standalone

# It's good practice to define global options like region once,
# e.g., in a main __init__.py for cloud_functions or via firebase.json settings.
# import firebase_functions.options as options
# options.set_global_options(region=options.SupportedRegion.EUROPE_WEST1)

@https_fn.on_request()
def tria_chat_endpoint(req: https_fn.Request) -> https_fn.Response:
    """
    HTTP-triggered Cloud Function to handle Tria chat interactions.
    Expects user message in the request body.
    """
    
    print("Received tria_chat_endpoint request. Body:", req.data, "Headers:", req.headers)
    
    user_message = None
    if req.is_json:
        user_message = req.json.get("message")
    elif req.form:
        user_message = req.form.get("message")
    elif req.args:
        user_message = req.args.get("message")

    if not user_message:
        print("No user message found in request.")
        return https_fn.Response("Please provide a 'message' in the request body (JSON or form-data) or as a query parameter.", status=400, mimetype="application/json")

    print(f"User message: {user_message}")

    # TODO: Import and use backend.core.tria_bots.ChatBot and backend.core.services.LLMService
    # Example:
    # from backend.core.tria_bots.ChatBot import ChatBot
    # from backend.core.services.llm_service import LLMService # Assuming it's configured
    # llm_service_instance = LLMService() # Or however it's initialized
    # chat_bot = ChatBot(llm_service=llm_service_instance)
    # response_message = chat_bot.handle_message(user_message)
    
    response_message = f"Tria received: '{user_message}'. Processing placeholder."
    
    # TODO: Log interaction to tria_learning_log via crud_operations
    
    return https_fn.Response(response_message, status=200, mimetype="application/json")
