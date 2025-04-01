import google.generativeai as genai
from langchain_google_genai import GoogleGenerativeAI

# Настройка API-ключа
genai.configure(api_key="AIzaSyBuHDIGcATXYfODzWAdMlK_Mburib5QbgE")

# Список доступных моделей
print("Fetching available models...")
try:
    models = genai.list_models()
    print("Available models:")
    for model in models:
        print(f"- {model.name}")
except Exception as e:
    print(f"Error listing models: {e}")

# Тест с моделью gemini-1.5-pro-latest
llm = GoogleGenerativeAI(model="gemini-pro", google_api_key="AIzaSyBuHDIGcATXYfODzWAdMlK_Mburib5QbgE")
try:
    result = llm.invoke(
        "Опиши инновационную голограмму будущего для аудио-визуальной системы. "
        "Учти компоненты: {"
        "3D-визуализация звуковых волн; "
        "нейро-сетевой анализ паттернов; "
        "режим дополненной реальности; "
        "система веток/версий"
        "}"
    )
    print("Result:", result)
except Exception as e:
    print("Error during invocation:", e)
