import os
import importlib
import sys
import logging

# Configure basic logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')

# Directories to scan for Python modules, relative to the 'backend' directory
# We assume this script is run from the root of the repository or that PYTHONPATH is set up accordingly.
# For import purposes, Python needs to understand 'backend' as a package.
# We will be constructing module paths like 'backend.api.v1.endpoints.chunks'
BACKEND_ROOT_DIR = "backend"
DIRECTORIES_TO_SCAN = [
    "api",
    "auth",
    "core",
    "llm",
    "routers",
    "services",
    "tria_bots",
    "utils"
    # Add other relevant directories if needed, e.g., "cloud_functions" if they are also importable modules
]

# Files to explicitly exclude from import attempts (e.g., __init__.py that are empty or only do relative imports)
# Or files that are not meant to be directly imported.
# For now, we will try to import all .py files and see.
EXCLUDE_FILES = ["__init__.py"] # Often __init__.py are fine, but sometimes they cause issues if not structured for direct import.
                               # Let's try importing them first. If issues, we can add specific ones.
EXCLUDE_FILES = [] # Reconsidering: let's try to import __init__.py as well, they are part of the package structure.

def verify_imports():
    logging.info("Starting import verification process...")
    failed_imports = []
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)  # Assumes script is in 'scripts/'

    # Add project root to Python path to allow imports like 'backend.api...'
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
        logging.info(f"Added '{project_root}' to sys.path")

    # Check if BACKEND_ROOT_DIR exists
    backend_full_path = os.path.join(project_root, BACKEND_ROOT_DIR)
    if not os.path.isdir(backend_full_path):
        logging.error(f"Backend root directory '{backend_full_path}' not found. Make sure the script is in a 'scripts' subdirectory of the project root.")
        sys.exit(1)

    logging.info(f"Scanning for Python files in '{BACKEND_ROOT_DIR}' subdirectories: {DIRECTORIES_TO_SCAN}")

    for target_dir_name in DIRECTORIES_TO_SCAN:
        scan_path = os.path.join(backend_full_path, target_dir_name)
        if not os.path.isdir(scan_path):
            logging.warning(f"Directory '{scan_path}' not found. Skipping.")
            continue

        for root, _, files in os.walk(scan_path):
            for file in files:
                if file.endswith(".py") and file not in EXCLUDE_FILES:
                    file_path = os.path.join(root, file)

                    # Construct the module path
                    # Example: /project_root/backend/api/v1/some.py -> backend.api.v1.some
                    relative_path_to_backend_root = os.path.relpath(file_path, backend_full_path)
                    module_name_parts = relative_path_to_backend_root.replace(os.sep, ".").split('.')

                    # Remove .py extension
                    if module_name_parts[-1] == "py":
                         module_name_parts.pop() # remove .py part

                    module_path_from_backend_dir = ".".join(module_name_parts)
                    full_module_path = f"{BACKEND_ROOT_DIR}.{module_path_from_backend_dir}"

                    # Handle __init__.py files correctly: they represent the package itself
                    if file == "__init__.py":
                        full_module_path = f"{BACKEND_ROOT_DIR}.{os.path.dirname(relative_path_to_backend_root).replace(os.sep, '.')}"
                        if full_module_path.endswith('.'): # In case of top-level __init__.py in a scanned dir
                            full_module_path = full_module_path[:-1]


                    logging.info(f"Attempting to import: {full_module_path} (from {file_path})")
                    try:
                        importlib.import_module(full_module_path)
                        logging.info(f"Successfully imported {full_module_path}")
                    except ModuleNotFoundError as e:
                        # Check if the error is about the module itself or a dependency
                        # str(e) is typically "No module named 'module.name'"
                        if full_module_path in str(e) or module_path_from_backend_dir in str(e):
                            logging.error(f"Failed to import module {full_module_path}: {e}")
                            failed_imports.append((full_module_path, file_path, str(e)))
                        else:
                            # This is an import error within the module (dependency missing)
                            logging.error(f"Failed to import {full_module_path} due to a missing dependency within it: {e}")
                            failed_imports.append((full_module_path, file_path, str(e)))
                    except Exception as e:
                        logging.error(f"An unexpected error occurred while importing {full_module_path}: {e}")
                        failed_imports.append((full_module_path, file_path, str(e)))

    if failed_imports:
        logging.error("\n--- Import Verification Failed ---")
        logging.error("The following modules could not be imported:")
        for module, path, error in failed_imports:
            logging.error(f"  - Module: {module} (File: {path})\n    Error: {error}")
        sys.exit(1)
    else:
        logging.info("\n--- Import Verification Successful ---")
        logging.info("All discovered Python modules were imported successfully.")
        sys.exit(0)

if __name__ == "__main__":
    verify_imports()
