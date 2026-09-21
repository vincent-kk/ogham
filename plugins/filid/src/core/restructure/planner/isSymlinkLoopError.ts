/**
 * Whether a filesystem error means the path runs through a symbolic link loop.
 * @param error - Error thrown by a filesystem call
 * @returns True for `ELOOP`
 */
export function isSymlinkLoopError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ELOOP';
}
