import { randomBytes } from 'node:crypto';
import { existsSync, rmSync } from 'node:fs';

import {
  readUtf8FileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { TOOL_STATUSES } from '../../../../constants/toolEnvelope.js';
import { planReviewReuse } from '../group/planReviewReuse.js';
import { planNextHandoffs } from '../handoff/planNextHandoffs.js';
import { readReviewGroupArtifactStatus } from '../handoff/readReviewGroupArtifactStatus.js';
import { computeReviewArtifactHash } from '../hash/computeReviewArtifactHash.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { assertReviewValidationPolicy } from '../state/assertReviewValidationPolicy.js';
import { publishReviewGeneration } from '../state/publishReviewGeneration.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewArtifactPath } from '../state/resolveReviewArtifactPath.js';
import { resolveReviewGenerationPaths } from '../state/resolveReviewGenerationPaths.js';
import type {
  ResolvedReviewStateInput,
  ReviewPreparePayload,
  ReviewStatePaths,
  ReviewStateRecord,
} from '../state/reviewStateTypes.js';

import { prepareReviewArtifacts } from './prepareReviewArtifacts.js';
import { assertPreparedEffortUnchanged } from './utils/assertPreparedEffortUnchanged.js';
import { carryReviewGroupArtifacts } from './utils/carryReviewGroupArtifacts.js';
import { createPreparedReviewPayload } from './utils/createPreparedReviewPayload.js';
import { observeReviewGroupInputs } from './utils/observeReviewGroupInputs.js';
import { readReviewEnvironmentHash } from './utils/readReviewEnvironmentHash.js';
import { resolvePrepareSettings } from './utils/resolvePrepareSettings.js';
import { selectReviewEffort } from './utils/selectReviewEffort.js';

/**
 * Recollect inputs, preserve paid valid groups and atomically publish a new epoch.
 * @param input Resolved prepare request with explicit host actorContext.
 * @param originPaths Current active paths, or legacy branch paths before bootstrap.
 * @param previous Valid origin record, or null for the first run.
 * @returns Current generation, reuse accounting and next executable handoffs.
 * @throws On stale observation, preparation failure or a publication conflict.
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
    if (settings.effortExplicit)
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
  if (existsSync(paths.reviewDirectory))
    throw new Error('review generation already exists');
  const stagePaths = {
    ...paths,
    statePath: resolveReviewArtifactPath(paths, 'staged-state.json'),
  };
  const staged = await prepareReviewArtifacts(
    {
      ...input,
      force: true,
      effort: previous && !input.force ? previous.effort : input.effort,
    },
    { paths: stagePaths, previous },
  );
  const restored = readReviewState(stagePaths.statePath);
  if (!restored || 'kind' in restored)
    throw new Error('staged review state is missing');
  rmSync(stagePaths.statePath);
  let state: ReviewStateRecord = { ...restored, generationId };
  if (previous && !input.force)
    state = {
      ...state,
      effort: previous.effort,
      effortMode: previous.effortMode,
      effortReason: previous.effortReason,
      autoLowEffortGroupThreshold: previous.autoLowEffortGroupThreshold,
    };
  state.groups = state.groups.map((group) => ({
    ...group,
    contextReceipts:
      previous?.groups.find((origin) => origin.id === group.id)
        ?.contextReceipts ?? [],
    dependencyReceipts:
      previous?.groups.find((origin) => origin.id === group.id)
        ?.dependencyReceipts ?? [],
    contextUnverifiable:
      previous?.groups.find((origin) => origin.id === group.id)
        ?.contextUnverifiable ?? false,
  }));
  state.groups = await observeReviewGroupInputs(
    state,
    paths,
    input.actorContext!,
    input.changeContext,
    settings.pluginRoot,
    originPaths,
  );
  const environmentHash = readReviewEnvironmentHash(state, settings.pluginRoot);
  const statuses = previous
    ? readReviewGroupArtifactStatus(previous, originPaths)
    : [];
  const sameInputs =
    !input.force &&
    previous?.incremental &&
    previous.sourceHash === state.sourceHash &&
    previous.incremental.environmentHash === environmentHash &&
    JSON.stringify(previous.scope) === JSON.stringify(state.scope) &&
    previous.groups.length === state.groups.length &&
    state.groups.every((group) => {
      const origin = previous.groups.find((entry) => entry.id === group.id);
      const status = statuses.find((entry) => entry.group === group.id);
      return (
        !origin?.contextUnverifiable &&
        origin?.input?.contextHash !== null &&
        group.input?.contextHash !== null &&
        origin?.input?.preparedInputHash === group.input?.preparedInputHash &&
        JSON.stringify(origin?.dependsOn) === JSON.stringify(group.dependsOn) &&
        (!(origin?.reusedFrom || previous.phase === 'sealed') ||
          (status?.review === 'trusted' &&
            status.verify === 'trusted' &&
            origin?.validated.review?.complete))
      );
    });
  if (
    sameInputs &&
    (previous.phase !== 'sealed' ||
      (previous.incremental!.actorContext.mode === 'isolated' &&
        existsSync(originPaths.reportPath)))
  ) {
    const unchangedState =
      readUtf8FileIfExistsSync(originPaths.statePath) === expectedState;
    const unchangedSource =
      (await computeReviewSourceHash(input.projectRoot, state.baseRef))
        .sourceHash === state.sourceHash;
    const unchangedEnvironment =
      readReviewEnvironmentHash(state, settings.pluginRoot) === environmentHash;
    rmSync(paths.reviewDirectory, { recursive: true, force: true });
    if (!unchangedState || !unchangedSource || !unchangedEnvironment)
      throw new Error('review inputs changed during generation preparation');
    const resumed = previous;
    return createPreparedReviewPayload({
      action: 'prepare',
      disposition: previous.phase === 'sealed' ? 'cached' : 'resumable',
      paths: originPaths,
      status: TOOL_STATUSES.OK,
      state: resumed,
      concurrency: settings.concurrency,
      diagnostics: staged.diagnostics,
      handoff: planNextHandoffs({
        state: resumed,
        paths: originPaths,
        statuses: readReviewGroupArtifactStatus(resumed, originPaths),
      }),
    });
  }
  const plan = planReviewReuse({
    force: input.force,
    previous: (previous?.groups ?? []).map((group) => ({
      id: group.id,
      input: group.input ?? null,
      rounds: group.rounds,
      dependsOn: group.dependsOn,
      complete: group.validated.review?.complete ?? false,
      trusted:
        previous?.incremental?.actorContext.mode === 'isolated' &&
        !group.contextUnverifiable &&
        statuses.some(
          (status) =>
            status.group === group.id &&
            status.review === 'trusted' &&
            status.verify === 'trusted',
        ) &&
        (group.contextStarted === true || group.rounds === 0),
    })),
    current: state.groups.map((group) => ({
      id: group.id,
      input: group.input!,
      rounds: group.rounds,
      dependsOn: group.dependsOn,
      complete: false,
      trusted: false,
    })),
  });
  state.groups = state.groups.map((group) => {
    const decision = plan.decisions.find((entry) => entry.group === group.id)!;
    const origin = previous?.groups.find(
      (entry) => entry.id === decision.previousGroup,
    );
    if (decision.disposition !== 'reused' || !origin || expectedState === null)
      return {
        ...group,
        contextReceipts: [],
        dependencyReceipts: [],
        contextUnverifiable: false,
        contextStarted: false,
        contextToken: randomBytes(32).toString('hex'),
      };
    carryReviewGroupArtifacts(originPaths, paths, origin);
    return {
      ...group,
      validated: origin.validated,
      contextStarted: origin.contextStarted,
      contextToken: randomBytes(32).toString('hex'),
      reusedFrom: {
        stateHash: computeReviewArtifactHash(expectedState),
        sourceHash: origin.reusedFrom?.sourceHash ?? previous!.sourceHash,
        inputHash: group.input!.preparedInputHash,
      },
    };
  });
  state.incremental = {
    version: 1,
    actorContext: input.actorContext!,
    changeContext: input.changeContext ?? null,
    pluginRoot: settings.pluginRoot,
    environmentHash,
    decisions: plan.decisions,
    summary: plan.summary,
  };
  state.groups = await observeReviewGroupInputs(
    state,
    paths,
    input.actorContext!,
    input.changeContext,
    settings.pluginRoot,
  );
  if (
    (await computeReviewSourceHash(input.projectRoot, state.baseRef))
      .sourceHash !== state.sourceHash ||
    readReviewEnvironmentHash(state, settings.pluginRoot) !== environmentHash
  )
    throw new Error('review inputs changed during generation preparation');
  writeFileAtomicallySync(
    resolveReviewArtifactPath(paths, 'reuse-decisions.json'),
    JSON.stringify(
      { generationId, sourceHash: state.sourceHash, ...plan },
      null,
      2,
    ),
  );
  publishReviewGeneration(paths, state, expectedState);
  return createPreparedReviewPayload({
    action: 'prepare',
    disposition: previous ? 'resumable' : 'fresh',
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
