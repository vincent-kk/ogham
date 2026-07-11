import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { FileMap, HostId } from "../../types/output.js";

/**
 * Write compiled FileMaps to `<pkgDir>/targets/<host>/`, cleaning each host root
 * first (clean regen — no stale files survive). Directories are created as needed.
 */
export function writeTargets(
  pkgDir: string,
  targets: Partial<Record<HostId, FileMap>>,
): void {
  for (const [host, files] of Object.entries(targets)) {
    if (!files) continue;
    const root = join(pkgDir, "targets", host);
    rmSync(root, { recursive: true, force: true });
    for (const [rel, bytes] of files) {
      const abs = join(root, rel);
      mkdirSync(dirname(abs), { recursive: true });
      writeFileSync(abs, bytes);
    }
  }
}
