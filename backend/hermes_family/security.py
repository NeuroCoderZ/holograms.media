"""
Security Module for Hermes Family
PromptSanitizer — CVE-2026-2275/2286/2287/2285 mitigation
Docker sandbox enforcement — allow_code_execution=False

B5 Phase
"""

import re
import logging
from typing import Tuple

logger = logging.getLogger(__name__)


class PromptSanitizer:
    """
    Input sanitization for CrewAI agent prompts.
    Prevents prompt injection attacks (CVE-2026-2275/2286).

    Usage:
        sanitized, is_safe = PromptSanitizer.sanitize(user_input)
        if not is_safe:
            logger.warning(f"Flagged input: {sanitized}")
    """

    INJECTION_PATTERNS = [
        r"ignore\s+(all\s+)?previous\s+instructions",
        r"forget\s+(everything|all|your\s+instructions)",
        r"you\s+are\s+now\s+",
        r"system\s*:",
        r"assistant\s*:",
        r"```python",
        r"os\.system\(",
        r"subprocess\.",
        r"__import__\(",
        r"eval\(",
        r"exec\(",
        r"import\s+os\b",
        r"import\s+subprocess\b",
        r"from\s+os\s+import",
        r"from\s+subprocess\s+import",
        r"\.environ",
        r"shutil\.rmtree",
        r"pathlib.*unlink",
    ]

    MAX_INPUT_LENGTH = 10000

    @classmethod
    def sanitize(cls, user_input: str) -> Tuple[str, bool]:
        """
        Sanitize user input for CrewAI agents.
        Returns (sanitized_text, is_safe).
        is_safe=False means content was flagged/modified.
        """
        flagged = False
        sanitized = user_input

        # Check and filter injection patterns
        for pattern in cls.INJECTION_PATTERNS:
            if re.search(pattern, user_input, re.IGNORECASE):
                flagged = True
                sanitized = re.sub(
                    pattern, "[FILTERED]", sanitized, flags=re.IGNORECASE
                )
                logger.warning(f"PromptSanitizer: filtered pattern: {pattern}")

        # Length limit
        if len(sanitized) > cls.MAX_INPUT_LENGTH:
            sanitized = sanitized[:cls.MAX_INPUT_LENGTH]
            flagged = True
            logger.warning(f"PromptSanitizer: truncated input to {cls.MAX_INPUT_LENGTH}")

        return sanitized, not flagged


class SecurityConfig:
    """
    Security configuration for CrewAI agents.
    CRITICAL: allow_code_execution must be False in production.
    """

    # NEVER allow code execution in production (CVE-2026-2275)
    ALLOW_CODE_EXECUTION = False

    # If code execution is absolutely needed, use Docker sandbox only
    CODE_EXECUTION_MODE = "docker"  # Only applies if ALLOW_CODE_EXECUTION=True

    # Data isolation: separate AstraDB namespaces
    NAMESPACES = {
        "crewai": "crewai_*",
        "neuroescrow": "neuroescrow_*",
        "tria": "tria_*",
    }

    # Agent restrictions
    AGENT_RESTRICTIONS = {
        "max_input_length": 10000,
        "max_output_length": 50000,
        "forbidden_imports": ["os.system", "subprocess", "eval", "exec"],
        "forbidden_file_paths": ["/etc", "/proc", "/sys", "~/.ssh"],
    }

    @classmethod
    def validate_agent_config(cls, agent_config: dict) -> Tuple[bool, str]:
        """Validate agent configuration for security compliance"""
        if agent_config.get("allow_code_execution", False):
            return False, "SECURITY: allow_code_execution must be False (CVE-2026-2275)"

        if agent_config.get("code_execution_mode") == "local":
            return False, "SECURITY: code_execution_mode must be 'docker' or disabled"

        return True, "Configuration is security-compliant"


# Security check at module load
_config_valid, _config_msg = SecurityConfig.validate_agent_config({
    "allow_code_execution": SecurityConfig.ALLOW_CODE_EXECUTION,
    "code_execution_mode": SecurityConfig.CODE_EXECUTION_MODE,
})

if not _config_valid:
    logger.critical(f"SECURITY VIOLATION: {_config_msg}")
else:
    logger.info("SecurityConfig: validated — allow_code_execution=False")
