import type { FractalNode, FractalTree } from '../../../types/fractal.js';

import { getAncestorPaths } from './get-ancestor-paths.js';

/**
 * 두 노드의 Lowest Common Ancestor(LCA)를 반환한다.
 *
 * Naive parent traversal 알고리즘:
 * 1. pathA의 조상 집합을 구한다
 * 2. pathB의 조상 경로를 순회하며 집합에 있는 첫 번째 경로를 반환한다
 *
 * @param tree - 탐색할 프랙탈 트리
 * @param pathA - 첫 번째 노드의 경로
 * @param pathB - 두 번째 노드의 경로
 * @returns LCA 노드. 없으면 null
 */
export function findLCA(
  tree: FractalTree,
  pathA: string,
  pathB: string,
): FractalNode | null {
  if (!tree.nodes.has(pathA) || !tree.nodes.has(pathB)) return null;

  // 동일 노드인 경우
  if (pathA === pathB) return tree.nodes.get(pathA) ?? null;

  const ancestorsA = new Set(getAncestorPaths(tree, pathA));

  for (const ancestor of getAncestorPaths(tree, pathB)) {
    if (ancestorsA.has(ancestor)) {
      return tree.nodes.get(ancestor) ?? null;
    }
  }

  // fallback: 루트 반환
  return tree.nodes.get(tree.root) ?? null;
}
