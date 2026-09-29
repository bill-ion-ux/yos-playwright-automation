from .base import LLMClient
from typing import Optional


class IlmuClient(LLMClient):
    """
    Wraps YTL AI Labs' ILMU API. Pending token allocation from Bruce
    before this can be evaluated against ClaudeClient.
    """

    def __init__(self, model: str = "ilmu-glm-5.1"):
        self.model = model
        self._last_usage = {}
        # TODO: point at ILMU_API_BASE / ILMU_API_KEY from env

    def generate(self, prompt: str, context: Optional[dict] = None) -> str:
        raise NotImplementedError

    def usage_stats(self) -> dict:
        return self._last_usage
