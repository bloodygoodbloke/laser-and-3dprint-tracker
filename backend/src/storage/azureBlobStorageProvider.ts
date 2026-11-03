import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import type { Readable } from "node:stream";
import { assertSafeStorageName, storageLog, type StorageService, type StoredFile } from "./types.js";

export interface AzureBlobOptions {
  container: string;
  connectionString?: string;
  accountName?: string;
}

export class AzureBlobStorageProvider implements StorageService {
  readonly provider = "azure" as const;
  readonly location: string;
  private readonly container: ContainerClient;
  private ready: Promise<void> | null = null;

  constructor(options: AzureBlobOptions) {
    let service: BlobServiceClient;
    if (options.connectionString) {
      service = BlobServiceClient.fromConnectionString(options.connectionString);
    } else if (options.accountName) {
      // Managed identity in Azure; developer credentials (az login) elsewhere.
      service = new BlobServiceClient(`https://${options.accountName}.blob.core.windows.net`, new DefaultAzureCredential());
    } else {
      throw new Error("Azure storage needs AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT.");
    }
    this.container = service.getContainerClient(options.container);
    this.location = `${options.accountName || service.accountName}/${options.container}`;
  }

  private async ensureContainer() {
    this.ready ??= this.container
      .createIfNotExists()
      .then(() => undefined)
      .catch((error) => {
        // Not fatal: the container may already exist while the identity lacks create permission.
        storageLog("could not create blob container (continuing)", { location: this.location, error: String(error?.message || error) });
      });
    await this.ready;
  }

  async put(name: string, data: Buffer, contentType?: string) {
    assertSafeStorageName(name);
    await this.ensureContainer();
    await this.container.getBlockBlobClient(name).uploadData(data, {
      blobHTTPHeaders: contentType ? { blobContentType: contentType } : undefined,
    });
    storageLog("blob uploaded", { name, bytes: data.length, location: this.location });
  }

  async get(name: string): Promise<StoredFile | null> {
    assertSafeStorageName(name);
    try {
      const response = await this.container.getBlobClient(name).download();
      storageLog("blob downloaded", { name, bytes: response.contentLength, location: this.location });
      return { stream: response.readableStreamBody as Readable, size: response.contentLength };
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 404) return null;
      storageLog("blob download failed", { name, location: this.location, error: String((error as Error)?.message || error) });
      throw error;
    }
  }

  async exists(name: string) {
    assertSafeStorageName(name);
    return this.container.getBlobClient(name).exists();
  }

  async delete(name: string) {
    assertSafeStorageName(name);
    await this.container.getBlobClient(name).deleteIfExists();
    storageLog("blob deleted", { name, location: this.location });
  }

  async list() {
    const names: string[] = [];
    for await (const blob of this.container.listBlobsFlat()) names.push(blob.name);
    return names;
  }
}
