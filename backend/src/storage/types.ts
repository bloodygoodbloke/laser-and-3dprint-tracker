import type { Readable } from "node:stream";

export interface StoredFile {
  stream: Readable;
  size?: number;
}

export interface StorageService {
  readonly provider: "local" | "azure";
  /** Human-readable location, safe to log (never includes secrets). */
  readonly location: string;
  put(name: string, data: Buffer, contentType?: string): Promise<void>;
  /** Returns null when the file does not exist. */
  get(name: string): Promise<StoredFile | null>;
  exists(name: string): Promise<boolean>;
  /** Missing files are ignored. */
  delete(name: string): Promise<void>;
  list(): Promise<string[]>;
}

// Stored names are generated as <uuid>.<ext>; anything else (paths, traversal) is rejected.
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

export const assertSafeStorageName = (name: string) => {
  if (!SAFE_NAME.test(name) || name.includes("..")) throw new Error(`Invalid storage file name: ${name}`);
};

export const storageLog = (message: string, details?: Record<string, unknown>) => {
  console.log(`[storage] ${message}`, details ? JSON.stringify(details) : "");
};
