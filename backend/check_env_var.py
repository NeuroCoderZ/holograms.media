import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

logger.info("Python script 'check_env_var.py' starting.")
print("Python: Script check_env_var.py starting.")

db_url = os.environ.get('NEON_DATABASE_URL')

if db_url:
    logger.info(f"NEON_DATABASE_URL is set. Length: {len(db_url)}")
    # Avoid printing the full URL if it contains sensitive info, just print part of it for confirmation
    at_symbol_index = db_url.find('@')
    if at_symbol_index > 0:
        # Find the start of credentials (after "://")
        protocol_end_index = db_url.find('://')
        if protocol_end_index != -1:
             masked_db_url = db_url[:protocol_end_index+3] + "********" + db_url[at_symbol_index:]
        else:
            masked_db_url = "********" + db_url[at_symbol_index:] # if :// not found but @ is
    else:
        masked_db_url = db_url[:10] + "..." # if no @, just show beginning

    print(f"Python: NEON_DATABASE_URL starts with: {masked_db_url}")

    if "YOUR_NEON_USER" in db_url or "YOUR_NEON_HOST" in db_url:
        logger.warning("NEON_DATABASE_URL seems to contain placeholder values.")
        print("Python: Warning! NEON_DATABASE_URL seems to have placeholder values.")
else:
    logger.warning("NEON_DATABASE_URL is NOT SET in the environment.")
    print("Python: Error! NEON_DATABASE_URL is NOT SET.")

logger.info("Python script 'check_env_var.py' finished.")
print("Python: Script check_env_var.py finished.")
