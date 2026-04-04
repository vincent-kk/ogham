import { describe, expect, it, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

import { generateRunId } from '../core/run-id-generator.js';

const dirs: string[] = [];

function makeTempDir(): string {
  const dir = join(tmpdir(), `imbas-runid-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  dirs.push(dir);
  return dir;
}

function todayStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
});

describe('generateRunId', () => {
  it('generates YYYYMMDD-001 for empty directory', () => {
    const runsDir = makeTempDir();
    const id = generateRunId(runsDir);
    expect(id).toBe(`${todayStr()}-001`);
  });

  it('increments NNN for existing runs on the same date', () => {
    const runsDir = makeTempDir();
    const today = todayStr();
    mkdirSync(join(runsDir, `${today}-001`));
    mkdirSync(join(runsDir, `${today}-002`));

    const id = generateRunId(runsDir);
    expect(id).toBe(`${today}-003`);
  });

  it('handles non-existent directory gracefully', () => {
    const nonExistent = join(tmpdir(), `imbas-nonexistent-${randomUUID()}`);
    dirs.push(nonExistent);
    const id = generateRunId(nonExistent);
    expect(id).toMatch(/^\d{8}-001$/);
  });

  it('ignores entries from different dates', () => {
    const runsDir = makeTempDir();
    const today = todayStr();
    mkdirSync(join(runsDir, `20000101-001`));
    mkdirSync(join(runsDir, `20000101-099`));

    const id = generateRunId(runsDir);
    expect(id).toBe(`${today}-001`);
  });

  it('pads sequence number to 3 digits', () => {
    const runsDir = makeTempDir();
    const today = todayStr();
    mkdirSync(join(runsDir, `${today}-009`));

    const id = generateRunId(runsDir);
    expect(id).toBe(`${today}-010`);
  });

  it('handles gaps in sequence numbers correctly', () => {
    const runsDir = makeTempDir();
    const today = todayStr();
    mkdirSync(join(runsDir, `${today}-001`));
    mkdirSync(join(runsDir, `${today}-005`));

    const id = generateRunId(runsDir);
    expect(id).toBe(`${today}-006`);
  });

  it('output format matches YYYYMMDD-NNN pattern', () => {
    const runsDir = makeTempDir();
    const id = generateRunId(runsDir);
    expect(id).toMatch(/^\d{8}-\d{3}$/);
  });
});
