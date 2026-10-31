# Agent Instructions: Tracker Files

Open work (bugs and feature requests) lives in GitHub Issues; see `docs/github-issues.md`. Completed work is tracked in two files:

- `docs/agent.md`: How to maintain tracker files (this file)
- `docs/implementation-log.md`: Implemented features and completed bug fixes
- `docs/CHANGELOG.md`: Release notes only

## Purpose Of Each File

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
- Raise or find the matching GitHub issue (labels `bug` / `enhancement`).
- Assign the next available `CHG-XXX` ID when the work is logged.

2. Work starts:
- Assign or comment on the GitHub issue.

3. Work completed:
- Reference the issue number in the commit/PR and close the issue.
- Add the row to `docs/implementation-log.md`.
- Set `Actioned On` to the completion date (`YYYY-MM-DD`).
- Set status to `Implemented` or `Completed Bug Fix`.
- Add an entry under `docs/CHANGELOG.md` in `Unreleased` for user-visible and technical impact.

4. Keep IDs stable:
- Never reuse IDs.
- Never renumber historical entries.

5. Run consistency checks:
- Run `node scripts/check-tracker-consistency.js` before publishing/versioning.

6. Quality cadence default:
- Perform a code quality audit at every third minor version checkpoint (for example `0.3.0`, `0.6.0`, `0.9.0`).
- Include a quality-audit note in `docs/CHANGELOG.md` under that release section.
- Run `node scripts/check-quality-cadence.js` before publishing/versioning.

7. Automatic changelog + help sync for completion:
- This is mandatory and must be treated as automatic default behavior.
- After each completed item, update all relevant documentation in the same pass:
	- `README.md` for user-facing functionality, setup, workflow, and behavior changes.
	- `docs/CHANGELOG.md` in the `Unreleased` section for release-note-level changes.
	- `docs/implementation-log.md` with the completed `CHG-XXX` entry.
	- In-app Help page content in `frontend/src/App.tsx` for any user-impacting changes.
- Do not mark implementation work complete until changelog and in-app Help updates are done.

## Status Values

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
