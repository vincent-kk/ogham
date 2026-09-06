import {
  readUtf8FileIfExistsSync,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { computeReviewContextToken } from '../handoff/computeReviewContextToken.js';
import { planNextHandoffs } from '../handoff/planNextHandoffs.js';
import { readReviewGroupArtifactStatus } from '../handoff/readReviewGroupArtifactStatus.js';
import { computeReviewArtifactHash } from '../hash/computeReviewArtifactHash.js';
import { computeReviewSourceHash } from '../hash/computeReviewSourceHash.js';
import { readReviewState } from '../state/readReviewState.js';
import { resolveReviewArtifactPath } from '../state/resolveReviewArtifactPath.js';
import { resolveReviewStatePaths } from '../state/resolveReviewStatePaths.js';
import type {
  ResolvedReviewStateInput,
  ReviewStatePayload,
} from '../state/reviewStateTypes.js';
import { writeReviewGroupProgress } from '../state/writeReviewGroupProgress.js';

import { assertReviewContextRequest } from './utils/assertReviewContextRequest.js';
import { assertReviewInputsFresh } from './utils/assertReviewInputsFresh.js';
import { createReviewContextPayload } from './utils/createReviewContextPayload.js';
import { observeReviewContextReceipt } from './utils/observeReviewContextReceipt.js';
import { observeReviewGroupInputs } from './utils/observeReviewGroupInputs.js';
import { readReviewActorBrief } from './utils/readReviewActorBrief.js';
import { validateReviewOpinion } from './validateReviewOpinion.js';

/**
 * Observe every isolated actor query and mediate submission within one capability.
 * @param input Resolved context request; all role, operation and capability fields are checked.
 * @returns Bounded actor-only context or validation problems, never peer state or tokens.
 * @throws On stale capability, unavailable assignment, invalid query or conflicting progress.
 */
export async function handleReviewContext(
  input: Extract<ResolvedReviewStateInput, { action: 'context' }>,
): Promise<ReviewStatePayload> {
  if (
    !['brief', 'read', 'search', 'exists', 'submit'].includes(
      input.operation,
    ) ||
    !['review', 'verify'].includes(input.kind)
  )
    throw new Error('invalid review context operation');
  assertReviewContextRequest(input);
  const offset = input.offset ?? 0;
  if (!Number.isSafeInteger(offset) || offset < 0)
    throw new Error('invalid review context offset');
  for (let attempt = 0; attempt < 8; attempt++) {
    const paths = resolveReviewStatePaths(input.projectRoot, input.branchName);
    const state = readReviewState(paths.statePath);
    if (
      !state ||
      'kind' in state ||
      !state.incremental ||
      state.generationId !== input.generationId ||
      state.phase !== 'prepared'
    )
      throw new Error('review context capability is stale');
    const group = state.groups.find((entry) => entry.id === input.group);
    if (
      !group?.contextToken ||
      computeReviewContextToken(group.contextToken, input.kind, input.round) !==
        input.token
    )
      throw new Error('invalid review context capability');
    if (
      (await computeReviewSourceHash(state.projectRoot, state.baseRef))
        .sourceHash !== state.sourceHash
    )
      throw new Error('review source changed; run prepare');
    await assertReviewInputsFresh(state, paths, group.id);
    const next = planNextHandoffs({
      state,
      paths,
      statuses: readReviewGroupArtifactStatus(state, paths),
    }).next;
    if (
      !next.some(
        (handoff) =>
          handoff.group === group.id &&
          handoff.kind === input.kind &&
          handoff.round === input.round,
      )
    )
      throw new Error('review context assignment is not available');
    const assignment = `${input.kind}:${input.round ?? 0}`;
    if (
      input.operation !== 'brief' &&
      !group.contextAssignments?.includes(assignment)
    )
      throw new Error('read the prepared brief before querying or submitting');
    if (input.operation === 'submit') {
      const output =
        input.kind === 'review'
          ? `opinions/review-${group.id}.r${input.round}.json`
          : group.verifyPath;
      writeFileAtomicallySync(
        resolveReviewArtifactPath(paths, output),
        `${JSON.stringify(input.opinion)}\n`,
      );
      const validated = await validateReviewOpinion({
        action: 'validate',
        projectRoot: input.projectRoot,
        branchName: input.branchName,
        kind: input.kind,
        group: group.id,
        ...(input.round === undefined ? {} : { round: input.round }),
      });
      return createReviewContextPayload(paths, '', 0, undefined, {
        ok: validated.summary.ok === true,
        problems: validated.data.problems ?? [],
      });
    }
    let observation = null;
    try {
      observation =
        input.operation === 'brief'
          ? null
          : await observeReviewContextReceipt(
              state.projectRoot,
              state.baseCommit,
              {
                operation: input.operation,
                path: input.path ?? '',
                revision: input.revision ?? 'head',
                ...(input.query === undefined ? {} : { query: input.query }),
              },
            );
    } catch (error) {
      const failed = { ...group, contextUnverifiable: true };
      const observed = await observeReviewGroupInputs(
        { ...state, groups: [failed] },
        paths,
        state.incremental.actorContext,
        state.incremental.changeContext ?? undefined,
        state.incremental.pluginRoot,
      );
      writeReviewGroupProgress(
        paths.statePath,
        {
          ...state,
          groups: state.groups.map((entry) =>
            entry.id === group.id ? observed[0] : entry,
          ),
        },
        group,
      );
      throw error;
    }
    const receipts = [...(group.contextReceipts ?? [])];
    if (
      observation &&
      !receipts.some(
        (receipt) =>
          JSON.stringify(receipt) === JSON.stringify(observation.receipt),
      )
    )
      receipts.push(observation.receipt);
    const assignments = group.contextAssignments ?? [];
    const dependencies = group.dependsOn.map((id) => ({
      group: id,
      digest: computeReviewArtifactHash(
        readUtf8FileIfExistsSync(
          resolveReviewArtifactPath(paths, `opinions/review-${id}.json`),
        ) ?? 'MISSING',
      ),
    }));
    const changed = {
      ...group,
      contextStarted: true,
      contextAssignments: assignments.includes(assignment)
        ? assignments
        : [...assignments, assignment],
      contextReceipts: receipts,
      dependencyReceipts: dependencies,
    };
    const observed = await observeReviewGroupInputs(
      { ...state, groups: [changed] },
      paths,
      state.incremental.actorContext,
      state.incremental.changeContext ?? undefined,
      state.incremental.pluginRoot,
    );
    const updated = {
      ...state,
      groups: state.groups.map((entry) =>
        entry.id === group.id ? observed[0] : entry,
      ),
    };
    try {
      writeReviewGroupProgress(paths.statePath, updated, group);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'review group progress conflict'
      )
        continue;
      throw error;
    }
    const text =
      observation?.text ??
      readReviewActorBrief(
        updated,
        paths,
        observed[0],
        input.kind,
        input.round,
      );
    return createReviewContextPayload(
      paths,
      text,
      offset,
      observation?.receipt.digest,
    );
  }
  throw new Error('review context progress is busy; retry this request');
}
