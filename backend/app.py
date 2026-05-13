# backend/app.py
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Request
from typing import List
import asyncio
import time

# Load environment variables from .env file before other imports
load_dotenv()

import os
import logging

# Astra-related imports
from backend.core.db.astra_connector import get_astra_db, get_astra_client

from backend.tria_agents.tria_orchestrator import TriaOrchestrator

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

from contextlib import asynccontextmanager


@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- Startup Logic ---
    logger.info("--- Application Startup (Lifespan) ---")

    # Storage: AstraDB only (B2 removed, R2 planned)
    app.state.s3_client = None

    # --- Initialize Astra DB ---
    try:
        logger.info("Initializing Astra DB...")
        # Use a timeout for the initial connection attempt if possible,
        # but astrapy's get_async_database is usually lazy.
        astra_client = get_astra_client()
        if astra_client:
            app.state.astra_db = get_astra_db(astra_client)
            if app.state.astra_db:
                logger.info("✅ Astra DB initialized successfully in app.state.")
            else:
                logger.warning("⚠️ Astra DB initialization FAILED.")
        else:
            logger.warning("⚠️ Astra DataAPIClient FAILED to initialize.")
    except Exception as e:
        logger.error(f"❌ Critical error during Astra DB initialization: {e}")
        app.state.astra_db = None

    # --- Initialize Tria Orchestrator ---
    try:
        logger.info("Initializing Tria Orchestrator...")
        # If orchestrator init takes too long, we wrap it
        orchestrator = TriaOrchestrator()
        app.state.tria_orchestrator = orchestrator
        logger.info("✅ [App] TriaOrchestrator initialized successfully.")
    except Exception as e:
        logger.error(f"❌ [App] TriaOrchestrator init FAILED: {e}", exc_info=True)
        app.state.tria_orchestrator = None

    logger.info("Initialization Phase Complete.")
    logger.info("FastAPI application startup completed successfully.")

    # --- Auto-create AstraDB collections ---
    try:
        db = get_astra_db()
        if db:
            try:
                await db.create_collection("user_chat_sessions")
                logger.info("[Startup] Created collection: user_chat_sessions")
            except Exception:
                pass  # уже существует — OK
            try:
                await db.create_collection("tria_meta_instructions")
                logger.info("[Startup] Created collection: tria_meta_instructions")
            except Exception:
                pass
            try:
                await db.create_collection("tria_gestures")
                logger.info("[Startup] Created collection: tria_gestures")
            except Exception:
                pass
            try:
                await db.create_collection("chat_history")
                logger.info("[Startup] Created collection: chat_history")
            except Exception:
                pass
            try:
                await db.create_collection(
                    "tria_episodic_memory",
                    definition={"vector": {"dimension": 3072, "metric": "cosine"}},
                )
                logger.info("[Startup] Created collection: tria_episodic_memory")
            except Exception:
                pass
    except Exception as e:
        logger.warning(f"[Startup] Collection init failed: {e}")

    yield

    # --- Shutdown Logic ---
    logger.info("--- Application Shutdown (Lifespan) ---")
    if hasattr(app.state, "astra_db"):
        del app.state.astra_db
        logger.info("Astra DB connection state cleared.")

    if hasattr(app.state, "tria_orchestrator"):
        del app.state.tria_orchestrator
        logger.info("TriaOrchestrator state cleared.")


