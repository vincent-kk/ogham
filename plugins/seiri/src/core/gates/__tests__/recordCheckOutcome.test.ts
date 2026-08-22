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
      text: 'starting\n8/8 passed\ncomplete',
    });

    expect(results).toHaveLength(1);
    expect(results[0]?.verdict).toEqual({ kind: 'met' });
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
      text: '7/8 passed',
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
      text: '15/15 passed',
    });

    expect(results[0]?.verdict).toEqual({ kind: 'met' });
    expect(readFileSync(path, 'utf8')).toContain('EVIDENCE: 15/15 passed');
  });

  it('reports an exit-zero gate without EXPECT as unjudgeable', () => {
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
      text: '',
    });

    expect(results[0]?.verdict).toEqual({
      kind: 'unjudgeable',
      reason: 'a runnable gate needs an EXPECT that only success prints',
      regressed: false,
    });
    expect(readFileSync(path, 'utf8')).toContain('EVIDENCE: pending');
  });

  it('regresses a formerly met no-EXPECT gate as unjudgeable', () => {
    const root = makeRepoRoot();
    const before = `- [x] G1: command succeeds
  CHECK: yarn test
  EVIDENCE: old exit proof
`;
    const path = seedTask(root, 'sample-task', before);

    const results = recordCheckOutcome(root, 'yarn test', {
      text: 'boom',
      exit: 1,
    });

    expect(results[0]?.verdict).toEqual({
      kind: 'unjudgeable',
      reason: 'a runnable gate needs an EXPECT that only success prints',
      regressed: true,
    });
    expect(readFileSync(path, 'utf8')).toContain(
      '- [ ] G1: command succeeds\n  CHECK: yarn test\n  EVIDENCE: pending (regressed)',
    );
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
      text: 'invalid input',
      exit: 1,
    });

    expect(results[0]?.verdict).toEqual({
      kind: 'met',
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
      text: 'different failure',
      exit: 1,
    });

    expect(results[0]?.verdict).toEqual({
      kind: 'unmet',
      reason: 'EXPECT "invalid input" not in output (exit 1)',
      regressed: false,
    });
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('reports an empty output as unmet', () => {
    const root = makeRepoRoot();
    const before = `- [ ] G1: rejects invalid input
  CHECK: yarn rejection
  EXPECT: invalid input
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    const results = recordCheckOutcome(root, 'yarn rejection', {
      text: '',
      exit: 1,
    });

    expect(results[0]?.verdict).toEqual({
      kind: 'unmet',
      reason: 'no output (exit 1)',
      regressed: false,
    });
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
      text: '7/8 passed',
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
      text: 'passed',
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
      text: 'passed',
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
      { text: longOutput },
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
      text: longOutput,
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
        text: 'passed',
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
        text: 'passed',
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
      text: 'stable\nfinal',
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
