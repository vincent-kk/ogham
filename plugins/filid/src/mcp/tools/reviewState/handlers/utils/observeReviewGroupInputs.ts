import {
  assertNoSymlinkDescendantsSync,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';
import { computeReviewInputManifest } from '../../hash/computeReviewInputManifest.js';
import { readHeadTreeEntries } from '../../hash/readHeadTreeEntries.js';
import { readChangeContext } from '../../scope/readChangeContext.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type { ReviewInputManifest } from '../../state/reviewIncrementalTypes.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';

import { loadPrepareReviewRules } from './loadPrepareReviewRules.js';

/**
 * Fingerprint each committed file's explicitly assigned judgment inputs.
 * @param state Fresh canonical scope and assignments.
 * @param paths Generation paths; source identity always comes from Git.
 * @param userInstructions Explicit user review requirements.
 * @param changeContext Supplied PR handoff; generated Git metadata is informational.
 * @param pluginRoot Canonical rule and method root.
 * @returns Groups with path-neutral file manifests and aggregate input identities.
 */
export async function observeReviewGroupInputs(
  state: ReviewStateRecord,
  _paths: ReviewStatePaths,
  userInstructions: string,
  changeContext: string | undefined,
  pluginRoot: string | null,
): Promise<ReviewGroup[]> {
  const head = await readHeadTreeEntries(
    state.projectRoot,
    state.scope.files.map((file) => file.path),
  );
  const loaded = loadPrepareReviewRules(state.projectRoot, pluginRoot);
  const context = await readChangeContext({
    projectRoot: state.projectRoot,
    baseCommit: state.baseCommit,
    files: state.scope.files,
    changeContext,
  });
  const manifests: Record<string, ReviewInputManifest> = {};
  for (const file of state.scope.files) {
    const repositoryRules = file.repositoryRules.map((path) => {
      const absolute = resolveContainedPath(state.projectRoot, path);
      assertNoSymlinkDescendantsSync(state.projectRoot, absolute);
      return [path, readUtf8FileIfExistsSync(absolute)];
    });
    const related = (path: string) =>
      path === file.path ||
      path === file.owner ||
      (path !== '.' && file.path.startsWith(path + '/'));
    const candidates = state.scope.candidates
      .filter((candidate) => related(candidate.path))
      .map(({ id: _id, ...candidate }) => ({
        ...candidate,
        path: candidate.path === file.path ? '@file' : candidate.path,
      }));
    const claims =
      context.handoff?.recorded
        .filter((entry) => related(entry.path) || entry.path === '.')
        .map((entry) => ({
          ...entry,
          path: entry.path === file.path ? '@file' : entry.path,
        })) ?? [];
    manifests[file.path] = computeReviewInputManifest({
      assignment: [
        {
          path: '@file',
          change: head.has(file.path) ? 'M' : 'D',
          chunk: null,
          owner: file.owner,
        },
      ],
      sourceHash: computeReviewArtifactHash(
        JSON.stringify([
          head.get(file.path)?.identity ?? null,
          file.role,
          file.skipReason,
        ]),
      ),
      rulesHash: computeReviewArtifactHash(
        JSON.stringify([
          file.rules.map((id) =>
            loaded.activeRules.find((rule) => rule.id === id),
          ),
          repositoryRules,
        ]),
      ),
      evidenceHash: computeReviewArtifactHash(
        JSON.stringify([candidates, claims]),
      ),
      contextHash: computeReviewArtifactHash(userInstructions),
      policyHash: computeReviewArtifactHash(
        JSON.stringify([
          state.validationPolicyVersion,
          state.effort,
          loaded.actorMethods,
        ]),
      ),
    });
  }
  return state.groups.map((group) => {
    const fileInputs = Object.fromEntries(
      group.units.map((unit) => [unit.path, manifests[unit.path]]),
    );
    const values = Object.values(fileInputs);
    return {
      ...group,
      fileInputs,
      input: computeReviewInputManifest({
        assignment: group.units.map((unit) => ({
          path: unit.path,
          change: unit.change,
          chunk: unit.chunk,
          owner:
            state.scope.files.find((file) => file.path === unit.path)?.owner ??
            null,
        })),
        sourceHash: computeReviewArtifactHash(
          JSON.stringify(values.map((value) => value.sourceHash)),
        ),
        rulesHash: computeReviewArtifactHash(
          JSON.stringify(values.map((value) => value.rulesHash)),
        ),
        evidenceHash: computeReviewArtifactHash(
          JSON.stringify([
            values.map((value) => value.evidenceHash),
            group.units.length === 0 ? state.scope.candidates : [],
          ]),
        ),
        contextHash: computeReviewArtifactHash(userInstructions),
        policyHash: computeReviewArtifactHash(
          JSON.stringify([
            state.validationPolicyVersion,
            state.effort,
            loaded.actorMethods,
          ]),
        ),
      }),
    };
  });
}
