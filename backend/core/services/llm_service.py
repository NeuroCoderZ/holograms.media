import os
import httpx
import json # For logging the payload if needed, or constructing it if complex

class LLMService:
    def __init__(self):
        self.api_key = os.environ.get("MISTRAL_API_KEY")
        if not self.api_key:
            # In a real application, consider raising an error or having a clear fallback
            print("Error: MISTRAL_API_KEY environment variable not set.")
            # raise ValueError("MISTRAL_API_KEY not set")
            # Raising here might break apps that don't use LLMService but import it or its module
        self.api_url = "https://api.mistral.ai/v1/chat/completions"
        self.default_model = "mistral-medium-latest" # Can be overridden by specific methods if needed

    async def call_mistral_medium(self, user_prompt: str, static_context: str = "") -> str:
        """
        Calls the Mistral Medium model with a user prompt and optional static context.
        """
        if not self.api_key:
            return "Error: LLM Service is not configured (API key missing)."

        full_prompt = user_prompt
        if static_context:
            full_prompt = f"{static_context}\n\nUser prompt: {user_prompt}"
            # For chat models, it's often better to structure context as a system message
            # or an earlier assistant message, but for simplicity, prepending here.

        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        payload = {
            "model": self.default_model,
            "messages": [
                {"role": "user", "content": full_prompt}
            ],
            "temperature": 0.7,  # Example, adjust as needed
            "max_tokens": 300    # Increased for potentially longer context + response
            # "safe_prompt": False # Consider implications: https://docs.mistral.ai/platform/guardrailing/
        }

        # print(f"Sending payload to Mistral: {json.dumps(payload, indent=2)}") # For debugging

        async with httpx.AsyncClient(timeout=30.0) as client: # Increased timeout
            try:
                response = await client.post(self.api_url, json=payload, headers=headers)
                response.raise_for_status()  # Raises an HTTPStatusError for bad responses (4xx or 5xx)

                response_data = response.json()

                # Log the full response for debugging if needed, but be mindful of token usage and cost
                # print(f"Mistral API Response: {json.dumps(response_data, indent=2)}")

                if response_data.get("choices") and len(response_data["choices"]) > 0:
                    message_content = response_data["choices"][0].get("message", {}).get("content")
                    if message_content:
                        return message_content.strip()
                    else:
                        print("Error: No content in Mistral response message.")
                        return "Error: LLM response format unexpected (no content)."
                else:
                    print("Error: No choices in Mistral response.")
                    return "Error: LLM response format unexpected (no choices)."

            except httpx.HTTPStatusError as e:
                print(f"Error calling Mistral API (HTTPStatusError): {e}")
                print(f"Response body: {e.response.text}")
                return f"Error: LLM API request failed with status {e.response.status_code}."
            except httpx.RequestError as e:
                print(f"Error calling Mistral API (RequestError): {e}")
                return f"Error: LLM API request failed due to a network issue or client error."
            except json.JSONDecodeError as e:
                print(f"Error decoding JSON response from Mistral API: {e}")
                print(f"Response text: {response.text if 'response' in locals() else 'N/A'}")
                return "Error: Failed to decode LLM response."
            except Exception as e:
                print(f"An unexpected error occurred while calling Mistral API: {e}")
                return "Error: An unexpected error occurred with the LLM service."

# Example Usage (for testing this file directly, not for production Cloud Function)
async def main_test():
    # Ensure MISTRAL_API_KEY is set as an environment variable before running this
    if not os.environ.get("MISTRAL_API_KEY"):
        print("Please set the MISTRAL_API_KEY environment variable for testing.")
        print("Example: export MISTRAL_API_KEY='your_actual_api_key'")
        return

    llm_service = LLMService()
    if not llm_service.api_key: # Check if service initialized correctly
        return

    test_prompt = "Explain the concept of a Large Language Model in simple terms."
    test_context = "You are an AI assistant explaining things to a 5-year old."

    print(f"\n--- Test 1: Prompt with context ---")
    response1 = await llm_service.call_mistral_medium(user_prompt=test_prompt, static_context=test_context)
    print(f"LLM Response 1:\n{response1}")

    print(f"\n--- Test 2: Prompt without context ---")
    response2 = await llm_service.call_mistral_medium(user_prompt="What is the capital of France?")
    print(f"LLM Response 2:\n{response2}")

    print(f"\n--- Test 3: Error case (simulating bad API key by temporarily modifying it) ---")
    original_key = llm_service.api_key
    llm_service.api_key = "bad_key_test"
    response3 = await llm_service.call_mistral_medium(user_prompt="This should fail.")
    print(f"LLM Response 3:\n{response3}")
    llm_service.api_key = original_key # Restore

if __name__ == "__main__":
    import asyncio
    # To run this test:
    # 1. Make sure httpx is installed (`pip install httpx`).
    # 2. Set your MISTRAL_API_KEY environment variable.
    # 3. Run `python backend/core/services/llm_service.py`
    # Note: This direct execution might fail if environment variables for pg_connector (NEON_DATABASE_URL)
    # are not set and other parts of the 'backend.core' try to initialize, though this specific file
    # doesn't directly use the DB. Best to test in an environment where all configs are available or mock them.

    # For simplicity of testing just this file, if run directly, we might need to guard imports
    # or ensure the environment is minimally set up.
    # The example usage is primarily for illustrating how the class methods are called.

    # Check if MISTRAL_API_KEY is available before trying to run the async main_test
    if os.environ.get("MISTRAL_API_KEY"):
        asyncio.run(main_test())
    else:
        print("MISTRAL_API_KEY not set. Skipping direct test run of llm_service.py.")
        print("To test: export MISTRAL_API_KEY='your_key_here' && python backend/core/services/llm_service.py")
