import type { SectionArtifactTarget } from "../../targets/index.js";
import type {
  ManagedRuleDocument,
  RuleDocumentInspection,
} from "../../types/rules.js";
import { hashRuleContent } from "../helpers/hashRuleContent.js";
import { locateSectionRuleDocument } from "../helpers/locateSectionRuleDocument.js";

export function inspectSectionRuleDocuments(
  owner: string,
  target: SectionArtifactTarget,
  documents: readonly ManagedRuleDocument[],
): readonly RuleDocumentInspection[] {
  return documents.map((document) => {
    const effectiveLocation = locateSectionRuleDocument(
      owner,
      { ...target, candidatePaths: [target.effectivePath] },
      document,
    );
    const storedLocation = locateSectionRuleDocument(owner, target, document);
    const deployedHash = hashRuleContent(storedLocation.content);
    const activeDeployedHash = hashRuleContent(effectiveLocation.content);
    const expectedHash = hashRuleContent(document.content?.trim() ?? null);
    const inSync =
      deployedHash !== null &&
      expectedHash !== null &&
      deployedHash === expectedHash;
    const activeInSync =
      activeDeployedHash !== null &&
      expectedHash !== null &&
      activeDeployedHash === expectedHash;
    return {
      id: document.id,
      filename: document.filename,
      target: storedLocation.target,
      displayTarget: storedLocation.displayTarget,
      deployed: storedLocation.content !== null,
      active: effectiveLocation.content !== null,
      activeTarget: effectiveLocation.target,
      activeDisplayTarget: effectiveLocation.displayTarget,
      activeDeployedHash,
      activeInSync,
      activeSource: effectiveLocation.source,
      deployedHash,
      expectedHash,
      inSync,
      source: storedLocation.source,
    };
  });
}
