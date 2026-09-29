from abc import ABC, abstractmethod
from typing import Optional


class LLMClient(ABC):
    """
    Shared interface both agents call through. Whichever model wins
    the ILMU vs. Claude evaluation, it plugs in here without either
    agent's logic changing.
    """

    @abstractmethod
    def generate(self, prompt: str, context: Optional[dict] = None) -> str:
        """Send a prompt to the underlying model and return its raw response."""
        raise NotImplementedError

    @abstractmethod
    def usage_stats(self) -> dict:
        """
        Return token counts / cost for the last call, e.g.
        {"input_tokens": int, "output_tokens": int, "cost_usd": float}.
        Feeds the healing_attempts cost logging in db/schema.sql.
        """
        raise NotImplementedError
