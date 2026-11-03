import fs from "node:fs";
import path from "node:path";
import { assertSafeStorageName, storageLog, type StorageService, type StoredFile } from "./types.js";

export class LocalStorageProvider implements StorageService {
  readonly provider = "local" as const;
  readonly location: string;

  constructor(private readonly directory: string) {
    this.location = directory;
  }

  private resolve(name: string) {
    assertSafeStorageName(name);
    return path.join(this.directory, name);
  }

  async put(name: string, data: Buffer) {
    await fs.promises.mkdir(this.directory, { recursive: true });
    await fs.promises.writeFile(this.resolve(name), data, { flag: "wx" });
    storageLog("local upload saved", { name, bytes: data.length, directory: this.directory });
  }

  async get(name: string): Promise<StoredFile | null> {
    const filePath = this.resolve(name);
    try {
      const stat = await fs.promises.stat(filePath);
      return { stream: fs.createReadStream(filePath), size: stat.size };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw error;
    }
  }

  async exists(name: string) {
    try {
      await fs.promises.access(this.resolve(name));
      return true;
    } catch {
      return false;
    }
  }

  async delete(name: string) {
    try {
      await fs.promises.unlink(this.resolve(name));
      storageLog("local file deleted", { name });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }

  async list() {
    try {
      return await fs.promises.readdir(this.directory);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }
}
