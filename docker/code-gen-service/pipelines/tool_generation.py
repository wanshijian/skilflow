"""Pipeline A: Single-file HTML tool generation."""

from config_cache import ConfigCache
from orchestrator import run_pipeline
from config import PIPELINE_TOOL

HTML_EXTRACT = r"```html\s*([\s\S]*?)```"


async def generate_tool(cache: ConfigCache, params: dict) -> dict:
    """Generate a single-file HTML tool.

    params: {prompt, toolType?, style?, retryContext?}
    """
    pipeline = cache.get_pipeline(PIPELINE_TOOL)
    if not pipeline:
        return {"success": False, "error": f"Pipeline '{PIPELINE_TOOL}' not found"}

    user_params = {
        "prompt": params.get("prompt", ""),
        "toolType": params.get("toolType", "utility"),
        "style": params.get("style", "clean"),
        "requirements": params.get("requirements", ""),
    }

    # Handle retry context
    retry = params.get("retryContext")
    if retry:
        user_params["retry_feedback"] = retry.get("userFeedback", "")
        user_params["previous_output"] = (retry.get("previousOutput", ""))[:500]

    result = await run_pipeline(
        pipeline=pipeline,
        skills=cache.skills,
        settings=cache.settings,
        user_params=user_params,
        generation_type="tool",
        extract_pattern=HTML_EXTRACT,
    )

    if result.get("success") and result.get("output"):
        title = _extract_title(result["output"])
        result["title"] = title
        result["html"] = result.pop("output")

    return result


def _extract_title(html: str) -> str:
    import re
    m = re.search(r"<title>(.*?)</title>", html, re.IGNORECASE)
    return m.group(1).strip() if m else "Untitled Tool"
