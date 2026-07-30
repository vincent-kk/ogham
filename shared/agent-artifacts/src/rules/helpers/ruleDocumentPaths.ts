import { resolveContainedPath } from "@ogham/cross-platform";

import type { DirectoryRuleTarget } from "../../targets/index.js";
import type { RuleDocumentSelector } from "../../types/rules.js";

export function ruleDocumentPaths(
  target: DirectoryRuleTarget,
  document: RuleDocumentSelector,
): readonly string[] {
  return [
    resolveContainedPath(target.directoryPath, document.filename),
    ...(document.legacyFilenames ?? []).map((filename) =>
      resolveContainedPath(target.directoryPath, filename),
    ),
  ];
}
