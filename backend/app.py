from fastapi import FastAPI

# Routers from backend/routers
from backend.routers.auth import router as auth_router
from backend.routers.chat import router as chat_router
from backend.routers.chat_sessions import router as chat_sessions_router
from backend.routers.gestures import router as gestures_router
from backend.routers.holograms import router as user_holograms_router # For /users/me/holograms
from backend.routers.interaction_chunks import router as interaction_chunks_router
from backend.routers.prompts import router as prompts_router
from backend.routers.public_holograms import router as public_holograms_router # For /users/{user_id}/holograms
from backend.routers.tria import router as tria_router

# Routers from backend/api/v1/endpoints (discovered)
# Assuming the router instance is named 'router' in these files
from backend.api.v1.endpoints.tria_commands import router as tria_commands_router
# Note: backend/api/v1/endpoints/interaction_chunks.py might exist,
# but backend/routers/interaction_chunks.py is already being imported.
# If they serve different base paths or purposes, both could be included,
# but this requires more clarity on their distinct roles. For now, only one is included.

app = FastAPI(
    title="Holograms Media Backend",
    version="0.1.0",
    description="API for managing and interacting with holographic media and AI assistants.",
    # Further OpenAPI metadata can be added here
    # docs_url="/api/docs", # Custom docs URL
    # redoc_url="/api/redoc", # Custom ReDoc URL
)

# Register routers from backend/routers
app.include_router(auth_router, prefix="/api/v1", tags=["Authentication"]) # Added prefix for consistency
app.include_router(chat_router, prefix="/api/v1", tags=["Chat"])
app.include_router(chat_sessions_router, prefix="/api/v1", tags=["Chat Sessions"])
app.include_router(gestures_router, prefix="/api/v1", tags=["Gestures"])
app.include_router(user_holograms_router, prefix="/api/v1", tags=["User Holograms (Personal)"]) # Clarified tag
app.include_router(interaction_chunks_router, prefix="/api/v1", tags=["Interaction Chunks"])
app.include_router(prompts_router, prefix="/api/v1", tags=["Prompts"])
app.include_router(public_holograms_router, prefix="/api/v1", tags=["Public Holograms"]) # Clarified tag
app.include_router(tria_router, prefix="/api/v1", tags=["Tria System"])

# Register routers from backend/api/v1/endpoints
app.include_router(tria_commands_router, prefix="/api/v1/tria_commands", tags=["Tria Commands"]) # Specific prefix and tag

@app.get("/")
async def read_root():
    """
    Root endpoint for the Holograms Media API.
    Provides a welcome message and confirms the API is running.
    """
    return {"message": "Welcome to the Holograms Media API"}

# Placeholder for startup/shutdown events if needed in the future
# @app.on_event("startup")
# async def startup_event():
#     # Initialize database connections, etc.
#     pass

# @app.on_event("shutdown")
# async def shutdown_event():
#     # Clean up resources
#     pass
