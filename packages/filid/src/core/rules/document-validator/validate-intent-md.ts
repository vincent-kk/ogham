import type {
  DocumentViolation,
  IntentMdValidation,
} from '../../../types/documents.js';
import { INTENT_MD_LINE_LIMIT, BOUNDARY_KEYWORDS } from '../../../constants/document-validation.js';
import { countLines } from './count-lines.js';

/**
 * Validate an INTENT.md document.
 * - 50-line limit
 * - 3-tier boundary presence (Always do / Ask first / Never do)
 */
export function validateIntentMd(content: string): IntentMdValidation {
  const violations: DocumentViolation[] = [];

  // Check 50-line limit
  const lines = countLines(content);
  if (lines > INTENT_MD_LINE_LIMIT) {
    violations.push({
      rule: 'line-limit',
      message: `INTENT.md exceeds ${INTENT_MD_LINE_LIMIT}-line limit (${lines} lines). Compress, deduplicate, or move detailed content to DETAIL.md.`,
      severity: 'error',
    });
  }

  // Check 3-tier boundary system presence
  const hasAlwaysDo = BOUNDARY_KEYWORDS.alwaysDo.test(content);
  const hasAskFirst = BOUNDARY_KEYWORDS.askFirst.test(content);
  const hasNeverDo = BOUNDARY_KEYWORDS.neverDo.test(content);

  if (!hasAlwaysDo || !hasAskFirst || !hasNeverDo) {
    const missing: string[] = [];
    if (!hasAlwaysDo) missing.push('Always do');
    if (!hasAskFirst) missing.push('Ask first');
    if (!hasNeverDo) missing.push('Never do');
    violations.push({
      rule: 'missing-boundaries',
      message: `INTENT.md is missing 3-tier boundary sections: ${missing.join(', ')}`,
      severity: 'warning',
    });
  }

  return {
    valid: violations.every((v) => v.severity !== 'error'),
    violations,
  };
}
