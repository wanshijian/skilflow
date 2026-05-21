"""In-memory config cache with atomic hot-reload."""

import asyncio
import logging
import time
from threading import Lock

from config import CONFIG_RELOAD_INTERVAL
from config_repo import ConfigRepo

logger = logging.getLogger(__name__)


class ConfigCache:
    """Thread-safe cache for AI config loaded from Supabase.

    - Startup: loads eagerly
    - Runtime: periodic background refresh (default 5 min)
    - Admin: POST /admin/reload triggers immediate refresh
    - Refresh is atomic: new config built → single swap
    """

    def __init__(self, repo: ConfigRepo):
        self._repo = repo
        self._lock = Lock()
        self._skills: list[dict] = []
        self._pipelines: list[dict] = []
        self._settings: dict[str, dict] = {}
        self._last_reload: float = 0
        self._task: asyncio.Task | None = None

    # -- public read API (lock-free reads) --

    @property
    def skills(self) -> list[dict]:
        return self._skills

    @property
    def pipelines(self) -> list[dict]:
        return self._pipelines

    @property
    def settings(self) -> dict[str, dict]:
        return self._settings

    @property
    def last_reload(self) -> float:
        return self._last_reload

    def get_pipeline(self, name: str) -> dict | None:
        for p in self._pipelines:
            if p["name"] == name:
                return p
        return None

    def get_skills_by_layer(self, layer: int) -> list[dict]:
        return [s for s in self._skills if s["layer"] == layer]

    # -- lifecycle --

    async def start(self):
        """Load config and begin background refresh."""
        await self._load_now()
        self._task = asyncio.create_task(self._refresh_loop())

    async def stop(self):
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def reload(self):
        """Force immediate reload (called by admin endpoint)."""
        await self._load_now()

    # -- internal --

    async def _load_now(self):
        """Fetch from Supabase and atomically swap."""
        logger.info("Loading AI config from Supabase...")
        try:
            data = await self._repo.fetch_all()
        except Exception as exc:
            logger.error(f"Failed to fetch config: {exc}")
            raise

        with self._lock:
            self._skills = data["skills"]
            self._pipelines = data["pipelines"]
            self._settings = data["settings"]
            self._last_reload = time.time()

        logger.info(
            "Config loaded: %d skills, %d pipelines, %d settings",
            len(self._skills),
            len(self._pipelines),
            len(self._settings),
        )

    async def _refresh_loop(self):
        while True:
            await asyncio.sleep(CONFIG_RELOAD_INTERVAL)
            try:
                await self._load_now()
            except Exception as exc:
                logger.warning(f"Background reload failed: {exc}")
