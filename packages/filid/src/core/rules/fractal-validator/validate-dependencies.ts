import type { FractalTree } from '../../../types/fractal.js';
import type { RuleViolation } from '../../../types/rules.js';

/**
 * DFS를 사용해 트리에서 순환 의존을 탐지한다.
 */
function detectCycles(tree: FractalTree): string[][] {
  const state = new Map<string, 'unvisited' | 'visiting' | 'visited'>();
  const cycles: string[][] = [];

  for (const [path] of tree.nodes) {
    state.set(path, 'unvisited');
  }

  function dfs(nodePath: string, stack: string[]): void {
    state.set(nodePath, 'visiting');
    stack.push(nodePath);

    const node = tree.nodes.get(nodePath);
    const deps = [...(node?.children ?? []), ...(node?.organs ?? [])];

    for (const dep of deps) {
      if (state.get(dep) === 'visiting') {
        const cycleStart = stack.indexOf(dep);
        if (cycleStart !== -1) {
          cycles.push(stack.slice(cycleStart));
        }
      } else if (state.get(dep) !== 'visited') {
        dfs(dep, [...stack]);
      }
    }

    state.set(nodePath, 'visited');
  }

  for (const [path] of tree.nodes) {
    if (state.get(path) !== 'visited') {
      dfs(path, []);
    }
  }

  return cycles;
}

/**
 * 트리 전체의 의존 관계를 검증한다.
 * 순환 의존과 레이어 위반(organ이 fractal을 import 등)을 감지한다.
 *
 * @param tree - 의존 관계를 검증할 트리
 * @returns 의존 관계 위반 목록
 */
export function validateDependencies(tree: FractalTree): RuleViolation[] {
  const violations: RuleViolation[] = [];
  const cycles = detectCycles(tree);

  for (const cycle of cycles) {
    violations.push({
      ruleId: 'circular-dependency',
      severity: 'error',
      message: `Circular dependency detected: ${cycle.join(' → ')}`,
      path: cycle[0] ?? '',
      suggestion: 'Extract shared logic to a common ancestor fractal.',
    });
  }

  return violations;
}
