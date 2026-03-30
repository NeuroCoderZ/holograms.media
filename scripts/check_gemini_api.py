"""
scripts/check_gemini_api.py

Прямая проверка доступности Gemini Embedding API.
Запуск: python scripts/check_gemini_api.py
"""

import os
import sys
import time
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)


def main():
    from google import genai
    from google.genai import types
    import httpx

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        print("❌ GOOGLE_API_KEY не задан")
        sys.exit(1)

    print(f"🔑 Key: {api_key[:8]}...{api_key[-4:]}")

    # Тест 1: Простой эмбеддинг
    print("\n[Test 1] Simple embed_content...")
    try:
        client = genai.Client(
            api_key=api_key,
            http_options=types.HttpOptions(timeout=30),
        )

        start = time.time()
        response = client.models.embed_content(
            model="gemini-embedding-2-preview",
            contents="Hello Holograms",
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=768,  # Меньший размер для теста
            ),
        )
        elapsed = time.time() - start

        dims = len(response.embeddings[0].values) if response.embeddings else 0
        print(f"  ✓ OK — {elapsed:.2f}с, {dims} dims")

    except (httpx.TimeoutException, httpx.ConnectError, httpx.NetworkError) as e:
        print(f"  ✗ NETWORK ERROR: {type(e).__name__}: {e}")
        sys.exit(1)
    except Exception as e:
        error_str = str(e)
        if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
            print(f"  ✗ QUOTA EXCEEDED: {e}")
        elif "404" in error_str or "NOT_FOUND" in error_str:
            print(f"  ✗ MODEL NOT FOUND: gemini-embedding-2-preview — {e}")
        else:
            print(f"  ✗ ERROR: {type(e).__name__}: {e}")
        sys.exit(1)

    # Тест 2: Batch embed (3 строки)
    print("\n[Test 2] Batch embed (3 texts)...")
    try:
        start = time.time()
        response = client.models.embed_content(
            model="gemini-embedding-2-preview",
            contents=["Alpha", "Beta", "Gamma"],
            config=types.EmbedContentConfig(
                task_type="RETRIEVAL_DOCUMENT",
                output_dimensionality=768,
            ),
        )
        elapsed = time.time() - start
        count = len(response.embeddings) if response.embeddings else 0
        print(f"  ✓ OK — {elapsed:.2f}с, {count} embeddings")
    except Exception as e:
        print(f"  ✗ BATCH ERROR: {e}")

    print("\n✅ Gemini Embedding API is accessible.")


if __name__ == "__main__":
    main()
