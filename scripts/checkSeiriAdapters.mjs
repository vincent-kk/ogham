#!/usr/bin/env node
/** Loaded by the adapters CI job after its clean seiri build; never writes checkout adapters. */
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  compileDistribution,
  distributionHashes,
  prepareSeiriDistribution,
  validateSeiriDistribution,
} from "./prepareSeiriDistribution.mjs";

/** Regenerate twice in disposable staging and require byte stability and valid references. */
export function checkSeiriAdapters({
  source,
  compile = compileDistribution,
} = {}) {
  const temporary = mkdtempSync(join(tmpdir(), "seiri-adapters-"));
  try {
    const { output, files } = prepareSeiriDistribution({
      source,
      output: join(temporary, "seiri"),
      compile,
    });
    const first = distributionHashes(output);
    compile(output);
    const second = distributionHashes(output);
    if (JSON.stringify(first) !== JSON.stringify(second))
      throw new Error("Seiri adapter generation is not deterministic");
    validateSeiriDistribution(output);
    return { files: files.length };
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    const result = checkSeiriAdapters();
    console.log(`SEIRI_ADAPTERS_OK (${result.files} distribution files)`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
