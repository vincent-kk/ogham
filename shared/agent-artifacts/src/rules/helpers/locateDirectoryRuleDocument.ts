import { readFileIfExistsSync } from "@ogham/cross-platform";

import type { DirectoryRuleTarget } from "../../targets/index.js";
import type { RuleDocumentSelector } from "../../types/rules.js";
import type { LocatedRuleDocument } from "../types/internal.js";
import { ruleDisplayTarget } from "./ruleDisplayTarget.js";
import { ruleDocumentPaths } from "./ruleDocumentPaths.js";

export function locateDirectoryRuleDocument(
  target: DirectoryRuleTarget,
  document: RuleDocumentSelector,
): LocatedRuleDocument {
  const paths = ruleDocumentPaths(target, document);
  const currentPath = paths[0] as string;
  const currentContent = readFileIfExistsSync(currentPath);
  if (currentContent !== null)
    return {
      target: currentPath,
      displayTarget: ruleDisplayTarget(target.root, currentPath),
      source: "current",
      sourceFilename: document.filename,
      content: currentContent,
    };

  for (let index = 1; index < paths.length; index += 1) {
    const legacyPath = paths[index] as string;
    const legacyContent = readFileIfExistsSync(legacyPath);
    if (legacyContent !== null)
      return {
        target: legacyPath,
        displayTarget: ruleDisplayTarget(target.root, legacyPath),
        source: "legacy",
        sourceFilename: document.legacyFilenames?.[index - 1] ?? null,
        content: legacyContent,
      };
  }

  return {
    target: currentPath,
    displayTarget: ruleDisplayTarget(target.root, currentPath),
    source: null,
    sourceFilename: null,
    content: null,
  };
}
