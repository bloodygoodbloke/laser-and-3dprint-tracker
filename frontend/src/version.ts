export type AppEnvironment = "Development" | "Test" | "Production";

// Keep in sync with backend/src/version.ts (the backend rootDir prevents a single physical shared file).
export interface VersionInfo {
  version: string;
  buildNumber: string;
  gitCommit: string;
  gitBranch: string;
  buildDate: string;
  environment: AppEnvironment;
}

export interface HealthInfo {
  status: string;
  uptime: number;
}

// Injected at build time by vite.config.mts from frontend/package.json.
declare const __APP_VERSION__: string;

export const frontendVersion: string = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown";

export async function fetchVersionInfo(): Promise<VersionInfo> {
  const res = await fetch("/api/version", { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load version information");
  return res.json();
}

export async function fetchHealth(): Promise<HealthInfo> {
  const res = await fetch("/api/health", { cache: "no-store" });
  if (!res.ok) throw new Error(`API health check returned ${res.status}`);
  return res.json();
}

/** "20261031.1545" -> "1545" for compact display. */
export function formatShortBuild(buildNumber: string): string {
  const value = String(buildNumber || "").trim();
  return value.includes(".") ? value.slice(value.lastIndexOf(".") + 1) : value || "unknown";
}

/** "v0.7.0 (1545)" */
export function formatVersionBadge(info: VersionInfo): string {
  return `v${info.version} (${formatShortBuild(info.buildNumber)})`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-10-31T15:45:12Z" -> "31-Oct-2026 15:45 UTC". Non-dates are returned unchanged. */
export function formatBuildDate(buildDate: string): string {
  const date = new Date(buildDate);
  if (Number.isNaN(date.getTime())) return buildDate;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getUTCDate())}-${MONTHS[date.getUTCMonth()]}-${date.getUTCFullYear()} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

/** Plain-text block used by the Help page copy-to-clipboard button. */
export function formatDeploymentInfo(info: VersionInfo): string {
  return [
    `MakerFlow v${info.version}`,
    "",
    "Deployment Information",
    "----------------------",
    `Version: ${info.version}`,
    `Build Number: ${info.buildNumber}`,
    `Git Commit: ${info.gitCommit}`,
    `Branch: ${info.gitBranch}`,
    `Built: ${formatBuildDate(info.buildDate)}`,
    `Environment: ${info.environment}`,
  ].join("\n");
}

/** 93784 -> "1d 2h 3m" */
export function formatUptime(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return minutes > 0 ? `${minutes}m ${seconds % 60}s` : `${seconds}s`;
}
