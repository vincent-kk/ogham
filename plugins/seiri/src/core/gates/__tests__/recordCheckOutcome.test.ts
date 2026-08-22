import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';

import { portableJoin } from '@ogham/cross-platform';
import { afterEach, describe, expect, it } from 'vitest';

import { recordCheckOutcome } from '../record/recordCheckOutcome.js';

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
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-gates-record-'));
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

describe('recordCheckOutcome', () => {
  it('records an exit-zero substring match', () => {
    const root = makeRepoRoot();
    const path = seedTask(
      root,
      'sample-task',
      `# Gates: sample-task

- [ ] G1: verification passes
  CHECK: yarn test
  EXPECT: 8/8 passed
  EVIDENCE: pending
`,
    );

    const results = recordCheckOutcome(root, 'yarn test', {
      kind: 'success',
      stdout: 'starting\n8/8 passed\ncomplete',
      stderr: '',
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.verdict).toEqual({ kind: 'met', channel: 'output' });
    expect(results[0]?.status).toMatchObject({ met: 1, unmet: 0 });
    expect(readFileSync(path, 'utf8')).toContain(
      '- [x] G1: verification passes\n  CHECK: yarn test\n  EXPECT: 8/8 passed\n  EVIDENCE: 8/8 passed | complete',
    );
  });

  it('leaves an exit-zero mismatch unchanged', () => {
    const root = makeRepoRoot();
    const before = `- [ ] G1: verification passes
  CHECK: yarn test
  EXPECT: 8/8 passed
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    const results = recordCheckOutcome(root, 'yarn test', {
      kind: 'success',
      stdout: '7/8 passed',
      stderr: '',
    });

    expect(results[0]?.verdict).toEqual({
      kind: 'unmet',
      reason: 'EXPECT "8/8 passed" not in output',
      regressed: false,
    });
    expect(results[0]?.status.unmet).toBe(1);
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('accepts regex EXPECT', () => {
    const root = makeRepoRoot();
    const path = seedTask(
      root,
      'sample-task',
      `- [ ] G1: verification passes
  CHECK: yarn test
  EXPECT: /\\d+\\/\\d+ passed/
  EVIDENCE: pending
`,
    );

    const results = recordCheckOutcome(root, 'yarn test', {
      kind: 'success',
      stdout: '15/15 passed',
      stderr: '',
    });

    expect(results[0]?.verdict).toEqual({ kind: 'met', channel: 'output' });
    expect(readFileSync(path, 'utf8')).toContain('EVIDENCE: 15/15 passed');
  });

  it('uses exit zero when EXPECT is absent', () => {
    const root = makeRepoRoot();
    const path = seedTask(
      root,
      'sample-task',
      `- [ ] G1: command succeeds
  CHECK: yarn test
  EVIDENCE: pending
`,
    );

    const results = recordCheckOutcome(root, 'yarn test', {
      kind: 'success',
      stdout: '',
      stderr: '',
    });

    expect(results[0]?.verdict).toEqual({ kind: 'met', channel: 'output' });
    expect(readFileSync(path, 'utf8')).toContain('EVIDENCE: exit 0');
  });

  it('leaves a no-EXPECT gate unmet on non-zero exit', () => {
    const root = makeRepoRoot();
    const before = `- [ ] G1: command succeeds
  CHECK: yarn test
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    const results = recordCheckOutcome(root, 'yarn test', {
      kind: 'failure',
      error: 'Exit code 1\nboom',
      exit: 1,
    });

    expect(results[0]?.verdict).toEqual({
      kind: 'unmet',
      reason: 'exit 1',
      regressed: false,
    });
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('records an expected stderr failure', () => {
    const root = makeRepoRoot();
    const path = seedTask(
      root,
      'sample-task',
      `- [ ] G1: rejects invalid input
  CHECK: yarn rejection
  EXPECT: invalid input
  EVIDENCE: pending
`,
    );

    const results = recordCheckOutcome(root, 'yarn rejection', {
      kind: 'failure',
      error: 'Exit code 1\ninvalid input',
      exit: 1,
    });

    expect(results[0]?.verdict).toEqual({
      kind: 'met',
      channel: 'stderr',
      exit: 1,
    });
    expect(results[0]?.status.met).toBe(1);
    expect(readFileSync(path, 'utf8')).toContain(
      'EVIDENCE: invalid input (exit 1)',
    );
  });

  it('reports observable stderr mismatch', () => {
    const root = makeRepoRoot();
    const before = `- [ ] G1: rejects invalid input
  CHECK: yarn rejection
  EXPECT: invalid input
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    const results = recordCheckOutcome(root, 'yarn rejection', {
      kind: 'failure',
      error: 'Exit code 1\ndifferent failure',
      exit: 1,
    });

    expect(results[0]?.verdict).toEqual({
      kind: 'unmet',
      reason: 'exit 1; EXPECT not in stderr',
      regressed: false,
    });
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('reports a bare exit line as unobservable', () => {
    const root = makeRepoRoot();
    const before = `- [ ] G1: rejects invalid input
  CHECK: yarn rejection
  EXPECT: invalid input
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    const results = recordCheckOutcome(root, 'yarn rejection', {
      kind: 'failure',
      error: 'Exit code 1',
      exit: 1,
    });

    expect(results[0]?.verdict).toEqual({ kind: 'unobservable' });
    expect(results[0]?.status.unmet).toBe(1);
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('regresses a formerly met gate', () => {
    const root = makeRepoRoot();
    const path = seedTask(
      root,
      'sample-task',
      `- [x] G1: verification passes
  CHECK: yarn test
  EXPECT: 8/8 passed
  EVIDENCE: 8/8 passed
`,
    );

    const results = recordCheckOutcome(root, 'yarn test', {
      kind: 'success',
      stdout: '7/8 passed',
      stderr: '',
    });

    expect(results[0]?.verdict).toEqual({
      kind: 'unmet',
      reason: 'EXPECT "8/8 passed" not in output',
      regressed: true,
    });
    expect(results[0]?.status.unmet).toBe(1);
    expect(readFileSync(path, 'utf8')).toContain(
      '- [ ] G1: verification passes\n  CHECK: yarn test\n  EXPECT: 8/8 passed\n  EVIDENCE: pending (regressed)',
    );
  });

  it('records the same CHECK in every task', () => {
    const root = makeRepoRoot();
    const ledger = `- [ ] G1: verification passes
  CHECK: yarn test
  EXPECT: passed
  EVIDENCE: pending
`;
    const alphaPath = seedTask(root, 'alpha-task', ledger);
    const betaPath = seedTask(root, 'beta-task', ledger);

    const results = recordCheckOutcome(root, 'yarn test', {
      kind: 'success',
      stdout: 'passed',
      stderr: '',
    });

    expect(results.map((result) => result.task)).toEqual([
      'alpha-task',
      'beta-task',
    ]);
    expect(results.map((result) => result.status.met)).toEqual([1, 1]);
    expect(readFileSync(alphaPath, 'utf8')).toContain('- [x] G1');
    expect(readFileSync(betaPath, 'utf8')).toContain('- [x] G1');
  });

  it('matches CHECK despite whitespace differences', () => {
    const root = makeRepoRoot();
    const path = seedTask(
      root,
      'sample-task',
      `- [ ] G1: verification passes
  CHECK: yarn   vitest    run
  EXPECT: passed
  EVIDENCE: pending
`,
    );

    const results = recordCheckOutcome(root, 'yarn vitest\nrun', {
      kind: 'success',
      stdout: 'passed',
      stderr: '',
    });

    expect(results).toHaveLength(1);
    expect(readFileSync(path, 'utf8')).toContain('- [x] G1');
  });

  it('marks agent proof, then clears it on driver proof', () => {
    const root = makeRepoRoot();
    const longOutput = `passed ${'detail '.repeat(40)}`.trim();
    const path = seedTask(
      root,
      'sample-task',
      `- [ ] G1: verification passes
  CHECK: yarn test
  EXPECT: passed
  EVIDENCE: pending
`,
    );

    const agentResults = recordCheckOutcome(
      root,
      'yarn test',
      { kind: 'success', stdout: longOutput, stderr: '' },
      'aa8d87f5-more',
    );
    const agentEvidence = readFileSync(path, 'utf8')
      .split('\n')
      .find((line) => line.trimStart().startsWith('EVIDENCE:'))
      ?.trimStart()
      .slice('EVIDENCE: '.length);
    expect(agentEvidence?.length).toBeLessThanOrEqual(200);
    expect(agentEvidence).toMatch(/… \(via agent aa8d87f5\)$/);
    expect(agentResults[0]?.status.met_by_agent).toEqual(['G1']);

    const driverResults = recordCheckOutcome(root, 'yarn test', {
      kind: 'success',
      stdout: longOutput,
      stderr: '',
    });
    const driverText = readFileSync(path, 'utf8');
    const driverEvidence = driverText
      .split('\n')
      .find((line) => line.trimStart().startsWith('EVIDENCE:'))
      ?.trimStart()
      .slice('EVIDENCE: '.length);
    expect(driverEvidence?.length).toBeLessThanOrEqual(200);
    expect(driverText).not.toContain('(via agent');
    expect(driverResults[0]?.status.met_by_agent).toEqual([]);
  });

  it('handles a missing tasks directory', () => {
    const root = makeRepoRoot();

    expect(
      recordCheckOutcome(root, 'yarn test', {
        kind: 'success',
        stdout: 'passed',
        stderr: '',
      }),
    ).toEqual([]);
    expect(existsSync(portableJoin(root, '.seiri', 'tasks'))).toBe(false);
  });

  it('ignores manual gates', () => {
    const root = makeRepoRoot();
    const before = `- [ ] G1: reviewer accepts
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    expect(
      recordCheckOutcome(root, 'yarn test', {
        kind: 'success',
        stdout: 'passed',
        stderr: '',
      }),
    ).toEqual([]);
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('rewrites only checkbox and EVIDENCE lines', () => {
    const root = makeRepoRoot();
    const before = `# Gates: sample-task

Plan: plan.md

## Checks

<!-- keep this marker -->
- [ ] G1: verification passes
  CHECK: yarn test
  EXPECT: stable
    EVIDENCE: pending
  NOTE: preserve this line

- [ ] G2: unrelated gate
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    recordCheckOutcome(root, 'yarn test', {
      kind: 'success',
      stdout: 'stable\nfinal',
      stderr: '',
    });

    const beforeLines = before.split('\n');
    const afterLines = readFileSync(path, 'utf8').split('\n');
    const changed = afterLines.flatMap((line, index) =>
      line === beforeLines[index] ? [] : [index],
    );
    expect(afterLines).toHaveLength(beforeLines.length);
    expect(changed).toEqual([7, 10]);
  });
});
