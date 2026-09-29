from .base import LLMClient
from typing import Optional
import anthropic


class ClaudeClient(LLMClient):
    """
    Wraps the Anthropic SDK. Restructuring Agent should default to a
    cheaper/faster model (e.g. Haiku); Healing Agent to a stronger one
    (e.g. Sonnet), per the two-agent split already decided.
    """

    def __init__(self, model: str = "claude-sonnet-5"):
        self.model = model
        self._last_usage = {}
        self.client = anthropic.Anthropic()

    def generate(self, prompt: str, context: Optional[dict] = None) -> str:
        raise NotImplementedError

    def usage_stats(self) -> dict:
        return self._last_usage
