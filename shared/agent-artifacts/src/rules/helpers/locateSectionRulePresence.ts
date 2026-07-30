import {
  readUtf8FileIfExistsSync,
  readSection,
  sectionMarkers,
} from "@ogham/cross-platform";

import type { SectionArtifactTarget } from "../../targets/index.js";
import type {
  RuleDocumentPresence,
  RuleDocumentSelector,
} from "../../types/rules.js";
import { ruleDisplayTarget } from "./ruleDisplayTarget.js";

export function locateSectionRulePresence(
  owner: string,
  target: SectionArtifactTarget,
  selector: RuleDocumentSelector,
): RuleDocumentPresence {
  const filenames = [selector.filename, ...(selector.legacyFilenames ?? [])];
  const source = readUtf8FileIfExistsSync(target.effectivePath);

  for (const filename of filenames) {
    const markers = sectionMarkers(owner.toUpperCase(), filename);
    if (source !== null && readSection(source, markers) !== null)
      return {
        target: target.effectivePath,
        displayTarget: ruleDisplayTarget(target.root, target.effectivePath),
        deployed: true,
      };
  }

  return {
    target: target.effectivePath,
    displayTarget: ruleDisplayTarget(target.root, target.effectivePath),
    deployed: false,
  };
}
