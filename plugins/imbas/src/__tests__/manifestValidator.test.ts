import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { validateManifest } from '../core/manifestValidator/index.js';
import type { EstimationManifest, StoriesManifest } from '../types/manifest.js';

const dirs: string[] = [];

function makeTempDir(): string {
  const dir = join(tmpdir(), `imbas-mv-${randomUUID()}`);
  mkdirSync(dir, { recursive: true });
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0))
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
});

function writeStoriesManifest(runDir: string, manifest: StoriesManifest): void {
  writeFileSync(
    join(runDir, 'stories-manifest.json'),
    JSON.stringify(manifest),
    'utf-8',
  );
}

function writeEstimationManifest(
  runDir: string,
  manifest: EstimationManifest,
): void {
  writeFileSync(
    join(runDir, 'estimation.json'),
    JSON.stringify(manifest),
    'utf-8',
  );
}

function makeStory(id: string, title: string): StoriesManifest['stories'][0] {
  return {
    id,
    title,
    description: `${title} desc`,
    type: 'Story',
    status: 'pending',
    issue_ref: null,
    labels: [],
    verification: {
      anchor_link: true,
      coherence: 'PASS',
      reverse_inference: 'PASS',
    },
    size_check: 'PASS',
    split_from: null,
    split_into: [],
    estimate_manday: null,
  };
}

const baseStoriesManifest: StoriesManifest = {
  version: 2,
  batch: 'batch-001',
  run_id: '20240101-001',
  project_ref: 'PROJ',
  epic_ref: null,
  created_at: '2024-01-01T00:00:00.000Z',
  stories: [makeStory('S-001', 'Story 1'), makeStory('S-002', 'Story 2')],
  links: [],
  transitions: [],
};

function makeUnit(
  id: string,
  deps: string[] = [],
): EstimationManifest['units'][0] {
  return {
    id,
    name: `Unit ${id}`,
    view_refs: { page: [], feature: [`feat-${id}`], module: [] },
    single_view: false,
    complexity: 'M',
    estimate: { o: 1, m: 3, p: 5, expected: 3, sigma: 0.67 },
    rationale: 'baseline',
    deps,
  };
}

const baseEstimationManifest: EstimationManifest = {
  version: 1,
  run_id: '20240101-001',
  project_ref: 'PROJ',
  source: 'refined.md',
  created_at: '2024-01-01T00:00:00.000Z',
  config_used: {},
  units: [makeUnit('U-1'), makeUnit('U-2', ['U-1'])],
  rollup: {
    sum_expected: 6,
    overhead: { integration: 0.6, test: 0.9, pm: 0.3 },
    buffered_total: 9.4,
    confidence_interval: [7.5, 11.2],
  },
  schedule: {
    tracks: [{ track: 1, units: ['U-1', 'U-2'] }],
    milestones: [{ name: 'done', week: 2 }],
    total_weeks: 2,
  },
  assumptions: [],
  risks: [],
};

// --- Basic ---

describe('validateManifest stories', () => {
  it('valid stories manifest passes with no errors', async () => {
    const runDir = makeTempDir();
    writeStoriesManifest(runDir, baseStoriesManifest);

    const result = await validateManifest(runDir, 'stories');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateManifest estimation', () => {
  it('valid estimation manifest passes with no errors', async () => {
    const runDir = makeTempDir();
    writeEstimationManifest(runDir, baseEstimationManifest);

    const result = await validateManifest(runDir, 'estimation');
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

// --- Stories errors ---

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
    expect(result.errors.some((e) => e.includes('Duplicate story ID'))).toBe(
      true,
    );
  });

  it('detects broken link from reference', async () => {
    const runDir = makeTempDir();
    const manifest: StoriesManifest = {
      ...baseStoriesManifest,
      links: [
        { type: 'blocks', from: 'S-999', to: ['S-001'], status: 'pending' },
      ],
    };
    writeStoriesManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'stories');
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('unknown source ID: "S-999"')),
    ).toBe(true);
  });

  it('detects broken link to reference', async () => {
    const runDir = makeTempDir();
    const manifest: StoriesManifest = {
      ...baseStoriesManifest,
      links: [
        { type: 'blocks', from: 'S-001', to: ['S-999'], status: 'pending' },
      ],
    };
    writeStoriesManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'stories');
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('unknown target ID: "S-999"')),
    ).toBe(true);
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
      links: [
        { type: 'blocks', from: 'S-001', to: ['S-002'], status: 'pending' },
      ],
    };
    writeStoriesManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'stories');
    expect(result.valid).toBe(true);
  });
});

// --- Estimation errors ---

describe('estimation manifest validation errors', () => {
  it('detects duplicate unit IDs', async () => {
    const runDir = makeTempDir();
    const manifest: EstimationManifest = {
      ...baseEstimationManifest,
      units: [makeUnit('U-1'), makeUnit('U-1')],
      schedule: { tracks: [], milestones: [], total_weeks: 2 },
    };
    writeEstimationManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'estimation');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate unit ID'))).toBe(
      true,
    );
  });

  it('detects deps referencing unknown unit IDs', async () => {
    const runDir = makeTempDir();
    const manifest: EstimationManifest = {
      ...baseEstimationManifest,
      units: [makeUnit('U-1', ['U-404'])],
      schedule: { tracks: [], milestones: [], total_weeks: 2 },
    };
    writeEstimationManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'estimation');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('"U-404"'))).toBe(true);
  });

  it('detects a unit scheduled in multiple tracks', async () => {
    const runDir = makeTempDir();
    const manifest: EstimationManifest = {
      ...baseEstimationManifest,
      schedule: {
        tracks: [
          { track: 1, units: ['U-1'] },
          { track: 2, units: ['U-1', 'U-2'] },
        ],
        milestones: [],
        total_weeks: 2,
      },
    };
    writeEstimationManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'estimation');
    expect(result.valid).toBe(false);
    expect(
      result.errors.some((e) => e.includes('scheduled in multiple tracks')),
    ).toBe(true);
  });

  it('detects an inverted confidence interval', async () => {
    const runDir = makeTempDir();
    const manifest: EstimationManifest = {
      ...baseEstimationManifest,
      rollup: {
        ...baseEstimationManifest.rollup,
        confidence_interval: [11.2, 7.5],
      },
    };
    writeEstimationManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'estimation');
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('inverted'))).toBe(true);
  });

  it('warns for milestones beyond total_weeks and unknown risk units', async () => {
    const runDir = makeTempDir();
    const manifest: EstimationManifest = {
      ...baseEstimationManifest,
      schedule: {
        ...baseEstimationManifest.schedule,
        milestones: [{ name: 'late', week: 5 }],
      },
      risks: [{ unit: 'U-404', risk: 'unknown', impact: 'low' }],
    };
    writeEstimationManifest(runDir, manifest);

    const result = await validateManifest(runDir, 'estimation');
    expect(result.valid).toBe(true);
    expect(result.warnings.some((w) => w.includes('beyond total_weeks'))).toBe(
      true,
    );
    expect(result.warnings.some((w) => w.includes('U-404'))).toBe(true);
  });
});
