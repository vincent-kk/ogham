import { createHash } from "node:crypto";

import { readFileIfExistsSync } from "@ogham/cross-platform";

export function createRevision(paths: readonly string[]): string {
  const hash = createHash("sha256");
  const targets = [...new Set(paths)].sort();

  for (const path of targets) {
    const bytes = readFileIfExistsSync(path);
    hash.update(`path:${Buffer.byteLength(path, "utf8")}:`);
    hash.update(path);
    if (bytes === null) {
      hash.update(":missing;");
      continue;
    }
    hash.update(`:bytes:${bytes.byteLength}:`);
    hash.update(bytes);
    hash.update(";");
  }

  return hash.digest("hex");
}
