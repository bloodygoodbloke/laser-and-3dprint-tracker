# Versioning And Deployment Diagnostics

How MakerFlow identifies exactly which build is running, locally and in Azure Container Apps.

## Version information

`GET /api/version` returns:

```json
{
  "version": "0.7.0",
  "buildNumber": "20261031.1545",
  "gitCommit": "a1b2c3d",
  "gitBranch": "main",
  "buildDate": "2026-10-31T15:45:12Z",
  "environment": "Production"
}
```

The `VersionInfo` type lives in `backend/src/version.ts` and `frontend/src/version.ts` (keep both in sync; `scripts/check-version-info.js` checks the backend shape and the frontend formatting helpers).

The values come from environment variables, with development defaults:

| Env var | Meaning | Default |
|---|---|---|
| `APP_VERSION` | Semantic version | `version` in `backend/package.json` |
| `BUILD_NUMBER` | UTC build number `YYYYMMDD.HHMM` | `local` |
| `GIT_COMMIT` | Git SHA (shown as first 7 chars) | `unknown` |
| `GIT_BRANCH` | Git branch | `unknown` |
| `BUILD_DATE` | UTC ISO timestamp | `unknown` |
| `APP_ENVIRONMENT` | `Development`, `Test` or `Production` | `Development` |

## Where it appears

- **Footer (every page):** compact `v0.7.0 (1545)` that links to Help > Deployment Information.
- **Help > Deployment Information:** full details plus a "Copy for support" button.
- **Hidden developer diagnostics:** on the Help page, click the "MakerFlow vX" heading 5 times to toggle it. It shows API connectivity and latency (`/api/health`), application uptime, the frontend bundle version (warns if it differs from the server), browser user agent and the raw version JSON.

## How version numbers are managed

The semantic version is the `version` in `backend/package.json` and `frontend/package.json`; these values and the root versions in both lockfiles must match. `npm run check:release` checks that the package versions agree and that `docs/CHANGELOG.md` has a dated `## [x.y.z] - YYYY-MM-DD` release section. Update both packages and lockfiles together, then run the tracker and release checks. CI reads `backend/package.json` and passes it as `APP_VERSION`. The frontend bundle embeds `frontend/package.json`'s version at build time.

## How build numbers are generated

The GitHub Actions workflow `.github/workflows/makerflow-deploy.yml` computes, on every run:

- `BUILD_NUMBER` = `date -u +%Y%m%d.%H%M` (UTC)
- `BUILD_DATE` = `date -u +%Y-%m-%dT%H:%M:%SZ`
- `GIT_COMMIT` = `GITHUB_SHA`, `GIT_BRANCH` = `GITHUB_REF_NAME`
- `APP_VERSION` from `backend/package.json`; `APP_ENVIRONMENT` is `Production`

They are passed to `docker build` as build args (`backend/Dockerfile` turns them into runtime env vars) and set on the Container App with `az containerapp update --set-env-vars`. The revision suffix is `g<short sha>`. The build number has minute resolution; the commit SHA disambiguates two builds in the same minute.

The standalone frontend Dockerfiles (`frontend/Dockerfile`, `frontend/Dockerfile.staging`) are not used by the Azure deployment and do not carry build metadata.

## Identify what is running in Azure

- Open the app, then Help > Deployment Information (or look at the footer).
- `curl https://<app-fqdn>/api/version`
- `az containerapp show -n workshoptrack -g ACA-WST --query "properties.template.containers[0].image"` (the image tag is the full commit SHA)
- `az containerapp revision list -n workshoptrack -g ACA-WST -o table` (revision name ends in `g<short sha>`)

## Verify a deployment succeeded

1. The GitHub Actions run is green. The "Verify deployed version" step polls `/api/version` and warns if `gitCommit` is not the pushed commit.
2. `/api/version` shows the expected `gitCommit` and `buildNumber`.
3. Help > Developer diagnostics shows API connectivity `OK` and a low uptime (the container restarted).

## Troubleshooting when GitHub and Azure versions differ

1. **Workflow failed or is still running:** check the Actions run for the commit; the `makerflow-deploy` concurrency group runs deploys one at a time.
2. **Wrong branch:** the workflow deploys pushes to `main` (or a manual run of any branch). Check `gitBranch`.
3. **Old revision still serving:** `az containerapp revision list` and confirm the latest revision is active with 100% traffic and healthy.
4. **Env vars missing/stale:** `buildNumber` of `local` or `gitCommit` of `unknown` means the build args/env vars were not applied; re-run the workflow.
5. **Browser shows an old frontend:** the diagnostics panel flags a frontend bundle version that differs from the server; hard refresh.
6. **Image mismatch:** compare the Container App image tag with the commit in GitHub.

## Checks

```
cd backend && npm run build && npm run check:version
```
