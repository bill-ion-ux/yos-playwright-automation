from ..llm_client.base import LLMClient
from .classification_gate import classify_failure, FailureClass


class HealingAgent:
    """
    propose -> validate -> retry loop, capped at max_retries, with
    mandatory human review before merge (non-technical-staff constraint).
    Anything not classified as a locator failure gets escalated rather
    than auto-touched.
    """

    def __init__(self, llm_client: LLMClient, max_retries: int = 3):
        self.llm_client = llm_client
        self.max_retries = max_retries

    def heal(self, failure_trace: dict) -> dict:
        """
        Returns either:
          {"status": "proposed_fix", "diff": ..., "classification": ...}
          {"status": "escalated", "reason": ..., "classification": ...}
        """
        classification = classify_failure(failure_trace)
        if classification != FailureClass.LOCATOR_FAILURE:
            return {"status": "escalated", "reason": "not a locator failure", "classification": classification.value}
        raise NotImplementedError
