#!/usr/bin/env node
/**
 * Offline compliance scan over Claude Code transcripts.
 *
 * Dispatch rates answered "did a workflow load". This answers the harder
 * half — whether loading it changed anything: did the artifact appear, did
 * a verification actually run before the claim, did the chain run in
 * order. Read-only, Node builtins only, no plugin runtime and no MCP tool:
 * it reads transcripts that already exist and prints what it found.
 *
 * Usage:
 *   node compliance-scan.mjs <transcript.jsonl | directory> [--json]
 *     [--artifact <substring>]   repeatable; default: plan · TODO · ledger
 *     [--verify <substring>]     repeatable; default: test · typecheck ·
 *                                lint · build · vitest · jest · pytest
 *
 * A directory is scanned recursively, so a session directory with its
 * `subagents/agent-*.jsonl` files reports the parent and each subagent as
 * separate runs — which is the unit the D7 measurements counted in.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join } from "node:path";

const SKILL_TOOL = "Skill";
const MUTATING_TOOLS = new Set(["Write", "Edit", "NotebookEdit"]);
const SEIRI_PREFIX = "seiri:";

/** Phrases that make a turn a completion claim, and thus owe a verification. */
const CLAIM_PATTERNS = [
  /\b(all\s+)?tests?\s+pass(ing|ed)?\b/i,
  /\bis\s+(now\s+)?(done|fixed|working|complete)\b/i,
  /\b(implementation|work|task|change)\s+is\s+complete\b/i,
  /완료(했|됐|되었|입니다|했습니다)/,
  /(수정|해결)(했습니다|됐습니다|완료)/,
];

const DEFAULT_ARTIFACT_HINTS = ["plan", "todo", "ledger"];
const DEFAULT_VERIFY_HINTS = [
  "test",
  "typecheck",
  "tsc",
  "lint",
  "build",
  "vitest",
  "jest",
  "pytest",
];

main();

function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.target === undefined) {
    process.stderr.write(
      "usage: node compliance-scan.mjs <transcript.jsonl | directory> [--json]\n",
    );
    process.exit(2);
  }

  const runs = collectTranscripts(options.target).map((file) =>
    scanRun(file, options),
  );
  process.stdout.write(
    options.json ? `${JSON.stringify(runs, null, 2)}\n` : renderReport(runs),
  );
}

function parseArguments(argv) {
  const options = {
    target: undefined,
    json: false,
    artifacts: [],
    verifies: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--json") options.json = true;
    else if (argument === "--artifact") options.artifacts.push(argv[++index]);
    else if (argument === "--verify") options.verifies.push(argv[++index]);
    else options.target ??= argument;
  }

  if (options.artifacts.length === 0)
    options.artifacts = DEFAULT_ARTIFACT_HINTS;
  if (options.verifies.length === 0) options.verifies = DEFAULT_VERIFY_HINTS;
  return options;
}

function collectTranscripts(target) {
  if (!statSync(target).isDirectory()) return [target];

  const found = [];
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    const path = join(target, entry.name);
    if (entry.isDirectory()) found.push(...collectTranscripts(path));
    else if (entry.name.endsWith(".jsonl")) found.push(path);
  }
  return found.sort();
}

/** One transcript → the ordered events the checks are computed from. */
function readEvents(file, options) {
  const events = [];

  for (const line of readFileSync(file, "utf8").split("\n")) {
    if (line.trim() === "") continue;

    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue; // A truncated tail is normal on a live session.
    }
    if (record?.type !== "assistant") continue;

    const at = record.timestamp;
    for (const block of record.message?.content ?? []) {
      if (block?.type === "text") {
        if (CLAIM_PATTERNS.some((pattern) => pattern.test(block.text ?? "")))
          events.push({ kind: "claim", at, detail: firstClaim(block.text) });
        continue;
      }
      if (block?.type !== "tool_use") continue;
      events.push(toolEvent(block, at, options));
    }
  }

  return events.filter(Boolean);
}

