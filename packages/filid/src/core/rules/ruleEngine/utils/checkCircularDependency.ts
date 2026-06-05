import type { RuleContext, RuleViolation } from '../../../../types/rules.js';

export function checkCircularDependency(
  _context: RuleContext,
): RuleViolation[] {
  // Phase 2 placeholder: 순환 의존 감지는 project-analyzer 레벨에서 수행
  // 개별 노드 컨텍스트에서는 전체 의존 그래프가 없으므로 빈 배열 반환
  return [];
}
