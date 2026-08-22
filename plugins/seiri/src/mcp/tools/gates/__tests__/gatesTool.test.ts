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

import { handleGates } from '../gates.js';

/** Temporary repositories created by this suite. */
const createdRoots: string[] = [];

/**
 * Create a throwaway repository root.
 *
 * @returns Repository path with a `.git` marker.
 */
function makeRepoRoot(): string {
  const root = mkdtempSync(portableJoin(tmpdir(), 'seiri-gates-tool-'));
  createdRoots.push(root);
  mkdirSync(portableJoin(root, '.git'));
  return root;
}

/**
 * Write one task ledger into a throwaway repository.
 *
 * @param root Repository root.
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

/**
 * The MCP surface projects ledger state and delegates only explicit ledger
 * mutations. Its tests call the handler directly so no process is involved.
 */
describe('gates MCP tool', () => {
  afterEach(() => {
    for (const root of createdRoots.splice(0))
      rmSync(root, { recursive: true, force: true });
  });

  it('returns compact status for all tasks and gate detail for one task', () => {
    const root = makeRepoRoot();
    seedTask(
      root,
      'alpha-task',
      `- [x] G1: compiled
  EVIDENCE: build passed
- [ ] G2: tests pass
  CHECK: yarn test
  EVIDENCE: pending
`,
    );
    seedTask(
      root,
      'beta-task',
      `- [x] G1: reviewed
  EVIDENCE: approved
`,
    );

    const allTasks = handleGates({ action: 'status', project_root: root });
    if (allTasks.action !== 'status') throw new Error('expected status');
    expect(allTasks.tasks.map(({ task }) => task)).toEqual([
      'alpha-task',
      'beta-task',
    ]);
    expect(allTasks.tasks.every((task) => !('gates' in task))).toBe(true);
    expect(allTasks.all_met).toBe(false);

    const oneTask = handleGates({
      action: 'status',
      project_root: root,
      task: 'alpha-task',
    });
    if (oneTask.action !== 'status') throw new Error('expected status');
    expect(oneTask.tasks).toHaveLength(1);
    expect(oneTask.tasks[0]?.gates).toMatchObject([
      { id: 'G1', state: 'met' },
      { id: 'G2', state: 'unmet', check: 'yarn test' },
    ]);
  });

  it('reports all_met only when every ledger has no unmet gate', () => {
    const root = makeRepoRoot();
    seedTask(root, 'alpha-task', '- [x] G1: done\n  EVIDENCE: proof\n');
    seedTask(root, 'beta-task', '- [x] G1: done\n  EVIDENCE: proof\n');

    const complete = handleGates({ action: 'status', project_root: root });
    expect(complete).toMatchObject({ action: 'status', all_met: true });

    seedTask(
      root,
      'beta-task',
      '- [ ] G1: still pending\n  EVIDENCE: pending\n',
    );
    const incomplete = handleGates({ action: 'status', project_root: root });
    expect(incomplete).toMatchObject({ action: 'status', all_met: false });
  });

  it('abandons a gate and returns the visible abandonment', () => {
    const root = makeRepoRoot();
    const path = seedTask(
      root,
      'sample-task',
      '- [ ] G1: optional review\n  EVIDENCE: pending\n',
    );

    const result = handleGates({
      action: 'abandon',
      project_root: root,
      task: 'sample-task',
      gate_id: 'G1',
      reason: 'review is no longer in scope',
    });

    expect(result).toMatchObject({
      action: 'abandon',
      task: 'sample-task',
      gate_id: 'G1',
      status: {
        abandoned: 1,
        unmet: 0,
        all_met: true,
        abandons: [{ id: 'G1', reason: 'review is no longer in scope' }],
      },
    });
    expect(readFileSync(path, 'utf8')).toContain(
      'ABANDON: G1 review is no longer in scope',
    );
  });

  it('rejects abandon without a reason and writes nothing', () => {
    const root = makeRepoRoot();
    const before = '- [ ] G1: optional review\n  EVIDENCE: pending\n';
    const path = seedTask(root, 'sample-task', before);

    expect(() =>
      handleGates({
        action: 'abandon',
        project_root: root,
        task: 'sample-task',
        gate_id: 'G1',
      }),
    ).toThrow('abandon requires a reason');
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('rejects record for a CHECK gate and writes nothing', () => {
    const root = makeRepoRoot();
    const before = `- [ ] G1: tests pass
  CHECK: yarn test
  EVIDENCE: pending
`;
    const path = seedTask(root, 'sample-task', before);

    expect(() =>
      handleGates({
        action: 'record',
        project_root: root,
        task: 'sample-task',
        gate_id: 'G1',
        evidence: 'looked green',
      }),
    ).toThrow(
      'Gate G1 has a CHECK — it is proven by running the CHECK, not by record',
    );
    expect(readFileSync(path, 'utf8')).toBe(before);
  });

  it('records evidence for a manual gate', () => {
    const root = makeRepoRoot();
    const path = seedTask(
      root,
      'sample-task',
      '- [ ] G1: reviewer accepts\n  EVIDENCE: pending\n',
    );

    const result = handleGates({
      action: 'record',
      project_root: root,
      task: 'sample-task',
      gate_id: 'G1',
      evidence: 'reviewed by Dana',
    });

    expect(result).toMatchObject({
      action: 'record',
      task: 'sample-task',
      gate_id: 'G1',
      status: { met: 1, unmet: 0, all_met: true },
    });
    expect(readFileSync(path, 'utf8')).toContain(
      '- [x] G1: reviewer accepts\n  EVIDENCE: reviewed by Dana',
    );
  });

  it.each(['../etc', 'Bad_Name', ''])(
    'rejects invalid task name %j',
    (task) => {
      const root = makeRepoRoot();

      expect(() =>
        handleGates({ action: 'status', project_root: root, task }),
      ).toThrow('task must match /^[a-z0-9]+(?:-[a-z0-9]+)*$/');
    },
  );

  it.each(['g1', 'G-1'])('rejects invalid gate id %j', (gate_id) => {
    const root = makeRepoRoot();
    seedTask(
      root,
      'sample-task',
      '- [ ] G1: reviewer accepts\n  EVIDENCE: pending\n',
    );

    expect(() =>
      handleGates({
        action: 'record',
        project_root: root,
        task: 'sample-task',
        gate_id,
        evidence: 'reviewed',
      }),
    ).toThrow('gate_id must match /^G\\d+$/');
  });

  it('rejects a task with no ledger', () => {
    const root = makeRepoRoot();

    expect(() =>
      handleGates({
        action: 'status',
        project_root: root,
        task: 'missing-task',
      }),
    ).toThrow('No ledger for task "missing-task"');
  });

  it('lists met gates whose evidence carries an agent marker', () => {
    const root = makeRepoRoot();
    seedTask(
      root,
      'sample-task',
      `- [x] G1: delegated check passed
  EVIDENCE: tests passed (via agent abcdef12)
- [x] G2: local check passed
  EVIDENCE: tests passed
`,
    );

    const result = handleGates({
      action: 'status',
      project_root: root,
      task: 'sample-task',
    });

    expect(result).toMatchObject({
      action: 'status',
      tasks: [{ met_by_agent: ['G1'] }],
    });
  });
});
