import type { GateEntry } from '../../../types/gates.js';

/** Checkbox prefix at the start of a parsed gate line. */
const CHECKBOX = /^- \[[ xX]\]/;

/** Leading whitespace retained when replacing or inserting a field. */
const INDENT = /^\s*/;

/**
 * Copy ledger lines and patch one gate's checkbox and evidence field.
 *
 * @param lines Exact parsed ledger lines.
 * @param gate Gate whose source coordinates refer to `lines`.
 * @param patch New checkbox and evidence values.
 * @returns New lines with unrelated bytes unchanged.
 */
export function applyGateLines(
  lines: string[],
  gate: GateEntry,
  patch: {
    /** New checkbox state. */
    checked: boolean;
    /** Complete evidence value without the field prefix. */
    evidence: string;
  },
): string[] {
  const updated = [...lines];
  const gateLine = updated[gate.line];
  if (gateLine !== undefined)
    updated[gate.line] = gateLine.replace(
      CHECKBOX,
      patch.checked ? '- [x]' : '- [ ]',
    );

  if (gate.evidenceLine !== undefined) {
    const current = updated[gate.evidenceLine] ?? '';
    const indent = INDENT.exec(current)?.[0] ?? '';
    updated[gate.evidenceLine] = `${indent}EVIDENCE: ${patch.evidence}`;
    return updated;
  }

  const anchor = updated[gate.lastFieldLine] ?? '';
  const indent =
    gate.lastFieldLine > gate.line ? (INDENT.exec(anchor)?.[0] ?? '  ') : '  ';
  updated.splice(
    gate.lastFieldLine + 1,
    0,
    `${indent}EVIDENCE: ${patch.evidence}`,
  );
  return updated;
}
