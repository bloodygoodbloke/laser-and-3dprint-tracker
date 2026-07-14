# Agent Instructions: Tracker Files

This repo uses three files to track implementation work:

- `docs/agent.md`: How to maintain tracker files (this file)
- `docs/backlog.md`: Planned and in-progress work only
- `docs/implementation-log.md`: Implemented features and completed bug fixes
- `docs/CHANGELOG.md`: Release notes only

## Purpose Of Each File

### `docs/backlog.md`
Use this file for:
- Planned items
- In-progress items
- Priority and short implementation intent

Do not keep completed work here.
When processing backlog items, remove completed rows from this table in the same pass.

### `docs/implementation-log.md`
Use this file for:
- Implemented features
- Completed bug fixes

Every completed item should include:
- Stable ID (for example `CHG-046`)
- Type
- Priority
- Actioned date
- Final summary of what shipped/fixed

## Automation Rules For Agents

When updating tracker files, follow this flow exactly:

1. New request received:
- Add a new row in `docs/backlog.md` with status `Planned`.
- Assign the next available `CHG-XXX` ID.

2. Work starts:
- Change status in `docs/backlog.md` from `Planned` to `In Progress`.

3. Work completed:
- Remove the row from `docs/backlog.md`.
- Add the row to `docs/implementation-log.md`.
- Set `Actioned On` to the completion date (`YYYY-MM-DD`).
- Set status to `Implemented` or `Completed Bug Fix`.
- Add an entry under `docs/CHANGELOG.md` in `Unreleased` for user-visible and technical impact.

4. Keep IDs stable:
- Never reuse IDs.
- Never renumber historical entries.

5. Keep queue current:
- Update `Next 3` in `docs/backlog.md` based on highest priority and current focus.

6. Run consistency checks:
- Run `node scripts/check-tracker-consistency.js` before publishing/versioning.

7. Automatic documentation + help sync after each backlog execution:
- This is mandatory and must be treated as automatic default behavior.
- After each implemented backlog item, update all relevant documentation in the same pass:
	- `README.md` for user-facing functionality, setup, workflow, and behavior changes.
	- `docs/CHANGELOG.md` in the `Unreleased` section for release-note-level changes.
	- Remove completed items from `docs/backlog.md` (keep backlog planned/in-progress only).
	- `docs/implementation-log.md` with the completed `CHG-XXX` entry.
- Also update the in-app Help area content whenever functionality or workflow changes.
- Do not mark backlog work complete until README, changelog, implementation log, and in-app Help are updated.

## Status Values

- Planned
- In Progress
- Implemented
- Completed Bug Fix

## Priority Values

- P1 Critical
- P1 High
- P2 Medium
- P3 Low
- Integrations

## Notes

- `docs/CHANGELOG.md` is release history only.
- Implemented and completed tracker entries live in `docs/implementation-log.md`.
- Keep row format consistent across files so entries can be moved without rewriting.
