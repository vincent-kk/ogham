import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GATES_LOCK_DIR } from '../../../constants/files.js';
import { abandonGate } from '../record/abandonGate.js';
import { recordCheckOutcome } from '../record/recordCheckOutcome.js';
import { recordManualEvidence } from '../record/recordManualEvidence.js';
import { withGatesLock } from '../store/withGatesLock.js';

/** Temporary task directories removed after each test. */
const createdRoots: string[] = [];

afterEach(() => {
  for (const root of createdRoots)
    rmSync(root, { recursive: true, force: true });
  createdRoots.length = 0;
});

/**
 * Create a task directory whose lock directory is already held, so
 * the mutation cannot take it within its timeout.
 *
 * @returns The task directory path.
 */
function makeHeldTaskDir(): string {
  const taskDir = mkdtempSync(portableJoin(tmpdir(), 'seiri-gates-lock-'));
  createdRoots.push(taskDir);
  mkdirSync(portableJoin(taskDir, GATES_LOCK_DIR));
  return taskDir;
}

describe('withGatesLock', () => {
  it('throws and skips the callback when the lock is unavailable', () => {
    const taskDir = makeHeldTaskDir();
    const mutate = vi.fn(() => 'result');

    expect(() => withGatesLock(taskDir, mutate)).toThrow();
    expect(mutate).not.toHaveBeenCalled();
  }, 10_000);

  it('returns the mutation result when the lock is available', () => {
    const taskDir = makeHeldTaskDir();
    rmSync(portableJoin(taskDir, GATES_LOCK_DIR), { recursive: true });
    expect(withGatesLock(taskDir, () => 'result')).toBe('result');
  });
});

it.each([
  ['abandon', (root: string) => abandonGate(root, 'task', 'G1', 'deferred')],
  [
    'record',
    (root: string) => recordManualEvidence(root, 'task', 'G1', 'observed'),
  ],
  [
    'automatic scan',
    (root: string) =>
      recordCheckOutcome(root, 'yarn test', { text: 'PASS', exit: 0 }),
  ],
] as const)(
  'leaves the ledger byte-identical if %s cannot acquire the lock',
  (kind, attempt) => {
    const root = mkdtempSync(
      portableJoin(tmpdir(), 'seiri-gates-held-ledger-'),
    );
    createdRoots.push(root);
    const taskDir = portableJoin(root, '.seiri', 'tasks', 'task');
    mkdirSync(portableJoin(taskDir, GATES_LOCK_DIR), { recursive: true });
    const ledger = portableJoin(taskDir, 'gates.md');
    const initial =
      kind === 'automatic scan'
        ? '- [ ] G1: check\n  CHECK: yarn test\n  EXPECT: PASS\n  EVIDENCE: pending\n'
        : '- [ ] G1: manual\n  EVIDENCE: pending\n';
    writeFileSync(ledger, initial);

    if (kind === 'automatic scan') expect(attempt(root)).toEqual([]);
    else expect(() => attempt(root)).toThrow('Task ledger lock unavailable');

    expect(readFileSync(ledger, 'utf8')).toBe(initial);
  },
);
