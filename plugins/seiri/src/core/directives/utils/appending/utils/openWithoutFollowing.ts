import { constants, lstatSync, openSync } from 'node:fs';

/**
 * Open a file for reading and appending without following a link at its path.
 * @param path File to open; created when absent.
 * @returns The descriptor, or undefined when the path is a symbolic link.
 * @throws For any other open failure, such as missing permissions.
 */
export function openWithoutFollowing(path: string): number | undefined {
  if (
    !constants.O_NOFOLLOW &&
    lstatSync(path, { throwIfNoEntry: false })?.isSymbolicLink()
  )
    return undefined;
  const flags =
    constants.O_RDWR |
    constants.O_APPEND |
    constants.O_CREAT |
    (constants.O_NOFOLLOW ?? 0);
  try {
    return openSync(path, flags);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ELOOP')
      return undefined;
    throw error;
  }
}
