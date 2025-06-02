# backend/cloud_functions/hello_world/main.py
from firebase_functions import https_fn

@https_fn.on_request()
def hello_world(req: https_fn.Request) -> https_fn.Response:
    """Простая тестовая HTTP функция."""
    print("Функция hello_world вызвана!")
    return https_fn.Response("Hello from Firebase Cloud Functions (Python) by Tria & Flash!")