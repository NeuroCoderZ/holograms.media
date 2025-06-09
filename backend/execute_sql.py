import asyncio
import asyncpg
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# SQL Commands
SQL_COMMAND_ADD_COLUMN = "ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) NOT NULL DEFAULT 'user';"
SQL_COMMAND_ADD_CONSTRAINT = """
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'users' AND constraint_name = 'users_role_check'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('admin', 'core_developer', 'beta_tester', 'user'));
    END IF;
END;
$$;
"""

async def execute_sql_commands():
    db_url = os.environ.get('NEON_DATABASE_URL')
    if not db_url:
        logger.critical("FATAL: NEON_DATABASE_URL environment variable is not set.")
        print("Error: NEON_DATABASE_URL environment variable is not set.")
        return False

    # It's critical to check for placeholder values if .env.example might be the source
    # For this test, we assume NEON_DATABASE_URL is correctly populated from the true environment
    if "YOUR_NEON_USER" in db_url or "YOUR_NEON_HOST" in db_url:
        logger.critical(f"FATAL: NEON_DATABASE_URL appears to contain placeholder values: {db_url[:db_url.find('@') + 1]}********")
        print(f"Error: NEON_DATABASE_URL appears to contain placeholder values. It must be set to the actual connection string.")
        return False

    conn = None
    try:
        # Mask credentials in log output
        masked_db_url = db_url
        at_symbol_index = db_url.find('@')
        if at_symbol_index > 0:
            # Find the start of credentials (after "://")
            protocol_end_index = db_url.find('://')
            if protocol_end_index != -1:
                 masked_db_url = db_url[:protocol_end_index+3] + "********" + db_url[at_symbol_index:]

        logger.info(f"Attempting to connect to database using URL: {masked_db_url}")
        conn = await asyncpg.connect(db_url)
        logger.info("Successfully connected to the database.")

        logger.info(f"Executing: {SQL_COMMAND_ADD_COLUMN}")
        await conn.execute(SQL_COMMAND_ADD_COLUMN)
        logger.info("Successfully executed ADD COLUMN command.")
        print("Python script: Successfully executed ADD COLUMN command.")

        logger.info(f"Executing: {SQL_COMMAND_ADD_CONSTRAINT.strip()}")
        await conn.execute(SQL_COMMAND_ADD_CONSTRAINT)
        logger.info("Successfully executed ADD CONSTRAINT command.")
        print("Python script: Successfully executed ADD CONSTRAINT command.")

        return True

    except asyncpg.PostgresError as e:
        logger.error(f"Database command execution error: {e}")
        print(f"Python script: Database command execution error: {e}")
        return False
    except Exception as e:
        logger.exception(f"An unexpected error occurred: {e}")
        print(f"Python script: An unexpected error occurred: {e}")
        return False
    finally:
        if conn:
            await conn.close()
            logger.info("Database connection closed.")

if __name__ == "__main__":
    logger.info("Starting execute_sql.py script (no dotenv)...")
    # NEON_DATABASE_URL must be in the environment
    # For local testing: export NEON_DATABASE_URL="your_actual_url"

    success = asyncio.run(execute_sql_commands())
    if success:
        logger.info("SQL commands executed successfully via Python script.")
        print("Python script: SQL commands executed successfully.")
    else:
        logger.error("SQL command execution failed via Python script.")
        print("Python script: SQL command execution failed.")
        # import sys
        # sys.exit(1) # Avoid exit for tool compatibility for now
