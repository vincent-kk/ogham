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
    if (field !== null) current.fields[field[1].toLowerCase()] = field[2].trim();
  }
  return { claims, duplicates };
}

function flatten(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
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
  const violations: DocumentViolation[] = [];
  const { claims, duplicates } = parseClaims(content);

  for (const id of duplicates) {
    violations.push({
      rule: 'duplicate-id',
      message: `Claim id ${id} appears more than once — claim ids must be unique.`,
      severity: 'error',
    });
  }

  for (const { id, fields } of claims) {
    const missing = CRITERIA_REQUIRED_FIELDS.filter(
      (name) => !fields[name] || fields[name].length === 0,
    );
    if (missing.length > 0) {
      violations.push({
        rule: 'missing-field',
        message: `Claim ${id} is missing required field(s): ${missing.join(', ')}.`,
        severity: 'error',
      });
    }
    const status = fields.status;
    if (
      status !== undefined &&
      status.length > 0 &&
      !(CRITERIA_STATUS_VALUES as readonly string[]).includes(status)
    ) {
      violations.push({
        rule: 'invalid-status',
        message: `Claim ${id} has invalid status "${status}" — use ${CRITERIA_STATUS_VALUES.join(' | ')}.`,
        severity: 'error',
      });
    }
    const claim = fields.claim ?? '';
    const observable = fields.observable ?? '';
    const expected = fields.expected ?? '';
    if (
      (claim.length > 0 && expected.length > 0 && flatten(claim) === flatten(expected)) ||
      (observable.length > 0 && expected.length > 0 && flatten(observable) === flatten(expected))
    ) {
      violations.push({
        rule: 'tautology',
        message: `Claim ${id} is tautological — claim/observable must describe HOW to observe, expected must state a distinct verifiable outcome.`,
        severity: 'error',
      });
    }
  }

  if (oldContent !== undefined) {
    const newIds = new Set(claims.map((c) => c.id));
    const removed = parseClaims(oldContent).claims.filter(
      (c) => !newIds.has(c.id),
    );
    for (const { id } of removed) {
      violations.push({
        rule: 'claim-removed',
        message: `Claim ${id} was deleted — the ledger is append-only. Mark it status: retired (or superseded) instead of removing it.`,
        severity: 'error',
      });
    }
  }

  return {
    valid: violations.every((v) => v.severity !== 'error'),
    violations,
  };
}
