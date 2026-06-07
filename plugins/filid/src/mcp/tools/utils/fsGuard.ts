import {
  pathForCompare,
  portableResolve,
  samePath,
} from '@ogham/cross-platform/paths';

/**
 * Assert `targetPath` resolves under `parentDir`; return the resolved target
 * or throw on traversal. Shared containment helper for MCP write handlers.
 */
export function assertUnder(parentDir: string, targetPath: string): string {
  const resolvedParent = portableResolve(parentDir);
  const resolvedTarget = portableResolve(targetPath);
  const parentForCompare = pathForCompare(resolvedParent);
  const targetForCompare = pathForCompare(resolvedTarget);
  if (
    !samePath(resolvedTarget, resolvedParent) &&
    !targetForCompare.startsWith(parentForCompare + '/')
  )
    throw new Error(
      `Invalid path: traversal detected outside ${resolvedParent}`,
    );

  return resolvedTarget;
}
