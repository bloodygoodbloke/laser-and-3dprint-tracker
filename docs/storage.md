# File storage

Uploaded job files are stored through a `StorageService` (`backend/src/storage/`). The database keeps
`filePath` as `/uploads/<uuid>.<ext>`, the API serves that URL, and the app fetches it with the sign-in token.
Only the storage location changes between environments.

| Provider | Class | Used when |
|---|---|---|
| Local disk | `LocalStorageProvider` | Default for local development |
| Azure Blob Storage | `AzureBlobStorageProvider` | Azure Container Apps |

## Environment variables

| Variable | Purpose |
|---|---|
| `STORAGE_PROVIDER` | `local` or `azure`. If unset: `azure` when `AZURE_STORAGE_CONNECTION_STRING` is set, or when running in Container Apps (`CONTAINER_APP_NAME`) with `AZURE_STORAGE_ACCOUNT` set; otherwise `local`. |
| `UPLOAD_PATH` | Local directory (default `backend/uploads`). `UPLOAD_DIR` is still read as a fallback. |
| `AZURE_STORAGE_ACCOUNT` | Storage account name. Without a connection string the app uses its managed identity (or `az login` locally). |
| `AZURE_STORAGE_CONNECTION_STRING` | Optional; takes precedence over the account name. Keep it out of source control. |
| `AZURE_STORAGE_CONTAINER` | Blob container, default `uploads`. |

## Azure setup (existing deployment)

```bash
RG=ACA-WST; APP=workshoptrack; ACCOUNT=makerflowdbstd11985
az storage container create --account-name $ACCOUNT -n uploads --auth-mode login
PID=$(az containerapp show -n $APP -g $RG --query identity.principalId -o tsv)
SCOPE=$(az storage account show -n $ACCOUNT -g $RG --query id -o tsv)
az role assignment create --assignee-object-id $PID --assignee-principal-type ServicePrincipal \
  --role "Storage Blob Data Contributor" --scope $SCOPE
az containerapp update -n $APP -g $RG \
  --set-env-vars STORAGE_PROVIDER=azure AZURE_STORAGE_ACCOUNT=$ACCOUNT AZURE_STORAGE_CONTAINER=uploads
```

`infra/setup.sh` and `infra/containerapp.yaml` do the same for new environments. Role assignments can take a few minutes.
The storage account must allow the app's access (public network access, or the app's outbound IP in the firewall).

Files already uploaded to the Azure Files share (`/data/uploads`) are not moved automatically. Copy them once, keeping the names:

```bash
az storage blob upload-batch --account-name $ACCOUNT --auth-mode login -d uploads -s ./uploads
```
Run it from a folder containing a copy of the share's `uploads` directory (download it from the file share first).

## Diagnostics

Logs are prefixed `[storage]` and `[source-image]` (Container Apps log stream): provider and location at start-up,
uploads, blob downloads, deletes, requested-but-missing files, and source-image lookups and failures.

`GET /api/admin/storage/check` lists jobs whose `filePath` is not in storage. Restoring a backup runs the same
check, clears dangling references and returns them as `missingFiles`.

## Testing

- Unit: `cd backend && npm run test:storage`
- Local: start the app, upload an image to a job, confirm it previews and appears in `UPLOAD_PATH`; request `/uploads/missing.png` and expect 404 plus a `[storage] missing file` log.
- Azure: after deployment, upload an image, confirm the blob in the `uploads` container, reload the preview, then restart/redeploy the revision and confirm it still loads. Check the log stream for `blob uploaded` / `blob downloaded`.

## Source images

The "Looking for a source image..." preview is separate from uploads. It stores only a remote CDN thumbnail URL, fetched
server-side from the model site (MakerWorld's JSON API, with a browser fallback). If it fails only in Azure, the site is
probably blocking the hosting IP; look for `[source-image] ... lookup failed` in the logs. Failures are no longer cached.
