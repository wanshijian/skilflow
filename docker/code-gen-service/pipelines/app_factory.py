"""Pipeline B: Multi-language code generation (App Factory)."""

from config_cache import ConfigCache
from orchestrator import run_pipeline
from config import PIPELINE_APP

CODE_EXTRACT = r"```(?:python|html|javascript|nodejs)?\s*([\s\S]*?)```"


async def generate_app(cache: ConfigCache, params: dict) -> dict:
    """Generate Python / HTML / Node.js application code.

    params: {prompt, language, userId?}
    """
    pipeline = cache.get_pipeline(PIPELINE_APP)
    if not pipeline:
        return {"success": False, "error": f"Pipeline '{PIPELINE_APP}' not found"}

    language = params.get("language", "html")
    if language not in ("python", "html", "nodejs"):
        language = "html"

    user_params = {
        "prompt": params.get("prompt", ""),
        "language": language,
        "userId": params.get("userId", ""),
    }

    result = await run_pipeline(
        pipeline=pipeline,
        skills=cache.skills,
        settings=cache.settings,
        user_params=user_params,
        generation_type="app",
        extract_pattern=CODE_EXTRACT,
    )

    if result.get("success"):
        result["code"] = result.pop("output", "")
        result["language"] = language
        result["app"] = {
            "title": params.get("prompt", "Untitled App")[:50],
            "description": f"A {language} application",
            "type": language,
        }

    return result
