import { randomBytes } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';

import {
  readUtf8FileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { assignCandidatesToGroups } from '../group/assignCandidatesToGroups.js';
import { planReviewFileReuse } from '../group/planReviewFileReuse.js';
import { planNextHandoffs } from '../handoff/planNextHandoffs.js';
import { readReviewGroupArtifactStatus } from '../handoff/readReviewGroupArtifactStatus.js';
import { computeReviewArtifactHash } from '../hash/computeReviewArtifactHash.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { executeReviewGit } from '../hash/executeReviewGit.js';
import { assertReviewValidationPolicy } from '../state/assertReviewValidationPolicy.js';
import { publishReviewGeneration } from '../state/publishReviewGeneration.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewArtifactPath } from '../state/resolveReviewArtifactPath.js';
import { resolveReviewGenerationPaths } from '../state/resolveReviewGenerationPaths.js';
import type { ReviewGroupReuseDecision } from '../state/reviewIncrementalTypes.js';
import type {
  ResolvedReviewStateInput,
  ReviewPreparePayload,
  ReviewStatePaths,
  ReviewStateRecord,
} from '../state/reviewStateTypes.js';

import { prepareReviewArtifacts } from './prepareReviewArtifacts.js';
import { assertPreparedEffortUnchanged } from './utils/assertPreparedEffortUnchanged.js';
import { assertReviewGroupBudget } from './utils/assertReviewGroupBudget.js';
import { carryReviewGroupArtifacts } from './utils/carryReviewGroupArtifacts.js';
import { collectPriorReviewFindings } from './utils/collectPriorReviewFindings.js';
import { createPreparedReviewPayload } from './utils/createPreparedReviewPayload.js';
import { observeReviewGroupInputs } from './utils/observeReviewGroupInputs.js';
import { readReviewEnvironmentHash } from './utils/readReviewEnvironmentHash.js';
import { readReviewRenames } from './utils/readReviewRenames.js';
import { resolvePrepareSettings } from './utils/resolvePrepareSettings.js';
import { selectReviewEffort } from './utils/selectReviewEffort.js';
import { writeIncrementalReviewBriefs } from './utils/writeIncrementalReviewBriefs.js';

/**
 * Prepare only changed committed files and preserve validated original opinions.
 * @param input Resolved ordinary prepare request.
 * @param originPaths Current generation or branch paths before bootstrap.
 * @param previous Previously published state; force preserves it without reuse.
 * @returns Prepared scope, original provenance and the remaining actor handoffs.
 * @throws On conflicting publication or input drift during preparation.
 */
export async function prepareIncrementalReviewState(
  input: Extract<ResolvedReviewStateInput, { action: 'prepare' }>,
  originPaths: ReviewStatePaths,
  previous: ReviewStateRecord | null,
): Promise<ReviewPreparePayload> {
  const expectedState = readUtf8FileIfExistsSync(originPaths.statePath);
  const settings = resolvePrepareSettings(input);
  if (previous?.incremental && !input.force) {
    assertReviewValidationPolicy(previous);
    if (settings.effortExplicit && previous.phase === 'prepared')
      assertPreparedEffortUnchanged(
        previous,
        selectReviewEffort(
          settings.effortMode,
          previous.groups.filter((group) => group.rounds > 0).length,
          settings.autoLowEffortGroupThreshold,
        ).effort,
      );
  }
  const generationId = randomBytes(16).toString('hex');
  const paths = resolveReviewGenerationPaths(originPaths, generationId);
  const stagePaths = {
    ...paths,
    statePath: resolveReviewArtifactPath(paths, 'staged-state.json'),
  };
  const request = {
    ...input,
    force: true,
    effort: previous && !input.force ? previous.effort : input.effort,
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
    JSON.stringify(previous.scope.candidates) ===
      JSON.stringify(state.scope.candidates);
  if (
    sameInputs &&
    (previous.phase !== 'sealed' || existsSync(originPaths.reportPath))
  ) {
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
    return payload;
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
  publishReviewGeneration(paths, state, expectedState);
  return createPreparedReviewPayload({
    action: 'prepare',
    disposition: previous && !input.force ? 'resumable' : 'fresh',
    paths,
    status: TOOL_STATUSES.OK,
    state,
    concurrency: settings.concurrency,
    diagnostics: staged.diagnostics,
    handoff: planNextHandoffs({
      state,
      paths,
      statuses: readReviewGroupArtifactStatus(state, paths),
    }),
  });
}
