import {
  assertNoSymlinkDescendantsSync,
  readUtf8FileIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

import { resolveReviewArtifactPath } from '../../state/resolveReviewArtifactPath.js';
import type { ReviewGroup } from '../../state/reviewGroupTypes.js';
import type {
  ReviewStatePaths,
  ReviewStateRecord,
} from '../../state/reviewStateTypes.js';

/**
 * Supply one actor's method, host instructions and prepared artifacts through the broker.
 * @param state Active state; other groups and their capabilities are never returned.
 * @param paths Active generation paths.
 * @param group Authorized target group.
 * @param kind Actor role selected by the current handoff.
 * @param round Current reviewer round, absent for verifier work.
 * @returns Full text for bounded pagination by the context response renderer.
 */
export function readReviewActorBrief(
  state: ReviewStateRecord,
  paths: ReviewStatePaths,
  group: ReviewGroup,
  kind: 'review' | 'verify',
  round?: number,
): string {
  const brief = readUtf8FileIfExistsSync(
    resolveReviewArtifactPath(
      paths,
      kind === 'review' ? group.briefPath : group.verifyBriefPath,
    ),
  );
  if (brief === null) throw new Error('prepared actor brief is missing');
  const rules = state.scope.files
    .filter((file) => group.units.some((unit) => unit.path === file.path))
    .flatMap((file) => file.repositoryRules)
    .filter((path, index, all) => all.indexOf(path) === index);
  const documents = rules.map((path) => {
    const absolute = resolveContainedPath(state.projectRoot, path);
    assertNoSymlinkDescendantsSync(state.projectRoot, absolute);
    return `Repository rule ${JSON.stringify(path)}:\n${readUtf8FileIfExistsSync(absolute) ?? 'UNAVAILABLE'}`;
  });
  const artifacts = [
    ...group.dependsOn.map((id) => `opinions/review-${id}.json`),
    ...(kind === 'review'
      ? [
          `opinions/review-${group.id}.r${round}.json`,
          ...(round! > 1 ? [group.opinionPath] : []),
        ]
      : [group.opinionPath]),
  ];
  return [
    `Host-authoritative USR catalog:\n${state.incremental!.actorContext.userInstructions || '(explicitly empty)'}`,
    'Access all context through this broker. Submit the opinion object through operation submit. Artifact paths and sourceHash are provenance, not additional review instructions.',
    brief,
    ...documents,
    ...[...group.units.map((unit) => unit.diffPath), ...artifacts].map(
      (path) =>
        `${path}:\n${readUtf8FileIfExistsSync(resolveReviewArtifactPath(paths, path)) ?? 'UNAVAILABLE'}`,
    ),
  ].join('\n\n');
}
