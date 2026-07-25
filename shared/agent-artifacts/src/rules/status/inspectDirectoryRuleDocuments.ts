import type { DirectoryRuleTarget } from "../../targets/index.js";
import type {
  ManagedRuleDocument,
  RuleDocumentInspection,
} from "../../types/rules.js";
import { hashRuleContent } from "../helpers/hashRuleContent.js";
import { locateDirectoryRuleDocument } from "../helpers/locateDirectoryRuleDocument.js";

export function inspectDirectoryRuleDocuments(
  target: DirectoryRuleTarget,
  documents: readonly ManagedRuleDocument[],
): readonly RuleDocumentInspection[] {
  return documents.map((document) => {
    const location = locateDirectoryRuleDocument(target, document);
    const deployedHash = hashRuleContent(location.content);
    const expectedHash = hashRuleContent(document.content);
    const deployed = location.content !== null;
    const inSync =
      deployedHash !== null &&
      expectedHash !== null &&
      deployedHash === expectedHash;
    return {
      id: document.id,
      filename: document.filename,
      target: location.target,
      displayTarget: location.displayTarget,
      deployed,
      active: deployed,
      activeTarget: location.target,
      activeDisplayTarget: location.displayTarget,
      activeDeployedHash: deployedHash,
      activeInSync: inSync,
      activeSource: location.source,
      deployedHash,
      expectedHash,
      inSync,
      source: location.source,
    };
  });
}
