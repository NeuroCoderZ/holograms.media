"""
MCP (Model Context Protocol) Integration for Hermes Family
SSE + Stdio server adapters with tool_filter for token optimization.

B4 Phase
"""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# MCP is available in crewai >= 0.114.0
# Import conditionally to avoid hard failures on older versions
try:
    from crewai.mcp import MCPServerSSE, MCPServerStdio
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    logger.warning("CrewAI MCP not available — install crewai>=0.114.0")


def get_holograms_mcp():
    """
    MCP SSE server for holograms.media FastAPI backend.
    Tool filter: only expose needed endpoints (-25% tokens).
    """
    if not MCP_AVAILABLE:
        logger.warning("MCP SSE not available, skipping")
        return None

    base_url = os.getenv(
        "MCP_BASE_URL",
        "https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app/api/v1/mcp"
    )
    mcp_token = os.getenv("MCP_AUTH_TOKEN", "")

    headers = {}
    if mcp_token:
        headers["Authorization"] = f"Bearer {mcp_token}"

    try:
        return MCPServerSSE(
            url=f"{base_url}/sse",
            headers=headers,
            tool_filter=[
                "search_codebase",
                "get_version",
                "deploy",
                "get_hologram_status",
            ],
        )
    except Exception as e:
        logger.error(f"Failed to create MCP SSE server: {e}")
        return None


def get_astra_mcp():
    """
    MCP Stdio server for local AstraDB operations.
    Tool filter: only knowledge retrieval and memory storage.
    """
    if not MCP_AVAILABLE:
        logger.warning("MCP Stdio not available, skipping")
        return None

    try:
        return MCPServerStdio(
            command="python",
            args=["-m", "backend.hermes_family.mcp_astra_server"],
            tool_filter=[
                "query_knowledge",
                "store_memory",
                "recall_context",
            ],
        )
    except Exception as e:
        logger.error(f"Failed to create MCP Stdio server: {e}")
        return None


def get_all_mcps() -> list:
    """Get all configured MCP servers for Hermes agents"""
    mcps = []

    holograms_mcp = get_holograms_mcp()
    if holograms_mcp:
        mcps.append(holograms_mcp)

    astra_mcp = get_astra_mcp()
    if astra_mcp:
        mcps.append(astra_mcp)

    logger.info(f"Configured {len(mcps)} MCP servers for Hermes Family")
    return mcps
