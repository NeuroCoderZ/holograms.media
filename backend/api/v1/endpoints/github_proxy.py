import os
import httpx
from fastapi import APIRouter, HTTPException, Query
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/github/commits")
async def get_github_commits(sha: str = Query("dev"), per_page: int = Query(20)):
    """
    Proxy endpoint to fetch GitHub commits using a Personal Access Token 
    to avoid the strict 60 req/hr rate limit.
    """
    github_token = os.environ.get("GITHUB_TOKEN")
    repo_owner = "NeuroCoderZ"
    repo_name = "holograms.media"
    
    url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/commits"
    
    headers = {
        "Accept": "application/vnd.github.v3+json",
        "User-Agent": "Holograms-Media-Backend"
    }
    
    if github_token:
        headers["Authorization"] = f"Bearer {github_token}"
    else:
        logger.warning("GITHUB_TOKEN is not set. API requests will be severely rate-limited.")
        
    params = {
        "sha": sha,
        "per_page": per_page
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers, params=params)
            response.raise_for_status()
            return response.json()
        except httpx.HTTPStatusError as e:
            logger.error(f"GitHub API Error: {e.response.status_code} - {e.response.text}")
            raise HTTPException(status_code=e.response.status_code, detail=f"GitHub API Error: {e.response.text}")
        except Exception as e:
            logger.error(f"Error fetching from GitHub: {e}")
            raise HTTPException(status_code=500, detail="Internal Server Error while fetching GitHub commits")
