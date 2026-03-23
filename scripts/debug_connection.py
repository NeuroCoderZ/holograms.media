
import socket
import os
from pathlib import Path
from dotenv import load_dotenv

# Загружаем настройки
env_path = Path(__file__).parent.parent / '.env.local'
if env_path.exists():
    load_dotenv(env_path)

endpoint = os.getenv("ASTRA_DB_API_ENDPOINT", "").replace("https://", "").replace("http://", "").split('/')[0]

print(f"📡 Testing DNS for: {endpoint}")

try:
    ip = socket.gethostbyname(endpoint)
    print(f"✅ DNS Resolved: {ip}")
except Exception as e:
    print(f"❌ DNS Resolution Failed: {e}")
