"""Assemble layered system prompts from skills and pipeline config."""

from config import LAYER_IDENTITY, LAYER_TASK, LAYER_DESIGN, LAYER_SPECIALTY


def _make_block(text: str, cache: bool = False) -> dict:
    block: dict = {"type": "text", "text": text}
    if cache:
        block["cache_control"] = {"type": "ephemeral"}
    return block


def build_system_prompt(
    pipeline: dict | None,
    skills: list[dict],
    settings: dict[str, dict],
    generation_type: str = "tool",
) -> list[dict]:
    """Build Anthropic system prompt array with layered skills + prompt caching.

    Layers 1+2 (identity + task) are static → cached.
    Layers 3+4 (design + specialty) are dynamic → not cached.

    Args:
        pipeline: Pipeline config from ai_pipelines (or None)
        skills: All active skills sorted by layer, priority
        settings: Key→value settings from ai_settings
        generation_type: "tool", "app", or "doc"
    """
    blocks: list[dict] = []

    # -- Layer 1: Identity (always cached) --
    l1_skills = [s for s in skills if s["layer"] == LAYER_IDENTITY]
    for s in l1_skills:
        header = f"## {s['display_name'] or s['name']}\n\n"
        blocks.append(_make_block(header + s["content"], cache=True))

    # Inject design tokens into L1 if present
    tokens = settings.get("design_tokens")
    if tokens:
        tokens_text = "## Design Tokens (Non-Negotiable)\n\n```json\n" + _format_json(tokens) + "\n```"
        blocks.append(_make_block(tokens_text, cache=True))

    # Inject brand name
    brand = settings.get("brand_name")
    if brand:
        blocks.append(_make_block(f"Brand name: {brand}", cache=True))

    # -- Layer 2: Task skills (cached when matching pipeline) --
    if pipeline:
        pipeline_name = pipeline.get("name", "")
        # Select task skills that match this pipeline type
        if generation_type == "tool":
            task_names = {"tool-generator"}
        elif generation_type == "app":
            task_names = {"tool-generator"}  # same core rules apply
        elif generation_type == "doc":
            task_names = {"doc-cleanup"}
        else:
            task_names = set()

        l2_skills = [
            s for s in skills
            if s["layer"] == LAYER_TASK and s["name"] in task_names
        ]
        for s in l2_skills:
            header = f"## {s['display_name'] or s['name']}\n\n"
            blocks.append(_make_block(header + s["content"], cache=True))

    # -- Layer 3: Design quality (dynamic, no cache) --
    l3_skills = [s for s in skills if s["layer"] == LAYER_DESIGN]
    for s in l3_skills:
        header = f"## {s['display_name'] or s['name']} (Advisory)\n\n"
        blocks.append(_make_block(header + s["content"], cache=False))

    # -- Layer 4: Specialty (dynamic, no cache, available as reference) --
    l4_skills = [s for s in skills if s["layer"] == LAYER_SPECIALTY]
    if l4_skills:
        parts = ["## Available Specialty Skills (use when relevant)\n"]
        for s in l4_skills:
            hint = s.get("usage_hint", "")
            parts.append(f"### {s['display_name'] or s['name']}\n")
            if hint:
                parts.append(f"When to use: {hint}\n")
            parts.append(s["content"] + "\n")
        blocks.append(_make_block("\n".join(parts), cache=False))

    return blocks


def build_step_prompt(
    step: dict,
    user_params: dict,
) -> str:
    """Build the user message for a pipeline step.

    Args:
        step: Step config from pipeline steps JSON
        user_params: {prompt, toolType, style, language, format, ...}
    """
    template = step.get("prompt_template", "{prompt}")
    prompt = template.format(**user_params, **{k: v or "" for k, v in user_params.items()})
    return prompt


def _format_json(value) -> str:
    import json
    return json.dumps(value, ensure_ascii=False, indent=2)
