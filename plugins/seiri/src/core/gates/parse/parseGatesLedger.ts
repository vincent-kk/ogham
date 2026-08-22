import { EVIDENCE_PENDING } from '../../../constants/gates.js';
import type { GateEntry, GatesLedger } from '../../../types/gates.js';

/** Level-two heading that groups following gates. */
const HEADING = /^##\s+(.*)$/;

/** Uninterpreted plan-reference header. */
const PLAN = /^Plan:\s*(.*)$/;

/** Markdown checkbox gate with a `G<n>` identifier. */
const GATE = /^- \[([ xX])\]\s*(G\d+):\s*(.*)$/;

/** Indented gate field understood by the ledger. */
const FIELD = /^\s+(CHECK|EXPECT|EVIDENCE):\s*(.*)$/;

/** Explicit gate abandonment declaration. */
const ABANDON = /^ABANDON:\s*(G\d+)\s*(.*)$/;

/** Strip Markdown's optional padding from code-span contents. */
function trimCodeSpanPadding(value: string): string {
  const padded =
    value.startsWith(' ') && value.endsWith(' ') && /\S/.test(value);
  return padded ? value.slice(1, -1) : value;
}

/** Strip a wrapping code span so a Markdown formatter cannot rewrite the value. */
function unwrapCodeSpan(value: string): string {
  const trimmed = value.trim();
  const opening = /^`+/.exec(trimmed)?.[0];
  const closing = /`+$/.exec(trimmed)?.[0];
  if (opening === undefined || opening.length !== closing?.length) return value;
  const inner = trimmed.slice(opening.length, -opening.length);
  return inner === '' ? value : trimCodeSpanPadding(inner);
}

/**
 * Parse a gates ledger without rejecting malformed or unknown lines.
 *
 * @param text Complete ledger text.
 * @returns Parsed gates, abandonments, plan reference, and exact source lines.
 */
export function parseGatesLedger(text: string): GatesLedger {
  const lines = text.split('\n');
  const gates: GateEntry[] = [];
  const abandons: GatesLedger['abandons'] = [];
  let planRef: string | undefined;
  let group = '';
  let current: GateEntry | undefined;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    const planMatch = PLAN.exec(line);
    if (planMatch !== null) {
      planRef = (planMatch[1] ?? '').trim();
      current = undefined;
      continue;
    }

    const headingMatch = HEADING.exec(line);
    if (headingMatch !== null) {
      group = (headingMatch[1] ?? '').trim();
      current = undefined;
      continue;
    }

    const gateMatch = GATE.exec(line);
    if (gateMatch !== null) {
      current = {
        id: gateMatch[2] ?? '',
        title: (gateMatch[3] ?? '').trim(),
        checked: gateMatch[1] !== ' ',
        evidence: EVIDENCE_PENDING,
        group,
        line: index,
        lastFieldLine: index,
      };
      gates.push(current);
      continue;
    }

    const fieldMatch = FIELD.exec(line);
    if (fieldMatch !== null && current !== undefined) {
      const field = fieldMatch[1];
      const value = (fieldMatch[2] ?? '').trim();
      if (field === 'CHECK') current.check = unwrapCodeSpan(value) || undefined;
      if (field === 'EXPECT')
        current.expect = unwrapCodeSpan(value) || undefined;
      if (field === 'EVIDENCE') {
        current.evidence = value;
        current.evidenceLine = index;
      }
      current.lastFieldLine = index;
      continue;
    }

    const abandonMatch = ABANDON.exec(line);
    if (abandonMatch !== null) {
      abandons.push({
        id: abandonMatch[1] ?? '',
        reason: (abandonMatch[2] ?? '').trim(),
        line: index,
      });
      current = undefined;
      continue;
    }

    if (line !== '' && !/^\s/.test(line)) current = undefined;
  }

  return { planRef, gates, abandons, lines };
}
