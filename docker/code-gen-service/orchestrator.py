"""Generic pipeline runner: understand → generate → review → output."""

import logging
import re
import time

from config import LIGHT_MODEL, MAX_RETRY
from llm_client import llm_chat
from prompt_builder import build_system_prompt, build_step_prompt

logger = logging.getLogger(__name__)


async def run_pipeline(
    pipeline: dict,
    skills: list[dict],
    settings: dict[str, dict],
    user_params: dict,
    generation_type: str = "tool",
    extract_pattern: str | None = None,
) -> dict:
    """Execute a multi-step generation pipeline."""
    steps: list[dict] = pipeline.get("steps", [])
    retry_limit = pipeline.get("retry_limit", MAX_RETRY)
    default_model = pipeline.get("model", "claude-sonnet-4-20250514")
    default_max_tokens = pipeline.get("max_tokens", 8192)
    default_temperature = pipeline.get("temperature", 0.7)

    system_prompt = build_system_prompt(pipeline, skills, settings, generation_type)

    step_results = []
    intermediate_output = ""
    context = dict(user_params)

    for attempt in range(retry_limit + 1):
        for step in steps:
            step_name = step.get("name", "unknown")
            model = step.get("model", default_model)
            max_tokens = step.get("max_tokens", default_max_tokens)
            step_prompt = build_step_prompt(step, context)

            t0 = time.monotonic()
            try:
                result = await llm_chat(
                    model=model,
                    system=system_prompt if step_name in ("generate", "clean_and_format") else _light_system(),
                    user_message=step_prompt,
                    max_tokens=max_tokens,
                    temperature=default_temperature,
                )
            except Exception as exc:
                logger.error("Step %s failed: %s", step_name, exc)
                return {
                    "success": False,
                    "error": f"Step '{step_name}' failed: {exc}",
                    "steps": step_results,
                }

            duration_ms = int((time.monotonic() - t0) * 1000)
            step_results.append({
                "name": step_name,
                "model": model,
                "duration_ms": duration_ms,
            })

            context[f"step_{step_name}_output"] = result

            if step_name in ("generate", "clean_and_format"):
                intermediate_output = result

            if step_name in ("review", "verify") and "FAIL" in result.upper():
                logger.info("Review failed, retrying (attempt %d/%d)...", attempt + 1, retry_limit)
                if attempt < retry_limit:
                    context["retry_feedback"] = result
                    break

        else:
            break

    final_output = _extract_output(intermediate_output, extract_pattern, generation_type)

    return {
        "success": True,
        "output": final_output,
        "raw": intermediate_output,
        "steps": step_results,
    }


def _light_system() -> list[dict]:
    return [{"type": "text", "text": "Be concise and direct. Output only the requested format."}]


def _extract_output(text: str, pattern: str | None, generation_type: str) -> str:
    if pattern:
        m = re.search(pattern, text, re.DOTALL)
        if m:
            return m.group(1).strip()

    if generation_type == "doc":
        m = re.search(r"\{[\s\S]*\}", text)
        if m:
            return m.group(0).strip()

    return text.strip()
