#!/usr/bin/env node
/**
 * verify-cron-import.js
 *
 * Diffs cron/jobs.json (source of truth) against the live openclaw
 * gateway's cron store. Prints:
 *   - total in jobs.json
 *   - total in gateway
 *   - in jobs.json but NOT in gateway (the drift)
 *   - per-job reason for missing (if validator rejects)
 *
 * Use this to (a) confirm a fix landed and (b) catch drift if jobs.json
 * changes without a reimport.
 *
 * Exit codes:
 *   0  jobs.json ⊆ gateway (every job in jobs.json is also in gateway)
 *   1  drift detected — print the missing jobs and exit
 */

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const OPENCLAW_HOME = process.env.OPENCLAW_HOME || "/Users/redinside/.openclaw";
const JOBS_JSON = path.join(OPENCLAW_HOME, "cron", "jobs.json");

const data = JSON.parse(fs.readFileSync(JOBS_JSON, "utf8"));
const srcIds = new Set(data.jobs.map((j) => j.id));

const live = JSON.parse(
  execSync("openclaw cron list --json", { encoding: "utf8" })
);
const liveIds = new Set(live.jobs.map((j) => j.id));

const missing = [...srcIds].filter((id) => !liveIds.has(id));
const extra = [...liveIds].filter((id) => !srcIds.has(id));

// Load validator from the openclaw dist
const storeMod = await import(
  "/opt/homebrew/lib/node_modules/openclaw/dist/store-BVkTHOZT.js"
);
const getInvalidReason = storeMod.p;

console.log(`jobs.json:        ${srcIds.size} jobs`);
console.log(`live gateway:     ${liveIds.size} jobs`);
console.log(`drift (src-live): ${missing.length}`);
console.log(`extra (live-src): ${extra.length}`);

if (missing.length > 0) {
  console.log("\nMISSING FROM GATEWAY:");
  for (const id of missing) {
    const job = data.jobs.find((j) => j.id === id);
    const reason = getInvalidReason(job);
    const detail = reason
      ? `INVALID: ${reason} (payload.kind=${job.payload.kind})`
      : `valid (payload.kind=${job.payload.kind}) — not in gateway for unknown reason`;
    console.log(`  ${id.padEnd(40)} ${detail}`);
  }
  process.exit(1);
}

if (extra.length > 0) {
  console.log("\nEXTRA IN GATEWAY (not in jobs.json):");
  for (const id of extra) console.log(`  ${id}`);
}

console.log("\n✅ no drift");
process.exit(0);
