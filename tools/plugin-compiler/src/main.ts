#!/usr/bin/env node
import { dirname, resolve } from "node:path";
import { argv, exit, stderr, stdout } from "node:process";
import { fileURLToPath } from "node:url";
import {
  formatDiagnostics,
  formatOutcomes,
  parseCommand,
} from "./cli/index.js";
import {
  applyFiles,
  listPluginDirectories,
  planPluginAdapters,
  planRootAdapters,
} from "./pipeline/index.js";
import type { AdapterPlan } from "./types/index.js";

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

const USAGE = "usage: plugin-compiler sync [--check] [pluginDir ...]\n";

function main(): void {
  const command = parseCommand(argv.slice(2));
  if (!command) {
    stderr.write(USAGE);
    exit(1);
  }

  const plans: AdapterPlan[] = command.pluginDirectories.length
    ? command.pluginDirectories.map(planPluginAdapters)
    : [
        ...listPluginDirectories(REPOSITORY_ROOT).map(planPluginAdapters),
        planRootAdapters(REPOSITORY_ROOT),
      ];

  const diagnostics = plans.flatMap((plan) => plan.diagnostics);
  stderr.write(formatDiagnostics(diagnostics));

  const outcomes = applyFiles(
    plans.flatMap((plan) => plan.files),
    command.check,
  );
  stdout.write(formatOutcomes(outcomes, REPOSITORY_ROOT));

  const hasErrors = diagnostics.some(
    (diagnostic) => diagnostic.level === "error",
  );
  const hasDrift = outcomes.some(
    (outcome) => outcome.action === "stale" || outcome.action === "missing",
  );
  if (hasErrors || (command.check && hasDrift)) exit(1);
}

main();
