import { listDirectoryIfExistsSync } from "@ogham/cross-platform/filesystem";

import type { DirectoryRuleTarget } from "../../targets/index.js";

export function listOwnedRuleOrphans(
  owner: string,
  target: DirectoryRuleTarget,
  knownFilenames: ReadonlySet<string>,
): readonly string[] {
  return [...listDirectoryIfExistsSync(target.directoryPath)]
    .filter(
      (filename) =>
        filename.startsWith(`${owner}_`) &&
        filename.endsWith(".md") &&
        !knownFilenames.has(filename),
    )
    .sort();
}
