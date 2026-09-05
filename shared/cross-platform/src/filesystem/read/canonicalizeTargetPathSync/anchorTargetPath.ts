import type { PlatformPath } from "node:path";

/**
 * Anchor a target's root while preserving components for native path lookup.
 * @param cwd - Base directory for relative targets and Windows drive selection.
 * @param targetPath - Raw target whose symlinks must resolve before `..`.
 * @param paths - Host path primitives, explicit for cross-platform root checks.
 * @returns An absolute path with unresolved target components left intact.
 */
export function anchorTargetPath(
  cwd: string,
  targetPath: string,
  paths: Pick<PlatformPath, "parse" | "resolve" | "sep">,
): string {
  const targetRoot = paths.parse(targetPath).root;
  const anchor = paths.resolve(cwd, targetRoot);
  const remainder = targetPath.slice(targetRoot.length);
  if (remainder === "") return anchor;
  return `${anchor}${anchor.endsWith(paths.sep) ? "" : paths.sep}${remainder}`;
}
