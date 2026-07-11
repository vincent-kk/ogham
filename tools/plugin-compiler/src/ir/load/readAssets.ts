import { join } from "node:path";
import { ASSET_ENTRIES } from "../../constants/layout.js";
import { readTree } from "../../fsx/readTree.js";
import type { ExtraFile } from "../../types/ir.js";

/**
 * Read the plugin's verbatim assets — the runtime/doc entries (bridge/, libs/,
 * README.md, public/, templates/) that exist. Copied byte-identical into each
 * target so the install directory is self-contained. Independent of npm `files`.
 */
export function readAssets(pkgDir: string): ExtraFile[] {
  const assets: ExtraFile[] = [];
  for (const name of ASSET_ENTRIES)
    for (const [relPath, bytes] of readTree(join(pkgDir, name), pkgDir))
      assets.push({ relPath, bytes });
  return assets.sort((a, b) => a.relPath.localeCompare(b.relPath));
}
