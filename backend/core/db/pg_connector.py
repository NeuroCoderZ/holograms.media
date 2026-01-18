# backend/core/db/pg_connector.py
import asyncpg
import os
import logging
from fastapi import Request

logger = logging.getLogger(__name__)

async def get_db_connection(request: Request):
    """
    Dependency that provides an asynchronous connection to the PostgreSQL database.
    It attempts to retrieve a connection from the pool stored in the application state.
    """
    pool = getattr(request.app.state, 'db_pool', None)
    if pool is None:
        logger.error("Database pool not initialized in app.state. Attempting to create a one-off connection.")
        # Fallback to a one-off connection if pool is missing (not recommended for production)
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            logger.error("DATABASE_URL environment variable not set.")
            raise Exception("DATABASE_URL not set")
        conn = await asyncpg.connect(db_url)
        try:
            yield conn
        finally:
            await conn.close()
    else:
        async with pool.acquire() as connection:
            yield connection

async def create_db_pool():
    """
    Creates an asyncpg connection pool.
    """
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        logger.error("DATABASE_URL environment variable is MISSING. Database pool cannot be created.")
        return None
    
    try:
        pool = await asyncpg.create_pool(
            dsn=db_url,
            min_size=1,
            max_size=10,
            command_timeout=60
        )
        logger.info("PostgreSQL connection pool created successfully.")
        return pool
    except Exception as e:
        logger.error(f"Failed to create PostgreSQL connection pool: {e}")
        return None
