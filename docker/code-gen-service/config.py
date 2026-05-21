"""SkillFlow Code Gen Service — Configuration."""

import os

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

# Anthropic
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# DeepSeek (OpenAI-compatible)
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")

# LLM backend: "anthropic" or "deepseek"
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "anthropic")

# Service
SERVICE_API_KEY = os.getenv("SERVICE_API_KEY", "dev-key")
CODE_GEN_PORT = int(os.getenv("CODE_GEN_PORT", "8081"))
CONFIG_RELOAD_INTERVAL = int(os.getenv("CONFIG_RELOAD_INTERVAL", "300"))
LOG_LEVEL = os.getenv("LOG_LEVEL", "info")

# Pipeline defaults
DEFAULT_MODEL = "claude-sonnet-4-20250514"
LIGHT_MODEL = "claude-haiku-4-5-20251001"
DEFAULT_MAX_TOKENS = 8192
DEFAULT_TEMPERATURE = 0.7
MAX_RETRY = 1

# Skill layers
LAYER_IDENTITY = 1   # Project identity — hard constraints
LAYER_TASK = 2        # Core task skills
LAYER_DESIGN = 3      # Design quality skills
LAYER_SPECIALTY = 4   # Specialized skills

# Generation types → pipeline names
PIPELINE_TOOL = "tool_generation"
PIPELINE_APP = "app_factory"
PIPELINE_DOC = "doc_cleanup"
