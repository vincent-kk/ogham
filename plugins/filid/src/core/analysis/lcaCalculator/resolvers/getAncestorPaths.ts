import { samePath } from '@ogham/cross-platform/paths';

import type { FractalNode, FractalTree } from '../../../../types/fractal.js';

function findCanonicalNode(
  tree: FractalTree,
  nodePath: string,
): FractalNode | null {
  return (
    [...tree.nodes.values()].find((node) => samePath(node.path, nodePath)) ??
    null
  );
}

/**
 * 노드에서 루트까지의 조상 경로 배열을 반환한다.
 * [nodePath, parent, grandparent, ..., root] 순서.
 *
 * @param tree - 탐색할 프랙탈 트리
 * @param nodePath - 시작 노드의 경로
 * @returns 경로 배열 (자신 포함)
 */
export function getAncestorPaths(
  tree: FractalTree,
  nodePath: string,
): string[] {
  const node = findCanonicalNode(tree, nodePath);
  if (!node) return [];
  const paths = [node.path];
  let currentPath = node.parent;
  while (currentPath) {
    const current = tree.nodes.get(currentPath);
    if (!current) return [];
    paths.push(current.path);
    currentPath = current.parent;
  }
  return paths;
}