function toolEvent(block, at, options) {
  const { name, input } = block;

  if (
    name === SKILL_TOOL &&
    String(input?.skill ?? "").startsWith(SEIRI_PREFIX)
  )
    return {
      kind: "skill",
      at,
      detail: String(input.skill).slice(SEIRI_PREFIX.length),
    };

  if (MUTATING_TOOLS.has(name)) {
    const path = String(input?.file_path ?? input?.notebook_path ?? "");
    const artifact = options.artifacts.some((hint) =>
      basename(path).toLowerCase().includes(hint.toLowerCase()),
    );
    return { kind: artifact ? "artifact" : "mutate", at, detail: path };
  }

  if (name === "Bash") {
    const command = String(input?.command ?? "");
    const verifies = options.verifies.some((hint) => command.includes(hint));
    return verifies ? { kind: "verify-run", at, detail: command } : undefined;
  }

  return undefined;
}

function firstClaim(text) {
  for (const pattern of CLAIM_PATTERNS) {
    const match = pattern.exec(text ?? "");
    if (match) return match[0];
  }
  return "";
}

/** The four checks, computed from one run's events. */
function scanRun(file, options) {
  const events = readEvents(file, options);
  const skills = events.filter((event) => event.kind === "skill");
  const artifacts = events.filter((event) => event.kind === "artifact");

  return {
    file,
    dispatched: skills.map((event) => event.detail),
    artifacts: [...new Set(artifacts.map((event) => event.detail))],
    claims: claimChecks(events),
    order: orderViolations(events),
  };
}

/**
 * Every completion claim, and whether a verification ran between the last
 * file it changed and the claim itself. A verification older than the
 * change it certifies is the failure this check exists to name.
 */
function claimChecks(events) {
  return events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => event.kind === "claim")
    .map(({ event, index }) => {
      const before = events.slice(0, index);
      const lastChange = lastIndexOfKinds(before, ["mutate", "artifact"]);
      const lastVerify = lastIndexOfKinds(before, ["verify-run"]);
      return {
        claim: event.detail,
        at: event.at,
        verifiedFresh: lastVerify > lastChange,
        verifyRan: lastVerify >= 0,
        verifyElected: before.some(
          (candidate) =>
            candidate.kind === "skill" && candidate.detail === "verify",
        ),
      };
    });
}

/**
 * Chain order, stated as the pairs that cannot legally invert. Reported,
 * never enforced: a deviation with a stated reason is the model's to make,
 * and this tool only says which ones happened.
 */
function orderViolations(events) {
  const pairs = [
    ["execute", "write-plan"],
    ["request-review", "verify"],
    ["receive-review", "request-review"],
  ];
  const firstSeen = new Map();
  for (const [index, event] of events.entries())
    if (event.kind === "skill" && !firstSeen.has(event.detail))
      firstSeen.set(event.detail, index);

  return pairs
    .filter(([later, earlier]) => {
      const laterAt = firstSeen.get(later);
      const earlierAt = firstSeen.get(earlier);
      return laterAt !== undefined && (earlierAt ?? Infinity) > laterAt;
    })
    .map(([later, earlier]) => `${later} ran without ${earlier} before it`);
}

function lastIndexOfKinds(events, kinds) {
  for (let index = events.length - 1; index >= 0; index -= 1)
    if (kinds.includes(events[index].kind)) return index;
  return -1;
}

function renderReport(runs) {
  const lines = [];

  for (const run of runs) {
    lines.push(`## ${run.file}`);
    lines.push(
      `dispatch: ${run.dispatched.length === 0 ? "(none)" : run.dispatched.join(" → ")}`,
    );
    lines.push(
      `artifacts: ${run.artifacts.length === 0 ? "(none)" : run.artifacts.join(", ")}`,
    );

    for (const claim of run.claims)
      lines.push(
        `claim "${claim.claim}" @ ${claim.at}: verify elected=${claim.verifyElected} ran=${claim.verifyRan} fresh=${claim.verifiedFresh}`,
      );
    if (run.claims.length === 0) lines.push("claims: (none)");

    for (const violation of run.order) lines.push(`order: ${violation}`);
    lines.push("");
  }

  const claims = runs.flatMap((run) => run.claims);
  lines.push("## totals");
  lines.push(`runs: ${runs.length}`);
  lines.push(
    `runs that dispatched at least one workflow: ${runs.filter((run) => run.dispatched.length > 0).length}`,
  );
  lines.push(
    `claims backed by a fresh verification: ${claims.filter((claim) => claim.verifiedFresh).length}/${claims.length}`,
  );
  lines.push(
    `order violations: ${runs.reduce((total, run) => total + run.order.length, 0)}`,
  );

  return `${lines.join("\n")}\n`;
}
