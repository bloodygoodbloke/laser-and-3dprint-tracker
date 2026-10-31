import { Router } from "express";
import { getVersionInfo } from "../version.js";

const router = Router();

const DEFAULT_REPOSITORY = "bloodygoodbloke/laser-and-3dprint-tracker";
const GITHUB_API_URL = "https://api.github.com";
const ALLOWED_PRIORITIES = new Set(["P1 Critical", "P1 High", "P2 Medium", "P3 Low", "Integrations"]);
const MAX_TITLE_LENGTH = 200;
const MAX_DETAILS_LENGTH = 10000;
const MAX_BROWSER_LENGTH = 300;

type RequestType = "Bug" | "Feature Request";

// Credentials only ever come from the environment; they are never returned to the browser.
const getGitHubConfig = () => {
  const token = String(process.env.GITHUB_TOKEN || "").trim();
  const repository = String(process.env.GITHUB_REPOSITORY || DEFAULT_REPOSITORY).trim();
  const validRepository = /^[\w.-]+\/[\w.-]+$/.test(repository);
  return { token, repository, configured: Boolean(token) && validRepository };
};

const LABELS: Record<RequestType, string> = {
  Bug: "bug",
  "Feature Request": "enhancement",
};

const clean = (value: unknown, maxLength: number) => String(value ?? "").replace(/\r\n/g, "\n").trim().slice(0, maxLength);

const buildIssueBody = (details: string, requestType: RequestType, priority: string, browser: string, submittedAt: string) => {
  const info = getVersionInfo();
  return [
    "## Description",
    details,
    "",
    "## Application details",
    "| Field | Value |",
    "| --- | --- |",
    `| Request type | ${requestType} |`,
    `| Priority | ${priority} |`,
    `| App Version | ${info.version} |`,
    `| Build Number | ${info.buildNumber} |`,
    `| Environment | ${info.environment} |`,
    `| Browser | ${browser.replace(/\|/g, "/").replace(/\s+/g, " ")} |`,
    `| Date/Time | ${submittedAt} |`,
    "",
    "_Submitted from the MakerFlow Help page._",
  ].join("\n");
};

router.get("/status", (_req, res) => {
  const { configured, repository } = getGitHubConfig();
  res.json({ configured, repository: configured ? repository : null });
});

router.post("/", async (req, res) => {
  const { token, repository, configured } = getGitHubConfig();
  if (!configured) {
    return res.status(503).json({ error: "GitHub issue creation is not configured correctly. Check the server's GITHUB_TOKEN and optional GITHUB_REPOSITORY settings." });
  }

  const title = clean(req.body?.title, MAX_TITLE_LENGTH);
  const details = clean(req.body?.details, MAX_DETAILS_LENGTH);
  if (!title || !details) {
    return res.status(400).json({ error: "title and details are required" });
  }

  const requestType: RequestType = req.body?.requestType === "Bug" ? "Bug" : "Feature Request";
  const requestedPriority = clean(req.body?.priority, 40);
  const priority = ALLOWED_PRIORITIES.has(requestedPriority) ? requestedPriority : "P3 Low";
  const browser = clean(req.body?.browser, MAX_BROWSER_LENGTH) || "unknown";
  const submittedAt = new Date().toISOString();

  try {
    const response = await fetch(`${GITHUB_API_URL}/repos/${repository}/issues`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "MakerFlow",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        title: `${requestType === "Bug" ? "[Bug]" : "[Feature]"} ${title}`,
        body: buildIssueBody(details, requestType, priority, browser, submittedAt),
        labels: [LABELS[requestType]],
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { message?: string } | null;
      console.error(`GitHub issue creation failed (${response.status}): ${payload?.message || "no message"}`);
      const hint = response.status === 401 || response.status === 403 || response.status === 404
        ? "Check the GitHub token and repository permissions."
        : "Try again shortly.";
      return res.status(502).json({ error: `GitHub rejected the request (${response.status}). ${hint}` });
    }

    const issue = await response.json() as { number: number; html_url: string };
    return res.status(201).json({ number: issue.number, url: issue.html_url });
  } catch (error) {
    console.error("GitHub issue creation failed", error);
    return res.status(502).json({ error: "Could not reach GitHub. Try again shortly." });
  }
});

export default router;
