import { portableResolve } from '@ogham/cross-platform/compat/resolve';

import type {
  ContextDocumentRef,
  ContextResolution,
} from '../../types/context.js';
import type { ProjectSnapshot } from '../../types/fractal.js';

import { toContextDocumentRef } from './documents/toContextDocumentRef.js';
import { findContainingNode } from './pathing/findContainingNode.js';
import { isPathWithin } from './pathing/isPathWithin.js';

export function resolveContext(
  snapshot: ProjectSnapshot,
  targetPath: string,
): ContextResolution {
  const resolvedTarget = portableResolve(snapshot.projectRoot, targetPath);
  if (!isPathWithin(snapshot.projectRoot, resolvedTarget))
    throw new Error(`Target is outside the project root: ${targetPath}`);

  const targetNode = findContainingNode(snapshot.tree, resolvedTarget);
  if (!targetNode)
    throw new Error(`No snapshot node owns target path: ${targetPath}`);
  const ownerPath =
    targetNode.type === 'fractal' || targetNode.type === 'hybrid'
      ? targetNode.path
      : targetNode.parentFractalPath;
  if (!ownerPath)
    throw new Error(`No owning fractal for target path: ${targetPath}`);

  const chain: ContextDocumentRef[] = [];
  let currentPath: string | null = ownerPath;
  while (currentPath) {
    const node = snapshot.tree.nodes.get(currentPath);
    if (!node)
      throw new Error(`Snapshot owner chain is incomplete at ${currentPath}`);
    chain.push(toContextDocumentRef(node));
    currentPath = node.parentFractalPath;
  }

  return {
    targetPath: resolvedTarget,
    ownerFractalPath: ownerPath,
    chain,
    nearestDetailPath:
      chain.find((document) => document.detailPath)?.detailPath ?? null,
    outputLanguage: snapshot.outputLanguage,
  };
}
