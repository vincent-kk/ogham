/**
 * Whether a filesystem error means a file read met a directory at the path.
 * @param error - Error thrown by a filesystem call
 * @returns True for `EISDIR`
 */
export function isDirectoryReadError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EISDIR';
}
