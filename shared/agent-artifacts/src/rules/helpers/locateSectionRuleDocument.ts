import { readUtf8FileIfExistsSync } from "@ogham/cross-platform/filesystem/read/utf8";
import {
  readSection,
  sectionMarkers,
} from "@ogham/cross-platform/instructions/read";

import type { SectionArtifactTarget } from "../../targets/index.js";
import type { RuleDocumentSelector } from "../../types/rules.js";
import type { LocatedRuleDocument } from "../types/internal.js";
import { ruleDisplayTarget } from "./ruleDisplayTarget.js";

export function locateSectionRuleDocument(
  owner: string,
  target: SectionArtifactTarget,
  document: RuleDocumentSelector,
): LocatedRuleDocument {
  const paths = [...new Set([target.effectivePath, ...target.candidatePaths])];
  const filenames = [document.filename, ...(document.legacyFilenames ?? [])];

  for (
    let filenameIndex = 0;
    filenameIndex < filenames.length;
    filenameIndex += 1
  ) {
    const filename = filenames[filenameIndex] as string;
    const markers = sectionMarkers(owner.toUpperCase(), filename);
    for (const path of paths) {
      const source = readUtf8FileIfExistsSync(path);
      if (source === null) continue;
      const content = readSection(source, markers);
      if (content === null) continue;
      return {
        target: path,
        displayTarget: ruleDisplayTarget(target.root, path),
        source: filenameIndex === 0 ? "current" : "legacy",
        sourceFilename: filename,
        content,
      };
    }
  }

  return {
    target: target.effectivePath,
    displayTarget: ruleDisplayTarget(target.root, target.effectivePath),
    source: null,
    sourceFilename: null,
    content: null,
  };
}
