import {
  CRITERIA_REQUIRED_FIELDS,
  CRITERIA_STATUS_VALUES,
} from '../../../constants/documentValidation.js';
import type {
  CriteriaMdValidation,
  DocumentViolation,
} from '../../../types/documents.js';

// Tolerant of heading depth (##/###) and bold wrapping so a claim cannot be
// hidden from the mechanical lint while staying visible to Phase D judgment.
const CLAIM_HEADING_RE = /^#{2,3}\s+\*{0,2}(CLM-\d+)\b/;

interface ClaimBlock {
  id: string;
  fields: Record<string, string>;
}

function parseClaims(content: string): {
  claims: ClaimBlock[];
  duplicates: string[];
} {
  const claims: ClaimBlock[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();
  let current: ClaimBlock | null = null;
  for (const line of content.split('\n')) {
    const heading = CLAIM_HEADING_RE.exec(line);
    if (heading !== null) {
      current = { id: heading[1], fields: {} };
      if (seen.has(current.id)) duplicates.push(current.id);
      seen.add(current.id);
      claims.push(current);
      continue;
    }
    if (current === null) continue;
    const field = /^[-*]\s*\*{0,2}([a-zA-Z]+)\*{0,2}\s*:\s*(.*)$/.exec(
      line.trim(),
    );
    if (field !== null)
      current.fields[field[1].toLowerCase()] = field[2].trim();
  }
  return { claims, duplicates };
}

function flatten(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function checkDuplicates(duplicates: string[]): DocumentViolation[] {
  return duplicates.map((id) => ({
    rule: 'duplicate-id' as const,
    message: `Claim id ${id} appears more than once — claim ids must be unique.`,
    severity: 'error' as const,
  }));
}

function checkMissingFields(
  id: string,
  fields: Record<string, string>,
): DocumentViolation[] {
  const missing = CRITERIA_REQUIRED_FIELDS.filter(
    (name) => !fields[name] || fields[name].length === 0,
  );
  if (missing.length === 0) return [];
  return [
    {
      rule: 'missing-field',
      message: `Claim ${id} is missing required field(s): ${missing.join(', ')}.`,
      severity: 'error',
    },
  ];
}

function checkInvalidStatus(
  id: string,
  fields: Record<string, string>,
): DocumentViolation[] {
  const status = fields.status;
  if (status === undefined || status.length === 0) return [];
  if ((CRITERIA_STATUS_VALUES as readonly string[]).includes(status)) return [];
  return [
    {
      rule: 'invalid-status',
      message: `Claim ${id} has invalid status "${status}" — use ${CRITERIA_STATUS_VALUES.join(' | ')}.`,
      severity: 'error',
    },
  ];
}

function isTautological(fields: Record<string, string>): boolean {
  const claim = fields.claim ?? '';
  const observable = fields.observable ?? '';
  const expected = fields.expected ?? '';
  if (expected.length === 0) return false;
  return (
    (claim.length > 0 && flatten(claim) === flatten(expected)) ||
    (observable.length > 0 && flatten(observable) === flatten(expected))
  );
}

function checkTautology(
  id: string,
  fields: Record<string, string>,
): DocumentViolation[] {
  if (!isTautological(fields)) return [];
  return [
    {
      rule: 'tautology',
      message: `Claim ${id} is tautological — claim/observable must describe HOW to observe, expected must state a distinct verifiable outcome.`,
      severity: 'error',
    },
  ];
}

function checkRemovedClaims(
  claims: ClaimBlock[],
  oldContent: string,
): DocumentViolation[] {
  const newIds = new Set(claims.map((c) => c.id));
  return parseClaims(oldContent)
    .claims.filter((c) => !newIds.has(c.id))
    .map(({ id }) => ({
      rule: 'claim-removed' as const,
      message: `Claim ${id} was deleted — the ledger is append-only. Mark it status: retired (or superseded) instead of removing it.`,
      severity: 'error' as const,
    }));
}

/**
 * Validate the acceptance-criteria ledger (`.filid/criteria.md`).
 *
 * Gaming defenses (mechanical tier — semantic review stays with the harvest
 * interview and the review stage):
 * - every `## CLM-NNN` claim carries non-empty claim/observable/expected/
 *   scope/status fields; status is active|superseded|retired
 * - claim ids are unique, and ids present in `oldContent` never disappear
 *   ("append-only" = no deletion + recorded status transitions)
 * - degenerate duplication (claim == expected, observable == expected) is
 *   rejected as tautology
 */
export function validateCriteriaMd(
  content: string,
  oldContent?: string,
): CriteriaMdValidation {
  const { claims, duplicates } = parseClaims(content);
  const violations: DocumentViolation[] = [
    ...checkDuplicates(duplicates),
    ...claims.flatMap(({ id, fields }) => [
      ...checkMissingFields(id, fields),
      ...checkInvalidStatus(id, fields),
      ...checkTautology(id, fields),
    ]),
    ...(oldContent !== undefined ? checkRemovedClaims(claims, oldContent) : []),
  ];

  return {
    valid: violations.every((v) => v.severity !== 'error'),
    violations,
  };
}
