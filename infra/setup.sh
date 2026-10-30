#!/usr/bin/env bash
# One-time provisioning for MakerFlow persistence + GitHub OIDC. Run in Azure CLI (bash) as an Owner/User Access Admin.
set -euo pipefail

SUB=$(az account show --query id -o tsv)
RG=ACA-WST                              # MakerFlow app resource group
APP=workshoptrack
ENV=managedEnvironment-ACAWST-8b85      # ACA environment (Consumption, no VNet)
LOC=ukwest                              # MUST match the ACA environment region
ACR=makerflowacr
ACR_RG=ACA-WST
STORAGE=makerflowdbstd$RANDOM           # new Standard account (acamakerflowdb is Premium = costly)
SHARE=makerflow-data
GH_REPO=bloodygoodbloke/laser-and-3dprint-tracker

# 1. Cheap storage: Standard LRS, StorageV2, hardened (no anonymous blob, TLS1.2, https only)
az storage account create -n "$STORAGE" -g "$RG" -l "$LOC" --kind StorageV2 --sku Standard_LRS \
  --access-tier Hot --allow-blob-public-access false --min-tls-version TLS1_2 --https-only true

# 2. Azure File Share (SMB), 5 GiB quota; Standard shares bill on used capacity
az storage share-rm create --storage-account "$STORAGE" -g "$RG" -n "$SHARE" --quota 5 --enabled-protocols SMB

# 3. ACA environment storage (Azure Files only supports account-key auth)
KEY=$(az storage account keys list -n "$STORAGE" -g "$RG" --query "[0].value" -o tsv)
az containerapp env storage set -n "$ENV" -g "$RG" --storage-name makerflow-data \
  --azure-file-account-name "$STORAGE" --azure-file-account-key "$KEY" \
  --azure-file-share-name "$SHARE" --access-mode ReadWrite

# 4. Managed identity on the app + AcrPull so no registry password is needed
az containerapp identity assign -n "$APP" -g "$RG" --system-assigned
PID=$(az containerapp show -n "$APP" -g "$RG" --query identity.principalId -o tsv)
ACR_ID=$(az acr show -n "$ACR" -g "$ACR_RG" --query id -o tsv)
az role assignment create --assignee-object-id "$PID" --assignee-principal-type ServicePrincipal \
  --role AcrPull --scope "$ACR_ID"
sleep 30   # role propagation
ACR_SERVER=$(az acr show -n "$ACR" -g "$ACR_RG" --query loginServer -o tsv)
az containerapp registry set -n "$APP" -g "$RG" --server "$ACR_SERVER" --identity system

# 5. Ingress port (app listens on 4000) and apply volume/mount/env/scale
az containerapp ingress update -n "$APP" -g "$RG" --target-port 4000
export IMAGE=$(az containerapp show -n "$APP" -g "$RG" --query "properties.template.containers[0].image" -o tsv)
envsubst < infra/containerapp.yaml > /tmp/containerapp.rendered.yaml
az containerapp update -n "$APP" -g "$RG" --yaml /tmp/containerapp.rendered.yaml

# 6. GitHub OIDC: app registration + federated credential for pushes to main (no secrets stored)
APP_ID=$(az ad app create --display-name "makerflow-github-deploy" --query appId -o tsv)
az ad sp create --id "$APP_ID" >/dev/null
az ad app federated-credential create --id "$APP_ID" --parameters "{
  \"name\": \"github-main\",
  \"issuer\": \"https://token.actions.githubusercontent.com\",
  \"subject\": \"repo:${GH_REPO}:ref:refs/heads/main\",
  \"audiences\": [\"api://AzureADTokenExchange\"]}"
APP_ID_OBJ=$(az ad sp show --id "$APP_ID" --query id -o tsv)
# Least privilege: push to ACR, update only this container app
az role assignment create --assignee-object-id "$APP_ID_OBJ" --assignee-principal-type ServicePrincipal \
  --role AcrPush --scope "$ACR_ID"
# Reader lets `az acr login` resolve the registry by name in CI
az role assignment create --assignee-object-id "$APP_ID_OBJ" --assignee-principal-type ServicePrincipal \
  --role Reader --scope "$ACR_ID"
az role assignment create --assignee-object-id "$APP_ID_OBJ" --assignee-principal-type ServicePrincipal \
  --role Contributor --scope "$(az containerapp show -n "$APP" -g "$RG" --query id -o tsv)"

echo "Add these GitHub repo secrets:"
echo "  AZURE_CLIENT_ID=$APP_ID"
echo "  AZURE_TENANT_ID=$(az account show --query tenantId -o tsv)"
echo "  AZURE_SUBSCRIPTION_ID=$SUB"
