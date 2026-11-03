import path from "node:path";
import { fileURLToPath } from "node:url";
import { AzureBlobStorageProvider } from "./azureBlobStorageProvider.js";
import { LocalStorageProvider } from "./localStorageProvider.js";
import { storageLog, type StorageService } from "./types.js";

export type { StorageService } from "./types.js";

export const STORED_FILE_URL_PREFIX = "/uploads/";

const defaultUploadDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "uploads");

export const createStorageService = (env: NodeJS.ProcessEnv = process.env): StorageService => {
  const connectionString = env.AZURE_STORAGE_CONNECTION_STRING?.trim();
  const accountName = env.AZURE_STORAGE_ACCOUNT?.trim();
  const container = env.AZURE_STORAGE_CONTAINER?.trim() || "uploads";
  const requested = env.STORAGE_PROVIDER?.trim().toLowerCase();

  // Automatic detection when STORAGE_PROVIDER is unset: a connection string, or running inside
  // Azure Container Apps (CONTAINER_APP_NAME is injected by the platform) with an account name.
  const provider = requested || (connectionString || (env.CONTAINER_APP_NAME && accountName) ? "azure" : "local");

  if (provider === "azure") {
    const service = new AzureBlobStorageProvider({ container, connectionString, accountName });
    storageLog("using Azure Blob Storage", { location: service.location, auth: connectionString ? "connection string" : "managed identity" });
    return service;
  }
  if (provider !== "local") throw new Error(`Unknown STORAGE_PROVIDER "${requested}". Use "local" or "azure".`);

  // UPLOAD_DIR is the legacy name and is kept as a fallback.
  const directory = path.resolve(env.UPLOAD_PATH?.trim() || env.UPLOAD_DIR?.trim() || defaultUploadDirectory);
  const service = new LocalStorageProvider(directory);
  storageLog("using local filesystem storage", { location: service.location });
  return service;
};

export const storage: StorageService = createStorageService();

/** "/uploads/abc.png" -> "abc.png"; null for anything that is not a stored upload reference. */
export const storedNameFromPath = (filePath: string | null | undefined): string | null => {
  const value = String(filePath || "").trim();
  if (!value.startsWith(STORED_FILE_URL_PREFIX)) return null;
  const name = value.slice(STORED_FILE_URL_PREFIX.length);
  return name && !name.includes("/") ? name : null;
};

/** Returns the filePath values that are absent from storage, or null when storage cannot be listed. */
export const findMissingStoredFiles = async (filePaths: Array<string | null | undefined>): Promise<string[] | null> => {
  const referenced = filePaths.filter((value): value is string => Boolean(value && String(value).trim()));
  try {
    const present = new Set(await storage.list());
    const missing = referenced.filter((value) => {
      const name = storedNameFromPath(value);
      return !name || !present.has(name);
    });
    for (const value of missing) storageLog("missing file referenced by job", { filePath: value });
    return missing;
  } catch (error) {
    storageLog("could not list storage to check for missing files", { error: String((error as Error)?.message || error) });
    return null;
  }
};

const CONTENT_TYPES: Record<string, string> = {
  ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".gif": "image/gif", ".stl": "model/stl",
};

export const contentTypeForName = (name: string) => CONTENT_TYPES[path.extname(name).toLowerCase()] || "application/octet-stream";
