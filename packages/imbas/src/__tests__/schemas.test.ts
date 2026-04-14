import { describe, expect, it } from 'vitest';

import {
  RunStateSchema,
  RunTransitionSchema,
  EscapeCodeSchema,
  PhaseStatusSchema,
} from '../types/state.js';
import { ImbasConfigSchema, ProviderSchema } from '../types/config.js';
import { StoriesManifestSchema, DevplanManifestSchema } from '../types/manifest.js';
import { CachedAtSchema } from '../types/cache.js';

// --- RunStateSchema ---

describe('RunStateSchema', () => {
  const validState = {
    run_id: '20240101-001',
    project_ref: 'PROJ',
    epic_ref: null,
    source_file: 'requirements.md',
    created_at: '2024-01-01T00:00:00.000Z',
    updated_at: '2024-01-01T00:00:00.000Z',
    current_phase: 'validate',
    phases: {
      validate: {
        status: 'pending',
        started_at: null,
        completed_at: null,
        output: 'validation-report.md',
        result: null,
        blocking_issues: 0,
        warning_issues: 0,
      },
      split: {
        status: 'pending',
        started_at: null,
        completed_at: null,
        output: 'stories-manifest.json',
        stories_created: 0,
        pending_review: true,
        escape_code: null,
      },
      devplan: {
        status: 'pending',
        started_at: null,
        completed_at: null,
        output: 'devplan-manifest.json',
        pending_review: true,
      },
    },
  };

  it('parses valid state', () => {
    const result = RunStateSchema.safeParse(validState);
    expect(result.success).toBe(true);
  });

  it('rejects invalid phase status', () => {
    const bad = {
      ...validState,
      phases: {
        ...validState.phases,
        validate: { ...validState.phases.validate, status: 'unknown_status' },
      },
    };
    const result = RunStateSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects invalid current_phase', () => {
    const bad = { ...validState, current_phase: 'nonexistent' };
    const result = RunStateSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects invalid validate result value', () => {
    const bad = {
      ...validState,
      phases: {
        ...validState.phases,
        validate: { ...validState.phases.validate, result: 'INVALID_RESULT' },
      },
    };
    const result = RunStateSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects invalid escape_code', () => {
    const bad = {
      ...validState,
      phases: {
        ...validState.phases,
        split: { ...validState.phases.split, escape_code: 'X9-9' },
      },
    };
    const result = RunStateSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('accepts all valid EscapeCode values', () => {
    for (const code of ['E2-1', 'E2-2', 'E2-3', 'EC-1', 'EC-2'] as const) {
      const result = EscapeCodeSchema.safeParse(code);
      expect(result.success).toBe(true);
    }
  });

  it('accepts all valid PhaseStatus values', () => {
    for (const status of ['pending', 'in_progress', 'completed', 'escaped'] as const) {
      const result = PhaseStatusSchema.safeParse(status);
      expect(result.success).toBe(true);
    }
  });
});

// --- ImbasConfigSchema ---

describe('ImbasConfigSchema', () => {
  it('fills in defaults when given empty object', () => {
    const result = ImbasConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.version).toBe('1.0');
    expect(result.data.language.documents).toBe('ko');
    expect(result.data.defaults.llm_model.devplan).toBe('opus');
    expect(result.data.jira.issue_types.epic).toBe('Epic');
  });

  it('preserves custom values', () => {
    const input = {
      version: '2.0',
      language: { documents: 'en', skills: 'ko', issue_content: 'en', reports: 'en' },
      defaults: { project_ref: 'MYPROJ', llm_model: { validate: 'haiku', split: 'haiku', devplan: 'sonnet' }, subtask_limits: { max_lines: 100, max_files: 5, review_hours: 2 } },
    };
    const result = ImbasConfigSchema.safeParse(input);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.version).toBe('2.0');
    expect(result.data.defaults.project_ref).toBe('MYPROJ');
    expect(result.data.defaults.llm_model.validate).toBe('haiku');
  });

  it('defaults provider to jira', () => {
    const result = ImbasConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.provider).toBe('jira');
  });

  it('accepts provider: local', () => {
    const result = ImbasConfigSchema.safeParse({ provider: 'local' });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.provider).toBe('local');
  });

  it('accepts provider: github', () => {
    const result = ImbasConfigSchema.safeParse({ provider: 'github' });
    expect(result.success).toBe(true);
  });

  it('rejects unknown provider', () => {
    const result = ImbasConfigSchema.safeParse({ provider: 'bitbucket' });
    expect(result.success).toBe(false);
  });
});

// --- ProviderSchema ---

describe('ProviderSchema', () => {
  it('accepts exactly jira, github, local', () => {
    expect(ProviderSchema.safeParse('jira').success).toBe(true);
    expect(ProviderSchema.safeParse('github').success).toBe(true);
    expect(ProviderSchema.safeParse('local').success).toBe(true);
  });

  it('rejects case-sensitive mismatch', () => {
    expect(ProviderSchema.safeParse('Jira').success).toBe(false);
    expect(ProviderSchema.safeParse('LOCAL').success).toBe(false);
  });
});

