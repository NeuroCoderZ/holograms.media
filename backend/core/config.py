# backend/core/config.py
import os
from pydantic import BaseModel, field_validator

class Settings(BaseModel):
    # Security & Auth
    SECRET_KEY: str = (os.getenv("JWT_SECRET_KEY") or ("dev_secret_key_12345" if os.getenv("ENVIRONMENT") != "production" else "")).strip()
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Google OAuth & AI
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "").strip()
    
    # Mistral AI
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "").strip()

    # OpenClaw.ai (Successor to Moltbook)
    OPENCLAW_GATEWAY_TOKEN: str = os.getenv("OPENCLAW_GATEWAY_TOKEN", "").strip()
    
    # Database (Astra DB)
    ASTRA_DB_APPLICATION_TOKEN: str = os.getenv("ASTRA_DB_APPLICATION_TOKEN", "").strip()
    ASTRA_DB_API_ENDPOINT: str = (os.getenv("ASTRA_DB_API_ENDPOINT") or os.getenv("ASTRA_DATABASE_URL") or "").strip()
    ASTRA_DB_ID: str = os.getenv("ASTRA_DB_ID", "403a15dc-85a4-451f-a789-df997722a23c").strip()
    ASTRA_DB_REGION: str = os.getenv("ASTRA_DB_REGION", "us-east-2").strip()
    ASTRA_DB_KEYSPACE: str = os.getenv("ASTRA_DB_KEYSPACE", "default_keyspace").strip()
    
    # Storage (Backblaze B2)
    B2_ENDPOINT_URL: str = os.getenv("B2_ENDPOINT_URL", "").strip()
    B2_ACCESS_KEY_ID: str = os.getenv("B2_ACCESS_KEY_ID", "").strip()
    B2_SECRET_ACCESS_KEY: str = os.getenv("B2_SECRET_ACCESS_KEY", "").strip()
    B2_BUCKET_NAME: str = os.getenv("B2_BUCKET_NAME", "holograms-media").strip()
    
    # Environment
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").strip()
    
    # CORS
    CORS_ORIGINS: list = [
        "https://holograms.media",
        "https://www.holograms.media",
        "https://dev.holograms.media",
        "https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app",
        "http://localhost:5173",
        "http://localhost:3000"
    ]
    
    # Developers (Whitelisted Emails)
    DEV_USERS: list = os.getenv("DEV_USERS", "neurocoderz@gmail.com").split(",")

    @field_validator("ASTRA_DB_API_ENDPOINT")
    @classmethod
    def validate_astra_endpoint(cls, v: str) -> str:
        # Prevent common secret misconfiguration where variable name is set as value
        if v == "ASTRA_DB_API_ENDPOINT" or v == "ASTRA_DATABASE_URL":
            return ""
        if v and not v.startswith("http"):
            return f"https://{v}"
        return v

settings = Settings()
