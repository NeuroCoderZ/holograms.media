#!/usr/bin/env python3

import argparse
import asyncio
import os
import logging
import sys
from datetime import datetime # For updated_at

# Add the backend directory to sys.path
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.dirname(SCRIPT_DIR) # Assuming scripts/ is under project root
BACKEND_DIR = os.path.join(BASE_DIR, 'backend')
sys.path.insert(0, BACKEND_DIR)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from core.db.pg_connector import get_db_connection
    # load_dotenv will be called by pg_connector or by this script if needed
    from dotenv import load_dotenv
except ImportError as e:
    logger.error(f"Error importing backend modules: {e}")
    logger.error(f"Current sys.path: {sys.path}")
    logger.error(f"Attempted to add BACKEND_DIR: {BACKEND_DIR}")
    logger.error("Please ensure the script is run from the project's root directory or that PYTHONPATH is set correctly.")
    sys.exit(1)

# --- IMPORTANT DATABASE SCHEMA PREREQUISITE ---
# This script assumes that the 'users' table in your database has a column named 'role' (e.g., type TEXT).
# If this column does not exist, you MUST add it to the schema before running this script.
# Example SQL to add the column (adjust type/constraints as needed):
# ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';
#
# Also, ensure the UserInDB Pydantic model in `backend/core/models/user_models.py`
# reflects this 'role' field if you intend to use it consistently across the backend.
# The `user_models.py` already defines `role` in `UserBase`, so ensure `UserInDBBase`
# (or a new model for DB representation if `UserBase` is only for creation/public view) includes it.
# ---------------------------------------------

USERS_TABLE_NAME = 'users' # Default and correct table name

async def set_user_role_in_db(email: str, new_role: str):
    """
    Sets the role for a user identified by their email.
    Also updates the 'updated_at' timestamp.
    """
    # Ensure .env is loaded for NEON_DATABASE_URL if not already by pg_connector
    load_dotenv(os.path.join(BASE_DIR, '.env'))

    conn = None
    try:
        conn = await get_db_connection()
        if conn is None:
            logger.error("Failed to establish database connection. NEON_DATABASE_URL might be missing or invalid in your .env file or environment.")
            return

        allowed_roles = ["user", "admin", "core_developer", "beta_tester"]
        if new_role not in allowed_roles:
            logger.warning(f"Warning: Role '{new_role}' is not in the predefined list: {allowed_roles}. Proceeding, but ensure this role is handled by your application logic (e.g., Pydantic models).")

        # Check if user exists first
        user_exists_check = await conn.fetchrow(
            f"SELECT user_id FROM {USERS_TABLE_NAME} WHERE email = $1", email
        )

        if not user_exists_check:
            logger.error(f"User with email '{email}' not found in table '{USERS_TABLE_NAME}'. No update performed.")
            return

        logger.info(f"User '{email}' found (User ID: {user_exists_check['user_id']}). Attempting to set role to '{new_role}'...")

        # Update role and updated_at timestamp
        # IMPORTANT: Assumes 'role' and 'updated_at' columns exist.
        # The schema has an automatic trigger for updated_at, but setting it explicitly is also fine.
        update_query = f"UPDATE {USERS_TABLE_NAME} SET role = $1, updated_at = $2 WHERE email = $3"

        result = await conn.execute(update_query, new_role, datetime.utcnow(), email)

        if result and result.startswith("UPDATE"):
            rows_affected_str = result.split(" ")[1]
            if rows_affected_str.isdigit():
                rows_affected = int(rows_affected_str)
                if rows_affected > 0:
                    logger.info(f"Successfully updated role for user '{email}' to '{new_role}'.")
                else:
                    # This could happen if the user was deleted between the check and update,
                    # or if the role was already the new_role and updated_at trigger didn't count as an update
                    # for the row count in some DB configurations (though with explicit set it should).
                    logger.warning(f"User '{email}' found, but role was not updated. The role might already be '{new_role}', or an issue occurred.")
            else:
                logger.error(f"Unexpected result from database update: {result}. Could not determine rows affected.")
        else:
            logger.error(f"Failed to execute update or unexpected result: {result}")

    except ValueError as ve:
        logger.error(f"Configuration error: {ve}")
    except asyncpg.PostgresError as pg_err:
        logger.error(f"Database error: {pg_err}", exc_info=True)
    except Exception as e:
        logger.error(f"An unexpected error occurred: {e}", exc_info=True)
    finally:
        if conn:
            await conn.close()
            logger.info("Database connection closed.")

async def main():
    parser = argparse.ArgumentParser(
        description="Set the role for a user in the database. Requires NEON_DATABASE_URL to be set in .env or environment.",
        epilog="Example: python scripts/set_user_role.py user@example.com admin"
    )
    parser.add_argument("email", type=str, help="The email address of the user.")

    # Role choices should align with Pydantic model if possible
    # from backend.core.models.user_models import UserBase (cannot do top-level due to async context)
    # For now, hardcode them, but ideally, they'd be dynamically sourced or from a shared config.
    allowed_roles = ['user', 'admin', 'core_developer', 'beta_tester']
    parser.add_argument(
        "role",
        type=str,
        choices=allowed_roles,
        help=f"The new role to assign. Must be one of: {', '.join(allowed_roles)}"
    )

    args = parser.parse_args()

    await set_user_role_in_db(args.email, args.role)

if __name__ == "__main__":
    # Ensure .env is loaded from the project root if it exists
    dotenv_path = os.path.join(BASE_DIR, '.env')
    if os.path.exists(dotenv_path):
        load_dotenv(dotenv_path)
        logger.info(f".env file loaded from {dotenv_path}")
    else:
        logger.info(".env file not found at project root, relying on environment variables.")

    asyncio.run(main())
