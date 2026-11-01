# Bug and feature requests (GitHub Issues)

GitHub Issues is the single place for bugs and feature requests. It replaces `docs/backlog.md`, the "Direct to backlog" toggle, the emailed help-request JSON files and the Admin "Help requests inbox".

## Raising an issue from the app

1. Open **Help** > **Raise a bug or feature request**.
2. Choose the request type (Bug or Feature Request), a priority, a short title and the details.
3. Click **Create GitHub issue**. The page then shows the issue number and a link to it.

| Request type | Label |
| --- | --- |
| Bug | `bug` |
| Feature Request | `enhancement` |

Every issue is titled `[Bug] ...` or `[Feature] ...` and its body ends with a table containing: request type, priority, App Version, Build Number, Environment, Browser and Date/Time (UTC). Version, build and environment come from the server (`GET /api/version`); the browser comes from the user's browser; the time is set by the server.

If the server has no token configured, the form shows a warning and submissions return an error instead of creating an issue.

## Server configuration

The browser never sees credentials; the backend calls the GitHub REST API (`POST /repos/{owner}/{repo}/issues`).

| Variable | Required | Purpose |
| --- | --- | --- |
| `GITHUB_TOKEN` | Yes | Fine-grained personal access token limited to this repository with **Issues: Read and write** |
| `GITHUB_REPOSITORY` | No | `owner/repo`; defaults to `bloodygoodbloke/laser-and-3dprint-tracker` |

Local development: put them in `backend/.env.local` (git-ignored; see `backend/.env.local.example`). Never commit a token.

Azure Container Apps: store the token as a Container App secret and reference it, so it is not visible in the app configuration:

```bash
az containerapp secret set -n workshoptrack -g ACA-WST --secrets github-token=<token>
az containerapp update -n workshoptrack -g ACA-WST --set-env-vars GITHUB_TOKEN=secretref:github-token
```

The deploy workflow only sets the version variables, so this setting survives deployments. Rotate the token by re-running `secret set` and restarting the revision.

## Issue templates

`.github/ISSUE_TEMPLATE/bug_report.yml` and `feature_request.yml` provide the same fields (including version, build, environment and browser) when issues are raised directly on GitHub. Blank issues are disabled.

## Troubleshooting

| Message | Likely cause |
| --- | --- |
| "GitHub issue creation is not configured" (503) | `GITHUB_TOKEN` is missing on the server |
| "GitHub rejected the request (401/403/404)" | Token expired, lacks Issues write access, or `GITHUB_REPOSITORY` is wrong |
| "Could not reach GitHub" | Outbound network problem; check container logs |

The backend logs the GitHub status and message (never the token) to the container console.
