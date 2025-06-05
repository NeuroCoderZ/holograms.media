import asyncpg
import os
import logging
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging for the database connector module.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def get_db_connection():
    """
    Establishes and returns a new asynchronous connection to the PostgreSQL database.
    The database URL is retrieved from the environment variable `NEON_DATABASE_URL`.
    
    This function is intended for use in environments where a new connection is needed
    per operation or per function invocation (e.g., in stateless Cloud Functions).
    For applications requiring connection pooling, a different approach would be used.

    Returns:
        asyncpg.Connection: An active database connection object.

    Raises:
        ValueError: If the `NEON_DATABASE_URL` environment variable is not set.
        asyncpg.PostgresError: If a database-specific error occurs during connection (e.g., invalid credentials, host unreachable).
        Exception: For any other unexpected errors during the connection attempt.
    """
    db_url = os.environ.get('NEON_DATABASE_URL')
    if not db_url:
        logger.critical("FATAL: NEON_DATABASE_URL environment variable is not set. Cannot establish database connection.")
        raise ValueError("NEON_DATABASE_URL environment variable is not set.")

    try:
        # Attempt to establish a connection using the provided URL.
        # The `?sslmode=require` part of the URL is crucial for secure connections to Neon.tech.
        conn = await asyncpg.connect(db_url)
        logger.info("Successfully established a database connection.")
        return conn
    except asyncpg.PostgresError as e:
        logger.error(f"Database connection error: {e}. Please check NEON_DATABASE_URL and database availability.")
        raise # Re-raise the database-specific error
    except Exception as e:
        logger.exception(f"An unexpected error occurred during database connection attempt.")
        raise # Re-raise any other unexpected error

async def test_connection():
    """
    Tests the database connection by attempting to connect and executing a simple query.
    This function is useful for verifying database connectivity during deployment or setup.
    It logs the outcome and ensures the connection is closed afterwards.
    """
    conn = None
    try:
        logger.info("Attempting to establish a database connection for testing...")
        conn = await get_db_connection()
        # Execute a very simple query to confirm the connection is active and operational.
        result = await conn.fetchval("SELECT 1;")
        logger.info(f"Successfully executed test query. Result: {result}")
        if result == 1:
            logger.info("Database connection test PASSED: Able to connect and query.")
        else:
            logger.error(f"Database connection test FAILED: Expected 1, got {result}. Query might be an issue.")
    except Exception as e:
        # Catch any exception during the test and log it as a failure.
        logger.error(f"Database connection test FAILED: {e}. Check logs for details.")
    finally:
        # Ensure the connection is always closed, regardless of test success or failure.
        if conn:
            await conn.close()
            logger.info("Database connection closed after test.")

# This block allows the script to be run directly for testing purposes.
# When run as the main script, it attempts to test the database connection.
if __name__ == "__main__":
    # For local testing, if NEON_DATABASE_URL is not set in the environment,
    # a default value is provided for demonstration. In production, this variable
    # *must* be set securely (e.g., via Firebase Functions environment variables).
    # Use asyncio.run to execute the asynchronous test_connection function.
    import asyncio
    asyncio.run(test_connection())
