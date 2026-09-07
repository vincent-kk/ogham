import { pathForCompare } from '@ogham/cross-platform';

import {
  REVIEW_SCOPE_DIRTY_PATH_LIMIT,
  REVIEW_STATE_DELETED_FILE_HASH,
  REVIEW_STATE_DIRECTORY_NAMES,
  REVIEW_STATE_GIT_ARGUMENTS,
} from '../../../../constants/reviewState.js';
import { RULE_SCOPES } from '../../../../constants/ruleScopes.js';
import { validateStructure } from '../../../../core/index.js';
import { aggregateCertainty } from '../../../../core/verification/index.js';
import type { RuleScope } from '../../../../types/rules.js';
import { createToolSnapshot } from '../../utils/createToolSnapshot.js';
import { isFindingDiagnostic } from '../../utils/isFindingDiagnostic.js';
import { selectVerificationEvidence } from '../../utils/selectVerificationEvidence.js';
import { classifyWorktreePaths } from '../assess/classifyWorktreePaths.js';
import { parseGitStatusPaths } from '../assess/parseGitStatusPaths.js';
import { computeReviewDirtyPathsHash } from '../hash/computeReviewDirtyPathsHash.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';
import type { ReviewScopeViolation } from '../state/reviewStateTypes.js';

import { buildScopeCandidates } from './buildScopeCandidates.js';
import type {
  CollectChangedScopeEvidenceInput,
  ComputedChangedScopeEvidence,
} from './changedScopeEvidenceTypes.js';
import { classifyChangedFile } from './classifyChangedFile.js';
import { deriveEvidenceStatuses } from './deriveEvidenceStatuses.js';
import { readChangedFileRoster } from './readChangedFileRoster.js';
import { selectChangedScopeVerificationFiles } from './selectChangedScopeVerificationFiles.js';
import { selectChangedScopeViolations } from './selectChangedScopeViolations.js';
import { haveSameReviewPaths } from './utils/haveSameReviewPaths.js';
import { toProjectRelativePath } from './utils/toProjectRelativePath.js';

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

  const statusOutput = await executeReviewGit(input.projectRoot, [
    ...REVIEW_STATE_GIT_ARGUMENTS.STATUS_PORCELAIN,
  ]);
  const reviewPrefix = `${REVIEW_STATE_DIRECTORY_NAMES.FILID}/${REVIEW_STATE_DIRECTORY_NAMES.REVIEW}`;
  const dirtyPaths = parseGitStatusPaths(statusOutput)
    .filter(
      (path) => path !== reviewPrefix && !path.startsWith(`${reviewPrefix}/`),
    )
    .sort();
  const worktree = classifyWorktreePaths(dirtyPaths, input.generatedPaths);
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
    }));
  const selection = selectChangedScopeViolations(
    [...structureViolations, ...verificationViolations],
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
    context.diagnostics,
    retainedStructureCount,
    retainedVerificationCount,
    scopedVerificationCertainty,
  );
  const evidenceDiagnostics = context.diagnostics
    .filter((diagnostic) => !isFindingDiagnostic(diagnostic))
    .map((diagnostic) => ({
      ...diagnostic,
      ...(diagnostic.path
        ? {
            path: toProjectRelativePath(input.projectRoot, diagnostic.path),
          }
        : {}),
    }));
  return {
    snapshotHash: context.snapshot.snapshotHash,
    evidenceComplete: statuses.evidenceComplete,
    worktree: worktree.disposition,
    dirtyPaths: dirtyPaths.slice(0, REVIEW_SCOPE_DIRTY_PATH_LIMIT),
    dirtyPathsHash: computeReviewDirtyPathsHash(dirtyPaths),
    statuses,
    files,
    candidates,
    informational,
    outOfScopeCount: selection.outOfScope.length,
    infoCount: informational.length,
    diagnostics: context.diagnostics,
    outOfScope: selection.outOfScope,
    evidenceDiagnostics,
    ruleScopeById,
  };
}
