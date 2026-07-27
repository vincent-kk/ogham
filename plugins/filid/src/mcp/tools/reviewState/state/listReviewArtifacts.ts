import { listDirectoryIfExistsSync } from '@ogham/cross-platform/filesystem';
import { resolveContainedPath } from '@ogham/cross-platform/paths';

export function listReviewArtifacts(reviewDirectory: string): string[] {
  return listDirectoryIfExistsSync(reviewDirectory)
    .map((entry) => resolveContainedPath(reviewDirectory, entry))
    .sort();
}
