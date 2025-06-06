import argparse
import asyncio
import asyncpg
import os
import sys
from datetime import datetime

# Add the backend directory to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Assuming scripts/ is directly under the project root, so BASE_DIR is project root
BASE_DIR = os.path.dirname(SCRIPT_DIR)
# Construct path to backend directory and add to sys.path
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
sys.path.insert(0, BACKEND_DIR)

# Setup basic logging for the script
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from core.db.pg_connector import DB_SETTINGS
    # Attempt to import USERS_TABLE_NAME, default if not found
    try:
        from core.db.schema import USERS_TABLE_NAME
    except ImportError:
        logger.info("Could not import USERS_TABLE_NAME from core.db.schema, using default 'users'.")
        USERS_TABLE_NAME = 'users' # Default table name
except ImportError as e:
    logger.error(f"Error importing backend modules: {e}")
    logger.error(f"Current sys.path: {sys.path}")
    logger.error(f"Attempted to add BACKEND_DIR: {BACKEND_DIR}")
    sys.exit(1)

async def set_user_role_in_db(email: str, new_role: str):
    conn = None
    try:
        if DB_SETTINGS is None:
            logger.error("DB_SETTINGS is not configured. Please check your environment or pg_connector.py.")
            return

        # Adapt for Pydantic v1 (dict()) vs v2 (model_dump())
        if hasattr(DB_SETTINGS, 'model_dump'):
            conn_params = DB_SETTINGS.model_dump()
        elif hasattr(DB_SETTINGS, 'dict'):
            conn_params = DB_SETTINGS.dict()
        elif isinstance(DB_SETTINGS, dict):
            conn_params = DB_SETTINGS
        else:
            logger.error("DB_SETTINGS is not a recognized Pydantic model or dictionary.")
            return

        logger.info(f"Connecting to database '{conn_params.get('database')}' on host '{conn_params.get('host')}':'{conn_params.get('port')}' with user '{conn_params.get('user')}'...")
        conn = await asyncpg.connect(
            user=conn_params.get('user'),
            password=conn_params.get('password'),
            database=conn_params.get('database'),
            host=conn_params.get('host'),
            port=conn_params.get('port')
        )
        logger.info("Successfully connected to the database.")

        user_exists_check = await conn.fetchrow(f"SELECT firebase_uid FROM {USERS_TABLE_NAME} WHERE email = $1", email)

        if not user_exists_check:
            logger.error(f"User with email '{email}' not found in table '{USERS_TABLE_NAME}'.")
            return

        logger.info(f"Updating role for user '{email}' (Firebase UID: {user_exists_check['firebase_uid']}) to '{new_role}'...")
        updated_user_uid = await conn.fetchval(
            f"UPDATE {USERS_TABLE_NAME} SET role = $1, updated_at = $2 WHERE email = $3 RETURNING firebase_uid",
            new_role, datetime.utcnow(), email
        )

        if updated_user_uid:
            logger.info(f"Successfully updated role for user '{email}' (UID: {updated_user_uid}) to '{new_role}'.")
        else:
            # This case might occur if the role was already set to the new_role,
            # and the UPDATE statement didn't change any rows, thus returning nothing.
            # Or, more critically, if the user disappeared between the check and update.
            logger.warning(f"Could not update role for user '{email}'. User may not exist, or the role was already '{new_role}'.")

    except asyncpg.PostgresError as pg_err:
        logger.error(f"Database error: {pg_err}")
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}", exc_info=True)
    finally:
        if conn:
            await conn.close()
            logger.info("Database connection closed.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Set a user's role in the database.")
    parser.add_argument("email", type=str, help="Email address of the user.")
    allowed_roles = ['user', 'admin', 'core_developer', 'beta_tester']
    parser.add_argument("role", type=str, choices=allowed_roles,
                        help=f"New role for the user. Must be one of: {', '.join(allowed_roles)}")

    # Add optional arguments for database connection details, falling back to DB_SETTINGS
    parser.add_argument("--db-user", type=str, help="Database user.")
    parser.add_argument("--db-password", type=str, help="Database password.")
    parser.add_argument("--db-database", type=str, help="Database name.")
    parser.add_argument("--db-host", type=str, help="Database host.")
    parser.add_argument("--db-port", type=int, help="Database port.")

    args = parser.parse_args()

    # Override DB_SETTINGS if command-line arguments are provided
    # This is a simple override; a more robust solution might use a config object.
    # For now, we'll directly modify a dictionary derived from DB_SETTINGS if args are present.

    effective_db_settings = {}
    if DB_SETTINGS:
        if hasattr(DB_SETTINGS, 'model_dump'):
            effective_db_settings = DB_SETTINGS.model_dump()
        elif hasattr(DB_SETTINGS, 'dict'):
            effective_db_settings = DB_SETTINGS.dict()
        elif isinstance(DB_SETTINGS, dict):
            effective_db_settings = DB_SETTINGS.copy() # Use a copy

    if args.db_user: effective_db_settings['user'] = args.db_user
    if args.db_password: effective_db_settings['password'] = args.db_password
    if args.db_database: effective_db_settings['database'] = args.db_database
    if args.db_host: effective_db_settings['host'] = args.db_host
    if args.db_port: effective_db_settings['port'] = args.db_port

    # Re-assign DB_SETTINGS to the potentially overridden version for this script run
    # This is a bit of a hack; ideally, set_user_role_in_db would take db_params.
    # For now, this keeps set_user_role_in_db simpler.
    # A better way would be to pass a dictionary of connection parameters to set_user_role_in_db.
    # For this specific subtask, I will modify set_user_role_in_db to accept connection_params.

    # Let's redefine set_user_role_in_db slightly to accept db_params
    # To avoid redefining the whole function in this thought block, I'll assume the original
    # definition of set_user_role_in_db will be modified to accept `db_params`
    # and use that instead of global DB_SETTINGS directly.
    # The following call will reflect that:

    # Original DB_SETTINGS will be used if no CLI args for DB are passed.
    # If CLI args are passed, they update effective_db_settings which is then used.
    # This means the global DB_SETTINGS is not modified, which is cleaner.

    # Quick patch for the script to use effective_db_settings
    # This avoids complex redefinition of set_user_role_in_db in this thought block
    original_db_settings_obj = DB_SETTINGS

    class TempDBSettings:
        def __init__(self, settings_dict):
            self.__dict__.update(settings_dict)

        def model_dump(self): # Mock Pydantic v2
            return self.__dict__

        def dict(self): # Mock Pydantic v1
            return self.__dict__

    # If any CLI DB args were given, effective_db_settings will differ from original DB_SETTINGS.
    # In that case, we use a temporary object that mimics DB_SETTINGS.
    if args.db_user or args.db_password or args.db_database or args.db_host or args.db_port:
        DB_SETTINGS_OVERRIDE = TempDBSettings(effective_db_settings)
        # Temporarily replace global DB_SETTINGS for the call
        # This is a workaround for the script's current structure.
        # A cleaner way would be to pass db_params directly to set_user_role_in_db.
        # Given the tool limitations, this direct modification within the script's main block is simpler.
        async def run_with_override():
            global DB_SETTINGS
            original_global_db_settings = DB_SETTINGS
            DB_SETTINGS = DB_SETTINGS_OVERRIDE
            try:
                await set_user_role_in_db(args.email, args.role)
            finally:
                DB_SETTINGS = original_global_db_settings # Restore
        asyncio.run(run_with_override())
    else:
        # No DB overrides from CLI, use DB_SETTINGS as imported
        asyncio.run(set_user_role_in_db(args.email, args.role))
