"""
scripts/test_gesture_pipeline.py

Тест полного конвейера Soma-блока:
1. Генерация фейковых 21-точечных landmarks
2. Отправка на /api/v1/gestures/embed
3. Проверка ответа (intent, confidence, vector_dim)

Запуск: python scripts/test_gesture_pipeline.py
"""

import os
import sys
import json
import time
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).parent.parent / ".env.local"
load_dotenv(env_path)

API_URL = os.getenv("API_URL", "http://localhost:8000")
JWT_TOKEN = os.getenv("TEST_JWT_TOKEN", "")


def generate_fake_landmarks():
    """Генерирует 21 точку MediaPipe (жест «открытая ладонь»)."""
    return [
        {"x": 0.5, "y": 0.8, "z": 0.0},  # wrist
        {"x": 0.48, "y": 0.7, "z": -0.02},  # thumb_cmc
        {"x": 0.45, "y": 0.65, "z": -0.03},  # thumb_mcp
        {"x": 0.42, "y": 0.62, "z": -0.04},  # thumb_ip
        {"x": 0.40, "y": 0.60, "z": -0.05},  # thumb_tip
        {"x": 0.52, "y": 0.65, "z": -0.01},  # index_mcp
        {"x": 0.53, "y": 0.55, "z": -0.02},  # index_pip
        {"x": 0.54, "y": 0.48, "z": -0.03},  # index_dip
        {"x": 0.55, "y": 0.42, "z": -0.04},  # index_tip
        {"x": 0.56, "y": 0.62, "z": 0.0},  # middle_mcp
        {"x": 0.57, "y": 0.50, "z": -0.01},  # middle_pip
        {"x": 0.58, "y": 0.43, "z": -0.02},  # middle_dip
        {"x": 0.59, "y": 0.37, "z": -0.03},  # middle_tip
        {"x": 0.58, "y": 0.60, "z": 0.01},  # ring_mcp
        {"x": 0.59, "y": 0.50, "z": 0.0},  # ring_pip
        {"x": 0.60, "y": 0.44, "z": -0.01},  # ring_dip
        {"x": 0.61, "y": 0.39, "z": -0.02},  # ring_tip
        {"x": 0.56, "y": 0.62, "z": 0.02},  # pinky_mcp
        {"x": 0.57, "y": 0.53, "z": 0.01},  # pinky_pip
        {"x": 0.58, "y": 0.48, "z": 0.0},  # pinky_dip
        {"x": 0.59, "y": 0.44, "z": -0.01},  # pinky_tip
    ]


async def test_gesture_embed():
    import httpx

    url = f"{API_URL}/api/v1/gestures/embed"
    headers = {
        "Content-Type": "application/json",
    }
    if JWT_TOKEN:
        headers["Authorization"] = f"Bearer {JWT_TOKEN}"

    payload = {
        "landmarks": generate_fake_landmarks(),
        "mode": "full_search",
        "context": {},
    }

    print(f"🔗 POST {url}")
    print(f"📦 Landmarks: {len(payload['landmarks'])} points")

    start = time.time()
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(url, json=payload, headers=headers)
    elapsed = time.time() - start

    print(f"⏱️  Latency: {elapsed:.2f}s")
    print(f"📡 Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(
            f"✅ Response: intent={data.get('intent')}, confidence={data.get('confidence'):.3f}"
        )
        print(f"   Matches: {len(data.get('matches', []))}")
        print(f"   Metadata: {json.dumps(data.get('metadata', {}), indent=2)}")
        return True
    elif response.status_code == 401:
        print("❌ 401 Unauthorized — JWT протух или отсутствует")
        print("   Установите TEST_JWT_TOKEN в .env.local")
        return False
    else:
        print(f"❌ Error: {response.text[:200]}")
        return False


if __name__ == "__main__":
    import asyncio

    success = asyncio.run(test_gesture_embed())
    sys.exit(0 if success else 1)
