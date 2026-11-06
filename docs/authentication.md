# Authentication and access (issue #26)

The backend requires a signed-in user for everything except `GET /api/health` and `GET /api/version`. This includes `/api/*`, `/uploads/*` and `/makerworld-test`.

## How it works

- Sign-in is handled by Microsoft Entra (a separate MakerFlow email and password account at launch; Google, Apple and others are tracked in #35). The browser sends the token as `Authorization: Bearer <token>`; the backend verifies the signature, issuer and audience, then maps the user to a workspace.
- Access is by invitation or approval. A first-time sign-in with no matching invite gets `403` until one exists. Add a row to the `Invite` table (email, workspaceId, role) to let someone in; it is consumed on their first sign-in.
- Emails in `SUPER_ADMIN_EMAILS` are super admins: on first sign-in they become `Owner` of the first workspace and get **Admin > User access**. This is set on the server only, so it cannot be changed from the app. Emails in `OWNER_EMAILS` also become `Owner` on first sign-in, without super admin rights.
- All existing data belongs to the first workspace. Its ID is randomly generated and is shown in **Billing**.
- **Admin > User access** (super admin only) lists people waiting for approval, open invitations and current users. You can invite by email, approve a waiting user, cancel an invite and remove access.
- The sign-in page shows only the MakerFlow logo; business name and logo are workspace settings and appear after sign-in. Signed-in users have a **Log out** button in the header.
- If the Entra settings are missing the protected routes return `503` (fail closed). `AUTH_DISABLED=true` skips authentication and is ignored when `NODE_ENV=production`.
- CORS is limited to `CORS_ORIGIN` (none in production). Bearer tokens are not sent automatically by browsers, so classic CSRF does not apply.

## Permissions

- **Staff** can use the regular workshop APIs, including jobs, customers, materials, uploads, equipment and billing settings.
- **Owner** can also use all admin backup exports, restores and storage checks, import materials from CSV, and seed materials. These checks are enforced by the API, including the legacy materials restore endpoint.
- **User access management** additionally requires the server-configured super-admin flag. A super admin with a Staff membership does not have Owner permissions.
- Keep at least one configured super admin with an Owner membership. If all super admins are Staff, an operator with database access must restore an Owner membership before access management can be used again.
- Membership roles other than `Owner` and `Staff` are rejected. New privileged routes must apply an explicit permission check; placing a route behind authentication alone is not sufficient.
- Workshop data is not yet isolated by workspace. Until #36 is implemented, backups and other workshop APIs operate on the shared data.

## Settings

| Variable | Purpose |
| --- | --- |
| `ENTRA_ISSUER` | Token issuer of the External ID tenant |
| `ENTRA_JWKS_URI` | The tenant's signing-key (JWKS) URL |
| `ENTRA_CLIENT_ID` | App registration client ID (token audience) |
| `SUPER_ADMIN_EMAILS` | Super admin email(s) |
| `OWNER_EMAILS` | Extra bootstrap owner emails |
| `CORS_ORIGIN` | Allowed browser origins |

## Frontend settings

Set in `frontend/.env.local` (build-time): `VITE_ENTRA_CLIENT_ID` and `VITE_ENTRA_AUTHORITY` (for example `https://login.microsoftonline.com/<tenant-id>`; an External ID customer tenant uses `https://<tenant>.ciamlogin.com/<tenant-id>` instead, with the matching `ENTRA_ISSUER` and `ENTRA_JWKS_URI`). The app sends the signed-in user's ID token to the API, so the Entra app registration should include the optional `email` claim in the ID token. Directory accounts often have no `email` claim, so the backend falls back to the sign-in name (`preferred_username`); list that name in `SUPER_ADMIN_EMAILS` or invite it. Without these settings the app only works against a backend with `AUTH_DISABLED=true`.

For local development, use the repository's `start-local.sh` launcher. It explicitly enables `AUTH_DISABLED=true` for the local backend and clears the frontend's Entra settings for that Vite process, so stale production Entra values in `frontend/.env.local` do not make localhost show a broken sign-in screen. This override is local to the launcher; production sets `NODE_ENV=production`, where `AUTH_DISABLED` is ignored. If you run frontend/backend commands separately, configure the same local-only values yourself: backend `AUTH_DISABLED=true` and `NODE_ENV=development`, and unset `VITE_ENTRA_CLIENT_ID` / `VITE_ENTRA_AUTHORITY` for Vite. To test Entra locally instead, configure the backend's `ENTRA_ISSUER`, `ENTRA_JWKS_URI` and `ENTRA_CLIENT_ID` to match the frontend.

## Uploads

Files under `/uploads` require sign-in. Because plain links and `<img>` tags cannot send the token, job file previews, Open file and Download file fetch the file with the token and show it from a temporary in-memory URL (`frontend/src/JobFilePreview.tsx`). Do not link to `/uploads/...` directly from the UI.

Uploads are limited to 10 MB and the server accepts SVG, STL, PNG, JPG/JPEG, WebP and GIF files. The backend checks both the filename extension and file contents; the browser's `accept` attribute and the supplied MIME type are not trusted. SVG content is rejected if it contains scripts, event handlers, active embedded elements, or external references. SVG responses use `nosniff`, a restrictive sandbox Content Security Policy and attachment disposition; the UI previews SVG through an authenticated fetch rather than a direct same-origin link. Files remain in memory until validation succeeds, then are written under a generated UUID filename. Rejected files are never written to disk, and a file is removed if saving its job reference fails.

Focused checks cover accepted SVG/STL/image signatures, unsupported extensions, mismatched contents, unsafe SVG, empty files and the size limit. Run `npm run test:upload` from `backend/`.

## Production

- Set GitHub repository variables `ENTRA_CLIENT_ID`, `ENTRA_AUTHORITY`, `ENTRA_ISSUER` and `ENTRA_JWKS_URI`. The deploy workflow passes the first two to the Docker build as `VITE_ENTRA_*`, and sets `ENTRA_CLIENT_ID`, `ENTRA_ISSUER` and `ENTRA_JWKS_URI` on the Container App. The issuer and JWKS URI must match the configured tenant's OpenID Connect metadata.
- The Container App also needs `SUPER_ADMIN_EMAILS` and `CORS_ORIGIN` for production access management and cross-origin deployments. `NODE_ENV=production` is already set, so `AUTH_DISABLED` is ignored. The deploy workflow fails before updating the app if any backend token-verification variable is missing.
- Register the production URL as a **Single-page application** redirect URI. Plain http is only accepted for `localhost`, so use `http://localhost:5173` locally, not `127.0.0.1`.

## Not done yet

- Per-workspace data (`workspaceId` on business tables), workspace-scoped uploads and backups.

Tests: `npm run test:auth` from `backend/`.
