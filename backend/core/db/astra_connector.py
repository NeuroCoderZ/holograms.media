# backend/core/db/astra_connector.py
import os
import logging
from astrapy import DataAPIClient
from fastapi import Request, WebSocket

from backend.core.config import settings

logger = logging.getLogger(__name__)

def get_astra_client():
    """
    Creates and returns an Astra DB DataAPIClient.
    """
    token = settings.ASTRA_DB_APPLICATION_TOKEN
    if not token:
        logger.error("ASTRA_DB_APPLICATION_TOKEN (token) is missing in settings.")
        return None
    return DataAPIClient(token)

def get_astra_db(client: DataAPIClient = None):
    """
    Returns the Astra DB instance using settings.
    """
    if client is None:
        client = get_astra_client()
        if client is None:
            return None

    api_endpoint = settings.ASTRA_DB_API_ENDPOINT
    if not api_endpoint:
        logger.error("ASTRA_DB_API_ENDPOINT is missing in settings.")
        return None

    try:
        # Use the endpoint directly if it includes https://, otherwise it might be just an ID
        db = client.get_database(api_endpoint, keyspace=settings.ASTRA_DB_KEYSPACE)
        return db
    except Exception as e:
        logger.error(f"Failed to connect to Astra DB at {api_endpoint}: {e}")
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
