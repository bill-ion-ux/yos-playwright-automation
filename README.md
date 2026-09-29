# YOS QA Automation

Test automation modernization for the YOS platform (yes.my and store.yes.my).
Migrates existing WebdriverIO scripts to a hybrid POM/COM Playwright architecture,
with two AI agents handling restructuring and self-healing.

## Roadmap
1. Documentation
2. Pilot (4-5 scripts, 100% manual review)
3. Phased Rollout (full 37 scripts)
4. Full Adoption (pipeline live, TMS decision, handoff docs)

## Pipeline
Playwright Codegen (authoring) -> Restructuring Agent -> Healing Agent -> GitHub Actions -> BrowserStack

## Structure
- `agents/` - the two-agent pipeline (restructuring, healing, and the shared LLM client boundary)
- `tests/` - the migrated Playwright suite (POM/COM)
- `.github/workflows/` - CI: restructure trigger, test run, healing dispatch
- `db/` - SQLite schema feeding the (currently paused) dashboard
- `dashboard/` - on hold, see dashboard/README.md
