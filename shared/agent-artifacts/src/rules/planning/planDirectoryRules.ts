import type { DirectoryRuleTarget } from "../../targets/index.js";
import type {
  ArtifactOutcome,
  ArtifactRevision,
} from "../../types/artifacts.js";
import type { RuleDocumentRequest } from "../../types/rules.js";
import type {
  DirectoryRuleExecutionEntry,
  PreparedRulePlan,
  RuleRevisionSpec,
} from "../types/internal.js";
import { listOwnedRuleOrphans } from "./listOwnedRuleOrphans.js";
import { planDirectoryRuleDocument } from "./planDirectoryRuleDocument.js";
import { planDirectoryRuleOrphan } from "./planDirectoryRuleOrphan.js";

export function planDirectoryRules(
  owner: string,
  target: DirectoryRuleTarget,
  request: RuleDocumentRequest,
): PreparedRulePlan {
  const outcomes: ArtifactOutcome[] = [];
  const revisions: ArtifactRevision[] = [];
  const revisionSpecs: RuleRevisionSpec[] = [];
  const entries: DirectoryRuleExecutionEntry[] = [];

  for (const document of request.documents) {
    const item = planDirectoryRuleDocument(target, request, document);
    if (item === null) continue;
    const outcomeIndex = outcomes.push(item.outcome) - 1;
    revisions.push(item.revision);
    revisionSpecs.push(item.revisionSpec);
    if (item.filePlan !== null)
      entries.push({ outcomeIndex, filePlan: item.filePlan });
  }

  const knownFilenames = new Set(
    request.documents.flatMap((document) => [
      document.filename,
      ...(document.legacyFilenames ?? []),
    ]),
  );
  for (const filename of listOwnedRuleOrphans(owner, target, knownFilenames)) {
    const item = planDirectoryRuleOrphan(target, filename);
    const outcomeIndex = outcomes.push(item.outcome) - 1;
    if (item.filePlan === null) continue;
    revisions.push(item.revision);
    revisionSpecs.push(item.revisionSpec);
    entries.push({ outcomeIndex, filePlan: item.filePlan });
  }

  return {
    plan: { request, outcomes, revisions },
    execution: {
      kind: "directory",
      entries,
      revisions: revisionSpecs,
    },
  };
}
