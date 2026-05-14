"""
CrewAI Guardrails for Hermes Family
Pydantic + regex validation, auto-retry on failure.
AST patch validation before apply.

B5 Phase
"""

import ast
import logging
import re
from typing import Tuple

from backend.hermes_family.models import DiffPatchSet, ReviewResult

logger = logging.getLogger(__name__)


def validate_diff_patches(output: str) -> Tuple[bool, str]:
    """
    Functional guardrail: validate DiffPatchSet structure.
    Returns (is_valid, output_or_error_message).
    """
    import json

    try:
        data = json.loads(output)
        patches = DiffPatchSet.model_validate(data)

        # Check EMBED_DIM compliance in all patches
        for patch in patches.patches:
            if not patch.embed_dim_check:
                return False, f"EMBED_DIM=3072 violation in patch: {patch.file_path}"

        # Validate file paths are within project
        for patch in patches.patches:
            if ".." in patch.file_path or patch.file_path.startswith("/etc"):
                return False, f"Suspicious file path: {patch.file_path}"

        return True, output

    except json.JSONDecodeError as e:
        return False, f"Invalid JSON output: {e}"
    except Exception as e:
        return False, f"DiffPatchSet validation failed: {e}"


def validate_review_result(output: str) -> Tuple[bool, str]:
    """Functional guardrail: validate ReviewResult structure"""
    import json

    try:
        data = json.loads(output)
        result = ReviewResult.model_validate(data)
        return True, output
    except Exception as e:
        return False, f"ReviewResult validation failed: {e}"


def no_injection(output: str) -> Tuple[bool, str]:
    """
    String guardrail: check for prompt injection patterns in agent output.
    CVE-2026-2275/2286 mitigation.
    """
    injection_patterns = [
        r"ignore\s+(all\s+)?previous\s+instructions",
        r"forget\s+(everything|all|your\s+instructions)",
        r"you\s+are\s+now\s+",
        r"system\s*:",
        r"assistant\s*:",
        r"os\.system\(",
        r"subprocess\.",
        r"__import__\(",
        r"eval\(",
        r"exec\(",
    ]

    for pattern in injection_patterns:
        if re.search(pattern, output, re.IGNORECASE):
            return False, f"Security violation: injection pattern detected"

    return True, output


def validate_ast_python(output: str) -> Tuple[bool, str]:
    """
    AST validation: verify that Python code in patches is syntactically valid.
    Only checks Python files — non-Python patches pass through.
    """
    import json

    try:
        data = json.loads(output)
        patches_data = data.get("patches", data) if isinstance(data, dict) else data

        if isinstance(patches_data, list):
            for patch in patches_data:
                if isinstance(patch, dict):
                    file_path = patch.get("file_path", "")
                    new_string = patch.get("new_string", "")

                    # Only validate Python files
                    if file_path.endswith(".py") and new_string.strip():
                        try:
                            ast.parse(new_string)
                        except SyntaxError as e:
                            return False, f"AST validation failed for {file_path}: {e}"

        return True, output

    except (json.JSONDecodeError, TypeError):
        # Non-JSON output — skip AST check
        return True, output


# Guardrail registry for task assignment
GUARDRAILS = {
    "codegen": [validate_diff_patches, no_injection, validate_ast_python],
    "review": [validate_review_result, no_injection],
    "general": [no_injection],
}
