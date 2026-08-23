import { lstatSync, readdirSync, realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

/** Resolve host aliases in the nearest existing ancestor of a target path. */
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
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "ENOENT"
      )
        throw error;
    }

    const canonicalParent = canonicalizeTargetPathSync(
      cwd,
      dirname(absoluteTarget),
    );
    const terminalName = basename(absoluteTarget);
    if (terminalIdentity === null)
      return resolve(canonicalParent, terminalName);

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
  }

  const suffix: string[] = [];
  let cursor = absoluteTarget;

  while (true) 
    try {
      return resolve(realpathSync.native(cursor), ...suffix);
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== "ENOENT"
      )
        throw error;

      const parent = dirname(cursor);
      if (parent === cursor) return absoluteTarget;
      suffix.unshift(basename(cursor));
      cursor = parent;
    }
  
}
