# backend/core/db/astra_connector.py
import os
import logging
from astrapy import DataAPIClient
from fastapi import Request, WebSocket

logger = logging.getLogger(__name__)

def get_astra_client():
    """
    Creates and returns an Astra DB DataAPIClient.
    """
    token = os.getenv("ASTRA_DB_APPLICATION_TOKEN")
    if not token:
        logger.error("ASTRA_DB_APPLICATION_TOKEN environment variable is missing.")
        return None
    return DataAPIClient(token)

def get_astra_db(client: DataAPIClient = None):
    """
    Returns the Astra DB instance using environment variables.
    """
    if client is None:
        client = get_astra_client()
        if client is None:
            return None

    api_endpoint = os.getenv("ASTRA_DATABASE_URL")
    if not api_endpoint:
        logger.error("ASTRA_DATABASE_URL environment variable is missing.")
        return None

    try:
        db = client.get_database(api_endpoint)
        return db
    except Exception as e:
        logger.error(f"Failed to connect to Astra DB: {e}")
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
        logger.error("Astra DB not initialized in app.state. Attempting on-the-fly connection.")
        db = get_astra_db()
        if db is None:
            raise Exception("Astra DB connection failed")
    return db
