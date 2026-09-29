# Dashboard - on hold

Deliberately paused. Doesn't block anything else in the pipeline:
agents, orchestration, and db/schema.sql all work independently of
what eventually renders on top of them.

When picked back up:
- Leaning Dash over React, since the likely audience is QA/ops
  rather than an engineer who'll actively extend it - same
  accessibility constraint driving the rest of this project.
- Reads from db/schema.sql (runs, healing_attempts, scripts).
- Becomes the ILMU vs. Claude cost comparison view once that
  eval starts (healing_attempts.tokens_used / cost_usd).
