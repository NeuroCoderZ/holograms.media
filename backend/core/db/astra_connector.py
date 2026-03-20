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
        db_id = settings.ASTRA_DB_ID.strip()
        region = settings.ASTRA_DB_REGION.strip()
        keyspace = settings.ASTRA_DB_KEYSPACE.strip()
        api_endpoint = settings.ASTRA_DB_API_ENDPOINT.strip()

        logger.info(f"Attempting Astra DB Connection. ID: '{db_id}', Region: '{region}', Endpoint: '{api_endpoint}', Keyspace: '{keyspace}'")

        # 1. If ID and Region are missing but Endpoint is present, try to parse ID/Region from Endpoint
        # Pattern: https://[DB_ID]-[REGION].apps.astra.datastax.com
        if (not db_id or not region) and api_endpoint:
            match = re.search(r"https?://([a-f0-9\-]+)-([a-z0-9\-]+)\.apps\.astra\.datastax\.com", api_endpoint)
            if match:
                db_id = match.group(1)
                region = match.group(2)
                logger.info(f"Parsed Astra DB ID '{db_id}' and Region '{region}' from endpoint.")

        # 2. Prefer connecting by ID and Region (Parsed or Direct)
        if db_id and region:
            logger.info(f"Connecting to Astra DB via ID: {db_id} (Region: {region})")
            db = client.get_async_database(db_id, region=region, keyspace=keyspace)
            return db
        
        # 3. Fallback to raw Endpoint
        if api_endpoint:
            logger.info(f"Connecting to Astra DB via raw Endpoint: {api_endpoint}")
            db = client.get_async_database(api_endpoint, keyspace=keyspace)
            return db
        
        logger.error("❌ CRITICAL: Neither ASTRA_DB_ID/REGION nor ASTRA_DB_API_ENDPOINT are provided in environment variables.")
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
