import { describe, expect, it } from 'vitest';

import type {
  GateEntry,
  GateVerdict,
  RecordedVerdict,
  TaskLedgerStatus,
} from '../../../types/gates.js';
import { renderLedgerReminder } from '../render/renderLedgerReminder.js';
import { renderVerdictLine } from '../render/renderVerdictLine.js';

/** Stable gate fields that verdict rendering does not inspect. */
const BASE_GATE: GateEntry = {
  id: 'G3',
  title: 'verification passes',
  checked: false,
  evidence: 'pending',
  group: 'Checks',
  line: 1,
  lastFieldLine: 1,
};

/** Default open-ledger progress used by verdict and reminder checks. */
const BASE_STATUS: TaskLedgerStatus = {
  task: 'payment-refactor',
  path: '/tasks/payment-refactor/gates.md',
  total: 7,
  met: 4,
  unmet: 3,
  abandoned: 0,
  all_met: false,
  next: 'G5',
  unmet_gates: [],
  abandons: [],
  met_by_agent: [],
};

/**
 * Build status for one task with optional progress overrides.
 *
 * @param task Owning task name.
 * @param patch Status fields that differ from the open-ledger default.
 * @returns Complete task-ledger status fixture.
 */
function makeStatus(
  task: string,
  patch: Partial<TaskLedgerStatus>,
): TaskLedgerStatus {
  return {
    ...BASE_STATUS,
    task,
    path: `/tasks/${task}/gates.md`,
    ...patch,
  };
}

/**
 * Build one recorded verdict with a stable gate and status fixture.
 *
 * @param verdict Outcome to render.
 * @param task Owning task name.
 * @param id Gate identifier.
 * @param statusPatch Status fields that differ from the open-ledger default.
 * @returns Complete recorded-verdict fixture.
 */
function makeResult(
  verdict: GateVerdict,
  task = 'payment-refactor',
  id = 'G3',
  statusPatch: Partial<TaskLedgerStatus> = {},
): RecordedVerdict {
  return {
    task,
    gate: { ...BASE_GATE, id },
    verdict,
    status: makeStatus(task, statusPatch),
  };
}

describe('renderVerdictLine', () => {
  it('renders an output match with progress', () => {
    expect(
      renderVerdictLine([makeResult({ kind: 'met', channel: 'output' })], {}),
    ).toBe('payment-refactor G3 met — evidence recorded (4/7, next G5)');
    expect(
      renderVerdictLine(
        [
          makeResult(
            { kind: 'met', channel: 'output' },
            'payment-refactor',
            'G3',
            { met: 7, unmet: 0, all_met: true, next: undefined },
          ),
        ],
        {},
      ),
    ).toContain('(7/7, all met)');
  });

  it('renders an agent output match', () => {
    expect(
      renderVerdictLine([makeResult({ kind: 'met', channel: 'output' })], {
        agentId: 'aa8d87f5-more',
      }),
    ).toBe(
      'payment-refactor G3 met via agent aa8d87f5 — driver re-run clears the marker',
    );
  });

  it('renders a designed stderr match with its verdict exit', () => {
    expect(
      renderVerdictLine(
        [makeResult({ kind: 'met', channel: 'stderr', exit: 2 })],
        {},
      ),
    ).toBe('payment-refactor G3 met — matched on stderr (exit 2 by design)');
  });

  it('renders an unmet verdict', () => {
    expect(
      renderVerdictLine(
        [
          makeResult({
            kind: 'unmet',
            reason: 'EXPECT "passed" not in output',
            regressed: false,
          }),
        ],
        {},
      ),
    ).toBe('payment-refactor G3 unmet — EXPECT "passed" not in output');
  });

  it('renders a regressed unmet verdict', () => {
    expect(
      renderVerdictLine(
        [
          makeResult({
            kind: 'unmet',
            reason: 'exit 1',
            regressed: true,
          }),
        ],
        {},
      ),
    ).toBe('payment-refactor G3 unmet — exit 1 (was met — regressed)');
  });

  it('renders an unobservable verdict with a remedy', () => {
    expect(renderVerdictLine([makeResult({ kind: 'unobservable' })], {})).toBe(
      'payment-refactor G3 unobservable — stdout is not visible after a non-zero exit; make the CHECK exit 0 (append || true) or EXPECT against stderr',
    );
  });

  it('combines one met gate across multiple tasks', () => {
    expect(
      renderVerdictLine(
        [
          makeResult({ kind: 'met', channel: 'output' }, 'alpha-task', 'G1'),
          makeResult({ kind: 'met', channel: 'output' }, 'beta-task', 'G1'),
        ],
        {},
      ),
    ).toBe('G1 met in alpha-task, beta-task — evidence recorded');
  });

  it('joins distinct verdicts and appends one chain hint', () => {
    expect(
      renderVerdictLine(
        [
          makeResult(
            {
              kind: 'unmet',
              reason: 'exit 1',
              regressed: false,
            },
            'alpha-task',
            'G1',
          ),
          makeResult({ kind: 'unobservable' }, 'beta-task', 'G2'),
        ],
        { chainHint: '3rd consecutive; `/seiri:trace-cause` owns it' },
      ),
    ).toBe(
      'alpha-task G1 unmet — exit 1; beta-task G2 unobservable — stdout is not visible after a non-zero exit; make the CHECK exit 0 (append || true) or EXPECT against stderr (3rd consecutive; `/seiri:trace-cause` owns it)',
    );
  });
});

describe('renderLedgerReminder', () => {
  it('renders one open ledger', () => {
    const status = makeResult(
      { kind: 'unmet', reason: 'pending', regressed: false },
      'payment-refactor',
      'G3',
      { abandoned: 1 },
    ).status;

    expect(renderLedgerReminder([status])).toBe(
      'Ledger payment-refactor: 4/7 met, 1 abandoned — next G5; `/seiri:execute` owns it.',
    );
  });

  it('renders multiple open ledgers on one line', () => {
    const first = makeResult(
      { kind: 'unmet', reason: 'pending', regressed: false },
      'payment-refactor',
    ).status;
    const second = makeResult(
      { kind: 'unmet', reason: 'pending', regressed: false },
      'login-fix',
      'G2',
      { total: 3, met: 2, unmet: 1, next: 'G3' },
    ).status;
    const complete = makeResult(
      { kind: 'met', channel: 'output' },
      'finished-task',
      'G1',
      { total: 1, met: 1, unmet: 0, all_met: true, next: undefined },
    ).status;

    expect(renderLedgerReminder([first, complete, second])).toBe(
      'Ledgers: payment-refactor 4/7, login-fix 2/3 — `/seiri:execute` owns them.',
    );
  });

  it('returns nothing when every ledger is resolved', () => {
    const complete = makeResult(
      { kind: 'met', channel: 'output' },
      'finished-task',
      'G1',
      { total: 1, met: 1, unmet: 0, all_met: true, next: undefined },
    ).status;

    expect(renderLedgerReminder([complete])).toBeUndefined();
  });
});
