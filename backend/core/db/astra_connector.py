# backend/core/db/astra_connector.py
import os
import logging
from urllib.parse import urlparse
from astrapy import DataAPIClient
from fastapi import Request, WebSocket

from backend.core.config import settings

logger = logging.getLogger(__name__)

POISONED_MARKERS = (
    "__NONE__",
    "ASTRA_DB_API_ENDPOINT",
    "ASTRA_DATABASE_URL",
    "ASTRA_DB_ID",
    "ASTRA_DB_REGION",
)


def _contains_poisoned_placeholder(value: str) -> bool:
    normalized = (value or "").strip().upper()
    if not normalized:
        return False
    if normalized.startswith("SECRET:") or normalized.startswith("SECRET!"):
        return True
    return any(marker in normalized for marker in POISONED_MARKERS)


def _normalize_api_endpoint(raw_endpoint: str) -> str:
    endpoint = (raw_endpoint or "").strip()
    if not endpoint:
        return ""

    if not endpoint.startswith(("http://", "https://")):
        endpoint = f"https://{endpoint}"

    if _contains_poisoned_placeholder(endpoint):
        logger.error("❌ Astra DB endpoint rejected: placeholder/secret marker detected in value.")
        return ""

    parsed = urlparse(endpoint)
    if not parsed.netloc:
        logger.error("❌ Astra DB endpoint rejected: URL has no network location.")
        return ""

    try:
        _ = parsed.port
    except ValueError as exc:
        logger.error(f"❌ Astra DB endpoint rejected: malformed port in URL ({exc}).")
        return ""

    if _contains_poisoned_placeholder(parsed.netloc) or _contains_poisoned_placeholder(parsed.hostname or ""):
        logger.error("❌ Astra DB endpoint rejected: placeholder detected in hostname.")
        return ""

    return endpoint

def get_astra_client():
    """
    Creates and returns an Astra DB DataAPIClient.
    """
    token = settings.ASTRA_DB_APPLICATION_TOKEN
    if not token:
        logger.critical("❌ CRITICAL: ASTRA_DB_APPLICATION_TOKEN is missing in environment variables!")
        return None
    return DataAPIClient(token)

import re

def get_astra_db(client: DataAPIClient = None):
    """
    Returns an ASYNCHRONOUS Astra DB instance using settings.
    """
    if client is None:
        client = get_astra_client()
        if client is None:
            return None

    try:
        raw_db_id = (os.getenv("ASTRA_DB_ID") or "").strip()
        raw_region = (os.getenv("ASTRA_DB_REGION") or "").strip()
        raw_api_endpoint = (
            (os.getenv("ASTRA_DB_API_ENDPOINT") or "").strip()
            or (os.getenv("ASTRA_DATABASE_URL") or "").strip()
        )

        db_id = raw_db_id or (settings.ASTRA_DB_ID or "").strip()
        region = raw_region or (settings.ASTRA_DB_REGION or "").strip()
        keyspace = (settings.ASTRA_DB_KEYSPACE or "default_keyspace").strip()
        api_endpoint = _normalize_api_endpoint(raw_api_endpoint or settings.ASTRA_DB_API_ENDPOINT)

        # [CRITICAL GUARD] BLOCK IF POISONED
        if _contains_poisoned_placeholder(db_id) or _contains_poisoned_placeholder(region):
            logger.error(
                f"❌ Astra DB Connection BLOCKED: Poisoned ID/region detected. ID='{db_id}', REGION='{region}'"
            )
            return None

        if raw_api_endpoint and not api_endpoint:
            logger.error("❌ Astra DB Connection BLOCKED: malformed API endpoint provided via environment.")
            return None

        logger.info(f"Attempting Astra DB Connection. ID: '{db_id}', Region: '{region}', Endpoint: '{api_endpoint}', Keyspace: '{keyspace}'")

        # 1. If ID and Region are missing but Endpoint is present, try to parse ID/Region from Endpoint
        # Pattern: https://[DB_ID]-[REGION].apps.astra.datastax.com
        if (not db_id or not region) and api_endpoint:
            match = re.search(r"https?://([a-f0-9\-]+)-([a-z0-9\-]+)\.apps\.astra\.datastax\.com", api_endpoint)
            if match:
                db_id = match.group(1)
                region = match.group(2)
                logger.info(f"Parsed Astra DB ID '{db_id}' and Region '{region}' from endpoint.")

        # 1. Приоритет: использование полного эндпоинта
        if api_endpoint:
            logger.info(f"Connecting to Astra DB via endpoint: {api_endpoint[:20]}...{api_endpoint[-10:]}")
            # В astrapy 2.0+ get_async_database принимает endpoint или ID
            db = client.get_async_database(api_endpoint, keyspace=keyspace)
            return db

        # 2. Fallback: использование ID и региона
        if db_id and region:
            logger.info(f"Connecting to Astra DB via ID: {db_id} (Region: {region})")
            db = client.get_async_database(db_id, region=region, keyspace=keyspace)
            return db
        
        if not db_id or not region and not api_endpoint:
            logger.error("❌ CRITICAL: Astra DB credentials missing. ID/Region/Endpoint are empty.")
            return None

        logger.error(f"❌ CRITICAL: Neither ASTRA_DB_ID/REGION nor ASTRA_DB_API_ENDPOINT are provided in environment variables. Current settings: ID={db_id}, REGION={region}, ENDPOINT={api_endpoint}")
        return None

    except Exception as e:
        logger.error(f"❌ Failed to connect to Astra DB: {e}", exc_info=True)
        return None

async def get_db(request: Request = None, websocket: WebSocket = None):
    """
    Dependency that provides access to the Astra DB instance stored in app.state.
    Supports both HTTP Requests and WebSockets.
    """
    db = None
    if request:
        db = getattr(request.app.state, 'astra_db', None)
    elif websocket:
        db = getattr(websocket.app.state, 'astra_db', None)
    
    if db is None:
        logger.warning("Astra DB not initialized in app.state. Attempting on-the-fly connection.")
        db = get_astra_db()
        if db is None:
            logger.error("Astra DB connection failed on-the-fly.")
            # Do NOT raise exception here, return None and let the endpoint handle it
            return None
    return db
