import { readFileIfExistsSync } from "@ogham/cross-platform";

import type { DirectoryRuleTarget } from "../../targets/index.js";
import type {
  RuleDocumentPresence,
  RuleDocumentSelector,
} from "../../types/rules.js";
import { ruleDisplayTarget } from "./ruleDisplayTarget.js";
import { ruleDocumentPaths } from "./ruleDocumentPaths.js";

export function locateDirectoryRulePresence(
  target: DirectoryRuleTarget,
  selector: RuleDocumentSelector,
): RuleDocumentPresence {
  const paths = ruleDocumentPaths(target, selector);
  for (const path of paths)
    if (readFileIfExistsSync(path) !== null)
      return {
        target: path,
        displayTarget: ruleDisplayTarget(target.root, path),
        deployed: true,
      };

  const currentPath = paths[0] as string;
  return {
    target: currentPath,
    displayTarget: ruleDisplayTarget(target.root, currentPath),
    deployed: false,
  };
}
