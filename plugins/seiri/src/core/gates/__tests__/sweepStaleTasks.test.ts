import {
  existsSync,
  lutimesSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { IDLE_STATE_TTL } from '../../../constants/retention.js';
import * as locks from '../../utils/acquireLockDir.js';
import { sweepStaleTasks } from '../index.js';

/** Fixed clock for filesystem retention comparisons. */
const NOW = 1_700_000_000_000;
/** A date strictly older than the shared idle threshold. */
const OLD = new Date(NOW - IDLE_STATE_TTL - 1);

describe('sweepStaleTasks', () => {
  let root: string;
  let dir: string;
  let task: string;

  /** Write a task file and make its containing task directory stale.
   * @param name Basename relative to the current task.
   * @param age Milliseconds since the file was modified.
   * @returns Absolute file path.
   */
  function file(name: string, age = IDLE_STATE_TTL + 1): string {
    const path = join(task, name);
    writeFileSync(path, 'task content');
    utimesSync(path, new Date(NOW - age), new Date(NOW - age));
    utimesSync(task, OLD, OLD);
    return path;
  }

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'seiri-tasks-'));
    dir = join(root, '.seiri/tasks');
    task = join(dir, 'idle');
    mkdirSync(task, { recursive: true });
    utimesSync(task, OLD, OLD);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    rmSync(root, { recursive: true, force: true });
  });

  it('deletes a task whose entire tree is stale', () => {
    file('gates.md');
    file('plan.md');
    sweepStaleTasks(root, NOW);
    expect(existsSync(task)).toBe(false);
  });

  it('keeps old gates when the plan is fresh', () => {
    file('gates.md');
    file('plan.md', 0);
    sweepStaleTasks(root, NOW);
    expect(existsSync(task)).toBe(true);
  });

  it('includes fresh descendants of an old subdirectory', () => {
    const nested = join(task, 'notes');
    mkdirSync(nested);
    file('notes/decision.md', 0);
    utimesSync(nested, OLD, OLD);
    sweepStaleTasks(root, NOW);
    expect(existsSync(task)).toBe(true);
  });

  it('deletes an old empty directory using its own mtime', () => {
    sweepStaleTasks(root, NOW);
    expect(existsSync(task)).toBe(false);
  });

  it('keeps a task with a fresh gates lock without acquiring it', () => {
    mkdirSync(join(task, 'gates.lock'));
    utimesSync(task, OLD, OLD);
    const acquire = vi.spyOn(locks, 'acquireLockDir');
    sweepStaleTasks(root, NOW);
    expect(existsSync(task)).toBe(true);
    expect(acquire).not.toHaveBeenCalled();
  });

  it('deletes only stale loose files', () => {
    const old = join(dir, 'orphan');
    const fresh = join(dir, 'fresh');
    writeFileSync(old, 'old');
    writeFileSync(fresh, 'fresh');
    utimesSync(old, OLD, OLD);
    sweepStaleTasks(root, NOW);
    expect([old, fresh].map(existsSync)).toEqual([false, true]);
  });

  it('keeps a task at exactly 72 hours', () => {
    file('plan.md', IDLE_STATE_TTL);
    sweepStaleTasks(root, NOW);
    expect(existsSync(task)).toBe(true);
  });

  it('accepts missing tasks without creating the directory', () => {
    rmSync(dir, { recursive: true });
    expect(() => sweepStaleTasks(root, NOW)).not.toThrow();
    expect(existsSync(dir)).toBe(false);
  });

  it('does not follow a symlink used as the tasks directory', () => {
    rmSync(dir, { recursive: true });
    const outside = join(root, 'outside');
    mkdirSync(outside);
    writeFileSync(join(outside, 'keep'), 'keep');
    utimesSync(join(outside, 'keep'), OLD, OLD);
    symlinkSync(outside, dir, 'dir');
    sweepStaleTasks(root, NOW);
    expect(existsSync(join(outside, 'keep'))).toBe(true);
  });

  it('uses link mtime without following fresh external targets', () => {
    const outside = join(root, 'outside');
    mkdirSync(outside);
    writeFileSync(join(outside, 'keep'), 'fresh');
    const link = join(task, 'link');
    symlinkSync(outside, link, 'dir');
    lutimesSync(link, OLD, OLD);
    utimesSync(task, OLD, OLD);
    sweepStaleTasks(root, NOW);
    expect(existsSync(task)).toBe(false);
    expect(existsSync(join(outside, 'keep'))).toBe(true);
  });

  it('requires the owning lock before deleting a task', () => {
    file('plan.md');
    vi.spyOn(locks, 'acquireLockDir').mockReturnValue(false);
    sweepStaleTasks(root, NOW);
    expect(existsSync(task)).toBe(true);
  });

  it('rechecks descendants after locking and releases the lock on veto', () => {
    const path = file('plan.md');
    vi.spyOn(locks, 'acquireLockDir').mockImplementation((lock) => {
      mkdirSync(lock);
      utimesSync(path, new Date(NOW), new Date(NOW));
      return true;
    });
    sweepStaleTasks(root, NOW);
    expect(existsSync(path)).toBe(true);
    expect(existsSync(join(task, 'gates.lock'))).toBe(false);
  });

  it('allows deletion when a child disappears before the recheck', () => {
    const path = file('plan.md');
    vi.spyOn(locks, 'acquireLockDir').mockImplementation((lock) => {
      mkdirSync(lock);
      rmSync(path);
      return true;
    });
    sweepStaleTasks(root, NOW);
    expect(existsSync(task)).toBe(false);
  });
});
