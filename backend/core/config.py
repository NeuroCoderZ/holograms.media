# backend/core/config.py
import os
from pydantic import BaseModel

class Settings(BaseModel):
    # Security & Auth
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me-in-production-very-secret")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Google OAuth
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    
    # Mistral AI
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
    
    # Database (Astra DB)
    ASTRA_DB_APPLICATION_TOKEN: str = os.getenv("ASTRA_DB_APPLICATION_TOKEN", "")
    ASTRA_DB_API_ENDPOINT: str = os.getenv("ASTRA_DB_API_ENDPOINT", "")
    ASTRA_DB_ID: str = os.getenv("ASTRA_DB_ID", "")
    ASTRA_DB_REGION: str = os.getenv("ASTRA_DB_REGION", "")
    ASTRA_DB_KEYSPACE: str = os.getenv("ASTRA_DB_KEYSPACE", "default_keyspace")
    
    # Storage (Backblaze B2)
    B2_ENDPOINT_URL: str = os.getenv("B2_ENDPOINT_URL", "")
    B2_ACCESS_KEY_ID: str = os.getenv("B2_ACCESS_KEY_ID", "")
    B2_SECRET_ACCESS_KEY: str = os.getenv("B2_SECRET_ACCESS_KEY", "")
    B2_BUCKET_NAME: str = os.getenv("B2_BUCKET_NAME", "holograms-media")
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    
    # CORS
    CORS_ORIGINS: list = [
        "https://holograms.media",
        "https://www.holograms.media",
        "https://dev.holograms.media",
        "http://localhost:5173",
        "http://localhost:3000"
    ]

settings = Settings()
