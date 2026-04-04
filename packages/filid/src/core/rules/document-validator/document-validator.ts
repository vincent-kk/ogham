import type {
  DetailMdValidation,
  DocumentViolation,
  IntentMdValidation,
} from '../../../types/documents.js';
import { INTENT_MD_LINE_LIMIT, BOUNDARY_KEYWORDS } from '../../../constants/document-validation.js';

/**
 * Count the actual number of lines in a string.
 * Empty string returns 0, trailing newline is ignored.
 */
export function countLines(content: string): number {
  if (content.length === 0) return 0;
  const trimmed = content.endsWith('\n') ? content.slice(0, -1) : content;
  if (trimmed.length === 0) return 0;
  return trimmed.split('\n').length;
}

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

/**
 * Detect pure append-only changes.
 * Returns true if all old lines remain at the start of new content
 * and only new lines are added at the end.
 */
export function detectAppendOnly(
  oldContent: string,
  newContent: string,
): boolean {
  if (oldContent.length === 0) return false;

  const oldLines = oldContent.trimEnd().split('\n');
  const newLines = newContent.trimEnd().split('\n');

  // New content must be longer for append
  if (newLines.length <= oldLines.length) return false;

  // All existing lines must remain identical
  for (let i = 0; i < oldLines.length; i++) {
    if (oldLines[i] !== newLines[i]) return false;
  }

  return true;
}

/**
 * Validate a DETAIL.md document.
 * - Append-only pattern prohibited (when oldContent provided)
 */
export function validateDetailMd(
  content: string,
  oldContent?: string,
): DetailMdValidation {
  const violations: DocumentViolation[] = [];

  // Detect append-only (when previous content is provided)
  if (oldContent !== undefined && detectAppendOnly(oldContent, content)) {
    violations.push({
      rule: 'append-only',
      message:
        'DETAIL.md must not be append-only. Restructure and compress content instead of simply appending.',
      severity: 'error',
    });
  }

  return {
    valid: violations.every((v) => v.severity !== 'error'),
    violations,
  };
}
