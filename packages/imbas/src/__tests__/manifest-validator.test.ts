import { describe, expect, it, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';

import { validateManifest } from '../core/manifest-validator.js';
import type { StoriesManifest, DevplanManifest } from '../types/manifest.js';

const dirs: string[] = [];

function makeTempDir(): string {
  const dir = join(tmpdir(), `imbas-mv-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  }
});

function writeStoriesManifest(runDir: string, manifest: StoriesManifest): void {
  writeFileSync(
    join(runDir, 'stories-manifest.json'),
    JSON.stringify(manifest),
    'utf-8',
  );
}

function writeDevplanManifest(runDir: string, manifest: DevplanManifest): void {
  writeFileSync(
    join(runDir, 'devplan-manifest.json'),
    JSON.stringify(manifest),
    'utf-8',
  );
}

const baseStoriesManifest: StoriesManifest = {
  batch: 'batch-001',
  run_id: '20240101-001',
  project_key: 'PROJ',
  epic_key: null,
  created_at: '2024-01-01T00:00:00.000Z',
  stories: [
    {
      id: 'S-001',
      title: 'Story 1',
      description: 'Desc 1',
      type: 'Story',
      status: 'pending',
      jira_key: null,
      verification: { anchor_link: true, coherence: 'PASS', reverse_inference: 'PASS' },
      size_check: 'PASS',
      split_from: null,
      split_into: [],
    },
    {
      id: 'S-002',
      title: 'Story 2',
      description: 'Desc 2',
      type: 'Story',
      status: 'pending',
      jira_key: null,
      verification: { anchor_link: true, coherence: 'PASS', reverse_inference: 'PASS' },
      size_check: 'PASS',
      split_from: null,
      split_into: [],
    },
  ],
  links: [],
};

const baseDevplanManifest: DevplanManifest = {
  batch: 'batch-001',
  run_id: '20240101-001',
  project_key: 'PROJ',
  epic_key: null,
  created_at: '2024-01-01T00:00:00.000Z',
  tasks: [
    {
      id: 'T-001',
      title: 'Task 1',
      description: 'Task desc',
      type: 'Task',
      status: 'pending',
      jira_key: null,
      blocks: [],
      subtasks: [{ id: 'ST-001', title: 'Sub 1', description: 'Sub desc', status: 'pending', jira_key: null }],
    },
  ],
  story_subtasks: [],
  feedback_comments: [],
  execution_order: [
    { step: 1, action: 'create_tasks', items: ['T-001'] },
    { step: 2, action: 'create_task_subtasks', items: ['ST-001'] },
  ],
};

// --- Basic (3) ---

describe('validateManifest stories', () => {
  it('valid stories manifest passes with no errors', async () => {
    const runDir = makeTempDir();
    writeStoriesManifest(runDir, baseStoriesManifest);

    const result = await validateManifest(runDir, 'stories');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateManifest devplan', () => {
  it('valid devplan manifest passes with no errors', async () => {
    const runDir = makeTempDir();
    writeDevplanManifest(runDir, baseDevplanManifest);

    const result = await validateManifest(runDir, 'devplan');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateManifest missing file', () => {
  it('returns invalid result when manifest file is missing', async () => {
    const runDir = makeTempDir();
    const result = await validateManifest(runDir, 'stories');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Schema validation failed');
  });
});

// --- Complex (12) ---

describe('stories manifest validation errors', () => {
  it('detects duplicate story IDs', async () => {
    const runDir = makeTempDir();
    const manifest: StoriesManifest = {
      ...baseStoriesManifest,
      stories: [
        { ...baseStoriesManifest.stories[0]! },
        { ...baseStoriesManifest.stories[0]!, title: 'Duplicate' },
      ],
    };
    writeStoriesManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'stories');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate story ID'))).toBe(true);
  });

  it('detects broken link from reference', async () => {
    const runDir = makeTempDir();
    const manifest: StoriesManifest = {
      ...baseStoriesManifest,
      links: [{ type: 'blocks', from: 'S-999', to: ['S-001'], status: 'pending' }],
    };
    writeStoriesManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'stories');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown source ID: "S-999"'))).toBe(true);
  });

  it('detects broken link to reference', async () => {
    const runDir = makeTempDir();
    const manifest: StoriesManifest = {
      ...baseStoriesManifest,
      links: [{ type: 'blocks', from: 'S-001', to: ['S-999'], status: 'pending' }],
    };
    writeStoriesManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'stories');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown target ID: "S-999"'))).toBe(true);
  });

  it('produces warning for broken split_into reference', async () => {
    const runDir = makeTempDir();
    const manifest: StoriesManifest = {
      ...baseStoriesManifest,
      stories: [
        { ...baseStoriesManifest.stories[0]!, split_into: ['S-999'] },
        baseStoriesManifest.stories[1]!,
      ],
    };
    writeStoriesManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'stories');
    expect(result.warnings.some((w) => w.includes('S-999'))).toBe(true);
  });

  it('passes with valid link references', async () => {
    const runDir = makeTempDir();
    const manifest: StoriesManifest = {
      ...baseStoriesManifest,
      links: [{ type: 'blocks', from: 'S-001', to: ['S-002'], status: 'pending' }],
    };
    writeStoriesManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'stories');
    expect(result.valid).toBe(true);
  });
});

describe('devplan manifest validation errors', () => {
  it('detects execution_order referencing invalid IDs', async () => {
    const runDir = makeTempDir();
    const manifest: DevplanManifest = {
      ...baseDevplanManifest,
      execution_order: [
        { step: 1, action: 'create_tasks', items: ['T-001', 'T-UNKNOWN'] },
      ],
    };
    writeDevplanManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'devplan');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('"T-UNKNOWN"'))).toBe(true);
  });

  it('detects duplicate task IDs', async () => {
    const runDir = makeTempDir();
    const manifest: DevplanManifest = {
      ...baseDevplanManifest,
      tasks: [
        baseDevplanManifest.tasks[0]!,
        { ...baseDevplanManifest.tasks[0]!, subtasks: [] },
      ],
      execution_order: [],
    };
    writeDevplanManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'devplan');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate task ID'))).toBe(true);
  });

  it('produces warning for task.blocks referencing unknown task ID', async () => {
    const runDir = makeTempDir();
    const manifest: DevplanManifest = {
      ...baseDevplanManifest,
      tasks: [
        { ...baseDevplanManifest.tasks[0]!, blocks: ['T-UNKNOWN'] },
      ],
      execution_order: [{ step: 1, action: 'create_tasks', items: ['T-001'] }],
    };
    writeDevplanManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'devplan');
    expect(result.warnings.some((w) => w.includes('T-UNKNOWN'))).toBe(true);
  });
});
