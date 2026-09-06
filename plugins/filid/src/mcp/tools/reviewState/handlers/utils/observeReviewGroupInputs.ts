import {
  assertNoSymlinkDescendantsSync,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import { renderHandoffSection } from '../../brief/utils/renderHandoffSection.js';
import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';
import { computeReviewInputManifest } from '../../hash/computeReviewInputManifest.js';
import { readHeadTreeEntries } from '../../hash/readHeadTreeEntries.js';
import { readChangeContext } from '../../scope/readChangeContext.js';
import { resolveReviewArtifactPath } from '../../state/resolveReviewArtifactPath.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type { ReviewActorContext } from '../../state/reviewIncrementalTypes.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';

import { loadPrepareReviewRules } from './loadPrepareReviewRules.js';
import { observeReviewContextReceipt } from './observeReviewContextReceipt.js';
import { readReviewActorRuntimeHash } from './readReviewActorRuntimeHash.js';

/**
 * Reobserve semantic inputs actually supplied to each group and its recorded queries.
 * @param state Fresh scope and group assignments from the canonical prepare collector.
 * @param paths Materialized diff paths for those assignments.
 * @param actorContext Host-authoritative instructions and enforced access mode.
 * @param changeContext Original supplied PR body, or undefined for generated context.
 * @param pluginRoot Resolved rule/method root.
 * @returns Groups with current input manifests; no opinions are trusted by this step.
 */
export async function observeReviewGroupInputs(
  state: ReviewStateRecord,
  paths: ReviewStatePaths,
  actorContext: ReviewActorContext,
  changeContext: string | undefined,
  pluginRoot: string | null,
  dependencyPaths = paths,
): Promise<ReviewGroup[]> {
  const unitPaths = state.groups.flatMap((group) =>
    group.units.map((unit) => unit.path),
  );
  const [head, base] = await Promise.all([
    readHeadTreeEntries(state.projectRoot, unitPaths),
    readHeadTreeEntries(state.projectRoot, unitPaths, state.baseCommit),
  ]);
  const loaded = loadPrepareReviewRules(state.projectRoot, pluginRoot);
  const context = await readChangeContext({
    projectRoot: state.projectRoot,
    baseCommit: state.baseCommit,
    files: state.scope.files,
    changeContext,
  });
  const result: ReviewGroup[] = [];
  for (const group of state.groups) {
    const files = group.units.map((unit) =>
      state.scope.files.find((file) => file.path === unit.path)!,
    );
    const ruleIds = files
      .flatMap((file) => file.rules)
      .filter((id, index, all) => all.indexOf(id) === index)
      .sort();
    const repositoryRules = files
      .flatMap((file) => file.repositoryRules)
      .filter((path, index, all) => all.indexOf(path) === index)
      .sort()
      .map((path) => {
        const absolute = resolveContainedPath(state.projectRoot, path);
        assertNoSymlinkDescendantsSync(state.projectRoot, absolute);
        return [path, readUtf8FileIfExistsSync(absolute)];
      });
    const receipts = [];
    for (const receipt of group.contextReceipts ?? []) {
      const { digest: _digest, ...query } = receipt;
      receipts.push(
        (
          await observeReviewContextReceipt(
            state.projectRoot,
            state.baseCommit,
            query,
            false,
          )
        ).receipt,
      );
    }
    const source = group.units.map((unit, index) => [
      unit.path,
      unit.change,
      unit.chunk,
      unit.hunks,
      base.get(unit.path)?.identity ?? null,
      head.get(unit.path)?.identity ?? null,
      readUtf8FileIfExistsSync(resolveReviewArtifactPath(paths, unit.diffPath)),
      files[index].role,
      files[index].owner,
    ]);
    const input = computeReviewInputManifest({
      assignment: group.units.map((unit, index) => ({
        path: unit.path,
        change: unit.change,
        chunk: unit.chunk,
        owner: files[index].owner,
      })),
      sourceHash: computeReviewArtifactHash(JSON.stringify(source)),
      rulesHash: computeReviewArtifactHash(
        JSON.stringify([
          ruleIds.map((id) =>
            loaded.activeRules.find((rule) => rule.id === id),
          ),
          repositoryRules,
        ]),
      ),
      evidenceHash: computeReviewArtifactHash(
        JSON.stringify([
          state.scope.candidates.filter((candidate) =>
            group.candidateIds.includes(candidate.id),
          ),
          context.handoff
            ? renderHandoffSection(
                context.handoff,
                files.map((file) => file.path),
              )
            : null,
        ]),
      ),
      contextHash:
        actorContext.mode === 'repository' || group.contextUnverifiable
          ? null
          : computeReviewArtifactHash(
              JSON.stringify([
                actorContext,
                context.changeContext,
                receipts,
                (group.dependencyReceipts ?? []).map((receipt) => ({
                  group: receipt.group,
                  digest: computeReviewArtifactHash(
                    readUtf8FileIfExistsSync(
                      resolveReviewArtifactPath(
                        dependencyPaths,
                        `opinions/review-${receipt.group}.json`,
                      ),
                    ) ?? 'MISSING',
                  ),
                })),
              ]),
            ),
      policyHash: computeReviewArtifactHash(
        JSON.stringify([
          1,
          state.validationPolicyVersion,
          state.effort,
          group.rounds,
          group.planRequired,
          group.riskReasons ?? [],
          loaded.actorMethods,
          readReviewActorRuntimeHash(pluginRoot),
        ]),
      ),
    });
    result.push({ ...group, input, contextReceipts: receipts });
  }
  return result;
}
