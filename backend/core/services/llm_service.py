import os
import httpx
import json
import logging

# Configure logging for this module
logger = logging.getLogger(__name__)

class LLMService:
    """
    Service class for interacting with Large Language Models, specifically the Mistral AI API
    for the public-facing informational chatbot.
    """
    def __init__(self):
        # API key for the public bot (mistral-small-latest)
        self.public_bot_api_key = "oVcP2Nj0iNWGupB6lswjbvhwHOr23hhr"
        if not self.public_bot_api_key: # Should always be true as it's hardcoded
            logger.error("Public bot API key is not set. LLMService will not function correctly for public bot.")
        
        # Base URL for Mistral's chat completions API.
        self.api_url = "https://api.mistral.ai/v1/chat/completions"
        
        # System prompt for the public informational bot
        self.public_bot_system_prompt = """
Вы информационный ассистент проекта "Голограммы Медиа".
Ваша задача - помочь новым пользователям понять суть проекта и как начать работу.

Ключевые моменты, которые вы можете объяснить:
- Чтобы получить доступ к полному функционалу и ИИ "Триа" (на базе Gemini/Devstral), пользователю необходимо зарегистрироваться. (Детали регистрации могут быть предоставлены позже, пока просто упомяните необходимость).
- Основные функции кнопок в интерфейсе:
    - Левая панель: Управление файлами, версиями, настройками (детали могут быть добавлены). Кнопка "Аватар" - для профиля пользователя (после регистрации). Кнопка "Google" - для входа/регистрации.
    - Центральная область: Отображение и взаимодействие с голограммой.
    - Правая панель: Чат с ИИ, инструменты для работы с голограммой.
    - Нижняя панель (область жестов): Используется для управления голограммой с помощью жестов рук (требует разрешения на камеру).
- Возможности проекта: Создание и редактирование интерактивных аудиовизуальных голограмм, совместная работа (в будущем), управление с помощью жестов и голоса.
- "Триа": Продвинутый ИИ-ассистент, доступный после регистрации, который помогает в создании контента, отвечает на сложные вопросы и интегрирован с функциями голограммы.

Пожалуйста, будьте вежливы и информативны. Если пользователь спрашивает о чем-то, что выходит за рамки вашей компетенции как информационного бота, предложите ему зарегистрироваться для доступа к "Триа".
"""

    async def call_mistral_public_chatbot(self, user_prompt: str) -> str:
        """
        Sends a chat completion request to the Mistral Small model for the public informational bot.
        
        Args:
            user_prompt (str): The message or query from the user.
                                  
        Returns:
            str: The generated response from the LLM, or an error message if the API call fails.
        """
        if not self.public_bot_api_key:
            logger.error("Public bot API key is missing.")
            return "Error: Chatbot not configured (API key missing)."

        headers = {
            "Authorization": f"Bearer {self.public_bot_api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        payload = {
            "model": "mistral-small-latest",
            "messages": [
                {"role": "system", "content": self.public_bot_system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "temperature": 0.7,
            "max_tokens": 500
        }

        logger.debug(f"Sending payload to Mistral (public bot): {json.dumps(payload, indent=2)}")

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(self.api_url, json=payload, headers=headers)
                response.raise_for_status()
                response_data = response.json()
                logger.debug(f"Mistral API Raw Response (public bot): {json.dumps(response_data, indent=2)}")

                if response_data.get("choices") and len(response_data["choices"]) > 0:
                    message_content = response_data["choices"][0].get("message", {}).get("content")
                    if message_content:
                        logger.info("Successfully received content from Mistral API (public bot).")
                        return message_content.strip()
                    else:
                        logger.error("Mistral API response (public bot) contained no content in the message.")
                        return "Error: LLM response format unexpected (no content)."
                else:
                    logger.error("Mistral API response (public bot) contained no choices or empty choices list.")
                    return "Error: LLM response format unexpected (no choices)."

            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP Status Error calling Mistral API (public bot): {e.response.status_code} - {e.response.text}")
                return f"Error: LLM API request failed with status {e.response.status_code}."
            except httpx.RequestError as e:
                logger.error(f"Request Error calling Mistral API (public bot): {e}")
                return f"Error: LLM API request failed due to a network issue or client error."
            except json.JSONDecodeError as e:
                logger.error(f"JSON Decode Error from Mistral API (public bot): {e}. Response text: {response.text if 'response' in locals() else 'N/A'}")
                return "Error: Failed to decode LLM response."
            except Exception as e:
                logger.exception("An unexpected error occurred while calling Mistral API (public bot).")
                return "Error: An unexpected error occurred with the LLM service."

async def main_test():
    # This test uses the hardcoded public_bot_api_key from the LLMService class.
    # No environment variable needed for this specific test.
    logger.info("Starting LLMService test for public chatbot.")

    llm_service = LLMService()

    test_prompt_1 = "Привет, что это за проект?"
    logger.info(f"Test 1 - Prompt: {test_prompt_1}")
    response1 = await llm_service.call_mistral_public_chatbot(user_prompt=test_prompt_1)
    logger.info(f"Test 1 - Response: {response1}")

    test_prompt_2 = "Как мне использовать жесты?"
    logger.info(f"Test 2 - Prompt: {test_prompt_2}")
    response2 = await llm_service.call_mistral_public_chatbot(user_prompt=test_prompt_2)
    logger.info(f"Test 2 - Response: {response2}")

    # Test with a faulty key (simulated by temporarily altering the instance's key)
    # Note: This is a bit artificial as the key is hardcoded.
    # A better test for this would be if the key was configurable and an invalid one was passed.
    logger.info("Test 3 - Simulating an API key error")
    original_public_key = llm_service.public_bot_api_key
    llm_service.public_bot_api_key = "invalid_key_for_testing"
    response3 = await llm_service.call_mistral_public_chatbot(user_prompt="This prompt should cause an auth error.")
    logger.info(f"Test 3 - Response (expecting error): {response3}")
    llm_service.public_bot_api_key = original_public_key # Restore for any subsequent tests if needed

# This block ensures that `main_test()` is called only when the script is executed directly.
if __name__ == "__main__":
    import asyncio
    # Prerequisites for running this test:
    # 1. Install httpx: `pip install httpx`.
    # 2. Set your MISTRAL_API_KEY environment variable (e.g., `export MISTRAL_API_KEY='your_actual_api_key'` in bash).
    # 3. Run the script: `python backend/core/services/llm_service.py`
    asyncio.run(main_test())
