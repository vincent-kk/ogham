import {
  pathForCompare,
  portableIsAbsolute,
  portableRelative,
  portableResolve,
  samePath,
} from '@ogham/cross-platform/paths';

import { NODE_TYPES } from '../../../constants/nodeTypes.js';
import { PORTABLE_PATH_MARKERS } from '../../../constants/pathMarkers.js';
import type { FractalNode, FractalTree } from '../../../types/fractal.js';

function isWithin(parentPath: string, targetPath: string): boolean {
  if (samePath(parentPath, targetPath)) return true;
  const relative = portableRelative(parentPath, targetPath);
  const comparable = pathForCompare(relative);
  return (
    comparable !== PORTABLE_PATH_MARKERS.PARENT &&
    !comparable.startsWith(PORTABLE_PATH_MARKERS.PARENT_PREFIX) &&
    !portableIsAbsolute(relative)
  );
}

function findNode(tree: FractalTree, nodePath: string): FractalNode | null {
  return (
    [...tree.nodes.values()].find((node) => samePath(node.path, nodePath)) ??
    null
  );
}

export function resolveOwningFractal(
  tree: FractalTree,
  targetPath: string,
): FractalNode | null {
  const resolvedTarget = portableResolve(tree.root, targetPath);
  if (!isWithin(tree.root, resolvedTarget)) return null;
  const containingNode = [...tree.nodes.values()]
    .filter((node) => isWithin(node.path, resolvedTarget))
    .sort(
      (left, right) =>
        pathForCompare(right.path).length - pathForCompare(left.path).length,
    )[0];
  if (!containingNode) return null;

  let current: FractalNode | null = containingNode;
  while (current && current.type !== NODE_TYPES.FRACTAL)
    current = current.parentFractalPath
      ? findNode(tree, current.parentFractalPath)
      : null;
  return current;
}
