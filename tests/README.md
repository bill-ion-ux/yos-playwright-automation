# Migrated Playwright suite (hybrid POM/COM)

- `pages/` - one class per YOS page (yes.my, store.yes.my), owns page-level locators/actions
- `components/` - shared reusable UI pieces (nav bar, cart widget, etc.) used across multiple pages
- `specs/` - the actual test files (target: all 37 scripts, YOS-ASR-3 through YOS-ASR-49)

Kept as hybrid POM/COM rather than a full OOP refactor deliberately -
the flat-ish structure stays closer to what non-technical QA staff
can still read and modify directly.
