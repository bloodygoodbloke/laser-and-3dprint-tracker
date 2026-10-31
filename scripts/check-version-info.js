#!/usr/bin/env node

/*
 * Version info check (no running server needed).
 * Requires the backend to be built (cd backend && npm run build) and Node 22.18+/24
 * so the frontend TypeScript helpers can be imported directly.
 */

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const root = path.resolve(__dirname, "..");
const backendModule = path.join(root, "backend", "dist", "version.js");

async function main() {
  if (!fs.existsSync(backendModule)) {
    console.error("backend/dist/version.js is missing. Run `npm run build` in backend first.");
    process.exit(1);
  }
  const { getVersionInfo } = require(backendModule);
  const front = await import(pathToFileURL(path.join(root, "frontend", "src", "version.ts")).href);
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "backend", "package.json"), "utf8"));

  // Defaults (development)
  const dev = getVersionInfo({});
  assert.deepEqual(Object.keys(dev), ["version", "buildNumber", "gitCommit", "gitBranch", "buildDate", "environment"]);
  assert.equal(dev.version, pkg.version);
  assert.equal(dev.environment, "Development");
  assert.equal(dev.buildNumber, "local");

  // Environment variables
  const info = getVersionInfo({
    APP_VERSION: "0.8.0",
    BUILD_NUMBER: "20261031.1545",
    GIT_COMMIT: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
    GIT_BRANCH: "main",
    BUILD_DATE: "2026-10-31T15:45:12Z",
    APP_ENVIRONMENT: "production",
  });
  assert.deepEqual(info, {
    version: "0.8.0",
    buildNumber: "20261031.1545",
    gitCommit: "a1b2c3d",
    gitBranch: "main",
    buildDate: "2026-10-31T15:45:12Z",
    environment: "Production",
  });
  assert.equal(getVersionInfo({ APP_ENVIRONMENT: "staging" }).environment, "Test");
  assert.equal(getVersionInfo({ APP_ENVIRONMENT: "nonsense" }).environment, "Development");

  // Frontend formatting
  assert.equal(front.formatVersionBadge(info), "v0.8.0 (1545)");
  assert.equal(front.formatShortBuild("local"), "local");
  assert.equal(front.formatBuildDate(info.buildDate), "31-Oct-2026 15:45 UTC");
  assert.equal(front.formatBuildDate("unknown"), "unknown");
  assert.equal(
    front.formatDeploymentInfo(info),
    [
      "MakerFlow v0.8.0",
      "",
      "Deployment Information",
      "----------------------",
      "Version: 0.8.0",
      "Build Number: 20261031.1545",
      "Git Commit: a1b2c3d",
      "Branch: main",
      "Built: 31-Oct-2026 15:45 UTC",
      "Environment: Production",
    ].join("\n"),
  );
  assert.equal(front.formatUptime(93784), "1d 2h 3m");
  assert.equal(front.formatUptime(45), "45s");

  console.log("Version info check passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
