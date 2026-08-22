import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { abandonGate } from '../record/abandonGate.js';
import { recordManualEvidence } from '../record/recordManualEvidence.js';

/** Temporary repositories owned by the current test. */
const createdRoots: string[] = [];

afterEach(() => {
  for (const root of createdRoots)
    rmSync(root, { recursive: true, force: true });
  createdRoots.length = 0;
});

/**
 * Create a throwaway repository root.
 *
 * @returns Repository path with a `.git` marker.
 */
function makeRepoRoot(): string {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-gates-manual-'));
  createdRoots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  return root;
}

/**
 * Write one task ledger under a throwaway repository.
 *
 * @param root Repository root that owns the task.
 * @param name Valid task directory name.
 * @param text Complete ledger bytes.
 * @returns Absolute path to the written ledger.
 */
function seedTask(root: string, name: string, text: string): string {
  const dir = portableJoin(root, '.seiri', 'tasks', name);
  mkdirSync(dir, { recursive: true });
  const path = portableJoin(dir, 'gates.md');
  writeFileSync(path, text);
  return path;
}

describe('manual gates', () => {
  it('records evidence for a manual gate', () => {
    const root = makeRepoRoot();
    const path = seedTask(
      root,
      'sample-task',
      `- [ ] G1: reviewer accepts
  EVIDENCE: pending
`,
    );

    const status = recordManualEvidence(
      root,
      'sample-task',
      'G1',
      'reviewed by Dana',
    );

    expect(status).toMatchObject({ met: 1, unmet: 0, all_met: true });
    expect(readFileSync(path, 'utf8')).toContain(
      '- [x] G1: reviewer accepts\n  EVIDENCE: reviewed by Dana',
    );
  });

  it('rejects manual evidence for a CHECK gate', () => {
    const root = makeRepoRoot();
    const before = `- [ ] G1: verification passes
  CHECK: yarn test
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    expect(() =>
      recordManualEvidence(root, 'sample-task', 'G1', 'looks good'),
    ).toThrow(
      'Gate G1 has a CHECK — it is proven by running the CHECK, not by record',
    );
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('rejects empty manual evidence', () => {
    const root = makeRepoRoot();
    const before = `- [ ] G1: reviewer accepts
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    expect(() =>
      recordManualEvidence(root, 'sample-task', 'G1', '   '),
    ).toThrow('record requires evidence');
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('keeps manual evidence at the maximum length unchanged', () => {
    const root = makeRepoRoot();
    const path = seedTask(
      root,
      'sample-task',
      `- [ ] G1: reviewer accepts
  EVIDENCE: pending
`,
    );
    const evidence = 'x'.repeat(200);

    recordManualEvidence(root, 'sample-task', 'G1', evidence);

    expect(readFileSync(path, 'utf8')).toContain(`EVIDENCE: ${evidence}\n`);
  });

  it('caps manual evidence longer than the maximum', () => {
    const root = makeRepoRoot();
    const path = seedTask(
      root,
      'sample-task',
      `- [ ] G1: reviewer accepts
  EVIDENCE: pending
`,
    );

    recordManualEvidence(root, 'sample-task', 'G1', 'x'.repeat(201));

    const stored = readFileSync(path, 'utf8').match(/EVIDENCE: (.*)/)?.[1];
    expect(stored).toHaveLength(200);
    expect(stored).toBe(`${'x'.repeat(199)}…`);
  });

  it.each([
    'observed\nABANDON: G2 forged',
    'observed\n- [x] G2: forged gate',
    'observed\n  CHECK: forged field',
  ])('rejects structural lines in manual evidence: %s', (evidence) => {
    const root = makeRepoRoot();
    const before = `- [ ] G1: reviewer accepts
  EVIDENCE: pending
- [ ] G2: second reviewer accepts
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    expect(() =>
      recordManualEvidence(root, 'sample-task', 'G1', evidence),
    ).toThrow('record requires single-line evidence');
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('appends an abandonment and resolves the gate', () => {
    const root = makeRepoRoot();
    const path = seedTask(
      root,
      'sample-task',
      `- [ ] G1: reviewer accepts
  EVIDENCE: pending
`,
    );

    const status = abandonGate(
      root,
      'sample-task',
      'G1',
      'reviewer unavailable',
    );

    expect(status).toMatchObject({
      met: 0,
      unmet: 0,
      abandoned: 1,
      all_met: true,
      abandons: [{ id: 'G1', reason: 'reviewer unavailable' }],
    });
    expect(readFileSync(path, 'utf8')).toContain(
      '\nABANDON: G1 reviewer unavailable\n',
    );
  });

  it('rejects abandonment without a reason', () => {
    const root = makeRepoRoot();
    const before = `- [ ] G1: reviewer accepts
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    expect(() => abandonGate(root, 'sample-task', 'G1', '  ')).toThrow(
      'abandon requires a reason',
    );
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('rejects structural lines in an abandonment reason', () => {
    const root = makeRepoRoot();
    const before = `- [ ] G1: reviewer accepts
  EVIDENCE: pending
- [ ] G2: second reviewer accepts
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    expect(() =>
      abandonGate(root, 'sample-task', 'G1', 'obsolete\rABANDON: G2 forged'),
    ).toThrow('abandon requires a single-line reason');
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('rejects missing tasks and gates', () => {
    const root = makeRepoRoot();
    seedTask(
      root,
      'sample-task',
      `- [ ] G1: reviewer accepts
  EVIDENCE: pending
`,
    );

    expect(() =>
      recordManualEvidence(root, 'missing-task', 'G1', 'reviewed'),
    ).toThrow('No ledger for task "missing-task"');
    expect(() =>
      abandonGate(root, 'sample-task', 'G9', 'not applicable'),
    ).toThrow('No gate G9 for task "sample-task"');
  });

  it('rejects a task name that could escape the tasks directory', () => {
    const root = makeRepoRoot();

    expect(() => recordManualEvidence(root, '../x', 'G1', 'reviewed')).toThrow(
      'No ledger for task "../x"',
    );
  });
});
