import type {
  DetailAcceptanceGroup,
  DetailAcceptanceGroupValidation,
  DocumentViolation,
} from '../../../../types/documents.js';

/** Required anchors remain even when no acceptance groups are declared. */
const REQUIRED_DETAIL_SECTIONS = [
  'Requirements',
  'API Contracts',
  'Acceptance Criteria',
  'Last Updated',
] as const;

/** Stable IDs and titles let verification files bind an unambiguous contract. */
const GROUP_HEADING = /^###\s+([A-Za-z][A-Za-z0-9._-]*)\s+—\s+(.+?)\s*$/;

/**
 * Validate declared acceptance groups while allowing contracts with none.
 * @param content - Complete DETAIL document with the required section headings.
 * @returns Groups with source lines and errors for missing sections or malformed groups.
 */
export function validateDetailAcceptanceGroups(
  content: string,
): DetailAcceptanceGroupValidation {
  const lines = content.split(/\r?\n/);
  const violations: DocumentViolation[] = [];

  for (const section of REQUIRED_DETAIL_SECTIONS)
    if (!lines.some((line) => line.trim() === `## ${section}`))
      violations.push({
        rule: 'missing-section',
        message: `DETAIL.md is missing required section "## ${section}".`,
        severity: 'error',
      });

  const groups: DetailAcceptanceGroup[] = [];
  const seen = new Set<string>();
  let insideAcceptance = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === '## Acceptance Criteria') {
      insideAcceptance = true;
      continue;
    }
    if (insideAcceptance && line.startsWith('## ')) {
      insideAcceptance = false;
      continue;
    }
    if (!insideAcceptance || !line.startsWith('### ')) continue;

    const match = GROUP_HEADING.exec(line);
    if (!match) {
      violations.push({
        rule: 'missing-field',
        message: `Invalid acceptance group heading at line ${index + 1}; expected "### <stable-id> — <title>".`,
        severity: 'error',
      });
      continue;
    }
    const [, id, title] = match;
    if (seen.has(id)) {
      violations.push({
        rule: 'duplicate-id',
        message: `Duplicate DETAIL acceptance group ID "${id}". Rename one group so every ID is unique.`,
        severity: 'error',
      });
      continue;
    }
    seen.add(id);
    groups.push({ id, title, line: index + 1 });
  }

  return { groups, violations };
}
