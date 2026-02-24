#!/usr/bin/env node
/**
 * Guardrails linter for OpenClaw workspaces.
 *
 * Scans:
 * - <openclawRoot>/cron/jobs.json
 * - this workspace's markdown/prompt-ish files
 *
 * For:
 * - legacy Slack schema patterns (e.g. message(action="read"), slack webhooks/curl)
 * - invalid slack targets (e.g. "#channel" or raw C123… instead of "channel:C123…")
 * - absolute host paths (e.g. /Users/<name>/..., /home/<name>/..., C:\\...)
 */

import fs from 'node:fs';
import path from 'node:path';

const here = path.dirname(new URL(import.meta.url).pathname);
const workspaceRoot = path.resolve(here, '..');
const openclawRoot = path.resolve(workspaceRoot, '..');

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function readText(p) {
  return fs.readFileSync(p, 'utf8');
}

function* walk(dir, { maxDepth = 4, depth = 0 } = {}) {
  if (depth > maxDepth) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.bak-20260210-152527') continue;
      yield* walk(p, { maxDepth, depth: depth + 1 });
    } else if (e.isFile()) {
      yield p;
    }
  }
}

function findMatchesByLine(text, regex) {
  const lines = text.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    regex.lastIndex = 0;
    while ((m = regex.exec(line))) {
      hits.push({ line: i + 1, col: m.index + 1, match: m[0] });
      // avoid infinite loops with zero-length matches
      if (m.index === regex.lastIndex) regex.lastIndex++;
    }
  }
  return hits;
}

function formatErr({ file, line, col, code, msg, snippet }) {
  const loc = line ? `${file}:${line}:${col ?? 1}` : file;
  return `${loc}\n  [${code}] ${msg}${snippet ? `\n  → ${snippet.trim()}` : ''}`;
}

