import os
import httpx
import json
import logging

# Configure logging for this module
logger = logging.getLogger(__name__)

class LLMService:
    """
    Service class for interacting with Large Language Models, specifically the Mistral AI API.
    It handles API key management, request formatting, and response parsing.
    """
    def __init__(self):
        # Retrieve the Mistral API key from environment variables. This is crucial for authentication.
        self.api_key = os.environ.get("MISTRAL_API_KEY")
        if not self.api_key:
            logger.error("MISTRAL_API_KEY environment variable not set. LLMService will not function correctly.")
            # In a production system, consider a more robust error handling like raising a ValueError
            # or ensuring fallback mechanisms. For now, logging and returning error strings will suffice.
        
        # Base URL for Mistral's chat completions API.
        self.api_url = "https://api.mistral.ai/v1/chat/completions"
        
        # Default model to be used for chat completions. Can be overridden by specific method calls.
        self.default_model = "mistral-medium-latest"

    async def call_mistral_medium(self, user_prompt: str, static_context: str = "") -> str:
        """
        Sends a chat completion request to the Mistral Medium model.
        
        Args:
            user_prompt (str): The main message or query from the user.
            static_context (str): Optional additional context to prepend to the user's prompt.
                                  For chat models, a system message is often preferred for context,
                                  but direct concatenation is used here for simplicity.
                                  
        Returns:
            str: The generated response from the LLM, or an error message if the API call fails.
            
        Raises:
            (Errors are handled internally and return strings; not re-raised to caller).
        """
        # Check if the API key is available before making the request.
        if not self.api_key:
            return "Error: LLM Service is not configured (API key missing)."

        # Construct the full prompt, combining static context and user input.
        full_prompt = user_prompt
        if static_context:
            full_prompt = f"{static_context}

User prompt: {user_prompt}"

        # Define HTTP headers required for the Mistral API, including Authorization with the API key.
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        # Define the payload for the API request.
        # `model`: Specifies which LLM to use (e.g., mistral-medium-latest).
        # `messages`: A list of message objects, where each object has a `role` (user, assistant, system)
        #             and `content`.
        # `temperature`: Controls randomness (0.0-1.0). Higher values mean more creative/less deterministic output.
        # `max_tokens`: The maximum number of tokens to generate in the response.
        payload = {
            "model": self.default_model,
            "messages": [
                {"role": "user", "content": full_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 300
            # "safe_prompt": False # Option for content moderation; consider enabling in production.
        }

        logger.debug(f"Sending payload to Mistral: {json.dumps(payload, indent=2)}")

        # Use httpx.AsyncClient for making asynchronous HTTP requests.
        # A timeout is set to prevent requests from hanging indefinitely.
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                # Send the POST request to the Mistral API.
                response = await client.post(self.api_url, json=payload, headers=headers)
                response.raise_for_status()  # Raises an HTTPStatusError for 4xx/5xx responses.

                response_data = response.json()

                logger.debug(f"Mistral API Raw Response: {json.dumps(response_data, indent=2)}")

                # Parse the response to extract the LLM's message content.
                if response_data.get("choices") and len(response_data["choices"]) > 0:
                    message_content = response_data["choices"][0].get("message", {}).get("content")
                    if message_content:
                        logger.info("Successfully received content from Mistral API.")
                        return message_content.strip()
                    else:
                        logger.error("Mistral API response contained no content in the message.")
                        return "Error: LLM response format unexpected (no content)."
                else:
                    logger.error("Mistral API response contained no choices or empty choices list.")
                    return "Error: LLM response format unexpected (no choices)."

            except httpx.HTTPStatusError as e:
                # Handle HTTP errors (e.g., 401 Unauthorized, 404 Not Found, 500 Internal Server Error).
                logger.error(f"HTTP Status Error calling Mistral API: {e.response.status_code} - {e.response.text}")
                return f"Error: LLM API request failed with status {e.response.status_code}."
            except httpx.RequestError as e:
                # Handle request errors (e.g., network issues, DNS resolution failure).
                logger.error(f"Request Error calling Mistral API: {e}")
                return f"Error: LLM API request failed due to a network issue or client error."
            except json.JSONDecodeError as e:
                # Handle errors where the response body is not valid JSON.
                logger.error(f"JSON Decode Error from Mistral API: {e}. Response text: {response.text if 'response' in locals() else 'N/A'}")
                return "Error: Failed to decode LLM response."
            except Exception as e:
                # Catch any other unforeseen exceptions.
                logger.exception("An unexpected error occurred while calling Mistral API.")
                return "Error: An unexpected error occurred with the LLM service."

# Example Usage (for testing this file directly, not for production Cloud Function environment)
async def main_test():
    # Before running this test, ensure the MISTRAL_API_KEY environment variable is set.
    if not os.environ.get("MISTRAL_API_KEY"):
        logger.warning("MISTRAL_API_KEY environment variable not set. Skipping direct test of LLMService.")
        logger.warning("To test: export MISTRAL_API_KEY='your_actual_api_key' && python backend/core/services/llm_service.py")
        return

    llm_service = LLMService()
    if not llm_service.api_key: # Check if service initialized correctly (key was found)
        return # Exit if API key was not set during initialization

    test_prompt = "Explain the concept of a Large Language Model in simple terms."
    test_context = "You are an AI assistant explaining things to a 5-year old."

    logger.info(f"
--- Test 1: Prompt with context ---")
    response1 = await llm_service.call_mistral_medium(user_prompt=test_prompt, static_context=test_context)
    logger.info(f"LLM Response 1:
{response1}")

    logger.info(f"
--- Test 2: Prompt without context ---")
    response2 = await llm_service.call_mistral_medium(user_prompt="What is the capital of France?")
    logger.info(f"LLM Response 2:
{response2}")

    logger.info(f"
--- Test 3: Error case (simulating bad API key) ---")
    original_key = llm_service.api_key
    llm_service.api_key = "bad_key_test" # Temporarily set a bad key to simulate an error
    response3 = await llm_service.call_mistral_medium(user_prompt="This should fail.")
    logger.info(f"LLM Response 3:
{response3}")
    llm_service.api_key = original_key # Restore the original key

# This block ensures that `main_test()` is called only when the script is executed directly.
if __name__ == "__main__":
    import asyncio
    # Prerequisites for running this test:
    # 1. Install httpx: `pip install httpx`.
    # 2. Set your MISTRAL_API_KEY environment variable (e.g., `export MISTRAL_API_KEY='your_actual_api_key'` in bash).
    # 3. Run the script: `python backend/core/services/llm_service.py`
    asyncio.run(main_test())
