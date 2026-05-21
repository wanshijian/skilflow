"""Pipeline C: Document cleanup and formatting."""

import json
import re

from config_cache import ConfigCache
from orchestrator import run_pipeline
from config import PIPELINE_DOC

JSON_EXTRACT = r"\{[\s\S]*\}"


async def cleanup_document(cache: ConfigCache, params: dict) -> dict:
    """Clean and format AI-generated text into structured JSON.

    params: {text, format}
    """
    pipeline = cache.get_pipeline(PIPELINE_DOC)
    if not pipeline:
        return {"success": False, "error": f"Pipeline '{PIPELINE_DOC}' not found"}

    text = params.get("text", "")
    if not text:
        return {"success": False, "error": "Missing text"}

    doc_format = params.get("format", "normal")

    user_params = {
        "prompt": f"Format type: {doc_format}\n\nText to clean:\n{text[:15000]}",
        "format": doc_format,
        "text_length": str(len(text)),
    }

    result = await run_pipeline(
        pipeline=pipeline,
        skills=cache.skills,
        settings=cache.settings,
        user_params=user_params,
        generation_type="doc",
        extract_pattern=JSON_EXTRACT,
    )

    if result.get("success"):
        raw = result.get("output", "{}")
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            m = re.search(JSON_EXTRACT, raw)
            try:
                parsed = json.loads(m.group(0)) if m else {}
            except json.JSONDecodeError:
                parsed = {
                    "title": "文档",
                    "format": doc_format,
                    "sections": [],
                    "stats": {"chars": len(text), "paragraphs": 0},
                }
        result["output"] = parsed  # return parsed object, not string

    return result
