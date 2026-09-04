import { pathForCompare, writeFileAtomicallySync } from '@ogham/cross-platform';

import type { REVIEW_STATE_ACTIONS } from '../../../../constants/reviewState.js';
import {
  REVIEW_STATE_ACTIONS as ACTIONS,
  REVIEW_SCOPE_DIRTY_PATH_LIMIT,
  REVIEW_STATE_DELETED_FILE_HASH,
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_MESSAGES,
  REVIEW_STATE_DIRECTORY_NAMES,
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_GIT_ARGUMENTS,
  REVIEW_STATE_PHASES,
} from '../../../../constants/reviewState.js';
import { RULE_SCOPES } from '../../../../constants/ruleScopes.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { loadConfig, validateStructure } from '../../../../core/index.js';
import { createToolSnapshot } from '../../utils/createToolSnapshot.js';
import { isFindingDiagnostic } from '../../utils/isFindingDiagnostic.js';
import { selectVerificationEvidence } from '../../utils/selectVerificationEvidence.js';
import { classifyWorktreePaths } from '../assess/classifyWorktreePaths.js';
import { parseGitStatusPaths } from '../assess/parseGitStatusPaths.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';
import { buildScopeCandidates } from '../scope/buildScopeCandidates.js';
import { classifyChangedFile } from '../scope/classifyChangedFile.js';
import { deriveEvidenceStatuses } from '../scope/deriveEvidenceStatuses.js';
import { readChangedFileRoster } from '../scope/readChangedFileRoster.js';
import { renderEvidenceMarkdown } from '../scope/renderEvidenceMarkdown.js';
import { selectChangedScopeViolations } from '../scope/selectChangedScopeViolations.js';
import { haveSameReviewPaths } from '../scope/utils/haveSameReviewPaths.js';
import { toProjectRelativePath } from '../scope/utils/toProjectRelativePath.js';
import { assertReviewStatePaths } from '../state/assertReviewStatePaths.js';
import { createReviewStatePayload } from '../state/createReviewStatePayload.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import type {
  ReviewScopeViolation,
  ReviewStateInput,
  ReviewStatePayload,
} from '../state/reviewStateTypes.js';

type ScopeInput = Extract<
  ReviewStateInput,
  { action: typeof REVIEW_STATE_ACTIONS.SCOPE }
>;

/**
 * Collect committed changed-scope FCA evidence for one prepared review state.
 * @param input Absolute project root and branch key for the prepared state.
 * @returns Scope payload and canonical evidence path, or a lifecycle failure.
 */
