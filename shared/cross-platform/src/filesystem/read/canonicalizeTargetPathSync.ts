import { lstatSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

/**
 * Resolve host aliases in the nearest existing ancestor of a target path.
 * @param cwd - Directory used to resolve a relative `targetPath`.
 * @param targetPath - Path to canonicalize, relative to `cwd` or absolute.
 * @param options - When `preserveTerminalEntry` is set, the final path
 *   component is kept as an entry rather than followed as a symlink.
 * @returns The host-canonical absolute path for `targetPath`.
 */
export function canonicalizeTargetPathSync(
  cwd: string,
  targetPath: string,
  options: Readonly<{ preserveTerminalEntry?: boolean }> = {},
): string {
  const absoluteTarget = resolve(cwd, targetPath);

  if (options.preserveTerminalEntry) {
    let terminalIdentity: { dev: number; ino: number } | null = null;
    try {
      // Validate the full parent chain without dereferencing the final entry.
      const terminalStat = lstatSync(absoluteTarget);
      terminalIdentity = { dev: terminalStat.dev, ino: terminalStat.ino };
    } catch (error) {
      rethrowUnlessEnoent(error);
    }

    const canonicalParent = canonicalizeTargetPathSync(
      cwd,
      dirname(absoluteTarget),
    );
    const terminalName = basename(absoluteTarget);
    if (terminalIdentity === null)
      return resolve(canonicalParent, terminalName);

    return resolveTerminalEntry(
      canonicalParent,
      terminalName,
      terminalIdentity,
    );
  }

  const suffix: string[] = [];
  let cursor = absoluteTarget;

  while (true) 
    try {
      return resolve(realpathSync.native(cursor), ...suffix);
    } catch (error) {
      rethrowUnlessEnoent(error);

      const parent = dirname(cursor);
      if (parent === cursor) return absoluteTarget;
      suffix.unshift(basename(cursor));
      cursor = parent;
    }
  
}

/**
 * Re-throw unless `error` is a missing-path (`ENOENT`) failure.
 * @param error - Value caught from a filesystem call.
 */
const rethrowUnlessEnoent = (error: unknown): void => {
  if (
    typeof error !== "object" ||
    error === null ||
    !("code" in error) ||
    error.code !== "ENOENT"
  )
    throw error;
};

/**
 * Pick the directory entry whose name and inode match the terminal identity.
 * @param canonicalParent - Canonical parent directory of the terminal entry.
 * @param terminalName - Basename as given on the requested path.
 * @param terminalIdentity - Device and inode of the existing terminal entry.
 * @returns Absolute path using the matching host spelling, or `terminalName`.
 */
const resolveTerminalEntry = (
  canonicalParent: string,
  terminalName: string,
  terminalIdentity: Readonly<{ dev: number; ino: number }>,
): string => {
  const terminalKey = terminalName.toLowerCase();
  const hostEntry = readdirSync(canonicalParent).find((entry) => {
    if (entry === terminalName) return true;
    if (entry.toLowerCase() !== terminalKey) return false;
    const entryStat = lstatSync(resolve(canonicalParent, entry));
    return (
      entryStat.dev === terminalIdentity.dev &&
      entryStat.ino === terminalIdentity.ino
    );
  });
  return resolve(canonicalParent, hostEntry ?? terminalName);
};
