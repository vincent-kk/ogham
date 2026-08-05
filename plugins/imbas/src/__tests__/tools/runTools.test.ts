import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleRunCreate } from '../../mcp/tools/runCreate/index.js';
import { handleRunGet } from '../../mcp/tools/runGet/index.js';
import { handleRunList } from '../../mcp/tools/runList/index.js';
import { handleRunTransition } from '../../mcp/tools/runTransition/index.js';
import type { RunState } from '../../types/state.js';

// --- helpers ---

function makeTmpDir(): string {
  const dir = join(
    os.tmpdir(),
    `imbas-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writeSourceFile(dir: string): string {
  const src = join(dir, 'source.md');
  writeFileSync(src, '# Test source\n');
  return src;
}

function writeStateJson(runDir: string, state: object): void {
  mkdirSync(runDir, { recursive: true });
  writeFileSync(join(runDir, 'state.json'), JSON.stringify(state, null, 2));
}

function makeInitialState(
  run_id: string,
  project_ref: string,
  source_file: string,
): RunState {
  const now = new Date().toISOString();
  return {
    run_id,
    project_ref,
    epic_ref: null,
    source_issue_ref: null,
    source_file,
    created_at: now,
    updated_at: now,
    current_phase: 'refine',
    phases: {
      refine: {
        status: 'pending',
        started_at: null,
        completed_at: null,
        result: null,
        blocking_issues: 0,
        warning_issues: 0,
      },
      estimate: {
        status: 'pending',
        started_at: null,
        completed_at: null,
        estimated_manday: null,
      },
      split: {
        status: 'pending',
        started_at: null,
        completed_at: null,
        stories_created: 0,
        pending_review: true,
        escape_code: null,
      },
    },
  };
}

// --- tests ---

describe('handleRunCreate', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('creates run directory and returns run_id', async () => {
    const src = writeSourceFile(tmpDir);
    const result = await handleRunCreate({
      project_ref: 'TEST',
      source_file: src,
    });
    expect(result.run_id).toMatch(/^\d{8}-\d{3}$/);
    expect(result.run_dir).toContain('TEST');
  });

  it('returns initial state with correct project_ref', async () => {
    const src = writeSourceFile(tmpDir);
    const result = await handleRunCreate({
      project_ref: 'PROJ',
      source_file: src,
    });
    expect(result.state.project_ref).toBe('PROJ');
    expect(result.state.current_phase).toBe('refine');
  });

  it('copies supplements into run dir supplements/ subdir', async () => {
    const src = writeSourceFile(tmpDir);
    const suppFile = join(tmpDir, 'extra.md');
    writeFileSync(suppFile, '# Extra\n');
    const result = await handleRunCreate({
      project_ref: 'TEST',
      source_file: src,
      supplements: [suppFile],
    });
    const { existsSync } = await import('node:fs');
    expect(existsSync(join(result.run_dir, 'supplements', 'extra.md'))).toBe(
      true,
    );
  });

  it('copies the source file into the run directory', async () => {
    const src = writeSourceFile(tmpDir);
    const result = await handleRunCreate({
      project_ref: 'TEST',
      source_file: src,
    });
    const { readFileSync } = await import('node:fs');
    const content = readFileSync(join(result.run_dir, 'source.md'), 'utf-8');
    expect(content).toBe('# Test source\n');
  });
});

describe('handleRunGet', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('reads state from existing run', async () => {
    const runDir = join(tmpDir, '.imbas', 'MYPROJ', 'runs', '20260101-001');
    const state = makeInitialState('20260101-001', 'MYPROJ', '/source.md');
    writeStateJson(runDir, state);

    const result = await handleRunGet({
      project_ref: 'MYPROJ',
      run_id: '20260101-001',
    });
    expect(result.state.run_id).toBe('20260101-001');
    expect(result.state.project_ref).toBe('MYPROJ');
  });

  it('returns manifests_available as empty when no manifest files exist', async () => {
    const runDir = join(tmpDir, '.imbas', 'MYPROJ', 'runs', '20260101-001');
    const state = makeInitialState('20260101-001', 'MYPROJ', '/source.md');
    writeStateJson(runDir, state);

    const result = await handleRunGet({
      project_ref: 'MYPROJ',
      run_id: '20260101-001',
    });
    expect(result.manifests_available).toEqual([]);
  });

  it('throws when project_ref missing and no config default', async () => {
    await expect(handleRunGet({})).rejects.toThrow('project_ref is required');
  });

  it('throws when no runs directory exists', async () => {
    await expect(handleRunGet({ project_ref: 'NOPROJ' })).rejects.toThrow();
  });
});

describe('handleRunList', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('returns empty runs when no runs directory exists', async () => {
    mkdirSync(join(tmpDir, '.imbas', 'PROJ'), { recursive: true });
    const result = await handleRunList({ project_ref: 'PROJ' });
    expect(result.runs).toEqual([]);
  });

  it('lists runs in project dir', async () => {
    const run1 = join(tmpDir, '.imbas', 'PROJ', 'runs', '20260101-001');
    const run2 = join(tmpDir, '.imbas', 'PROJ', 'runs', '20260101-002');
    const state1 = makeInitialState('20260101-001', 'PROJ', '/s.md');
    const state2 = makeInitialState('20260101-002', 'PROJ', '/s.md');
    writeStateJson(run1, state1);
    writeStateJson(run2, state2);

    const result = await handleRunList({ project_ref: 'PROJ' });
    expect(result.runs).toHaveLength(2);
    expect(result.runs.map((r) => r.run_id)).toContain('20260101-001');
    expect(result.runs.map((r) => r.run_id)).toContain('20260101-002');
  });

  it('throws when project_ref missing and no config default', async () => {
    await expect(handleRunList({})).rejects.toThrow('project_ref is required');
  });
});

describe('handleRunTransition', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('applies start_phase transition and sets status to in_progress', async () => {
    const runDir = join(tmpDir, '.imbas', 'PROJ', 'runs', '20260101-001');
    const state = makeInitialState('20260101-001', 'PROJ', '/s.md');
    writeStateJson(runDir, state);

    const result = await handleRunTransition({
      project_ref: 'PROJ',
      run_id: '20260101-001',
      action: 'start_phase',
      phase: 'refine',
    });
    expect(result.phases.refine.status).toBe('in_progress');
  });

  it('completes estimate with estimated_manday via MCP tool', async () => {
    const runDir = join(tmpDir, '.imbas', 'PROJ', 'runs', '20260101-001');
    const state = makeInitialState('20260101-001', 'PROJ', '/s.md');
    state.phases.refine.status = 'completed';
    state.phases.refine.result = 'PASS';
    state.phases.estimate.status = 'in_progress';
    writeStateJson(runDir, state);

    const result = await handleRunTransition({
      project_ref: 'PROJ',
      run_id: '20260101-001',
      action: 'complete_phase',
      phase: 'estimate',
      estimated_manday: 42.5,
    });
    expect(result.phases.estimate.status).toBe('completed');
    expect(result.phases.estimate.estimated_manday).toBe(42.5);
    expect(result.current_phase).toBe('split');
  });

  it('applies skip_phases for estimate via MCP tool', async () => {
    const runDir = join(tmpDir, '.imbas', 'PROJ', 'runs', '20260101-001');
    const state = makeInitialState('20260101-001', 'PROJ', '/s.md');
    state.phases.refine.status = 'completed';
    state.phases.refine.result = 'PASS';
    writeStateJson(runDir, state);

    const result = await handleRunTransition({
      project_ref: 'PROJ',
      run_id: '20260101-001',
      action: 'skip_phases',
      phases: ['estimate'],
    });
    expect(result.phases.estimate.status).toBe('skipped');
    expect(result.current_phase).toBe('split');
  });

  it('rejects skip_phases for refine via schema validation', async () => {
    const runDir = join(tmpDir, '.imbas', 'PROJ', 'runs', '20260101-001');
    const state = makeInitialState('20260101-001', 'PROJ', '/s.md');
    writeStateJson(runDir, state);

    await expect(
      handleRunTransition({
        project_ref: 'PROJ',
        run_id: '20260101-001',
        action: 'skip_phases',
        phases: ['refine'],
      }),
    ).rejects.toThrow();
  });
});
