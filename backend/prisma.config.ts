import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

const backendRoot = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(backendRoot, ".env") });
dotenv.config({ path: path.join(backendRoot, ".env.local"), override: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // Prisma 7 resolves this relative URL from this config file, under backend/.
    url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
  },
});
