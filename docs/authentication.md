# Authentication and access (issue #26)

The backend requires a signed-in user for everything except `GET /api/health` and `GET /api/version`. This includes `/api/*`, `/uploads/*` and `/makerworld-test`.

## How it works

- Sign-in is handled by Microsoft Entra (a separate MakerFlow email and password account at launch; Google, Apple and others are tracked in #35). The browser sends the token as `Authorization: Bearer <token>`; the backend verifies the signature, issuer and audience, then maps the user to a workspace.
- Access is by invitation or approval. A first-time sign-in with no matching invite gets `403` until one exists. Add a row to the `Invite` table (email, workspaceId, role) to let someone in; it is consumed on their first sign-in.
- Emails in `SUPER_ADMIN_EMAILS` are super admins: on first sign-in they become `Owner` of the first workspace and get **Admin > User access**. This is set on the server only, so it cannot be changed from the app. Emails in `OWNER_EMAILS` also become `Owner` on first sign-in, without super admin rights.
- All existing data belongs to the first workspace. Its ID is randomly generated and is shown in **Billing**.
- **Admin > User access** (super admin only) lists people waiting for approval, open invitations and current users. You can invite by email, approve a waiting user, cancel an invite and remove access.
- The sign-in page shows the MakerFlow logo and the business name/logo (served by the public `GET /api/branding`). Signed-in users have a **Log out** button in the header.
- If the Entra settings are missing the protected routes return `503` (fail closed). `AUTH_DISABLED=true` skips authentication and is ignored when `NODE_ENV=production`.
- CORS is limited to `CORS_ORIGIN` (none in production). Bearer tokens are not sent automatically by browsers, so classic CSRF does not apply.

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

## Uploads

Files under `/uploads` require sign-in. Because plain links and `<img>` tags cannot send the token, job file previews, Open file and Download file fetch the file with the token and show it from a temporary in-memory URL (`frontend/src/JobFilePreview.tsx`). Do not link to `/uploads/...` directly from the UI. File type and content validation is still tracked in #25.

## Production

- GitHub repository variables `ENTRA_CLIENT_ID` and `ENTRA_AUTHORITY` are passed to the Docker build as `VITE_ENTRA_*` (see `makerflow-deploy.yml`).
- The Container App needs `ENTRA_CLIENT_ID`, `ENTRA_ISSUER`, `ENTRA_JWKS_URI`, `SUPER_ADMIN_EMAILS` and `CORS_ORIGIN`. `NODE_ENV=production` is already set, so `AUTH_DISABLED` is ignored.
- Register the production URL as a **Single-page application** redirect URI. Plain http is only accepted for `localhost`, so use `http://localhost:5173` locally, not `127.0.0.1`.

## Not done yet

- Per-workspace data (`workspaceId` on business tables), workspace-scoped uploads and backups.

Tests: `npm run test:auth` from `backend/`.
