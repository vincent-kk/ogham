import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { handleManifestSave } from '../../mcp/tools/manifestSave/index.js';
import { handleManifestValidate } from '../../mcp/tools/manifestValidate/index.js';

// --- helpers ---

function makeTmpDir(): string {
  const dir = join(
    os.tmpdir(),
    `imbas-mt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

const storiesManifest = {
  batch: 'batch-001',
  run_id: '20260101-001',
  project_ref: 'PROJ',
  epic_ref: null,
  created_at: '2026-01-01T00:00:00.000Z',
  stories: [
    {
      id: 'S-001',
      title: 'Story 1',
      description: 'Desc',
      type: 'Story',
      verification: {
        anchor_link: true,
        coherence: 'PASS',
        reverse_inference: 'PASS',
      },
      size_check: 'PASS',
    },
  ],
};

const estimationManifest = {
  run_id: '20260101-001',
  project_ref: 'PROJ',
  source: 'refined.md',
  created_at: '2026-01-01T00:00:00.000Z',
  units: [
    {
      id: 'U-1',
      name: 'Login',
      view_refs: {
        page: ['login'],
        feature: ['email-login'],
        module: ['auth'],
      },
      complexity: 'M',
      estimate: { o: 1, m: 3, p: 5, expected: 3, sigma: 0.67 },
      rationale: 'standard flow',
    },
  ],
  rollup: {
    sum_expected: 3,
    overhead: { integration: 0.3, test: 0.45, pm: 0.15 },
    buffered_total: 4.7,
    confidence_interval: [3.6, 5.7],
  },
  schedule: {
    tracks: [{ track: 1, units: ['U-1'] }],
    milestones: [],
    total_weeks: 1,
  },
};

describe('handleManifestSave + handleManifestValidate', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('saves a stories manifest with defaults applied and summarizes it', async () => {
    const result = await handleManifestSave({
      project_ref: 'PROJ',
      run_id: '20260101-001',
      type: 'stories',
      manifest: storiesManifest,
    });
    expect(result.path).toContain('stories-manifest.json');
    expect(result.summary).toEqual({
      total: 1,
      pending: 1,
      created: 0,
      failed: 0,
    });

    const saved = JSON.parse(readFileSync(result.path, 'utf-8'));
    expect(saved.version).toBe(2);
    expect(saved.stories[0].estimate_manday).toBeNull();

    const validation = await handleManifestValidate({
      project_ref: 'PROJ',
      run_id: '20260101-001',
      type: 'stories',
    });
    expect(validation.valid).toBe(true);
  });

  it('saves an estimation manifest and summarizes rollup/schedule', async () => {
    const result = await handleManifestSave({
      project_ref: 'PROJ',
      run_id: '20260101-001',
      type: 'estimation',
      manifest: estimationManifest,
    });
    expect(result.path).toContain('estimation.json');
    expect(result.summary).toEqual({
      units: 1,
      sum_expected: 3,
      buffered_total: 4.7,
      total_weeks: 1,
    });

    const validation = await handleManifestValidate({
      project_ref: 'PROJ',
      run_id: '20260101-001',
      type: 'estimation',
    });
    expect(validation.valid).toBe(true);
  });

  it('rejects a schema-invalid manifest and writes no file', async () => {
    await expect(
      handleManifestSave({
        project_ref: 'PROJ',
        run_id: '20260101-001',
        type: 'estimation',
        manifest: { ...estimationManifest, rollup: undefined },
      }),
    ).rejects.toThrow();

    const path = join(
      tmpDir,
      '.imbas',
      'PROJ',
      'runs',
      '20260101-001',
      'estimation.json',
    );
    expect(existsSync(path)).toBe(false);
  });

  it('rejects when manifest payload is missing', async () => {
    await expect(
      handleManifestSave({
        project_ref: 'PROJ',
        run_id: '20260101-001',
        type: 'stories',
      }),
    ).rejects.toThrow('manifest is required');
  });

  it('reports a missing manifest file as a validation result, not an error', async () => {
    const result = await handleManifestValidate({
      project_ref: 'PROJ',
      run_id: '20260101-001',
      type: 'stories',
    });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Schema validation failed');
  });
});
