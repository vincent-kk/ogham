import type {
  DetailMdValidation,
  DocumentViolation,
} from '../../../types/documents.js';

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
