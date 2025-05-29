import asyncpg
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_db_connection():
    """Establishes and returns a connection to the PostgreSQL database."""
    db_url = os.environ.get('NEON_DATABASE_URL')
    if not db_url:
        logger.error("NEON_DATABASE_URL environment variable is not set.")
        raise ValueError("NEON_DATABASE_URL environment variable is not set.")

    try:
        conn = await asyncpg.connect(db_url)
        logger.info("Successfully connected to the database.")
        return conn
    except asyncpg.PostgresError as e:
        logger.error(f"Error connecting to the database: {e}")
        raise
    except Exception as e:
        logger.error(f"An unexpected error occurred during database connection: {e}")
        raise

async def test_connection():
    """Tests the database connection and executes a simple query."""
    conn = None
    try:
        logger.info("Attempting to establish a database connection...")
        conn = await get_db_connection()
        result = await conn.fetchval("SELECT 1;")
        logger.info(f"Successfully executed test query. Result: {result}")
        if result == 1:
            logger.info("Database connection test PASSED.")
        else:
            logger.error(f"Database connection test FAILED. Expected 1, got {result}")
    except Exception as e:
        logger.error(f"Database connection test FAILED: {e}")
    finally:
        if conn:
            await conn.close()
            logger.info("Database connection closed.")

if __name__ == "__main__":
    # This part is for direct testing of this script.
    # In a real application, NEON_DATABASE_URL should be set in the environment.
    # For this test, we'll try to set it if it's not found, using the provided URL.
    if not os.environ.get('NEON_DATABASE_URL'):
        logger.warning("NEON_DATABASE_URL not found in environment. Setting for test purposes.")
        os.environ['NEON_DATABASE_URL'] = "postgresql://neondb_owner:npg_LvH56aGZBJwy@ep-wandering-math-a9jvc9vk-pooler.gwc.azure.neon.tech/neondb?sslmode=require"
    
    import asyncio
    asyncio.run(test_connection())
