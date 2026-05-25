/**
 * @file context-injector.test.ts
 * @description Tests for UserPromptSubmit hook context-injector.
 *   Verifies lexicographic-sort behavior over YYYYMMDD-NNN run IDs and the
 *   graceful-degradation paths when .imbas/ state is absent or partial.
 */
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { processContextInjector } from '../hooks/context-injector/context-injector.js';
import type { UserPromptSubmitInput } from '../types/hooks.js';

const dirs: string[] = [];

function makeCwd(): string {
  const cwd = join(tmpdir(), `imbas-test-${randomUUID()}`);
  mkdirSync(cwd, { recursive: true });
  dirs.push(cwd);
  return cwd;
}

function seedImbas(
  cwd: string,
  project: string,
  runs: { id: string; phase: string; status: string }[],
): void {
  const imbasRoot = join(cwd, '.imbas');
  mkdirSync(imbasRoot, { recursive: true });
  writeFileSync(
    join(imbasRoot, 'config.json'),
    JSON.stringify({ defaults: { project_ref: project } }),
    'utf-8',
  );
  for (const run of runs) {
    const runDir = join(imbasRoot, project, 'runs', run.id);
    mkdirSync(runDir, { recursive: true });
    writeFileSync(
      join(runDir, 'state.json'),
      JSON.stringify({
        current_phase: run.phase,
        phases: { [run.phase]: { status: run.status } },
      }),
      'utf-8',
    );
  }
}

function input(cwd: string): UserPromptSubmitInput {
  return { cwd } as UserPromptSubmitInput;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
});

describe('processContextInjector — graceful-degradation paths', () => {
  it('returns continue without context when .imbas/ is absent', () => {
    expect(processContextInjector(input(makeCwd()))).toEqual({
      continue: true,
    });
  });

  it('returns continue when config.json is absent', () => {
    const cwd = makeCwd();
    mkdirSync(join(cwd, '.imbas'), { recursive: true });
    expect(processContextInjector(input(cwd))).toEqual({ continue: true });
  });

  it('returns continue when runs/ directory is empty', () => {
    const cwd = makeCwd();
    seedImbas(cwd, 'PROJ', []);
    expect(processContextInjector(input(cwd))).toEqual({ continue: true });
  });
});

describe('processContextInjector — lexicographic sort of YYYYMMDD-NNN run IDs', () => {
  it.each([
    {
      name: 'newest day wins across day boundary',
      runs: [
        { id: '20260525-999', phase: 'devplan', status: 'completed' },
        { id: '20260526-001', phase: 'split', status: 'in_progress' },
      ],
      expectId: '20260526-001',
      expectPhase: 'split',
      expectStatus: 'in_progress',
    },
    {
      name: 'higher zero-padded NNN within a day wins',
      runs: [
        { id: '20260526-005', phase: 'validate', status: 'completed' },
        { id: '20260526-010', phase: 'devplan', status: 'pending' },
      ],
      expectId: '20260526-010',
      expectPhase: 'devplan',
      expectStatus: 'pending',
    },
    {
      name: 'three+ runs picks the lexicographically last',
      runs: [
        { id: '20260524-001', phase: 'validate', status: 'completed' },
        { id: '20260525-001', phase: 'split', status: 'completed' },
        { id: '20260526-001', phase: 'devplan', status: 'in_progress' },
      ],
      expectId: '20260526-001',
      expectPhase: 'devplan',
      expectStatus: 'in_progress',
    },
  ])('$name', ({ runs, expectId, expectPhase, expectStatus }) => {
    const cwd = makeCwd();
    seedImbas(cwd, 'PROJ', runs);
    const result = processContextInjector(input(cwd));
    expect(result.continue).toBe(true);
    const ctx = result.hookSpecificOutput?.additionalContext ?? '';
    expect(ctx).toContain(expectId);
    expect(ctx).toContain(`phase: ${expectPhase}`);
    expect(ctx).toContain(`status: ${expectStatus}`);
  });
});
