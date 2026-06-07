import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  canAutoExecute,
  readAutonomyLevel,
  setAutonomyLevel,
} from '../../../core/autonomy/autonomy.js';

function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'maencof-autonomy-test-'));
}

function ensureMeta(cwd: string): void {
  mkdirSync(join(cwd, '.maencof-meta'), { recursive: true });
}

describe('autonomy', () => {
  let cwd: string;

  beforeEach(() => {
    cwd = createTempDir();
    ensureMeta(cwd);
  });

  afterEach(() => {
    rmSync(cwd, { recursive: true, force: true });
  });

  // Happy path (3)
  it('returns 0 when no config file exists', () => {
    expect(readAutonomyLevel(cwd)).toBe(0);
  });

  it('sets and reads autonomy level', () => {
    setAutonomyLevel(cwd, 2);
    expect(readAutonomyLevel(cwd)).toBe(2);
  });

  it('canAutoExecute returns true when current >= required', () => {
    expect(canAutoExecute(2, 1)).toBe(true);
    expect(canAutoExecute(2, 2)).toBe(true);
  });

  // Edge cases
  it('canAutoExecute returns false when current < required', () => {
    expect(canAutoExecute(1, 2)).toBe(false);
    expect(canAutoExecute(0, 3)).toBe(false);
  });

  it('overwrites existing level', () => {
    setAutonomyLevel(cwd, 1);
    setAutonomyLevel(cwd, 3);
    expect(readAutonomyLevel(cwd)).toBe(3);
  });

  it('handles corrupted JSON gracefully', () => {
    const { writeFileSync } = require('node:fs');
    writeFileSync(join(cwd, '.maencof-meta', 'autonomy-config.json'), 'bad');
    expect(readAutonomyLevel(cwd)).toBe(0);
  });

  it('creates .maencof-meta directory if missing', () => {
    const freshCwd = createTempDir();
    setAutonomyLevel(freshCwd, 1);
    expect(readAutonomyLevel(freshCwd)).toBe(1);
    rmSync(freshCwd, { recursive: true, force: true });
  });

  it('canAutoExecute handles boundary level 0', () => {
    expect(canAutoExecute(0, 0)).toBe(true);
  });

  it('canAutoExecute handles max level 3', () => {
    expect(canAutoExecute(3, 3)).toBe(true);
  });
});
