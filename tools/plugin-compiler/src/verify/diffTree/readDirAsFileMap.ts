import { join } from "node:path";
import { readTree } from "../../fsx/readTree.js";
import type { FileMap } from "../../types/output.js";

/**
 * Read a directory into a FileMap keyed by POSIX relative paths. `include`
 * optionally restricts to the given top-level entries (mirrors a plugin's
 * package.json `files` set when building the oracle); each may be a file or dir.
 */
export function readDirAsFileMap(
  dir: string,
  include?: readonly string[],
): FileMap {
  if (!include) return readTree(dir);
  const map: FileMap = new Map();
  for (const name of include)
    for (const [rel, bytes] of readTree(join(dir, name), dir))
      map.set(rel, bytes);
  return map;
}
