import {
  ensureDirectorySync,
  portableDirname,
  resolveContainedPath,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

import { resolveReviewStateFixtureArtifact } from './resolveReviewStateFixtureArtifact.js';

/**
 * Write one project-relative file in a temporary review-state repository.
 *
 * @param projectRoot - Absolute temporary repository root.
 * @param relativePath - Project-relative destination bounded by the fixture root.
 * @param content - Exact UTF-8 fixture bytes to persist.
 * @returns Nothing.
 */
export function writeReviewStateFixtureFile(
  projectRoot: string,
  relativePath: string,
  content: string,
): void {
  const artifact = relativePath.match(/^\.filid\/review\/([^/]+)\/(.+)$/);
  const path = artifact
    ? resolveReviewStateFixtureArtifact(projectRoot, artifact[1], artifact[2])
    : resolveContainedPath(projectRoot, relativePath);
  ensureDirectorySync(portableDirname(path));
  writeFileAtomicallySync(path, content);
}
