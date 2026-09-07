import { canonicalizeTargetPathSync } from '@ogham/cross-platform';

/**
 * Resolve a mutation target without losing document gates on filesystem errors.
 * @param cwd Validated host working directory.
 * @param path Host-supplied target, also used when canonicalization is unavailable.
 * @param preserveTerminalEntry Whether Delete must preserve the final symlink.
 * @returns Physical target, or the original path for conservative string checks.
 */
export function resolveHookTargetPath(
  cwd: string,
  path: string,
  preserveTerminalEntry = false,
): string {
  try {
    return canonicalizeTargetPathSync(cwd, path, { preserveTerminalEntry });
  } catch {
    return path;
  }
}
