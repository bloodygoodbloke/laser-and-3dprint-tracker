#!/usr/bin/env node

/*
 * Local frontend smoke check.
 * Verifies the dev server responds with the expected app title.
 */

const FRONTEND_BASE = process.env.FRONTEND_BASE || "http://127.0.0.1:5173";
const EXPECTED_TITLE = "Fabrication Workshop Tracker";

async function main() {
  console.log(`Running frontend smoke check against ${FRONTEND_BASE}`);

  const res = await fetch(FRONTEND_BASE);
  const html = await res.text();

  if (!res.ok) {
    console.error(`FAIL frontend -> HTTP ${res.status}`);
    process.exit(1);
  }

  if (!html.includes(EXPECTED_TITLE)) {
    console.error("FAIL frontend -> expected title not found in HTML");
    process.exit(1);
  }

  console.log(`PASS frontend -> HTTP ${res.status}`);
  console.log("Frontend smoke check passed.");
}

main().catch((error) => {
  console.error("FAIL frontend smoke check -> unhandled error");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
