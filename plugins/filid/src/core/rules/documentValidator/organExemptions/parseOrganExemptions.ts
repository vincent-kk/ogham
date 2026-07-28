import type {
  DocumentViolation,
  OrganExemptionDeclaration,
  OrganExemptionValidation,
} from '../../../../types/documents.js';

const SECTION_HEADING = '## Organ Exemptions';
const ENTRY_HEADING = /^###\s+(\S+)\s+—\s+(.+?)\s*$/;
const FIELD = /^-\s+\*\*(Consumers|Direct import|Reason)\*\*:\s*(.*)$/;
const DIRECT_IMPORT_ALLOWED = 'allowed';

function fieldValue(line: string): [string, string] | null {
  const match = FIELD.exec(line);
  return match ? [match[1], match[2].trim()] : null;
}

function consumerList(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim().replace(/^`|`$/g, ''))
    .filter((entry) => entry.length > 0);
}

/**
 * Read the conditional `## Organ Exemptions` section of a DETAIL.md.
 *
 * Absence is the normal case: a fractal that grants no exemption carries no
 * section, and that produces no violation. `Reason` is the load-bearing field —
 * an exemption without one is a disabled rule wearing a declaration, so an empty
 * reason is reported as an unmet contract rather than a granted exemption.
 *
 * The entry heading shares the acceptance-group shape but not its ID charset:
 * an organ path contains separators.
 */
export function parseOrganExemptions(
  content: string,
): OrganExemptionValidation {
  const lines = content.split(/\r?\n/);
  const exemptions: OrganExemptionDeclaration[] = [];
  const violations: DocumentViolation[] = [];
  let current: OrganExemptionDeclaration | null = null;
  let inside = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === SECTION_HEADING) {
      inside = true;
      continue;
    }
    if (!inside) continue;
    if (line.startsWith('## ')) break;

    const heading = ENTRY_HEADING.exec(line);
    if (heading) {
      current = {
        organPath: heading[1],
        title: heading[2],
        consumers: [],
        directImport: false,
        reason: '',
        line: index + 1,
      };
      exemptions.push(current);
      continue;
    }

    const field = current ? fieldValue(line) : null;
    if (!field || !current) continue;
    const [name, value] = field;
    if (name === 'Consumers') current.consumers = consumerList(value);
    else if (name === 'Direct import')
      current.directImport = value.toLowerCase() === DIRECT_IMPORT_ALLOWED;
    else current.reason = value;
  }

  for (const exemption of exemptions)
    if (exemption.reason.trim().length === 0)
      violations.push({
        rule: 'missing-field',
        message: `Organ exemption "${exemption.organPath}" has no reason; an exemption without one is an unmet contract, not a granted exemption.`,
        severity: 'error',
      });

  return { exemptions, violations };
}
