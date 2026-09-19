import { pathForCompare } from '@ogham/cross-platform';

import { REVIEW_STATE_DELETED_FILE_HASH } from '../../../../constants/reviewState.js';
import { RULE_SCOPES } from '../../../../constants/ruleScopes.js';
import { validateStructure } from '../../../../core/index.js';
import { readUnknownFileText } from '../../../../core/restructure/index.js';
import { aggregateCertainty } from '../../../../core/verification/index.js';
import { toProjectRelativePath } from '../../../../lib/toProjectRelativePath.js';
import type { RuleScope } from '../../../../types/rules.js';
import type { ToolDiagnostic } from '../../../../types/toolEnvelope.js';
import { createToolSnapshot } from '../../utils/createToolSnapshot.js';
import { isAttributedToUnknownFile } from '../../utils/isAttributedToUnknownFile.js';
import { isFindingDiagnostic } from '../../utils/isFindingDiagnostic.js';
import { selectVerificationEvidence } from '../../utils/selectVerificationEvidence.js';
import type { ReviewScopeViolation } from '../state/reviewStateTypes.js';

import { buildScopeCandidates } from './buildScopeCandidates.js';
import type {
  CollectChangedScopeEvidenceInput,
  ComputedChangedScopeEvidence,
} from './changedScopeEvidenceTypes.js';
import { classifyChangedFile } from './classifyChangedFile.js';
import { deriveEvidenceStatuses } from './deriveEvidenceStatuses.js';
import { readChangedFileRoster } from './readChangedFileRoster.js';
import { readReviewWorktree } from './readReviewWorktree.js';
import { selectChangedScopeVerificationFiles } from './selectChangedScopeVerificationFiles.js';
import { selectChangedScopeViolations } from './selectChangedScopeViolations.js';
import { selectReviewScopeUnknownFiles } from './selectReviewScopeUnknownFiles.js';
import { haveSameReviewPaths } from './utils/haveSameReviewPaths.js';
import { scopeGraphUncertaintyViolations } from './utils/scopeGraphUncertaintyViolations.js';
import { sortScopeDiagnostics } from './utils/sortScopeDiagnostics.js';

/**
 * Compute committed roster and FCA evidence from one shared project snapshot.
 * @param input Prepared identity and settings without artifact output metadata.
 * @returns Complete changed-scope computation reusable by prepare and handoff.
 * @throws When Git's changed roster differs from the prepared file-hash keys.
 */
