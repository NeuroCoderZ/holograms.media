import os
import asyncpg
from typing import Optional

# Global variable to store the connection pool
_pool: Optional[asyncpg.Pool] = None

# PostgreSQL connection parameters from environment variables
POSTGRES_USER = os.getenv("POSTGRES_USER", "default_user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "default_password")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432") # Default PostgreSQL port
POSTGRES_DB = os.getenv("POSTGRES_DB", "default_db")

# Construct DSN (Data Source Name)
DSN = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

async def init_pg_pool():
    """
    Initializes the asyncpg connection pool.
    Should be called during application startup (e.g., FastAPI lifespan event).
    """
    global _pool
    if _pool:
        print("INFO: Connection pool already initialized.")
        return

    print(f"INFO: Initializing PostgreSQL connection pool for database '{POSTGRES_DB}' on host '{POSTGRES_HOST}:{POSTGRES_PORT}'...")
    try:
        _pool = await asyncpg.create_pool(
            dsn=DSN,
            min_size=int(os.getenv("POSTGRES_POOL_MIN_SIZE", "5")),
            max_size=int(os.getenv("POSTGRES_POOL_MAX_SIZE", "20")),
            # command_timeout=60, # Example: Timeout for commands
            # max_inactive_connection_lifetime=300, # Example: close connections inactive for 5 mins
        )
        print("INFO: PostgreSQL connection pool initialized successfully.")
    except (ConnectionRefusedError, asyncpg.exceptions.InvalidPasswordError) as e:
        print(f"ERROR: Could not connect to PostgreSQL: {e}. Please check connection parameters and database server.")
        _pool = None
    except Exception as e:
        print(f"ERROR: Failed to initialize PostgreSQL connection pool: {e}")
        _pool = None
        # Depending on the application's needs, this might be a place to exit
        # or raise an exception to be caught by the application startup logic.

async def get_pg_connection() -> asyncpg.Connection:
    """
    Acquires a connection from the pool.
    Raises:
        RuntimeError: If the pool is not initialized or no connections are available.
    Returns:
        asyncpg.Connection: An active database connection.
    """
    global _pool
    if not _pool:
        print("ERROR: Connection pool is not initialized. Call init_pg_pool() first.")
        raise RuntimeError("Connection pool is not initialized.")

    print("DEBUG: Acquiring connection from pool...")
    try:
        # The timeout is optional, but can be useful to prevent indefinite blocking
        conn = await _pool.acquire(timeout=10) # 10 seconds timeout
        if conn:
            print("DEBUG: Connection acquired successfully.")
            return conn
        else:
            # This case should ideally not be reached if pool.acquire() blocks or times out
            print("ERROR: Failed to acquire connection from pool (returned None).")
            raise RuntimeError("Failed to acquire connection from pool.")
    except asyncpg.exceptions.PoolConnectionTimeoutError:
        print("ERROR: Timeout acquiring connection from pool. Pool might be exhausted or database unresponsive.")
        raise RuntimeError("Timeout acquiring connection from pool.")
    except Exception as e:
        print(f"ERROR: Error acquiring connection from pool: {e}")
        raise RuntimeError(f"Error acquiring connection from pool: {e}")


async def release_pg_connection(conn: asyncpg.Connection):
    """
    Releases a connection back to the pool.
    Args:
        conn (asyncpg.Connection): The connection to release.
    """
    global _pool
    if not _pool:
        print("WARNING: Attempting to release connection, but pool is not initialized.")
        # If the pool isn't initialized, the connection likely wasn't from the pool
        # or the pool was closed prematurely. Attempt to close the connection directly.
        try:
            if not conn.is_closed():
                await conn.close()
                print("INFO: Connection closed directly as pool was not available for release.")
        except Exception as e:
            print(f"ERROR: Error closing orphaned connection directly: {e}")
        return

    print("DEBUG: Releasing connection back to pool...")
    try:
        # Check if connection is closed or transaction status before releasing
        if conn.is_closed():
            print("WARNING: Attempting to release an already closed connection.")
            return

        # Example: Check for active transaction, though asyncpg's pool handles this well.
        # if conn.is_in_transaction():
        #     print("WARNING: Releasing a connection that is still in a transaction. Consider rollback or commit.")
            # await conn.rollback() # or commit, depending on policy

        await _pool.release(conn)
        print("DEBUG: Connection released successfully.")
    except Exception as e:
        # This can happen if the connection is already closed or invalid
        print(f"ERROR: Error releasing connection back to pool: {e}")
        # Optionally, try to close the connection explicitly if release fails and it's not closed
        try:
            if not conn.is_closed():
                await conn.close()
                print("INFO: Connection explicitly closed after release error.")
        except Exception as close_err:
            print(f"ERROR: Error explicitly closing connection after release error: {close_err}")