function lintFile(file, text) {
  const errors = [];

  // 1) Absolute host paths
  const absPathRegexes = [
    /\/(Users|home)\/[^\s"'<>]+/g,
    /\/private\/var\/[^\s"'<>]+/g,
    /\/(opt|var)\/[^\s"'<>]+/g,
    /[A-Za-z]:\\\\(?!n)[^\s"'<>]+/g,
  ];
  for (const re of absPathRegexes) {
    for (const hit of findMatchesByLine(text, re)) {
      // Allow documentation examples like `/Users/...` or `C:\\...`
      if (hit.match.includes('...')) continue;
      errors.push(
        formatErr({
          file,
          line: hit.line,
          col: hit.col,
          code: 'ABSOLUTE_PATH',
          msg: `Absolute host path detected (${hit.match}). Use workspace-relative paths like "workspace/..." or relative paths within the workspace.`,
          snippet: text.split(/\r?\n/)[hit.line - 1],
        })
      );
    }
  }

  // 2) Legacy Slack patterns (tool/schema drift)
  const legacySlackChecks = [
    {
      re: /message\(\s*action\s*=\s*["']read["']/g,
      code: 'LEGACY_MESSAGE_READ',
      msg: 'Legacy message(action="read") detected. The message tool no longer supports action="read". Remove/replace this step (only send/edit/delete/react/topic-create are supported).',
    },
    {
      re: /message\(\s*action\s*=\s*["']search["']/g,
      code: 'LEGACY_MESSAGE_SEARCH',
      msg: 'Legacy message(action="search") detected. The message tool in this environment does not support action="search".',
    },
    {
      re: /(hooks\.slack\.com\/services\/|slack\.com\/api\/chat\.postMessage)/g,
      code: 'SLACK_WEBHOOK_OR_API',
      msg: 'Direct Slack webhook/API usage detected. Prefer the unified message tool instead of curl/webhooks to avoid credential/schema drift.',
    },
    {
      re: /\bexec\b[^\n]*\bcurl\b[^\n]*(slack|hooks\.slack\.com)/gi,
      code: 'SLACK_CURL',
      msg: 'Slack via exec+cURL detected. Prefer message(action="send", channel="slack", target="channel:<ID>").',
    },
  ];
  for (const chk of legacySlackChecks) {
    for (const hit of findMatchesByLine(text, chk.re)) {
      errors.push(
        formatErr({
          file,
          line: hit.line,
          col: hit.col,
          code: chk.code,
          msg: chk.msg,
          snippet: text.split(/\r?\n/)[hit.line - 1],
        })
      );
    }
  }

  // 3) Slack target format guardrail
  // We want: target="channel:C0...." (or user:..., etc). Flag #channel and raw C0... without channel: prefix.
  const slackTargetLineRegexes = [
    {
      re: /target\s*[:=]\s*["']#[^"']+["']/g,
      code: 'SLACK_TARGET_HASH',
      msg: 'Slack target uses "#channel" form. Use an explicit target like "channel:<CHANNEL_ID>" to avoid name/lookup drift.',
    },
    {
      re: /target\s*[:=]\s*["']C[0-9A-Z]{8,}["']/g,
      code: 'SLACK_TARGET_RAW_ID',
      msg: 'Slack target uses a raw channel ID (e.g. "C…"). Use "channel:C…" prefix.',
    },
  ];
  for (const chk of slackTargetLineRegexes) {
    for (const hit of findMatchesByLine(text, chk.re)) {
      errors.push(
        formatErr({
          file,
          line: hit.line,
          col: hit.col,
          code: chk.code,
          msg: chk.msg,
          snippet: text.split(/\r?\n/)[hit.line - 1],
        })
      );
    }
  }

  // 4) Legacy/unknown Slack delivery schema inside cron/jobs.json (best-effort regex)
  if (file.endsWith('cron/jobs.json')) {
    const badDeliveryKeys = [
      { re: /"slackChannelId"\s*:/g, key: 'slackChannelId' },
      { re: /"slack"\s*:\s*\{/g, key: 'slack (nested object)' },
      { re: /"webhookUrl"\s*:/g, key: 'webhookUrl' },
    ];
    for (const { re, key } of badDeliveryKeys) {
      for (const hit of findMatchesByLine(text, re)) {
        errors.push(
          formatErr({
            file,
            line: hit.line,
            col: hit.col,
            code: 'LEGACY_CRON_DELIVERY_SCHEMA',
            msg: `Potential legacy delivery schema key detected (${key}). Prefer delivery:{channel:"slack", target:"channel:<ID>", ...} and use message tool for sending.`,
            snippet: text.split(/\r?\n/)[hit.line - 1],
          })
        );
      }
    }
  }

  return errors;
}

function parseArgs(argv) {
  const args = {
    extraPaths: [],
    maxDepth: 4,
    json: false,
    strict: false,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') args.json = true;
    else if (a === '--strict') args.strict = true;
    else if (a === '--max-depth') args.maxDepth = Number(argv[++i] ?? '4');
    else if (a === '--path') args.extraPaths.push(argv[++i]);
    else if (a === '-h' || a === '--help') args.help = true;
    else args.extraPaths.push(a);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    console.log(`guardrails-lint\n\nUsage:\n  node scripts/guardrails-lint.mjs\n  node scripts/guardrails-lint.mjs --json\n  node scripts/guardrails-lint.mjs --strict\n  node scripts/guardrails-lint.mjs --path <file-or-dir> [--path <...>]\n\nOptions:\n  --max-depth <n>   Directory walk depth for workspace scan (default: 4)\n  --json            Emit machine-readable JSON result\n  --strict          Fail (non-zero exit) if issues are found outside the workspace too (e.g. ../cron/jobs.json)\n`);
    process.exit(0);
  }

  const defaultTargets = [];
  const cronJobs = path.join(openclawRoot, 'cron', 'jobs.json');
  if (isFile(cronJobs)) defaultTargets.push(cronJobs);

  // Workspace: scan markdown + prompt-ish files.
  const workspaceFiles = [];
  for (const p of walk(workspaceRoot, { maxDepth: args.maxDepth })) {
    const ext = path.extname(p).toLowerCase();
    const base = path.basename(p);
    if (base.startsWith('.')) continue;
    if (ext === '.md' || ext === '.txt' || ext === '.json') workspaceFiles.push(p);
  }

  const targets = [...defaultTargets, ...workspaceFiles, ...args.extraPaths.map((p) => path.resolve(process.cwd(), p))];

  const allFindings = [];
  for (const t of targets) {
    let stat;
    try {
      stat = fs.statSync(t);
    } catch {
      allFindings.push({ severity: 'error', text: formatErr({ file: t, code: 'MISSING_PATH', msg: 'Path does not exist.' }) });
      continue;
    }

    const addFindingsForFile = (filePath) => {
      const text = readText(filePath);
      const findings = lintFile(filePath, text);
      for (const f of findings) {
        const inWorkspace = filePath.startsWith(workspaceRoot + path.sep);
        const severity = inWorkspace ? 'error' : 'warn';
        allFindings.push({ severity, text: f, file: filePath });
      }
    };

    if (stat.isDirectory()) {
      for (const p of walk(t, { maxDepth: args.maxDepth })) {
        const ext = path.extname(p).toLowerCase();
        if (!(ext === '.md' || ext === '.txt' || ext === '.json')) continue;
        addFindingsForFile(p);
      }
    } else if (stat.isFile()) {
      addFindingsForFile(t);
    }
  }

  const errors = allFindings.filter((f) => f.severity === 'error');
  const warns = allFindings.filter((f) => f.severity === 'warn');
  const fail = errors.length > 0 || (args.strict && warns.length > 0);

  if (args.json) {
    const out = {
      ok: !fail,
      strict: args.strict,
      errorCount: errors.length,
      warnCount: warns.length,
      errors: errors.map((e) => e.text),
      warnings: warns.map((w) => w.text),
    };
    console.log(JSON.stringify(out, null, 2));
  } else {
    if (!fail) {
      console.log(`✅ guardrails-lint: OK (errors=0, warnings=${warns.length})`);
      if (warns.length) {
        console.log('\nWarnings (outside workspace):\n');
        for (const w of warns) console.log(w.text + '\n');
      }
    } else {
      console.error(`❌ guardrails-lint: errors=${errors.length}, warnings=${warns.length}${args.strict ? ' (strict)' : ''}\n`);
      if (errors.length) {
        console.error('Errors:\n');
        for (const e of errors) console.error(e.text + '\n');
      }
      if (warns.length) {
        console.error('Warnings:\n');
        for (const w of warns) console.error(w.text + '\n');
      }
    }
  }

  process.exit(fail ? 2 : 0);
}

main();
