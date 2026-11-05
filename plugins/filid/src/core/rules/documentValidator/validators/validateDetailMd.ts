import type {
  DetailMdValidation,
  DocumentViolation,
} from '../../../../types/documents.js';
import { validateDetailAcceptanceGroups } from '../acceptanceGroups/validateDetailAcceptanceGroups.js';
import { parseBoundaryExemptions } from '../boundaryExemptions/parseBoundaryExemptions.js';

import { detectAppendOnly } from './utils/detectAppendOnly.js';
import { validateDocumentHistory } from './utils/validateDocumentHistory.js';

/**
 * Validate the current DETAIL contract before accepting a replacement.
 * @param content - Complete proposed Markdown document.
 * @param oldContent - Optional existing text for append-only detection.
 * @returns Contract errors, acceptance groups and declared boundary exemptions.
 */
export function validateDetailMd(
  content: string,
  oldContent?: string,
): DetailMdValidation {
  const violations: DocumentViolation[] = validateDocumentHistory(
    content,
    true,
  );
  const acceptance = validateDetailAcceptanceGroups(content);
  const boundaryExemptions = parseBoundaryExemptions(content);
  violations.push(...acceptance.violations, ...boundaryExemptions.violations);

  if (oldContent !== undefined && detectAppendOnly(oldContent, content))
    violations.push({
      rule: 'append-only',
      message:
        'DETAIL.md must not be append-only. Restructure and compress content instead of simply appending.',
      severity: 'error',
    });

  return {
    valid: violations.every((v) => v.severity !== 'error'),
    violations,
    acceptanceGroups: acceptance.groups,
    boundaryExemptions: boundaryExemptions.exemptions,
  };
}
