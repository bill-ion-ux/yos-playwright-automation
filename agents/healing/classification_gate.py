from enum import Enum


class FailureClass(Enum):
    LOCATOR_FAILURE = "locator_failure"
    ASSERTION_FAILURE = "assertion_failure"
    UNKNOWN = "unknown"


def classify_failure(failure_trace: dict) -> FailureClass:
    """
    Heuristic gate separating locator failures (safe to auto-heal) from
    assertion failures (likely a real bug - must not be auto-healed).
    Kept as its own module, not folded into HealingAgent, so it stays
    separately testable and tunable from the agent's LLM logic.
    """
    raise NotImplementedError
