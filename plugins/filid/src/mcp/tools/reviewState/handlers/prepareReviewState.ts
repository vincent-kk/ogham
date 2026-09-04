import { existsSync } from 'node:fs';

import { removeFileIfExistsSync } from '@ogham/cross-platform';

import type { REVIEW_STATE_ACTIONS } from '../../../../constants/reviewState.js';
import {
  REVIEW_STATE_DISPOSITIONS,
  REVIEW_STATE_PHASES,
  REVIEW_STATE_SCHEMA_VERSION,
} from '../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { buildReviewGroups } from '../group/buildReviewGroups.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { collectChangedScopeEvidence } from '../scope/collectChangedScopeEvidence.js';
import { assertReviewStatePaths } from '../state/assertReviewStatePaths.js';
import { clearStaleReviewArtifacts } from '../state/clearStaleReviewArtifacts.js';
import { hasCompletePreparedArtifacts } from '../state/hasCompletePreparedArtifacts.js';
import { readReviewArtifactPresence } from '../state/readReviewArtifactPresence.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import { reviewReportExists } from '../state/reviewReportExists.js';
import type {
  ReviewPreparePayload,
  ReviewStateInput,
  ReviewStateRecord,
} from '../state/reviewStateTypes.js';
import { writeReviewState } from '../state/writeReviewState.js';

import { applyMissingTestRules } from './utils/applyMissingTestRules.js';
import { assertRenderedUnitsMatchGroups } from './utils/assertRenderedUnitsMatchGroups.js';
import { clearRecomputedReviewArtifacts } from './utils/clearRecomputedReviewArtifacts.js';
import { collectRenderedReviewUnits } from './utils/collectRenderedReviewUnits.js';
import { createPreparedReviewPayload } from './utils/createPreparedReviewPayload.js';
import { hasAllReviewBriefs } from './utils/hasAllReviewBriefs.js';
import { loadPrepareReviewRules } from './utils/loadPrepareReviewRules.js';
import { resolvePrepareSettings } from './utils/resolvePrepareSettings.js';
import { resolvePreparedReviewFiles } from './utils/resolvePreparedReviewFiles.js';
import { retainReviewGroupValidations } from './utils/retainReviewGroupValidations.js';
import { retuneReviewGroups } from './utils/retuneReviewGroups.js';
import { writePreparedReviewArtifacts } from './utils/writePreparedReviewArtifacts.js';

/** Prepare input narrowed from the public review-state action union. */
type PrepareInput = Extract<
  ReviewStateInput,
  { action: typeof REVIEW_STATE_ACTIONS.PREPARE }
>;

/**
 * Prepare, resume, or restore one deterministic branch-scoped review session.
 * @param input Validated prepare request with branch, base, and optional effort.
 * @returns Complete scope and group state after every required artifact exists.
 */
