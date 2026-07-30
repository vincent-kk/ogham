import { readFileIfExistsSync } from "@ogham/cross-platform";

import type { DirectoryRuleTarget } from "../../targets/index.js";
import type {
  ManagedRuleDocument,
  RuleDocumentRequest,
} from "../../types/rules.js";
import { createRevision } from "../../transactions/index.js";
import { ruleDocumentPaths } from "../helpers/ruleDocumentPaths.js";
import { inspectDirectoryRuleDocuments } from "../status/inspectDirectoryRuleDocuments.js";
import type { DirectoryRulePlanningItem } from "../types/directoryPlanning.js";
import { buildDirectoryRuleChanges } from "./buildDirectoryRuleChanges.js";
import { decideRuleAction } from "./decideRuleAction.js";

export function planDirectoryRuleDocument(
  target: DirectoryRuleTarget,
  request: RuleDocumentRequest,
  document: ManagedRuleDocument,
): DirectoryRulePlanningItem | null {
  const paths = ruleDocumentPaths(target, document);
  const revisionBeforeRead = createRevision(paths);
  const inspection = inspectDirectoryRuleDocuments(target, [document])[0];
  if (inspection === undefined) return null;

  let decision = decideRuleAction({
    desired: request.desired.has(document.id),
    deployed: inspection.deployed,
    contentAvailable: document.content !== null,
    matches: inspection.inSync,
    replaceDrift: request.replaceDrift.has(document.id),
  });
  if (
    decision.action === "unchanged" &&
    request.desired.has(document.id) &&
    inspection.source === "legacy"
  )
    decision = { action: "relocate" };

  const legacyDriftContent =
    decision.action === "drift" && inspection.source === "legacy"
      ? readFileIfExistsSync(inspection.target)
      : null;
  const expectedRevision = createRevision(paths);
  if (expectedRevision !== revisionBeforeRead)
    decision = {
      action: "conflict",
      reason: "revision-changed-during-plan",
    };

  const changes = buildDirectoryRuleChanges(
    target,
    document,
    paths,
    inspection,
    decision,
    legacyDriftContent,
  );
  const canonicalPath = paths[0] as string;
  return {
    outcome: {
      id: document.id,
      action: decision.action,
      target: canonicalPath,
      ...(decision.reason === undefined ? {} : { reason: decision.reason }),
    },
    revision: { target: canonicalPath, revision: expectedRevision },
    revisionSpec: { target: canonicalPath, revisionPaths: paths },
    filePlan:
      changes.length === 0
        ? null
        : {
            expectedRevision,
            revisionPaths: paths,
            lockTarget: target.lockTarget,
            changes,
          },
  };
}
