from .base import LLMClient
from .claude_client import ClaudeClient
from .ilmu_client import IlmuClient

def get_client() -> LLMClient:
    """
    Returns the active LLM client based on LLM_PROVIDER env var.
    This is the one swap point for the ILMU vs. Claude decision -
    nothing in RestructuringAgent or HealingAgent should import
    ClaudeClient / IlmuClient directly.
    """
    import os
    provider = os.getenv("LLM_PROVIDER", "claude").lower()
    if provider == "ilmu":
        return IlmuClient()
    return ClaudeClient()
