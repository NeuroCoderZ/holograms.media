# backend/core/config.py
import os
from pydantic import BaseModel, field_validator


def get_astra_endpoint() -> str:
    env_keys = ["ASTRA_DB_API_ENDPOINT", "ASTRA_DATABASE_URL"]
    v = ""
    for k in env_keys:
        val = (os.getenv(k) or "").strip()
        if val:
            if val == k:
                print(f"DEBUG: Deleting poisoned env var {k}='{val}'")
                if k in os.environ:
                    del os.environ[k]
                continue
            v = val
            break

    print(f"DEBUG: Initializing ASTRA_DB_API_ENDPOINT. Final: '{v}'")
    if v and not v.startswith("http"):
        return f"https://{v}"
    return v


def clean_poisoned_vars():
    """Overwrites env vars that contain their own name as value to prevent library leaks."""
    keys = [
        "ASTRA_DB_APPLICATION_TOKEN",
        "ASTRA_DB_ID",
        "ASTRA_DB_REGION",
        "ASTRA_DB_KEYSPACE",
        "ASTRA_DB_API_ENDPOINT",
        "ASTRA_DATABASE_URL",
        "JWT_SECRET_KEY",
        "GOOGLE_CLIENT_ID",
        "GOOGLE_API_KEY",
    ]
    for k in keys:
        val = (os.getenv(k) or "").strip()
        if val == k:
            print(f"DEBUG: Neutralizing poisoned env var: {k}='{val}'")
            # We overwrite with a string that is DEFINITELY not the key name
            # but is also not a valid hostname/port, to trigger controlled fallbacks.
            os.environ[k] = "__NONE__"


clean_poisoned_vars()


class Settings(BaseModel):
    # Security & Auth
    SECRET_KEY: str = (
        os.getenv("JWT_SECRET_KEY")
        or ("dev_secret_key_12345" if os.getenv("ENVIRONMENT") != "production" else "")
    ).strip()
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Google OAuth & AI
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "").strip()
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "").strip()

    # Mistral AI
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "").strip()

    # Hermes Agent (Priority AI - OpenAI-compatible API)
    HERMES_API_KEY: str = os.getenv("HERMES_API_KEY", "").strip()
    HERMES_BASE_URL: str = os.getenv("HERMES_BASE_URL", "http://127.0.0.1:8642/v1").strip()

    # OpenClaw.ai (Deprecated - use Hermes)
    OPENCLAW_GATEWAY_TOKEN: str = os.getenv("OPENCLAW_GATEWAY_TOKEN", "").strip()

    # Database (Astra DB)
    ASTRA_DB_APPLICATION_TOKEN: str = os.getenv(
        "ASTRA_DB_APPLICATION_TOKEN", ""
    ).strip()
    ASTRA_DB_API_ENDPOINT: str = get_astra_endpoint()
    ASTRA_DB_ID: str = (
        os.getenv("ASTRA_DB_ID") or "403a15dc-85a4-451f-a789-df997722a23c"
    ).strip()
    ASTRA_DB_REGION: str = (os.getenv("ASTRA_DB_REGION") or "us-east-2").strip()
    ASTRA_DB_KEYSPACE: str = (
        os.getenv("ASTRA_DB_KEYSPACE") or "default_keyspace"
    ).strip()

    # Storage: AstraDB (vector, 80GB free). R2 planned for future media.
    ASTRA_DB_APPLICATION_TOKEN: str = (os.getenv("ASTRA_DB_APPLICATION_TOKEN") or "").strip()
    ASTRA_DB_API_ENDPOINT: str = (os.getenv("ASTRA_DB_API_ENDPOINT") or "").strip()

    # Environment
    ENVIRONMENT: str = (os.getenv("ENVIRONMENT") or "development").strip()

    # Torus Geometry (canonical v2.0)
    TORUS_H_Y: float = 3.44  # meters, 128 cells
    TORUS_D_Z: float = 1.72  # meters, 128 cells (half of H)
    TORUS_R_IN: float = 1.0  # meters inner radius
    TORUS_GRID: str = "128x128x256"

    # AI Models (Tria v0.20.237)
    DEFAULT_MODEL: str = "gemini-3-flash-preview"
    SUBAGENT_MODEL: str = "gemini-3.1-flash-lite-preview"
    ENABLE_GROUNDING: bool = os.getenv("ENABLE_GROUNDING", "true").lower() == "true"

    # CORS
    CORS_ORIGINS: list = [
        "https://holograms.media",
        "https://www.holograms.media",
        "https://dev.holograms.media",
        "https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    # Developers (Whitelisted Emails)
    DEV_USERS: list = os.getenv("DEV_USERS", "neurocoderz@gmail.com").split(",")


settings = Settings()
