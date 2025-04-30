import os
import sys
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.backend import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    print("/health response:", response.status_code, response.json())
    
def test_tria_invoke():
    response = client.post("/tria/invoke", json={"query": "test"})
    print("/tria/invoke response:", response.status_code, response.json())

if __name__ == "__main__":
    test_health()
    test_tria_invoke() 