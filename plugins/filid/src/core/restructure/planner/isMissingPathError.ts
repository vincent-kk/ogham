/**
 * Whether a filesystem error means nothing sits at the path, including a path
 * whose ancestor is a file.
 * @param error - Error thrown by a filesystem call
 * @returns True for `ENOENT` and `ENOTDIR`
 */
export function isMissingPathError(error: unknown): boolean {
  return (
    error instanceof Error &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  );
}
