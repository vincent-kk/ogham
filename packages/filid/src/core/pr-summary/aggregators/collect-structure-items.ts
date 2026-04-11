import type { SummaryItem } from '../../../types/summary.js';
import { parseStructureCheckFrontmatter } from '../parsers/parse-structure-check.js';

/** structure-check.md에서 FAIL 스테이지를 SummaryItem으로 변환한다. */
export function collectStructureItems(content: string): {
  items: SummaryItem[];
  warnings: string[];
} {
  const items: SummaryItem[] = [];
  const warnings: string[] = [];
  const fm = parseStructureCheckFrontmatter(content);
  if (fm) {
    for (const [stage, result] of Object.entries(fm.stageResults)) {
      if (result === 'FAIL') {
        items.push({
          severity: 'warning',
          message: `${stage} 검증 실패`,
          autoFixable: false,
          errorProbability: 0.7,
        });
      }
    }
  } else {
    warnings.push('structure-check.md frontmatter 파싱 실패');
  }
  return { items, warnings };
}
