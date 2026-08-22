import { describe, expect, it } from 'vitest';

import type {
  AbandonEntry,
  GateEntry,
  GatesLedger,
} from '../../../types/gates.js';
import { computeLedgerStatus } from '../status/computeLedgerStatus.js';

/** Source fields that status aggregation does not otherwise inspect. */
const GATE_LOCATION = {
  group: 'Checks',
  line: 0,
  lastFieldLine: 0,
} as const;

/** Build one gate with stable source positions for status-only checks. */
function makeGate(id: string, checked: boolean, evidence: string): GateEntry {
  return {
    ...GATE_LOCATION,
    id,
    title: `${id} title`,
    checked,
    evidence,
  };
}

/** Build a parsed-ledger shape without involving the parser under test elsewhere. */
function makeLedger(
  gates: GateEntry[],
  abandons: AbandonEntry[] = [],
): GatesLedger {
  return { gates, abandons, lines: [] };
}

describe('computeLedgerStatus', () => {
  it('counts met, unmet, and abandoned gates', () => {
    const ledger = makeLedger(
      [
        makeGate('G1', true, 'passed'),
        { ...makeGate('G2', false, 'pending'), check: 'yarn test' },
        makeGate('G3', false, 'pending'),
      ],
      [{ id: 'G3', reason: 'out of scope', line: 10 }],
    );

    expect(
      computeLedgerStatus('task', '/gates.md', ledger, { gates: true }),
    ).toEqual({
      task: 'task',
      path: '/gates.md',
      total: 3,
      met: 1,
      unmet: 1,
      abandoned: 1,
      all_met: false,
      next: 'G2',
      unmet_gates: [
        {
          id: 'G2',
          title: 'G2 title',
          check: 'yarn test',
          needs_expect: true,
        },
      ],
      abandons: [{ id: 'G3', reason: 'out of scope' }],
      met_by_agent: [],
      gates: [
        {
          id: 'G1',
          title: 'G1 title',
          group: 'Checks',
          state: 'met',
          evidence: 'passed',
          byAgent: false,
        },
        {
          id: 'G2',
          title: 'G2 title',
          group: 'Checks',
          state: 'unmet',
          check: 'yarn test',
          evidence: 'pending',
          byAgent: false,
        },
        {
          id: 'G3',
          title: 'G3 title',
          group: 'Checks',
          state: 'abandoned',
          evidence: 'pending',
          byAgent: false,
        },
      ],
    });
  });

  it('treats a checked pending gate as unmet', () => {
    const status = computeLedgerStatus(
      'task',
      '/gates.md',
      makeLedger([makeGate('G1', true, 'pending')]),
    );

    expect(status).toMatchObject({ met: 0, unmet: 1, next: 'G1' });
  });

  it('treats regressed evidence as unmet', () => {
    const status = computeLedgerStatus(
      'task',
      '/gates.md',
      makeLedger([makeGate('G1', true, 'pending (regressed)')]),
    );

    expect(status).toMatchObject({ met: 0, unmet: 1, all_met: false });
  });

  it('reports all met when every remaining gate is abandoned', () => {
    const status = computeLedgerStatus(
      'task',
      '/gates.md',
      makeLedger(
        [makeGate('G1', false, 'pending')],
        [{ id: 'G1', reason: 'not needed', line: 2 }],
      ),
    );

    expect(status).toMatchObject({ all_met: true, unmet: 0, abandoned: 1 });
    expect(status.next).toBeUndefined();
  });

  it('selects the first open gate in ledger order', () => {
    const status = computeLedgerStatus(
      'task',
      '/gates.md',
      makeLedger([
        makeGate('G9', false, 'pending'),
        makeGate('G2', false, 'pending'),
      ]),
    );

    expect(status.next).toBe('G9');
  });

  it('reports met agent evidence only when its marker is current', () => {
    const ledger = makeLedger([
      makeGate('G1', true, 'passed (via agent aa8d87f5)'),
      makeGate('G2', false, 'pending (via agent ignored)'),
    ]);

    const summary = computeLedgerStatus('task', '/gates.md', ledger);
    const detailed = computeLedgerStatus('task', '/gates.md', ledger, {
      gates: true,
    });

    expect(summary.met_by_agent).toEqual(['G1']);
    expect(summary).not.toHaveProperty('gates');
    expect(detailed.gates?.[0]?.byAgent).toBe(true);
    expect(detailed.gates?.[1]?.byAgent).toBe(false);
  });
});
