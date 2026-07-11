import { jsonEqual } from "../../json/jsonEqual.js";
import type { Diff, FileMap } from "../../types/output.js";

/**
 * Compare an emitted FileMap against an oracle FileMap.
 *
 * `.json` entries compare semantically (via {@link jsonEqual}); every other
 * entry compares byte-for-byte. Returns an empty array when equivalent —
 * that empty result is the reliability gate's pass condition.
 */
export function diffMaps(oracle: FileMap, emitted: FileMap): Diff[] {
  const diffs: Diff[] = [];

  for (const [relPath, oracleBytes] of oracle) {
    const emittedBytes = emitted.get(relPath);
    if (emittedBytes === undefined) {
      diffs.push({ relPath, kind: "missing" });
      continue;
    }
    if (!entryEqual(relPath, oracleBytes, emittedBytes))
      diffs.push({
        relPath,
        kind: "changed",
        detail: `oracle ${oracleBytes.length}B vs emitted ${emittedBytes.length}B`,
      });
  }

  for (const relPath of emitted.keys())
    if (!oracle.has(relPath)) diffs.push({ relPath, kind: "unexpected" });

  return diffs.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

function entryEqual(relPath: string, a: Buffer, b: Buffer): boolean {
  if (a.equals(b)) return true;
  if (relPath.endsWith(".json"))
    return jsonEqual(a.toString("utf8"), b.toString("utf8"));
  return false;
}
