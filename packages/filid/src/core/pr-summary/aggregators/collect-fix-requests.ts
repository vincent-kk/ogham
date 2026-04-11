import type { SummaryItem } from '../../../types/summary.js';
import { AUTO_FIXABLE_RULES } from '../../../constants/review-probabilities.js';
import { parseFixRequests } from '../parsers/parse-fix-requests.js';
import { mapSeverity } from './map-severity.js';
import { computeErrorProbability } from './compute-error-probability.js';

/** fix-requests.md에서 항목들을 SummaryItem으로 변환한다. */
export function collectFixRequestItems(content: string): SummaryItem[] {
  const fixItems = parseFixRequests(content);
  return fixItems.map((item) => {
    const ruleId = item.rule;
    return {
      severity: mapSeverity(item.severity),
      message:
        item.recommendedAction ||
        item.title ||
        `${item.id}: ${item.severity} 위반`,
      path: item.filePath || undefined,
      ruleId: ruleId || undefined,
      autoFixable: AUTO_FIXABLE_RULES.has(ruleId),
      errorProbability: computeErrorProbability(ruleId, item.severity),
    };
  });
}
