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
- On-hold items awaiting human review
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
- During rebalance, review any backlog row missing `Review Status`/`Review Reason` and classify it as `Reviewed` or `Human Review`.
- If classified as `Human Review`, set backlog status to `On Hold` and record a concrete human-intervention reason.
- If classified as automatable (Copilot can complete with available repo context), set `Review Status` to `Reviewed` and add a concrete implementation reason.
- For automatable items, set status by queue placement: `In Progress` when in `Next 3`, otherwise `Planned`.
- Use this review rubric during rebalance:
	- Mark `Reviewed` when the requirement is internal to this codebase, acceptance intent is clear enough to implement iteratively, and no external legal/compliance approval is required.
	- Keep `Human Review` when it depends on external contracts/APIs with unclear constraints, payment/finance policy decisions, security/privacy sign-off, or destructive data/operational risk choices.

6. Run consistency checks:
- Run `node scripts/check-tracker-consistency.js` before publishing/versioning.

7. Quality cadence default:
- Perform a code quality audit at every third minor version checkpoint (for example `0.3.0`, `0.6.0`, `0.9.0`).
- Include a quality-audit note in `docs/CHANGELOG.md` under that release section.
- Run `node scripts/check-quality-cadence.js` before publishing/versioning.

8. Automatic changelog + help sync for processing, rebalance, and completion:
- This is mandatory and must be treated as automatic default behavior.
- During any backlog processing or rebalance pass:
	- Update `docs/CHANGELOG.md` under `Unreleased` when queue, review policy, or user-visible behavior changes.
	- Update in-app Help page content in `frontend/src/App.tsx` whenever users would benefit from clarified workflow, triage, or feature guidance.
- After each completed backlog item, update all relevant documentation in the same pass:
	- `README.md` for user-facing functionality, setup, workflow, and behavior changes.
	- `docs/CHANGELOG.md` in the `Unreleased` section for release-note-level changes.
	- Remove completed items from `docs/backlog.md` (keep backlog planned/in-progress only).
	- `docs/implementation-log.md` with the completed `CHG-XXX` entry.
	- In-app Help page content in `frontend/src/App.tsx` for any user-impacting changes.
- Do not mark processing/rebalance/implementation work complete until changelog and in-app Help updates are done.

## Status Values

- Planned
- In Progress
- On Hold
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
