"""Fetch AI config from Supabase REST API."""

import httpx
from config import SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY


class ConfigRepo:
    """Reads ai_skills, ai_pipelines, ai_settings from Supabase."""

    def __init__(self):
        self.base = f"{SUPABASE_URL}/rest/v1"
        self.headers = {
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {SUPABASE_SERVICE_ROLE_KEY}",
            "Accept": "application/json",
        }

    async def fetch_skills(self) -> list[dict]:
        """Fetch all active skills ordered by layer, priority."""
        url = (
            f"{self.base}/ai_skills"
            "?is_active=eq.true"
            "&order=layer.asc,priority.asc"
            "&select=id,name,display_name,layer,category,content,priority,usage_hint"
        )
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, headers=self.headers)
            r.raise_for_status()
            return r.json()

    async def fetch_pipelines(self) -> list[dict]:
        """Fetch all active pipelines."""
        url = (
            f"{self.base}/ai_pipelines"
            "?is_active=eq.true"
            "&select=id,name,display_name,description,steps,skill_ids,model,max_tokens,temperature,retry_limit,config"
        )
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, headers=self.headers)
            r.raise_for_status()
            return r.json()

    async def fetch_settings(self) -> dict[str, dict]:
        """Fetch all settings as a key→value dict."""
        url = f"{self.base}/ai_settings?select=key,value"
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(url, headers=self.headers)
            r.raise_for_status()
            rows = r.json()
            return {row["key"]: row["value"] for row in rows}

    async def fetch_all(self) -> dict:
        """Fetch everything in parallel. Returns {skills, pipelines, settings}."""
        import asyncio

        skills, pipelines, settings = await asyncio.gather(
            self.fetch_skills(),
            self.fetch_pipelines(),
            self.fetch_settings(),
        )
        return {
            "skills": skills,
            "pipelines": pipelines,
            "settings": settings,
        }
