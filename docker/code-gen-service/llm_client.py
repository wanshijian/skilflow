"""LLM abstraction layer — supports Anthropic and DeepSeek (OpenAI-compatible)."""

import logging
import os

logger = logging.getLogger(__name__)

# Provider detection
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic")  # "anthropic" or "deepseek"

# DeepSeek config (OpenAI-compatible)
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")

# Anthropic client (lazy init)
_anthropic_client = None

# OpenAI client for DeepSeek (lazy init)
_openai_client = None


def _get_anthropic():
    global _anthropic_client
    if _anthropic_client is None:
        import anthropic
        _anthropic_client = anthropic.AsyncAnthropic(
            api_key=os.getenv("ANTHROPIC_API_KEY", "")
        )
    return _anthropic_client


def _get_openai():
    global _openai_client
    if _openai_client is None:
        from openai import AsyncOpenAI
        _openai_client = AsyncOpenAI(
            api_key=DEEPSEEK_API_KEY,
            base_url=DEEPSEEK_BASE_URL,
        )
    return _openai_client


async def llm_chat(
    model: str,
    system: list[dict] | str,
    user_message: str,
    max_tokens: int = 8192,
    temperature: float = 0.7,
) -> str:
    """Send a chat request to the configured LLM backend.

    Args:
        model: Model name. For DeepSeek, auto-mapped to deepseek-chat or deepseek-reasoner.
        system: System prompt — list[dict] for Anthropic, str for DeepSeek
        user_message: User message text
        max_tokens: Max tokens in response
        temperature: Sampling temperature

    Returns:
        Model's text response
    """
    if LLM_PROVIDER == "deepseek":
        return await _chat_deepseek(model, system, user_message, max_tokens, temperature)
    else:
        return await _chat_anthropic(model, system, user_message, max_tokens, temperature)


async def _chat_anthropic(
    model: str,
    system: list[dict],
    user_message: str,
    max_tokens: int,
    temperature: float,
) -> str:
    client = _get_anthropic()

    # Map model names for Anthropic
    anthropic_model = _map_anthropic_model(model)

    resp = await client.messages.create(
        model=anthropic_model,
        max_tokens=max_tokens,
        temperature=temperature,
        system=system,
        messages=[{"role": "user", "content": user_message}],
    )
    for block in resp.content:
        if block.type == "text":
            return block.text
    return ""


async def _chat_deepseek(
    model: str,
    system: str | list[dict],
    user_message: str,
    max_tokens: int,
    temperature: float,
) -> str:
    client = _get_openai()

    # Map model to DeepSeek model
    ds_model = _map_deepseek_model(model)

    # Convert system prompt to string format
    system_str = _system_to_string(system)

    messages = []
    if system_str:
        messages.append({"role": "system", "content": system_str})
    messages.append({"role": "user", "content": user_message})

    resp = await client.chat.completions.create(
        model=ds_model,
        max_tokens=max_tokens,
        temperature=temperature,
        messages=messages,
    )
    return resp.choices[0].message.content or ""


def _system_to_string(system: list[dict] | str) -> str:
    """Convert system prompt from Anthropic block format to plain string."""
    if isinstance(system, str):
        return system
    if isinstance(system, list):
        parts = []
        for block in system:
            if isinstance(block, dict) and block.get("type") == "text":
                parts.append(block.get("text", ""))
        return "\n\n".join(parts)
    return ""


def _map_anthropic_model(model: str) -> str:
    """Map generic model names to actual Anthropic model IDs."""
    if "haiku" in model.lower():
        return "claude-haiku-4-5-20251001"
    if "sonnet" in model.lower():
        return "claude-sonnet-4-20250514"
    if "opus" in model.lower():
        return "claude-opus-4-20250514"
    return model  # use as-is


def _map_deepseek_model(model: str) -> str:
    """Map generic model names to DeepSeek model IDs."""
    # DeepSeek has two models: deepseek-chat (general) and deepseek-reasoner (reasoning)
    if "haiku" in model.lower() or "light" in model.lower():
        return "deepseek-chat"  # fast, cheap for understand/review steps
    if "reasoner" in model.lower():
        return "deepseek-reasoner"
    return "deepseek-chat"  # default for generate steps