app = FastAPI(
    title="Holograms Media Backend API",
    description="Backend services for the Holograms Media Project, providing API endpoints for user interactions, media processing, and AI assistant Tria.",
    version="1.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# --- CORS Middleware ---
from fastapi.middleware.cors import CORSMiddleware
from backend.core.config import settings

# Explicitly defining origins for robust CORS handling
origins = [
    "https://holograms.media",
    "https://www.holograms.media",
    "https://dev.holograms.media",
    "https://holograms-media-dev-holograms-media-cb8383e3.koyeb.app",
    "https://holograms-media-dev.pages.dev",
    "http://localhost:5173",
    "http://localhost:3000",
]

# Merge with settings if needed, but ensure dev.holograms.media is there
if settings.CORS_ORIGINS:
    for o in settings.CORS_ORIGINS:
        if o not in origins:
            origins.append(o)

logger.info(f"Configuring CORS with origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.holograms\.media|https://.*\.pages\.dev|https://.*\.koyeb\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    formatted_process_time = "{0:.2f}".format(process_time)
    logger.info(
        f"RID: {request.headers.get('X-Request-ID', 'None')} | Method: {request.method} | Path: {request.url.path} | Status: {response.status_code} | Time: {formatted_process_time}ms"
    )
    return response


@app.post("/api/v1/auth/token_debug")
async def token_debug(data: dict):
    logger.info(f"DEBUG TOKEN RECEIVED: {data}")
    return {"status": "received", "data_keys": list(data.keys())}


# Tria Cortex v2.6.5: Forcing CI/CD trigger with robust window check.

# --- Imports of routers ---
from backend.api.v1.endpoints.gesture_routes import router as public_gestures_router
from backend.routers.public_holograms import router as public_holograms_router
from backend.api.v1.endpoints.tria_commands import router as tria_commands_router
from backend.api.v1.endpoints.chunks import router as chunks_router
from backend.routers.gestures import router as user_gestures_router
from backend.routers.holograms import router as user_holograms_router
from backend.routers.prompts import router as user_prompts_router
from backend.routers import gestures_ws
from backend.routers.signaling import router as signaling_router  # New signaling router
from backend.routers.auth import router as auth_router  # Import the new auth router
from backend.routers.chat_sessions import router as chat_sessions_router
from backend.api.v1.endpoints.wallet import router as wallet_router
from backend.api.v1.endpoints.github_proxy import router as github_proxy_router
from backend.api.v1.endpoints.mcp import router as mcp_router
from backend.routers.gesture_embedding import router as gesture_embedding_router
from backend.routers import live

API_V1_PREFIX = "/api/v1"

# --- Include routers ---
app.include_router(auth_router, prefix=f"{API_V1_PREFIX}/auth", tags=["Authentication"])
app.include_router(
    public_gestures_router, prefix=API_V1_PREFIX, tags=["Gestures (Public)"]
)
app.include_router(
    public_holograms_router, prefix=API_V1_PREFIX, tags=["Holograms (Public)"]
)
app.include_router(
    tria_commands_router, prefix=f"{API_V1_PREFIX}/tria", tags=["Tria Commands"]
)
app.include_router(chunks_router, prefix=API_V1_PREFIX, tags=["Chunks"])
app.include_router(
    chat_sessions_router, prefix=f"{API_V1_PREFIX}/chat", tags=["Chat Sessions"]
)
app.include_router(wallet_router, prefix=f"{API_V1_PREFIX}/wallet", tags=["Wallet"])
app.include_router(github_proxy_router, prefix=API_V1_PREFIX, tags=["GitHub Proxy"])
app.include_router(mcp_router, prefix=f"{API_V1_PREFIX}/mcp", tags=["MCP"])
app.include_router(
    user_gestures_router,
    prefix=f"{API_V1_PREFIX}/users/me/gestures",
    tags=["Current User Gestures"],
)
app.include_router(
    user_holograms_router,
    prefix=f"{API_V1_PREFIX}/users/me/holograms",
    tags=["Current User Holograms"],
)
app.include_router(
    user_prompts_router,
    prefix=f"{API_V1_PREFIX}/users/me/prompts",
    tags=["Current User Prompts"],
)
app.include_router(gesture_embedding_router, prefix=API_V1_PREFIX)
app.include_router(gestures_ws.router)
app.include_router(signaling_router)  # Include the new signaling router
app.include_router(live.router)


@app.get("/healthz", tags=["System"])
async def health_check():
    return {"status": "ok", "message": "FastAPI is healthy"}


# --- Static Files Serving ---
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Mount directories for frontend assets
# Assumption: app.py is in backend/ and the root is one level up
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# Serve root files (index.html, style.css, favicon.ico, manifest.json)
@app.get("/")
async def serve_index():
    index_path = os.path.join(base_dir, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    return {
        "message": "Holograms Media API is running (Frontend index.html not found, but API is healthy)"
    }


@app.get("/style.css")
async def serve_style():
    return FileResponse(os.path.join(base_dir, "style.css"))


@app.post("/chat", tags=["Tria AI"])
async def tria_chat_alias(request: Request):
    """
    Compatibility alias for Tria Mode.
    Proxies requests directly to the Tria Orchestrator.
    """
    from backend.llm.gemini_llm import LLM_CONTEXT

    body = await request.json()
    message = body.get("message", "")

    # Пытаемся получить пользователя из заголовка Authorization, если он есть
    user_email = ""
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        try:
            from backend.auth.security import decode_access_token

            token = auth_header.split(" ")[1]
            payload = decode_access_token(token)
            user_email = payload.get("sub", "")
        except:
            pass

    orchestrator = request.app.state.tria_orchestrator
    if not orchestrator:
        return {"response": "[Tria] Сервис временно недоступен.", "metadata": {}}

    # Process with the global project context and optional user role
    response = await orchestrator.process_user_prompt(
        message, context=LLM_CONTEXT, user_email=user_email
    )

    # Return in the format expected by tria_mode.js
    return {
        "response": response,
        "metadata": {"source": "TriaOrchestrator", "model": "gemini-2.0-flash"},
    }


@app.get("/favicon.ico")
async def serve_favicon():
    return FileResponse(os.path.join(base_dir, "favicon.ico"))


@app.get("/version.json")
async def serve_version():
    version_path = os.path.join(base_dir, "public", "version.json")
    if os.path.exists(version_path):
        return FileResponse(version_path)
    return {"version": "unknown", "timestamp": str(time.time())}


# Mount subdirectories with existence checks
_js_dir = os.path.join(base_dir, "js")
if os.path.isdir(_js_dir):
    app.mount("/js", StaticFiles(directory=_js_dir), name="js")
else:
    logger.warning(f"[StaticFiles] Directory '{_js_dir}' not found. Skipping /js mount.")

_css_dir = os.path.join(base_dir, "css")
if os.path.isdir(_css_dir):
    app.mount("/css", StaticFiles(directory=_css_dir), name="css")
else:
    logger.warning(f"[StaticFiles] Directory '{_css_dir}' not found. Skipping /css mount.")

_public_dir = os.path.join(base_dir, "public")
if os.path.isdir(_public_dir):
    app.mount("/public", StaticFiles(directory=_public_dir), name="public")
else:
    logger.warning(f"[StaticFiles] Directory '{_public_dir}' not found. Skipping /public mount.")

_holocore_dir = os.path.join(base_dir, "holocore")
if os.path.isdir(_holocore_dir):
    app.mount("/holocore", StaticFiles(directory=_holocore_dir), name="holocore")
else:
    logger.warning(f"[StaticFiles] Directory '{_holocore_dir}' not found. Skipping /holocore mount.")

# Compatibility alias for /icons -> /public/icons (for manifest.json)
_icons_dir = os.path.join(base_dir, "public", "icons")
if os.path.isdir(_icons_dir):
    app.mount("/icons", StaticFiles(directory=_icons_dir), name="icons_alias")
else:
    logger.warning(f"[StaticFiles] Directory '{_icons_dir}' not found. Skipping /icons mount.")

# Compatibility alias for /wasm -> /public/wasm
_wasm_dir = os.path.join(base_dir, "public", "wasm")
if os.path.isdir(_wasm_dir):
    app.mount("/wasm", StaticFiles(directory=_wasm_dir), name="wasm_root")
else:
    logger.warning(f"[StaticFiles] Directory '{_wasm_dir}' not found. Skipping /wasm mount.")

from backend.core.config import settings

# CORS configured above

# Lifespan handled in FastAPI constructor


async def upload_chunk_async(
    bucket_name: str, file_key: str, chunk_data: bytes, part_number: int, upload_id: str
):
    if not getattr(app.state, "s3_client", None):
        logger.error("B2 S3 client not initialized in app state. Cannot upload chunk.")
        raise HTTPException(status_code=503, detail="Storage service is not available.")

    max_retries = 3
    for attempt in range(max_retries):
        try:
            logger.info(
                f"Attempt {attempt + 1} to upload part {part_number} for {file_key} to bucket {bucket_name} with upload ID {upload_id}"
            )
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: app.state.s3_client.upload_part(
                    Bucket=bucket_name,
                    Key=file_key,
                    PartNumber=part_number,
                    UploadId=upload_id,
                    Body=chunk_data,
                ),
            )
            logger.info(
                f"Successfully uploaded part {part_number} for {file_key}. ETag: {response.get('ETag')}"
            )
            return {"ETag": response.get("ETag"), "PartNumber": part_number}
        except Exception as e:
            logger.error(
                f"Error uploading part {part_number} for {file_key} (attempt {attempt + 1}/{max_retries}): {e}",
                exc_info=True,
            )
            if attempt == max_retries - 1:
                raise
            await asyncio.sleep(2**attempt)
    logger.error(
        f"All retries failed for part {part_number} of {file_key}. This should not happen if exceptions are re-raised."
    )
    return None
