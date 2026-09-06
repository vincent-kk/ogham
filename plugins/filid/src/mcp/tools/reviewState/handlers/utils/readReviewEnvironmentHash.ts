import {
  assertNoSymlinkDescendantsSync,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import { computeReviewArtifactHash } from '../../hash/computeReviewArtifactHash.js';
import { findRepositoryRulePaths } from '../../rules/findRepositoryRulePaths.js';
import type { ReviewStateRecord } from '../../state/reviewStateTypes.js';

import { loadPrepareReviewRules } from './loadPrepareReviewRules.js';
import { readReviewActorRuntimeHash } from './readReviewActorRuntimeHash.js';
import { resolvePrepareSettings } from './resolvePrepareSettings.js';

/**
 * Observe local input discovery and the configured evidence-producer artifact.
 * @param state Active or staged state supplying the repository and input recipe.
 * @param pluginRoot Resolved built-in method/rule root.
 * @returns Digest used to reject stale local inputs before validation and sealing.
 */
export function readReviewEnvironmentHash(
  state: ReviewStateRecord,
  pluginRoot: string | null,
): string {
  const settings = resolvePrepareSettings({
    action: 'prepare',
    projectRoot: state.projectRoot,
  });
  const rules = loadPrepareReviewRules(state.projectRoot, pluginRoot);
  const paths = state.scope.files
    .flatMap((file) => findRepositoryRulePaths(state.projectRoot, file.path))
    .filter((path, index, all) => all.indexOf(path) === index)
    .sort();
  const documents = paths.map((path) => {
    const absolute = resolveContainedPath(state.projectRoot, path);
    assertNoSymlinkDescendantsSync(state.projectRoot, absolute);
    return [path, readUtf8FileIfExistsSync(absolute)];
  });
  return computeReviewArtifactHash(
    JSON.stringify([
      1,
      settings,
      rules,
      documents,
      readReviewActorRuntimeHash(pluginRoot),
    ]),
  );
}
