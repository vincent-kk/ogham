import { pathForCompare } from '@ogham/cross-platform';

export function canonicalizeNodePaths(nodePaths: readonly string[]): string[] {
  const canonicalByIdentity = new Map<string, string>();
  for (const nodePath of nodePaths) {
    const identity = pathForCompare(nodePath);
    if (!canonicalByIdentity.has(identity))
      canonicalByIdentity.set(identity, nodePath);
  }
  return [...canonicalByIdentity.values()].sort();
}
