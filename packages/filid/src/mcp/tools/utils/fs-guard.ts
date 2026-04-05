import { resolve } from 'node:path';

/**
 * Assert `targetPath` resolves under `parentDir`; return the resolved target
 * or throw on traversal. Shared containment helper for MCP write handlers.
 */
export function assertUnder(parentDir: string, targetPath: string): string {
  const resolvedParent = resolve(parentDir);
  const resolvedTarget = resolve(targetPath);
  if (
    resolvedTarget !== resolvedParent &&
    !resolvedTarget.startsWith(resolvedParent + '/') &&
    !resolvedTarget.startsWith(resolvedParent + '\\')
  ) {
    throw new Error(
      `Invalid path: traversal detected outside ${resolvedParent}`,
    );
  }
  return resolvedTarget;
}