async def close_pg_pool():
    """
    Closes the connection pool gracefully.
    Should be called during application shutdown (e.g., FastAPI lifespan event).
    """
    global _pool
    if _pool:
        print("INFO: Closing PostgreSQL connection pool...")
        try:
            # `close()` waits until all connections are released
            await _pool.close()
            print("INFO: PostgreSQL connection pool closed successfully.")
        except Exception as e:
            print(f"ERROR: Error closing PostgreSQL connection pool: {e}")
        finally:
            _pool = None # Ensure _pool is set to None even if close fails
    else:
        print("INFO: PostgreSQL connection pool was not initialized, no need to close.")

# Example usage (typically not run directly in this file but from main app logic)
# if __name__ == "__main__":
#     import asyncio
#
#     async def main_example():
#         # Initialize pool
#         await init_pg_pool()
#
#         if not _pool: # Check if pool was successfully initialized
#             print("CRITICAL: Exiting due to pool initialization failure.")
#             return
#
#         conn1 = None
#         conn2 = None
#         try:
#             print("\nAttempting to get first connection...")
#             conn1 = await get_pg_connection()
#             # Example query
#             result = await conn1.fetchval("SELECT 1 + 1")
#             print(f"Query result from conn1: {result}")
#
#             print("\nAttempting to get second connection...")
#             conn2 = await get_pg_connection()
#             result_conn2 = await conn2.fetchval("SELECT current_user")
#             print(f"Query result from conn2: {result_conn2}")
#
#         except RuntimeError as e:
#             print(f"RUNTIME_ERROR during example usage: {e}")
#         except Exception as e:
#             print(f"An unexpected error occurred during example usage: {e}")
#         finally:
#             if conn1:
#                 print("\nReleasing first connection...")
#                 await release_pg_connection(conn1)
#             if conn2:
#                 print("\nReleasing second connection...")
#                 await release_pg_connection(conn2)
#
#         # Close the pool
#         print("\nClosing pool...")
#         await close_pg_pool()
#
#     asyncio.run(main_example())

# FastAPI Dependency for DB Connection
async def get_db_connection(): # This is the dependency injector
    conn = None
    try:
        # _pool is the global pool variable defined in pg_connector.py
        if _pool is None:
            print("[DB Dep ERROR] Connection pool not initialized.")
            # In a real app, you might raise HTTPException here or ensure pool is always up.
            # For now, relying on lifespan to initialize it.
            raise ConnectionError("Database connection pool is not available.")
        
        # print("[DB Dep DEBUG] Acquiring connection from pool...")
        conn = await _pool.acquire()
        # print("[DB Dep DEBUG] Connection acquired.")
        yield conn
    except Exception as e:
        print(f"[DB Dep ERROR] Error acquiring DB connection: {e}")
        # Consider raising HTTPException for specific error types if needed by endpoints
        # For now, let the endpoint deal with it if conn is None or an error occurs
        # However, if acquire() itself fails significantly, it might be better to raise 503.
        # Let's assume acquire can raise errors that should propagate.
        # If an HTTPException is raised here, it will bypass the finally block for that specific error.
        raise # Re-raise the original exception to be handled by FastAPI or endpoint
    finally:
        if conn:
            # print("[DB Dep DEBUG] Releasing connection back to pool...")
            await _pool.release(conn)
            # print("[DB Dep DEBUG] Connection released.")
