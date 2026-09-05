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
import { planNextHandoffs } from '../handoff/planNextHandoffs.js';
import { readReviewGroupArtifactStatus } from '../handoff/readReviewGroupArtifactStatus.js';
import { recoverReviewGroups } from '../handoff/recoverReviewGroups.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { collectChangedScopeEvidence } from '../scope/collectChangedScopeEvidence.js';
import { readChangeContext } from '../scope/readChangeContext.js';
import { assertReviewStatePaths } from '../state/assertReviewStatePaths.js';
import { clearStaleReviewArtifacts } from '../state/clearStaleReviewArtifacts.js';
import { hasCompletePreparedArtifacts } from '../state/hasCompletePreparedArtifacts.js';
import { readReviewArtifactPresence } from '../state/readReviewArtifactPresence.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import { reviewReportExists } from '../state/reviewReportExists.js';
import type {
  ResolvedReviewStateInput,
  ReviewPreparePayload,
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
import { resolvePrepareBaseRef } from './utils/resolvePrepareBaseRef.js';
import { resolvePrepareSettings } from './utils/resolvePrepareSettings.js';
import { resolvePreparedReviewFiles } from './utils/resolvePreparedReviewFiles.js';
import { retainReviewGroupValidations } from './utils/retainReviewGroupValidations.js';
import { retuneReviewGroups } from './utils/retuneReviewGroups.js';
import { writePreparedReviewArtifacts } from './utils/writePreparedReviewArtifacts.js';

/** Prepare input narrowed from the public review-state action union. */
type PrepareInput = Extract<
  ResolvedReviewStateInput,
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
  const baseRef = await resolvePrepareBaseRef(input.projectRoot, input.baseRef);
  const source = await computeReviewSourceHash(input.projectRoot, baseRef);
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
      diagnostics: [],
      handoff: planNextHandoffs({
        state: existing,
        paths,
        statuses: readReviewGroupArtifactStatus(existing, paths),
      }),
    });

  const canResume =
    sameIdentity && existing.phase === REVIEW_STATE_PHASES.PREPARED;
  const effortChanged = canResume && existing.effort !== settings.effort;

  if (
    canResume &&
    !effortChanged &&
    hasCompletePreparedArtifacts(paths, existing)
  ) {
    const state = await recoverReviewGroups(
      existing,
      paths,
      settings.pluginRoot,
    );
    return createPreparedReviewPayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.RESUMABLE,
      paths,
      status: TOOL_STATUSES.OK,
      state,
      concurrency: settings.concurrency,
      diagnostics: [],
      handoff: planNextHandoffs({
        state,
        paths,
        statuses: readReviewGroupArtifactStatus(state, paths),
      }),
    });
  }

  if (canResume && existsSync(paths.evidencePath)) {
    const presence = readReviewArtifactPresence(paths, existing);
    const loadedRules =
      !effortChanged && hasAllReviewBriefs(paths, existing)
        ? null
        : loadPrepareReviewRules(input.projectRoot, settings.pluginRoot);
    const context = await readChangeContext({
      projectRoot: input.projectRoot,
      baseCommit: existing.baseCommit,
      files: existing.scope.files,
      changeContext: input.changeContext,
    });
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
      actorMethods: loadedRules?.actorMethods ?? null,
      changeContext: context.changeContext,
      paths,
      groups: preparedGroups,
      previousGroups: existing.groups,
      renderedUnits,
      files: existing.scope.files,
      candidates: existing.scope.candidates,
      activeRules: loadedRules?.activeRules ?? [],
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
    const state = await recoverReviewGroups(
      { ...existing, effort: settings.effort, groups },
      paths,
      settings.pluginRoot,
    );
    return createPreparedReviewPayload({
      action: input.action,
      disposition: REVIEW_STATE_DISPOSITIONS.RESUMABLE,
      paths,
      status: TOOL_STATUSES.OK,
      state,
      concurrency: settings.concurrency,
      diagnostics: context.diagnostics,
      handoff: planNextHandoffs({
        state,
        paths,
        statuses: readReviewGroupArtifactStatus(state, paths),
      }),
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
  const { rules, overrides, activeRules, actorMethods } =
    loadPrepareReviewRules(input.projectRoot, settings.pluginRoot);
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
  const context = await readChangeContext({
    projectRoot: input.projectRoot,
    baseCommit: source.baseCommit,
    files,
    changeContext: input.changeContext,
  });
  if (canResume) groups = retainReviewGroupValidations(groups, existing.groups);
  groups = writePreparedReviewArtifacts({
    actorMethods,
    changeContext: context.changeContext,
    paths,
    groups,
    previousGroups: canResume ? existing.groups : [],
    renderedUnits,
    files,
    candidates: collected.candidates,
    activeRules,
    sourceHash: source.sourceHash,
    baseRef,
    branchName: input.branchName,
    effort: settings.effort,
    createdAt,
    onlyMissingArtifacts: false,
    preserveOpinions: canResume,
  });

  let state: ReviewStateRecord = {
    schemaVersion: REVIEW_STATE_SCHEMA_VERSION,
    projectRoot: input.projectRoot,
    branchName: input.branchName,
    normalizedBranch: paths.normalizedBranch,
    baseRef,
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
  if (canResume)
    state = await recoverReviewGroups(state, paths, settings.pluginRoot);
  else writeReviewState(paths.statePath, state);
  return createPreparedReviewPayload({
    action: input.action,
    disposition,
    paths,
    status: TOOL_STATUSES.OK,
    state,
    diagnostics: [...collected.diagnostics, ...context.diagnostics],
    concurrency: settings.concurrency,
    handoff: planNextHandoffs({
      state,
      paths,
      statuses: readReviewGroupArtifactStatus(state, paths),
    }),
  });
}