export async function prepareReviewState(
  input: PrepareInput,
): Promise<ReviewPreparePayload> {
  const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
  assertReviewStatePaths(paths);
  const settings = resolvePrepareSettings(input);
  const source = await computeReviewSourceHash(
    input.projectRoot,
    input.baseRef,
  );
  const restored = readReviewState(paths.statePath);
  const existing = restored && !('kind' in restored) ? restored : null;
  const sameIdentity =
    !input.force && existing?.sourceHash === source.sourceHash;

  if (
    sameIdentity &&
    existing.phase === REVIEW_STATE_PHASES.SEALED &&
    reviewReportExists(paths.reportPath)
  )
    return createPreparedReviewPayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.CACHED,
      paths,
      status: TOOL_STATUSES.OK,
      state: existing,
      concurrency: settings.concurrency,
    });

  const canResume =
    sameIdentity && existing.phase === REVIEW_STATE_PHASES.PREPARED;
  const effortChanged = canResume && existing.effort !== settings.effort;

  if (
    canResume &&
    !effortChanged &&
    hasCompletePreparedArtifacts(paths, existing)
  )
    return createPreparedReviewPayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.RESUMABLE,
      paths,
      status: TOOL_STATUSES.OK,
      state: existing,
      concurrency: settings.concurrency,
    });

  if (canResume && existsSync(paths.evidencePath)) {
    const presence = readReviewArtifactPresence(paths, existing);
    const activeRules =
      !effortChanged && hasAllReviewBriefs(paths, existing)
        ? []
        : loadPrepareReviewRules(input.projectRoot, settings.pluginRoot)
            .activeRules;
    const renderedUnits = presence.diffs
      ? []
      : await collectRenderedReviewUnits({
          projectRoot: input.projectRoot,
          baseCommit: existing.baseCommit,
          files: existing.scope.files,
          groupChurnLimit: settings.groupChurnLimit,
        });
    if (!presence.diffs)
      assertRenderedUnitsMatchGroups(renderedUnits, existing.groups);
    const preparedGroups = effortChanged
      ? retuneReviewGroups(existing.groups, settings.rounds)
      : existing.groups;
    const groups = writePreparedReviewArtifacts({
      paths,
      groups: preparedGroups,
      previousGroups: existing.groups,
      renderedUnits,
      files: existing.scope.files,
      candidates: existing.scope.candidates,
      activeRules,
      sourceHash: existing.sourceHash,
      baseRef: existing.baseRef,
      branchName: existing.branchName,
      effort: settings.effort,
      createdAt: existing.preparedAt,
      onlyMissingArtifacts: true,
      preserveOpinions: true,
      rewriteReviewBriefs: effortChanged,
      rewriteSession: effortChanged,
    });
    const state = effortChanged
      ? { ...existing, effort: settings.effort, groups }
      : existing;
    if (effortChanged) writeReviewState(paths.statePath, state);
    return createPreparedReviewPayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.RESUMABLE,
      paths,
      status: TOOL_STATUSES.OK,
      state,
      concurrency: settings.concurrency,
    });
  }

  const disposition = canResume
    ? REVIEW_STATE_DISPOSITIONS.RESUMABLE
    : REVIEW_STATE_DISPOSITIONS.FRESH;
  if (canResume) {
    removeFileIfExistsSync(paths.statePath);
    clearRecomputedReviewArtifacts(paths);
  } else {
    removeFileIfExistsSync(paths.statePath);
    clearStaleReviewArtifacts(paths);
  }

  const createdAt = canResume ? existing.preparedAt : new Date().toISOString();
  const collected = await collectChangedScopeEvidence({
    projectRoot: input.projectRoot,
    source,
    evidencePath: paths.evidencePath,
    generatedPaths: settings.generatedPaths,
    lockfiles: settings.lockfiles,
    createdAt,
  });
  const { rules, overrides, activeRules } = loadPrepareReviewRules(
    input.projectRoot,
    settings.pluginRoot,
  );
  let files = resolvePreparedReviewFiles({
    projectRoot: input.projectRoot,
    files: collected.files,
    rules,
    overrides,
  });
  const renderedUnits = await collectRenderedReviewUnits({
    projectRoot: input.projectRoot,
    baseCommit: source.baseCommit,
    files,
    groupChurnLimit: settings.groupChurnLimit,
  });
  let groups = buildReviewGroups({
    units: renderedUnits.map(({ unit }) => unit),
    files,
    candidates: collected.candidates,
    rounds: settings.rounds,
    groupFileLimit: settings.groupFileLimit,
    groupChurnLimit: settings.groupChurnLimit,
    planChurnLimit: settings.planChurnLimit,
  });
  files = applyMissingTestRules({ files, groups, activeRules });
  if (canResume) groups = retainReviewGroupValidations(groups, existing.groups);
  groups = writePreparedReviewArtifacts({
    paths,
    groups,
    previousGroups: canResume ? existing.groups : [],
    renderedUnits,
    files,
    candidates: collected.candidates,
    activeRules,
    sourceHash: source.sourceHash,
    baseRef: input.baseRef,
    branchName: input.branchName,
    effort: settings.effort,
    createdAt,
    onlyMissingArtifacts: false,
    preserveOpinions: canResume,
  });

  const state: ReviewStateRecord = {
    schemaVersion: REVIEW_STATE_SCHEMA_VERSION,
    projectRoot: input.projectRoot,
    branchName: input.branchName,
    normalizedBranch: paths.normalizedBranch,
    baseRef: input.baseRef,
    baseCommit: source.baseCommit,
    sourceHash: source.sourceHash,
    fileHashes: source.fileHashes,
    phase: REVIEW_STATE_PHASES.PREPARED,
    preparedAt: createdAt,
    effort: settings.effort,
    groups,
    scope: {
      snapshotHash: collected.snapshotHash,
      evidenceComplete: collected.evidenceComplete,
      worktree: collected.worktree,
      dirtyPaths: collected.dirtyPaths,
      statuses: collected.statuses,
      files,
      candidates: collected.candidates,
      informational: collected.informational,
      outOfScopeCount: collected.outOfScopeCount,
      infoCount: collected.infoCount,
    },
    verdict: null,
  };
  writeReviewState(paths.statePath, state);
  return createPreparedReviewPayload({
    action: input.action,
    disposition,
    paths,
    status: TOOL_STATUSES.OK,
    state,
    diagnostics: collected.diagnostics,
    concurrency: settings.concurrency,
  });
}
