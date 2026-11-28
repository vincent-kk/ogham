import { portableJoin, readUtf8FileIfExistsSync } from '@ogham/cross-platform';

/**
 * Read the nonblank lines of a log file in a set.
 * @param directory Validated set directory.
 * @param name Log file name inside the set.
 * @returns Each nonblank line with its 1-based number, or an empty list when the file is absent.
 */
export function readLogLines(
  directory: string,
  name: string,
): { number: number; text: string }[] {
  const body = readUtf8FileIfExistsSync(portableJoin(directory, `./${name}`));
  return (body ?? '')
    .split(/\r?\n/)
    .map((text, index) => ({ number: index + 1, text }))
    .filter(({ text }) => text.trim() !== '');
}
