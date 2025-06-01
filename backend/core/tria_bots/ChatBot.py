# backend/core/tria_bots/ChatBot.py

import logging # Import the logging module
from backend.core.services.llm_service import LLMService
# Additional imports for future enhancements might include user profile services,
# conversation history managers, or knowledge graph access.

# Configure logging for this module.
logger = logging.getLogger(__name__)

class ChatBot:
    """
    The ChatBot class represents the core conversational AI (Tria) of the application.
    It interfaces with an LLMService to generate responses to user queries, providing
    context and handling basic interaction logic.
    """
    def __init__(self):
        """
        Initializes the ChatBot instance. This involves setting up the underlying LLMService
        which is responsible for communicating with the large language model API.
        A warning is logged if the LLMService cannot be fully configured (e.g., missing API key).
        """
        self.llm_service = LLMService()
        if not self.llm_service.api_key:
            # Log a warning if the LLM service's API key is missing. This indicates
            # that the bot will likely return error messages from the LLMService calls.
            logger.warning("ChatBot initialized, but LLMService might be missing API key. Responses may be limited.")

    async def get_response(self, user_input: str, firebase_user_id: str) -> str:
        """
        Generates a conversational response from the Tria bot based on user input.
        It constructs a prompt that includes a static system context and the user's query,
        then sends it to the LLMService.

        Args:
            user_input (str): The text message provided by the user.
            firebase_user_id (str): The unique Firebase UID of the interacting user.
                                    This can be used to personalize context or log interactions.

        Returns:
            str: A string containing Tria's generated response. In case of an LLM configuration
                 issue or unexpected error, a user-friendly error message is returned.
        """
        # Check if the LLM service has an API key configured. If not, return a graceful error.
        if not self.llm_service.api_key:
             logger.error("Attempted to get response, but LLMService is not configured (missing API key).")
             return "I'm sorry, but I'm not configured correctly to help you right now (missing API key)."

        # Construct a static context for the LLM. This defines Tria's persona and capabilities.
        # This context can be dynamically expanded in the future with user-specific data,
        # conversational history, or real-time application state.
        static_context = (
            f"You are Tria, an advanced AI assistant integrated into holograms.media, "
            f"a platform for creating and interacting with holographic content and audiovisual experiences. "
            f"You are currently assisting user ID: {firebase_user_id}. "
            f"Be helpful, creative, and slightly futuristic in your tone. "
            f"If the user asks about your capabilities, mention you can help with ideas for holograms, "
            f"explain concepts related to the platform, and chat about technology and creativity. "
            f"Avoid making specific promises about platform features unless you are certain they exist. "
            f"Keep responses concise and engaging."
        )

        logger.info(f"Sending prompt to LLM for user {firebase_user_id}: {user_input[:100]}...")
        try:
            # Call the underlying LLMService to get a response.
            # The LLMService handles the actual API call, error handling, and response parsing.
            llm_response = await self.llm_service.call_mistral_medium(
                user_prompt=user_input,
                static_context=static_context
            )
            logger.info(f"Received response from LLM for user {firebase_user_id}: {llm_response[:100]}...")
            return llm_response
        except Exception as e:
            # Catch any unexpected exceptions that might escape from the LLMService (though LLMService
            # aims to return error strings). This ensures the ChatBot always returns a message.
            logger.exception(f"An unexpected error occurred during ChatBot's call to LLMService for user {firebase_user_id}.")
            return "I encountered an unexpected issue while trying to process your request. Please try again later."

# Example Usage (for direct testing of this file, not for production Cloud Function context)
async def main_chatbot_test():
    # This test function demonstrates how to use the ChatBot class.
    # It requires the MISTRAL_API_KEY environment variable to be set for the LLMService to function.
    import os # Import os here for environment variable check in direct run context
    if not os.environ.get("MISTRAL_API_KEY"):
        logger.warning("MISTRAL_API_KEY environment variable not set. Skipping direct test of ChatBot.")
        logger.warning("To test: export MISTRAL_API_KEY='your_actual_api_key' && python backend/core/tria_bots/ChatBot.py")
        return

    logger.info("Starting ChatBot direct test...")
    chatbot = ChatBot()

    if not chatbot.llm_service.api_key: # Re-check after ChatBot init if key was actually loaded
        logger.error("ChatBot LLM Service not configured after initialization. Aborting test.")
        return

    test_user_id = "test_user_123_local"

    prompts = [
        "Hello Tria, who are you?",
        "What can you do for me?",
        "Suggest a cool idea for a hologram.",
        "What's the weather like?" # A generic question to see its conversational ability
    ]

    for i, prompt_text in enumerate(prompts):
        logger.info(f"
--- ChatBot Test {i+1} ---")
        logger.info(f"User ({test_user_id}): {prompt_text}")
        response = await chatbot.get_response(user_input=prompt_text, firebase_user_id=test_user_id)
        logger.info(f"Tria: {response}")

# This block ensures `main_chatbot_test()` is called only when the script is executed directly.
if __name__ == "__main__":
    import asyncio
    # Ensure the environment is correctly set up before running the test.
    asyncio.run(main_chatbot_test())
