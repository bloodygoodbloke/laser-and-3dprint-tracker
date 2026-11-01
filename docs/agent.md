# Agent Instructions

This file is the single place for how AI agents work in this repository: tracker files, workflow and checks.

Open work (bugs and feature requests) lives in GitHub Issues (https://github.com/bloodygoodbloke/laser-and-3dprint-tracker/issues); see `docs/github-issues.md`. Completed work is tracked in two files:

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
- Progress updates and the closing comment are posted with `gh issue comment` / `gh issue close -c`. See "GitHub issue comments are public" below.

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

## GitHub issue comments are public

Issues and comments are visible to everyone, so keep them high level. Describe what changed and how it was verified, in plain terms.

Never include in an issue, comment, commit message or PR:
- Secrets, tokens, keys, passwords, connection strings or real tenant/client IDs.
- Real email addresses (including the super admin), customer data or workspace IDs.
- Details of how authentication or authorization is enforced that could help an attacker: bypass or local-dev switches, environment variable names for auth, endpoint-level access rules, exemptions (public paths), or unfixed weaknesses.
- Exploit steps for security issues. Security fixes should say "hardened access control" rather than describe the flaw. Report suspected vulnerabilities privately (GitHub Security Advisories), not as issues.

Those details belong only in the repository docs that are not public, or are held in server configuration.

## Working With AI

- Prefer running checks in the terminal yourself (see `docs/local-testing-and-checks.md`) rather than asking the agent to, to save Copilot chat credits; ask the agent for changes and reviews.
- Make surgical changes that match existing code style; do not fix unrelated issues.
- Never commit secrets (for example `GITHUB_TOKEN`); local secrets go in `backend/.env.local`.
- Open work is read from GitHub Issues; completed work is recorded as described above.

## Notes

- `docs/CHANGELOG.md` is release history only.
- Implemented and completed tracker entries live in `docs/implementation-log.md`.
- Keep row format consistent across files so entries can be moved without rewriting.
