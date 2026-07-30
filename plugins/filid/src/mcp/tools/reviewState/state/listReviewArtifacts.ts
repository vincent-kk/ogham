import {
  listDirectoryIfExistsSync,
  resolveContainedPath,
} from '@ogham/cross-platform';

export function listReviewArtifacts(reviewDirectory: string): string[] {
  return listDirectoryIfExistsSync(reviewDirectory)
    .map((entry) => resolveContainedPath(reviewDirectory, entry))
    .sort();
}
