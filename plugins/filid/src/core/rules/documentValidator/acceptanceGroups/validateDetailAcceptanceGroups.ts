import type {
  DetailAcceptanceGroup,
  DetailAcceptanceGroupValidation,
  DocumentViolation,
} from '../../../../types/documents.js';

const REQUIRED_DETAIL_SECTIONS = [
  'Requirements',
  'API Contracts',
  'Acceptance Criteria',
  'Last Updated',
] as const;

const GROUP_HEADING = /^###\s+([A-Za-z][A-Za-z0-9._-]*)\s+—\s+(.+?)\s*$/;

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
        message: `Duplicate DETAIL acceptance group ID "${id}".`,
        severity: 'error',
      });
      continue;
    }
    seen.add(id);
    groups.push({ id, title, line: index + 1 });
  }

  if (
    lines.some((line) => line.trim() === '## Acceptance Criteria') &&
    groups.length === 0
  )
    violations.push({
      rule: 'missing-field',
      message: 'DETAIL.md must declare at least one acceptance group.',
      severity: 'error',
    });

  return { groups, violations };
}
