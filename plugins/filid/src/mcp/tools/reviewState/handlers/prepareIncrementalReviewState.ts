import { randomBytes } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';

import {
  readUtf8FileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import {
  REVIEW_STATE_DIAGNOSTIC_CODES,
  REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS,
  REVIEW_STATE_PHASES,
  WORKTREE_DISPOSITIONS,
} from '../../../../constants/reviewState.js';
import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { assignCandidatesToGroups } from '../group/assignCandidatesToGroups.js';
import { planReviewFileReuse } from '../group/planReviewFileReuse.js';
import { planNextHandoffs } from '../handoff/planNextHandoffs.js';
import { readReviewGroupArtifactStatus } from '../handoff/readReviewGroupArtifactStatus.js';
import { computeReviewArtifactHash } from '../hash/computeReviewArtifactHash.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';
import { readReviewWorktree } from '../scope/readReviewWorktree.js';
import { assertReviewValidationPolicy } from '../state/assertReviewValidationPolicy.js';
import { linkReplacementChain } from '../state/linkReplacementChain.js';
import { publishReviewGeneration } from '../state/publishReviewGeneration.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewArtifactPath } from '../state/resolveReviewArtifactPath.js';
import { resolveReviewGenerationPaths } from '../state/resolveReviewGenerationPaths.js';
import type { ReviewGroupReuseDecision } from '../state/reviewIncrementalTypes.js';
import type {
  ResolvedReviewStateInput,
  ReviewGenerationReplacement,
  ReviewPreparePayload,
  ReviewStatePaths,
  ReviewStateRecord,
  WorktreeDisposition,
} from '../state/reviewStateTypes.js';

import { prepareReviewArtifacts } from './prepareReviewArtifacts.js';
import { assertReviewGroupBudget } from './utils/assertReviewGroupBudget.js';
import { carryReviewGroupArtifacts } from './utils/carryReviewGroupArtifacts.js';
import { collectPriorReviewFindings } from './utils/collectPriorReviewFindings.js';
import { createPreparedReviewPayload } from './utils/createPreparedReviewPayload.js';
import { observeReviewGroupInputs } from './utils/observeReviewGroupInputs.js';
import { readReviewEnvironmentHash } from './utils/readReviewEnvironmentHash.js';
import { readReviewRenames } from './utils/readReviewRenames.js';
import { readSealedReviewBlockers } from './utils/readSealedReviewBlockers.js';
import { resolvePrepareSettings } from './utils/resolvePrepareSettings.js';
import { sameScopeCandidates } from './utils/sameScopeCandidates.js';
import { selectReviewEffort } from './utils/selectReviewEffort.js';
import { writeIncrementalReviewBriefs } from './utils/writeIncrementalReviewBriefs.js';

/**
 * Prepare only changed committed files and preserve validated original opinions.
 * @param input Resolved ordinary prepare request.
 * @param originPaths Current generation or branch paths before bootstrap.
 * @param previous Previously published state; force preserves it without reuse.
 * @param replacement Replacement record when the caller already archived an unusable state.
 * @returns Prepared scope, original provenance and the remaining actor handoffs.
 * @throws On conflicting publication or input drift during preparation.
 */
export async function prepareIncrementalReviewState(
  input: Extract<ResolvedReviewStateInput, { action: 'prepare' }>,
  originPaths: ReviewStatePaths,
  previous: ReviewStateRecord | null,
  replacement?: ReviewGenerationReplacement,
): Promise<ReviewPreparePayload> {
  const expectedState = readUtf8FileIfExistsSync(originPaths.statePath);
  const settings = resolvePrepareSettings(input);
  if (previous?.incremental && !input.force)
    assertReviewValidationPolicy(previous);
  const keepsPreparedEffort =
    previous !== null &&
    !input.force &&
    (settings.effortSource !== 'argument' ||
      previous.phase === REVIEW_STATE_PHASES.SEALED);
  const effortDiagnostics =
    keepsPreparedEffort &&
    settings.effortSource === 'argument' &&
    previous.effort !== settings.effortMode
      ? [
          {
            code: REVIEW_STATE_DIAGNOSTIC_CODES.EFFORT_LOCKED,
            message: `The sealed verdict was produced at effort ${previous.effort}; the requested effort ${settings.effortMode} was not applied.`,
            path: originPaths.statePath,
            affects: [],
            nextAction: REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.EFFORT_LOCKED,
          },
        ]
      : keepsPreparedEffort &&
          settings.effortSource === 'config' &&
          selectReviewEffort(
            settings.effortMode,
            previous.groups.filter((group) => group.rounds > 0).length,
            settings.autoLowEffortGroupThreshold,
          ).effort !== previous.effort
        ? [
            {
              code: REVIEW_STATE_DIAGNOSTIC_CODES.EFFORT_LOCKED,
              message: `Prepared review effort is ${previous.effort}; review.effort in the filid config resolves to ${settings.effortMode}.`,
              path: originPaths.statePath,
              affects: [],
              nextAction: REVIEW_STATE_DIAGNOSTIC_NEXT_ACTIONS.EFFORT_LOCKED,
            },
          ]
        : [];
  const generationId = randomBytes(16).toString('hex');
  const paths = resolveReviewGenerationPaths(originPaths, generationId);
  const stagePaths = {
    ...paths,
    statePath: resolveReviewArtifactPath(paths, 'staged-state.json'),
  };
  const request = {
    ...input,
    force: true,
    effort: keepsPreparedEffort ? previous.effort : input.effort,
  };
  const renames = await readReviewRenames(
    input.projectRoot,
    previous?.incremental?.headCommit,
  );
  const priorFindings = collectPriorReviewFindings(
    previous,
    originPaths,
    renames,
  );
  const unresolvedPaths = priorFindings.map((finding) => finding.path);
  let staged = await prepareReviewArtifacts(request, {
    paths: stagePaths,
    previous,
    deferBudget: true,
    unresolvedPaths,
  });
  let restored = readReviewState(stagePaths.statePath);
  if (!restored || 'kind' in restored)
    throw new Error('staged review state is missing');
  let state: ReviewStateRecord = { ...restored, generationId };
  state.groups = await observeReviewGroupInputs(
    state,
    paths,
    input.userInstructions ?? '',
    input.changeContext,
    settings.pluginRoot,
  );
  const environmentHash = readReviewEnvironmentHash(state, settings.pluginRoot);
  const statuses = previous
    ? readReviewGroupArtifactStatus(previous, originPaths)
    : [];
  const inputs = (record: ReviewStateRecord) =>
    Object.entries(
      Object.assign(
        {},
        ...record.groups.map((group) => group.fileInputs ?? {}),
      ),
    ).sort(([a], [b]) => a.localeCompare(b));
  const sameInputs =
    !input.force &&
    previous?.incremental &&
    previous.sourceHash === state.sourceHash &&
    previous.incremental.environmentHash === environmentHash &&
    JSON.stringify(inputs(previous)) === JSON.stringify(inputs(state)) &&
    sameScopeCandidates(previous.scope.candidates, state.scope.candidates);
  const sealedOnDirtyWorktree =
    previous?.phase === REVIEW_STATE_PHASES.SEALED &&
    previous.verdict === 'INCONCLUSIVE' &&
    previous.scope.worktree !== WORKTREE_DISPOSITIONS.CLEAN;
  const currentWorktree = sealedOnDirtyWorktree
    ? (await readReviewWorktree(input.projectRoot, settings.generatedPaths))
        .worktree
    : null;
  const sealedReason = previous
    ? sealedReplacementReason(previous, originPaths, currentWorktree)
    : null;
  const generationReplacement =
    replacement ??
    (previous && !input.force
      ? sealedReason !== null
        ? {
            reason: sealedReason,
            ...(previous.generationId
              ? { priorGenerationId: previous.generationId }
              : {}),
            ...(previous.verdict ? { priorVerdict: previous.verdict } : {}),
          }
        : keepsPreparedEffort
          ? undefined
          : {
              reason: REVIEW_STATE_DIAGNOSTIC_CODES.EFFORT_CHANGED,
              ...(previous.generationId
                ? { priorGenerationId: previous.generationId }
                : {}),
              ...(previous.verdict ? { priorVerdict: previous.verdict } : {}),
            }
      : undefined);
  if (sameInputs && sealedReason === null) {
    rmSync(paths.reviewDirectory, { recursive: true, force: true });
    if (readUtf8FileIfExistsSync(originPaths.statePath) !== expectedState)
      throw new Error('review generation changed during preparation');
    if (
      (await computeReviewSourceHash(input.projectRoot, state.baseRef))
        .sourceHash !== state.sourceHash ||
      readReviewEnvironmentHash(state, settings.pluginRoot) !== environmentHash
    )
      throw new Error('review inputs changed during generation preparation');
    const payload = await prepareReviewArtifacts(input, {
      paths: originPaths,
      previous: null,
    });
    const repaired = readReviewState(originPaths.statePath);
    const origin = readReviewState(
      resolveReviewArtifactPath(originPaths, 'origin-state.json'),
    );
    if (repaired && !('kind' in repaired))
      await writeIncrementalReviewBriefs(
        repaired,
        originPaths,
        origin && !('kind' in origin)
          ? origin.incremental?.headCommit
          : undefined,
        input.userInstructions ?? '',
      );
    return {
      ...payload,
      diagnostics: [...payload.diagnostics, ...effortDiagnostics],
    };
  }
  const reuse = planReviewFileReuse(
    state,
    input.force ? null : previous,
    statuses,
    renames,
  );
  const retainedCandidates = state.scope.candidates.filter((candidate) =>
    reuse.retained.some((group) =>
      group.units.some(
        (unit) =>
          unit.path === candidate.path ||
          state.scope.files.find((file) => file.path === unit.path)?.owner ===
            candidate.path,
      ),
    ),
  );
  if (reuse.retained.length)
    reuse.retained = assignCandidatesToGroups({
      groups: reuse.retained.map((group) => ({ ...group, candidateIds: [] })),
      files: state.scope.files,
      candidates: retainedCandidates,
    });
  if (reuse.retained.length > 0) {
    staged = await prepareReviewArtifacts(request, {
      paths: stagePaths,
      previous,
      selectedPaths: reuse.selectedPaths,
      observedFiles: state.scope.files,
      unresolvedPaths,
      retainedCandidateIds: retainedCandidates.map((candidate) => candidate.id),
    });
    restored = readReviewState(stagePaths.statePath);
    if (!restored || 'kind' in restored)
      throw new Error('staged review state is missing');
    state = { ...restored, generationId };
    state.groups = await observeReviewGroupInputs(
      state,
      paths,
      input.userInstructions ?? '',
      input.changeContext,
      settings.pluginRoot,
    );
  }
  rmSync(stagePaths.statePath);
  const assignedPrior = new Set<string>();
  state.groups = state.groups.map((group) => ({
    ...group,
    priorFindings: priorFindings.filter((finding) => {
      if (
        assignedPrior.has(finding.id) ||
        !group.units.some((unit) => unit.path === finding.path)
      )
        return false;
      assignedPrior.add(finding.id);
      return true;
    }),
  }));
  for (const group of reuse.retained) {
    group.reusedFrom!.stateHash = computeReviewArtifactHash(expectedState!);
    carryReviewGroupArtifacts(originPaths, paths, group);
  }
  state.groups = [...reuse.retained, ...state.groups];
  assertReviewGroupBudget(state.groups, settings.maxGroups);
  await writeIncrementalReviewBriefs(
    state,
    paths,
    previous?.incremental?.headCommit,
    input.userInstructions ?? '',
  );
  const oldPaths = new Set(
    previous?.scope.files.map((file) => file.path) ?? [],
  );
  const decisions: ReviewGroupReuseDecision[] = state.groups.map((group) => ({
    group: group.id,
    previousGroup: group.reusedFrom ? group.id : null,
    disposition: group.reusedFrom
      ? 'reused'
      : group.rounds === 0
        ? 'bookkeeping'
        : group.units.some(
              (unit) =>
                oldPaths.has(unit.path) ||
                [...renames.values()].includes(unit.path),
            )
          ? 'rerun'
          : 'new',
    reasons: group.reusedFrom
      ? []
      : input.force
        ? ['forced']
        : [
            ...new Set(
              group.units.flatMap((unit) => reuse.reasons[unit.path] ?? []),
            ),
          ],
  }));
  state.incremental = {
    version: 2,
    headCommit: (
      await executeReviewGit(input.projectRoot, ['rev-parse', 'HEAD'])
    ).trim(),
    userInstructions: input.userInstructions ?? '',
    changeContext: input.changeContext ?? null,
    pluginRoot: settings.pluginRoot,
    environmentHash,
    decisions,
    summary: {
      reusedFiles: new Set(
        state.groups
          .filter((group) => group.reusedFrom)
          .flatMap((group) => group.units.map((unit) => unit.path)),
      ).size,
      reviewFiles: new Set(
        state.groups
          .filter((group) => !group.reusedFrom && group.rounds > 0)
          .flatMap((group) => group.units.map((unit) => unit.path)),
      ).size,
      reusedGroups: decisions.filter(
        (decision) => decision.disposition === 'reused',
      ).length,
      rerunGroups: decisions.filter(
        (decision) => decision.disposition === 'rerun',
      ).length,
      newGroups: decisions.filter((decision) => decision.disposition === 'new')
        .length,
      removedGroups:
        previous?.groups.filter(
          (group) =>
            group.units.length > 0 &&
            group.units.every(
              (unit) =>
                !state.scope.files.some(
                  (file) => file.path === (renames.get(unit.path) ?? unit.path),
                ),
            ),
        ).length ?? 0,
      bookkeepingGroups: decisions.filter(
        (decision) => decision.disposition === 'bookkeeping',
      ).length,
      remainingMaxReviewerHandoffs: state.groups
        .filter((group) => !group.reusedFrom)
        .reduce((sum, group) => sum + group.rounds, 0),
    },
  };
  if (
    (await computeReviewSourceHash(input.projectRoot, state.baseRef))
      .sourceHash !== state.sourceHash ||
    readReviewEnvironmentHash(state, settings.pluginRoot) !== environmentHash
  )
    throw new Error('review inputs changed during generation preparation');
  writeFileAtomicallySync(
    resolveReviewArtifactPath(paths, 'reuse-decisions.json'),
    JSON.stringify(
      {
        generationId,
        sourceHash: state.sourceHash,
        decisions,
        summary: state.incremental.summary,
      },
      null,
      2,
    ),
  );
  if (generationReplacement)
    state = {
      ...state,
      replacedFrom: linkReplacementChain(generationReplacement, previous),
    };
  publishReviewGeneration(paths, state, expectedState);
  return createPreparedReviewPayload({
    action: 'prepare',
    disposition: previous && !input.force ? 'resumable' : 'fresh',
    paths,
    status: TOOL_STATUSES.OK,
    state,
    concurrency: settings.concurrency,
    diagnostics: [...staged.diagnostics, ...effortDiagnostics],
    handoff: planNextHandoffs({
      state,
      paths,
      statuses: readReviewGroupArtifactStatus(state, paths),
    }),
  });
}

/**
 * Whether a prior generation can still answer for its own verdict.
 *
 * A prepared generation always can. A sealed one can only while its report and
 * its blockers sidecar are both readable — otherwise the verdict cannot be
 * republished, and preparing a new generation from the same opinions costs no
 * actor work. An INCONCLUSIVE sealed only because the worktree was dirty
 * cannot answer for a worktree that is now clean either: that verdict is not
 * one anybody would launder, and its only other exit is a new commit.
 *
 * @param previous Prior state whose artifacts sit in `originPaths`.
 * @param originPaths Branch or generation paths of that prior state.
 * @param currentWorktree Worktree observed now, or null when the prior verdict does not depend on it.
 * @returns The diagnostic code that makes the prior generation unusable, or null when it may be returned as it stands.
 */
function sealedReplacementReason(
  previous: ReviewStateRecord,
  originPaths: ReviewStatePaths,
  currentWorktree: WorktreeDisposition | null,
): string | null {
  if (previous.phase !== REVIEW_STATE_PHASES.SEALED) return null;
  if (currentWorktree === WORKTREE_DISPOSITIONS.CLEAN)
    return REVIEW_STATE_DIAGNOSTIC_CODES.WORKTREE_STALE;
  if (!existsSync(originPaths.reportPath))
    return REVIEW_STATE_DIAGNOSTIC_CODES.REPORT_MISSING;
  return (
    readSealedReviewBlockers(originPaths, previous).diagnostic?.code ?? null
  );
}
