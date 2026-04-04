import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import os from 'node:os';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { handleManifestGet } from '../../mcp/tools/manifest-get/manifest-get.js';
import { handleManifestSave } from '../../mcp/tools/manifest-save/manifest-save.js';
import { handleManifestValidate } from '../../mcp/tools/manifest-validate/manifest-validate.js';
import { handleManifestPlan } from '../../mcp/tools/manifest-plan/manifest-plan.js';

// --- helpers ---

function makeTmpDir(): string {
  const dir = join(os.tmpdir(), `imbas-mf-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

function makeRunDir(base: string, projectKey: string, runId: string): string {
  const dir = join(base, '.imbas', projectKey, 'runs', runId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

const VALID_STORIES_MANIFEST = {
  batch: 'B1',
  run_id: 'R001',
  project_ref: 'PROJ',
  epic_ref: null,
  created_at: new Date().toISOString(),
  stories: [
    {
      id: 'S-1',
      title: 'Story 1',
      description: 'desc',
      type: 'Story' as const,
      status: 'pending' as const,
      issue_ref: null,
      verification: { anchor_link: true, coherence: 'PASS' as const, reverse_inference: 'PASS' as const },
      size_check: 'PASS' as const,
      split_from: null,
      split_into: [],
    },
  ],
  links: [],
};

const VALID_DEVPLAN_MANIFEST = {
  batch: 'B1',
  run_id: 'R001',
  project_ref: 'PROJ',
  epic_ref: null,
  created_at: new Date().toISOString(),
  tasks: [
    {
      id: 'T-1',
      title: 'Task 1',
      description: 'desc',
      type: 'Task' as const,
      status: 'pending' as const,
      issue_ref: null,
      blocks: [],
      subtasks: [],
    },
  ],
  story_subtasks: [],
  feedback_comments: [],
  execution_order: [
    { step: 1, action: 'create_tasks' as const, items: ['T-1'] },
  ],
};

// --- tests ---

describe('handleManifestGet', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('loads stories manifest and returns summary', async () => {
    const runDir = makeRunDir(tmpDir, 'PROJ', 'R001');
    writeFileSync(join(runDir, 'stories-manifest.json'), JSON.stringify(VALID_STORIES_MANIFEST));

    const result = await handleManifestGet({ project_ref: 'PROJ', run_id: 'R001', type: 'stories' });
    expect(result.manifest).toBeDefined();
    expect(result.summary.total).toBe(1);
    expect(result.summary.pending).toBe(1);
  });

  it('loads devplan manifest and returns summary', async () => {
    const runDir = makeRunDir(tmpDir, 'PROJ', 'R001');
    writeFileSync(join(runDir, 'devplan-manifest.json'), JSON.stringify(VALID_DEVPLAN_MANIFEST));

    const result = await handleManifestGet({ project_ref: 'PROJ', run_id: 'R001', type: 'devplan' });
    expect(result.manifest).toBeDefined();
    expect(result.summary.total).toBe(1);
  });

  it('throws when manifest file is missing', async () => {
    makeRunDir(tmpDir, 'PROJ', 'R001');
    await expect(
      handleManifestGet({ project_ref: 'PROJ', run_id: 'R001', type: 'stories' }),
    ).rejects.toThrow();
  });
});

describe('handleManifestSave', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('saves stories manifest and returns path + summary', async () => {
    makeRunDir(tmpDir, 'PROJ', 'R001');
    const result = await handleManifestSave({
      project_ref: 'PROJ',
      run_id: 'R001',
      type: 'stories',
      manifest: VALID_STORIES_MANIFEST,
    });
    expect(result.path).toContain('stories-manifest.json');
    expect(result.summary.total).toBe(1);
  });

  it('throws when manifest is undefined', async () => {
    makeRunDir(tmpDir, 'PROJ', 'R001');
    await expect(
      handleManifestSave({ project_ref: 'PROJ', run_id: 'R001', type: 'stories', manifest: undefined }),
    ).rejects.toThrow('manifest is required');
  });

  it('throws when manifest fails schema validation', async () => {
    makeRunDir(tmpDir, 'PROJ', 'R001');
    await expect(
      handleManifestSave({ project_ref: 'PROJ', run_id: 'R001', type: 'stories', manifest: { bad: true } }),
    ).rejects.toThrow();
  });
});

describe('handleManifestValidate', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('returns valid: true for a correct stories manifest', async () => {
    const runDir = makeRunDir(tmpDir, 'PROJ', 'R001');
    writeFileSync(join(runDir, 'stories-manifest.json'), JSON.stringify(VALID_STORIES_MANIFEST));

    const result = await handleManifestValidate({ project_ref: 'PROJ', run_id: 'R001', type: 'stories' });
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns valid: false when manifest file is missing', async () => {
    makeRunDir(tmpDir, 'PROJ', 'R001');
    const result = await handleManifestValidate({ project_ref: 'PROJ', run_id: 'R001', type: 'stories' });
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns errors for duplicate story IDs', async () => {
    const runDir = makeRunDir(tmpDir, 'PROJ', 'R001');
    const dupManifest = {
      ...VALID_STORIES_MANIFEST,
      stories: [
        VALID_STORIES_MANIFEST.stories[0],
        { ...VALID_STORIES_MANIFEST.stories[0] }, // same id S-1
      ],
    };
    writeFileSync(join(runDir, 'stories-manifest.json'), JSON.stringify(dupManifest));

    const result = await handleManifestValidate({ project_ref: 'PROJ', run_id: 'R001', type: 'stories' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate story ID'))).toBe(true);
  });
});

describe('handleManifestPlan', () => {
  let tmpDir: string;
  let cwdSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(tmpDir);
  });

  afterEach(() => {
    cwdSpy.mockRestore();
  });

  it('generates execution plan from devplan manifest', async () => {
    const runDir = makeRunDir(tmpDir, 'PROJ', 'R001');
    writeFileSync(join(runDir, 'devplan-manifest.json'), JSON.stringify(VALID_DEVPLAN_MANIFEST));

    const result = await handleManifestPlan({ project_ref: 'PROJ', run_id: 'R001' });
    expect(result.steps).toHaveLength(1);
    expect(result.total_pending).toBe(1);
  });

  it('returns empty steps when all items are already created', async () => {
    const runDir = makeRunDir(tmpDir, 'PROJ', 'R001');
    const completedManifest = {
      ...VALID_DEVPLAN_MANIFEST,
      tasks: [{ ...VALID_DEVPLAN_MANIFEST.tasks[0], status: 'created' as const }],
    };
    writeFileSync(join(runDir, 'devplan-manifest.json'), JSON.stringify(completedManifest));

    const result = await handleManifestPlan({ project_ref: 'PROJ', run_id: 'R001' });
    expect(result.steps).toHaveLength(0);
    expect(result.total_pending).toBe(0);
  });
});
