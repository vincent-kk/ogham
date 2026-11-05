import type { DocumentViolation } from '../../../../../types/documents.js';
import { splitMarkdownSections } from '../../derivableContent/utils/splitMarkdownSections.js';

/**
 * Keep version history out of the current contract without interpreting domain prose.
 * @param content - Complete Markdown document; fenced examples are ignored.
 * @param detail - Whether the document owns a Last Updated trigger section.
 * @returns Section-scoped errors with repair actions; never changes the document.
 */
export function validateDocumentHistory(
  content: string,
  detail: boolean,
): DocumentViolation[] {
  const violations: DocumentViolation[] = [];
  for (const section of splitMarkdownSections(content)) {
    if (section.title === 'History')
      violations.push({
        rule: 'history-section',
        section: section.title,
        severity: 'error',
        message:
          'Move each decision and its reason into the contract sections as present facts, then delete the History section.',
      });
    if (
      detail &&
      section.title === 'Last Updated' &&
      (!section.body.trim() ||
        /\b\d{4}[-./]\d{1,2}[-./]\d{1,2}\b/.test(section.body))
    )
      violations.push({
        rule: 'last-updated-trigger',
        section: section.title,
        severity: 'error',
        message:
          'State what triggers an update of the document under Last Updated, never a date.',
      });
  }
  return violations;
}
