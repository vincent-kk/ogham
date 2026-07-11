#!/usr/bin/env node
/**
 * plugin-compiler CLI (run via tsx).
 *
 *   plugin-compiler compile <pkgDir> [--check]   definitions → targets/ (or verify only)
 *   plugin-compiler verify  <pkgDir>             claude equivalence gate
 */
import { resolve } from "node:path";
import { argv, exit, stderr, stdout } from "node:process";
import { extractDefinitions, writeDefinitions } from "./ir/index.js";
import { compilePlugin, writeTargets } from "./pipeline/index.js";
import type { Diagnostic, Diff } from "./types/output.js";
import { claudeEquivalence } from "./verify/index.js";

function main(): void {
  const [command, pkgArg, ...rest] = argv.slice(2);
  if (!command || !pkgArg) return fail(usage());
  const pkgDir = resolve(pkgArg);

  if (command === "extract") {
    const files = extractDefinitions(pkgDir);
    writeDefinitions(pkgDir, files);
    stdout.write(
      `✓ extracted ${files.size} definition files → ${pkgDir}/definitions/\n`,
    );
    return;
  }
  if (command === "compile") {
    const result = compilePlugin(pkgDir);
    report(result.diagnostics);
    if (result.diagnostics.some((d) => d.level === "error"))
      return fail("compile failed");
    if (rest.includes("--check")) return gate(pkgDir);
    writeTargets(pkgDir, result.targets);
    stdout.write(
      `✓ compiled [${Object.keys(result.targets).join(", ")}] → ${pkgDir}/targets/\n`,
    );
    return;
  }
  if (command === "verify") return gate(pkgDir);
  return fail(usage());
}

function gate(pkgDir: string): void {
  const diffs = claudeEquivalence(pkgDir);
  if (diffs.length) return fail(renderDiffs(diffs));
  stdout.write("✓ claude equivalence OK\n");
}

function report(diagnostics: Diagnostic[]): void {
  for (const d of diagnostics)
    stderr.write(
      `${d.level === "error" ? "✗" : "⚠"} [${d.host ?? "-"}] ${d.code}: ${d.message}\n`,
    );
}

function renderDiffs(diffs: Diff[]): string {
  return (
    "✗ claude equivalence FAILED:\n" +
    diffs
      .map(
        (d) =>
          `  ${d.kind.padEnd(10)} ${d.relPath}${d.detail ? ` (${d.detail})` : ""}`,
      )
      .join("\n")
  );
}

function usage(): string {
  return "usage: plugin-compiler <extract|compile|verify> <pkgDir> [--check]";
}

function fail(message: string): void {
  stderr.write(message + "\n");
  exit(1);
}

main();
