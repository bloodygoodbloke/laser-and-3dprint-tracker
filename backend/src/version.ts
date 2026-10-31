import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type AppEnvironment = "Development" | "Test" | "Production";

// Keep in sync with frontend/src/version.ts (the backend rootDir prevents a single physical shared file).
export interface VersionInfo {
  version: string;
  buildNumber: string;
  gitCommit: string;
  gitBranch: string;
  buildDate: string;
  environment: AppEnvironment;
}

const UNKNOWN = "unknown";

// The manual semantic version is the package.json version (bumped with `npm version`).
const readPackageVersion = (): string => {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../package.json"), "utf8"));
    return String(parsed.version || "").trim() || UNKNOWN;
  } catch {
    return UNKNOWN;
  }
};

const normalizeEnvironment = (value: string | undefined): AppEnvironment => {
  const v = String(value || "").trim().toLowerCase();
  if (v === "production" || v === "prod") return "Production";
  if (v === "test" || v === "staging") return "Test";
  return "Development";
};

const fromEnv = (value: string | undefined, fallback: string) => String(value || "").trim() || fallback;

// Build metadata is injected as env vars by the Docker build / Container App deployment.
export const getVersionInfo = (env: NodeJS.ProcessEnv = process.env): VersionInfo => {
  const commit = fromEnv(env.GIT_COMMIT, UNKNOWN);
  return {
    version: fromEnv(env.APP_VERSION, readPackageVersion()),
    buildNumber: fromEnv(env.BUILD_NUMBER, "local"),
    gitCommit: commit === UNKNOWN ? commit : commit.slice(0, 7),
    gitBranch: fromEnv(env.GIT_BRANCH, UNKNOWN),
    buildDate: fromEnv(env.BUILD_DATE, UNKNOWN),
    environment: normalizeEnvironment(env.APP_ENVIRONMENT),
  };
};
