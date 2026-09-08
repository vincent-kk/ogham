#!/usr/bin/env node
/**
 * CI planner: maps a change set to the workspaces whose build, test,
 * typecheck or lint result can differ, and expands that set through the
 * workspace dependency graph. Consumed by .github/workflows/ci.yml, which
 * feeds the lists to `buildAll.mjs --only`, `typecheckAll.mjs --only`,
 * `vitest run --project` and `eslint`.
 *
 * usage: node scripts/ciPlan.mjs [--base <ref>] [--head <ref>] [--full[=<reason>]] [--github-output]
 *
 *   --base / --head   Refs the change is measured between (merge base of the
 *                     two, to head). Defaults: origin/main and HEAD.
 *   --full            Skip change detection and plan every workspace.
 *   --github-output   Also append the plan to $GITHUB_OUTPUT.
 *
 * A ref that cannot be resolved (first push, force push, shallow clone)
 * degrades to a full run rather than failing.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { computeCiPlan } from "./ciPlan/computeCiPlan.mjs";
import { listChangedFiles } from "./ciPlan/listChangedFiles.mjs";
import { readWorkspaceGraph } from "./ciPlan/readWorkspaceGraph.mjs";
import { writeGithubOutput } from "./ciPlan/writeGithubOutput.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function readOption(name, fallback) {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}`));
  if (!match) return fallback;
  return match.includes("=") ? match.slice(match.indexOf("=") + 1) : true;
}

function resolveChangeSet(base, head) {
  try {
    return { changedFiles: listChangedFiles(root, base, head) };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message.split("\n")[0] : String(error);
    return { forceFull: `cannot diff ${base}...${head}: ${detail}` };
  }
}

const full = readOption("full", false);
const base = readOption("base", "origin/main");
const head = readOption("head", "HEAD");
const changeSet = full
  ? { forceFull: full === true ? "full run requested" : full }
  : resolveChangeSet(base, head);
const plan = computeCiPlan(
  readWorkspaceGraph(root),
  changeSet.changedFiles ?? [],
  { forceFull: changeSet.forceFull },
);

console.log(JSON.stringify(plan, null, 2));
if (readOption("github-output", false) && process.env.GITHUB_OUTPUT)
  writeGithubOutput(process.env.GITHUB_OUTPUT, plan);