// --- StoriesManifestSchema ---

describe('StoriesManifestSchema', () => {
  const validManifest = {
    batch: 'batch-001',
    run_id: '20240101-001',
    project_ref: 'PROJ',
    epic_ref: null,
    created_at: '2024-01-01T00:00:00.000Z',
    stories: [
      {
        id: 'S-001',
        title: 'Story 1',
        description: 'Description',
        type: 'Story',
        verification: { anchor_link: true, coherence: 'PASS', reverse_inference: 'PASS' },
        size_check: 'PASS',
      },
    ],
  };

  it('parses valid stories manifest', () => {
    const result = StoriesManifestSchema.safeParse(validManifest);
    expect(result.success).toBe(true);
  });

  it('rejects missing required field batch', () => {
    const { batch: _batch, ...bad } = validManifest;
    const result = StoriesManifestSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('rejects missing required field run_id', () => {
    const { run_id: _runId, ...bad } = validManifest;
    const result = StoriesManifestSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });
});

// --- DevplanManifestSchema ---

describe('DevplanManifestSchema', () => {
  const validDevplan = {
    batch: 'batch-001',
    run_id: '20240101-001',
    project_ref: 'PROJ',
    epic_ref: null,
    created_at: '2024-01-01T00:00:00.000Z',
    tasks: [
      {
        id: 'T-001',
        title: 'Task 1',
        description: 'Do something',
        type: 'Task',
        blocks: [],
        subtasks: [
          { id: 'ST-001', title: 'Subtask 1', description: 'Sub desc' },
        ],
      },
    ],
    execution_order: [
      { step: 1, action: 'create_tasks', items: ['T-001'] },
    ],
  };

  it('parses valid devplan manifest with execution_order', () => {
    const result = DevplanManifestSchema.safeParse(validDevplan);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.execution_order).toHaveLength(1);
    expect(result.data.execution_order[0]!.step).toBe(1);
  });

  it('rejects invalid execution step action', () => {
    const bad = {
      ...validDevplan,
      execution_order: [{ step: 1, action: 'invalid_action', items: ['T-001'] }],
    };
    const result = DevplanManifestSchema.safeParse(bad);
    expect(result.success).toBe(false);
  });

  it('defaults empty arrays when omitted', () => {
    const minimal = {
      batch: 'b',
      run_id: 'r',
      project_ref: 'P',
      epic_ref: null,
      created_at: '2024-01-01T00:00:00.000Z',
    };
    const result = DevplanManifestSchema.safeParse(minimal);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.tasks).toEqual([]);
    expect(result.data.execution_order).toEqual([]);
  });
});

// --- RunTransitionSchema ---

describe('RunTransitionSchema (discriminated union)', () => {
  it('parses start_phase action', () => {
    const result = RunTransitionSchema.safeParse({
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'start_phase',
      phase: 'validate',
    });
    expect(result.success).toBe(true);
  });

  it('parses complete_phase action', () => {
    const result = RunTransitionSchema.safeParse({
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'complete_phase',
      phase: 'validate',
      result: 'PASS',
      blocking_issues: 0,
      warning_issues: 2,
    });
    expect(result.success).toBe(true);
  });

  it('parses escape_phase action', () => {
    const result = RunTransitionSchema.safeParse({
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'escape_phase',
      phase: 'split',
      escape_code: 'E2-3',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid action', () => {
    const result = RunTransitionSchema.safeParse({
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'delete_phase',
      phase: 'validate',
    });
    expect(result.success).toBe(false);
  });

  it('rejects escape_phase with invalid phase (non-split)', () => {
    const result = RunTransitionSchema.safeParse({
      project_ref: 'PROJ',
      run_id: '20240101-001',
      action: 'escape_phase',
      phase: 'validate',
      escape_code: 'E2-1',
    });
    expect(result.success).toBe(false);
  });
});

// --- CachedAtSchema ---

describe('CachedAtSchema', () => {
  it('parses valid cached_at object', () => {
    const result = CachedAtSchema.safeParse({
      cached_at: '2024-01-01T00:00:00.000Z',
      ttl_hours: 24,
    });
    expect(result.success).toBe(true);
  });

  it('uses default ttl_hours when omitted', () => {
    const result = CachedAtSchema.safeParse({
      cached_at: '2024-01-01T00:00:00.000Z',
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.ttl_hours).toBe(24);
  });

  it('can check expiry with ttl_hours', () => {
    const past = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const result = CachedAtSchema.safeParse({ cached_at: past, ttl_hours: 24 });
    expect(result.success).toBe(true);
    if (!result.success) return;
    const cachedMs = new Date(result.data.cached_at).getTime();
    const expiresMs = cachedMs + result.data.ttl_hours * 60 * 60 * 1000;
    expect(expiresMs).toBeLessThan(Date.now());
  });

  it('rejects zero ttl_hours', () => {
    const result = CachedAtSchema.safeParse({
      cached_at: '2024-01-01T00:00:00.000Z',
      ttl_hours: 0,
    });
    expect(result.success).toBe(false);
  });
});
