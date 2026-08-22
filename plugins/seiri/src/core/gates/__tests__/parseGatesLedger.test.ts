import { describe, expect, it } from 'vitest';

import { parseGatesLedger } from '../parse/parseGatesLedger.js';

/** A representative ledger with two groups and one explicit abandonment. */
const TEMPLATE_LEDGER = `# Gates: release-checks

Plan: plan.md

## Build

- [ ] G1: unit tests pass
  CHECK: yarn test
  EXPECT: 15/15 passed
  EVIDENCE: pending

- [ ] G2: reviewer accepts the change
  EVIDENCE: pending

## Final

- [x] G3: typecheck passes
  CHECK: yarn typecheck
  EXPECT: Done
  EVIDENCE: Done

ABANDON: G2 reviewer unavailable
`;

describe('parseGatesLedger', () => {
  it('parses the template ledger', () => {
    const ledger = parseGatesLedger(TEMPLATE_LEDGER);

    expect(ledger.planRef).toBe('plan.md');
    expect(ledger.gates).toHaveLength(3);
    expect(ledger.gates[0]).toEqual({
      id: 'G1',
      title: 'unit tests pass',
      checked: false,
      check: 'yarn test',
      expect: '15/15 passed',
      evidence: 'pending',
      group: 'Build',
      line: 6,
      evidenceLine: 9,
      lastFieldLine: 9,
    });
    expect(ledger.gates[1]?.group).toBe('Build');
    expect(ledger.gates[2]?.group).toBe('Final');
    expect(ledger.gates[2]?.checked).toBe(true);
    expect(ledger.abandons).toEqual([
      { id: 'G2', reason: 'reviewer unavailable', line: 21 },
    ]);
    expect(ledger.lines).toEqual(TEMPLATE_LEDGER.split('\n'));
  });

  it('defaults a missing EVIDENCE field to pending', () => {
    const ledger = parseGatesLedger(`- [ ] G1: check output
  CHECK: yarn test
  EXPECT: passed`);

    expect(ledger.gates[0]).toMatchObject({
      evidence: 'pending',
      lastFieldLine: 2,
    });
    expect(ledger.gates[0]?.evidenceLine).toBeUndefined();
  });

  it('recognizes lowercase and uppercase checked boxes', () => {
    const ledger = parseGatesLedger(`- [x] G1: lower
  EVIDENCE: yes
- [X] G2: upper
  EVIDENCE: yes`);

    expect(ledger.gates.map((gate) => gate.checked)).toEqual([true, true]);
    expect(ledger.gates.map((gate) => gate.evidence)).toEqual(['yes', 'yes']);
  });

  it('accepts empty input', () => {
    expect(parseGatesLedger('')).toEqual({
      planRef: undefined,
      gates: [],
      abandons: [],
      lines: [''],
    });
  });
});