export async function computeChangedScopeEvidence(
  input: Omit<CollectChangedScopeEvidenceInput, 'evidencePath' | 'createdAt'>,
): Promise<ComputedChangedScopeEvidence> {
  const roster = await readChangedFileRoster(
    input.projectRoot,
    input.source.baseCommit,
  );
  if (
    !haveSameReviewPaths(
      roster.map(({ path }) => path),
      Object.keys(input.source.fileHashes),
    )
  )
    throw new Error(
      'Committed changed-file roster does not match the prepared file hashes',
    );

  const worktree = await readReviewWorktree(
    input.projectRoot,
    input.generatedPaths,
  );
  const context = await createToolSnapshot(input.projectRoot);
  const verificationRoles = new Map(
    context.snapshot.verification.files.map((file) => [
      pathForCompare(file.path),
      file.role,
    ]),
  );
  const files = roster.map((entry) =>
    classifyChangedFile(
      {
        ...entry,
        change:
          input.source.fileHashes[entry.path] === REVIEW_STATE_DELETED_FILE_HASH
            ? 'D'
            : entry.change,
      },
      {
        generatedPaths: input.generatedPaths,
        lockfiles: input.lockfiles,
        tree: context.snapshot.tree,
        projectRoot: input.projectRoot,
        classifyVerification: (filePath) =>
          verificationRoles.get(pathForCompare(filePath)) ?? 'unsupported',
      },
    ),
  );
  const scopedVerificationCertainty = aggregateCertainty(
    selectChangedScopeVerificationFiles(
      context.snapshot.verification.files,
      files,
      input.projectRoot,
    ),
  );
  const scopeUnknownFiles = selectReviewScopeUnknownFiles(
    context.snapshot,
    files.map(({ path }) => path),
    (relativePath) => readUnknownFileText(input.projectRoot, relativePath),
  );
  const graphCertainty = context.snapshot.dependencyGraph.certainty;
  const scopedDependencyCertainty =
    graphCertainty === 'unsupported'
      ? graphCertainty
      : scopeUnknownFiles.relevant.length > 0
        ? 'indeterminate'
        : 'exact';
  const isOutOfScope = (diagnostic: ToolDiagnostic) =>
    isAttributedToUnknownFile(
      diagnostic,
      scopeUnknownFiles.other,
      context.snapshot.projectRoot,
    );
  const scopedDiagnostics = context.diagnostics.filter(
    (diagnostic) => !isOutOfScope(diagnostic),
  );
  const structureReport = validateStructure(context.snapshot, context.rules, {
    maxDepth: context.maxDepth,
  });
  const verificationEvidence = selectVerificationEvidence(
    input.projectRoot,
    context.snapshot.verification,
  );
  const structureViolations: ReviewScopeViolation[] =
    structureReport.result.violations.map((violation) => ({
      source: 'structure',
      severity: violation.severity,
      path: toProjectRelativePath(input.projectRoot, violation.path),
      ruleId: violation.ruleId,
      message: violation.message,
      ...(violation.certainty ? { certainty: violation.certainty } : {}),
    }));
  const verificationViolations: ReviewScopeViolation[] =
    verificationEvidence.violations.map((violation) => ({
      source: 'verification',
      severity: violation.severity,
      path: toProjectRelativePath(input.projectRoot, violation.path),
      ruleId: violation.ruleId,
      message: violation.message,
      ...(violation.certainty ? { certainty: violation.certainty } : {}),
    }));
  const selection = selectChangedScopeViolations(
    [
      ...scopeGraphUncertaintyViolations(
        structureViolations,
        scopeUnknownFiles.relevant,
      ),
      ...verificationViolations,
    ],
    files,
  );
  const ruleScopeById = new Map<string, RuleScope>(
    context.rules.map((rule) => [rule.id, rule.scope ?? RULE_SCOPES.NODES]),
  );
  const { candidates, informational } = buildScopeCandidates(
    selection.retained,
    ruleScopeById,
  );
  const retainedStructureCount = selection.retained.filter(
    ({ source }) => source === 'structure',
  ).length;
  const retainedVerificationCount =
    selection.retained.length - retainedStructureCount;
  const statuses = deriveEvidenceStatuses(
    context.snapshot,
    scopedDiagnostics,
    retainedStructureCount,
    retainedVerificationCount,
    scopedVerificationCertainty,
    scopedDependencyCertainty,
  );
  const normalizeDiagnostics = (diagnostics: readonly ToolDiagnostic[]) =>
    sortScopeDiagnostics(
      diagnostics
        .filter((diagnostic) => !isFindingDiagnostic(diagnostic))
        .map((diagnostic) => ({
          ...diagnostic,
          ...(diagnostic.path
            ? {
                path: toProjectRelativePath(input.projectRoot, diagnostic.path),
              }
            : {}),
        })),
    );
  const evidenceDiagnostics = normalizeDiagnostics(scopedDiagnostics);
  const outOfScopeDiagnostics = normalizeDiagnostics(
    context.diagnostics.filter(isOutOfScope),
  );
  return {
    snapshotHash: context.snapshot.snapshotHash,
    evidenceComplete: statuses.evidenceComplete,
    ...worktree,
    statuses,
    files,
    candidates,
    informational,
    outOfScopeCount: selection.outOfScope.length,
    infoCount: informational.length,
    diagnostics: context.diagnostics,
    outOfScope: selection.outOfScope,
    evidenceDiagnostics,
    outOfScopeDiagnostics,
    ruleScopeById,
  };
}
