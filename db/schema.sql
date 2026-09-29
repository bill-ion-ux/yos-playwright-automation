-- Single source of truth for run history and cost logging.
-- Feeds whichever dashboard eventually sits on top (Dash-leaning,
-- pending confirmation the audience is QA/ops) and the ILMU vs.
-- Claude cost comparison once that eval starts.

CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,              -- e.g. YOS-ASR-43
    name TEXT NOT NULL,
    last_restructured_date TEXT,
    current_status TEXT               -- 'not_started' | 'restructured' | 'pilot' | 'live'
);

CREATE TABLE IF NOT EXISTS runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    script_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    status TEXT NOT NULL,             -- 'pass' | 'fail' | 'healed'
    agent_involved TEXT,              -- 'restructuring' | 'healing' | NULL
    FOREIGN KEY (script_id) REFERENCES scripts(id)
);

CREATE TABLE IF NOT EXISTS healing_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER NOT NULL,
    attempt_number INTEGER NOT NULL,
    classification TEXT,              -- 'locator_failure' | 'assertion_failure' | 'unknown'
    outcome TEXT,                     -- 'healed' | 'escalated' | 'failed'
    tokens_used INTEGER,
    cost_usd REAL,
    FOREIGN KEY (run_id) REFERENCES runs(id)
);
