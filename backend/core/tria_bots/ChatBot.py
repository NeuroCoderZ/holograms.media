# backend/core/tria_bots/ChatBot.py

from backend.core.services.llm_service import LLMService
# We might need other imports later, e.g., for accessing user data or past conversations.

class ChatBot:
    def __init__(self):
        """
        Initializes the ChatBot, primarily by setting up the LLMService.
        """
        self.llm_service = LLMService()
        if not self.llm_service.api_key:
            # This indicates that the LLM service couldn't load its API key.
            # The ChatBot might still function but will return error messages from LLMService.
            print("Warning: ChatBot initialized, but LLMService might be missing API key.")

    async def get_response(self, user_input: str, firebase_user_id: str) -> str:
        """
        Generates a response to user input using the LLM service.

        Args:
            user_input: The text input from the user.
            firebase_user_id: The Firebase UID of the user, for context.

        Returns:
            A string containing the LLM's response.
        """
        if not self.llm_service.api_key:
             return "I'm sorry, but I'm not configured correctly to help you right now (missing API key)."

        # Define a static context for the LLM.
        # This can be expanded with more dynamic information if needed.
        # For example, fetching user preferences, past interactions, etc.
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

        # Call the LLM service with the user input and the constructed static context.
        # The full prompt (context + user_input) will be assembled by the LLMService.
        try:
            llm_response = await self.llm_service.call_mistral_medium(
                user_prompt=user_input,
                static_context=static_context
            )
            return llm_response
        except Exception as e:
            # This catches errors that might occur if llm_service.call_mistral_medium itself raises an exception
            # rather than returning an error string (though current llm_service returns error strings).
            print(f"Error during ChatBot's call to LLMService: {e}")
            return "I encountered an unexpected issue while trying to process your request. Please try again later."

# Example Usage (for testing this file directly)
async def main_chatbot_test():
    # Ensure MISTRAL_API_KEY is set as an environment variable before running this
    import os
    if not os.environ.get("MISTRAL_API_KEY"):
        print("Please set the MISTRAL_API_KEY environment variable for testing ChatBot.")
        print("Example: export MISTRAL_API_KEY='your_actual_api_key'")
        return

    print("Testing ChatBot...")
    chatbot = ChatBot()

    if not chatbot.llm_service.api_key:
        print("ChatBot LLM Service not configured. Aborting test.")
        return

    test_user_id = "test_user_123"

    prompts = [
        "Hello Tria, who are you?",
        "What can you do for me?",
        "Suggest a cool idea for a hologram.",
        "What's the weather like?" # A generic question to see its conversational ability
    ]

    for i, prompt_text in enumerate(prompts):
        print(f"\n--- ChatBot Test {i+1} ---")
        print(f"User ({test_user_id}): {prompt_text}")
        response = await chatbot.get_response(user_input=prompt_text, firebase_user_id=test_user_id)
        print(f"Tria: {response}")

if __name__ == "__main__":
    import asyncio
    import os
    # This test assumes that MISTRAL_API_KEY is set in the environment.
    if os.environ.get("MISTRAL_API_KEY"):
        asyncio.run(main_chatbot_test())
    else:
        print("MISTRAL_API_KEY not set. Skipping direct test run of ChatBot.py.")
        print("To test: export MISTRAL_API_KEY='your_key_here' && python backend/core/tria_bots/ChatBot.py")
