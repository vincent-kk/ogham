import type { FractalTree } from '../../../types/fractal.js';

import { findLowestCommonFractal } from './findLowestCommonFractal.js';

/**
 * 여러 의존 모듈을 분석하여 공유 코드를 배치할 최적 fractal 레벨을 제안한다.
 *
 * 모든 의존 모듈 쌍의 LCA 중 가장 깊은 것을 선택한다.
 *
 * @param tree - 탐색할 프랙탈 트리
 * @param dependencies - 배치 위치를 결정할 의존 모듈 경로 목록
 * @returns 최적 배치 정보 (suggestedParent 경로, confidence)
 */
export function getModulePlacement(
  tree: FractalTree,
  dependencies: string[],
): { suggestedParent: string; confidence: number } {
  if (dependencies.length === 0)
    return { suggestedParent: tree.root, confidence: 0 };

  if (dependencies.length === 1) {
    const node = tree.nodes.get(dependencies[0]);
    const parent = node?.parent ?? tree.root;
    return { suggestedParent: parent, confidence: 0.5 };
  }

  const commonFractal = findLowestCommonFractal(tree, dependencies);
  return {
    suggestedParent: commonFractal?.path ?? tree.root,
    confidence: commonFractal ? 1 : 0,
  };
}
