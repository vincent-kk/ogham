#!/usr/bin/env node
/**
 * plugin-compiler CLI (run via tsx).
 *
 *   plugin-compiler sync [--check] [pluginDir ...]
 *
 * No pluginDir: every plugin under <repo>/plugins/* plus the root
 * marketplace adapters. --check compares without writing (CI gate).
 */
import { dirname, relative, resolve } from "node:path";
import { argv, exit, stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import {
  applyFiles,
  listPluginDirectories,
  planPluginAdapters,
  planRootAdapters,
} from "./pipeline/index.js";
import type { AdapterPlan, Diagnostic, FileOutcome } from "./types/adapter.js";

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

function main(): void {
  const [command, ...rest] = argv.slice(2);
  if (command !== "sync")
    return fail("usage: plugin-compiler sync [--check] [pluginDir ...]");
  const check = rest.includes("--check");
  const pluginArguments = rest.filter((argument) => argument !== "--check");

  const plans: AdapterPlan[] = [];
  if (pluginArguments.length)
    for (const argument of pluginArguments)
      plans.push(planPluginAdapters(resolve(argument)));
  else {
    for (const directory of listPluginDirectories(REPOSITORY_ROOT))
      plans.push(planPluginAdapters(directory));
    plans.push(planRootAdapters(REPOSITORY_ROOT));
  }

  const diagnostics = plans.flatMap((plan) => plan.diagnostics);
  reportDiagnostics(diagnostics);
  const outcomes = applyFiles(
    plans.flatMap((plan) => plan.files),
    check,
  );
  reportOutcomes(outcomes);

  const hasErrors = diagnostics.some(
    (diagnostic) => diagnostic.level === "error",
  );
  const hasDrift = outcomes.some(
    (outcome) => outcome.action === "stale" || outcome.action === "missing",
  );
  if (hasErrors || (check && hasDrift)) exit(1);
}

function reportDiagnostics(diagnostics: Diagnostic[]): void {
  for (const diagnostic of diagnostics)
    stderr.write(
      `${diagnostic.level === "error" ? "✗" : "⚠"} ${diagnostic.code}: ${diagnostic.message}\n`,
    );
}

function reportOutcomes(outcomes: FileOutcome[]): void {
  const counts = new Map<string, number>();
  for (const outcome of outcomes) {
    counts.set(outcome.action, (counts.get(outcome.action) ?? 0) + 1);
    if (outcome.action !== "unchanged")
      stdout.write(
        `${outcome.action.padEnd(9)} ${relative(REPOSITORY_ROOT, outcome.absolutePath)}\n`,
      );
  }
  const summary = [...counts.entries()]
    .map(([action, count]) => `${count} ${action}`)
    .join(", ");
  stdout.write(`✓ sync: ${summary || "no targets"}\n`);
}

function fail(message: string): void {
  stderr.write(message + "\n");
  exit(1);
}

main();
