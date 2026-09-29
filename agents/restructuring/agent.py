from dataclasses import dataclass
from ..llm_client.base import LLMClient


@dataclass
class ConversionReport:
    """
    Structured record of what the restructuring changed. Generated
    even though nothing currently consumes it, since the Healing Agent
    and the PR review step will both want it later.
    """
    script_id: str
    locators_changed: list
    patterns_applied: list


class RestructuringAgent:
    """
    One-shot conversion: raw WebdriverIO/Codegen script -> hybrid
    POM/COM Playwright script. Bounded task, so this is the agent
    that should stay on the cheaper model.
    """

    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    def restructure(self, raw_script_path: str) -> tuple[str, ConversionReport]:
        """Returns (converted_script_text, ConversionReport)."""
        raise NotImplementedError
