import { DERIVABLE_ENUMERATION_THRESHOLD } from '../../../../constants/documentValidation.js';
import type { DocumentViolation } from '../../../../types/documents.js';

import { extractPathTokens } from './utils/extractPathTokens.js';
import { splitMarkdownSections } from './utils/splitMarkdownSections.js';

/**
 * Flag sections that enumerate the tree: a section whose body carries
 * DERIVABLE_ENUMERATION_THRESHOLD or more distinct path tokens reads as a
 * file or directory inventory, which `ls` already answers.
 */
export function detectDerivableEnumeration(
  content: string,
): DocumentViolation[] {
  const violations: DocumentViolation[] = [];
  for (const section of splitMarkdownSections(content)) {
    const tokens = extractPathTokens(section.body);
    if (tokens.length < DERIVABLE_ENUMERATION_THRESHOLD) continue;
    const where = section.title === '' ? 'the preamble' : `"${section.title}"`;
    violations.push({
      rule: 'derivable-content',
      section: section.title,
      message: `Section ${where} lists ${tokens.length} path tokens — a derivable inventory. Keep only what the tree cannot say (name traps, generated-vs-canonical), with a reason.`,
      severity: 'warning',
    });
  }
  return violations;
}
