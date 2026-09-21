import { realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative } from 'node:path';

/**
 * Whether a symbolic link leads to a directory or a source file outside the root.
 * @param realRoot Project root with its links followed; the caller resolves it once per walk.
 * @param linkPath Absolute path of the link.
 * @param namesSource Whether the link's own name carries a source extension.
 * @returns True when the link resolves outside the root's real location to a
 *   directory, or to a file while `namesSource`; false for a dangling link or
 *   a loop, which hold nothing to analyze.
 */
export function isLinkOutside(
  realRoot: string,
  linkPath: string,
  namesSource: boolean,
): boolean {
  let target: string;
  try {
    if (!statSync(linkPath).isDirectory() && !namesSource) return false;
    target = realpathSync(linkPath);
  } catch {
    return false;
  }
  const fromRoot = relative(realRoot, target);
  return fromRoot.startsWith('..') || isAbsolute(fromRoot);
}
