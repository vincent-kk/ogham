import { readUtf8FileIfExistsSync } from "@ogham/cross-platform";

import type { SectionArtifactTarget } from "../../targets/index.js";
import type { ArtifactRevision } from "../../types/artifacts.js";
import type { RuleDocumentRequest } from "../../types/rules.js";
import { createRevision } from "../../transactions/index.js";
import { inspectStoredSectionRuleDocuments } from "../status/inspectStoredSectionRuleDocuments.js";
import type { PreparedRulePlan } from "../types/internal.js";
import type { SectionRulePlanningState } from "../types/sectionPlanning.js";
import { buildSectionRuleChanges } from "./buildSectionRuleChanges.js";
import { markSectionPlanConflict } from "./markSectionPlanConflict.js";
import { planSectionRuleDocument } from "./planSectionRuleDocument.js";
import { removeOwnedSectionOrphans } from "./removeOwnedSectionOrphans.js";

export function planSectionRules(
  owner: string,
  target: SectionArtifactTarget,
  request: RuleDocumentRequest,
): PreparedRulePlan {
  const paths = [...new Set([target.effectivePath, ...target.candidatePaths])];
  const revisionBeforeRead = createRevision(paths);
  const state: SectionRulePlanningState = {
    owner,
    namespace: owner.toUpperCase(),
    target,
    paths,
    contents: new Map(
      paths.map(
        (path) => [path, readUtf8FileIfExistsSync(path) ?? ""] as const,
      ),
    ),
    changedPaths: new Set<string>(),
    outcomes: [],
    mutatingOutcomeIndexes: new Set<number>(),
  };
  const inspections = inspectStoredSectionRuleDocuments(
    owner,
    target,
    request.documents,
  );
  for (const [index, document] of request.documents.entries()) {
    const inspection = inspections[index];
    if (inspection !== undefined)
      planSectionRuleDocument(state, request, document, inspection);
  }

  const knownFilenames = new Set(
    request.documents.flatMap((document) => [
      document.filename,
      ...(document.legacyFilenames ?? []),
    ]),
  );
  removeOwnedSectionOrphans(state, knownFilenames);

  const expectedRevision = createRevision(paths);
  if (expectedRevision !== revisionBeforeRead) markSectionPlanConflict(state);
  const changes = buildSectionRuleChanges(state);
  const revisions: ArtifactRevision[] = [
    { target: target.effectivePath, revision: expectedRevision },
  ];

  return {
    plan: { request, outcomes: state.outcomes, revisions },
    execution: {
      kind: "sections",
      filePlan:
        changes.length === 0
          ? null
          : {
              expectedRevision,
              revisionPaths: paths,
              lockTarget: target.lockTarget,
              changes,
            },
      mutatingOutcomeIndexes: state.mutatingOutcomeIndexes,
      revisions: [{ target: target.effectivePath, revisionPaths: paths }],
    },
  };
}
