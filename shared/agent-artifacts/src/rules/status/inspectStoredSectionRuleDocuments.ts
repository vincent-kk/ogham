import type { SectionArtifactTarget } from "../../targets/index.js";
import type { ManagedRuleDocument } from "../../types/rules.js";
import { hashRuleContent } from "../helpers/hashRuleContent.js";
import { locateSectionRuleDocument } from "../helpers/locateSectionRuleDocument.js";
import type { StoredRuleDocumentInspection } from "../types/internal.js";

export function inspectStoredSectionRuleDocuments(
  owner: string,
  target: SectionArtifactTarget,
  documents: readonly ManagedRuleDocument[],
): readonly StoredRuleDocumentInspection[] {
  return documents.map((document) => {
    const location = locateSectionRuleDocument(owner, target, document);
    const deployedHash = hashRuleContent(location.content);
    const expectedHash = hashRuleContent(document.content?.trim() ?? null);
    return {
      id: document.id,
      target: location.target,
      deployed: location.content !== null,
      inSync:
        deployedHash !== null &&
        expectedHash !== null &&
        deployedHash === expectedHash,
      source: location.source,
    };
  });
}
