#!/usr/bin/env node

/*
 * Local API smoke check.
 * Verifies health and key data endpoints, then runs calculate-cost on
 * the first available job if one exists.
 */

const API_BASE = process.env.API_BASE || "http://127.0.0.1:4000";
const endpoints = [
  "health",
  "jobs",
  "materials",
  "customers",
  "suppliers",
  "billing-settings",
  "bambu/dashboard",
];

async function getJson(path) {
  const res = await fetch(`${API_BASE}/api/${path}`);
  const bodyText = await res.text();
  let parsed;
  try {
    parsed = bodyText ? JSON.parse(bodyText) : null;
  } catch (_error) {
    parsed = bodyText;
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

async function postJson(path, payload) {
  const res = await fetch(`${API_BASE}/api/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const bodyText = await res.text();
  let parsed;
  try {
    parsed = bodyText ? JSON.parse(bodyText) : null;
  } catch (_error) {
    parsed = bodyText;
  }
  return { ok: res.ok, status: res.status, body: parsed };
}

async function main() {
  console.log(`Running API smoke checks against ${API_BASE}`);

  for (const endpoint of endpoints) {
    const result = await getJson(endpoint);
    if (!result.ok) {
      console.error(`FAIL ${endpoint} -> HTTP ${result.status}`);
      console.error(result.body);
      process.exit(1);
    }
    console.log(`PASS ${endpoint} -> HTTP ${result.status}`);
  }

  const jobsResult = await getJson("jobs");
  const jobs = Array.isArray(jobsResult.body) ? jobsResult.body : [];

  if (!jobs.length) {
    console.log("SKIP calculate-cost -> no jobs available");
    console.log("API smoke checks passed.");
    return;
  }

  const job = jobs[0];
  const machineRunTimeMinutes = Number(job.machineRunTimeMinutes ?? job.estTimeMinutes ?? 60);
  const labourTimeMinutes = Number(job.labourTimeMinutes ?? job.estTimeMinutes ?? 30);
  const calcPayload = {
    mode: String((job.machineType || "").toLowerCase()).includes("laser") ? "laser" : "3d",
    machineName: job.machineType || "Other",
    machineRunTimeMinutes,
    labourTimeMinutes,
    isRush: Boolean(job.isRush),
    materials: Array.isArray(job.materials)
      ? job.materials.map((entry) => ({
          materialId: entry.materialId,
          usageQuantity: entry.usageQuantity,
          usageUnit: entry.usageUnit,
          usageUnitCost: entry.usageUnitCost,
          material: entry.material ? { type: entry.material.type } : undefined,
        }))
      : [],
  };

  const calcResult = await postJson(`jobs/${job.id}/calculate-cost`, calcPayload);
  if (!calcResult.ok) {
    console.error(`FAIL calculate-cost -> HTTP ${calcResult.status}`);
    console.error(calcResult.body);
    process.exit(1);
  }

  const hasTotal = calcResult.body && typeof calcResult.body.totalCost === "number";
  if (!hasTotal) {
    console.error("FAIL calculate-cost -> missing totalCost in response");
    console.error(calcResult.body);
    process.exit(1);
  }

  console.log(`PASS calculate-cost -> HTTP ${calcResult.status}`);
  console.log("API smoke checks passed.");
}

main().catch((error) => {
  console.error("FAIL API smoke checks -> unhandled error");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
