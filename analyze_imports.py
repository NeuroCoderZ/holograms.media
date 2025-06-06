import ast
import json

def analyze_imports(manifesto_content: str, consumer_files_data: dict) -> list:
    """
    Analyzes Python consumer files for imports from backend.core.models
    and checks them against a model manifesto.

    Args:
        manifesto_content: JSON string content of the model manifesto.
        consumer_files_data: A dictionary where keys are filepaths and
                             values are the string content of those files.

    Returns:
        A list of discrepancy dictionaries.
    """
    manifesto = json.loads(manifesto_content)
    discrepancies = []

    # Models available in __init__.py are directly importable from backend.core.models
    init_models = set(manifesto.get("__init__.py", []))

    for filepath, content in consumer_files_data.items():
        try:
            tree = ast.parse(content, filename=filepath)
        except SyntaxError as e:
            discrepancies.append({
                "file_path": filepath,
                "line_number": e.lineno,
                "imported_name": "",
                "imported_from_module": "",
                "error_type": f"SyntaxError: {e.msg}"
            })
            continue

        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom):
                if node.module and node.module.startswith("backend.core.models"):
                    # Example: from backend.core.models import ModelA, ModelB
                    # Example: from backend.core.models.some_module import ModelC
                    relative_module_path = node.module.split("backend.core.models", 1)[1].strip(".")

                    # Determine the source module in the manifesto
                    if not relative_module_path: # Direct import from package
                        source_manifesto_module = "__init__.py"
                        available_models_in_source = init_models
                    else:
                        source_manifesto_module = relative_module_path.replace(".", "/") + ".py"
                        # If importing from a submodule like models.sub.file, manifest key is "sub/file.py"
                        # Or, if it's just models.file, manifest key is "file.py"
                        if not source_manifesto_module.endswith(".py"): # case like from backend.core.models.module import X
                             source_manifesto_module += ".py"

                        available_models_in_source = set(manifesto.get(source_manifesto_module, []))
                        # Also consider models re-exported by __init__.py if importing from a non-existent module
                        # This scenario is tricky: `from backend.core.models.non_existent import ModelA`
                        # ModelA would only be valid if exposed via __init__.py
                        if not manifesto.get(source_manifesto_module):
                             # If the source_manifesto_module itself is not a file in the manifesto,
                             # then the import is only valid if the items are in __init__.py
                             # and the path component refers to something in __init__.py.
                             # This case is complex, for now, we assume direct imports from existing modules
                             # or from the top-level __init__.py
                             pass


                    for alias in node.names:
                        imported_name = alias.name
                        original_name = alias.name # asname is alias.asname

                        if source_manifesto_module == "__init__.py":
                            if imported_name not in available_models_in_source:
                                discrepancies.append({
                                    "file_path": filepath,
                                    "line_number": node.lineno,
                                    "imported_name": imported_name,
                                    "imported_from_module": "backend.core.models",
                                    "error_type": f"Model '{imported_name}' not found in backend.core.models.__init__.py"
                                })
                        elif source_manifesto_module not in manifesto:
                             # Check if it's a model available directly from __init__.py but imported via a path that looks like a module
                             # e.g. `from backend.core.models.UserPublic import UserPublic` where UserPublic is in __init__.py
                             # This is a bit of an edge case. The current logic might misflag this if UserPublic.py doesn't exist.
                             # For now, if the module itself isn't in the manifesto, we flag it.
                             if imported_name not in init_models: # Fallback check against __init__
                                discrepancies.append({
                                    "file_path": filepath,
                                    "line_number": node.lineno,
                                    "imported_name": imported_name,
                                    "imported_from_module": f"backend.core.models.{relative_module_path}",
                                    "error_type": f"Module '{source_manifesto_module}' not found in manifesto, and '{imported_name}' not in __init__.py"
                                })
                             # If it IS in init_models, it means it's like `from backend.core.models.ModelInInit import ModelInInit`
                             # which is unconventional but might be permissible by Python if ModelInInit is also a module.
                             # This script focuses on models defined in files.

                        elif imported_name not in available_models_in_source:
                            discrepancies.append({
                                "file_path": filepath,
                                "line_number": node.lineno,
                                "imported_name": imported_name,
                                "imported_from_module": f"backend.core.models.{relative_module_path}",
                                "error_type": f"Model '{imported_name}' not found in '{source_manifesto_module}'"
                            })
            elif isinstance(node, ast.Import):
                # Example: import backend.core.models
                # Example: import backend.core.models.some_module as models_alias
                for alias in node.names:
                    if alias.name == "backend.core.models" or alias.name.startswith("backend.core.models."):
                        # This imports the module itself. Access to models would be via attribute access.
                        # e.g., models.ModelA or models_alias.ModelA
                        # Checking specific model access is beyond static import analysis here.
                        # We can only validate if the imported module path itself is valid.
                        imported_module_path = alias.name
                        relative_module_path = imported_module_path.split("backend.core.models", 1)[1].strip(".")

                        if not relative_module_path: # import backend.core.models
                            # This is fine, imports the package.
                            pass
                        else:
                            source_manifesto_module = relative_module_path.replace(".", "/") + ".py"
                            if not source_manifesto_module.endswith(".py"):
                                source_manifesto_module += ".py"

                            if source_manifesto_module not in manifesto and (relative_module_path + ".py") not in manifesto:
                                # Also check if it's importing a directory (which should have an __init__.py)
                                # e.g. import backend.core.models.sub_pkg -> check for sub_pkg/__init__.py
                                dir_init_module = relative_module_path.replace(".", "/") + "/__init__.py"
                                if dir_init_module not in manifesto:
                                    discrepancies.append({
                                        "file_path": filepath,
                                        "line_number": node.lineno,
                                        "imported_name": alias.name, # The full import path
                                        "imported_from_module": "backend.core.models",
                                        "error_type": f"Imported module '{relative_module_path}' (file: '{source_manifesto_module}' or dir_init: '{dir_init_module}') not found in manifesto."
                                    })
    return discrepancies

if __name__ == "__main__":
    # This part is for local testing of the script and will not be run by the agent.
    # To test locally:
    # 1. Create a model_manifesto.json file with the structure.
    # 2. Create dummy consumer files with some imports.
    # 3. Run `python analyze_imports.py > import_discrepancies.json`

    # Dummy manifesto for testing
    dummy_manifesto_content = """
    {
      "__init__.py": ["ModelA", "ModelB"],
      "user_models.py": ["User", "UserProfile"],
      "product_models.py": ["Product"]
    }
    """
    # Dummy consumer files data for testing
    dummy_consumer_files = {
        "consumer1.py": "from backend.core.models import ModelA\nfrom backend.core.models.user_models import User\nfrom backend.core.models.product_models import NonExistentModel",
        "consumer2.py": "from backend.core.models import ModelC\nimport backend.core.models.order_models",
        "consumer3.py": "from backend.core.models.user_models import ModelA # Wrong module"
    }

    results = analyze_imports(dummy_manifesto_content, dummy_consumer_files)
    print(json.dumps(results, indent=2))
