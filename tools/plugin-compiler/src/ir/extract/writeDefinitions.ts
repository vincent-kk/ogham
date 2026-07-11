import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type { FileMap } from "../../types/output.js";

/** Write an extracted definitions FileMap under `<pkgDir>/definitions/`. */
export function writeDefinitions(pkgDir: string, files: FileMap): void {
  for (const [rel, bytes] of files) {
    const abs = join(pkgDir, "definitions", rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, bytes);
  }
}
