#!/usr/bin/env node
// Summarize one benchmark pass: node measure-session.mjs <results-dir> [run ...]
// <results-dir> holds <run>/session.json, <run>/session.stream.jsonl and <run>/artifacts/review-report.md
// as written by run-skill.sh. Prints cost, wall clock, orchestrator/actor API calls, waste, source reads, verdict.
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const [root, ...runsArg] = process.argv.slice(2);
if (!root) {
  console.error("usage: measure-session.mjs <results-dir> [run ...]");
  process.exit(2);
}
const runs = runsArg.length
  ? runsArg
  : readdirSync(root)
      .filter((d) => statSync(join(root, d)).isDirectory())
      .sort();

const READ_CMD = /^(cat|sed|head|tail|less|bat|more)\b[^\n]*\bsrc\//;
const splitSegments = (command) => {
  const out = [];
  let cur = "";
  let quote = null;
  for (let i = 0; i < command.length; i++) {
    const ch = command[i];
    if (quote) {
      cur += ch;
      if (ch === "\\" && quote === '"') cur += command[++i] ?? "";
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      quote = ch;
      cur += ch;
      continue;
    }
    if (ch === "\\") {
      cur += ch + (command[++i] ?? "");
      continue;
    }
    if (ch === "\n" || ch === ";" || ch === "|" || ch === "&") {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
};
const readsSource = (command) =>
  splitSegments(String(command ?? "")).some((s) => READ_CMD.test(s.trim()));
const WASTE_READ =
  /briefs\/|reviewers\/(reviewer|verifier)\.md$|templates\.md$/;

let totalCost = 0;
let totalWall = 0;
for (const run of runs) {
  const dir = join(root, run);
  const session = JSON.parse(readFileSync(join(dir, "session.json"), "utf8"));
  const top = new Set();
  const actor = new Set();
  let waste = 0;
  let sourceReads = 0;
  for (const line of readFileSync(
    join(dir, "session.stream.jsonl"),
    "utf8",
  ).split("\n")) {
    if (!line) continue;
    const event = JSON.parse(line);
    if (event.type !== "assistant") continue;
    if (event.request_id)
      (event.parent_tool_use_id ? actor : top).add(event.request_id);
    for (const block of event.message?.content ?? []) {
      if (block.type !== "tool_use") continue;
      const input = block.input ?? {};
      if (event.parent_tool_use_id) {
        if (
          block.name === "Read" &&
          /\/src\//.test(String(input.file_path ?? ""))
        )
          sourceReads++;
        if (block.name === "Bash" && readsSource(input.command)) sourceReads++;
        continue;
      }
      if (block.name === "ScheduleWakeup") waste++;
      if (block.name === "Bash" && /^find \//.test(String(input.command ?? "")))
        waste++;
      if (
        block.name === "Read" &&
        WASTE_READ.test(String(input.file_path ?? ""))
      )
        waste++;
    }
  }
  const reportPath = join(dir, "artifacts", "review-report.md");
  const verdict = existsSync(reportPath)
    ? (readFileSync(reportPath, "utf8").match(/^verdict: (\S+)/m)?.[1] ??
      "unknown")
    : "no-report";
  const cost = session.total_cost_usd ?? 0;
  const wall = (session.wall_clock_ms ?? 0) / 1000;
  totalCost += cost;
  totalWall += wall;
  console.log(
    `${run}: cost=$${cost.toFixed(3)} wall=${Math.round(wall)}s top=${top.size} actor=${actor.size} waste=${waste} sourceReads=${sourceReads} verdict=${verdict}`,
  );
}
console.log(
  `total: cost=$${totalCost.toFixed(3)} wall=${Math.round(totalWall)}s`,
);
