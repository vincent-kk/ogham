/**
 * @file pipelineIntegration.test.ts
 * @description End-to-end integration over the MCP handlers: a full v2 run —
 *   run_create → refine → estimate (manifest_save estimation) → split
 *   (manifest_save stories) — exercising the state machine and manifest
 *   layers together, plus the estimate-skip path.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleManifestSave } from '../../mcp/tools/manifestSave/index.js';
import { handleManifestValidate } from '../../mcp/tools/manifestValidate/index.js';
import { handleRunCreate } from '../../mcp/tools/runCreate/index.js';
import { handleRunGet } from '../../mcp/tools/runGet/index.js';
import { handleRunTransition } from '../../mcp/tools/runTransition/index.js';

function makeTmpDir(): string {
  const dir = join(
    os.tmpdir(),
    `imbas-e2e-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

function estimationFor(run_id: string) {
  return {
    run_id,
    project_ref: 'PROJ',
    source: 'refined.md',
    created_at: '2026-01-01T00:00:00.000Z',
    units: [
      {
        id: 'U-1',
        name: 'Login',
        view_refs: { page: ['login'], feature: ['login'], module: ['auth'] },
        complexity: 'M',
        estimate: { o: 1, m: 3, p: 5, expected: 3, sigma: 0.67 },
        rationale: 'standard flow',
      },
      {
        id: 'U-2',
        name: 'Profile',
        view_refs: { page: ['profile'], feature: ['profile'], module: [] },
        complexity: 'S',
        estimate: { o: 0.5, m: 1, p: 2, expected: 1.08, sigma: 0.25 },
        rationale: 'simple CRUD',
        deps: ['U-1'],
      },
    ],
    rollup: {
      sum_expected: 4.08,
      overhead: { integration: 0.41, test: 0.61, pm: 0.2 },
      buffered_total: 6.4,
      confidence_interval: [5.0, 7.8],
    },
    schedule: {
      tracks: [{ track: 1, units: ['U-1', 'U-2'] }],
      milestones: [{ name: 'auth done', week: 1 }],
      total_weeks: 2,
    },
  };
}

function storiesFor(run_id: string) {
  return {
    batch: 'batch-001',
    run_id,
    project_ref: 'PROJ',
    epic_ref: null,
    created_at: '2026-01-01T00:00:00.000Z',
    stories: [
      {
        id: 'S-001',
        title: 'Email login',
        description: 'As a user I can log in with email',
        type: 'Story',
        verification: {
          anchor_link: true,
          coherence: 'PASS',
          reverse_inference: 'PASS',
        },
        size_check: 'PASS',
        estimate_manday: 3,
      },
    ],
  };
}

describe('v2 pipeline integration — full path', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  function writeSource(): string {
    const src = join(tmpDir, 'plan.md');
    writeFileSync(src, '# Plan\n');
    return src;
  }

  it('runs refine → estimate → split with manifests validated at each step', async () => {
    const created = await handleRunCreate({
      project_ref: 'PROJ',
      source_file: writeSource(),
    });
    const run_id = created.run_id;

    // refine
    await handleRunTransition({
      project_ref: 'PROJ',
      run_id,
      action: 'start_phase',
      phase: 'refine',
    });
    let state = await handleRunTransition({
      project_ref: 'PROJ',
      run_id,
      action: 'complete_phase',
      phase: 'refine',
      result: 'PASS',
      blocking_issues: 0,
      warning_issues: 1,
    });
    expect(state.current_phase).toBe('estimate');

    // estimate
    await handleRunTransition({
      project_ref: 'PROJ',
      run_id,
      action: 'start_phase',
      phase: 'estimate',
    });
    const savedEstimation = await handleManifestSave({
      project_ref: 'PROJ',
      run_id,
      type: 'estimation',
      manifest: estimationFor(run_id),
    });
    expect(savedEstimation.summary).toMatchObject({ units: 2 });
    const estimationCheck = await handleManifestValidate({
      project_ref: 'PROJ',
      run_id,
      type: 'estimation',
    });
    expect(estimationCheck.valid).toBe(true);
    state = await handleRunTransition({
      project_ref: 'PROJ',
      run_id,
      action: 'complete_phase',
      phase: 'estimate',
      estimated_manday: 6.4,
    });
    expect(state.phases.estimate.estimated_manday).toBe(6.4);
    expect(state.current_phase).toBe('split');

    // split
    await handleRunTransition({
      project_ref: 'PROJ',
      run_id,
      action: 'start_phase',
      phase: 'split',
    });
    await handleManifestSave({
      project_ref: 'PROJ',
      run_id,
      type: 'stories',
      manifest: storiesFor(run_id),
    });
    const storiesCheck = await handleManifestValidate({
      project_ref: 'PROJ',
      run_id,
      type: 'stories',
    });
    expect(storiesCheck.valid).toBe(true);
    state = await handleRunTransition({
      project_ref: 'PROJ',
      run_id,
      action: 'complete_phase',
      phase: 'split',
      stories_created: 1,
      pending_review: false,
    });
    expect(state.phases.split.status).toBe('completed');

    // final state observable through run_get, with both manifests present
    const final = await handleRunGet({ project_ref: 'PROJ', run_id });
    expect(final.state.phases.refine.status).toBe('completed');
    expect(final.state.phases.estimate.status).toBe('completed');
    expect(final.state.phases.split.status).toBe('completed');
    expect(final.manifests_available).toEqual(
      expect.arrayContaining(['stories', 'estimation']),
    );
  });

  it('supports the estimate-skip path', async () => {
    const created = await handleRunCreate({
      project_ref: 'PROJ',
      source_file: writeSource(),
    });
    const run_id = created.run_id;

    await handleRunTransition({
      project_ref: 'PROJ',
      run_id,
      action: 'start_phase',
      phase: 'refine',
    });
    await handleRunTransition({
      project_ref: 'PROJ',
      run_id,
      action: 'complete_phase',
      phase: 'refine',
      result: 'PASS',
    });
    const skipped = await handleRunTransition({
      project_ref: 'PROJ',
      run_id,
      action: 'skip_phases',
      phases: ['estimate'],
    });
    expect(skipped.phases.estimate.status).toBe('skipped');

    const started = await handleRunTransition({
      project_ref: 'PROJ',
      run_id,
      action: 'start_phase',
      phase: 'split',
    });
    expect(started.phases.split.status).toBe('in_progress');
  });

  it('blocks split when refine result is BLOCKED', async () => {
    const created = await handleRunCreate({
      project_ref: 'PROJ',
      source_file: writeSource(),
    });
    const run_id = created.run_id;

    await handleRunTransition({
      project_ref: 'PROJ',
      run_id,
      action: 'start_phase',
      phase: 'refine',
    });
    await handleRunTransition({
      project_ref: 'PROJ',
      run_id,
      action: 'complete_phase',
      phase: 'refine',
      result: 'BLOCKED',
      blocking_issues: 3,
    });

    await expect(
      handleRunTransition({
        project_ref: 'PROJ',
        run_id,
        action: 'start_phase',
        phase: 'split',
      }),
    ).rejects.toThrow('Cannot start phase "split"');
  });
});
