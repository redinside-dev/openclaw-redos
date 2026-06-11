#!/usr/bin/env node
/**
 * cron-reimport.js
 *
 * One-shot converter: reads cron/jobs.json (legacy 2026.5.27 format) and
 * writes the jobs into the cron_jobs SQLite table that 2026.6.1 reads
 * from. Uses the daemon's own `saveCronJobsStore` so all normalization,
 * validation, and column bindings are done by the same code the gateway
 * uses at runtime.
 *
 * Idempotent: deletes any existing rows for the same store_key before
 * inserting. Safe to re-run.
 *
 * Run with the gateway STOPPED so we don't race the daemon's writer.
 *
 * Created: 2026-06-04 — pin to 2026.6.1, restore 71 jobs from
 *   legacy JSON that 5.27 used to read.
 */

import fs from "node:fs";
import path from "node:path";

const OPENCLAW_HOME = process.env.OPENCLAW_HOME || "/Users/redinside/.openclaw";
const JOBS_JSON = path.join(OPENCLAW_HOME, "cron", "jobs.json");
const JOBS_STATE_JSON = path.join(OPENCLAW_HOME, "cron", "jobs-state.json");

// Bundler hash for the daemon's cron store module. Update if openclaw is
// upgraded and the file no longer exists at this path.
const STORE_MODULE = "/opt/homebrew/lib/node_modules/openclaw/dist/store-BVkTHOZT.js";

async function main() {
  if (!fs.existsSync(JOBS_JSON)) {
    console.error(`[FATAL] ${JOBS_JSON} not found. Nothing to reimport.`);
    process.exit(2);
  }
  if (!fs.existsSync(STORE_MODULE)) {
    console.error(`[FATAL] ${STORE_MODULE} not found. Daemon module path changed?`);
    process.exit(2);
  }

  console.log(`[boot] reading ${JOBS_JSON}`);
  const raw = JSON.parse(fs.readFileSync(JOBS_JSON, "utf8"));
  const jobs = Array.isArray(raw.jobs) ? raw.jobs : [];
  console.log(`[boot] ${jobs.length} jobs in source JSON`);

  // Safety: refuse to import a suspiciously small jobs.json. The production
  // cron set is ~70+ jobs; an active file with <30 means something
  // truncated/reset it. Operator should pick a backup explicitly.
  const MIN_JOBS = 30;
  if (jobs.length < MIN_JOBS) {
    console.error(
      `[FATAL] ${JOBS_JSON} has only ${jobs.length} jobs (min ${MIN_JOBS}). ` +
      `Refusing to clobber SQLite with a truncated/empty file. ` +
      `If intentional, edit MIN_JOBS in this script.`
    );
    process.exit(3);
  }

  // Merge in per-job runtime state from jobs-state.json (consecutiveErrors,
  // lastRunAtMs, lastError, etc.). 5.27 wrote state to a separate file —
  // 2026.6.1 expects it inlined on each job under the `state` key.
  let stateIndex = {};
  if (fs.existsSync(JOBS_STATE_JSON)) {
    try {
      const stateDoc = JSON.parse(fs.readFileSync(JOBS_STATE_JSON, "utf8"));
      stateIndex = (stateDoc && stateDoc.jobs) || {};
      console.log(
        `[boot] jobs-state.json has runtime state for ` +
        `${Object.keys(stateIndex).length} jobs — merging.`
      );
    } catch (e) {
      console.warn(`[warn] failed to parse ${JOBS_STATE_JSON}: ${e.message}`);
    }
  } else {
    console.log(`[info] no jobs-state.json found — all jobs will start with empty state.`);
  }
  for (const job of jobs) {
    if (stateIndex[job.id] && stateIndex[job.id].state) {
      job.state = stateIndex[job.id].state;
    }
  }

  console.log(`[boot] importing daemon cron store module: ${STORE_MODULE}`);
  // Bundler exports use single-letter names — see dist/store-BVkTHOZT.js
  // export map. m.l = saveCronJobsStore, m.t = loadCronJobsStore,
  // m.n = loadCronJobsStoreSync.
  const mod = await import(STORE_MODULE);
  if (typeof mod.l !== "function") {
    console.error(`[FATAL] saveCronJobsStore export missing in daemon module.`);
    process.exit(2);
  }
  const saveCronJobsStore = mod.l;
  const loadCronJobsStoreSync = mod.n;

  // Sanity check: do we already have rows in the SQLite table?
  let existing = null;
  try {
    existing = loadCronJobsStoreSync(JOBS_JSON);
  } catch (e) {
    console.warn(`[warn] loadCronJobsStoreSync threw: ${e.message} — proceeding anyway`);
  }
  if (existing && Array.isArray(existing.jobs) && existing.jobs.length > 0) {
    console.log(
      `[warn] SQLite cron_jobs already has ${existing.jobs.length} jobs for this store_key. ` +
      `Reimport will REPLACE all of them with the JSON contents.`
    );
  } else {
    console.log(`[info] SQLite cron_jobs is empty for this store_key — first-time import.`);
  }

  // Build the store object the daemon expects.
  const store = { version: 1, jobs };

  console.log(`[write] calling saveCronJobsStore with ${store.jobs.length} jobs...`);
  try {
    await saveCronJobsStore(JOBS_JSON, store);
  } catch (e) {
    console.error(`[FATAL] saveCronJobsStore rejected the store: ${e.message}`);
    process.exit(3);
  }

  // Verify: read back via the daemon's own loader.
  let verified = null;
  try {
    verified = loadCronJobsStoreSync(JOBS_JSON);
  } catch (e) {
    console.error(`[FATAL] post-import verification failed: ${e.message}`);
    process.exit(4);
  }
  const verifiedCount = verified?.jobs?.length ?? 0;
  console.log(`[verify] loadCronJobsStoreSync sees ${verifiedCount} jobs.`);

  if (verifiedCount !== jobs.length) {
    console.error(
      `[FATAL] round-trip count mismatch: imported ${jobs.length}, read back ${verifiedCount}. ` +
      `Check daemon logs for which jobs were dropped.`
    );
    process.exit(5);
  }

  console.log(`[ok] reimport complete: ${verifiedCount} cron jobs restored to SQLite.`);
  console.log(`[ok] restart gateway: launchctl kickstart -k gui/$(id -u)/com.openclaw.gateway`);
}

main().catch((e) => {
  console.error(`[FATAL] unhandled: ${e.stack || e.message}`);
  process.exit(1);
});
