import { CLAUDE_INSTALL_ENTRIES } from "../../constants/layout.js";
import { compilePlugin } from "../../pipeline/index.js";
import type { Diff } from "../../types/output.js";
import { diffMaps } from "../diffTree/diffMaps.js";
import { readDirAsFileMap } from "../diffTree/readDirAsFileMap.js";

/**
 * The reliability gate. Compile the plugin's Claude target and compare it to the
 * currently committed artifacts (the Claude component + runtime set — the oracle,
 * independent of npm `files`). An empty result proves the compiler is a no-op
 * transformation for Claude, mechanically guaranteeing "no regression". JSON
 * compares semantically; every other file compares byte-for-byte.
 */
export function claudeEquivalence(pkgDir: string): Diff[] {
  const emitted = compilePlugin(pkgDir, ["claude"]).targets.claude ?? new Map();
  const oracle = readDirAsFileMap(pkgDir, CLAUDE_INSTALL_ENTRIES);
  return diffMaps(oracle, emitted);
}
