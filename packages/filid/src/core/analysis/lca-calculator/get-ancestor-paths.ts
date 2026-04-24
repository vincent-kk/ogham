import type { FractalTree } from '../../../types/fractal.js';
import { getAncestors } from '../../tree/fractal-tree/fractal-tree.js';

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
  if (!tree.nodes.has(nodePath)) return [];
  const ancestors = getAncestors(tree, nodePath);
  return [nodePath, ...ancestors.map((n) => n.path)];
}
