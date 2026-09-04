import {
  ensureDirectorySync,
  portableDirname,
  resolveContainedPath,
  writeFileAtomicallySync,
} from '@ogham/cross-platform';

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
  const path = resolveContainedPath(projectRoot, relativePath);
  ensureDirectorySync(portableDirname(path));
  writeFileAtomicallySync(path, content);
}