export async function scopeReviewState(
  input: ScopeInput,
): Promise<ReviewStatePayload> {
  const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
  assertReviewStatePaths(paths);
  const state = readReviewState(paths.statePath);
  if (!state)
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.MISSING,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.STATE_MISSING,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.STATE_MISSING,
          path: paths.statePath,
        },
      ],
    });

  const source = await computeReviewSourceHash(
    input.projectRoot,
    state.baseRef,
  );
  if (source.sourceHash !== state.sourceHash)
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.STALE,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      state,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.SOURCE_HASH_STALE,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.SOURCE_HASH_STALE,
          path: paths.statePath,
        },
      ],
    });
  if (state.phase === REVIEW_STATE_PHASES.SEALED)
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.STALE,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      state,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.STATE_SEALED,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.STATE_SEALED,
          path: paths.statePath,
        },
      ],
    });

  const roster = await readChangedFileRoster(
    input.projectRoot,
    state.baseCommit,
  );
  if (
    !haveSameReviewPaths(
      roster.map(({ path }) => path),
      Object.keys(state.fileHashes),
    )
  )
    return createReviewStatePayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.STALE,
      paths,
      status: TOOL_STATUSES.INDETERMINATE,
      state,
      diagnostics: [
        {
          code: REVIEW_STATE_DIAGNOSTIC_CODES.SOURCE_HASH_STALE,
          message: REVIEW_STATE_DIAGNOSTIC_MESSAGES.SOURCE_HASH_STALE,
          path: paths.statePath,
        },
      ],
    });

  const generatedPaths =
    loadConfig(input.projectRoot).config?.structure?.generatedPaths ?? [];
  const statusOutput = await executeReviewGit(input.projectRoot, [
    ...REVIEW_STATE_GIT_ARGUMENTS.STATUS_PORCELAIN,
  ]);
  const reviewPrefix = `${REVIEW_STATE_DIRECTORY_NAMES.FILID}/${REVIEW_STATE_DIRECTORY_NAMES.REVIEW}`;
  const dirtyPaths = parseGitStatusPaths(statusOutput)
    .filter(
      (path) =>
        !`${reviewPrefix}/`.startsWith(
          path.endsWith('/') ? path : `${path}/`,
        ) && !path.startsWith(`${reviewPrefix}/`),
    )
    .sort();
  const worktree = classifyWorktreePaths(dirtyPaths, generatedPaths);
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
          state.fileHashes[entry.path] === REVIEW_STATE_DELETED_FILE_HASH
            ? 'D'
            : entry.change,
      },
      {
        generatedPaths,
        tree: context.snapshot.tree,
        projectRoot: input.projectRoot,
        classifyVerification: (filePath) =>
          verificationRoles.get(pathForCompare(filePath)) ?? 'unsupported',
      },
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
  const ruleScopeById = new Map(
    context.rules.map((rule) => [rule.id, rule.scope ?? RULE_SCOPES.NODES]),
  );
  const { candidates, informational } = buildScopeCandidates(
    selection.retained,
    ruleScopeById,
  );
  const retainedStructureCount = selection.retained.filter(
    ({ source: violationSource }) => violationSource === 'structure',
  ).length;
  const retainedVerificationCount =
    selection.retained.length - retainedStructureCount;
  const statuses = deriveEvidenceStatuses(
    context.snapshot,
    context.diagnostics,
    retainedStructureCount,
    retainedVerificationCount,
  );
  const evidenceDiagnostics = context.diagnostics
    .filter((diagnostic) => !isFindingDiagnostic(diagnostic))
    .map((diagnostic) => ({
      ...diagnostic,
      ...(diagnostic.path
        ? { path: toProjectRelativePath(input.projectRoot, diagnostic.path) }
        : {}),
    }));
  writeFileAtomicallySync(
    paths.evidencePath,
    renderEvidenceMarkdown({
      sourceHash: state.sourceHash,
      snapshotHash: context.snapshot.snapshotHash,
      ...statuses,
      worktree: worktree.disposition,
      createdAt: new Date().toISOString(),
      files,
      candidates,
      informational,
      outOfScope: selection.outOfScope,
      diagnostics: evidenceDiagnostics,
    }),
  );

  return {
    projectRoot: input.projectRoot,
    status: TOOL_STATUSES.OK,
    summary: {
      action: ACTIONS.SCOPE,
      disposition: REVIEW_STATE_DISPOSITIONS.SCOPED,
      sourceHash: state.sourceHash,
      snapshotHash: context.snapshot.snapshotHash,
      filesTotal: files.length,
      candidateCount: candidates.length,
      evidenceComplete: statuses.evidenceComplete,
      worktree: worktree.disposition,
    },
    data: {
      reviewDirectory: paths.reviewDirectory,
      statePath: paths.statePath,
      evidencePath: paths.evidencePath,
      files,
      candidates,
      outOfScopeCount: selection.outOfScope.length,
      infoCount: informational.length,
      dirtyPaths: dirtyPaths.slice(0, REVIEW_SCOPE_DIRTY_PATH_LIMIT),
      statuses: {
        structure: statuses.structure,
        verification: statuses.verification,
      },
    },
    diagnostics: context.diagnostics,
  };
}
