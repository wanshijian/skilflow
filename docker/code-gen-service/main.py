"""SkillFlow Code Gen Service — FastAPI entry point."""

import logging
import time

from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

from config import SERVICE_API_KEY, CODE_GEN_PORT, LOG_LEVEL
from config_repo import ConfigRepo
from config_cache import ConfigCache
from pipelines.tool_generation import generate_tool
from pipelines.app_factory import generate_app
from pipelines.doc_cleanup import cleanup_document

# ---------------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("code-gen-service")

app = FastAPI(title="SkillFlow Code Gen Service", version="1.0.0")

_cache: ConfigCache = ConfigCache(ConfigRepo())


# ---------------------------------------------------------------------------
# Auth middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def check_api_key(request: Request, call_next):
    if request.url.path == "/health":
        return await call_next(request)
    api_key = request.headers.get("X-API-Key", "")
    if api_key != SERVICE_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return await call_next(request)


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------
class ToolGenerateRequest(BaseModel):
    prompt: str
    toolType: str = "utility"
    style: str = "clean"
    requirements: str = ""
    retryContext: dict | None = None


class AppGenerateRequest(BaseModel):
    prompt: str
    language: str = "html"
    userId: str = ""


class DocCleanupRequest(BaseModel):
    text: str
    format: str = "normal"


# ---------------------------------------------------------------------------
# Business routes
# ---------------------------------------------------------------------------
@app.post("/generate/tool")
async def route_generate_tool(req: ToolGenerateRequest):
    t0 = time.monotonic()
    result = await generate_tool(_cache, req.model_dump())
    result["elapsed_ms"] = int((time.monotonic() - t0) * 1000)
    return result


@app.post("/generate/app")
async def route_generate_app(req: AppGenerateRequest):
    t0 = time.monotonic()
    result = await generate_app(_cache, req.model_dump())
    result["elapsed_ms"] = int((time.monotonic() - t0) * 1000)
    return result


@app.post("/cleanup/document")
async def route_cleanup_document(req: DocCleanupRequest):
    t0 = time.monotonic()
    result = await cleanup_document(_cache, req.model_dump())
    result["elapsed_ms"] = int((time.monotonic() - t0) * 1000)
    return result


# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------
@app.post("/admin/reload")
async def route_reload():
    try:
        await _cache.reload()
        return {
            "status": "ok",
            "skills_count": len(_cache.skills),
            "pipelines_count": len(_cache.pipelines),
            "settings_count": len(_cache.settings),
            "last_reload": _cache.last_reload,
        }
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@app.get("/admin/skills")
async def route_admin_skills():
    return {
        "count": len(_cache.skills),
        "skills": _cache.skills,
    }


@app.get("/admin/pipelines")
async def route_admin_pipelines():
    return {
        "count": len(_cache.pipelines),
        "pipelines": [
            {k: v for k, v in p.items() if k != "skill_ids"}
            for p in _cache.pipelines
        ],
    }


@app.get("/admin/settings")
async def route_admin_settings():
    return {
        "count": len(_cache.settings),
        "settings": _cache.settings,
    }


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------
@app.get("/health")
async def route_health():
    return {
        "status": "ok",
        "version": "1.0.0",
        "skills_count": len(_cache.skills),
        "pipelines_count": len(_cache.pipelines),
        "settings_count": len(_cache.settings),
        "last_reload": _cache.last_reload,
        "uptime": time.time() - _start_time,
    }


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------
_start_time = time.time()


@app.on_event("startup")
async def on_startup():
    logger.info("Starting SkillFlow Code Gen Service on port %d", CODE_GEN_PORT)
    await _cache.start()
    logger.info("Ready — %d skills, %d pipelines loaded", len(_cache.skills), len(_cache.pipelines))


@app.on_event("shutdown")
async def on_shutdown():
    await _cache.stop()


# ---------------------------------------------------------------------------
# Main (for direct python main.py)
# ---------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=CODE_GEN_PORT, reload=False)
